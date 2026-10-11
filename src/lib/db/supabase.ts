import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "../env";
import { AppError } from "../errors";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!hasSupabase()) throw new AppError("SUPABASE_UNAVAILABLE", "The database isn't configured on the server.", 503);
  if (!client) {
    client = createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
  }
  return client;
}

/** Turn a supabase-js error (which can carry a whole HTML page when the project is paused) into a short AppError. */
export function dbError(error: { message?: string; code?: string } | null, what: string): AppError {
  const msg = error?.message ?? "";
  if (/<html|<!doctype/i.test(msg) || /fetch failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(msg)) {
    return new AppError("SUPABASE_UNAVAILABLE", "The database is unreachable right now.", 503);
  }
  if (error?.code === "42P01" || /relation .* does not exist|Could not find the table/i.test(msg)) {
    return new AppError("SUPABASE_UNAVAILABLE", "The database tables are missing. Run supabase/schema.sql once.", 503);
  }
  return new AppError("SUPABASE_UNAVAILABLE", `Couldn't ${what}.`, 503);
}
