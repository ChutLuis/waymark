// 05 · Italy, Positano: sunny midday on the Amalfi Coast.
// Seen from a hotel terrace across the bay, framed by a whitewashed pergola
// with bougainvillea spilling from the beam and a lemon branch: the town
// cascades down its steep V-shaped ravine to the Spiaggia Grande, the
// majolica dome of Santa Maria Assunta right above the umbrellas, Lattari
// limestone crags behind, the Saracen tower on the eastern point, boats on
// the bay.

import { mix } from '../lib/color.mjs';
import { blob, clipConvex, ellipsePath, jaggedLine, poly, rng, smooth, svg1 } from '../lib/geom.mjs';
import { composition, cycle, el, fl, gr, keys, osc, sh, shapeLayer, stack } from '../lib/lottie.mjs';
import { florets, ink, leafRib, leafShape, limb, mergeFlorets, paint, palette, skyLines, stippleG, vGradientRect } from '../lib/art.mjs';

const P = palette(['#F4D03F', '#1F6FB2', '#C2357A', '#3E8A5F', '#FBF6EA']);
const [LIMONE, TIRRENO, BOUG, VERDE, CALCE] = P.list;
const SKY_TOP = '#8CC4EA';
const SKY_LOW = '#E4F2F9';
const HAZE = '#DCEAF2';
const SHADOW = '#3B4A6B';
const PASTELS = ['#F2C4A0', '#F5D9A8', '#EFB7A2', '#F7E7C4', '#E9A87E', '#F4CFC7', '#F1D58E', '#E8BFA0', CALCE, CALCE];
const LIME = { lit: '#F1ECE2', base: mix('#D6CDBC', HAZE, 0.15), shade: mix('#9E9588', SHADOW, 0.18), dark: mix('#6E665C', SHADOW, 0.25) };
const MAQUIS = mix(VERDE, '#55663F', 0.35);
const MAQUIS_DARK = mix(VERDE, '#1E3A2A', 0.45);
const WINDOW = mix(SHADOW, '#1E2433', 0.45);

// the ravine: a V from the top of the town down to the beach
const SHORE = 380;
const V = { top: 132, xl: 236, xr: 592, bl: 318, br: 522, bottom: 362 };
const leftEdge = (y) => V.xl + ((y - V.top) * (V.bl - V.xl)) / (V.bottom - V.top);
const rightEdge = (y) => V.xr - ((y - V.top) * (V.xr - V.br)) / (V.bottom - V.top);

// the near massif's ridge, shared by the mountains and the ravine flanks
const NEAR = jaggedLine([[-10, 150], [60, 118], [140, 100], [220, 110], [300, 116], [372, 114], [440, 112], [510, 118], [590, 122], [660, 138], [730, 160], [810, 190]], { depth: 3, rough: 0.22, seed: 5 });
const ridgeY = (x) => {
  for (let k = 0; k < NEAR.length - 1; k++) {
    const [x0, y0] = NEAR[k];
    const [x1, y1] = NEAR[k + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return NEAR[NEAR.length - 1][1];
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

/* ------------------------------------------------------------------ */
/* Sky and the Lattari mountains                                        */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [1, SKY_LOW]], { y0: 0, y1: 260 }),
    skyLines('engraving', { y0: 54, y1: 140, color: '#5E9CC8', o: 24, seed: 38 }),
  ]);
}

