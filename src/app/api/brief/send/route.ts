import { z } from "zod";
import { fail, loadSettings, ok, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import * as repo from "@/lib/db/repo";
import { renderBriefEmail, sendEmail } from "@/lib/email/brief";

export const dynamic = "force-dynamic";

const body = z.object({ briefId: z.string().uuid().optional() });

/** Sends a brief to the address saved in settings (never an arbitrary address). */
export async function POST(req: Request) {
  try {
    const parsed = body.safeParse(await readJson(req));
    if (!parsed.success) throw new AppError("INVALID_SETTINGS", "Send { briefId?: uuid }.", 400);
    const { settings } = await loadSettings();
    if (!settings.email) throw new AppError("INVALID_SETTINGS", "Add an email address in Settings first.", 400);
    const run = await repo.getLatestRun();
    const brief = parsed.data.briefId ? await repo.getBrief(parsed.data.briefId) : run ? await repo.getBriefForRun(run.id) : null;
    if (!brief) throw new AppError("NOT_FOUND", "No saved brief to send yet.", 404);
    const briefRun = brief.runId === run?.id ? run : await repo.getRun(brief.runId);
    if (!briefRun) throw new AppError("NOT_FOUND", "The scan behind this brief is missing.", 404);
    try {
      const id = await sendEmail(settings.email, renderBriefEmail(brief, briefRun, env.appUrl()));
      await repo.recordDelivery({ briefId: brief.id, recipient: settings.email, status: "sent", providerId: id ?? undefined });
      return ok({ sent: true, to: settings.email });
    } catch (e) {
      await repo.recordDelivery({ briefId: brief.id, recipient: settings.email, status: "failed", error: e instanceof Error ? e.message : "unknown" }).catch(() => {});
      throw e;
    }
  } catch (e) {
    return fail(e);
  }
}
