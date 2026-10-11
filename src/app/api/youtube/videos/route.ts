import { fail, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { QuotaMeter, getVideoItems, toVideo } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";

/** Fresh stats for up to 50 ids: ?ids=a,b,c (1 quota unit). */
export async function GET(req: Request) {
  try {
    const ids = (new URL(req.url).searchParams.get("ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[A-Za-z0-9_-]{11}$/.test(s));
    if (!ids.length || ids.length > 50) throw new AppError("INVALID_SETTINGS", "Pass 1–50 valid video ids as ?ids=a,b,c", 400);
    const meter = new QuotaMeter();
    const items = await getVideoItems(ids, meter);
    const region = new URL(req.url).searchParams.get("region") ?? "IN";
    return ok({ videos: items.map((i) => toVideo(i, { regionCode: region, sourceCategory: "Lookup", source: "search" })), quotaUnits: meter.used });
  } catch (e) {
    return fail(e);
  }
}
