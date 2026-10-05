// 02 · Guatemala, Tikal: dawn in the Peten.
// Temple I (Gran Jaguar) above an unbroken sea of rainforest, Temple II across
// the Gran Plaza, Temple IV's roof comb in the haze, mist between the canopy
// layers, a resplendent quetzal on a mossy branch, the sun rising on the right.

import { mix } from '../lib/color.mjs';
import { blob, poly, rng, smooth, svg1 } from '../lib/geom.mjs';
import { composition, cycle, drift, el, gr, keys, once, osc, sh, shapeLayer, stack } from '../lib/lottie.mjs';
import { canopy, glow, hatchG, ink, leafRib, leafShape, limb, paint, palette, skyLines, stippleG, vGradientRect } from '../lib/art.mjs';

const P = palette(['#1F7A5C', '#2C5E46', '#B9A88E', '#F4A259', '#B5245E']);
const [JADE, SELVA, CALIZA, AMANECER, HUIPIL] = P.list;
const SKY_TOP = '#F3CCA9';
const SKY_LOW = '#FBE6C6';
const HAZE = '#F8D9B4';
const SUN = [632, 284];
const DEEP = '#16302A';
const CRIMSON = mix(HUIPIL, '#D3262E', 0.45);

/* ------------------------------------------------------------------ */
/* Sky and sun                                                         */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [0.5, '#F4C29A'], [1, SKY_LOW]], { y0: 0, y1: 320 }),
    skyLines('engraving', { y0: 2, y1: 190, color: '#C9764F', o: 30, seed: 17 }),
    stack('sun', [
      glow('halo', SUN[0], SUN[1], 340, 230, '#FFF0D2', { alpha: 0.9, mid: 0.45 }),
      glow('bloom', SUN[0], SUN[1], 90, 90, '#FFF8E8', { alpha: 1, mid: 0.7 }),
      paint('disc', el(SUN[0], SUN[1], 56, 56), '#FFF6E2'),
    ], {
      a: SUN,
      p: SUN,
      s: cycle([[100, 100], [108, 108]], { period: 240 }),
      o: cycle([86, 100], { period: 240 }),
    }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Temples                                                             */
/* ------------------------------------------------------------------ */

/**
 * Stepped Peten pyramid, frontal: terraces with inset corners and apron
 * mouldings, a central projecting staircase. Light from the right.
 */
function pyramid({ cx, base, levels, h, hw0, hw1, talud = 3, inset = 4.5, stair0, stair1, colors, hatch = false, moss = 0, seed = 1 }) {
  const fronts = [];
  const lefts = [];
  const rights = [];
  const moulds = [];
  const mouldShade = [];
  const ledges = [];
  let top = base;
  for (let i = 0; i < levels; i++) {
    const yb = base - h * i;
    const yt = yb - h;
    const hw = hw0 + ((hw1 - hw0) * i) / Math.max(1, levels - 1);
    const ht = hw - talud;
    fronts.push(poly([[cx - ht + inset, yt], [cx + ht - inset, yt], [cx + hw - inset, yb], [cx - hw + inset, yb]]));
    lefts.push(poly([[cx - ht, yt + 1], [cx - ht + inset, yt + 1], [cx - hw + inset, yb], [cx - hw, yb]]));
    rights.push(poly([[cx + ht - inset, yt + 1], [cx + ht, yt + 1], [cx + hw, yb], [cx + hw - inset, yb]]));
    const m0 = yt + h * 0.14;
    const m1 = yt + h * 0.34;
    moulds.push(poly([[cx - ht - 0.6, m0], [cx + ht + 0.6, m0], [cx + ht + 0.6, m1], [cx - ht - 0.6, m1]]));
    mouldShade.push(poly([[cx - ht, m1], [cx + ht, m1], [cx + ht, m1 + h * 0.13], [cx - ht, m1 + h * 0.13]]));
    ledges.push(poly([[cx - ht, yt], [cx + ht, yt], [cx + ht, yt + 1.6], [cx - ht, yt + 1.6]]));
    top = yt;
  }
  const stair = poly([[cx - stair1, top], [cx + stair1, top], [cx + stair0, base], [cx - stair0, base]]);
  const stairL = poly([[cx - stair1, top], [cx - stair1 + 2.6, top], [cx - stair0 + 3.4, base], [cx - stair0, base]]);
  const stairR = poly([[cx + stair1 - 2.6, top], [cx + stair1, top], [cx + stair0, base], [cx + stair0 - 3.4, base]]);
  const leftHalf = poly([[cx - hw1 - 2, top], [cx - stair1, top], [cx - stair0, base], [cx - hw0 - 2, base]]);
  const groups = [
    paint('fronts', fronts, colors.front, { pal: P }),
    hatch && hatchG('front_hatch', leftHalf, { color: colors.dark, angle: 0, spacing: 2.8, w: 0.7, o: 30, inset: 0, seed }),
    paint('corner_shade', lefts, colors.shade),
    paint('corner_lit', rights, colors.lit),
    paint('mouldings', moulds, colors.lit, { o: 85 }),
    paint('moulding_shade', mouldShade, colors.dark, { o: 70 }),
    paint('ledges', ledges, colors.hi),
    paint('stair', stair, colors.stair),
    hatchG('steps', stair, { color: colors.dark, angle: 0, spacing: h > 15 ? 2.5 : 3, w: 0.8, o: 70, inset: 0, seed: seed + 1 }),
    paint('stair_shade', stairL, colors.shade),
    paint('stair_lit', stairR, colors.lit),
  ];
  if (moss) {
    const lower = poly([[cx - hw0, base - h * 4], [cx + hw0, base - h * 4], [cx + hw0, base], [cx - hw0, base]]);
    groups.push(stippleG('moss', lower, { color: colors.moss, o: 70, count: moss, minDist: 4.5, r0: 0.6, r1: 1.3, seed: seed + 2 }));
  }
  return { groups, top };
}

function templeOne() {
  const cx = 400;
  const c = {
    front: CALIZA,
    shade: mix(CALIZA, '#3E4A48', 0.5),
    dark: mix(CALIZA, '#2A2E2C', 0.62),
    lit: mix(CALIZA, AMANECER, 0.42),
    hi: mix(CALIZA, '#FFE7C4', 0.6),
    stair: mix(CALIZA, '#FFE2BE', 0.22),
    moss: mix(SELVA, '#1C3A2C', 0.4),
  };
  const pyr = pyramid({ cx, base: 376, levels: 9, h: 19.2, hw0: 94, hw1: 38, stair0: 25, stair1: 15.5, colors: c, hatch: true, moss: 60, seed: 11 });
  const top = pyr.top;
  // temple: plinth, body with medial moulding, single doorway, cornice
  const plinth = poly([[cx - 31, top - 4], [cx + 31, top - 4], [cx + 33, top], [cx - 33, top]]);
  const body = poly([[cx - 27, top - 31], [cx + 27, top - 31], [cx + 28, top - 4], [cx - 28, top - 4]]);
  const bodyLit = poly([[cx + 21, top - 31], [cx + 27, top - 31], [cx + 28, top - 4], [cx + 22, top - 4]]);
  const bodyShade = poly([[cx - 27, top - 31], [cx - 22, top - 31], [cx - 23, top - 4], [cx - 28, top - 4]]);
  const medial = poly([[cx - 29, top - 19], [cx + 29, top - 19], [cx + 29, top - 15.5], [cx - 29, top - 15.5]]);
  const medialShade = poly([[cx - 28, top - 15.5], [cx + 28, top - 15.5], [cx + 28, top - 13.5], [cx - 28, top - 13.5]]);
  const door = poly([[cx - 6, top - 14], [cx + 6, top - 14], [cx + 6, top - 4], [cx - 6, top - 4]]);
  const cornice = poly([[cx - 29.5, top - 35], [cx + 29.5, top - 35], [cx + 29.5, top - 31], [cx - 29.5, top - 31]]);
  // roof comb: two stepped tiers with recessed panels (eroded ruler figure)
  const t0 = top - 35;
  // the comb is set over the rear wall: one tall slab with stepped sides
  const comb = svg1(`M ${cx - 24} ${t0} L ${cx - 23} ${t0 - 22} L ${cx - 20} ${t0 - 23} L ${cx - 19} ${t0 - 44} L ${cx - 16} ${t0 - 45} L ${cx - 15} ${t0 - 62} L ${cx + 15} ${t0 - 62} L ${cx + 16} ${t0 - 45} L ${cx + 19} ${t0 - 44} L ${cx + 20} ${t0 - 23} L ${cx + 23} ${t0 - 22} L ${cx + 24} ${t0} Z`);
  const comb1 = comb;
  const comb2 = poly([[cx - 14, t0 - 60], [cx + 14, t0 - 60], [cx + 14, t0 - 58], [cx - 14, t0 - 58]]);
  const cap = poly([[cx - 16.5, t0 - 66], [cx + 16.5, t0 - 66], [cx + 16.5, t0 - 62], [cx - 16.5, t0 - 62]]);
  const combLit = [svg1(`M ${cx + 24} ${t0} L ${cx + 23} ${t0 - 22} L ${cx + 20} ${t0 - 23} L ${cx + 19} ${t0 - 44} L ${cx + 16} ${t0 - 45} L ${cx + 15} ${t0 - 62} L ${cx + 11} ${t0 - 62} L ${cx + 12} ${t0 - 45} L ${cx + 15} ${t0 - 44} L ${cx + 16} ${t0 - 23} L ${cx + 19} ${t0 - 22} L ${cx + 20} ${t0} Z`)];
  const combShade = [svg1(`M ${cx - 24} ${t0} L ${cx - 23} ${t0 - 22} L ${cx - 20} ${t0 - 23} L ${cx - 19} ${t0 - 44} L ${cx - 16} ${t0 - 45} L ${cx - 15} ${t0 - 62} L ${cx - 12} ${t0 - 62} L ${cx - 13} ${t0 - 45} L ${cx - 16} ${t0 - 44} L ${cx - 17} ${t0 - 23} L ${cx - 20} ${t0 - 22} L ${cx - 21} ${t0} Z`)];
  // weathered relief of the seated ruler: head, shoulders, flanking scrolls
  const panels = [];
  for (const [y0, y1, cols] of [[t0 - 17, t0 - 6, [[-19, -9], [-6, 5], [8, 18]]], [t0 - 36, t0 - 24, [[-15, -4], [-1, 7], [10, 15]]], [t0 - 55, t0 - 46, [[-11, -2], [2, 11]]]]) {
    for (const [a, b] of cols) panels.push(poly([[cx + a, y0], [cx + b, y0], [cx + b, y1], [cx + a, y1]]));
  }
  const figure = [poly([[cx - 13, t0 - 22], [cx + 13, t0 - 22], [cx + 13, t0 - 19.5], [cx - 13, t0 - 19.5]]), poly([[cx - 10, t0 - 42], [cx + 10, t0 - 42], [cx + 10, t0 - 39.5], [cx - 10, t0 - 39.5]])];
  return shapeLayer('landmark_temple_i', [
    ...pyr.groups,
    paint('plinth', plinth, c.hi),
    paint('temple', body, c.front, { pal: P }),
    paint('temple_lit', bodyLit, c.lit),
    paint('temple_shade', bodyShade, c.shade),
    paint('medial', medial, c.hi),
    paint('medial_shade', medialShade, c.dark),
    paint('doorway', door, '#2A2420'),
    paint('cornice', cornice, c.hi),
    paint('comb', comb1, c.front, { pal: P }),
    paint('comb_band', comb2, c.hi),
    paint('comb_lit', combLit, c.lit),
    paint('comb_shade', combShade, c.shade),
    paint('comb_panels', panels, c.dark, { o: 75 }),
    paint('comb_figure', figure, c.shade),
    paint('cap', cap, c.hi),
    stippleG('lichen', [comb1, comb2, body], { color: c.moss, o: 55, count: 34, minDist: 3.5, r0: 0.5, r1: 1, seed: 5 }),
  ]);
}

function templeTwo() {
  const cx = 150;
  const hz = (col) => mix(col, HAZE, 0.42);
  const c = {
    front: hz(CALIZA),
    shade: hz(mix(CALIZA, '#3E4A48', 0.5)),
    dark: hz(mix(CALIZA, '#2A2E2C', 0.6)),
    lit: hz(mix(CALIZA, AMANECER, 0.4)),
    hi: hz(mix(CALIZA, '#FFE7C4', 0.55)),
    stair: hz(mix(CALIZA, '#FFE2BE', 0.2)),
    moss: hz(SELVA),
  };
  const pyr = pyramid({ cx, base: 340, levels: 3, h: 34, hw0: 78, hw1: 52, talud: 5, inset: 6, stair0: 30, stair1: 24, colors: c, seed: 21 });
  const top = pyr.top;
  const body = poly([[cx - 30, top - 26], [cx + 30, top - 26], [cx + 31, top], [cx - 31, top]]);
  const bodyLit = poly([[cx + 24, top - 26], [cx + 30, top - 26], [cx + 31, top], [cx + 25, top]]);
  const door = poly([[cx - 5, top - 14], [cx + 5, top - 14], [cx + 5, top], [cx - 5, top]]);
  const medial = poly([[cx - 31, top - 17], [cx + 31, top - 17], [cx + 31, top - 14], [cx - 31, top - 14]]);
  // weathered roof comb: stepped sides, a crumbled top, rows of recessed panels
  const t = top - 26;
  const comb = poly([[cx - 26, t], [cx - 25, t - 12], [cx - 22, t - 13], [cx - 21, t - 24], [cx - 18, t - 25], [cx - 17, t - 30], [cx - 12, t - 31], [cx - 10, t - 28], [cx - 6, t - 32], [cx + 1, t - 31], [cx + 4, t - 34], [cx + 9, t - 33], [cx + 12, t - 30], [cx + 15, t - 30], [cx + 16, t - 25], [cx + 21, t - 23], [cx + 22, t - 12], [cx + 25, t - 11], [cx + 26, t]]);
  const combLit = poly([[cx + 26, t], [cx + 25, t - 11], [cx + 22, t - 12], [cx + 21, t - 23], [cx + 16, t - 25], [cx + 15, t - 30], [cx + 12, t - 30], [cx + 13, t - 24], [cx + 18, t - 22], [cx + 19, t - 10], [cx + 22, t - 9], [cx + 22, t]]);
  const panels = [];
  for (const [y0, y1, cols] of [[t - 9, t - 3, [[-19, -13], [-10, -1], [3, 8], [11, 18]]], [t - 21, t - 14, [[-15, -7], [-3, 3], [6, 13]]]]) for (const [a, b] of cols) panels.push(poly([[cx + a, y0], [cx + b, y0], [cx + b, y1], [cx + a, y1]]));
  // knocked-out blocks where the sky shows through
  const holes = [poly([[cx - 21, t - 24], [cx - 17, t - 24], [cx - 17, t - 19], [cx - 21, t - 19]]), poly([[cx + 16, t - 24], [cx + 20, t - 24], [cx + 20, t - 18], [cx + 16, t - 18]]), poly([[cx - 2, t - 28], [cx + 2, t - 28], [cx + 2, t - 24], [cx - 2, t - 24]])];
  const gaps = [poly([[cx - 6, t - 32], [cx - 2, t - 31.5], [cx - 3, t - 27], [cx - 7, t - 27.5]]), poly([[cx + 9, t - 33], [cx + 12, t - 30], [cx + 9, t - 27]])];
  const tufts = [[cx - 14, t - 31], [cx + 3, t - 34], [cx + 14, t - 30]].map(([x, y], k) => blob(x, y, 4.5, 2.6, { n: 6, jitter: 0.3, seed: 70 + k }));
  return shapeLayer('far_temple_ii', [
    ...pyr.groups,
    paint('temple', body, c.front),
    paint('temple_lit', bodyLit, c.lit),
    paint('medial', medial, c.hi),
    paint('doorway', door, hz('#2A2420')),
    paint('comb', comb, c.front),
    paint('comb_lit', combLit, mix(c.lit, '#FFE7C4', 0.35)),
    paint('comb_panels', panels, c.dark, { o: 60 }),
    paint('comb_gaps', gaps, c.shade),
    paint('comb_holes', holes, '#F6D7B6'),
    paint('comb_plants', tufts, hz(SELVA)),
  ]);
}

function templeFour() {
  const cx = 706;
  const hz = (col) => mix(col, '#FBE2C0', 0.6);
  const temple = poly([[cx - 30, 262], [cx + 30, 262], [cx + 31, 290], [cx - 31, 290]]);
  const comb = svg1(`M ${cx - 24} 262 L ${cx - 22} 228 L ${cx - 16} 226 L ${cx - 15} 212 L ${cx + 15} 212 L ${cx + 16} 226 L ${cx + 22} 228 L ${cx + 24} 262 Z`);
  const lit = poly([[cx - 24, 262], [cx - 19, 262], [cx - 17, 228], [cx - 22, 228]]);
  const slots = [poly([[cx - 10, 232], [cx + 3, 232], [cx + 3, 244], [cx - 10, 244]]), poly([[cx - 14, 222], [cx + 14, 222], [cx + 14, 224.5], [cx - 14, 224.5]])];
  return shapeLayer('far_temple_iv', [
    paint('temple', temple, hz(mix(CALIZA, '#6D5F58', 0.3))),
    paint('comb', comb, hz(mix(CALIZA, '#6D5F58', 0.3))),
    paint('comb_lit', lit, hz(mix(CALIZA, AMANECER, 0.5))),
    paint('slots', slots, hz('#5A4A44')),
  ]);
}

/* ------------------------------------------------------------------ */
/* Canopy and mist                                                     */
/* ------------------------------------------------------------------ */

function crownsAlong(x0, x1, yAt, r0, r1, seed, step = [18, 28]) {
  const r = rng(seed);
  const out = [];
  for (let x = x0; x < x1; x += r.range(step[0], step[1])) out.push([x, yAt(x) + r.range(-4, 4), r.range(r0, r1)]);
  return out;
}

function canopyBand(name, crowns, c, { rim = 0.32, base = 520, his = true } = {}) {
  const sunSide = (x) => (SUN[0] > x ? 1 : -1);
  const lit = canopy(crowns, base);
  const shade = canopy(crowns.map(([x, y, r]) => [x - sunSide(x) * r * 0.12, y + r * rim, r * 0.97]), base);
  const hi = his ? crowns.filter(([x], j) => j % 3 === 1 && (x > 300 || j % 2)).map(([x, y, r]) => el(x + sunSide(x) * r * 0.32, y - r * 0.74, r * 0.5, r * 0.16)) : [];
  return stack(name, [paint('lit', lit, c.lit, { pal: P }), paint('shade', shade, c.shade, { pal: P }), hi.length && paint('hi', hi, c.hi, { pal: P, o: c.hiO ?? 100 })]);
}

const forest = (h) => ({
  lit: mix(mix(JADE, AMANECER, 0.12), HAZE, h),
  shade: mix(SELVA, HAZE, h),
  hi: mix(mix(JADE, '#FFD9A0', 0.45), HAZE, h),
});

function farCanopy() {
  const crowns = crownsAlong(-30, 850, (x) => 304 + Math.sin(x / 90) * 4, 12, 20, 3, [16, 24]);
  // ceiba emergent with its flat umbrella crown
  return shapeLayer('far_canopy', [
    canopyBand('far_trees', crowns, forest(0.58), { rim: 0.3 }),
    paint('ceiba_trunk', poly([[536, 300], [540, 300], [541, 312], [535, 312]]), mix(SELVA, HAZE, 0.55)),
    paint('ceiba_crown', smooth([[498, 300], [512, 290], [540, 286], [568, 290], [582, 300], [560, 304], [516, 304]]), mix(JADE, HAZE, 0.5)),
  ]);
}

function mistBand(name, y, h, tile, opacity, seed) {
  const items = [];
  for (let t = -2; t < Math.ceil(1000 / tile); t++) {
    const r = rng(seed);
    for (let j = 0; j < 2; j++) {
      const x = t * tile + j * tile * 0.5 + r.range(0, 30);
      const w = r.range(tile * 0.6, tile * 0.85);
      items.push(blob(x + w / 2, y + r.range(-h * 0.2, h * 0.2), w / 2, r.range(h * 0.25, h * 0.38), { n: 7, jitter: 0.15, seed: seed + j }));
    }
  }
  return [
    vGradientRect('band', -200, y - h / 2, 1200, h, [[0, SKY_LOW], [1, SKY_LOW]], { alpha: [[0, 0], [0.5, opacity], [1, 0]] }),
    gr('wisps', [...items.map((c) => sh(c)), P.fill(SKY_LOW, { o: 72 })], { p: drift([-tile, 0], [0, 0], { period: 240 }) }),
  ].map((g) => ({ ...g, nm: g.nm && `${name}_${g.nm}` }));
}

function midCanopy() {
  const crowns = crownsAlong(-30, 850, (x) => 336 + Math.sin(x / 70 + 1) * 5, 15, 25, 5, [18, 28]);
  return shapeLayer('mid_canopy', [
    canopyBand('mid_trees', crowns, forest(0.36), { rim: 0.32 }),
    // a second emergent on the left
    paint('emergent', smooth([[228, 328], [240, 312], [266, 306], [294, 312], [304, 326], [280, 332], [244, 332]]), mix(mix(JADE, AMANECER, 0.15), HAZE, 0.34)),
    paint('emergent_shade', smooth([[232, 330], [250, 322], [276, 322], [300, 328], [282, 336], [246, 336]]), mix(SELVA, HAZE, 0.36)),
  ]);
}

function palm(x, y, size, seed) {
  const r = rng(seed);
  const fronds = [];
  const lit = [];
  for (let k = 0; k < 9; k++) {
    const a = (-172 + k * 21 + r.range(-6, 6)) * (Math.PI / 180);
    const len = size * r.range(0.8, 1.05);
    const droop = Math.abs(Math.cos(a)) * 0.5;
    const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len * 0.7 + droop * len * 0.5];
    (Math.cos(a) > 0.2 ? lit : fronds).push(leafShape([x, y], tip, size * 0.2, { bend: Math.cos(a) * 0.12, round: 0.2 }));
  }
  return { fronds, lit };
}

