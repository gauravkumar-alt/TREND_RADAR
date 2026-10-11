import "server-only";
import { RUN_REUSE_MINUTES, YT_SCIENCE_TECH_CATEGORY } from "../config";
import { hasSupabase } from "../env";
import { AppError, toAppError } from "../errors";
import { runSettingsKey, toRunSettings, type Settings } from "../settings";
import * as repo from "../db/repo";
import { QuotaMeter, getTrendingChart, getVideoItems, searchVideoIds, toVideo } from "../youtube/client";
import { analyzeClusters } from "../gemini/analyze";
import { geminiModelName } from "../gemini/client";
import { computeSignals, bestVelocity } from "../trends/signals";
import { prepareForClustering } from "../trends/prepare";
import { scoreClusters } from "../trends/scoring";
import {
  clusterMetrics,
  confidenceOf,
  creatorsOf,
  formatShares,
  momentumLabel,
  momentumSeries,
  suggestedLength,
  velocityRatio,
  viewHistory,
} from "../trends/metrics";
import type { RadarRun, RunStage, Snapshot, TrendCluster, Video, VideoSignals } from "../types";
import type { ValidatedCluster } from "../gemini/schemas";

export interface RunOptions {
  settings: Settings;
  trigger: "manual" | "cron";
  force?: boolean;
  onStage?: (stage: RunStage, detail?: string) => void;
  now?: Date;
}

export interface RunOutcome {
  run: RadarRun;
  reused: boolean;
  warnings: string[];
}

/** Max search.list calls per run (100 units each). Keeps a full run near 800 of the 10,000 daily units. */
const MAX_SEARCH_CALLS = 8;

export async function collectVideos(settings: RadarRun["settings"], meter: QuotaMeter, now: Date): Promise<Video[]> {
  const publishedAfter = new Date(now.getTime() - settings.lookbackDays * 86400_000).toISOString();
  const perCategory = Math.max(1, Math.floor(MAX_SEARCH_CALLS / Math.max(1, settings.categories.length)));
  const jobs = settings.categories.flatMap((c) =>
    c.keywords.slice(0, Math.min(2, perCategory)).map((q) => ({ category: c.label, q })),
  ).slice(0, MAX_SEARCH_CALLS);

  const results = await Promise.allSettled(
    jobs.map((j) =>
      searchVideoIds(
        {
          q: j.q,
          regionCode: settings.regionCode,
          relevanceLanguage: settings.language,
          publishedAfter,
          maxResults: settings.videosPerCategory,
        },
        meter,
      ).then((ids) => ({ ...j, ids })),
    ),
  );
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  const ok = results.filter((r): r is PromiseFulfilledResult<{ category: string; q: string; ids: string[] }> => r.status === "fulfilled");
  if (!ok.length && failures.length) throw toAppError(failures[0].reason);

  const sourceOf = new Map<string, string>();
  for (const r of ok) for (const id of r.value.ids) if (!sourceOf.has(id)) sourceOf.set(id, r.value.category);

  const [items, chart] = await Promise.all([
    getVideoItems([...sourceOf.keys()], meter),
    getTrendingChart(settings.regionCode, YT_SCIENCE_TECH_CATEGORY, meter),
  ]);
  const videos = items.map((i) => toVideo(i, { regionCode: settings.regionCode, sourceCategory: sourceOf.get(i.id) ?? "Search", source: "search" }));
  const seen = new Set(videos.map((v) => v.id));
  for (const i of chart) {
    if (seen.has(i.id) || i.snippet.publishedAt < publishedAfter) continue;
    videos.push(toVideo(i, { regionCode: settings.regionCode, sourceCategory: "Trending · Science & Tech", source: "trending" }));
    seen.add(i.id);
  }
  return videos;
}

