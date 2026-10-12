/**
 * Keyframe tracks for the Airmail v4 moments, transcribed from
 * `design_handoff_airmail_v4_motion/README.md`. Each entry mirrors a CSS
 * keyframe list: `at` is the percentage as 0..1, `v` the value there. A
 * property missing from a CSS keyframe takes its identity value at that
 * offset, as the transform shorthand does. Rotations are in degrees.
 */
import type { Track } from './curves';

const t = (at: readonly number[], v: readonly number[]): Track => ({ at, v });
const fadeIn = (by: number): Track => t([0, by, 1], [0, 1, 1]);

/** 01 · Deal: card i (0 = back) drops in; rotations alternate by i. */
export function dealCard(i: number) {
  const sign = i % 2 ? 1 : -1;
  return {
    translateY: t([0, 0.7, 1], [-90, 5, 0]),
    rotate: t([0, 0.7, 1], [5 * sign, -1 * sign, 0]),
    scale: t([0, 0.7, 1], [1.04, 0.995, 1]),
    opacity: fadeIn(0.2),
  };
}

/** 01 · The greeting rises 12 pt as the cards deal. */
export const greetingRise = {
  translateY: t([0, 1], [12, 0]),
  opacity: t([0, 1], [0, 1]),
};

/** 01 · The shoebox stamp lands after the deal. */
export const shoeboxStamp = {
  translateY: t([0, 0.75, 1], [-30, 2, 0]),
  rotate: t([0, 0.75, 1], [-12, 1, 0]),
  scale: t([0, 0.75, 1], [1.2, 1, 1]),
  opacity: fadeIn(0.3),
};

/** 01 · Tapping a front card that isn't on now. */
export const frontBump = {
  translateY: t([0, 0.5, 1], [0, -6, 0]),
  rotate: t([0, 0.5, 1], [0, -0.6, 0]),
};

/** 02 · The press before the expand. */
export const cardPress = { scale: t([0, 0.5, 1], [1, 0.985, 1]) };

/** A rise of `distance` pt with a fade (titles, headers, bags). */
export function rise(distance: number) {
  return { translateY: t([0, 1], [distance, 0]), opacity: t([0, 1], [0, 1]) };
}

/** Day stamps and the NEXT ticket drop in with rotation r. */
export function dropIn(r: number) {
  return {
    translateY: t([0, 0.72, 1], [-26, 3, 0]),
    rotate: t([0, 0.72, 1], [r, -0.2 * r, 0]),
    opacity: fadeIn(0.3),
  };
}

/** Day stamp i's starting rotation. */
export const dayStampRotation = (i: number) => (i % 2 ? 7 : -6);
/** The NEXT ticket drops with r = −2°. */
export const TICKET_ROTATION = -2;

/** Plan · stop stamp pops into place. */
export const stopStampPop = {
  scale: t([0, 0.6, 1], [1.3, 0.96, 1]),
  rotate: t([0, 0.6, 1], [-8, 1.5, 0]),
  opacity: t([0, 0.6, 1], [0, 1, 1]),
};

/** Plan · the NOW tag pops from its left edge. */
export const nowTagPop = {
  scale: t([0, 0.7, 1], [0.3, 1.12, 1]),
  opacity: t([0, 0.7, 1], [0, 1, 1]),
};

/** 03/04 · The status tag stamps in at contact. */
export const statusTagStamp = {
  scale: t([0, 0.6, 1], [1.5, 0.94, 1]),
  rotate: t([0, 0.6, 1], [-6, 0, 0]),
  opacity: t([0, 0.6, 1], [0, 1, 1]),
};

/** 04 · The stamp squashes as the postmark hits. */
export const postmarkSquash = { scale: t([0, 0.5, 1], [1, 0.93, 1]) };

/** Shell · the top bar settles and the tab bar rises on open. */
export const topBarSettle = { translateY: t([0, 1], [-14, 0]) };
export const tabBarRise = { translateY: t([0, 1], [90, 0]) };

/** 05 · Stamp i on the sheet is printed. */
export function sheetStampPrint(i: number) {
  return {
    translateY: t([0, 1], [-12, 0]),
    scale: t([0, 1], [1.12, 1]),
    rotate: t([0, 1], [((i % 3) - 1) * 3, 0]),
    opacity: fadeIn(0.35),
  };
}

/** 05 · The postmark ring presses; it rests at −10°. */
export const POSTMARK_RING_ROTATION = -10;
export const postmarkRingPress = {
  scale: t([0, 0.55, 1], [1.35, 0.95, 1]),
  opacity: t([0, 0.55, 1], [0, 1, 1]),
};

