// 08 · Portugal, Lisbon: Tram 28 at golden hour.
// One-point perspective down a steep Alfama street towards the Tagus: an
// azulejo-tiled facade with an iron balcony and geraniums on the left, an
// ochre house with shutters and a street lamp on the right, washing strung
// between them, the yellow Remodelado tram climbing towards us on its rails
// under the contact wire, black-and-white calcada waves on the street, and at
// the end of the street the Se's towers, rooftops, the river and the red
// 25 de Abril bridge.

import { mix } from '../lib/color.mjs';
import { jaggedLine, poly, rng, svg1 } from '../lib/geom.mjs';
import { composition, cycle, el, fl, gr, keys, sh, shapeLayer, stack } from '../lib/lottie.mjs';
import { florets, glow, ink, mergeFlorets, paint, palette, vGradientRect } from '../lib/art.mjs';

const P = palette(['#F2B705', '#1F4FA3', '#C8623A', '#5C8FB0', '#EFE7DA']);
const [AMARELO, AZULEJO, TELHA, TEJO, CALCADA] = P.list;
const SKY_TOP = '#E8C9A2';
const SKY_LOW = '#FBE2B8';
const HAZE = '#F4D9B4';
const SHADE = '#4A3E5C';
const BASALT = '#2A2626';
const BRIDGE_RED = '#C0392B';
const PLASTER = '#EBC08E';
const IRON = '#24202A';

/* ------------------------------------------------------------------ */
/* Perspective: one vanishing point at the end of the street             */
/* ------------------------------------------------------------------ */

// Street coordinates: X across (left wall XL, right wall XR), Y up from the
// street, Z away from the viewer; the eye is EYE above the street. Z = 1 is
// the bottom edge of the frame.
const VP = [330, 205];
const K = 315;
const EYE = 2.4;
const XL = -340 / (K / EYE);
const XR = 480 / (K / EYE);
const ZEND = 6;
const WIRE_Y = 2.8;
const S = (X, Y, Z) => [VP[0] + ((K / EYE) * X) / Z, VP[1] + (K * (EYE - Y)) / EYE / Z];
const Q = (list) => poly(list.map(([X, Y, Z]) => S(X, Y, Z)));
/** Quad on the left or right wall plane between depths z0..z1 and heights y0..y1. */
const wall = (X, z0, z1, y0, y1) => Q([[X, y0, z0], [X, y0, z1], [X, y1, z1], [X, y1, z0]]);
const YTOP_L = 3.66;
const YTOP_R = 3.78;

/* ------------------------------------------------------------------ */
/* Sky and the view at the end of the street                            */
/* ------------------------------------------------------------------ */

function sky() {
  return shapeLayer('bg_sky', [
    vGradientRect('gradient', 0, 0, 800, 500, [[0, SKY_TOP], [0.6, '#F7DDB6'], [1, SKY_LOW]], { y0: 0, y1: 220 }),
    stack('sun', [glow('sun_glow', 420, 170, 260, 130, '#FFE3A8', { alpha: 0.8, mid: 0.45 })], { o: cycle([70, 100], { period: 240 }) }),
  ]);
}

function vista() {
  // the Tagus and Almada across it, the bridge, rooftops falling to the river, the Se
  const shore = jaggedLine([[230, 194], [300, 190], [360, 193], [430, 188], [470, 191]], { depth: 2, rough: 0.12, seed: 7 });
  const almada = poly([...shore, [470, 199], [230, 199]]);
  const water = poly([[230, 197], [470, 197], [470, 230], [230, 230]]);
  const red = mix(BRIDGE_RED, HAZE, 0.3);
  const towers = [poly([[355, 160], [358, 160], [359, 198], [354, 198]]), poly([[404, 158], [407, 158], [408, 198], [403, 198]])];
  const deck = poly([[330, 195], [470, 192], [470, 195.5], [330, 198.5]]);
  const cable = poly(Array.from({ length: 9 }, (_, k) => [356.5 + (49 * k) / 8, 160 + Math.sin((Math.PI * k) / 8) * 20]), false);
  const backstay = poly([[332, 195], [356.5, 160]], false);
  const forestay = poly([[405.5, 158], [438, 192]], false);
  // rooftops cascading down to the river
  const r = rng(17);
  const roofs = [];
  const wallsH = [];
  for (let row = 0; row < 4; row++) {
    const y = 234 + row * 8;
    const s = 0.5 + row * 0.12;
    for (let x = 240 + r.range(0, 8); x < 470; x += r.range(14, 22) * s + 6) {
      const w = r.range(12, 20) * s + 4;
      const h = r.range(5, 8) * s + 3;
      wallsH.push(poly([[x, y - h], [x + w, y - h], [x + w, y + 4], [x, y + 4]]));
      roofs.push(poly([[x - 1.5, y - h], [x + w * 0.25, y - h - 4 * s - 1], [x + w * 0.75, y - h - 4 * s - 1], [x + w + 1.5, y - h]]));
    }
  }
  // the Se: twin crenellated towers rising above the rooftops
  const stone = mix('#E2C9A0', HAZE, 0.08);
  const stoneShade = mix('#B39672', HAZE, 0.1);
  const merlons = (x0, x1, y) => Array.from({ length: Math.floor((x1 - x0) / 4.4) }, (_, k) => poly([[x0 + k * 4.4, y], [x0 + k * 4.4 + 2.6, y], [x0 + k * 4.4 + 2.6, y - 3.4], [x0 + k * 4.4, y - 3.4]]));
  const se = [poly([[278, 150], [294, 150], [294, 236], [278, 236]]), poly([[306, 148], [322, 148], [322, 236], [306, 236]]), poly([[294, 166], [306, 166], [306, 236], [294, 236]])];
  const seShade = [poly([[278, 150], [283, 150], [283, 236], [278, 236]]), poly([[306, 148], [311, 148], [311, 236], [306, 236]])];
  const seOpen = [svg1('M 284 170 L 284 164 C 284 161 288 161 288 164 L 288 170 Z'), svg1('M 312 168 L 312 162 C 312 159 316 159 316 162 L 316 168 Z')];
  return shapeLayer('far_vista', [
    paint('almada', almada, mix(TEJO, HAZE, 0.62)),
    paint('river', water, TEJO, { pal: P }),
    ink('bridge_cables', [cable, backstay, forestay], red, 1),
    paint('bridge', [...towers, deck], red),
    paint('se_towers', se, stone),
    paint('se_shade', seShade, stoneShade),
    paint('se_merlons', [...merlons(278, 294, 150), ...merlons(306, 322, 148), ...merlons(294, 306, 166)], stone),
    paint('se_openings', seOpen, mix(SHADE, stone, 0.35)),
    paint('far_walls', wallsH, mix('#F3E3C4', HAZE, 0.25)),
    paint('far_roofs', roofs, mix(TELHA, HAZE, 0.25)),
  ]);
}

