// Illustration-level helpers: painted shapes, engraving hatches, stipple,
// glows and a palette that names its fills pal_1..pal_5.

import { hex, mix } from './color.mjs';
import { hatchScan, poly, rng, serpentine, stipple } from './geom.mjs';
import { el, fl, gf, gr, sh, st } from './lottie.mjs';

/** Palette whose exact colours are emitted as fills named pal_1..pal_5. */
export function palette(colors) {
  const list = colors.map((c) => hex(c));
  const nameOf = (c) => {
    const k = list.indexOf(hex(c));
    return k >= 0 ? `pal_${k + 1}` : undefined;
  };
  return {
    list,
    /** 1-based palette colour. */
    c: (n) => list[n - 1],
    nameOf,
    /** Fill that is auto-named pal_N when the colour is a palette colour. */
    fill: (color, opts = {}) => fl(color, { ...opts, nm: opts.nm ?? nameOf(color) }),
  };
}

const asList = (x) => (Array.isArray(x) ? x : [x]);

const item = (c) => (c.ty ? c : sh(c));

/** Filled group of one or more contours (or ready-made el / rc items). */
export function paint(nm, contours, color, { o = 100, rule = 1, pal, fillName, t } = {}) {
  const items = asList(contours).map(item);
  const fill = pal ? pal.fill(color, { o, rule, nm: fillName }) : fl(color, { o, rule, nm: fillName });
  return gr(nm, [...items, fill], t);
}

/** Stroked group of one or more contours. */
export function ink(nm, contours, color, w = 1, { o = 100, cap = 2, join = 2, dash, t } = {}) {
  const items = asList(contours).map(item);
  return gr(nm, [...items, st(color, w, { o, cap, join, dash })], t);
}

/**
 * Engraving hatch: parallel strokes clipped to a shape. With zig (default)
 * neighbouring strokes are joined along the edge into one zig-zag path.
 */
export function hatchG(nm, shape, { color, w = 0.9, o = 45, angle = 45, spacing = 4, inset = 0.6, jitter = 0, seed = 3, minLen = 2, offset = 0, zig = true, t } = {}) {
  const lines = hatchScan(shape, { angle, spacing, inset, jitter, seed, minLen, offset });
  const runs = zig ? serpentine(lines, spacing * 4.5) : lines.flat();
  if (!runs.length) return null;
  const items = runs.map((r) => sh(poly(r, false)));
  return gr(nm, [...items, st(color, w, { o, cap: 2, join: 2 })], t);
}

/** Stipple dots inside a shape. */
export function stippleG(nm, shape, { color, o = 50, count = 30, minDist = 5, r0 = 0.45, r1 = 0.85, seed = 5, t } = {}) {
  const pts = stipple(shape, { count, minDist, r0, r1, seed });
  if (!pts.length) return null;
  const items = pts.map(([x, y, r]) => el(x, y, r * 2, r * 2));
  return gr(nm, [...items, fl(color, { o })], t);
}

/** Soft radial glow faked with a transparent-edged radial gradient. */
export function glow(nm, cx, cy, rx, ry, color, { alpha = 0.6, mid = 0.35, o = 100, t, inner } = {}) {
  const c2 = inner ?? color;
  const g = gf({
    type: 'radial',
    stops: [
      [0, c2],
      [1, color],
    ],
    alpha: [
      [0, alpha],
      [0.45, alpha * mid],
      [1, 0],
    ],
    s: [cx, cy],
    e: [cx + rx, cy],
    o,
  });
  // the ellipse is scaled vertically by the group transform so the radial
  // gradient becomes elliptical
  const sy = (ry / rx) * 100;
  return gr(nm, [el(cx, cy, rx * 2, rx * 2), g], {
    a: [cx, cy],
    p: [cx, cy],
    s: [100, sy],
    ...(t ?? {}),
  });
}

