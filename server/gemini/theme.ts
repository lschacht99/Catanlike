import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { sanitizeGeneratedTheme } from "../../src/game/theme-generator/schema";
import { JAPAN_CHERRY_BAMBOO_THEME } from "../../src/game/theme-generator/samples";

const MAX_BODY = 1_000_000;
const WINDOW_MS = 60_000;
const LIMIT = 8;
const hits = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return false;
  recent.push(now); hits.set(ip, recent); return true;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) { size += Buffer.byteLength(chunk); if (size > MAX_BODY) throw new Error("Payload too large"); chunks.push(Buffer.from(chunk)); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function callGemini(prompt: string, imageBase64?: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return JAPAN_CHERRY_BAMBOO_THEME;
  const parts: Array<Record<string, unknown>> = [{ text: `Return strict JSON only for an original hex strategy board theme. No protected brands/logos. Prompt: ${prompt}` }];
  if (imageBase64) parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json" } }),
  });
  if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
}

export async function handleThemeRequest(req: IncomingMessage, res: ServerResponse) {
  const ip = req.socket.remoteAddress ?? "unknown";
  if (!rateLimit(ip)) { res.writeHead(429); res.end(JSON.stringify({ error: "rate_limited" })); return; }
  try {
    const body = await readJson(req);
    const obj = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const prompt = String(obj.prompt ?? obj.location ?? "original island theme").replace(/[<>]/g, "").slice(0, 400);
    const image = typeof obj.imageBase64 === "string" && obj.imageBase64.length < MAX_BODY ? obj.imageBase64 : undefined;
    const raw = await callGemini(prompt, image);
    const theme = sanitizeGeneratedTheme(raw);
    res.writeHead(200, { "content-type": "application/json", "x-content-type-options": "nosniff" });
    res.end(JSON.stringify({ theme }));
  } catch (error) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "bad_request" }));
  }
}
