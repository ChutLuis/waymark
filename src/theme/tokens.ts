/**
 * Waymark Airmail design tokens, transcribed from
 * `design_handoff_airmail_v3/README.md` (Design tokens). Feature code must
 * reference these through the theme module — never raw values.
 *
 * The design is light-only; the dark palette is the README's provisional
 * mapping (flagged in docs/DESIGN_DECISIONS.md), kept until a dark design
 * exists.
 */
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
  /**
   * Everything printed on stamp paper (names, denominations, postmarks,
   * day-stamp text, avatar panels). Fixed dark in both themes because stamp
   * paper stays cream.
   */
  stampInk: string;
  /** Envelope faces in the Home stack, front to back (v4). */
  envelope1: string;
  envelope2: string;
  envelope3: string;
  /** Address rules under each envelope face's lines. */
  envelopeRule1: string;
  envelopeRule2: string;
  envelopeRule3: string;
  /** The kraft envelope's lower pocket triangle. */
  kraftPocket: string;
  /** The inside of the kraft flap, seen once it folds back. */
  kraftInside: string;
  /** Ruled lines on the letter inside a private note. */
  letterRule: string;
  /** The lit side of the wax seal's radial gradient. */
  waxLight: string;
  /** The initial pressed into the wax (fixed light: wax is red in both themes). */
  waxText: string;
  /** Packing drop slot fill, and its hovered fill. */
  slotFill: string;
  slotHover: string;
  /** Postmark ring and cancel lines printed over stamp paper. */
  postmarkRing: string;
  postmarkText: string;
  cancelInk: string;
  /** The faint ring and cancel lines on past day stamps. */
  postmarkFaint: string;
  cancelFaint: string;
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
    wax: '#A8262F',
    waxRing: '#B92E37',
    success: '#1F7A5C',
    marginRule: '#E7A9AD',
    artPlaceholder: '#DCD6CB',
    glass: 'rgba(255,252,245,0.92)',
    scrim: 'rgba(21,34,59,0.65)',
    stampInk: '#15223B',
    envelope1: '#FBF8F0',
    envelope2: '#F5F0E5',
    envelope3: '#EDE6D8',
    envelopeRule1: '#DED4C2',
    envelopeRule2: '#D8CDB9',
    envelopeRule3: '#D6CCB8',
    kraftPocket: '#C7A97D',
    kraftInside: '#E5D3B1',
    letterRule: '#EAE1CF',
    waxLight: '#C23A44',
    waxText: '#F3E7D2',
    slotFill: 'rgba(226,233,238,0.6)',
    slotHover: 'rgba(36,71,154,0.12)',
    postmarkRing: 'rgba(21,34,59,0.72)',
    postmarkText: 'rgba(21,34,59,0.85)',
    cancelInk: 'rgba(21,34,59,0.62)',
    postmarkFaint: 'rgba(21,34,59,0.42)',
    cancelFaint: 'rgba(21,34,59,0.38)',
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
    wax: '#C23A44',
    waxRing: '#D04A54',
    success: '#6CC39A',
    marginRule: '#7A3F48',
    artPlaceholder: '#131B2B',
    glass: 'rgba(26,36,56,0.92)',
    scrim: 'rgba(0,0,0,0.65)',
    stampInk: '#15223B',
    envelope1: '#222D43',
    envelope2: '#1E293E',
    envelope3: '#1A2438',
    envelopeRule1: '#3A4762',
    envelopeRule2: '#36425C',
    envelopeRule3: '#323E57',
    kraftPocket: '#735F40',
    kraftInside: '#8A7552',
    letterRule: '#2B3752',
    waxLight: '#D04A54',
    waxText: '#F3E7D2',
    slotFill: 'rgba(15,23,41,0.6)',
    slotHover: 'rgba(126,156,240,0.16)',
    postmarkRing: 'rgba(21,34,59,0.72)',
    postmarkText: 'rgba(21,34,59,0.85)',
    cancelInk: 'rgba(21,34,59,0.62)',
    postmarkFaint: 'rgba(21,34,59,0.42)',
    cancelFaint: 'rgba(21,34,59,0.38)',
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
  | 'brandLetter'
  // Airmail v4 elements
  | 'microLabel'
  | 'stampLabel'
  | 'monoXs'
  | 'tagSm'
  | 'kickerSm'
  | 'routeTime'
  | 'parAvion'
  | 'parAvionSub'
  | 'envelopeTitle'
  | 'address'
  | 'addressLg'
  | 'signature'
  | 'initialLg'
  | 'dayNumber'
  | 'pillLabel'
  | 'tabLabel'
  | 'tagLabel'
  | 'letter'
  | 'ticketTitle'
  | 'codeSm'
  | 'packedStamp';

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
  // Airmail v4 (design_handoff_airmail_v4_motion/README.md)
  microLabel: { fontFamily: fontFamilies.mono, fontSize: 8, lineHeight: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  stampLabel: { fontFamily: fontFamilies.mono, fontSize: 7, lineHeight: 8, letterSpacing: 0.4, textTransform: 'uppercase' },
  monoXs: { fontFamily: fontFamilies.mono, fontSize: 9, lineHeight: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  tagSm: { fontFamily: fontFamilies.mono, fontSize: 10, lineHeight: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  kickerSm: { fontFamily: fontFamilies.mono, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  routeTime: { fontFamily: fontFamilies.mono, fontSize: 13, lineHeight: 18 },
  parAvion: { fontFamily: fontFamilies.mono, fontSize: 12, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  parAvionSub: { fontFamily: fontFamilies.regularItalic, fontSize: 11, lineHeight: 13 },
  envelopeTitle: { fontFamily: fontFamilies.bold, fontSize: 16, lineHeight: 20 },
  address: { fontFamily: fontFamilies.semiboldItalic, fontSize: 21, lineHeight: 37 },
  addressLg: { fontFamily: fontFamilies.semiboldItalic, fontSize: 19, lineHeight: 23 },
  signature: { fontFamily: fontFamilies.semiboldItalic, fontSize: 17, lineHeight: 21 },
  initialLg: { fontFamily: fontFamilies.extrabold, fontSize: 28, lineHeight: 30 },
  dayNumber: { fontFamily: fontFamilies.extrabold, fontSize: 20, lineHeight: 22 },
  pillLabel: { fontFamily: fontFamilies.bold, fontSize: 16, lineHeight: 20 },
  tabLabel: { fontFamily: fontFamilies.semibold, fontSize: 15, lineHeight: 20 },
  tagLabel: { fontFamily: fontFamilies.semibold, fontSize: 15, lineHeight: 20 },
  letter: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 22 },
  ticketTitle: { fontFamily: fontFamilies.bold, fontSize: 21, lineHeight: 25, letterSpacing: -0.2 },
  codeSm: { fontFamily: fontFamilies.mono, fontSize: 20, lineHeight: 24, letterSpacing: 2.5 },
  packedStamp: { fontFamily: fontFamilies.mono, fontSize: 13, lineHeight: 16, letterSpacing: 1.5, textTransform: 'uppercase' },
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

/**
 * Row separator width. The design spec is 1 pt; `StyleSheet.hairlineWidth`
 * (~0.33 pt on 3x screens) all but vanishes at 1.15:1 contrast, so we use 1.
 */
export const hairlineWidth = 1;

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
  // Airmail v4
  envelope: '0 -1px 0 rgba(21,34,59,0.06), 0 -6px 14px -8px rgba(21,34,59,0.28), 0 22px 34px -18px rgba(21,34,59,0.45)',
  onNow: '0 1px 2px rgba(21,34,59,0.2), 0 26px 38px -18px rgba(21,34,59,0.6)',
  pill: '0 1px 2px rgba(21,34,59,0.18)',
  chip: '0 1px 2px rgba(21,34,59,0.25)',
  ticketStub: '0 1px 1px rgba(21,34,59,0.18), 0 8px 10px rgba(21,34,59,0.18)',
  nextTicket: '0 1px 1px rgba(21,34,59,0.2), 0 12px 12px rgba(21,34,59,0.2)',
  plane: '0 2px 6px rgba(36,71,154,0.45)',
  kraft: '0 1px 2px rgba(21,34,59,0.2), 0 14px 24px -12px rgba(21,34,59,0.5)',
  letter: '0 1px 2px rgba(21,34,59,0.22)',
  postcardFlat: '0 1px 2px rgba(21,34,59,0.18)',
  pileShadow: '0 0 14px 4px rgba(21,34,59,0.3)',
  tag: '0 1px 1px rgba(21,34,59,0.22), 0 4px 6px rgba(21,34,59,0.12)',
  bag: '0 10px 20px -12px rgba(21,34,59,0.35)',
  sheetPush: '-24px 0 40px rgba(21,34,59,0.22)',
  todayStamp: '0 1px 1px rgba(21,34,59,0.35), 0 8px 10px rgba(21,34,59,0.3)',
} as const;

/** A CSS cubic-bezier(a, b, c, d); y may leave [0, 1] to overshoot. */
export type BezierTuple = readonly [number, number, number, number];

/**
 * Motion tokens, from `design_handoff_airmail_v4_motion/README.md` (Motion
 * tokens). `duration`, `stagger` and `easing` are the README's table verbatim;
 * `choreo` holds every other offset the eight moments use, so feature code
 * never inlines a timing. All values are milliseconds.
 */
export const motion = {
  duration: {
    fast: 120, base: 200, slow: 300, header: 300,
    expand: 580, collapse: 480, push: 440, pop: 380,
    deal: 640, shuffle: 660, drop: 520, rise: 420, pop2: 420,
    flight: 900, stampTag: 320, flip: 480, hold: 600, envelope: 560,
    slam: 340, claim: 360, springHome: 420, typeChar: 70,
  },
  stagger: { deal: 110, dayStamp: 45, routeStamp: 90, sheetStamp: 45, pile: 110, tag: 90 },
  easing: {
    standard: [0.2, 0.8, 0.2, 1],
    exit: [0.4, 0, 0.2, 1],
    stack: [0.3, 0.9, 0.3, 1],
    settle: [0.25, 0.7, 0.3, 1],
    drop: [0.3, 0.7, 0.3, 1],
    flight: [0.25, 0.75, 0.25, 1],
    overshoot: [0.3, 1.3, 0.5, 1],
    indicator: [0.34, 1.45, 0.5, 1],
    print: [0.3, 0.8, 0.3, 1.2],
    toss: [0.3, 0.8, 0.3, 1.25],
    claim: [0.3, 0.8, 0.3, 1.3],
    springHome: [0.3, 1.5, 0.5, 1],
    roll: [0.4, 0, 0.6, 1],
    write: [0.5, 0.1, 0.5, 0.9],
    gravity: [0.55, 0, 0.85, 0.4],
    flap: [0.45, 0, 0.25, 1],
    flip: [0.45, 0.05, 0.3, 1],
    slam: [0.5, 0, 0.3, 1],
    /** The kraft wrapper's height (06). */
    envelope: [0.3, 0.8, 0.3, 1],
    linear: [0, 0, 1, 1],
  },
  choreo: {
    /** 01 · Home: deal, shuffle, bump and idle loops. */
    home: {
      dealBase: 150,
      dealContact: 450,
      shoeboxAt: 820,
      shoebox: 560,
      shuffleContact: 520,
      bump: 320,
      press: 180,
      stripeCrawl: 3500,
      blink: 1600,
      bob: 2400,
      march: 1000,
    },
    /** 02 · Home → trip shell. Offsets from the tap. */
    expand: {
      contentAt: 150,
      content: 220,
      topBarAt: 260,
      topBar: 380,
      bandAt: 440,
      band: 200,
      tabBarAt: 240,
      tabBar: 520,
      /** Base delay b for the tab entrance when the shell opened from Home. */
      tabBase: 220,
      /** Collapse: the shell content fades before the clip shrinks. */
      collapseContent: 160,
    },
    /** Plan entrance offsets from b, and the route's idle march. */
    plan: {
      title: 60,
      dayStamps: 120,
      stopStamps: 160,
      plane: 360,
      ticket: 420,
      nowTagAfterPlane: 820,
      nowTag: 380,
      routeMarch: 1200,
    },
    /** 03/04 · Stop stamp contact frames (ms after play starts). */
    stamp: { confirmContact: 300, doneContact: 330, squash: 220 },
    /** 05 · Sheet of stamps. Offsets from d0 unless noted. */
    sheet: {
      d0: 380,
      ringAt: 710,
      ring: 300,
      ringContact: 160,
      linesAfterRing: 180,
      lines: 700,
      usedStep: 140,
      used: 200,
      todayAfterRing: 900,
      fromAt: 500,
      toAt: 950,
      write: 650,
      codeAt: 1500,
      caretBlink: 800,
    },
    /** 06 · Seal and break. Crack offsets are from the crack (hold + 600). */
    seal: {
      press: 160,
      ringFade: 160,
      leftFall: 640,
      rightFall: 680,
      flapAt: 200,
      flap: 420,
      flapBehindAt: 410,
      openAt: 560,
      letter: 560,
      resealFlapAt: 480,
      resealFlap: 400,
      resealFlapFront: 200,
      resealWaxAfterFlap: 420,
      wax: 300,
      waxContact: 180,
    },
    /** 08 · Packing. */
    packing: {
      checkPop: 260,
      slamContact: 190,
      slamSquashAt: 170,
      slamSquash: 260,
      tagsAt: 120,
      toss: 560,
      bagsAt: 60,
    },
    /** Notes pile entrance offsets from b. */
    notes: { pileAt: 80, pile: 580 },
  },
} as const;

export type EasingName = keyof typeof motion.easing;

export const iconSizes = { sm: 14, md: 18, lg: 22, xl: 24 } as const;
export const iconStrokeWidth = 2;

export const hitTargetMin = 44;

/** Plan's day stamps (48×56, gap 9); the strip scrolls sideways. */
export const dayStampLayout = { width: 48, height: 56, gap: 9 } as const;

/** The stamp denomination/name text sizes by stamp variant (README table). */
export const stampText = {
  lg: { denomination: { fontSize: 9.5, lineHeight: 11 }, name: { fontSize: 9.5, lineHeight: 11, letterSpacing: 0.8 }, nameStrip: 17 },
  md: { denomination: { fontSize: 8.5, lineHeight: 10 }, name: { fontSize: 8.5, lineHeight: 10, letterSpacing: 0.8 }, nameStrip: 15 },
  sm: { denomination: { fontSize: 8, lineHeight: 9 }, name: { fontSize: 8, lineHeight: 9, letterSpacing: 0.5 }, nameStrip: 13 },
  xs: { denomination: { fontSize: 6.5, lineHeight: 8 }, name: { fontSize: 6.5, lineHeight: 8, letterSpacing: 0.5 }, nameStrip: 11 },
} as const;
