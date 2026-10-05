// 03 · Mexico, Oaxaca: bright afternoon in the Centro Historico.
// The pedestrian street (Andador Macedonio Alcala) of painted colonial
// facades with iron balconies and geraniums, leading to the twin-towered
// green-cantera facade of Templo de Santo Domingo. Papel picado overhead,
// talavera around a turquoise door, agave, nopal and cempasuchil in front.

import { mix } from '../lib/color.mjs';
import { cloud, counterClockwise, ellipsePath, poly, rng, rotateAbout, svg1, translate } from '../lib/geom.mjs';
import { composition, cycle, drift, el, fl, gr, keys, osc, sh, shapeLayer, stack } from '../lib/lottie.mjs';
import { florets, hatchG, ink, leafShape, mergeFlorets, paint, palette, skyLines, stippleG, vGradientRect } from '../lib/art.mjs';

const P = palette(['#D6246E', '#F3A712', '#234E9C', '#4F8A5B', '#F6EDE0']);
const [ROSA, CEMPA, TALAVERA, NOPAL, CAL] = P.list;
const TURQ = '#2BA7A8';
const SKY_TOP = '#7CC6E4';
const SKY_LOW = '#D4F0F7';
const SHADE = '#2E3560';
const IRON = '#2A2730';
const CANTERA = '#B9AF76';

/* ------------------------------------------------------------------ */
/* Perspective                                                          */
/* ------------------------------------------------------------------ */

const VP = [400, 292];
const EYE = 208;
const X = (x, z) => VP[0] + x / z;
const Y = (y, z) => VP[1] + (EYE - y) / z;
const pt = (x, y, z) => [X(x, z), Y(y, z)];
const WALL = 380;
const Z0 = 0.9;
const Z1 = 3.2;
/** Quad on the wall plane x = wx between depths za..zb and heights ya..yb. */
const quad = (wx, za, zb, ya, yb) => poly([pt(wx, yb, za), pt(wx, yb, zb), pt(wx, ya, zb), pt(wx, ya, za)]);

/* ------------------------------------------------------------------ */
/* Sky                                                                  */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [1, SKY_LOW]], { y0: 0, y1: 300 }),
    skyLines('engraving', { y0: 2, y1: 200, color: '#4E9CC0', o: 22, seed: 24 }),
  ]);
}

function clouds() {
  const make = (x0, x1, y, h, seed) => {
    const top = cloud(x0, x1, y, h, { bumps: 5, seed });
    const under = cloud(x0 + 8, x1 - 6, y + 2, h * 0.42, { bumps: 4, seed: seed + 1 });
    return { top, under };
  };
  const cs = [make(80, 230, 92, 34, 3), make(500, 640, 66, 30, 5), make(650, 780, 150, 26, 7), make(250, 340, 160, 18, 9)];
  return shapeLayer('far_clouds', cs.map((c, j) =>
    stack(`cloud_${j}`, [paint('body', c.top, CAL, { pal: P }), paint('belly', c.under, mix(SKY_TOP, CAL, 0.55))], {
      p: osc([-14, 0], [14, 0], { period: 240, phase: j * 0.27 }),
    }),
  ));
}

/* ------------------------------------------------------------------ */
/* Street, facades                                                      */
/* ------------------------------------------------------------------ */

function street() {
  const ground = poly([pt(-WALL, 0, Z0), pt(WALL, 0, Z0), pt(WALL, 0, Z1), pt(-WALL, 0, Z1)]);
  const shadow = poly([pt(-WALL, 0, Z0), pt(-40, 0, Z0), pt(60, 0, Z1), pt(-WALL, 0, Z1)]);
  const joints = [];
  for (let x = -300; x <= 300; x += 100) joints.push(poly([pt(x, 0, Z0), pt(x, 0, Z1)], false));
  for (const z of [1.08, 1.24, 1.42, 1.62, 1.86, 2.14, 2.48, 2.84]) joints.push(poly([pt(-WALL, 0, z), pt(WALL, 0, z)], false));
  const stone = mix(CANTERA, CAL, 0.55);
  return shapeLayer('mid_street', [
    paint('paving', ground, stone),
    stippleG('paving_grain', ground, { color: mix(CANTERA, IRON, 0.4), o: 35, count: 40, minDist: 11, seed: 4 }),
    ink('joints', joints, mix(CANTERA, IRON, 0.35), 1, { o: 55 }),
    paint('wall_shadow', shadow, SHADE, { o: 22 }),
  ]);
}

