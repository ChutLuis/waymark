// Minimal Bodymovin 5.7 writer: properties, loop-safe keyframes, shape items,
// layers and compositions. Only features that lottie-ios (both engines),
// lottie-android, lottie-web and ThorVG render identically are exposed:
// no expressions, effects, merge paths, repeaters or 3D.

import { rgb } from './color.mjs';

export const FPS = 30;
export const FRAMES = 240;
export const W = 800;
export const H = 500;

/* ------------------------------------------------------------------ */
/* Rounding                                                            */
/* ------------------------------------------------------------------ */

const round = (d) => (n) => {
  const f = 10 ** d;
  const r = Math.round(n * f) / f;
  return Object.is(r, -0) ? 0 : r;
};
export const q = round(2);
export const q1 = round(1);
export const q3 = round(3);
const deep = (v, rd) => (Array.isArray(v) ? v.map((x) => deep(x, rd)) : typeof v === 'number' ? rd(v) : v);

/* ------------------------------------------------------------------ */
/* Properties                                                          */
/* ------------------------------------------------------------------ */

export const isAnim = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && x.a === 1;

/** Static or animated property. */
export function prop(v, rd = q) {
  if (isAnim(v)) return v;
  return { a: 0, k: deep(v, rd) };
}

/** Lottie colour array [r, g, b, 1] at 3-decimal precision. */
export function rgba(c) {
  const [r, g, b] = rgb(c);
  return [q3(r), q3(g), q3(b), 1];
}

/** Path contour -> Lottie shape value (static geometry at 0.1 px). */
export function shapeValue(c) {
  return { i: deep(c.i, q1), o: deep(c.o, q1), v: deep(c.v, q1), c: !!c.c };
}

/* ------------------------------------------------------------------ */
/* Easing and keyframes                                                */
/* ------------------------------------------------------------------ */

/** cubic-bezier(x1, y1, x2, y2) presets. */
export const EASE = {
  sine: [0.37, 0, 0.63, 1],
  inOut: [0.42, 0, 0.58, 1],
  soft: [0.45, 0.05, 0.55, 0.95],
  out: [0.22, 0.61, 0.36, 1],
  in: [0.55, 0.06, 0.68, 0.19],
  linear: [0.25, 0.25, 0.75, 0.75],
  backOut: [0.34, 1.56, 0.64, 1],
};

const easeOf = (e) => (Array.isArray(e) ? e : EASE[e ?? 'sine']);

function lerpValue(a, b, t) {
  if (typeof a === 'number') return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((x, k) => lerpValue(x, b[k], t));
  // contour
  return {
    v: lerpValue(a.v, b.v, t),
    i: lerpValue(a.i, b.i, t),
    o: lerpValue(a.o, b.o, t),
    c: a.c,
  };
}

/** Wrap a value as a Lottie keyframe `s` entry. */
function sValue(v, rd) {
  if (typeof v === 'number') return [rd(v)];
  if (Array.isArray(v)) return deep(v, rd);
  return [shapeValue(v)];
}

/**
 * Keyframes from [{ t, v, e }], where e is the easing of the segment that
 * starts at this key ('hold' for a step). The last key needs no easing.
 */
export function keys(list, { rd = q } = {}) {
  for (let k = 1; k < list.length; k++) {
    if (!(list[k].t > list[k - 1].t)) throw new Error(`Keyframe times must increase (${list[k - 1].t} -> ${list[k].t})`);
  }
  const k = list.map((f, idx) => {
    const kf = { t: q(f.t), s: sValue(f.v, rd) };
    if (idx < list.length - 1) {
      if (f.e === 'hold') {
        kf.h = 1;
      } else {
        const [x1, y1, x2, y2] = easeOf(f.e);
        kf.o = { x: q(x1), y: q(y1) };
        kf.i = { x: q(x2), y: q(y2) };
      }
    }
    return kf;
  });
  return { a: 1, k };
}

/** Like keys(), but asserts the loop closes: t from 0 to FRAMES, same value. */
export function loop(list, opts) {
  const first = list[0];
  const last = list[list.length - 1];
  if (first.t !== 0) throw new Error('loop() must start at t = 0');
  if (last.t !== FRAMES) list = [...list, { t: FRAMES, v: first.v }];
  return keys(list, opts);
}

/* bezier easing split ------------------------------------------------ */

function bez(p1, p2, s) {
  const m = 1 - s;
  return 3 * m * m * s * p1 + 3 * m * s * s * p2 + s * s * s;
}

function solveX(x1, x2, u) {
  let lo = 0;
  let hi = 1;
  let s = u;
  for (let it = 0; it < 60; it++) {
    const x = bez(x1, x2, s);
    if (Math.abs(x - u) < 1e-9) break;
    if (x < u) lo = s;
    else hi = s;
    s = (lo + hi) / 2;
  }
  return s;
}

