/**
 * "TODAY", "YESTERDAY", "4 DAYS AGO" for a shared postcard's kicker; older
 * than a week falls back to the caller's short date.
 */
export function daysAgoLabel(iso: string, now: Date, fallback: string): string {
  const then = new Date(iso);
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((day(now) - day(then)) / 86_400_000);
  if (diff <= 0) return 'TODAY';
  if (diff === 1) return 'YESTERDAY';
  if (diff < 7) return `${diff} DAYS AGO`;
  return fallback;
}
