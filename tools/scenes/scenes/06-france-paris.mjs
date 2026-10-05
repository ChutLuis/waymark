// 06 · France, Paris: the blue hour from the quay.
// A Haussmann building (cream limestone, zinc mansard, continuous balconies on
// the 2nd and 5th floors, a red-and-white bistro awning) on the left, the
// Eiffel Tower as an unlit dusk silhouette, a Seine bridge with gilded lamps,
// a cast-iron street lamp in the right foreground, reflections on the river.
// Licensing: the tower stays unlit (its night illumination is protected).

import { mix } from '../lib/color.mjs';
import { blob, poly, rng, smooth, svg1 } from '../lib/geom.mjs';
import { composition, cycle, drift, el, fl, gr, keys, sh, shapeLayer, stack } from '../lib/lottie.mjs';
import { glow, hatchG, ink, paint, palette, skyLines, vGradientRect } from '../lib/art.mjs';

const P = palette(['#2B3A67', '#B7A4CC', '#C8323C', '#6F7891', '#F3DDB3']);
const [NUIT, LAVANDE, BISTRO, ZINC, CHAMPAGNE] = P.list;
const SKY_TOP = '#C4BDE0';
const SKY_MID = '#B7A4CC';
const SKY_LOW = '#F2C7A2';
const STONE = mix(CHAMPAGNE, LAVANDE, 0.38);
const STONE_SHADE = mix(STONE, NUIT, 0.38);
const WARM = '#FFC877';
const WINDOW_OFF = mix(NUIT, '#1A2140', 0.3);
const IRON = '#1E2230';
const GOLD = '#D9B45A';

/* ------------------------------------------------------------------ */
/* Sky, skyline, tower                                                  */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    // the darkest blue sits just above the frame so the status-bar band stays light
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [0.42, SKY_MID], [0.78, SKY_LOW], [1, '#F6D5B4']], { y0: -110, y1: 320 }),
    skyLines('engraving', { y0: 2, y1: 210, color: '#7E78B0', o: 22, seed: 45 }),
    glow('afterglow', 520, 300, 420, 120, '#FFD9B0', { alpha: 0.55, mid: 0.45 }),
  ]);
}

function skyline() {
  const r = rng(3);
  const roofs = [];
  let x = 230;
  while (x < 820) {
    const w = r.range(30, 70);
    const h = r.range(16, 30);
    const y = 300;
    roofs.push(poly([[x, y], [x, y - h], [x + 6, y - h - 6], [x + w - 6, y - h - 6], [x + w, y - h], [x + w, y]]));
    if (r.next() < 0.5) roofs.push(poly([[x + w * 0.3, y - h - 6], [x + w * 0.3, y - h - 12], [x + w * 0.3 + 4, y - h - 12], [x + w * 0.3 + 4, y - h - 6]]));
    x += w + r.range(-6, 4);
  }
  // the dome of the Invalides far right, a quiet silhouette
  const dome = svg1('M 640 262 C 640 246 650 236 660 236 C 670 236 680 246 680 262 Z');
  const lantern = poly([[658, 236], [662, 236], [661, 222], [659, 222]]);
  return shapeLayer('far_skyline', [paint('roofs', [...roofs, dome, lantern], mix(LAVANDE, NUIT, 0.32), { pal: P }), hatchG('haze_lines', roofs, { color: mix(LAVANDE, NUIT, 0.5), angle: 0, spacing: 3.4, w: 0.7, o: 30, inset: 0 })]);
}

