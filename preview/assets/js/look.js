// Map art directions.  The author chose a (套色地圖): it is the default.  ?look=b | c show the other two directions,
// ?look=0 the plain drawing they all started from — every module that reads LOOK changes nothing when it is null.
//   a  套色地圖  a printed illustrated map: Riso spot-colour fills under the pencil line, halftone shading
//   b  微縮模型  a sunlit miniature diorama: gouache colours in soft warm light, toy-town, depth of field
//   c  黃昏      dusk: a warm sky, lamplit windows, a luminous sea of type, the flows traced in light
// Materials say what a surface IS (a paint slot, below); each look says what colour that slot is.  The drawing
// buffer carries the slot in its alpha channel (1 + slot / 16, see mat.js); 0 = no paint = the book's own drawing
// (pencil on paper, typed glyphs), which every look leaves as it is.
// Slots 0 … 79 paint the setting (ground, water, the world's own scenery); 80 … 127 (look a only) are the districts'
// own spot fills, printed under their pencil line (FIG below): the book's drawing stays exactly as it is on top.
import * as THREE from '../vendor/three.module.min.js';

export const LOOK = (() => {
  try {
    const v = new URLSearchParams(location.search).get('look');
    if (v === null) return 'a';
    return /^[abc]$/i.test(v) ? v.toLowerCase() : null;
  } catch { return 'a'; }
})();

/** paint slots (shared meaning; colour per look).  32…39 is one ramp (shallow → deep water), sampled smoothly. */
export const P = {
  clear: 1, meadow: 2, meadow2: 3, field: 4, field2: 5, lawn: 6, sand: 7, path: 8,
  stone: 9, stone2: 10, rock: 11, quay: 12, park: 13,
  strata: 14, strata2: 15, under: 16,
  tree: 17, tree2: 18, pine: 19, trunk: 20,
  wall: 21, wall2: 22, roof: 23, roof2: 24, roof3: 25, window: 26, shed: 27, steel: 28, tower: 29, band: 30, lamp: 31,
  water: 32, deep: 39, foam: 40, glyph: 41, hull: 42, sail: 43, buoy: 44, light: 45, bird: 46, smoke: 47,
  contour: 48, road: 49, glow: 50, crate: 51, crate2: 52, reed: 53, blossom: 54, sheen: 55, wake: 56, clear2: 57,
  door: 58, kerb: 59, garden: 60,
  // look a: each district's stage (its clearing), its rim in the zone's colour, the zone names' inks
  stage: 61, rimBrand: 62, rimAi: 63, rimConsumer: 64, nameBrand: 65, nameAi: 66, nameConsumer: 67,
  stageBrand: 68, stageAi: 69, stageConsumer: 70,
  // the twins' island (terrain.js ISLAND): the AI's own ground in two tones and its beach
  islGround: 71, islGround2: 72, islShore: 73,
  // the consumers' town square (square.js): its paving, the stalls' awnings, their goods and their timber
  sqPave: 74, sqPave2: 75, sqAwn: 76, sqAwn2: 77, sqGoods: 78, sqWood: 79,
};
/** palette width (slots); the composite samples (slot + 0.5) / PAL_W */
export const PAL_W = 128;
/** look a: the districts' spot fills — 80 + 16 · zone + kind.  kind 0 large (masses: buildings, hulls, walls),
 *  1 middle (furniture, props), 2 small (cups, tools), 3 people (every person is printed in the same warm tint,
 *  whatever the zone), 4 plate (what a district stands on: floors, decks, discs — the lightest tint, so what stands on
 *  it reads), 5 crowd (the town square's small far-seen people: the people's tint a step stronger, under a lighter
 *  pencil line -- npr.js -- so at map scale they read as warm figures, not as black specks) */
export const FIG = { base: 80, zone: { brand: 0, ai: 1, consumer: 2 }, kinds: ['large', 'mid', 'small', 'people', 'plate', 'crowd'] };
export const figSlot = (zone, kind) => FIG.base + 16 * (FIG.zone[zone] ?? 2) + Math.max(0, FIG.kinds.indexOf(kind));
/** look a: what is drawn after the composite, straight onto the screen at the canvas's full resolution and tested
 *  against the drawing buffer's depth (npr.js): the zone names, which are type to be read, not drawing */
