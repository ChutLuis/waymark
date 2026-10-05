// 04 · Peru, Machu Picchu: morning above the clouds.
// The classic view from the Guardhouse, looking down on the citadel: roofless
// granite enclosures on stepped platforms (wall heads, inner faces, grass
// floors), the green main plaza, the Intihuatana hill and the Sacred Plaza
// temples, the curved Torreon, thatched houses, agricultural terraces falling
// away to the left. Huayna Picchu's sheer granite faces rise behind, cloud
// rolls through the Urubamba valley, a condor circles and a llama with
// red-and-pink ear tassels stands on the near terrace.

import { mix } from '../lib/color.mjs';
import { blob, clipConvex, cloud, inside, jaggedLine, poly, rng, smooth, svg1 } from '../lib/geom.mjs';
import { composition, cycle, drift, el, fl, gr, keys, sh, shapeLayer, st, stack } from '../lib/lottie.mjs';
import { flowerPath, hatchG, ink, leafShape, limb, paint, palette, skyLines, smoothCorners, stippleG, vGradientRect } from '../lib/art.mjs';

const P = palette(['#B83A2E', '#E2A72E', '#4F7D4C', '#2E5A8C', '#EBDCC6']);
const [GRANA, INTI, ANDES, INDIGO, ALPACA] = P.list;
const SKY_TOP = '#9FC0D8';
const SKY_LOW = '#EAF1F3';
const HAZE = '#E4ECEF';
const GRANITE = mix(ALPACA, INDIGO, 0.3);
const STONE = { base: GRANITE, lit: mix(GRANITE, '#FFF6E6', 0.35), shade: mix(GRANITE, '#26324A', 0.38), dark: mix(GRANITE, '#1C2433', 0.62) };
const PINK = '#E86A9A';

/* ------------------------------------------------------------------ */
/* Sky and distant ranges                                               */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [1, SKY_LOW]], { y0: 0, y1: 230 }),
    skyLines('engraving', { y0: 2, y1: 150, color: '#7A9CB8', o: 28, seed: 31 }),
  ]);
}

function ranges() {
  const range = (pts, seed, color, snowColor, bottom) => {
    const line = jaggedLine(pts, { depth: 3, rough: 0.28, seed });
    const body = poly([...line, [810, bottom], [-10, bottom]]);
    // snow caps: follow the ridge down a little where it is high
    const caps = [];
    let run = [];
    const limit = Math.min(...line.map((p) => p[1])) + 16;
    for (const p of line) {
      if (p[1] < limit) run.push(p);
      else if (run.length > 2) {
        caps.push(poly([...run, ...run.slice().reverse().map(([x, y], k) => [x, y + 6 + (k % 3) * 3])]));
        run = [];
      } else run = [];
    }
    if (run.length > 2) caps.push(poly([...run, ...run.slice().reverse().map(([x, y], k) => [x, y + 6 + (k % 3) * 3])]));
    return { body, caps, color, snowColor };
  };
  const a = range([[-10, 196], [80, 168], [170, 190], [250, 176], [340, 198], [440, 186], [560, 194], [640, 160], [720, 182], [810, 172]], 3, mix(INDIGO, HAZE, 0.62), mix('#FFFFFF', HAZE, 0.25), 300);
  const b = range([[-10, 214], [50, 196], [140, 212], [210, 192], [300, 220], [620, 222], [700, 188], [770, 204], [810, 196]], 5, mix(INDIGO, HAZE, 0.46), mix('#FFFFFF', HAZE, 0.15), 300);
  const shadowNear = poly([[-10, 214], [50, 196], [70, 240], [20, 300], [-10, 300]]);
  return shapeLayer('far_ranges', [
    paint('range_far', a.body, a.color),
    paint('snow_far', a.caps, a.snowColor),
    paint('range_near', b.body, b.color),
    paint('range_shadow', shadowNear, INDIGO, { pal: P, o: 22 }),
    paint('snow_near', b.caps, b.snowColor),
  ]);
}

