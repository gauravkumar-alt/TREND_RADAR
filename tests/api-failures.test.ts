import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearYouTubeCache, getVideoItems, mapYouTubeError, searchVideoIds } from "@/lib/youtube/client";
import { generateJson } from "@/lib/gemini/client";
import { errorBody, AppError } from "@/lib/errors";
import { parseIsoDuration } from "@/lib/youtube/duration";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const search = { q: "ai", regionCode: "IN", publishedAfter: "2026-10-01T00:00:00Z", maxResults: 5 };

beforeEach(() => {
  process.env.YOUTUBE_API_KEY = "test-yt";
  process.env.GEMINI_API_KEY = "test-gm";
  process.env.GEMINI_MODEL = "gemini-flash-latest";
  clearYouTubeCache();
});
afterEach(() => vi.restoreAllMocks());

describe("YouTube failures", () => {
  it("maps quotaExceeded to YOUTUBE_QUOTA", () => {
    expect(mapYouTubeError(403, { error: { errors: [{ reason: "quotaExceeded" }] } }).code).toBe("YOUTUBE_QUOTA");
  });
  it("maps an invalid key to YOUTUBE_NOT_CONFIGURED", () => {
    expect(mapYouTubeError(400, { error: { message: "API key not valid. Please pass a valid API key.", errors: [{ reason: "badRequest" }] } }).code).toBe("YOUTUBE_NOT_CONFIGURED");
  });
  it("maps 5xx/garbage to YOUTUBE_UNAVAILABLE", () => {
    expect(mapYouTubeError(503, "<html>").code).toBe("YOUTUBE_UNAVAILABLE");
  });
  it("network errors become YOUTUBE_UNAVAILABLE, never a stack trace", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(searchVideoIds(search, undefined, f)).rejects.toMatchObject({ code: "YOUTUBE_UNAVAILABLE" });
  });
  it("missing key fails fast without calling YouTube", async () => {
    process.env.YOUTUBE_API_KEY = "";
    const f = vi.fn();
    await expect(searchVideoIds(search, undefined, f)).rejects.toMatchObject({ code: "YOUTUBE_NOT_CONFIGURED" });
    expect(f).not.toHaveBeenCalled();
  });
  it("caches identical searches (quota guard)", async () => {
    const f = vi.fn().mockResolvedValue(json(200, { items: [{ id: { videoId: "abc" } }] }));
    await searchVideoIds(search, undefined, f);
    await searchVideoIds(search, undefined, f);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("batches videos.list in 50s and keeps hidden stats as null", async () => {
    const f = vi.fn().mockImplementation(async () =>
      json(200, {
        items: [
          {
            id: "abcdefghijk",
            snippet: { title: "t", channelId: "c", channelTitle: "C", publishedAt: "2026-10-10T00:00:00Z", thumbnails: {} },
            contentDetails: { duration: "PT12M5S" },
            statistics: { viewCount: "1000" },
          },
        ],
      }),
    );
    const ids = Array.from({ length: 120 }, (_, i) => `id${String(i).padStart(9, "0")}`);
    const items = await getVideoItems(ids, undefined, f);
    expect(f).toHaveBeenCalledTimes(3);
    expect(items[0].statistics.likeCount).toBeUndefined();
  });
  it("parses ISO durations", () => {
    expect(parseIsoDuration("PT12M5S")).toBe(725);
    expect(parseIsoDuration("PT1H")).toBe(3600);
    expect(parseIsoDuration("P1DT1S")).toBe(86401);
    expect(parseIsoDuration("garbage")).toBeNull();
  });
});

describe("Gemini failures", () => {
  const opts = { system: "s", prompt: "p", responseSchema: {} };
  it("refuses non-Flash models", async () => {
    process.env.GEMINI_MODEL = "gemini-pro-latest";
    await expect(generateJson(opts, vi.fn())).rejects.toMatchObject({ code: "GEMINI_NOT_CONFIGURED" });
  });
  it("429 becomes a friendly GEMINI_UNAVAILABLE", async () => {
    await expect(generateJson(opts, vi.fn().mockResolvedValue(json(429, {})))).rejects.toMatchObject({ code: "GEMINI_UNAVAILABLE" });
  });
  it("empty candidates become GEMINI_INVALID", async () => {
    await expect(generateJson(opts, vi.fn().mockResolvedValue(json(200, { candidates: [] })))).rejects.toMatchObject({ code: "GEMINI_INVALID" });
  });
  it("returns text and skips thought parts", async () => {
    const f = vi.fn().mockResolvedValue(json(200, { candidates: [{ content: { parts: [{ text: "hmm", thought: true }, { text: '{"ok":1}' }] } }] }));
    expect(await generateJson(opts, f)).toBe('{"ok":1}');
    expect(f.mock.calls[0][0]).toContain("gemini-flash-latest:generateContent");
  });
});

describe("error bodies", () => {
  it("never leak internals for unknown errors", () => {
    expect(errorBody(new Error("SELECT * FROM secret failed at line 3"))).toEqual({ error: { code: "UNKNOWN", message: "Something went wrong." } });
    expect(errorBody(new AppError("YOUTUBE_QUOTA", "Quota used up", 429)).error.code).toBe("YOUTUBE_QUOTA");
  });
});
