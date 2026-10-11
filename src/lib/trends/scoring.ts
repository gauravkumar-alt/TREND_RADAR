/**
 * TREND SCORE (0–100)
 *
 *   Topic frequency   25%  — how many videos the cluster holds (vs. the largest cluster)
 *   Momentum          20%  — view velocity (snapshot-measured when available) + coverage growth
 *   Creator diversity 15%  — distinct channels, rewarding many creators over one prolific channel
 *   Engagement        15%  — mean (likes + comments) / views
 *   Recency           15%  — how fresh the uploads are inside the lookback window
 *   Format momentum   10%  — how far the cluster's leading format outruns the cluster median
 *
 * Every input is CALCULATED from observed YouTube data, then min-max
 * normalised across the clusters of the same run. Gemini never touches this.
 */
import { clamp01, logMinMax, mean, median, minMax } from "./normalize";
import { bestVelocity } from "./signals";
import type { ScoreBreakdown, VideoFormat, VideoSignals } from "../types";

export const WEIGHTS: ScoreBreakdown = {
  topicFrequency: 0.25,
  momentum: 0.2,
  creatorDiversity: 0.15,
  engagement: 0.15,
  recency: 0.15,
  formatMomentum: 0.1,
};

export interface ScoringInput {
  videoIds: string[];
  channelIds: string[]; // parallel to videoIds
  signals: VideoSignals[]; // parallel to videoIds
  formats: (VideoFormat | null)[]; // parallel to videoIds
  coverageGrowth: number | null;
  lookbackHours: number;
}

export interface RawFactors {
  frequency: number;
  velocity: number | null;
  coverageGrowth: number | null;
  diversity: number;
  engagement: number | null;
  recency: number | null;
  formatLift: number | null;
}

/** Distinct creators, discounted when one channel dominates: unique * (unique / videos)^0.5 */
export function creatorDiversity(channelIds: string[]): number {
  if (!channelIds.length) return 0;
  const unique = new Set(channelIds).size;
  return unique * Math.sqrt(unique / channelIds.length);
}

/** 1 for a video published right now, 0 for one at the edge of the lookback window. */
export function recencyOf(ageHours: number, lookbackHours: number): number {
  return clamp01(1 - ageHours / Math.max(1, lookbackHours));
}

/** Leading format's median velocity relative to the cluster median velocity (1 = no lift). */
export function formatLift(formats: (VideoFormat | null)[], velocities: (number | null)[]): number | null {
  const byFormat = new Map<VideoFormat, number[]>();
  formats.forEach((f, i) => {
    const v = velocities[i];
    if (!f || v == null) return;
    byFormat.set(f, [...(byFormat.get(f) ?? []), v]);
  });
  if (!byFormat.size) return null;
  const overall = median(velocities);
  if (!overall) return null;
  // leading format = most videos; ties broken by velocity
  const [, vs] = [...byFormat.entries()].sort((a, b) => b[1].length - a[1].length || (median(b[1]) ?? 0) - (median(a[1]) ?? 0))[0];
  const m = median(vs);
  return m == null ? null : m / overall;
}

export function rawFactors(input: ScoringInput): RawFactors {
  const velocities = input.signals.map(bestVelocity);
  return {
    frequency: input.videoIds.length,
    velocity: mean(velocities),
    coverageGrowth: input.coverageGrowth,
    diversity: creatorDiversity(input.channelIds),
    engagement: mean(input.signals.map((s) => s.engagementRate)),
    recency: mean(input.signals.map((s) => recencyOf(s.ageHours, input.lookbackHours))),
    formatLift: formatLift(input.formats, velocities),
  };
}

/** Missing factors score 0 for that component (never invented), so incomplete data can only lower a score. */
const orZero = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? 0 : n);

/** Score a set of clusters relative to each other. Returns 0–100 integers and per-factor normalised values. */
export function scoreClusters(inputs: ScoringInput[]): { score: number; breakdown: ScoreBreakdown }[] {
  const raw = inputs.map(rawFactors);
  const freq = minMax(raw.map((r) => r.frequency));
  const vel = logMinMax(raw.map((r) => r.velocity));
  const cov = minMax(raw.map((r) => (r.coverageGrowth == null ? null : Math.max(-1, Math.min(3, r.coverageGrowth)))));
  const div = minMax(raw.map((r) => r.diversity));
  const eng = minMax(raw.map((r) => r.engagement));
  // recency and lift are already on absolute scales; keep them absolute so a stale run doesn't look fresh.
  const lift = raw.map((r) => (r.formatLift == null ? null : clamp01((r.formatLift - 0.5) / 1.5)));

  return raw.map((r, i) => {
    const momentum = cov[i] == null ? orZero(vel[i]) : 0.7 * orZero(vel[i]) + 0.3 * orZero(cov[i]);
    const breakdown: ScoreBreakdown = {
      topicFrequency: orZero(freq[i]),
      momentum,
      creatorDiversity: orZero(div[i]),
      engagement: orZero(eng[i]),
      recency: orZero(r.recency),
      formatMomentum: orZero(lift[i]),
    };
    const total = (Object.keys(WEIGHTS) as (keyof ScoreBreakdown)[]).reduce((acc, k) => acc + WEIGHTS[k] * breakdown[k], 0);
    return { score: Math.round(clamp01(total) * 100), breakdown };
  });
}