function eiffel() {
  const cx = 452;
  const base = 300;
  const H = 186;
  // half-width of the silhouette as the height rises (metres scaled)
  const hw = [[0, 36], [10, 30], [20, 25.5], [32, 21.5], [44, 16.5], [66, 12.2], [96, 8], [130, 4.6], [160, 2.6], [172, 1.8]];
  const at = (h) => base - (h / 172) * H * 0.92;
  const right = hw.map(([h, w]) => [cx + w, at(h)]);
  const left = hw.map(([h, w]) => [cx - w, at(h)]).reverse();
  const tip = [[cx + 1.2, at(172) - 4], [cx + 0.6, at(186) ], [cx - 0.6, at(186)], [cx - 1.2, at(172) - 4]];
  const outline = smooth([...right, ...tip, ...left], { tension: 0.4 });
  // the great arch between the legs and the gap above it
  const arch = svg1(`M ${cx - 22} ${base} C ${cx - 22} ${at(18)} ${cx - 10} ${at(26)} ${cx} ${at(26)} C ${cx + 10} ${at(26)} ${cx + 22} ${at(18)} ${cx + 22} ${base} Z`);
  const gap2 = svg1(`M ${cx - 10} ${at(36)} L ${cx + 10} ${at(36)} L ${cx + 7.5} ${at(62)} L ${cx - 7.5} ${at(62)} Z`);
  const platforms = [poly([[cx - 26, at(30)], [cx + 26, at(30)], [cx + 25, at(34)], [cx - 25, at(34)]]), poly([[cx - 15, at(64)], [cx + 15, at(64)], [cx + 14, at(67)], [cx - 14, at(67)]]), poly([[cx - 4.6, at(158)], [cx + 4.6, at(158)], [cx + 4, at(161)], [cx - 4, at(161)]])];
  // lattice: X-bracing inside each leg below the second platform, across the shaft above it
  const inner = (h) => (h < 26 ? 22 * Math.sqrt(Math.max(0, 1 - (h / 26) ** 2)) : h < 34 ? 0 : h < 62 ? 10 - ((h - 34) / 28) * 2.5 : 0);
  const lattice = [];
  for (let h = 1; h < 60; h += 6) {
    if (h > 25 && h < 35) continue;
    for (const sgn of [-1, 1]) {
      lattice.push(poly([[cx + sgn * interp(hw, h), at(h)], [cx + sgn * inner(h + 6), at(h + 6)]], false));
      lattice.push(poly([[cx + sgn * inner(h), at(h)], [cx + sgn * interp(hw, h + 6), at(h + 6)]], false));
    }
  }
  for (let h = 68; h < 156; h += 8) {
    lattice.push(poly([[cx - interp(hw, h), at(h)], [cx + interp(hw, h + 8), at(h + 8)]], false));
    lattice.push(poly([[cx + interp(hw, h), at(h)], [cx - interp(hw, h + 8), at(h + 8)]], false));
  }
  return shapeLayer('landmark_eiffel_tower', [
    gr('silhouette', [sh(outline), sh(arch), sh(gap2), fl(NUIT, { rule: 2, nm: 'pal_1' })]),
    paint('platforms', platforms, mix(NUIT, '#14182E', 0.3), { pal: P }),
    ink('lattice', lattice, mix(ZINC, LAVANDE, 0.4), 0.7, { o: 55 }),
  ]);
}

function interp(table, h) {
  for (let k = 0; k < table.length - 1; k++) {
    const [h0, w0] = table[k];
    const [h1, w1] = table[k + 1];
    if (h >= h0 && h <= h1) return w0 + ((w1 - w0) * (h - h0)) / (h1 - h0);
  }
  return table[table.length - 1][1];
}

/* ------------------------------------------------------------------ */
/* River, far bank, bridge                                              */
/* ------------------------------------------------------------------ */

function river() {
  const water = poly([[-10, 300], [810, 300], [810, 460], [-10, 460]]);
  return shapeLayer('mid_river', [
    gr('water', [sh(water), { ty: 'gf', o: { a: 0, k: 100 }, r: 1, g: { p: 3, k: { a: 0, k: [0, 0.82, 0.69, 0.71, 0.4, 0.45, 0.42, 0.62, 1, 0.13, 0.17, 0.3] } }, s: { a: 0, k: [0, 300] }, e: { a: 0, k: [0, 460] }, t: 1 }]),
    paint('sky_reflection', poly([[-10, 314], [810, 314], [810, 352], [-10, 352]]), LAVANDE, { pal: P, o: 38 }),
    hatchG('water_lines', water, { color: mix(NUIT, '#0E1426', 0.3), angle: 0, spacing: 3.6, w: 0.75, o: 26, inset: 0 }),
  ]);
}

function farBank() {
  const r = rng(9);
  const crowns = [];
  for (let x = 236; x < 820; x += r.range(22, 34)) crowns.push(blob(x, 292 + r.range(-4, 3), r.range(14, 20), r.range(10, 14), { n: 7, jitter: 0.15, seed: Math.round(x) }));
  const quay = poly([[230, 304], [810, 304], [810, 314], [230, 314]]);
  const lights = [];
  for (let x = 250; x < 800; x += 46) lights.push(el(x + r.range(-6, 6), 300 + r.range(-2, 2), 2.2, 2.2));
  return shapeLayer('landmark_far_bank', [
    paint('plane_trees', crowns, mix(NUIT, '#2C3A3A', 0.25)),
    paint('quay_wall', quay, mix(STONE, NUIT, 0.45)),
    paint('lamps', lights, WARM),
    ...lights.map((l, k) => (k % 2 ? null : glow(`lamp_glow_${k}`, l.p.k[0], l.p.k[1], 9, 9, WARM, { alpha: 0.5 }))).filter(Boolean),
  ]);
}

