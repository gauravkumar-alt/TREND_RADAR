import "server-only";
import { env } from "../env";
import { AppError } from "../errors";

const API = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GenerateOptions {
  system: string;
  prompt: string;
  responseSchema: Record<string, unknown>;
  temperature?: number;
  timeoutMs?: number;
}

/** One call to Gemini Flash in JSON mode. Returns the raw text of the first candidate. */
export async function generateJson(opts: GenerateOptions, fetchImpl: typeof fetch = fetch): Promise<string> {
  const key = env.geminiKey();
  if (!key) throw new AppError("GEMINI_NOT_CONFIGURED", "No Gemini API key is set on the server.", 503);
  const model = env.geminiModel();
  if (!/flash/i.test(model)) throw new AppError("GEMINI_NOT_CONFIGURED", "GEMINI_MODEL must be a Gemini Flash model.", 503);

  let res: Response;
  try {
    res = await fetchImpl(`${API}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          responseMimeType: "application/json",
          responseSchema: opts.responseSchema,
        },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
      cache: "no-store",
    });
  } catch {
    throw new AppError("GEMINI_UNAVAILABLE", "Gemini didn't respond in time. Try again in a minute.", 504);
  }
  if (res.status === 429) throw new AppError("GEMINI_UNAVAILABLE", "Gemini is rate-limiting requests right now. Try again in a minute.", 429);
  if (res.status === 400 || res.status === 403) {
    const body = await res.text().catch(() => "");
    if (/API key/i.test(body)) throw new AppError("GEMINI_NOT_CONFIGURED", "The Gemini API key was rejected.", 503);
    throw new AppError("GEMINI_UNAVAILABLE", "Gemini rejected the request.", 502);
  }
  if (!res.ok) throw new AppError("GEMINI_UNAVAILABLE", "Gemini is unavailable right now. Try again in a minute.", 502);

  const body = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  } | null;
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join("");
  if (!text) throw new AppError("GEMINI_INVALID", "Gemini returned an empty response.", 502);
  return text;
}

export function geminiModelName() {
  return env.geminiModel();
}

/** Strip accidental ```json fences before JSON.parse. */
export function parseJsonLoose(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  return JSON.parse(t);
}
