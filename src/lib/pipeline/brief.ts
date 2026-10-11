import "server-only";
import { hasSupabase } from "../env";
import { AppError } from "../errors";
import * as repo from "../db/repo";
import { writeBrief } from "../gemini/analyze";
import { geminiModelName } from "../gemini/client";
import { briefWeekOf } from "../time";
import type { Brief, RadarRun } from "../types";

export async function generateBriefForRun(run: RadarRun, now = new Date()): Promise<Brief> {
  if (!run.clusters.length) throw new AppError("NO_RESULTS", "This scan has no clusters to brief.", 404);
  const content = await writeBrief(run.clusters, run.settings, run.videosAnalyzed);
  const draft = { runId: run.id, weekOf: briefWeekOf(now), content, model: geminiModelName() };
  if (hasSupabase() && run.persisted) {
    try {
      return await repo.saveBrief(draft);
    } catch {
      // fall through: the brief is still useful unsaved
    }
  }
  return { ...draft, id: `unsaved-${run.id}`, createdAt: now.toISOString() };
}