function bridge() {
  const y0 = 318;
  const deck = poly([[226, y0], [810, y0], [810, y0 + 10], [226, y0 + 10]]);
  const parapet = poly([[226, y0 - 6], [810, y0 - 6], [810, y0], [226, y0]]);
  const arches = [];
  const spans = [[250, 430], [430, 610], [610, 790]];
  for (const [a, b] of spans) {
    const m = (a + b) / 2;
    arches.push(svg1(`M ${a + 8} ${y0 + 38} C ${a + 14} ${y0 + 16} ${m - 40} ${y0 + 12} ${m} ${y0 + 12} C ${m + 40} ${y0 + 12} ${b - 14} ${y0 + 16} ${b - 8} ${y0 + 38} Z`));
  }
  const body = poly([[226, y0 + 10], [810, y0 + 10], [810, y0 + 38], [226, y0 + 38]]);
  const piers = spans.slice(1).map(([a]) => poly([[a - 10, y0 + 10], [a + 10, y0 + 10], [a + 12, y0 + 40], [a - 12, y0 + 40]]));
  // gilded candelabra along the parapet, lit for the evening
  const posts = [];
  const lanterns = [];
  for (const x of [262, 380, 500, 620, 740]) {
    posts.push(poly([[x - 1.2, y0 - 6], [x + 1.2, y0 - 6], [x + 1, y0 - 30], [x - 1, y0 - 30]]), poly([[x - 7, y0 - 28], [x + 7, y0 - 28], [x + 7, y0 - 26.6], [x - 7, y0 - 26.6]]), poly([[x - 3, y0 - 6], [x + 3, y0 - 6], [x + 2, y0 - 10], [x - 2, y0 - 10]]));
    for (const dx of [-6, 0, 6]) lanterns.push([x + dx, y0 - 31 - (dx === 0 ? 3 : 0)]);
  }
  return shapeLayer('landmark_bridge', [
    paint('body', body, mix(STONE, NUIT, 0.3)),
    paint('arches', arches, mix(NUIT, '#1A2140', 0.4)),
    paint('piers', piers, mix(STONE, NUIT, 0.4)),
    hatchG('stone_lines', body, { color: mix(STONE, NUIT, 0.6), angle: 0, spacing: 3, w: 0.7, o: 40, inset: 0 }),
    paint('deck', deck, mix(STONE, NUIT, 0.15)),
    paint('parapet', parapet, mix(STONE, NUIT, 0.22)),
    paint('lamp_posts', posts, GOLD),
    ...lanterns.map(([x, y], k) => glow(`gilded_glow_${k}`, x, y, 8, 8, WARM, { alpha: 0.7 })),
    paint('lanterns', lanterns.map(([x, y]) => el(x, y, 3.6, 4.4)), '#FFE6A8'),
  ]);
}

/* ------------------------------------------------------------------ */
/* Reflections and the boat                                             */
/* ------------------------------------------------------------------ */

function reflections() {
  const streak = (x, y0, y1, w, color, o, k) => {
    const dashes = [];
    for (let y = y0; y < y1; y += 4.4) {
      const ww = w * (1 - ((y - y0) / (y1 - y0)) * 0.5) * (0.6 + ((k * 7 + y) % 5) / 10);
      dashes.push(poly([[x - ww / 2, y], [x + ww / 2, y], [x + ww / 2, y + 1.6], [x - ww / 2, y + 1.6]]));
    }
    return gr(`streak_${k}`, [...dashes.map((d) => sh(d)), fl(color, { o })], {
      p: cycle([[-2, 0], [2, 0]], { period: 60, phase: (k * 0.17) % 1 }),
      o: cycle([100, 70], { period: 80, phase: (k * 0.29) % 1 }),
    });
  };
  const items = [];
  [262, 380, 500, 620, 740].forEach((x, k) => items.push(streak(x, 364, 430, 9, WARM, 70, k)));
  items.push(streak(700, 360, 456, 22, WARM, 55, 9));
  [46, 104, 160, 210].forEach((x, k) => items.push(streak(x, 452, 462, 14, WARM, 50, 20 + k)));
  // the tower's dark reflection, broken by ripples
  const tower = [];
  for (let y = 362; y < 440; y += 5) {
    const w = 4 + (y - 362) * 0.36;
    tower.push(poly([[452 - w / 2, y], [452 + w / 2, y], [452 + w / 2, y + 2.6], [452 - w / 2, y + 2.6]]));
  }
  items.push(gr('tower_reflection', [...tower.map((d) => sh(d)), fl(NUIT, { o: 45 })], { p: cycle([[-1.6, 0], [1.6, 0]], { period: 80 }) }));
  return shapeLayer('fx_reflections', items);
}