/** Split an easing curve at time fraction u. */
function splitEase(e, u) {
  const [x1, y1, x2, y2] = easeOf(e);
  const s = solveX(x1, x2, u);
  const L = (a, b) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
  const P0 = [0, 0];
  const P1 = [x1, y1];
  const P2 = [x2, y2];
  const P3 = [1, 1];
  const P01 = L(P0, P1);
  const P12 = L(P1, P2);
  const P23 = L(P2, P3);
  const P012 = L(P01, P12);
  const P123 = L(P12, P23);
  const M = L(P012, P123);
  const safe = (n, d) => (Math.abs(d) < 1e-7 ? 0.5 : n / d);
  const left = [safe(P01[0], M[0]), safe(P01[1], M[1]), safe(P012[0], M[0]), safe(P012[1], M[1])];
  const right = [
    safe(P123[0] - M[0], 1 - M[0]),
    safe(P123[1] - M[1], 1 - M[1]),
    safe(P23[0] - M[0], 1 - M[0]),
    safe(P23[1] - M[1], 1 - M[1]),
  ];
  return { y: M[1], left, right };
}

function splitSeg(ka, kb, T) {
  const u = (T - ka.t) / (kb.t - ka.t);
  if (ka.e === 'hold') return { v: ka.v, left: 'hold', right: 'hold' };
  const sp = splitEase(ka.e, u);
  return { v: lerpValue(ka.v, kb.v, sp.y), left: sp.left, right: sp.right };
}

/** Clip an (extended) key list to [T0, T1], splitting boundary segments exactly. */
function clipKeys(ext, T0, T1) {
  const eps = 1e-6;
  let a = 0;
  while (a + 1 < ext.length && ext[a + 1].t <= T0 + eps) a++;
  const out = [];
  let startSplit = null;
  if (Math.abs(ext[a].t - T0) < eps) {
    out.push({ t: T0, v: ext[a].v, e: ext[a].e });
  } else {
    startSplit = splitSeg(ext[a], ext[a + 1], T0);
    out.push({ t: T0, v: startSplit.v, e: startSplit.right });
  }
  let k = a + 1;
  while (k < ext.length && ext[k].t < T1 - eps) out.push({ ...ext[k++] });
  if (k >= ext.length) throw new Error('clipKeys: keys do not cover the range');
  if (Math.abs(ext[k].t - T1) < eps) {
    out.push({ t: T1, v: ext[k].v });
  } else {
    if (out.length === 1 && startSplit) throw new Error('clipKeys: range inside a single segment');
    const sp = splitSeg(ext[k - 1], ext[k], T1);
    out[out.length - 1].e = sp.left;
    out.push({ t: T1, v: sp.v });
  }
  return out;
}

/**
 * Seamless periodic animation. `values` are spaced evenly over `period`
 * frames (or at `times`, fractions of the period) and repeat cyclically;
 * `period` must divide FRAMES. `phase` (0..1) shifts where frame 0 falls in
 * the cycle. `ease` is a preset, a cubic array, or an array of per-segment eases.
 */
export function cycle(values, { period = FRAMES, phase = 0, ease = 'sine', times, rd = q } = {}) {
  if (FRAMES % period !== 0) throw new Error(`cycle period ${period} must divide ${FRAMES}`);
  const n = values.length;
  const fr = times ?? values.map((_, j) => j / n);
  const perSeg = Array.isArray(ease) && typeof ease[0] !== 'number';
  const ext = [];
  const shift = -Math.round((((phase % 1) + 1) % 1) * period);
  for (let c = -1; c * period + shift <= FRAMES + period; c++) {
    for (let j = 0; j < n; j++) {
      ext.push({ t: c * period + fr[j] * period + shift, v: values[j], e: perSeg ? ease[j] : ease });
    }
  }
  ext.sort((x, y) => x.t - y.t);
  return keys(clipKeys(ext, 0, FRAMES), { rd });
}

/** Back-and-forth oscillation between a and b (sine-like). */
export const osc = (a, b, opts = {}) => cycle([a, b], opts);

/**
 * Linear travel from `from` to `to`, repeating every `period` frames, with an
 * invisible jump back at the wrap (keep both ends off-screen or hidden).
 */
