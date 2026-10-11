import { z } from "zod";
import { fail, loadSettings, ok, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { toRunSettings } from "@/lib/settings";
import { QuotaMeter, getVideoItems, toVideo } from "@/lib/youtube/client";
import { computeSignals } from "@/lib/trends/signals";
import { prepareForClustering } from "@/lib/trends/prepare";
import { analyzeClusters } from "@/lib/gemini/analyze";
import { buildClusters } from "@/lib/pipeline/runRadar";
import type { VideoSignals } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const body = z.object({ videoIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/)).min(6).max(90) });

/**
 * Stateless analysis: fetch fresh stats for the given ids, calculate signals,
 * ask Gemini Flash for clusters, validate, score. Nothing is persisted.
 */
export async function POST(req: Request) {
  try {
    const parsed = body.safeParse(await readJson(req));
    if (!parsed.success) throw new AppError("INVALID_SETTINGS", "Send { videoIds: [6–90 YouTube ids] }.", 400);
    const { settings } = await loadSettings();
    const rs = toRunSettings(settings);
    const now = new Date();
    const meter = new QuotaMeter();
    const videos = (await getVideoItems(parsed.data.videoIds, meter)).map((i) =>
      toVideo(i, { regionCode: rs.regionCode, sourceCategory: "Analysis", source: "search" }),
    );
    const signals: Record<string, VideoSignals> = Object.fromEntries(videos.map((v) => [v.id, computeSignals(v, [], now)]));
    const rows = prepareForClustering(videos, signals, { lookbackDays: 365, now });
    if (rows.length < 6) throw new AppError("NO_RESULTS", "Need at least 6 long-form videos to analyse.", 400);
    const validated = await analyzeClusters(rows, rs, now);
    const clusters = buildClusters(validated, new Map(videos.map((v) => [v.id, v])), signals, {}, rs.lookbackDays, now);
    return ok({ clusters, quotaUnits: meter.used });
  } catch (e) {
    return fail(e);
  }
}
