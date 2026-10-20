// 數位分身 · People Model (articles 12, 2) — told in six beats.
// The Model chapter's sunflower stands at the centre of the map; its seed head is a field of 人 (the digital twins,
// style band 0.8).  In front of it and below it (portrait staging) a brand person on a dais asks the twins about three
// new drinks: the cups rise onto a bench, the question floats up to the head, the twins wake, the target group streams
// into the cups (荔枝烏龍 fills a 0–100 frame to 58%), the weakest flavour is stamped out and knocked over, a typed
// result card says what kind of answer this is (情境模擬), and the two remaining cups go down onto a round table where
// five real people take them up.  Lever a (直接上市) sends the cups over the table to a 上市 sign instead.
//
// Everything the reader sees is a pure function of (beat, k, lever) — pose() — so autoplay, stepping, ?still and the
// text map land on the same frame.  No copy lives here: captions, labels, decals and taps come from world.json by part id.
import * as THREE from '../vendor/three.module.min.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { rng, tube, TAU, clamp, _m, _q, _v, _s } from './kit.js';
import { heightAt } from './terrain.js';
import { makePerson } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3;

// ---- staging: the stage looks out along STAGE_AZ (the camera's azimuth).  The sun is at world (-70, 120, 50), so
// from this side the fronts of the people, cups and card are lit from the upper left instead of seen from their
// shadow side (at the old 0.9 they were hatched all over).  The head itself faces a little to the right of the camera,
// toward the brand person, and keeps the map (az 0.62) in a three-quarter view.
const STAGE_AZ = 1.45;
const YAW = Math.PI / 2 - STAGE_AZ;          // group rotation: local +z = toward the camera, local +x = camera right
const HEAD_YAW = 0.3;                        // the head faces the asker's side
const NOD0 = 0.02;                           // + tilts the face down toward the stage

// ---- the six beats (seconds of motion; the caption lands at keyAt and holds 0.8 s + 0.25 s per 字, see story.js)
const BEATS = [
  { dur: 1.8, keyAt: 0.9, shot: 0, parts: ['cup-lychee', 'cup-brown', 'cup-yougan', 'person', 'head'] },
  { dur: 1.4, keyAt: 0.8, shot: 0, parts: ['head'] },
  { dur: 1.8, keyAt: 1.6, shot: 0, parts: ['sector', 'column', 'cup-lychee', 'cup-brown', 'cup-yougan'] },
  { dur: 2.4, keyAt: 1.0, shot: 1, parts: ['cup-yougan'] },
  { dur: 1.4, keyAt: 0.8, shot: 1, parts: ['card', 'row-scen'] },
  { dur: 2.2, keyAt: 1.4, shot: 2, parts: ['table', 'cup-lychee', 'cup-brown', 'person'] },
];
const LAST = BEATS.length - 1;

const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const back = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const mix = (a, b, t) => a + (b - a) * t;

// the 人 field on the seed bed.  uBed = (disk radius, wave front 0 … 1.2 (≥ 2: done), sector mask 0 … 1, base density).
// Density (= 1 − shade) decides the glyph's weight; outside the sector the mask pushes the field toward contour (dim).
const BED_HOOKS = {
  key: 'core-bed',
  fOut: /* glsl */`{
  vec2 p = vLPos.xy / uBed.x;
  float r = length(p);
  float behind = uBed.y >= 1.9 ? 1.0 : 1.0 - smoothstep(uBed.y - 0.1, uBed.y, r);
  float crest = uBed.y >= 1.9 ? 0.0 : exp(-pow((r - uBed.y) / 0.08, 2.0)) * step(0.001, uBed.y);
  float D = mix(uBed.w, 0.84, behind);
  D = max(D, 0.98 * crest);
  D += (dHash(floor(vLPos.xy * 1.3) + 3.1) - 0.5) * 0.1;
  // the target group: the 5–7 o'clock wedge, facing the bench
  float a = atan(p.x, -p.y);
  float inS = (1.0 - smoothstep(0.46, 0.56, abs(a))) * smoothstep(0.14, 0.24, r);
  D = mix(D, max(D, 0.9), uBed.z * inS);
  sh = clamp(1.0 - D, 0.0, 1.0);
  dm = max(dm, uBed.z * (1.0 - inS) * 0.9);
}`,
};
// twins in flight and in their stacks: one density for a stack (uDen), one per instance for the particles
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

