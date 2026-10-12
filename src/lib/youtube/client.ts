import "server-only";
import { z } from "zod";
import { env } from "../env";
import { AppError } from "../errors";
import { parseIsoDuration } from "./duration";
import type { Video } from "../types";

const API = "https://www.googleapis.com/youtube/v3";

/** Official quota costs (units). */
export const QUOTA_COST = { search: 100, videos: 1 } as const;

export class QuotaMeter {
  used = 0;
  add(units: number) {
    this.used += units;
  }
}

// ---- tiny in-process cache (per serverless instance) -------------------------
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();
function cached<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  if (hit) cache.delete(key);
  return undefined;
}
function store(key: string, value: unknown) {
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
}
export function clearYouTubeCache() {
  cache.clear();
}

// ---- error mapping -----------------------------------------------------------
const errorShape = z.object({
  error: z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    errors: z.array(z.object({ reason: z.string().optional() })).optional(),
  }),
});

export function mapYouTubeError(status: number, body: unknown): AppError {
  const parsed = errorShape.safeParse(body);
  const reasons = parsed.success ? (parsed.data.error.errors ?? []).map((e) => e.reason ?? "") : [];
  if (reasons.some((r) => r === "quotaExceeded" || r === "dailyLimitExceeded" || r === "rateLimitExceeded")) {
    return new AppError("YOUTUBE_QUOTA", "YouTube's daily API quota is used up. It resets at midnight Pacific time.", 429);
  }
  const message = parsed.success ? parsed.data.error.message ?? "" : "";
  if (reasons.some((r) => r === "keyInvalid" || r === "accessNotConfigured") || /API key not valid/i.test(message)) {
    return new AppError("YOUTUBE_NOT_CONFIGURED", "The YouTube API key was rejected. Check it is valid and has YouTube Data API v3 enabled.", 502);
  }
  return new AppError("YOUTUBE_UNAVAILABLE", "YouTube didn't respond properly. Try again in a minute.", 502);
}