export function drift(from, to, { period = FRAMES, phase = 0, rd = q } = {}) {
  if (FRAMES % period !== 0) throw new Error(`drift period ${period} must divide ${FRAMES}`);
  let ph = Math.round((((phase % 1) + 1) % 1) * period) / period;
  const wraps = () => {
    const out = [];
    for (let k = 0; k <= FRAMES / period + 1; k++) {
      const tw = (k - ph) * period;
      if (tw > 0 && tw < FRAMES) out.push(tw);
    }
    return out;
  };
  // keep wrap points at least 1.5 frames away from the loop seam
  const near = () => ph * period < 1.5 || ph * period > period - 1.5;
  if (near()) ph = (ph + 2 / period) % 1;
  const at = (t) => {
    const f = (((t / period + ph) % 1) + 1) % 1;
    return lerpValue(from, to, f);
  };
  const list = [{ t: 0, v: at(0), e: 'linear' }];
  for (const tw of wraps()) {
    const tj = Math.min(tw + 1, FRAMES - 0.5);
    list.push({ t: tw, v: to, e: 'hold' });
    list.push({ t: tj, v: at(tj), e: 'linear' });
  }
  list.push({ t: FRAMES, v: at(FRAMES) });
  return keys(list, { rd });
}

/** Hold `a`, change to `b` over [t0, t1], hold, return to `a` over [t2, t3]. */
export function once(a, b, t0, t1, t2, t3, { ease = 'inOut', back = ease, rd = q } = {}) {
  const list = [
    { t: 0, v: a, e: 'hold' },
    { t: t0, v: a, e: ease },
    { t: t1, v: b, e: 'hold' },
    { t: t2, v: b, e: back },
    { t: t3, v: a, e: 'hold' },
    { t: FRAMES, v: a },
  ];
  return keys(dedupe(list), { rd });
}

