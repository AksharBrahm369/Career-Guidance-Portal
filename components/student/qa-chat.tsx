"use client";

import { memo, useEffect, useRef, useState } from "react";
import { RefreshCw, Send, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Msg {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
}

const MAX_CHARS = 600;

const STARTERS = [
  "What jobs can I do after this?",
  "How tough is admission?",
  "How does it compare to similar courses?",
];

export function QAChat({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setGlobalError(null);
    setLastQuestion(trimmed);

    const history = messages
      .filter((m) => !m.pending && !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((cur) => [
      ...cur,
      { role: "user", content: trimmed },
      { role: "assistant", content: "", pending: true },
    ]);
    setBusy(true);

    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
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
            "The Q&A helper isn't switched on for this server yet. Ask the admin to add an AI provider key.",
          );
        } else {
          setGlobalError(data.message ?? data.error ?? `Something went wrong (HTTP ${res.status}).`);
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
            content: "I couldn't come up with an answer — try asking that a different way.",
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  function retry() {
    if (lastQuestion) void ask(lastQuestion);
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius)] border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold leading-tight">Ask about this course</p>
          <p className="truncate text-xs text-muted-foreground">{courseName}</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-80 flex-col gap-3 overflow-y-auto p-4 sm:max-h-96"
        aria-live="polite"
      >
        {empty ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-heading text-base font-semibold">Curious about {courseName}?</p>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                Ask anything — eligibility, fees, careers, institutes, or entrance exams. No
                question is too small.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void ask(q)}
                  disabled={busy}
                  className={cn(
                    "rounded-full border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent",
                    "transition-colors hover:bg-accent/20 disabled:pointer-events-none disabled:opacity-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
      </div>

      {globalError ? (
        <div className="mx-4 mb-1 flex flex-col gap-2 rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <span>{globalError}</span>
          {lastQuestion ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retry}
              disabled={busy}
              className="self-start"
            >
              <RefreshCw data-icon="inline-start" aria-hidden />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t bg-background/60 p-3">
        <label htmlFor="qa-input" className="sr-only">
          Your question about {courseName}
        </label>
        <input
          id="qa-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Type your question…"
          disabled={busy}
          autoComplete="off"
          className={cn(
            "min-h-[44px] min-w-0 flex-1 rounded-[var(--radius)] border border-input bg-background px-3.5 py-2.5 text-base",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:opacity-60",
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !input.trim()}
          aria-label="Send question"
          className="size-11 shrink-0"
        >
          <Send data-icon="inline-start" aria-hidden />
        </Button>
      </form>
    </div>
  );
}

// Memoized so a streaming token (which only mutates the last message object)
// re-renders just the active bubble, not every prior bubble in the list.
const Bubble = memo(function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const streaming = msg.pending && !msg.content;

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-line rounded-[var(--radius)] px-3.5 py-2.5 text-sm leading-relaxed",
          isUser && "rounded-br-sm bg-primary text-primary-foreground",
          !isUser && !msg.error && "rounded-bl-sm bg-accent/10 text-foreground",
          !isUser &&
            msg.error &&
            "rounded-bl-sm border border-destructive/40 bg-destructive/5 text-destructive",
        )}
      >
        {streaming ? <TypingIndicator /> : msg.content}
      </div>
    </div>
  );
});

function TypingIndicator() {
  return (
    <span className="flex items-center gap-1 py-1" role="status" aria-label="Assistant is typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-accent/70 motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
      <span className="ml-1 text-xs italic text-muted-foreground motion-reduce:not-sr-only sr-only">
        Thinking…
      </span>
    </span>
  );
}
