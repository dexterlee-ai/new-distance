// 先問數位分身 · People Model (articles 12, 2) — told in six beats.
// The Model chapter's sunflower stands at the centre of the map; its seed head is a field of 人, the digital twins
// (style band 0.8: 5,000 多位, each made from one real respondent).  In front of it and below it (portrait staging) a
// brand person on a dais asks them about three new drinks, and the twins answer by pouring into the cups:
//   1 the cups land on the bench, the clipboard goes up, the question flies into the head; the head swings round to
//     the asker, its petals spring open and a wave of 人 runs out through the field: 5,000 多位 twins awake;
//   2 one wedge of the field (25–34 歲女性) lights and pours into the cups: over each cup a column of 人 grows in a
//     0–100 frame, 荔枝烏龍's to about four fifths;
//   3 another wedge (40–44 歲女性): 荔枝烏龍's tall column breaks and crashes onto the bench, every one of the first
//     group flies home into its wedge, the second wedge pours — 黑糖桂圓 rises to 64%, 荔枝烏龍 only 36%, 油柑氣泡's
//     frame stays empty;
//   4 a typed ✕ slams onto 油柑氣泡; it turns red and is knocked off the bench;
//   5 the twins of the two columns fly together into a typed result card; the highlighter runs over ■ 情境模擬;
//   6 the two surviving cups go down to a round table, where two of five real people drink from them and the other
//     three lean in; the brand person turns to watch.  Lever a (直接上市) sends the cups past the table to a 上市 sign.
//
// Everything the reader sees is a pure function of (beat, k, lever) — pose() — so autoplay, stepping, ?still and the
// text map land on the same frame.  No copy lives here: captions, labels, decals and taps come from world.json by part id.
// The head, its seed bed and the stage keep the places they had (d-twins walks its twins into this bed: see seedBed).
import * as THREE from '../vendor/three.module.min.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { rng, tube, TAU, clamp, _m, _q, _v, _s } from './kit.js';
import { heightAt } from './terrain.js';
import { makePerson } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3;

// ---- staging: the stage looks out along STAGE_AZ (the camera's azimuth).  The sun is at world (-70, 120, 50), so
// from this side the fronts of the people, cups and card are lit from the upper left.  The head faces a little to the
// right of the camera, toward the brand person, and keeps the map (az 0.62) in a three-quarter view.
const STAGE_AZ = 1.45;
const YAW = Math.PI / 2 - STAGE_AZ;          // group rotation: local +z = toward the camera, local +x = camera right
const HEAD_YAW = 0.3;                        // the head faces the asker's side (its rest pose; d-twins lands here)
const NOD0 = 0.02;                           // + tilts the face down toward the stage
// before the question the head looks away and down, half closed; asked, it swings round to the asker
const AWAY = { yaw: -0.62, nod: 0.3 };

// ---- the six beats (seconds of motion; the caption lands at keyAt and holds 0.8 s + 0.2 s per 字, see story.js)
const BEATS = [
  // 1 三款新口味要上哪款？先問 5,000 多位真實受訪者的數位分身 — cups land, the question flies in, the head wakes
  { dur: 2.2, keyAt: 1.45, shot: 0, parts: ['cup-lychee', 'cup-brown', 'cup-yougan', 'person', 'head'] },
  // 2 鎖定 25 到 34 歲女性一問，七到八成首選荔枝烏龍 — one wedge pours: 荔枝烏龍's column to 77%
  { dur: 2.5, keyAt: 2.0, shot: 1, parts: ['sector', 'column', 'cup-lychee', 'cup-brown', 'cup-yougan'] },
  // 3 換問 40 到 44 歲女性就翻盤：黑糖桂圓 64%，荔枝烏龍 36% — the tall column crashes, they go home, the next wedge pours
  { dur: 3.0, keyAt: 2.55, shot: 1, parts: ['sector', 'column', 'column-b', 'cup-lychee', 'cup-brown', 'cup-yougan'] },
  // 4 油柑氣泡新奇歸新奇，吸引力低、想買的人也少，量產前就先刷掉 — the ✕ slams, the cup is knocked off
  { dur: 2.2, keyAt: 0.95, shot: 2, parts: ['cup-yougan'] },
  // 5 但分身沒喝過新口味，這份結果只算「情境模擬」，不是市場事實 — the columns fly into the card; ■ 情境模擬 marked
  { dur: 2.2, keyAt: 1.5, shot: 2, parts: ['card', 'row-scen'] },
  // 6 於是只把兩款交給一小群真人試喝，上不上市由真人決定 — two cups to the table; real people drink
  { dur: 2.8, keyAt: 1.85, shot: 3, parts: ['table', 'cup-lychee', 'cup-brown', 'person'] },
];
const LAST = BEATS.length - 1;
// beat-local times of the key events (seconds)
const T0 = { cup: [0.0, 0.14, 0.28], cupDur: 0.38, raise: [0.06, 0.42], bub: [0.36, 0.46, 0.98], lower: [1.15, 1.6], turn: [0.78, 1.42], open: [0.9, 1.5], wave: [0.92, 1.62] };
const T1 = { sec: [0.0, 0.3], frame: [0.05, 0.35], launch: [0.28, 1.3], fl: [0.32, 0.46], lime: 1.05 };
// beat 3: wedge B lights; at crash the old columns break into blocks that fall onto the bench and the dais; from home[0]
// the blocks fly back up into wedge A, which goes dark once they are in; wedge B pours
const T2 = { lightB: [0.0, 0.3], crash: 0.3, home: [0.95, 1.45], hfl: 0.42, offA: [1.5, 1.85], launch: [1.15, 2.1], fl: [0.32, 0.46], lime: 2.0 };
const T3 = { drop: [0.12, 0.46], fold: [0.5, 0.75], slide: [0.85, 1.75] };
const T4 = { go: [0.0, 0.5], fl: 0.34, card: [0.08, 0.82], rows: 0.86, bar: [1.0, 1.32], mask: [0.0, 0.6] };
// beat 6: the two cups arc down onto the table's middle; a tasting cup pops up before each of the five; each reaches,
// takes it and drinks (the middle one first, then outward: ord)
const T5 = { turn: [0.3, 1.0], cup: [[0.12, 0.85], [0.22, 0.95]], pop: 0.88, popDur: 0.3, reach: 1.02, rd: 0.26, dd: 0.42, ord: [0.16, 0.06, 0, 0.1, 0.2] };

// the twins' first choices (share of the asked group per cup: 荔枝烏龍, 黑糖桂圓, 油柑氣泡).  The book: 71–83% (shown
// as 77%) of 25–34 歲女性 choose 荔枝烏龍; of 40–44 歲 36% 荔枝烏龍 and 64% 黑糖桂圓.  The other two heights of the first
// group only rank (see the note).
const SHARE1 = [0.77, 0.15, 0.08];
const SHARE2 = [0.36, 0.64, 0];
// the two wedges of the field (head-local angle from 6 o'clock, + toward the head's +x = the asker's side)
const SEC_A = -0.6, SEC_B = 0.62;
// the result card: four rows (模擬結果 and the three kinds of answer), each tall enough on a phone for the overlay's
// 44 px tap rows to keep in step with the card's own (so the highlighter and lever a's outline sit on 「■ 情境模擬」)
const CARD_W = 5.2, CARD_H = 8.4, ROWS = 4, LEAN = 0.05, SCEN = 3;

