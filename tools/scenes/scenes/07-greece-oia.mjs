// 07 · Greece, Oia: sunset along the caldera.
// From a whitewashed terrace with bougainvillea spilling over the parapet we
// look along the caldera rim towards the setting sun: Oia's white cubic
// houses cascade down a steep cliff of thin rust, black and cream strata,
// the blue domes and white bell tower of the Anastasi church stand close in
// front, the far rim runs out to the windmills at the tip, Thirasia lies on
// the horizon and a boat trails a wake across the golden sea.

import { mix } from '../lib/color.mjs';
import { clipConvex, jaggedLine, poly, rng, svg1 } from '../lib/geom.mjs';
import { composition, cycle, drift, el, fl, gr, keys, osc, sh, shapeLayer, stack } from '../lib/lottie.mjs';
import { florets, glow, ink, leafShape, limb, mergeFlorets, paint, palette, stippleG, vGradientRect } from '../lib/art.mjs';

const P = palette(['#1F5FA8', '#2D6CC0', '#FAFAF5', '#A8553A', '#C2357A']);
const [AIGAIO, TROULOS, ASVESTI, PETRA, BOUG] = P.list;
const SKY_TOP = '#9CC3E3';
const SKY_LOW = '#F7C98E';
const GOLD = '#F6C77A';
const SUNLIT = mix(ASVESTI, GOLD, 0.38);
const SHADE = mix(ASVESTI, '#6E7FB0', 0.3);
const DEEP = mix(TROULOS, '#16284A', 0.5);
const HORIZON = 262;
const SUN = [690, 238];

/* ------------------------------------------------------------------ */
/* Sky, sun, sea, Thirasia                                              */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [0.5, '#E8E2D4'], [1, SKY_LOW]], { y0: 0, y1: HORIZON }),
    glow('sun_glow', SUN[0], SUN[1], 300, 130, '#FFD9A0', { alpha: 0.8, mid: 0.45 }),
    paint('sun', el(SUN[0], SUN[1], 46, 46), '#FFF1CF'),
  ]);
}

