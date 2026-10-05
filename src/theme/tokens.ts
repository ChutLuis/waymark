/**
 * Waymark Airmail design tokens, transcribed from
 * `design_handoff_airmail_v3/README.md` (Design tokens). Feature code must
 * reference these through the theme module — never raw values.
 *
 * The design is light-only; the dark palette is the README's provisional
 * mapping (flagged in docs/DESIGN_DECISIONS.md), kept until a dark design
 * exists.
 */
import { Platform, StyleSheet } from 'react-native';
import type { TextStyle } from 'react-native';

export interface Palette {
  /** Screen background (airmail blue-grey / dark navy). */
  bg: string;
  /** Cards, inputs, postcards' caption chips, tab bar, pills over art. */
  paper: string;
  /** Stamp frames, postcard photo frames (always paper, even in dark). */
  stampPaper: string;
  /** Primary text, primary buttons, focused borders, checked boxes, postmarks. */
  ink: string;
  /** Secondary text, section kickers. */
  ink2: string;
  /** Done/past text, inactive tabs, placeholders, dashed "needs someone". */
  ink3: string;
  /** Explanatory paragraph (Notes intro). */
  inkBody: string;
  /** Row separators inside paper cards. */
  hairline: string;
  /** Ruled "address" lines (new-trip preview). */
  rule: string;
  /** TO line on the onboarding envelope. */
  ruleWarm: string;
  /** Input border (1.5), quiet outline buttons, sheet grabber. */
  border: string;
  /** Top hairline of tab bar and bottom action bar, progress track. */
  divider: string;
  /** Dashed empty stamp slot (no dates). */
  slot: string;
  airmailRed: string;
  airmailBlue: string;
  kraft: string;
  kraftFlap: string;
  kraftInk: string;
  /** Text on kraft (light cream, stays light in dark). */
  kraftText: string;
  wax: string;
  waxRing: string;
  success: string;
  marginRule: string;
  /** Behind any scene before it loads. */
  artPlaceholder: string;
  /** The Trips back pill over art. */
  glass: string;
  /** Behind sheets. */
  scrim: string;
}

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    bg: '#E2E9EE',
    paper: '#FFFCF5',
    stampPaper: '#FFFFFF',
    ink: '#15223B',
    ink2: '#46536B',
    ink3: '#5A6478',
    inkBody: '#2E3A52',
    hairline: '#ECE5D7',
    rule: '#E3DACA',
    ruleWarm: '#CFC6B4',
    border: '#AEBBC6',
    divider: '#C9D3DB',
    slot: '#9AA6B8',
    airmailRed: '#C8323C',
    airmailBlue: '#24479A',
    kraft: '#CDB28A',
    kraftFlap: '#BFA06E',
    kraftInk: '#3F3526',
    kraftText: '#FFFCF5',
    wax: '#A8262F',
    waxRing: '#B92E37',
    success: '#1F7A5C',
    marginRule: '#E7A9AD',
    artPlaceholder: '#DCD6CB',
    glass: 'rgba(255,252,245,0.92)',
    scrim: 'rgba(21,34,59,0.65)',
  },
  dark: {
    bg: '#0F1729',
    paper: '#1A2438',
    stampPaper: '#F4F0E8',
    ink: '#EEF1F6',
    ink2: '#B4BFD1',
    ink3: '#8E9AAF',
    inkBody: '#C9D1DE',
    hairline: '#2B3752',
    rule: '#3A4762',
    ruleWarm: '#3A4762',
    border: '#3A4762',
    divider: '#2B3752',
    slot: '#55627A',
    airmailRed: '#E0575F',
    airmailBlue: '#7E9CF0',
    kraft: '#7A6545',
    kraftFlap: '#6A5638',
    kraftInk: '#F3E7D2',
    kraftText: '#F3E7D2',
    wax: '#C23A44',
    waxRing: '#D04A54',
    success: '#6CC39A',
    marginRule: '#7A3F48',
    artPlaceholder: '#131B2B',
    glass: 'rgba(26,36,56,0.92)',
    scrim: 'rgba(0,0,0,0.65)',
  },
};

export const fontFamilies = {
  /** Besley 400 — body copy, note bodies, italic meta. */
  regular: 'Besley_400Regular',
  regularItalic: 'Besley_400Regular_Italic',
  /** Besley 600 — row titles, captions (italic), links. */
  semibold: 'Besley_600SemiBold',
  semiboldItalic: 'Besley_600SemiBold_Italic',
  /** Besley 700 — display, titles, buttons, wordmark. */
  bold: 'Besley_700Bold',
  /** Besley 800 — day-stamp numerals, avatar initials, wordmark. */
  extrabold: 'Besley_800ExtraBold',
  /** Courier Prime 700 — kickers, tags, times, codes, stamp text (uppercase). */
  mono: 'CourierPrime_700Bold',
} as const;

export type TypeRole =
  | 'display'
  | 'title'
  | 'tripTitle'
  | 'cardTitleLg'
  | 'cardTitle'
  | 'cardTitleSm'
  | 'rowTitle'
  | 'rowTitleLg'
  | 'noteBody'
  | 'body'
  | 'bodySm'
  | 'meta'
  | 'metaSm'
  | 'caption'
  | 'buttonLg'
  | 'button'
  | 'link'
  | 'tab'
  | 'wordmark'
  | 'kicker'
  | 'kickerLg'
  | 'tag'
  | 'time'
  | 'code'
  | 'codeBox'
  | 'brandLetter';