function building(side, b, shadeAmt) {
  const wx = side * WALL;
  const tone = (c) => mix(c, SHADE, shadeAmt);
  const groups = { wall: [], socle: [], cornice: [], corniceShade: [], frames: [], glass: [], glint: [], slabs: [], iron: [], pots: [], blooms: [], pilaster: [], cast: [] };
  groups.wall.push(quad(wx, b.za, b.zb, 0, b.H));
  groups.socle.push(quad(wx, b.za, b.zb, 0, 38));
  groups.cornice.push(quad(wx, b.za, b.zb, b.H - 20, b.H));
  groups.corniceShade.push(quad(wx, b.za, b.zb, b.H - 27, b.H - 20));
  groups.pilaster.push(quad(wx, b.zb - 0.035 * b.zb, b.zb, 0, b.H - 20));
  const n = b.windows;
  const step = (b.zb - b.za) / n;
  for (let k = 0; k < n; k++) {
    const zc = b.za + step * (k + 0.5);
    if (b.door !== undefined && k === b.door) continue;
    const d = step * 0.17;
    groups.frames.push(quad(wx, zc - d * 1.4, zc + d * 1.4, 128, 352));
    groups.glass.push(quad(wx, zc - d, zc + d, 142, 336));
    groups.glint.push(quad(wx, zc - d * 0.55, zc - d * 0.25, 220, 330));
    groups.slabs.push(quad(wx, zc - d * 1.75, zc + d * 1.75, 130, 140));
    // shadows: the frame's reveal on the glass, the balcony slab on the wall below
    groups.cast.push(quad(wx, zc - d, zc - d * 0.45, 142, 336), quad(wx, zc - d * 1.75 + d * 0.5, zc + d * 1.75 + d * 0.5, 96, 130), quad(wx, zc - d * 1.4 + d * 0.3, zc + d * 1.4 + d * 0.3, 336, 352));
    // railing: rails and bars
    const rail = [poly([pt(wx - side * 12, 206, zc - d * 1.6), pt(wx - side * 12, 206, zc + d * 1.6)], false), poly([pt(wx - side * 12, 142, zc - d * 1.6), pt(wx - side * 12, 142, zc + d * 1.6)], false)];
    for (let j = 0; j <= 4; j++) {
      const zz = zc - d * 1.6 + (j * d * 3.2) / 4;
      rail.push(poly([pt(wx - side * 12, 142, zz), pt(wx - side * 12, 206, zz)], false));
    }
    groups.iron.push(...rail);
    // a clay pot of geraniums at the balcony foot
    const pz = zc + d * (k % 2 ? 0.9 : -0.9);
    const p0 = pt(wx - side * 18, 140, pz);
    const s = 1 / pz;
    groups.pots.push(poly([[p0[0] - 7 * s, p0[1] - 18 * s], [p0[0] + 7 * s, p0[1] - 18 * s], [p0[0] + 5 * s, p0[1]], [p0[0] - 5 * s, p0[1]]]));
    groups.blooms.push(florets(p0[0], p0[1] - 26 * s, 13 * s, 9 * s, { count: 7, r0: 3.2 * s + 0.6, r1: 5 * s + 0.8, seed: 900 + k + Math.round(b.za * 10), light: [-0.7, -0.7], under: 0.7 }));
  }
  return { groups, tone };
}

function facades(side) {
  const left = side < 0;
  const defs = left
    ? [
        { za: Z0, zb: 1.65, H: 446, color: ROSA, windows: 3, door: 1 },
        { za: 1.65, zb: 2.4, H: 418, color: TURQ, windows: 2 },
        { za: 2.4, zb: Z1, H: 440, color: CEMPA, windows: 2 },
      ]
    : [
        { za: Z0, zb: 1.55, H: 430, color: CEMPA, windows: 3 },
        { za: 1.55, zb: 2.35, H: 456, color: ROSA, windows: 2 },
        { za: 2.35, zb: Z1, H: 424, color: TURQ, windows: 2 },
      ];
  const shadeAmt = left ? 0.3 : 0;
  const out = [];
  defs.forEach((b, j) => {
    const { groups: g, tone } = building(side, b, shadeAmt);
    const wallColor = tone(b.color);
    const blooms = mergeFlorets(g.blooms);
    out.push(
      stack(`house_${j}`, [
        paint('wall', g.wall, wallColor, { pal: P }),
        left && hatchG('wall_hatch', g.wall, { color: mix(b.color, SHADE, 0.6), angle: 0, spacing: 3.6, w: 0.75, o: 26, inset: 0, seed: j }),
        paint('socle', g.socle, mix(wallColor, SHADE, 0.3)),
        paint('pilaster', g.pilaster, mix(CAL, SHADE, shadeAmt + 0.08)),
        paint('cornice_shade', g.corniceShade, mix(wallColor, SHADE, 0.35)),
        paint('cornice', g.cornice, mix(CAL, SHADE, shadeAmt), { pal: P }),
        paint('frames', g.frames, mix(CAL, SHADE, shadeAmt * 0.8), { pal: P }),
        paint('glass', g.glass, mix('#2B3446', SHADE, 0.2)),
        paint('glint', g.glint, mix('#9CC9DE', SHADE, shadeAmt), { o: 60 }),
        left ? null : paint('cast_shadows', g.cast, SHADE, { o: 26 }),
        paint('slabs', g.slabs, mix(CANTERA, SHADE, shadeAmt)),
        ink('iron', g.iron, IRON, left ? 1.1 : 1.2),
        paint('pots', g.pots, mix('#B5532E', SHADE, shadeAmt)),
        paint('geranium_leaf', blooms.under, mix(NOPAL, SHADE, shadeAmt + 0.1)),
        paint('geranium', [...blooms.shade, ...blooms.mid], mix('#E0303A', SHADE, shadeAmt)),
        paint('geranium_lit', blooms.lit, mix('#FF6F61', SHADE, shadeAmt)),
      ]),
    );
  });
  if (left) out.push(talaveraDoor());
  // the sunlit side: the left roofline throws its shadow across the lower facade
  return shapeLayer(left ? 'mid_facades_left' : 'mid_facades_right', out);
}

