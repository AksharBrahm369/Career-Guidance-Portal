// Streaming stub — proves SSE plumbing works end-to-end.
// M3 replaces this with Anthropic streaming Q&A (system prompt cached,
// 20 messages/session rate limit, deflection rules for out-of-scope questions).
export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const frame = `data: ${JSON.stringify({
        type: "notice",
        text: "Q&A arrives in M3",
      })}\n\n`;
      controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
