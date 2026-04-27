"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ArchiveButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function archive() {
    if (!window.confirm("Archive this course? It will be hidden from students.")) return;
    const res = await fetch(`/api/admin/courses/${courseId}/archive`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={archive}
      disabled={pending}
      className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
    >
      {pending ? "…" : "Archive"}
    </button>
  );
}