function dedupe(list) {
  const out = [];
  for (const k of list) {
    if (out.length && Math.abs(out[out.length - 1].t - k.t) < 1e-9) out[out.length - 1] = k;
    else out.push(k);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Shape items                                                         */
/* ------------------------------------------------------------------ */

/** Path item from a contour (ready-made el / rc / sh items pass through). */
export const sh = (contour, nm) => (contour.ty ? contour : { ty: 'sh', nm, ks: { a: 0, k: shapeValue(contour) } });
export const shAnim = (anim, nm) => ({ ty: 'sh', nm, ks: anim });
export const el = (cx, cy, w, h, nm) => ({ ty: 'el', nm, d: 1, p: prop([cx, cy], q1), s: prop([w, h], q1) });
export const rc = (cx, cy, w, h, r = 0, nm) => ({ ty: 'rc', nm, d: 1, p: prop([cx, cy], q1), s: prop([w, h], q1), r: prop(r, q1) });

/** Solid fill. rule 1 = non-zero, 2 = even-odd. */
export function fl(color, { o = 100, nm, rule = 1 } = {}) {
  const c = isAnim(color) ? color : prop(rgba(color), q3);
  return { ty: 'fl', nm, c, o: prop(o), r: rule };
}

/**
 * Stroke. cap: 1 butt, 2 round, 3 square. join: 1 miter, 2 round, 3 bevel.
 * dash: [dash, gap, offset?]; pattern: [dash, gap, dash, gap, ...] for an
 * irregular dash pattern (with `offset`).
 */
export function st(color, w = 1, { o = 100, cap = 2, join = 2, nm, dash, pattern, offset = 0 } = {}) {
  const c = isAnim(color) ? color : prop(rgba(color), q3);
  const out = { ty: 'st', nm, c, o: prop(o), w: prop(w), lc: cap, lj: join, ml: 4 };
  if (dash) {
    out.d = [
      { n: 'd', nm: 'dash', v: prop(dash[0]) },
      { n: 'g', nm: 'gap', v: prop(dash[1]) },
      { n: 'o', nm: 'offset', v: prop(dash[2] ?? 0) },
    ];
  } else if (pattern) {
    out.d = [...pattern.map((v, k) => (k % 2 ? { n: 'g', nm: `g${k >> 1}`, v: prop(v) } : { n: 'd', nm: `d${k >> 1}`, v: prop(v) })), { n: 'o', nm: 'offset', v: prop(offset) }];
  }
  return out;
}

/**
 * Gradient fill. stops: [[pos, colour]...]; alpha: optional [[pos, opacity 0..1]...].
 * type 'linear' (s -> e) or 'radial' (centre s, edge e).
 */
export function gf({ stops, alpha, type = 'linear', s, e, o = 100, nm }) {
  const k = [];
  for (const [p, c] of stops) {
    const [r, g, b] = rgb(c);
    k.push(q3(p), q3(r), q3(g), q3(b));
  }
  if (alpha) for (const [p, a] of alpha) k.push(q3(p), q3(a));
  const out = { ty: 'gf', nm, o: prop(o), r: 1, g: { p: stops.length, k: { a: 0, k } }, s: prop(s), e: prop(e), t: type === 'radial' ? 2 : 1 };
  if (type === 'radial') {
    out.h = prop(0);
    out.a = prop(0);
  }
  return out;
}

/** Trim path (individual mode for Core Animation compatibility). */
export const tm = (s, e, o = 0) => ({ ty: 'tm', s: prop(s), e: prop(e), o: prop(o), m: 2 });

const same = (v, d) => (Array.isArray(d) ? Array.isArray(v) && v.every((x, k) => Math.abs(x - d[k]) < 1e-9) : v === d);

/**
 * Group transform (always last in a group). Identity position / anchor /
 * scale / rotation are omitted (lottie-ios ShapeTransform, lottie-android
 * AnimatableTransformParser, lottie-web and ThorVG all default them), but
 * opacity is always written: lottie-web's SVG renderer drops the whole
 * group when a transform has no `o`.
 */
export function tr({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100, sk, sa } = {}) {
  const t = { ty: 'tr' };
  const put = (key, v, d) => {
    if (isAnim(v) || !same(v, d)) t[key] = prop(v);
  };
  put('p', p, [0, 0]);
  put('a', a, [0, 0]);
  put('s', s, [100, 100]);
  put('r', r, 0);
  t.o = prop(o);
  if (sk !== undefined) {
    t.sk = prop(sk);
    t.sa = prop(sa ?? 0);
  }
  return t;
}

/**
 * Group in Lottie order: path items first, then the styles that paint them
 * (earlier styles paint on top of later ones). The transform is appended.
 */
export function gr(nm, items, transform = {}) {
  return { ty: 'gr', nm, it: [...items.filter(Boolean), tr(transform)] };
}

/** Group of child groups listed back-to-front (painter's order). */
export function stack(nm, children, transform = {}) {
  return gr(nm, [...children.filter(Boolean)].reverse(), transform);
}

/* ------------------------------------------------------------------ */
/* Layers and composition                                              */
/* ------------------------------------------------------------------ */

function pad3(v, z) {
  if (isAnim(v)) {
    return { a: 1, k: v.k.map((kf) => (kf.s && kf.s.length === 2 ? { ...kf, s: [...kf.s, z] } : kf)) };
  }
  return prop(v.length === 2 ? [...v, z] : v);
}

function layerKs({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 }) {
  return { o: prop(o), r: prop(r), p: pad3(p, 0), a: pad3(a, 0), s: pad3(s, 100) };
}

/**
 * Shape layer. `groups` are listed back-to-front for readability and are
 * reversed into Lottie's front-first order here.
 */
export function shapeLayer(nm, groups, opts = {}) {
  const { ip = 0, op = FRAMES, parent } = opts;
  const layer = {
    ddd: 0,
    ty: 4,
    nm,
    sr: 1,
    ks: layerKs(opts),
    ao: 0,
    shapes: [...groups.filter(Boolean)].reverse(),
    ip,
    op,
    st: 0,
    bm: 0,
  };
  if (parent) layer.parentName = parent;
  return layer;
}

/** Precomp layer referencing an asset id. */
export function precompLayer(nm, refId, opts = {}) {
  const { ip = 0, op = FRAMES, w = W, h = H } = opts;
  return { ddd: 0, ty: 0, nm, refId, sr: 1, ks: layerKs(opts), ao: 0, w, h, ip, op, st: 0, bm: 0 };
}

/** Assign indices / resolve parents for a back-to-front layer list. */
function finalizeLayers(backToFront) {
  const front = [...backToFront].reverse().map((l, idx) => ({ ...l, ind: idx + 1 }));
  const byName = new Map(front.map((l) => [l.nm, l.ind]));
  for (const l of front) {
    if (l.parentName) {
      l.parent = byName.get(l.parentName);
      if (!l.parent) throw new Error(`Unknown parent ${l.parentName}`);
      delete l.parentName;
    }
  }
  return front;
}

export function precompAsset(id, layersBackToFront, nm = id) {
  return { id, nm, fr: FPS, layers: finalizeLayers(layersBackToFront) };
}

/** Drop names of nested groups (layer, top-level group and fill names stay). */
function compact(items, depth) {
  for (const it of items) {
    if (it.ty === 'gr') {
      if (depth > 1) delete it.nm;
      compact(it.it, depth + 1);
    }
  }
}

export function composition({ nm, layers, assets = [], markers = [], w = W, h = H, fr = FPS, op = FRAMES }) {
  for (const l of [...layers, ...assets.flatMap((a) => a.layers ?? [])]) if (l.shapes) compact(l.shapes, 1);
  return {
    v: '5.7.0',
    fr,
    ip: 0,
    op,
    w,
    h,
    nm,
    ddd: 0,
    assets,
    layers: finalizeLayers(layers),
    markers,
  };
}
