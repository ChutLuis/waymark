// 10 · Thailand, Chiang Mai: Yi Peng night.
// Khom loi lanterns rising into an indigo sky over a Lanna wihan (stacked,
// overlapping roof tiers edged in gold, hooked chofa at the gables), a golden
// chedi glowing on the right (bell on a tiered base, tall ringed spire), palms
// in silhouette, and a lotus pond mirroring the lanterns.
// Night scene: the top band is dark; the app flips the status bar to light.

import { mix } from '../lib/color.mjs';
import { blob, poly, rng, svg1 } from '../lib/geom.mjs';
import { composition, cycle, drift, el, fl, gf, gr, osc, precompAsset, precompLayer, sh, shapeLayer, stack } from '../lib/lottie.mjs';
import { glow, hatchG, ink, leafShape, limb, paint, palette, skyLines, vGradientRect } from '../lib/art.mjs';

const P = palette(['#1E2350', '#F6B44A', '#D9A63A', '#E58FB0', '#8E1B2E']);
const [KHRAM, AMBER, THONG, BUA, DAENG] = P.list;
const NIGHT = '#0F1230';
const INK = '#0A0C22';
const WATERLINE = 404;

/* ------------------------------------------------------------------ */
/* Sky and stars                                                        */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, NIGHT], [0.55, KHRAM], [1, '#3B2C5C']], { y0: 0, y1: 400 }),
    skyLines('engraving', { y0: 2, y1: 300, color: '#2E3570', o: 30, seed: 73 }),
    glow('festival_glow', 400, 380, 520, 160, '#C8784A', { alpha: 0.45, mid: 0.45 }),
  ]);
}

function stars() {
  const r = rng(3);
  const groups = [];
  for (let g = 0; g < 4; g++) {
    const dots = [];
    for (let k = 0; k < 12; k++) {
      const s = r.range(1, 2.2);
      dots.push(el(r.range(0, 800), r.range(4, 250) * (r.next() < 0.6 ? 0.7 : 1), s, s));
    }
    groups.push(gr(`stars_${g}`, [...dots, fl('#F4F1FF')], { o: cycle([100, 35], { period: [60, 80, 120, 240][g], phase: g * 0.23 }) }));
  }
  return shapeLayer('fx_stars', groups);
}

/* ------------------------------------------------------------------ */
/* Khom loi lanterns (a precomp, reused mirrored in the pond)           */
/* ------------------------------------------------------------------ */

function lanternShape(x, y, s) {
  const body = svg1(`M ${x - 6 * s} ${y - 9 * s} C ${x - 6 * s} ${y - 13 * s} ${x + 6 * s} ${y - 13 * s} ${x + 6 * s} ${y - 9 * s} L ${x + 4.6 * s} ${y + 7 * s} C ${x + 2 * s} ${y + 8.4 * s} ${x - 2 * s} ${y + 8.4 * s} ${x - 4.6 * s} ${y + 7 * s} Z`);
  const lower = svg1(`M ${x - 5.4 * s} ${y + 1 * s} L ${x + 5.4 * s} ${y + 1 * s} L ${x + 4.6 * s} ${y + 7 * s} C ${x + 2 * s} ${y + 8.4 * s} ${x - 2 * s} ${y + 8.4 * s} ${x - 4.6 * s} ${y + 7 * s} Z`);
  return { body, lower, flame: el(x, y + 7.6 * s, 2.4 * s, 2.4 * s) };
}

