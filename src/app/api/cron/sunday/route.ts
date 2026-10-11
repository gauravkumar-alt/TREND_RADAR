import { assertCron, fail, loadSettings, ok } from "@/lib/api";
import { env, hasResend } from "@/lib/env";
import { toAppError } from "@/lib/errors";
import { isSundayMorningIst } from "@/lib/time";
import { runRadar } from "@/lib/pipeline/runRadar";
import { generateBriefForRun } from "@/lib/pipeline/brief";
import { renderBriefEmail, sendEmail } from "@/lib/email/brief";
import * as repo from "@/lib/db/repo";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Sunday workflow: settings → YouTube → snapshots → signals → Gemini clusters →
 * validate → store → brief → optional email. Scheduled 02:30 UTC Sunday (08:00 IST);
 * also checks the IST day server-side so a mis-fired schedule can't send mid-week.
 * `?force=1` (still needs the cron secret) runs it on any day for testing.
 */
export async function GET(req: Request) {
  try {
    assertCron(req);
    const force = new URL(req.url).searchParams.get("force") === "1";
    const now = new Date();
    if (!force && !isSundayMorningIst(now)) return ok({ skipped: true, reason: "Not Sunday morning in IST." });

    const { settings } = await loadSettings();
    const { run, warnings } = await runRadar({ settings, trigger: "cron", force: true, now });
    const brief = await generateBriefForRun(run, now);

    let email: { sent: boolean; reason?: string } = { sent: false, reason: "Email disabled in settings." };
    if (settings.emailEnabled && settings.email) {
      if (!hasResend()) email = { sent: false, reason: "RESEND_API_KEY not set." };
      else {
        try {
          const id = await sendEmail(settings.email, renderBriefEmail(brief, run, env.appUrl()));
          await repo.recordDelivery({ briefId: brief.id, recipient: settings.email, status: "sent", providerId: id ?? undefined }).catch(() => {});
          email = { sent: true };
        } catch (e) {
          const msg = toAppError(e).message;
          await repo.recordDelivery({ briefId: brief.id, recipient: settings.email, status: "failed", error: msg }).catch(() => {});
          email = { sent: false, reason: msg };
        }
      }
    }
    return ok({ runId: run.id, briefId: brief.id, clusters: run.clusters.length, videosAnalyzed: run.videosAnalyzed, quotaUnits: run.quotaUnitsUsed, email, warnings });
  } catch (e) {
    return fail(e);
  }
}
