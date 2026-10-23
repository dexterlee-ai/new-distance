// 先問數位分身 · People Model (articles 12, 2) — told in six beats, about 29 s.
// The Model chapter's sunflower stands on the twins' island in the AI's water; its seed head is a field of 人, the
// digital twins (style band 0.8: 5,000 多位, each made from one real respondent).  In front of it a counter with three
// new drinks, sealed (each with its name on its sleeve), and the brand person with a clipboard; in front of the
// counter a low stand with two empty boxes, 上市 and 限定 (what the question is about: which drink goes where).
//   1 the cups land, the clipboard goes up and a question bubble arcs into the head; hit, the head lifts round to the
//     asker, its petals open and a wave of 人 runs out through the field, reaching its rim as the beat ends;
//   2 one wedge of the field (25-34 歲女性) lights and pours into milky glass tubes standing over the cups: 荔枝烏龍's
//     tube fills to about four fifths, and the last answers keep coming while the caption is read;
//   3 another wedge (40-44 歲女性) lights; the first group flies home (another group, not the same people changing their
//     minds) and the second pours in: 黑糖桂圓 64%, 荔枝烏龍 36%, 油柑氣泡's tube stays empty;
//   4 next to its empty tube, the brand person steps up with a red ✕ and slaps it onto 油柑氣泡: the cup turns red,
//     skids back and tips off the counter with its tube; the two left close up in the middle, and he goes back to
//     cross it off his clipboard;
//   5 the twins never drank: a thought cloud puffs up out of each tube with its drink in it, and the twins drink it
//     dry in their heads while the real cup below stays sealed and full; a typed tag drops onto the tubes: 情境模擬;
//   6 three real people walk in; the seals come off and a tasting cup is filled from each drink (the real tea goes down),
//     two of them taste — the twins' clouds pop — then carry 荔枝烏龍 into the 上市 box and 黑糖桂圓 into the 限定 box
//     (lime): real people decide.  Lever a (直接上市): nobody tastes; the brand person walks up and sends both, sealed
//     and full, into the 上市 box, and the twins' clouds stay.
//
// Everything the reader sees is a pure function of (beat, k, lever) — pose() — so autoplay, stepping, ?still and the
// text map land on the same frame.  No copy lives here: captions, labels, decals and taps come from world.json by part id.
// The head and its seed bed keep the places they had (d-twins walks its twins into this bed: see seedBed).
import * as THREE from '../vendor/three.module.min.js';
import { ink, dim, inkDepth, CLOCK } from './mat.js';
import { ACCENT } from './npr.js';
import { LOOK, P as PAINT, figSlot } from './look.js';
import { rng, tube, TAU, clamp, _m, _q, _v, _s } from './kit.js';
import { heightAt } from './terrain.js';
import { makePerson } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3;

// ---- staging: the stage looks out along STAGE_AZ (the camera's azimuth).  The sun is at world (-70, 120, 50), so
// from this side the fronts of the people, cups and counter are lit from the upper left.  The head faces a little to
// the right of the camera, toward the brand person.
const STAGE_AZ = 1.45;
const YAW = Math.PI / 2 - STAGE_AZ;          // group rotation: local +z = toward the camera, local +x = camera right
const HEAD_YAW = 0.3;                        // the head faces the asker's side (its rest pose; d-twins lands here)
const NOD0 = 0.02;                           // + tilts the face down toward the stage
// before the question the head droops, half closed (a sunflower before the light); asked, it lifts to the asker
const AWAY = { yaw: -HEAD_YAW, nod: 0.42 };

// ---- the six beats.  dur is exactly the caption's time on screen (keyAt + 0.8 s + 0.2 s per 字, story.js), so
// the picture never stands still under its caption: the field keeps waking out to its rim, the last answers keep
// coming, the two left close up, the twins drink their imagined cups dry, the people taste and carry
const BEATS = [
  // 1 三款新口味上哪款？先問真人的分身 — cups land, the question arcs into the head, the head wakes
  { dur: 5.05, keyAt: 1.05, shot: 0, parts: ['head', 'cup-lychee', 'cup-brown', 'cup-yougan', 'person'] },
  // 2 25 到 34 歲女性，七到八成首選荔枝 — one wedge pours: 荔枝烏龍's tube to 77%
  { dur: 4.95, keyAt: 0.75, shot: 1, parts: ['sector', 'column', 'cup-lychee', 'cup-brown', 'cup-yougan'] },
  // 3 換問 40 到 44 歲，黑糖翻盤勝出 — the first group flies home, the second pours in
  { dur: 4.55, keyAt: 0.75, shot: 1, parts: ['sector', 'column', 'column-b', 'cup-lychee', 'cup-brown', 'cup-yougan'] },
  // 4 油柑新奇但少人想買，量產前先刷掉 — the brand person slaps a ✕ on it beside its empty tube, it tips off
  // (its cup is out of sight by the end of the beat: the survivors and the brand person are the beat's parts, and
  // the struck cup is kept drawn while it is on screen, see poseDim.struck)
  { dur: 4.68, keyAt: 0.68, shot: 2, parts: ['person', 'cup-lychee', 'cup-brown'] },
  // 5 但分身沒喝過，答案只算「情境模擬」 — thought clouds out of the tubes, drunk dry; the tag drops onto them
  { dur: 4.9, keyAt: 0.7, shot: 3, parts: ['cloud', 'label', 'cup-lychee', 'cup-brown'] },
  // 6 只留兩款，交給一小群真人試喝決定 — real people taste, then carry the two to the 上市 and 限定 boxes
  { dur: 4.95, keyAt: 0.95, shot: 4, parts: ['tasters', 'crate', 'limited', 'cup-lychee', 'cup-brown', 'label'] },
];
const LAST = BEATS.length - 1;
const PARTS_B = BEATS[LAST].parts, PARTS_A = ['crate', 'cup-lychee', 'cup-brown', 'cloud', 'label', 'person'];
// beat-local times of the key events (seconds).  On a first visit the story starts while the camera is still landing
// (the last quarter of the flight, about half a second): the bubble leaves the clipboard as the camera settles and
// hits the head about three quarters of a second after arrival.
const T0 = { cup: [0.05, 0.15, 0.25], cupDur: 0.34, raise: [0.3, 0.6], bub: [0.55, 0.72, 1.25], lower: [1.4, 1.85], turn: [1.12, 1.75], open: [1.15, 1.8], wave: [1.25, 5.0] };
// beat 2: the tubes rise; wedge A pours: most of its twins land by about 0.7 s, the rest come in one by one
const T1 = { sec: [0.0, 0.3], legs: [0.0, 0.22], frame: [0.12, 0.4], main: [0.22, 0.62], tail: [0.62, 4.75], mainShare: 0.88, fl: [0.3, 0.44], lime: 0.72 };
// beat 3: wedge B lights; the first group flies home (the last in leaves first), wedge A goes dark; wedge B pours
const T2 = { lightB: [0.0, 0.3], home: [0.05, 0.6], hfl: [0.3, 0.4], offA: [0.6, 0.84], main: [0.28, 0.7], tail: [0.7, 4.4], mainShare: 0.88, fl: [0.3, 0.44], lime: 0.76 };
// beat 4: beside 油柑氣泡's empty tube the brand person steps up with the ✕ raised and slaps it onto the cup (hit);
// the cup jolts, skids back and tips off the counter's back edge with its tube, out of sight; the two left slide
// together to the middle; he walks back and crosses it off his clipboard
const T3 = { step: [0.0, 0.4], lift: [0.02, 0.36], slap: [0.36, 0.54], hit: 0.54, recoil: [0.6, 0.98], jolt: [0.54, 0.74], slide: [0.6, 0.98], tip: [0.94, 1.5], close: [1.6, 3.2], back: [2.0, 2.9], note: [3.0, 4.5] };
// beat 5: the heads' wedge goes dark; out of each of the two tubes two puffs and a thought cloud with its drink; in
// each cloud the imagined drink is sipped dry; the tag drops onto the tubes and swings to rest; the clouds bob
const T4 = { mask: [0.0, 0.3], puff: [0.02, 0.28], cloud: [0.12, 0.48], sips: [[0.62, 1.25], [1.75, 2.4], [2.95, 3.7]], tag: [1.05, 1.4], bob: 2.6 };
// beat 6: (b) the three walk in; the seals come off and a tasting cup is filled from each drink on the counter (the
// drink goes down as it fills) and hops to a taster's hand; they drink; the clouds pop; the tasting cups are put
// away; each taster takes the drink from the counter, turns and sets it in its box: 荔枝烏龍 in 上市, 黑糖桂圓 in
// 限定.  (a) the brand person walks up to the boxes, raises the clipboard, and both drinks hop, sealed and full, into
// the 上市 box
const T5 = {
  speed: 8.5, delay: [0.0, 0.05, 0.1], turn: 0.22,
  film: [[0.32, 0.46], [0.36, 0.5]], rise: [[0.5, 0.95], [0.55, 1.0]], hop: [[0.95, 1.2], [1.0, 1.25]],
  reach: [[0.75, 1.0], [0.8, 1.05]], up: [[1.2, 1.42], [1.25, 1.47]], drink: [[1.42, 1.9], [1.47, 1.95]], down: [[1.9, 2.1], [1.95, 2.15]],
  gone: [[2.1, 2.24], [2.15, 2.29]], pop: [1.5, 1.8],
  take: [[2.15, 2.55], [2.35, 2.75]], face: [[2.55, 2.9], [2.75, 3.1]], put: [[2.9, 3.35], [3.1, 3.55]], back: [[3.45, 3.9], [3.65, 4.1]],
  watch: [2.5, 3.0], nod: [3.95, 4.65], pwatch: [2.2, 2.7],
  aWalk: [0.0, 0.62], aRaise: [0.6, 0.9], aCup: [[0.8, 1.5], [0.92, 1.64]], aLower: [2.3, 2.8],
};
const FILL = [0.6, 0.32];                    // the tea in a drink: full (up to its sleeve), after a tasting cup
const SIP = [0.72, 0.04];                    // a tasting cup (or an imagined one): full, drunk

// the twins' first choices (share of the asked group per cup: 荔枝烏龍, 黑糖桂圓, 油柑氣泡).  The book: 71-83% (shown
// as 77%) of 25-34 歲女性 choose 荔枝烏龍; of 40-44 歲 36% 荔枝烏龍 and 64% 黑糖桂圓.  The other two heights of the first
// group only rank (see the note).
const SHARE1 = [0.77, 0.15, 0.08];
const SHARE2 = [0.36, 0.64, 0];
// the two wedges of the field (head-local angle from 6 o'clock, + toward the head's +x = the asker's side)
const SEC_A = -0.6, SEC_B = 0.62;