export function buildClusters(
  validated: ValidatedCluster[],
  videoById: Map<string, Video>,
  signals: Record<string, VideoSignals>,
  snapshots: Record<string, Snapshot[]>,
  lookbackDays: number,
  now: Date,
): TrendCluster[] {
  const drafts = validated.map((c) => {
    const vids = c.videoIds.map((id) => videoById.get(id)).filter((v): v is Video => Boolean(v));
    const sigs = vids.map((v) => signals[v.id]);
    const metrics = clusterMetrics(vids, sigs, lookbackDays, now);
    const { ratio } = velocityRatio(sigs);
    const mom = momentumLabel(metrics.coverageGrowth, ratio);
    return { c, vids, sigs, metrics, mom };
  });
  const scores = scoreClusters(
    drafts.map((d) => ({
      videoIds: d.vids.map((v) => v.id),
      channelIds: d.vids.map((v) => v.channelId),
      signals: d.sigs,
      formats: d.vids.map((v) => d.c.videoFormats[v.id] ?? null),
      coverageGrowth: d.metrics.coverageGrowth,
      lookbackHours: lookbackDays * 24,
    })),
  );
  return drafts
    .map((d, i) => {
      // order evidence by velocity so the strongest proof is shown first
      const videoIds = [...d.vids].sort((a, b) => (bestVelocity(signals[b.id]) ?? 0) - (bestVelocity(signals[a.id]) ?? 0)).map((v) => v.id);
      const ai = d.c;
      const cluster: TrendCluster = {
        id: "",
        rank: 0,
        ai: {
          name: ai.name,
          summary: ai.summary,
          whyNow: ai.whyNow,
          momentumNarrative: ai.momentumNarrative,
          audienceSignals: ai.audienceSignals,
          recommendation: ai.recommendation,
        },
        videoIds,
        videoFormats: d.c.videoFormats,
        metrics: d.metrics,
        formats: formatShares(videoIds, d.c.videoFormats, signals),
        creators: creatorsOf(d.vids),
        momentum: d.mom.label,
        momentumBasis: d.mom.basis,
        momentumSeries: momentumSeries(d.vids.map((v) => v.publishedAt), lookbackDays, now),
        viewHistory: viewHistory(snapshots, videoIds),
        score: scores[i].score,
        scoreBreakdown: scores[i].breakdown,
        suggestedLengthSeconds: suggestedLength(d.vids, signals),
        ...confidenceOf(d.metrics, d.mom.basis),
        categories: [...new Set(d.vids.map((v) => v.sourceCategory))],
      };
      return cluster;
    })
    .sort((a, b) => b.score - a.score)
    .map((c, i) => ({ ...c, id: `c${i + 1}`, rank: i + 1 }));
}

/** Reel = the fastest-moving videos of the whole scan, one per channel. */
export function pickReel(videos: Video[], signals: Record<string, VideoSignals>, eligibleIds: Set<string>, n = 5): string[] {
  const used = new Set<string>();
  return videos
    .filter((v) => eligibleIds.has(v.id))
    .sort((a, b) => (bestVelocity(signals[b.id]) ?? 0) - (bestVelocity(signals[a.id]) ?? 0))
    .filter((v) => (used.has(v.channelId) ? false : (used.add(v.channelId), true)))
    .slice(0, n)
    .map((v) => v.id);
}