function talaveraDoor() {
  const wx = -WALL;
  const za = 1.16;
  const zb = 1.4;
  const tiles = [[], [], []];
  const ring = 18;
  const zs = [za, za + 0.06, zb - 0.06, zb];
  // tiles framing the doorway (two rows around the jambs and the lintel)
  let n = 0;
  for (let y = 0; y < 272; y += ring) {
    for (const [z0, z1] of [[zs[0], zs[1]], [zs[2], zs[3]]]) {
      tiles[n % 3].push(quad(wx, z0, z1, y, Math.min(272, y + ring)));
      n++;
    }
  }
  for (let k = 0; k < 6; k++) {
    const z0 = zs[1] + ((zs[2] - zs[1]) * k) / 6;
    const z1 = zs[1] + ((zs[2] - zs[1]) * (k + 1)) / 6;
    tiles[(n + k) % 3].push(quad(wx, z0, z1, 254, 272));
  }
  const door = quad(wx, zs[1], zs[2], 0, 254);
  const panels = [];
  for (const [y0, y1] of [[24, 112], [130, 236]]) {
    panels.push(quad(wx + 4, zs[1] + 0.03, (zs[1] + zs[2]) / 2 - 0.012, y0, y1), quad(wx + 4, (zs[1] + zs[2]) / 2 + 0.012, zs[2] - 0.03, y0, y1));
  }
  const tone = (c) => mix(c, SHADE, 0.22);
  return stack('turquoise_door', [
    paint('tile_blue', tiles[0], tone(TALAVERA), { pal: P }),
    paint('tile_white', tiles[1], tone(CAL)),
    paint('tile_yellow', tiles[2], tone(CEMPA)),
    paint('door', door, tone(TURQ)),
    paint('door_panels', panels, mix(TURQ, SHADE, 0.42)),
    paint('knocker', el(X(wx, 1.33), Y(122, 1.33), 5, 5), tone('#C9A54A')),
  ]);
}

/* ------------------------------------------------------------------ */
/* Templo de Santo Domingo                                              */
/* ------------------------------------------------------------------ */

const ST = {
  base: CANTERA,
  lit: mix(CANTERA, '#FFF3C0', 0.38),
  shade: mix(CANTERA, '#4C4A30', 0.4),
  dark: mix(CANTERA, '#2E2C1C', 0.62),
};

const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const archRect = (x0, x1, yTop, yBot) => {
  const r = (x1 - x0) / 2;
  return svg1(`M ${x0} ${yBot} L ${x0} ${yTop + r} A ${r} ${r} 0 0 1 ${x1} ${yTop + r} L ${x1} ${yBot} Z`);
};

