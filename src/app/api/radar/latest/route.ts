import { fail, ok } from "@/lib/api";
import { hasSupabase } from "@/lib/env";
import { AppError } from "@/lib/errors";
import * as repo from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasSupabase()) throw new AppError("SUPABASE_UNAVAILABLE", "The database isn't configured, so there's no saved scan.", 503);
    const run = await repo.getLatestRun();
    const failure = await repo.getFailureSince(run?.completedAt ?? null);
    const history = await repo.listRuns(10).catch(() => []);
    return ok({ run, failure, history });
  } catch (e) {
    return fail(e);
  }
}