function sea() {
  const water = poly([[-10, HORIZON], [810, HORIZON], [810, 510], [-10, 510]]);
  const depth = vGradientRect('depth', -10, HORIZON, 820, 248, [[0, mix(AIGAIO, '#F2C79A', 0.45)], [0.3, AIGAIO], [1, mix(AIGAIO, '#0B2448', 0.45)]]);
  const r = rng(4);
  const ripples = [];
  for (let k = 0; k < 46; k++) {
    const y = r.range(268, 440);
    const f = (y - HORIZON) / 180;
    const x = r.range(420, 800);
    ripples.push(poly([[x, y], [x + 6 + f * 18, y]], false));
  }
  // the sun's path on the water, widening towards us
  const path = [];
  let y = HORIZON + 3;
  while (y < 420) {
    const f = (y - HORIZON) / 160;
    const n = 1 + Math.floor(r.range(0, 2.4));
    for (let j = 0; j < n; j++) {
      const w = r.range(4, 12) + f * 22;
      const x = SUN[0] + r.range(-1, 1) * (10 + f * 34);
      const t = 1.2 + f * 1.6;
      path.push(poly([[x - w, y], [x + w, y], [x + w * 0.8, y + t], [x - w * 0.8, y + t]]));
    }
    y += r.range(3.5, 9) * (1 + f * 0.6);
  }
  const thirasia = jaggedLine([[632, HORIZON], [662, 252], [700, 248], [740, 242], [780, 246], [810, 242]], { depth: 3, rough: 0.14, seed: 3 });
  const island = poly([...thirasia, [810, HORIZON + 1], [632, HORIZON + 1]]);
  return shapeLayer('far_sea', [
    paint('water', water, AIGAIO, { pal: P }),
    depth,
    paint('thirasia', island, mix(mix(PETRA, '#7A6A8A', 0.5), '#F2C79A', 0.35)),
    ink('ripples', ripples, mix(AIGAIO, '#F7E0B8', 0.55), 1, { o: 50 }),
    paint('sun_path', path, GOLD, { o: 70 }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Strata: thin, irregular volcanic layers clipped to a cliff face       */
/* ------------------------------------------------------------------ */

const STRATA = ['#9A5A44', '#3A3234', '#E3D6C0', '#B8865A', '#7E4A3A', '#8A807A', '#CDB08E', '#4A3E3E', '#B87C68'];

/**
 * Volcanic layers as lens-shaped bands that pinch out, stacked down a convex
 * cliff face: thin (2-5 px), wavy, never a full-width stripe.
 */
function strata(face, { y0, y1, x0, x1, tilt = 0.05, seed = 1, haze = 0, minT = 2, maxT = 5, gap = [2, 7] }) {
  const r = rng(seed);
  const out = new Map();
  let y = y0;
  while (y < y1) {
    let xa = x0 - r.range(0, 60);
    while (xa < x1) {
      const len = r.range(60, 220);
      const xb = xa + len;
      const T = r.range(minT, maxT);
      const ph = r.range(0, 6);
      const xs = Array.from({ length: 9 }, (_, k) => xa + (len * k) / 8);
      const amp = r.range(1.5, 4);
      const tl = tilt + r.range(-0.08, 0.08);
      const yt = (x) => y + (x - xa) * tl + (xa - x0) * tilt + Math.sin(x * 0.03 + ph) * amp + Math.sin(x * 0.09 + ph * 1.7) * 0.8;
      const th = (x) => T * Math.sin((Math.PI * (x - xa)) / len) ** 0.7 * (0.75 + 0.25 * Math.sin(x * 0.07 + ph));
      const band = clipConvex([...xs.map((x) => [x, yt(x)]), ...xs.slice().reverse().map((x) => [x, yt(x) + th(x)])], face);
      const base = STRATA[r.int(0, STRATA.length - 1)];
      const color = haze ? mix(base, '#E8C9A8', haze) : base;
      if (band.length) out.set(color, [...(out.get(color) ?? []), poly(band)]);
      xa = xb + r.range(-30, 20);
    }
    y += r.range(gap[0], gap[1]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The far rim running out to the windmills                             */
/* ------------------------------------------------------------------ */

function farRim() {
  const rim = jaggedLine([[-10, 160], [120, 178], [260, 194], [400, 212], [520, 228], [600, 240]], { depth: 2, rough: 0.12, seed: 9 });
  const face = poly([...rim, [612, HORIZON + 1], [-10, HORIZON + 1]]);
  const faceConvex = [[-10, 160], [600, 240], [612, HORIZON + 1], [-10, HORIZON + 1]];
  const bands = strata(faceConvex, { y0: 162, y1: HORIZON, x0: -10, x1: 610, tilt: 0.131, seed: 7, haze: 0.4, minT: 1.5, maxT: 4, gap: [2.5, 6] });
  // white houses along the far rim, catching the low sun
  const r = rng(12);
  const houses = [];
  const lit = [];
  for (const [c0, c1, depth] of [[8, 96, 3], [150, 196, 2], [236, 316, 4], [440, 470, 1]]) {
    for (let x = c0; x < c1; x += r.range(5, 11)) {
      const rows = r.int(1, depth);
      for (let k = 0; k < rows; k++) {
        const w = r.range(4, 10) * (1 - k * 0.12);
        const h = r.range(3, 7) * (1 - k * 0.12);
        const xx = x + r.range(-2, 2) + k * 2;
        const y = 160 + (xx + 10) * 0.131 + k * 6 + r.range(-1, 1);
        houses.push(poly([[xx, y - h + 1], [xx + w, y - h + 1], [xx + w, y + 2.5], [xx, y + 2.5]]));
        lit.push(poly([[xx + w * 0.6, y - h + 1], [xx + w, y - h + 1], [xx + w, y + 2.5], [xx + w * 0.6, y + 2.5]]));
      }
    }
  }
  // windmills at the tip with slowly turning sails
  const mills = [[548, 234, 1.35], [580, 238, 1.15]].map(([x, y, s], k) => {
    const body = poly([[x - 3.4 * s, y], [x - 2.8 * s, y - 12 * s], [x + 2.8 * s, y - 12 * s], [x + 3.4 * s, y]]);
    const cap = svg1(`M ${x - 3.2 * s} ${y - 12 * s} C ${x - 2.6 * s} ${y - 16 * s} ${x + 2.6 * s} ${y - 16 * s} ${x + 3.2 * s} ${y - 12 * s} Z`);
    const hub = [x - 3 * s, y - 13 * s];
    const sails = [0, 1, 2, 3].map((j) => {
      const a = (j * Math.PI) / 2;
      return poly([hub, [hub[0] + Math.cos(a) * 9 * s, hub[1] + Math.sin(a) * 9 * s], [hub[0] + Math.cos(a + 0.35) * 8 * s, hub[1] + Math.sin(a + 0.35) * 8 * s]]);
    });
    return { body, cap, rotor: gr(`sails_${k}`, [...sails.map((c) => sh(c)), fl(mix(ASVESTI, GOLD, 0.25))], { a: hub, p: hub, r: keys([{ t: 0, v: 0, e: 'linear' }, { t: 240, v: k ? -360 : 360 }]) }) };
  });
  return shapeLayer('far_rim', [
    paint('far_cliff', face, mix('#9A5A44', '#E8C9A8', 0.42)),
    ...[...bands.entries()].map(([color, cs], j) => paint(`far_strata_${j}`, cs, color)),
    paint('far_houses', houses, mix(ASVESTI, '#C9B8D8', 0.25)),
    paint('far_houses_lit', lit, mix(ASVESTI, GOLD, 0.45)),
    paint('mills', mills.map((m) => m.body), mix(ASVESTI, '#C9B8D8', 0.15)),
    paint('mill_caps', mills.map((m) => m.cap), mix(PETRA, '#6B4A2A', 0.3)),
    ...mills.map((m) => m.rotor),
  ]);
}

/* ------------------------------------------------------------------ */
/* The near cliff and the village cascading down it                     */
/* ------------------------------------------------------------------ */

// the near land under the town, and the steep seaward face below the church
const NEAR_RIM = [[-10, 238], [120, 246], [250, 260], [372, 292], [474, 300]];
const NEAR_LAND = [[-10, 236], [474, 298], [494, 510], [-10, 510]];

function nearCliff() {
  const land = poly([...jaggedLine(NEAR_RIM, { depth: 2, rough: 0.15, seed: 15 }), ...jaggedLine([[474, 300], [482, 380], [488, 450], [494, 510]], { depth: 2, rough: 0.06, seed: 16 }).slice(1), [-10, 510]]);
  const bands = strata(NEAR_LAND, { y0: 300, y1: 516, x0: -10, x1: 500, tilt: 0.06, seed: 21, minT: 2, maxT: 5.5, gap: [4.5, 10] });
  // erosion gullies: tapered wedges, wide at the top, tilted, of different lengths
  const gullies = [[388, 352, 9, 90, 8], [420, 350, 12, 140, -12], [452, 356, 7, 70, 6], [470, 360, 6, 120, -6]].map(([x, y, w, h, lean]) => poly([[x - w / 2, y], [x + w / 2, y], [x + lean + 1, y + h], [x + lean - 0.5, y + h * 0.97]]));
  const faceLit = poly([[460, 352], [476, 352], [494, 510], [480, 510]]);
  // pale pumice lenses and two runnels in the lower left
  const lens = (x, y, len, t, tl) => {
    const xs = Array.from({ length: 9 }, (_, k) => x + (len * k) / 8);
    return poly([...xs.map((xx) => [xx, y + (xx - x) * tl]), ...xs.slice().reverse().map((xx) => [xx, y + (xx - x) * tl + t * Math.sin((Math.PI * (xx - x)) / len) ** 0.7])]);
  };
  const pale = [lens(20, 452, 120, 4, 0.08), lens(170, 470, 150, 3.4, 0.02), lens(60, 486, 90, 3, 0.1), lens(250, 446, 100, 2.6, 0.05)];
  const grey = [lens(110, 462, 110, 3.2, -0.03), lens(300, 488, 80, 2.6, 0.06)];
  gullies.push(...[[96, 440, 8, 60, 6], [232, 448, 7, 52, -5]].map(([x, y, w, h, lean]) => poly([[x - w / 2, y], [x + w / 2, y], [x + lean + 1, y + h], [x + lean - 0.5, y + h * 0.97]])));
  // whitewashed retaining wall the church stands on
  const ledge = poly([[296, 338], [484, 338], [484, 352], [296, 352]]);
  const ledgeTop = poly([[294, 336], [485, 336], [485, 340], [294, 340]]);
  const ledgeShade = poly([[296, 348], [484, 348], [484, 352], [296, 352]]);
  return shapeLayer('mid_cliff', [
    paint('land', land, mix(PETRA, '#5A4036', 0.3)),
    ...[...bands.entries()].map(([color, cs], j) => paint(`strata_${j}`, cs, color)),
    paint('pumice_lenses', pale, '#E3D6C0', { o: 85 }),
    paint('ash_lenses', grey, '#8A807A', { o: 85 }),
    paint('gullies', gullies, '#3A2A26', { o: 32 }),
    paint('face_lit', faceLit, mix(PETRA, GOLD, 0.35), { o: 55 }),
    paint('ledge', ledge, mix(ASVESTI, '#C9B8D8', 0.22)),
    paint('ledge_top', ledgeTop, mix(ASVESTI, GOLD, 0.3)),
    paint('ledge_shade', ledgeShade, SHADE),
    stippleG('pumice', land, { color: '#F2E6D0', o: 40, count: 36, minDist: 9, seed: 4 }),
  ]);
}

function village() {
  const r = rng(13);
  const g = { front: [], ochre: [], side: [], sideOchre: [], top: [], vault: [], vaultShade: [], blue: [], stairs: [], footing: [], trim: [] };
  // rows cascade down and to the right towards the sea; the church stands clear
  for (let row = 0; row < 9; row++) {
    const y = 262 + row * 26;
    const s = 0.86 + row * 0.05;
    const x0 = -14 + r.range(-8, 4);
    const x1 = Math.min(250 + row * 16, 360);
    let x = x0;
    while (x < x1) {
      const w = r.range(26, 44) * s;
      // keep the bell tower clear
      if (y < 330 && x + w > 236 && x < 300) {
        x = 300;
        continue;
      }
      if (r.next() < 0.12) {
        x += w * 0.7;
        continue;
      }
      const h = r.range(18, 28) * s;
      const yy = y + r.range(-5, 5);
      const ochre = r.next() < 0.12;
      const sideW = w * 0.22;
      (ochre ? g.ochre : g.front).push(poly([[x, yy - h], [x + w, yy - h], [x + w, yy], [x, yy]]));
      if (ochre) g.trim.push(poly([[x - 0.5, yy - h - 0.5], [x + w + 0.5, yy - h - 0.5], [x + w + 0.5, yy - h + 2.4], [x - 0.5, yy - h + 2.4]]), poly([[x, yy - 2.2], [x + w, yy - 2.2], [x + w, yy], [x, yy]]));
      g.footing.push(poly([[x - 2, yy], [x + w + sideW, yy - sideW * 0.3], [x + w + sideW, yy + 4 - sideW * 0.3], [x - 2, yy + 5]]));
      // the right side catches the sunset
      (ochre ? g.sideOchre : g.side).push(poly([[x + w, yy - h], [x + w + sideW, yy - h - sideW * 0.3], [x + w + sideW, yy - sideW * 0.3], [x + w, yy]]));
      if (r.next() < 0.42) {
        g.vault.push(svg1(`M ${x} ${yy - h} C ${x} ${yy - h - w * 0.3} ${x + w} ${yy - h - w * 0.3} ${x + w} ${yy - h} Z`));
        g.vaultShade.push(svg1(`M ${x} ${yy - h} C ${x} ${yy - h - w * 0.19} ${x + w * 0.28} ${yy - h - w * 0.26} ${x + w * 0.42} ${yy - h - w * 0.28} L ${x + w * 0.32} ${yy - h} Z`));
      } else {
        g.top.push(poly([[x - 1, yy - h - 2.2], [x + w + sideW, yy - h - 2.2 - sideW * 0.3], [x + w + sideW, yy - h - sideW * 0.3], [x - 1, yy - h]]));
      }
      const dw = Math.max(3.4, w * 0.15);
      g.blue.push(svg1(`M ${x + w * 0.28} ${yy} L ${x + w * 0.28} ${yy - h * 0.6} C ${x + w * 0.28} ${yy - h * 0.6 - dw * 0.6} ${x + w * 0.28 + dw} ${yy - h * 0.6 - dw * 0.6} ${x + w * 0.28 + dw} ${yy - h * 0.6} L ${x + w * 0.28 + dw} ${yy} Z`));
      if (w > 32 * s) g.blue.push(poly([[x + w * 0.64, yy - h * 0.72], [x + w * 0.64 + dw * 0.85, yy - h * 0.72], [x + w * 0.64 + dw * 0.85, yy - h * 0.42], [x + w * 0.64, yy - h * 0.42]]));
      if (r.next() < 0.15) {
        // whitewashed steps running down beside the house
        for (let k = 0; k < 4; k++) g.stairs.push(poly([[x + w + 2, yy - 2 - k * 3], [x + w + 9 - k * 1.2, yy - 2 - k * 3], [x + w + 9 - k * 1.2, yy - k * 3], [x + w + 2, yy - k * 3]]));
      }
      x += w + sideW + r.range(-2, 4) * s;
    }
  }
  return shapeLayer('mid_village', [
    paint('footings', g.footing, '#3A2A26', { o: 45 }),
    paint('sides', g.side, SUNLIT),
    paint('rust_sides', g.sideOchre, mix(PETRA, GOLD, 0.45)),
    paint('houses', g.front, ASVESTI, { pal: P }),
    paint('rust_houses', g.ochre, PETRA, { pal: P }),
    paint('rust_trim', g.trim, mix(ASVESTI, GOLD, 0.15)),
    paint('house_shade', g.front.map((c) => poly([c.v[0], [c.v[0][0] + (c.v[1][0] - c.v[0][0]) * 0.18, c.v[0][1]], [c.v[3][0] + (c.v[2][0] - c.v[3][0]) * 0.18, c.v[3][1]], c.v[3]])), SHADE, { o: 55 }),
    paint('roof_tops', g.top, mix(ASVESTI, GOLD, 0.22)),
    paint('vaults', g.vault, mix(ASVESTI, GOLD, 0.16)),
    paint('vault_shade', g.vaultShade, SHADE),
    paint('steps', g.stairs, mix(ASVESTI, GOLD, 0.1)),
    paint('doors', g.blue, TROULOS, { pal: P }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Anastasi church: blue domes and the white bell tower, close up        */
/* ------------------------------------------------------------------ */

function church() {
  const dome = (cx, base, R, H) => {
    const top = base - R * 0.5;
    return {
      drum: poly([[cx - R * 0.84, top], [cx + R * 0.84, top], [cx + R * 0.84, base], [cx - R * 0.84, base]]),
      drumLit: poly([[cx + R * 0.42, top], [cx + R * 0.84, top], [cx + R * 0.84, base], [cx + R * 0.42, base]]),
      dome: svg1(`M ${cx - R} ${top} C ${cx - R} ${top - H * 0.8} ${cx - R * 0.5} ${top - H} ${cx} ${top - H} C ${cx + R * 0.5} ${top - H} ${cx + R} ${top - H * 0.8} ${cx + R} ${top} Z`),
      // warm rim light from the sunset on the right, cool shade on the left
      rim: svg1(`M ${cx + R * 0.24} ${top - H * 0.97} C ${cx + R * 0.7} ${top - H * 0.88} ${cx + R} ${top - H * 0.56} ${cx + R} ${top} L ${cx + R * 0.86} ${top} C ${cx + R * 0.84} ${top - H * 0.5} ${cx + R * 0.6} ${top - H * 0.82} ${cx + R * 0.24} ${top - H * 0.97} Z`),
      shade: svg1(`M ${cx - R} ${top} C ${cx - R} ${top - H * 0.8} ${cx - R * 0.5} ${top - H} ${cx - R * 0.1} ${top - H} C ${cx - R * 0.5} ${top - H * 0.8} ${cx - R * 0.66} ${top - H * 0.4} ${cx - R * 0.6} ${top} Z`),
      band: poly([[cx - R * 1.05, top - 1.2], [cx + R * 1.05, top - 1.2], [cx + R * 1.05, top + 1.6], [cx - R * 1.05, top + 1.6]]),
      cross: [poly([[cx - 1.1, top - H - 15], [cx + 1.1, top - H - 15], [cx + 1.1, top - H + 0.5], [cx - 1.1, top - H + 0.5]]), poly([[cx - 5, top - H - 10.5], [cx + 5, top - H - 10.5], [cx + 5, top - H - 8.3], [cx - 5, top - H - 8.3]])],
      wins: [-0.45, 0, 0.45].map((f) => svg1(`M ${cx + f * R - 2.6} ${base - 2} L ${cx + f * R - 2.6} ${base - R * 0.3} C ${cx + f * R - 2.6} ${base - R * 0.42} ${cx + f * R + 2.6} ${base - R * 0.42} ${cx + f * R + 2.6} ${base - R * 0.3} L ${cx + f * R + 2.6} ${base - 2} Z`)),
    };
  };
  const bx0 = 316;
  const bx1 = 436;
  const by0 = 262;
  const by1 = 340;
  const big = dome((bx0 + bx1) / 2, by0, 44, 50);
  const small = dome(462, 300, 20, 22);
  const domes = [big, small];
  const body = poly([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]]);
  const bodyShade = poly([[bx0, by0], [bx0 + 20, by0], [bx0 + 20, by1], [bx0, by1]]);
  const bodyLit = poly([[bx1 - 16, by0], [bx1, by0], [bx1, by1], [bx1 - 16, by1]]);
  const cornice = poly([[bx0 - 4, by0 - 2], [bx1 + 4, by0 - 2], [bx1 + 4, by0 + 3], [bx0 - 4, by0 + 3]]);
  const pilasters = [bx0 + 22, (bx0 + bx1) / 2 - 2, bx1 - 26].map((x) => poly([[x, by0 + 3], [x + 4, by0 + 3], [x + 4, by1], [x, by1]]));
  const arch = (x0, x1, yb, yt) => svg1(`M ${x0} ${yb} L ${x0} ${yt + (x1 - x0) / 2} C ${x0} ${yt} ${x1} ${yt} ${x1} ${yt + (x1 - x0) / 2} L ${x1} ${yb} Z`);
  const windows = [arch(bx0 + 32, bx0 + 42, by0 + 40, by0 + 14), arch(bx1 - 46, bx1 - 36, by0 + 40, by0 + 14)];
  const door = arch((bx0 + bx1) / 2 - 9, (bx0 + bx1) / 2 + 9, by1, by1 - 34);
  // annex under the small dome
  const annex = poly([[434, 300], [484, 300], [484, 340], [434, 340]]);
  const annexLit = poly([[472, 300], [484, 300], [484, 340], [472, 340]]);
  // the bell tower: three stepped white tiers rising above the dome
  const tx = 268;
  const tb = 330;
  const tiers = [[30, 80], [22, 56], [15, 44]];
  const tower = [];
  const towerLit = [];
  const ledges = [];
  const arches = [];
  let y = tb;
  tiers.forEach(([hw, h], k) => {
    tower.push(poly([[tx - hw, y - h], [tx + hw, y - h], [tx + hw, y], [tx - hw, y]]));
    towerLit.push(poly([[tx + hw * 0.55, y - h], [tx + hw, y - h], [tx + hw, y], [tx + hw * 0.55, y]]));
    ledges.push(poly([[tx - hw - 3, y - h - 2], [tx + hw + 3, y - h - 2], [tx + hw + 3, y - h + 2], [tx - hw - 3, y - h + 2]]));
    if (k === 0) arches.push(arch(tx - hw + 6, tx - 4, y - 8, y - h + 14), arch(tx + 4, tx + hw - 6, y - 8, y - h + 14));
    else arches.push(arch(tx - hw * 0.45, tx + hw * 0.45, y - 6, y - h + 8));
    y -= h;
  });
  const cupola = svg1(`M ${tx - 15} ${y} C ${tx - 15} ${y - 16} ${tx + 15} ${y - 16} ${tx + 15} ${y} Z`);
  const towerCross = [poly([[tx - 1.2, y - 34], [tx + 1.2, y - 34], [tx + 1.2, y - 11], [tx - 1.2, y - 11]]), poly([[tx - 6, y - 28], [tx + 6, y - 28], [tx + 6, y - 25.4], [tx - 6, y - 25.4]])];
  const bell = (bx, by, t0, s = 1) => {
    const shape = svg1(`M ${bx - 5.5 * s} ${by + 11 * s} C ${bx - 5.5 * s} ${by + 3 * s} ${bx - 3.6 * s} ${by} ${bx} ${by} C ${bx + 3.6 * s} ${by} ${bx + 5.5 * s} ${by + 3 * s} ${bx + 5.5 * s} ${by + 11 * s} Z`);
    return gr(`bell_${bx}_${by}`, [sh(shape), el(bx, by + 11.6 * s, 3 * s, 3 * s), fl('#C9963E')], {
      a: [bx, by],
      p: [bx, by],
      r: keys([
        { t: 0, v: 0, e: 'hold' },
        { t: t0, v: 0, e: 'out' },
        { t: t0 + 8, v: 22, e: 'inOut' },
        { t: t0 + 20, v: -16, e: 'inOut' },
        { t: t0 + 32, v: 9, e: 'inOut' },
        { t: t0 + 44, v: -4, e: 'inOut' },
        { t: t0 + 56, v: 0, e: 'hold' },
        { t: 240, v: 0 },
      ]),
    });
  };
  const link = poly([[292, 282], [320, 282], [320, 340], [292, 340]]);
  const linkArch = svg1('M 298 340 L 298 318 C 298 306 314 306 314 318 L 314 340 Z');
  return shapeLayer('landmark_church', [
    paint('link', link, ASVESTI, { pal: P }),
    paint('link_arch', linkArch, DEEP),
    paint('annex', annex, ASVESTI, { pal: P }),
    paint('annex_lit', annexLit, SUNLIT),
    paint('body', body, ASVESTI, { pal: P }),
    paint('body_shade', bodyShade, SHADE),
    paint('body_lit', bodyLit, SUNLIT),
    paint('pilasters', pilasters, mix(ASVESTI, GOLD, 0.12)),
    paint('cornice', cornice, mix(ASVESTI, GOLD, 0.2)),
    paint('windows', [...windows, door], TROULOS, { pal: P }),
    paint('tower', tower, ASVESTI, { pal: P }),
    paint('tower_shade', tower.map((c) => poly([c.v[0], [c.v[0][0] + 6, c.v[0][1]], [c.v[3][0] + 6, c.v[3][1]], c.v[3]])), SHADE),
    paint('tower_lit', towerLit, SUNLIT),
    paint('tower_ledges', ledges, mix(ASVESTI, GOLD, 0.2)),
    paint('tower_arches', arches, DEEP),
    bell(tx - 13, tb - 60, 100),
    bell(tx + 13, tb - 60, 110),
    bell(tx, y + 60, 160, 0.8),
    paint('cupola', cupola, TROULOS, { pal: P }),
    paint('tower_cross', towerCross, mix(ASVESTI, '#B9C2CC', 0.4)),
    paint('drums', domes.map((d) => d.drum), ASVESTI, { pal: P }),
    paint('drums_lit', domes.map((d) => d.drumLit), SUNLIT),
    paint('drum_windows', domes.flatMap((d) => d.wins), DEEP),
    paint('domes', domes.map((d) => d.dome), TROULOS, { pal: P }),
    paint('dome_shade', domes.map((d) => d.shade), DEEP, { o: 45 }),
    paint('dome_rim_light', domes.map((d) => d.rim), '#F2A65A'),
    paint('dome_bands', domes.map((d) => d.band), ASVESTI, { pal: P }),
    paint('crosses', domes.flatMap((d) => d.cross), mix(ASVESTI, '#B9C2CC', 0.4)),
  ]);
}

/* ------------------------------------------------------------------ */
/* The terrace: whitewashed parapet with bougainvillea spilling over      */
/* ------------------------------------------------------------------ */

function parapet() {
  const top = poly([[392, 440], [810, 424], [810, 438], [392, 454]]);
  const face = poly([[392, 454], [810, 438], [810, 510], [392, 510]]);
  const shadeBand = poly([[392, 454], [810, 438], [810, 446], [392, 462]]);
  const end = poly([[382, 446], [392, 440], [392, 510], [382, 510]]);
  const blueLine = poly([[392, 452], [810, 436], [810, 439], [392, 455]]);
  return shapeLayer('fg_parapet', [
    paint('parapet_face', face, mix(ASVESTI, GOLD, 0.1)),
    paint('parapet_shadow', shadeBand, SHADE, { o: 70 }),
    paint('parapet_end', end, SHADE),
    paint('parapet_top', top, mix(ASVESTI, GOLD, 0.3)),
    paint('parapet_line', blueLine, TROULOS, { pal: P }),
  ]);
}

function bougainvillea() {
  const L = [0.75, -0.6];
  // stems rise from behind the wall and arch over it
  const stems = [
    limb([[800, 440], [796, 404], [770, 400], [730, 418], [680, 432], [620, 440], [560, 446], [500, 450], [400, 453]], 7, 1.4),
    limb([[760, 438], [748, 410], [740, 420], [736, 460], [742, 500]], 4.6, 1.4),
    limb([[620, 440], [614, 470], [618, 504]], 3.4, 1.2),
    limb([[520, 449], [512, 476], [516, 500]], 3, 1.1),
    limb([[680, 432], [690, 470], [686, 500]], 3, 1.1),
    limb([[450, 452], [446, 478], [450, 498]], 2.6, 1),
  ];
  const clusters = [
    [790, 406, 20, 16, 14], [752, 416, 22, 13, 15], [706, 428, 24, 13, 16], [656, 436, 22, 11, 15], [604, 442, 24, 12, 16], [552, 446, 24, 11, 15], [500, 449, 20, 10, 12], [446, 451, 18, 9, 10], [404, 452, 12, 8, 7],
    [740, 462, 15, 18, 12], [744, 494, 12, 12, 8], [616, 474, 11, 14, 8], [688, 472, 11, 14, 8], [514, 478, 10, 12, 7], [448, 480, 9, 11, 6], [802, 450, 14, 20, 10],
  ].map(([x, y, rx, ry, n], j) => florets(x, y, rx, ry, { count: n, r0: 2.6, r1: 5, seed: 60 + j, light: L }));
  const f = mergeFlorets(clusters);
  const lr = rng(18);
  const leaves = [];
  const anchors = [[780, 412], [740, 424], [700, 434], [650, 440], [600, 446], [548, 449], [496, 452], [444, 453], [740, 470], [616, 480], [688, 478], [514, 484]];
  for (let k = 0; k < 16; k++) {
    const [ax, ay] = anchors[k % anchors.length];
    const x = ax + lr.range(-12, 12);
    const y = ay + lr.range(-4, 6);
    leaves.push(leafShape([x, y], [x + lr.range(-10, 10), y + lr.range(8, 13)], 6));
  }
  return shapeLayer('fg_bougainvillea', [stack('vine', [
    paint('stems', stems, '#5A4034'),
    paint('leaves', leaves, '#2F5A3A'),
    paint('bract_under', f.under, mix(BOUG, '#5A1030', 0.45)),
    paint('bract_shade', f.shade, mix(BOUG, '#5A1030', 0.25)),
    paint('bract', f.mid, BOUG, { pal: P }),
    paint('bract_lit', f.lit, mix(BOUG, '#FFB0A0', 0.42)),
  ], { a: [800, 440], p: [800, 440], r: osc(-0.8, 0.8, { period: 240, phase: 0.15 }) })]);
}

/* ------------------------------------------------------------------ */
/* Boat, glints, gulls                                                  */
/* ------------------------------------------------------------------ */

function boat() {
  const y = 372;
  const s = 0.8;
  const hull = svg1(`M ${-24 * s} ${y - 4 * s} L ${26 * s} ${y - 4 * s} C ${23 * s} ${y + 3 * s} ${16 * s} ${y + 6 * s} ${10 * s} ${y + 6 * s} L ${-16 * s} ${y + 6 * s} C ${-21 * s} ${y + 5 * s} ${-24 * s} ${y + 1 * s} ${-24 * s} ${y - 4 * s} Z`);
  const cabin = poly([[-10 * s, y - 4 * s], [8 * s, y - 4 * s], [6 * s, y - 12 * s], [-8 * s, y - 12 * s]]);
  const mast = poly([[0, y - 12 * s], [0, y - 34 * s]], false);
  const sail = poly([[1, y - 33 * s], [16 * s, y - 14 * s], [1, y - 14 * s]]);
  const wake = svg1(`M ${-22 * s} ${y + 2} L -96 ${y - 9} L -96 ${y - 6} L ${-26 * s} ${y + 3.5} L -96 ${y + 12} L -96 ${y + 15} Z`);
  return shapeLayer('mid_boat', [stack('boat', [
    gr('wake', [sh(wake), { ty: 'gf', o: { a: 0, k: 85 }, r: 1, g: { p: 2, k: { a: 0, k: [0, 1, 1, 1, 1, 1, 1, 1, 0, 0.9, 1, 0] } }, s: { a: 0, k: [-22 * s, y] }, e: { a: 0, k: [-96, y] }, t: 1 }], { a: [-22 * s, y], p: [-22 * s, y], s: drift([12, 100], [100, 100], { period: 240, phase: 0.3 }) }),
    paint('hull', hull, mix(ASVESTI, '#C9B8D8', 0.2)),
    paint('hull_band', poly([[-23 * s, y - 2 * s], [25 * s, y - 2 * s], [24.4 * s, y], [-23 * s, y]]), AIGAIO, { pal: P }),
    paint('cabin', cabin, mix(ASVESTI, GOLD, 0.25)),
    ink('mast', mast, '#5A4A3A', 1),
    paint('sail', sail, mix(ASVESTI, GOLD, 0.4)),
  ], { p: drift([420, 0], [880, 0], { period: 240, phase: 0.3 }) })]);
}

function glints() {
  const out = [];
  const r = rng(29);
  for (let k = 0; k < 7; k++) {
    const x = r.range(560, 760);
    const y = r.range(272, 410);
    const s = r.range(2.6, 5);
    const star = svg1(`M ${x} ${y - s} L ${x + s * 0.2} ${y - s * 0.2} L ${x + s} ${y} L ${x + s * 0.2} ${y + s * 0.2} L ${x} ${y + s} L ${x - s * 0.2} ${y + s * 0.2} L ${x - s} ${y} L ${x - s * 0.2} ${y - s * 0.2} Z`);
    out.push(gr(`glint_${k}`, [sh(star), fl('#FFF4D6')], { a: [x, y], p: [x, y], s: cycle([[0, 0], [0, 0], [110, 110], [0, 0]], { period: 80, phase: r.next(), times: [0, 0.6, 0.76, 0.92], ease: ['hold', 'out', 'in', 'hold'] }) }));
  }
  return shapeLayer('mid_glints', out);
}

function gulls() {
  const gull = (s) => svg1(`M ${-12 * s} ${-3 * s} C ${-8 * s} ${-6 * s} ${-4 * s} ${-5 * s} 0 0 C ${4 * s} ${-5 * s} ${8 * s} ${-6 * s} ${12 * s} ${-3 * s} C ${8 * s} ${-3.5 * s} ${4 * s} ${-2 * s} 0 ${2 * s} C ${-4 * s} ${-2 * s} ${-8 * s} ${-3.5 * s} ${-12 * s} ${-3 * s} Z`);
  const one = (s, dx, dy, phase) => stack('gull', [gr('wings', [sh(gull(s)), fl('#4A3E48')], { s: cycle([[100, 100], [100, 55]], { period: 30, phase }) })], { p: [dx, dy] });
  return shapeLayer('fx_gulls', [stack('flock', [one(1.2, 0, 0, 0), one(0.85, 50, -26, 0.5), one(1, 92, 14, 0.25)], {
    p: keys([{ t: 0, v: [600, 140], e: 'linear' }, { t: 120, v: [880, 108], e: 'hold' }, { t: 150, v: [-60, 170], e: 'linear' }, { t: 240, v: [600, 140] }]),
  })]);
}

/* ------------------------------------------------------------------ */

export default {
  id: '07-greece-oia',
  palette: P.list,
  build() {
    return composition({
      nm: 'Waymark · Greece, Oia',
      layers: [sky(), sea(), farRim(), glints(), boat(), nearCliff(), village(), church(), parapet(), bougainvillea(), gulls()],
    });
  },
};
