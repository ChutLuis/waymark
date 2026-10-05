// 01 · Japan, Kyoto: sakura season, soft spring morning.
// Looking up the gravel path into the Senbon Torii at Fushimi Inari, low pale
// sun at the end of the tunnel, sugi cedars on Inari-yama, Yasaka pagoda in
// the haze, a stone toro and azaleas, sakura branches framing the top.

import { mix } from '../lib/color.mjs';
import { blob, ellipsePath, mirrorX, poly, rectPath, ridge, rng, svg1 } from '../lib/geom.mjs';
import { composition, cycle, drift, el, gf, gr, keys, osc, sh, shapeLayer, stack } from '../lib/lottie.mjs';
import { canopy, florets, flowerPath, glow, hatchG, limb, mergeFlorets, paint, palette, skyLines, stippleG, vGradientRect } from '../lib/art.mjs';

const P = palette(['#F2B7C5', '#D9472B', '#2B2023', '#7E9461', '#F7EFE4']);
const [SAKURA, SHU, SUMI, MATCHA, WASHI] = P.list;
const SKY_TOP = '#F6CDD3';
const SKY_LOW = '#FFF4EA';
const HAZE = '#FCE7E1';
const SUNLIT = '#FFF1E2';
const SUN = [436, 236];
const sunSide = (x) => (SUN[0] > x ? 1 : -1);

const BLOSSOM = {
  under: mix(SAKURA, '#9E5C73', 0.5),
  shade: mix(SAKURA, '#B4677F', 0.32),
  mid: SAKURA,
  lit: mix(SAKURA, '#FFFFFF', 0.5),
  eye: mix(SAKURA, SHU, 0.55),
  wood: mix(SUMI, '#4A2E2E', 0.25),
  woodHi: mix(SUMI, '#C9897E', 0.42),
};

/* ------------------------------------------------------------------ */
/* Perspective: gates recede up the hill towards a vanishing point.     */
/* ------------------------------------------------------------------ */

const VP = [418, 258];
const depth = (k) => 1 + 0.42 * k;
const groundY = (z) => VP[1] + 226 / z;
const centerX = (z) => VP[0] + (400 - VP[0]) / z + 26 * Math.max(0, 1 - 1 / z) ** 1.5;
const pathHalf = (z) => 116 / z;
const GATES = 8;

/* ------------------------------------------------------------------ */
/* Torii, unit geometry: centred on x = 0, ground at y = 0, 336 tall.   */
/* ------------------------------------------------------------------ */

function beam(y0, th, L, lift, cut = 0) {
  const Lb = L - cut;
  return svg1(
    `M ${-L} ${y0 - lift} C ${-L * 0.8} ${y0 - lift * 0.18} ${-L * 0.45} ${y0} 0 ${y0} ` +
      `C ${L * 0.45} ${y0} ${L * 0.8} ${y0 - lift * 0.18} ${L} ${y0 - lift} ` +
      `L ${Lb} ${y0 + th - lift} C ${Lb * 0.8} ${y0 + th - lift * 0.2} ${Lb * 0.45} ${y0 + th} 0 ${y0 + th} ` +
      `C ${-Lb * 0.45} ${y0 + th} ${-Lb * 0.8} ${y0 + th - lift * 0.2} ${-Lb} ${y0 + th - lift} Z`,
  );
}

const both = (c) => [c, mirrorX(c, 0)];

const T = {
  kasagi: beam(-336, 21, 197, 23, 4),
  kasagiHi: beam(-336, 3.2, 195, 23, 1),
  shimaki: beam(-318, 17, 178, 13),
  shimakiShade: beam(-318, 5, 178, 13),
  nuki: rectPath(-160, -262, 320, 17),
  nukiShade: rectPath(-160, -249, 320, 4),
  nukiHi: rectPath(-160, -262, 320, 2),
  wedges: both(rectPath(-131, -265, 6, 23)),
  strut: rectPath(-12, -302, 24, 41),
  plaque: rectPath(-8, -297, 16, 30),
  pillars: both(poly([[-124, 0], [-96, 0], [-93.5, -306], [-118.5, -306]])),
  pillarShade: both(poly([[-124, 0], [-111, 0], [-107, -306], [-118.5, -306]])),
  pillarLight: both(poly([[-101.5, 0], [-97.5, 0], [-95, -306], [-98.5, -306]])),
  collars: both(svg1('M -127.5 0 L -127.5 -24 C -127.5 -28 -123 -29 -110 -29 C -97 -29 -92.5 -28 -92.5 -24 L -92.5 0 Z')),
  collarLight: both(svg1('M -101 0 L -101 -26 C -98 -26.5 -96 -26 -95.5 -24.5 L -95.5 0 Z')),
  daiwa: both(rectPath(-121.5, -307, 31, 7)),
};

function gateColors(h) {
  const hz = (c) => mix(c, SUNLIT, h);
  return {
    red: hz(SHU),
    shade: hz(mix(SHU, SUMI, 0.3)),
    deep: hz(mix(SHU, SUMI, 0.55)),
    light: hz(mix(SHU, '#FFD7AE', 0.42)),
    black: hz(SUMI),
    blackHi: hz(mix(SUMI, '#E7B4A4', 0.5)),
  };
}

function gate(k) {
  const z = depth(k);
  const s = 1 / z;
  const h = Math.min(0.66, 0.08 * k + (k > 4 ? 0.04 * (k - 4) : 0));
  const c = gateColors(h);
  const near = k <= 1;
  const groups = [
    paint('pillars', T.pillars, c.red, { pal: P }),
    paint('pillar_shade', T.pillarShade, c.shade),
    near && hatchG('pillar_hatch', T.pillarShade, { color: c.deep, angle: 72, spacing: 3.4, w: 0.8, o: 60, seed: k }),
    paint('pillar_light', T.pillarLight, c.light),
    paint('collars', T.collars, c.black, { pal: P }),
    near && paint('collar_light', T.collarLight, c.blackHi),
    paint('daiwa', T.daiwa, c.black, { pal: P }),
    paint('nuki', T.nuki, c.red, { pal: P }),
    paint('nuki_shade', T.nukiShade, c.shade),
    k < 4 && paint('nuki_hi', T.nukiHi, c.light),
    k < 4 && paint('wedges', T.wedges, c.deep),
    paint('strut', T.strut, c.red, { pal: P }),
    k < 4 && paint('plaque', T.plaque, c.shade),
    paint('shimaki', T.shimaki, c.red, { pal: P }),
    paint('shimaki_shade', T.shimakiShade, c.deep),
    paint('kasagi', T.kasagi, c.black, { pal: P }),
    paint('kasagi_hi', T.kasagiHi, c.blackHi),
  ];
  return stack(`gate_${k}`, groups, { p: [centerX(z), groundY(z)], s: [100 * s, 100 * s] });
}

