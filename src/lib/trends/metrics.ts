import { format as fmtDate, subDays } from "date-fns";
import { mean, median, sum } from "./normalize";
import { bestVelocity } from "./signals";
import type {
  ClusterMetrics,
  FormatShare,
  MomentumLabel,
  MomentumPoint,
  Snapshot,
  TrendCluster,
  Video,
  VideoFormat,
  VideoSignals,
  ViewHistoryPoint,
} from "../types";

const HOUR = 3600 * 1000;

/**
 * Coverage growth: uploads in the newer half of the lookback window vs the
 * older half. Observed from publish dates, so it needs no stored history.
 * Returns null with fewer than 4 videos — too thin to call a direction.
 */
export function coverageGrowth(publishedAt: string[], lookbackDays: number, now: Date): number | null {
  if (publishedAt.length < 4) return null;
  const mid = now.getTime() - (lookbackDays * 24 * HOUR) / 2;
  const start = now.getTime() - lookbackDays * 24 * HOUR;
  let newer = 0;
  let older = 0;
  for (const p of publishedAt) {
    const t = new Date(p).getTime();
    if (t >= mid) newer++;
    else if (t >= start) older++;
  }
  if (newer + older < 4) return null;
  return (newer - older) / Math.max(1, older);
}

/** Median of snapshot velocity / lifetime velocity. >1 means views are coming in faster now than on average. */
export function velocityRatio(signals: VideoSignals[]): { ratio: number | null; n: number } {
  const ratios = signals
    .filter((s) => s.snapshotViewsPerHour != null && s.viewsPerHour)
    .map((s) => (s.snapshotViewsPerHour as number) / (s.viewsPerHour as number));
  return { ratio: ratios.length >= 2 ? median(ratios) : null, n: ratios.length };
}

export function momentumLabel(
  growth: number | null,
  ratio: number | null,
): { label: MomentumLabel; basis: TrendCluster["momentumBasis"] } {
  if (growth == null && ratio == null) return { label: "BUILDING BASELINE", basis: "insufficient" };
  let s = 0;
  if (growth != null) s += growth >= 0.25 ? 1 : growth <= -0.25 ? -1 : 0;
  if (ratio != null) s += ratio >= 0.9 ? 1 : ratio <= 0.35 ? -1 : 0;
  const label: MomentumLabel = s > 0 ? "RISING" : s < 0 ? "COOLING" : "STABLE";
  return { label, basis: ratio != null ? "coverage+snapshots" : growth != null ? "coverage" : "insufficient" };
}

export function momentumSeries(publishedAt: string[], lookbackDays: number, now: Date): MomentumPoint[] {
  const days: MomentumPoint[] = [];
  let cumulative = 0;
  for (let i = lookbackDays - 1; i >= 0; i--) {
    const day = fmtDate(subDays(now, i), "yyyy-MM-dd");
    const uploads = publishedAt.filter((p) => fmtDate(new Date(p), "yyyy-MM-dd") === day).length;
    cumulative += uploads;
    days.push({ date: day, uploads, cumulative });
  }
  return days;
}