const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const ei = (x) => { x = clamp(x); return x * x; };
const back = (x, c = 1.9) => { x = clamp(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const mix = (a, b, t) => a + (b - a) * t;
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const mixA = (a, b, t) => a + wrapA(b - a) * t;

// the 人 field on the seed bed.  uBed = (disk radius, wave front 0 ... 1.2 (>= 2: done), -, base density);
// uSec = (wedge A's angle, its strength, wedge B's angle, its strength).  Density (= 1 - shade) decides the glyph's
// weight; outside the lit wedge the field drops toward contour (dim).
// At map scale the screen's 人 cells (one glyph per 9 px) would leave a dozen big figures on the face; there the bed
// draws its own crowd instead: uMap.y figures across, in the AI's ink (solid marks, the typed band so nothing else is
// drawn on it), whenever the face is under uMap.x device px across (where the cells would give fewer figures).
const BED_HOOKS = {
  key: 'core-bed-5',
  // (the bed turns with the head's look, see LOOK_HOOKS; its pattern stays in the bed's own plane: vBedP)
  vHead: 'varying vec2 vBedP;',
  vNormal: 'objectNormal = normalize(mat3(uLookN) * objectNormal);',
  vPos: 'vBedP = transformed.xy;\ntransformed = (uLook * vec4(transformed, 1.0)).xyz;',
  fHead: /* glsl */`
varying vec2 vBedP;
float coreWedge(vec2 p, float r, float a0) {
  float a = atan(p.x, -p.y);
  float d = abs(mod(a - a0 + 3.14159265, 6.28318531) - 3.14159265);
  return (1.0 - smoothstep(0.36, 0.46, d)) * smoothstep(0.15, 0.25, r);
}
float coreSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
// one figure in a cell (0 ... 1, y up): the two strokes of the glyph, the left one bent
float coreFig(vec2 q) {
  float d = coreSeg(q, vec2(0.53, 0.9), vec2(0.42, 0.5));
  d = min(d, coreSeg(q, vec2(0.42, 0.5), vec2(0.14, 0.1)));
  return min(d, coreSeg(q, vec2(0.47, 0.52), vec2(0.87, 0.1)));
}`,
  fOut: /* glsl */`{
  vec2 p = vBedP / uBed.x;
  float r = length(p);
  float behind = uBed.y >= 1.9 ? 1.0 : 1.0 - smoothstep(uBed.y - 0.1, uBed.y, r);
  float crest = uBed.y >= 1.9 ? 0.0 : exp(-pow((r - uBed.y) / 0.08, 2.0)) * step(0.001, uBed.y);
  float D = mix(uBed.w, 0.84, behind);
  D = max(D, 0.98 * crest);
  D += (dHash(floor(vBedP * 1.3) + 3.1) - 0.5) * 0.1;
  float iA = coreWedge(p, r, uSec.x) * uSec.y, iB = coreWedge(p, r, uSec.z) * uSec.w;
  float inS = max(iA, iB), on = max(uSec.y, uSec.w);
  D = mix(D, max(D, 0.93), inS);
  sh = clamp(1.0 - D, 0.0, 1.0);
  dm = max(dm, on * (1.0 - inS) * 0.9);
  float upp = max(length(fwidth(vBedP)) * 0.7071, 1e-5);
  if (2.0 * uBed.x / upp < uMap.x) {
    float cs = 2.0 * uBed.x / uMap.y;
    vec2 gp = vBedP / cs;
    vec2 gi = floor(gp);
    float inside = step(length((gi + 0.5) * cs), uBed.x * 0.9);
    float aa = length(fwidth(gp)) * 0.7071;
    float w = max(0.075, 0.55 * aa);
    st = 0.95;
    sh = 1.0;
    if (inside > 0.5 && coreFig(fract(gp)) < w) ac = 1.0;
  }
}`,
};
// The face turns to whoever looks.  A sunflower turns its face to the light; this one turns its face of twins to the
// reader, so from every side of the map it reads as a flower full of people (from the side a head is only a disc's
// edge).  It is a look on top of the pose, applied in the vertex shader from update() (pose() stays pure, update()
// moves no transform): uLook = the turn in the mesh's own frame; an instanced mesh (the petals) takes it after each
// instance's matrix.  In this district and in 數位分身怎麼來 (whose twins land on this head) the look eases out and the
// head is exactly where pose() put it.
// (uLookN = its normal matrix, from the CPU; an instance's matrix is a turn and a scale, so its inverse is its columns
// over their squared lengths, transposed: no inverse() in the shader)
const LOOK_HOOKS = {
  key: 'core-look-3',
  vHead: /* glsl */`
#ifdef USE_INSTANCING
mat3 coreInvI() {
  mat3 a = mat3(instanceMatrix);
  return transpose(mat3(a[0] / dot(a[0], a[0]), a[1] / dot(a[1], a[1]), a[2] / dot(a[2], a[2])));
}
#endif
vec3 coreLookP(vec3 p) {
#ifdef USE_INSTANCING
  vec3 q = (uLook * (instanceMatrix * vec4(p, 1.0))).xyz;
  return coreInvI() * (q - instanceMatrix[3].xyz);
#else
  return (uLook * vec4(p, 1.0)).xyz;
#endif
}
vec3 coreLookN(vec3 n) {
#ifdef USE_INSTANCING
  return normalize(coreInvI() * (mat3(uLook) * (mat3(instanceMatrix) * n)));
#else
  return normalize(mat3(uLookN) * n);
#endif
}`,
  vNormal: 'objectNormal = coreLookN(objectNormal);',
  vPos: 'transformed = coreLookP(transformed);',
};
// the neck bends with the look: its foot stays on the stem, its top follows the head (pivot frame; uNeck = (turn, tip))
const NECK_HOOKS = {
  key: 'core-neck',
  vHead: /* glsl */`
vec3 coreNeck(vec3 p, vec3 v) {
  float w = smoothstep(-10.0, -0.4, p.y);
  float a = -uNeck.y * w * w, c = cos(a), s = sin(a);
  v = vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
  float cy = cos(uNeck.x), sy = sin(uNeck.x);
  return vec3(v.x * cy + v.z * sy, v.y, -v.x * sy + v.z * cy);
}`,
  vNormal: 'objectNormal = coreNeck(position, objectNormal);',
  vPos: 'transformed = coreNeck(position, transformed);',
};
// how the face follows: `up` of the viewer's height (it stays a flower on its stem, not a dish), tipped back at most
// `max`; `rate` per second on the map, `home` per second back to the pose
const LOOK_F = { up: 0.8, max: 1.0, rate: 3.2, home: 7 };
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// twins in flight and in their columns: one density for a column (uDen), one per instance for the particles
const TWIN_HOOKS = {
  key: 'core-twins',
  fOut: /* glsl */`{
#if defined(USE_INSTANCING_COLOR)
  sh = vColor.r;
#else
  sh = 1.0 - uDen;
#endif
}`,
};

/** a thought cloud's outline: an ellipse of bumps (w x h, n bumps), for an extruded slab facing +z */
function cloudShape(w, h, n = 9) {
  const s = new THREE.Shape();
  const pt = (a, k) => new THREE.Vector2(Math.cos(a) * (w / 2) * k, Math.sin(a) * (h / 2) * k);
  for (let i = 0; i <= n; i++) {
    const a0 = (i / n) * TAU + 0.2, a1 = ((i + 1) / n) * TAU + 0.2, am = (a0 + a1) / 2;
    const p0 = pt(a0, 0.86), p1 = pt(a1, 0.86), c = pt(am, 1.22);
    if (i === 0) s.moveTo(p0.x, p0.y);
    if (i < n) s.quadraticCurveTo(c.x, c.y, p1.x, p1.y);
  }
  return s;
}

/**
 * @param {object} [o]
 *  origin  [x, z] world position of the flower's foot (default the map's centre).  Everything here — the stage, the
 *          shots, the pin, the seed bed — is placed relative to it, so the district can move as a whole.
 */
export function buildCore({ origin = [0, 0] } = {}) {
  const g = new THREE.Group();
  g.name = 'core';
  g.position.set(origin[0], 0, origin[1]);
  g.rotation.y = YAW;
  g.updateMatrixWorld(true);
  const cY = Math.cos(YAW), sY = Math.sin(YAW);
  /** ground height under a point given in the stage frame */
  const gy = (x, z) => heightAt(origin[0] + x * cY + z * sY, origin[1] - x * sY + z * cY);
  /** the highest and lowest ground over a box of the stage frame */
  const groundOver = (x0, x1, z0, z1) => {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 4; j++) { const y = gy(mix(x0, x1, i / 8), mix(z0, z1, j / 4)); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    return [lo, hi];
  };
  const R = rng(12);
  const layers = {};             // dim groups: name -> Object3D[]
  const layer = (name, ...objs) => { (layers[name] ||= []).push(...objs); return objs[0]; };
  // ?look=a: paint slots set once the map has laid its own fills (see paintOnce)
  const PAINTS = [];
  const paintAs = (m, slot) => { PAINTS.push([m, slot]); return m; };
  const GREEN = PAINT.contour, SUN = figSlot('consumer', 'large'), DISC = figSlot('consumer', 'small');

  // =================================================================== the sunflower (book art)
  const baseY = gy(0, 0);
  const headY = baseY + 21;
  const stemPts = [
    new V3(0, baseY - 1, 0), new V3(0.35, baseY + 4, -0.2),
    new V3(-0.25, baseY + 8, 0.0), new V3(0, headY - 10, 0),
  ];
  const stem = new THREE.Mesh(tube(stemPts, 0.62, 60, 10), paintAs(ink({ shade: 0.95, bias: 0.06 }), GREEN));
  stem.castShadow = stem.receiveShadow = true;
  g.add(layer('flower', stem));
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(2.2, 1.6, 4.6, 2.6, 7.4, 0.4);
  leafShape.bezierCurveTo(4.8, -2.4, 2.0, -1.8, 0, 0);
  // low on the stem, spread left and right: behind the counter in the district's shots, the plant's base on the map
  for (const [y, rot, s] of [[baseY + 1.2, -0.35, 1.0], [baseY + 3.0, Math.PI + 0.45, 0.85]]) {
    const lg = new THREE.ShapeGeometry(leafShape, 24);
    const p = lg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -0.06 * x * x + Math.sin(x * 0.8) * 0.3); }
    lg.computeVertexNormals();
    const leaf = new THREE.Mesh(lg, paintAs(ink({ side: THREE.DoubleSide, shade: 0.92, bias: 0.06 }), GREEN));
    leaf.scale.setScalar(s);
    leaf.position.set(0, y, 0);
    leaf.rotation.set(-0.5, rot, 0.25);
    leaf.castShadow = leaf.receiveShadow = true;
    g.add(layer('flower', leaf));
  }
  // the head: a pivot on the stem axis (posed yaw), the head nods inside it
  const pivot = new THREE.Group();
  pivot.position.set(0, headY, 0);
  pivot.rotation.y = HEAD_YAW;
  g.add(pivot);
  // the look (see LOOK_HOOKS): one uLook (and its normal matrix uLookN) per head mesh, set from update(); its shadow
  // follows (customDepthMaterial)
  const looks = [];
  const lookUs = () => ({ uLook: { value: new THREE.Matrix4() }, uLookN: { value: new THREE.Matrix4() } });
  const lookU = (mesh, us) => {
    mesh.updateMatrix();
    looks.push({ u: us.uLook, n: us.uLookN, mo: mesh.matrix.clone(), mi: mesh.matrix.clone().invert() });
    if (mesh.castShadow) mesh.customDepthMaterial = inkDepth(LOOK_HOOKS, us);
    return mesh;
  };
  const neckU = { value: new THREE.Vector4(0, 0, 0, 0) };
  const neck = new THREE.Mesh(tube([
    new V3(0, -10.0, 0), new V3(0, -7.4, -1.4), new V3(0, -3.6, -2.7), new V3(0, -0.4, -3.0),
  ], 0.6, 24, 10), paintAs(ink({ shade: 0.9, bias: 0.06, hooks: NECK_HOOKS, uniforms: { uNeck: neckU } }), GREEN));
  neck.castShadow = true;
  neck.customDepthMaterial = inkDepth(NECK_HOOKS, { uNeck: neckU });
  pivot.add(layer('flower', neck));
  const head = new THREE.Group();
  head.rotation.x = NOD0;
  pivot.add(head);
  const RH = 8.6;
  const bowlU = lookUs();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(RH * 1.04, 48, 16, 0, TAU, 0, Math.PI * 0.32),
    paintAs(ink({ shade: 0.85, bias: 0.05, side: THREE.DoubleSide, hooks: LOOK_HOOKS, uniforms: { ...bowlU } }), GREEN));
  bowl.rotation.x = -Math.PI / 2;
  bowl.scale.set(1, 1, 0.42);
  bowl.position.z = -0.2;
  bowl.castShadow = true;
  head.add(layer('flower', lookU(bowl, bowlU)));
  // the seed bed is the field of 人: every cell a digital twin
  const bedU = new THREE.Vector4(RH, 2, 0, 0.84);
  const secU = new THREE.Vector4(SEC_A, 0, SEC_B, 0);
  // the crowd at map scale: under 9 of the screen's 9 px cells across (device px), 9 figures across (about fifty)
  const mapU = new THREE.Vector2(81, 9);
  const bedL = lookUs();
  const bed = new THREE.Mesh(new THREE.CircleGeometry(RH * 1.0, 96), ink({ style: 0.8, hooks: BED_HOOKS, uniforms: { uBed: { value: bedU }, uSec: { value: secU }, uMap: { value: mapU }, ...bedL } }));
  bed.position.z = 0.15;
  bed.receiveShadow = true;
  head.add(layer('field', lookU(bed, bedL)));
  // the disc's dark rim, as a sunflower's: a ring of florets between the field and the petals, so from any distance
  // the head reads as a sunflower's (a dark round face in a ring of petals), not as a badge
  const rimU = lookUs();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(RH + 0.1, 0.5, 8, 96),
    paintAs(ink({ shade: 0.32, bias: 0.0, hooks: LOOK_HOOKS, uniforms: { ...rimU } }), DISC));
  rim.position.z = 0.12;
  rim.scale.z = 0.6;
  rim.castShadow = false;
  rim.receiveShadow = true;
  head.add(layer('flower', lookU(rim, rimU)));
  // petals: Fibonacci counts.  In the book's own drawing pencil petals round the dark rim; on the printed map (look
  // a) sunflower yellow, printed under the pencil line.  Their tilt is posed: half closed over the bed before the
  // question, sprung open by it
  const petal = new THREE.Shape();
  petal.moveTo(0, -0.9);
  petal.bezierCurveTo(1.0, 0.8, 0.9, 3.6, 0, 5.6);
  petal.bezierCurveTo(-0.9, 3.6, -1.0, 0.8, 0, -0.9);
  const pg = new THREE.ShapeGeometry(petal, 16);
  {
    const p = pg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i); p.setZ(i, 0.05 * y * y - Math.abs(x) * 0.35); }
    pg.computeVertexNormals();
  }
  const petals = [];
  for (const [count, rad, tilt, scale] of [[34, RH + 0.4, 0.42, 1.05], [21, RH - 0.4, 0.62, 0.9]]) {
    const pu = lookUs();
    const pm = new THREE.InstancedMesh(pg, paintAs(ink({ side: THREE.DoubleSide, accent: 0, shade: 1.0, bias: LOOK === 'a' ? 0.26 : 0.14, hooks: LOOK_HOOKS, uniforms: { ...pu } }), SUN), count);
    const list = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + (rad < RH ? 0.09 : 0) + (R() - 0.5) * 0.05;
      list.push({ a, tx: tilt + (R() - 0.5) * 0.25, rz: a - Math.PI / 2 + (R() - 0.5) * 0.1, z: -0.3 - R() * 0.4, s: scale * (0.85 + R() * 0.3), sy: 0.9 + R() * 0.25, rad });
    }
    pm.castShadow = true;
    pm.frustumCulled = false;
    head.add(layer('flower', lookU(pm, pu)));
    petals.push({ pm, list, closed: rad < RH ? 0.62 : 0.5 });
  }
  const _pe = new THREE.Euler();
  /** the petals at openness o (0 half closed ... 1 open) */
  function setPetals(o) {
    for (const { pm, list, closed } of petals) {
      list.forEach((p, i) => {
        _pe.set(p.tx + (1 - o) * closed, 0, p.rz, 'ZXY');
        _q.setFromEuler(_pe);
        const rr = p.rad * mix(0.96, 1, o);
        _v.set(Math.cos(p.a) * rr, Math.sin(p.a) * rr, p.z);
        const s = p.s * mix(0.9, 1, o);
        _m.compose(_v, _q, _s.set(s, s * p.sy, s));
        pm.setMatrixAt(i, _m);
      });
      pm.instanceMatrix.needsUpdate = true;
    }
  }
  setPetals(1);
  for (const { pm } of petals) pm.computeBoundingSphere();
  /** a point on the head (head-local) in the stage frame, at the head's current pose */
  const onHead = (x, y, z, out = new V3()) => { head.updateWorldMatrix(true, false); return g.worldToLocal(head.localToWorld(out.set(x, y, z))); };
  const onHeadW = (x, y, z) => { head.updateWorldMatrix(true, false); return head.localToWorld(new V3(x, y, z)); };
  /** a point of a wedge (r 0...1 of the radius) in head-local x, y */
  const wedgeXY = (a0, a, r) => [Math.sin(a0 + a) * r * RH, -Math.cos(a0 + a) * r * RH];

  // =================================================================== the counter and its three sealed cups
  // a plank counter on a low plinth (the island is level here: people walk up to it on the ground)
  const BENCH_Z = 12.5, BENCH_W = 12.6, BENCH_H = 2.1, BENCH_D = 2.8;
  const [pLo, pHi] = groundOver(-BENCH_W / 2 - 0.4, BENCH_W / 2 + 0.4, BENCH_Z - BENCH_D / 2 - 0.3, BENCH_Z + BENCH_D / 2 + 0.3);
  const PLINTH_TOP = pHi + 0.12;
  const plinth = P.makeDais({ w: BENCH_W + 0.8, d: BENCH_D + 0.6, h: PLINTH_TOP - (pLo - 0.4) });
  plinth.group.position.set(0, pLo - 0.4, BENCH_Z);
  g.add(layer('stage', plinth.group));
  const bench = P.makeBench({ w: BENCH_W, d: BENCH_D, h: BENCH_H });
  bench.group.position.set(0, PLINTH_TOP, BENCH_Z);
  g.add(layer('stage', bench.group));
  const TOP = PLINTH_TOP + BENCH_H;
  // a board across its front (so what falls off the back is out of sight)
  const FRONT_H = BENCH_H - 0.24 - 0.1;
  const FRONT_Z = BENCH_Z + BENCH_D / 2 - 0.06;
  const front = new THREE.Mesh(new THREE.BoxGeometry(BENCH_W - 0.2, FRONT_H, 0.08), ink({ shade: 0.95, bias: 0.08 }));
  front.position.set(0, PLINTH_TOP + 0.05 + FRONT_H / 2, FRONT_Z);
  front.castShadow = front.receiveShadow = true;
  g.add(layer('stage', front));
  const CUP_H = 4;
  const HB = 0.84 * CUP_H, RB = 0.2 * CUP_H, RT = 0.29 * CUP_H;
  const rAt = (y) => RB + (RT - RB) * (y / HB);
  const FRAME_Y = HB + 0.16;                    // a tube's foot over its cup's seal
  const HMAX = 5;                               // a tube's height for 100%
  const CUP_X = [-4.2, 0, 4.2];
  // where the two left stand once 油柑氣泡 is gone (beat 4 on): together in the middle
  const XS = [-2.5, 2.5];
  // each cup carries its name on a paper sleeve near the top (above the tea, which shows below it)
  const SLEEVE = [0.62 * HB, 0.93 * HB];
  const SLEEVE_R = rAt((SLEEVE[0] + SLEEVE[1]) / 2);
  const SLEEVE_SIZE = [2 * SLEEVE_R, (SLEEVE[1] - SLEEVE[0]) * 0.92];
  const ids = ['cup-lychee', 'cup-brown', 'cup-yougan'];
  const COLS = ['col-lychee', 'col-brown', 'col-yougan'];
  // the teas differ a little: 荔枝烏龍 light, 黑糖桂圓 dark with pearls, 油柑氣泡 light
  const TEA = [{ pearls: false, mul: 0.86 }, { pearls: true, mul: 0.72 }, { pearls: false, mul: 0.95 }];
  const cups = CUP_X.map((x, j) => {
    const c = P.makeCup({ h: CUP_H, fill: FILL[0], pearls: TEA[j].pearls });
    // (the empty part of a cup lighter, so the tea's level reads: it goes down when a real person drinks)
    c.body.material.userData.u.uShadeMul.value = TEA[j].mul;
    c.body.material.userData.u.uShadeBias.value = 0.28;
    c.fillU = c.body.material.userData.u.uCup.value;
    // sealed: a flat film instead of the dome lid, the straw only once someone stabs it in
    c.lid.visible = false;
    c.straw.visible = false;
    const film = new THREE.Mesh(new THREE.CylinderGeometry(RT * 1.04, RT * 1.04, 0.07, 32), ink({ shade: 1, bias: 0.22 }));
    film.position.y = HB + 0.035;
    film.castShadow = film.receiveShadow = true;
    c.group.add(film);
    c.film = film;
    const sp = [];
    for (let i = 0; i <= 6; i++) { const y = mix(SLEEVE[0], SLEEVE[1], i / 6); sp.push(new THREE.Vector2(rAt(y) + 0.04, y)); }
    const sleeve = new THREE.Mesh(new THREE.LatheGeometry(sp, 32), ink({ shade: 1, bias: 0.36 }));
    sleeve.castShadow = false; sleeve.receiveShadow = true;
    c.group.add(sleeve);
    c.sleeve = sleeve;
    c.group.position.set(x, TOP, BENCH_Z);
    g.add(c.group);
    layer(ids[j], c.group);
    c.hit = P.makeHitProxy(c.group, 0.3);
    // its tube on a stand over the cup: two legs from the counter, a 0-100 frame, the column of 人 who chose it
    const stand = new THREE.Group();
    stand.position.set(x, TOP, BENCH_Z);
    const legM = ink({ shade: 0.8, bias: 0.06 });
    c.legs = [-1, 1].map((s) => {
      const L = new THREE.Mesh(new THREE.BoxGeometry(0.1, FRAME_Y, 0.1).translate(0, FRAME_Y / 2, 0), legM);
      L.position.set(s * 1.33, 0, -0.25);
      L.castShadow = true;
      stand.add(L);
      return L;
    });
    const fr = P.makeFrame({ h: HMAX, w: 2.4, t: 0.12 });
    fr.group.position.set(0, FRAME_Y, 0.05);
    stand.add(fr.group);
    c.frame = fr;
    // milky glass behind the column: an empty tube reads as an empty tube, and nothing behind it shows through
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.28, HMAX, 0.05).translate(0, HMAX / 2, 0), ink({ shade: 1, bias: 0.42 }));
    glass.position.z = -0.74;
    glass.castShadow = false;
    glass.receiveShadow = true;
    fr.group.add(glass);
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1, 1.25).translate(0, 0.5, 0),
      ink({ style: 0.8, hooks: TWIN_HOOKS, uniforms: { uDen: { value: 0.86 } } }));
    st.position.y = FRAME_Y;
    st.scale.y = 1e-3;
    st.receiveShadow = true;
    stand.add(st);
    c.stack = st;
    g.add(stand);
    c.stand = stand;
    layer(COLS[j], stand);
    return c;
  });
  const FRAME_TOP = TOP + FRAME_Y + HMAX;
  /** a cup's sleeve on the side toward the camera, its centre in world space (the name sits on it), however the cup
   *  is turned in a hand or in the crate */
  const TO_CAM = new V3(0, 0, 1).applyQuaternion(g.quaternion);
  const sleeveFace = (j) => {
    const c = cups[j];
    c.group.updateWorldMatrix(true, false);
    const s = c.group.scale.y;
    return c.group.localToWorld(new V3(0, (SLEEVE[0] + SLEEVE[1]) / 2, 0)).addScaledVector(TO_CAM, (SLEEVE_R + 0.06) * s);
  };
  // the typed ✕: the brand person carries it up and slaps it onto 油柑氣泡's front, a little to his side (X_A from the
  // front, at X_Y up the cup: the cup's surface there, its outward normal)
  const X = P.makeX({ size: 1.7 });
  X.group.visible = false;
  X.group.matrixAutoUpdate = false;
  g.add(X.group);
  layer('cup-yougan', X.group);
  const X_A = 0.5, X_Y = 0.42 * HB;
  const X_ON = new THREE.Matrix4().compose(new V3(Math.sin(X_A) * (rAt(X_Y) + 0.2), X_Y, Math.cos(X_A) * (rAt(X_Y) + 0.2)),
    new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), X_A), new V3(1, 1, 1));
  /** the point the palm lands on (stage frame, the cup where it stands) */
  const X_PT = new V3(CUP_X[2] + Math.sin(X_A) * (rAt(X_Y) + 0.42), TOP + X_Y, BENCH_Z + Math.cos(X_A) * (rAt(X_Y) + 0.42));
  // where 油柑氣泡 goes over: slid back to the counter's back edge, it tips off it about the rim there
  const EDGE_Z = BENCH_Z - BENCH_D / 2;

  // =================================================================== the brand person and the question
  const person = makePerson({ height: 4.5 });
  const PERSON = new V3(7.6, 0, 13.7);
  PERSON.y = gy(PERSON.x, PERSON.z);
  const FACE = -0.62;                            // three-quarter, toward the counter and the sun
  person.group.position.copy(PERSON);
  person.group.rotation.y = FACE;
  person.material.userData.u.uShadeBias.value = 0.34;
  const clip = P.makeClipboard({ w: 1.25, h: 1.6 });
  person.hold('L', clip);
  g.add(person.group);
  const personHit = P.makeHitProxy(person.group, 0.35);
  layer('person', person.group);
  const V_RAISE = person.pose('raise', { side: 'L' }), V_HOLD = person.pose('hold'), V_STAND = person.pose('stand');
  // the strike (beat 4): one step toward 油柑氣泡 (PSTEP, turned to it), the ✕ raised in the right hand, the clipboard
  // kept at the chest in the left; then the palm on the cup (X_PT)
  const PSTEP = new V3(6.15, 0, 14.35);
  PSTEP.y = gy(PSTEP.x, PSTEP.z);
  const FACE2 = Math.atan2(X_PT.x - PSTEP.x, X_PT.z - PSTEP.z);
  const PSTEP_LEN = Math.hypot(PSTEP.x - PERSON.x, PSTEP.z - PERSON.z);
  const keepClip = (v) => { for (const k of ['p', 'pole']) v.hand.L[k].copy(V_HOLD.hand.L[k]); v.hand.L.grip.copy(V_HOLD.hand.L.grip); return v; };
  const V_XUP = keepClip(person.pose('raise', { side: 'R' }));
  const V_SLAP = (() => {
    const v = keepClip(person.pose('raise', { side: 'R' }));
    person.group.position.copy(PSTEP); person.group.rotation.y = FACE2;
    person.group.updateMatrixWorld(true);
    g.updateMatrixWorld(true);
    const tp = person.group.worldToLocal(g.localToWorld(X_PT.clone())).divideScalar(4.5);
    v.hand.R.p.copy(tp);
    v.hand.R.pole.set(-1, -0.5, -0.3);
    v.waist.setFromEuler(new THREE.Euler(0.12, 0, 0));
    person.group.position.copy(PERSON); person.group.rotation.y = FACE;
    return v;
  })();
  // crossing a flavour off: the right hand on the clipboard's sheet, two strokes (see pose)
  const noteAt = (u) => {
    const v = person.pose('hold');
    const L = v.hand.L.p;
    v.hand.R.p.set(L.x - 0.05 + 0.035 * Math.sin(u * TAU * 2), L.y + 0.16 + 0.03 * Math.cos(u * TAU * 2), L.z + 0.045);
    v.head.copy(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.38, 0, 0)));
    return v;
  };
  // the question: a big bubble with the three cups in it, out of the clipboard and into the field
  const bubble = P.makeBubble({ w: 5.4, h: 3.3, tail: 'right' });
  bubble.iconSlots(3).forEach((s) => { const c = P.makeCup({ h: s.userData.size * 0.95 }); c.group.position.y = -s.userData.size * 0.5; s.add(c.group); });
  bubble.group.visible = false;
  g.add(bubble.group);
  layer('bubble', bubble.group);
  const B0 = new V3(6.2, PERSON.y + 7.6, 14.4), B1 = new V3(4.6, headY - 2.2, 10.5);

  // =================================================================== twins: the pours
  // [0, NS): the first group (25-34): its pour (beat 2), and home again (beat 3)
  // [NS, 2NS): the second group (40-44): its pour (beat 3)
  const NS = 540, NP = 2 * NS;
  const twinMat = ink({ style: 0.8, hooks: TWIN_HOOKS, uniforms: { uDen: { value: 0.85 } } });
  const twins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), twinMat, NP);
  twins.frustumCulled = false;
  twins.castShadow = false;
  {
    const col = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) { col[i * 3] = 0.14; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = -1; }
    twins.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
  }
  g.add(twins);
  layer('twins', twins);
  const pick = (h, share) => (h < share[0] ? 0 : h < share[0] + share[1] ? 1 : 2);
  /** a group of twins: each one's cup, launch (most in the main window, the rest one by one after), flight, start */
  const group = (share, a0, T) => {
    const out = [];
    for (let i = 0; i < NS; i++) {
      const j = pick(R(), share);
      const a = (R() - 0.5) * 0.76, r = 0.27 + 0.7 * Math.sqrt(R());
      const [hx, hy] = wedgeXY(a0, a, r);
      const ln = R();
      const t0 = ln < T.mainShare ? mix(T.main[0], T.main[1], ln / T.mainShare) : mix(T.tail[0], T.tail[1], (ln - T.mainShare) / (1 - T.mainShare));
      out.push({ j, ln, t0, fl: T.fl[0] + R() * (T.fl[1] - T.fl[0]), hx, hy, jx: (R() - 0.5) * 1.4, jz: (R() - 0.5) * 0.9, sp: R() });
    }
    return out;
  };
  const G1 = group(SHARE1, SEC_A, T1);
  const G2 = group(SHARE2, SEC_B, T2);
  // the first group goes home in beat 3: the last in leaves first
  for (const p of G1) { p.tb = T2.home[0] + (1 - p.ln) * (T2.home[1] - T2.home[0] - T2.hfl[1]); p.hf = T2.hfl[0] + R() * (T2.hfl[1] - T2.hfl[0]); }
  /** fraction of a group's twins of cup j for which time(p) <= t */
  const fracOf = (G, key) => {
    const per = [[], [], []];
    for (const p of G) per[p.j].push(key(p));
    per.forEach((a) => a.sort((x, y) => x - y));
    return (j, t) => { const a = per[j]; if (!a.length) return 0; let n = 0; while (n < a.length && a[n] <= t) n++; return n / a.length; };
  };
  const in1 = fracOf(G1, (p) => p.t0 + p.fl);      // arrived (beat 2)
  const out1 = fracOf(G1, (p) => p.tb);            // left for home (beat 3)
  const in2 = fracOf(G2, (p) => p.t0 + p.fl);      // arrived (beat 3)

  // =================================================================== the twins imagine: thought clouds, the tag
  // out of the 荔枝烏龍 and 黑糖桂圓 tubes: two puffs and a cloud with a drink in it (they can only imagine its taste)
  const cloudMat = ink({ shade: 1, bias: 0.34 });
  const CLOUD = { w: 4.5, h: 3.05 };
  const cloudGeo = (() => {
    const t = 0.24, bev = 0.06;
    const geo = new THREE.ExtrudeGeometry(cloudShape(CLOUD.w, CLOUD.h, 10), { depth: t - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 });
    geo.translate(0, 0, -(t - 2 * bev) / 2);
    geo.computeVertexNormals();
    return geo;
  })();
  const puffGeo = new THREE.CylinderGeometry(1, 1, 0.2, 20).rotateX(Math.PI / 2);
  const clouds = new THREE.Group();
  clouds.name = 'clouds';
  g.add(clouds);
  layer('cloud', clouds);
  // each cloud a little outward of its tube (the tag hangs between the two), with its drink in it: an open cup with
  // a straw, whose tea the twins drink dry in their heads (uCup.y, posed)
  const CLOUD_DX = [-0.75, 0.75];
  const CLOUDS = [0, 1].map((j) => {
    const x = XS[j];
    const cg = new THREE.Group();
    cg.position.set(x + CLOUD_DX[j], FRAME_TOP + 2.75, BENCH_Z + 0.35);
    const m = new THREE.Mesh(cloudGeo, cloudMat);
    m.castShadow = true;
    cg.add(m);
    const icon = P.makeCup({ h: 1.95, fill: SIP[0], pearls: j === 1 });
    icon.group.position.set(0, -0.98, 0.22);
    icon.lid.visible = false;
    icon.body.material.userData.u.uShadeMul.value = TEA[j].mul;
    icon.body.material.userData.u.uShadeBias.value = 0.28;
    cg.add(icon.group);
    clouds.add(cg);
    const puffs = [[0.12 * Math.sign(CLOUD_DX[j]), 0.42, 0.24], [0.42 * Math.sign(CLOUD_DX[j]), 1.0, 0.36]].map(([dx, dy, r]) => {
      const pm = new THREE.Mesh(puffGeo, cloudMat);
      pm.position.set(x + dx, FRAME_TOP + dy, BENCH_Z + 0.35);
      pm.userData.r = r;
      pm.scale.setScalar(r);
      clouds.add(pm);
      return pm;
    });
    return { cg, puffs, y0: cg.position.y, fill: icon.body.material.userData.u.uCup.value };
  });
  const cloudHit = P.makeHitProxy(clouds, 0.2);
  // the tag: typed, the system's own word for what this answer is; it hangs from a cord between the two tubes' tops
  const TAG = { w: 3.8, h: 1.15, x: (XS[0] + XS[1]) / 2, y: FRAME_TOP - 0.42, z: BENCH_Z + 0.42 };
  const tag = new THREE.Group();
  tag.name = 'tag';
  tag.position.set(TAG.x, TAG.y, TAG.z);
  const tagPivot = new THREE.Group();
  tag.add(tagPivot);
  const board = new THREE.Mesh(new THREE.BoxGeometry(TAG.w, TAG.h, 0.07).translate(0, -TAG.h / 2, 0), ink({ style: 1, shade: 0.28, bias: 0.66, accent: 'teal' }));
  board.castShadow = true;
  tagPivot.add(board);
  // the cord: from each tube's inner top corner down to the tag's top corner
  const cordM = ink({ shade: 0.45 });
  for (const s of [-1, 1]) {
    const a = new V3(s * ((XS[1] - XS[0]) / 2 - 1.2), FRAME_TOP - TAG.y, BENCH_Z + 0.05 - TAG.z), b = new V3(s * (TAG.w / 2 - 0.16), 0, 0);
    const len = a.distanceTo(b);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 5), cordM);
    cord.position.copy(a).add(b).multiplyScalar(0.5);
    cord.quaternion.setFromUnitVectors(new V3(0, 1, 0), a.clone().sub(b).normalize());
    tag.add(cord);
  }
  g.add(tag);
  layer('label', tag);
  const tagHit = P.makeHitProxy(tag, 0.15);

  // =================================================================== the two boxes and three real people
  // a low stand in front of the counter with two open boxes on it, 上市 (the bigger, at the left) and 限定 (at the
  // right): what the question is about, from the first frame (which drink goes where)
  const BOX = [{ w: 3.2, d: 1.8, h: 0.95, x: -1.6 }, { w: 2.3, d: 1.7, h: 0.85, x: 1.5 }];
  const BOX_T = 0.08;
  const DEC = new V3(-0.1, 0, 17.7);
  const DEC_W = 6.3, DEC_D = 2.1, DEC_H = 1.55;
  const [dLo, dHi] = groundOver(DEC.x - DEC_W / 2 - 0.2, DEC.x + DEC_W / 2 + 0.2, DEC.z - DEC_D / 2 - 0.2, DEC.z + DEC_D / 2 + 0.2);
  DEC.y = dHi;
  const decSet = new THREE.Group();
  decSet.name = 'boxes';
  decSet.position.copy(DEC);
  g.add(decSet);
  const decStand = P.makeTable({ w: DEC_W, d: DEC_D, h: DEC_H + (dHi - dLo) });
  decStand.group.position.y = -(dHi - dLo);
  decSet.add(decStand.group);
  layer('boxes', decStand.group);
  const boxMats = [];
  const boxes = BOX.map((B, i) => {
    const grp = new THREE.Group();
    grp.position.set(B.x, DEC_H, 0);
    const m = ink({ shade: 0.72, bias: 0.06 });
    boxMats.push(m);
    for (const [bw, bh, bd, x, y, z] of [[B.w, BOX_T, B.d, 0, BOX_T / 2, 0], [B.w, B.h, BOX_T, 0, B.h / 2, B.d / 2 - BOX_T / 2], [B.w, B.h, BOX_T, 0, B.h / 2, -B.d / 2 + BOX_T / 2],
      [BOX_T, B.h, B.d, B.w / 2 - BOX_T / 2, B.h / 2, 0], [BOX_T, B.h, B.d, -B.w / 2 + BOX_T / 2, B.h / 2, 0]]) {
      const o = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
      o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = true;
      grp.add(o);
    }
    decSet.add(grp);
    layer(i === 0 ? 'crate' : 'limited', grp);
    return grp;
  });
  const [crate, limBox] = boxes;
  const [crateMat, limMat] = boxMats;
  const crateHit = P.makeHitProxy(crate, 0.2), limHit = P.makeHitProxy(limBox, 0.2);
  const BOX_FLOOR = DEC.y + DEC_H + BOX_T;
  const HAND = 0.6;                            // a drink's size once it is carried or in a box
  // lever a: the two sent into the 上市 box side by side (stage frame)
  const SLOT_A = [new V3(DEC.x + BOX[0].x - 0.72, BOX_FLOOR, DEC.z), new V3(DEC.x + BOX[0].x + 0.72, BOX_FLOOR, DEC.z)];

  // the real people: R1 (left of the stand) tastes 荔枝烏龍 and carries it to 上市; R2 (right of it) tastes 黑糖桂圓 and
  // carries it to 限定; R3 comes round behind the stand and watches
  const TH = 4.6;
  const tastersG = new THREE.Group();
  tastersG.name = 'tasters';
  g.add(tastersG);
  layer('tasters', tastersG);
  const SPOTS = [
    { at: [-3.8, 17.05], yaw: 0.25, from: [-4.8, 22.7] },
    { at: [3.5, 17.35], yaw: -0.25, from: [4.5, 22.9] },
    { at: [-0.25, 15.3], yaw: 0.0, from: [-8.6, 15.0] },
  ];
  const tasters = SPOTS.map((S) => {
    const p = makePerson({ height: TH });
    p.material.userData.u.uShadeBias.value = 0.34;
    p.spot = new V3(S.at[0], gy(S.at[0], S.at[1]), S.at[1]);
    p.start = new V3(S.from[0], 0, S.from[1]);
    p.len = Math.hypot(p.spot.x - p.start.x, p.spot.z - p.start.z);
    p.heading = Math.atan2(p.spot.x - p.start.x, p.spot.z - p.start.z);
    p.yaw = S.yaw;
    p.group.position.copy(p.spot);
    p.group.rotation.y = p.yaw;
    tastersG.add(p.group);
    p.vStand = p.pose('stand');
    p.vHold = p.pose('hold');
    p.apply(p.vStand);
    return p;
  });
  const tastersHit = P.makeHitProxy(tastersG, 0.25);
  const [R1, R2, R3] = tasters;
  // the tasting cups: small open cups (no lid, no straw), one out of each drink
  const SAMPLE_H = 1.5;
  // where each is filled: on the counter's front edge, just in front of its drink (stage frame; the drinks stand at XS)
  const S_AT = [0, 1].map((j) => new V3(XS[j] + (j === 0 ? -0.45 : 0.45), TOP, BENCH_Z + 1.02));
  const samples = [0, 1].map((j) => {
    const c = P.makeCup({ h: SAMPLE_H, fill: SIP[0], pearls: j === 1 });
    c.lid.visible = false;
    c.straw.visible = false;
    c.body.material.userData.u.uShadeMul.value = TEA[j].mul;
    c.body.material.userData.u.uShadeBias.value = 0.28;
    c.fillU = c.body.material.userData.u.uCup.value;
    c.group.visible = false;
    tastersG.add(c.group);
    return c;
  });
  g.updateMatrixWorld(true);
  const gInv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const _ma = new THREE.Matrix4(), _mb = new THREE.Matrix4(), _mc = new THREE.Matrix4();
  // a cup a hand holds: its matrix in the stage frame from the grip (it hangs from the palm by its side); hv = the
  // cup's own handle point at size 1
  const inHand = (p, hv, s, out) => {
    p.group.updateMatrixWorld(true);
    const grip = p.hand('R');
    grip.updateWorldMatrix(true, false);
    return out.multiplyMatrices(gInv, grip.matrixWorld).multiply(_mb.makeTranslation(-hv.x * s, -hv.y * s, -hv.z * s)).multiply(_mc.makeScale(s, s, s));
  };
  const H_DRINK = cups[0].handle('R'), H_SAMPLE = samples[0].handle('R');
  const cupInHand = (p, s, out) => inHand(p, H_DRINK, s, out);
  // the standing sip from a tasting cup: its near rim at the lips, tipped toward them, the head tipped down to it
  const sipPose = (p) => {
    const v = p.pose('hold');
    p.apply(v);
    p.group.updateMatrixWorld(true);
    const mouth = p.group.worldToLocal(p.head.localToWorld(new V3(0, 0.03 * TH, 0.068 * TH))).divideScalar(TH);
    const h = SAMPLE_H / TH, tilt = -0.55;
    // (the grip is on the cup's side at half its height: tipped by `tilt`, the near rim is (0.25, 0.21, -0.47) h from it)
    v.hand.R.p.set(mouth.x - 0.25 * h, mouth.y - 0.21 * h, mouth.z + 0.47 * h + 0.01);
    v.hand.R.pole.set(-0.7, -0.6, -0.5);
    v.hand.R.grip.setFromEuler(new THREE.Euler(tilt, 0, 0));
    v.head.setFromEuler(new THREE.Euler(0.12, 0, 0));
    p.apply(p.vStand);
    return v;
  };
  for (const p of [R1, R2]) p.vSip = sipPose(p);
  // each carrier turns to its box and sets the drink in it (the right hand down at the box's floor, in front of them)
  const PUT_AT = [new V3(DEC.x + BOX[0].x - 0.45, BOX_FLOOR, DEC.z), new V3(DEC.x + BOX[1].x + 0.15, BOX_FLOOR, DEC.z)];
  const FACE_BOX = [R1, R2].map((p, j) => Math.atan2(PUT_AT[j].x - p.spot.x, PUT_AT[j].z - p.spot.z));
  const putPose = [R1, R2].map((p, j) => {
    const d = Math.hypot(PUT_AT[j].x - p.spot.x, PUT_AT[j].z - p.spot.z);
    return p.pose('stamp', { y: BOX_FLOOR - p.spot.y + 0.42 * HB * HAND + 0.05, fwd: d, x: -0.5, table: BOX_FLOOR - p.spot.y + BOX[j].h - BOX_T });
  });
  // the hand-overs (where each tasting cup and then each drink lands: in the hand of the hold pose at the spot) and
  // each drink's place in its box (where the put leaves it: the cup hangs from the hand until it stands)
  const atPose = (p, v, yaw) => { p.group.position.copy(p.spot); p.group.rotation.y = yaw; p.apply(v); return p; };
  const M_HAND = [R1, R2].map((p) => cupInHand(atPose(p, p.vHold, p.yaw), HAND, new THREE.Matrix4()));
  const M_SAMPLE = [R1, R2].map((p) => inHand(atPose(p, p.vHold, p.yaw), H_SAMPLE, 1, new THREE.Matrix4()));
  const M_PUT = [R1, R2].map((p, j) => {
    const M = cupInHand(atPose(p, putPose[j], FACE_BOX[j]), HAND, new THREE.Matrix4());
    // stand it upright on the box's floor
    const pp = new V3(), qq = new THREE.Quaternion(), ss = new V3();
    M.decompose(pp, qq, ss);
    pp.y = BOX_FLOOR;
    return M.compose(pp, new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), FACE_BOX[j]), ss);
  });
  for (const p of tasters) atPose(p, p.vStand, p.yaw);
  const V_WATCH3 = R3.pose('watch', { yaw: 0.75, pitch: 0.3 }), V_NOD3 = R3.pose('watch', { yaw: 0.75, pitch: 0.6 });
  // (the brand person, at the right end, watches the real people)
  const V_PWATCH = person.pose('watch', { yaw: -0.5, pitch: 0.35 });

  // =================================================================== hit proxies, shadows, accents
  const headHit = P.makeHitProxy(bed, 1.2);
  // the accents this district switches itself are drawn at full strength wherever they are
  for (const m of [crateMat, limMat, ...cups.flatMap((c) => [c.film.material, c.body.material])]) m.userData.u.uAccentAll = { value: 1 };
  g.traverse((o) => { if (o.isMesh) o.userData.cs0 = o.castShadow; });

  // =================================================================== pose: (beat, k, lever) -> everything
  const cur = { beat: LAST, k: 1, lever: 'b', emph: null };
  Object.defineProperty(BEATS[LAST], 'parts', { configurable: true, enumerable: true, get: () => (cur.lever === 'a' ? PARTS_A : PARTS_B) });
  const poseDim = {};
  const Mh = new THREE.Matrix4();
  const tv = new V3(), tv2 = new V3(), tv3 = new V3(), tv4 = new V3(), tv5 = new V3();
  const st = { cupShown: [false, false, false], cupOn: [true, true, true], held: [false, false], inBox: [false, false], scale: [1, 1, 1], label: false, top: [0, 0, 0], sec: 'A', clouds: 0, x: [...CUP_X] };
  // the accents a pose asks for; applyDim() draws them only while the district is in focus (an emphasis is set)
  const want = { lid: [false, false, false], body: [false, false, false], red: false, crate: false, limited: false };
  const _pa = [new V3(), new THREE.Quaternion(), new V3()], _pb = [new V3(), new THREE.Quaternion(), new V3()];
  const lerpM = (a, b, k, out) => {
    a.decompose(..._pa); b.decompose(..._pb);
    return out.compose(_pa[0].lerp(_pb[0], k), _pa[1].slerp(_pb[1], k), _pa[2].lerp(_pb[2], k));
  };
  /** a quadratic arc from a to b that bulges up and toward the camera */
  const arc = (a, b, u, up, out) => {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + up, mz = (a.z + b.z) / 2 + up * 1.7;
    const a0 = (1 - u) * (1 - u), a1 = 2 * (1 - u) * u, a2 = u * u;
    return out.set(a0 * a.x + a1 * mx + a2 * b.x, a0 * a.y + a1 * my + a2 * b.y, a0 * a.z + a1 * mz + a2 * b.z);
  };
  /** a plain hop from a to b: up by `up` in the middle */
  const hop = (a, b, u, up, out) => out.lerpVectors(a, b, u).setY(mix(a.y, b.y, u) + Math.sin(Math.PI * u) * up);
  /** a flight's size: in at the start, out at the very end (it melts into what it lands on) */
  const flightSize = (u) => (u <= 0 || u >= 1 ? 0 : Math.min(1, u / 0.12) * (u > 0.88 ? (1 - u) / 0.12 : 1));
  /** a cup put at a matrix */
  const setCup = (c, M) => M.decompose(c.group.position, c.group.quaternion, c.group.scale);
  /** a body pose (feet, hips) with the arms, spine and head of another */
  const withArms = (body, arms) => {
    const v = person.blend(body, body, 0);
    for (const s of ['L', 'R']) { v.hand[s].p.copy(arms.hand[s].p); v.hand[s].pole.copy(arms.hand[s].pole); v.hand[s].grip.copy(arms.hand[s].grip); }
    v.waist.copy(arms.waist); v.neck.copy(arms.neck); v.head.copy(arms.head);
    return v;
  };
  // the ✕ in the hand: held up by its middle a little in front of the palm, facing back toward the person (so that it
  // faces out once it is on the cup)
  const X_GRIP = new THREE.Matrix4().makeTranslation(0, 0.12, 0.12);
  const X_HELD = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), 0.3);
  const R_FILM = RT * 1.04;
  // lever a: where the brand person goes to send the two himself (front right of the counter, by the boxes)
  const PA = new V3(4.7, 0, 15.5);
  PA.y = gy(PA.x, PA.z);
  const PA_LEN = Math.hypot(PA.x - PERSON.x, PA.z - PERSON.z), FACE_A = -0.35;
  const PH = person.height;

  function pose(beat, k = 1, lever = 'b') {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const L = lever === 'a' ? 'a' : 'b';
    cur.beat = beat; cur.k = k; cur.lever = L;
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i */
    const W = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : clamp((t - a) / (z - a)));
    for (const key in poseDim) poseDim[key] = 0;

    // ---- the head: drooping and half closed until the question lands; it lifts round to the asker, opens, wakes
    {
      const e = back(sm(W(0, ...T0.turn)), 0.9);
      pivot.rotation.y = mix(HEAD_YAW + AWAY.yaw, HEAD_YAW, e);
      head.rotation.x = mix(NOD0 + AWAY.nod, NOD0, e);
      setPetals(back(sm(W(0, ...T0.open)), 1.3));
      // the wave runs out fast, then slower on to the rim through the caption (it takes a while to reach five
      // thousand): its front passes the field's rim just before the beat ends
      const wv = W(0, ...T0.wave);
      bedU.y = wv <= 0 ? 0 : wv >= 1 ? 2 : Math.pow(wv, 0.72) * 1.06;
      bedU.w = 0.2;      // asleep until asked: faint, so the wave reads as the twins waking
    }
    // ---- the wedges: A (25-34) lit in beat 2 until its twins are home, B (40-44) from the swap; off in beat 5
    {
      const a = W(1, ...T1.sec) * (1 - W(2, ...T2.offA));
      const b = W(2, ...T2.lightB) * (1 - sm(W(4, ...T4.mask)));
      secU.y = sm(a); secU.w = sm(b);
      st.sec = beat >= 2 ? 'B' : 'A';
    }
    head.updateWorldMatrix(true, false);
    g.updateMatrixWorld(true);
    Mh.copy(g.matrixWorld).invert().multiply(head.matrixWorld);

    // ---- the cups land on the counter one by one (beat 1); once 油柑氣泡 is gone the two left close up (beat 4)
    const close = sm(W(3, ...T3.close));
    for (let j = 0; j < 3; j++) st.x[j] = j < 2 ? mix(CUP_X[j], XS[j], close) : CUP_X[2];
    for (let j = 0; j < 3; j++) {
      const c = cups[j];
      const r = W(0, T0.cup[j], T0.cup[j] + T0.cupDur);
      st.cupShown[j] = r > 0;
      c.group.visible = r > 0;
      c.group.position.set(st.x[j], TOP + (1 - eo(r)) * 2.6, BENCH_Z);
      c.group.quaternion.identity();
      c.group.scale.set(Math.max(1e-3, back(r)), Math.max(1e-3, r < 1 ? mix(1.25, 1, eo(r)) * back(r) : 1), Math.max(1e-3, back(r)));
      st.cupOn[j] = true;
      st.scale[j] = 1;
      c.fillU.y = FILL[0];
      c.straw.visible = false;
      // sealed: the film flat on the cup (it flips open for the tasting, beat 6)
      c.film.position.set(0, HB + 0.035, 0);
      c.film.rotation.set(0, 0, 0);
      c.film.scale.setScalar(1);
      c.film.visible = true;
    }
    st.held[0] = st.held[1] = false;
    st.inBox[0] = st.inBox[1] = false;
    // seals lime while the three are the question; then the cup the caption names
    for (let j = 0; j < 3; j++) {
      const r = W(0, T0.cup[j], T0.cup[j] + T0.cupDur);
      const q = beat === 0 && r > 0.4;
      const b1 = j === 0 && beat === 1 && t > T1.lime;
      const b2 = j === 1 && beat === 2 && t > T2.lime;
      want.lid[j] = q || b1 || b2;
      want.body[j] = b1 || b2;
    }

    // ---- the tubes: their stands rise with the first wedge (beat 2) and ride with their cups; the columns: the first
    // group's and its way home, the second group's
    const colH = (j) => {
      if (beat < 1) return 0;
      if (beat === 1) return SHARE1[j] * HMAX * in1(j, t);
      if (beat === 2) return Math.max(SHARE1[j] * HMAX * (1 - out1(j, t)), SHARE2[j] * HMAX * in2(j, t));
      return SHARE2[j] * HMAX;
    };
    // (in beat 3 the first group's column empties from the top while the second's rises: the taller one shows)
    for (let j = 0; j < 3; j++) {
      const c = cups[j], h = colH(j);
      c.stack.visible = h > 0.02;
      c.stack.scale.y = Math.max(1e-3, h);
      st.top[j] = h;
      const legs = sm(W(1, ...T1.legs)), up = sm(W(1, ...T1.frame));
      c.stand.position.set(st.x[j], TOP, BENCH_Z);
      c.stand.quaternion.identity();
      c.stand.visible = legs > 0.01;
      for (const Lg of c.legs) Lg.scale.y = Math.max(1e-3, legs);
      c.frame.group.visible = up > 0.01;
      c.frame.group.scale.set(1, Math.max(1e-3, up), 1);
    }

    // ---- the brand person: raises the question (beat 1), holds the clipboard, strikes 油柑氣泡 and crosses it off
    // (beat 4), watches the real people (beat 6); lever a: sends the two to market himself
    person.group.position.copy(PERSON);
    person.group.rotation.y = FACE;
    if (beat === 0) {
      if (t < T0.lower[0]) person.apply(person.blend(V_STAND, V_RAISE, sm(W(0, ...T0.raise))));
      else person.apply(person.blend(V_RAISE, V_HOLD, sm(W(0, ...T0.lower))));
    } else if (beat === 3) {
      // arms: the ✕ raised, slapped onto the cup (accelerating into the hit), the arm back; the note on the clipboard
      const lk = sm(W(3, ...T3.lift)), sl = W(3, ...T3.slap), rc = sm(W(3, ...T3.recoil)), nu = W(3, ...T3.note);
      let arms = person.blend(V_HOLD, V_XUP, lk);
      if (sl > 0) arms = person.blend(V_XUP, V_SLAP, ei(sl));
      if (rc > 0) arms = person.blend(V_SLAP, V_HOLD, rc);
      if (nu > 0) arms = person.blend(V_HOLD, noteAt(clamp((nu - 0.2) / 0.6)), sm(nu / 0.2) * (1 - sm((nu - 0.8) / 0.2)));
      // body: one step in, turned to the cup; later the step back to his place
      const sk = sm(W(3, ...T3.step)), bk = W(3, ...T3.back);
      let body, yaw;
      if (bk <= 0) {
        tv5.lerpVectors(PERSON, PSTEP, sk);
        const hd = Math.atan2(PSTEP.x - PERSON.x, PSTEP.z - PERSON.z);
        yaw = mixA(mixA(FACE, hd, sm(sk / 0.3)), FACE2, sm((sk - 0.45) / 0.55));
        body = person.blend(person.pose('walk', { dist: PSTEP_LEN * sk, stride: 0.34 * PH }), V_STAND, sm((sk - 0.5) / 0.5));
      } else {
        const e = sm(bk);
        tv5.lerpVectors(PSTEP, PERSON, e);
        const hd = Math.atan2(PERSON.x - PSTEP.x, PERSON.z - PSTEP.z);
        yaw = mixA(mixA(FACE2, hd, sm(bk / 0.25)), FACE, sm((bk - 0.6) / 0.4));
        body = person.blend(person.pose('walk', { dist: PSTEP_LEN * e, stride: 0.34 * PH }), V_STAND, sm((bk - 0.55) / 0.45));
      }
      person.group.position.set(tv5.x, gy(tv5.x, tv5.z), tv5.z);
      person.group.rotation.y = yaw;
      person.apply(withArms(body, arms));
    } else if (beat < LAST) person.apply(V_HOLD);
    else if (L === 'a') {
      // he walks up to the boxes himself, raises the clipboard (ship them) and lowers it
      const wk = sm(W(LAST, ...T5.aWalk)), up = sm(W(LAST, ...T5.aRaise)), down = sm(W(LAST, ...T5.aLower));
      const hd = Math.atan2(PA.x - PERSON.x, PA.z - PERSON.z);
      tv5.lerpVectors(PERSON, PA, wk);
      person.group.position.set(tv5.x, gy(tv5.x, tv5.z), tv5.z);
      person.group.rotation.y = mixA(mixA(FACE, hd, sm(wk / 0.25)), FACE_A, sm((wk - 0.6) / 0.4));
      const arms = person.blend(person.blend(V_HOLD, V_RAISE, up), V_HOLD, down);
      const body = person.blend(person.pose('walk', { dist: PA_LEN * wk, stride: 0.36 * PH }), V_STAND, sm((wk - 0.55) / 0.45));
      person.apply(wk < 1 ? withArms(body, arms) : arms);
    } else person.apply(person.blend(V_HOLD, V_PWATCH, sm(W(LAST, ...T5.pwatch))));

    // ---- the question bubble: out of the clipboard, up over the head, down into the field's centre
    {
      const a = W(0, T0.bub[0], T0.bub[1]), b = W(0, T0.bub[1], T0.bub[2]);
      bubble.group.visible = a > 0 && b < 1;
      const e = sm(b);
      const B2 = onHead(0, -0.4, 0.8, tv3);
      if (e < 0.5) {
        const u = e / 0.5;
        bubble.group.position.lerpVectors(B0, B1, u);
        bubble.group.position.y += Math.sin(Math.PI * u) * 1.4;
      } else bubble.group.position.lerpVectors(B1, B2, (e - 0.5) / 0.5);
      // it grows out of the clipboard, holds its size over the arc and sinks into the field at the end
      bubble.group.scale.setScalar(Math.max(1e-3, (0.3 + 0.7 * eo(a)) * (1 - ei((e - 0.78) / 0.22))));
      bubble.group.rotation.set(0, -0.12, 0);
    }

    // ---- twins in flight
    const S = tv, E = tv2;
    const top = (j, h) => E.set(st.x[j], TOP + FRAME_Y + Math.max(0.3, h) + 0.2, BENCH_Z);
    const fromHead = (p) => S.set(p.hx, p.hy, 0.7).applyMatrix4(Mh);
    // the first group: pours in (beat 2), flies home (beat 3)
    for (let i = 0; i < NS; i++) {
      const p = G1[i];
      let s = 0;
      _v.set(st.x[p.j], TOP, BENCH_Z);
      if (beat === 1) {
        const u = (t - p.t0) / p.fl;
        if (u > 0 && u < 1) {
          const end = top(p.j, SHARE1[p.j] * HMAX * in1(p.j, p.t0 + p.fl - 1e-4));
          end.x += p.jx * 0.5; end.z += p.jz * 0.45;
          const ue = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
          arc(fromHead(p), end, ue, 1.0 + p.sp, _v);
          s = flightSize(u);
        }
      } else if (beat === 2) {
        const u = (t - p.tb) / p.hf;
        if (u > 0 && u < 1) {
          const from = top(p.j, SHARE1[p.j] * HMAX * (1 - out1(p.j, p.tb - 1e-4))).clone();
          from.x += p.jx * 0.5; from.z += p.jz * 0.45;
          const ue = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
          arc(from, fromHead(p), ue, 1.0 + p.sp, _v);
          s = flightSize(u);
        }
      }
      _m.compose(_v, _q.identity(), _s.setScalar(Math.max(1e-4, s)));
      twins.setMatrixAt(i, _m);
    }
    // the second group: pours in (beat 3)
    for (let i = 0; i < NS; i++) {
      const p = G2[i];
      let s = 0;
      _v.set(st.x[p.j], TOP, BENCH_Z);
      if (beat === 2) {
        const u = (t - p.t0) / p.fl;
        if (u > 0 && u < 1) {
          const end = top(p.j, SHARE2[p.j] * HMAX * in2(p.j, p.t0 + p.fl - 1e-4));
          end.x += p.jx * 0.5; end.z += p.jz * 0.45;
          const ue = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
          arc(fromHead(p), end, ue, 1.0 + p.sp, _v);
          s = flightSize(u);
        }
      }
      _m.compose(_v, _q.identity(), _s.setScalar(Math.max(1e-4, s)));
      twins.setMatrixAt(NS + i, _m);
    }
    twins.instanceMatrix.needsUpdate = true;
    twins.visible = beat === 1 || beat === 2;

    // ---- 油柑氣泡 is struck off (beat 4): the ✕ comes down in the brand person's hand onto the cup beside its empty
    // tube; the cup turns red, jolts, skids back and tips off the counter's back edge with its tube, out of sight
    {
      const c = cups[2];
      const hit = beat > 3 || (beat === 3 && t >= T3.hit);
      want.red = hit;
      const jo = W(3, ...T3.jolt), slide = sm(W(3, ...T3.slide)), tip = W(3, ...T3.tip);
      if (beat >= 3) {
        const zz = mix(BENCH_Z, EDGE_Z + 0.25, slide);
        if (tip <= 0) {
          const sq = Math.sin(Math.PI * jo);
          c.group.position.set(CUP_X[2], TOP, zz);
          c.group.scale.set(1 + 0.08 * sq, 1 - 0.1 * sq, 1 + 0.08 * sq);
        } else {
          // over the edge: it turns back about the counter's back edge (its base centre 0.25 inside it) and drops
          // behind the counter, out of sight
          const th = -1.75 * ei(tip), fall = 4.6 * ei((tip - 0.3) / 0.7), oz = zz - EDGE_Z;
          c.group.position.set(CUP_X[2], TOP - oz * Math.sin(th) - fall, EDGE_Z + oz * Math.cos(th));
          c.group.rotation.set(th, 0, 0);
          c.group.scale.set(1, 1, 1);
          c.group.visible = tip < 1;
          st.cupOn[2] = false;
        }
        // its tube goes with it
        c.stand.position.copy(c.group.position);
        c.stand.quaternion.copy(c.group.quaternion);
        c.stand.visible = c.group.visible;
      }
      X.group.visible = beat === 3 && t >= T3.lift[0] && tip < 1;
      if (X.group.visible) {
        person.group.updateMatrixWorld(true);
        const grip = person.hand('R');
        grip.updateWorldMatrix(true, false);
        // (carried, it stays turned to the reader: the hand's place, a fixed turn)
        _ma.multiplyMatrices(gInv, grip.matrixWorld).multiply(X_GRIP);
        _ma.decompose(tv3, _q, _s);
        _ma.compose(tv3, X_HELD, _s.set(1, 1, 1));
        c.group.updateMatrix();
        if (!hit) {
          // in the hand; in the last moment before the hit it turns to lie flat on the cup
          const lay = sm(W(3, T3.slap[0] + 0.06, T3.hit));
          if (lay > 0) lerpM(_ma, _mb.multiplyMatrices(c.group.matrix, X_ON), lay, X.group.matrix);
          else X.group.matrix.copy(_ma);
        } else {
          // on the cup: it lands with a squash
          const sq = Math.sin(Math.PI * W(3, T3.hit, T3.hit + 0.2));
          X.group.matrix.multiplyMatrices(c.group.matrix, X_ON).multiply(_mc.makeScale(1 + 0.22 * sq, 1 + 0.22 * sq, 1 - 0.3 * sq));
        }
        X.group.matrixWorldNeedsUpdate = true;
      }
    }
    // the struck flavour is drawn in full, red with its ✕, while it goes (beat 4), then it is gone
    poseDim['cup-yougan'] = beat >= 4 ? 1 : 0;
    poseDim.struck = beat === 3 ? 1 : 0;
    // while it is struck the other two columns stay half drawn beside it (the comparison)
    poseDim.cols = beat === 3 ? 0.5 : -1;

    // ---- the twins imagine (beat 5): puffs and clouds out of the two tubes, each with its drink, which they drink dry
    // in their heads; the clouds bob; real people's tasting pops them
    {
      const popK = L === 'b' ? W(LAST, ...T5.pop) : 0;
      st.clouds = 0;
      CLOUDS.forEach((C, j) => {
        const pu = W(4, T4.puff[0] + j * 0.06, T4.puff[1] + j * 0.06), cl = W(4, T4.cloud[0] + j * 0.06, T4.cloud[1] + j * 0.06);
        const pop = clamp((popK - j * 0.15) / 0.85);
        const grow = pop > 0 ? (1 + 0.18 * Math.sin(Math.PI * Math.min(1, pop * 2))) * (1 - ei((pop - 0.35) / 0.65)) : 1;
        C.puffs.forEach((pm, i) => { const s = clamp((pu - i * 0.35) / 0.65); pm.visible = s > 0 && pop < 0.6; pm.scale.setScalar(Math.max(1e-3, pm.userData.r * back(s, 2.2) * (1 - pop))); });
        const s = back(cl, 1.7) * grow;
        C.cg.visible = s > 0.01;
        C.cg.scale.setScalar(Math.max(1e-3, s));
        // after it has puffed up it floats a little: imagining
        const tb = beat > 4 ? BEATS[4].dur + (beat === LAST ? t : 0) : t;
        const bob = beat >= 4 ? Math.sin(((tb - T4.cloud[1]) / T4.bob) * TAU + j * 1.3) * 0.14 * clamp((tb - T4.cloud[1]) / 0.4) : 0;
        C.cg.position.y = C.y0 + bob;
        // the imagined drinking, sip by sip: the drink in the cloud goes down to nothing while the real one below
        // stays sealed and full
        let dr = 0;
        for (const [a0, a1] of T4.sips) dr += sm(W(4, a0 + j * 0.18, a1 + j * 0.18)) / T4.sips.length;
        C.fill.y = mix(SIP[0], SIP[1], dr);
        if (s > 0.6) st.clouds++;
      });
    }
    // ---- the tag drops onto the tubes (beat 5) and swings to rest
    {
      const d = W(4, ...T4.tag);
      tag.visible = d > 0;
      tag.position.y = TAG.y + (1 - eo(d)) * 2.4;
      const ts = beat === 4 ? t - T4.tag[1] : beat > 4 ? 9 : -1;
      tagPivot.rotation.z = ts > 0 ? 0.22 * Math.exp(-0.9 * ts) * Math.sin((ts / 1.15) * TAU) : 0;
      st.label = d >= 0.98;
    }

    // ---- the decision (beat 6)
    g.updateMatrixWorld(true);
    want.crate = want.limited = false;
    for (const sp of samples) sp.group.visible = false;
    for (const p of tasters) { p.group.visible = beat === LAST && L === 'b'; atPose(p, p.vStand, p.yaw); }
    if (beat === LAST && L === 'b') {
      // the seals are peeled back off (lifting about their back edge, gone): the drinks are open; a tasting cup rises
      // out of each, which goes down by as much
      for (let j = 0; j < 2; j++) {
        const c = cups[j];
        const fk = W(LAST, ...T5.film[j]), fa = 1.4 * sm(fk);
        c.film.position.set(0, HB + 0.035 + R_FILM * Math.sin(fa), -R_FILM + R_FILM * Math.cos(fa));
        c.film.rotation.set(-fa, 0, 0);
        c.film.scale.setScalar(Math.max(1e-3, 1 - ei((fk - 0.5) / 0.5)));
        c.film.visible = fk < 1;
        c.fillU.y = mix(FILL[0], FILL[1], sm(W(LAST, ...T5.rise[j])));
      }
      // the three walk in from the front (R3 round behind the stand) and turn to the camera
      tasters.forEach((p, i) => {
        const w0 = T5.delay[i], w1 = w0 + p.len / T5.speed;
        const u = clamp((t - w0) / (w1 - w0));
        let v;
        if (t < w1) {
          const d = p.len * (u * (1.2 - 0.2 * u));
          p.group.position.lerpVectors(p.start, p.spot, d / p.len);
          p.group.position.y = gy(p.group.position.x, p.group.position.z);
          p.group.rotation.y = p.heading;
          v = p.pose('walk', { dist: d, stride: 0.4 * TH });
        } else {
          const kk = sm((t - w1) / T5.turn);
          p.group.position.copy(p.spot);
          p.group.rotation.y = mixA(p.heading, p.yaw, kk);
          v = kk >= 1 ? p.vStand : p.blend(p.pose('walk', { dist: p.len, stride: 0.4 * TH }), p.vStand, kk);
        }
        if (i < 2) {
          // R1 and R2: a hand out for the tasting cup, a sip, the cup put away; then both hands for the drink, a turn
          // to its box, the drink set in it, and back
          const j = i;
          const hk = sm(W(LAST, ...T5.reach[j])), uk = sm(W(LAST, ...T5.up[j])), dk = sm(W(LAST, ...T5.down[j]));
          if (hk > 0) v = p.blend(v, p.vHold, hk);
          if (uk > 0) v = p.blend(p.blend(p.vHold, p.vSip, uk), p.vHold, dk);
          const fk = sm(W(LAST, ...T5.face[j])), pk = sm(W(LAST, ...T5.put[j])), bk = sm(W(LAST, ...T5.back[j]));
          if (fk > 0) {
            p.group.rotation.y = mixA(mixA(p.yaw, FACE_BOX[j], fk), p.yaw, bk);
            v = p.blend(p.blend(p.vHold, putPose[j], pk), p.vStand, bk);
          }
        } else {
          // R3 watches the one at the 上市 box, and nods
          const wk = sm(W(LAST, ...T5.watch)), nu = W(LAST, ...T5.nod);
          if (wk > 0) v = p.blend(p.blend(v, V_WATCH3, wk), V_NOD3, Math.sin(Math.PI * nu) * 0.9);
        }
        p.apply(v);
      });
      // the tasting cups: set down in front of each open drink and filled from it (the drink goes down as the small
      // cup fills), a hop to the hand, drunk, put away
      for (let j = 0; j < 2; j++) {
        const sp = samples[j], p = tasters[j];
        const ap = W(LAST, T5.rise[j][0] - 0.12, T5.rise[j][0]), rk = W(LAST, ...T5.rise[j]), hk = W(LAST, ...T5.hop[j]), gk = W(LAST, ...T5.gone[j]);
        if (ap <= 0 || gk >= 1) continue;
        sp.group.visible = true;
        sp.fillU.y = rk < 1 ? mix(SIP[1], SIP[0], sm(rk)) : mix(SIP[0], SIP[1], sm(W(LAST, ...T5.drink[j])));
        if (hk <= 0) {
          sp.group.position.copy(S_AT[j]);
          sp.group.quaternion.identity();
          sp.group.scale.setScalar(Math.max(1e-3, back(ap, 1.6)));
        } else if (hk < 1) {
          tv3.copy(S_AT[j]);
          M_SAMPLE[j].decompose(tv4, _q, _s);
          hop(tv3, tv4, sm(hk), 1.4, sp.group.position);
          sp.group.quaternion.identity().slerp(_q, sm(hk));
          sp.group.scale.setScalar(1);
        } else {
          setCup(sp, inHand(p, H_SAMPLE, 1, _ma));
          if (gk > 0) sp.group.scale.multiplyScalar(Math.max(1e-3, 1 - ei(gk)));
        }
      }
      // the drinks: taken from the counter into both hands, carried, set in their boxes
      for (let j = 0; j < 2; j++) {
        const c = cups[j], p = tasters[j];
        const tk = W(LAST, ...T5.take[j]);
        if (tk <= 0) continue;
        st.cupOn[j] = false;
        if (tk < 1) {
          const e = sm(tk);
          tv3.set(XS[j], TOP, BENCH_Z);
          M_HAND[j].decompose(tv4, _q, _s);
          hop(tv3, tv4, e, 2.0, c.group.position);
          c.group.quaternion.identity().slerp(_q, e);
          st.scale[j] = mix(1, HAND, e);
          c.group.scale.setScalar(st.scale[j]);
          continue;
        }
        st.scale[j] = HAND;
        st.held[j] = true;
        const pe = T5.put[j][1];
        if (t >= pe) {
          const rel = W(LAST, pe, pe + 0.12);
          cupInHand(p, HAND, _ma);
          setCup(c, lerpM(_ma, M_PUT[j], rel, _mb));
          st.inBox[j] = rel >= 1;
          st.held[j] = rel < 1;
          if (j === 0) want.crate = rel >= 1; else want.limited = rel >= 1;
        } else setCup(c, cupInHand(p, HAND, _ma));
      }
    } else if (beat === LAST) {
      // straight to market: the brand person raises the clipboard and the two hop into the 上市 box, sealed and full
      for (let j = 0; j < 2; j++) {
        const c = cups[j];
        const gl = sm(W(LAST, ...T5.aCup[j]));
        if (gl <= 0) continue;
        st.cupOn[j] = false;
        tv3.set(XS[j], TOP, BENCH_Z);
        hop(tv3, SLOT_A[j], gl, 3.4, c.group.position);
        c.group.quaternion.identity();
        st.scale[j] = mix(1, HAND, gl);
        c.group.scale.setScalar(st.scale[j]);
        st.inBox[j] = gl >= 1;
      }
      want.crate = st.inBox[0] && st.inBox[1];
    }
    applyDim();
  }

  // =================================================================== emphasis by subtraction
  // which dim groups each part id keeps at full strength
  const FULL = {
    head: ['flower', 'field', 'bubble'],
    sector: ['field', 'twins'],
    column: ['col-lychee', 'twins'],
    'column-b': ['col-brown', 'twins'],
    'cup-lychee': ['cup-lychee', 'col-lychee', 'stage'],
    'cup-brown': ['cup-brown', 'col-brown', 'stage'],
    'cup-yougan': ['cup-yougan', 'col-yougan', 'stage', 'twins'],
    cloud: ['cloud', 'col-lychee', 'col-brown'],
    label: ['label', 'col-lychee', 'col-brown'],
    crate: ['crate', 'boxes'],
    limited: ['limited', 'boxes'],
    tasters: ['tasters'],
    person: ['person', 'bubble', 'stage'],
  };
  // the held result (the story emphasises these at the end): the twins' head and their tagged answer on the counter,
  // the real people and the two boxes with what they chose; the counter stays drawn as their setting.  Lever a: the
  // 上市 box filled straight from the counter by the brand person, the twins' clouds still up
  const REST = ['head', 'label', 'tasters', 'crate', 'limited', 'cup-lychee', 'cup-brown'];
  const REST_A = ['head', 'label', 'cloud', 'crate', 'cup-lychee', 'cup-brown', 'person'];
  const SETTING = ['stage'];
  function applyDim() {
    const ids2 = cur.emph;
    const atRest = !!ids2 && [REST, REST_A].some((R2) => ids2.length === R2.length && R2.every((id) => ids2.includes(id)));
    const full = new Set(atRest ? SETTING : []);
    if (ids2) for (const id of ids2) for (const l of FULL[id] || []) full.add(l);
    const half = ids2 && (ids2.includes('sector') || ids2.includes('column'));
    // accents: lime only in focus; red marks the struck flavour while its beat lasts
    const on = !!cur.emph, lime = ACCENT.lime;
    for (let j = 0; j < 3; j++) {
      cups[j].film.material.userData.u.uAccent.value = on && want.lid[j] ? lime : 0;
      cups[j].body.material.userData.u.uAccent.value = on && j === 2 && want.red ? ACCENT.red : on && want.body[j] ? lime : 0;
    }
    crateMat.userData.u.uAccent.value = on && want.crate ? lime : 0;
    limMat.userData.u.uAccent.value = on && want.limited ? lime : 0;
    // the ✕ is red in focus; on the map (everything at full) it rests in plain type, like every other mark there
    X.material.userData.u.uAccent.value = on ? ACCENT.red : 0;
    for (const [name, objs] of Object.entries(layers)) {
      let a = !ids2 ? 0 : full.has(name) ? 0 : name === 'flower' && half ? 0.45 : 1;
      const pd = name === 'cup-yougan' || name === 'col-yougan' ? poseDim['cup-yougan'] || 0 : 0;
      if (ids2) a = Math.max(a, pd);
      if (ids2 && poseDim.struck && (name === 'cup-yougan' || name === 'col-yougan')) a = 0;
      if ((name === 'col-lychee' || name === 'col-brown') && ids2 && poseDim.cols >= 0) a = Math.min(a, poseDim.cols);
      for (const o of objs) {
        dim(o, a);
        o.traverse((m) => { if (m.isMesh && m.userData.cs0 !== undefined) m.castShadow = a < 0.5 ? m.userData.cs0 : false; });
      }
    }
  }
  function emphasize(list) {
    cur.emph = list && list.length ? [...list] : null;
    applyDim();
  }

  // =================================================================== anchors for the shots, labels, decals, parts
  g.updateMatrixWorld(true);
  const W3 = (x, y, z) => g.localToWorld(new V3(x, y, z));
  /** a point on the disk at the head's rest pose (head-local x, y) */
  const disk = (x, y) => {
    const save = [head.rotation.x, pivot.rotation.y];
    head.rotation.x = NOD0; pivot.rotation.y = HEAD_YAW;
    const p = onHeadW(x, y, 0);
    head.rotation.x = save[0]; pivot.rotation.y = save[1];
    head.updateWorldMatrix(true, false);
    return p;
  };
  const PSIDE = [W3(PERSON.x + 1.1, PERSON.y + PH * 0.75, PERSON.z), W3(PERSON.x + 0.6, PERSON.y, PERSON.z)];
  const PERSON_PTS = [W3(PERSON.x, PERSON.y + PH, PERSON.z), W3(PERSON.x, PERSON.y, PERSON.z), ...PSIDE];
  const FRONT_EDGE = BENCH_Z + BENCH_D / 2;
  const COUNTER = [W3(-BENCH_W / 2, TOP, BENCH_Z), W3(BENCH_W / 2, TOP, BENCH_Z), W3(0, PLINTH_TOP, FRONT_EDGE + 0.3)];
  const TUBES = [W3(CUP_X[0] - 1.3, FRAME_TOP, BENCH_Z), W3(CUP_X[2] + 1.3, FRAME_TOP, BENCH_Z)];
  const TUBES2 = [W3(XS[0] - 1.3, FRAME_TOP, BENCH_Z), W3(XS[1] + 1.3, FRAME_TOP, BENCH_Z)];
  // the ask and the pours: the head's lower two thirds, the counter with its cups and their tubes, the brand person
  const A_stage = [...COUNTER, ...TUBES, ...PERSON_PTS];
  const A_pts = [disk(0, 0.5 * RH), disk(-RH, 0), disk(RH, 0), ...A_stage];
  // a short landscape screen (about 932 x 430) crops the head's upper part, so the stage keeps its size
  const A_low = [disk(0, -0.2 * RH), disk(-0.85 * RH, -0.35 * RH), disk(0.85 * RH, -0.35 * RH), ...A_stage];
  const flat = () => typeof innerHeight === 'number' && innerHeight < 560 && innerWidth > innerHeight;
  const shotA = () => (flat() ? A_low : A_pts);
  // on a desk: the head from a little above its centre over the stage; the pours from its lower half
  const A_desk = [disk(0, 0.3 * RH), disk(-0.95 * RH, -0.05 * RH), disk(0.95 * RH, -0.05 * RH), ...A_stage];
  const A2_desk = [disk(0, 0.12 * RH), disk(-0.92 * RH, -0.25 * RH), disk(0.92 * RH, -0.25 * RH), ...A_stage];
  // the strike: the counter, the cups and their tubes' tops, the brand person's step, the two left closing up
  const B_pts = [...CUP_X.map((x) => W3(x - 1.3, TOP + CUP_H, BENCH_Z)), ...TUBES, W3(CUP_X[0] - 1.5, PLINTH_TOP, FRONT_EDGE), ...PERSON_PTS,
    W3(PSTEP.x, PSTEP.y + PH, PSTEP.z), W3(PSTEP.x, PSTEP.y, PSTEP.z + 0.4), disk(0, -0.45 * RH)];
  // (a desk's frame stays tight on the stage from the strike on: the flower's head and petals fill what is behind it)
  const B_desk = [...B_pts.slice(0, -1), disk(-0.5 * RH, -0.78 * RH), disk(0.5 * RH, -0.78 * RH), W3(-BENCH_W / 2 - 0.5, PLINTH_TOP, BENCH_Z), W3(BENCH_W / 2 + 0.5, PLINTH_TOP, BENCH_Z)];
  // the twins imagine: the two tubes with their clouds and the tag, the sealed cups under them, the field's rim
  const CLOUD_PTS = CLOUDS.flatMap((C) => [W3(C.cg.position.x - CLOUD.w / 2 - 0.15, C.y0 + CLOUD.h / 2 + 0.2, C.cg.position.z), W3(C.cg.position.x + CLOUD.w / 2 + 0.15, C.y0 + CLOUD.h / 2 + 0.2, C.cg.position.z)]);
  const C_pts = [...CLOUD_PTS, W3(XS[0] - 1.6, TOP, BENCH_Z + 1.2), W3(XS[1] + 1.6, TOP, BENCH_Z + 1.2), W3(XS[0] - 1.4, PLINTH_TOP, FRONT_EDGE), disk(-0.3 * RH, -0.55 * RH), disk(0.25 * RH, -0.55 * RH)];
  const C_desk = [...C_pts.slice(0, -2), disk(-0.4 * RH, -0.78 * RH), disk(0.4 * RH, -0.78 * RH), ...PERSON_PTS];
  // the decision: the real people and the two boxes in front, the twins' tagged tubes behind them, the field above
  const tasterPts = tasters.flatMap((p) => [W3(p.spot.x, p.spot.y + TH + 0.3, p.spot.z), W3(p.spot.x, p.spot.y, p.spot.z + 0.4)]);
  const BOX_PTS = [W3(DEC.x - DEC_W / 2, DEC.y, DEC.z + DEC_D / 2), W3(DEC.x + DEC_W / 2, DEC.y, DEC.z + DEC_D / 2), W3(DEC.x + BOX[0].x, BOX_FLOOR + CUP_H * HAND + 0.3, DEC.z)];
  const D_core = [...tasterPts, ...BOX_PTS, ...TUBES2];
  // (on a phone the field shows only its lowest rows, with its name, so the people and the boxes stay big)
  const D_phone = [...D_core, disk(-0.35 * RH, -0.9 * RH), disk(0.35 * RH, -0.9 * RH)];
  const D_desk = [...D_core, disk(-0.4 * RH, -0.86 * RH), disk(0.4 * RH, -0.86 * RH), ...PERSON_PTS];
  // lever a: the 上市 box with the two in it, the tubes with their clouds, the brand person who sent them
  const PA_PTS = [W3(PA.x, PA.y + PH + 0.2, PA.z), W3(PA.x + 0.7, PA.y, PA.z + 0.3)];
  const D_a = [...BOX_PTS, ...CLOUD_PTS, ...PA_PTS, disk(-0.3 * RH, -0.9 * RH), disk(0.2 * RH, -0.9 * RH)];
  const D_a_desk = [...D_a, disk(-0.4 * RH, -0.86 * RH), disk(0.4 * RH, -0.86 * RH)];
  // the twins' hall stands behind the flower on the left and 從想買到下單 inland behind it on the right.  A phone's
  // narrow frame looks from a little round to the left (the hall drops out at its left edge, the inland town stays
  // out at the right); a desk's (and a sideways phone's) wide frame from a little round to the right, so the town
  // stays out of it, and low (what is left of the hall sits in a thin band on the horizon, behind the counter)
  const DESK_AZ = STAGE_AZ - 0.1;
  const phAz = () => (flat() ? DESK_AZ : STAGE_AZ + 0.1);
  const B_low = B_pts.slice(0, -1);
  const C_low = C_pts.slice(0, -2);
  // (sideways, one frame for both choices: the people, the boxes, the tagged tubes with the clouds' place above them
  // and the field's rim)
  const D_flat = [...D_core, ...CLOUD_PTS, ...PERSON_PTS, ...PA_PTS, disk(-0.2 * RH, -0.93 * RH), disk(0.3 * RH, -0.92 * RH)];
  const shots = {
    // (a short landscape screen keeps the stage's size: the head's field only at the top edge, see flat())
    phone: [
      { get az() { return phAz(); }, el: 0.16, anchors: shotA },
      { get az() { return phAz(); }, el: 0.16, anchors: shotA },
      { get az() { return phAz(); }, el: 0.2, anchors: () => (flat() ? B_low : B_pts) },
      { get az() { return phAz(); }, el: 0.2, anchors: () => (flat() ? C_low : C_pts) },
      { get az() { return phAz(); }, el: 0.24, anchors: () => (flat() ? D_flat : cur.lever === 'a' ? D_a : D_phone) },
    ],
    desk: [
      { az: DESK_AZ, el: 0.14, anchors: () => A_desk },
      { az: DESK_AZ, el: 0.16, anchors: () => A2_desk },
      { az: DESK_AZ, el: 0.18, anchors: () => B_desk },
      { az: DESK_AZ, el: 0.18, anchors: () => C_desk },
      { az: DESK_AZ, el: 0.2, anchors: () => (cur.lever === 'a' ? D_a_desk : D_desk) },
    ],
  };

  const cupMid = (j) => () => { const c = cups[j]; c.group.updateWorldMatrix(true, false); return c.group.localToWorld(new V3(0, 0.45 * HB, 0)); };
  /** the top right corner of cup j's column (where its label's leader ends) */
  const colTop = (j) => () => W3(st.x[j] + 0.98, TOP + FRAME_Y + Math.max(0.2, st.top[j]), BENCH_Z + 0.62);
  const secMid = () => { const [x, y] = wedgeXY(st.sec === 'A' ? SEC_A : SEC_B, 0, 0.6); return onHeadW(x, y, 0.3); };
  const boxFront = (b, i) => () => { b.updateWorldMatrix(true, false); return b.localToWorld(new V3(0, BOX[i].h / 2, BOX[i].d / 2 + 0.03)); };
  const tagFace = () => { board.updateWorldMatrix(true, false); return board.localToWorld(new V3(0, -TAG.h / 2, 0.05)); };
  // the label of the real people: its leader on the head of the one in the middle
  const tastersTop = () => { R3.group.updateWorldMatrix(true, true); return R3.top(); };
  const labelAt = {
    // low on the field, so it is on screen in the end frame too
    head: () => onHeadW(-0.25 * RH, -0.88 * RH, 0.3),
    sector: secMid,
    column: colTop(0),
    'column-b': colTop(1),
    tasters: () => (cur.lever === 'a' && cur.beat === LAST ? null : tastersTop()),
  };
  // a flavour's name on its sleeve, wherever the cup is (not while it is tipping off the counter)
  const decalAt = {
    'cup-lychee': () => (st.cupShown[0] ? sleeveFace(0) : null),
    'cup-brown': () => (st.cupShown[1] ? sleeveFace(1) : null),
    'cup-yougan': () => (st.cupShown[2] && st.cupOn[2] ? sleeveFace(2) : null),
    label: () => (st.label ? tagFace() : null),
    crate: boxFront(crate, 0),
    limited: boxFront(limBox, 1),
  };
  // the surfaces the words sit on (world units): they shrink to fit and hide below 12 px rather than spill.  A sleeve
  // shrinks with its cup
  const live = (f) => { const a = [0, 0]; Object.defineProperty(a, 0, { get: () => f()[0] }); Object.defineProperty(a, 1, { get: () => f()[1] }); return a; };
  const decalSize = {
    'cup-lychee': live(() => [SLEEVE_SIZE[0] * st.scale[0], SLEEVE_SIZE[1] * st.scale[0]]),
    'cup-brown': live(() => [SLEEVE_SIZE[0] * st.scale[1], SLEEVE_SIZE[1] * st.scale[1]]),
    'cup-yougan': SLEEVE_SIZE,
    label: [TAG.w - 0.2, TAG.h - 0.16],
    crate: [BOX[0].w - 0.25, BOX[0].h - 0.12],
    limited: [BOX[1].w - 0.25, BOX[1].h - 0.12],
  };
  const parts = {
    // (its ring low on the field, where every frame of the story shows it)
    head: { hit: headHit, anchor: () => onHeadW(0.35 * RH, -0.86 * RH, 0.4), beat: 0 },
    // parts that are not tapped (no proxy) still say where they are, for the verifier's size checks
    sector: { hit: null, anchor: secMid, beat: 1, box: () => new THREE.Box3().setFromPoints([-0.4, -0.2, 0, 0.2, 0.4].flatMap((a) => [0.22, 0.6, 1].map((r) => { const [x, y] = wedgeXY(st.sec === 'A' ? SEC_A : SEC_B, a, r); return onHeadW(x, y, 0.3); }))) },
    column: { hit: null, anchor: colTop(0), beat: 1, object: cups[0].frame.group },
    'column-b': { hit: null, anchor: colTop(1), beat: 2, object: cups[1].frame.group },
    'cup-lychee': { hit: cups[0].hit, anchor: cupMid(0), beat: 1 },
    'cup-brown': { hit: cups[1].hit, anchor: cupMid(1), beat: 2 },
    'cup-yougan': { hit: cups[2].hit, anchor: cupMid(2), beat: 3 },
    cloud: { hit: cloudHit, anchor: () => W3(CLOUDS[0].cg.position.x + 1.6, CLOUDS[0].y0 + 0.9, CLOUDS[0].cg.position.z + 0.2), beat: 4, object: clouds },
    // its hotspot ring at the tag's right end, clear of its word
    label: { hit: tagHit, anchor: () => { board.updateWorldMatrix(true, false); return board.localToWorld(new V3(TAG.w / 2 - 0.3, -TAG.h / 2, 0.05)); }, beat: 4, object: tag },
    crate: { hit: crateHit, anchor: () => { crate.updateWorldMatrix(true, false); return crate.localToWorld(new V3(BOX[0].w / 2 - 0.2, BOX[0].h, 0)); }, beat: 5, object: crate },
    limited: { hit: limHit, anchor: () => { limBox.updateWorldMatrix(true, false); return limBox.localToWorld(new V3(BOX[1].w / 2 - 0.2, BOX[1].h, 0)); }, beat: 5, object: limBox },
    tasters: { hit: tastersHit, anchor: () => { R1.group.updateWorldMatrix(true, false); return R1.chest(); }, beat: 5 },
    person: { hit: personHit, anchor: () => person.chest(), beat: 0 },
  };

  // =================================================================== the face turns to whoever looks (ambient)
  // lk = the face's shown bearing and nod (stage frame).  On the map (or while another district is in focus) it
  // follows the viewer's eye; here and in 數位分身怎麼來 it eases back to where pose() put the head, and then the look is
  // exactly nothing.  Material only: uLook / uNeck, never a transform.
  const lk = { yaw: null, nod: 0, last: null };
  const _lh = new THREE.Matrix4(), _la = new THREE.Matrix4(), _lb = new THREE.Matrix4(), _lc = new V3(), _ln = new THREE.Matrix3();
  function look(dt, ctx) {
    const now = CLOCK.value;
    const rdt = lk.last === null ? 0 : Math.min(0.1, Math.max(0, now - lk.last));
    lk.last = now;
    const psi = pivot.rotation.y, nu = head.rotation.x;
    const home = !ctx || !ctx.camera || ctx.focus === 'core' || ctx.focus === 'twins';
    let ty = psi, tn = nu;
    if (!home) {
      _lc.copy(ctx.camera.position);
      g.worldToLocal(_lc).sub(pivot.position);
      ty = Math.atan2(_lc.x, _lc.z);
      tn = -clamp(Math.atan2(_lc.y, Math.hypot(_lc.x, _lc.z)) * LOOK_F.up, -0.15, LOOK_F.max);
    }
    // the first frame, reduced motion and paused motion: no turning, the face is simply where it should be
    if (lk.yaw === null || REDUCED || !(dt > 0)) { lk.yaw = ty; lk.nod = tn; } else {
      const k = Math.exp(-(home ? LOOK_F.home : LOOK_F.rate) * rdt);
      lk.yaw = ty + wrapA(lk.yaw - ty) * k;
      lk.nod = tn + (lk.nod - tn) * k;
      if (home && Math.abs(wrapA(lk.yaw - ty)) < 1e-3 && Math.abs(lk.nod - tn) < 1e-3) { lk.yaw = ty; lk.nod = tn; }
    }
    const d = wrapA(lk.yaw - psi), tt = nu - lk.nod;
    neckU.value.set(d, tt, 0, 0);
    if (d === 0 && tt === 0) { for (const L of looks) { L.u.value.identity(); L.n.value.identity(); } return; }
    // in the head's frame: undo the posed nod, turn by d, nod to the shown nod
    _lh.makeRotationX(-nu).multiply(_la.makeRotationY(d)).multiply(_lb.makeRotationX(nu - tt));
    for (const L of looks) {
      L.u.value.copy(L.mi).multiply(_lh).multiply(L.mo);
      L.n.value.setFromMatrix3(_ln.getNormalMatrix(L.u.value));
    }
  }
  // ?look=a: the sunflower printed as one — yellow petals, an orange-brown rim round the field, a green stem and
  // leaves.  Set once, after the map has laid its own fills (scenery.js), so these few keep their own inks
  let painted = false;
  function paintOnce() {
    if (painted) return;
    painted = true;
    if (LOOK !== 'a') return;
    for (const [m, slot] of PAINTS) if (m.userData.u.uPaint) m.userData.u.uPaint.value = slot;
  }
  // the map's crowd on the face: switched on under 9 of the screen's cells across, at this screen's pixel ratio
  const mapCrowd = () => { const r = typeof devicePixelRatio === 'number' ? Math.min(2, Math.max(1, devicePixelRatio)) : 1; mapU.x = 9 * 9 * r; };

  const rest = () => pose(LAST, 1, 'b');
  rest();
  const pin = disk(0, RH * 1.02);
  // the seed bed at the head's rest pose, for d-twins (whose twins walk into it): its centre, its outward normal, its
  // in-plane axes (x toward the asker's side, y up the face) and radius, all in world space; point(x, y) for x, y in
  // -1 ... 1 of the radius
  const seedBed = (() => {
    const c = disk(0, 0), ex = disk(RH, 0).sub(c).normalize(), ey = disk(0, RH).sub(c).normalize();
    const n = new V3().crossVectors(ex, ey).normalize();
    return { center: c, normal: n, ex, ey, radius: RH, point: (x, y) => c.clone().addScaledVector(ex, x * RH).addScaledVector(ey, y * RH) };
  })();

  return {
    id: 'core',
    group: g,
    // on the twins' island in the AI's water (world.js places it: buildCore({ origin }))
    zone: 'ai',
    // the map pill, over the flower (the map's overlay keeps pills off the head's disc: headDisc)
    anchor: W3(0, baseY + 28.5, 0),
    // optional, for the UI: where accents should be at full strength while the district is in focus
    focus: { pos: W3(-1, baseY + 5.5, 10.5), r: 32 },
    pin,
    seedBed,
    // optional, for the map overlay: the head's round face (centre and radius with the petals, world units); on the
    // map it faces the viewer, so its screen footprint is about this circle from every side
    headDisc: { center: seedBed.center.clone(), r: RH + 6.2 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    // the words on the sleeves, the tag and the crate are measured in world units of 1 (their surfaces fit them)
    decalUnit: { 'cup-lychee': 1, 'cup-brown': 1, 'cup-yougan': 1, label: 1.1, crate: 1, limited: 1 },
    decalSize,
    lever: { fromBeat: LAST, options: ['a', 'b'], def: 'b' },
    // who acts: the brand person asks (and crosses 油柑氣泡 off); then the twins imagine (their clouds); in the last
    // beat the real people decide (lever a: nobody tastes, the two go straight into the crate)
    get mainActor() { return cur.beat === LAST ? (cur.lever === 'a' ? 'person' : 'tasters') : cur.beat === LAST - 1 ? 'cloud' : 'person'; },
    get restParts() { return cur.lever === 'a' ? REST_A : REST; },
    pose,
    rest,
    // the only ambient motion: the face turning to whoever looks (material: uLook, uNeck)
    ambient(t, dt, ctx) { paintOnce(); mapCrowd(); look(dt, ctx); },
    emphasize,
    update(t, dt, ctx) { this.ambient(t, dt, ctx); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { person: person.group, tasters: tasters.map((p) => p.group), cups: cups.map((c) => c.group), samples: samples.map((c) => c.group), bubble: bubble.group, X: X.group, boxes: decSet, tag, clouds, head, pivot },
  };
}
