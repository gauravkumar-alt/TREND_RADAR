import { formatDistanceToNowStrict } from "date-fns";

export function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return `${trim(n / 1e9)}B`;
  if (Math.abs(n) >= 1e6) return `${trim(n / 1e6)}M`;
  if (Math.abs(n) >= 1e3) return `${trim(n / 1e3)}K`;
  return String(Math.round(n));
}
const trim = (x: number) => (x >= 100 ? Math.round(x).toString() : x.toFixed(1).replace(/\.0$/, ""));

export function pct(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function signedPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = Math.round(n * 100);
  return `${v > 0 ? "+" : ""}${v}%`;
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}

export function istDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export const ytUrl = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
export const channelUrl = (id: string) => `https://www.youtube.com/channel/${encodeURIComponent(id)}`;

/** Decode the HTML entities YouTube leaves in titles (&amp; &#39; …). */
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
