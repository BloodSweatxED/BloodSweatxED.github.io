// MDM Note Writer — hosted generation endpoint.
//
// An edge function rather than a normal serverless function for one reason:
// Netlify cuts synchronous functions off after about 10 seconds, and a long
// note on Opus with thinking on will run past that. Edge functions stream, so
// the response starts flowing immediately and never trips the limit.
//
// Required environment variables (Netlify UI, Site configuration > Environment):
//   ANTHROPIC_API_KEY   your key from console.anthropic.com
//   MDM_PASSPHRASE      shared passphrase gating access to the tool
//
// Optional:
//   MDM_MODEL           default claude-opus-5
//   MDM_EFFORT          low | medium | high | xhigh | max, default medium
//   MDM_MAX_TOKENS      default 8000

const DEFAULT_MODEL = "claude-opus-5";
const DEFAULT_EFFORT = "medium";
const DEFAULT_MAX_TOKENS = 8000;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Compares without leaking the answer through response timing.
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  // Length alone is not secret enough to branch on, so fold it into the result
  // instead of returning early.
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const passphrase = Deno.env.get("MDM_PASSPHRASE");

  if (!apiKey) {
    return json({ error: "Server is missing ANTHROPIC_API_KEY." }, 500);
  }
  // Refuse to run ungated. Without this, a missing env var would silently turn
  // the tool into an open endpoint spending the owner's API budget.
  if (!passphrase) {
    return json({ error: "Server is missing MDM_PASSPHRASE. Access is disabled." }, 500);
  }

  const supplied = request.headers.get("x-mdm-key") ?? "";
  if (!constantTimeEqual(supplied, passphrase)) {
    return json({ error: "Wrong passphrase." }, 401);
  }

  let payload: { system?: unknown; prompt?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Bad request body." }, 400);
  }

  const { system, prompt } = payload;
  if (typeof system !== "string" || typeof prompt !== "string" || !prompt.trim()) {
    return json({ error: "Missing system prompt or draft." }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("MDM_MODEL") ?? DEFAULT_MODEL,
        max_tokens: Number(Deno.env.get("MDM_MAX_TOKENS") ?? DEFAULT_MAX_TOKENS),
        stream: true,
        // The system prompt is long and identical every time, so cache it.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        thinking: { type: "adaptive" },
        output_config: { effort: Deno.env.get("MDM_EFFORT") ?? DEFAULT_EFFORT },
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return json({ error: `Could not reach the API: ${(err as Error).message}` }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return json({ error: `API error ${upstream.status}`, detail }, upstream.status);
  }

  // Re-emit the upstream SSE stream as plain text deltas.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw) continue;
        let event: { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
        try {
          event = JSON.parse(raw);
        } catch {
          continue;
        }
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          controller.enqueue(encoder.encode(event.delta.text ?? ""));
        } else if (event.type === "error") {
          controller.enqueue(encoder.encode(`\n\n[stream error: ${event.error?.message ?? "unknown"}]`));
        }
      }
    },
  });

  return new Response(upstream.body.pipeThrough(transform), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};

export const config = { path: "/api/generate" };