function midMountains() {
  const putucusi = smooth([[540, 340], [600, 262], [650, 214], [700, 190], [756, 196], [810, 214], [810, 340]]);
  const left = smooth([[-10, 340], [-10, 186], [40, 176], [96, 196], [150, 232], [210, 280], [270, 330]]);
  const leftShade = smooth([[-10, 340], [-10, 250], [60, 260], [140, 290], [230, 330]]);
  const green = mix(ANDES, HAZE, 0.5);
  return shapeLayer('far_mountains', [
    paint('putucusi', putucusi, green),
    paint('west_ridge', left, mix(mix(ANDES, INDIGO, 0.15), HAZE, 0.46)),
    paint('west_ridge_shade', leftShade, mix(mix(ANDES, INDIGO, 0.4), HAZE, 0.42)),
    stippleG('far_forest', [left, putucusi], { color: mix(ANDES, INDIGO, 0.5), o: 30, count: 60, minDist: 8, seed: 6 }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Clouds rolling through the valley                                    */
/* ------------------------------------------------------------------ */

function cloudBank(name, y, h, tile, o, seed, { flat = true, fadeEnd = 0.35 } = {}) {
  const items = [];
  for (let t = -2; t < Math.ceil(1000 / tile); t++) {
    const r = rng(seed);
    for (let j = 0; j < 3; j++) {
      const x0 = t * tile + j * tile * 0.34 + r.range(-10, 10);
      const w = r.range(tile * 0.45, tile * 0.7);
      const hh = r.range(h * 0.55, h);
      const yy = y + r.range(-h * 0.25, h * 0.25);
      items.push(cloud(x0, x0 + w, yy, hh, { bumps: 4, seed: seed + j, flat }));
    }
  }
  const fade = { ty: 'gf', o: { a: 0, k: o }, r: 1, g: { p: 2, k: { a: 0, k: [0, 1, 1, 1, 1, 0.93, 0.95, 0.97, 0, 1, 0.55, 0.9, 1, 0] } }, s: { a: 0, k: [0, y - h] }, e: { a: 0, k: [0, y + h * fadeEnd] }, t: 1 };
  return gr(name, [...items.map((c) => sh(c)), fade], { p: drift([-tile, 0], [0, 0], { period: 240 }) });
}

/* ------------------------------------------------------------------ */
/* Huayna Picchu: forested sugarloaf with sheer granite faces           */
/* ------------------------------------------------------------------ */

const HGR = {
  base: mix(STONE.base, HAZE, 0.2),
  lit: mix(STONE.lit, HAZE, 0.1),
  shade: mix(STONE.shade, HAZE, 0.14),
  dark: mix(STONE.dark, HAZE, 0.12),
};

/** Closed polygon with its edges broken by perpendicular midpoint displacement. */
function ragged(points, { amp = 4, depth = 2, seed = 1 } = {}) {
  const r = rng(seed);
  let pts = points.map((p) => [p[0], p[1]]);
  for (let d = 0; d < depth; d++) {
    const nxt = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k];
      const b = pts[(k + 1) % pts.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const off = r.range(-1, 1) * amp * Math.min(1, len / 14);
      nxt.push(a, [(a[0] + b[0]) / 2 - (dy / len) * off, (a[1] + b[1]) / 2 + (dx / len) * off]);
    }
    pts = nxt;
    amp *= 0.55;
  }
  return pts;
}

/**
 * Rock planes: tilted slabs of random size clipped to a rock region, each
 * given one of three tones, so the face reads as fractured granite rather
 * than a regular pattern.
 */
function rockPlanes(region, { n, w = [5, 15], h = [10, 34], seed = 1, weights = [0.45, 0.35, 0.2] }) {
  const r = rng(seed);
  const xs = region.map((p) => p[0]);
  const ys = region.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const out = [[], [], []];
  for (let k = 0; k < n; k++) {
    const cx = r.range(x0, x1);
    const cy = r.range(y0, y1);
    const ww = r.range(w[0], w[1]);
    const hh = r.range(h[0], h[1]);
    const lean = r.range(-0.45, 0.45);
    const tip = r.range(-0.6, 0.6) * ww;
    const quad = [[cx - ww / 2 + tip, cy - hh / 2], [cx + ww / 2 + tip * 0.3, cy - hh / 2 + r.range(-3, 3)], [cx + ww / 2 + lean * hh, cy + hh / 2], [cx - ww / 2 + lean * hh, cy + hh / 2]];
    const piece = clipConvex(region, quad);
    if (!piece.length) continue;
    const roll = r.next();
    out[roll < weights[0] ? 0 : roll < weights[0] + weights[1] ? 1 : 2].push(poly(piece));
  }
  return out;
}

/** Short irregular cracks inside rock regions: two-segment polylines of varied length. */
function cracks(regions, { n, seed = 1 }) {
  const r = rng(seed);
  const out = [];
  const polys = regions.map((g) => g.v);
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const g = polys[r.int(0, polys.length - 1)];
    const xs = g.map((p) => p[0]);
    const ys = g.map((p) => p[1]);
    const p0 = [r.range(Math.min(...xs), Math.max(...xs)), r.range(Math.min(...ys), Math.max(...ys))];
    if (!inside(p0, [g])) continue;
    const len = r.range(4, 17);
    const a1 = Math.PI / 2 + r.range(-0.35, 0.35);
    const a2 = a1 + r.range(-0.5, 0.5);
    const p1 = [p0[0] + Math.cos(a1) * len * 0.55, p0[1] + Math.sin(a1) * len * 0.55];
    const p2 = [p1[0] + Math.cos(a2) * len * 0.45, p1[1] + Math.sin(a2) * len * 0.45];
    if (inside(p2, [g])) out.push(poly([p0, p1, p2], false));
  }
  return out;
}

/** Angular outcrop split into a shaded left plane and a lit upper-right plane. */
function outcrop(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const lit = clipConvex(points, [[cx - 2, cy - 60], [cx + 80, cy - 60], [cx + 80, cy + 4], [cx + 6, cy + 4]]);
  const shade = clipConvex(points, [[cx - 80, cy - 60], [cx - 5, cy - 60], [cx - 9, cy + 60], [cx - 80, cy + 60]]);
  const topY = Math.min(...ys);
  const topX = points.filter((p) => p[1] < topY + 6).reduce((m, p) => m + p[0], 0) / points.filter((p) => p[1] < topY + 6).length;
  const ledge = [[topX - 6, topY + 1.5], [topX - 1, topY - 1.2], [topX + 7, topY - 0.4], [topX + 9, topY + 2.4], [topX + 1, topY + 3.6]];
  return { body: poly(points), lit, shade, ledge };
}

function huaynaPicchu() {
  // shark-fin profile with a rock shoulder and steps on the east ridge, a
  // near-vertical upper west face and a knobbly summit
  const outline = jaggedLine(
    [[332, 348], [366, 322], [398, 296], [424, 268], [444, 240], [454, 226], [462, 220], [466, 210], [472, 196], [480, 178], [484, 168], [490, 162], [492, 152], [497, 138], [503, 122], [508, 110], [514, 100], [520, 95], [524, 90], [530, 89], [535, 92], [538, 97], [542, 104], [547, 114], [552, 124], [560, 134], [570, 144], [580, 150], [586, 152], [588, 160], [592, 176], [598, 192], [606, 206], [618, 216], [626, 222], [632, 236], [646, 258], [668, 282], [700, 304], [736, 326], [770, 346]],
    { depth: 2, rough: 0.22, seed: 12 },
  );
  const shape = poly([...outline, [770, 362], [332, 362]]);
  const summitIdx = outline.reduce((m, p, k) => (p[1] < outline[m][1] ? k : m), 0);
  const east = outline.slice(summitIdx);
  // the big sheer upper west face, running into the summit rocks
  const westFace = poly([
    ...outline.filter(([x, y]) => x <= 548 && y <= 214 && x >= 462),
    [544, 118], [538, 124], [532, 136], [524, 146], [519, 160], [510, 172], [503, 188], [492, 202], [480, 210], [468, 216],
  ]);
  // rock shoulder and step faces on the east ridge
  const shoulder = poly([...east.filter(([x, y]) => x >= 550 && x <= 604 && y <= 206), [594, 206], [585, 192], [579, 178], [569, 166], [562, 152], [553, 142], [548, 130]]);
  const stepFace = poly([...east.filter(([x, y]) => x >= 606 && x <= 638 && y <= 250), [628, 250], [620, 238], [612, 228], [604, 216]]);
  // angular outcrops of different sizes lower on the front face
  // outcrops stretched down the fall line, with a flat ledge on top
  const outcrops = [
    outcrop([[471, 226], [489, 223], [496, 231], [503, 252], [506, 276], [500, 296], [495, 284], [484, 264], [470, 246]]),
    outcrop([[552, 214], [574, 208], [592, 216], [600, 236], [594, 254], [584, 264], [566, 256], [554, 238]]),
    outcrop([[522, 194], [536, 192], [539, 206], [535, 226], [530, 240], [525, 222]]),
  ];
  const tails = [
    [[486, 292], [500, 294], [497, 318], [488, 330], [481, 312]],
    [[572, 258], [588, 262], [586, 284], [577, 294], [568, 276]],
  ].map((pts, k) => poly(ragged(pts, { amp: 3, seed: 70 + k })));
  const faces = [westFace, shoulder, stepFace];
  const planes = [
    rockPlanes(westFace.v, { n: 30, seed: 3, weights: [0.56, 0.37, 0.07] }),
    rockPlanes(shoulder.v, { n: 14, w: [4, 11], h: [8, 22], seed: 4, weights: [0.2, 0.4, 0.4] }),
    rockPlanes(stepFace.v, { n: 6, w: [4, 10], h: [6, 16], seed: 5, weights: [0.2, 0.4, 0.4] }),
  ];
  const [planeShade, planeMid, planeLit] = [0, 1, 2].map((k) => planes.flatMap((p) => p[k]));
  // sunlit patches of forest on the east slopes, ragged and broken by gullies
  const litPatches = [
    [[538, 124], [548, 138], [552, 156], [544, 160], [537, 142]],
    [[548, 172], [558, 182], [560, 200], [551, 204], [545, 188]],
    [[606, 216], [622, 236], [642, 258], [666, 282], [690, 300], [674, 308], [650, 294], [626, 274], [608, 248], [600, 228]],
    [[692, 312], [722, 326], [758, 344], [738, 352], [702, 342], [676, 326]],
    [[560, 272], [586, 282], [612, 300], [598, 312], [570, 302]],
    [[596, 196], [604, 210], [598, 222], [588, 214]],
  ].map((pts, k) => poly(ragged(pts, { amp: 5, seed: 50 + k })));
  // vegetation clinging to ledges, scattered rather than in rows
  const r = rng(29);
  const rocks = [...faces, ...outcrops.map((o) => o.body)];
  const clumps = [];
  for (let k = 0; k < 12; k++) {
    const rock = rocks[r.int(0, rocks.length - 1)].v;
    const p = rock[r.int(0, rock.length - 1)];
    const q = rock[r.int(0, rock.length - 1)];
    const t = r.range(0.15, 0.6);
    clumps.push(blob(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, r.range(2, 4.4), r.range(1.6, 3), { n: 5, jitter: 0.3, seed: 40 + k }));
  }
  const summitTerraces = [];
  const summitLit = [];
  for (let k = 0; k < 3; k++) {
    summitTerraces.push(poly([[517 - k * 2.5, 100 + k * 5.5], [541 + k * 2.5, 100 + k * 5.5]], false));
    summitLit.push(poly([[517 - k * 2.5, 98.6 + k * 5.5], [541 + k * 2.5, 98.6 + k * 5.5]], false));
  }
  const huchuy = smooth([[290, 356], [312, 322], [338, 296], [364, 284], [392, 290], [416, 310], [438, 356]]);
  const huchuyLit = smooth([[366, 285], [392, 290], [416, 310], [438, 356], [394, 356], [380, 314]]);
  const shade = mix(mix(ANDES, INDIGO, 0.3), HAZE, 0.12);
  const forestDark = mix(ANDES, '#1E3324', 0.5);
  return shapeLayer('mid_huayna_picchu', [
    paint('peak', shape, shade),
    paint('forest_lit', litPatches, mix(shade, mix(mix(ANDES, INTI, 0.3), HAZE, 0.12), 0.62)),
    stippleG('forest', shape, { color: forestDark, o: 42, count: 80, minDist: 6, seed: 8 }),
    paint('rock_shadow', [...faces, ...outcrops.map((o) => o.body)].map((c) => poly(c.v.map(([x, y]) => [x + 1.3, y + 2]))), HGR.dark, { o: 55 }),
    paint('rock', faces, HGR.base),
    paint('rock_plane_shade', planeShade, HGR.shade),
    paint('rock_plane_mid', planeMid, mix(HGR.base, HGR.lit, 0.4)),
    paint('rock_plane_lit', planeLit, HGR.lit),
    paint('outcrops', outcrops.map((o) => o.body), HGR.base),
    paint('outcrops_shade', outcrops.filter((o) => o.shade.length).map((o) => poly(o.shade)), HGR.shade),
    paint('outcrops_lit', outcrops.filter((o) => o.lit.length).map((o) => poly(o.lit)), HGR.lit),
    ink('rock_cracks', cracks([...faces, ...outcrops.map((o) => o.body)], { n: 22, seed: 10 }), HGR.dark, 0.75, { o: 70 }),
    paint('ledge_tops', outcrops.map((o) => poly(o.ledge)), forestDark, { o: 92 }),
    ink('summit_terraces', summitTerraces, HGR.dark, 1.2, { o: 70 }),
    ink('summit_terraces_lit', summitLit, STONE.lit, 1, { o: 90 }),
    paint('forest_tails', tails, forestDark, { o: 85 }),
    paint('ledge_plants', clumps, forestDark, { o: 92 }),
    paint('huchuy_picchu', huchuy, ANDES, { pal: P }),
    paint('huchuy_lit', huchuyLit, mix(mix(ANDES, INTI, 0.3), HAZE, 0.08)),
    stippleG('huchuy_trees', huchuy, { color: forestDark, o: 40, count: 22, minDist: 6, seed: 9 }),
  ]);
}

/* ------------------------------------------------------------------ */
/* The citadel                                                          */
/* ------------------------------------------------------------------ */

// Plan coordinates: u across, v away from the viewer, z up. One-point
// perspective towards a vanishing point above the frame: the view looks down
// on the saddle steeply enough to show wall heads, the inner faces of the
// roofless enclosures and their grass floors, and side walls lean towards
// the vanishing point.
const CX = 440;
const HZ = -150;
const FRONT = 392;
const DEPTH = 880;
const SZ = 0.85;
const CAM = [CX, -DEPTH];
// horizontal direction towards the morning sun (east, a little south)
const SUN = [0.924, -0.382];
// horizontal shadow length per unit of height
const SHADOW = 1.3;
const sc = (v) => DEPTH / (DEPTH + v);
const prj = (u, v, z = 0) => {
  const s = sc(v);
  return [CX + (u - CX) * s, HZ + (FRONT - HZ) * s - z * SZ * s];
};
const at = (pts, z) => pts.map(([u, v]) => prj(u, v, z));
const P3 = (list) => list.map(([u, v, z]) => prj(u, v, z));
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const edgeN = (A, B) => {
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dy / l, -dx / l];
};
const facing = (n, A, B) => n[0] * (CAM[0] - (A[0] + B[0]) / 2) + n[1] * (CAM[1] - (A[1] + B[1]) / 2);
const tone = (n) => {
  const k = n[0] * SUN[0] + n[1] * SUN[1];
  return k > 0.45 ? 'Lit' : k > -0.15 ? 'Mid' : 'Shade';
};
const edges = (pts) => pts.map((A, k) => [A, pts[(k + 1) % pts.length]]);
const shift = (pts, d) => pts.map((p) => add(p, d));

/** Rotated rectangle in plan, counter-clockwise from the front-left corner, with its local frame. */
function rect(cu, cv, w, d, deg = 0) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const L = (x, y) => [cu + x * c - y * s, cv + x * s + y * c];
  return { L, pts: [L(-w / 2, -d / 2), L(w / 2, -d / 2), L(w / 2, d / 2), L(-w / 2, d / 2)], ex: [c, s], ey: [-s, c] };
}