function nearCanopy() {
  const r = rng(9);
  const rows = [
    { y: 390, r0: 17, r1: 28, c: { lit: mix(JADE, AMANECER, 0.12), shade: mix(SELVA, HAZE, 0.06), hi: AMANECER, hiO: 55 }, rim: 0.32 },
    { y: 426, r0: 20, r1: 32, c: { lit: mix(JADE, SELVA, 0.35), shade: SELVA, hi: AMANECER, hiO: 40 }, rim: 0.36 },
    { y: 466, r0: 24, r1: 38, c: { lit: mix(SELVA, JADE, 0.4), shade: mix(SELVA, DEEP, 0.5), hi: mix(AMANECER, SELVA, 0.4), hiO: 35 }, rim: 0.38 },
  ];
  // variety over the canopy: hollows, mist pockets, silvery cecropias, flowering crowns, an emergent
  const hollows = [[96, 412, 30, 9], [318, 404, 26, 8], [486, 416, 34, 9], [690, 408, 28, 8], [204, 450, 30, 9], [598, 452, 32, 9]].map(([x, y, rx, ry], k) => blob(x, y, rx, ry, { n: 7, jitter: 0.25, seed: 160 + k }));
  const mist = [[150, 398, 44, 10], [560, 396, 52, 11], [400, 440, 46, 10]].map(([x, y, rx, ry], k) => blob(x, y, rx, ry, { n: 8, jitter: 0.2, seed: 170 + k }));
  const palmate = (x, y, rr, rot) => {
    const pts = [];
    for (let k = 0; k < 14; k++) {
      const a = rot + (k * Math.PI) / 7;
      const rad = k % 2 ? rr * 0.42 : rr;
      pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.6]);
    }
    return smooth(pts, { tension: 0.7 });
  };
  const cecro = [[268, 378, 16], [700, 388, 18], [40, 420, 17]].map(([x, y, rr], k) => ({
    crown: [palmate(x - rr * 0.5, y + 2, rr * 0.7, 0.2 + k), palmate(x + rr * 0.45, y + 1, rr * 0.66, 0.6 + k)],
    lit: [palmate(x, y - rr * 0.32, rr * 0.75, 0.4 + k)],
    stems: [limb([[x - rr * 0.5, y + 2], [x - rr * 0.4, y + rr * 0.7]], 2, 1.2), limb([[x + rr * 0.45, y + 1], [x + rr * 0.35, y + rr * 0.7]], 2, 1.2)],
  }));
  // blossoms clustered along the sunlit upper edge of a crown
  const bloomAt = (x, y, rx, ry, n, seed) => {
    const rr = rng(seed);
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = rr.range(Math.PI * 1.05, Math.PI * 1.95);
      const d = rr.range(0.62, 1);
      out.push(el(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, rr.range(3, 5.4), rr.range(3, 5)));
    }
    return out;
  };
  const bloomShade = (list) => list.map((e) => el(e.p.k[0] + 1, e.p.k[1] + 1.4, e.s.k[0], e.s.k[1]));
  const pinkCrowns = [blob(118, 392, 26, 15, { n: 9, jitter: 0.18, seed: 201 }), blob(636, 430, 30, 17, { n: 9, jitter: 0.18, seed: 202 })];
  const pink = [...bloomAt(118, 392, 24, 13, 26, 203), ...bloomAt(636, 430, 28, 15, 30, 204)];
  const yellow = bloomAt(458, 388, 20, 11, 22, 205);
  const yellowCrown = blob(458, 390, 22, 13, { n: 9, jitter: 0.18, seed: 206 });
  const emergentTrunk = limb([[530, 440], [528, 380], [526, 316]], 11, 6);
  const emergent = canopy([[498, 308, 15], [514, 298, 18], [534, 294, 19], [552, 302, 15], [564, 310, 11]], 318);
  const emergentLit = canopy([[508, 302, 11], [526, 293, 13], [544, 296, 11]], 304);
  const emergentUnder = blob(530, 318, 38, 5, { n: 8, jitter: 0.2, seed: 209 });
  const extraPalms = [palm(70, 398, 28, 7), palm(346, 404, 24, 8)];
  const before = [paint('emergent_trunk', emergentTrunk, mix(SELVA, '#4A3A2A', 0.5)), paint('emergent', emergent, mix(JADE, SELVA, 0.3)), paint('emergent_lit', emergentLit, mix(JADE, AMANECER, 0.22)), paint('emergent_under', emergentUnder, mix(SELVA, DEEP, 0.55))];
  const extras = [
    [
      paint('hollows_0', hollows.slice(0, 4), DEEP, { o: 55 }),
      paint('mist_pockets', mist.slice(0, 2), SKY_LOW, { o: 55 }),
      paint('cecropia_stems', cecro.slice(0, 2).flatMap((c) => c.stems), mix(SELVA, DEEP, 0.3)),
      paint('cecropia', cecro.slice(0, 2).flatMap((c) => c.crown), mix(JADE, '#B9C9A0', 0.32)),
      paint('cecropia_lit', cecro.slice(0, 2).flatMap((c) => c.lit), mix(JADE, '#E6EDD0', 0.45)),
      paint('flowering_crowns', [pinkCrowns[0], yellowCrown], mix(SELVA, JADE, 0.5)),
      paint('blossom_shadow', bloomShade([...pink.slice(0, 26), ...yellow]), mix(SELVA, DEEP, 0.5), { o: 60 }),
      paint('blossoms_pink', pink.slice(0, 26), HUIPIL, { pal: P }),
      paint('blossoms_yellow', yellow, mix(AMANECER, '#FFE15A', 0.55)),
      stack('more_palms', [
        paint('fronds', extraPalms.flatMap((p) => p.fronds), mix(SELVA, HAZE, 0.05)),
        paint('fronds_lit', extraPalms.flatMap((p) => p.lit), mix(JADE, AMANECER, 0.25)),
      ], { a: [200, 420], p: [200, 420], r: osc(-0.6, 0.6, { period: 120, phase: 0.7 }) }),
    ],
    [
      paint('hollows_1', hollows.slice(4), DEEP, { o: 55 }),
      paint('mist_pocket_low', mist.slice(2), SKY_LOW, { o: 50 }),
      paint('cecropia_low_stems', cecro[2].stems, mix(SELVA, DEEP, 0.3)),
      paint('cecropia_low', cecro[2].crown, mix(JADE, '#B9C9A0', 0.32)),
      paint('cecropia_low_lit', cecro[2].lit, mix(JADE, '#E6EDD0', 0.45)),
      paint('flowering_crown_low', [pinkCrowns[1]], mix(SELVA, JADE, 0.5)),
      paint('blossom_shadow_low', bloomShade(pink.slice(26)), mix(SELVA, DEEP, 0.5), { o: 60 }),
      paint('blossoms_pink_low', pink.slice(26), HUIPIL, { pal: P }),
    ],
    [],
  ];
  extras[1].push(paint('hollows_2', [[150, 470, 34, 11], [342, 476, 30, 10], [512, 466, 36, 11], [720, 474, 30, 10]].map(([x, y, rx, ry], k) => blob(x, y, rx, ry, { n: 7, jitter: 0.3, seed: 230 + k })), DEEP, { o: 60 }), glow('mist_pocket_front', 430, 462, 80, 14, SKY_LOW, { alpha: 0.42, mid: 0.5 }));
  const segs = [...before];
  rows.forEach((row, ri) => {
    for (let sg = 0; sg < 5; sg++) {
      const x0 = -60 + sg * 190 + ri * 40;
      const lift = (x) => (Math.abs(x - 400) < 110 && ri === 0 ? 12 : 0);
      const crowns = crownsAlong(x0, x0 + 215, (x) => row.y + Math.sin(x / 55 + ri) * 6 + lift(x), row.r0, row.r1, 30 + ri * 10 + sg, [20, 32]);
      const cxs = x0 + 107;
      segs.push(
        stack(`row${ri}_${sg}`, [
          canopyBand('trees', crowns, row.c, { rim: row.rim }),
          stippleG('leaves', crowns.map(([x, y, rr]) => blob(x, y + rr * 0.55, rr * 0.8, rr * 0.36, { n: 6, seed: sg })), { color: DEEP, o: 40, count: 14, minDist: 7, seed: sg + ri * 7 }),
        ], {
          a: [cxs, 520],
          p: [cxs, 520],
          r: osc(-0.45, 0.45, { period: 240, phase: r.next() }),
          s: osc([100, 100], [100, 101], { period: 120, phase: r.next() }),
        }),
      );
    }
    if (ri === 0) {
      const palms = [palm(206, 384, 34, 3), palm(566, 390, 30, 4)];
      segs.push(
        stack('palms', [
          paint('fronds', palms.flatMap((p) => p.fronds), mix(SELVA, HAZE, 0.05)),
          paint('fronds_lit', palms.flatMap((p) => p.lit), mix(JADE, AMANECER, 0.25)),
        ], { a: [386, 420], p: [386, 420], r: osc(-0.6, 0.6, { period: 120, phase: 0.3 }) }),
      );
    }
    segs.push(...extras[ri]);
  });
  return shapeLayer('fg_canopy', segs);
}