function mountains() {
  const far = jaggedLine([[-10, 110], [90, 92], [200, 100], [300, 88], [400, 98], [480, 86], [560, 96], [640, 90], [720, 108], [810, 122]], { depth: 3, rough: 0.2, seed: 3 });
  const farShape = poly([...far, [810, 300], [-10, 300]]);
  const nearShape = poly([...NEAR, [810, 400], [-10, 400]]);
  return shapeLayer('far_mountains', [
    paint('far_ridge', farShape, mix(mix(VERDE, '#7E8FA8', 0.6), HAZE, 0.58)),
    paint('near_massif', nearShape, mix(MAQUIS, HAZE, 0.3)),
    stippleG('maquis', nearShape, { color: mix(MAQUIS_DARK, HAZE, 0.25), o: 45, count: 70, minDist: 8, seed: 4 }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Headlands: limestone sea cliffs either side of the bay                */
/* ------------------------------------------------------------------ */

function headlands() {
  const left = poly([...jaggedLine([[-10, 300], [60, 306], [140, 322], [220, 340], [282, 356], [V.bl - 4, 366]], { depth: 2, rough: 0.3, seed: 7 }), [V.bl + 4, SHORE + 4], [-10, SHORE + 4]]);
  const right = poly([[V.br - 6, 368], ...jaggedLine([[V.br + 8, 358], [600, 344], [680, 330], [736, 318], [810, 306]], { depth: 2, rough: 0.3, seed: 8 }), [810, SHORE + 4], [V.br - 10, SHORE + 4]]);
  // cliff faces in planes, maquis on the tops
  const r = rng(17);
  const planesL = [];
  const planesD = [];
  for (const [shape, x0, x1] of [[left, -10, V.bl], [right, V.br, 810]]) {
    let x = x0;
    while (x < x1) {
      const w = r.range(30, 56);
      const quad = [[x, 280], [x + w * 0.55, 280], [x + w * 0.55 + r.range(-8, 8), 400], [x + r.range(-8, 8), 400]];
      const piece = clipConvex(shape.v, quad);
      if (piece.length) (r.next() < 0.5 ? planesL : planesD).push(poly(piece));
      x += w;
    }
  }
  const topsL = poly([...jaggedLine([[-10, 300], [60, 306], [140, 322], [220, 340], [282, 356], [V.bl - 4, 366]], { depth: 2, rough: 0.3, seed: 7 }).map(([x, y]) => [x, y - 1.6]), ...[[V.bl - 6, 370], [282, 362], [220, 348], [140, 332], [60, 318], [-10, 314]]]);
  const topsR = poly([...jaggedLine([[V.br + 8, 358], [600, 344], [680, 330], [736, 318], [810, 306]], { depth: 2, rough: 0.3, seed: 8 }).map(([x, y]) => [x, y - 1.6]), [810, 318], [736, 330], [680, 340], [600, 354], [V.br + 8, 368]]);
  // Torre Trasita, the Saracen watchtower on the eastern point
  // the rocky point under the tower, jutting into the bay
  // an angular wedge running off the east flank into the sea
  const point = poly([[812, 292], [764, 302], [720, 318], [688, 338], [674, 356], [676, 386], [812, 386]]);
  const pointLit = [[812, 292], [764, 302], [720, 318], [688, 338], [674, 356], [688, 356], [726, 332], [770, 316], [812, 306]];
  const pointSea = [[676, 372], [812, 372], [812, 386], [676, 386]];
  const tx = 702;
  const ty = 336;
  const tower = poly([[tx - 11, ty - 32], [tx + 11, ty - 32], [tx + 12, ty + 3], [tx - 12, ty + 3]]);
  const towerShade = poly([[tx + 3.5, ty - 32], [tx + 11, ty - 32], [tx + 12, ty + 3], [tx + 3.5, ty + 3]]);
  const merlons = [-11, -4.6, 1.8, 8].map((dx) => poly([[tx + dx, ty - 36.5], [tx + dx + 3.2, ty - 36.5], [tx + dx + 3.2, ty - 32], [tx + dx, ty - 32]]));
  const slit = poly([[tx - 2.6, ty - 22], [tx - 0.8, ty - 22], [tx - 0.8, ty - 13], [tx - 2.6, ty - 13]]);
  return shapeLayer('fg_headlands', [
    paint('cliffs', [left, right], LIME.base),
    paint('cliff_lit', planesL, LIME.lit),
    paint('cliff_shade', planesD, LIME.shade, { o: 80 }),
    paint('cliff_tops', [topsL, topsR], MAQUIS),
    stippleG('cliff_scrub', [topsL, topsR], { color: MAQUIS_DARK, o: 60, count: 24, minDist: 7, seed: 9 }),
    paint('point', point, '#A39B8E'),
    paint('point_lit', poly(pointLit), '#B9B2A4'),
    paint('point_sea_face', poly(pointSea), '#8F877C'),
    paint('point_tufts', [[784, 300, 9, 3.4], [742, 312, 7, 3], [716, 324, 6, 2.6]].map(([x, y, rx, ry], k) => blob(x, y, rx, ry, { n: 7, jitter: 0.25, seed: 300 + k })), MAQUIS),
    paint('tower', [tower, ...merlons], '#E6DCC8'),
    paint('tower_shade', towerShade, mix('#E6DCC8', SHADOW, 0.3)),
    paint('tower_slit', slit, WINDOW),
  ]);
}

/* ------------------------------------------------------------------ */
/* The town: houses cascading down the ravine                           */
/* ------------------------------------------------------------------ */

const CHURCH = { cx: 399, base: 362 };

function town() {
  const r = rng(11);
  const rows = [];
  const gardens = [];
  const NROWS = 10;
  for (let row = 0; row < NROWS; row++) {
    const t = row / (NROWS - 1);
    const y = 150 + row * 22.6;
    const s = 0.74 + 0.56 * t;
    const x0 = leftEdge(y) + 3;
    const x1 = rightEdge(y) - 3;
    const colors = [r.pick(PASTELS), r.pick(PASTELS), r.pick(PASTELS), CALCE];
    const houses = [];
    let x = x0 + r.range(-8, 2);
    while (x < x1 - 10 * s) {
      const w = Math.min(r.range(26, 54) * s, x1 - x + 4);
      // leave the church and its garden backdrop clear
      if (y > 252 && x + w > CHURCH.cx - 46 && x < CHURCH.cx + 44) {
        x = CHURCH.cx + 44;
        continue;
      }
      // the top rows thin out into the hillside, leaving a ragged top edge
      if (r.next() < (row < 2 ? 0.48 : 0.22 - 0.12 * t)) {
        gardens.push([x + w / 2, y - 9 * s, w * r.range(0.35, 0.6), r.range(6, 10) * s]);
        x += w * 0.8;
        continue;
      }
      const h = r.range(18, 36) * s;
      const roll = r.next();
      houses.push({ x, y: y + r.range(-9, 9) * s, w, h, s, color: colors[r.int(0, 3)], roof: roll < 0.16 ? 'vault' : roll < 0.24 ? 'dome' : roll < 0.3 ? 'pergola' : 'flat', shutters: row > 3 && r.next() < 0.4, wins: row < 4 ? 1 : 2 });
      x += w + r.range(-4, 1.5) * s;
    }
    rows.push({ houses, colors });
  }
  const groups = [];
  rows.forEach(({ houses }, k) => {
    const fronts = new Map();
    const sides = [];
    const roofs = [];
    const vaults = [];
    const vaultShade = [];
    const wins = [];
    const shut = [];
    const pergolas = [];
    const vines = [];
    for (const hs of houses) {
      const { x, y, w, h, s, color } = hs;
      fronts.set(color, [...(fronts.get(color) ?? []), poly([[x, y - h], [x + w, y - h], [x + w, y], [x, y]])]);
      // the side towards the ravine shows, in shade
      const left = x + w / 2 < CHURCH.cx;
      const sw = w * 0.2;
      sides.push(left ? poly([[x + w, y - h], [x + w + sw, y - h - sw * 0.25], [x + w + sw, y - sw * 0.25], [x + w, y]]) : poly([[x, y - h], [x - sw, y - h - sw * 0.25], [x - sw, y - sw * 0.25], [x, y]]));
      roofs.push(poly([[x - 0.8, y - h - 2 * s], [x + w + 0.8, y - h - 2 * s], [x + w + 0.8, y - h], [x - 0.8, y - h]]));
      if (hs.roof === 'vault') {
        vaults.push(svg1(`M ${x + 1} ${y - h - 2 * s} C ${x + 1} ${y - h - 9 * s} ${x + w - 1} ${y - h - 9 * s} ${x + w - 1} ${y - h - 2 * s} Z`));
        vaultShade.push(svg1(`M ${x + w * 0.62} ${y - h - 7.4 * s} C ${x + w * 0.85} ${y - h - 6.6 * s} ${x + w - 1} ${y - h - 5 * s} ${x + w - 1} ${y - h - 2 * s} L ${x + w * 0.7} ${y - h - 2 * s} Z`));
      } else if (hs.roof === 'dome') {
        const cx = x + w * 0.5;
        const rr = Math.min(w * 0.22, 6 * s);
        vaults.push(svg1(`M ${cx - rr} ${y - h - 2 * s} C ${cx - rr} ${y - h - 2 * s - rr * 1.3} ${cx + rr} ${y - h - 2 * s - rr * 1.3} ${cx + rr} ${y - h - 2 * s} Z`));
        vaultShade.push(svg1(`M ${cx + rr * 0.2} ${y - h - 2 * s - rr * 0.95} C ${cx + rr * 0.7} ${y - h - 2 * s - rr * 0.8} ${cx + rr} ${y - h - 2 * s - rr * 0.4} ${cx + rr} ${y - h - 2 * s} L ${cx + rr * 0.3} ${y - h - 2 * s} Z`));
      } else if (hs.roof === 'pergola') {
        const py = y - h - 2 * s;
        pergolas.push(poly([[x + 2, py], [x + 2, py - 6 * s]], false), poly([[x + w - 2, py], [x + w - 2, py - 6 * s]], false), poly([[x, py - 6 * s], [x + w, py - 6 * s]], false));
        vines.push(blob(x + w * 0.5, py - 7 * s, w * 0.44, 2.8 * s, { n: 7, jitter: 0.3, seed: Math.round(x) }));
      }
      // arched windows, a door low on the bigger houses
      const nw = w > 36 * s ? hs.wins ?? 1 : 1;
      for (let j = 0; j < nw; j++) {
        const wx = x + (w * (j + 1)) / (nw + 1);
        const ww = Math.max(2.6, w * 0.14);
        const top = y - h * 0.74;
        const bot = y - h * 0.4;
        wins.push(svg1(`M ${wx - ww / 2} ${bot} L ${wx - ww / 2} ${top + ww / 2} C ${wx - ww / 2} ${top} ${wx + ww / 2} ${top} ${wx + ww / 2} ${top + ww / 2} L ${wx + ww / 2} ${bot} Z`));
        if (hs.shutters) shut.push(poly([[wx - ww * 1.25, top + 0.5], [wx - ww * 0.62, top + 0.5], [wx - ww * 0.62, bot], [wx - ww * 1.25, bot]]), poly([[wx + ww * 0.62, top + 0.5], [wx + ww * 1.25, top + 0.5], [wx + ww * 1.25, bot], [wx + ww * 0.62, bot]]));
      }
    }
    groups.push(stack(`row_${k}`, [
      ...[...fronts.entries()].map(([color, cs], j) => paint(`fronts_${j}`, cs, color, { pal: P })),
      paint('sides', sides, mix(PASTELS[k % PASTELS.length], SHADOW, 0.36)),
      paint('roof_edges', roofs, mix(CALCE, '#E8DCC6', 0.3)),
      vaults.length ? paint('vaults', vaults, CALCE) : null,
      vaultShade.length ? paint('vault_shade', vaultShade, mix(CALCE, SHADOW, 0.22)) : null,
      paint('windows', wins, WINDOW),
      shut.length ? paint('shutters', shut, VERDE, { pal: P }) : null,
      pergolas.length ? ink('pergolas', pergolas, '#6B5444', 0.9) : null,
      vines.length ? paint('vines', vines, mix(VERDE, '#2A5A3A', 0.3)) : null,
    ]));
  });
  const g = mergeFlorets(gardens.map(([x, y, rx, ry], j) => florets(x, y, rx, ry, { count: 6, r0: 2, r1: 3.4, seed: 700 + j, light: [-0.5, -0.85] })));
  // the church's garden backdrop, dark so the dome stands out
  const backdrop = mergeFlorets([florets(CHURCH.cx, 268, 66, 24, { count: 26, r0: 5, r1: 8.5, seed: 91, light: [-0.4, -0.9] })]);
  const ravine = poly([[V.xl - 12, ridgeY(V.xl) + 4], [V.xr + 12, ridgeY(V.xr) + 4], [rightEdge(SHORE) + 10, SHORE], [leftEdge(SHORE) - 10, SHORE]]);
  return shapeLayer('mid_town', [
    paint('ravine', ravine, mix(MAQUIS, '#8A7A60', 0.25)),
    paint('backdrop_shade', [...backdrop.under, ...backdrop.shade], mix(VERDE, '#173A26', 0.55)),
    paint('backdrop', backdrop.mid, mix(VERDE, '#1E3A2A', 0.3)),
    paint('backdrop_lit', backdrop.lit, VERDE, { pal: P }),
    ...groups,
    paint('garden_shade', g.shade, mix(VERDE, '#1E3A2A', 0.4)),
    paint('garden', [...g.under, ...g.mid], mix(VERDE, '#2A5A3A', 0.15)),
    paint('garden_lit', g.lit, mix(VERDE, LIMONE, 0.3)),
  ]);
}

/* ------------------------------------------------------------------ */
/* The ravine's flanks, in front of the outermost houses                */
/* ------------------------------------------------------------------ */

function flanks() {
  // inner edges hug the V with bumps that overlap the outer houses
  const innerL = jaggedLine([[V.xl + 4, ridgeY(V.xl + 4) + 6], [V.xl + 16, V.top + 30], [leftEdge(230) + 12, 230], [leftEdge(290) + 8, 290], [leftEdge(340) + 6, 340], [V.bl + 2, 372]], { depth: 2, rough: 0.5, seed: 21 }).map(([x, y], k) => [x + (k % 3 === 1 ? 7 : 0), y]);
  const innerR = jaggedLine([[V.xr - 4, ridgeY(V.xr - 4) + 6], [V.xr - 16, V.top + 30], [rightEdge(230) - 12, 230], [rightEdge(290) - 8, 290], [rightEdge(340) - 6, 340], [V.br - 2, 372]], { depth: 2, rough: 0.5, seed: 22 }).map(([x, y], k) => [x - (k % 3 === 1 ? 7 : 0), y]);
  const left = poly([...NEAR.filter(([x]) => x < V.xl + 4), ...innerL, [-10, 380]]);
  const right = poly([...innerR.slice().reverse(), ...NEAR.filter(([x]) => x > V.xr - 4), [810, 380]].reverse());
  const rr = rng(23);
  const trees = [];
  for (const [pts, dir] of [[innerL, 1], [innerR, -1]]) {
    for (let k = 2; k < pts.length - 2; k += 3) {
      const [x, y] = pts[k];
      trees.push(blob(x - dir * rr.range(4, 10), y - 4, rr.range(5, 8), rr.range(3.5, 5), { n: 8, jitter: 0.2, seed: 200 + k * dir }));
    }
  }
  // planes: a sunlit upper facet and a shaded band down the ravine side
  const under = (xs) => xs.map((x) => [x, ridgeY(x) + 7]);
  const litL = poly([...under([-10, 30, 70, 110, 150, 190]), ...ragged([[176, 160], [120, 210], [40, 250], [-10, 262]], { amp: 5, seed: 43 }).slice(0, 13)]);
  const litR = poly([...under([650, 690, 730, 770, 810]), ...ragged([[810, 250], [760, 236], [700, 210], [660, 180]], { amp: 5, seed: 44 }).slice(0, 13)]);
  const shadeL = poly([...innerL, [innerL[innerL.length - 1][0] - 34, 372], ...innerL.slice().reverse().map(([x, y]) => [x - 18 - (y - V.top) * 0.05, y])].slice(0, innerL.length * 2 + 1));
  const shadeR = poly([...innerR, [innerR[innerR.length - 1][0] + 34, 372], ...innerR.slice().reverse().map(([x, y]) => [x + 18 + (y - V.top) * 0.05, y])].slice(0, innerR.length * 2 + 1));
  const groves = [];
  const gr2 = rng(45);
  for (const [x, y] of [[60, 200], [120, 226], [90, 252], [150, 276], [690, 224], [740, 250], [672, 278], [720, 300], [200, 180], [600, 200]]) {
    groves.push(blob(x + gr2.range(-6, 6), y, gr2.range(6, 10), gr2.range(4, 6), { n: 8, jitter: 0.2, seed: x + y }));
  }
  return shapeLayer('mid_flanks', [
    paint('flanks', [left, right], MAQUIS),
    paint('flank_lit', [litL, litR], mix(MAQUIS, LIMONE, 0.22)),
    paint('flank_shade', [shadeL, shadeR], MAQUIS_DARK, { o: 70 }),
    stippleG('flank_scrub', [left, right], { color: MAQUIS_DARK, o: 50, count: 46, minDist: 8, seed: 24 }),
    paint('groves', groves, mix(VERDE, '#1E3A2A', 0.3)),
    paint('edge_trees', trees, MAQUIS_DARK),
  ]);
}

/* ------------------------------------------------------------------ */
/* Santa Maria Assunta: majolica dome, lantern, campanile                */
/* ------------------------------------------------------------------ */

function church() {
  const { cx, base } = CHURCH;
  const body = poly([[cx - 46, base - 34], [cx + 46, base - 34], [cx + 46, base], [cx - 46, base]]);
  const bodyShade = poly([[cx + 38, base - 34], [cx + 46, base - 34], [cx + 46, base], [cx + 38, base]]);
  const portal = svg1(`M ${cx - 6} ${base} L ${cx - 6} ${base - 14} C ${cx - 6} ${base - 21} ${cx + 6} ${base - 21} ${cx + 6} ${base - 14} L ${cx + 6} ${base} Z`);
  const rose = el(cx, base - 26, 7, 7);
  const drumTop = base - 54;
  const drum = poly([[cx - 30, drumTop], [cx + 30, drumTop], [cx + 30, base - 34], [cx - 30, base - 34]]);
  const drumShade = poly([[cx + 16, drumTop], [cx + 30, drumTop], [cx + 30, base - 34], [cx + 16, base - 34]]);
  const drumWins = [-17, 0, 17].map((dx) => svg1(`M ${cx + dx - 3} ${base - 38} L ${cx + dx - 3} ${base - 46} C ${cx + dx - 3} ${base - 50} ${cx + dx + 3} ${base - 50} ${cx + dx + 3} ${base - 46} L ${cx + dx + 3} ${base - 38} Z`));
  const cornice = poly([[cx - 33, drumTop - 3], [cx + 33, drumTop - 3], [cx + 33, drumTop], [cx - 33, drumTop]]);
  // the dome: big, bold diamond majolica in yellow, green and blue
  const domeW = 48;
  const domeH = 54;
  const top = drumTop - 3;
  const hw = (y) => domeW * Math.sqrt(Math.max(0, 1 - ((top - y) / domeH) ** 2));
  const green = [];
  const blue = [];
  // yellow ground with green diamonds set in it, a few blue ones
  const bands = 4;
  for (let b = 0; b < bands; b++) {
    const ya = top - (b * domeH) / bands;
    const yb = top - ((b + 1) * domeH) / bands;
    const ym = (ya + yb) / 2;
    const segs = [6, 6, 5, 3][b];
    for (let s = 0; s < segs; s++) {
      const off = b % 2 ? 0.5 : 0;
      const fa = Math.max(-1, -1 + (2 * (s + off)) / segs);
      const fb = Math.min(1, -1 + (2 * (s + off + 1)) / segs);
      if (fb - fa < 0.2) continue;
      const mid = (fa + fb) / 2;
      const k = 0.28;
      const xa = cx + (fa + (mid - fa) * k) * hw(ym);
      const xb = cx + (fb - (fb - mid) * k) * hw(ym);
      const cell = poly([[cx + mid * hw(ya), ya - (yb - ya) * -0.18], [xb, ym], [cx + mid * hw(yb), yb + (yb - ya) * -0.18], [xa, ym]]);
      (b === 1 && s % 2 === 0 ? blue : green).push(cell);
    }
  }
  const halo = svg1(`M ${cx - domeW - 3} ${top + 1} C ${cx - domeW - 3} ${top - domeH * 0.76} ${cx - domeW * 0.58} ${top - domeH - 3} ${cx} ${top - domeH - 3} C ${cx + domeW * 0.58} ${top - domeH - 3} ${cx + domeW + 3} ${top - domeH * 0.76} ${cx + domeW + 3} ${top + 1} Z`);
  const dome = svg1(`M ${cx - domeW} ${top} C ${cx - domeW} ${top - domeH * 0.74} ${cx - domeW * 0.56} ${top - domeH} ${cx} ${top - domeH} C ${cx + domeW * 0.56} ${top - domeH} ${cx + domeW} ${top - domeH * 0.74} ${cx + domeW} ${top} Z`);
  const domeShade = svg1(`M ${cx + domeW * 0.22} ${top - domeH * 0.98} C ${cx + domeW * 0.72} ${top - domeH * 0.86} ${cx + domeW} ${top - domeH * 0.5} ${cx + domeW} ${top} L ${cx + domeW * 0.5} ${top} C ${cx + domeW * 0.58} ${top - domeH * 0.5} ${cx + domeW * 0.46} ${top - domeH * 0.8} ${cx + domeW * 0.22} ${top - domeH * 0.98} Z`);
  const domeGlint = svg1(`M ${cx - domeW * 0.62} ${top - domeH * 0.3} C ${cx - domeW * 0.6} ${top - domeH * 0.66} ${cx - domeW * 0.36} ${top - domeH * 0.88} ${cx - domeW * 0.18} ${top - domeH * 0.92} C ${cx - domeW * 0.42} ${top - domeH * 0.7} ${cx - domeW * 0.5} ${top - domeH * 0.5} ${cx - domeW * 0.62} ${top - domeH * 0.3} Z`);
  const lt = top - domeH;
  const lantern = poly([[cx - 6, lt - 12], [cx + 6, lt - 12], [cx + 6, lt + 1], [cx - 6, lt + 1]]);
  const lanternShade = poly([[cx + 2, lt - 12], [cx + 6, lt - 12], [cx + 6, lt + 1], [cx + 2, lt + 1]]);
  const lanternCap = svg1(`M ${cx - 7.5} ${lt - 12} C ${cx - 6.5} ${lt - 19} ${cx + 6.5} ${lt - 19} ${cx + 7.5} ${lt - 12} Z`);
  const finial = [el(cx, lt - 18.2, 3.4, 3.4), poly([[cx - 0.8, lt - 25], [cx + 0.8, lt - 25], [cx + 0.8, lt - 19], [cx - 0.8, lt - 19]]), poly([[cx - 2.6, lt - 23.2], [cx + 2.6, lt - 23.2], [cx + 2.6, lt - 21.8], [cx - 2.6, lt - 21.8]])];
  // campanile on the piazza to the left
  const tx = cx - 66;
  const tb = base;
  const tower = poly([[tx - 10, tb - 76], [tx + 10, tb - 76], [tx + 10, tb], [tx - 10, tb]]);
  const towerShade = poly([[tx + 4, tb - 76], [tx + 10, tb - 76], [tx + 10, tb], [tx + 4, tb]]);
  const belfry = svg1(`M ${tx - 4.5} ${tb - 56} L ${tx - 4.5} ${tb - 66} C ${tx - 4.5} ${tb - 71} ${tx + 4.5} ${tb - 71} ${tx + 4.5} ${tb - 66} L ${tx + 4.5} ${tb - 56} Z`);
  const clock = el(tx, tb - 44, 7, 7);
  const cap = svg1(`M ${tx - 12} ${tb - 76} L ${tx + 12} ${tb - 76} L ${tx + 7} ${tb - 82} C ${tx + 5} ${tb - 90} ${tx - 5} ${tb - 90} ${tx - 7} ${tb - 82} Z`);
  return shapeLayer('landmark_santa_maria', [stack('church', [
    paint('tower', tower, '#F5E8CF'),
    paint('tower_shade', towerShade, mix('#F5E8CF', SHADOW, 0.3)),
    paint('belfry', belfry, WINDOW),
    paint('clock', clock, mix(TIRRENO, CALCE, 0.25)),
    paint('tower_cap', cap, mix(VERDE, LIMONE, 0.25)),
    paint('nave', body, CALCE, { pal: P }),
    paint('nave_shade', bodyShade, mix(CALCE, SHADOW, 0.12)),
    paint('portal', portal, WINDOW),
    paint('rose', rose, mix(WINDOW, TIRRENO, 0.3)),
    paint('drum', drum, '#F6EBD6'),
    paint('drum_shade', drumShade, mix('#F6EBD6', SHADOW, 0.24)),
    paint('drum_windows', drumWins, WINDOW),
    paint('cornice', cornice, CALCE, { pal: P }),
    paint('dome_halo', halo, CALCE, { pal: P }),
    paint('dome', dome, LIMONE, { pal: P }),
    paint('tiles_green', green, VERDE, { pal: P }),
    paint('tiles_blue', blue, TIRRENO, { pal: P }),
    paint('dome_shade', domeShade, SHADOW, { o: 28 }),
    paint('dome_glint', domeGlint, '#FFF8D8', { o: 55 }),
    paint('lantern', lantern, '#F6EBD6'),
    paint('lantern_shade', lanternShade, mix('#F6EBD6', SHADOW, 0.25)),
    paint('lantern_cap', lanternCap, LIMONE, { pal: P }),
    paint('finial', finial, '#C9A54A'),
  ])]);
}

/* ------------------------------------------------------------------ */
/* Spiaggia Grande, the bay, boats                                      */
/* ------------------------------------------------------------------ */

function sea() {
  const water = poly([[-10, 368], [810, 368], [810, 510], [-10, 510]]);
  const depth = vGradientRect('depth', -10, 372, 820, 140, [[0, mix(TIRRENO, '#7FC0E0', 0.42)], [1, mix(TIRRENO, '#0E2F5A', 0.3)]]);
  const r = rng(5);
  const ripples = [];
  for (let k = 0; k < 38; k++) {
    const y = r.range(390, 446);
    const f = (y - 380) / 70;
    const x = r.range(-10, 800);
    ripples.push(poly([[x, y], [x + 7 + f * 18, y]], false));
  }
  return shapeLayer('fg_sea', [paint('water', water, TIRRENO, { pal: P }), depth, ink('ripples', ripples, mix(TIRRENO, '#BFE3F5', 0.55), 1, { o: 55, cap: 2 })]);
}

function beach() {
  const yl = SHORE - 18;
  const sand = smooth([[V.bl - 20, yl - 2], [400, yl - 3], [V.br + 20, yl - 2], [V.br + 44, SHORE + 2], [400, SHORE + 9], [V.bl - 44, SHORE + 2]], { tension: 0.35 });
  const foam = smooth([[V.bl - 40, SHORE + 3], [400, SHORE + 9.6], [V.br + 40, SHORE + 3]], { closed: false, tension: 0.9 });
  // seafront promenade with arcades behind the beach
  const prom = poly([[V.bl - 2, yl - 10], [V.br + 2, yl - 10], [V.br + 2, yl + 2], [V.bl - 2, yl + 2]]);
  const arches = [];
  for (let x = V.bl + 8; x < V.br - 6; x += 15) {
    if (Math.abs(x - CHURCH.cx) < 50) continue;
    arches.push(svg1(`M ${x - 3.6} ${yl + 2} L ${x - 3.6} ${yl - 4} C ${x - 3.6} ${yl - 8.4} ${x + 3.6} ${yl - 8.4} ${x + 3.6} ${yl - 4} L ${x + 3.6} ${yl + 2} Z`));
  }
  // the pier off the east end of the beach
  // a low jetty running out from the east end of the beach
  const pier = poly([[V.br - 6, SHORE + 1], [V.br + 4, SHORE + 1], [V.br + 66, SHORE + 13], [V.br + 54, SHORE + 15]]);
  const pierSide = poly([[V.br + 54, SHORE + 15], [V.br + 66, SHORE + 13], [V.br + 66, SHORE + 16], [V.br + 54, SHORE + 18], [V.br - 6, SHORE + 4], [V.br - 6, SHORE + 1]]);
  const piles = [0.35, 0.65, 0.95].map((f) => {
    const x = V.br - 6 + 60 * f;
    const y = SHORE + 4 + 14 * f;
    return poly([[x, y], [x + 1.6, y], [x + 1.6, y + 3.4], [x, y + 3.4]]);
  });
  return shapeLayer('fg_beach', [
    paint('promenade', prom, mix(CALCE, '#E3D2B4', 0.45)),
    paint('arcades', arches, mix(WINDOW, '#5A4A3A', 0.3)),
    paint('sand', sand, '#6B625A'),
    stippleG('pebbles', sand, { color: '#8E877C', o: 55, count: 36, minDist: 4, r0: 0.5, r1: 0.9, seed: 3 }),
    ink('foam', foam, '#FFFFFF', 1.4, { o: 85 }),
    paint('pier', pier, mix(LIME.base, CALCE, 0.3)),
    paint('pier_side', pierSide, LIME.shade),
    paint('piles', piles, LIME.dark),
  ]);
}

function umbrellas() {
  const r = rng(19);
  const make = (x, y, s) => {
    const w = 20 * s;
    const h = 9 * s;
    const canopy = svg1(`M ${x - w / 2} ${y} C ${x - w / 2} ${y - h * 1.1} ${x + w / 2} ${y - h * 1.1} ${x + w / 2} ${y} Z`);
    const stripes = [];
    for (let k = 0; k < 6; k += 2) {
      const a = x - w / 2 + (w * k) / 6;
      const b = x - w / 2 + (w * (k + 1)) / 6;
      stripes.push(poly([[a, y], [x + (a - x) * 0.2, y - h * 0.86], [x + (b - x) * 0.2, y - h * 0.86], [b, y]]));
    }
    return { canopy, stripes, pole: poly([[x, y], [x, y + 8 * s]], false) };
  };
  const orange = mix(LIMONE, '#F29A2E', 0.6);
  const back = { blue: [], orange: [], stripes: [], poles: [] };
  for (let x = V.bl + 8; x < V.br - 4; x += 19 + r.range(0, 3)) {
    const u = make(x, SHORE - 7, 0.52);
    (r.next() < 0.5 ? back.blue : back.orange).push(u.canopy);
    back.stripes.push(...u.stripes);
    back.poles.push(u.pole);
  }
  const front = [];
  let k = 0;
  for (let x = V.bl + 12; x < V.br - 8; x += 25 + r.range(0, 4)) {
    const u = make(x, SHORE, 0.68);
    const blue = k++ % 2 === 0;
    front.push(stack(`umbrella_${Math.round(x)}`, [
      ink('pole', u.pole, '#5A4A3A', 0.9),
      paint('canopy', u.canopy, blue ? TIRRENO : orange, { pal: P }),
      paint('stripes', u.stripes, CALCE, { pal: P }),
    ], { a: [x, SHORE + 5.4], p: [x, SHORE + 5.4], r: cycle([-2.4, 2.4], { period: 80, phase: r.next() }) }));
  }
  return shapeLayer('fg_umbrellas', [
    stack('back_row', [ink('poles', back.poles, '#5A4A3A', 0.8), paint('blue', back.blue, TIRRENO, { pal: P }), paint('orange', back.orange, orange), paint('stripes', back.stripes, CALCE, { pal: P })]),
    ...front,
  ]);
}

function boats() {
  const boat = (x, y, s, stripe, ph) => {
    const hull = svg1(`M ${x - 22 * s} ${y - 4 * s} L ${x + 22 * s} ${y - 4 * s} C ${x + 20 * s} ${y + 2 * s} ${x + 14 * s} ${y + 5 * s} ${x + 8 * s} ${y + 5 * s} L ${x - 14 * s} ${y + 5 * s} C ${x - 19 * s} ${y + 4 * s} ${x - 22 * s} ${y} ${x - 22 * s} ${y - 4 * s} Z`);
    const band = poly([[x - 21 * s, y - 3 * s], [x + 21 * s, y - 3 * s], [x + 20.5 * s, y - 1.2 * s], [x - 21 * s, y - 1.2 * s]]);
    const cabin = poly([[x - 6 * s, y - 4 * s], [x + 4 * s, y - 4 * s], [x + 3 * s, y - 9 * s], [x - 5 * s, y - 9 * s]]);
    const reflection = poly([[x - 18 * s, y + 6 * s], [x + 16 * s, y + 6 * s], [x + 12 * s, y + 8 * s], [x - 14 * s, y + 8 * s]]);
    return stack(`boat_${Math.round(x)}`, [
      paint('reflection', reflection, mix(TIRRENO, CALCE, 0.25), { o: 50 }),
      paint('hull', hull, CALCE, { pal: P }),
      paint('hull_shade', svg1(`M ${x - 14 * s} ${y + 5 * s} L ${x + 8 * s} ${y + 5 * s} C ${x + 14 * s} ${y + 5 * s} ${x + 20 * s} ${y + 2 * s} ${x + 22 * s} ${y - 2 * s} L ${x + 14 * s} ${y + 1 * s} Z`), mix(CALCE, SHADOW, 0.3)),
      paint('band', band, stripe),
      paint('cabin', cabin, mix(CALCE, '#C9B79A', 0.5)),
    ], { a: [x, y], p: cycle([[x, y - 1.4], [x, y + 1.4]], { period: 80, phase: ph }), r: cycle([-2.6, 2.6], { period: 120, phase: ph + 0.3 }) });
  };
  return shapeLayer('fg_boats', [boat(176, 414, 0.72, TIRRENO, 0), boat(604, 404, 0.52, BOUG, 0.4), boat(500, 430, 0.86, '#D9472B', 0.7), boat(270, 402, 0.46, VERDE, 0.2)]);
}

function sparkles() {
  const out = [];
  const r = rng(23);
  for (let k = 0; k < 6; k++) {
    let x = r.range(60, 740);
    // keep clear of the potted lemon trees on the parapet
    while ((x > 90 && x < 150) || (x > 650 && x < 710)) x = r.range(60, 740);
    const y = r.range(392, 432);
    const s = r.range(3, 5.5);
    const star = svg1(`M ${x} ${y - s} L ${x + s * 0.22} ${y - s * 0.22} L ${x + s} ${y} L ${x + s * 0.22} ${y + s * 0.22} L ${x} ${y + s} L ${x - s * 0.22} ${y + s * 0.22} L ${x - s} ${y} L ${x - s * 0.22} ${y - s * 0.22} Z`);
    // a short burst once every 2 s, staggered: never more than 0.5 flashes per second each
    out.push(gr(`glint_${k}`, [sh(star), fl('#FFFFFF')], {
      a: [x, y],
      p: [x, y],
      s: cycle([[0, 0], [0, 0], [110, 110], [0, 0]], { period: 80, phase: r.next(), times: [0, 0.6, 0.76, 0.92], ease: ['hold', 'out', 'in', 'hold'] }),
    }));
  }
  return shapeLayer('fx_sparkles', out);
}

/* ------------------------------------------------------------------ */
/* The terrace: pergola beam and columns, majolica parapet               */
/* ------------------------------------------------------------------ */

function pergola() {
  const wood = mix('#E6D6B8', CALCE, 0.35);
  const woodShade = mix('#C9B28C', SHADOW, 0.12);
  const beam = poly([[-10, 92], [810, 92], [810, 108], [-10, 108]]);
  const beamShade = poly([[-10, 104], [810, 104], [810, 108], [-10, 108]]);
  // rafters running back over our heads, converging on the centre
  const rafters = [];
  const rafterSides = [];
  for (const x of [52, 208, 400, 592, 748]) {
    const k = (x - 400) * 0.1;
    rafters.push(poly([[x - 6, 92], [x + 6, 92], [x + 13 + k * 2, -2], [x - 13 + k * 2, -2]]));
    rafterSides.push(x < 400 ? poly([[x + 6, 92], [x + 9, 92], [x + 18 + k * 2, -2], [x + 13 + k * 2, -2]]) : poly([[x - 9, 92], [x - 6, 92], [x - 13 + k * 2, -2], [x - 18 + k * 2, -2]]));
  }
  const colL = poly([[-6, 104], [30, 104], [30, 440], [-6, 440]]);
  const colR = poly([[770, 104], [806, 104], [806, 440], [770, 440]]);
  const colShade = [poly([[22, 104], [30, 104], [30, 440], [22, 440]]), poly([[770, 104], [778, 104], [778, 440], [770, 440]])];
  // parapet with a majolica tile band
  const cap = poly([[-10, 436], [810, 436], [810, 454], [-10, 454]]);
  const capEdge = poly([[-10, 450], [810, 450], [810, 454], [-10, 454]]);
  const wall = poly([[-10, 454], [810, 454], [810, 510], [-10, 510]]);
  const capShade = poly([[-10, 454], [810, 454], [810, 458], [-10, 458]]);
  const floor = poly([[-10, 486], [810, 486], [810, 510], [-10, 510]]);
  const floorLines = [494, 503].map((y) => poly([[-10, y], [810, y]], false));
  const tilesY = 463;
  const tileA = [];
  const tileB = [];
  for (let x = -10, k = 0; x < 810; x += 22, k++) {
    tileA.push(poly([[x + 11, tilesY], [x + 22, tilesY + 7], [x + 11, tilesY + 14], [x, tilesY + 7]]));
    if (k % 2 === 0) tileB.push(el(x + 11, tilesY + 7, 5, 5));
  }
  const tileBand = poly([[-10, tilesY], [810, tilesY], [810, tilesY + 14], [-10, tilesY + 14]]);
  // terracotta pots with lemon trees on the parapet
  const pots = [];
  const potShade = [];
  const crowns = [];
  const fruit = [];
  const potFeet = [];
  for (const [x, s] of [[120, 1], [688, 0.92]]) {
    const yb = 446;
    potFeet.push(el(x + 3 * s, yb + 0.5, 34 * s, 5 * s));
    pots.push(poly([[x - 11 * s, yb], [x + 11 * s, yb], [x + 13 * s, yb - 20 * s], [x - 13 * s, yb - 20 * s]]));
    potShade.push(poly([[x + 4 * s, yb], [x + 11 * s, yb], [x + 13 * s, yb - 20 * s], [x + 5 * s, yb - 20 * s]]));
    crowns.push(blob(x, yb - 36 * s, 17 * s, 13 * s, { n: 10, jitter: 0.16, seed: Math.round(x) }));
    for (const [dx, dy] of [[-8, -32], [6, -40], [9, -29], [-3, -44], [-11, -40]]) fruit.push(el(x + dx * s, yb + dy * s, 4.6 * s, 5.4 * s));
  }
  return shapeLayer('fg_pergola', [
    paint('wall', wall, mix(CALCE, '#E9DFCB', 0.5)),
    paint('tile_band', tileBand, mix(LIMONE, CALCE, 0.45)),
    paint('tiles', tileA, TIRRENO, { pal: P }),
    paint('tile_dots', tileB, LIMONE, { pal: P }),
    paint('floor', floor, '#C9744A'),
    ink('floor_joints', floorLines, mix('#C9744A', SHADOW, 0.35), 1, { o: 60 }),
    paint('cap', cap, CALCE, { pal: P }),
    paint('cap_edge', capEdge, mix(CALCE, '#E3D6BE', 0.6)),
    paint('cap_shade', capShade, mix(CALCE, SHADOW, 0.3)),
    paint('pot_feet', potFeet, SHADOW, { o: 28 }),
    paint('pots', pots, '#C8643C'),
    paint('pot_shade', potShade, mix('#C8643C', SHADOW, 0.3)),
    paint('lemon_crowns', crowns, mix(VERDE, '#1E3A2A', 0.2)),
    paint('lemons_potted', fruit, LIMONE, { pal: P }),
    paint('columns', [colL, colR], CALCE, { pal: P }),
    paint('column_shade', colShade, mix(CALCE, SHADOW, 0.2)),
    paint('rafters', rafters, wood),
    paint('rafter_sides', rafterSides, woodShade),
    paint('beam', beam, wood),
    paint('beam_shade', beamShade, woodShade),
  ]);
}

/* ------------------------------------------------------------------ */
/* Bougainvillea spilling off the beam, lemon branch, gulls             */
/* ------------------------------------------------------------------ */

function bougainvillea() {
  const L = [-0.55, -0.83];
  const stems = [limb([[-10, 40], [40, 44], [96, 52], [150, 50], [210, 46]], 5, 1.6), limb([[14, 44], [20, 96], [16, 160], [22, 230], [18, 300]], 5, 1.4), limb([[96, 52], [106, 86], [112, 120]], 3.4, 1.2)];
  const clusters = [
    [30, 52, 30, 16, 22], [80, 60, 26, 15, 18], [130, 58, 24, 13, 16], [184, 52, 18, 10, 11], [110, 104, 14, 16, 12],
    [14, 100, 20, 22, 16], [22, 160, 18, 20, 14], [16, 224, 16, 20, 12], [22, 286, 13, 16, 9], [52, 76, 16, 14, 12],
  ].map(([x, y, rx, ry, n], j) => florets(x, y, rx, ry, { count: n, r0: 2.6, r1: 4.8, seed: 40 + j, light: L }));
  const f = mergeFlorets(clusters);
  const leaves = [];
  const lr = rng(8);
  for (let k = 0; k < 14; k++) {
    const x = k < 8 ? lr.range(0, 200) : lr.range(4, 40);
    const y = k < 8 ? lr.range(46, 90) : lr.range(90, 300);
    leaves.push(leafShape([x, y], [x + lr.range(-10, 10), y + lr.range(8, 14)], 6));
  }
  return shapeLayer('fg_bougainvillea', [stack('vine', [
    paint('stems', stems, '#5A4034'),
    paint('leaves', leaves, mix(VERDE, '#1E3A2A', 0.35)),
    paint('bract_under', f.under, mix(BOUG, '#5A1030', 0.45)),
    paint('bract_shade', f.shade, mix(BOUG, '#5A1030', 0.25)),
    paint('bract', f.mid, BOUG, { pal: P }),
    paint('bract_lit', f.lit, mix(BOUG, '#FF9CC8', 0.4)),
  ], { a: [0, 40], p: [0, 102], r: osc(-0.8, 0.8, { period: 240, phase: 0.2 }) })]);
}

function lemonBranch() {
  const twig = limb([[820, 40], [770, 54], [722, 72], [684, 96], [660, 122]], 8, 2);
  const leafDefs = [
    [790, 50, 760, 84, 0.1], [756, 60, 726, 42, -0.12], [730, 68, 704, 102, 0.12], [706, 82, 690, 56, -0.1], [688, 94, 660, 118, 0.12],
    [674, 108, 648, 98, -0.1], [804, 46, 812, 84, 0.08], [742, 64, 748, 100, -0.06], [664, 118, 654, 148, 0.1],
  ];
  const leaves = [];
  const leavesLit = [];
  const ribs = [];
  leafDefs.forEach(([x0, y0, x1, y1, b], k) => {
    const leaf = leafShape([x0, y0], [x1, y1], 13, { bend: b });
    const g = gr(`leaf_${k}`, [sh(leaf), fl(k % 3 === 0 ? mix(VERDE, '#A5C96A', 0.25) : mix(VERDE, '#173A26', 0.35))], { a: [x0, y0], p: [x0, y0], r: cycle([-3, 3], { period: 60, phase: k * 0.13 }) });
    (k % 3 === 0 ? leavesLit : leaves).push(g);
    ribs.push(poly(leafRib([x0, y0], [x1, y1], { bend: b }), false));
  });
  const lemon = (x, y, s) => svg1(`M ${x} ${y - 13 * s} C ${x + 3 * s} ${y - 12 * s} ${x + 10 * s} ${y - 8 * s} ${x + 10 * s} ${y} C ${x + 10 * s} ${y + 8 * s} ${x + 4 * s} ${y + 12 * s} ${x} ${y + 13 * s} C ${x - 4 * s} ${y + 12 * s} ${x - 10 * s} ${y + 8 * s} ${x - 10 * s} ${y} C ${x - 10 * s} ${y - 8 * s} ${x - 3 * s} ${y - 12 * s} ${x} ${y - 13 * s} Z`);
  const lemons = [[728, 100, 1], [704, 112, 0.9], [762, 84, 0.95], [678, 134, 0.85]];
  return shapeLayer('fg_lemon_branch', [stack('branch', [
    ...leaves,
    paint('twig', twig, '#5C4A32'),
    ...leavesLit,
    ink('ribs', ribs, mix(VERDE, '#E6F0B0', 0.4), 0.8, { o: 60 }),
    paint('lemons', lemons.map(([x, y, s]) => lemon(x, y, s)), LIMONE, { pal: P }),
    paint('lemon_shade', lemons.map(([x, y, s]) => ellipsePath(x + 3 * s, y + 4 * s, 6 * s, 8 * s)), mix(LIMONE, '#B8860B', 0.35), { o: 70 }),
    paint('lemon_glint', lemons.map(([x, y, s]) => el(x - 4 * s, y - 5 * s, 4 * s, 6 * s)), '#FFF6C2'),
  ], { a: [820, 40], p: [820, 102], r: osc(1.2, -1.2, { period: 240, phase: 0.3 }) })]);
}

function gulls() {
  const gull = (s) => svg1(`M ${-12 * s} ${-3 * s} C ${-8 * s} ${-6 * s} ${-4 * s} ${-5 * s} 0 0 C ${4 * s} ${-5 * s} ${8 * s} ${-6 * s} ${12 * s} ${-3 * s} C ${8 * s} ${-3.5 * s} ${4 * s} ${-2 * s} 0 ${2 * s} C ${-4 * s} ${-2 * s} ${-8 * s} ${-3.5 * s} ${-12 * s} ${-3 * s} Z`);
  const one = (s, dy, phase) =>
    stack('gull', [gr('wings', [sh(gull(s)), fl('#FFFFFF')], { s: cycle([[100, 100], [100, 55]], { period: 30, phase }) }), paint('wing_tips', [el(-11 * s, -3 * s, 2.4 * s, 1.6 * s), el(11 * s, -3 * s, 2.4 * s, 1.6 * s)], '#3A3A44')], { p: [0, dy] });
  // they glide off into the distance over the bay, then a new pair arrives from the right
  const away = stack('distance', [one(1, 0, 0), one(0.8, 18, 0.4)], {
    s: keys([{ t: 0, v: [100, 100], e: 'linear' }, { t: 90, v: [70, 70], e: 'in' }, { t: 150, v: [0, 0], e: 'hold' }, { t: 170, v: [100, 100], e: 'hold' }, { t: 240, v: [100, 100] }]),
  });
  const flock = stack('pair', [away], {
    p: keys([{ t: 0, v: [620, 176], e: 'linear' }, { t: 150, v: [250, 150], e: 'hold' }, { t: 170, v: [900, 150], e: 'linear' }, { t: 240, v: [620, 176] }]),
  });
  return shapeLayer('fx_gulls', [flock]);
}

/* ------------------------------------------------------------------ */

export default {
  id: '05-italy-positano',
  palette: P.list,
  build() {
    return composition({
      nm: 'Waymark · Italy, Positano',
      layers: [sky(), mountains(), town(), flanks(), church(), sea(), beach(), headlands(), umbrellas(), sparkles(), boats(), pergola(), bougainvillea(), lemonBranch(), gulls()],
    });
  },
};