const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const ei = (x) => { x = clamp(x); return x * x; };
const back = (x, c = 1.9) => { x = clamp(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const mix = (a, b, t) => a + (b - a) * t;

// the 人 field on the seed bed.  uBed = (disk radius, wave front 0 … 1.2 (≥ 2: done), –, base density);
// uSec = (wedge A's angle, its strength, wedge B's angle, its strength).  Density (= 1 − shade) decides the glyph's
// weight; outside the lit wedge the field drops toward contour (dim).
const BED_HOOKS = {
  key: 'core-bed-2',
  fHead: /* glsl */`
float coreWedge(vec2 p, float r, float a0) {
  float a = atan(p.x, -p.y);
  float d = abs(mod(a - a0 + 3.14159265, 6.28318531) - 3.14159265);
  return (1.0 - smoothstep(0.36, 0.46, d)) * smoothstep(0.15, 0.25, r);
}`,
  fOut: /* glsl */`{
  vec2 p = vLPos.xy / uBed.x;
  float r = length(p);
  float behind = uBed.y >= 1.9 ? 1.0 : 1.0 - smoothstep(uBed.y - 0.1, uBed.y, r);
  float crest = uBed.y >= 1.9 ? 0.0 : exp(-pow((r - uBed.y) / 0.08, 2.0)) * step(0.001, uBed.y);
  float D = mix(uBed.w, 0.84, behind);
  D = max(D, 0.98 * crest);
  D += (dHash(floor(vLPos.xy * 1.3) + 3.1) - 0.5) * 0.1;
  float iA = coreWedge(p, r, uSec.x) * uSec.y, iB = coreWedge(p, r, uSec.z) * uSec.w;
  float inS = max(iA, iB), on = max(uSec.y, uSec.w);
  D = mix(D, max(D, 0.93), inS);
  sh = clamp(1.0 - D, 0.0, 1.0);
  dm = max(dm, on * (1.0 - inS) * 0.9);
}`,
};
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

  // =================================================================== the sunflower (book art)
  const baseY = gy(0, 0);
  const headY = baseY + 21;
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
  const bedU = new THREE.Vector4(RH, 2, 0, 0.84);
  const secU = new THREE.Vector4(SEC_A, 0, SEC_B, 0);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(RH * 1.0, 96), ink({ style: 0.8, hooks: BED_HOOKS, uniforms: { uBed: { value: bedU }, uSec: { value: secU } } }));
  bed.position.z = 0.15;
  bed.receiveShadow = true;
  head.add(layer('field', bed));
  // petals: Fibonacci counts, the only pink in the world.  Their tilt is posed: half closed over the bed before the
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
    const pm = new THREE.InstancedMesh(pg, ink({ side: THREE.DoubleSide, accent: 'pink', shade: 1.0, bias: 0.26 }), count);
    const list = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + (rad < RH ? 0.09 : 0) + (R() - 0.5) * 0.05;
      list.push({ a, tx: tilt + (R() - 0.5) * 0.25, rz: a - Math.PI / 2 + (R() - 0.5) * 0.1, z: -0.3 - R() * 0.4, s: scale * (0.85 + R() * 0.3), sy: 0.9 + R() * 0.25, rad });
    }
    pm.castShadow = true;
    pm.frustumCulled = false;
    head.add(layer('flower', pm));
    petals.push({ pm, list, closed: rad < RH ? 0.62 : 0.5 });
  }
  const _pe = new THREE.Euler();
  /** the petals at openness o (0 half closed … 1 open) */
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
  /** a point of a wedge (r 0…1 of the radius) in head-local x, y */
  const wedgeXY = (a0, a, r) => [Math.sin(a0 + a) * r * RH, -Math.cos(a0 + a) * r * RH];

  // =================================================================== the stage: dais, bench, three cups
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
  const CUP_H = 4, TASTER = 4.8;
  const LID = 0.87 * CUP_H;                     // where a column of 人 stands on its cup
  const HMAX = 6;                               // a column's height for 100% (the frame's)
  const CUP_X = [-4.2, 0, 4.2];
  // where 油柑氣泡 ends up (beat 4): slid to x0, then over on its side, base at x (bench end 6.3), lid toward the
  // middle; rb = the cup's base radius (it pivots on its rim), rot = 90° less the body's taper
  const FALLEN = { x0: 5.3, x: 6.1, rb: 0.2 * CUP_H, rot: Math.PI / 2 - Math.atan(0.09 / 0.84) };
  const ids = ['cup-lychee', 'cup-brown', 'cup-yougan'];
  const COLS = ['col-lychee', 'col-brown', 'col-yougan'];
  const cups = CUP_X.map((x, j) => {
    const c = P.makeCup({ h: CUP_H });
    c.group.position.set(x, TOP, BENCH_Z);
    g.add(c.group);
    c.hit = P.makeHitProxy(c.group, 0.3);
    layer(ids[j], c.group);
    // the twins who chose this cup, a column of 人 on its lid
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1, 1.25).translate(0, 0.5, 0),
      ink({ style: 0.8, hooks: TWIN_HOOKS, uniforms: { uDen: { value: 0.86 } } }));
    st.position.y = LID;
    st.scale.y = 1e-3;
    st.visible = false;
    st.receiveShadow = true;
    c.group.add(st);
    c.stack = st;
    layer(COLS[j], st);
    // its 0–100 frame (teal hairline, ticks, no digits)
    const fr = P.makeFrame({ h: HMAX, w: 2.4 });
    fr.group.position.set(0, LID, 0.05);
    fr.group.visible = false;
    c.group.add(fr.group);
    c.frame = fr;
    layer(COLS[j], fr.group);
    return c;
  });
  // the typed ✕ that slams onto 油柑氣泡
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
  const B0 = new V3(6.4, 13.6, 14.2), B1 = new V3(5.6, 22.5, 9.0);

  // =================================================================== twins: the pours, the way home, the crash
  // [0, NS): the first group (25–34): its pour (beat 2)
  // [NS, 2NS): the second group (40–44): its pour (beat 3), into the card (beat 5)
  // the first group's columns are drawn as blocks when they collapse (beat 3): a separate mesh of NC blocks
  const NS = 540, NP = 2 * NS;
  const twinMat = ink({ style: 0.8, hooks: TWIN_HOOKS, uniforms: { uDen: { value: 0.85 } } });
  const twins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), twinMat, NP);
  twins.frustumCulled = false;
  twins.castShadow = false;
  {
    const col = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) { col[i * 3] = i < 2 * NS ? 0.14 : 0.2; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = -1; }
    twins.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
  }
  g.add(twins);
  layer('twins', twins);
  const pick = (h, share) => (h < share[0] ? 0 : h < share[0] + share[1] ? 1 : 2);
  /** a group of twins: each one's cup, launch, flight, start on its wedge (head-local) */
  const group = (share, a0, [l0, l1], [f0, f1]) => {
    const out = [];
    for (let i = 0; i < NS; i++) {
      const j = pick(R(), share);
      const a = (R() - 0.5) * 0.76, r = 0.27 + 0.7 * Math.sqrt(R());
      const [hx, hy] = wedgeXY(a0, a, r);
      out.push({ j, t0: l0 + R() * (l1 - l0), fl: f0 + R() * (f1 - f0), hx, hy, jx: (R() - 0.5) * 1.4, jz: (R() - 0.5) * 0.9, sp: R(), u: R(), w: R() });
    }
    return out;
  };
  const G1 = group(SHARE1, SEC_A, T1.launch, T1.fl);
  const G2 = group(SHARE2, SEC_B, T2.launch, T2.fl);
  // the second group into the card (beat 5)
  for (const p of G2) { p.tc = T4.go[0] + p.u * (T4.go[1] - T4.go[0]); p.cx = (R() - 0.5) * 4.2; p.cy = 0.6 + R() * (CARD_H - 1.2); }
  /** fraction of a group's twins of cup j for which time(p) ≤ t */
  const fracOf = (G, key) => {
    const per = [[], [], []];
    for (const p of G) per[p.j].push(key(p));
    per.forEach((a) => a.sort((x, y) => x - y));
    return (j, t) => { const a = per[j]; if (!a.length) return 0; let n = 0; while (n < a.length && a[n] <= t) n++; return n / a.length; };
  };
  const in1 = fracOf(G1, (p) => p.t0 + p.fl);      // arrived (beat 2)
  const in2 = fracOf(G2, (p) => p.t0 + p.fl);      // arrived (beat 3)
  const off2 = fracOf(G2, (p) => p.tc);            // left for the card (beat 5)
  // the collapse (beat 3): the first group's three columns, each cut into blocks of 人 (BL), which fall when they break
  // — 荔枝烏龍's tall one the longest way — and lie on the bench and the dais until they fly home into wedge A
  const BL = 0.62;
  const C = [];
  for (let j = 0; j < 3; j++) {
    const h = SHARE1[j] * HMAX, ny = Math.max(1, Math.round(h / BL)), sy = h / ny;
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 2; iz++) {
      const x = CUP_X[j] + (ix - 1) * (1.9 / 3), y = TOP + LID + (iy + 0.5) * sy, z = BENCH_Z + (iz - 0.5) * (1.25 / 2);
      const up = iy / Math.max(1, ny - 1);
      const [hx, hy] = wedgeXY(SEC_A, (R() - 0.5) * 0.7, 0.3 + 0.65 * Math.sqrt(R()));
      C.push({ j, x, y, z, sy,
        // the upper blocks topple outward and toward the reader as they come down, the lower ones mostly drop
        vx: (ix - 1) * (0.5 + 1.6 * up) + (R() - 0.5) * 1.4 + (j === 0 ? -0.5 * up : 0), vz: 0.4 + (1.4 + 1.6 * R()) * (0.35 + up), vy: R() * 1.2,
        d: (1 - up) * 0.06 + R() * 0.05, ax: new V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), spin: (2 + 6 * R()) * (R() < 0.5 ? -1 : 1),
        th: T2.home[0] + (R() * 0.6 + 0.4 * (1 - up)) * (T2.home[1] - T2.home[0]), hx, hy, u: R() });
    }
  }
  const NC = C.length;
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(BL * 0.96, 1, BL * 0.96), ink({ style: 0.8, hooks: TWIN_HOOKS, uniforms: { uDen: { value: 0.86 } } }), NC);
  blocks.frustumCulled = false;
  blocks.castShadow = false;
  {
    const col = new Float32Array(NC * 3);
    for (let i = 0; i < NC; i++) { col[i * 3] = 0.14; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = -1; }
    blocks.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
  }
  // where and when each block lands: on the bench top if it comes down over the bench, else on the dais
  const GRAV = 17;
  for (const p of C) {
    const fallTo = (yf) => { const a = GRAV / 2, b = -p.vy, c = yf - p.y; const dd = b * b - 4 * a * c; return dd < 0 ? 0 : (-b + Math.sqrt(dd)) / (2 * a); };
    let tl = fallTo(TOP + p.sy / 2);
    let x = p.x + p.vx * tl, z = p.z + p.vz * tl;
    if (!(Math.abs(z - BENCH_Z) < 0.72 && Math.abs(x) < BENCH_W / 2)) { tl = fallTo(DAIS_TOP + p.sy / 2); x = p.x + p.vx * tl; z = p.z + p.vz * tl; p.yl = DAIS_TOP + p.sy / 2; } else p.yl = TOP + p.sy / 2;
    p.tl = tl; p.xl = x; p.zl = z;
  }
  blocks.visible = false;
  g.add(blocks);
  layer('twins', blocks);

  // =================================================================== the result card
  // the twins of the two columns fly into it where the columns stood: head → card → cups → table read as one chain
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
  const BAR_IN = 0.9, BAR_OUT = 1.25;          // it runs out past both edges of the card, where it shows
  const barW = CARD_W + BAR_IN + BAR_OUT;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, pitch * 0.86).translate(0.5, 0, 0), ink({ accent: 'lime', shade: 1, bias: 0.4, focus: false }));
  bar.position.set(-CARD_W / 2 - BAR_IN, faceY, rowZ(SCEN));
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
  red.position.set(0, faceY + 0.01, rowZ(SCEN));
  red.visible = false;
  card.mesh.add(red);
  // the three checkbox rows answer a tap: thin proxies on the card's face
  const rowHits = [1, 2, 3].map((i) => {
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

  // =================================================================== the tasting table and five real people
  const TABLE = new V3(0.9, 0, 19.7);
  const tableSet = new THREE.Group();          // the table, its stools and the five people: one part
  tableSet.name = 'table-set';
  g.add(tableSet);
  const TABLE_R = 2.8, TABLE_H = 1.7, TR = 3.55, DECK_R = TR + 0.85;
  // one level floor for the whole set (on the dome's slope each stool stood at its own height)
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
  // 4: camera left), seen in profile; lift() moves the right hand, so the right-end taster is drawn mirrored and its cup
  // hand is the camera side too.
  const MIRROR = 0;
  const tasters = [Math.PI - 1.62, Math.PI - 0.62, Math.PI, Math.PI + 0.62, Math.PI + 1.62].map((th, i) => {
    const p = makePerson({ height: TASTER, seated: true });
    const x = TABLE.x + Math.sin(th) * TR, z = TABLE.z + Math.cos(th) * TR;
    p.group.position.set(x, TABLE.y, z);
    p.group.rotation.y = Math.atan2(TABLE.x - x, TABLE.z - z);
    if (i === MIRROR) p.group.scale.x = -1;
    p.material.userData.u.uShadeBias.value = 0.34;
    const st = P.makeStool({ h: p.seatH, r: 0.34 });
    st.group.position.set(x, TABLE.y, z);
    st.group.rotation.y = p.group.rotation.y;
    tableSet.add(st.group, p.group);
    layer('table', st.group, p.group);
    p.setPose('sit', 1);
    return p;
  });
  const tableHit = P.makeHitProxy(tableSet, 0.25);
  g.updateMatrixWorld(true);
  const gInv = new THREE.Matrix4();
  // the two cups from the bench stand in the table's middle (BIG of their bench size), names toward the reader
  // (on the rim nearest the reader: the five behind the table stay in view)
  const BIG = 0.5;
  const ON_TABLE = [new V3(TABLE.x - 0.85, TABLE.y + TABLE_H, TABLE.z + TABLE_R - 0.55), new V3(TABLE.x + 0.85, TABLE.y + TABLE_H, TABLE.z + TABLE_R - 0.55)];
  // a tasting cup in front of each of the five, within reach, square to its taster (turned half round for the mirrored
  // one, so the mirrored hand takes it without a spin); the right hand's grip target in the taster's own frame
  const SIP = 1.9;
  const sips = tasters.map((p, i) => {
    // full to the lid (tea is the cup's darker tone): held up to a face, it reads against the pencil body
    const c = P.makeCup({ h: SIP, fill: 0.96 });
    c.body.material.userData.u.uShadeMul.value = 0.8;
    const dir = new V3(TABLE.x - p.group.position.x, 0, TABLE.z - p.group.position.z).normalize();
    const pos = p.group.position.clone().addScaledVector(dir, TR - 1.6);
    pos.y = TABLE.y + TABLE_H;
    const yaw = p.group.rotation.y + (i === MIRROR ? Math.PI : 0);
    const to = p.group.worldToLocal(g.localToWorld(pos.clone())).add(c.handle('R'));
    const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), yaw), new V3(1, 1, 1));
    c.group.visible = false;
    g.add(c.group);
    layer('table', c.group);
    return { c, pos, yaw, to, m, handle: c.handle('R') };
  });

  // =================================================================== lever a: the 上市 sign
  const SIGN = new V3(5.4, 0, 23.6);
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
  const PAST = [new V3(SIGN.x - 0.85, 0, SIGN.z + 0.6), new V3(SIGN.x + 0.7, 0, SIGN.z + 0.35)];
  PAST.forEach((p) => { p.y = gy(p.x, p.z); });

  // =================================================================== hit proxies, shadows, accents
  const headHit = P.makeHitProxy(bed, 1.2);
  // the accents this district switches itself are drawn at full strength wherever they are
  for (const m of [table.material, ...cups.flatMap((c) => [c.lid.material, c.body.material])]) m.userData.u.uAccentAll = { value: 1 };
  g.traverse((o) => { if (o.isMesh) o.userData.cs0 = o.castShadow; });

  // =================================================================== pose: (beat, k, lever) → everything
  const cur = { beat: LAST, k: 1, lever: 'b', emph: null };
  const poseDim = {};
  const Mh = new THREE.Matrix4();
  const tv = new V3(), tv2 = new V3(), tv3 = new V3();
  const yAxis = new V3(0, 1, 0);
  const st = { cupOn: [true, true, true], onTable: [false, false], cupShown: [false, false, false], cardRows: false, sign: false, top: [0, 0, 0], mark: null, sec: 'A' };
  // the accents a pose asks for; applyDim() draws lime only while the district is in focus (an emphasis is set)
  const want = { lid: [false, false, false], body: [false, false, false], red: false, table: false };
  const _ma = new THREE.Matrix4(), _mb = new THREE.Matrix4(), _pa = [new V3(), new THREE.Quaternion(), new V3()], _pb = [new V3(), new THREE.Quaternion(), new V3()];
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
  /** a flight's size: in at the start, out at the very end (it melts into what it lands on) */
  const flightSize = (u) => (u <= 0 || u >= 1 ? 0 : Math.min(1, u / 0.12) * (u > 0.88 ? (1 - u) / 0.12 : 1));

  function pose(beat, k = 1, lever = 'b') {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const L = lever === 'a' ? 'a' : 'b';
    cur.beat = beat; cur.k = k; cur.lever = L;
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i */
    const W = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : clamp((t - a) / (z - a)));
    for (const key in poseDim) poseDim[key] = 0;

    // ---- the head: away and half closed until the question lands; it swings round to the asker, opens, wakes
    {
      const turn = W(0, ...T0.turn), e = back(turn, 1.4);
      pivot.rotation.y = mix(HEAD_YAW + AWAY.yaw, HEAD_YAW, e);
      head.rotation.x = mix(NOD0 + AWAY.nod, NOD0, e);
      setPetals(back(W(0, ...T0.open), 2.2));
      const wv = W(0, ...T0.wave);
      bedU.y = wv <= 0 ? 0 : wv >= 1 ? 2 : wv * 1.2;
      bedU.w = 0.2;      // asleep until asked: faint, so the wave reads as the twins waking
    }
    // ---- the wedges: A (25–34) lit in beat 2 and while its twins go home, B (40–44) from the swap; off for the card
    {
      const a = W(1, ...T1.sec) * (1 - W(2, ...T2.offA));
      const b = W(2, ...T2.lightB) * (1 - sm(W(4, ...T4.mask)));
      secU.y = sm(a); secU.w = sm(b);
      st.sec = beat >= 2 ? 'B' : 'A';
    }
    head.updateWorldMatrix(true, false);
    g.updateMatrixWorld(true);
    Mh.copy(g.matrixWorld).invert().multiply(head.matrixWorld);

    // ---- the cups land on the bench one by one (beat 1)
    for (let j = 0; j < 3; j++) {
      const c = cups[j];
      const r = W(0, T0.cup[j], T0.cup[j] + T0.cupDur);
      st.cupShown[j] = r > 0;
      c.group.visible = r > 0;
      c.group.position.set(CUP_X[j], TOP + (1 - eo(r)) * 2.6, BENCH_Z);
      c.group.quaternion.identity();
      c.group.scale.set(Math.max(1e-3, back(r)), Math.max(1e-3, r < 1 ? mix(1.25, 1, eo(r)) * back(r) : 1), Math.max(1e-3, back(r)));
      st.cupOn[j] = true;
    }
    // lids lime while the three are the question; then the cup the caption names
    for (let j = 0; j < 3; j++) {
      const r = W(0, T0.cup[j], T0.cup[j] + T0.cupDur);
      const q = beat === 0 && r > 0.4;
      const b1 = j === 0 && beat === 1 && t > T1.lime;
      const b2 = j === 1 && beat === 2 && t > T2.lime;
      want.lid[j] = q || b1 || b2;
      want.body[j] = b1 || b2;
    }

    // ---- the columns: the first group's (beat 2), its crash and way home, the second group's (beat 3), into the card
    // the first group's columns stand until they break (beat 3)
    const col1 = (j, tt) => (beat === 2 && tt < T2.crash ? SHARE1[j] * HMAX : 0);
    const colH = (j) => {
      if (beat < 1) return 0;
      if (beat === 1) return SHARE1[j] * HMAX * in1(j, t);
      if (beat === 2) return col1(j, t) + SHARE2[j] * HMAX * in2(j, t);
      if (beat === 3) return SHARE2[j] * HMAX;
      if (beat === 4) return SHARE2[j] * HMAX * (1 - off2(j, t));
      return 0;
    };
    for (let j = 0; j < 3; j++) {
      const c = cups[j], h = colH(j);
      c.stack.visible = h > 0.02;
      c.stack.scale.y = Math.max(1e-3, h);
      // as the other wedge lights the first group's columns shake, the tall one most, and then break (beat 3)
      const wob = beat === 2 && t < T2.crash ? clamp((t - 0.06) / (T2.crash - 0.06)) : 0;
      c.stack.rotation.z = Math.sin(wob * Math.PI * 3) * wob * (j === 0 ? 0.07 : 0.035);
      st.top[j] = h;
      // the frame rises with the first wedge (beat 2), stays through beat 4 (油柑氣泡's folds when it is struck),
      // and folds into the card (beat 5)
      const up = sm(W(1, ...T1.frame));
      const fold = j === 2 ? sm(W(3, ...T3.fold)) : sm(W(4, 0.35, 0.75));
      const f = up * (1 - fold);
      c.frame.group.visible = f > 0.01;
      c.frame.group.scale.set(1, Math.max(1e-3, f), 1);
    }

    // ---- the brand person: raises the question (beat 1), holds the clipboard, turns to watch the table (beat 6)
    if (beat === 0) {
      if (t < T0.lower[0]) person.setPose('raise', sm(W(0, ...T0.raise)), { side: 'L', from: 'stand' });
      else person.setPose('hold', sm(W(0, ...T0.lower)), { from: RAISE });
    } else if (beat < 5) person.setPose('hold', 1, { from: 'hold' });
    else person.setPose('watch', sm(W(5, ...T5.turn)), { yaw: -0.4, pitch: 0.5, from: 'hold' });

    // ---- the question bubble: out of the clipboard, up to the head, into the field's centre
    {
      const a = W(0, T0.bub[0], T0.bub[1]), b = W(0, T0.bub[1], T0.bub[2]);
      bubble.group.visible = a > 0 && b < 1;
      const e = sm(b);
      const B2 = onHead(0, -0.5, 0.8, tv3);
      if (e < 0.55) {
        const u = e / 0.55;
        bubble.group.position.lerpVectors(B0, B1, u);
        bubble.group.position.y += Math.sin(Math.PI * u) * 1.6;
      } else bubble.group.position.lerpVectors(B1, B2, (e - 0.55) / 0.45);
      bubble.group.scale.setScalar(Math.max(1e-3, (0.35 + 0.65 * eo(a)) * (1 - ei((e - 0.7) / 0.3))));
      bubble.group.rotation.set(0, -0.1, 0);
    }

    // ---- twins in flight
    const S = tv, E = tv2;
    const top = (j, h) => E.set(CUP_X[j], TOP + LID + Math.max(0.3, h) + 0.2, BENCH_Z);
    const fromHead = (p) => S.set(p.hx, p.hy, 0.7).applyMatrix4(Mh);
    // the first group: pours in (beat 2) and goes home (beat 3)
    for (let i = 0; i < NS; i++) {
      const p = G1[i];
      let s = 0;
      _v.set(CUP_X[p.j], TOP, BENCH_Z);
      if (beat === 1) {
        const u = (t - p.t0) / p.fl;
        if (u > 0 && u < 1) {
          const end = top(p.j, SHARE1[p.j] * HMAX * in1(p.j, p.t0 + p.fl - 1e-4));
          end.x += p.jx * 0.5; end.z += p.jz * 0.45;
          const ue = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
          arc(fromHead(p), end, ue, 1.0 + p.sp, _v);
          s = flightSize(u);
        }
      }
      _m.compose(_v, _q.identity(), _s.setScalar(Math.max(1e-4, s)));
      twins.setMatrixAt(i, _m);
    }
    // the second group: pours in (beat 3) and flies into the card (beat 5)
    for (let i = 0; i < NS; i++) {
      const p = G2[i];
      let s = 0;
      _v.set(CUP_X[p.j], TOP, BENCH_Z);
      if (beat === 2) {
        const u = (t - p.t0) / p.fl;
        if (u > 0 && u < 1) {
          const end = top(p.j, SHARE2[p.j] * HMAX * in2(p.j, p.t0 + p.fl - 1e-4));
          end.x += p.jx * 0.5; end.z += p.jz * 0.45;
          const ue = u * u * (3 - 2 * u) * 0.65 + u * 0.35;
          arc(fromHead(p), end, ue, 1.0 + p.sp, _v);
          s = flightSize(u);
        }
      } else if (beat === 4) {
        const u = (t - p.tc) / T4.fl;
        if (u > 0 && u < 1) {
          const from = top(p.j, SHARE2[p.j] * HMAX * (1 - off2(p.j, p.tc))).clone();
          from.x += p.jx * 0.5;
          const to = S.set(CARD_AT.x + p.cx, CARD_AT.y + p.cy, CARD_AT.z + 0.3);
          arc(from, to, sm(u), 0.6 + p.sp * 0.6, _v);
          s = flightSize(u) * 0.8;
        }
      }
      _m.compose(_v, _q.identity(), _s.setScalar(Math.max(1e-4, s)));
      twins.setMatrixAt(NS + i, _m);
    }
    // the collapse: the first group's columns break into blocks that fall, lie, and fly home into wedge A
    let anyBlock = false;
    for (let i = 0; i < NC; i++) {
      const p = C[i];
      let s = 0, sy = p.sy;
      _v.set(p.x, p.y, p.z);
      _q.identity();
      if (beat === 2 && t >= T2.crash) {
        const tf = Math.max(0, t - T2.crash - p.d);
        const u = Math.min(tf, p.tl);
        const landed = tf >= p.tl;
        const fallen = tv3.set(p.x + p.vx * u, landed ? p.yl : p.y + p.vy * u - (GRAV / 2) * u * u, p.z + p.vz * u);
        // a little bounce where it lands
        if (landed) fallen.y += Math.abs(Math.sin(Math.min(1, (tf - p.tl) / 0.18) * Math.PI)) * 0.25 * Math.max(0, 1 - (tf - p.tl) / 0.18);
        const rot = p.spin * Math.min(tf, p.tl + 0.1);
        const uh = (t - p.th) / T2.hfl;
        if (uh <= 0) { _v.copy(fallen); s = 1; _q.setFromAxisAngle(p.ax, rot); }
        else if (uh < 1) { arc(fallen, fromHead(p), sm(uh), 1.3 + p.u, _v); s = flightSize(Math.max(0.13, uh)); _q.setFromAxisAngle(p.ax, rot * (1 - uh)); sy = mix(p.sy, BL, sm(uh)); }
        anyBlock = anyBlock || s > 0;
      }
      _m.compose(_v, _q, _s.set(Math.max(1e-4, s), Math.max(1e-4, s * sy), Math.max(1e-4, s)));
      blocks.setMatrixAt(i, _m);
    }
    blocks.instanceMatrix.needsUpdate = true;
    blocks.visible = anyBlock;
    twins.instanceMatrix.needsUpdate = true;
    twins.visible = beat === 1 || beat === 2 || beat === 4;

    // ---- 油柑氣泡 is struck off: the ✕ slams down (beat 4), the cup turns red and is knocked off the bench
    const xDrop = W(3, ...T3.drop), slide = W(3, ...T3.slide);
    X.group.visible = xDrop > 0;
    {
      const e = xDrop * xDrop;
      X.group.position.y = 0.74 * CUP_H + (1 - e) * 7;
      const sq = W(3, T3.drop[1], T3.drop[1] + 0.2);
      X.group.scale.set(1 + 0.22 * Math.sin(Math.PI * sq), 1 - 0.16 * Math.sin(Math.PI * sq), 1);
    }
    want.red = beat >= 3 && (beat > 3 || t >= T3.drop[1]);
    if (beat >= 3 && slide <= 0 && xDrop >= 1) {
      // the slam jolts the cup
      const j = W(3, T3.drop[1], T3.drop[1] + 0.22);
      cups[2].group.scale.set(1 + 0.08 * Math.sin(Math.PI * j), 1 - 0.1 * Math.sin(Math.PI * j), 1 + 0.08 * Math.sin(Math.PI * j));
    }
    if (slide > 0) {
      // knocked over: it slides to the bench's end, then tips over to the left, pivoting on its base rim
      const a = sm(clamp(slide / 0.3)), b = clamp((slide - 0.3) / 0.7), e = b * b * (b * (6 * b - 15) + 10);
      const land = b < 0.8 ? 0 : Math.sin(Math.PI * (b - 0.8) / 0.2) * 0.06;
      const th = FALLEN.rot * e - land;
      const pv = mix(FALLEN.x0 - FALLEN.rb, FALLEN.x - FALLEN.rb * Math.cos(FALLEN.rot), e);
      const x0 = mix(CUP_X[2], FALLEN.x0, a);
      cups[2].group.position.set(b > 0 ? pv + FALLEN.rb * Math.cos(th) : x0, TOP + FALLEN.rb * Math.sin(Math.max(0, th)), BENCH_Z);
      cups[2].group.rotation.set(0, 0, th);
      cups[2].group.scale.set(1, 1, 1);
      st.cupOn[2] = slide < 0.3;
    }
    // the struck flavour stays red with its ✕ while its beat lasts, then drops to contour
    poseDim['cup-yougan'] = beat >= 4 ? 1 : 0;
    // while it is struck the other two columns stay half drawn beside its empty frame (the comparison)
    poseDim.cols = beat === 3 ? 0.5 : -1;

    // ---- the result card grows where the columns stood, out of their twins (beat 5)
    {
      const a = W(4, ...T4.card);
      card.group.visible = a > 0;
      const e = eo(a);
      card.group.position.copy(CARD_AT);
      card.group.position.y += (1 - e) * 1.2;
      card.group.rotation.set(0, CARD_YAW, (1 - e) * 0.12);
      card.group.scale.setScalar(Math.max(1e-3, 0.25 + 0.75 * e));
      st.cardRows = W(4, T4.rows, T4.rows + 0.01) >= 1;
      post.visible = a >= 1;
      const hb = W(4, ...T4.bar);
      bar.visible = beat === 4 && hb > 0 && L === 'b';
      bar.scale.x = Math.max(1e-3, barW * eo(hb));
    }

    // ---- the decision (beat 6): b — two cups down to the table, two real people drink; a — to the 上市 sign
    st.sign = false;
    sign.visible = beat === 5 && L === 'a';
    want.table = beat === 5 && L === 'b' && t > T5.cup[1][1];
    st.mark = beat === 4 && W(4, T4.bar[0], T4.bar[0] + 0.01) >= 1 && L === 'b' ? 'lime' : beat === 5 && L === 'a' && W(5, 1.2, 1.21) >= 1 ? 'red' : null;
    red.visible = false;
    st.onTable = [false, false];
    for (const ti of [0, 1, 2, 3, 4]) tasters[ti].setPose('sit', 1, { from: 'sit' });
    for (const sp of sips) sp.c.group.visible = false;
    if (beat === 5) {
      if (L === 'b') {
        // the two cups go down to the table, into the middle
        for (const j of [0, 1]) {
          const c = cups[j], gl = sm(W(5, ...T5.cup[j]));
          if (gl > 0) st.cupOn[j] = false;
          st.onTable[j] = gl >= 1;
          const from = tv2.set(CUP_X[j], TOP, BENCH_Z);
          c.group.position.lerpVectors(from, ON_TABLE[j], gl);
          c.group.position.y += Math.sin(Math.PI * gl) * 2.4;
          c.group.quaternion.identity();
          c.group.scale.setScalar(mix(1, BIG, gl));
        }
        // a tasting cup for each; each taster reaches, takes it and drinks from it
        g.updateMatrixWorld(true);
        gInv.copy(g.matrixWorld).invert();
        sips.forEach((sp, i) => {
          const p = tasters[i], o = T5.ord[i];
          const pop = W(5, T5.pop + o * 0.5, T5.pop + o * 0.5 + T5.popDur);
          const reach = sm(W(5, T5.reach + o, T5.reach + o + T5.rd));
          const drink = sm(W(5, T5.reach + o + T5.rd, T5.reach + o + T5.rd + T5.dd));
          sp.c.group.visible = pop > 0;
          const vReach = p.pose('lift', { to: sp.to });
          if (drink <= 0) p.apply(p.blend(p.pose('sit'), vReach, reach));
          else p.apply(p.blend(vReach, p.pose('lift', { cup: SIP }), drink));
          if (drink <= 0) {
            sp.m.decompose(sp.c.group.position, sp.c.group.quaternion, sp.c.group.scale);
            sp.c.group.scale.setScalar(Math.max(1e-3, back(pop, 2.4)));
          } else {
            p.group.updateMatrixWorld(true);
            const grip = p.hand('R');
            grip.updateWorldMatrix(true, false);
            _ma.multiplyMatrices(gInv, grip.matrixWorld).multiply(_mb.makeTranslation(-sp.handle.x, -sp.handle.y, -sp.handle.z));
            lerpM(sp.m, _ma, sm(drink / 0.35), _mb);
            _mb.decompose(sp.c.group.position, sp.c.group.quaternion, sp.c.group.scale);
          }
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
    column: ['col-lychee', 'twins'],
    'column-b': ['col-brown', 'twins'],
    'cup-lychee': ['cup-lychee', 'col-lychee', 'stage'],
    'cup-brown': ['cup-brown', 'col-brown', 'stage'],
    'cup-yougan': ['cup-yougan', 'col-yougan', 'stage', 'twins'],
    card: ['card', 'twins'], 'row-direct': ['card'], 'row-model': ['card'], 'row-scen': ['card', 'twins'],
    table: ['table'],
    person: ['person', 'bubble', 'stage'],
    'launch-sign': ['sign'],
  };
  // the held result (the story emphasises these at the end): the simulation's card and the real people trying the two
  // cups, with the bench and dais kept as their setting; the flower and its field drop to contour like everything else
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
    // accents: lime only in focus; red marks the struck flavour while its beat lasts
    const on = !!cur.emph, lime = ACCENT.lime;
    for (let j = 0; j < 3; j++) {
      cups[j].lid.material.userData.u.uAccent.value = on && want.lid[j] ? lime : 0;
      cups[j].body.material.userData.u.uAccent.value = on && j === 2 && want.red ? ACCENT.red : on && want.body[j] ? lime : 0;
    }
    table.material.userData.u.uAccent.value = on && want.table ? lime : 0;
    // the ✕ is red in focus; on the map (everything at full) it rests in plain type, like every other mark there
    X.material.userData.u.uAccent.value = on ? ACCENT.red : 0;
    for (const [name, objs] of Object.entries(layers)) {
      let a = !ids2 ? 0 : full.has(name) ? 0 : name === 'flower' && half ? 0.45 : 1;
      const pd = name === 'cup-yougan' || name === 'col-yougan' ? poseDim['cup-yougan'] || 0 : name === 'table' ? poseDim.table || 0 : 0;
      if (ids2) a = Math.max(a, pd);
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
  const PH = 4.5;
  const PSIDE = [W3(PERSON.x + 1.1, PERSON.y + PH * 0.75, PERSON.z), W3(PERSON.x + 0.6, PERSON.y, PERSON.z)];
  // shot A: the head's lower two thirds, the bench with its cups and their frames, the brand person
  const A_stage = [W3(-BENCH_W / 2, TOP, BENCH_Z), W3(BENCH_W / 2, TOP, BENCH_Z), W3(CUP_X[0] - 1.2, TOP + LID + HMAX, BENCH_Z),
    W3(CUP_X[2] + 1.2, TOP + LID + HMAX, BENCH_Z), W3(PERSON.x, PERSON.y + PH, PERSON.z), W3(PERSON.x, PERSON.y, PERSON.z), ...PSIDE];
  const A_pts = [disk(0, 0.5 * RH), disk(-RH, 0), disk(RH, 0), ...A_stage];
  // a short landscape screen (about 932 × 430) crops the head's upper part, so the stage keeps its size
  const A_low = [disk(0, -0.2 * RH), disk(-0.85 * RH, -0.35 * RH), disk(0.85 * RH, -0.35 * RH), ...A_stage];
  const flat = () => typeof innerHeight === 'number' && innerHeight < 560 && innerWidth > innerHeight;
  const shotA = () => (flat() ? A_low : A_pts);
  // the pours (desk): the head's lower half, where the wedges are, over the bench and the frames
  const A2_pts = [disk(0, 0.12 * RH), disk(-0.92 * RH, -0.25 * RH), disk(0.92 * RH, -0.25 * RH), ...A_stage];
  const cH = CARD_H * Math.cos(LEAN), cB = CARD_H * Math.sin(LEAN);
  const cardCorners = () => [W3(CARD_AT.x - CARD_W / 2, CARD_AT.y, CARD_AT.z), W3(CARD_AT.x + CARD_W / 2, CARD_AT.y, CARD_AT.z),
    W3(CARD_AT.x - CARD_W / 2, CARD_AT.y + cH, CARD_AT.z - cB), W3(CARD_AT.x + CARD_W / 2, CARD_AT.y + cH, CARD_AT.z - cB)];
  const B_pts = [...CUP_X.map((x) => W3(x - 1.2, TOP + CUP_H, BENCH_Z)), W3(CUP_X[2] + 1.2, TOP, BENCH_Z), W3(CUP_X[0] - 1.2, DAIS_TOP, BENCH_Z + 0.8), ...cardCorners(),
    W3(PERSON.x, PERSON.y + PH, PERSON.z), ...PSIDE];
  const tasterTops = tasters.map((p) => { p.group.updateMatrixWorld(true); return p.top(); });
  // the end: the table in front (the subject), the bench, the ✕ cup and the card behind it, the brand person watching
  // (the card with its rows, the brand person's head and shoulders)
  const C_pts = [W3(TABLE.x, TABLE.y, TABLE.z + TABLE_R + 0.3), W3(TABLE.x - TR - 0.5, TABLE.y, TABLE.z), W3(TABLE.x + TR + 0.5, TABLE.y, TABLE.z),
    ...tasterTops, W3(PERSON.x + 0.5, PERSON.y + PH, PERSON.z), W3(PERSON.x, PERSON.y + PH * 0.5, PERSON.z),
    W3(CARD_AT.x - CARD_W * 0.42, CARD_AT.y + cH * 0.96, CARD_AT.z - cB), W3(CARD_AT.x + CARD_W * 0.3, CARD_AT.y + cH * 0.9, CARD_AT.z - cB)];
  // a short landscape screen: the table, its people and the brand person large, the card from its middle down
  const C_low = [W3(TABLE.x, TABLE.y, TABLE.z + TABLE_R + 0.3), W3(TABLE.x - TR - 0.5, TABLE.y, TABLE.z), W3(TABLE.x + TR + 0.5, TABLE.y, TABLE.z),
    ...tasterTops, W3(PERSON.x + 0.5, PERSON.y + PH, PERSON.z), W3(PERSON.x, PERSON.y + PH * 0.5, PERSON.z),
    W3(CARD_AT.x - CARD_W * 0.42, CARD_AT.y + cH * 0.8, CARD_AT.z - cB), W3(CARD_AT.x + CARD_W * 0.3, CARD_AT.y + cH * 0.8, CARD_AT.z - cB)];
  const shotC = () => (flat() ? C_low : C_pts);
  const shots = {
    phone: [
      { az: STAGE_AZ, el: 0.22, anchors: shotA },
      { az: STAGE_AZ, el: 0.22, anchors: shotA },
      { az: STAGE_AZ, el: 0.3, anchors: () => B_pts },
      { az: STAGE_AZ, el: 0.44, anchors: shotC },
    ],
    desk: [
      { az: STAGE_AZ, el: 0.22, anchors: shotA },
      { az: STAGE_AZ, el: 0.24, anchors: () => A2_pts },
      { az: STAGE_AZ, el: 0.3, anchors: () => B_pts },
      { az: STAGE_AZ, el: 0.4, anchors: () => C_pts },
    ],
  };

  const tableFoot = () => { table.group.updateWorldMatrix(true, false); return table.group.localToWorld(new V3(0, 0, DECK_R - 0.15)); };
  const cupMid = (j) => () => { const c = cups[j]; c.group.updateWorldMatrix(true, false); return c.group.localToWorld(new V3(0, 0.45 * CUP_H, 0)); };
  /** the top right corner of cup j's column (where its label's leader ends) */
  const colTop = (j) => () => { const c = cups[j]; c.group.updateWorldMatrix(true, false); return c.group.localToWorld(new V3(0.98, LID + Math.max(0.2, st.top[j]), 0.62)); };
  const secMid = () => { const [x, y] = wedgeXY(st.sec === 'A' ? SEC_A : SEC_B, 0, 0.6); return onHeadW(x, y, 0.3); };
  const labelAt = {
    head: () => onHeadW(-0.42 * RH, 0.3 * RH, 0.3),
    sector: secMid,
    column: colTop(0),
    'column-b': colTop(1),
    // the cup's top as it stands, then as it lies: the lid's crown while upright, the upturned side of the lid end once
    // knocked over, so the label sits above the cup (not on it) and clear of the ✕ at every moment of the fall
    'cup-yougan': () => {
      const c = cups[2], f = clamp(c.group.rotation.z / FALLEN.rot);
      c.group.updateWorldMatrix(true, false);
      return c.group.localToWorld(new V3(mix(0, 0.3 * CUP_H, f), mix(0.985, 0.8, f) * CUP_H, 0.1 * CUP_H));
    },
    // at the front of the set's floor: the label then sits over the table's foot (lever a leaves the table unused)
    table: () => (cur.lever === 'a' && cur.beat === LAST ? null : tableFoot()),
  };
  const decalAt = {
    // on the bench, and again on the tasting table
    'cup-lychee': () => (st.cupShown[0] && st.cupOn[0] ? cups[0].decalAnchor() : null),
    'cup-brown': () => (st.cupShown[1] && st.cupOn[1] ? cups[1].decalAnchor() : null),
    'cup-yougan': () => (st.cupShown[2] && st.cupOn[2] ? cups[2].decalAnchor() : null),
    card: () => (st.cardRows ? card.rowAnchors(ROWS, { align: 'left' }) : null),
    'launch-sign': () => { if (!st.sign) return null; sign.updateWorldMatrix(true, false); return sign.localToWorld(new V3(0, 4.15, 0.22)); },
  };
  // hotspots just outside the card, one per checkbox row, at the row's height: 模型估計 on the left, the other two on
  // the right, 情境模擬's a ring further out (past the highlighter and lever a's red ✕, which run out on that side).
  const RING_X = { 1: CARD_W / 2 + 0.9, 2: -(CARD_W / 2 + 1.0), 3: CARD_W / 2 + 3.3 };
  const rowAt = (i) => () => onCard(RING_X[i] + (i === SCEN && flat() ? 0.9 : 0), rowZ(i));
  /** the lit wedge's outline on the head (head-local) */
  const wedgePts = () => {
    const a0 = st.sec === 'A' ? SEC_A : SEC_B, out = [];
    for (const a of [-0.4, -0.2, 0, 0.2, 0.4]) for (const r of [0.22, 0.6, 1]) out.push(wedgeXY(a0, a, r));
    return out;
  };
  const parts = {
    head: { hit: headHit, anchor: () => onHeadW(0, 0.12 * RH, 0.4), beat: 0 },
    // parts that are not tapped (no proxy) still say where they are, for the verifier's size checks
    sector: { hit: null, anchor: secMid, beat: 1, box: () => new THREE.Box3().setFromPoints(wedgePts().map(([x, y]) => onHeadW(x, y, 0.3))) },
    column: { hit: null, anchor: colTop(0), beat: 1, object: cups[0].frame.group },
    'column-b': { hit: null, anchor: colTop(1), beat: 2, object: cups[1].frame.group },
    'cup-lychee': { hit: cups[0].hit, anchor: cupMid(0), beat: 1 },
    'cup-brown': { hit: cups[1].hit, anchor: cupMid(1), beat: 2 },
    'cup-yougan': { hit: cups[2].hit, anchor: cupMid(2), beat: 3 },
    card: { hit: null, anchor: () => onCard(0, 0), beat: 4, object: card.group },
    'row-direct': { hit: rowHits[0].h, anchor: rowAt(1), beat: 4 },
    'row-model': { hit: rowHits[1].h, anchor: rowAt(2), beat: 4 },
    'row-scen': { hit: rowHits[2].h, anchor: rowAt(3), beat: 4 },
    // its hotspot ring sits where the label's leader ends, under the label
    table: { hit: tableHit, anchor: () => (cur.lever === 'a' && cur.beat === LAST ? table.surface(0, -1.5) : tableFoot()), beat: 5 },
    person: { hit: personHit, anchor: () => person.chest(), beat: 0 },
    'launch-sign': { hit: null, anchor: () => { sign.updateWorldMatrix(true, false); return sign.localToWorld(new V3(0, 4.15, 0.22)); }, beat: 5, object: sign },
  };

  const rest = () => pose(LAST, 1, 'b');
  rest();
  const pin = disk(0, RH * 1.02);
  // the seed bed at the head's rest pose, for d-twins (whose twins walk into it): its centre, its outward normal, its
  // in-plane axes (x toward the asker's side, y up the face) and radius, all in world space; point(x, y) for x, y in
  // −1 … 1 of the radius
  const seedBed = (() => {
    const c = disk(0, 0), ex = disk(RH, 0).sub(c).normalize(), ey = disk(0, RH).sub(c).normalize();
    const n = new V3().crossVectors(ex, ey).normalize();
    return { center: c, normal: n, ex, ey, radius: RH, point: (x, y) => c.clone().addScaledVector(ex, x * RH).addScaledVector(ey, y * RH) };
  })();

  return {
    id: 'core',
    group: g,
    zone: 'consumer',
    // the map pill above the flower
    anchor: new V3(0, 38, 0),
    // optional, for the UI: where accents should be at full strength while the district is in focus
    focus: { pos: g.localToWorld(new V3(1, 15, 9.5)), r: 31 },
    pin,
    seedBed,
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    // optional, for the overlay: a mark on one row of a card decal, { row (0-based), kind: 'lime' | 'red' } or null.
    decalMark: { card: () => (st.mark ? { row: SCEN, kind: st.mark } : null) },
    // the card's rows a little larger than the overlay's default (0.55): they still show on a phone held sideways
    decalUnit: { card: 0.66 },
    lever: { fromBeat: 5, options: ['a', 'b'], def: 'b' },
    mainActor: 'person',
    restParts: REST,
    pose,
    rest,
    ambient() {},
    emphasize,
    update(t, dt) { this.ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { person: person.group, tasters: tasters.map((p) => p.group), cups: cups.map((c) => c.group), card: card.group, table: table.group, bubble: bubble.group, X: X.group, sign, head, pivot },
  };
}
