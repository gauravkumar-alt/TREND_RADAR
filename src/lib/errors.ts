/**
 * Typed application errors. `code` drives the UI error state; `message` is
 * always safe to show (never a stack trace or raw upstream body).
 */
export type AppErrorCode =
  | "YOUTUBE_QUOTA"
  | "YOUTUBE_UNAVAILABLE"
  | "YOUTUBE_NOT_CONFIGURED"
  | "GEMINI_UNAVAILABLE"
  | "GEMINI_NOT_CONFIGURED"
  | "GEMINI_INVALID"
  | "SUPABASE_UNAVAILABLE"
  | "INVALID_SETTINGS"
  | "NO_RESULTS"
  | "NOT_FOUND"
  | "EMAIL_NOT_CONFIGURED"
  | "EMAIL_FAILED"
  | "UNAUTHORIZED"
  | "RUN_IN_PROGRESS"
  | "UNKNOWN";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public status = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const FRIENDLY: Record<AppErrorCode, string> = {
  YOUTUBE_QUOTA: "YouTube's daily API quota is used up. It resets at midnight Pacific time.",
  YOUTUBE_UNAVAILABLE: "YouTube didn't respond. Try again in a minute.",
  YOUTUBE_NOT_CONFIGURED: "No YouTube API key is set on the server.",
  GEMINI_UNAVAILABLE: "Gemini didn't respond. Try again in a minute.",
  GEMINI_NOT_CONFIGURED: "No Gemini API key is set on the server.",
  GEMINI_INVALID: "Gemini returned an analysis we couldn't verify against the data, twice. Nothing was saved.",
  SUPABASE_UNAVAILABLE: "The database is unreachable, so history and settings can't be loaded.",
  INVALID_SETTINGS: "Those settings aren't valid.",
  NO_RESULTS: "No strong signals yet.",
  NOT_FOUND: "That scan doesn't exist.",
  EMAIL_NOT_CONFIGURED: "Email isn't configured on the server.",
  EMAIL_FAILED: "The email couldn't be sent.",
  UNAUTHORIZED: "Not authorised.",
  RUN_IN_PROGRESS: "Another scan is already running.",
  UNKNOWN: "Something went wrong.",
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  return new AppError("UNKNOWN", FRIENDLY.UNKNOWN);
}

export function friendly(code: AppErrorCode) {
  return FRIENDLY[code];
}

export function errorBody(err: unknown) {
  const e = toAppError(err);
  return { error: { code: e.code, message: e.message || FRIENDLY[e.code] } };
}