function boat() {
  const x = 0;
  const y = 392;
  const hull = svg1(`M ${x - 92} ${y} L ${x + 96} ${y} C ${x + 92} ${y + 8} ${x + 84} ${y + 12} ${x + 74} ${y + 12} L ${x - 84} ${y + 12} C ${x - 90} ${y + 10} ${x - 92} ${y + 6} ${x - 92} ${y} Z`);
  const stripe = poly([[x - 91, y + 3], [x + 94, y + 3], [x + 93, y + 5], [x - 91, y + 5]]);
  const cabin = svg1(`M ${x - 76} ${y} L ${x - 72} ${y - 14} C ${x - 40} ${y - 18} ${x + 40} ${y - 18} ${x + 70} ${y - 14} L ${x + 76} ${y} Z`);
  const wins = [];
  for (let k = 0; k < 12; k++) wins.push(poly([[x - 66 + k * 11.5, y - 11], [x - 58 + k * 11.5, y - 11], [x - 58 + k * 11.5, y - 3], [x - 66 + k * 11.5, y - 3]]));
  const refl = [];
  for (let k = 0; k < 4; k++) refl.push(poly([[x - 80 + k * 4, y + 15 + k * 4], [x + 80 - k * 6, y + 15 + k * 4], [x + 80 - k * 6, y + 16.6 + k * 4], [x - 80 + k * 4, y + 16.6 + k * 4]]));
  return shapeLayer('fx_boat', [stack('bateau', [
    paint('reflection', refl, WARM, { o: 35 }),
    paint('hull', hull, mix(CHAMPAGNE, '#FFFFFF', 0.5)),
    paint('stripe', stripe, NUIT),
    paint('cabin', cabin, mix(LAVANDE, NUIT, 0.45)),
    paint('windows', wins, WARM),
  ], { p: drift([150, y], [960, y], { period: 240, phase: 0.45 }), s: [74, 74], a: [0, y] })]);
}

/* ------------------------------------------------------------------ */
/* The Haussmann building, quay, street lamp                            */
/* ------------------------------------------------------------------ */

