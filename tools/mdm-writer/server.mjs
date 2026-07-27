#!/usr/bin/env node
// MDM Note Writer — local server.
//
// Serves the page on 127.0.0.1 only and proxies generation requests to the
// Anthropic API. The API key lives here, in the Node process. It is never sent
// to the browser and never appears in any file that gets committed.
//
//   ANTHROPIC_API_KEY=sk-ant-... node server.mjs
//
// Requires Node 18+ (uses the built-in fetch).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.MDM_MODEL || "claude-opus-5";
const EFFORT = process.env.MDM_EFFORT || "medium"; // low | medium | high | xhigh | max
const MAX_TOKENS = Number(process.env.MDM_MAX_TOKENS || 8000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

function resolveApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  // Fallback: a gitignored key file sitting next to this script.
  for (const name of [".env", "key.txt"]) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const match = text.match(/^\s*(?:ANTHROPIC_API_KEY\s*=\s*)?["']?(sk-ant-[^\s"']+)/m);
    if (match) return match[1];
  }
  return null;
}

const API_KEY = resolveApiKey();

// Only these are ever served. Anything else, including .env and key.txt, 404s.
const SERVABLE = new Set(["index.html", "prompt.js"]);

async function serveStatic(req, res) {
  const urlPath = new URL(req.url, "http://localhost").pathname;
  const rel = urlPath === "/" ? "index.html" : normalize(urlPath).replace(/^[./\\]+/, "");
  if (!SERVABLE.has(rel)) {
    res.writeHead(404).end("Not found");
    return;
  }
  const file = join(ROOT, rel);
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) reject(new Error("Request too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function generate(req, res) {
  if (!API_KEY) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "No API key. Set ANTHROPIC_API_KEY and restart." }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad request body." }));
    return;
  }

  const { system, prompt } = payload;
  if (typeof system !== "string" || typeof prompt !== "string" || !prompt.trim()) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing system prompt or draft." }));
    return;
  }

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        // The system prompt is long and identical on every request, so cache it.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        thinking: { type: "adaptive" },
        output_config: { effort: EFFORT },
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Could not reach the API: ${err.message}` }));
    return;
  }

  if (!upstream.ok) {
    const detail = await upstream.text();
    res.writeHead(upstream.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `API error ${upstream.status}`, detail }));
    return;
  }

  // Re-emit the upstream SSE stream as plain text deltas.
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
  });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw) continue;
        let event;
        try {
          event = JSON.parse(raw);
        } catch {
          continue;
        }
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          res.write(event.delta.text);
        } else if (event.type === "error") {
          res.write(`\n\n[stream error: ${event.error?.message || "unknown"}]`);
        }
      }
    }
  } catch (err) {
    res.write(`\n\n[stream interrupted: ${err.message}]`);
  }
  res.end();
}

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/generate") {
    generate(req, res).catch((err) => {
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405).end("Method not allowed");
});

// Bind to loopback only. Nothing on the network can reach this.
server.listen(PORT, "127.0.0.1", () => {
  console.log(`MDM Note Writer running at http://127.0.0.1:${PORT}`);
  console.log(`Model: ${MODEL}   effort: ${EFFORT}   max_tokens: ${MAX_TOKENS}`);
  if (!API_KEY) {
    console.log("\nNo API key found. Set ANTHROPIC_API_KEY, or put it in tools/mdm-writer/.env");
  }
});