function tower(cx, side) {
  const g = { stone: [], lit: [], shade: [], dark: [], tiles: [[], [], []], gold: [] };
  // shaft with pilasters and a string course
  g.stone.push(rect(cx - 26, 196, cx + 26, 302));
  g.lit.push(rect(cx - 26, 196, cx - 20, 302), rect(cx - 29, 190, cx + 29, 196), rect(cx - 27, 248, cx + 27, 252));
  g.shade.push(rect(cx + 20, 196, cx + 26, 302), rect(cx - 27, 252, cx + 27, 255));
  // belfry with an arched opening and its bell
  g.stone.push(rect(cx - 22, 150, cx + 22, 190));
  g.lit.push(rect(cx - 22, 150, cx - 17, 190), rect(cx - 26, 145, cx + 26, 150));
  g.shade.push(rect(cx + 17, 150, cx + 22, 190));
  g.dark.push(archRect(cx - 9, cx + 9, 156, 190));
  g.gold.push(svg1(`M ${cx - 5} 178 C ${cx - 5} 170 ${cx - 3} 167 ${cx} 167 C ${cx + 3} 167 ${cx + 5} 170 ${cx + 5} 178 Z`));
  // drum, tiled dome, lantern, finial
  g.stone.push(rect(cx - 18, 138, cx + 18, 145));
  const bands = 7;
  for (let b = 0; b < bands; b++) {
    const ya = 138 - (b * 26) / bands;
    const yb = 138 - ((b + 1) * 26) / bands;
    const hw = (y) => 18 * Math.sqrt(Math.max(0, 1 - ((138 - y) / 27) ** 2));
    const segs = 6 - Math.floor(b / 2);
    for (let s = 0; s < segs; s++) {
      const fa = -1 + (2 * s) / segs;
      const fb = -1 + (2 * (s + 1)) / segs;
      g.tiles[(b + s) % 3].push(poly([[cx + fa * hw(ya), ya], [cx + fb * hw(ya), ya], [cx + fb * hw(yb), yb], [cx + fa * hw(yb), yb]]));
    }
  }
  g.stone.push(rect(cx - 5, 100, cx + 5, 112));
  g.dark.push(rect(cx - 2.5, 103, cx - 0.8, 109), rect(cx + 0.8, 103, cx + 2.5, 109));
  g.lit.push(svg1(`M ${cx - 6} 100 C ${cx - 5} 95 ${cx + 5} 95 ${cx + 6} 100 Z`));
  g.stone.push(rect(cx - 0.8, 86, cx + 0.8, 96), rect(cx - 3.2, 89, cx + 3.2, 90.6));
  return g;
}