export const OVERLAY = LOOK === 'a' ? new THREE.Scene() : null;
/** the composite's uniforms (npr.js fills it), for what the overlay needs of the drawing: its depth, paint, paper */
export const NPR_U = {};
/** areas of one family meet without a printed border (look a draws a thin line where families meet): the two
 *  meadows and the hill contours, two sandstones, the stripes of one field, the depth bands of a chart in pairs */
const FAMILY = [
  [P.meadow, P.meadow2, P.contour, P.lawn], [P.field, P.field2], [P.stone, P.stone2], [P.path, P.road],
  [32, 33], [34, 35], [36, 37], [38, 39], [P.clear, P.clear2], [P.tree, P.tree2], [P.wall, P.wall2], [P.roof, P.roof2, P.roof3],
  [P.islGround, P.islGround2], [P.sqPave, P.sqPave2],
];
/** never bordered by a printed line (they carry their own edge): the stages, their rims, the zone names */
const NO_BORDER = [P.stage, P.rimBrand, P.rimAi, P.rimConsumer, P.nameBrand, P.nameAi, P.nameConsumer, P.stageBrand, P.stageAi, P.stageConsumer];
/** the setting's built and growing things (houses, roofs, trees, boats …): printed a further step quieter than the
 *  ground they stand on, so that nothing of the setting is as strong as a district (look a: quietObj) */
const OBJ = [P.wall, P.wall2, P.roof, P.roof2, P.roof3, P.window, P.shed, P.steel, P.tower, P.band, P.tree, P.tree2, P.pine, P.trunk,
  P.hull, P.sail, P.buoy, P.crate, P.crate2, P.door, P.garden, P.blossom, P.kerb, P.reed];

