// Checks a generated composition against the Waymark scene spec and the
// cross-renderer feature set. Returns { errors, warnings, stats }.

import { Buffer } from 'node:buffer';

import { rgb } from './color.mjs';

const LAYER_NAME = /^(bg_sky|(far|mid|landmark|fg|fx)_[a-z0-9_]+)$/;
const RANK = { bg: 0, far: 1, mid: 2, landmark: 3, fg: 4, fx: 5 };
const COLOR_KEYS = new Set(['c']);

/* ------------------------------------------------------------------ */
/* Property evaluation                                                 */
/* ------------------------------------------------------------------ */

function bez(p1, p2, s) {
  const m = 1 - s;
  return 3 * m * m * s * p1 + 3 * m * s * s * p2 + s * s * s;
}

function easeY(o, i, u) {
  const x1 = Array.isArray(o.x) ? o.x[0] : o.x;
  const y1 = Array.isArray(o.y) ? o.y[0] : o.y;
  const x2 = Array.isArray(i.x) ? i.x[0] : i.x;
  const y2 = Array.isArray(i.y) ? i.y[0] : i.y;
  let lo = 0;
  let hi = 1;
  let s = u;
  for (let it = 0; it < 50; it++) {
    const x = bez(x1, x2, s);
    if (Math.abs(x - u) < 1e-7) break;
    if (x < u) lo = s;
    else hi = s;
    s = (lo + hi) / 2;
  }
  return bez(y1, y2, s);
}

const flat = (s) => {
  if (!Array.isArray(s)) return [s];
  if (s.length && typeof s[0] === 'object' && !Array.isArray(s[0])) {
    const c = s[0];
    return [...c.v.flat(), ...c.i.flat(), ...c.o.flat()];
  }
  return s.flat(Infinity);
};

/** Evaluate an animated property at frame t as a flat number array. */
export function evalAt(prop, t) {
  const k = prop.k;
  if (t <= k[0].t) return flat(k[0].s);
  for (let n = 0; n < k.length - 1; n++) {
    const a = k[n];
    const b = k[n + 1];
    if (t >= a.t && t <= b.t) {
      const va = flat(a.s);
      if (a.h === 1) return t === b.t ? flat(b.s ?? a.e) : va;
      const vb = flat(b.s ?? a.e);
      const u = (t - a.t) / (b.t - a.t);
      const y = easeY(a.o, a.i, u);
      return va.map((x, j) => x + (vb[j] - x) * y);
    }
  }
  const last = k[k.length - 1];
  return flat(last.s ?? k[k.length - 2].e);
}

/* ------------------------------------------------------------------ */
/* Walk                                                                */
/* ------------------------------------------------------------------ */

function walk(node, visit, path = []) {
  if (Array.isArray(node)) {
    node.forEach((n, i) => walk(n, visit, [...path, i]));
    return;
  }
  if (node && typeof node === 'object') {
    visit(node, path);
    for (const [key, val] of Object.entries(node)) walk(val, visit, [...path, key]);
  }
}

const decimals = (n) => {
  const s = String(n);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
};

/* ------------------------------------------------------------------ */
/* Validate                                                            */
/* ------------------------------------------------------------------ */

/** Rough playback-cost budgets (per file) for low-end Android, where every path is redrawn each frame. */
export const BUDGET = { vertices: 12000, stroked: 3000, draws: 420, gradients: 32, animated: 260 };

const vertsOf = (it) => {
  if (it.ty === 'el' || it.ty === 'rc') return 4;
  if (it.ty !== 'sh') return 0;
  const k = it.ks.a === 0 ? it.ks.k : it.ks.k[0] && it.ks.k[0].s && it.ks.k[0].s[0];
  return k && k.v ? k.v.length : 0;
};