function lanternLayer(name, count, { y0, y1, s0, s1, fadeTop, sway, seed, detail }) {
  const r = rng(seed);
  const groups = [];
  for (let k = 0; k < count; k++) {
    const x = r.range(20, 780);
    const s = r.range(s0, s1);
    const phase = (k + 0.5) / count + r.range(-0.2, 0.2) / count;
    const L = lanternShape(0, 0, s);
    const flick = detail ? cycle([100, 84, 97, 88], { period: 60, phase: r.next(), ease: 'soft' }) : 100;
    const halo = gr('halo', [el(0, 2 * s, 38 * s, 38 * s), gf({ type: 'radial', stops: [[0, '#FFC864'], [1, '#FFB347']], alpha: [[0, 0.55], [0.45, 0.2], [1, 0]], s: [0, 2 * s], e: [19 * s, 2 * s] })], { o: flick });
    let parts;
    if (detail === 2) {
      // near: the paper glows from the flame up, white-hot at the bottom
      const hot = gf({ type: 'radial', stops: [[0, '#FFFBEA'], [0.3, '#FFE39A'], [0.7, AMBER], [1, mix(AMBER, DAENG, 0.3)]], s: [0, 6 * s], e: [0, -11 * s] });
      parts = [halo, gr('paper', [sh(L.body), hot]), paint('flame', L.flame, '#FFFFFF')];
    } else if (detail === 1) {
      parts = [paint('paper', L.body, AMBER, { pal: P }), paint('glow', el(0, 2.5 * s, 8.4 * s, 9 * s), '#FFE6A8'), paint('core', el(0, 5.2 * s, 4.4 * s, 4 * s), '#FFFBEA')];
    } else {
      parts = [paint('paper', el(0, 0, 5 * s, 6.4 * s), '#FFE4A0'), paint('core', el(0, 1.2 * s, 2.6 * s, 2.8 * s), '#FFFFFF')];
    }
    // opacity over the rise: emerge, hold, recede (fades out high up for far lanterns)
    const fade = fadeTop ? cycle([0, 100, 100, 0], { period: 240, phase, times: [0, 0.1, 0.62, 0.96], ease: 'linear' }) : cycle([0, 100, 100], { period: 240, phase, times: [0, 0.08, 0.5], ease: 'linear' });
    const swayG = stack('sway', parts, { p: cycle([[-sway, 0], [sway, 0]], { period: 120, phase: r.next() }), r: cycle([-4, 4], { period: 120, phase: r.next() }) });
    groups.push(stack(`lantern_${k}`, [swayG], { p: drift([x, y0], [x + r.range(-30, 30), y1], { period: 240, phase }), o: fade }));
  }
  return shapeLayer(name, groups);
}