export async function runRadar(opts: RunOptions): Promise<RunOutcome> {
  const now = opts.now ?? new Date();
  const stage = opts.onStage ?? (() => {});
  const runSettings = toRunSettings(opts.settings);
  const key = runSettingsKey(runSettings);
  const warnings: string[] = [];
  let persist = hasSupabase();

  if (persist && !opts.force) {
    const recent = await repo.getRecentRunForKey(key, RUN_REUSE_MINUTES).catch(() => null);
    if (recent) return { run: recent, reused: true, warnings };
  }

  if (persist && (await repo.hasActiveRun().catch(() => false))) {
    throw new AppError("RUN_IN_PROGRESS", "Another scan is already running. Give it a minute, then refresh.", 409);
  }

  const id = crypto.randomUUID();
  const startedAt = now.toISOString();
  if (persist) {
    try {
      await repo.createRun(id, { settings: runSettings, startedAt }, key, opts.trigger);
    } catch {
      persist = false;
      warnings.push("The database is unreachable, so this scan won't be saved to history.");
    }
  }

  const meter = new QuotaMeter();
  try {
    stage("COLLECTING SIGNALS", `${runSettings.categories.length} categories · ${runSettings.regionCode}`);
    const videos = await collectVideos(runSettings, meter, now);
    if (!videos.length) throw new AppError("NO_RESULTS", "No videos matched these categories in the lookback window.", 404);

    stage("ANALYZING CREATOR COVERAGE", `${videos.length} videos · ${new Set(videos.map((v) => v.channelId)).size} channels`);
    let snapshots: Record<string, Snapshot[]> = {};
    if (persist) {
      try {
        await repo.upsertVideos(videos);
        snapshots = await repo.getSnapshots(videos.map((v) => v.id));
        await repo.insertSnapshots(videos, snapshots, startedAt);
      } catch {
        warnings.push("Snapshots couldn't be stored this time, so view history won't advance.");
      }
    }
    // Include this run's observation in the history used for velocity.
    for (const v of videos) {
      const list = (snapshots[v.id] ??= []);
      if (!list.some((s) => s.capturedAt === startedAt)) list.push({ videoId: v.id, capturedAt: startedAt, views: v.views, likes: v.likes, comments: v.comments });
    }
    const signals: Record<string, VideoSignals> = {};
    for (const v of videos) signals[v.id] = computeSignals(v, snapshots[v.id] ?? [], now);

    stage("IDENTIFYING PATTERNS", "Gemini Flash is grouping the conversations");
    const rows = prepareForClustering(videos, signals, { lookbackDays: runSettings.lookbackDays, now });
    if (rows.length < 6) {
      throw new AppError("NO_RESULTS", "Too few long-form videos in this window to find a pattern.", 404);
    }
    const validated = await analyzeClusters(rows, runSettings, now);

    stage("CALCULATING MOMENTUM", `${validated.length} clusters`);
    const byId = new Map(videos.map((v) => [v.id, v]));
    const clusters = buildClusters(validated, byId, signals, snapshots, runSettings.lookbackDays, now);
    // Reel prefers on-topic (clustered) videos; the raw trending chart can be off-category.
    const clustered = new Set(clusters.flatMap((c) => c.videoIds));
    let reelVideoIds = pickReel(videos, signals, clustered);
    if (reelVideoIds.length < 5) {
      const extra = pickReel(videos, signals, new Set(rows.map((r) => r.id).filter((x) => !clustered.has(x))), 5 - reelVideoIds.length);
      reelVideoIds = [...reelVideoIds, ...extra];
    }

    const keep = new Set([...clusters.flatMap((c) => c.videoIds), ...reelVideoIds]);
    const run: RadarRun = {
      id,
      status: "succeeded",
      startedAt,
      completedAt: new Date().toISOString(),
      settings: runSettings,
      videosFetched: videos.length,
      videosAnalyzed: rows.length,
      quotaUnitsUsed: meter.used,
      clusters,
      videos: Object.fromEntries([...keep].map((vid) => [vid, byId.get(vid)!])),
      signals: Object.fromEntries([...keep].map((vid) => [vid, signals[vid]])),
      reelVideoIds,
      model: geminiModelName(),
      persisted: persist,
      error: null,
    };
    if (persist) {
      try {
        await repo.completeRun(run);
      } catch {
        run.persisted = false;
        warnings.push("The scan finished but couldn't be saved to history.");
      }
    }
    return { run, reused: false, warnings };
  } catch (err) {
    const e = toAppError(err);
    if (persist) await repo.failRun(id, e.code, e.message).catch(() => {});
    throw e;
  }
}
