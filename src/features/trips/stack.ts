/**
 * The Home trips (Airmail v4 · 01), as pure functions: the raised stack's
 * card positions, reordering, and the envelope faces' address wording.
 */

/** Every trip card is this tall; an envelope's header row is 38 pt. */
export const STACK_CARD_HEIGHT = 340;
export const STACK_PEEK = 38;
/**
 * The all-trips stack, Wallet style: Home shows one card; tapping it raises
 * every current trip into a vertical stack where each card peeks this much of
 * itself above the next, the front card fully shown at the bottom.
 */
export const WALLET = {
  peek: 60,
  /** Room above the first card under the close button. */
  topPad: 8,
} as const;

/** Top of card `index` (0 = the top of the stack) in the raised stack. */
export function walletTop(index: number): number {
  return WALLET.topPad + index * WALLET.peek;
}

/** Height of the raised stack holding `count` cards. */
export function walletHeight(count: number): number {
  return count === 0 ? 0 : walletTop(count - 1) + STACK_CARD_HEIGHT;
}

/**
 * Where the cards rise from: every card starts where the Home card sits and
 * travels to its own slot, the front card at the bottom first, the ones above
 * it after, `stagger` ms apart. Returns the delay for card `index`.
 */
export function riseDelay(index: number, count: number, stagger: number): number {
  return Math.max(0, count - 1 - index) * stagger;
}

/**
 * Keeps the user's stack order across data refreshes: ids that are gone drop
 * out, new ids join at the back in their default order.
 */
export function reconcileOrder(previous: string[], defaults: string[]): string[] {
  const kept = previous.filter((id) => defaults.includes(id));
  const added = defaults.filter((id) => !kept.includes(id));
  return [...kept, ...added];
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parts(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** "13 – 15 October", "28 March – 6 April"; empty without dates. */
export function addressDates(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const s = parts(start);
  const e = parts(end);
  if (s.y === e.y && s.m === e.m) {
    return s.d === e.d ? `${s.d} ${MONTHS_LONG[s.m - 1]}` : `${s.d} – ${e.d} ${MONTHS_LONG[e.m - 1]}`;
  }
  return `${s.d} ${MONTHS_LONG[s.m - 1]} – ${e.d} ${MONTHS_LONG[e.m - 1]}`;
}

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

/** "six", "twelve", then digits. */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/**
 * The envelope face's third address line: "with Theo, six days",
 * "two nights", "pick dates to get a stamp".
 */
export function envelopeNote(opts: { hasDates: boolean; others: string[]; days: number }): string {
  if (!opts.hasDates) return 'pick dates to get a stamp';
  const first = opts.others.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean);
  const length = `${numberWord(opts.days)} ${opts.days === 1 ? 'day' : 'days'}`;
  if (first.length === 0) {
    const nights = Math.max(0, opts.days - 1);
    return nights === 0 ? 'a day trip' : `${numberWord(nights)} ${nights === 1 ? 'night' : 'nights'}`;
  }
  const names =
    first.length === 1 ? first[0] : `${first.slice(0, -1).join(', ')} and ${first[first.length - 1]}`;
  return `with ${names}, ${length}`;
}

/** Status on an envelope's header row is blue when the trip is days away. */
export function isDaysAway(start: string | null, todayKey: string, within = 7): boolean {
  if (!start) return false;
  const a = parts(start);
  const b = parts(todayKey);
  const diff = Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86_400_000);
  return diff >= 0 && diff <= within;
}

/**
 * x on the on-now card's mini route, proportional to time from the first
 * stop to the last; clamped to the route.
 */
export function miniRouteX(minutes: number, first: number, last: number, width: number): number {
  if (last <= first) return 0;
  const t = (minutes - first) / (last - first);
  return Math.min(width, Math.max(0, t * width));
}