function santoDomingo() {
  const L = tower(331, -1);
  const R = tower(469, 1);
  const g = { stone: [...L.stone, ...R.stone], lit: [...L.lit, ...R.lit], shade: [...L.shade, ...R.shade], dark: [...L.dark, ...R.dark], tiles: [0, 1, 2].map((k) => [...L.tiles[k], ...R.tiles[k]]), gold: [...L.gold, ...R.gold] };
  // central retablo facade between the towers
  g.stone.push(rect(357, 168, 443, 302));
  g.stone.push(svg1('M 368 168 C 378 166 384 160 386 152 L 392 152 C 392 146 396 142 400 140 C 404 142 408 146 408 152 L 414 152 C 416 160 422 166 432 168 Z'));
  g.lit.push(rect(398.6, 132, 401.4, 141), rect(395.5, 135, 404.5, 137.4));
  g.dark.push(archRect(395, 405, 146, 164));
  g.lit.push(rect(355, 165, 445, 168), rect(355, 247, 445, 251), rect(355, 205, 445, 209));
  g.shade.push(rect(357, 251, 443, 253), rect(357, 209, 443, 211), rect(357, 168, 443, 170));
  // paired columns on the three tiers
  for (const [y0, y1] of [[253, 302], [211, 247], [170, 205]]) {
    for (const x of [364, 373, 421, 430]) {
      g.lit.push(rect(x, y0, x + 3, y1));
      g.shade.push(rect(x + 3, y0, x + 6, y1));
    }
  }
  // portal, choir window, relief panel, niches with abstract saints
  g.dark.push(archRect(386, 414, 258, 302));
  g.dark.push(archRect(393, 407, 217, 242));
  g.shade.push(rect(381, 176, 419, 203));
  g.lit.push(svg1('M 386 200 C 388 188 394 182 400 182 C 406 182 412 188 414 200 Z'));
  for (const x of [384, 416]) for (const y of [213, 255]) if (!(y === 255 && x === 0)) g.dark.push(archRect(x - 4, x + 4, y, y + 22));
  g.lit.push(...[384, 416].flatMap((x) => [el(x, 222, 4, 4), rect(x - 2, 225, x + 2, 233)]));
  const door = archRect(389, 411, 261, 302);
  const doorPanels = [rect(391, 272, 399, 300), rect(401, 272, 409, 300)];
  // the base course down to the atrium wall, and trees behind it at the sides
  g.stone.push(rect(305, 300, 495, 313));
  // slim cypresses in the slivers beside the towers, rising from behind the wall
  const trees = [[301, 296, 5.5, 18], [499, 297, 5.5, 17]].map(([x, y, rx, ry]) => svg1(`M ${x} ${y - ry} C ${x + rx} ${y - ry * 0.4} ${x + rx} ${y + ry * 0.4} ${x + rx * 0.6} ${y + ry} L ${x - rx * 0.6} ${y + ry} C ${x - rx} ${y + ry * 0.4} ${x - rx} ${y - ry * 0.4} ${x} ${y - ry} Z`));
  // atrium wall with an arched gate on the axis of the church door, agaves on top
  const wall = rect(296, 312, 504, 332);
  const coping = rect(294, 309, 506, 313);
  // a gate pier raised above the wall, its arch open onto the atrium floor
  const pier = rect(374, 298, 426, 332);
  const pierCap = rect(372, 295, 428, 299);
  const gate = archRect(384, 416, 304, 332);
  const atriumFloor = rect(386, 322, 414, 332);
  const gateGrille = [];
  for (let x = 388; x <= 412; x += 4) gateGrille.push(poly([[x, 312], [x, 332]], false));
  const contact = rect(290, 332, 510, 335);
  const agaves = [];
  for (const x of [318, 352, 446, 482]) {
    for (let k = 0; k < 7; k++) {
      const a = (-160 + k * 23) * (Math.PI / 180);
      const len = 13 - Math.abs(k - 3) * 1.4;
      agaves.push(leafShape([x, 312], [x + Math.cos(a) * len, 312 + Math.sin(a) * len], 3.4));
    }
  }
  const relief = rect(381, 176, 419, 203);
  return shapeLayer('landmark_santo_domingo', [stack('church', [
    paint('stone', g.stone, ST.base),
    hatchG('stone_hatch', [rect(474, 196, 495, 302), rect(474, 150, 491, 190), rect(337, 196, 357, 302)], { color: ST.dark, angle: 0, spacing: 3, w: 0.7, o: 30, inset: 0 }),
    paint('shade', g.shade, ST.shade),
    paint('lit', g.lit, ST.lit),
    paint('openings', g.dark, mix(IRON, ST.dark, 0.3)),
    paint('bells', g.gold, '#C9A040'),
    paint('door', door, '#5A3A26'),
    paint('door_panels', doorPanels, '#3E2818'),
    stippleG('relief', relief, { color: ST.dark, o: 70, count: 34, minDist: 2.6, r0: 0.5, r1: 0.9, seed: 3 }),
    stippleG('weathering', [rect(357, 210, 443, 300), rect(305, 196, 357, 302), rect(443, 196, 495, 302)], { color: ST.dark, o: 40, count: 50, minDist: 5, r0: 0.4, r1: 0.8, seed: 8 }),
    paint('dome_blue', g.tiles[0], TALAVERA, { pal: P }),
    paint('dome_white', g.tiles[1], CAL),
    paint('dome_yellow', g.tiles[2], CEMPA, { pal: P }),
    paint('atrium_trees', trees, mix(NOPAL, '#1E3A26', 0.35)),
    paint('atrium_wall', wall, mix(CAL, CANTERA, 0.25)),
    paint('atrium_coping', coping, ST.lit),
    paint('gate_pier', pier, mix(CAL, CANTERA, 0.25)),
    paint('gate_cap', pierCap, ST.lit),
    paint('gate', gate, mix(IRON, ST.dark, 0.3)),
    paint('atrium_floor', atriumFloor, mix(CANTERA, CAL, 0.5)),
    ink('gate_grille', gateGrille, mix(CANTERA, CAL, 0.4), 0.9),
    paint('contact_shadow', contact, SHADE, { o: 30 }),
    paint('atrium_agaves', agaves, mix(NOPAL, TALAVERA, 0.3)),
  ], { a: [400, 332], p: [400, Y(0, Z1)], s: [115, 115] })]);
}

/* ------------------------------------------------------------------ */
/* Papel picado                                                         */
/* ------------------------------------------------------------------ */

const FLAG_COLORS = [ROSA, CEMPA, TALAVERA, NOPAL, TURQ, '#7E3F9E', '#F06A2A'];