async function call(path: string, params: Record<string, string | number | undefined>, fetchImpl: typeof fetch = fetch) {
  const key = env.youtubeKey();
  if (!key) throw new AppError("YOUTUBE_NOT_CONFIGURED", "No YouTube API key is set on the server.", 503);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  qs.set("key", key);
  let res: Response;
  try {
    res = await fetchImpl(`${API}/${path}?${qs}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  } catch {
    throw new AppError("YOUTUBE_UNAVAILABLE", "YouTube didn't respond. Try again in a minute.", 502);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw mapYouTubeError(res.status, body);
  return body;
}

// ---- search.list -------------------------------------------------------------
const searchResponse = z.object({
  items: z
    .array(z.object({ id: z.object({ videoId: z.string().optional() }) }))
    .default([]),
});

export interface SearchParams {
  q: string;
  regionCode: string;
  relevanceLanguage?: string;
  publishedAfter: string;
  maxResults: number;
  order?: "relevance" | "date" | "viewCount";
}

/** Returns video ids only; stats come from videos.list (cheaper, and always fresh). */
export async function searchVideoIds(p: SearchParams, meter?: QuotaMeter, fetchImpl?: typeof fetch): Promise<string[]> {
  const cacheKey = `search:${JSON.stringify(p)}`;
  const hit = cached<string[]>(cacheKey);
  if (hit) return hit;
  const body = await call(
    "search",
    {
      part: "snippet",
      type: "video",
      q: p.q,
      regionCode: p.regionCode,
      relevanceLanguage: p.relevanceLanguage,
      publishedAfter: p.publishedAfter,
      maxResults: Math.min(50, Math.max(1, p.maxResults)),
      order: p.order ?? "relevance",
      safeSearch: "none",
    },
    fetchImpl,
  );
  meter?.add(QUOTA_COST.search);
  const ids = searchResponse.parse(body).items.map((i) => i.id.videoId).filter((v): v is string => Boolean(v));
  store(cacheKey, ids);
  return ids;
}

// ---- videos.list -------------------------------------------------------------
const thumb = z.object({ url: z.string() }).optional();
const videoItem = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    description: z.string().default(""),
    channelId: z.string(),
    channelTitle: z.string(),
    publishedAt: z.string(),
    categoryId: z.string().optional(),
    thumbnails: z
      .object({ maxres: thumb, standard: thumb, high: thumb, medium: thumb, default: thumb })
      .partial()
      .default({}),
  }),
  contentDetails: z.object({ duration: z.string().optional() }).partial().default({}),
  statistics: z
    .object({ viewCount: z.string().optional(), likeCount: z.string().optional(), commentCount: z.string().optional() })
    .partial()
    .default({}),
});
const videosResponse = z.object({ items: z.array(videoItem).default([]) });
type VideoItem = z.infer<typeof videoItem>;

const num = (v: string | undefined) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function toVideo(item: VideoItem, ctx: { regionCode: string; sourceCategory: string; source: Video["source"] }): Video {
  const t = item.snippet.thumbnails;
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl:
      t.maxres?.url ?? t.standard?.url ?? t.high?.url ?? t.medium?.url ?? t.default?.url ?? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    durationSeconds: parseIsoDuration(item.contentDetails.duration),
    views: num(item.statistics.viewCount),
    likes: num(item.statistics.likeCount), // null when the creator hides likes
    comments: num(item.statistics.commentCount), // null when comments are disabled
    regionCode: ctx.regionCode,
    categoryId: item.snippet.categoryId ?? null,
    sourceCategory: ctx.sourceCategory,
    source: ctx.source,
    fetchedAt: new Date().toISOString(),
  };
}

/** Batches ids in 50s (1 unit per call). Unknown/removed ids simply don't come back. */
export async function getVideoItems(ids: string[], meter?: QuotaMeter, fetchImpl?: typeof fetch): Promise<VideoItem[]> {
  const unique = [...new Set(ids)];
  const out: VideoItem[] = [];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const body = await call("videos", { part: "snippet,contentDetails,statistics", id: chunk.join(","), maxResults: 50 }, fetchImpl);
    meter?.add(QUOTA_COST.videos);
    out.push(...videosResponse.parse(body).items);
  }
  return out;
}

/** YouTube's region trending chart for a category (1 unit). Some regions/categories have no chart — returns []. */
export async function getTrendingChart(
  regionCode: string,
  videoCategoryId: string,
  meter?: QuotaMeter,
  fetchImpl?: typeof fetch,
): Promise<VideoItem[]> {
  const cacheKey = `chart:${regionCode}:${videoCategoryId}`;
  const hit = cached<VideoItem[]>(cacheKey);
  if (hit) return hit;
  try {
    const body = await call(
      "videos",
      { part: "snippet,contentDetails,statistics", chart: "mostPopular", regionCode, videoCategoryId, maxResults: 50 },
      fetchImpl,
    );
    meter?.add(QUOTA_COST.videos);
    const items = videosResponse.parse(body).items;
    store(cacheKey, items);
    return items;
  } catch (e) {
    if (e instanceof AppError && e.code === "YOUTUBE_QUOTA") throw e;
    if (e instanceof AppError && e.code === "YOUTUBE_NOT_CONFIGURED") throw e;
    return [];
  }
}

// ---- channels.list (creator country) -----------------------------------------
const channelsResponse = z.object({
  items: z.array(z.object({ id: z.string(), snippet: z.object({ country: z.string().optional() }).partial().default({}) })).default([]),
});

/**
 * Listed country (ISO alpha-2) per channel, 1 unit per 50 channels. Channels
 * that don't list a country are simply absent. Never fails a scan: on any
 * error other than quota it returns what it has.
 */
export async function getChannelCountries(channelIds: string[], meter?: QuotaMeter, fetchImpl?: typeof fetch): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(channelIds)];
  for (let i = 0; i < unique.length; i += 50) {
    try {
      const body = await call("channels", { part: "snippet", id: unique.slice(i, i + 50).join(","), maxResults: 50 }, fetchImpl);
      meter?.add(QUOTA_COST.videos);
      for (const c of channelsResponse.parse(body).items) if (c.snippet.country) out.set(c.id, c.snippet.country.toUpperCase());
    } catch (e) {
      if (e instanceof AppError && e.code === "YOUTUBE_QUOTA") throw e;
      break;
    }
  }
  return out;
}