function lanternPrecomp() {
  return precompAsset('lanterns', [
    lanternLayer('fx_far_lanterns', 22, { y0: 336, y1: 130, s0: 0.5, s1: 0.8, fadeTop: true, sway: 2, seed: 11 }),
    lanternLayer('fx_mid_lanterns', 14, { y0: 372, y1: 40, s0: 0.85, s1: 1.2, fadeTop: true, sway: 4, seed: 22, detail: 1 }),
    lanternLayer('fx_near_lanterns', 8, { y0: 402, y1: -50, s0: 1.5, s1: 2.1, fadeTop: false, sway: 6, seed: 33, detail: 2 }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Treeline, chedi, wihan                                               */
/* ------------------------------------------------------------------ */

function treeline() {
  const r = rng(5);
  const crowns = [];
  for (let x = -20; x < 830; x += r.range(26, 40)) crowns.push(blob(x, 352 + r.range(-10, 6), r.range(20, 30), r.range(16, 22), { n: 7, jitter: 0.18, seed: Math.round(x) + 9 }));
  const band = poly([[-10, 360], [810, 360], [810, 410], [-10, 410]]);
  return shapeLayer('mid_treeline', [paint('band', band, INK), paint('crowns', crowns, mix(INK, KHRAM, 0.35))]);
}

function chedi() {
  const cx = 648;
  const g = { gold: [], lit: [], shade: [] };
  const tier = (y, hw, h) => {
    g.gold.push(poly([[cx - hw, y - h], [cx + hw, y - h], [cx + hw, y], [cx - hw, y]]));
    g.shade.push(poly([[cx - hw, y - h], [cx - hw * 0.6, y - h], [cx - hw * 0.6, y], [cx - hw, y]]));
    g.lit.push(poly([[cx + hw * 0.55, y - h], [cx + hw * 0.75, y - h], [cx + hw * 0.75, y], [cx + hw * 0.55, y]]));
  };
  tier(402, 48, 14);
  tier(388, 39, 13);
  tier(375, 31, 12);
  tier(363, 26, 5);
  tier(358, 23, 5);
  tier(353, 20, 4);
  // bell (rakhang)
  g.gold.push(svg1(`M ${cx - 27} 349 C ${cx - 26} 330 ${cx - 18} 312 ${cx - 12} 302 L ${cx + 12} 302 C ${cx + 18} 312 ${cx + 26} 330 ${cx + 27} 349 Z`));
  g.shade.push(svg1(`M ${cx - 27} 349 C ${cx - 26} 330 ${cx - 18} 312 ${cx - 12} 302 L ${cx - 5} 302 C ${cx - 10} 314 ${cx - 15} 330 ${cx - 15} 349 Z`));
  g.lit.push(svg1(`M ${cx + 8} 304 C ${cx + 13} 312 ${cx + 18} 326 ${cx + 19} 346 L ${cx + 13} 346 C ${cx + 12} 328 ${cx + 9} 314 ${cx + 5} 304 Z`));
  // throne and ringed spire
  g.gold.push(poly([[cx - 11, 294], [cx + 11, 294], [cx + 11, 302], [cx - 11, 302]]));
  for (let k = 0; k < 13; k++) {
    const y = 290 - k * 6;
    const hw = 9 - k * 0.6;
    g.gold.push(el(cx, y, hw * 2, 4.6));
    g.lit.push(el(cx + hw * 0.4, y - 0.6, hw * 0.6, 1.6));
  }
  g.gold.push(poly([[cx - 1.6, 212], [cx + 1.6, 212], [cx + 0.6, 186], [cx - 0.6, 186]]));
  g.gold.push(svg1(`M ${cx - 7} 200 C ${cx - 4} 194 ${cx + 4} 194 ${cx + 7} 200 Z`));
  return shapeLayer('mid_chedi', [
    glow('uplight', cx, 330, 120, 150, THONG, { alpha: 0.4, mid: 0.4 }),
    paint('gold', g.gold, THONG, { pal: P }),
    hatchG('gold_hatch', g.shade, { color: '#5A3A10', angle: 70, spacing: 2.6, w: 0.7, o: 45 }),
    paint('shade', g.shade, mix(THONG, '#5A3A10', 0.4)),
    paint('lit', g.lit, mix(THONG, '#FFF0B8', 0.55)),
  ]);
}

/**
 * The wihan: a Lanna roof of overlapping tiers. A tall main gable at the
 * back, a lower portico gable in front with its gilded panel, and on each
 * side two lean-to tiers stepping down and out, each with gold bargeboards
 * ending in hang hong curls; chofa finials on the gables.
 */
function wihan() {
  const cx = 400;
  const tile = mix(DAENG, INK, 0.38);
  const gold = THONG;
  const goldLit = mix(gold, '#FFF0B8', 0.3);
  // a slanted roof band from an inner top point down to an outer eave
  const band = (sgn, ax, ay, bx, by, t) => poly([[cx + sgn * ax, ay], [cx + sgn * bx, by], [cx + sgn * bx, by + t * 0.55], [cx + sgn * (ax - 4), ay + t]]);
  const board = (sgn, ax, ay, bx, by) => poly([[cx + sgn * ax, ay - 2.6], [cx + sgn * bx, by - 2.6], [cx + sgn * bx, by + 1.2], [cx + sgn * ax, ay + 1.2]]);
  const curl = (sgn, x, y, s = 1) => svg1(`M ${cx + sgn * x} ${y - 2} C ${cx + sgn * (x + 7 * s)} ${y - 2} ${cx + sgn * (x + 9 * s)} ${y - 9 * s} ${cx + sgn * (x + 5 * s)} ${y - 13 * s} L ${cx + sgn * (x + 2.5 * s)} ${y - 11 * s} C ${cx + sgn * (x + 5 * s)} ${y - 8 * s} ${cx + sgn * (x + 3.5 * s)} ${y - 4 * s} ${cx + sgn * x} ${y + 2} Z`);
  const chofa = (x, y, s = 1) => svg1(`M ${x - 2 * s} ${y} C ${x - 2 * s} ${y - 10 * s} ${x + 4 * s} ${y - 18 * s} ${x + 10 * s} ${y - 20 * s} C ${x + 12 * s} ${y - 20 * s} ${x + 12 * s} ${y - 16 * s} ${x + 9 * s} ${y - 15 * s} C ${x + 5 * s} ${y - 14 * s} ${x + 2 * s} ${y - 8 * s} ${x + 2 * s} ${y} Z`);
  // side tiers stepping down and out: [inner x, inner y, outer x, outer y, thickness]
  const tiers = [
    [80, 306, 148, 334, 16],
    [132, 338, 184, 364, 14],
  ];
  const tierBands = [[], []];
  const tierBoards = [];
  const tierCurls = [];
  tiers.forEach(([ax, ay, bx, by, t], k) => {
    for (const sgn of [-1, 1]) {
      tierBands[k].push(band(sgn, ax, ay, bx, by, t));
      tierBoards.push(board(sgn, ax, ay, bx, by));
      tierCurls.push(curl(sgn, bx, by + 1, 1));
    }
  });
  // main gable at the back
  const mainApex = 194;
  const mainEave = 296;
  const mainHw = 86;
  const main = poly([[cx, mainApex], [cx + mainHw, mainEave], [cx - mainHw, mainEave]]);
  const mainPanel = poly([[cx, mainApex + 22], [cx + mainHw - 26, mainEave - 4], [cx - mainHw + 26, mainEave - 4]]);
  const mainBoards = [-1, 1].map((sgn) => poly([[cx, mainApex - 3], [cx + sgn * (mainHw + 2), mainEave - 3], [cx + sgn * (mainHw + 2), mainEave + 2], [cx, mainApex + 4]]));
  const mainCurls = [-1, 1].map((sgn) => curl(sgn, mainHw + 2, mainEave, 1.1));
  // portico gable in front, lower, with the gilded panel
  const pApex = 244;
  const pEave = 324;
  const pHw = 70;
  const portico = poly([[cx, pApex], [cx + pHw, pEave], [cx - pHw, pEave]]);
  const pPanel = poly([[cx, pApex + 16], [cx + pHw - 18, pEave - 4], [cx - pHw + 18, pEave - 4]]);
  const rays = [];
  for (let k = -4; k <= 4; k++) rays.push(poly([[cx, pEave - 4], [cx + k * 9, pApex + 22 + Math.abs(k) * 6]], false));
  const pBoards = [-1, 1].map((sgn) => poly([[cx, pApex - 3], [cx + sgn * (pHw + 2), pEave - 3], [cx + sgn * (pHw + 2), pEave + 2], [cx, pApex + 4]]));
  const pCurls = [-1, 1].map((sgn) => curl(sgn, pHw + 2, pEave, 1.2));
  const finials = [chofa(cx, mainApex, 1.05), chofa(cx, pApex, 1.15)];
  // walls, portico pillars, doorway, platform, naga stairs, oil lamps
  // walls under each roof: the hall under the main gable, the aisles under the tiers
  const wallsHigh = poly([[cx - 86, 294], [cx + 86, 294], [cx + 86, 392], [cx - 86, 392]]);
  const aisle1 = [-1, 1].map((sgn) => poly([[cx + sgn * 80, 318], [cx + sgn * 148, 342], [cx + sgn * 148, 392], [cx + sgn * 80, 392]]));
  const aisle2 = [-1, 1].map((sgn) => poly([[cx + sgn * 136, 352], [cx + sgn * 184, 370], [cx + sgn * 184, 392], [cx + sgn * 136, 392]]));
  const walls = [...aisle2];
  const pillars = [-56, 56].map((dx) => poly([[cx + dx - 6, 324], [cx + dx + 6, 324], [cx + dx + 6, 392], [cx + dx - 6, 392]]));
  const capitals = [-56, 56].map((dx) => poly([[cx + dx - 9, 324], [cx + dx + 9, 324], [cx + dx + 6, 332], [cx + dx - 6, 332]]));
  const door = svg1(`M ${cx - 22} 392 L ${cx - 22} 352 C ${cx - 22} 340 ${cx + 22} 340 ${cx + 22} 352 L ${cx + 22} 392 Z`);
  const doorFrame = svg1(`M ${cx - 27} 392 L ${cx - 27} 350 C ${cx - 27} 334 ${cx + 27} 334 ${cx + 27} 350 L ${cx + 27} 392 Z`);
  const platform = poly([[cx - 192, 392], [cx + 192, 392], [cx + 198, 406], [cx - 198, 406]]);
  const steps = [];
  for (let k = 0; k < 3; k++) steps.push(poly([[cx - 30 - k * 4, 392 + k * 4.6], [cx + 30 + k * 4, 392 + k * 4.6], [cx + 30 + k * 4, 394.6 + k * 4.6], [cx - 30 - k * 4, 394.6 + k * 4.6]]));
  const naga = (sgn) => svg1(`M ${cx + sgn * 34} 360 C ${cx + sgn * 44} 372 ${cx + sgn * 40} 388 ${cx + sgn * 52} 400 C ${cx + sgn * 58} 404 ${cx + sgn * 62} 396 ${cx + sgn * 60} 386 C ${cx + sgn * 66} 384 ${cx + sgn * 70} 390 ${cx + sgn * 66} 398 L ${cx + sgn * 64} 406 L ${cx + sgn * 48} 406 C ${cx + sgn * 38} 394 ${cx + sgn * 36} 380 ${cx + sgn * 30} 368 Z`);
  const lamps = [];
  for (let x = cx - 186; x <= cx + 186; x += 16) lamps.push(el(x, 390, 3, 3));
  const wallCol = mix('#F2E2C4', KHRAM, 0.42);
  return shapeLayer('landmark_wihan', [
    paint('platform', platform, mix('#D8CDB8', KHRAM, 0.6)),
    paint('walls_low', walls, mix(wallCol, INK, 0.2)),
    paint('walls_aisle', aisle1, mix(wallCol, INK, 0.1)),
    paint('walls', wallsHigh, wallCol),
    // the outer tiers sit lowest and furthest back
    paint('tier_2', tierBands[1], mix(tile, INK, 0.25)),
    paint('tier_1', tierBands[0], mix(tile, INK, 0.12)),
    paint('main_roof', main, tile),
    paint('main_panel', mainPanel, mix(DAENG, INK, 0.2)),
    paint('tier_boards', tierBoards, gold),
    paint('tier_curls', tierCurls, gold),
    paint('main_boards', mainBoards, gold),
    paint('main_curls', mainCurls, gold),
    paint('door_frame', doorFrame, gold, { pal: P }),
    paint('door', door, DAENG, { pal: P }),
    glow('door_glow', cx, 372, 60, 40, AMBER, { alpha: 0.45 }),
    paint('pillars', pillars, mix(DAENG, INK, 0.1)),
    paint('capitals', capitals, gold),
    paint('portico_roof', portico, mix(tile, DAENG, 0.25)),
    paint('portico_panel', pPanel, DAENG),
    ink('portico_rays', rays, goldLit, 1.2, { o: 85 }),
    paint('portico_boards', pBoards, goldLit),
    paint('portico_curls', pCurls, goldLit),
    paint('chofa', finials, goldLit),
    paint('steps', steps, mix('#D8CDB8', KHRAM, 0.45)),
    paint('naga', [naga(-1), naga(1)], mix(gold, '#FFF0B8', 0.2)),
    stack('oil_lamps', [glow('lamp_halo', cx, 390, 200, 14, AMBER, { alpha: 0.5 }), paint('flames', lamps, '#FFE7A8')], { o: cycle([100, 82, 96, 86], { period: 40, ease: 'soft' }) }),
  ]);
}

function palms() {
  const palm = (base, top, size, seed) => {
    const r = rng(seed);
    const trunk = limb([base, [base[0] + (top[0] - base[0]) * 0.3, base[1] + (top[1] - base[1]) * 0.45], [base[0] + (top[0] - base[0]) * 0.75, base[1] + (top[1] - base[1]) * 0.8], top], size * 0.11, size * 0.07);
    const fronds = [];
    for (let k = 0; k < 10; k++) {
      const a = (-180 + k * 20 + r.range(-6, 6)) * (Math.PI / 180);
      const len = size * r.range(0.8, 1.05);
      const tip = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len * 0.55 + Math.abs(Math.cos(a)) * len * 0.45];
      fronds.push(leafShape(top, tip, size * 0.17, { bend: Math.cos(a) * 0.16, round: 0.1 }));
    }
    return { trunk, fronds, top };
  };
  const L = palm([40, 420], [96, 150], 92, 4);
  const R = palm([786, 420], [744, 176], 84, 7);
  const small = palm([160, 410], [176, 300], 50, 9);
  const draw = (p, k, ph) => stack(`palm_${k}`, [paint('trunk', p.trunk, INK), stack('crown', [paint('fronds', p.fronds, INK)], { a: p.top, p: p.top, r: cycle([-2, 2], { period: 120, phase: ph }) })]);
  return shapeLayer('fg_palms', [draw(small, 2, 0.6), draw(L, 0, 0), draw(R, 1, 0.4)]);
}

/* ------------------------------------------------------------------ */
/* Lotus pond                                                           */
/* ------------------------------------------------------------------ */

function pond() {
  const water = poly([[-10, WATERLINE], [810, WATERLINE], [810, 510], [-10, 510]]);
  const streaks = [];
  // golden streaks mirroring the chedi and the wihan's lights
  for (let y = WATERLINE + 4; y < 490; y += 6) {
    const f = (y - WATERLINE) / 90;
    streaks.push(poly([[648 - 10 - f * 8, y], [648 + 10 + f * 8, y], [648 + 10 + f * 8, y + 2], [648 - 10 - f * 8, y + 2]]));
    streaks.push(poly([[400 - 30 - f * 10, y], [400 + 30 + f * 10, y], [400 + 30 + f * 10, y + 1.6], [400 - 30 - f * 10, y + 1.6]]));
  }
  return shapeLayer('fg_pond', [
    paint('water', water, KHRAM, { pal: P }),
    vGradientRect('depth', -10, WATERLINE, 820, 106, [[0, mix(KHRAM, '#3B2C5C', 0.5)], [1, INK]]),
    gr('gold_reflections', [...streaks.map((s) => sh(s)), fl(THONG, { o: 40 })], { p: cycle([[-2, 0], [2, 0]], { period: 60 }), o: cycle([100, 75], { period: 80, phase: 0.3 }) }),
    paint('bank', poly([[-10, 400], [810, 400], [810, WATERLINE + 3], [-10, WATERLINE + 3]]), INK),
  ]);
}

function ripples() {
  const r = rng(41);
  const lines = [];
  for (let k = 0; k < 40; k++) {
    const y = r.range(WATERLINE + 6, 496);
    const x = r.range(-10, 790);
    const len = 10 + ((y - WATERLINE) / 96) * 26;
    lines.push(poly([[x, y], [x + len, y]], false));
  }
  return shapeLayer('fx_ripples', [gr('ripples', [...lines.map((l) => sh(l)), { ty: 'st', c: { a: 0, k: [0.04, 0.05, 0.13, 1] }, o: { a: 0, k: 70 }, w: { a: 0, k: 1.4 }, lc: 2, lj: 2, ml: 4 }], { p: cycle([[-6, 0], [6, 0]], { period: 120 }) })]);
}

function lotus() {
  const r = rng(51);
  const pads = [];
  const flowers = [];
  const spots = [[90, 470, 1.2], [180, 488, 1.4], [270, 456, 0.9], [520, 462, 1], [600, 486, 1.35], [700, 452, 0.85], [760, 478, 1.15], [360, 492, 1.3], [440, 470, 0.9], [130, 438, 0.7], [640, 432, 0.7]];
  spots.forEach(([x, y, s], k) => {
    const pad = svg1(`M ${x} ${y} L ${x + 18 * s} ${y - 3 * s} C ${x + 22 * s} ${y + 4 * s} ${x + 10 * s} ${y + 9 * s} ${x - 4 * s} ${y + 8 * s} C ${x - 22 * s} ${y + 7 * s} ${x - 24 * s} ${y - 4 * s} ${x - 10 * s} ${y - 7 * s} C ${x - 2 * s} ${y - 8 * s} ${x + 12 * s} ${y - 7 * s} ${x + 16 * s} ${y - 5 * s} Z`);
    const lit = svg1(`M ${x - 8 * s} ${y - 5 * s} C ${x - 2 * s} ${y - 7 * s} ${x + 8 * s} ${y - 6.4 * s} ${x + 13 * s} ${y - 4.4 * s} L ${x + 2 * s} ${y - 2 * s} Z`);
    const items = [sh(pad)];
    pads.push({ items, lit, k, x, y, s });
    if (k % 2 === 0 || s > 1.2) {
      const petals = [];
      for (let j = 0; j < 7; j++) {
        const a = (-160 + j * 23) * (Math.PI / 180);
        petals.push(leafShape([x, y - 4 * s], [x + Math.cos(a) * 11 * s, y - 4 * s + Math.sin(a) * 13 * s], 6 * s, { round: 0.5 }));
      }
      flowers.push({ petals, x, y, s, k });
    }
  });
  const groups = pads.map((p) => stack(`pad_${p.k}`, [gr('pad', [...p.items, fl(mix('#1E5A4A', INK, 0.35))]), paint('pad_lit', p.lit, mix('#2E7A5E', AMBER, 0.2))], { a: [p.x, p.y], p: cycle([[p.x, p.y - 1.2], [p.x, p.y + 1.2]], { period: 80, phase: r.next() }) }));
  const flowerGroups = flowers.map((f) =>
    stack(`lotus_${f.k}`, [paint('petals', f.petals, BUA, { pal: P }), paint('petal_tips', f.petals.slice(2, 5), mix(BUA, '#FFE4EE', 0.4), { o: 60 }), paint('heart', el(f.x, f.y - 6 * f.s, 4 * f.s, 3 * f.s), THONG)], {
      a: [f.x, f.y],
      p: cycle([[f.x, f.y - 1.4], [f.x, f.y + 1.4]], { period: 80, phase: r.next() }),
      r: osc(-3, 3, { period: 120, phase: r.next() }),
    }),
  );
  return shapeLayer('fg_lotus', [...groups, ...flowerGroups]);
}

/* ------------------------------------------------------------------ */

export default {
  id: '10-thailand-chiang-mai',
  palette: P.list,
  build() {
    const asset = lanternPrecomp();
    return composition({
      nm: 'Waymark · Thailand, Chiang Mai',
      assets: [asset],
      layers: [
        sky(),
        stars(),
        precompLayer('fx_lanterns', 'lanterns'),
        treeline(),
        chedi(),
        wihan(),
        palms(),
        pond(),
        precompLayer('fx_lantern_reflections', 'lanterns', { a: [0, WATERLINE], p: [0, WATERLINE], s: [100, -135], o: 40 }),
        ripples(),
        lotus(),
      ],
    });
  },
};

