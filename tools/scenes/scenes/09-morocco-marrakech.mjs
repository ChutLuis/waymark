// 09 · Morocco, Marrakech: sunset through a Majorelle arch.
// A Majorelle-blue wall with a true horseshoe arch trimmed in zellige and a
// zellige dado. Through it: the Koutoubia minaret in rose-ochre stone (blind
// arches, green tile band, merlons, lantern tower, gilded spheres), date palms,
// red pise ramparts with merlons, and the snow-tipped High Atlas at sunset.
// A pierced brass lantern hangs in the arch; a terracotta pot at the foot.

import { mix } from '../lib/color.mjs';
import { blob, counterClockwise, jaggedLine, poly, rng, svg1 } from '../lib/geom.mjs';
import { composition, cycle, el, fl, gr, keys, osc, sh, shapeLayer, st, stack } from '../lib/lottie.mjs';
import { glow, hatchG, ink, leafShape, limb, paint, palette, skyLines, stippleG, vGradientRect } from '../lib/art.mjs';

const P = palette(['#5148C8', '#B5543A', '#E8A33D', '#1E7B62', '#EBD3B0']);
const [MAJORELLE, OCRE, SAFRAN, ZELLIGE, SABLE] = P.list;
const SKY_TOP = '#F0C7AA';
const SKY_LOW = '#F4B47A';
const ROSE = mix(OCRE, SABLE, 0.42);
const SHADE = '#5A3A4A';
const WARM = '#FFD08A';

// horseshoe arch: circle centre, radius, and the narrowed springing
const AC = [400, 300];
const AR = 140;
const SPRING = 30; // degrees below the centre where the arc turns back in
const FLOOR = 512;

function archPath(r, floor = FLOOR) {
  const a = (SPRING * Math.PI) / 180;
  const xs = Math.cos(a) * r;
  const ys = Math.sin(a) * r;
  // left foot -> up the jamb -> around the top (large arc) -> down the right jamb
  return svg1(`M ${AC[0] - xs} ${floor} L ${AC[0] - xs} ${AC[1] + ys} A ${r} ${r} 0 1 1 ${AC[0] + xs} ${AC[1] + ys} L ${AC[0] + xs} ${floor} Z`);
}

/* ------------------------------------------------------------------ */
/* Sky and the view through the arch                                    */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [0.55, '#F7D4A8'], [1, SKY_LOW]], { y0: 0, y1: 380 }),
    skyLines('engraving', { y0: 2, y1: 220, color: '#D9895A', o: 20, seed: 66 }),
    stack('warmth', [glow('sun', 560, 330, 300, 160, '#FFB867', { alpha: 0.85, mid: 0.45 })], { o: cycle([62, 100], { period: 240 }) }),
  ]);
}

function atlas() {
  const ridge = jaggedLine([[240, 340], [290, 318], [330, 300], [372, 292], [410, 304], [450, 286], [500, 296], [540, 310], [580, 330]], { depth: 3, rough: 0.22, seed: 4 });
  const body = poly([...ridge, [580, 380], [240, 380]]);
  const snow = [];
  let run = [];
  for (const p of ridge) {
    if (p[1] < 308) run.push(p);
    else if (run.length > 2) {
      snow.push(poly([...run, ...run.slice().reverse().map(([x, y], k) => [x, y + 6 + (k % 3) * 3])]));
      run = [];
    } else run = [];
  }
  if (run.length > 2) snow.push(poly([...run, ...run.slice().reverse().map(([x, y], k) => [x, y + 6 + (k % 3) * 3])]));
  return shapeLayer('far_high_atlas', [
    paint('mountains', body, mix('#9A86A8', SKY_LOW, 0.4)),
    hatchG('mountain_lines', body, { color: mix('#6E5A86', SKY_LOW, 0.3), angle: -40, spacing: 3.4, w: 0.7, o: 30, seed: 3 }),
    paint('alpenglow_snow', snow, '#FCE4E0'),
  ]);
}

function birds() {
  const v = (x, y, s) => svg1(`M ${x - 6 * s} ${y - 2 * s} C ${x - 3 * s} ${y - 3 * s} ${x - 1 * s} ${y - 1 * s} ${x} ${y + 1 * s} C ${x + 1 * s} ${y - 1 * s} ${x + 3 * s} ${y - 3 * s} ${x + 6 * s} ${y - 2 * s} C ${x + 3 * s} ${y - 1.4 * s} ${x + 1 * s} ${y} ${x} ${y + 2 * s} C ${x - 1 * s} ${y} ${x - 3 * s} ${y - 1.4 * s} ${x - 6 * s} ${y - 2 * s} Z`);
  const flock = [];
  const r = rng(6);
  for (let k = 0; k < 9; k++) {
    const x = (k % 3) * 16 - (Math.floor(k / 3) * 12) + r.range(-4, 4);
    const y = Math.floor(k / 3) * 9 + Math.abs((k % 3) - 1) * 6 + r.range(-2, 2);
    flock.push(gr(`bird_${k}`, [sh(v(x, y, r.range(0.8, 1.1))), fl('#3A2A3A')], { a: [x, y], p: [x, y], s: cycle([[100, 100], [100, 45]], { period: 24, phase: r.next() }) }));
  }
  return shapeLayer('fx_birds', [stack('flock', flock, { p: keys([{ t: 0, v: [-80, 214], e: 'hold' }, { t: 30, v: [-80, 214], e: 'linear' }, { t: 220, v: [880, 168], e: 'hold' }, { t: 240, v: [-80, 214] }]) })]);
}

