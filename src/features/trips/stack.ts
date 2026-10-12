/**
 * The Home mail stack (Airmail v4 · 01), as pure functions: card positions
 * by depth, reordering, and the envelope faces' address wording.
 */

/** Every card is this tall; a card behind shows only its 38 pt header row. */
export const STACK_CARD_HEIGHT = 340;
export const STACK_PEEK = 38;
/** Four depths show; deeper cards wait hidden behind the last one. */
export const STACK_VISIBLE = 4;

/** Horizontal inset (each side) by depth, 0 = front. */
const INSETS = [0, 5, 11, 18] as const;

export interface StackPosition {
  top: number;
  inset: number;
  z: number;
  /** Deeper than the four visible depths: parked behind the last one. */
  hidden: boolean;
}

/**
 * Where the card at `depth` sits in a stack of `count`: the deepest visible
 * card is at the top of the container and each nearer card 38 pt lower, so
 * four cards land on the design's 0 / 38 / 76 / 114. Cards past the fourth
 * share the last visible slot, hidden, until passing brings them forward.
 */
export function stackPosition(depth: number, count: number): StackPosition {
  const visible = Math.min(count, STACK_VISIBLE);
  const d = Math.max(0, Math.min(depth, visible - 1));
  return {
    top: (visible - 1 - d) * STACK_PEEK,
    inset: INSETS[Math.min(d, INSETS.length - 1)],
    z: 100 - depth,
    hidden: depth >= STACK_VISIBLE,
  };
}

/** Container height for `count` cards. */
export function stackHeight(count: number): number {
  const visible = Math.min(count, STACK_VISIBLE);
  return visible === 0 ? 0 : (visible - 1) * STACK_PEEK + STACK_CARD_HEIGHT;
}

/** Swiping the front card passes it to the back of the stack. */
export function passToBack(order: string[]): string[] {
  return order.length < 2 ? order : [...order.slice(1), order[0]];
}

/** The reverse of a pass: the card at the back comes to the front. */
export function backToFront(order: string[]): string[] {
  return order.length < 2 ? order : [order[order.length - 1], ...order.slice(0, -1)];
}

/** The tapped card goes to the front; the rest keep their relative order. */
export function bringToFront(order: string[], id: string): string[] {
  if (!order.includes(id) || order[0] === id) return order;
  return [id, ...order.filter((x) => x !== id)];
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
