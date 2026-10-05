// Geometry helpers. A contour is Lottie's own path shape:
//   { v: [[x, y]...], i: [[dx, dy]...], o: [[dx, dy]...], c: closed }
// where i / o are the in / out bezier tangents relative to each vertex.

const K = 0.5522847498; // circle-to-bezier constant

/* ------------------------------------------------------------------ */
/* Random                                                              */
/* ------------------------------------------------------------------ */

/** Deterministic PRNG (mulberry32) with a few helpers. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => Math.floor(lo + (hi - lo + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

/* ------------------------------------------------------------------ */
/* Contour constructors                                                */
/* ------------------------------------------------------------------ */

/** Polygon / polyline with straight segments. */
export function poly(points, closed = true) {
  return {
    v: points.map((p) => [p[0], p[1]]),
    i: points.map(() => [0, 0]),
    o: points.map(() => [0, 0]),
    c: closed,
  };
}

/** Axis-aligned rectangle as a contour (clockwise in screen space). */
export function rectPath(x, y, w, h) {
  return poly([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]);
}

/** Ellipse as a 4-point bezier contour (clockwise in screen space). */
export function ellipsePath(cx, cy, rx, ry) {
  return {
    v: [
      [cx, cy - ry],
      [cx + rx, cy],
      [cx, cy + ry],
      [cx - rx, cy],
    ],
    i: [
      [-rx * K, 0],
      [0, -ry * K],
      [rx * K, 0],
      [0, ry * K],
    ],
    o: [
      [rx * K, 0],
      [0, ry * K],
      [-rx * K, 0],
      [0, -ry * K],
    ],
    c: true,
  };
}

/**
 * Catmull-Rom spline through points, converted to bezier tangents.
 * tension 1 = classic Catmull-Rom; lower is tighter.
 */
export function smooth(points, { closed = true, tension = 1 } = {}) {
  const n = points.length;
  const v = [];
  const i = [];
  const o = [];
  for (let k = 0; k < n; k++) {
    const p1 = points[k];
    let p0 = points[(k - 1 + n) % n];
    let p2 = points[(k + 1) % n];
    if (!closed) {
      if (k === 0) p0 = p1;
      if (k === n - 1) p2 = p1;
    }
    const tx = ((p2[0] - p0[0]) * tension) / 6;
    const ty = ((p2[1] - p0[1]) * tension) / 6;
    v.push([p1[0], p1[1]]);
    o.push([tx, ty]);
    i.push([-tx, -ty]);
  }
  return { v, i, o, c: closed };
}

/** Organic blob around an ellipse with radial jitter. */
export function blob(cx, cy, rx, ry, { n = 9, jitter = 0.18, rot = 0, seed = 1, tension = 1 } = {}) {
  const r = rng(seed);
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * Math.PI * 2;
    const f = 1 + r.range(-jitter, jitter);
    pts.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]);
  }
  return smooth(pts, { tension });
}

/**
 * Scalloped cloud / foliage clump: flat-ish bottom, bumpy top.
 * Returns a closed smooth contour.
 */
export function cloud(x0, x1, baseY, height, { bumps = 5, seed = 1, flat = true, sag = 0.15 } = {}) {
  const r = rng(seed);
  const pts = [];
  const w = x1 - x0;
  pts.push([x0, baseY]);
  for (let k = 0; k < bumps; k++) {
    const fx = (k + 0.5) / bumps;
    const env = Math.sin(Math.PI * fx) ** 0.7; // taller in the middle
    const h = height * env * r.range(0.75, 1.05);
    const xa = x0 + (w * k) / bumps;
    pts.push([xa + (w / bumps) * 0.12, baseY - h * 0.72]);
    pts.push([xa + (w / bumps) * 0.5, baseY - h]);
  }
  pts.push([x1, baseY - height * 0.12]);
  pts.push([x1, baseY]);
  if (!flat) {
    for (let k = bumps - 1; k > 0; k--) pts.push([x0 + (w * k) / bumps, baseY + height * sag * r.range(0.5, 1)]);
  }
  return smooth(pts, { tension: 0.9 });
}

