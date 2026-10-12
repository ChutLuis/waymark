/**
 * The Trip page's sheet of stamps (Airmail v4 · 05) as pure functions: one
 * stamp per trip day, the days already used, and the sheet's printed lines.
 */
import { numberWord } from './stack';
import { romanMonth } from './destinations';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface SheetDay {
  key: string;
  /** "SAT 3", or "TODAY · 8". */
  label: string;
  day: number;
  month: number;
  used: boolean;
  today: boolean;
}

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function keyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** One stamp per day of the trip; days before today are used. */
export function sheetDays(start: string | null, end: string | null, todayKey: string): SheetDay[] {
  if (!start || !end || end < start) return [];
  const out: SheetDay[] = [];
  for (let d = parse(start); keyOf(d) <= end; d = new Date(d.getTime() + 86_400_000)) {
    const key = keyOf(d);
    const today = key === todayKey;
    out.push({
      key,
      label: today ? `TODAY · ${d.getUTCDate()}` : `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`,
      day: d.getUTCDate(),
      month: d.getUTCMonth() + 1,
      used: key < todayKey,
      today,
    });
  }
  return out;
}

/** "NIPPON · KYOTO & NARA · TEN DAYS · 2026". */
export function sheetHeader(stampName: string, tripName: string, days: number, year: number | null): string {
  const length = `${numberWord(days)} ${days === 1 ? 'day' : 'days'}`;
  return [stampName, tripName, length, year ? String(year) : '']
    .filter(Boolean)
    .join(' · ')
    .toUpperCase();
}

/** The postmark's date for the used days: "3–7 X 26". */
export function usedRange(days: SheetDay[], year: number): string {
  const used = days.filter((d) => d.used);
  if (used.length === 0) return '';
  const first = used[0];
  const last = used[used.length - 1];
  const yy = String(year % 100).padStart(2, '0');
  const range = first.day === last.day ? `${first.day}` : `${first.day}–${last.day}`;
  return `${range} ${romanMonth(last.month)} ${yy}`;
}

/** "5 USED · 5 TO GO". */
export function usedSummary(days: SheetDay[]): string {
  const used = days.filter((d) => d.used).length;
  return `${used} USED · ${days.length - used} TO GO`;
}

/** The invite code as typed so far, with its space after four characters. */
export function typedCode(code: string, typed: number): string {
  const spaced = code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
  return spaced.slice(0, Math.max(0, typed));
}

/** Characters to type for the full code, space included. */
export function codeLength(code: string): number {
  return code.length === 8 ? 9 : code.length;
}
