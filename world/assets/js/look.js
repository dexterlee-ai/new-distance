// Map art directions (?look=a | b | c).  No parameter: today's look, untouched — every module that reads LOOK
// changes nothing when it is null.
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
    return v && /^[abc]$/i.test(v) ? v.toLowerCase() : null;
  } catch { return null; }
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
  // look a: each district's stage (clean paper), its rim in the zone's colour, the zone names printed on the map
  stage: 61, rimBrand: 62, rimAi: 63, rimConsumer: 64, nameBrand: 65, nameAi: 66, nameConsumer: 67,
};
/** palette width (slots); the composite samples (slot + 0.5) / PAL_W */
export const PAL_W = 128;
/** look a: the districts' spot fills — 80 + 16 · zone + kind.  kind 0 large (bases, buildings), 1 middle (furniture,
 *  props), 2 small (cups, tools), 3 people (every person is printed in the same warm tint, whatever the zone) */
export const FIG = { base: 80, zone: { brand: 0, ai: 1, consumer: 2 }, kinds: ['large', 'mid', 'small', 'people'] };
export const figSlot = (zone, kind) => FIG.base + 16 * (FIG.zone[zone] ?? 2) + Math.max(0, FIG.kinds.indexOf(kind));
/** areas of one family meet without a printed border (look a draws a thin line where families meet): the two
 *  meadows and the hill contours, two sandstones, the stripes of one field, the depth bands of a chart in pairs */
const FAMILY = [
  [P.meadow, P.meadow2, P.contour, P.lawn], [P.field, P.field2], [P.stone, P.stone2], [P.path, P.road],
  [32, 33], [34, 35], [36, 37], [38, 39], [P.clear, P.clear2], [P.tree, P.tree2], [P.wall, P.wall2], [P.roof, P.roof2, P.roof3],
];
/** never bordered by a printed line (they carry their own edge): the stages, their rims, the zone names */
const NO_BORDER = [P.stage, P.rimBrand, P.rimAi, P.rimConsumer, P.nameBrand, P.nameAi, P.nameConsumer];

// [slot, colour, emissive 0…1]
const A = {
  name: '套色地圖',
  pal: [
    [P.clear, '#eef4e4'], [P.clear2, '#faefdd'], [P.meadow, '#d3e8c6'], [P.meadow2, '#c2dfb6'], [P.field, '#e7efbd'], [P.field2, '#b9d8a2'],
    [P.lawn, '#dfeccb'], [P.sand, '#f6e4b9'], [P.path, '#bb9c6c'],
    [P.stone, '#f4d9ae'], [P.stone2, '#eccb98'], [P.rock, '#d6a978'], [P.quay, '#e8dfd1'], [P.park, '#cfe5c0'],
    [P.strata, '#e9cda3'], [P.strata2, '#cfa277'], [P.under, '#b38e6a'],
    [P.tree, '#79b98f'], [P.tree2, '#62a87f'], [P.pine, '#4f9174'], [P.trunk, '#9a7656'],
    [P.wall, '#faf5ec'], [P.wall2, '#f0dcc0'], [P.roof, '#de9064'], [P.roof2, '#94abc6'], [P.roof3, '#e6ba63'],
    [P.window, '#5d7091'], [P.shed, '#ecd6b5'], [P.steel, '#8f9bab'], [P.tower, '#fbf8f1'], [P.band, '#de9064'], [P.lamp, '#f4d27a'],
    [32, '#dce9f4'], [33, '#cde0f1'], [34, '#bdd5ed'], [35, '#adcae7'], [36, '#9ec0e2'], [37, '#91b4dc'], [38, '#86abd7'], [39, '#7da3d2'],
    [P.foam, '#ffffff'], [P.glyph, '#3d5fa8'], [P.hull, '#f6f1e7'], [P.sail, '#ffffff'], [P.buoy, '#e6ba63'], [P.light, '#f4d27a'],
    [P.bird, '#4a4844'], [P.smoke, '#e9e5dc'], [P.contour, '#86b391'], [P.road, '#cdb995'], [P.glow, '#ffffff'],
    [P.crate, '#de9064'], [P.crate2, '#94abc6'], [P.reed, '#a9c98e'], [P.blossom, '#f3e6a8'], [P.sheen, '#ffffff'], [P.wake, '#ffffff'],
    [P.door, '#8a6a52'], [P.kerb, '#dccfb4'], [P.garden, '#e9a3a0'],
  ],
  // figure and ground: the setting is printed a step quieter (lighter, less saturated: see quiet()) so the districts,
  // on their own stages in their own inks, lead.  [lighten, desaturate]; slots listed in KEEP stay as they are
  quiet: [0.16, 0.3],
  keep: [P.foam, P.glyph, P.glow, P.sheen, P.wake, P.light, P.lamp, P.bird],
  // the stage (unprinted paper), the rims and the printed zone names, in each ring's own ink
  own: [
    [P.stage, '#ffffff'],
    [P.rimBrand, '#bf6a3c'], [P.rimAi, '#3c64b4'], [P.rimConsumer, '#3f8a5c'],
    [P.nameBrand, '#a24a1d'], [P.nameAi, '#24418f'], [P.nameConsumer, '#226f45'],
  ],
  // the districts' spot fills: two inks per zone at Riso tints (large, middle, small), and one warm tint for people.
  // None of them is lime, pink, teal or red: those stay the story's highlights (npr.js ACCENT)
  fig: {
    // brand: sand-ochre, ochre, brick · AI: cornflower, lavender, blue · consumers: sunflower yellow (the core's own
    // flower), a deeper yellow, coral — warm against their green land, so a district never reads as more lawn
    brand: ['#efd3b0', '#e4b98a', '#cf9677'],
    ai: ['#c4d4f2', '#d2cbee', '#a3b6e4'],
    consumer: ['#f6e3a2', '#f0c97c', '#eaa98e'],
    people: '#f2c2a0',
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
  for (const [slot, hex, em = 0] of look.pal) put(slot, hex, em, look.quiet && !(look.keep || []).includes(slot) ? look.quiet : null);
  for (const [slot, hex, em = 0] of look.own || []) put(slot, hex, em);
  if (look.fig) {
    for (const [zone, z] of Object.entries(FIG.zone)) {
      const inks = look.fig[zone];
      inks.forEach((hex, k) => put(FIG.base + 16 * z + k, hex));
      put(FIG.base + 16 * z + 3, look.fig.people);
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
