import "server-only";

/** Server-side env access. Missing optional services degrade features, never crash pages. */
export const env = {
  youtubeKey: () => process.env.YOUTUBE_API_KEY || "",
  geminiKey: () => process.env.GEMINI_API_KEY || "",
  geminiModel: () => process.env.GEMINI_MODEL || "gemini-flash-latest",
  supabaseUrl: () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  resendKey: () => process.env.RESEND_API_KEY || "",
  emailFrom: () => process.env.BRIEF_FROM_EMAIL || "TREND//RADAR <onboarding@resend.dev>",
  cronSecret: () => process.env.CRON_SECRET || "",
  appUrl: () =>
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3300"),
};

export function hasSupabase() {
  return Boolean(env.supabaseUrl() && env.supabaseServiceKey());
}

export function hasResend() {
  return Boolean(env.resendKey());
}

export function serviceStatus() {
  return {
    youtube: Boolean(env.youtubeKey()),
    gemini: Boolean(env.geminiKey()),
    supabase: hasSupabase(),
    email: hasResend(),
  };
}
