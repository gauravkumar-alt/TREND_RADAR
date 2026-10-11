import { fail, loadSettings, ok, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { hasSupabase } from "@/lib/env";
import { settingsSchema } from "@/lib/settings";
import * as repo from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const { settings, source, warning } = await loadSettings();
  return ok({ settings, source, warning: warning ?? null });
}

export async function PUT(req: Request) {
  try {
    const parsed = settingsSchema.safeParse(await readJson(req));
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new AppError("INVALID_SETTINGS", first ? `${first.path.join(".") || "settings"}: ${first.message}` : "Those settings aren't valid.", 400);
    }
    if (!hasSupabase()) throw new AppError("SUPABASE_UNAVAILABLE", "The database isn't configured, so settings can't be saved.", 503);
    await repo.saveSettings(parsed.data);
    return ok({ settings: parsed.data });
  } catch (e) {
    return fail(e);
  }
}
