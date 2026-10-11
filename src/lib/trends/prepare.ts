import { MIN_DURATION_SECONDS } from "../config";
import { bestVelocity } from "./signals";
import type { Video, VideoSignals } from "../types";

export interface PreparedVideo {
  ref: string; // short id sent to Gemini ("v12") to save tokens and make hallucinated ids detectable
  id: string;
  title: string;
  channel: string;
  ageHours: number;
  durationMin: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  viewsPerHour: number | null;
  engagementPct: number | null;
  category: string;
  description: string;
}

export const MAX_GEMINI_VIDEOS = 90;

/** Strip links, hashtags walls and sponsor boilerplate; keep the first sentence or two. */
export function compactDescription(d: string, max = 160): string {
  const cleaned = d
    .replace(/https?:\/\/\S+/g, "")
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1).trimEnd() + "…" : cleaned;
}

/**
 * Cluster preparation: dedupe, drop Shorts and out-of-window uploads, cap
 * per-channel dominance, keep the strongest MAX_GEMINI_VIDEOS by velocity,
 * and emit a compact table for Gemini.
 */
export function prepareForClustering(
  videos: Video[],
  signals: Record<string, VideoSignals>,
  opts: { lookbackDays: number; now: Date; maxVideos?: number; maxPerChannel?: number },
): PreparedVideo[] {
  const cutoff = opts.now.getTime() - opts.lookbackDays * 24 * 3600 * 1000;
  const seen = new Set<string>();
  const perChannel = new Map<string, number>();
  const maxPerChannel = opts.maxPerChannel ?? 4;

  const eligible = videos
    .filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      if (new Date(v.publishedAt).getTime() < cutoff) return false;
      if (v.durationSeconds != null && v.durationSeconds < MIN_DURATION_SECONDS) return false;
      if (/#shorts?\b/i.test(v.title)) return false;
      return Boolean(signals[v.id]);
    })
    .sort((a, b) => (bestVelocity(signals[b.id]) ?? -1) - (bestVelocity(signals[a.id]) ?? -1))
    .filter((v) => {
      const n = perChannel.get(v.channelId) ?? 0;
      if (n >= maxPerChannel) return false;
      perChannel.set(v.channelId, n + 1);
      return true;
    })
    .slice(0, opts.maxVideos ?? MAX_GEMINI_VIDEOS);

  return eligible.map((v, i) => {
    const s = signals[v.id];
    return {
      ref: `v${i + 1}`,
      id: v.id,
      title: v.title,
      channel: v.channelTitle,
      ageHours: Math.round(s.ageHours),
      durationMin: v.durationSeconds == null ? null : Math.round((v.durationSeconds / 60) * 10) / 10,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      viewsPerHour: s.viewsPerHour == null ? null : Math.round(s.viewsPerHour),
      engagementPct: s.engagementRate == null ? null : Math.round(s.engagementRate * 1000) / 10,
      category: v.sourceCategory,
      description: compactDescription(v.description),
    };
  });
}

/** Pipe-separated table: far fewer tokens than JSON for 90 rows. */
export function toPromptTable(rows: PreparedVideo[]): string {
  const header = "ref | title | channel | age_h | dur_min | views | likes | comments | views_per_h | engagement_% | category | description";
  const clean = (s: string) => s.replace(/\|/g, "/");
  const n = (x: number | null) => (x == null ? "?" : String(x));
  return [
    header,
    ...rows.map((r) =>
      [r.ref, clean(r.title), clean(r.channel), r.ageHours, n(r.durationMin), n(r.views), n(r.likes), n(r.comments), n(r.viewsPerHour), n(r.engagementPct), r.category, clean(r.description)].join(" | "),
    ),
  ].join("\n");
}