function haussmann() {
  const x0 = -6;
  const x1 = 232;
  const floors = [
    { y0: 170, y1: 212, n: 5 },
    { y0: 212, y1: 254, n: 4 },
    { y0: 254, y1: 296, n: 3 },
    { y0: 296, y1: 338, n: 2 },
    { y0: 338, y1: 380, n: 1 },
  ];
  const bays = [22, 80, 138, 196];
  const front = poly([[x0, 170], [x1, 170], [x1, 448], [x0, 448]]);
  const side = poly([[x1, 170], [x1 + 18, 176], [x1 + 18, 448], [x1, 448]]);
  const mansard = poly([[x0, 170], [x1 + 4, 170], [x1 - 6, 128], [x0, 128]]);
  const mansardSide = poly([[x1 + 4, 170], [x1 + 20, 176], [x1 + 10, 134], [x1 - 6, 128]]);
  const ridge = poly([[x0, 122], [x1 - 8, 122], [x1 - 6, 128], [x0, 128]]);
  const chimneys = [poly([[40, 106], [62, 106], [62, 124], [40, 124]]), poly([[150, 108], [170, 108], [170, 124], [150, 124]])];
  const pots = [44, 50, 56, 154, 160, 166].map((x) => poly([[x - 2, 100], [x + 2, 100], [x + 2.4, 106], [x - 2.4, 106]]));
  const dormers = bays.map((bx) => ({ body: poly([[bx - 9, 168], [bx + 9, 168], [bx + 9, 146], [bx - 9, 146]]), roof: svg1(`M ${bx - 12} 147 C ${bx - 10} 136 ${bx + 10} 136 ${bx + 12} 147 Z`), win: poly([[bx - 5, 166], [bx + 5, 166], [bx + 5, 151], [bx - 5, 151]]) }));
  const cornices = [];
  const corniceShade = [];
  const lit = [];
  const off = [];
  const surrounds = [];
  const toggles = [];
  const r = rng(5);
  // every window is a lived-in room: casement frames, and curtains, a lamp,
  // a half-drawn blind, an open casement, folded shutters or a window box
  const d = { mull: [], curtains: [[], [], []], shade: [], lampGlow: [], lampHalo: [], blind: [], blindBar: [], openDark: [], openPane: [], shutters: [], slats: [], boxes: [], leaves: [], gerShade: [], ger: [], ivy: [], tv: [] };
  const curtainColors = [mix(CHAMPAGNE, '#FFFFFF', 0.35), mix(BISTRO, WARM, 0.25), mix(LAVANDE, '#FFFFFF', 0.2)];
  const openCols = new Set();
  const shutterCols = new Set();
  floors.forEach((f, fi) => {
    cornices.push(poly([[x0, f.y1 - 2], [x1 + 2, f.y1 - 2], [x1 + 2, f.y1], [x0, f.y1]]));
    corniceShade.push(poly([[x0, f.y1], [x1, f.y1], [x1, f.y1 + 1.6], [x0, f.y1 + 1.6]]));
    const balconyFloor = fi === 0 || fi === 3;
    bays.forEach((bx) => {
      const wx0 = bx - 10;
      const wx1 = bx + 10;
      const wy0 = f.y0 + 8;
      const wy1 = f.y1 - 6;
      const wh = wy1 - wy0;
      const w = poly([[wx0, wy0], [wx1, wy0], [wx1, wy1], [wx0, wy1]]);
      surrounds.push(poly([[bx - 13, f.y0 + 5], [bx + 13, f.y0 + 5], [bx + 13, f.y1 - 4], [bx - 13, f.y1 - 4]]));
      const roll = r.next();
      let on = true;
      if (roll < 0.2) {
        toggles.push({ w, k: toggles.length });
        off.push(w);
      } else if (roll < 0.6) lit.push(w);
      else {
        off.push(w);
        on = false;
      }
      const kind = r.next();
      if (on && kind < 0.36) {
        const c = r.int(0, 2);
        const tie = wy0 + wh * r.range(0.5, 0.66);
        d.curtains[c].push(
          svg1(`M ${wx0} ${wy0} L ${wx0 + 6} ${wy0} C ${wx0 + 5.5} ${tie - 8} ${wx0 + 2.2} ${tie - 2} ${wx0 + 2.4} ${tie} C ${wx0 + 2.6} ${tie + 4} ${wx0 + 4.2} ${wy1 - 4} ${wx0 + 4.6} ${wy1} L ${wx0} ${wy1} Z`),
          svg1(`M ${wx1} ${wy0} L ${wx1 - 6} ${wy0} C ${wx1 - 5.5} ${tie - 8} ${wx1 - 2.2} ${tie - 2} ${wx1 - 2.4} ${tie} C ${wx1 - 2.6} ${tie + 4} ${wx1 - 4.2} ${wy1 - 4} ${wx1 - 4.6} ${wy1} L ${wx1} ${wy1} Z`),
        );
      } else if (on && kind < 0.56) {
        const lx = bx + r.range(-4, 4);
        const ly = wy0 + wh * 0.5;
        d.lampGlow.push(el(lx, ly + 1, 19, 15));
        d.lampHalo.push(el(lx, ly + 1, 11, 9));
        d.shade.push(poly([[lx - 4, ly - 3], [lx + 4, ly - 3], [lx + 6, ly + 3], [lx - 6, ly + 3]]), poly([[lx - 0.6, ly + 3], [lx + 0.6, ly + 3], [lx + 0.6, wy1], [lx - 0.6, wy1]]));
      } else if (on && kind < 0.7) {
        const bh = wh * r.range(0.25, 0.55);
        d.blind.push(poly([[wx0, wy0], [wx1, wy0], [wx1, wy0 + bh], [wx0, wy0 + bh]]));
        d.blindBar.push(poly([[wx0, wy0 + bh - 1.2], [wx1, wy0 + bh - 1.2], [wx1, wy0 + bh], [wx0, wy0 + bh]]));
      } else if (on && kind < 0.8 && !openCols.has(bx)) {
        openCols.add(bx);
        d.openDark.push(poly([[bx, wy0], [wx1, wy0], [wx1, wy1], [bx, wy1]]));
        d.openPane.push(poly([[wx1, wy0], [wx1 - 4.5, wy0 + 2.5], [wx1 - 4.5, wy1 - 2.5], [wx1, wy1]]));
      } else if (on && kind < 0.88) {
        d.tv.push(poly([[wx0, wy0 + wh * 0.3], [wx1, wy0 + wh * 0.3], [wx1, wy1], [wx0, wy1]]));
      } else if (!on && kind < 0.4 && !shutterCols.has(bx)) {
        shutterCols.add(bx);
        for (const [sa, sb] of [[bx - 22, bx - 13], [bx + 13, bx + 22]]) {
          d.shutters.push(poly([[sa, f.y0 + 5], [sb, f.y0 + 5], [sb, f.y1 - 4], [sa, f.y1 - 4]]));
          for (let y = f.y0 + 8; y < f.y1 - 5; y += 3.2) d.slats.push(poly([[sa + 1, y], [sb - 1, y]], false));
        }
      } else if (!on && kind < 0.6) {
        d.blind.push(poly([[wx0, wy0], [wx1, wy0], [wx1, wy0 + wh * 0.8], [wx0, wy0 + wh * 0.8]]));
        d.blindBar.push(poly([[wx0, wy0 + wh * 0.8 - 1.2], [wx1, wy0 + wh * 0.8 - 1.2], [wx1, wy0 + wh * 0.8], [wx0, wy0 + wh * 0.8]]));
      }
      // casement frame: mullion and transom
      d.mull.push(poly([[bx, wy0], [bx, wy1]], false), poly([[wx0, wy0 + wh * 0.26], [wx1, wy0 + wh * 0.26]], false));
      // window boxes on the floors without a continuous balcony
      if (!balconyFloor && r.next() < 0.55) {
        d.boxes.push(poly([[bx - 13, wy1 + 2], [bx + 13, wy1 + 2], [bx + 12, wy1 + 7], [bx - 12, wy1 + 7]]));
        if (r.next() < 0.8) {
          for (let j = 0; j < 7; j++) {
            d.leaves.push(el(bx - 10 + j * 3.4, wy1 + 1.5, 4.6, 3.4));
            (j % 3 ? d.ger : d.gerShade).push(el(bx - 10 + j * 3.4 + r.range(-1, 1), wy1 - 0.5 + r.range(-1.2, 1.2), 4, 4));
          }
        } else {
          for (let j = 0; j < 4; j++) d.ivy.push(svg1(`M ${bx - 10 + j * 6.5} ${wy1 + 4} C ${bx - 12 + j * 6.5} ${wy1 + 7} ${bx - 9 + j * 6.5} ${wy1 + 9} ${bx - 10.5 + j * 6.5} ${wy1 + 11} L ${bx - 8 + j * 6.5} ${wy1 + 10} C ${bx - 7 + j * 6.5} ${wy1 + 8} ${bx - 9 + j * 6.5} ${wy1 + 6.5} ${bx - 7 + j * 6.5} ${wy1 + 4} Z`));
        }
      }
    });
  });
  // pediments over the etage noble windows, consoles under the balconies
  const pediments = bays.map((bx, k) => (k % 2 ? svg1(`M ${bx - 15} 301 C ${bx - 10} 292 ${bx + 10} 292 ${bx + 15} 301 Z`) : poly([[bx - 15, 301], [bx, 292], [bx + 15, 301]])));
  const consoles = [];
  for (const yb of [296 + 37, 170 + 37]) for (const bx of bays) consoles.push(poly([[bx - 15, yb], [bx - 11, yb], [bx - 12, yb + 6], [bx - 14, yb + 6]]), poly([[bx + 11, yb], [bx + 15, yb], [bx + 14, yb + 6], [bx + 12, yb + 6]]));
  // continuous wrought-iron balconies on the 2nd and 5th floors
  const iron = [];
  for (const yb of [296 + 34, 170 + 34]) {
    iron.push(poly([[x0, yb - 8], [x1 + 2, yb - 8]], false), poly([[x0, yb], [x1 + 2, yb]], false));
    for (let x = x0 + 3; x < x1; x += 4.5) iron.push(poly([[x, yb - 8], [x, yb]], false));
  }
  const slabs = [296 + 34, 170 + 34].map((yb) => poly([[x0, yb], [x1 + 4, yb], [x1 + 4, yb + 3], [x0, yb + 3]]));
  // window toggles: quick switch on, slower fade out, staggered through the loop
  const toggled = toggles.map(({ w, k }) => {
    const on = (20 + k * 36) % 240;
    const offT = (on + 120) % 240;
    const v = (t) => {
      const a = (t - on + 240) % 240;
      return a < 120 ? 100 : 0;
    };
    const list = [{ t: 0, v: v(0), e: 'hold' }];
    const events = [[on, 'on'], [offT, 'off']].sort((p, q) => p[0] - q[0]);
    for (const [t, kind] of events) {
      if (t <= 0 || t >= 236) continue;
      const before = kind === 'on' ? 0 : 100;
      const after = kind === 'on' ? 100 : 0;
      const dur = kind === 'on' ? 4 : 24;
      list.push({ t, v: before, e: kind === 'on' ? 'out' : 'inOut' });
      list.push({ t: Math.min(t + dur, 239), v: after, e: 'hold' });
    }
    list.push({ t: 240, v: v(0) });
    return gr(`window_${k}`, [sh(w), fl(WARM)], { o: keys(dedupeKeys(list)) });
  });
  // bistro: awning with scalloped hem, lit shopfront, cafe furniture
  const awning = [];
  const stripesW = [];
  const ay0 = 394;
  const ay1 = 412;
  for (let x = x0; x < x1; x += 12) {
    const stripe = poly([[x, ay0], [x + 6, ay0], [x + 7.5, ay1], [x + 1.5, ay1]]);
    stripesW.push(stripe);
    awning.push(svg1(`M ${x + 1.5} ${ay1} L ${x + 13.5} ${ay1} C ${x + 13} ${ay1 + 5} ${x + 2} ${ay1 + 5} ${x + 1.5} ${ay1} Z`));
  }
  const awningBase = poly([[x0, ay0], [x1, ay0], [x1 + 12, ay1], [x0 + 6, ay1]]);
  const shop = poly([[x0, 414], [x1, 414], [x1, 446], [x0, 446]]);
  const mullions = [40, 92, 144, 196].map((x) => poly([[x, 414], [x + 3, 414], [x + 3, 446], [x, 446]]));
  const furniture = [];
  for (const tx of [60, 140]) {
    furniture.push(el(tx, 452, 26, 4), poly([[tx - 1, 452], [tx + 1, 452], [tx + 1, 470], [tx - 1, 470]]), poly([[tx - 8, 470], [tx + 8, 470], [tx + 8, 472], [tx - 8, 472]]));
    for (const dx of [-20, 20]) furniture.push(poly([[tx + dx - 6, 448], [tx + dx - 4, 448], [tx + dx - 4, 472], [tx + dx - 6, 472]]), poly([[tx + dx - 6, 460], [tx + dx + 6, 460], [tx + dx + 6, 462], [tx + dx - 6, 462]]), poly([[tx + dx + 4, 462], [tx + dx + 6, 462], [tx + dx + 6, 472], [tx + dx + 4, 472]]));
  }
  return shapeLayer('fg_haussmann', [
    paint('facade', front, STONE),
    hatchG('ashlar', front, { color: mix(STONE, NUIT, 0.3), angle: 0, spacing: 6, w: 0.7, o: 35, inset: 0 }),
    paint('side', side, STONE_SHADE),
    hatchG('side_hatch', side, { color: NUIT, angle: 70, spacing: 2.8, w: 0.75, o: 35 }),
    paint('surrounds', surrounds, mix(STONE, '#FFFFFF', 0.25)),
    paint('shutters', d.shutters, mix(ZINC, NUIT, 0.15)),
    ink('shutter_slats', d.slats, mix(ZINC, NUIT, 0.5), 0.7, { o: 80 }),
    paint('windows_dark', off, WINDOW_OFF),
    paint('windows_lit', lit, WARM),
    ...toggled,
    paint('lamp_glow', d.lampGlow, '#FFF7DC', { o: 28 }),
    paint('lamp_halo', d.lampHalo, '#FFF7DC', { o: 45 }),
    paint('lamps', d.shade, mix(BISTRO, '#5A2A1A', 0.25)),
    paint('tv_glow', d.tv, '#9FB8E8', { o: 55 }),
    paint('open_rooms', d.openDark, mix(WARM, BISTRO, 0.45)),
    paint('open_panes', d.openPane, mix(WINDOW_OFF, '#8AA0C8', 0.35)),
    paint('blinds', d.blind, mix(CHAMPAGNE, WARM, 0.35)),
    paint('blind_bars', d.blindBar, mix(CHAMPAGNE, NUIT, 0.4)),
    ...d.curtains.map((cs, j) => (cs.length ? paint(`curtains_${j}`, cs, curtainColors[j]) : null)),
    ink('casements', d.mull, mix(STONE, '#FFFFFF', 0.15), 1.1),
    paint('window_boxes', d.boxes, '#A8563A'),
    paint('geranium_leaves', d.leaves, '#3E6A4A'),
    paint('geranium_shade', d.gerShade, mix(BISTRO, '#5A1020', 0.35)),
    paint('geraniums', d.ger, BISTRO, { pal: P }),
    paint('ivy', d.ivy, '#3E6A4A'),
    paint('cornices', cornices, CHAMPAGNE, { pal: P }),
    paint('pediments', pediments, mix(STONE, '#FFFFFF', 0.3)),
    paint('consoles', consoles, STONE_SHADE),
    paint('cornice_shade', corniceShade, STONE_SHADE),
    paint('balcony_slabs', slabs, mix(STONE, NUIT, 0.2)),
    ink('balconies', iron, IRON, 1),
    paint('mansard', mansard, ZINC, { pal: P }),
    paint('mansard_side', mansardSide, mix(ZINC, NUIT, 0.4)),
    hatchG('zinc_seams', mansard, { color: mix(ZINC, NUIT, 0.5), angle: 90, spacing: 4, w: 0.7, o: 45, inset: 0 }),
    paint('ridge', ridge, mix(ZINC, NUIT, 0.3)),
    paint('chimneys', chimneys, mix(STONE, NUIT, 0.25)),
    paint('chimney_pots', pots, '#A8563A'),
    paint('dormers', dormers.map((d) => d.body), mix(STONE, '#FFFFFF', 0.2)),
    paint('dormer_roofs', dormers.map((d) => d.roof), mix(ZINC, NUIT, 0.2)),
    paint('dormer_windows', dormers.map((d, k) => d.win).filter((_, k) => k !== 2), WINDOW_OFF),
    paint('dormer_lit', [dormers[2].win], WARM),
    paint('shopfront', shop, mix(WARM, BISTRO, 0.25)),
    paint('mullions', mullions, mix(BISTRO, NUIT, 0.5)),
    paint('awning_base', awningBase, BISTRO, { pal: P }),
    paint('awning_stripes', stripesW, mix(CHAMPAGNE, '#FFFFFF', 0.5)),
    paint('awning_hem', awning, BISTRO, { pal: P }),
    glow('shop_glow', 110, 440, 150, 40, WARM, { alpha: 0.35 }),
    paint('cafe_furniture', furniture, IRON),
  ]);
}