/* ------------------------------------------------------------------ */
/* Sky, hills, pagoda, mist                                            */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [0.55, '#FCE2DD'], [1, SKY_LOW]], { y0: 0, y1: 300 }),
    skyLines('engraving', { y0: 2, y1: 166, color: '#E3A4B6', o: 32, seed: 10 }),
    glow('sun_halo', SUN[0], SUN[1], 330, 250, '#FFF6EA', { alpha: 0.95, mid: 0.5 }),
    glow('sun_bloom', SUN[0], SUN[1], 95, 95, '#FFFDF7', { alpha: 1, mid: 0.7 }),
    paint('sun', ellipsePath(SUN[0], SUN[1], 27, 27), '#FFFCF5'),
  ]);
}

function farHills() {
  const a = ridge([[-10, 214], [70, 198], [150, 210], [240, 186], [330, 204], [430, 197], [520, 180], [610, 197], [700, 186], [810, 202]], 330);
  const b = ridge([[-10, 246], [90, 230], [180, 241], [270, 222], [360, 240], [460, 236], [560, 219], [660, 233], [740, 226], [810, 236]], 330);
  const lilac = '#9C93B8';
  const ca = mix(mix(MATCHA, lilac, 0.6), HAZE, 0.66);
  const cb = mix(mix(MATCHA, lilac, 0.42), HAZE, 0.5);
  return shapeLayer('far_hills', [
    paint('ridge_far', a, ca),
    hatchG('ridge_far_lines', a, { color: mix(ca, SUMI, 0.22), angle: 0, spacing: 3.6, w: 0.7, o: 30, inset: 3, offset: 1 }),
    paint('ridge_near', b, cb),
    hatchG('ridge_near_lines', b, { color: mix(cb, SUMI, 0.25), angle: 0, spacing: 3.2, w: 0.7, o: 34, inset: 3 }),
  ]);
}

function pagoda() {
  const cx = 112;
  const hz = (c) => mix(c, HAZE, 0.48);
  const roof = hz('#4C4756');
  const roofHi = hz('#8C8496');
  const under = hz('#2F2A33');
  const wall = hz('#EFE6DC');
  const wood = hz('#4A3838');
  const g = { roofs: [], roofHi: [], unders: [], walls: [], wood: [], spire: [] };
  let bottom = 300;
  for (let i = 0; i < 5; i++) {
    const R = 48 - 4 * i;
    const B = R * 0.56;
    const bodyH = i === 0 ? 22 : 15;
    const top = bottom - bodyH;
    g.walls.push(rectPath(cx - B, top, 2 * B, bodyH));
    const bay = (2 * B) / 3;
    for (let j = 0; j < 4; j++) g.wood.push(rectPath(cx - B + j * bay - 1, top, 2, bodyH));
    g.wood.push(rectPath(cx - bay / 2 + 1.5, top + 3, bay - 3, bodyH - 3));
    if (i > 0) g.wood.push(rectPath(cx - B - 3, bottom - 4, 2 * B + 6, 2.2));
    g.unders.push(rectPath(cx - B * 1.18, top, 2 * B * 1.18, 5));
    const eave = top + 6;
    const rTop = top - 7;
    const lift = 5;
    const rt = i === 4 ? 2.5 : B * 1.02;
    g.roofs.push(
      svg1(
        `M ${cx - R} ${eave - lift} C ${cx - R * 0.6} ${eave} ${cx - R * 0.3} ${eave + 0.5} ${cx} ${eave + 0.5} ` +
          `C ${cx + R * 0.3} ${eave + 0.5} ${cx + R * 0.6} ${eave} ${cx + R} ${eave - lift} ` +
          `C ${cx + R * 0.7} ${eave - lift - 2} ${cx + rt * 1.3} ${rTop + 2} ${cx + rt} ${rTop} L ${cx - rt} ${rTop} ` +
          `C ${cx - rt * 1.3} ${rTop + 2} ${cx - R * 0.7} ${eave - lift - 2} ${cx - R} ${eave - lift} Z`,
      ),
    );
    g.roofHi.push(
      svg1(`M ${cx + rt} ${rTop} C ${cx + rt * 1.3} ${rTop + 2} ${cx + R * 0.7} ${eave - lift - 2} ${cx + R} ${eave - lift} L ${cx + R * 0.55} ${eave - 2.5} C ${cx + R * 0.45} ${eave - 5} ${cx + rt * 0.9} ${rTop + 4} ${cx + rt * 0.4} ${rTop + 1} Z`),
    );
    bottom = rTop;
  }
  // sorin: base, bowl, nine rings, water-flame, jewel
  const sp = g.spire;
  sp.push(rectPath(cx - 5, bottom - 5, 10, 5));
  sp.push(ellipsePath(cx, bottom - 6.5, 4.5, 2.5));
  sp.push(rectPath(cx - 0.9, bottom - 58, 1.8, 52));
  for (let r = 0; r < 9; r++) sp.push(el(cx, bottom - 12 - r * 3.4, (4.2 - r * 0.22) * 2, 2));
  sp.push(svg1(`M ${cx} ${bottom - 54} C ${cx - 5} ${bottom - 49} ${cx - 4} ${bottom - 44} ${cx} ${bottom - 42.5} C ${cx + 4} ${bottom - 44} ${cx + 5} ${bottom - 49} ${cx} ${bottom - 54} Z`));
  sp.push(el(cx, bottom - 58.5, 3.6, 3.6));
  sp.push(svg1(`M ${cx} ${bottom - 65} C ${cx - 2.2} ${bottom - 62} ${cx - 2.6} ${bottom - 60} ${cx} ${bottom - 59.5} C ${cx + 2.6} ${bottom - 60} ${cx + 2.2} ${bottom - 62} ${cx} ${bottom - 65} Z`));
  return shapeLayer('far_pagoda', [
    paint('walls', g.walls, wall),
    paint('wood', g.wood, wood),
    paint('eave_shadow', g.unders, under),
    paint('roofs', g.roofs, roof),
    paint('roof_light', g.roofHi, roofHi),
    paint('sorin', sp, roof),
  ]);
}

