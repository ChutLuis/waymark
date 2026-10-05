// Confirm-stamp micro animations (Part 3): 96 x 112, 30 fps, 36 frames.
//   frames 0-18  (marker "confirm"): the empty dashed slot, then the stamp drops
//                in (scale 1.18 -> 1.0 with overshoot and a 2 degree settle) and
//                its glyph fades in;
//   frames 18-36 (marker "done"): a navy postmark ring and three wavy cancel
//                lines stamp over the left half (scale 1.1 -> 1.0, ink at 85%).
// Frame 0 shows only the outline; frame 36 is the final postmarked state.

import { counterClockwise, ellipsePath, poly, rotateAbout, svg1 } from '../lib/geom.mjs';
import { composition, el, fl, gr, keys, sh, shapeLayer, st, stack } from '../lib/lottie.mjs';
import { leafShape, smoothCorners } from '../lib/art.mjs';

const W = 96;
const H = 112;
const OP = 36;
const CX = 48;
const CY = 56;
const PAPER = '#FBF6EA';
const CREAM = '#F6EDE0';
const NAVY = '#1D2B4F';
const SLOT = '#B3A992';

/* ------------------------------------------------------------------ */
/* Glyphs, drawn in a ~44 x 48 box centred on (CX, CY)                  */
/* ------------------------------------------------------------------ */

const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const holes = (cs) => cs.map((c) => counterClockwise(c));

const GLYPHS = {
  torii: () => [
    svg1(`M 26 38 C 34 41 62 41 70 38 L 69 43 C 62 45 34 45 27 43 Z`),
    rect(31, 45, 65, 49),
    rect(28, 54, 68, 57.4),
    rect(46, 49, 50, 54),
    poly([[34, 49], [38.6, 49], [39.6, 76], [33, 76]]),
    poly([[57.4, 49], [62, 49], [63, 76], [56.4, 76]]),
  ],
  temple: () => {
    const steps = [];
    for (let k = 0; k < 5; k++) steps.push(rect(28 + k * 3.6, 76 - k * 6, 68 - k * 3.6, 76 - (k + 1) * 6 + 0.6));
    return [...steps, rect(41, 40, 55, 46.6), rect(43.5, 32, 52.5, 40.6), ...holes([rect(46.4, 47, 49.6, 76), rect(46.6, 42, 49.4, 46.6)])];
  },
  papel: () => {
    const flag = poly([[30, 38], [66, 38], [66, 70], [62.4, 74], [58.8, 70], [55.2, 74], [51.6, 70], [48, 74], [44.4, 70], [40.8, 74], [37.2, 70], [33.6, 74], [30, 70]]);
    const cut = [ellipsePath(48, 55, 4, 4)];
    for (let k = 0; k < 8; k++) cut.push(rotateAbout(leafShape([48, 55], [48, 46], 3.4), k * 45, 48, 55));
    for (let k = 0; k < 4; k++) cut.push(poly([[34 + k * 9.3, 43], [35.8 + k * 9.3, 41.2], [37.6 + k * 9.3, 43], [35.8 + k * 9.3, 44.8]]));
    return [flag, ...holes(cut), poly([[24, 37.4], [72, 37.4], [72, 38.6], [24, 38.6]])];
  },
  chakana: () => {
    // stepped Andean cross with its central hole
    const u = 5.6;
    const pts = [[-1, -3], [1, -3], [1, -2], [2, -2], [2, -1], [3, -1], [3, 1], [2, 1], [2, 2], [1, 2], [1, 3], [-1, 3], [-1, 2], [-2, 2], [-2, 1], [-3, 1], [-3, -1], [-2, -1], [-2, -2], [-1, -2]];
    return [poly(pts.map(([x, y]) => [CX + x * u, CY + y * u])), counterClockwise(ellipsePath(CX, CY, u * 0.85, u * 0.85))];
  },
  lemon: () => [
    svg1(`M 36 60 C 34 50 42 42 52 42 C 58 42 63 44 66 47 C 70 46 71 49 69 51 C 72 56 70 66 62 70 C 55 74 44 74 39 70 C 36 71 34 69 35 66 C 34 64 35 62 36 60 Z`),
    leafShape([60, 44], [74, 32], 9, { bend: -0.08 }),
    poly([[58.6, 44.6], [60.4, 43.2], [63, 39.4], [61.6, 38.6]]),
  ],
  tower: () => {
    const outline = smoothCorners([[38, 78], [44, 64], [46, 56], [47.2, 46], [47.6, 36], [48, 28], [48.4, 36], [48.8, 46], [50, 56], [52, 64], [58, 78]], new Set([0, 5, 10]), 0.6);
    return [outline, counterClockwise(svg1('M 42 78 C 42 70 45 67 48 67 C 51 67 54 70 54 78 Z')), rect(40.6, 63, 55.4, 65), rect(44.2, 54, 51.8, 55.6)];
  },
  dome: () => [
    svg1('M 34 58 C 34 44 40 38 48 38 C 56 38 62 44 62 58 Z'),
    rect(36, 60, 60, 76),
    rect(32, 58, 64, 60.4),
    rect(47, 26, 49, 38),
    rect(43.4, 29.4, 52.6, 31.4),
    ...holes([svg1('M 45 76 L 45 67 C 45 64 51 64 51 67 L 51 76 Z'), svg1('M 38.6 70 L 38.6 66 C 38.6 64.4 41.4 64.4 41.4 66 L 41.4 70 Z'), svg1('M 54.6 70 L 54.6 66 C 54.6 64.4 57.4 64.4 57.4 66 L 57.4 70 Z')]),
  ],
  tram: () => [
    svg1('M 28 70 L 28 50 C 28 46 31 44 35 44 L 61 44 C 65 44 68 46 68 50 L 68 70 Z'),
    ...holes([rect(31.5, 48, 38, 56), rect(40.5, 48, 47, 56), rect(49.5, 48, 56, 56), rect(58.5, 48, 64.5, 56)]),
    rect(26, 70, 70, 72.6),
    ellipsePath(37, 75, 3.6, 3.6),
    ellipsePath(59, 75, 3.6, 3.6),
    poly([[52, 44], [53.6, 44], [62, 30], [60.6, 29.4]]),
    rect(56, 28.4, 68, 29.6),
  ],
  arch: () => {
    const outer = svg1('M 30 78 L 30 52 A 18 18 0 1 1 66 52 L 66 78 Z');
    const inner = svg1('M 38 78 L 38 60 C 33 56 33 46 38 42 C 42 38 54 38 58 42 C 63 46 63 56 58 60 L 58 78 Z');
    return [outer, counterClockwise(inner)];
  },
  lantern: () => [
    svg1('M 38 40 C 38 34 58 34 58 40 L 55 66 C 52 69 44 69 41 66 Z'),
    counterClockwise(svg1('M 46.4 66 C 46.4 62 48 60 48 60 C 48 60 49.6 62 49.6 66 Z')),
    el(34, 30, 2.4, 2.4),
    el(62, 26, 2, 2),
    el(60, 34, 1.6, 1.6),
  ],
  // The neutral stamp's glyph: a sealed envelope (flap + body).
  envelope: () => [
    rect(30, 44, 66, 70),
    poly([[30, 44], [48, 56], [66, 44]]),
    rect(31.6, 45.6, 64.4, 47),
  ],
};