/* ------------------------------------------------------------------ */
/* Foreground: mossy branch, bromeliad, leaves, quetzal                 */
/* ------------------------------------------------------------------ */

function branch() {
  const wood = mix('#4A3A2E', DEEP, 0.35);
  const woodLit = mix('#8A6A4C', AMANECER, 0.3);
  const line = [[832, 316], [790, 318], [752, 324], [712, 331], [676, 334], [640, 341], [606, 346], [578, 356], [552, 370], [538, 380]];
  const main = limb(line, 24, 7);
  const lit = [limb(line.slice(0, 4).map(([x, y]) => [x, y - 8]), 3.4, 1.2), limb(line.slice(5, 8).map(([x, y]) => [x, y - 6]), 2.6, 1)];
  const twig = limb([[606, 344], [590, 328], [572, 318], [560, 314]], 6, 1.4);
  const topAt = (x) => {
    for (let k = 0; k < line.length - 1; k++) {
      const [x0, y0] = line[k];
      const [x1, y1] = line[k + 1];
      if (x <= x0 && x >= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0) - 9;
    }
    return line[line.length - 1][1] - 4;
  };
  const r = rng(77);
  const moss = [];
  const mossLit = [];
  const hanging = [];
  for (let x = 820; x > 556; x -= r.range(18, 30)) {
    if (x > 684 && x < 706) continue; // the quetzal's perch stays bare
    const y = topAt(x);
    const w = r.range(12, 22);
    moss.push(blob(x, y + 2, w, r.range(5, 8), { n: 7, jitter: 0.25, seed: Math.round(x) }));
    mossLit.push(blob(x + w * 0.2, y - 1, w * 0.6, r.range(2.5, 4), { n: 6, jitter: 0.25, seed: Math.round(x) + 1 }));
    if (r.next() < 0.5) hanging.push(limb([[x - 4, y + 18], [x - 6, y + 28], [x - 3, y + 30 + r.range(6, 16)]], 3, 0.8));
  }
  const ferns = [];
  for (const [fx, fy, dir] of [[760, 312, -1], [636, 336, 1]]) {
    for (let k = 0; k < 4; k++) {
      const a = (-120 + dir * (k * 16 - 24)) * (Math.PI / 180);
      ferns.push(leafShape([fx, fy], [fx + Math.cos(a) * 20, fy + Math.sin(a) * 18], 4.2, { bend: dir * 0.15, round: 0.1 }));
    }
  }
  // bromeliad rosette with a huipil-red bract
  const bx = 592;
  const by = 340;
  const brom = [];
  const bromLit = [];
  for (let k = 0; k < 7; k++) {
    const a = (-160 + k * 23) * (Math.PI / 180);
    const len = 32 - Math.abs(k - 3) * 3;
    const tip = [bx + Math.cos(a) * len, by + Math.sin(a) * len * 0.9];
    (k > 3 ? bromLit : brom).push(leafShape([bx, by], tip, 6.5, { bend: (k - 3) * 0.04 }));
  }
  const bract = leafShape([bx + 1, by - 2], [bx + 4, by - 32], 7.5, { bend: 0.05 });
  const vines = [limb([[742, 332], [738, 362], [744, 394], [738, 432]], 2.4, 1), limb([[560, 364], [556, 394], [562, 422]], 2.2, 1)];
  return shapeLayer('fg_branch', [
    paint('vines', vines, mix(SELVA, DEEP, 0.4)),
    paint('wood', [main, twig], wood),
    hatchG('bark', main, { color: '#1E1712', angle: 10, spacing: 3.4, w: 0.7, o: 26, seed: 4 }),
    paint('wood_lit', lit, woodLit),
    paint('moss_hanging', hanging, mix(JADE, '#B8C77A', 0.35)),
    paint('moss', moss, mix(JADE, DEEP, 0.35)),
    paint('moss_lit', mossLit, JADE, { pal: P }),
    stippleG('moss_dots', moss, { color: mix(JADE, '#E8E39A', 0.5), o: 70, count: 30, minDist: 4, r0: 0.6, r1: 1.1, seed: 9 }),
    paint('epiphyte_ferns', ferns, mix(JADE, '#9CCB7A', 0.3)),
    paint('bromeliad', brom, mix(SELVA, DEEP, 0.25)),
    paint('bromeliad_lit', bromLit, mix(JADE, '#C9D97A', 0.3)),
    paint('bract', bract, HUIPIL, { pal: P }),
  ]);
}

