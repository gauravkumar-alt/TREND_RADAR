/**
 * Shared domain types. Every numeric field here is OBSERVED (from YouTube)
 * or CALCULATED (by lib/trends). Gemini only ever fills the `ai` blocks.
 */

export type Provenance = "observed" | "calculated" | "ai" | "recommendation";

export const VIDEO_FORMATS = [
  "Tutorial",
  "Comparison",
  "Review",
  "Explainer",
  "News reaction",
  "Experiment",
  "Listicle",
  "Walkthrough",
] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export type MomentumLabel = "RISING" | "STABLE" | "COOLING" | "BUILDING BASELINE";

export interface Video {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string; // ISO
  thumbnailUrl: string;
  durationSeconds: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  regionCode: string;
  categoryId: string | null;
  /** Which configured content category surfaced this video. */
  sourceCategory: string;
  /** "search" = keyword search, "trending" = mostPopular chart. */
  source: "search" | "trending";
  /** ISO 3166-1 numeric code of the channel's listed country (channels.list). null when the creator doesn't list one. */
  channelCountry?: string | null;
  fetchedAt: string;
}

export interface Snapshot {
  videoId: string;
  capturedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
}

/** Per-video signals, all CALCULATED from observed data. */
export interface VideoSignals {
  videoId: string;
  ageHours: number;
  engagementRate: number | null; // (likes + comments) / views
  viewsPerHour: number | null; // lifetime average
  viewsPerDay: number | null;
  /** From snapshots. null until two snapshots exist. */
  snapshotViewsPerHour: number | null;
  snapshotViewGrowth: number | null; // fractional growth between first and last snapshot
  snapshotEngagementGrowth: number | null;
  snapshotSpanHours: number | null;
}

export interface ClusterMetrics {
  videoCount: number;
  creatorCount: number;
  totalViews: number | null;
  avgViews: number | null;
  medianViews: number | null;
  avgDurationSeconds: number | null;
  medianDurationSeconds: number | null;
  avgEngagementRate: number | null;
  avgViewsPerHour: number | null;
  /** Uploads in the newer half of the lookback vs the older half. null if too few. */
  coverageGrowth: number | null;
  recentUploads: number; // last 72h
  /** Videos with >= 2 snapshots (history available). */
  videosWithHistory: number;
  snapshotViewsPerHour: number | null;
  newestUploadAt: string | null;
}

export interface ScoreBreakdown {
  topicFrequency: number;
  momentum: number;
  creatorDiversity: number;
  engagement: number;
  recency: number;
  formatMomentum: number;
}

export interface FormatShare {
  format: VideoFormat;
  count: number;
  share: number; // 0-1 of classified videos
  avgViewsPerHour: number | null;
}

export interface MomentumPoint {
  date: string; // yyyy-MM-dd
  uploads: number;
  cumulative: number;
}

/** Indexed view growth: mean of (views at capture / views at first capture) across cluster videos with history. */
export interface ViewHistoryPoint {
  capturedAt: string;
  index: number;
  videos: number;
}

export interface ClusterAI {
  name: string;
  /** 1–3 word label for the radar orbit. Optional: older scans don't have it. */
  keyword?: string;
  summary: string;
  whyNow: string;
  momentumNarrative: string;
  audienceSignals: string[];
  recommendation: {
    shouldCover: boolean;
    reason: string;
    angle: string;
    possibleTitle: string;
    format: VideoFormat;
  };
}

export interface TrendCluster {
  id: string; // stable within a run, e.g. "c1"
  rank: number;
  ai: ClusterAI;
  videoIds: string[];
  /** Format per video id, as classified by Gemini. Counts are calculated by the app. */
  videoFormats: Record<string, VideoFormat>;
  metrics: ClusterMetrics;
  formats: FormatShare[];
  creators: { channelId: string; channelTitle: string; videoCount: number; totalViews: number | null }[];
  momentum: MomentumLabel;
  momentumBasis: "coverage" | "coverage+snapshots" | "insufficient";
  momentumSeries: MomentumPoint[];
  viewHistory: ViewHistoryPoint[]; // empty until snapshots exist
  score: number; // 0-100
  scoreBreakdown: ScoreBreakdown;
  suggestedLengthSeconds: number | null; // CALCULATED: median duration of top-performing cluster videos
  confidence: "HIGH" | "MEDIUM" | "LOW";
  confidenceReason: string;
  categories: string[];
}

export interface RunSettingsSnapshot {
  categories: { id: string; label: string; keywords: string[] }[];
  regionCode: string;
  language: string;
  lookbackDays: number;
  videosPerCategory: number;
  creatorName: string;
}

export interface RadarRun {
  id: string;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  completedAt: string | null;
  settings: RunSettingsSnapshot;
  videosAnalyzed: number;
  videosFetched: number;
  quotaUnitsUsed: number;
  clusters: TrendCluster[];
  /** All videos referenced by clusters + the reel, with stats as observed at run time. */
  videos: Record<string, Video>;
  signals: Record<string, VideoSignals>;
  /** Ids for the Live Radar reel: highest views/hour across the whole scan. */
  reelVideoIds: string[];
  model: string;
  persisted: boolean;
  error: string | null;
}

export interface BriefContent {
  headline: string;
  dek: string;
  topStory: { clusterId: string; whyItMatters: string; recommendedAction: string };
  opportunities: { clusterId: string; whyNow: string; recommendation: string }[];
  mondayPlan: { film: string; format: VideoFormat; angle: string; title: string; why: string; clusterId: string };
}

export interface Brief {
  id: string;
  runId: string;
  createdAt: string;
  weekOf: string; // yyyy-MM-dd (the Sunday)
  content: BriefContent;
  model: string;
}

export type RunStage =
  | "COLLECTING SIGNALS"
  | "ANALYZING CREATOR COVERAGE"
  | "IDENTIFYING PATTERNS"
  | "CALCULATING MOMENTUM"
  | "GENERATING BRIEF";

export const RUN_STAGES: RunStage[] = [
  "COLLECTING SIGNALS",
  "ANALYZING CREATOR COVERAGE",
  "IDENTIFYING PATTERNS",
  "CALCULATING MOMENTUM",
  "GENERATING BRIEF",
];