export function validate(json, { maxBytes = 300 * 1000, maxLayers = 80, palette, w = 800, h = 500, op = 240, sceneNames = true, loop = true, budget = BUDGET } = {}) {
  const errors = [];
  const warnings = [];
  const text = JSON.stringify(json);
  const bytes = Buffer.byteLength(text);

  // top level
  const top = { v: '5.7.0', fr: 30, ip: 0, op, w, h };
  for (const [k, v] of Object.entries(top)) if (json[k] !== v) errors.push(`top-level ${k} = ${json[k]} (expected ${v})`);
  if (json.ddd) errors.push('3D composition');
  if (bytes > maxBytes) errors.push(`size ${bytes} bytes > ${maxBytes} bytes`);
  if (/null/.test(text)) errors.push('null / NaN values in the JSON');

  if (!loop) {
    const names = (json.markers ?? []).map((m) => m.cm);
    for (const m of ['confirm', 'done']) if (!names.includes(m)) errors.push(`missing marker "${m}"`);
  }

  // layers
  const precompLayers = (json.assets ?? []).flatMap((a) => a.layers ?? []);
  const all = [...json.layers, ...precompLayers];
  if (all.length > maxLayers) errors.push(`${all.length} layers > ${maxLayers}`);
  let matted = 0;
  for (const l of all) {
    if (l.ty === 2) errors.push(`image layer ${l.nm}`);
    if (l.ty === 5) errors.push(`text layer ${l.nm}`);
    if (l.ty === 1) warnings.push(`solid layer ${l.nm}`);
    if (l.ddd) errors.push(`3D layer ${l.nm}`);
    if (l.ef && l.ef.length) errors.push(`effects on ${l.nm}`);
    if (l.sy && l.sy.length) errors.push(`layer styles on ${l.nm}`);
    if (l.tt || l.td) matted++;
    if (l.masksProperties && l.masksProperties.length) warnings.push(`mask on ${l.nm}`);
    if (l.tm) errors.push(`time remap on ${l.nm}`);
    if (l.bm) warnings.push(`blend mode ${l.bm} on ${l.nm}`);
  }
  if (matted > 3) errors.push(`mattes on ${matted} layers (max 3)`);
  for (const a of json.assets ?? []) if (a.p || a.u) errors.push(`image asset ${a.id}`);

  // names and order (main comp, back to front)
  if (sceneNames) {
    const btf = [...json.layers].reverse();
    let rank = 0;
    for (const l of btf) {
      if (!LAYER_NAME.test(l.nm)) {
        errors.push(`layer name "${l.nm}" breaks bg_sky/far_/mid_/landmark_/fg_/fx_ convention`);
        continue;
      }
      const r = RANK[l.nm.split('_')[0]];
      if (r === RANK.fx) continue; // particle / light overlays may sit between planes
      if (r < rank) warnings.push(`layer "${l.nm}" is above a later-plane layer (back-to-front order)`);
      rank = Math.max(rank, r);
    }
    if (!json.layers.some((l) => l.nm === 'bg_sky')) errors.push('missing bg_sky layer');
  }

  // shapes, properties and keyframes
  const pal = new Map();
  let animated = 0;
  let shapes = 0;
  let vertices = 0;
  let stroked = 0;
  let gradients = 0;
  let draws = 0;
  walk(json, (node, path) => {
    if (node.ty === 'gf' || node.ty === 'gs') gradients++;
    if (node.ty === 'fl' || node.ty === 'st' || node.ty === 'gf' || node.ty === 'gs') draws++;
    if (node.ty === 'sh' || node.ty === 'el' || node.ty === 'rc') vertices += vertsOf(node);
    if (node.ty === 'gr' && Array.isArray(node.it) && node.it.some((i) => i.ty === 'st' || i.ty === 'gs')) {
      for (const i of node.it) stroked += vertsOf(i);
    }
    const key = path[path.length - 1];
    if (node.ty === 'mm') errors.push('merge paths');
    if (node.ty === 'rp') errors.push('repeater (unsupported by lottie-ios main-thread engine)');
    if (typeof node.x === 'string') errors.push(`expression at ${path.join('.')}`);
    if (node.ty === 'sh' || node.ty === 'el' || node.ty === 'rc') shapes++;
    if (node.ty === 'sh' && node.ks && node.ks.a === 0) {
      const k = node.ks.k;
      if (!k || !Array.isArray(k.v) || !Array.isArray(k.i) || !Array.isArray(k.o) || k.v.length !== k.i.length || k.v.length !== k.o.length || !k.v.length) errors.push(`malformed path at ${path.join('.')}`);
    }
    if (node.ty === 'tm' && node.m === 1) warnings.push('simultaneous trim (unsupported by lottie-ios Core Animation)');
    if (node.ty === 'fl' && typeof node.nm === 'string' && /^pal_\d$/.test(node.nm)) {
      const c = node.c.a === 0 ? node.c.k : null;
      if (!pal.has(node.nm)) pal.set(node.nm, []);
      pal.get(node.nm).push(c);
    }
    if ('a' in node && 'k' in node && (node.a === 0 || node.a === 1)) {
      if (node.a === 1) {
        animated++;
        const ks = node.k;
        if (!Array.isArray(ks) || !ks.length || typeof ks[0].t !== 'number') {
          errors.push(`malformed keyframes at ${path.join('.')}`);
          return;
        }
        if (ks[0].t > 0) errors.push(`keyframes start after 0 at ${path.join('.')}`);
        if (ks[ks.length - 1].t < op) errors.push(`keyframes end before ${op} at ${path.join('.')}`);
        if (loop) {
          const v0 = evalAt(node, 0);
          const v1 = evalAt(node, op);
          let diff = Math.max(...v0.map((x, j) => Math.abs(x - v1[j])));
          // a whole number of turns closes a rotation loop
          if (key === 'r') diff = Math.min(diff % 360, 360 - (diff % 360));
          if (diff > 0.011) errors.push(`loop seam mismatch (${diff.toFixed(3)}) at ${path.join('.')}`);
        }
        if (!COLOR_KEYS.has(key)) {
          for (const kf of ks) {
            for (const n of flat(kf.s ?? [])) if (typeof n === 'number' && decimals(n) > 2) {
              errors.push(`keyframe value ${n} has more than 2 decimals at ${path.join('.')}`);
              break;
            }
          }
        }
        if (key === 'o') {
          // flash check: count big opposing swings inside any 1 s window
          const series = [];
          for (let t = 0; t <= op; t++) series.push(evalAt(node, t)[0]);
          const ext = [];
          for (let t = 1; t < series.length - 1; t++) {
            if ((series[t] - series[t - 1]) * (series[t + 1] - series[t]) < 0) ext.push([t, series[t]]);
          }
          const swings = [];
          for (let j = 1; j < ext.length; j++) if (Math.abs(ext[j][1] - ext[j - 1][1]) >= 20) swings.push(ext[j][0]);
          for (let j = 0; j < swings.length; j++) {
            const inWin = swings.filter((t) => t >= swings[j] && t < swings[j] + 30).length;
            if (inWin > 6) {
              errors.push(`opacity flashes more than 3x/s at ${path.join('.')}`);
              break;
            }
          }
        }
      }
    }
  });

  // palette fills
  if (palette) {
    palette.forEach((c, idx) => {
      const nm = `pal_${idx + 1}`;
      if (!pal.has(nm)) {
        errors.push(`no fill named ${nm}`);
        return;
      }
      const want = rgb(c);
      for (const got of pal.get(nm)) {
        if (!got) continue;
        const d = Math.max(...want.map((x, j) => Math.abs(x - got[j])));
        if (d > 0.002) errors.push(`${nm} colour differs from palette ${c}`);
      }
    });
  }

  if (budget) {
    if (vertices > budget.vertices) warnings.push(`${vertices} path vertices > budget ${budget.vertices}`);
    if (stroked > budget.stroked) warnings.push(`${stroked} stroked vertices > budget ${budget.stroked}`);
    if (draws > budget.draws) warnings.push(`${draws} fill/stroke draws > budget ${budget.draws}`);
    if (gradients > budget.gradients) warnings.push(`${gradients} gradients > budget ${budget.gradients}`);
    if (animated > budget.animated) warnings.push(`${animated} animated properties > budget ${budget.animated}`);
  }

  return {
    errors,
    warnings,
    stats: {
      bytes,
      kb: +(bytes / 1024).toFixed(1),
      layers: all.length,
      shapes,
      vertices,
      stroked,
      draws,
      gradients,
      animated,
      palette: [...pal.keys()].sort(),
    },
  };
}
