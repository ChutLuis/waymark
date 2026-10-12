/**
 * The Home mail stack (Airmail v4 · 01), as pure functions: card positions
 * by depth, reordering, and the envelope faces' address wording.
 */

/** Every card is this tall; a card behind shows only its 38 pt header row. */
export const STACK_CARD_HEIGHT = 340;
export const STACK_PEEK = 38;
/** Horizontal inset (each side) of a card in the pile, by its place in it. */
const PILE_INSETS = [5, 11, 18] as const;

/** Wallet geometry: the pile under a selected card, and the scroll effects. */
export const WALLET = {
  /** Selected card sits this far below the top of the viewport. */
  selectedMargin: 16,
  /** How much of the pile's first card shows at the bottom of the screen. */
  pileReveal: 64,
  /** Each card behind it in the pile peeks this much lower. */
  pileStep: 8,
  /** Cards stuck at the top while scrolling peek this much under each other. */
  stickStep: 3,
  /** Pulling down past the top fans the cards apart by this much per card. */
  spread: 0.22,
} as const;

/** Top of card `index` (0 = the top of the stack) in the resting stack. */
export function walletTop(index: number): number {
  return index * STACK_PEEK;
}

/** Container height for `count` cards. */
export function stackHeight(count: number): number {
  return count === 0 ? 0 : (count - 1) * STACK_PEEK + STACK_CARD_HEIGHT;
}

export interface CardSlot {
  top: number;
  inset: number;
}

/**
 * Selected mode, Wallet style: the selected card at the stack's top, fully
 * shown; every other card in a pile at the bottom of the screen, in stack
 * order. `room` is the viewport height left below the stack's top once Home
 * has scrolled as far as it can towards it; tops are relative to the stack.
 */
export function selectedLayout(count: number, selected: number, room: number): CardSlot[] {
  const pileCount = count - 1;
  const floor = STACK_CARD_HEIGHT + WALLET.selectedMargin;
  const pileTop = Math.max(
    floor,
    room - WALLET.pileReveal - Math.max(0, pileCount - 1) * WALLET.pileStep,
  );
  let place = 0;
  return Array.from({ length: count }, (_, i) => {
    if (i === selected) return { top: 0, inset: 0 };
    const slot = {
      top: pileTop + place * WALLET.pileStep,
      inset: PILE_INSETS[Math.min(pileCount - 1 - place, PILE_INSETS.length - 1)],
    };
    place += 1;
    return slot;
  });
}

/**
 * The scroll offset for a resting card (Wallet's sticky pile): once the stack
 * scrolls past the top of the viewport, each card sticks there, a few points
 * under the one before, until the front card itself would scroll; and pulling
 * down past the top fans the cards apart.
 *
 * `scrolled` is how far the stack's top is above the viewport's top (negative
 * while pulling down); `frontTop` is the front card's resting top.
 */
export function walletScrollOffset(index: number, top: number, scrolled: number, frontTop: number): number {
  'worklet';
  if (scrolled < 0) return -scrolled * index * WALLET.spread;
  const stick = Math.min(scrolled, frontTop) + index * WALLET.stickStep;
  return Math.max(0, stick - top);
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
