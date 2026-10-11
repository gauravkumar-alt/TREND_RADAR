import { z } from "zod";
import { fail, ok, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import * as repo from "@/lib/db/repo";
import { generateBriefForRun } from "@/lib/pipeline/brief";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const body = z.object({ runId: z.string().uuid().optional() });

export async function POST(req: Request) {
  try {
    const parsed = body.safeParse(await readJson(req));
    if (!parsed.success) throw new AppError("INVALID_SETTINGS", "Send { runId?: uuid }.", 400);
    const run = parsed.data.runId ? await repo.getRun(parsed.data.runId) : await repo.getLatestRun();
    if (!run) throw new AppError("NOT_FOUND", "There's no saved scan to brief yet. Run the radar first.", 404);
    const brief = await generateBriefForRun(run);
    return ok({ brief });
  } catch (e) {
    return fail(e);
  }
}
