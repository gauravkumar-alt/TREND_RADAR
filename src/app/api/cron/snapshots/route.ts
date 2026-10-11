import { assertCron, fail, ok } from "@/lib/api";
import * as repo from "@/lib/db/repo";
import { QuotaMeter, getVideoItems, toVideo } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily: re-observe every tracked video published in the last 14 days
 * (videos.list, 1 unit per 50 ids) and store a snapshot. This is what turns
 * "BUILDING BASELINE" into measured view velocity by the next Sunday.
 */
export async function GET(req: Request) {
  try {
    assertCron(req);
    const ids = await repo.getTrackedVideoIds(14, 500);
    if (!ids.length) return ok({ tracked: 0, inserted: 0, quotaUnits: 0 });
    const meter = new QuotaMeter();
    const items = await getVideoItems(ids, meter);
    const videos = items.map((i) => toVideo(i, { regionCode: "", sourceCategory: "", source: "search" }));
    const existing = await repo.getSnapshots(videos.map((v) => v.id));
    const inserted = await repo.insertSnapshots(videos, existing, new Date().toISOString());
    return ok({ tracked: ids.length, inserted, quotaUnits: meter.used });
  } catch (e) {
    return fail(e);
  }
}