function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  const upper = [];
  for (const x of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], x) <= 0) lower.pop();
    lower.push(x);
  }
  for (const x of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], x) <= 0) upper.pop();
    upper.push(x);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const STONE2 = mix(STONE.lit, '#F3E3C6', 0.45);
const CIT = {
  exLit: mix(STONE.lit, STONE.base, 0.4),
  exMid: STONE.base,
  exShade: mix(STONE.shade, STONE.base, 0.15),
  inLit: mix(STONE.lit, STONE.base, 0.55),
  inMid: mix(STONE.base, STONE.shade, 0.4),
  inShade: mix(STONE.shade, STONE.dark, 0.25),
  rimA: STONE.lit,
  rimB: STONE2,
  floor: mix(ANDES, '#C9C08A', 0.42),
  floorShade: mix(ANDES, '#2C4A30', 0.3),
  cast: mix(ANDES, '#22371F', 0.42),
  plaza: mix(ANDES, '#D8E08A', 0.46),
  terrace: mix(ANDES, '#D8E08A', 0.28),
  quarry: mix(STONE.shade, STONE.base, 0.55),
  rubble: STONE.dark,
  shadow: '#1B2620',
  path: mix(ALPACA, '#D9C9A8', 0.4),
  course: STONE.dark,
  dark: STONE.dark,
  sky: mix(HAZE, '#FFFFFF', 0.4),
  thatchLit: mix(INTI, '#9C9488', 0.55),
  thatchShade: mix(INTI, '#5E4A2E', 0.62),
  reed: mix(INTI, '#5A3E16', 0.62),
  rockShade: mix(STONE.shade, STONE.base, 0.3),
  rockLit: STONE.lit,
  outcropShade: mix(STONE.shade, STONE.dark, 0.35),
  outcropLit: mix(STONE.base, STONE.shade, 0.25),
  trunk: '#5A4632',
  crown: mix(ANDES, '#1E3324', 0.38),
  crownLit: ANDES,
  wool: ALPACA,
};

// buckets of one depth tier in painter's order: [bucket, colour, stroke]
const PIECES = [
  ['platShade', 'exShade'],
  ['platMid', 'exMid'],
  ['platLit', 'exLit'],
  ['platFoot', 'shadow', null, { o: 35 }],
  ['course', 'course', { w: 0.7, o: 42, pattern: [16, 2.2, 7, 2.5, 24, 2, 11, 2.6] }],
  ['coping', 'rimA', { w: 1.1, o: 85 }],
  ['platTop', 'terrace'],
  ['plaza', 'plaza'],
  ['quarry', 'quarry'],
  ['path', 'path', { w: 1.2, o: 55 }],
  ['rubble', 'rubble', null, { o: 45 }],
  ['stairRiser', 'exMid'],
  ['stairTread', 'rimA'],
  ['castOver', 'shadow', null, { o: 48 }],
  ['rockShade', 'rockShade'],
  ['rockLit', 'rockLit'],
  ['outcropShade', 'outcropShade'],
  ['outcropLit', 'outcropLit'],
  ['tFloorShade', 'floorShade'],
  ['tFloor', 'floor'],
  ['gableFarRim', 'rimA'],
  ['gableFarLit', 'inLit'],
  ['gableFarMid', 'inMid'],
  ['gableFarShade', 'inShade'],
  ['exShade', 'exShade'],
  ['exMid', 'exMid'],
  ['exLit', 'exLit'],
  ['backInner', 'inMid'],
  ['door', 'dark'],
  ['window', 'sky'],
  ['rimA', 'rimA'],
  ['rimB', 'rimB'],
  ['open', 'inMid'],
  ['inShade', 'inShade'],
  ['inMid', 'inMid'],
  ['inLit', 'inLit'],
  ['niche', 'dark'],
  ['floorShade', 'floorShade'],
  ['floor', 'floor'],
  ['gableNearRim', 'rimA'],
  ['gableNearShade', 'exShade'],
  ['gableNearMid', 'exMid'],
  ['gableNearLit', 'exLit'],
  ['gableNiche', 'dark'],
  ['roofBackShade', 'thatchShade'],
  ['roofBackLit', 'thatchLit'],
  ['roofFrontShade', 'thatchShade'],
  ['roofFrontLit', 'thatchLit'],
  ['reeds', 'reed', { w: 0.55, o: 55 }],
  ['trunk', 'trunk'],
  ['crown', 'crown'],
  ['crownLit', 'crownLit'],
  ['woolShadow', 'shadow', null, { o: 34 }],
  ['woolLegs', 'trunk'],
  ['wool', 'wool'],
];