/**
 * Hill / ridge silhouette from x0 to x1, closed down to bottomY.
 * peaks: [[x, y]...] control points along the ridge line.
 */
export function ridge(peaks, bottomY, { tension = 1, x0, x1 } = {}) {
  const top = peaks.map((p) => [p[0], p[1]]);
  const left = x0 ?? top[0][0];
  const right = x1 ?? top[top.length - 1][0];
  const s = smooth(top, { closed: false, tension });
  // append bottom corners with straight tangents
  s.v.push([right, bottomY], [left, bottomY]);
  s.i.push([0, 0], [0, 0]);
  s.o.push([0, 0], [0, 0]);
  s.c = true;
  return s;
}

/** Jagged ridge: random midpoint displacement between control points. */
export function jaggedLine(points, { depth = 3, rough = 0.35, seed = 1 } = {}) {
  const r = rng(seed);
  let pts = points.map((p) => [p[0], p[1]]);
  for (let d = 0; d < depth; d++) {
    const nxt = [pts[0]];
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + r.range(-1, 1) * len * rough * 0.5];
      nxt.push(mid, b);
    }
    pts = nxt;
    rough *= 0.6;
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* SVG path parsing                                                    */
/* ------------------------------------------------------------------ */

/** Parse an SVG path string into an array of contours. Supports MLHVCSQTAZ. */
export function svg(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g) ?? [];
  const contours = [];
  let cur = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lastC2 = null; // for S
  let lastQ = null; // for T
  let cmd = '';
  let idx = 0;
  const num = () => parseFloat(tokens[idx++]);
  const start = (px, py) => {
    cur = { v: [[px, py]], i: [[0, 0]], o: [[0, 0]], c: false };
    contours.push(cur);
  };
  const lineTo = (px, py) => {
    cur.v.push([px, py]);
    cur.i.push([0, 0]);
    cur.o.push([0, 0]);
  };
  const cubicTo = (c1x, c1y, c2x, c2y, px, py) => {
    const n = cur.v.length - 1;
    cur.o[n] = [c1x - cur.v[n][0], c1y - cur.v[n][1]];
    cur.v.push([px, py]);
    cur.i.push([c2x - px, c2y - py]);
    cur.o.push([0, 0]);
  };
  while (idx < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[idx])) cmd = tokens[idx++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    if (C === 'M') {
      x = ox + num();
      y = oy + num();
      start(x, y);
      sx = x;
      sy = y;
      cmd = rel ? 'l' : 'L';
      lastC2 = lastQ = null;
    } else if (C === 'L') {
      x = ox + num();
      y = oy + num();
      lineTo(x, y);
      lastC2 = lastQ = null;
    } else if (C === 'H') {
      x = (rel ? x : 0) + num();
      lineTo(x, y);
      lastC2 = lastQ = null;
    } else if (C === 'V') {
      y = (rel ? y : 0) + num();
      lineTo(x, y);
      lastC2 = lastQ = null;
    } else if (C === 'C') {
      const c1x = ox + num();
      const c1y = oy + num();
      const c2x = ox + num();
      const c2y = oy + num();
      x = ox + num();
      y = oy + num();
      cubicTo(c1x, c1y, c2x, c2y, x, y);
      lastC2 = [c2x, c2y];
      lastQ = null;
    } else if (C === 'S') {
      const c1x = lastC2 ? 2 * x - lastC2[0] : x;
      const c1y = lastC2 ? 2 * y - lastC2[1] : y;
      const c2x = ox + num();
      const c2y = oy + num();
      x = ox + num();
      y = oy + num();
      cubicTo(c1x, c1y, c2x, c2y, x, y);
      lastC2 = [c2x, c2y];
      lastQ = null;
    } else if (C === 'Q' || C === 'T') {
      let qx;
      let qy;
      if (C === 'Q') {
        qx = ox + num();
        qy = oy + num();
      } else {
        qx = lastQ ? 2 * x - lastQ[0] : x;
        qy = lastQ ? 2 * y - lastQ[1] : y;
      }
      const px = ox + num();
      const py = oy + num();
      cubicTo(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), px + (2 / 3) * (qx - px), py + (2 / 3) * (qy - py), px, py);
      x = px;
      y = py;
      lastQ = [qx, qy];
      lastC2 = null;
    } else if (C === 'A') {
      const rx = num();
      const ry = num();
      const phi = num();
      const fa = num();
      const fs = num();
      const px = ox + num();
      const py = oy + num();
      for (const seg of arcToCubics(x, y, rx, ry, phi, fa, fs, px, py)) cubicTo(...seg);
      x = px;
      y = py;
      lastC2 = lastQ = null;
    } else if (C === 'Z') {
      closeContour(cur);
      x = sx;
      y = sy;
      lastC2 = lastQ = null;
    } else {
      throw new Error(`Unsupported path command ${cmd}`);
    }
  }
  return contours;
}