/** 05 · Today's stamp lifts and rests raised. */
export const todayLift = {
  translateY: t([0, 0.6, 1], [0, -8, -5]),
  rotate: t([0, 0.6, 1], [0, -4, -3]),
  scale: t([0, 0.6, 1], [1, 1.04, 1]),
};

/** 06 · Seal halves fall after the crack. */
export const sealLeftFall = {
  translateX: t([0, 0.12, 1], [0, -4, -28]),
  translateY: t([0, 0.12, 1], [0, 1, 74]),
  rotate: t([0, 0.12, 1], [0, -6, -50]),
  scale: t([0, 0.12, 1], [0.94, 1, 1]),
  opacity: t([0, 0.12, 1], [1, 1, 0]),
};
export const sealRightFall = {
  translateX: t([0, 0.12, 1], [0, 4, 24]),
  translateY: t([0, 0.12, 1], [0, 1, 82]),
  rotate: t([0, 0.12, 1], [0, 5, 42]),
  scale: t([0, 0.12, 1], [0.94, 1, 1]),
  opacity: t([0, 0.12, 1], [1, 1, 0]),
};
/** 06 · The seal sinks under the thumb while held. */
export const SEAL_PRESSED_SCALE = 0.94;
/** 06 · The letter settles as the body slides away. */
export const letterSettle = { translateY: t([0, 0.7, 1], [24, -6, 0]) };
/** 06 · Wax drops back on when re-sealed. */
export const waxDrop = {
  scale: t([0, 0.6, 1], [1.6, 0.9, 1]),
  opacity: t([0, 0.6, 1], [0, 1, 1]),
};

/** 07 · The postcard flip, relative to the starting angle. */
export const postcardFlip = {
  rotateY: t([0, 0.5, 1], [0, 90, 180]),
  rotateZ: t([0, 0.5, 1], [0, 4, 0]),
  scale: t([0, 0.5, 1], [1, 1.05, 1]),
};
export const postcardFlipShadow = {
  scaleX: t([0, 0.5, 1], [1, 1.4, 1]),
  opacity: t([0, 0.5, 1], [1, 0.45, 1]),
};

/** Notes · pile item i is dealt onto the pile. */
export function pileDeal(i: number) {
  const odd = i % 2 === 1;
  return {
    translateY: t([0, 0.7, 1], [-60, 4, 0]),
    rotate: t([0, 0.7, 1], [odd ? 6 : -5, odd ? -0.8 : 0.8, 0]),
    opacity: fadeIn(0.25),
  };
}

/** 08 · Loose tag i is tossed in. */
export function tagToss(i: number) {
  const odd = i % 2 === 1;
  return {
    translateX: t([0, 1], [odd ? 30 : -30, 0]),
    translateY: t([0, 1], [-40, 0]),
    rotate: t([0, 1], [odd ? 14 : -12, 0]),
    opacity: fadeIn(0.3),
  };
}

/** 08 · A claimed row lands in its bag. */
export const claimRow = {
  translateY: t([0, 1], [-16, 0]),
  scale: t([0, 1], [1.08, 1]),
  opacity: t([0, 1], [0, 1]),
};
/** 08 · The bag squashes about its bottom as a row lands. */
export const bagClaimSquash = {
  scaleY: t([0, 0.4, 0.75, 1], [1, 0.97, 1.01, 1]),
  translateY: t([0, 0.4, 0.75, 1], [0, 3, 0, 0]),
};
/** 08 · …and as PACKED slams. */
export const bagSlamSquash = {
  scaleY: t([0, 0.5, 1], [1, 0.97, 1]),
  translateY: t([0, 0.5, 1], [0, 3, 0]),
};
/** 08 · The checkbox pops when ticked. */
export const checkboxPop = { scale: t([0, 0.6, 1], [0.7, 1.15, 1]) };
/** 08 · PACKED slams onto a full bag; it rests at −8°. */
export const packedSlam = {
  rotate: t([0, 0.55, 1], [-16, -7, -8]),
  scale: t([0, 0.55, 1], [1.9, 0.92, 1]),
  opacity: t([0, 0.55, 1], [0, 1, 1]),
};
/** 08 · Dragged tags lift and lean with the finger. */
export const TAG_LIFT_SCALE = 1.06;
export const TAG_LEAN_PER_PT = 0.05;
export const TAG_LEAN_MAX = 8;
/** 08 · Hit slop above a bag for its handle. */
export const BAG_HANDLE_SLOP = 12;