/** Rectangle with a vertical linear gradient. stops: [[pos, colour]...]. */
export function vGradientRect(nm, x, y, w, h, stops, { y0 = y, y1 = y + h, o = 100, t, alpha } = {}) {
  return gr(nm, [sh(poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])), gf({ stops, alpha, s: [x, y0], e: [x, y1], o })], t);
}

// Irregular dash patterns per distance band: near rows have long dashes and
// short gaps, far rows short dashes and long gaps.
const SKY_PATTERNS = [
  [84, 70, 36, 96, 120, 64, 52, 130],
  [58, 92, 26, 120, 76, 84, 34, 110],
  [34, 120, 18, 140, 46, 130],
  [22, 136, 14, 150, 30, 140],
];
// each band is split into a fainter and a stronger set of rows
const SKY_VARIANTS = [0.75, 1.2];

/**
 * Engraved sky: sparse horizontal dashed lines in jittered rows. With
 * distance (towards y1) rows spread apart and dashes get shorter, thinner and
 * fainter. Each band uses an irregular dash pattern, every row starts it at a
 * random phase and tilts a fraction of a pixel, and the band a row falls into
 * is dithered, so there are no full-width lines, no regular period and no
 * visible steps: it reads as hand-cut texture rather than scanlines. One
 * two-point path per row keeps it cheap. `gaps(y)` may return the [xa, xb]
 * spans a row may occupy.
 */
export function skyLines(nm, { x0 = 0, x1 = 800, y0 = 0, y1 = 200, s0 = 12, s1 = 28, color, w = 0.85, o = 30, bands = 3, seed = 17, gaps } = {}) {
  const r = rng(seed);
  const pat = (b) => SKY_PATTERNS[Math.min(b, SKY_PATTERNS.length - 1)];
  const rows = Array.from({ length: bands * SKY_VARIANTS.length }, () => []);
  let y = y0 + s0 * r.range(0.4, 0.9);
  while (y < y1) {
    const f = (y - y0) / (y1 - y0);
    const b = Math.max(0, Math.min(bands - 1, Math.floor((f + r.range(-0.14, 0.14)) * bands)));
    const slot = b * SKY_VARIANTS.length + r.int(0, SKY_VARIANTS.length - 1);
    const period = pat(b).reduce((s, v) => s + v, 0);
    const tilt = r.range(-0.4, 0.4);
    const phase = r.range(0, period);
    for (const [ga, gb] of gaps ? gaps(y) : [[x0, x1]]) {
      // starting the path off-canvas shifts where the dash pattern falls
      const a = ga <= 0 ? ga - phase : ga;
      if (gb - Math.max(a, ga) > 5) rows[slot].push(sh(poly([[a, y - tilt], [gb, y + tilt]], false)));
    }
    y += (s0 + (s1 - s0) * f ** 1.3) * r.range(0.6, 1.4);
  }
  const groups = rows
    .map((items, k) => {
      if (!items.length) return null;
      const b = Math.floor(k / SKY_VARIANTS.length);
      const v = SKY_VARIANTS[k % SKY_VARIANTS.length];
      return gr(`${nm}_${k}`, [...items, st(color, w * (1 - b * 0.18), { o: Math.min(100, o * v * (1 - b / (bands + 0.6)) ** 1.15), cap: 2, pattern: pat(b) })]);
    })
    .filter(Boolean);
  return gr(nm, groups.reverse());
}

/**
 * Tapered limb (branch, stalk, frond rib) along a centre line, as a closed
 * smooth outline. Width goes from w0 at the first point to w1 at the last.
 */
