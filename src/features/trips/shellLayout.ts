/**
 * Trip shell geometry shared by the shell and the Plan tab (Airmail v4 ·
 * Shared). Values are points on the 390 × 844 design screen.
 */
export const SHELL = {
  /** Design header heights: Plan hero and the collapsed banner. */
  heroHeight: 196,
  bannerHeight: 104,
  /** The seigaiha band across the header's bottom edge. */
  bandHeight: 14,
  /** Top bar row under the status bar. */
  topBarHeight: 52,
  /** Stamps hang below the edge; only their drop-in room overlaps the band. */
  dayStripOverhang: 0,
  /** Today's stamp is raised, with this clearance reserved above every stamp. */
  dayStripRaise: 4,
  /** Room above the day stamps for their drop-in, so it isn't clipped. */
  dayStripDropRoom: 30,
  /** Floating ticket-stub tab bar. */
  tabBarHeight: 60,
  tabBarInset: 12,
  /** The tab bar sits this far above the home indicator's inset. */
  tabBarLift: 8,
  tabBarMinBottom: 12,
  /** Bottom padding a tab's scroll content needs to clear the tab bar. */
  tabContentClearance: 110,
} as const;