function leaves() {
  const L = [];
  const lit = [];
  const ribs = [];
  const add = (b, t, w, bend, isLit) => {
    (isLit ? lit : L).push(leafShape(b, t, w, { bend }));
    ribs.push(leafRib(b, t, { bend }));
  };
  // bottom-left philodendron and heliconia blades
  add([-10, 520], [120, 400], 70, 0.08, false);
  add([20, 520], [170, 446], 56, -0.06, true);
  add([-20, 470], [70, 360], 48, 0.1, false);
  add([60, 520], [210, 486], 40, -0.1, false);
  // bottom-right
  add([820, 520], [690, 412], 64, -0.08, false);
  add([790, 520], [640, 470], 50, 0.06, true);
  add([830, 470], [740, 380], 42, -0.12, false);
  return shapeLayer('fg_leaves', [
    paint('leaves', L, mix(SELVA, DEEP, 0.55)),
    paint('leaves_lit', lit, mix(SELVA, DEEP, 0.25)),
    ink('ribs', ribs.map((pts) => poly(pts, false)), mix(JADE, '#C9D97A', 0.25), 1.1, { o: 70 }),
  ]);
}

function quetzal() {
  const green = mix(JADE, '#22B07A', 0.35);
  const greenLit = mix(JADE, '#9EE6B8', 0.45);
  const greenDark = mix(SELVA, DEEP, 0.4);
  // streamers: two very long green upper-tail coverts, hanging below the perch
  const s1 = limb([[704, 314], [708, 350], [704, 392], [698, 432], [704, 470]], 6, 1.2);
  const s2 = limb([[708, 314], [716, 352], [716, 394], [722, 428], [716, 462]], 5.4, 1.2);
  const tail = stack('streamers', [paint('streamers', [s2, s1], green), paint('streamer_lit', limb([[706, 318], [710, 352], [706, 392]], 2, 0.6), greenLit)], {
    a: [706, 314],
    p: [706, 314],
    r: osc(-3, 3, { period: 120, phase: 0.2 }),
  });
  const undertail = svg1('M 700 312 C 702 322 706 334 712 338 C 716 330 714 318 710 310 Z');
  const body = svg1('M 682 284 C 676 296 680 314 694 320 C 704 324 712 318 712 304 C 712 290 704 278 694 276 C 688 276 684 279 682 284 Z');
  const breast = svg1('M 681 290 C 678 302 682 314 694 320 C 699 322 704 321 707 318 C 698 316 690 306 690 292 Z');
  const wing = svg1('M 694 282 C 708 284 714 298 712 314 C 711 322 708 328 704 330 C 700 318 694 300 690 290 Z');
  const primaries = svg1('M 704 330 C 708 324 711 318 712 312 L 714 318 C 712 324 709 330 704 334 Z');
  const wingLit = svg1('M 696 284 C 704 286 708 292 709 300 C 703 296 698 290 694 287 Z');
  const feet = [poly([[690, 320], [694, 320], [693, 326], [689, 326]]), poly([[697, 320], [701, 320], [700, 326], [696, 326]])];
  const head = stack('head', [
    paint('head', svg1('M 676 271 C 676 263 684 258 691 261 C 697 263 699 271 696 278 C 692 284 682 284 678 280 C 676 277 676 274 676 271 Z'), green),
    paint('crest', svg1('M 670 273 C 668 266 672 257 680 255 C 688 252 697 256 698 263 C 696 261 692 260 688 261 C 683 262 679 266 677 272 Z'), greenLit),
    paint('crest_tips', [el(672, 270, 4, 3), el(675, 262, 4.5, 3.5), el(682, 256.5, 5, 3.5), el(690, 256, 5, 3.5)], greenLit),
    paint('beak', svg1('M 675 272 L 668 275 L 675 277 Z'), '#F2C14E'),
    paint('eye', el(683, 270, 3.8, 3.8), '#141414'),
    paint('eye_glint', el(682.3, 269.3, 1.2, 1.2), '#FFFFFF'),
  ], { a: [690, 278], p: [690, 278], r: once(0, -14, 92, 104, 138, 152, { ease: 'inOut' }) });
  return shapeLayer('fg_quetzal', [
    tail,
    paint('undertail', undertail, '#F4EFE6'),
    paint('body', body, green),
    paint('breast', breast, CRIMSON),
    paint('breast_shade', svg1('M 684 304 C 686 312 692 318 700 320 C 694 320 686 316 683 308 Z'), mix(CRIMSON, '#4A0E1E', 0.35)),
    paint('wing', wing, greenDark),
    paint('wing_lit', wingLit, greenLit),
    paint('primaries', primaries, '#1E2421'),
    paint('feet', feet, '#6B5A4E'),
    head,
  ]);
}