function dedupeKeys(list) {
  const out = [];
  for (const k of list) {
    if (out.length && k.t <= out[out.length - 1].t) continue;
    out.push(k);
  }
  return out;
}

function quay() {
  const pave = poly([[-10, 446], [810, 446], [810, 510], [-10, 510]]);
  const parapet = poly([[236, 452], [810, 446], [810, 470], [236, 474]]);
  const coping = poly([[236, 448], [810, 442], [810, 448], [236, 454]]);
  const stones = [];
  const r = rng(4);
  for (let y = 478; y < 505; y += 7) for (let x = -10 + r.range(0, 8); x < 810; x += r.range(12, 18)) stones.push(el(x, y, r.range(9, 14), 4.2));
  return shapeLayer('fg_quay', [
    paint('pavement', pave, mix(NUIT, ZINC, 0.4)),
    paint('cobbles', stones, mix(ZINC, LAVANDE, 0.25), { o: 70 }),
    paint('parapet', parapet, mix(STONE, NUIT, 0.32)),
    hatchG('parapet_lines', parapet, { color: mix(STONE, NUIT, 0.6), angle: 0, spacing: 3.2, w: 0.7, o: 40, inset: 0 }),
    paint('coping', coping, mix(STONE, '#FFFFFF', 0.1)),
  ]);
}

