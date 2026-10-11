import "server-only";
import { hasSupabase, serviceStatus } from "./env";
import { toAppError } from "./errors";
import * as repo from "./db/repo";
import { loadSettings } from "./api";
import type { Brief, RadarRun } from "./types";
import type { Settings } from "./settings";

export interface PageData {
  run: RadarRun | null;
  failure: { at: string; message: string } | null;
  history: repo.RunSummary[];
  settings: Settings;
  settingsSource: "database" | "defaults";
  status: ReturnType<typeof serviceStatus>;
  dbError: string | null;
  brief: Brief | null;
  lastDelivery: { at: string; status: string; recipient: string } | null;
}

/** Everything a page needs, loaded server-side. Never throws: failures become `dbError`. */
export async function loadPageData(opts: { runId?: string; withBrief?: boolean } = {}): Promise<PageData> {
  const status = serviceStatus();
  const { settings, source } = await loadSettings();
  const base: PageData = {
    run: null,
    failure: null,
    history: [],
    settings,
    settingsSource: source,
    status,
    dbError: null,
    brief: null,
    lastDelivery: null,
  };
  if (!hasSupabase()) return { ...base, dbError: "The database isn't configured yet, so scans aren't saved. You can still run the radar." };
  try {
    const run = opts.runId ? await repo.getRun(opts.runId) : await repo.getLatestRun();
    const [failure, history, brief] = await Promise.all([
      opts.runId ? Promise.resolve(null) : repo.getFailureSince(run?.completedAt ?? null),
      repo.listRuns(12).catch(() => []),
      opts.withBrief && run ? repo.getBriefForRun(run.id) : Promise.resolve(null),
    ]);
    const lastDelivery = brief ? await repo.getLastDelivery(brief.id).catch(() => null) : null;
    return { ...base, run, failure, history, brief, lastDelivery };
  } catch (e) {
    return { ...base, dbError: toAppError(e).message };
  }
}
