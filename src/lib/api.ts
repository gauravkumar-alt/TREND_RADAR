import "server-only";
import { NextResponse } from "next/server";
import { env, hasSupabase } from "./env";
import { AppError, errorBody, toAppError } from "./errors";
import * as repo from "./db/repo";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(err: unknown) {
  const e = toAppError(err);
  if (!(err instanceof AppError)) console.error("[api] unexpected error", err);
  return NextResponse.json(errorBody(e), { status: e.status });
}

/** Settings from Supabase, or defaults (flagged) when the database is missing/unreachable. */
export async function loadSettings(): Promise<{ settings: Settings; source: "database" | "defaults"; warning?: string }> {
  if (!hasSupabase()) return { settings: DEFAULT_SETTINGS, source: "defaults", warning: "Database not configured — using default settings." };
  try {
    return { settings: await repo.getSettings(), source: "database" };
  } catch (e) {
    return { settings: DEFAULT_SETTINGS, source: "defaults", warning: toAppError(e).message };
  }
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export function assertCron(req: Request) {
  const secret = env.cronSecret();
  if (!secret) throw new AppError("UNAUTHORIZED", "CRON_SECRET is not set on the server.", 401);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) throw new AppError("UNAUTHORIZED", "Not authorised.", 401);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    throw new AppError("INVALID_SETTINGS", "The request body isn't valid JSON.", 400);
  }
}