export const typeScale: Record<TypeRole, TextStyle> = {
  display: { fontFamily: fontFamilies.bold, fontSize: 34, lineHeight: 38, letterSpacing: -0.5 },
  title: { fontFamily: fontFamilies.bold, fontSize: 32, lineHeight: 36, letterSpacing: -0.4 },
  tripTitle: { fontFamily: fontFamilies.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.3 },
  cardTitleLg: { fontFamily: fontFamilies.bold, fontSize: 26, lineHeight: 30, letterSpacing: -0.3 },
  cardTitle: { fontFamily: fontFamilies.bold, fontSize: 24, lineHeight: 28, letterSpacing: -0.2 },
  cardTitleSm: { fontFamily: fontFamilies.bold, fontSize: 23, lineHeight: 27, letterSpacing: -0.2 },
  rowTitle: { fontFamily: fontFamilies.semibold, fontSize: 18, lineHeight: 23 },
  rowTitleLg: { fontFamily: fontFamilies.semibold, fontSize: 19, lineHeight: 24 },
  noteBody: { fontFamily: fontFamilies.regular, fontSize: 18, lineHeight: 25 },
  body: { fontFamily: fontFamilies.regular, fontSize: 17, lineHeight: 24 },
  bodySm: { fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fontFamilies.regularItalic, fontSize: 16, lineHeight: 22 },
  metaSm: { fontFamily: fontFamilies.regularItalic, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fontFamilies.semiboldItalic, fontSize: 12, lineHeight: 16 },
  buttonLg: { fontFamily: fontFamilies.bold, fontSize: 18, lineHeight: 22 },
  button: { fontFamily: fontFamilies.bold, fontSize: 17, lineHeight: 22 },
  link: { fontFamily: fontFamilies.semibold, fontSize: 15, lineHeight: 20 },
  tab: { fontFamily: fontFamilies.semibold, fontSize: 13, lineHeight: 16 },
  wordmark: { fontFamily: fontFamilies.extrabold, fontSize: 21, lineHeight: 24, letterSpacing: -0.2 },
  kicker: {
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  kickerLg: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tag: {
    fontFamily: fontFamilies.mono,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  time: { fontFamily: fontFamilies.mono, fontSize: 15, lineHeight: 20 },
  code: { fontFamily: fontFamilies.mono, fontSize: 32, lineHeight: 40, letterSpacing: 3 },
  codeBox: { fontFamily: fontFamilies.mono, fontSize: 25, lineHeight: 30 },
  brandLetter: { fontFamily: fontFamilies.extrabold, fontSize: 13, lineHeight: 16 },
};

export const spacing = {
  s1: 4,
  s2: 6,
  s3: 8,
  s4: 10,
  s5: 12,
  s6: 14,
  s7: 16,
  s8: 18,
  s9: 20,
  s10: 22,
  s11: 24,
  s12: 30,
  /** Text column gutter. */
  gutter: 24,
  /** Card gutter, so cards run wider than the text column. */
  cardGutter: 14,
} as const;

export const radius = {
  card: 4,
  airmailOuter: 5,
  airmailInner: 2,
  input: 8,
  pill: 999,
  sheet: 20,
  chip: 2,
  tag: 3,
  checkbox: 4,
  codeBox: 4,
  brandOuter: 6,
  brandInner: 3,
} as const;

export const hairlineWidth = Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth;

/**
 * Shadows, transcribed from the README. RN 0.86 supports `boxShadow`, which
 * renders cross-platform; the legacy `shadow*`/`elevation` keys are kept as a
 * fallback for older engines.
 */
export const shadows = {
  card: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  cardRaised: '0 1px 2px rgba(21,34,59,0.15), 0 12px 24px -12px rgba(21,34,59,0.4)',
  row: '0 1px 2px rgba(21,34,59,0.12)',
  postcard: '0 1px 2px rgba(21,34,59,0.18), 0 16px 28px -14px rgba(21,34,59,0.5)',
  postcardFront: '0 1px 2px rgba(21,34,59,0.2), 0 20px 34px -14px rgba(21,34,59,0.55)',
  postcardJoin: '0 1px 2px rgba(21,34,59,0.18), 0 18px 30px -14px rgba(21,34,59,0.5)',
  stamp: '0 1px 2px rgba(21,34,59,0.3)',
  stampSmall: '0 1px 1.5px rgba(21,34,59,0.3)',
  hairlineTop: '0 -1px 0 #C9D3DB',
} as const;

export const motion = {
  duration: { fast: 120, base: 200, slow: 300, header: 300 },
} as const;

export const iconSizes = { sm: 14, md: 18, lg: 22, xl: 24 } as const;
export const iconStrokeWidth = 2;

export const hitTargetMin = 44;

/** The stamp denomination/name text sizes by stamp variant (README table). */
export const stampText = {
  lg: { denomination: { fontSize: 9.5, lineHeight: 11 }, name: { fontSize: 9.5, lineHeight: 11, letterSpacing: 0.8 }, nameStrip: 17 },
  md: { denomination: { fontSize: 8.5, lineHeight: 10 }, name: { fontSize: 8.5, lineHeight: 10, letterSpacing: 0.8 }, nameStrip: 15 },
  sm: { denomination: { fontSize: 8, lineHeight: 9 }, name: { fontSize: 8, lineHeight: 9, letterSpacing: 0.5 }, nameStrip: 13 },
  xs: { denomination: { fontSize: 6.5, lineHeight: 8 }, name: { fontSize: 6.5, lineHeight: 8, letterSpacing: 0.5 }, nameStrip: 11 },
} as const;