"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
}

const MAX_CHARS = 600;

export function QAChat({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setGlobalError(null);

    const history = messages
      .filter((m) => !m.pending && !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((cur) => [
      ...cur,
      { role: "user", content: text },
      { role: "assistant", content: "", pending: true },
    ]);
    setBusy(true);

    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const limit = data.limit ?? "the";
          setGlobalError(
            `You've reached the ${limit}-message limit for this session. Reload the page to start a new session.`,
          );
        } else if (res.status === 503) {
          setGlobalError(
            "The Q&A service isn't configured on this server. Ask the admin to set an AI provider key.",
          );
        } else {
          setGlobalError(data.message ?? data.error ?? `HTTP ${res.status}`);
        }
        setMessages((cur) => cur.slice(0, -1));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buf = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        setMessages((cur) => {
          const next = cur.slice();
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { ...last, content: buf, pending: false };
          }
          return next;
        });
      }

      if (!buf.trim()) {
        setMessages((cur) => {
          const next = cur.slice();
          next[next.length - 1] = {
            role: "assistant",
            content: "(no response)",
            error: true,
          };
          return next;
        });
      }
    } catch (err) {
      setMessages((cur) => {
        const next = cur.slice();
        next[next.length - 1] = {
          role: "assistant",
          content: err instanceof Error ? err.message : String(err),
          error: true,
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card">
      <div
        ref={scrollRef}
        className="flex max-h-80 flex-col gap-2 overflow-y-auto p-3 text-sm sm:max-h-96"
      >
        {messages.length === 0 ? (
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            Ask anything about <strong>{courseName}</strong> — eligibility, fees, careers,
            institutes, entrance exams. Try:
            <ul className="mt-2 list-disc pl-5 text-xs">
              <li>What jobs can I pursue after this?</li>
              <li>How competitive is admission?</li>
              <li>How does this compare to similar courses?</li>
            </ul>
          </div>
        ) : null}
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
      </div>

      {globalError ? (
        <div className="mx-3 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          {globalError}
        </div>
      ) : null}

      <form onSubmit={send} className="flex gap-2 border-t bg-background/50 p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Type your question…"
          disabled={busy}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`max-w-[85%] whitespace-pre-line rounded-md px-3 py-2 text-sm ${
        isUser
          ? "self-end bg-primary text-primary-foreground"
          : msg.error
            ? "self-start border border-destructive/40 bg-destructive/5 text-destructive"
            : "self-start bg-muted"
      }`}
    >
      {msg.pending && !msg.content ? (
        <span className="text-xs italic opacity-70">thinking…</span>
      ) : (
        msg.content
      )}
    </div>
  );
}