function ramparts() {
  const y = 392;
  const wall = poly([[250, y], [560, y], [560, y + 22], [250, y + 22]]);
  const merlons = [];
  for (let x = 252; x < 556; x += 9) merlons.push(poly([[x, y], [x + 5, y], [x + 5, y - 6], [x, y - 6]]));
  const towers = [];
  for (const x of [270, 352, 470, 540]) {
    towers.push(poly([[x - 9, y - 10], [x + 9, y - 10], [x + 9, y + 22], [x - 9, y + 22]]));
    for (let k = 0; k < 3; k++) merlons.push(poly([[x - 9 + k * 7, y - 10], [x - 5 + k * 7, y - 10], [x - 5 + k * 7, y - 16], [x - 9 + k * 7, y - 16]]));
  }
  const shade = poly([[250, y + 14], [560, y + 14], [560, y + 22], [250, y + 22]]);
  return shapeLayer('mid_ramparts', [
    paint('wall', [wall, ...towers], OCRE, { pal: P }),
    paint('merlons', merlons, mix(OCRE, SABLE, 0.18)),
    paint('wall_shade', shade, mix(OCRE, SHADE, 0.35)),
    stippleG('pise', [wall, ...towers], { color: mix(OCRE, '#5A2414', 0.5), o: 45, count: 40, minDist: 5, r0: 0.5, r1: 0.9, seed: 8 }),
  ]);
}

function palm(x, base, h, lean, seed) {
  const r = rng(seed);
  const top = [x + lean, base - h];
  const trunk = limb([[x, base], [x + lean * 0.3, base - h * 0.4], [x + lean * 0.75, base - h * 0.8], top], h * 0.06, h * 0.04);
  const fronds = [];
  const lit = [];
  for (let k = 0; k < 11; k++) {
    const a = (-176 + k * 17 + r.range(-5, 5)) * (Math.PI / 180);
    const len = h * r.range(0.42, 0.55);
    const droop = Math.abs(Math.cos(a)) * len * 0.45;
    const tip = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len * 0.6 + droop];
    (Math.cos(a) > 0.15 ? lit : fronds).push(leafShape(top, tip, len * 0.16, { bend: Math.cos(a) * 0.16, round: 0.1 }));
  }
  return { trunk, fronds, lit, top };
}

function palms(name, defs) {
  const groups = defs.map(([x, base, h, lean, seed, ph], j) => {
    const p = palm(x, base, h, lean, seed);
    return stack(`palm_${j}`, [
      paint('trunk', p.trunk, mix('#6B4A32', SHADE, 0.2)),
      hatchG('trunk_rings', p.trunk, { color: '#3E2A1E', angle: 0, spacing: 3, w: 0.7, o: 50, inset: 0 }),
      stack('crown', [paint('fronds', p.fronds, mix(ZELLIGE, '#1E3A2A', 0.35)), paint('fronds_lit', p.lit, mix(ZELLIGE, SAFRAN, 0.28))], { a: p.top, p: p.top, r: cycle([-2.2, 2.2], { period: 120, phase: ph }) }),
    ]);
  });
  return shapeLayer(name, groups);
}

function medina() {
  const r = rng(12);
  const houses = [];
  const shade = [];
  const wins = [];
  let x = 270;
  while (x < 540) {
    const w = r.range(26, 44);
    const h = r.range(24, 44);
    const y = 470;
    houses.push(poly([[x, y - h], [x + w, y - h], [x + w, y], [x, y]]));
    shade.push(poly([[x, y - h], [x + 5, y - h], [x + 5, y], [x, y]]));
    if (r.next() < 0.7) wins.push(svg1(`M ${x + w * 0.4} ${y - h * 0.3} L ${x + w * 0.4} ${y - h * 0.6} C ${x + w * 0.4} ${y - h * 0.7} ${x + w * 0.6} ${y - h * 0.7} ${x + w * 0.6} ${y - h * 0.6} L ${x + w * 0.6} ${y - h * 0.3} Z`));
    x += w - 2;
  }
  return shapeLayer('mid_medina_roofs', [
    paint('houses', houses, mix(SABLE, OCRE, 0.35)),
    paint('house_shade', shade, mix(OCRE, SHADE, 0.3)),
    paint('windows', wins, mix(SHADE, '#2A1A22', 0.3)),
  ]);
}

/* ------------------------------------------------------------------ */
/* The Koutoubia minaret                                                */
/* ------------------------------------------------------------------ */