/** One flag: outline with scalloped / zig-zag hem and cut-outs as real holes. */
function flagShape(w, h, pattern) {
  const hw = w / 2;
  const hem = pattern % 2 ? 'zig' : 'scallop';
  const outer = [[-hw, 0], [hw, 0], [hw, h]];
  const teeth = 5;
  const inner = [];
  for (let k = teeth; k > 0; k--) {
    const xa = -hw + (w * k) / teeth;
    const xm = xa - w / teeth / 2;
    inner.push([xm, h + (hem === 'zig' ? h * 0.1 : h * 0.07)], [xa - w / teeth, h]);
  }
  const outline = hem === 'zig' ? poly([...outer, ...inner]) : scallopOutline(w, h, teeth);
  const holes = [];
  const H = (c) => holes.push(counterClockwise(c));
  // border perforations
  for (let k = 0; k < 5; k++) H(diamond(-hw + (w * (k + 0.5)) / 5, h * 0.14, w * 0.045, h * 0.035));
  if (pattern === 0 || pattern === 3) {
    // flower: centre and eight petals
    H(ellipsePath(0, h * 0.52, w * 0.08, w * 0.08));
    for (let k = 0; k < 8; k++) H(rotateAbout(translate(leafShape([0, 0], [0, -w * 0.2], w * 0.1), 0, h * 0.52 - w * 0.1), k * 45, 0, h * 0.52));
    for (const sx of [-1, 1]) H(diamond(sx * hw * 0.68, h * 0.84, w * 0.06, h * 0.05));
  } else if (pattern === 1 || pattern === 4) {
    // lattice of diamonds
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) H(diamond((c - 1) * w * 0.26, h * (0.36 + r * 0.19), w * 0.09, h * 0.07));
  } else {
    // eight-point star with circles
    H(star(0, h * 0.5, w * 0.24, w * 0.1));
    for (const [sx, sy] of [[-1, 0.28], [1, 0.28], [-1, 0.78], [1, 0.78]]) H(ellipsePath(sx * hw * 0.62, h * sy, w * 0.055, w * 0.055));
  }
  return [outline, ...holes];
}

function scallopOutline(w, h, teeth) {
  const hw = w / 2;
  let d = `M ${-hw} 0 L ${hw} 0 L ${hw} ${h}`;
  const tw = w / teeth;
  for (let k = 0; k < teeth; k++) {
    const xa = hw - k * tw;
    d += ` C ${xa} ${h + tw * 0.62} ${xa - tw} ${h + tw * 0.62} ${xa - tw} ${h}`;
  }
  return svg1(`${d} Z`);
}

const diamond = (x, y, rx, ry) => poly([[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y]]);
function star(x, y, r0, r1) {
  const pts = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2;
    const r = k % 2 ? r1 : r0;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return poly(pts);
}

function papelString(z, seed, { count, pattern = 0, fine = true, y = 392, gap = 0 }) {
  const r = rng(seed);
  const yA = y;
  const a = pt(-WALL, yA, z);
  const b = pt(WALL, yA, z);
  const sag = 34 / z;
  const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * sag];
  const line = [];
  for (let k = 0; k <= 12; k++) line.push(at(k / 12));
  const w = 58 / z;
  const h = 70 / z;
  const flags = [];
  for (let k = 0; k < count; k++) {
    const t = (k + 0.5) / count;
    const [x, y] = at(t);
    if (Math.abs(x - 400) < gap) continue; // keep the church readable through the strings
    const color = FLAG_COLORS[(k + seed) % FLAG_COLORS.length];
    const pat = fine ? (k + pattern) % 6 : 1 + ((k + pattern) % 2) * 3;
    const shape = flagShape(w, h, fine ? pat : pat);
    const fold = poly([[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.06], [-w / 2, h * 0.06]]);
    const ph = t * 0.85 + r.range(-0.04, 0.04);
    flags.push(
      stack(`flag_${k}`, [
        gr('cut', [...shape.map((c) => sh(c)), fl(color, { rule: 2, nm: P.nameOf(color) })]),
        gr('fold', [sh(fold), fl(mix(color, IRON, 0.25))]),
      ], {
        p: [x, y],
        r: cycle([-7, 7], { period: 80, phase: ph }),
        sk: cycle([-9, 9], { period: 80, phase: ph + 0.25 }),
        s: fine ? cycle([[100, 100], [100, 88]], { period: 80, phase: ph + 0.5 }) : [100, 100],
      }),
    );
  }
  return stack(`string_${seed}`, [ink('cord', poly(line, false), mix(IRON, CAL, 0.2), Math.max(0.7, 1.4 / z)), ...flags]);
}

/* ------------------------------------------------------------------ */
/* A nieves cart in the street                                          */
/* ------------------------------------------------------------------ */

