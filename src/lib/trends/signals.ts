import type { Snapshot, Video, VideoSignals } from "../types";

const HOUR = 3600 * 1000;
/** Floor for age so a video published minutes ago doesn't get an absurd views/hour. */
export const MIN_AGE_HOURS = 1;

export function ageHours(publishedAt: string, now: Date): number {
  return Math.max(MIN_AGE_HOURS, (now.getTime() - new Date(publishedAt).getTime()) / HOUR);
}

/** (likes + comments) / views. null if views unknown/zero or both likes and comments are hidden. */
export function engagementRate(v: Pick<Video, "views" | "likes" | "comments">): number | null {
  if (!v.views || v.views <= 0) return null;
  if (v.likes == null && v.comments == null) return null;
  return ((v.likes ?? 0) + (v.comments ?? 0)) / v.views;
}

export function viewsPerHour(views: number | null, hours: number): number | null {
  if (views == null || hours <= 0) return null;
  return views / hours;
}

/**
 * Velocity from stored snapshots (oldest → newest). Needs two snapshots at
 * least 30 minutes apart; otherwise every field is null (BUILDING BASELINE).
 */
export function snapshotVelocity(snaps: Snapshot[]): Pick<
  VideoSignals,
  "snapshotViewsPerHour" | "snapshotViewGrowth" | "snapshotEngagementGrowth" | "snapshotSpanHours"
> {
  const empty = { snapshotViewsPerHour: null, snapshotViewGrowth: null, snapshotEngagementGrowth: null, snapshotSpanHours: null };
  const valid = snaps
    .filter((s) => s.views != null)
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  if (valid.length < 2) return empty;
  const first = valid[0];
  const last = valid[valid.length - 1];
  const span = (new Date(last.capturedAt).getTime() - new Date(first.capturedAt).getTime()) / HOUR;
  if (span < 0.5) return empty;
  const dv = (last.views as number) - (first.views as number);
  const firstEng = (first.likes ?? 0) + (first.comments ?? 0);
  const lastEng = (last.likes ?? 0) + (last.comments ?? 0);
  const engKnown = first.likes != null || first.comments != null;
  return {
    snapshotViewsPerHour: Math.max(0, dv) / span,
    snapshotViewGrowth: (first.views as number) > 0 ? dv / (first.views as number) : null,
    snapshotEngagementGrowth: engKnown && firstEng > 0 ? (lastEng - firstEng) / firstEng : null,
    snapshotSpanHours: span,
  };
}

export function computeSignals(video: Video, snaps: Snapshot[], now: Date): VideoSignals {
  const hours = ageHours(video.publishedAt, now);
  const vph = viewsPerHour(video.views, hours);
  return {
    videoId: video.id,
    ageHours: hours,
    engagementRate: engagementRate(video),
    viewsPerHour: vph,
    viewsPerDay: vph == null ? null : vph * 24,
    ...snapshotVelocity(snaps),
  };
}

/** Best available velocity for a video: measured between snapshots if we have them, else lifetime average. */
export function bestVelocity(s: VideoSignals): number | null {
  return s.snapshotViewsPerHour ?? s.viewsPerHour;
}