export function buildCore() {
  const g = new THREE.Group();
  g.name = 'core';
  g.rotation.y = YAW;
  g.updateMatrixWorld(true);
  const cY = Math.cos(YAW), sY = Math.sin(YAW);
  /** ground height under a point given in the stage frame */
  const gy = (x, z) => heightAt(x * cY + z * sY, -x * sY + z * cY);
  const R = rng(12);
  const layers = {};             // dim groups: name → Object3D[]
  const layer = (name, ...objs) => { (layers[name] ||= []).push(...objs); return objs[0]; };

  // =================================================================== the sunflower (book art; scenery)
  const baseY = gy(0, 0);
  const headY = baseY + 21;                     // a shorter stem than the map emblem had: head and stage share a phone frame
  const stemPts = [
    new V3(0, baseY - 1, 0), new V3(0.35, baseY + 4, -0.2),
    new V3(-0.25, baseY + 8, 0.0), new V3(0, headY - 10, 0),
  ];
  const stem = new THREE.Mesh(tube(stemPts, 0.62, 60, 10), ink({ shade: 0.95, bias: 0.06 }));
  stem.castShadow = stem.receiveShadow = true;
  g.add(layer('flower', stem));
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(2.2, 1.6, 4.6, 2.6, 7.4, 0.4);
  leafShape.bezierCurveTo(4.8, -2.4, 2.0, -1.8, 0, 0);
  // both leaves reach sideways and back, so neither covers the bench, the cups or the frame
  // low on the stem, spread left and right: behind the bench in the district's shots, the plant's base on the map
  for (const [y, rot, s] of [[baseY + 1.2, -0.35, 1.0], [baseY + 3.0, Math.PI + 0.45, 0.85]]) {
    const lg = new THREE.ShapeGeometry(leafShape, 24);
    const p = lg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -0.06 * x * x + Math.sin(x * 0.8) * 0.3); }
    lg.computeVertexNormals();
    const leaf = new THREE.Mesh(lg, ink({ side: THREE.DoubleSide, shade: 0.92, bias: 0.06 }));
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
  const neck = new THREE.Mesh(tube([
    new V3(0, -10.0, 0), new V3(0, -7.4, -1.4), new V3(0, -3.6, -2.7), new V3(0, -0.4, -3.0),
  ], 0.6, 24, 10), ink({ shade: 0.9, bias: 0.06 }));
  neck.castShadow = true;
  pivot.add(layer('flower', neck));
  const head = new THREE.Group();
  head.rotation.x = NOD0;
  pivot.add(head);
  const RH = 8.6;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(RH * 1.04, 48, 16, 0, TAU, 0, Math.PI * 0.32), ink({ shade: 0.85, bias: 0.05, side: THREE.DoubleSide }));
  bowl.rotation.x = -Math.PI / 2;
  bowl.scale.set(1, 1, 0.42);
  bowl.position.z = -0.2;
  bowl.castShadow = true;
  head.add(layer('flower', bowl));
  // the seed bed is the field of 人: every cell a digital twin
  const bedU = new THREE.Vector4(RH, 0, 0, 0.2);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(RH * 1.0, 96), ink({ style: 0.8, hooks: BED_HOOKS, uniforms: { uBed: { value: bedU } } }));
  bed.position.z = 0.15;
  bed.receiveShadow = true;
  head.add(layer('field', bed));
  // petals: Fibonacci counts, the only pink in the world
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
  for (const [count, rad, tilt, scale] of [[34, RH + 0.4, 0.42, 1.05], [21, RH - 0.4, 0.62, 0.9]]) {
    const pm = new THREE.InstancedMesh(pg, ink({ side: THREE.DoubleSide, accent: 'pink', shade: 1.0, bias: 0.26 }), count);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + (rad < RH ? 0.09 : 0) + (R() - 0.5) * 0.05;
      const e = new THREE.Euler(tilt + (R() - 0.5) * 0.25, 0, a - Math.PI / 2 + (R() - 0.5) * 0.1, 'ZXY');
      _q.setFromEuler(e);
      _v.set(Math.cos(a) * rad, Math.sin(a) * rad, -0.3 - R() * 0.4);
      const s = scale * (0.85 + R() * 0.3);
      _m.compose(_v, _q, _s.set(s, s * (0.9 + R() * 0.25), s));
      pm.setMatrixAt(i, _m);
    }
    pm.castShadow = true;
    head.add(layer('flower', pm));
  }
  /** a point on the head (head-local) in the stage frame */
  const onHead = (x, y, z, out = new V3()) => { head.updateWorldMatrix(true, false); return g.worldToLocal(head.localToWorld(out.set(x, y, z))); };
  const onHeadW = (x, y, z) => { head.updateWorldMatrix(true, false); return head.localToWorld(new V3(x, y, z)); };

  // =================================================================== the stage: dais, bench, three cups
  // the stage stands on the flat ground in front of the dome, 13 u toward the camera: perspective makes the people
  // and cups large next to the head (a portrait phone frame is limited by its width)
  const DAIS_TOP = 6.9, DAIS_Z = 13, DAIS_X = -1.2, DAIS_W = 20.5, DAIS_D = 4.4;
  let low = Infinity;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 2; j++) low = Math.min(low, gy(DAIS_X - DAIS_W / 2 + (i / 8) * DAIS_W, DAIS_Z - DAIS_D / 2 + (j / 2) * DAIS_D));
  const dais = P.makeDais({ w: DAIS_W, d: DAIS_D, h: DAIS_TOP - (low - 0.4) });
  dais.group.position.set(DAIS_X, low - 0.4, DAIS_Z);
  g.add(layer('stage', dais.group));
  const BENCH_Z = 12.5, BENCH_W = 12.6, BENCH_H = 2.1;
  const bench = P.makeBench({ w: BENCH_W, d: 1.5, h: BENCH_H });
  bench.group.position.set(0, DAIS_TOP, BENCH_Z);
  g.add(layer('stage', bench.group));
  const TOP = DAIS_TOP + BENCH_H;
  // cups: on the bench, and (SMALL) on the tasting table.  The tasters are nearly the brand person's size: the table
  // is the farthest thing from the camera, and the tasting is the district's last act
  const CUP_H = 4, TASTER = 4.3, SMALL = 1.9;
  const CUP_X = [-4.2, 0, 4.2];                // far enough apart for their names (at every phone size)
  const STACK = [0.58 * 6, 2.0, 0.85];           // only 58% is the book's; the other heights only rank (see the note)
  // where 油柑氣泡 ends up (beat 4): slid to x0, then over on its side, base at x (bench end 6.3), lid toward the
  // middle, clear of 黑糖桂圓; rb = the cup's base radius (it pivots on its rim), rot = 90° less the body's taper
  const FALLEN = { x0: 5.3, x: 6.1, rb: 0.2 * CUP_H, rot: Math.PI / 2 - Math.atan(0.09 / 0.84) };
  const ids = ['cup-lychee', 'cup-brown', 'cup-yougan'];
  const cups = CUP_X.map((x, j) => {
    const c = P.makeCup({ h: CUP_H });
    c.group.position.set(x, TOP, BENCH_Z);
    g.add(c.group);
    c.hit = P.makeHitProxy(c.group, 0.3);
    layer(ids[j], c.group);
    // the twins who chose this cup, stacked on its lid
    const st = new THREE.Mesh(new THREE.BoxGeometry(j === 0 ? 1.95 : 1.8, 1, 1.25).translate(0, 0.5, 0),
      ink({ style: 0.8, hooks: TWIN_HOOKS, uniforms: { uDen: { value: 0.86 } } }));
    st.position.y = 0.87 * CUP_H;
    st.scale.y = 1e-3;
    st.visible = false;
    st.receiveShadow = true;
    c.group.add(st);
    c.stack = st;
    layer(j === 0 ? 'column' : ids[j], st);
    return c;
  });
  // the 0–100 frame over 荔枝烏龍 (teal hairline, ticks, no digits)
  const frame = P.makeFrame({ h: 6, w: 2.4 });
  frame.group.position.set(0, 0.87 * CUP_H, 0.05);
  cups[0].group.add(frame.group);
  layer('column', frame.group);
  // the typed ✕ that drops on 油柑氣泡
  const X = P.makeX({ size: 2.3 });
  X.group.position.set(0, 0.74 * CUP_H, 0.29 * CUP_H + 0.35);
  X.group.visible = false;
  cups[2].group.add(X.group);
  layer('cup-yougan', X.group);

  // =================================================================== the brand person and the question
  const person = makePerson({ height: 4.5 });
  const PERSON = new V3(7.35, DAIS_TOP, 13.7);
  const FACE = -0.62;                            // three-quarter, toward the bench and the sun; turns to the table in beat 6
  person.group.position.copy(PERSON);
  person.group.rotation.y = FACE;
  person.material.userData.u.uShadeBias.value = 0.34;
  const clip = P.makeClipboard({ w: 1.25, h: 1.6 });
  person.hold('L', clip);
  g.add(person.group);
  const personHit = P.makeHitProxy(person.group, 0.35);
  layer('person', person.group);
  const RAISE = { name: 'raise', opts: { side: 'L' } };
  const bubble = P.makeBubble({ w: 4.2, h: 2.5, tail: 'right' });
  bubble.iconSlots(3).forEach((s) => { const c = P.makeCup({ h: s.userData.size * 0.95 }); c.group.position.y = -s.userData.size * 0.5; s.add(c.group); });
  bubble.group.visible = false;
  g.add(bubble.group);
  layer('bubble', bubble.group);
  const B0 = new V3(6.4, 13.6, 14.2), B1 = new V3(6.2, 25.6, 4.0), B2 = onHead(2.6, -5.2, 0.6);

  // =================================================================== twins: the stream and the crumble
  const NS = 552, NC = 48, NP = NS + NC;
  const twinMat = ink({ style: 0.8, hooks: TWIN_HOOKS, uniforms: { uDen: { value: 0.85 } } });
  const twins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.82, 0.82, 0.82), twinMat, NP);
  twins.frustumCulled = false;
  twins.castShadow = false;
  {
    const col = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) { col[i * 3] = i < NS ? 0.14 : 0.42; col[i * 3 + 1] = i < NS ? 0.8 : 1.0; col[i * 3 + 2] = -1; }
    twins.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
  }
  g.add(twins);
  layer('twins', twins);
  // each twin's target cup, launch time, flight time and start on the sector (head-local), fixed at build
  const share = [0.5, 0.31, 0.19];
  const T = [];
  for (let i = 0; i < NS; i++) {
    const h = R();
    const j = h < share[0] ? 0 : h < share[0] + share[1] ? 1 : 2;
    const a = (R() - 0.5) * 0.92, r = (0.26 + 0.7 * Math.sqrt(R())) * RH;
    T.push({ j, t0: 0.42 + R() * 0.85, fl: 0.3 + R() * 0.16, hx: Math.sin(a) * r, hy: -Math.cos(a) * r, jx: (R() - 0.5) * 1.4, jz: (R() - 0.5) * 0.9, sp: R() });
  }
  const arrivals = [[], [], []];
  for (const p of T) arrivals[p.j].push(p.t0 + p.fl);
  arrivals.forEach((a) => a.sort((x, y) => x - y));
  const filled = (j, t) => { const a = arrivals[j]; let n = 0; while (n < a.length && a[n] <= t) n++; return n / a.length; };
  const C = [];
  for (let i = 0; i < NC; i++) C.push({ x: (R() - 0.5) * 1.5, y: R() * STACK[2], z: (R() - 0.5) * 1.0, vx: (R() - 0.5) * 2.6, vz: 0.6 + R() * 1.8, d: R() * 0.25 });

  // =================================================================== the result card
  // it comes down out of the head and stands on a post just above the bench, where the twins' stacks were: head →
  // card → cups → table read as one vertical chain in a portrait frame
  const CARD_W = 5.2, CARD_H = 6.8, ROWS = 6, LEAN = 0.05;   // tall and upright enough that alternate rows' rings clear each other (44 px)
  const card = P.makeResultCard({ w: CARD_W, h: CARD_H, rows: ROWS, lean: LEAN });
  const CARD_AT = new V3(-1.75, TOP + CUP_H + 0.55, BENCH_Z - 1.45), CARD_YAW = 0;
  card.group.position.copy(CARD_AT);
  card.group.rotation.y = CARD_YAW;
  card.group.visible = false;
  g.add(card.group);
  layer('card', card.group);
  const ins = 0.05 * Math.min(CARD_W, CARD_H), cz0 = -CARD_H / 2 + 2 * ins, cz1 = CARD_H / 2 - 2 * ins;
  const rowZ = (i) => cz0 + ((i + 0.5) / ROWS) * (cz1 - cz0);
  const pitch = (cz1 - cz0) / ROWS;
  const faceY = 0.06 + 0.004;
  // the highlighter on 「■ 情境模擬」 (beat 5), and lever a's red outline with its ✕.  The rows are HTML on a paper
  // ground that covers the card's face, so both marks run out past the card's right edge, where they show.
  const BAR_OUT = 0.95;
  const barW = CARD_W - 1.5 * ins + BAR_OUT;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, pitch * 0.86).translate(0.5, 0, 0), ink({ accent: 'lime', shade: 1, bias: 0.4, focus: false }));
  bar.position.set(-CARD_W / 2 + 1.5 * ins, faceY, rowZ(5));
  bar.scale.x = 1e-3;
  bar.visible = false;
  card.mesh.add(bar);
  const red = new THREE.Group();
  {
    const m = ink({ accent: 'red', shade: 0.35, bias: 0.1, focus: false });
    const x0 = -CARD_W / 2 + 1.2 * ins, x1 = CARD_W / 2 + 0.3, rw = x1 - x0, rh = pitch * 1.04, th = 0.07;
    for (const [w, d, x, z] of [[rw, th, (x0 + x1) / 2, -rh / 2], [rw, th, (x0 + x1) / 2, rh / 2], [th, rh, x0, 0], [th, rh, x1, 0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), m);
      b.position.set(x, 0, z);
      red.add(b);
    }
    const x2 = P.makeX({ size: 0.78, t: 0.08 });
    x2.group.rotation.x = -Math.PI / 2;
    x2.group.position.set(x1 + 0.62, 0.05, 0);
    red.add(x2.group);
  }
  red.position.set(0, faceY + 0.01, rowZ(5));
  red.visible = false;
  card.mesh.add(red);
  // the three checkbox rows answer a tap: thin proxies on the card's face
  const rowHits = [3, 4, 5].map((i) => {
    const o = new THREE.Group();
    o.position.set(0, faceY, rowZ(i));
    card.mesh.add(o);
    const h = P.makeHitProxy(o, 0);
    h.scale.set(CARD_W - 2 * ins, 0.3, pitch * 0.96);
    h.position.set(0, 0, 0);
    return { o, h, i };
  });
  const onCard = (x, z) => { card.mesh.updateWorldMatrix(true, false); return card.mesh.localToWorld(new V3(x, faceY, z)); };
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2).translate(0, 0.5, 0), ink({ shade: 0.9, bias: 0.06 }));
  post.position.set(CARD_AT.x, DAIS_TOP, CARD_AT.z - 0.55);
  post.scale.y = CARD_AT.y - DAIS_TOP + 2.2;
  post.castShadow = true;
  post.visible = false;
  g.add(post);
  layer('card', post);
  const C0 = onHead(-2.4, -6.6, 1.2);           // where the card slides out of the head

  // =================================================================== the tasting table and five real people
  const TABLE = new V3(0.9, 0, 19.7);
  const tableSet = new THREE.Group();          // the table, its stools and the five people: one part
  tableSet.name = 'table-set';
  g.add(tableSet);
  // a low round table (knees clear it), the two cups stand on it in front of the two who taste
  const TABLE_R = 2.6, TABLE_H = 1.55, TR = 3.3, DECK_R = TR + 0.85;
  // one level floor for the whole set: on the dome's slope each stool stood at its own height, the two end tasters
  // 0.8 u below the table, and their cups vanished under its top
  let gLo = Infinity, gHi = -Infinity;
  for (let i = 0; i < 24; i++) for (const rr of [0, 0.5, 1]) {
    const a = (i / 24) * TAU, y = gy(TABLE.x + Math.cos(a) * DECK_R * rr, TABLE.z + Math.sin(a) * DECK_R * rr);
    gLo = Math.min(gLo, y); gHi = Math.max(gHi, y);
  }
  TABLE.y = gHi + 0.12;
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(DECK_R, DECK_R + 0.1, TABLE.y - gLo + 0.5, 48).translate(0, -(TABLE.y - gLo + 0.5) / 2, 0),
    ink({ shade: 0.9, bias: 0.2 }));
  deck.position.copy(TABLE);
  deck.receiveShadow = true;
  g.add(deck);                                 // not in tableSet: the set's hit proxy should not take in the buried footing
  layer('table', deck);
  const table = P.makeTable({ round: true, r: TABLE_R, h: TABLE_H });
  table.group.position.copy(TABLE);
  tableSet.add(table.group);
  layer('table', table.group);
  // five seats round the far half of the table, all facing in.  The two who taste sit at the ends (0: camera right,
  // 4: camera left), seen in profile, each reaching for the cup set down in front of them.
  // lift() moves the right hand; the right-end taster is drawn mirrored so that its cup hand is the camera side too.
  const MIRROR = 0;
  const tasters = [Math.PI - 1.62, Math.PI - 0.62, Math.PI, Math.PI + 0.62, Math.PI + 1.62].map((th, i) => {
    const p = makePerson({ height: TASTER, seated: true });
    const x = TABLE.x + Math.sin(th) * TR, z = TABLE.z + Math.cos(th) * TR;
    const y = TABLE.y;
    p.group.position.set(x, y, z);
    p.group.rotation.y = Math.atan2(TABLE.x - x, TABLE.z - z);
    if (i === MIRROR) p.group.scale.x = -1;
    p.material.userData.u.uShadeBias.value = 0.34;
    const st = P.makeStool({ h: p.seatH, r: 0.34 });
    st.group.position.set(x, y, z);
    st.group.rotation.y = p.group.rotation.y;
    tableSet.add(st.group, p.group);
    layer('table', st.group, p.group);
    p.setPose('sit', 1);
    return p;
  });
  const tableHit = P.makeHitProxy(tableSet, 0.25);
  // which taster takes which cup: 荔枝烏龍 (bench left) to the left end, 黑糖桂圓 to the right end
  const LIFT = [4, 0];
  g.updateMatrixWorld(true);
  const cupRest = LIFT.map((ti) => {
    const p = tasters[ti];
    const dir = new V3(TABLE.x - p.group.position.x, 0, TABLE.z - p.group.position.z).normalize();
    // inside the rim, within the taster's reach, a little toward the reader: it stands on the lime top, clear of torsos
    const pos = p.group.position.clone().addScaledVector(dir, TR - 1.9);
    pos.z += 0.25;
    pos.y = TABLE.y + TABLE_H;
    // set down square to the taster (turned half round for the mirrored one: the lathe cup looks the same, and the
    // mirrored hand then takes it without a spin); the right hand reaches for its side in the taster's own frame
    const yaw = p.group.rotation.y + (ti === MIRROR ? Math.PI : 0);
    const to = p.group.worldToLocal(g.localToWorld(pos.clone())).add(cups[0].handle('R').multiplyScalar(SMALL / CUP_H));
    return { pos, yaw, to };
  });
  const others = [1, 2, 3];
  // the three who watch turn their heads toward the nearer cup (fixed at build: pose() stays order-free)
  const lookYaw = others.map((ti) => {
    const p = tasters[ti];
    const near = ti < 2 ? tasters[LIFT[1]] : ti > 2 ? tasters[LIFT[0]] : null;
    if (!near) return 0;
    const at = g.localToWorld(near.group.position.clone().add(new V3(0, TASTER * 0.62, 0)));
    const l = p.group.worldToLocal(at);
    return clamp(Math.atan2(l.x, l.z), -1.1, 1.1);
  });

  // =================================================================== lever a: the 上市 sign
  // in front of the table, toward the reader: the cups fly over the table to it, and it fills the open ground
  const SIGN = new V3(5.4, 0, 23.6);           // in front of the table and to its right, clear of the deck
  SIGN.y = gy(SIGN.x, SIGN.z);
  const sign = new THREE.Group();
  {
    const m = ink({ shade: 0.95, bias: 0.12 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 4.6, 10).translate(0, 2.3, 0), m);
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.45, 0.14), ink({ shade: 1, bias: 0.3 }));
    board.position.set(0, 4.15, 0.12);
    for (const o of [post, board]) { o.castShadow = o.receiveShadow = true; sign.add(o); }
  }
  sign.position.copy(SIGN);
  sign.rotation.y = -0.08;
  sign.visible = false;
  g.add(sign);
  layer('sign', sign);
  // under the sign's board, one each side of its post: on the market
  const PAST = [new V3(SIGN.x - 0.85, 0, SIGN.z + 0.6), new V3(SIGN.x + 0.7, 0, SIGN.z + 0.35)];
  PAST.forEach((p) => { p.y = gy(p.x, p.z); });

  // =================================================================== hit proxies, shadows, accents
  const headHit = P.makeHitProxy(bed, 1.2);
  // the accents this district switches itself (only while it is in focus, see applyDim) are drawn at full strength
  // wherever they are: with the map's attention radius round the pill (38 u up) the table's lime came out stippled
  for (const m of [table.material, ...cups.flatMap((c) => [c.lid.material, c.body.material])]) m.userData.u.uAccentAll = { value: 1 };
  g.traverse((o) => { if (o.isMesh) o.userData.cs0 = o.castShadow; });

  // =================================================================== pose: (beat, k, lever) → everything
  const cur = { beat: LAST, k: 1, lever: 'b', emph: null };
  const poseDim = {};
  const Mh = new THREE.Matrix4();
  const tv = new V3(), tv2 = new V3();
  const yAxis = new V3(0, 1, 0);
  const st = { cupOn: [true, true, true], cupShown: [false, false, false], cardRows: false, sign: false, stackTop: [0, 0, 0], mark: null };
  // the accents a pose asks for; applyDim() draws lime only while the district is in focus (an emphasis is set), so
  // on the map the held result rests in plain ink and the map keeps one lime object at most (design §6.3)
  const want = { lid: [false, false, false], body: [false, false, false], red: false, table: false };

  function pose(beat, k = 1, lever = 'b') {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const L = lever === 'a' ? 'a' : 'b';
    cur.beat = beat; cur.k = k; cur.lever = L;
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i */
    const W = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : clamp((t - a) / (z - a)));
    for (const key in poseDim) poseDim[key] = 0;

    // ---- the head: turns a little more toward the asker and nods toward the bench (beat 2)
    const n1 = sm(W(1, 0.05, 0.6)), n2 = sm(W(1, 0.6, 1.15));
    head.rotation.x = NOD0 + 0.17 * n1 - 0.07 * n2;
    pivot.rotation.y = HEAD_YAW + 0.12 * n1;
    // ---- the field: a wave of full density runs out from the centre (beat 2); the target sector stays (beat 3 on)
    const wv = W(1, 0.2, 1.05);
    bedU.y = wv <= 0 ? 0 : wv >= 1 ? 2 : wv * 1.2;
    bedU.z = sm(W(2, 0, 0.4));
    bedU.w = 0.2;           // asleep until asked: faint, so the wave of beat 2 reads as the twins waking

    // ---- the cups rise onto the bench one by one (beat 1)
    for (let j = 0; j < 3; j++) {
      const c = cups[j];
      const r = W(0, 0.1 + 0.28 * j, 0.62 + 0.28 * j);
      st.cupShown[j] = r > 0;
      c.group.visible = r > 0;
      c.group.position.set(CUP_X[j], TOP + (1 - eo(r)) * -1.2, BENCH_Z);
      c.group.quaternion.identity();
      c.group.scale.setScalar(Math.max(1e-3, back(r)));
      st.cupOn[j] = true;
      // lids lime while the three are the question; 荔枝烏龍 lime once the twins have chosen it
      const lidLime = beat === 0 && r > 0.4;
      const bodyLime = j === 0 && (beat === 2 && t > 0.4);
      want.lid[j] = lidLime || bodyLime;
      want.body[j] = bodyLime;
      // the stacks grow as the twins arrive (beat 3)
      const f = beat < 2 ? 0 : beat > 2 ? 1 : filled(j, t);
      const hgt = STACK[j] * f;
      c.stack.visible = hgt > 0.02;
      c.stack.scale.y = Math.max(1e-3, hgt);
      st.stackTop[j] = hgt;
    }
    frame.group.visible = beat >= 2;
    frame.group.scale.set(1, 1, 1);

    // ---- the brand person: raises the question (beat 1), holds the clipboard, turns to watch the table (beat 6)
    if (beat === 0) person.setPose('raise', sm(W(0, 0.55, 1.05)), { side: 'L', from: 'stand' });
    else if (beat < 5) person.setPose('hold', sm(W(1, 0.0, 0.5)), { from: RAISE });
    // the table is down and a little to the brand person's right: a turn and a look down
    else person.setPose('watch', sm(W(5, 0.3, 1.0)), { yaw: -0.4, pitch: 0.5, from: 'hold' });

    // ---- the question bubble: out of the clipboard, up to the head, into the field
    {
      const a = W(0, 0.8, 1.0), b = W(0, 1.0, 1.7), c = W(1, 0.0, 0.32);
      bubble.group.visible = a > 0 && c < 1;
      const e = sm(b);
      if (c > 0) bubble.group.position.lerpVectors(B1, B2, sm(c));
      else {
        bubble.group.position.lerpVectors(B0, B1, e);
        bubble.group.position.y += Math.sin(Math.PI * e) * 2.2;
        bubble.group.position.z += Math.sin(Math.PI * e) * 1.4;
      }
      bubble.group.scale.setScalar(Math.max(1e-3, (0.35 + 0.65 * eo(a)) * (1 - sm(c))));
      bubble.group.rotation.set(0, -0.1, 0);
    }

    // ---- twins stream from the sector into the cups (beat 3)
    const streaming = beat === 2;
    if (streaming) { g.updateMatrixWorld(true); Mh.copy(g.matrixWorld).invert().multiply(head.matrixWorld); }
    for (let i = 0; i < NS; i++) {
      const p = T[i];
      let s = 0;
      _v.set(CUP_X[p.j], TOP, BENCH_Z);   // a twin not in flight waits, folded away, at its cup (the same every call)
      if (streaming) {
        const u = (t - p.t0) / p.fl;
        if (u > 0 && u < 1) {
          const S = tv.set(p.hx, p.hy, 0.7).applyMatrix4(Mh);
          const cx = CUP_X[p.j] + p.jx * 0.55, cz = BENCH_Z + p.jz * 0.5;
          const ey = TOP + 0.87 * CUP_H + Math.max(0.3, STACK[p.j] * filled(p.j, p.t0 + p.fl - 1e-4)) + 0.2;
          const ue = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
          // a quadratic arc that bulges toward the camera
          const mx = (S.x + cx) / 2, my = (S.y + ey) / 2 + 1.0 + p.sp, mz = (S.z + cz) / 2 + 2.4 + p.sp * 1.2;
          const a0 = (1 - ue) * (1 - ue), a1 = 2 * (1 - ue) * ue, a2 = ue * ue;
          _v.set(a0 * S.x + a1 * mx + a2 * cx, a0 * S.y + a1 * my + a2 * ey, a0 * S.z + a1 * mz + a2 * cz);
          s = Math.min(1, u / 0.12) * (u > 0.9 ? (1 - u) / 0.1 : 1);
        }
      }
      _m.compose(_v, _q.identity(), _s.setScalar(Math.max(1e-4, s)));
      twins.setMatrixAt(i, _m);
    }

    // ---- 油柑氣泡 is stamped out: the ✕ drops (beat 4), its stack crumbles into type, the cup leaves the bench
    const xDrop = W(3, 0.55, 1.0), crumble = W(3, 1.05, 1.75), slide = W(3, 1.5, 2.3);
    X.group.visible = xDrop > 0;
    {
      const e = xDrop * xDrop;
      X.group.position.y = 0.74 * CUP_H + (1 - e) * 6;
      const sq = W(3, 1.0, 1.2);
      X.group.scale.set(1 + 0.18 * Math.sin(Math.PI * sq), 1 - 0.12 * Math.sin(Math.PI * sq), 1);
    }
    want.red = W(3, 1.0, 1.0001) >= 1;
    if (crumble > 0) { cups[2].stack.visible = false; }
    for (let i = 0; i < NC; i++) {
      const p = C[i];
      let s = 0;
      _v.set(CUP_X[2], TOP, BENCH_Z);
      if (beat === 3 && crumble > 0 && crumble < 1) {
        const u = clamp((crumble - p.d) / (1 - p.d));
        // from inside the stack, falling and scattering toward the camera, onto the bench
        const y0 = TOP + 0.87 * CUP_H + p.y;
        const y = Math.max(TOP + 0.15, y0 - 9 * u * u + 1.2 * u);
        _v.set(CUP_X[2] + p.x + p.vx * u, y, BENCH_Z + p.z + p.vz * u);
        s = u < 1 ? (u > 0.75 ? (1 - u) / 0.25 : 1) * (crumble > p.d ? 1 : 0) : 0;
      }
      _m.compose(_v, _q.identity(), _s.setScalar(Math.max(1e-4, s * 0.92)));
      twins.setMatrixAt(NS + i, _m);
    }
    twins.instanceMatrix.needsUpdate = true;
    twins.visible = beat === 2 || (beat === 3 && crumble > 0 && crumble < 1);
    if (slide > 0) {
      // knocked over: it slides to the bench's end and topples onto its side, its ✕ still facing the reader.  (Pushed
      // off behind the bench it stood half hidden, and from the camera it looked as if it were still on the bench.)
      // it slides right first (tipping where it stood, its lid would swing into 黑糖桂圓), then tips over to the left,
      // pivoting on its base rim, and lies with its base at the bench's end
      const a = sm(clamp(slide / 0.3)), b = clamp((slide - 0.3) / 0.7), e = b * b * (b * (6 * b - 15) + 10);
      const land = b < 0.8 ? 0 : Math.sin(Math.PI * (b - 0.8) / 0.2) * 0.06;   // a small bounce as it lands
      const th = FALLEN.rot * e - land;
      const pivot = mix(FALLEN.x0 - FALLEN.rb, FALLEN.x - FALLEN.rb * Math.cos(FALLEN.rot), e);
      const x0 = mix(CUP_X[2], FALLEN.x0, a);
      cups[2].group.position.set(b > 0 ? pivot + FALLEN.rb * Math.cos(th) : x0, TOP + FALLEN.rb * Math.sin(Math.max(0, th)), BENCH_Z);
      cups[2].group.rotation.set(0, 0, th);
      st.cupOn[2] = slide < 0.3;
    }

    // the dropped flavour stays red with its ✕ while its beat lasts, then drops to contour
    poseDim['cup-yougan'] = beat >= 4 ? 1 : 0;

    // ---- the result card slides out of the head and stands at the bench's front end (beat 5)
    {
      const a = W(4, 0.0, 0.62);
      card.group.visible = a > 0;
      const e = sm(a);
      card.group.position.lerpVectors(C0, CARD_AT, e);
      card.group.position.y += Math.sin(Math.PI * e) * 1.5;
      card.group.rotation.set(0, CARD_YAW * e, (1 - e) * 0.4);
      card.group.scale.setScalar(Math.max(1e-3, 0.4 + 0.6 * e));
      st.cardRows = W(4, 0.66, 0.67) >= 1;
      post.visible = a >= 1;
      const hb = W(4, 0.8, 1.08);
      bar.visible = beat === 4 && hb > 0 && L === 'b';
      bar.scale.x = Math.max(1e-3, barW * eo(hb));
    }

    // ---- the decision (beat 6): b — two cups down to the table, five people taste; a — to the 上市 sign
    // the stacks and the frame give way to the card as it lands (beat 5)
    const fade = sm(W(4, 0.28, 0.6));
    for (const j of [0, 1]) {
      cups[j].stack.scale.y *= 1 - fade;
      cups[j].stack.visible = cups[j].stack.visible && fade < 1;
    }
    frame.group.visible = frame.group.visible && fade < 1;
    frame.group.scale.set(1, Math.max(1e-3, 1 - fade), 1);
    st.sign = false;
    sign.visible = beat === 5 && L === 'a';
    // the table is the last beat's subject (and the held result): lime, unless the reader skipped it (lever a)
    want.table = beat === 5 && L === 'b';
    st.mark = beat === 4 && W(4, 0.8, 0.81) >= 1 && L === 'b' ? 'lime' : beat === 5 && L === 'a' && W(5, 1.2, 1.21) >= 1 ? 'red' : null;
    red.visible = false;
    for (const ti of [0, 1, 2, 3, 4]) tasters[ti].setPose('sit', 1, { from: 'sit' });
    if (beat === 5) {
      if (L === 'b') {
        for (const [n, j] of [[0, 0], [1, 1]]) {
          const c = cups[j], p = tasters[LIFT[n]], rest = cupRest[n];
          const gl = sm(W(5, 0.2 + 0.12 * n, 1.0 + 0.1 * n));
          const reach = sm(W(5, 1.0 + 0.1 * n, 1.5 + 0.1 * n));
          if (gl > 0) st.cupOn[j] = false;
          // an arc from the bench down onto the table, in front of the taster who takes it; it stays the pale cup it
          // was on the bench (in a hand at the mouth, a cup big enough to see covered the taster's own chest, and a
          // small one was a blot), standing on the lime top where its outline reads
          const from = tv2.set(CUP_X[j], TOP, BENCH_Z);
          c.group.position.lerpVectors(from, rest.pos, gl);
          c.group.position.y += Math.sin(Math.PI * gl) * 2.2;
          c.group.quaternion.setFromAxisAngle(yAxis, rest.yaw * gl);
          c.group.scale.setScalar(mix(1, SMALL / CUP_H, gl));
          // the taster reaches out and takes hold of it (lift's arm, the grip on the cup)
          p.setPose('lift', reach, { to: rest.to, from: 'sit' });
        }
        // the other three lean in and look at the cups
        const look = sm(W(5, 0.9, 1.4));
        others.forEach((ti, n) => {
          const p = tasters[ti];
          const v = p.pose('sit'), w = p.pose('sit');
          const yaw = lookYaw[n];
          w.waist.setFromEuler(new THREE.Euler(0.14, yaw * 0.3, 0, 'YXZ'));
          w.neck.setFromEuler(new THREE.Euler(0.1, yaw * 0.3, 0, 'YXZ'));
          w.head.setFromEuler(new THREE.Euler(0.16, yaw * 0.4, 0, 'YXZ'));
          p.apply(p.blend(v, w, look));
        });
      } else {
        // straight to market: the sign comes up in front, the cups fly over the table to it; the table stays empty
        const up = sm(W(5, 0.0, 0.35));
        sign.scale.set(1, Math.max(1e-3, up), 1);
        st.sign = up > 0.6;
        for (const j of [0, 1]) {
          const c = cups[j];
          const gl = sm(W(5, 0.25 + 0.12 * j, 1.25 + 0.1 * j));
          if (gl > 0) st.cupOn[j] = false;
          const from = tv2.set(CUP_X[j], TOP, BENCH_Z);
          c.group.position.lerpVectors(from, PAST[j], gl);
          c.group.position.y += Math.sin(Math.PI * gl) * 2.6;
          c.group.quaternion.identity();
          c.group.scale.setScalar(mix(1, 0.6, gl));
        }
        poseDim.table = 1;
        red.visible = W(5, 1.2, 1.21) >= 1;
      }
    }
    applyDim();
  }

  // =================================================================== emphasis by subtraction
  // which dim groups each part id keeps at full strength
  const FULL = {
    head: ['flower', 'field', 'bubble'],
    sector: ['field', 'twins'],
    column: ['column', 'twins'],
    'cup-lychee': ['cup-lychee', 'column', 'stage'],
    'cup-brown': ['cup-brown', 'stage'],
    'cup-yougan': ['cup-yougan', 'stage', 'twins'],
    card: ['card'], 'row-direct': ['card'], 'row-model': ['card'], 'row-scen': ['card'],
    table: ['table'],
    person: ['person', 'bubble', 'stage'],
    'launch-sign': ['sign'],
  };
  // the held result (the story emphasises these at the end): the simulation's card and the real people trying the two
  // cups, with the bench and dais kept as their setting; the flower and its field (not parts of the result) drop to
  // contour like everything else, and the dropped flavour stays at contour
  const REST = ['table', 'card', 'row-direct', 'row-model', 'row-scen', 'cup-lychee', 'cup-brown', 'person'];
  const SETTING = ['stage'];
  function applyDim() {
    let ids2 = cur.emph;
    const atRest = !!ids2 && ids2.length === REST.length && REST.every((id) => ids2.includes(id));
    // lever a has no table result: its last beat is about the sign and the card's 情境模擬 row
    if (ids2 && cur.beat === LAST && cur.lever === 'a' && ids2.includes('table')) ids2 = ['launch-sign', 'card', 'cup-lychee', 'cup-brown', 'person'];
    const full = new Set(atRest ? SETTING : []);
    if (ids2) for (const id of ids2) for (const l of FULL[id] || []) full.add(l);
    const half = ids2 && (ids2.includes('sector') || ids2.includes('column'));
    // accents: lime only in focus; red marks the dropped flavour while its beat lasts
    const on = !!cur.emph, lime = ACCENT.lime;
    for (let j = 0; j < 3; j++) {
      cups[j].lid.material.userData.u.uAccent.value = on && want.lid[j] ? lime : 0;
      cups[j].body.material.userData.u.uAccent.value = j === 2 && want.red ? ACCENT.red : on && want.body[j] ? lime : 0;
    }
    table.material.userData.u.uAccent.value = on && want.table ? lime : 0;
    for (const [name, objs] of Object.entries(layers)) {
      let a = !ids2 ? 0 : full.has(name) ? 0 : name === 'flower' && half ? 0.45 : 1;
      const pd = name === 'cup-yougan' ? poseDim['cup-yougan'] || 0 : name === 'table' ? poseDim.table || 0 : 0;
      a = Math.max(a, pd);
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
  const disk = (x, y) => { const save = [head.rotation.x, pivot.rotation.y]; head.rotation.x = NOD0; pivot.rotation.y = HEAD_YAW; const p = onHeadW(x, y, 0); head.rotation.x = save[0]; pivot.rotation.y = save[1]; head.updateWorldMatrix(true, false); return p; };
  const PH = 4.5;
  // shot A keeps the disk's width and its lower part; its top may go under the top bar (the stage is the size budget)
  // the brand person's far side (the raised clipboard, the turned shoulder), so all of them stays in frame
  const PSIDE = [W3(PERSON.x + 1.1, PERSON.y + PH * 0.75, PERSON.z), W3(PERSON.x + 0.6, PERSON.y, PERSON.z)];
  const A_stage = [W3(-BENCH_W / 2, TOP, BENCH_Z), W3(BENCH_W / 2, TOP, BENCH_Z), W3(CUP_X[0], TOP + CUP_H, BENCH_Z),
    W3(PERSON.x, PERSON.y + PH, PERSON.z), W3(PERSON.x, PERSON.y, PERSON.z), ...PSIDE];
  const A_pts = [disk(0, 0.5 * RH), disk(-RH, 0), disk(RH, 0), ...A_stage];
  // a short landscape screen (about 932 × 430) crops the head's upper part, so the stage keeps its size (A-L)
  const A_low = [disk(0, -0.2 * RH), disk(-0.85 * RH, -0.35 * RH), disk(0.85 * RH, -0.35 * RH), ...A_stage];
  const shotA = () => (typeof innerHeight === 'number' && innerHeight < 560 && innerWidth > innerHeight ? A_low : A_pts);
  const cH = CARD_H * Math.cos(LEAN), cB = CARD_H * Math.sin(LEAN);
  const cardCorners = () => [W3(CARD_AT.x - CARD_W / 2, CARD_AT.y, CARD_AT.z), W3(CARD_AT.x + CARD_W / 2, CARD_AT.y, CARD_AT.z),
    W3(CARD_AT.x - CARD_W / 2, CARD_AT.y + cH, CARD_AT.z - cB), W3(CARD_AT.x + CARD_W / 2, CARD_AT.y + cH, CARD_AT.z - cB)];
  const B_pts = [...CUP_X.map((x) => W3(x - 1.2, TOP + CUP_H, BENCH_Z)), W3(CUP_X[2] + 1.2, TOP, BENCH_Z), W3(CUP_X[0] - 1.2, DAIS_TOP, BENCH_Z + 0.8), ...cardCorners(),
    W3(PERSON.x, PERSON.y + PH, PERSON.z), ...PSIDE];
  const tasterTops = tasters.map((p) => { p.group.updateMatrixWorld(true); return p.top(); });
  // the end: the table in front (the subject), the bench, the ✕ cup and the card behind it, the brand person watching
  const C_pts = [W3(CUP_X[0], TOP, BENCH_Z), W3(TABLE.x, gLo, TABLE.z + DECK_R + 0.6), W3(TABLE.x - TR - 0.4, TABLE.y, TABLE.z), W3(TABLE.x + TR + 0.4, TABLE.y, TABLE.z),
    ...tasterTops, W3(PERSON.x, PERSON.y + PH, PERSON.z), ...PSIDE, ...cardCorners().slice(2)];
  const D2_pts = [...B_pts, ...C_pts];
  const shots = {
    phone: [
      { az: STAGE_AZ, el: 0.22, anchors: shotA },
      { az: STAGE_AZ, el: 0.3, anchors: () => B_pts },
      { az: STAGE_AZ, el: 0.38, anchors: () => C_pts },
    ],
    desk: [
      { az: STAGE_AZ, el: 0.22, anchors: shotA },
      { az: STAGE_AZ, el: 0.34, anchors: () => D2_pts },
    ],
  };

  // the front edge of the set's floor: the label above it sits over the table's foot, below the cups on its top
  const tableFoot = () => { table.group.updateWorldMatrix(true, false); return table.group.localToWorld(new V3(0, 0, DECK_R - 0.15)); };
  const cupMid = (j) => () => { const c = cups[j]; c.group.updateWorldMatrix(true, false); return c.group.localToWorld(new V3(0, 0.45 * CUP_H, 0)); };
  const labelAt = {
    sector: () => onHeadW(0, -0.62 * RH, 0.3),
    column: () => { const c = cups[0]; c.group.updateWorldMatrix(true, false); return c.group.localToWorld(new V3(0.98, 0.87 * CUP_H + Math.max(0.2, st.stackTop[0]), 0.62)); },
    // the cup's top as it stands, then as it lies: the lid's crown while upright, the upturned side of the lid end once
    // knocked over, so the label sits above the cup (not on it) and clear of the ✕ at every moment of the fall
    'cup-yougan': () => {
      const c = cups[2], f = clamp(c.group.rotation.z / FALLEN.rot);
      c.group.updateWorldMatrix(true, false);
      return c.group.localToWorld(new V3(mix(0, 0.3 * CUP_H, f), mix(0.985, 0.8, f) * CUP_H, 0.1 * CUP_H));
    },
    // at the front of the set's floor: the label then sits over the table's foot, clear of the people and their cups
    // (lever a leaves the table unused, so it is not named there)
    table: () => (cur.lever === 'a' && cur.beat === LAST ? null : tableFoot()),
  };
  const decalAt = {
    'cup-lychee': () => (st.cupShown[0] && st.cupOn[0] ? cups[0].decalAnchor() : null),
    'cup-brown': () => (st.cupShown[1] && st.cupOn[1] ? cups[1].decalAnchor() : null),
    'cup-yougan': () => (st.cupShown[2] && st.cupOn[2] ? cups[2].decalAnchor() : null),
    card: () => (st.cardRows ? card.rowAnchors(ROWS, { align: 'left' }) : null),
    'launch-sign': () => { if (!st.sign) return null; sign.updateWorldMatrix(true, false); return sign.localToWorld(new V3(0, 4.15, 0.22)); },
  };
  // hotspots just outside the card, one per checkbox row, at the row's height: 模型估計 on the left, the other two on
  // the right, 情境模擬's a ring further out (past the highlighter and lever a's red ✕, which run out on that side).
  // Rows are 20–30 px apart, so two 44 px targets on one side must also stand apart sideways (and on the left, a ring
  // too close to the card sat on the HTML rows' block).
  // (A short landscape screen draws the card smallest, about 15 px a unit: there the outer ring stands farther out.)
  const RING_X = { 3: CARD_W / 2 + 0.9, 4: -(CARD_W / 2 + 1.0), 5: CARD_W / 2 + 3.3 };
  const flat = () => typeof innerHeight === 'number' && innerHeight < 560 && innerWidth > innerHeight;
  const rowAt = (i) => () => onCard(RING_X[i] + (i === 5 && flat() ? 0.9 : 0), rowZ(i));
  // the target sector's outline on the head (the 5–7 o'clock wedge of the field, head-local)
  const SECTOR = [];
  for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) for (const r of [0.2, 0.6, 1]) SECTOR.push([Math.sin(a) * r * RH, -Math.cos(a) * r * RH]);
  const parts = {
    head: { hit: headHit, anchor: () => onHeadW(0, 0.12 * RH, 0.4), beat: 1 },
    // parts that are not tapped (no proxy) still say where they are, for the verifier's size checks
    sector: { hit: null, anchor: labelAt.sector, beat: 2, box: () => new THREE.Box3().setFromPoints(SECTOR.map(([x, y]) => onHeadW(x, y, 0.3))) },
    column: { hit: null, anchor: labelAt.column, beat: 2, object: frame.group },
    'cup-lychee': { hit: cups[0].hit, anchor: cupMid(0), beat: 2 },
    'cup-brown': { hit: cups[1].hit, anchor: cupMid(1), beat: 2 },
    'cup-yougan': { hit: cups[2].hit, anchor: cupMid(2), beat: 3 },
    card: { hit: null, anchor: () => onCard(0, 0), beat: 4, object: card.group },
    'row-direct': { hit: rowHits[0].h, anchor: rowAt(3), beat: 4 },
    'row-model': { hit: rowHits[1].h, anchor: rowAt(4), beat: 4 },
    'row-scen': { hit: rowHits[2].h, anchor: rowAt(5), beat: 4 },
    // its hotspot ring sits where the label's leader ends, under the label
    table: { hit: tableHit, anchor: () => (cur.lever === 'a' && cur.beat === LAST ? table.surface(0, -1.5) : tableFoot()), beat: 5 },
    person: { hit: personHit, anchor: () => person.chest(), beat: 0 },
    'launch-sign': { hit: null, anchor: () => { sign.updateWorldMatrix(true, false); return sign.localToWorld(new V3(0, 4.15, 0.22)); }, beat: 5, object: sign },
  };

  const rest = () => pose(LAST, 1, 'b');
  rest();
  const pin = disk(0, RH * 1.02);

  return {
    id: 'core',
    group: g,
    zone: 'consumer',
    // the map pill above the flower
    anchor: new V3(0, 38, 0),
    // optional, for the UI: where accents should be at full strength while the district is in focus
    // (engine.setFocus(pos, r)): the flower and the stage.  The core's own accents (lids, cups, table, marks) no longer
    // depend on it (they ignore the attention radius), but the trust district's heart, 32 u from the pill's anchor, is
    // inside setFocus(anchor, 34) and stays fully lime behind the stage.  Market's lime tent stands 19 u from the stage,
    // so no radius separates it: neighbours need dimming while a district is in focus.
    focus: { pos: g.localToWorld(new V3(1, 15, 9.5)), r: 31 },
    pin,
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    // optional, for the overlay: a mark on one row of a card decal, { row (0-based), kind: 'lime' | 'red' } or null.
    // The 3D card already shows both marks where they run out past its right edge; the HTML rows cover the rest.
    decalMark: { card: () => (st.mark ? { row: 5, kind: st.mark } : null) },
    lever: { fromBeat: 5, options: ['a', 'b'], def: 'b' },
    mainActor: 'person',
    restParts: REST,
    pose,
    rest,
    ambient() {},
    emphasize,
    update(t, dt) { this.ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { person: person.group, tasters: tasters.map((p) => p.group), cups: cups.map((c) => c.group), card: card.group, table: table.group, bubble: bubble.group, X: X.group, sign },
  };
}