/** Shortcut: first contour of an SVG path string. */
export const svg1 = (d) => svg(d)[0];

function closeContour(c) {
  if (!c) return;
  const n = c.v.length - 1;
  if (n > 0 && Math.abs(c.v[n][0] - c.v[0][0]) < 1e-6 && Math.abs(c.v[n][1] - c.v[0][1]) < 1e-6) {
    c.i[0] = c.i[n];
    c.v.pop();
    c.i.pop();
    c.o.pop();
  }
  c.c = true;
}

/** SVG elliptical arc -> cubic segments [c1x, c1y, c2x, c2y, x, y]. */
function arcToCubics(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const sign = fa === fs ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI;
  if (fs && dt < 0) dt += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9);
  const out = [];
  const step = dt / segs;
  const alpha = (4 / 3) * Math.tan(step / 4);
  let t = t1;
  const pt = (a) => [cx + rx * Math.cos(a) * cos - ry * Math.sin(a) * sin, cy + rx * Math.cos(a) * sin + ry * Math.sin(a) * cos];
  const dpt = (a) => [-rx * Math.sin(a) * cos - ry * Math.cos(a) * sin, -rx * Math.sin(a) * sin + ry * Math.cos(a) * cos];
  for (let s = 0; s < segs; s++) {
    const a0 = t;
    const a1 = t + step;
    const p0 = pt(a0);
    const p1 = pt(a1);
    const d0 = dpt(a0);
    const d1 = dpt(a1);
    out.push([p0[0] + alpha * d0[0], p0[1] + alpha * d0[1], p1[0] - alpha * d1[0], p1[1] - alpha * d1[1], p1[0], p1[1]]);
    t = a1;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Contour transforms                                                  */
/* ------------------------------------------------------------------ */

/** Apply an affine map [a, b, c, d, e, f] (x' = a x + c y + e, y' = b x + d y + f). */
export function affine(contour, m) {
  const [a, b, c, d, e, f] = m;
  const P = (p) => [a * p[0] + c * p[1] + e, b * p[0] + d * p[1] + f];
  const V = (p) => [a * p[0] + c * p[1], b * p[0] + d * p[1]];
  return { v: contour.v.map(P), i: contour.i.map(V), o: contour.o.map(V), c: contour.c };
}

export const translate = (c, dx, dy) => affine(c, [1, 0, 0, 1, dx, dy]);
export const scaleAbout = (c, sx, sy, cx = 0, cy = 0) => affine(c, [sx, 0, 0, sy, cx - sx * cx, cy - sy * cy]);
export function rotateAbout(c, deg, cx = 0, cy = 0) {
  const r = (deg * Math.PI) / 180;
  const cs = Math.cos(r);
  const sn = Math.sin(r);
  return affine(c, [cs, sn, -sn, cs, cx - cs * cx + sn * cy, cy - sn * cx - cs * cy]);
}
/** Mirror horizontally about x = axis. */
export const mirrorX = (c, axis) => reverse(affine(c, [-1, 0, 0, 1, 2 * axis, 0]));

/** Generic point-wise warp (tangents are warped by finite differences). */
export function warp(contour, fn) {
  const v = contour.v.map(fn);
  const i = contour.v.map((p, k) => {
    const q = fn([p[0] + contour.i[k][0], p[1] + contour.i[k][1]]);
    return [q[0] - v[k][0], q[1] - v[k][1]];
  });
  const o = contour.v.map((p, k) => {
    const q = fn([p[0] + contour.o[k][0], p[1] + contour.o[k][1]]);
    return [q[0] - v[k][0], q[1] - v[k][1]];
  });
  return { v, i, o, c: contour.c };
}

/** Reverse direction (used to punch holes with the non-zero rule). */
export function reverse(contour) {
  const n = contour.v.length;
  const v = [];
  const i = [];
  const o = [];
  for (let k = n - 1; k >= 0; k--) {
    v.push(contour.v[k]);
    i.push(contour.o[k]);
    o.push(contour.i[k]);
  }
  return { v, i, o, c: contour.c };
}

/* ------------------------------------------------------------------ */
/* Measurement                                                         */
/* ------------------------------------------------------------------ */

/** Flatten a contour to a polyline. */
export function flatten(contour, steps = 10) {
  const out = [];
  const n = contour.v.length;
  const segs = contour.c ? n : n - 1;
  for (let k = 0; k < segs; k++) {
    const a = contour.v[k];
    const b = contour.v[(k + 1) % n];
    const c1 = [a[0] + contour.o[k][0], a[1] + contour.o[k][1]];
    const c2 = [b[0] + contour.i[(k + 1) % n][0], b[1] + contour.i[(k + 1) % n][1]];
    const straight = contour.o[k][0] === 0 && contour.o[k][1] === 0 && contour.i[(k + 1) % n][0] === 0 && contour.i[(k + 1) % n][1] === 0;
    const st = straight ? 1 : steps;
    for (let s = 0; s < st; s++) {
      const t = s / st;
      const mt = 1 - t;
      out.push([
        mt * mt * mt * a[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t * t * t * b[0],
        mt * mt * mt * a[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t * t * t * b[1],
      ]);
    }
  }
  if (!contour.c) out.push(contour.v[n - 1]);
  return out;
}

/** Signed area of a polyline (positive = clockwise in screen space). */
export function area(pts) {
  let s = 0;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

/**
 * Sutherland-Hodgman: clip polyline `subject` (any polygon) by the convex
 * polygon `clip` (either winding). Returns the clipped point list (possibly
 * empty).
 */
export function clipConvex(subject, clip) {
  const sgn = area(clip) >= 0 ? 1 : -1;
  let out = subject;
  for (let k = 0; k < clip.length && out.length; k++) {
    const a = clip[k];
    const b = clip[(k + 1) % clip.length];
    const side = (p) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return Math.abs(area(out)) > 0.4 ? out : [];
}

/** Force clockwise (screen space) direction. */
export function clockwise(contour) {
  return area(flatten(contour, 4)) < 0 ? reverse(contour) : contour;
}
/** Force counter-clockwise (hole) direction. */
export function counterClockwise(contour) {
  return area(flatten(contour, 4)) > 0 ? reverse(contour) : contour;
}

export function bbox(pts) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0];
    if (p[1] > y1) y1 = p[1];
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/** Even-odd point-in-polygon over one or many polylines. */
export function inside(pt, polys) {
  let c = false;
  for (const pts of polys) {
    for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) {
      const a = pts[k];
      const b = pts[j];
      if (a[1] > pt[1] !== b[1] > pt[1] && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
  }
  return c;
}

/** Accept a contour, polyline, or arrays of either, and return polylines. */
export function toPolys(shape) {
  if (!shape) return [];
  if (shape.v) return [flatten(shape)];
  if (Array.isArray(shape) && shape.length && typeof shape[0][0] === 'number') return [shape];
  return shape.flatMap((s) => toPolys(s));
}

/* ------------------------------------------------------------------ */
/* Engraving textures                                                  */
/* ------------------------------------------------------------------ */

/**
 * Parallel hatch lines clipped (even-odd) to one or more shapes.
 * angle in degrees (0 = horizontal), spacing in px.
 * Returns scanlines: [[[[x1, y1], [x2, y2]], ...], ...] (segments per line).
 */
export function hatchScan(shape, { angle = 45, spacing = 4, offset = 0, minLen = 2, inset = 0, jitter = 0, seed = 7 } = {}) {
  const polys = toPolys(shape);
  const r = rng(seed);
  const th = (angle * Math.PI) / 180;
  const d = [Math.cos(th), Math.sin(th)];
  const nrm = [-Math.sin(th), Math.cos(th)];
  let cmin = Infinity;
  let cmax = -Infinity;
  for (const pts of polys) {
    for (const p of pts) {
      const c = p[0] * nrm[0] + p[1] * nrm[1];
      cmin = Math.min(cmin, c);
      cmax = Math.max(cmax, c);
    }
  }
  const lines = [];
  for (let c = cmin + offset + spacing / 2; c < cmax; c += spacing) {
    const ts = [];
    for (const pts of polys) {
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k];
        const b = pts[(k + 1) % pts.length];
        const ca = a[0] * nrm[0] + a[1] * nrm[1];
        const cb = b[0] * nrm[0] + b[1] * nrm[1];
        if (ca <= c !== cb <= c) {
          const u = (c - ca) / (cb - ca);
          const px = a[0] + u * (b[0] - a[0]);
          const py = a[1] + u * (b[1] - a[1]);
          ts.push(px * d[0] + py * d[1]);
        }
      }
    }
    ts.sort((p, q) => p - q);
    const segs = [];
    for (let k = 0; k + 1 < ts.length; k += 2) {
      let t0 = ts[k] + inset;
      let t1 = ts[k + 1] - inset;
      if (jitter) {
        t0 += r.range(0, jitter);
        t1 -= r.range(0, jitter);
      }
      if (t1 - t0 < minLen) continue;
      segs.push([
        [nrm[0] * c + d[0] * t0, nrm[1] * c + d[1] * t0],
        [nrm[0] * c + d[0] * t1, nrm[1] * c + d[1] * t1],
      ]);
    }
    lines.push(segs);
  }
  return lines;
}

/** Flat list of hatch segments. */
export const hatch = (shape, opts) => hatchScan(shape, opts).flat();

/**
 * Join hatch strokes of neighbouring scanlines into zig-zag polylines (the
 * joins run along the shape edge, like an engraver's contour line), so each
 * stroke costs one vertex pair instead of a separate path. Handles several
 * disjoint regions by continuing whichever run ends closest.
 */
export function serpentine(lines, maxGap = 12) {
  const done = [];
  let active = [];
  for (const segs of lines) {
    const next = [];
    const used = new Set();
    for (const [a, b] of segs) {
      let best = -1;
      let bestD = maxGap;
      let flip = false;
      active.forEach((run, idx) => {
        if (used.has(idx)) return;
        const end = run[run.length - 1];
        const da = Math.hypot(a[0] - end[0], a[1] - end[1]);
        const db = Math.hypot(b[0] - end[0], b[1] - end[1]);
        if (da <= bestD) {
          best = idx;
          bestD = da;
          flip = false;
        }
        if (db < bestD) {
          best = idx;
          bestD = db;
          flip = true;
        }
      });
      if (best >= 0) {
        used.add(best);
        const run = active[best];
        if (flip) run.push(b, a);
        else run.push(a, b);
        next.push(run);
      } else {
        next.push([a, b]);
      }
    }
    active.forEach((run, idx) => {
      if (!used.has(idx)) done.push(run);
    });
    active = next;
  }
  return [...done, ...active];
}

/** Sparse stipple dots inside shapes: returns [[x, y, r]...]. */
export function stipple(shape, { count = 40, minDist = 4, r0 = 0.5, r1 = 0.9, seed = 11, tries = 30 } = {}) {
  const polys = toPolys(shape);
  const b = bbox(polys.flat());
  const r = rng(seed);
  const pts = [];
  let attempts = 0;
  while (pts.length < count && attempts < count * tries) {
    attempts++;
    const p = [r.range(b.x0, b.x1), r.range(b.y0, b.y1)];
    if (!inside(p, polys)) continue;
    if (pts.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < minDist)) continue;
    pts.push([p[0], p[1], r.range(r0, r1)]);
  }
  return pts;
}

/** Linear interpolation helpers. */
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