/* ------------------------------------------------------------------ */
/* The street: calcada mar largo projected on the ground, rails, curbs   */
/* ------------------------------------------------------------------ */

function street() {
  const ground = Q([[XL, 0, 0.9], [XR, 0, 0.9], [XR, 0, ZEND], [XL, 0, ZEND]]);
  const SW = 0.6;
  const road = [XL + SW, XR - SW];
  // black basalt waves running across the street, foreshortened with depth
  const waves = [];
  const wr = rng(41);
  const farWaves = [];
  for (let z = 0.95; z < 5.2; z += 0.3 + z * 0.04) {
    const pts = [];
    const n = 14;
    const ph = wr.range(0, 1.2);
    const amp = 0.06 + wr.range(0, 0.04);
    const w = 0.11 + wr.range(0, 0.07);
    for (let k = 0; k <= n; k++) {
      const X = road[0] + ((road[1] - road[0]) * k) / n;
      pts.push([X, z + Math.sin(X * 2.1 + ph) * amp]);
    }
    const top = pts.map(([X, Z]) => S(X, 0, Z));
    const bot = pts.map(([X, Z]) => S(X, 0, Z + w)).reverse();
    (z < 3.4 ? waves : farWaves).push(poly([...top, ...bot]));
  }
  // sidewalks with a raised curb
  const walkL = Q([[XL, 0.1, 0.9], [XL + SW, 0.1, 0.9], [XL + SW, 0.1, ZEND], [XL, 0.1, ZEND]]);
  const walkR = Q([[XR - SW, 0.1, 0.9], [XR, 0.1, 0.9], [XR, 0.1, ZEND], [XR - SW, 0.1, ZEND]]);
  const curbL = Q([[XL + SW, 0, 0.9], [XL + SW, 0.1, 0.9], [XL + SW, 0.1, ZEND], [XL + SW, 0, ZEND]]);
  const curbR = Q([[XR - SW, 0, 0.9], [XR - SW, 0.1, 0.9], [XR - SW, 0.1, ZEND], [XR - SW, 0, ZEND]]);
  const borders = [[XL + 0.08, 0.1], [XR - 0.08, 0.1]].map(([X, Y]) => poly([S(X, Y, 0.9), S(X, Y, ZEND)], false));
  // the tram rails: thin quads so they taper with distance
  const rails = [2.02, 2.68].map((X) => Q([[X - 0.035, 0, 0.9], [X + 0.035, 0, 0.9], [X + 0.035, 0, ZEND], [X - 0.035, 0, ZEND]]));
  const railGlint = [2.02, 2.68].map((X) => poly([S(X, 0, 0.9), S(X, 0, ZEND)], false));
  return shapeLayer('mid_street', [
    paint('calcada', ground, CALCADA, { pal: P }),
    paint('waves', waves, BASALT, { o: 88 }),
    paint('far_waves', farWaves, BASALT, { o: 45 }),
    paint('sidewalks', [walkL, walkR], mix(CALCADA, '#FFFFFF', 0.35)),
    ink('sidewalk_borders', borders, BASALT, 1.2, { o: 70 }),
    paint('curbs', [curbL, curbR], '#B9AE9C'),
    paint('rails', rails, '#6E6A70'),
    ink('rail_glint', railGlint, '#FFE2B0', 0.8, { o: 75 }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Facades                                                              */
/* ------------------------------------------------------------------ */

/** Window on a wall plane: frame, glass and optional shutters. */
function windowOn(X, z0, z1, y0, y1, out, { shutters = false } = {}) {
  const dz = (z1 - z0) * 0.08;
  out.frames.push(wall(X, z0, z1, y0, y1));
  out.glass.push(wall(X, z0 + dz, z1 - dz, y0 + 0.08, y1 - 0.08));
  out.mullions.push(poly([S(X, y0 + 0.08, (z0 + z1) / 2), S(X, y1 - 0.08, (z0 + z1) / 2)], false));
  if (shutters) out.shutters.push(wall(X, z0 - (z1 - z0) * 0.42, z0 - 0.02, y0, y1), wall(X, z1 + 0.02, z1 + (z1 - z0) * 0.42, y0, y1));
}

function leftFacade() {
  const face = wall(XL, 0.9, ZEND, 0, YTOP_L);
  // azulejos: a projected tile grid with a blue star in every near tile,
  // diamonds at the joints and light grout
  const T = 0.3;
  const stars = [];
  const knots = [];
  const grout = [];
  const at = (z, y) => S(XL, y, z);
  const openings = [[1.25, 1.95, 2.0, 3.3], [2.5, 3.1, 2.05, 3.25], [2.65, 3.2, 0.85, 1.75], [1.33, 2.07, 0, 1.7], [1.1, 2.15, 1.85, 2.6]];
  const covered = (z, y) => openings.some(([z0, z1, y0, y1]) => z > z0 && z < z1 && y > y0 && y < y1);
  for (let z = 1.05; z < 3.3; z += T) {
    for (let y = 0; y < YTOP_L - T * 0.5; y += T) {
      const map = (u, v) => at(z + u * T, y + v * T);
      if (!covered(z + T / 2, y + T / 2)) {
        const st = [[0.5, 0.2], [0.57, 0.43], [0.8, 0.5], [0.57, 0.57], [0.5, 0.8], [0.43, 0.57], [0.2, 0.5], [0.43, 0.43]];
        stars.push(poly(st.map(([u, v]) => map(u, v))));
      }
      if (!covered(z, y)) knots.push(poly([[0, -0.12], [0.12, 0], [0, 0.12], [-0.12, 0]].map(([u, v]) => map(u, v))));
    }
  }
  for (let y = T; y < YTOP_L; y += T) grout.push(poly([at(0.9, y), at(ZEND, y)], false));
  for (let z = 0.9 + T; z < ZEND; z += z < 3.3 ? T : T * 2) grout.push(poly([at(z, 0), at(z, YTOP_L)], false));
  // openings: a door, windows, an iron balcony with geraniums
  const o = { frames: [], glass: [], mullions: [], shutters: [] };
  windowOn(XL, 1.3, 1.9, 2.05, 3.25, o);
  windowOn(XL, 2.55, 3.05, 2.1, 3.2, o);
  windowOn(XL, 3.9, 4.3, 2.15, 3.15, o);
  windowOn(XL, 2.7, 3.15, 0.9, 1.7, o);
  const door = wall(XL, 1.45, 1.95, 0, 1.55);
  const doorFrame = wall(XL, 1.38, 2.02, 0, 1.65);
  const slab = Q([[XL, 2.0, 1.15], [XL + 0.42, 2.0, 1.15], [XL + 0.42, 2.0, 2.1], [XL, 2.0, 2.1]]);
  const slabEdge = Q([[XL + 0.42, 1.9, 1.15], [XL + 0.42, 2.0, 1.15], [XL + 0.42, 2.0, 2.1], [XL + 0.42, 1.9, 2.1]]);
  const slabEnd = Q([[XL, 1.9, 1.15], [XL + 0.42, 1.9, 1.15], [XL + 0.42, 2.0, 1.15], [XL, 2.0, 1.15]]);
  const rail = [poly([S(XL + 0.42, 2.55, 1.15), S(XL + 0.42, 2.55, 2.1)], false)];
  for (let z = 1.15; z <= 2.1; z += 0.09) rail.push(poly([S(XL + 0.42, 2.0, z), S(XL + 0.42, 2.55, z)], false));
  const potZ = [1.32, 1.6, 1.9];
  const pots = potZ.map((z) => Q([[XL + 0.3, 2.0, z - 0.06], [XL + 0.3, 2.0, z + 0.06], [XL + 0.3, 2.18, z + 0.07], [XL + 0.3, 2.18, z - 0.07]]));
  const ger = mergeFlorets(potZ.map((z, j) => {
    const [x, y] = S(XL + 0.3, 2.34, z);
    const s = 1 / z;
    return florets(x, y, 13 * s, 10 * s, { count: 7, r0: 3.6 * s, r1: 5.2 * s, seed: 80 + j, light: [0.7, -0.7] });
  }));
  // eave and roof edge overhanging the street, chimneys against the sky
  const eaveUnder = Q([[XL, YTOP_L, 0.9], [XL + 0.4, YTOP_L + 0.08, 0.9], [XL + 0.4, YTOP_L + 0.08, ZEND], [XL, YTOP_L, ZEND]]);
  const eaveEdge = Q([[XL + 0.4, YTOP_L + 0.08, 0.9], [XL + 0.4, YTOP_L + 0.3, 0.9], [XL + 0.4, YTOP_L + 0.3, ZEND], [XL + 0.4, YTOP_L + 0.08, ZEND]]);
  // upright chimney boxes: the face towards the street and the face towards us
  const chim = [[1.7, 0.7], [3.5, 0.6]];
  const chimneys = chim.map(([z, h]) => Q([[XL - 0.15, YTOP_L + 0.25, z], [XL - 0.15, YTOP_L + 0.25 + h, z], [XL - 0.15, YTOP_L + 0.25 + h, z + 0.35], [XL - 0.15, YTOP_L + 0.25, z + 0.35]]));
  const chimneyFronts = chim.map(([z, h]) => Q([[XL - 0.6, YTOP_L + 0.25, z], [XL - 0.15, YTOP_L + 0.25, z], [XL - 0.15, YTOP_L + 0.25 + h, z], [XL - 0.6, YTOP_L + 0.25 + h, z]]));
  const chimneyCaps = chim.map(([z, h]) => Q([[XL - 0.66, YTOP_L + 0.25 + h, z - 0.04], [XL - 0.1, YTOP_L + 0.25 + h, z - 0.04], [XL - 0.1, YTOP_L + 0.37 + h, z - 0.04], [XL - 0.66, YTOP_L + 0.37 + h, z - 0.04]]));
  return shapeLayer('fg_azulejo_facade', [
    paint('tiles', face, mix(CALCADA, '#FFFFFF', 0.5)),
    paint('tile_tint_far', wall(XL, 3.3, ZEND, 0, YTOP_L), mix(AZULEJO, '#FFFFFF', 0.72)),
    paint('tile_stars', stars, AZULEJO, { pal: P }),
    paint('tile_knots', knots, mix(AZULEJO, '#7FA6D8', 0.35)),
    ink('grout', grout, mix(CALCADA, '#8A96A8', 0.5), 0.6, { o: 70 }),
    paint('wall_shade', face, SHADE, { o: 16 }),
    paint('frames', o.frames, '#6B4A32'),
    paint('glass', o.glass, mix('#2A3550', '#FFC877', 0.2)),
    ink('mullions', o.mullions, '#6B4A32', 1),
    paint('door_frame', doorFrame, mix(CALCADA, '#B9A88E', 0.4)),
    paint('door', door, mix('#2E5A44', SHADE, 0.2)),
    paint('balcony_top', slab, '#9A9088'),
    paint('balcony_slab', [slabEdge, slabEnd], '#5A5258'),
    ink('balcony_rail', rail, IRON, 1),
    paint('pots', pots, TELHA, { pal: P }),
    paint('geranium_leaves', ger.under, '#3E6A3A'),
    paint('geraniums', [...ger.shade, ...ger.mid], '#D9343A'),
    paint('geraniums_lit', ger.lit, '#FF7468'),
    paint('chimneys', chimneys, mix(TELHA, '#E9C9A0', 0.35)),
    paint('chimney_fronts', chimneyFronts, mix(TELHA, '#F3E3C8', 0.6)),
    paint('chimney_caps', chimneyCaps, mix(TELHA, CALCADA, 0.35)),
    paint('eave_under', eaveUnder, mix(CALCADA, '#D9C9AE', 0.5)),
    paint('eave_edge', eaveEdge, mix(TELHA, CALCADA, 0.4)),
  ]);
}

function rightFacade() {
  const face = wall(XR, 0.9, ZEND, 0, YTOP_R);
  const plinth = wall(XR, 0.9, ZEND, 0, 0.55);
  const o = { frames: [], glass: [], mullions: [], shutters: [] };
  for (const [z0, z1] of [[1.2, 1.55], [2.3, 2.62], [3.6, 3.9], [5.0, 5.25]]) {
    windowOn(XR, z0, z1, 2.05, 3.2, o, { shutters: true });
  }
  windowOn(XR, 2.4, 2.75, 0.55, 1.4, o, { shutters: true });
  const door = wall(XR, 1.15, 1.6, 0, 1.6);
  const doorArch = wall(XR, 1.1, 1.65, 1.6, 1.72);
  // a cornice line between the floors
  const cornice = Q([[XR, 1.6, 0.9], [XR - 0.2, 1.66, 0.9], [XR - 0.2, 1.78, 0.9], [XR, 1.78, 0.9], [XR, 1.78, ZEND], [XR - 0.2, 1.78, ZEND], [XR - 0.2, 1.66, ZEND], [XR, 1.6, ZEND]]);
  const corniceShade = Q([[XR, 1.54, 0.9], [XR, 1.6, 0.9], [XR, 1.6, ZEND], [XR, 1.54, ZEND]]);
  // wrought-iron street lamp on a bracket
  const arm = poly([S(XR, 2.55, 1.55), S(XR - 0.5, 2.62, 1.55), S(XR - 0.62, 2.5, 1.55)], false);
  const [lx, ly] = S(XR - 0.62, 2.3, 1.55);
  const lamp = svg1(`M ${lx - 6} ${ly - 8} L ${lx + 6} ${ly - 8} L ${lx + 4.6} ${ly + 8} L ${lx - 4.6} ${ly + 8} Z`);
  const lampCap = svg1(`M ${lx - 8} ${ly - 8} L ${lx} ${ly - 15} L ${lx + 8} ${ly - 8} Z`);
  const eaveUnder = Q([[XR, YTOP_R, 0.9], [XR - 0.45, YTOP_R + 0.08, 0.9], [XR - 0.45, YTOP_R + 0.08, ZEND], [XR, YTOP_R, ZEND]]);
  const eaveEdge = Q([[XR - 0.45, YTOP_R + 0.08, 0.9], [XR - 0.45, YTOP_R + 0.3, 0.9], [XR - 0.45, YTOP_R + 0.3, ZEND], [XR - 0.45, YTOP_R + 0.08, ZEND]]);
  const chimney = Q([[XR + 0.15, YTOP_R + 0.25, 2.6], [XR + 0.15, YTOP_R + 0.85, 2.6], [XR + 0.15, YTOP_R + 0.85, 2.95], [XR + 0.15, YTOP_R + 0.25, 2.95]]);
  const chimneyFront = Q([[XR + 0.15, YTOP_R + 0.25, 2.6], [XR + 0.6, YTOP_R + 0.25, 2.6], [XR + 0.6, YTOP_R + 0.85, 2.6], [XR + 0.15, YTOP_R + 0.85, 2.6]]);
  return shapeLayer('mid_ochre_facade', [
    paint('plaster', face, PLASTER),
    paint('plaster_shade', face, SHADE, { o: 12 }),
    paint('plinth', plinth, mix(PLASTER, '#8A6A4A', 0.35)),
    paint('cornice_shade', corniceShade, mix(PLASTER, SHADE, 0.35)),
    paint('cornice', cornice, mix(PLASTER, '#FFFFFF', 0.4)),
    paint('shutters', o.shutters, '#3E7A5A'),
    paint('frames', o.frames, mix(CALCADA, '#FFFFFF', 0.3)),
    paint('glass', o.glass, mix('#2A3550', '#FFC877', 0.2)),
    ink('mullions', o.mullions, mix(CALCADA, '#FFFFFF', 0.3), 1),
    paint('door_arch', doorArch, mix(CALCADA, '#B9A88E', 0.3)),
    paint('door', door, '#6B3A2A'),
    ink('lamp_arm', arm, IRON, 1.6),
    paint('lamp', lamp, '#FFE7A8'),
    paint('lamp_cap', lampCap, IRON),
    paint('chimney', chimney, mix(PLASTER, '#C9A57A', 0.3)),
    paint('chimney_front', chimneyFront, mix(PLASTER, '#FFFFFF', 0.25)),
    paint('eave_under', eaveUnder, mix(CALCADA, '#D9C9AE', 0.5)),
    paint('eave_edge', eaveEdge, mix(TELHA, CALCADA, 0.4)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Tram 28 (Remodelado), in the same perspective                         */
/* ------------------------------------------------------------------ */

function tram() {
  const X0 = 1.6;
  const X1 = 3.1;
  const ZF = 1.75;
  const ZB = 5.4;
  const Y0 = 0.22;
  const BELT = 1.12;
  const Y1 = 2.0;
  const roofY = (X) => Y1 + 0.2 * Math.sin((Math.PI * (X - X0)) / (X1 - X0));
  const xs = Array.from({ length: 9 }, (_, k) => X0 + ((X1 - X0) * k) / 8);
  // front face (facing us) and left side (receding to the vanishing point)
  const frontLow = Q([[X0, Y0, ZF], [X1, Y0, ZF], [X1, BELT, ZF], [X0, BELT, ZF]]);
  const frontHigh = poly([S(X0, BELT, ZF), S(X1, BELT, ZF), ...xs.slice().reverse().map((X) => S(X, roofY(X), ZF))]);
  const sideLow = Q([[X0, Y0, ZF], [X0, BELT, ZF], [X0, BELT, ZB], [X0, Y0, ZB]]);
  const sideHigh = Q([[X0, BELT, ZF], [X0, Y1, ZF], [X0, Y1, ZB], [X0, BELT, ZB]]);
  const roof = poly([...xs.map((X) => S(X, roofY(X), ZF)), ...xs.slice().reverse().map((X) => S(X, roofY(X), ZB))]);
  const roofLip = Q([[X0, Y1, ZF], [X0, Y1 + 0.05, ZF], [X0, Y1 + 0.05, ZB], [X0, Y1, ZB]]);
  const sideBelt = Q([[X0, BELT - 0.06, ZF], [X0, BELT, ZF], [X0, BELT, ZB], [X0, BELT - 0.06, ZB]]);
  const frontBelt = Q([[X0, BELT - 0.06, ZF], [X1, BELT - 0.06, ZF], [X1, BELT, ZF], [X0, BELT, ZF]]);
  const sideWins = [];
  const n = 6;
  for (let k = 0; k < n; k++) {
    const z0 = ZF + 0.45 + ((ZB - ZF - 0.7) * k) / n;
    const z1 = z0 + ((ZB - ZF - 0.7) / n) * 0.78;
    sideWins.push(Q([[X0, 1.3, z0], [X0, 1.3, z1], [X0, 1.85, z1], [X0, 1.85, z0]]));
  }
  const door = Q([[X0, Y0 + 0.05, ZF + 0.08], [X0, Y0 + 0.05, ZF + 0.38], [X0, 1.9, ZF + 0.38], [X0, 1.9, ZF + 0.08]]);
  const frontWins = [Q([[X0 + 0.12, 1.28, ZF], [X0 + 0.7, 1.28, ZF], [X0 + 0.7, 1.86, ZF], [X0 + 0.12, 1.86, ZF]]), Q([[X0 + 0.8, 1.28, ZF], [X1 - 0.12, 1.28, ZF], [X1 - 0.12, 1.86, ZF], [X0 + 0.8, 1.86, ZF]])];
  const dest = Q([[X0 + 0.35, 1.9, ZF], [X1 - 0.35, 1.9, ZF], [X1 - 0.35, 2.06, ZF], [X0 + 0.35, 2.06, ZF]]);
  const destLit = Q([[X0 + 0.42, 1.93, ZF], [X1 - 0.42, 1.93, ZF], [X1 - 0.42, 2.03, ZF], [X0 + 0.42, 2.03, ZF]]);
  const skirt = [Q([[X0, 0.05, ZF], [X1, 0.05, ZF], [X1, Y0, ZF], [X0, Y0, ZF]]), Q([[X0, 0.05, ZF], [X0, Y0, ZF], [X0, Y0, ZB], [X0, 0.05, ZB]])];
  const wheels = [ZF + 0.7, ZB - 0.7].map((z) => {
    const [x, y] = S(X0, 0.12, z);
    return el(x, y, 34 / z, 22 / z);
  });
  const [hx, hy] = S((X0 + X1) / 2, 0.62, ZF);
  const bumper = Q([[X0 - 0.04, 0.2, ZF - 0.02], [X1 + 0.04, 0.2, ZF - 0.02], [X1 + 0.04, 0.3, ZF - 0.02], [X0 - 0.04, 0.3, ZF - 0.02]]);
  const seams = [ZF + 1.2, ZF + 2.4].map((z) => poly([S(X0, Y0 + 0.05, z), S(X0, BELT - 0.08, z)], false));
  // trolley pole trailing back from the roof to the contact wire
  const base = S(2.35, roofY(2.35), ZF + 1.2);
  const tip = S(2.35, WIRE_Y, ZF + 3.1);
  const bevel = [Q([[X0, Y0, ZF], [X0 + 0.14, Y0, ZF], [X0 + 0.14, Y1, ZF], [X0, Y1, ZF]]), Q([[X1 - 0.14, Y0, ZF], [X1, Y0, ZF], [X1, Y1, ZF], [X1 - 0.14, Y1, ZF]])];
  const route = Q([[X1 - 0.3, 1.9, ZF], [X1 - 0.12, 1.9, ZF], [X1 - 0.12, 2.06, ZF], [X1 - 0.3, 2.06, ZF]]);
  const body = stack('body', [
    paint('skirt', skirt, '#3A3438'),
    paint('wheels', wheels, '#1E1A1E'),
    paint('side_low', sideLow, AMARELO, { pal: P }),
    paint('front_low', frontLow, mix(AMARELO, '#FFF3B0', 0.25)),
    ink('panel_seams', seams, mix(AMARELO, '#6A4A00', 0.5), 1),
    paint('side_high', sideHigh, mix(CALCADA, '#FFFFFF', 0.25)),
    paint('front_high', frontHigh, mix(CALCADA, '#FFFFFF', 0.45)),
    paint('belts', [sideBelt, frontBelt], mix(AMARELO, '#6A4A00', 0.45)),
    paint('windows', [...sideWins, ...frontWins], mix('#3E4A6A', '#FFC877', 0.3)),
    paint('window_glow', sideWins.slice(1, 4), '#FFD27A', { o: 50 }),
    paint('door', door, mix(AMARELO, '#6A4A00', 0.3)),
    paint('roof', roof, '#D8D2C8'),
    paint('roof_lip', roofLip, '#9E968C'),
    paint('nose_bevel', bevel, '#000000', { o: 10 }),
    paint('destination', [dest, route], '#2A2426'),
    paint('destination_lit', destLit, '#FFD27A', { o: 85 }),
    paint('bumper', bumper, '#2A2426'),
    paint('headlamp', el(hx, hy, 12, 12), '#FFF2C4'),
    glow('lamp_glow', hx, hy, 20, 20, '#FFE6A0', { alpha: 0.6 }),
  ], { a: [hx, 400], p: cycle([[hx, 400], [hx, 401.2]], { period: 60 }) });
  const spark = svg1(`M ${tip[0]} ${tip[1] - 8} L ${tip[0] + 2} ${tip[1] - 2} L ${tip[0] + 8} ${tip[1]} L ${tip[0] + 2} ${tip[1] + 2} L ${tip[0]} ${tip[1] + 8} L ${tip[0] - 2} ${tip[1] + 2} L ${tip[0] - 8} ${tip[1]} L ${tip[0] - 2} ${tip[1] - 2} Z`);
  return shapeLayer('landmark_tram_28', [
    body,
    stack('pole', [ink('pole', poly([base, tip], false), IRON, 1.8), paint('shoe', el(tip[0], tip[1], 4, 2.6), IRON), paint('pole_base', poly([[base[0] - 6, base[1] + 1.5], [base[0] + 6, base[1] + 1.5], [base[0] + 4, base[1] - 2], [base[0] - 4, base[1] - 2]]), '#3A3438')], { a: base, p: cycle([base, [base[0], base[1] + 1.2]], { period: 60 }) }),
    gr('spark', [sh(spark), fl('#E8F4FF')], { a: tip, p: tip, s: keys([{ t: 0, v: [0, 0], e: 'hold' }, { t: 150, v: [0, 0], e: 'out' }, { t: 153, v: [120, 120], e: 'in' }, { t: 160, v: [0, 0], e: 'hold' }, { t: 240, v: [0, 0] }]) }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Overhead wires and the washing strung across the street              */
/* ------------------------------------------------------------------ */

function wires() {
  const contact = poly([S(2.35, WIRE_Y, 0.55), S(2.35, WIRE_Y, 4.6)], false);
  const spanZ = [2.6, 4.6];
  const spans = spanZ.map((z) => poly([S(XL, WIRE_Y + 0.15, z), S(XR, WIRE_Y + 0.15, z)], false));
  const rosettes = spanZ.flatMap((z) => [S(XL, WIRE_Y + 0.15, z), S(XR, WIRE_Y + 0.15, z)]).map(([x, y]) => el(x, y, 4, 4));
  return shapeLayer('fg_wires', [ink('contact_wire', contact, IRON, 1.1), ink('span_wires', spans, IRON, 0.6, { o: 60 }), paint('rosettes', rosettes, IRON)]);
}

function laundry() {
  const lines = [{ z: 1.3, yl: 3.42, yr: 3.52, sag: 30 }];
  const kinds = [
    [0.08, 22, 26, AZULEJO, 'shirt'], [0.17, 30, 20, CALCADA, 'towel'], [0.26, 18, 22, TELHA, 'shirt'], [0.66, 34, 28, '#F3E9DA', 'sheet'], [0.78, 16, 20, '#E87A9A', 'towel'], [0.89, 20, 22, AMARELO, 'shirt'],
  ];
  const out = [];
  const lineShapes = [];
  const hooks = [];
  lines.forEach((ln, j) => {
    const a = S(XL, ln.yl, ln.z);
    const b = S(XR, ln.yr, ln.z);
    const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * ln.sag];
    lineShapes.push(poly(Array.from({ length: 13 }, (_, k) => at(k / 12)), false));
    hooks.push(el(a[0], a[1], 5, 5), el(b[0], b[1], 5, 5));
    const s = 1.3 / ln.z;
    kinds.forEach(([t, w0, h0, c, kind], k) => {
      const [x, y] = at(t);
      const hw = (w0 * s) / 2;
      const h = h0 * s;
      const shape = kind === 'shirt'
        ? svg1(`M ${x - hw} ${y} L ${x - hw * 0.4} ${y} L ${x} ${y + 3 * s} L ${x + hw * 0.4} ${y} L ${x + hw} ${y} L ${x + hw * 1.25} ${y + h * 0.3} L ${x + hw * 0.7} ${y + h * 0.36} L ${x + hw * 0.66} ${y + h} L ${x - hw * 0.66} ${y + h} L ${x - hw * 0.7} ${y + h * 0.36} L ${x - hw * 1.25} ${y + h * 0.3} Z`)
        : svg1(`M ${x - hw} ${y} L ${x + hw} ${y} L ${x + hw * 0.96} ${y + h} C ${x + hw * 0.4} ${y + h + 3 * s} ${x - hw * 0.4} ${y + h - 2 * s} ${x - hw * 0.96} ${y + h} Z`);
      const fold = poly([[x - hw, y], [x + hw, y], [x + hw, y + 2.6 * s], [x - hw, y + 2.6 * s]]);
      out.push(stack(`laundry_${j}_${k}`, [
        gr('cloth', [sh(shape), fl(c, { nm: P.nameOf(c) })]),
        gr('shade', [sh(fold), fl(mix(c, SHADE, 0.35))]),
        gr('pegs', [el(x - hw + 2 * s, y, 2.4 * s, 4 * s), el(x + hw - 2 * s, y, 2.4 * s, 4 * s), fl('#8A6A4A')]),
      ], {
        a: [x, y],
        p: [x, y],
        r: cycle([-5, 6], { period: 60, phase: ((k + j * 3) * 0.21) % 1 }),
        s: cycle([[100, 100], [92, 104]], { period: 40, phase: ((k + j) * 0.33) % 1 }),
      }));
    });
  });
  return shapeLayer('fg_laundry', [ink('lines', lineShapes, '#4A4246', 1), paint('hooks', hooks, IRON), ...out]);
}

/* ------------------------------------------------------------------ */
/* Pigeons, river glitter, warm light                                   */
/* ------------------------------------------------------------------ */

function pigeons() {
  const bird = (x, y, s) => ({
    body: svg1(`M ${x - 9 * s} ${y} C ${x - 6 * s} ${y - 7 * s} ${x + 4 * s} ${y - 8 * s} ${x + 8 * s} ${y - 4 * s} C ${x + 10 * s} ${y - 2 * s} ${x + 8 * s} ${y + 2 * s} ${x + 2 * s} ${y + 2 * s} L ${x - 6 * s} ${y + 2 * s} L ${x - 13 * s} ${y + 4 * s} Z`),
    head: el(x + 8 * s, y - 7 * s, 6 * s, 6 * s),
    neck: el(x + 6 * s, y - 3.5 * s, 5 * s, 4 * s),
    beak: poly([[x + 11 * s, y - 7.5 * s], [x + 14 * s, y - 6.6 * s], [x + 11 * s, y - 6 * s]]),
    legs: poly([[x, y + 2 * s], [x, y + 6 * s]], false),
    wing: svg1(`M ${x - 7 * s} ${y - 2 * s} C ${x - 4 * s} ${y - 6 * s} ${x + 4 * s} ${y - 6 * s} ${x + 6 * s} ${y - 3 * s} C ${x + 2 * s} ${y - 1 * s} ${x - 3 * s} ${y} ${x - 7 * s} ${y - 2 * s} Z`),
  });
  const draw = (b, k, flap) => stack(`pigeon_${k}`, [
    paint('body', b.body, '#8A8C9A'),
    paint('neck', b.neck, '#6A7C78'),
    paint('head', b.head, '#5E6270'),
    paint('beak', b.beak, '#3A3436'),
    ink('legs', b.legs, '#C8604A', 1.2),
    gr('wing', [sh(b.wing), fl('#9EA0AE')], flap ? { a: [b.wing.v[0][0], b.wing.v[0][1]], p: [b.wing.v[0][0], b.wing.v[0][1]], s: flap } : {}),
  ]);
  const hop = (x0, y0, times) => {
    const list = [{ t: 0, v: [x0, y0], e: 'hold' }];
    for (const [t, dx] of times) {
      list.push({ t, v: [x0, y0], e: 'out' }, { t: t + 5, v: [x0 + dx / 2, y0 - 6], e: 'in' }, { t: t + 10, v: [x0 + dx, y0], e: 'hold' });
      x0 += dx;
    }
    list.push({ t: 240, v: [x0, y0] });
    return list;
  };
  const p1 = hop(0, 0, [[30, 10], [96, -6], [170, -4]]);
  const p2 = hop(0, 0, [[60, -8], [130, 8]]);
  const flyer = keys([
    { t: 0, v: [0, 0], e: 'hold' },
    { t: 110, v: [0, 0], e: 'in' },
    { t: 146, v: [260, -300], e: 'hold' },
    { t: 196, v: [-260, -220], e: 'out' },
    { t: 232, v: [0, 0], e: 'hold' },
    { t: 240, v: [0, 0] },
  ]);
  const flap = keys([{ t: 0, v: [100, 100], e: 'hold' }, { t: 110, v: [100, 100], e: 'linear' }, ...Array.from({ length: 6 }, (_, k) => [{ t: 112 + k * 6, v: [100, -120], e: 'linear' }, { t: 115 + k * 6, v: [100, 100], e: 'linear' }]).flat(), { t: 196, v: [100, 100], e: 'linear' }, ...Array.from({ length: 6 }, (_, k) => [{ t: 198 + k * 6, v: [100, -120], e: 'linear' }, { t: 201 + k * 6, v: [100, 100], e: 'linear' }]).flat(), { t: 240, v: [100, 100] }]);
  return shapeLayer('fx_pigeons', [
    stack('a', [draw(bird(120, 470, 1.1), 0)], { p: keys(p1) }),
    stack('b', [draw(bird(176, 486, 1.2), 1)], { p: keys(p2) }),
    stack('c', [draw(bird(150, 482, 1.15), 2, flap)], { p: flyer }),
  ]);
}

function glitter() {
  const out = [];
  const r = rng(31);
  for (let k = 0; k < 5; k++) {
    const x = r.range(240, 460);
    const y = r.range(203, 218);
    const s = r.range(2.2, 3.4);
    const star = svg1(`M ${x} ${y - s} L ${x + s * 0.2} ${y - s * 0.2} L ${x + s} ${y} L ${x + s * 0.2} ${y + s * 0.2} L ${x} ${y + s} L ${x - s * 0.2} ${y + s * 0.2} L ${x - s} ${y} L ${x - s * 0.2} ${y - s * 0.2} Z`);
    out.push(gr(`glint_${k}`, [sh(star), fl('#FFF4D0')], { a: [x, y], p: [x, y], s: cycle([[0, 0], [0, 0], [110, 110], [0, 0]], { period: 80, phase: r.next(), times: [0, 0.6, 0.76, 0.92], ease: ['hold', 'out', 'in', 'hold'] }) }));
  }
  return shapeLayer('far_river_glitter', out);
}

function warmth() {
  return shapeLayer('fx_sun_warmth', [vGradientRect('warm', 0, 0, 800, 500, [[0, '#FFB45A'], [1, '#FF9A3C']], { alpha: [[0, 0.14], [1, 0.02]], o: cycle([0, 100], { period: 240, phase: 0 }) })]);
}

/* ------------------------------------------------------------------ */

export default {
  id: '08-portugal-lisbon',
  palette: P.list,
  build() {
    return composition({
      nm: 'Waymark · Portugal, Lisbon',
      layers: [sky(), vista(), glitter(), street(), rightFacade(), tram(), leftFacade(), wires(), laundry(), pigeons(), warmth()],
    });
  },
};
