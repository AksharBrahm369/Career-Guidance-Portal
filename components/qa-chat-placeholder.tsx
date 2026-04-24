"use client";

import { useState } from "react";

// Placeholder — M3 replaces this with a real SSE consumer of /api/courses/[id]/qa.
export function QAChatPlaceholder({ courseId }: { courseId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/qa`, {
        method: "POST",
        body: JSON.stringify({ q: "ping" }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        const { value } = await reader.read();
        setMessage(value ? decoder.decode(value) : "(empty)");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border bg-card p-4 text-sm">
      <p className="mb-2 font-medium">Ask about this course</p>
      <p className="mb-3 text-muted-foreground">
        Streaming Q&amp;A assistant arrives in M3. Test the streaming endpoint below.
      </p>
      <button
        type="button"
        onClick={handleTest}
        disabled={loading}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Testing…" : "Test SSE endpoint"}
      </button>
      {message ? (
        <pre className="mt-3 overflow-x-auto rounded bg-muted p-2 text-xs">{message}</pre>
      ) : null}
    </div>
  );
}