function streetLamp() {
  const x = 700;
  const iron = mix(IRON, '#1E3A30', 0.25);
  const column = poly([[x - 4, 470], [x + 4, 470], [x + 2.6, 226], [x - 2.6, 226]]);
  const flutes = [poly([[x - 1, 460], [x - 1, 236]], false), poly([[x + 1.4, 460], [x + 1.4, 236]], false)];
  const base = svg1(`M ${x - 16} 500 L ${x + 16} 500 L ${x + 12} 486 C ${x + 8} 482 ${x + 6} 476 ${x + 5} 468 L ${x - 5} 468 C ${x - 6} 476 ${x - 8} 482 ${x - 12} 486 Z`);
  const collar = [poly([[x - 7, 470], [x + 7, 470], [x + 6, 466], [x - 6, 466]]), poly([[x - 5, 228], [x + 5, 228], [x + 4, 222], [x - 4, 222]])];
  const arms = [svg1(`M ${x - 2} 224 C ${x - 12} 220 ${x - 18} 214 ${x - 16} 206 L ${x - 14} 206 C ${x - 15} 212 ${x - 10} 217 ${x - 1} 220 Z`), svg1(`M ${x + 2} 224 C ${x + 12} 220 ${x + 18} 214 ${x + 16} 206 L ${x + 14} 206 C ${x + 15} 212 ${x + 10} 217 ${x + 1} 220 Z`)];
  const lanternGlass = poly([[x - 11, 200], [x + 11, 200], [x + 8, 170], [x - 8, 170]]);
  const lanternFrame = [poly([[x - 12, 202], [x + 12, 202], [x + 12, 199], [x - 12, 199]]), poly([[x - 0.8, 199], [x + 0.8, 199], [x + 0.8, 171], [x - 0.8, 171]]), svg1(`M ${x - 11} 171 L ${x + 11} 171 C ${x + 8} 162 ${x + 3} 158 ${x} 156 C ${x - 3} 158 ${x - 8} 162 ${x - 11} 171 Z`), el(x, 153, 4, 4)];
  return shapeLayer('fg_street_lamp', [
    paint('base', base, iron),
    paint('column', column, iron),
    ink('flutes', flutes, mix(iron, LAVANDE, 0.35), 0.8),
    paint('collars', collar, iron),
    paint('arms', arms, iron),
    paint('glass', lanternGlass, '#FFE9B8'),
    paint('frame', lanternFrame, iron),
  ]);
}

function lampGlow() {
  return shapeLayer('fx_lamp_glow', [
    stack('breath', [glow('halo', 700, 186, 120, 120, WARM, { alpha: 0.42, mid: 0.4 }), glow('core', 700, 186, 34, 34, '#FFF1CF', { alpha: 0.8, mid: 0.6 })], {
      a: [700, 186],
      p: [700, 186],
      s: cycle([[100, 100], [108, 108]], { period: 120 }),
      o: cycle([86, 100], { period: 120, phase: 0.25 }),
    }),
  ]);
}

/* ------------------------------------------------------------------ */

export default {
  id: '06-france-paris',
  palette: P.list,
  build() {
    return composition({
      nm: 'Waymark · France, Paris',
      layers: [sky(), skyline(), river(), eiffel(), farBank(), bridge(), reflections(), boat(), haussmann(), quay(), streetLamp(), lampGlow()],
    });
  },
};