function cart() {
  const z = 1.75;
  const x0 = 140;
  const x1 = 262;
  const box = poly([pt(x0, 30, z), pt(x1, 30, z), pt(x1, 86, z), pt(x0, 86, z)]);
  const boxSide = poly([pt(x0, 30, z), pt(x0, 30, z + 0.32), pt(x0, 86, z + 0.32), pt(x0, 86, z)]);
  const top = poly([pt(x0, 86, z), pt(x1, 86, z), pt(x1, 86, z + 0.32), pt(x0, 86, z + 0.32)]);
  const band = poly([pt(x0, 54, z), pt(x1, 54, z), pt(x1, 64, z), pt(x0, 64, z)]);
  const [wx, wy] = pt(x0 + 20, 16, z);
  const [wx2, wy2] = pt(x1 - 20, 16, z);
  const wheels = [el(wx, wy, 30 / z, 30 / z), el(wx2, wy2, 30 / z, 30 / z)];
  const hubs = [el(wx, wy, 8 / z, 8 / z), el(wx2, wy2, 8 / z, 8 / z)];
  const [px, py] = pt((x0 + x1) / 2, 86, z + 0.16);
  const [tx, ty] = pt((x0 + x1) / 2, 196, z + 0.16);
  const R = 90 / z;
  const canopy = svg1(`M ${tx - R} ${ty + 14 / z} C ${tx - R * 0.8} ${ty - 30 / z} ${tx + R * 0.8} ${ty - 30 / z} ${tx + R} ${ty + 14 / z} Z`);
  const stripes = [-0.6, -0.2, 0.2, 0.6].map((f, k) => (k % 2 ? null : poly([[tx + f * R, ty + 14 / z], [tx, ty - 22 / z], [tx + (f + 0.4) * R, ty + 14 / z]]))).filter(Boolean);
  const shadow = poly([pt(x0, 0, z), pt(x1, 0, z), pt(x1 + 70, 0, z + 0.32), pt(x0 + 70, 0, z + 0.32)]);
  const [ux, uy] = pt((x0 + x1) / 2 + 150, 0, z + 0.18);
  const umbrellaShadow = el(ux, uy, 120 / z, 22 / z);
  return shapeLayer('fg_nieves_cart', [
    paint('cart_shadow', [shadow, umbrellaShadow], SHADE, { o: 24 }),
    paint('cart_side', boxSide, mix(TURQ, SHADE, 0.35)),
    paint('cart', box, TURQ),
    paint('cart_band', band, CAL, { pal: P }),
    paint('cart_top', top, mix(CAL, CANTERA, 0.3)),
    ink('pole', poly([[px, py], [tx, ty]], false), IRON, 1.4),
    paint('canopy', canopy, CAL, { pal: P }),
    paint('canopy_stripes', stripes, ROSA, { pal: P }),
    paint('wheels', wheels, IRON),
    paint('hubs', hubs, mix(CANTERA, CAL, 0.4)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Foreground plants                                                    */
/* ------------------------------------------------------------------ */

function agave() {
  const base = [92, 440];
  const leaves = [];
  const lit = [];
  const spines = [];
  const r = rng(5);
  for (let k = 0; k < 11; k++) {
    const a = (-168 + k * 15.5 + r.range(-4, 4)) * (Math.PI / 180);
    const len = 70 + r.range(-8, 18) - Math.abs(k - 5) * 3;
    const tip = [base[0] + Math.cos(a) * len, base[1] + Math.sin(a) * len * 0.95];
    const leaf = leafShape(base, tip, 15, { bend: Math.cos(a) * -0.06, round: 0.15 });
    (Math.cos(a) < -0.1 ? lit : leaves).push(leaf);
    spines.push(leafShape([base[0] + Math.cos(a) * len * 0.9, base[1] + Math.sin(a) * len * 0.86], tip, 2.4));
  }
  const pot = svg1('M 14 452 C 6 470 10 492 24 506 L 162 506 C 176 492 180 470 172 452 C 150 444 36 444 14 452 Z');
  const potLit = svg1('M 30 456 C 24 470 26 488 34 500 L 44 500 C 38 486 38 470 42 456 Z');
  const rim = svg1('M 10 446 C 40 438 146 438 176 446 L 176 456 C 146 448 40 448 10 456 Z');
  const agaveC = mix(NOPAL, '#6FA3A0', 0.55);
  return stack('agave', [
    paint('pot', pot, '#262224'),
    paint('pot_glint', potLit, '#5D5658'),
    hatchG('pot_burnish', pot, { color: '#7A7173', angle: 80, spacing: 3.2, w: 0.7, o: 30, seed: 2 }),
    paint('rim', rim, '#3A3436'),
    paint('leaves', leaves, mix(agaveC, '#20403A', 0.3)),
    paint('leaves_lit', lit, mix(agaveC, CAL, 0.18)),
    paint('spines', spines, '#7A3B2A'),
  ]);
}

function nopal() {
  const pads = [
    [700, 438, 30, 40, 0],
    [668, 396, 24, 33, -24],
    [728, 392, 25, 34, 18],
    [700, 352, 21, 29, 4],
    [752, 352, 18, 25, 32],
    [646, 352, 17, 24, -30],
  ];
  const shapes = [];
  const lit = [];
  pads.forEach(([x, y, rx, ry, rot]) => {
    shapes.push(rotateAbout(ellipsePath(x, y, rx, ry), rot, x, y));
    lit.push(rotateAbout(ellipsePath(x - rx * 0.22, y - ry * 0.12, rx * 0.62, ry * 0.72), rot, x, y));
  });
  const tunas = [];
  for (const [x, y] of [[690, 322], [704, 320], [716, 325], [742, 326], [758, 330], [640, 328], [654, 324], [736, 364]]) tunas.push(svg1(`M ${x} ${y + 7} C ${x - 6} ${y + 6} ${x - 6} ${y - 4} ${x} ${y - 7} C ${x + 6} ${y - 4} ${x + 6} ${y + 6} ${x} ${y + 7} Z`));
  const pot = svg1('M 626 470 C 618 486 622 500 630 508 L 776 508 C 784 500 788 486 780 470 C 758 462 648 462 626 470 Z');
  const rim = svg1('M 620 462 C 652 454 754 454 786 462 L 786 474 C 754 466 652 466 620 474 Z');
  const marigolds = mergeFlorets([
    florets(616, 470, 26, 16, { count: 16, r0: 3, r1: 5, seed: 31, light: [-0.7, -0.7] }),
    florets(790, 474, 22, 15, { count: 14, r0: 3, r1: 5, seed: 32, light: [-0.7, -0.7] }),
    florets(560, 492, 20, 12, { count: 11, r0: 3, r1: 4.8, seed: 33, light: [-0.7, -0.7] }),
  ]);
  return stack('nopal', [
    paint('pads', shapes, mix(NOPAL, '#1E3A26', 0.25)),
    paint('pads_lit', lit, NOPAL, { pal: P }),
    stippleG('areoles', shapes, { color: '#F4E7B0', o: 85, count: 60, minDist: 6, r0: 0.7, r1: 1.1, seed: 4 }),
    paint('tunas', tunas, ROSA, { pal: P }),
    paint('pot', pot, '#B5532E'),
    paint('pot_shade', svg1('M 740 466 C 760 470 776 480 780 470 C 788 486 784 500 776 508 L 742 508 C 752 494 754 480 740 466 Z'), '#7E3420'),
    paint('rim', rim, '#C96A40'),
    paint('marigold_leaf', marigolds.under, mix(NOPAL, '#1E3A26', 0.4)),
    paint('marigold_shade', marigolds.shade, mix(CEMPA, '#C2410C', 0.45)),
    paint('marigold', marigolds.mid, CEMPA, { pal: P }),
    paint('marigold_lit', marigolds.lit, mix(CEMPA, '#FFE58A', 0.5)),
  ], { a: [700, 508], p: [704, 524], s: [85, 85] });
}

function petals() {
  const shape = svg1('M 0 -5.4 C 4.2 -4.8 4.8 3.2 0 5.4 C -4.8 3.2 -4.2 -4.8 0 -5.4 Z');
  const out = [];
  for (let j = 0; j < 10; j++) {
    const r = rng(70 + j * 3);
    const x0 = r.range(60, 740);
    const phase = j / 10 + r.range(-0.03, 0.03);
    const spin = gr('spin', [sh(shape), fl(r.pick([CEMPA, mix(CEMPA, '#F06A2A', 0.4), mix(CEMPA, '#FFE58A', 0.3)]), { nm: undefined })], {
      r: keys([{ t: 0, v: 0, e: 'linear' }, { t: 240, v: 360 * r.sign() }]),
      s: cycle([[100, 100], [-100, 100]], { period: 120, phase: r.next() }),
    });
    out.push(stack(`petal_${j}`, [stack('sway', [spin], { p: cycle([[-16, 0], [16, 0]], { period: 120, phase: r.next() }) })], { p: drift([x0, 150], [x0 + r.range(-60, 60), 530], { period: 240, phase }) }));
  }
  return shapeLayer('fx_marigold_petals', out);
}

/* ------------------------------------------------------------------ */

export default {
  id: '03-mexico-oaxaca',
  palette: P.list,
  build() {
    return composition({
      nm: 'Waymark · Mexico, Oaxaca',
      layers: [
        sky(),
        clouds(),
        street(),
        facades(-1),
        facades(1),
        santoDomingo(),
        cart(),
        shapeLayer('fg_papel_picado_far', [papelString(2.7, 3, { count: 9, fine: false, gap: 112 }), papelString(2.0, 5, { count: 9, fine: false, pattern: 1, gap: 112 })]),
        shapeLayer('fg_papel_picado_near', [papelString(1.35, 7, { count: 9, pattern: 2, y: 424, gap: 66 })]),
        shapeLayer('fg_plants', [agave(), nopal()]),
        petals(),
      ],
    });
  },
};