function parrots() {
  const bird = (dx, dy, phase) => {
    const flap = cycle([[100, 100], [100, -70]], { period: 12, phase, ease: 'inOut' });
    const body = [svg1(`M ${dx - 10} ${dy} C ${dx - 6} ${dy - 3.5} ${dx + 6} ${dy - 3} ${dx + 9} ${dy} C ${dx + 6} ${dy + 3} ${dx - 6} ${dy + 3.5} ${dx - 10} ${dy} Z`), poly([[dx - 9, dy], [dx - 19, dy - 2], [dx - 19, dy + 2.5]])];
    const head = el(dx + 9, dy - 1, 7, 6);
    const wingUp = svg1(`M ${dx - 3} ${dy - 1} C ${dx - 4} ${dy - 10} ${dx + 2} ${dy - 16} ${dx + 6} ${dy - 18} C ${dx + 5} ${dy - 10} ${dx + 4} ${dy - 4} ${dx + 3} ${dy - 1} Z`);
    return stack('parrot', [
      gr('wing_far', [sh(wingUp), P.fill(mix(JADE, DEEP, 0.3))], { a: [dx, dy - 1], p: [dx, dy - 1], s: flap, r: -18 }),
      paint('body', body, mix(JADE, '#3FB06A', 0.4)),
      paint('head', head, mix(JADE, '#3FB06A', 0.4)),
      paint('lore', el(dx + 12, dy - 2, 3, 3), '#D23A2E'),
      gr('wing_near', [sh(wingUp), P.fill(mix(JADE, '#56C27E', 0.4))], { a: [dx, dy - 1], p: [dx, dy - 1], s: flap }),
      paint('speculum', el(dx + 1, dy - 1, 4, 2.4), '#D23A2E'),
    ]);
  };
  const pair = stack('pair', [bird(0, 0, 0), bird(-34, 14, 0.4)], {
    p: keys([
      { t: 0, v: [-80, 104], e: 'hold' },
      { t: 30, v: [-80, 104], e: 'linear' },
      { t: 200, v: [880, 72], e: 'hold' },
      { t: 240, v: [-80, 104] },
    ]),
  });
  return shapeLayer('fx_parrots', [stack('bob', [pair], { p: cycle([[0, -4], [0, 4]], { period: 60 }) })]);
}

/* ------------------------------------------------------------------ */

export default {
  id: '02-guatemala-tikal',
  palette: P.list,
  build() {
    const far = mistBand('far_mist', 322, 40, 130, 0.85, 11);
    const near = mistBand('near_mist', 376, 52, 210, 0.8, 17);
    return composition({
      nm: 'Waymark · Guatemala, Tikal',
      layers: [
        sky(),
        templeFour(),
        farCanopy(),
        templeTwo(),
        shapeLayer('far_mist', far),
        midCanopy(),
        templeOne(),
        shapeLayer('fx_mist_near', near),
        nearCanopy(),
        leaves(),
        branch(),
        quetzal(),
        parrots(),
      ],
    });
  },
};
