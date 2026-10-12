/**
 * Home ↔ trip shell transition state (Airmail v4 · 02). Home measures the
 * on-now postcard's paper and scene-window rects, then opens the trip with no
 * native animation; the shell reads the rects and runs the expand. The shared
 * values live at module level so Home (underneath, scaling and dimming) and
 * the shell (clipping and framing) animate from the same clock.
 */
import { makeMutable } from 'react-native-reanimated';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExpandOrigin {
  tripId: string;
  /** The card's paper, inside the airmail border, in window coordinates. */
  paper: Rect;
  /** The card's scene window, in window coordinates. */
  window: Rect;
  /** Taken at the tap; the shell only uses an origin that is still fresh. */
  at: number;
}

/** 0 = the postcard on Home, 1 = the shell fills the screen (eased). */
export const reveal = makeMutable(1);
/** Shell content (top bar, tab content, tab bar) opacity during the morph. */
export const shellContent = makeMutable(1);
/** Standard push for a trip opened without a card: 0 = off-screen right. */
export const shellPush = makeMutable(1);
/** The Trip page (sheet of stamps) over the shell: 0 = off-screen right. */
export const tripSheet = makeMutable(0);
/** 1 while the shell covers Home (drives Home's scale and dim). */
export const homeCovered = makeMutable(0);

let origin: ExpandOrigin | null = null;
/** A collapse back to Home is running: Home's card scene may play early. */
let collapsing = false;
const collapseListeners = new Set<(on: boolean) => void>();

/** How long a measured origin stays valid for the shell that mounts next. */
const ORIGIN_TTL_MS = 1500;

export function setExpandOrigin(next: ExpandOrigin): void {
  origin = next;
}

/** The origin for `tripId` if Home just measured it, else null. */
export function takeFreshOrigin(tripId: string): ExpandOrigin | null {
  if (!origin || origin.tripId !== tripId || Date.now() - origin.at > ORIGIN_TTL_MS) return null;
  return origin;
}

/** The origin to collapse back to, while the shell is open. */
export function currentOrigin(tripId: string): ExpandOrigin | null {
  return origin && origin.tripId === tripId ? origin : null;
}

export function clearExpandOrigin(): void {
  origin = null;
}

export function setCollapsing(on: boolean): void {
  collapsing = on;
  collapseListeners.forEach((listener) => listener(on));
}

export function isCollapsing(): boolean {
  return collapsing;
}

export function onCollapsingChange(listener: (on: boolean) => void): () => void {
  collapseListeners.add(listener);
  return () => collapseListeners.delete(listener);
}

/**
 * The open shell registers how it closes (collapse onto the card, or a pop);
 * the trip route runs it before any navigation removes the trip.
 */
type Closer = (finish: () => void) => void;
let closer: Closer | null = null;

export function registerShellCloser(fn: Closer): () => void {
  closer = fn;
  return () => {
    if (closer === fn) closer = null;
  };
}

export function runShellCloser(finish: () => void): void {
  if (closer) closer(finish);
  else finish();
}
