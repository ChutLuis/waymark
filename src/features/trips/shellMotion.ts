/**
 * Small module store for the trip shell's motion state: whether the shell has
 * just opened from Home (so the first tab entrance waits b = 220 ms for the
 * expand), and which tab the Trip page was opened from.
 */
import { motion } from '@/theme';
import type { TripTab } from './TripTabBar';

/** How long after the open the first tab still counts as "opening". */
const OPENING_WINDOW_MS = motion.duration.expand;

let openedFromHomeAt = 0;
let lastTab: TripTab = 'plan';

/** Called by Home as the expand starts. */
export function markShellOpening(): void {
  openedFromHomeAt = Date.now();
}

/**
 * The base delay b for a tab entrance: 220 ms right after the expand from
 * Home, else 0. Read once per tab mount.
 */
export function tabEntranceBase(): number {
  const opening = Date.now() - openedFromHomeAt < OPENING_WINDOW_MS;
  return opening ? motion.choreo.expand.tabBase : 0;
}

export function setLastTab(tab: TripTab): void {
  lastTab = tab;
}

export function getLastTab(): TripTab {
  return lastTab;
}