function koutoubia() {
  const cx = 456;
  const w = 23; // half width of the shaft
  const top = 226;
  const base = 470;
  const sideW = 9;
  const front = poly([[cx - w, top], [cx + w, top], [cx + w, base], [cx - w, base]]);
  const side = poly([[cx + w, top], [cx + w + sideW, top - 3], [cx + w + sideW, base - 3], [cx + w, base]]);
  // registers of blind arches on the front face
  const lobed = (x, y0, y1, hw) => {
    const r0 = hw;
    return svg1(`M ${x - hw} ${y1} L ${x - hw} ${y0 + r0} C ${x - hw} ${y0 + r0 * 0.3} ${x - hw * 0.55} ${y0 + r0 * 0.15} ${x - hw * 0.42} ${y0 + r0 * 0.3} C ${x - hw * 0.4} ${y0} ${x + hw * 0.4} ${y0} ${x + hw * 0.42} ${y0 + r0 * 0.3} C ${x + hw * 0.55} ${y0 + r0 * 0.15} ${x + hw} ${y0 + r0 * 0.3} ${x + hw} ${y0 + r0} L ${x + hw} ${y1} Z`);
  };
  const recess = [lobed(cx, 312, 352, 13), lobed(cx - 9, 372, 404, 6), lobed(cx + 9, 372, 404, 6), lobed(cx, 256, 300, 16)];
  const windows = [lobed(cx, 322, 350, 6), lobed(cx - 9, 380, 402, 3), lobed(cx + 9, 380, 402, 3)];
  // sebka lattice inside the large upper panel
  const sebka = [];
  for (let k = -3; k <= 3; k++) {
    sebka.push(poly([[cx + k * 6 - 8, 300], [cx + k * 6 + 8, 268]], false));
    sebka.push(poly([[cx + k * 6 + 8, 300], [cx + k * 6 - 8, 268]], false));
  }
  const tileBand = poly([[cx - w, top + 6], [cx + w, top + 6], [cx + w, top + 16], [cx - w, top + 16]]);
  const tileBandSide = poly([[cx + w, top + 6], [cx + w + sideW, top + 3], [cx + w + sideW, top + 13], [cx + w, top + 16]]);
  const tileDots = [];
  for (let x = cx - w + 3; x < cx + w; x += 6) tileDots.push(el(x, top + 11, 2.6, 2.6));
  const merlons = [];
  for (let k = 0; k < 4; k++) {
    const mx = cx - w + 3 + k * 11.5;
    merlons.push(svg1(`M ${mx} ${top} L ${mx} ${top - 6} L ${mx + 2} ${top - 6} L ${mx + 2} ${top - 9} L ${mx + 6} ${top - 9} L ${mx + 6} ${top - 6} L ${mx + 8} ${top - 6} L ${mx + 8} ${top} Z`));
  }
  // lantern tower, its own small tile band, ribbed dome and the jamour of gilded spheres
  const lw = 10;
  const lTop = top - 38;
  const lantern = poly([[cx - lw, lTop], [cx + lw, lTop], [cx + lw, top - 4], [cx - lw, top - 4]]);
  const lanternSide = poly([[cx + lw, lTop], [cx + lw + 4, lTop - 1.5], [cx + lw + 4, top - 5.5], [cx + lw, top - 4]]);
  const lanternArch = lobed(cx, lTop + 10, top - 8, 5);
  const lanternBand = poly([[cx - lw, lTop + 2], [cx + lw, lTop + 2], [cx + lw, lTop + 6], [cx - lw, lTop + 6]]);
  const dome = svg1(`M ${cx - lw - 1} ${lTop} C ${cx - lw} ${lTop - 9} ${cx + lw} ${lTop - 9} ${cx + lw + 1} ${lTop} Z`);
  const spheres = [el(cx, lTop - 12, 9, 9), el(cx, lTop - 19.5, 7, 7), el(cx, lTop - 25.5, 5, 5)];
  const spire = poly([[cx - 0.9, lTop - 36], [cx + 0.9, lTop - 36], [cx + 0.9, lTop - 27], [cx - 0.9, lTop - 27]]);
  return shapeLayer('landmark_koutoubia', [
    paint('front', front, ROSE),
    hatchG('masonry', front, { color: mix(ROSE, SHADE, 0.45), angle: 0, spacing: 3.4, w: 0.7, o: 32, inset: 0 }),
    paint('side_lit', side, mix(ROSE, SAFRAN, 0.45)),
    paint('blind_arches', recess, mix(ROSE, SHADE, 0.32)),
    ink('sebka', sebka, mix(ROSE, '#FFE2C0', 0.4), 1.1, { o: 90 }),
    paint('windows', windows, mix(SHADE, '#2A1A22', 0.5)),
    paint('tile_band', tileBand, ZELLIGE, { pal: P }),
    paint('tile_band_side', tileBandSide, mix(ZELLIGE, SAFRAN, 0.3)),
    paint('tile_interlace', tileDots, '#F2EEE4'),
    paint('merlons', merlons, ROSE),
    paint('lantern', lantern, ROSE),
    paint('lantern_side', lanternSide, mix(ROSE, SAFRAN, 0.45)),
    paint('lantern_band', lanternBand, ZELLIGE, { pal: P }),
    paint('lantern_arch', lanternArch, mix(SHADE, '#2A1A22', 0.4)),
    paint('dome', dome, mix(ZELLIGE, '#0E3A2E', 0.2)),
    paint('jamour', spheres, '#E2B54A'),
    paint('jamour_glint', [el(cx - 1.6, lTop - 13.6, 2.6, 2.6), el(cx - 1.2, lTop - 21, 2, 2)], '#FFF0B8'),
    paint('spire', spire, '#C9963E'),
  ]);
}

/* ------------------------------------------------------------------ */
/* The Majorelle wall, zellige, lantern, pot                            */
/* ------------------------------------------------------------------ */

