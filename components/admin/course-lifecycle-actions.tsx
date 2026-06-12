"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatInvalidTransition } from "@/lib/admin/course-transitions";

type Status = "published" | "pending_review" | "rejected" | "archived";

interface Props {
  courseId: string;
  status: Status;
  size?: "sm" | "md";
}

export function CourseLifecycleActions({ courseId, status, size = "sm" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const cls =
    size === "sm" ? "rounded-md border px-2 py-1 text-xs" : "rounded-md border px-3 py-1.5 text-sm";

  async function call(path: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    const res = await fetch(`/api/admin/courses/${courseId}/${path}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(
        data.error === "invalid_transition"
          ? formatInvalidTransition(data)
          : (data.error ?? `HTTP ${res.status}`),
      );
      return;
    }
    startTransition(() => router.refresh());
  }

  if (status === "published") {
    return (
      <button
        type="button"
        onClick={() => call("archive", "Archive this course? It will be hidden from students.")}
        disabled={pending}
        className={`${cls} disabled:opacity-50`}
      >
        {pending ? "…" : "Archive"}
      </button>
    );
  }

  if (status === "pending_review") {
    return (
      <Link href="/admin/review" className={cls}>
        Open in review
      </Link>
    );
  }

  if (status === "rejected") {
    return (
      <button
        type="button"
        onClick={() => call("reopen", "Reopen this course for review? Rejection reason will be cleared.")}
        disabled={pending}
        className={`${cls} disabled:opacity-50`}
      >
        {pending ? "…" : "Reopen for review"}
      </button>
    );
  }

  // archived
  return (
    <button
      type="button"
      onClick={() => call("restore", "Restore this course to the published catalogue?")}
      disabled={pending}
      className={`${cls} disabled:opacity-50`}
    >
      {pending ? "…" : "Restore to published"}
    </button>
  );
}