/** Vertical face of a plan edge between heights z0 and z1. */
const face = (A, B, z0, z1) => P3([[A[0], A[1], z0], [B[0], B[1], z0], [B[0], B[1], z1], [A[0], A[1], z1]]);

/** Convex prism: visible side faces toned by the sun, top in a rim colour. */
function prism(b, pts, z, zt, rim = 'rimA', { cast = true, ground } = {}) {
  if (cast) {
    let shadow = hull([...pts, ...shift(pts, [-SUN[0] * (zt - z) * SHADOW, -SUN[1] * (zt - z) * SHADOW])]);
    if (ground) shadow = clipConvex(shadow, ground);
    if (shadow.length) b.castOver.push(poly(at(shadow, z)));
  }
  for (const [A, B] of edges(pts)) {
    const n = edgeN(A, B);
    if (facing(n, A, B) > 0) b[`ex${tone(n)}`].push(poly(face(A, B, z, zt)));
  }
  b[rim].push(poly(at(pts, zt)));
}

/** Terrace platform (convex plan polygon): retaining walls with stone courses, top surface. */
function platform(b, { pts, r, z, base = z - 10, top = 'platTop', rubble = 0, seed = 1, course = false }) {
  const plan = pts ?? rect(...r).pts;
  const rr = rng(seed + Math.round(z * 7));
  for (const [A, B] of edges(plan)) {
    const n = edgeN(A, B);
    if (facing(n, A, B) <= 0) continue;
    const h = z - base;
    b[`plat${tone(n)}`].push(poly(face(A, B, base, z)));
    b.platFoot.push(poly(face(A, B, base, base + Math.min(2.4, h * 0.2))));
    if (course && h > 9) {
      const zz = base + h * rr.range(0.42, 0.58);
      b.course.push(poly(P3([[A[0], A[1], zz], [B[0], B[1], zz]]), false));
    }
    b.coping.push(poly(P3([[A[0], A[1], z], [B[0], B[1], z]]), false));
  }
  b[top].push(poly(at(plan, z)));
  // loose rubble scattered over the top
  const us = plan.map((p) => p[0]);
  const vs = plan.map((p) => p[1]);
  for (let k = 0, tries = 0; k < rubble && tries < rubble * 8; tries++) {
    const q = [rr.range(Math.min(...us), Math.max(...us)), rr.range(Math.min(...vs), Math.max(...vs))];
    if (!inside(q, [plan])) continue;
    const [x, y] = prj(q[0], q[1], z);
    const rad = rr.range(0.6, 1.5) * sc(q[1]);
    b.rubble.push(el(x, y, rad * 2.2, rad * 1.3));
    k++;
  }
}

/** One roofless room: opening, visible inner faces, niches, floor with the walls' shadow. */
function room(b, pts, z, zt, H, niches = true) {
  niches = niches && pts.every((p) => p[1] < 120);
  const opening = at(pts, zt);
  b.open.push(poly(opening));
  let best = null;
  for (const [A, B] of edges(pts)) {
    const nIn = edgeN(B, A);
    const f = facing(nIn, A, B);
    if (f <= 0) continue;
    const q = clipConvex(face(A, B, z, zt), opening);
    if (q.length) b[`in${tone(nIn)}`].push(poly(q));
    if (!best || f / Math.hypot(...add(CAM, add(A, B, 1), -0.5)) > best.f) best = { A, B, f: f / Math.hypot(...add(CAM, add(A, B, 1), -0.5)) };
  }
  if (niches && best) {
    const { A, B } = best;
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = Math.max(1, Math.min(3, Math.floor(len / 11)));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const P = (g, zz) => {
        const p = add(A, add(B, A, -1), g);
        return [p[0], p[1], zz];
      };
      const hw = 1.8 / len;
      const q = clipConvex(P3([P(f - hw, z + H * 0.34), P(f + hw, z + H * 0.34), P(f + hw * 0.65, z + H * 0.74), P(f - hw * 0.65, z + H * 0.74)]), opening);
      if (q.length) b.niche.push(poly(q));
    }
  }
  const floor = clipConvex(at(pts, z), opening);
  if (!floor.length) return;
  b.floorShade.push(poly(floor));
  const litPlan = clipConvex(pts, shift(pts, [-SUN[0] * H * SHADOW, -SUN[1] * H * SHADOW]));
  if (litPlan.length) {
    const lit = clipConvex(at(litPlan, z), opening);
    if (lit.length) b.floor.push(poly(lit));
  }
}

/** Gable on the end wall A-B (outward normal n): rim band, then the face we see. */
function gable(b, A, B, zt, t, near) {
  const n = edgeN(A, B);
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const G = len * 0.45;
  const dir = [(B[0] - A[0]) / len, (B[1] - A[1]) / len];
  const M = add(A, add(B, A, -1), 0.5);
  const outer = P3([[A[0], A[1], zt], [B[0], B[1], zt], [M[0], M[1], zt + G]]);
  const Ai = add(add(A, n, -t), dir, t);
  const Bi = add(add(B, n, -t), dir, -t);
  const Mi = add(M, n, -t);
  const inner = P3([[Ai[0], Ai[1], zt], [Bi[0], Bi[1], zt], [Mi[0], Mi[1], zt + G - t * 0.8]]);
  if (near) {
    b.gableNearRim.push(poly(inner));
    b[`gableNear${tone(n)}`].push(poly(outer));
    b.gableNiche.push(poly(P3([[...add(M, dir, -1.9), zt + G * 0.2], [...add(M, dir, 1.9), zt + G * 0.2], [...add(M, dir, 1.25), zt + G * 0.5], [...add(M, dir, -1.25), zt + G * 0.5]])));
  } else {
    b.gableFarRim.push(poly(outer));
    b[`gableFar${tone([-n[0], -n[1]])}`].push(poly(inner));
  }
}

/**
 * Roofless house or compound (rotated rectangle): walls, wall heads, rooms
 * open to the sky, optional gables on the 'x' or 'y' ends, optional
 * reconstructed thatch, trapezoidal doorways on the face towards us.
 */