function mist() {
  const items = [];
  const tile = 160;
  for (let t = -1; t < 7; t++) {
    const r = rng(41);
    for (let j = 0; j < 2; j++) {
      const x = t * tile + j * 80 + r.range(0, 20);
      const w = r.range(90, 140);
      const y = 258 + r.range(-10, 12);
      items.push(blob(x + w / 2, y, w / 2, r.range(7, 12), { n: 7, jitter: 0.15, seed: 50 + j }));
    }
  }
  return shapeLayer('far_mist', [
    vGradientRect('band', -200, 228, 1200, 70, [[0, WASHI], [1, WASHI]], { alpha: [[0, 0], [0.5, 0.8], [1, 0]] }),
    gr('wisps', [...items.map((c) => sh(c)), P.fill(WASHI, { o: 70 })], { p: drift([-160, 0], [0, 0], { period: 240 }) }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Inari-yama: treetops, sugi cedars, blossoming trees                  */
/* ------------------------------------------------------------------ */

function canopyRow(name, crowns, c, rim) {
  const lit = canopy(crowns, 420);
  const shade = canopy(
    crowns.map(([x, y, r]) => [x - sunSide(x) * r * 0.1, y + r * rim, r * 0.97]),
    420,
  );
  const hi = crowns.filter((_, j) => j % 2 === 0).map(([x, y, r]) => el(x + sunSide(x) * r * 0.28, y - r * 0.7, r * 0.6, r * 0.24));
  return stack(name, [paint('lit', lit, c.lit, { pal: P }), paint('shade', shade, c.shade), paint('hi', hi, c.hi)]);
}

/**
 * Sugi (Cryptomeria): a tall straight red-brown trunk carrying a narrow spire
 * of dense, irregular foliage clumps that alternate side to side, the trunk
 * showing between them, with a pointed leader at the top.
 */
function cedar(x, base, h, seed) {
  const r = rng(seed);
  const top = base - h;
  const crownBot = base - h * (0.34 + r.range(-0.08, 0.08));
  const sd = sunSide(x);
  const crown = [];
  const lit = [];
  const n = 6;
  for (let k = 0; k < n; k++) {
    const f = (k + 0.6) / n;
    const y = top + h * 0.05 + (crownBot - top - h * 0.05) * f ** 0.95;
    const w = h * (0.03 + 0.1 * f ** 0.9) * r.range(0.88, 1.12) * (k === n - 1 ? 0.84 : 1);
    const off = (k % 2 ? 1 : -1) * w * r.range(0.08, 0.26);
    const hh = (w * r.range(0.5, 0.6) + h * 0.02) * (k === n - 1 ? 0.78 : 1);
    crown.push(blob(x + off, y, w, hh, { n: 6, jitter: 0.24, seed: seed * 10 + k }));
    if (k % 2 === 0 || k === n - 1) lit.push(blob(x + off + sd * w * 0.32, y - hh * 0.28, w * 0.52, hh * 0.5, { n: 5, jitter: 0.25, seed: seed * 10 + k + 5 }));
  }
  crown.push(poly([[x, top - h * 0.03], [x + h * 0.03, top + h * 0.09], [x - h * 0.03, top + h * 0.09]]));
  const tw = h * 0.028;
  const trunk = limb([[x, base], [x, crownBot], [x, top + h * 0.1]], tw * 2, tw * 0.6);
  const trunkLit = limb([[x + sd * tw * 0.45, base], [x + sd * tw * 0.4, crownBot]], tw * 0.7, tw * 0.5);
  return { crown, lit, trunk, trunkLit };
}

function forest() {
  const r = rng(7);
  const green = (h) => ({
    shade: mix(mix(MATCHA, '#344236', 0.5), HAZE, h),
    lit: mix(MATCHA, HAZE, h),
    hi: mix(mix(MATCHA, '#F4EDC4', 0.55), HAZE, h),
  });
  const backTop = (x) => (x < 520 ? 290 - Math.sin((x / 520) * Math.PI) * 4 : 286 - ((x - 520) / 280) * 44);
  const back = [];
  for (let x = -30; x < 850; x += r.range(16, 25)) back.push([x, backTop(x) + r.range(-4, 4), r.range(13, 21)]);
  const left = [];
  for (let x = -24; x < 330; x += r.range(18, 27)) left.push([x, 308 + r.range(-4, 4), r.range(14, 22)]);
  // sakura in bloom among the treetops on the left
  const pink = mergeFlorets([
    florets(52, 292, 30, 20, { count: 26, r0: 2.6, r1: 4.2, seed: 61, light: [0.7, -0.7] }),
    florets(246, 290, 24, 17, { count: 20, r0: 2.4, r1: 4, seed: 62, light: [0.7, -0.7] }),
    florets(170, 302, 20, 14, { count: 16, r0: 2.4, r1: 3.8, seed: 63, light: [0.7, -0.7] }),
  ]);
  const hp = (c) => mix(c, HAZE, 0.35);
  // sugi on the rising right slope, nearer ones taller and less hazy
  const defs = [
    [508, 292, 92, 0.42],
    [552, 300, 118, 0.38],
    [598, 306, 140, 0.32],
    [646, 312, 162, 0.27],
    [702, 318, 186, 0.22],
    [758, 322, 196, 0.18],
    [806, 330, 176, 0.16],
  ];
  const cedars = defs.map(([x, b, h, hz], j) => ({ ...cedar(x, b, h, 90 + j), hz }));
  const cedarGroups = cedars.map((c, j) => {
    const hz = (col) => mix(col, HAZE, c.hz);
    return stack(`sugi_${j}`, [
      paint('trunk', c.trunk, hz('#5B3A2E')),
      paint('trunk_lit', c.trunkLit, hz('#A0614A')),
      paint('crown', c.crown, hz(mix(MATCHA, '#1E3328', 0.62))),
      paint('crown_lit', c.lit, hz(mix(MATCHA, '#2F4A36', 0.3))),
    ]);
  });
  return shapeLayer('mid_forest', [
    canopyRow('back_trees', back, green(0.46), 0.3),
    ...cedarGroups.slice(0, 3),
    canopyRow('left_treetops', left, green(0.3), 0.34),
    paint('sakura_under', pink.under, hp(BLOSSOM.under)),
    paint('sakura_shade', pink.shade, hp(BLOSSOM.shade)),
    paint('sakura_mid', pink.mid, hp(SAKURA)),
    paint('sakura_lit', pink.lit, hp(BLOSSOM.lit)),
    ...cedarGroups.slice(3),
  ]);
}

/* ------------------------------------------------------------------ */
/* Banks: moss slopes, ferns, azalea mounds, offering torii             */
/* ------------------------------------------------------------------ */

function pathEdge(side, zs) {
  return zs.map((z) => [centerX(z) + side * pathHalf(z), groundY(z)]);
}

function fern(x, y, size, dir, seed) {
  const r = rng(seed);
  const dark = [];
  const lit = [];
  for (let k = 0; k < 5; k++) {
    const a = (-148 + k * 29 + r.range(-6, 6)) * (Math.PI / 180);
    const len = size * r.range(0.75, 1.05);
    const pts = [];
    for (let s = 0; s <= 3; s++) {
      const f = s / 3;
      const bend = f * f * 0.5 * dir;
      pts.push([x + Math.cos(a + bend) * len * f, y + Math.sin(a + bend) * len * f + f * f * len * 0.25]);
    }
    (Math.cos(a) * sunSide(x) > 0.1 ? lit : dark).push(limb(pts, size * 0.17, 0.6));
  }
  return { dark, lit };
}

function tuft(x, y, s) {
  return poly([[x - 0.55 * s, y - 1.3 * s], [x - 0.1 * s, y], [x + 0.05 * s, y - 1.8 * s], [x + 0.22 * s, y], [x + 0.75 * s, y - 1.1 * s]], false);
}

function miniTorii(x, y, s, lean) {
  const items = [];
  const w = 9 * s;
  const h = 14 * s;
  const L = (dx, dy) => [x + dx + (lean * (y - (y + dy))) / h, y + dy];
  items.push(poly([L(-w / 2 - 0.9 * s, 0), L(-w / 2 + 0.9 * s, 0), L(-w / 2 + 0.8 * s, -h), L(-w / 2 - 0.8 * s, -h)]));
  items.push(poly([L(w / 2 - 0.9 * s, 0), L(w / 2 + 0.9 * s, 0), L(w / 2 + 0.8 * s, -h), L(w / 2 - 0.8 * s, -h)]));
  items.push(poly([L(-w / 2 - 2 * s, -h * 0.72), L(w / 2 + 2 * s, -h * 0.72), L(w / 2 + 2 * s, -h * 0.72 - 1.4 * s), L(-w / 2 - 2 * s, -h * 0.72 - 1.4 * s)]));
  const kasagi = poly([L(-w / 2 - 3.2 * s, -h - 0.8 * s), L(w / 2 + 3.2 * s, -h - 0.8 * s), L(w / 2 + 3.6 * s, -h - 3 * s), L(-w / 2 - 3.6 * s, -h - 3 * s)]);
  return { red: items, black: kasagi };
}

function banks() {
  const zs = [4.6, 4.2, 3.6, 3.0, 2.4, 1.8, 1.3, 1.0, 0.94];
  const L = pathEdge(-1, zs);
  const R = pathEdge(1, zs);
  const crestL = [[-10, 302], [60, 300], [120, 306], [190, 304], [260, 310], [L[0][0] - 4, L[0][1] - 1]];
  const crestR = [[R[0][0] + 4, R[0][1] - 1], [520, 304], [560, 302], [620, 296], [690, 288], [750, 282], [810, 272]];
  const leftBank = poly([...crestL, ...L, [L[L.length - 1][0], 505], [-10, 505]]);
  const rightBank = poly([...crestR, [810, 505], [R[R.length - 1][0], 505], ...R.slice().reverse()]);
  const mossTop = mix(MATCHA, '#F1E9B8', 0.34);
  const mossDeep = mix(MATCHA, '#24361F', 0.55);
  const groundFill = gf({ stops: [[0, mossTop], [0.3, mix(MATCHA, '#F1E9B8', 0.08)], [1, mossDeep]], s: [0, 290], e: [0, 500] });
  const rim = (pts, dy) => {
    const top = pts.map(([x, y]) => [x, y]);
    const bot = pts.slice().reverse().map(([x, y], k) => [x, y + dy + (k % 2 ? 3 : 0)]);
    return poly([...top, ...bot]);
  };
  const leftShade = poly([[-10, 356], [150, 360], [L[3][0] - 10, L[3][1] + 6], ...L.slice(4), [L[L.length - 1][0], 505], [-10, 505]]);
  const rightShade = poly([[R[3][0] + 10, R[3][1] + 6], [650, 346], [810, 330], [810, 505], [R[R.length - 1][0], 505], ...R.slice(4).reverse()]);
  // stone curbs along the path edges
  const curb = (side) => {
    const zz = [4.6, 3.6, 2.6, 1.9, 1.4, 1.1, 0.94];
    const outer = zz.map((z) => [centerX(z) + side * (pathHalf(z) + 7 / z), groundY(z) - 3 / z]);
    const inner = zz.map((z) => [centerX(z) + side * pathHalf(z), groundY(z)]);
    const face = zz.map((z) => [centerX(z) + side * pathHalf(z), groundY(z) + 3 / z]);
    return { top: poly([...outer, ...inner.slice().reverse()]), face: poly([...inner, ...face.slice().reverse()]) };
  };
  const curbs = [curb(-1), curb(1)];
  // clipped azalea mounds along the path, smaller with distance
  const mounds = [];
  const moundLit = [];
  const blooms = [];
  const r = rng(12);
  for (const [z, side] of [[3.9, -1], [3.4, 1], [2.9, -1], [2.45, 1], [2.05, -1], [1.7, 1], [1.5, -1]]) {
    const x = centerX(z) + side * (pathHalf(z) + 34 / z + 6);
    const y = groundY(z) - 4 / z;
    const rad = 36 / z + 5;
    mounds.push(blob(x, y, rad * 1.3, rad * 0.72, { n: 8, jitter: 0.1, seed: 70 + z * 10 }));
    moundLit.push(blob(x - side * rad * 0.15, y - rad * 0.18, rad * 1.05, rad * 0.5, { n: 7, jitter: 0.1, seed: 80 + z * 10 }));
    for (let j = 0; j < 9; j++) blooms.push(el(x + r.range(-rad * 1.1, rad * 1.1), y - r.range(0, rad * 0.6), 4.4 / z + 2.2, 3.6 / z + 1.8));
  }
  // offering torii stacked against a mossy mound on the right bank
  const minis = [
    [586, 398, 1.25, 0.1],
    [602, 394, 1.1, -0.15],
    [618, 401, 1.35, 0.05],
    [572, 404, 1.0, 0.25],
    [636, 396, 1.0, -0.2],
    [654, 402, 1.15, 0.12],
  ].map(([x, y, s, lean]) => miniTorii(x, y, s, lean));
  const mound = blob(612, 405, 60, 14, { n: 8, jitter: 0.12, seed: 9 });
  const fernList = [fern(694, 410, 36, 1, 3), fern(548, 436, 30, -1, 4), fern(36, 404, 32, 1, 5), fern(272, 430, 28, -1, 6), fern(322, 352, 18, -1, 7), fern(512, 350, 18, 1, 8)];
  const tufts = [];
  const tr2 = rng(33);
  for (let n = 0; n < 22; n++) {
    const left = n % 2 === 0;
    const y = tr2.range(318, 470);
    const f = (y - 300) / 200;
    const x = left ? tr2.range(-5, 250 - f * 10) : tr2.range(560 + (1 - f) * 20, 805);
    tufts.push(tuft(x, y, 2.6 + f * 4));
  }
  return shapeLayer('mid_banks', [
    gr('ground', [sh(leftBank), sh(rightBank), groundFill]),
    paint('crest_light', [rim(crestL, 7), rim(crestR, 8)], mossTop),
    paint('bank_shade', [leftShade, rightShade], mix(MATCHA, '#24361F', 0.42), { o: 55 }),
    stippleG('moss_stipple', [leftBank, rightBank], { color: mix(MATCHA, SUMI, 0.5), o: 40, count: 30, minDist: 10, seed: 8 }),
    gr('grass_tufts', [...tufts.map((t) => sh(t)), { ty: 'st', c: { a: 0, k: [0.82, 0.85, 0.66, 1] }, o: { a: 0, k: 75 }, w: { a: 0, k: 0.9 }, lc: 2, lj: 2, ml: 4 }]),
    paint('curb_top', curbs.map((c) => c.top), mix(WASHI, SUMI, 0.22)),
    paint('curb_face', curbs.map((c) => c.face), mix(WASHI, SUMI, 0.48)),
    paint('mossy_mound', mound, mix(MATCHA, '#3E5536', 0.3)),
    stack('offering_torii', [
      paint('posts', minis.flatMap((m) => m.red), mix(SHU, SUNLIT, 0.12)),
      paint('kasagi', minis.map((m) => m.black), mix(SUMI, SUNLIT, 0.1)),
    ]),
    paint('ferns', fernList.flatMap((f) => f.dark), mix(MATCHA, '#2C4A2E', 0.5)),
    paint('ferns_lit', fernList.flatMap((f) => f.lit), MATCHA, { pal: P }),
    paint('azalea_mounds', mounds, mix(MATCHA, '#2F4A33', 0.45)),
    paint('azalea_lit', moundLit, mix(MATCHA, '#3B5A33', 0.12)),
    paint('azalea_blooms', blooms, mix(SAKURA, SHU, 0.34)),
  ]);
}

function path() {
  const zs = [4.7, 4.2, 3.6, 3.0, 2.4, 1.8, 1.3, 1.0, 0.93];
  const L = pathEdge(-1, zs);
  const R = pathEdge(1, zs);
  const shape = poly([...L, [L[L.length - 1][0] - 6, 505], [R[R.length - 1][0] + 6, 505], ...R.slice().reverse()]);
  const risers = [];
  const noses = [];
  for (let z = 1.08; z < 4.5; z += 0.21) {
    const y = groundY(z);
    const hw = pathHalf(z);
    const cx = centerX(z);
    const th = 3.4 / z;
    risers.push(poly([[cx - hw, y], [cx + hw, y], [cx + hw, y + th], [cx - hw, y + th]]));
    noses.push(poly([[cx - hw, y - 1.2 / z], [cx + hw, y - 1.2 / z], [cx + hw, y], [cx - hw, y]]));
  }
  const shadows = [];
  for (let k = 1; k < GATES; k++) {
    const z0 = depth(k) - 0.3;
    const z1 = depth(k) - 0.17;
    const a = [centerX(z0), groundY(z0), pathHalf(z0) * 1.12];
    const b = [centerX(z1), groundY(z1), pathHalf(z1) * 1.12];
    shadows.push(poly([[b[0] - b[2], b[1]], [b[0] + b[2], b[1]], [a[0] + a[2], a[1]], [a[0] - a[2], a[1]]]));
  }
  const r = rng(21);
  const gravel = [];
  for (let n = 0; n < 60; n++) {
    const z = 0.93 + r.next() ** 1.6 * 3.5;
    const u = r.range(-0.95, 0.95);
    const rad = 1.25 / z;
    if (rad < 0.32) continue;
    gravel.push(el(centerX(z) + u * pathHalf(z), groundY(z) + r.range(0, 8 / z), rad * 2.2, rad * 1.4));
  }
  const glowPath = gf({ stops: [[0, '#FFF6EA'], [0.45, WASHI], [1, mix(WASHI, '#B9A79A', 0.45)]], s: [0, 300], e: [0, 500] });
  return shapeLayer('landmark_path', [
    gr('gravel_base', [sh(shape), glowPath]),
    paint('step_noses', noses, '#FFF8EE', { o: 85 }),
    paint('step_risers', risers, mix(WASHI, SUMI, 0.38), { o: 70 }),
    paint('gravel', gravel, mix(WASHI, SUMI, 0.45), { o: 55 }),
    paint('gate_shadows', shadows, mix(SHU, SUMI, 0.6), { o: 20 }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Foreground: stone lantern, azaleas, sakura branches                  */
/* ------------------------------------------------------------------ */

function hexPrism(cx, yTop, yBot, R, t = 0, b = 0) {
  const f = R / 2;
  return {
    left: poly([[cx - R, yTop + t], [cx - f, yTop], [cx - f, yBot], [cx - R, yBot - b]]),
    front: poly([[cx - f, yTop], [cx + f, yTop], [cx + f, yBot], [cx - f, yBot]]),
    right: poly([[cx + f, yTop], [cx + R, yTop + t], [cx + R, yBot - b], [cx + f, yBot]]),
  };
}

function lantern() {
  const cx = 150;
  const g = 492;
  const stone = mix(WASHI, SUMI, 0.26);
  const stoneLit = mix(WASHI, SUMI, 0.1);
  const stoneShade = mix(WASHI, SUMI, 0.52);
  const dark = mix(SUMI, '#3A3030', 0.2);
  const faces = { left: [], front: [], right: [] };
  const add = (p) => {
    faces.left.push(p.left);
    faces.front.push(p.front);
    faces.right.push(p.right);
  };
  add(hexPrism(cx, g - 22, g, 34, 3, 0)); // kiso
  add(hexPrism(cx, g - 30, g - 22, 26, 3, -2)); // lotus collar
  add(hexPrism(cx, g - 102, g - 30, 10, 1, 0)); // sao
  add(hexPrism(cx, g - 72, g - 64, 12.5, 1, 0)); // node ring
  add(hexPrism(cx, g - 112, g - 102, 22, 2, -2)); // ukebana
  add(hexPrism(cx, g - 124, g - 112, 28, 3, 0)); // chudai
  add(hexPrism(cx, g - 162, g - 124, 21, 2, 0)); // hibukuro
  const roof = svg1(
    `M ${cx - 48} ${g - 160} C ${cx - 51} ${g - 164} ${cx - 51} ${g - 170} ${cx - 45} ${g - 169} ` +
      `C ${cx - 32} ${g - 175} ${cx - 15} ${g - 187} ${cx - 6} ${g - 193} L ${cx + 6} ${g - 193} ` +
      `C ${cx + 15} ${g - 187} ${cx + 32} ${g - 175} ${cx + 45} ${g - 169} C ${cx + 51} ${g - 170} ${cx + 51} ${g - 164} ${cx + 48} ${g - 160} ` +
      `C ${cx + 22} ${g - 163} ${cx - 22} ${g - 163} ${cx - 48} ${g - 160} Z`,
  );
  const roofShade = svg1(`M ${cx - 48} ${g - 160} C ${cx - 51} ${g - 164} ${cx - 51} ${g - 170} ${cx - 45} ${g - 169} C ${cx - 32} ${g - 175} ${cx - 15} ${g - 187} ${cx - 6} ${g - 193} L ${cx - 2} ${g - 193} C ${cx - 8} ${g - 184} ${cx - 16} ${g - 171} ${cx - 19} ${g - 162} C ${cx - 28} ${g - 162} ${cx - 38} ${g - 161} ${cx - 48} ${g - 160} Z`);
  const roofLit = svg1(`M ${cx + 6} ${g - 193} C ${cx + 15} ${g - 187} ${cx + 32} ${g - 175} ${cx + 45} ${g - 169} L ${cx + 41} ${g - 166} C ${cx + 30} ${g - 171} ${cx + 15} ${g - 182} ${cx + 4} ${g - 190} Z`);
  const jewel = [
    el(cx, g - 196, 15, 6),
    svg1(`M ${cx} ${g - 216} C ${cx - 2} ${g - 211} ${cx - 8} ${g - 208} ${cx - 7} ${g - 203} C ${cx - 6} ${g - 199} ${cx + 6} ${g - 199} ${cx + 7} ${g - 203} C ${cx + 8} ${g - 208} ${cx + 2} ${g - 211} ${cx} ${g - 216} Z`),
  ];
  const window_ = svg1(`M ${cx - 5.5} ${g - 128} L ${cx - 5.5} ${g - 151} C ${cx - 5.5} ${g - 156} ${cx + 5.5} ${g - 156} ${cx + 5.5} ${g - 151} L ${cx + 5.5} ${g - 128} Z`);
  const sunHole = el(cx + 15.5, g - 143, 6, 6);
  const moonHole = svg1(`M ${cx - 13} ${g - 149} C ${cx - 19} ${g - 147} ${cx - 19} ${g - 138} ${cx - 13} ${g - 136} C ${cx - 16} ${g - 139} ${cx - 16} ${g - 146} ${cx - 13} ${g - 149} Z`);
  const moss = [blob(cx - 24, g - 168, 13, 3.4, { seed: 3, n: 7 }), blob(cx + 10, g - 184, 6, 2.2, { seed: 4, n: 6 }), blob(cx - 20, g - 22, 13, 3, { seed: 5, n: 7 }), blob(cx + 24, g - 21, 8, 2.4, { seed: 6, n: 6 })];
  const allStone = [...faces.left, ...faces.front, ...faces.right, roof];
  return [
    paint('stone_front', faces.front, stone),
    paint('stone_left', faces.left, stoneShade),
    hatchG('stone_hatch', faces.left, { color: mix(SUMI, WASHI, 0.2), angle: 60, spacing: 2.6, w: 0.75, o: 45, seed: 6 }),
    paint('stone_right', faces.right, stoneLit),
    paint('roof', roof, stone),
    paint('roof_shade', roofShade, stoneShade),
    hatchG('roof_hatch', roofShade, { color: mix(SUMI, WASHI, 0.2), angle: 20, spacing: 2.6, w: 0.75, o: 40, seed: 7 }),
    paint('roof_lit', roofLit, stoneLit),
    paint('jewel', jewel, stone),
    paint('openings', [window_, sunHole, moonHole], dark),
    stippleG('stone_stipple', allStone, { color: mix(SUMI, WASHI, 0.15), o: 50, count: 46, minDist: 4, seed: 9 }),
    paint('moss', moss, mix(MATCHA, '#4C6B3E', 0.25)),
  ];
}

function azalea(name, cx, cy, rx, ry, seed) {
  const r = rng(seed);
  const side = sunSide(cx);
  const base = blob(cx, cy, rx, ry, { n: 10, jitter: 0.08, seed });
  const lit = blob(cx + side * rx * 0.12, cy - ry * 0.18, rx * 0.82, ry * 0.7, { n: 9, jitter: 0.1, seed: seed + 1 });
  const flowers = [];
  const flowersLit = [];
  for (let j = 0; j < 18; j++) {
    const a = r.range(Math.PI * 1.05, Math.PI * 1.95);
    const d = r.range(0.2, 0.95);
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d * 0.95 + r.range(-2, 6);
    const s = r.range(2.4, 3.8);
    ((x - cx) * side > -rx * 0.2 ? flowersLit : flowers).push(el(x, y, s * 2, s * 1.6));
  }
  return stack(name, [
    paint('leaves', base, mix(MATCHA, '#1B2A18', 0.62)),
    paint('leaves_lit', lit, mix(MATCHA, '#2F4A2A', 0.38)),
    paint('flowers', flowers, mix(SAKURA, SHU, 0.5)),
    paint('flowers_lit', flowersLit, mix(SAKURA, SHU, 0.24)),
  ]);
}

function foreground() {
  return shapeLayer('fg_lantern', [
    azalea('azalea_back_left', 66, 472, 96, 46, 31),
    stack('toro', lantern()),
    azalea('azalea_left', 232, 492, 50, 26, 37),
    azalea('azalea_right', 702, 478, 122, 50, 43),
    azalea('azalea_right_small', 584, 495, 50, 20, 47),
    paint('fern_fg', fern(790, 506, 70, -1, 9).dark.concat(fern(790, 506, 70, -1, 9).lit), mix(MATCHA, '#14200F', 0.7)),
  ]);
}

/* sakura branches ---------------------------------------------------- */

function blossomGroups(name, clusters, flowers) {
  const f = mergeFlorets(clusters);
  return stack(name, [
    paint('under', f.under, BLOSSOM.under),
    paint('shade', f.shade, BLOSSOM.shade),
    paint('mid', f.mid, SAKURA, { pal: P }),
    paint('lit', f.lit, BLOSSOM.lit),
    flowers.length && paint('flowers', flowers.map(([x, y, s, rot]) => flowerPath(x, y, 7.5 * s, rot)), mix(SAKURA, '#FFFFFF', 0.7)),
    flowers.length && paint('eyes', flowers.map(([x, y, s]) => el(x, y, 2.8 * s, 2.8 * s)), BLOSSOM.eye),
  ]);
}

function branchLeft() {
  const main = limb([[-30, 104], [20, 100], [80, 100], [140, 112], [196, 130], [240, 150]], 15, 2);
  const twigs = [
    limb([[58, 99], [82, 80], [108, 68], [130, 64]], 5, 1.2),
    limb([[118, 107], [140, 94], [170, 90]], 4, 1),
    limb([[170, 122], [184, 144], [192, 166]], 3.6, 1),
    limb([[30, 101], [36, 124], [52, 144]], 4.4, 1),
  ];
  const hi = limb([[-30, 99], [20, 95], [80, 95.5], [140, 107.5], [196, 125.5]], 3, 0.8);
  const L = [0.55, -0.83];
  const clusters = [
    [14, 86, 24, 15, 22],
    [62, 76, 21, 14, 20],
    [106, 64, 18, 12, 16],
    [138, 60, 13, 9, 11],
    [96, 92, 19, 12, 16],
    [152, 98, 21, 13, 18],
    [184, 84, 14, 9, 12],
    [198, 118, 18, 12, 16],
    [228, 138, 15, 10, 13],
    [42, 120, 18, 12, 15],
    [58, 140, 14, 9, 11],
    [192, 158, 12, 8, 9],
    [-6, 118, 19, 12, 15],
  ].map(([x, y, rx, ry, n], j) => florets(x, y, rx, ry, { count: Math.round(n * 0.68), r0: 2.9, r1: 5, seed: 300 + j, light: L }));
  const flowers = [[30, 72, 1, 10], [124, 52, 0.9, 5], [168, 86, 0.95, 30], [214, 120, 0.9, 50], [64, 150, 0.85, 15], [204, 168, 0.8, 35], [4, 134, 0.85, 25]];
  const g = stack('branch', [
    paint('wood', [main, ...twigs], BLOSSOM.wood),
    paint('wood_hi', hi, BLOSSOM.woodHi),
    blossomGroups('blossoms', clusters, flowers),
  ]);
  return shapeLayer('fg_branch_left', [g], { a: [-30, 104], p: [-52, 136], r: osc(-1.2, 1.2, { period: 240, phase: 0.1 }) });
}

function branchRight() {
  const main = limb([[830, 92], [770, 96], [710, 106], [652, 120], [606, 134]], 16, 2.4);
  const hi = limb([[830, 87], [770, 91], [710, 101], [652, 115]], 3, 0.8);
  const L = [-0.55, -0.83];
  const along = (pts, f) => {
    const t = f * (pts.length - 1);
    const k = Math.min(pts.length - 2, Math.floor(t));
    const u = t - k;
    return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u];
  };
  const strands = [
    [742, 100, 138, 0.0],
    [712, 106, 118, 0.25],
    [680, 113, 156, 0.5],
    [650, 121, 96, 0.7],
    [626, 128, 132, 0.15],
    [784, 95, 124, 0.85],
    [668, 117, 128, 0.6],
    [760, 98, 62, 0.3],
    [694, 110, 70, 0.9],
    [636, 125, 58, 0.45],
  ].map(([x, y, len, ph], j) => {
    const r = rng(400 + j * 13);
    // a long flexible twig that bows out and swings back towards its tip
    const pts = [];
    const bow = r.range(-12, 8);
    for (let k = 0; k <= 6; k++) {
      const f = k / 6;
      pts.push([x + Math.sin(f * Math.PI) * bow + Math.sin(f * 5 + j) * 2.2, y + len * f]);
    }
    const tones = [[], [], []];
    const C = Math.max(2, Math.round(len / 22));
    for (let c = 0; c < C; c++) {
      const f = 0.04 + 0.92 * r.next() ** 1.8;
      const [cx, cy] = along(pts, f);
      const m = r.int(2, 4);
      for (let k = 0; k < m; k++) {
        const dx = r.range(-3.4, 3.4) * (1 - 0.4 * f);
        const rad = (1 - 0.45 * f) * r.range(1.5, 3.8);
        const tone = dx > 1.2 ? 2 : dx < -1.4 ? 0 : 1;
        tones[r.next() < 0.15 ? 1 : tone].push(el(cx + dx, cy + r.range(-3, 3), rad * 2, rad * 2));
      }
    }
    // a couple of single blossoms on the bare lower part of the longer strands
    if (len > 90) {
      for (const f of [0.72, 0.88]) {
        const [tx, ty] = along(pts, f);
        tones[2].push(el(tx + r.range(-2, 2), ty, 3, 3));
      }
    }
    return stack(`strand_${j}`, [
      paint('twig', limb(pts, 1.6, 0.5), '#6B4A52'),
      paint('shade', tones[0], BLOSSOM.shade),
      paint('mid', tones[1], SAKURA, { pal: P }),
      paint('lit', tones[2], BLOSSOM.lit),
    ], {
      a: [x, y],
      p: [x, y],
      r: osc(-2.4, 2.4, { period: 120, phase: ph }),
    });
  });
  const crown = [
    [800, 80, 26, 15, 22],
    [750, 84, 23, 14, 20],
    [700, 94, 21, 13, 18],
    [652, 108, 19, 12, 16],
    [618, 124, 15, 10, 12],
    [776, 106, 17, 10, 13],
    [726, 114, 16, 10, 12],
  ].map(([x, y, rx, ry, n], j) => florets(x, y, rx, ry, { count: Math.round(n * 0.72), r0: 2.9, r1: 5, seed: 500 + j, light: L }));
  const g = stack('branch', [
    ...strands,
    paint('wood', main, BLOSSOM.wood),
    paint('wood_hi', hi, BLOSSOM.woodHi),
    blossomGroups('crown', crown, [[640, 100, 0.95, 12], [700, 80, 0.95, 42], [760, 72, 0.9, 22], [600, 118, 0.85, 52], [790, 100, 0.85, 8]]),
  ]);
  return shapeLayer('fg_branch_right', [g], { a: [830, 92], p: [830, 124], r: osc(1, -1, { period: 240, phase: 0.35 }) });
}

/* ------------------------------------------------------------------ */
/* Light shafts and petals                                              */
/* ------------------------------------------------------------------ */

function lightShafts() {
  const shafts = [
    [-23, 3.4, 0.0],
    [-13, 2.6, 0.3],
    [-4, 3.0, 0.55],
    [5, 2.4, 0.15],
    [14, 3.2, 0.7],
    [24, 2.8, 0.45],
  ].map(([ang, wid, ph], j) => {
    const rad = (d) => (d * Math.PI) / 180;
    const a0 = rad(ang - wid / 2);
    const a1 = rad(ang + wid / 2);
    const L = 300;
    const at = (a, d) => [SUN[0] + Math.sin(a) * d, SUN[1] + Math.cos(a) * d];
    const far0 = at(a0, L);
    const far1 = at(a1, L);
    const mid = [(far0[0] + far1[0]) / 2, (far0[1] + far1[1]) / 2];
    return gr(`shaft_${j}`, [
      sh(poly([at(a0, 24), at(a1, 24), far1, far0])),
      gf({ stops: [[0, '#FFFDF6'], [1, '#FFF3E4']], alpha: [[0, 0.6], [0.45, 0.2], [1, 0]], s: SUN, e: mid }),
    ], { o: osc(48, 68, { period: 120, phase: ph }) });
  });
  return shapeLayer('fx_light_shafts', [glow('halation', SUN[0], SUN[1] + 6, 120, 80, '#FFF8EE', { alpha: 0.55, mid: 0.35 }), ...shafts]);
}

function petals() {
  const out = [];
  const N = 9;
  const shape = svg1('M 0 4.2 C -3.5 1.8 -3.8 -2.6 -1.6 -4.2 L 0 -3 L 1.6 -4.2 C 3.8 -2.6 3.5 1.8 0 4.2 Z');
  for (let j = 0; j < N; j++) {
    const r = rng(500 + j * 7);
    const size = r.range(0.85, 1.55);
    const x0 = r.range(-180, 640);
    const dx = r.range(180, 300);
    const phase = j / N + r.range(-0.015, 0.015);
    const color = r.pick([SAKURA, BLOSSOM.lit, mix(SAKURA, '#FFFFFF', 0.25), mix(SAKURA, SHU, 0.12)]);
    const dir = r.sign();
    const rot0 = r.range(0, 360);
    const flip = [120, 240, 240][j % 3];
    const spin = gr('spin', [sh(shape), P.fill(color)], {
      r: keys([{ t: 0, v: rot0, e: 'linear' }, { t: 240, v: rot0 + 360 * dir }]),
      s: cycle([[100 * size, 100 * size], [-100 * size, 100 * size]], { period: flip, phase: r.next() }),
    });
    const wob = stack('wobble', [spin], { p: cycle([[-14, 0], [14, 0]], { period: j % 2 ? 120 : 240, phase: r.next() }) });
    out.push(stack(`petal_${j}`, [wob], { p: drift([x0, -30], [x0 + dx, 530], { period: 240, phase }) }));
  }
  return shapeLayer('fx_petals', out);
}

/* ------------------------------------------------------------------ */

export default {
  id: '01-japan-kyoto',
  palette: P.list,
  build() {
    const gates = [];
    for (let k = GATES - 1; k >= 0; k--) gates.push(gate(k));
    return composition({
      nm: 'Waymark · Japan, Kyoto',
      layers: [
        sky(),
        farHills(),
        pagoda(),
        mist(),
        forest(),
        banks(),
        path(),
        shapeLayer('landmark_torii_far', gates.slice(0, 4)),
        lightShafts(),
        shapeLayer('landmark_torii_near', gates.slice(4)),
        foreground(),
        branchLeft(),
        branchRight(),
        petals(),
      ],
    });
  },
};
