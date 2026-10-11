import { loadSettings, readJson } from "@/lib/api";
import { errorBody, toAppError, AppError } from "@/lib/errors";
import { applyOverrides, runOverridesSchema } from "@/lib/settings";
import { runRadar } from "@/lib/pipeline/runRadar";
import { generateBriefForRun } from "@/lib/pipeline/brief";
import * as repo from "@/lib/db/repo";
import { hasSupabase } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Runs the full radar and streams progress as NDJSON:
 *   {"type":"stage","stage":"COLLECTING SIGNALS","detail":"…"}
 *   {"type":"warning","message":"…"}
 *   {"type":"done","run":{…},"reused":false,"briefId":"…"}
 *   {"type":"error","error":{"code":"…","message":"…"}}
 */
export async function POST(req: Request) {
  let overrides;
  try {
    const body = await readJson(req);
    const parsed = runOverridesSchema.safeParse((body as { overrides?: unknown })?.overrides ?? body ?? {});
    if (!parsed.success) throw new AppError("INVALID_SETTINGS", "Those scan options aren't valid.", 400);
    overrides = parsed.data;
  } catch (e) {
    return Response.json(errorBody(e), { status: toAppError(e).status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const { settings: base, warning } = await loadSettings();
        if (warning) send({ type: "warning", message: warning });
        let settings;
        try {
          settings = applyOverrides(base, overrides);
        } catch {
          throw new AppError("INVALID_SETTINGS", "Those scan options aren't valid for your settings.", 400);
        }
        const { run, reused, warnings } = await runRadar({
          settings,
          trigger: "manual",
          force: overrides.force,
          onStage: (stage, detail) => send({ type: "stage", stage, detail }),
        });
        warnings.forEach((m) => send({ type: "warning", message: m }));

        let briefId: string | null = null;
        const existing = reused && hasSupabase() ? await repo.getBriefForRun(run.id).catch(() => null) : null;
        if (existing) briefId = existing.id;
        else {
          send({ type: "stage", stage: "GENERATING BRIEF", detail: "Writing the Sunday Brief" });
          try {
            briefId = (await generateBriefForRun(run)).id;
          } catch (e) {
            send({ type: "warning", message: `The scan worked, but the brief couldn't be written: ${toAppError(e).message}` });
          }
        }
        send({ type: "done", run, reused, briefId });
      } catch (e) {
        send({ type: "error", ...errorBody(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