function house(b, { c, w, d, deg = 0, z, H = 9, t = 3, rooms = 1, gables = null, thatch = false, doors = [], rim = 'rimA', ground }) {
  const R = rect(c[0], c[1], w, d, deg);
  const O = R.pts;
  const zt = z + H;
  const ends = gables === 'x' ? [[O[1], O[2]], [O[3], O[0]]] : gables === 'y' ? [[O[0], O[1]], [O[2], O[3]]] : [];
  const endInfo = ends.map(([A, B]) => ({ A, B, near: facing(edgeN(A, B), A, B) > 0 }));
  for (const e of endInfo) if (!e.near && !thatch) gable(b, e.A, e.B, zt, t, false);
  prism(b, O, z, zt, rim, { ground });
  // doorways on the face most turned towards us
  let front = null;
  for (const [A, B] of edges(O)) {
    const n = edgeN(A, B);
    const f = facing(n, A, B) / Math.hypot(...add(CAM, add(A, B, 1), -0.5));
    if (!front || f > front.f) front = { A, B, f };
  }
  const flen = Math.hypot(front.B[0] - front.A[0], front.B[1] - front.A[1]);
  for (const g of doors ?? []) {
    const P = (k, zz) => {
      const p = add(front.A, add(front.B, front.A, -1), g + k / flen);
      return [p[0], p[1], zz];
    };
    b.door.push(poly(P3([P(-2.8, z), P(2.8, z), P(1.8, z + H * 0.78), P(-1.8, z + H * 0.78)])));
  }
  if (thatch) {
    for (const e of endInfo) if (e.near) gable(b, e.A, e.B, zt, t, true);
    const e = 2.4;
    const along = gables === 'x' ? R.ex : R.ey;
    const across = gables === 'x' ? R.ey : R.ex;
    const half = gables === 'x' ? w / 2 + e : d / 2 + e;
    const span = gables === 'x' ? d / 2 + e : w / 2 + e;
    const G = (gables === 'x' ? d : w) * 0.45 + 1.4;
    const C = [c[0], c[1]];
    const ridge0 = add(C, along, -half);
    const ridge1 = add(C, along, half);
    for (const side of [-1, 1]) {
      const eave0 = add(ridge0, across, side * span);
      const eave1 = add(ridge1, across, side * span);
      const dirOut = [across[0] * side, across[1] * side];
      const isFront = dirOut[0] * (CAM[0] - C[0]) + dirOut[1] * (CAM[1] - C[1]) > 0;
      const lit = dirOut[0] * SUN[0] + dirOut[1] * SUN[1] > -0.1;
      const plane = P3([[...eave0, zt - 1.5], [...eave1, zt - 1.5], [...ridge1, zt + G], [...ridge0, zt + G]]);
      b[`roof${isFront ? 'Front' : 'Back'}${lit ? 'Lit' : 'Shade'}`].push(poly(plane));
      for (let k = 1; k < 7; k++) {
        const f = k / 7;
        const top = add(ridge0, add(ridge1, ridge0, -1), f);
        const bot = add(eave0, add(eave1, eave0, -1), f);
        b.reeds.push(poly(P3([[...top, zt + G], [...bot, zt - 1.5]]), false));
      }
    }
    return;
  }
  const fr = Array.isArray(rooms) ? rooms : Array(rooms).fill(1 / rooms);
  const inner = w - 2 * t - (fr.length - 1) * t;
  let a = -w / 2 + t;
  for (const f of fr) {
    const bw = inner * f;
    room(b, [R.L(a, -d / 2 + t), R.L(a + bw, -d / 2 + t), R.L(a + bw, d / 2 - t), R.L(a, d / 2 - t)], z, zt, H);
    a += bw + t;
  }
  for (const e of endInfo) if (e.near) gable(b, e.A, e.B, zt, t, true);
}

/** Three-walled temple open towards us; windows in the back wall show the sky. */
function temple(b, { c, w, d, deg = 0, z, H = 10, t = 4.5, windows = 0, ground }) {
  const R = rect(c[0], c[1], w, d, deg);
  const zt = z + H;
  const floorPlan = [R.L(-w / 2 + t, -d / 2), R.L(w / 2 - t, -d / 2), R.L(w / 2 - t, d / 2 - t), R.L(-w / 2 + t, d / 2 - t)];
  b.tFloor.push(poly(at(floorPlan, z)));
  const litPlan = clipConvex(floorPlan, shift(floorPlan, [-SUN[0] * H * SHADOW, -SUN[1] * H * SHADOW]));
  b.tFloorShade.push(poly(at(floorPlan, z)));
  if (litPlan.length) b.tFloor.push(poly(at(litPlan, z)));
  const back = [R.L(-w / 2, d / 2 - t), R.L(w / 2, d / 2 - t), R.L(w / 2, d / 2), R.L(-w / 2, d / 2)];
  prism(b, back, z, zt, 'rimA', { ground });
  b.backInner.push(poly(face(back[0], back[1], z, zt)));
  prism(b, [R.L(-w / 2, -d / 2), R.L(-w / 2 + t, -d / 2), R.L(-w / 2 + t, d / 2 - t), R.L(-w / 2, d / 2 - t)], z, zt, 'rimA', { cast: false });
  prism(b, [R.L(w / 2 - t, -d / 2), R.L(w / 2, -d / 2), R.L(w / 2, d / 2 - t), R.L(w / 2 - t, d / 2 - t)], z, zt, 'rimA', { cast: false });
  for (let k = 0; k < windows; k++) {
    const x = -w / 2 + t + ((w - 2 * t) * (k + 0.5)) / windows;
    const P = (dx, zz) => [...R.L(x + dx, d / 2 - t), zz];
    b.window.push(poly(P3([P(-2.6, z + H * 0.32), P(2.6, z + H * 0.32), P(1.7, z + H * 0.82), P(-1.7, z + H * 0.82)])));
  }
}

/** Angular granite rock in screen space with a lit upper-right facet. */
function rock(b, x, y, rx, ry, seed, dark = false) {
  const r = rng(seed);
  const pts = [];
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r.range(-0.25, 0.25);
    const f = r.range(0.75, 1.1);
    pts.push([x + Math.cos(a) * rx * f, y + Math.sin(a) * ry * f * (Math.sin(a) > 0 ? 0.55 : 1)]);
  }
  b[dark ? 'outcropShade' : 'rockShade'].push(poly(pts));
  const litPart = clipConvex(pts, [[x - rx * 0.15, y - ry * 2], [x + rx * 2, y - ry * 2], [x + rx * 2, y - ry * 0.05], [x - rx * 0.55, y + ry * 0.1]]);
  if (litPart.length) b[dark ? 'outcropLit' : 'rockLit'].push(poly(litPart));
}

/**
 * The Torreon: a D-shaped tower on a granite outcrop with the Royal Tomb
 * beneath. The curve swings round the east side (towards `face` degrees),
 * the straight wall faces west-south-west, so the wall heads read as a D.
 */
function torreon(b, { c: [cu, cv], R, z, H, t = 3, face: fdeg = 25 }) {
  const zt = z + H;
  const th0 = (fdeg * Math.PI) / 180;
  const pt = (r, th) => [cu + r * Math.cos(th), cv + r * Math.sin(th)];
  const n = 12;
  const outer = Array.from({ length: n + 1 }, (_, k) => pt(R, th0 - Math.PI / 2 + (Math.PI * k) / n));
  const inner = Array.from({ length: n + 1 }, (_, k) => pt(R - t, th0 - Math.PI / 2 + (Math.PI * k) / n));
  // the outcrop and the tomb below
  const [ox, oy] = prj(cu - 4, cv - R * 0.9, z - 3);
  const s = sc(cv);
  rock(b, ox, oy, R * 2.1 * s, 15, 77, true);
  rock(b, ox - R * 1.3 * s, oy + 7, R * 1.0 * s, 9, 79, true);
  b.door.push(poly([[ox - 17, oy + 9], [ox - 4, oy + 9], [ox - 6, oy - 1.5], [ox - 15, oy - 1.5]]));
  // curved face, toned per segment by the sun, only where it faces us
  for (let k = 0; k < n; k++) {
    const A = outer[k];
    const B = outer[k + 1];
    const nn = edgeN(A, B);
    if (facing(nn, A, B) > 0) b[nn[0] * SUN[0] + nn[1] * SUN[1] > 0.82 ? 'exLit' : 'exMid'].push(poly(face(A, B, z, zt)));
  }
  // straight wall across the diameter
  const A = outer[n];
  const B = outer[0];
  const nf = edgeN(A, B);
  if (facing(nf, A, B) > 0) b[`ex${tone(nf)}`].push(poly(face(A, B, z, zt)));
  b.rimA.push(poly(at(outer, zt)));
  const innerFlat = inner.map((p) => add(p, [Math.cos(th0), Math.sin(th0)], t * 0.5));
  const opening = at(innerFlat, zt);
  b.open.push(poly(opening));
  const fv = clipConvex(at(innerFlat, z), opening);
  if (fv.length) b.floor.push(poly(fv));
  // one trapezoid window on the curve, towards us
  const wth = th0 - 1.05;
  const W = (dt, zz) => {
    const p = pt(R, wth + dt);
    return [p[0], p[1], zz];
  };
  b.door.push(poly(P3([W(-0.12, z + H * 0.42), W(0.12, z + H * 0.42), W(0.08, z + H * 0.76), W(-0.08, z + H * 0.76)])));
}

