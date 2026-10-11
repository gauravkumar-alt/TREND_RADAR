/** IST helpers. India has no DST, so a fixed +05:30 offset is exact. */
const IST_OFFSET_MS = 330 * 60 * 1000;

export function toIst(d: Date): Date {
  return new Date(d.getTime() + IST_OFFSET_MS);
}

/** Day of week in IST (0 = Sunday). */
export function istDay(d: Date): number {
  return toIst(d).getUTCDay();
}

export function istHour(d: Date): number {
  return toIst(d).getUTCHours();
}

/** The Sunday (IST, yyyy-MM-dd) of the week this brief belongs to: today if Sunday, else the most recent Sunday. */
export function briefWeekOf(d: Date): string {
  const ist = toIst(d);
  ist.setUTCDate(ist.getUTCDate() - ist.getUTCDay());
  return ist.toISOString().slice(0, 10);
}

/** True on Sunday IST before noon — the delivery window promised to the creator. */
export function isSundayMorningIst(d: Date): boolean {
  return istDay(d) === 0 && istHour(d) < 12;
}
