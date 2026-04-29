import { z } from "zod";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import {
  QA_MAX_HISTORY_TURNS,
  QA_MAX_USER_MESSAGE_CHARS,
  QA_SESSION_MESSAGE_LIMIT,
  buildQAMessages,
} from "@/lib/ai/qa-prompt";
import { getCourseById, getPublishedCourseBySlug } from "@/lib/student/courses";
import { db } from "@/lib/db";
import { courseInstitutes, institutes } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { consume } from "@/lib/rate-limit";
import { getOrCreateQASessionId, qaSessionKey } from "@/lib/qa-session";

export const runtime = "nodejs";
export const maxDuration = 60;

const HistoryMsg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const Body = z.object({
  message: z.string().min(1).max(QA_MAX_USER_MESSAGE_CHARS),
  history: z.array(HistoryMsg).max(QA_MAX_HISTORY_TURNS * 2).default([]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Allow either a UUID or a slug — slugs let students share/bookmark URLs.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const course = isUuid
    ? await getCourseById(id)
    : (await getPublishedCourseBySlug(id))?.course;
  if (!course || course.status !== "published") {
    return Response.json({ error: "course_not_found" }, { status: 404 });
  }

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const session = await getOrCreateQASessionId();
  const limit = consume(qaSessionKey(course.id, session.id), {
    capacity: QA_SESSION_MESSAGE_LIMIT,
    refillPerSecond: 0,
  });
  if (!limit.ok) {
    return Response.json(
      { error: "session_limit_reached", limit: QA_SESSION_MESSAGE_LIMIT },
      { status: 429 },
    );
  }

  const links = await db
    .select({ instituteId: courseInstitutes.instituteId })
    .from(courseInstitutes)
    .where(eq(courseInstitutes.courseId, course.id));
  const instituteIds = links.map((l) => l.instituteId);
  const linkedInstitutes = instituteIds.length
    ? await db.select().from(institutes).where(inArray(institutes.id, instituteIds))
    : [];

  let model, supportsCacheControl, providerLabel;
  try {
    ({ model, supportsCacheControl, providerLabel } = getModel("qa"));
  } catch (err) {
    return Response.json(
      { error: "ai_misconfigured", message: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }

  const history = [...body.history, { role: "user" as const, content: body.message }];
  const { system, messages } = buildQAMessages(
    { course, institutes: linkedInstitutes },
    history,
    supportsCacheControl,
  );

  try {
    const result = streamText({
      model,
      system: system as never,
      messages,
      temperature: 0.4,
      maxRetries: 1,
    });

    const response = result.toTextStreamResponse({
      headers: {
        "X-Provider": providerLabel,
        "X-Session-Id": session.id,
        "X-Remaining": String(limit.remaining),
      },
    });
    return response;
  } catch (err) {
    return Response.json(
      { error: "ai_provider_error", message: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