/** Khatam: the 8-point star of two overlapping squares. */
function khatam(x, y, r, rot = 0) {
  const pts = [];
  const ri = (r * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  for (let k = 0; k < 16; k++) {
    const a = rot + (k * Math.PI) / 8;
    const rr = k % 2 ? ri : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return poly(pts);
}

/** Four-point star filling the gap between four khatams. */
function cross4(x, y, r, inner = 0.36) {
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const rr = k % 2 ? r * inner : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return poly(pts);
}

function wall() {
  const outer = poly([[-10, 110], [810, 110], [810, 510], [-10, 510]]);
  const opening = counterClockwise(archPath(AR));
  const a0 = (SPRING * Math.PI) / 180;
  const xs = Math.cos(a0);
  const ys = Math.sin(a0);
  const springY = AC[1] + ys * AR;
  const jambL = AC[0] - xs * AR;
  const jambR = AC[0] + xs * AR;
  // --- the arch's zellige band: 8-point stars set along the arc and down the jambs
  const rIn = AR + 3;
  const rOut = AR + 19;
  const band = archPath(rOut);
  const bandIn = counterClockwise(archPath(rIn));
  const P2 = (t, r) => [AC[0] + Math.cos(t) * r, AC[1] - Math.sin(t) * r];
  const start = Math.PI + a0;
  const sweep = -(Math.PI + 2 * a0);
  const rm = (rIn + rOut) / 2;
  const nStars = Math.round((Math.abs(sweep) * rm) / 20);
  const bandStars = [[], []];
  const bandDots = [];
  for (let k = 0; k <= nStars; k++) {
    const t = start + (sweep * k) / nStars;
    const [x, y] = P2(t, rm);
    bandStars[k % 2].push(khatam(x, y, 6.6, -t));
    if (k < nStars) {
      const [dx, dy] = P2(t + sweep / nStars / 2, rm);
      bandDots.push(cross4(dx, dy, 4.2));
    }
  }
  for (const xj of [AC[0] - xs * rm, AC[0] + xs * rm]) {
    let k = 0;
    for (let y = springY + 14; y < FLOOR - 6; y += 20, k++) {
      bandStars[k % 2].push(khatam(xj, y, 6.6, Math.PI / 8));
      bandDots.push(cross4(xj, y + 10, 4.2));
    }
  }
  const border = archPath(AR + 21);
  const borderIn = counterClockwise(archPath(rOut));
  const innerLine = archPath(rIn);
  const innerLineIn = counterClockwise(archPath(AR + 1));
  // --- the alfiz: a rectangular frame around the arch, carved-stucco spandrels with rosettes
  const ax0 = AC[0] - 186;
  const ax1 = AC[0] + 186;
  const ay0 = 122;
  const alfizOuter = poly([[ax0, ay0], [ax1, ay0], [ax1, springY], [ax0, springY]]);
  const alfizInner = counterClockwise(poly([[ax0 + 11, ay0 + 11], [ax1 - 11, ay0 + 11], [ax1 - 11, springY], [ax0 + 11, springY]]));
  const spandrel = poly([[ax0 + 11, ay0 + 11], [ax1 - 11, ay0 + 11], [ax1 - 11, springY], [ax0 + 11, springY]]);
  const spandrelHole = counterClockwise(archPath(AR + 21, springY));
  const rosettes = [[ax0 + 37, ay0 + 40], [ax1 - 37, ay0 + 40]];
  const rosetteStars = rosettes.map(([x, y]) => khatam(x, y, 15));
  const rosetteInner = rosettes.map(([x, y]) => khatam(x, y, 8, Math.PI / 8));
  const rosetteRings = rosettes.map(([x, y]) => el(x, y, 40, 40));
  const alfizDots = [];
  for (let x = ax0 + 5.5; x < ax1; x += 14) alfizDots.push(cross4(x, ay0 + 5.5, 4));
  for (let y = ay0 + 19.5; y < springY - 4; y += 14) alfizDots.push(cross4(ax0 + 5.5, y, 4), cross4(ax1 - 5.5, y, 4));
  // carved scrolls in the spandrels
  const scrolls = [];
  for (const sgn of [-1, 1]) {
    for (const [dx, dy] of [[150, 96], [122, 46], [164, 160]]) {
      const cx = AC[0] + sgn * dx;
      const cy = ay0 + dy;
      scrolls.push(svg1(`M ${cx - 9} ${cy} C ${cx - 9} ${cy - 10} ${cx + 9} ${cy - 10} ${cx + 9} ${cy} C ${cx + 9} ${cy + 6} ${cx + 1} ${cy + 7} ${cx} ${cy + 2}`));
    }
  }
  // --- carved stucco frieze, cedar corbels, green-tiled cornice (all below y 100)
  const beam = poly([[-10, 106], [810, 106], [810, 112], [-10, 112]]);
  const beamLit = poly([[-10, 106], [810, 106], [810, 107.4], [-10, 107.4]]);
  const corbels = [];
  for (let x = 4; x < 810; x += 30) corbels.push(poly([[x, 112], [x + 15, 112], [x + 15, 116], [x + 12, 116], [x + 12, 121], [x + 3, 121], [x + 3, 116], [x, 116]]));
  const cornice = poly([[-10, 100], [810, 100], [810, 106], [-10, 106]]);
  const tileEnds = poly([[-8, 104.6], [812, 104.6]], false);
  const corniceLit = poly([[-10, 100], [810, 100], [810, 102.5], [-10, 102.5]]);
  // --- plaster texture: soft mottling and a few hairline cracks on the flat wall
  const r = rng(91);
  const mottleL = [];
  const mottleD = [];
  for (let k = 0; k < 18; k++) {
    const left = k % 2 === 0;
    const x = left ? r.range(10, ax0 - 20) : r.range(ax1 + 20, 790);
    const y = r.range(150, 400);
    (r.next() < 0.5 ? mottleL : mottleD).push(blob(x, y, r.range(12, 26), r.range(8, 16), { n: 8, jitter: 0.3, seed: 300 + k }));
  }
  const cracks = [poly([[184, 142], [180, 160], [186, 176], [182, 196]], false), poly([[640, 330], [646, 350], [642, 366]], false), poly([[96, 380], [104, 392], [100, 408]], false)];
  // --- zellige dado: a true star-and-cross field under a braided border
  const dadoY = 418;
  const spans = [[-10, jambL - 21], [jambR + 21, 810]];
  const dado = spans.map(([xa, xb]) => poly([[xa, dadoY], [xb, dadoY], [xb, 510], [xa, 510]]));
  const dStars = [];
  const dCross = [];
  const dCentres = [];
  const pitch = 30;
  for (const [xa, xb] of spans) {
    for (let y = dadoY + 30; y < 520; y += pitch) {
      for (let x = xa + 15; x < xb - 4; x += pitch) {
        dStars.push(khatam(x, y, 14.6));
        dCentres.push(el(x, y, 5, 5));
        if (x + pitch / 2 < xb - 2) dCross.push(cross4(x + pitch / 2, y + pitch / 2, 14.6, 0.45));
      }
    }
  }
  const braid = [];
  for (const [xa, xb] of spans) for (let x = xa; x < xb - 6; x += 12) braid.push(poly([[x, dadoY + 9], [x + 6, dadoY + 3], [x + 12, dadoY + 9], [x + 6, dadoY + 15]]));
  const dadoBorder = spans.map(([xa, xb]) => poly([[xa, dadoY], [xb, dadoY], [xb, dadoY + 18], [xa, dadoY + 18]]));
  const floor = poly([[jambL, 470], [jambR, 470], [jambR, 512], [jambL, 512]]);
  const terrace = poly([[-10, 468], [810, 468], [810, 512], [-10, 512]]);
  const terraceJoints = [478, 490].map((y) => poly([[-10, y], [810, y]], false));
  const floorTiles = [];
  for (let y = 474; y < 512; y += 9) for (let x = jambL + ((y / 9) % 2) * 9; x < jambR; x += 18) floorTiles.push(poly([[x, y], [x + 9, y], [x + 9, y + 9], [x, y + 9]]));
  const BLACK = '#1E1A26';
  const IVORY = '#F4EFE4';
  const STUCCO = mix(SABLE, '#FFFFFF', 0.35);
  return shapeLayer('fg_majorelle_wall', [
    paint('threshold', floor, mix(SABLE, OCRE, 0.12)),
    paint('floor_tiles', floorTiles, mix(SABLE, OCRE, 0.38)),
    gr('wall', [sh(outer), sh(opening), fl(MAJORELLE, { rule: 2, nm: 'pal_1' })]),
    paint('mottle_light', mottleL, '#8A82F0', { o: 8 }),
    paint('mottle_dark', mottleD, '#1C1640', { o: 8 }),
    ink('cracks', cracks, '#1C1640', 0.8, { o: 35 }),
    glow('spill', AC[0], AC[1] + 40, 340, 250, SAFRAN, { alpha: 0.2, mid: 0.4 }),
    gr('spandrels', [sh(spandrel), sh(spandrelHole), fl(STUCCO, { rule: 2 })]),
    ink('scrolls', scrolls, mix(STUCCO, SHADE, 0.5), 1.4, { o: 90 }),
    paint('rosette_rings', rosetteRings, mix(STUCCO, SHADE, 0.15)),
    paint('rosettes', rosetteStars, ZELLIGE, { pal: P }),
    paint('rosette_centres', rosetteInner, SAFRAN, { pal: P }),
    gr('alfiz', [sh(alfizOuter), sh(alfizInner), fl(ZELLIGE, { rule: 2, nm: 'pal_4' })]),
    paint('alfiz_dots', alfizDots, IVORY),
    gr('arch_border', [sh(border), sh(borderIn), fl(SAFRAN, { rule: 2, nm: 'pal_3' })]),
    gr('arch_band', [sh(band), sh(bandIn), fl(IVORY, { rule: 2 })]),
    gr('arch_inner_line', [sh(innerLine), sh(innerLineIn), fl(BLACK, { rule: 2 })]),
    paint('band_stars_green', bandStars[0], ZELLIGE, { pal: P }),
    paint('band_stars_blue', bandStars[1], MAJORELLE, { pal: P }),
    paint('band_crosses', bandDots, SAFRAN, { pal: P }),
    paint('beam', beam, mix('#7A5232', '#2A1A22', 0.15)),
    paint('beam_lit', beamLit, mix('#7A5232', SAFRAN, 0.4)),
    paint('corbels', corbels, mix('#6B4A32', SHADE, 0.3)),
    paint('cornice', cornice, ZELLIGE, { pal: P }),
    gr('cornice_tiles', [sh(tileEnds), st(mix(ZELLIGE, '#0A2A20', 0.35), 3.4, { cap: 2, pattern: [0.1, 7.9] })]),
    paint('cornice_lit', corniceLit, mix(ZELLIGE, '#9ED08A', 0.4)),
    paint('dado', dado, SABLE, { pal: P }),
    paint('dado_crosses', dCross, MAJORELLE, { pal: P }),
    paint('dado_stars', dStars, ZELLIGE, { pal: P }),
    paint('dado_centres', dCentres, SAFRAN, { pal: P }),
    paint('dado_border', dadoBorder, BLACK),
    paint('dado_braid', braid, SAFRAN, { pal: P }),
    paint('terrace', terrace, mix(OCRE, SABLE, 0.45)),
    ink('terrace_joints', terraceJoints, mix(OCRE, SHADE, 0.3), 1, { o: 50 }),
  ]);
}

/** Mashrabiya window on the left wall: cedar frame, turned lattice, a sill. */
function mashrabiya() {
  const x0 = 64;
  const x1 = 176;
  const y0 = 168;
  const y1 = 312;
  const frame = poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const hole = counterClockwise(poly([[x0 + 8, y0 + 8], [x1 - 8, y0 + 8], [x1 - 8, y1 - 8], [x0 + 8, y1 - 8]]));
  const back = poly([[x0 + 8, y0 + 8], [x1 - 8, y0 + 8], [x1 - 8, y1 - 8], [x0 + 8, y1 - 8]]);
  const lattice = [];
  for (let y = y0 + 20; y < y1 - 10; y += 22) for (let x = x0 + 20; x < x1 - 10; x += 24) lattice.push(khatam(x, y, 11));
  const sill = poly([[x0 - 8, y1], [x1 + 8, y1], [x1 + 4, y1 + 8], [x0 - 4, y1 + 8]]);
  const hood = svg1(`M ${x0 - 10} ${y0} L ${x1 + 10} ${y0} L ${x1 + 2} ${y0 - 12} L ${x0 - 2} ${y0 - 12} Z`);
  const cedar = mix('#7A5232', SHADE, 0.1);
  return shapeLayer('fg_mashrabiya', [
    paint('shadow', poly([[x0 + 6, y0 + 4], [x1 + 8, y0 + 4], [x1 + 8, y1 + 12], [x0 + 6, y1 + 12]]), '#1C1640', { o: 25 }),
    paint('back', back, mix(SHADE, '#2A1A22', 0.45)),
    ink('lattice', lattice, cedar, 2.4),
    gr('frame', [sh(frame), sh(hole), fl(cedar, { rule: 2 })]),
    paint('hood', hood, ZELLIGE, { pal: P }),
    paint('sill', sill, mix(cedar, '#2A1A22', 0.2)),
  ]);
}

/** Tiled niche on the right wall with a hanging brass lamp. */
function niche() {
  const x0 = 704;
  const x1 = 772;
  const top = 178;
  const bot = 318;
  const arch = (a, b, t, y) => svg1(`M ${a} ${y} L ${a} ${t + (b - a) / 2} A ${(b - a) / 2} ${(b - a) / 2} 0 0 1 ${b} ${t + (b - a) / 2} L ${b} ${y} Z`);
  const frame = arch(x0 - 10, x1 + 10, top - 10, bot + 6);
  const inner = arch(x0, x1, top, bot);
  const hole = counterClockwise(arch(x0, x1, top, bot));
  const shelf = poly([[x0 - 14, bot], [x1 + 14, bot], [x1 + 10, bot + 8], [x0 - 10, bot + 8]]);
  const stars = [];
  for (let k = 0; k < 9; k++) {
    const t = Math.PI + (Math.PI * k) / 8;
    const r = (x1 - x0) / 2 + 5;
    stars.push(khatam((x0 + x1) / 2 + Math.cos(t) * r, top + (x1 - x0) / 2 + Math.sin(t) * r, 3.6));
  }
  for (let y = top + (x1 - x0) / 2 + 12; y < bot; y += 14) stars.push(khatam(x0 - 5, y, 3.6), khatam(x1 + 5, y, 3.6));
  const cx = (x0 + x1) / 2;
  const chain = poly([[cx, top + 4], [cx, top + 56]], false);
  const lamp = svg1(`M ${cx - 12} ${top + 64} C ${cx - 10} ${top + 56} ${cx + 10} ${top + 56} ${cx + 12} ${top + 64} C ${cx + 16} ${top + 76} ${cx + 10} ${top + 90} ${cx} ${top + 94} C ${cx - 10} ${top + 90} ${cx - 16} ${top + 76} ${cx - 12} ${top + 64} Z`);
  const holes = [];
  for (let y = top + 68; y < top + 90; y += 6) for (let x = cx - 7; x <= cx + 7; x += 4.7) holes.push(el(x, y, 2, 2));
  return shapeLayer('fg_niche', [
    gr('niche_frame', [sh(frame), sh(hole), fl(SABLE, { rule: 2, nm: 'pal_5' })]),
    paint('niche_stars', stars, ZELLIGE, { pal: P }),
    paint('niche_back', inner, mix(MAJORELLE, '#1C1640', 0.45)),
    glow('niche_glow', cx, top + 78, 50, 44, WARM, { alpha: 0.45, mid: 0.4 }),
    ink('niche_chain', chain, '#6A4A2A', 1.2),
    paint('niche_lamp', lamp, '#B8863A'),
    paint('niche_lamp_light', holes, '#FFF0B0'),
    paint('niche_shelf', shelf, mix('#6B4A32', SHADE, 0.1)),
  ]);
}

/** A tall cereus cactus in a Majorelle-yellow pot, and a small barrel cactus in blue. */
function cacti() {
  const yellow = mix(SAFRAN, '#FFE14A', 0.55);
  const dx = -64;
  const dy = -12;
  const X = (x) => x + dx;
  const Y = (y) => y + dy;
  const pot = svg1(`M ${X(640)} ${Y(438)} C ${X(636)} ${Y(462)} ${X(640)} ${Y(488)} ${X(652)} ${Y(504)} L ${X(744)} ${Y(504)} C ${X(756)} ${Y(488)} ${X(760)} ${Y(462)} ${X(756)} ${Y(438)} Z`);
  const potRim = poly([[X(632), Y(428)], [X(764), Y(428)], [X(760), Y(440)], [X(636), Y(440)]]);
  const potShade = svg1(`M ${X(724)} ${Y(440)} C ${X(736)} ${Y(462)} ${X(738)} ${Y(486)} ${X(730)} ${Y(504)} L ${X(744)} ${Y(504)} C ${X(756)} ${Y(488)} ${X(760)} ${Y(462)} ${X(756)} ${Y(440)} Z`);
  const stem = (x, y0, y1, w) => svg1(`M ${X(x - w)} ${Y(y0)} L ${X(x - w)} ${Y(y1 + w)} C ${X(x - w)} ${Y(y1 - w * 0.2)} ${X(x + w)} ${Y(y1 - w * 0.2)} ${X(x + w)} ${Y(y1 + w)} L ${X(x + w)} ${Y(y0)} Z`);
  const stems = [stem(698, 432, 212, 15), limb([[X(708), Y(342)], [X(724), Y(344)], [X(732), Y(330)], [X(733), Y(286)]], 18, 15), limb([[X(690), Y(380)], [X(676), Y(382)], [X(668), Y(370)], [X(667), Y(330)]], 16, 13), stem(652, 432, 330, 10)];
  const ribs = [[692, 430, 222], [704, 430, 222], [649, 430, 336], [655, 430, 336]].map(([x, y0, y1]) => poly([[X(x), Y(y0)], [X(x), Y(y1)]], false));
  const lit = [svg1(`M ${X(702)} ${Y(432)} L ${X(702)} ${Y(222)} C ${X(706)} ${Y(220)} ${X(711)} ${Y(224)} ${X(712)} ${Y(230)} L ${X(712)} ${Y(432)} Z`)];
  const barrelPot = svg1('M 712 462 C 708 476 712 488 718 494 L 744 494 C 750 488 754 476 750 462 Z');
  const barrel = blob(731, 448, 17, 15, { n: 10, jitter: 0.05, seed: 4 });
  const blooms = [el(723, 435, 6, 4), el(737, 433, 6, 4)];
  const feet = [el(X(698), Y(504), 136, 12), el(731, 495, 48, 8)];
  const green = mix(ZELLIGE, '#4E8A4A', 0.4);
  return shapeLayer('fg_cacti', [
    paint('pot_feet', feet, '#1C1640', { o: 32 }),
    paint('cactus', stems, green),
    paint('cactus_lit', lit, mix(green, '#C9E08A', 0.35)),
    ink('cactus_ribs', ribs, mix(green, '#0E3A2E', 0.45), 1, { o: 70 }),
    paint('pot', pot, yellow),
    paint('pot_shade', potShade, mix(yellow, OCRE, 0.35)),
    paint('pot_rim', potRim, mix(yellow, '#FFFFFF', 0.25)),
    paint('barrel', barrel, mix(green, '#7AA05A', 0.2)),
    paint('barrel_blooms', blooms, mix(SAFRAN, '#E2483A', 0.4)),
    paint('barrel_pot', barrelPot, MAJORELLE, { pal: P }),
  ]);
}

function lantern() {
  const x = AC[0];
  const y0 = AC[1] - AR;
  const chain = [];
  for (let y = y0 + 2; y < y0 + 44; y += 6) chain.push(el(x, y, 3, 5));
  const top = svg1(`M ${x - 12} ${y0 + 58} C ${x - 10} ${y0 + 48} ${x - 4} ${y0 + 44} ${x} ${y0 + 43} C ${x + 4} ${y0 + 44} ${x + 10} ${y0 + 48} ${x + 12} ${y0 + 58} Z`);
  const body = svg1(`M ${x - 13} ${y0 + 58} L ${x + 13} ${y0 + 58} C ${x + 18} ${y0 + 70} ${x + 16} ${y0 + 86} ${x + 8} ${y0 + 94} L ${x - 8} ${y0 + 94} C ${x - 16} ${y0 + 86} ${x - 18} ${y0 + 70} ${x - 13} ${y0 + 58} Z`);
  const bottom = svg1(`M ${x - 7} ${y0 + 94} L ${x + 7} ${y0 + 94} C ${x + 5} ${y0 + 100} ${x + 2} ${y0 + 104} ${x} ${y0 + 108} C ${x - 2} ${y0 + 104} ${x - 5} ${y0 + 100} ${x - 7} ${y0 + 94} Z`);
  const dots = [];
  for (let row = 0; row < 5; row++) {
    const yy = y0 + 63 + row * 6.5;
    const half = 11 - Math.abs(row - 1.6) * 2.2;
    for (let xx = -half; xx <= half; xx += 4.4) dots.push(el(x + xx, yy, 2.2, 2.2));
  }
  const ring = poly([[x - 13, y0 + 57], [x + 13, y0 + 57], [x + 13, y0 + 60], [x - 13, y0 + 60]]);
  const twinkle = (set, k) => gr(`light_${k}`, [...set.map((d) => sh(d)), fl('#FFF0B0')], { o: cycle([100, 55, 85, 60], { period: 60, phase: k * 0.31, ease: 'soft' }) });
  return shapeLayer('fg_lantern', [stack('lantern', [
    glow('glow', x, y0 + 76, 70, 70, WARM, { alpha: 0.55, mid: 0.4 }),
    paint('chain', chain, '#6A4A2A'),
    paint('cap', top, '#B8863A'),
    paint('body', body, '#9A6A2A'),
    twinkle(dots.filter((_, k) => k % 3 === 0), 0),
    twinkle(dots.filter((_, k) => k % 3 === 1), 1),
    twinkle(dots.filter((_, k) => k % 3 === 2), 2),
    paint('ring', ring, '#D9A54A'),
    paint('finial', bottom, '#B8863A'),
  ], { a: [x, y0], p: [x, y0], r: osc(-3, 3, { period: 120 }) })]);
}

function pot() {
  const urn = svg1('M 62 420 C 46 436 44 470 60 500 L 150 500 C 166 470 164 436 148 420 Z');
  const urnLit = svg1('M 128 424 C 140 440 142 468 134 496 L 146 496 C 158 468 156 440 144 424 Z');
  const rim = poly([[54, 412], [156, 412], [152, 422], [58, 422]]);
  const bands = [poly([[50, 452], [160, 452], [160, 456], [50, 456]]), poly([[48, 468], [162, 468], [162, 471], [48, 471]])];
  const leaves = [];
  const leavesLit = [];
  const r = rng(9);
  for (let k = 0; k < 13; k++) {
    const a = (-170 + k * 13.5 + r.range(-4, 4)) * (Math.PI / 180);
    const len = r.range(40, 66) - Math.abs(k - 6) * 2;
    const tip = [105 + Math.cos(a) * len, 414 + Math.sin(a) * len];
    (Math.cos(a) > 0 ? leavesLit : leaves).push(leafShape([105, 414], tip, 9, { bend: Math.cos(a) * 0.08, round: 0.1 }));
  }
  const spike = limb([[108, 410], [112, 370], [118, 330]], 3, 1.4);
  const flowers = [];
  for (let k = 0; k < 7; k++) flowers.push(el(118 - k * 0.6, 334 + k * 5, 6 - k * 0.3, 4));
  return shapeLayer('fg_pot', [stack('urn', [
    paint('pot_foot', el(106, 500, 124, 12), '#1C1640', { o: 32 }),
    paint('leaves', leaves, mix(ZELLIGE, '#0E3A2E', 0.35)),
    paint('spike', spike, mix(ZELLIGE, '#0E3A2E', 0.2)),
    paint('flowers', flowers, SAFRAN, { pal: P }),
    paint('urn', urn, mix(OCRE, '#D77A4A', 0.3)),
    paint('urn_lit', urnLit, mix(OCRE, SAFRAN, 0.45)),
    hatchG('urn_shade', svg1('M 62 420 C 46 436 44 470 60 500 L 82 500 C 72 470 72 436 80 420 Z'), { color: '#5A2414', angle: 70, spacing: 2.6, w: 0.75, o: 45 }),
    paint('bands', bands, mix(OCRE, SHADE, 0.35)),
    paint('rim', rim, mix(OCRE, SABLE, 0.2)),
    paint('leaves_lit', leavesLit, mix(ZELLIGE, '#9ED08A', 0.3)),
  ], { p: [0, -8] })]);
}

/* ------------------------------------------------------------------ */

export default {
  id: '09-morocco-marrakech',
  palette: P.list,
  build() {
    return composition({
      nm: 'Waymark · Morocco, Marrakech',
      layers: [
        sky(),
        atlas(),
        birds(),
        palms('mid_palms_far', [[296, 392, 70, 4, 1, 0], [338, 396, 86, -6, 2, 0.3], [506, 394, 80, 4, 3, 0.6]]),
        ramparts(),
        medina(),
        koutoubia(),
        palms('fg_palms_near', [[330, 472, 150, 10, 5, 0.45], [512, 472, 128, -10, 6, 0.8]]),
        wall(),
        mashrabiya(),
        niche(),
        cacti(),
        lantern(),
        pot(),
      ],
    });
  },
};