/* ------------------------------------------------------------------ */
/* Stamp parts                                                          */
/* ------------------------------------------------------------------ */

function perforatedPaper() {
  const x0 = 10;
  const y0 = 10;
  const x1 = 86;
  const y1 = 102;
  const paper = rect(x0, y0, x1, y1);
  const r = 2.3;
  const bites = [];
  const pitch = 7.6;
  for (let x = x0 + pitch / 2; x < x1; x += pitch) bites.push(ellipsePath(x, y0, r, r), ellipsePath(x, y1, r, r));
  for (let y = y0 + pitch / 2; y < y1; y += pitch) bites.push(ellipsePath(x0, y, r, r), ellipsePath(x1, y, r, r));
  return [paper, ...bites.map((b) => counterClockwise(b))];
}

const ease = { drop: [0.2, 0.7, 0.3, 1], settle: [0.45, 0, 0.55, 1] };

function stamp({ id, color, glyph }) {
  const field = rect(17, 17, 79, 95);
  const frame = [rect(20.5, 20.5, 75.5, 91.5), counterClockwise(rect(22, 22, 74, 90))];
  const slot = svg1('M 12 9 L 84 9 C 86 9 87 10 87 12 L 87 100 C 87 102 86 103 84 103 L 12 103 C 10 103 9 102 9 100 L 9 12 C 9 10 10 9 12 9 Z');
  const shapes = GLYPHS[glyph]();
  const body = stack('stamp', [
    gr('paper', [...perforatedPaper().map((c) => sh(c)), fl(PAPER, { rule: 2 })]),
    gr('field', [sh(field), fl(color, { nm: 'country' })]),
    gr('frame', [...frame.map((c) => sh(c)), fl(CREAM, { rule: 2 })]),
    gr('glyph', [...shapes.map((c) => sh(c)), fl(CREAM, { rule: 2, nm: 'glyph' })], {
      o: keys([{ t: 0, v: 0, e: 'hold' }, { t: 6, v: 0, e: ease.settle }, { t: 16, v: 100, e: 'hold' }, { t: OP, v: 100 }]),
    }),
  ], {
    a: [CX, CY],
    p: [CX, CY],
    o: keys([{ t: 0, v: 0, e: 'out' }, { t: 4, v: 100, e: 'hold' }, { t: OP, v: 100 }]),
    s: keys([{ t: 0, v: [118, 118], e: ease.drop }, { t: 10, v: [97, 97], e: ease.settle }, { t: 14, v: [101.2, 101.2], e: ease.settle }, { t: 18, v: [100, 100], e: 'hold' }, { t: OP, v: [100, 100] }]),
    r: keys([{ t: 0, v: 2, e: ease.drop }, { t: 10, v: -2, e: ease.settle }, { t: 14, v: 0.6, e: ease.settle }, { t: 18, v: 0, e: 'hold' }, { t: OP, v: 0 }]),
  });
  // postmark: ring plus three wavy cancel lines over the left half
  const ring = ellipsePath(32, 44, 17, 17);
  const waves = [0, 1, 2].map((k) => {
    const y = 68 + k * 7;
    let d = `M 6 ${y}`;
    for (let x = 6; x < 52; x += 8) d += ` Q ${x + 2} ${y - 3} ${x + 4} ${y} Q ${x + 6} ${y + 3} ${x + 8} ${y}`;
    return svg1(d);
  });
  const ticks = [];
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    ticks.push(poly([[32 + Math.cos(a) * 12.5, 44 + Math.sin(a) * 12.5], [32 + Math.cos(a) * 14.2, 44 + Math.sin(a) * 14.2]], false));
  }
  const postmark = stack('postmark', [
    gr('ring', [sh(ring), st(NAVY, 2.6, { nm: 'ink' })]),
    gr('inner_ticks', [...ticks.map((t) => sh(t)), st(NAVY, 1.4)]),
    gr('cancel_lines', [...waves.map((w) => sh(w)), st(NAVY, 2.2, { cap: 2 })]),
  ], {
    a: [32, 58],
    p: [32, 58],
    o: keys([{ t: 0, v: 0, e: 'hold' }, { t: 18, v: 0, e: 'out' }, { t: 21, v: 85, e: 'hold' }, { t: OP, v: 85 }]),
    s: keys([{ t: 0, v: [110, 110], e: 'hold' }, { t: 18, v: [110, 110], e: ease.drop }, { t: 23, v: [99.2, 99.2], e: ease.settle }, { t: 27, v: [100, 100], e: 'hold' }, { t: OP, v: [100, 100] }]),
  });
  const json = composition({
    nm: `Waymark stamp · ${id}`,
    w: W,
    h: H,
    op: OP,
    layers: [
      // layers outlive the comp by a few frames so the end frame (36) still shows the final state
      shapeLayer('slot_outline', [gr('dash', [sh(slot), st(SLOT, 1.4, { dash: [4, 3] })])], { op: OP + 24 }),
      shapeLayer('stamp', [body], { op: OP + 24 }),
      shapeLayer('postmark', [postmark], { op: OP + 24 }),
    ],
    markers: [
      { tm: 0, cm: 'confirm', dr: 18 },
      { tm: 18, cm: 'done', dr: 18 },
    ],
  });
  return json;
}

const DEFS = [
  ['00-airmail', '#15223B', 'envelope'],
  ['01-japan', '#D9472B', 'torii'],
  ['02-guatemala', '#1F7A5C', 'temple'],
  ['03-mexico', '#D6246E', 'papel'],
  ['04-peru', '#B83A2E', 'chakana'],
  ['05-italy', '#1F6FB2', 'lemon'],
  ['06-france', '#2B3A67', 'tower'],
  ['07-greece', '#1F5FA8', 'dome'],
  ['08-portugal', '#1F4FA3', 'tram'],
  ['09-morocco', '#5148C8', 'arch'],
  ['10-thailand', '#1E2350', 'lantern'],
];

export const stamps = DEFS.map(([id, color, glyph]) => ({ id, build: () => stamp({ id, color, glyph }) }));
