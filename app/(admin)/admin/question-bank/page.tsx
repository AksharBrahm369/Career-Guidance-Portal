import { db } from "@/lib/db";
import { questionBank } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function QuestionBankPage() {
  const items = await db.select().from(questionBank).orderBy(questionBank.module, questionBank.dimension).limit(500);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Question Bank ({items.length})</h1>
      <ul className="divide-y rounded-md border text-sm">
        {items.map((q) => (
          <li key={q.id} className="flex items-center justify-between gap-3 p-3">
            <span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{q.module}/{q.dimension}</span>{" "}
              {q.questionText}
              <span className="ml-2 text-xs text-muted-foreground">[{q.source} v{q.version}]</span>
            </span>
            <span className={q.isActive ? "text-xs text-green-600" : "text-xs text-muted-foreground"}>
              {q.isActive ? "active" : "inactive"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