// [slot, colour, emissive 0…1]
const A = {
  name: '套色地圖',
  pal: [
    [P.clear, '#eef4e4'], [P.clear2, '#faefdd'], [P.meadow, '#d3e8c6'], [P.meadow2, '#c2dfb6'], [P.field, '#e7efbd'], [P.field2, '#b9d8a2'],
    [P.lawn, '#dfeccb'], [P.sand, '#f6e4b9'], [P.path, '#bb9c6c'],
    [P.stone, '#f4d9ae'], [P.stone2, '#eccb98'], [P.rock, '#d6a978'], [P.quay, '#e8dfd1'], [P.park, '#cfe5c0'],
    [P.strata, '#e9cda3'], [P.strata2, '#cfa277'], [P.under, '#b38e6a'],
    [P.tree, '#79b98f'], [P.tree2, '#62a87f'], [P.pine, '#4f9174'], [P.trunk, '#9a7656'],
    [P.wall, '#faf5ec'], [P.wall2, '#f0dcc0'], [P.roof, '#de9064'], [P.roof2, '#94abc6'], [P.roof3, '#d99b70'],
    [P.window, '#5d7091'], [P.shed, '#ecd6b5'], [P.steel, '#8f9bab'], [P.tower, '#fbf8f1'], [P.band, '#de9064'], [P.lamp, '#f4d27a'],
    [32, '#dce9f4'], [33, '#cde0f1'], [34, '#bdd5ed'], [35, '#adcae7'], [36, '#9ec0e2'], [37, '#91b4dc'], [38, '#86abd7'], [39, '#7da3d2'],
    [P.foam, '#ffffff'], [P.glyph, '#3d5fa8'], [P.hull, '#f6f1e7'], [P.sail, '#ffffff'], [P.buoy, '#e6ba63'], [P.light, '#f4d27a'],
    [P.bird, '#4a4844'], [P.smoke, '#e9e5dc'], [P.contour, '#86b391'], [P.road, '#cdb995'], [P.glow, '#ffffff'],
    [P.crate, '#de9064'], [P.crate2, '#94abc6'], [P.reed, '#a9c98e'], [P.blossom, '#f3e6a8'], [P.sheen, '#ffffff'], [P.wake, '#ffffff'],
    [P.door, '#8a6a52'], [P.kerb, '#dccfb4'], [P.garden, '#e9a3a0'],
  ],
  // figure and ground: the setting is the map's base plate, printed in light tints (lighter, greyer: see quiet()); the
  // districts are its landmarks, printed in full-strength inks under their pencil line (fig).  [lighten, desaturate]:
  // `quiet` for the ground and the water, `quietObj` (a further step) for what is built or grows on them (OBJ above),
  // so no roof or tree is as strong as a district; slots listed in KEEP stay as they are
  quiet: [0.2, 0.34],
  quietObj: [0.36, 0.56],
  keep: [P.foam, P.glyph, P.glow, P.sheen, P.wake, P.light, P.lamp, P.bird],
  // the stages (each district's clearing: its ring's ground, lighter and calm), the rims and the zone names' inks,
  // in each ring's own colour
  own: [
    [P.stage, '#f7f3ea'], [P.stageBrand, '#f7ecd9'], [P.stageAi, '#e5edf8'], [P.stageConsumer, '#e9f2de'],
    [P.rimBrand, '#bf6a3c'], [P.rimAi, '#3c64b4'], [P.rimConsumer, '#3f8a5c'],
    [P.nameBrand, '#9c441a'], [P.nameAi, '#22408c'], [P.nameConsumer, '#1f6a41'],
    // the twins' island: neither sand nor meadow, a pale lavender of the AI's own (its stages print a bluer white)
    [P.islGround, '#e7deec'], [P.islGround2, '#e0d5e7'], [P.islShore, '#f2eef5'],
    // the town square: warm paving, the stalls in saffron and terracotta (the consumers' own warmth), fruit, timber
    [P.sqPave, '#f3e9d3'], [P.sqPave2, '#e2cfa6'], [P.sqAwn, '#e99a2c'], [P.sqAwn2, '#d65a3c'], [P.sqGoods, '#d9463a'], [P.sqWood, '#b98a58'],
  ],
  // the districts' spot fills, per zone: masses (large), props (mid), small things, and what they stand on (plate,
  // the lightest, so what stands on it reads); one warm tint for people.  Mid-value Riso inks, never lime, pink,
  // teal or red: those stay the story's highlights (npr.js ACCENT)
  fig: {
    // brand: orange-ochre, ochre, brick on a pale sand plate · AI: periwinkle, lavender, cobalt-violet (bluer than
    // its pale water, so it reads on it) · consumers: sunflower (the core's own flower), saffron, orange — warm
    // against their green land, so a district never reads as more lawn
    // (a step deeper than a flat print would take them: their faces in full light print a lighter tint, npr.js)
    // (brand a step deeper than first set: at map scale its fills sat too close to the sand they stand on)
    brand: { large: '#c96a36', mid: '#d38c44', small: '#a84a32', plate: '#e8c69c' },
    ai: { large: '#7d8bdc', mid: '#9b91dc', small: '#5d6ac7', plate: '#cdd3f1' },
    consumer: { large: '#eba42c', mid: '#efb94e', small: '#e47c40', plate: '#f6e7bb' },
    people: '#eeb28e',
    crowd: '#df9068',
  },
  // the book's type (what AI makes) and its 人 are printed in the AI's ink, the same blue as the type on the water
  typeInk: '#2b3f7c',
  // the HTML zone names, in their ring's colour (darker than the fill, so they read on it)
  zone: { brand: '#a4521f', ai: '#233f8f', consumer: '#24774a' },
  halo: 'rgba(246, 242, 234, .96)',
};
const B = {
  name: '微縮模型',
  pal: [
    [P.clear, '#ece4cc'], [P.clear2, '#efe4d0'], [P.meadow, '#a9d189'], [P.meadow2, '#97c47a'], [P.field, '#e5d27d'], [P.field2, '#bad27c'],
    [P.lawn, '#bcdd98'], [P.sand, '#eedcab'], [P.path, '#e6d5b1'],
    [P.stone, '#e7cda7'], [P.stone2, '#dcbf96'], [P.rock, '#bc9a7b'], [P.quay, '#d6cec1'], [P.park, '#9fcb81'],
    [P.strata, '#cca67e'], [P.strata2, '#9f7859'], [P.under, '#715847'],
    [P.tree, '#62a661'], [P.tree2, '#50945a'], [P.pine, '#427f58'], [P.trunk, '#8d6649'],
    [P.wall, '#f7f1e5'], [P.wall2, '#eed9ba'], [P.roof, '#d47e51'], [P.roof2, '#7091b6'], [P.roof3, '#e5b352'],
    [P.window, '#516f96'], [P.shed, '#e7d2b2'], [P.steel, '#7f8d9c'], [P.tower, '#faf6ee'], [P.band, '#d47e51'], [P.lamp, '#ffe6a3', 0.6],
    [32, '#c4e3ec'], [33, '#a9d5e8'], [34, '#8fc5e0'], [35, '#76b1d7'], [36, '#619ecd'], [37, '#4f8bc1'], [38, '#417ab5'], [39, '#366ba9'],
    [P.foam, '#ffffff'], [P.glyph, '#eef8fb'], [P.hull, '#f7f2e9'], [P.sail, '#ffffff'], [P.buoy, '#e5b352'], [P.light, '#ffe6a3', 0.5],
    [P.bird, '#403c3c'], [P.smoke, '#f4f1ec'], [P.contour, '#8fbb76'], [P.road, '#d0c2a9'], [P.glow, '#ffffff'],
    [P.crate, '#d47e51'], [P.crate2, '#7091b6'], [P.reed, '#9cc27a'], [P.blossom, '#f6e7a4'], [P.sheen, '#ffffff'], [P.wake, '#ffffff'],
    [P.door, '#8c5d3f'], [P.kerb, '#cdb994'], [P.garden, '#e58f86'],
    [P.islGround, '#d8d3e6'], [P.islGround2, '#cec8df'], [P.islShore, '#ebe7ef'],
    [P.sqPave, '#e9dcc0'], [P.sqPave2, '#d9c6a0'], [P.sqAwn, '#e5b352'], [P.sqAwn2, '#d47e51'], [P.sqGoods, '#d9553e'], [P.sqWood, '#b88c5e'],
  ],
  zone: { brand: '#a94f24', ai: '#1f4f8e', consumer: '#2f7a3b' },
  halo: 'rgba(248, 245, 238, .96)',
};
const C = {
  name: '黃昏',
  pal: [
    [P.clear, '#8c9271', 0.06], [P.clear2, '#9d8578', 0.08], [P.meadow, '#506f58'], [P.meadow2, '#47664f'], [P.field, '#6f7455'], [P.field2, '#59714f'],
    [P.lawn, '#5c7c5f'], [P.sand, '#8f7d6b'], [P.path, '#8e7a63'],
    [P.stone, '#6c5a69'], [P.stone2, '#625162'], [P.rock, '#4f4153'], [P.quay, '#7a6b7c'], [P.park, '#4d6654'],
    [P.strata, '#514154'], [P.strata2, '#3c3041'], [P.under, '#2b2334'],
    [P.tree, '#304b40'], [P.tree2, '#2a443b'], [P.pine, '#253d37'], [P.trunk, '#3b2f31'],
    [P.wall, '#9a8a90'], [P.wall2, '#907e82'], [P.roof, '#6d4b4f'], [P.roof2, '#404c68'], [P.roof3, '#7b5f49'],
    [P.window, '#ffd27a', 1], [P.shed, '#7d6d72'], [P.steel, '#4b546a'], [P.tower, '#d4c9c6'], [P.band, '#6d4b4f'], [P.lamp, '#ffe3a3', 1],
    [32, '#3f598a'], [33, '#374e7f'], [34, '#304575'], [35, '#2a3d6b'], [36, '#243661'], [37, '#1f2f58'], [38, '#1b2a50'], [39, '#182549'],
    [P.foam, '#aecbe9', 0.25], [P.glyph, '#86e9f4', 1], [P.hull, '#e9d9bf', 0.12], [P.sail, '#f3e6d2', 0.15], [P.buoy, '#caa16b'], [P.light, '#ffc96b', 1],
    [P.bird, '#2b2334'], [P.smoke, '#7a6d7e'], [P.contour, '#5d7c64'], [P.road, '#8b7567'], [P.glow, '#fff5dd', 1],
    [P.crate, '#6d4b4f'], [P.crate2, '#404c68'], [P.reed, '#5c7552'], [P.blossom, '#e8cf9e', 0.12], [P.sheen, '#ffd9a8', 0.5], [P.wake, '#bff3f7', 1],
    [P.door, '#3a2a2e'], [P.kerb, '#6f6371'], [P.garden, '#a8717a'],
    [P.islGround, '#5e5a7a'], [P.islGround2, '#565171'], [P.islShore, '#6e6a86'],
    [P.sqPave, '#8a7a72'], [P.sqPave2, '#7a6a64'], [P.sqAwn, '#c89a5a', 0.15], [P.sqAwn2, '#a8645a', 0.12], [P.sqGoods, '#b4584c'], [P.sqWood, '#6a5246'],
  ],
  zone: { brand: '#ffcf96', ai: '#93e9f4', consumer: '#bfe6ac' },
  halo: 'rgba(30, 27, 44, .78)',
};
export const LOOKS = { a: A, b: B, c: C };
/** shared with the composite: calm 0 … 1 — in a district the world's own colour steps back (scenery.js eases it) */
export const LOOK_U = { calm: { value: 0 }, focus: { value: new THREE.Vector3() }, focusR: { value: 1e5 } };
export const LOOK_DEF = LOOK ? LOOKS[LOOK] : null;

