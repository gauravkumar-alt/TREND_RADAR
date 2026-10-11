import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { REGIONS } from "@/lib/config";
import { QuotaMeter, getVideoItems, searchVideoIds, toVideo } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";

const query = z.object({
  q: z.string().trim().min(2).max(80),
  region: z.string().refine((r) => REGIONS.some((x) => x.code === r)).default("IN"),
  days: z.coerce.number().int().min(1).max(30).default(7),
  max: z.coerce.number().int().min(1).max(25).default(15),
  lang: z.string().max(5).optional(),
});

/** Keyword search → full stats. Costs ~101 quota units, cached 15 min per instance. */
export async function GET(req: Request) {
  try {
    const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) throw new AppError("INVALID_SETTINGS", "Use ?q=<2–80 chars>&region=IN&days=7&max=15", 400);
    const { q, region, days, max, lang } = parsed.data;
    const meter = new QuotaMeter();
    const ids = await searchVideoIds(
      { q, regionCode: region, relevanceLanguage: lang, maxResults: max, publishedAfter: new Date(Date.now() - days * 86400_000).toISOString() },
      meter,
    );
    const items = await getVideoItems(ids, meter);
    return ok({ videos: items.map((i) => toVideo(i, { regionCode: region, sourceCategory: q, source: "search" })), quotaUnits: meter.used });
  } catch (e) {
    return fail(e);
  }
}