/** Granite boulders scattered over the quarry. */
function boulders(b, { u0, u1, v0, v1, z, n, seed }) {
  const r = rng(seed);
  const list = Array.from({ length: n }, () => [r.range(u0, u1), r.range(v0, v1), r.range(3.5, 10)]).sort((p, q) => q[1] - p[1]);
  list.forEach(([u, v, size], k) => {
    const [x, y] = prj(u, v, z);
    const rx = size * sc(v);
    b.castOver.push(blob(x - rx * 0.5, y + 0.6, rx * 1.1, rx * 0.32, { n: 6, jitter: 0.1, seed: seed + k + 90 }));
    rock(b, x, y - rx * 0.32, rx, rx * 0.62, seed + k);
  });
}

function tree(b, { u, v, z, h = 15, r = 7 }) {
  const [x, y] = prj(u, v, z);
  const s = sc(v);
  b.castOver.push(blob(x - r * 0.9 * s, y + 0.5, r * 1.1 * s, r * 0.35 * s, { n: 7, jitter: 0.1, seed: Math.round(u) + 7 }));
  b.trunk.push(limb([[x, y], [x + 0.6, y - h * 0.6 * s]], 2.4 * s, 1.4 * s));
  b.crown.push(blob(x, y - h * s, r * s, r * 0.82 * s, { n: 9, jitter: 0.14, seed: Math.round(u) }));
  b.crownLit.push(blob(x + r * 0.32 * s, y - h * s - r * 0.24 * s, r * 0.58 * s, r * 0.46 * s, { n: 8, jitter: 0.15, seed: Math.round(u) + 3 }));
}

/** Two llamas grazing on the plaza. */
function grazers(b, { list }) {
  for (const [u, v, z, dir, size = 1] of list) {
    const [x, y] = prj(u, v, z);
    const k = sc(v) * size;
    const X = (dx) => x + dir * dx * k;
    b.woolShadow.push(el(x - 5 * k, y + 0.6, 15 * k, 3 * k));
    for (const dx of [-4, -2.4, 2.2, 3.8]) b.woolLegs.push(limb([[X(dx), y - 4.5 * k], [X(dx), y]], 1.3 * k, 1 * k));
    b.wool.push(el(x, y - 6 * k, 12 * k, 5.4 * k));
    b.wool.push(limb([[X(4.6), y - 7 * k], [X(5.6), y - 13 * k]], 2.6 * k, 2 * k));
    b.wool.push(el(X(6.8), y - 13.6 * k, 4.6 * k, 2.6 * k));
    b.wool.push(poly([[X(5.2), y - 14.4 * k], [X(5.6), y - 17.4 * k], [X(6.2), y - 14.6 * k]]));
  }
}

/** Stone stair flight up a retaining wall at depth v, from z0 to z1. */
function stairs(b, { u0, u1, v, z0, z1, n = 5 }) {
  const run = (z1 - z0) * 0.9;
  for (let k = 0; k < n; k++) {
    const za = z0 + ((z1 - z0) * k) / n;
    const zb = z0 + ((z1 - z0) * (k + 1)) / n;
    const va = v - run + (run * k) / n;
    const vb = v - run + (run * (k + 1)) / n;
    b.stairRiser.push(poly(P3([[u0, va, za], [u1, va, za], [u1, va, zb], [u0, va, zb]])));
    b.stairTread.push(poly(P3([[u0, va, zb], [u1, va, zb], [u1, vb, zb], [u0, vb, zb]])));
  }
}

const octagon = (cu, cv, ru, rv, rot = 0) => Array.from({ length: 8 }, (_, k) => {
  const a = rot + ((k + 0.5) * Math.PI) / 4;
  return [cu + ru * Math.cos(a), cv + rv * Math.sin(a)];
});

const BUILD = {
  platform,
  house,
  temple,
  torreon,
  boulders,
  tree,
  grazers,
  stairs,
  prism: (b, it) => prism(b, it.pts ?? rect(...it.r).pts, it.z, it.zt, it.rim ?? 'rimA', { ground: it.ground, cast: it.cast ?? true }),
  path: (b, it) => b.path.push(poly(at(it.pts, it.z), false)),
};

// depth tiers, back to front; inside a tier things only overlap in the order
// of PIECES
const TIERS = [
  // north end: far plaza and the group below Huayna Picchu
  [
    { type: 'platform', pts: [[396, 152], [478, 150], [560, 153], [562, 208], [394, 208]], z: -2, base: -16, top: 'plaza' },
    { type: 'platform', pts: [[562, 152], [706, 158], [712, 206], [560, 206]], z: 4, base: -14 },
    { type: 'house', c: [588, 182], w: 40, d: 28, deg: -4, z: 4, H: 9, rooms: 2 },
    { type: 'house', c: [634, 176], w: 34, d: 24, deg: 6, z: 4, H: 8, rooms: [0.45, 0.55], rim: 'rimB' },
    { type: 'house', c: [684, 184], w: 28, d: 40, deg: -3, z: 4, H: 9, gables: 'y', thatch: true },
    { type: 'tree', u: 528, v: 188, z: -2, h: 13, r: 6 },
  ],
  // Intihuatana hill (stepped terraces) and the Sacred Plaza temples
  [
    { type: 'platform', pts: octagon(258, 178, 82, 32), z: 16, base: -6 },
    { type: 'platform', pts: [[336, 150], [412, 152], [414, 206], [338, 206]], z: 14, base: -10 },
    { type: 'temple', c: [358, 188], w: 34, d: 30, deg: -3, z: 14, H: 11 },
    { type: 'temple', c: [394, 178], w: 30, d: 30, deg: 4, z: 14, H: 11, windows: 3 },
  ],
  [{ type: 'platform', pts: octagon(260, 180, 62, 25, 0.2), z: 25, base: 16 }],
  [{ type: 'platform', pts: octagon(262, 181, 42, 18, 0.1), z: 34, base: 25 }],
  [
    { type: 'platform', pts: octagon(264, 182, 24, 11), z: 42, base: 34 },
    { type: 'prism', r: [262, 181, 16, 10, 8], z: 42, zt: 47 },
  ],
  [{ type: 'prism', r: [264, 181, 6, 6, 8], z: 47, zt: 58, rim: 'rimB', cast: false }],
  // western sector, main plaza in levels, eastern sector first row
  [
    { type: 'platform', pts: [[150, 80], [348, 76], [350, 148], [176, 148]], z: 12, base: -8, course: true },
    { type: 'house', c: [186, 116], w: 50, d: 38, deg: -7, z: 12, H: 10, rooms: [0.42, 0.58] },
    { type: 'house', c: [244, 120], w: 46, d: 26, deg: 3, z: 12, H: 10, gables: 'x', rim: 'rimB' },
    { type: 'house', c: [306, 112], w: 62, d: 34, deg: -4, z: 12, H: 9, rooms: [0.3, 0.4, 0.3] },
    { type: 'platform', pts: [[358, 112], [452, 109], [550, 111], [552, 150], [356, 150]], z: -4, base: -16, top: 'plaza' },
    { type: 'platform', pts: [[356, 68], [450, 64], [552, 70], [550, 109], [358, 109]], z: -10, base: -22, top: 'plaza' },
    { type: 'stairs', u0: 440, u1: 452, v: 110, z0: -10, z1: -4, n: 4 },
    { type: 'path', pts: [[372, 76], [420, 92], [470, 98], [540, 96]], z: -10 },
    { type: 'path', pts: [[446, 112], [452, 130], [462, 148]], z: -4 },
    { type: 'tree', u: 486, v: 90, z: -10, h: 16, r: 7.5 },
    { type: 'grazers', list: [[412, 90, -10, 1], [514, 84, -10, -1]] },
    { type: 'platform', pts: [[556, 104], [728, 112], [724, 150], [560, 150]], z: -2, base: -16, course: true },
    { type: 'house', c: [584, 128], w: 42, d: 30, deg: 4, z: -2, H: 9, rooms: 2 },
    { type: 'house', c: [632, 130], w: 30, d: 38, deg: 8, z: -2, H: 10, gables: 'y', thatch: true },
    { type: 'house', c: [688, 132], w: 58, d: 30, deg: 5, z: -2, H: 9, rooms: [0.36, 0.64], rim: 'rimB' },
  ],
  // eastern sector second row
  [
    { type: 'platform', pts: [[566, 60], [744, 72], [740, 104], [564, 102]], z: -12, base: -26, course: true },
    { type: 'house', c: [598, 82], w: 48, d: 28, deg: 7, z: -12, H: 9, rooms: [0.55, 0.45] },
    { type: 'house', c: [656, 86], w: 46, d: 24, deg: 9, z: -12, H: 10, gables: 'x' },
    { type: 'house', c: [712, 90], w: 44, d: 26, deg: 6, z: -12, H: 9, rooms: 2, rim: 'rimB' },
  ],
  // front: Torreon sector, the quarry, eastern farming terraces
  [
    { type: 'platform', pts: [[176, 6], [350, 4], [352, 76], [178, 78]], z: 2, base: -20, course: true },
    { type: 'torreon', c: [234, 44], R: 20, z: 2, H: 19 },
    { type: 'house', c: [306, 36], w: 66, d: 40, deg: -5, z: 2, H: 9, rooms: [0.4, 0.6] },
    { type: 'platform', pts: [[362, 0], [460, -4], [550, 2], [556, 40], [548, 64], [452, 66], [358, 62], [354, 30]], z: -14, base: -34, top: 'quarry', rubble: 30, seed: 5, course: true },
    { type: 'boulders', u0: 368, u1: 544, v0: 8, v1: 58, z: -14, n: 14, seed: 61 },
    { type: 'platform', pts: [[560, 38], [758, 50], [754, 64], [562, 62]], z: -16, base: -23 },
    { type: 'platform', pts: [[560, 16], [764, 26], [760, 50], [560, 38]], z: -23, base: -30 },
    { type: 'platform', pts: [[560, -8], [772, 2], [768, 26], [560, 16]], z: -30, base: -38 },
  ],
];