/** a colour a step quieter: toward its own grey by `de`, then toward white by `li` (raw sRGB 0…1) */
function quiet(c, li, de) {
  const y = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  c.r += (y - c.r) * de; c.g += (y - c.g) * de; c.b += (y - c.b) * de;
  c.r += (1 - c.r) * li; c.g += (1 - c.g) * li; c.b += (1 - c.b) * li;
  return c;
}
/** the look's palette as a PAL_W × 2 texture: rgb = colour (raw sRGB, the composite writes raw values), a = emissive */
export function paletteTexture(look = LOOK_DEF) {
  // row 0: rgb = colour, a = emissive · row 1: r = the slot's family (FAMILY, else its own number; 250 = no border)
  const W = PAL_W, data = new Uint8Array(W * 2 * 4);
  const c = new THREE.Color();
  const put = (slot, hex, em = 0, q = null) => {
    c.set(hex);
    // Color.set() converts sRGB hex to linear; the composite works in raw sRGB values
    c.convertLinearToSRGB();
    if (q) quiet(c, q[0], q[1]);
    data.set([Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), Math.round(em * 255)], slot * 4);
  };
  for (const [slot, hex, em = 0] of look.pal) {
    const q = !look.quiet || (look.keep || []).includes(slot) ? null : look.quietObj && OBJ.includes(slot) ? look.quietObj : look.quiet;
    put(slot, hex, em, q);
  }
  for (const [slot, hex, em = 0] of look.own || []) put(slot, hex, em);
  if (look.fig) {
    for (const [zone, z] of Object.entries(FIG.zone)) {
      const inks = look.fig[zone];
      FIG.kinds.forEach((kind, k) => put(FIG.base + 16 * z + k, kind === 'people' || kind === 'crowd' ? look.fig[kind] || look.fig.people : inks[kind]));
    }
  }
  for (let s = 0; s < W; s++) {
    const f = FAMILY.findIndex((l) => l.includes(s));
    data[(W + s) * 4] = NO_BORDER.includes(s) ? 250 : f >= 0 ? 100 + f : Math.min(s, 99);
  }
  const t = new THREE.DataTexture(data, W, 2, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}