/** Indexed view growth per capture hour. Only videos with ≥2 snapshots count. Empty = no history yet. */
export function viewHistory(snapsByVideo: Record<string, Snapshot[]>, videoIds: string[]): ViewHistoryPoint[] {
  const buckets = new Map<string, number[]>();
  for (const id of videoIds) {
    const snaps = (snapsByVideo[id] ?? [])
      .filter((s) => s.views != null)
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    if (snaps.length < 2 || !snaps[0].views) continue;
    const base = snaps[0].views as number;
    for (const s of snaps) {
      const key = s.capturedAt.slice(0, 13) + ":00:00.000Z";
      buckets.set(key, [...(buckets.get(key) ?? []), (s.views as number) / base]);
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([capturedAt, xs]) => ({ capturedAt, index: mean(xs) as number, videos: xs.length }));
}

export function clusterMetrics(
  videos: Video[],
  signals: VideoSignals[],
  lookbackDays: number,
  now: Date,
): ClusterMetrics {
  const views = videos.map((v) => v.views);
  const newest = videos.map((v) => v.publishedAt).sort().at(-1) ?? null;
  return {
    videoCount: videos.length,
    creatorCount: new Set(videos.map((v) => v.channelId)).size,
    totalViews: sum(views),
    avgViews: mean(views),
    medianViews: median(views),
    avgDurationSeconds: mean(videos.map((v) => v.durationSeconds)),
    medianDurationSeconds: median(videos.map((v) => v.durationSeconds)),
    avgEngagementRate: mean(signals.map((s) => s.engagementRate)),
    avgViewsPerHour: mean(signals.map((s) => s.viewsPerHour)),
    coverageGrowth: coverageGrowth(
      videos.map((v) => v.publishedAt),
      lookbackDays,
      now,
    ),
    recentUploads: videos.filter((v) => now.getTime() - new Date(v.publishedAt).getTime() <= 72 * HOUR).length,
    videosWithHistory: signals.filter((s) => s.snapshotViewsPerHour != null).length,
    snapshotViewsPerHour: mean(signals.map((s) => s.snapshotViewsPerHour)),
    newestUploadAt: newest,
  };
}

export function formatShares(videoIds: string[], formats: Record<string, VideoFormat>, signals: Record<string, VideoSignals>): FormatShare[] {
  const classified = videoIds.filter((id) => formats[id]);
  if (!classified.length) return [];
  const groups = new Map<VideoFormat, string[]>();
  for (const id of classified) groups.set(formats[id], [...(groups.get(formats[id]) ?? []), id]);
  return [...groups.entries()]
    .map(([format, ids]) => ({
      format,
      count: ids.length,
      share: ids.length / classified.length,
      avgViewsPerHour: mean(ids.map((id) => (signals[id] ? bestVelocity(signals[id]) : null))),
    }))
    .sort((a, b) => b.count - a.count || (b.avgViewsPerHour ?? 0) - (a.avgViewsPerHour ?? 0));
}

export function creatorsOf(videos: Video[]): TrendCluster["creators"] {
  const map = new Map<string, TrendCluster["creators"][number]>();
  for (const v of videos) {
    const c = map.get(v.channelId) ?? { channelId: v.channelId, channelTitle: v.channelTitle, videoCount: 0, totalViews: null };
    c.videoCount++;
    if (v.views != null) c.totalViews = (c.totalViews ?? 0) + v.views;
    map.set(v.channelId, c);
  }
  return [...map.values()].sort((a, b) => b.videoCount - a.videoCount || (b.totalViews ?? 0) - (a.totalViews ?? 0));
}

/** Median duration of the faster half of the cluster, rounded to the minute. */
export function suggestedLength(videos: Video[], signals: Record<string, VideoSignals>): number | null {
  const ranked = videos
    .filter((v) => v.durationSeconds != null && signals[v.id])
    .sort((a, b) => (bestVelocity(signals[b.id]) ?? 0) - (bestVelocity(signals[a.id]) ?? 0));
  if (ranked.length < 2) return null;
  const top = ranked.slice(0, Math.max(2, Math.ceil(ranked.length / 2)));
  const m = median(top.map((v) => v.durationSeconds));
  return m == null ? null : Math.max(60, Math.round(m / 60) * 60);
}

export function confidenceOf(m: ClusterMetrics, basis: TrendCluster["momentumBasis"]): Pick<TrendCluster, "confidence" | "confidenceReason"> {
  const parts = [`${m.videoCount} videos`, `${m.creatorCount} creators`];
  if (basis === "insufficient") parts.push("no momentum baseline yet");
  else if (basis === "coverage") parts.push("momentum from upload timing only");
  else parts.push("momentum confirmed by stored snapshots");
  const reason = parts.join(" · ");
  if (m.videoCount >= 6 && m.creatorCount >= 4 && basis !== "insufficient") return { confidence: "HIGH", confidenceReason: reason };
  if (m.videoCount >= 4 && m.creatorCount >= 3) return { confidence: "MEDIUM", confidenceReason: reason };
  return { confidence: "LOW", confidenceReason: reason };
}