function tier(name, items) {
  const b = Object.fromEntries(PIECES.map(([k]) => [k, []]));
  const grounds = items.filter((it) => it.type === 'platform').map((it) => ({ pts: it.pts ?? rect(...it.r).pts, z: it.z }));
  const groundOf = (p, z) => grounds.find((g) => Math.abs(g.z - z) < 0.5 && inside(p, [g.pts]))?.pts;
  for (const it of items) {
    const centre = it.c ?? (it.r ? [it.r[0], it.r[1]] : null);
    BUILD[it.type](b, centre ? { ...it, ground: groundOf(centre, it.z) } : it);
  }
  return stack(
    name,
    PIECES.map(([k, c, stroke, fill]) => {
      if (!b[k].length) return null;
      return stroke ? gr(k, [...b[k].map((x) => sh(x)), st(CIT[c], stroke.w, { o: stroke.o, cap: 1, pattern: stroke.pattern })]) : paint(k, b[k], CIT[c], { pal: P, o: fill?.o ?? 100 });
    }),
  );
}

function citadel() {
  const saddle = poly(at([[150, -16], [778, -16], [760, 100], [730, 212], [174, 214], [146, 110]], -24));
  const eastSlope = poly([prj(778, -16, -24), prj(760, 100, -24), prj(730, 212, -24), [764, 298], [812, 300], [812, 440], [700, 440]]);
  return shapeLayer('landmark_citadel', [
    paint('east_slope', eastSlope, mix(ANDES, '#2C4A30', 0.3)),
    stippleG('east_forest', eastSlope, { color: mix(ANDES, '#1E3324', 0.5), o: 45, count: 34, minDist: 6, seed: 15 }),
    paint('saddle', saddle, mix(ANDES, '#9DA46A', 0.4)),
    ...TIERS.map((items, k) => tier(`tier_${k}`, items)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Agricultural terraces curving down the slope to the left             */
/* ------------------------------------------------------------------ */

function agriTerraces() {
  const tops = [];
  const walls = [];
  const coping = [];
  const curve = (xr, yr, x) => yr + 0.0009 * Math.max(0, xr - x) ** 2;
  for (let k = 0; k < 12; k++) {
    const xr = 236 + k * 13;
    const yr = 318 + k * 16;
    const ht = 8.5 + k * 0.55;
    const hw = 5 + k * 0.45;
    const xs = [-14, xr * 0.32, xr * 0.64, xr];
    const back = xs.map((x) => [x, curve(xr, yr, x)]);
    const front = xs.map((x) => [x, curve(xr, yr, x) + ht]);
    const foot = xs.map((x) => [x, curve(xr, yr, x) + ht + hw]);
    tops.push(smooth([...back, ...front.slice().reverse()], { tension: 0.5 }));
    walls.push(smooth([...front, ...foot.slice().reverse()], { tension: 0.5 }));
    coping.push(smooth(xs.map((x) => [x, curve(xr, yr, x) + ht + 0.6]), { closed: false, tension: 0.8 }));
  }
  const slope = poly([[-14, 312], [178, 318], [182, 420], [340, 420], [300, 512], [-14, 512]]);
  return shapeLayer('mid_terraces', [
    paint('slope', slope, mix(ANDES, '#5E7A44', 0.35)),
    stippleG('slope_trees', slope, { color: mix(ANDES, '#1E3324', 0.5), o: 50, count: 26, minDist: 7, seed: 19 }),
    paint('terrace_grass', tops, mix(ANDES, '#D8E08A', 0.3)),
    paint('terrace_walls', walls, STONE.base),
    ink('terrace_coping', coping, STONE.lit, 1, { o: 80 }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Foreground terrace: fitted stonework, grass, llama                   */
/* ------------------------------------------------------------------ */

const EDGE = (y) => 304 - (y - 406) * 0.7;

function nearTerrace() {
  const r = rng(13);
  const stones = [];
  const stonesLit = [];
  let y = 468;
  for (const rh of [17, 22]) {
    let x = EDGE(y + rh) - r.range(4, 14);
    while (x < 810) {
      const w = r.range(44, 74);
      const j = () => r.range(-1.6, 1.6);
      stones.push(smoothCorners([[x + 1 + j(), y + 1 + j()], [x + w * 0.5, y + 0.6 + j()], [x + w - 1 + j(), y + 1 + j()], [x + w - 1 + j(), y + rh - 1 + j()], [x + w * 0.5, y + rh - 0.6 + j()], [x + 1 + j(), y + rh - 1 + j()]], new Set([0, 2, 3, 5]), 0.6));
      stonesLit.push(poly([[x + w * 0.55, y + 2], [x + w - 2.5, y + 2], [x + w - 2.5, y + rh * 0.55], [x + w * 0.7, y + rh * 0.4]]));
      x += w;
    }
    y += rh;
  }
  const grass = poly([[EDGE(406), 406], [430, 410], [620, 405], [810, 409], [810, 470], [EDGE(470), 470]]);
  const grassShade = poly([[EDGE(452), 452], [810, 452], [810, 470], [EDGE(470), 470]]);
  const joints = poly([[EDGE(466), 466], [810, 466], [810, 510], [EDGE(510), 510]]);
  const sideWall = poly([[EDGE(406), 406], [EDGE(406) - 9, 412], [EDGE(510) - 9, 512], [EDGE(510), 512]]);
  return shapeLayer('fg_terrace', [
    paint('side_wall', sideWall, STONE.shade),
    hatchG('side_wall_joints', sideWall, { color: STONE.dark, angle: 12, spacing: 9, w: 0.7, o: 50, zig: false, seed: 4 }),
    paint('grass', grass, mix(ANDES, '#B8C46A', 0.25)),
    paint('grass_shade', grassShade, mix(ANDES, '#22371F', 0.3)),
    paint('joints', joints, STONE.dark),
    paint('stones', stones, STONE.base),
    paint('stones_lit', stonesLit, STONE.lit, { o: 70 }),
    stippleG('lichen', stones, { color: mix(INTI, ALPACA, 0.4), o: 55, count: 30, minDist: 8, r0: 0.6, r1: 1.2, seed: 9 }),
    paint('wildflowers', [[352, 440, 3.6, 10], [430, 452, 3.2, 40], [520, 440, 3.8, 70], [596, 454, 3.4, 20], [466, 434, 3, 55]].map(([x, y, r, rot]) => flowerPath(x, y, r, rot)), INTI, { pal: P }),
    paint('flower_eyes', [[352, 440], [430, 452], [520, 440], [596, 454], [466, 434]].map(([x, y]) => el(x, y, 1.7, 1.7)), mix(GRANA, '#5A2A10', 0.4)),
  ]);
}

function grassTufts() {
  const r = rng(21);
  const tufts = [];
  for (let k = 0; k < 6; k++) {
    const x = 340 + k * 62 + r.range(-10, 10);
    const y = 432 + r.range(-6, 18);
    const s = r.range(7, 11);
    const blades = [leafShape([x, y], [x - s * 0.7, y - s * 1.6], s * 0.28), leafShape([x, y], [x + s * 0.1, y - s * 2], s * 0.3), leafShape([x, y], [x + s * 0.8, y - s * 1.5], s * 0.26)];
    tufts.push(gr(`tuft_${k}`, [...blades.map((c) => sh(c)), fl(mix(ANDES, '#C6CF6E', 0.35))], {
      a: [x, y],
      p: [x, y],
      r: cycle([-6, 6], { period: 80, phase: k * 0.07 }),
    }));
  }
  return shapeLayer('fx_grass_ripple', tufts);
}

function llama() {
  const wool = ALPACA;
  const woolShade = mix(ALPACA, '#7D6A57', 0.38);
  const woolLit = mix(ALPACA, '#FFFFFF', 0.45);
  const face = mix(ALPACA, '#A88E70', 0.25);
  const bumps = (cx, cy, rx, ry, n, seed) => blob(cx, cy, rx, ry, { n, jitter: 0.07, seed });
  const body = bumps(668, 418, 52, 25, 16, 3);
  const bodyLit = bumps(676, 410, 38, 14, 12, 4);
  const neck = smooth([[624, 420], [616, 392], [612, 366], [610, 350], [632, 346], [638, 370], [646, 396], [656, 412]]);
  const legs = [
    limb([[634, 432], [632, 452], [633, 470]], 10, 6),
    limb([[647, 434], [646, 454], [647, 470]], 10, 6),
    limb([[694, 432], [698, 452], [696, 470]], 11, 6),
    limb([[708, 430], [712, 452], [711, 470]], 11, 6),
  ];
  const hooves = [[633, 470], [647, 470], [696, 470], [711, 470]].map(([x, y]) => el(x, y + 1, 7, 3));
  const tail = bumps(720, 408, 7, 9, 7, 5);
  const head = svg1('M 612 352 C 610 342 618 334 628 336 C 634 338 636 346 632 352 C 628 356 620 358 612 360 C 604 362 594 362 590 358 C 588 354 592 350 598 349 C 604 348 610 350 612 352 Z');
  const eye = el(616, 346, 3, 3);
  const nostril = el(592, 355, 1.6, 1.2);
  const ear = (x, y, lean) => svg1(`M ${x - 3} ${y} C ${x - 4} ${y - 8} ${x - 2 + lean} ${y - 16} ${x + lean} ${y - 19} C ${x + 3 + lean} ${y - 15} ${x + 3} ${y - 8} ${x + 3} ${y} Z`);
  // yarn tassels hanging from each ear
  const tassel = (x, y, ph) => {
    const strands = [];
    const colors = [GRANA, PINK, GRANA, mix(GRANA, PINK, 0.5)];
    colors.forEach((c, k) => strands.push(gr(`strand_${k}`, [sh(limb([[x, y], [x - 2 + k * 1.3, y + 6], [x - 3 + k * 2, y + 12]], 2, 1.4)), fl(c)])));
    return stack('tassel', [...strands, paint('pompom', el(x, y + 1, 6, 6), GRANA, { pal: P })], { a: [x, y], p: [x, y], r: cycle([-8, 8], { period: 60, phase: ph }) });
  };
  const earL = stack('ear_far', [paint('ear', ear(620, 338, -1), face), tassel(619, 330, 0)], { a: [620, 338], p: [620, 338], r: keys([{ t: 0, v: 0, e: 'hold' }, { t: 58, v: 0, e: 'out' }, { t: 62, v: -12, e: 'inOut' }, { t: 70, v: 0, e: 'hold' }, { t: 240, v: 0 }]) });
  const earR = stack('ear_near', [paint('ear', ear(628, 338, 1), wool, { pal: P }), tassel(629, 330, 0.5)], { a: [628, 338], p: [628, 338], r: keys([{ t: 0, v: 0, e: 'hold' }, { t: 164, v: 0, e: 'out' }, { t: 168, v: 10, e: 'inOut' }, { t: 176, v: 0, e: 'hold' }, { t: 240, v: 0 }]) });
  return shapeLayer('fg_llama', [stack('llama', [
    paint('legs_far', [legs[1], legs[3]], woolShade),
    paint('tail', tail, wool, { pal: P }),
    paint('body_shade', bumps(668, 424, 52, 22, 16, 6), woolShade),
    paint('body', body, wool, { pal: P }),
    paint('body_lit', bodyLit, woolLit),
    paint('legs_near', [legs[0], legs[2]], wool, { pal: P }),
    paint('hooves', hooves, '#3A3028'),
    paint('neck', neck, wool, { pal: P }),
    paint('neck_shade', smooth([[626, 418], [618, 392], [614, 366], [612, 352], [618, 352], [622, 380], [632, 412]]), woolShade),
    earL,
    paint('head', head, face),
    paint('eye', eye, '#1E1A16'),
    paint('nostril', nostril, '#5A4A3A'),
    earR,
  ], { a: [672, 470], p: [742, 474], s: [70, 70] })]);
}

function condor() {
  const wingTop = svg1('M 0 0 C -10 -4 -24 -6 -34 -4 L -38 -8 L -40 -3 L -44 -7 L -45 -1 L -49 -4 L -48 2 C -40 4 -24 6 -8 6 Z');
  const wingNear = svg1('M 0 0 C 10 -4 24 -6 34 -4 L 38 -8 L 40 -3 L 44 -7 L 45 -1 L 49 -4 L 48 2 C 40 4 24 6 8 6 Z');
  const patchL = svg1('M -8 1 C -18 0 -28 0 -36 -1 L -34 3 C -24 4 -16 4 -8 4 Z');
  const patchR = svg1('M 8 1 C 18 0 28 0 36 -1 L 34 3 C 24 4 16 4 8 4 Z');
  const body = svg1('M -6 1 C -2 -3 6 -3 10 0 C 14 2 14 5 10 6 C 4 7 -4 6 -10 4 Z');
  const ruff = el(9, 0.5, 6, 5);
  const head = el(14, -0.5, 4.4, 3.6);
  const bird = stack('bird', [
    paint('wings', [wingTop, wingNear], '#1C1A1E'),
    paint('wing_patches', [patchL, patchR], '#E8E4DC'),
    paint('body', body, '#232026'),
    paint('ruff', ruff, '#F4F0EA'),
    paint('head', head, '#8A4A44'),
  ]);
  // one wide circle per loop: x and y as quarter-shifted sines, facing flips at the ends
  const flip = stack('flip', [bird], { s: cycle([[100, 100], [-100, 100]], { period: 240, phase: 0.5 }), r: cycle([6, -6], { period: 240, phase: 0.25 }) });
  const size = stack('depth', [flip], { s: cycle([[88, 88], [112, 112]], { period: 240, phase: 0 }) });
  const yMove = stack('y', [size], { p: cycle([[0, 104], [0, 150]], { period: 240, phase: 0 }) });
  return shapeLayer('fx_condor', [stack('x', [yMove], { p: cycle([[150, 0], [410, 0]], { period: 240, phase: 0.75 }) })]);
}

/* ------------------------------------------------------------------ */

export default {
  id: '04-peru-machu-picchu',
  palette: P.list,
  build() {
    return composition({
      nm: 'Waymark · Peru, Machu Picchu',
      layers: [
        sky(),
        ranges(),
        midMountains(),
        shapeLayer('far_clouds', [cloudBank('valley_far', 314, 24, 260, 80, 31), cloudBank('wisps_high', 268, 14, 330, 55, 35, { flat: false, fadeEnd: -0.1 })]),
        huaynaPicchu(),
        shapeLayer('mid_clouds', [cloudBank('valley_near', 352, 28, 300, 88, 41)]),
        agriTerraces(),
        citadel(),
        nearTerrace(),
        grassTufts(),
        llama(),
        condor(),
      ],
    });
  },
};