export function limb(points, w0, w1 = 0.6) {
  const n = points.length;
  const left = [];
  const right = [];
  for (let k = 0; k < n; k++) {
    const a = points[Math.max(0, k - 1)];
    const b = points[Math.min(n - 1, k + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (w0 + (w1 - w0) * (k / (n - 1))) / 2;
    left.push([points[k][0] - dy * w, points[k][1] + dx * w]);
    right.push([points[k][0] + dy * w, points[k][1] - dx * w]);
  }
  return smoothPts([...left, ...right.reverse()], 0.55);
}

function smoothPts(pts, tension) {
  const n = pts.length;
  const v = [];
  const i = [];
  const o = [];
  for (let k = 0; k < n; k++) {
    const p0 = pts[(k - 1 + n) % n];
    const p2 = pts[(k + 1) % n];
    const tx = ((p2[0] - p0[0]) * tension) / 6;
    const ty = ((p2[1] - p0[1]) * tension) / 6;
    v.push(pts[k]);
    o.push([tx, ty]);
    i.push([-tx, -ty]);
  }
  return { v, i, o, c: true };
}

/**
 * Canopy silhouette: the scalloped upper envelope of tree crowns
 * [[x, y, r]...], closed down to baseY. Cusps between crowns stay sharp.
 */
export function canopy(crowns, baseY, { x0, x1 } = {}) {
  const cs = [...crowns].sort((a, b) => a[0] - b[0]);
  const top = (c, x) => {
    const dx = x - c[0];
    return Math.abs(dx) < c[2] ? c[1] - Math.sqrt(c[2] * c[2] - dx * dx) : c[1] + c[2] * 0.2;
  };
  const left = x0 ?? cs[0][0] - cs[0][2];
  const right = x1 ?? cs[cs.length - 1][0] + cs[cs.length - 1][2];
  const pts = [{ x: left, y: top(cs[0], left), peak: false }];
  cs.forEach((c, k) => {
    pts.push({ x: c[0], y: c[1] - c[2], peak: true });
    const n = cs[k + 1];
    if (n) {
      const xv = c[0] + ((n[0] - c[0]) * c[2]) / (c[2] + n[2]);
      pts.push({ x: xv, y: Math.min(top(c, xv), top(n, xv)), peak: false });
    }
  });
  pts.push({ x: right, y: top(cs[cs.length - 1], right), peak: false });
  const v = [];
  const i = [];
  const o = [];
  pts.forEach((p, k) => {
    const a = pts[k - 1];
    const b = pts[k + 1];
    v.push([p.x, p.y]);
    if (p.peak) {
      i.push([a ? -(p.x - a.x) * 0.55 : 0, 0]);
      o.push([b ? (b.x - p.x) * 0.55 : 0, 0]);
    } else {
      i.push(a ? [(a.x - p.x) * 0.06, (a.y - p.y) * 0.55] : [0, 0]);
      o.push(b ? [(b.x - p.x) * 0.06, (b.y - p.y) * 0.55] : [0, 0]);
    }
  });
  v.push([right, baseY], [left, baseY]);
  i.push([0, 0], [0, 0]);
  o.push([0, 0], [0, 0]);
  return { v, i, o, c: true };
}

/** Smooth closed contour through points with sharp corners at given indices. */
export function smoothCorners(points, corners, tension = 1) {
  const n = points.length;
  const v = [];
  const i = [];
  const o = [];
  for (let k = 0; k < n; k++) {
    const p0 = points[(k - 1 + n) % n];
    const p1 = points[k];
    const p2 = points[(k + 1) % n];
    v.push([p1[0], p1[1]]);
    if (corners.has(k)) {
      i.push([0, 0]);
      o.push([0, 0]);
    } else {
      const tx = ((p2[0] - p0[0]) * tension) / 6;
      const ty = ((p2[1] - p0[1]) * tension) / 6;
      o.push([tx, ty]);
      i.push([-tx, -ty]);
    }
  }
  return { v, i, o, c: true };
}

/** Five-petal blossom with notched petal tips, as a single contour. */
export function flowerPath(cx, cy, r, rot = 0, { notch = 0.8, inner = 0.3 } = {}) {
  const pts = [];
  const corners = new Set();
  const at = (deg, rad) => [cx + Math.sin((deg * Math.PI) / 180) * rad, cy - Math.cos((deg * Math.PI) / 180) * rad];
  for (let k = 0; k < 5; k++) {
    const th = rot + k * 72;
    corners.add(pts.length);
    pts.push(at(th - 36, r * inner));
    pts.push(at(th - 19, r * 0.97));
    corners.add(pts.length);
    pts.push(at(th, r * notch));
    pts.push(at(th + 19, r * 0.97));
  }
  return smoothCorners(pts, corners, 1.25);
}

/**
 * Blossom / foliage cluster made of small round florets, toned by their
 * position relative to the light (unit vector `light`, screen space).
 * Returns { under, shade, mid, lit } arrays of el items so many clusters can
 * share four fills.
 */
export function florets(cx, cy, rx, ry, { count = 16, r0 = 2.4, r1 = 4.4, light = [0.5, -0.85], seed = 1, under = 0.8 } = {}) {
  const r = rng(seed);
  const out = { under: [], shade: [], mid: [], lit: [] };
  if (under) out.under.push(el(cx - light[0] * rx * 0.12, cy - light[1] * ry * 0.18, rx * 2 * under, ry * 2 * under));
  for (let k = 0; k < count; k++) {
    const a = r.range(0, Math.PI * 2);
    const d = Math.sqrt(r.next());
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const rad = r1 - (r1 - r0) * d * r.range(0.5, 1);
    const pr = (Math.cos(a) * light[0] + Math.sin(a) * light[1]) * d;
    let tone = pr > 0.3 ? 2 : pr < -0.15 ? 0 : 1;
    if (r.next() < 0.18) tone = Math.max(0, Math.min(2, tone + r.sign()));
    [out.shade, out.mid, out.lit][tone].push(el(x, y, rad * 2, rad * 2));
  }
  return out;
}

/** Merge several florets() results. */
export function mergeFlorets(list) {
  const out = { under: [], shade: [], mid: [], lit: [] };
  for (const f of list) for (const k of Object.keys(out)) out[k].push(...f[k]);
  return out;
}

/**
 * Pointed leaf from base to tip with max width w (near 40% of the length),
 * bent sideways by `bend` (fraction of length). Returns a closed contour.
 */
export function leafShape(base, tip, w, { bend = 0, round = 0.5 } = {}) {
  const [x0, y0] = base;
  const dx = tip[0] - x0;
  const dy = tip[1] - y0;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const nx = -uy;
  const ny = ux;
  const P = (t, s) => {
    const b = bend * L * Math.sin(Math.PI * t);
    return [x0 + ux * L * t + nx * (s + b), y0 + uy * L * t + ny * (s + b)];
  };
  const pts = [P(0, 0), P(0.12, w * 0.3), P(0.4, w * 0.5), P(0.75, w * 0.32 * (0.6 + round)), P(1, 0), P(0.75, -w * 0.32 * (0.6 + round)), P(0.4, -w * 0.5), P(0.12, -w * 0.3)];
  return smoothCorners(pts, new Set([0, 4]), 1);
}

/** Centre line of a leafShape (for midribs). */
export function leafRib(base, tip, { bend = 0, t1 = 0.92 } = {}) {
  const [x0, y0] = base;
  const dx = tip[0] - x0;
  const dy = tip[1] - y0;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const pts = [];
  for (let k = 0; k <= 4; k++) {
    const t = (k / 4) * t1;
    const b = bend * L * Math.sin(Math.PI * t);
    pts.push([x0 + dx * t + nx * b, y0 + dy * t + ny * b]);
  }
  return pts;
}

/** Two-tone helper: returns [light, shadow, highlight] variants of a base colour. */
export function tones(base, { light = '#FFF4E0', shadow = '#2B2023', l = 0.18, s = 0.32, h = 0.42 } = {}) {
  return [mix(base, light, l), mix(base, shadow, s), mix(base, light, h)];
}
