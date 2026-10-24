// 判斷力 · judgement (articles 14, 1, 5) — on the shore, TH 200°, r 79.
// The book's verdict acted out (design §12.2, districts §1): an AI printer spills a heap of proposal cards over a long
// low table; a person walks along the heap, picks one card, lays it on the table's edge and stamps it; three AI cubes
// carry it onto a short pier, where it becomes a road drawn inward into the AI zone.  Execution goes to AI; the
// judgement, and the seal, stay with the person.
//
// Staging: the person works from behind the table (between the table and the printer), so the pick, the card held up
// and the stamp all face the reader; the heap lies in front of them, the pier and the road beyond, toward the centre.
// Local frame: +x points inward (toward people), z runs along the shore, y = 0 is the shore at the district's centre.
// Everything that explains is a pure function of (beat, k, lever): pose().  The words live in world.json.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp } from './kit.js';
import { heightAt, SEA_Y } from './terrain.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';
import { mapInk, mapOnly, mapPaint as mapPaintOf, groundPlate, roundRect } from './mapcue.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), XAX = new V3(1, 0, 0), ZAX = new V3(0, 0, 1);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;

// ------------------------------------------------------------------ the set (local units)
const H = 5;                                            // the person: the largest in the world
const TBL = { x: -0.8, z: 0, w: 3, d: 9, h: 1.2 };     // the long low table (w along x, d along z)
const BACK_EDGE = TBL.x - TBL.w / 2;                    // the person's side of the table
const PRN = { x: -6.9, z: -4.5, w: 3.2, h: 2.6, d: 2.4 }; // the AI printer behind the person, slot facing +x
const CARD = { w: 1.6, d: 1.1, t: 0.04 };
const CARD_X = BACK_EDGE + CARD.d / 2 - 0.12;           // a card on the person's edge, overhanging a little
const CARD_YAW = -Math.PI / 2;                          // its rows read from the person's side
const WALK_X = BACK_EDGE - 1.15;                        // the person's line along the heap
// where the person stands back after the stamp: back and to the side, so that in every shot B (and from the reader's
// usual orbit) the figure stands clear of the printer instead of in front of it
const BACK_X = WALK_X - 1.1, BACK_DZ = 1.4;
const P0 = { x: WALK_X, z: -6.7 };                      // where the person starts: beside the printer, past the table's end
// the five shortlisted cards, on the person's edge; listed from the reader's left (+z) so 方案 1 is the leftmost
const PICK_Z = [3.6, 1.8, 0, -1.8, -3.6];
const DEF = 2;                                          // the card the story picks
const PIER = { x: 5, z: 2, len: 6, w: 2.4 };
const CUBE = 1.2;                                       // big enough to read as three cubes on the phone (≈ 28 px each)
const ROAD_W = 2.2;
const STRIDE = 0.4 * H;
const SEAL = { r: 0.35, h: 0.6 };                       // the spec's seal: a graphite block under a pale handle
const HEAP_REST = 0.45;   // the heap when it is not the subject: no teal, lighter, its typed lines kept (a heap still)

const BEATS = [
  // 1 AI 幾秒就給出一大堆方案 — the printer shudders and spills thirty cards; the person steps back
  { dur: 5.2, keyAt: 1.4, shot: 0, parts: ['printer', 'heap', 'person'] },
  // 2 哪一個值得做，由人判斷 — the person walks along the heap, picks one card and holds it up
  { dur: 5.6, keyAt: 2.3, shot: 0, parts: ['person', 'card'] },
  // 3 蓋章的人，要為結果負責 — the card goes on the table's edge; the seal comes down; the mark appears
  { dur: 4.5, keyAt: 0.9, shot: 0, parts: ['card', 'person'] },
  // 4 選定了，執行再交給 AI — three cubes carry the card onto the pier; it becomes a road into the AI zone
  // (the card goes with them: lifted, carried, then laid at the pier's end as the head of the road)
  { dur: 5.8, keyAt: 2.2, shot: 1, parts: ['road', 'cubes', 'person', 'card'] },
];
// beat-local times of the key events (seconds)
const T2 = { turn: 0.3, walk: 1.75, reach: 2.1, held: 2.6 };
const T3 = { lay: 0.5, down: 0.7, mark: 0.8, up: 1.2, back: 2.0 };
const T4 = { out: 0.8, lift: 1.2, carry: 2.6, laid: 3.0, road0: 2.8, road1: 3.9, travel0: 3.6, travel1: 5.8 };

// ------------------------------------------------------------------ pose vectors (people.js, normalised units)
const hc = (h) => ({ p: h.p.clone(), pole: h.pole.clone(), grip: h.grip.clone() });
const fc = (f) => ({ p: f.p.clone(), q: f.q.clone() });
function clonePose(v) {
  return {
    hips: { p: v.hips.p.clone(), q: v.hips.q.clone() }, waist: v.waist.clone(), neck: v.neck.clone(), head: v.head.clone(),
    hand: { L: hc(v.hand.L), R: hc(v.hand.R) }, foot: { L: fc(v.foot.L), R: fc(v.foot.R) },
  };
}
// the body mirrored left ↔ right (x → −x): a left-handed stamp from the right-handed one
const mq = (q) => new Q(q.x, -q.y, -q.z, q.w);
const mv = (v) => new V3(-v.x, v.y, v.z);
function mirrorPose(v) {
  const hm = (h) => ({ p: mv(h.p), pole: mv(h.pole), grip: mq(h.grip) });
  const fm = (f) => ({ p: mv(f.p), q: mq(f.q) });
  return {
    hips: { p: mv(v.hips.p), q: mq(v.hips.q) }, waist: mq(v.waist), neck: mq(v.neck), head: mq(v.head),
    hand: { L: hm(v.hand.R), R: hm(v.hand.L) }, foot: { L: fm(v.foot.R), R: fm(v.foot.L) },
  };
}
// the same body seen from a root that is turned by a and moved by (tx, tz) (normalised units)
function movePose(v, a, tx, tz) {
  const q = new Q().setFromAxisAngle(YAX, a), t = new V3(tx, 0, tz);
  const o = clonePose(v);
  o.hips.p.applyQuaternion(q).add(t); o.hips.q.premultiply(q);
  for (const s of ['L', 'R']) {
    o.foot[s].p.applyQuaternion(q).add(t); o.foot[s].q.premultiply(q);
    o.hand[s].p.applyQuaternion(q).add(t); o.hand[s].pole.applyQuaternion(q); o.hand[s].grip.premultiply(q);
  }
  return o;
}
/** a pose held at root `from` ({ x, z, yaw }), expressed in root `to`: blending it to a pose at `to` steps the feet */
function reframe(v, from, to) {
  const c = Math.cos(to.yaw), s = Math.sin(to.yaw);
  const dx = from.x - to.x, dz = from.z - to.z;
  // the inverse of the turn by to.yaw: (x, z) → (x cos − z sin, x sin + z cos)
  return movePose(v, from.yaw - to.yaw, (dx * c - dz * s) / H, (dx * s + dz * c) / H);
}
// a point and a direction given in the pose's chest (waist) frame, in its root frame (as people.js computes them)
const chestQ = (v) => v.hips.q.clone().multiply(v.waist);
const chestPt = (v, x, y, z) => new V3(x, y, z).applyQuaternion(v.waist).add(new V3(0, 0.066, -0.004)).applyQuaternion(v.hips.q).add(v.hips.p);
const chestDir = (v, x, y, z) => new V3(x, y, z).applyQuaternion(chestQ(v));
/** the left hand carries the seal: hanging by the hip (or tucked in front while leaning), the seal upright */
function sealHand(v, tucked = false) {
  const h = v.hand.L;
  h.p.copy(tucked ? chestPt(v, 0.15, -0.07, 0.12) : chestPt(v, 0.176, -0.16, 0.03));
  h.pole.copy(chestDir(v, 0.4, -0.1, -1));
  h.grip.identity();
  return v;
}

/** the left hand holds the seal up in front, outside the body's outline, as one shows a stamp just used */
function sealShown(v) {
  const h = v.hand.L;
  h.p.copy(chestPt(v, 0.2, 0.1, 0.17));
  h.pole.copy(chestDir(v, 0.9, -0.7, -0.4));
  h.grip.identity();
  return v;
}

/** facing yaw (group.rotation.y) for a person at (x, z) who looks at (tx, tz) */
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

/** the twelve edges of a box (w × h × d, from y0 up, centred on x and z) as thin bars: one geometry */
function edgeBars(w, h, d, { y0 = 0, th = 0.07, grow = 0.01 } = {}) {
  const bars = [], x = w / 2 + grow, z = d / 2 + grow, y1 = y0 + h;
  const P = (sx, y, sz) => new V3(sx * x, y, sz * z);
  const bar = (a, b) => {
    const dir = new V3().subVectors(b, a), L = dir.length();
    const geo = new THREE.BoxGeometry(th, L + th, th);
    geo.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, dir.normalize()), new V3(1, 1, 1)));
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    bars.push(geo.toNonIndexed());
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(P(sx, y0, sz), P(sx, y1, sz));
  for (const y of [y0, y1]) {
    for (const sz of [-1, 1]) bar(P(-1, y, sz), P(1, y, sz));
    for (const sx of [-1, 1]) bar(P(sx, y, -1), P(sx, y, 1));
  }
  return mergeGeometries(bars);
}
/** typed faces told apart by tone (a typed surface has no outline): the top light, the sides a step or two darker */
function faceTones(geo, { top = 1, px = 0.5, nx = 0.6, pz = 0.78, nz = 0.6, bottom = 0.5 } = {}) {
  const n = geo.attributes.normal, c = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
    const t = y > 0.6 ? top : y < -0.6 ? bottom : Math.abs(x) > Math.abs(z) ? (x > 0 ? px : nx) : (z > 0 ? pz : nz);
    c[i * 3] = t; c[i * 3 + 1] = -1; c[i * 3 + 2] = -1;   // shade multiplier; keep the material's style and accent
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

export function buildJudge() {
  const g = new THREE.Group();
  g.name = 'judge';
  const TH = 200, RR = 79;
  const base = polar(RR, TH);
  g.position.copy(base);
  const inward = new THREE.Vector3(-base.x, 0, -base.z).normalize();
  g.rotation.y = Math.atan2(-inward.z, inward.x);   // local +x → toward people
  g.updateMatrixWorld(true);
  const AZ0 = Math.atan2(inward.z, inward.x);         // world azimuth of local +x
  const gInv = g.matrixWorld.clone().invert();
  const W = (x, y, z) => g.localToWorld(new V3(x, y, z));
  const _gw = new V3();
  /** shore height under a local point (local y) */
  const gy = (x, z) => { _gw.set(x, 0, z).applyMatrix4(g.matrixWorld); return heightAt(_gw.x, _gw.z) - base.y; };
  const seaY = SEA_Y - base.y;
  const R = rng(14);

  // ---- the AI printer (typed; teal when it is the subject)
  const printer = P.makePrinter({ w: PRN.w, h: PRN.h, d: PRN.d });
  // a typed box has no outline, so in full teal it read as a flat hexagon: its faces get their own tones and its
  // edges a graphite line, and it reads as a machine
  faceTones(printer.body.geometry, { top: 1.05, px: 0.5, pz: 0.8 });
  printer.body.material.vertexColors = true;
  {
    const e = new THREE.Mesh(edgeBars(PRN.w, PRN.h * 0.9, PRN.d, { th: 0.075 }), ink({ accent: 'ink' }));
    e.name = 'printer-edges'; e.castShadow = false;
    printer.group.add(e);
  }
  const prY = gy(PRN.x, PRN.z);
  printer.group.position.set(PRN.x, prY, PRN.z);
  g.add(printer.group);
  const slot = new V3(PRN.x + PRN.w / 2 + 0.05, prY + PRN.h * 0.6, PRN.z);

  // ---- the long low table
  const table = P.makeTable({ w: TBL.w, d: TBL.d, h: TBL.h });
  const tY = gy(TBL.x, TBL.z);
  table.group.position.set(TBL.x, tY, TBL.z);
  g.add(table.group);
  const TOP = tY + TBL.h;

  // ---- thirty proposal cards: one InstancedMesh, one shared hook.  Rest places: the five on the person's edge (the
  // shortlist), two rows over the rest of the table, some fallen off the front edge, some spilled past the table's ends.
  const N = 30;
  const heap = P.makeCardInstanced(N, { w: CARD.w, d: CARD.d, t: CARD.t, seed: 14 });
  g.add(heap);
  const rest = [];   // { p: V3 (bottom face centre), yaw }
  const onTable = (x, z, layer, yaw) => rest.push({ p: new V3(x, TOP + 0.003 + layer * 0.042, z), yaw });
  PICK_Z.forEach((z) => onTable(CARD_X, z + (R() - 0.5) * 0.12, 2, CARD_YAW + (R() - 0.5) * 0.1));
  for (let i = 0; i < 7; i++) onTable(TBL.x + (R() - 0.5) * 0.3, -3.9 + i * 1.3 + (R() - 0.5) * 0.35, 1, CARD_YAW + (R() - 0.5) * 1.1);
  for (let i = 0; i < 6; i++) onTable(TBL.x + 0.95 + (R() - 0.5) * 0.25, -3.6 + i * 1.44 + (R() - 0.5) * 0.35, 0, CARD_YAW + (R() - 0.5) * 1.3);
  // fallen off the front edge
  for (const z of [-4.4, -2.6, -0.8, 1.0, 2.8, 4.5]) {
    const x = TBL.x + TBL.w / 2 + 0.55 + (R() - 0.5) * 0.4, zz = z + (R() - 0.5) * 0.4;
    rest.push({ p: new V3(x, gy(x, zz) + 0.012, zz), yaw: R() * Math.PI });
  }
  // spilled past the ends of the table
  for (const [x, z] of [[-0.6, 5.1], [0.9, 5.4], [0.1, 5.95], [-0.4, -5.15], [1.0, -5.45], [0.2, -6.0]]) {
    const xx = TBL.x + x + (R() - 0.5) * 0.3, zz = z + (R() - 0.5) * 0.3;
    rest.push({ p: new V3(xx, gy(xx, zz) + 0.012 + (rest.length % 2) * 0.03, zz), yaw: R() * Math.PI });
  }
  const restQ = rest.map((c) => new Q().setFromAxisAngle(YAX, c.yaw));
  // the order the printer spits them out: shuffled, so the pile grows all over at once
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const emitAt = new Array(N);
  // 0.3 … 1.3 s: eight per second; then the rest in 1.2 s (about eighteen per second)
  order.forEach((ci, n) => { emitAt[ci] = n < 8 ? 0.3 + n / 8 : 1.3 + ((n - 8) / (N - 8)) * 1.2; });
  const FLY = 0.55;
  const SL = [0, 1, 2, 3, 4];   // heap indices of the shortlist (the lever's five)

  const _m = new M4(), _p = new V3(), _q = new Q(), _q2 = new Q(), _s = new V3(1, 1, 1);
  const TINY = new V3(1e-4, 1e-4, 1e-4), ONE = new V3(1, 1, 1);
  for (let i = 0; i < N; i++) heap.setCard(i, _m.compose(rest[i].p, restQ[i], ONE));
  // the shortlist lifted into a fan, tilted up toward the reader (only while the reader is choosing)
  const liftedM = SL.map((i, j) => {
    const c = rest[i], o = j - 2;
    const q = new Q().setFromAxisAngle(ZAX, -0.5).multiply(new Q().setFromAxisAngle(YAX, CARD_YAW - o * 0.1));
    // spread wider than they lie (2.9 units apart), so their 44 px rings stay apart on a phone held sideways too
    return new M4().compose(new V3(c.p.x + 0.25, c.p.y + 0.5 + 0.22 * (1 - Math.abs(o) / 2), c.p.z * 1.6), q, ONE);
  });

  // ---- the person with the seal (the decisive actor)
  const person = makePerson({ height: H });
  // seen from the side away from the sun in both shots: the shade is lifted so the figure stays a drawing, not a
  // hatched silhouette (its dark joints still carry the articulation)
  person.material.userData.u.uShadeBias.value = 0.36;
  // the seal: a graphite block (solid ink, like the mark it leaves) under a pale turned handle and knob.  Drawn all
  // pale it read as a bag by the hip, all black as a kettlebell; the two tones give the stamp its shape.
  const seal = (() => {
    const grp = new THREE.Group(); grp.name = 'seal';
    const { r, h } = SEAL;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, h, 22).translate(0, h / 2, 0), ink({ accent: 'ink' }));
    const handle = mergeGeometries([
      new THREE.CylinderGeometry(r * 0.42, r * 0.62, h * 0.22, 16).translate(0, h * 1.11, 0),
      new THREE.CylinderGeometry(r * 0.26, r * 0.32, h * 0.42, 12).translate(0, h * 1.43, 0),
      new THREE.SphereGeometry(r * 0.5, 16, 12).translate(0, h * 1.64 + r * 0.32, 0),
    ].map((x) => { x = x.toNonIndexed(); for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); return x; }));
    const top = new THREE.Mesh(handle, ink({ shade: 1.0, bias: 0.12 }));
    for (const m of [base, top]) { m.castShadow = m.receiveShadow = true; grp.add(m); }
    const knobY = h * 1.64 + r * 0.32;
    return { group: grp, handle: () => new V3(0, knobY, 0) };
  })();
  person.hold('L', seal);
  g.add(person.group);
  const knobY = seal.handle().y;

  // ---- the picked card (a card of its own: lime when it is the subject) and the seal's imprint on it
  const card = P.makeCard({ w: CARD.w, d: CARD.d, t: CARD.t, seed: 7 });
  g.add(card.group);
  card.group.visible = false;
  const mark = new THREE.Group();
  {
    // the seal's imprint, drawn when the word is not: once the card lies at the head of the road (where the end
    // state's hotspot ring sits on it), and on the map.  While the word 核准 (HTML, in its own seal frame) shows, a 3D
    // frame under it, seen in perspective, would cross the screen-square one and the glyphs
    const markMat = ink({ accent: 'ink' });
    const parts = [];
    const bar = (w, d, x, z) => { const b = new THREE.BoxGeometry(w, 0.012, d); b.translate(x, CARD.t + 0.006, z); parts.push(b.toNonIndexed()); };
    const ax = 1.34, az = 0.84, t = 0.07;
    bar(ax, t, 0, -az / 2); bar(ax, t, 0, az / 2); bar(t, az, -ax / 2, 0); bar(t, az, ax / 2, 0);
    for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
    const m = new THREE.Mesh(mergeGeometries(parts), markMat);
    m.castShadow = false;
    mark.add(m);
    mark.visible = false;
    card.group.add(mark);
  }

  // ---- the short pier, facing the centre of the map
  const deckY = Math.max(gy(PIER.x, PIER.z), gy(PIER.x + 0.6, PIER.z)) + 0.16;
  const pier = (() => {
    // one deck board (a deck of separate planks drew a dark comb of seams that pulled the eye in every shot it was
    // only scenery in), two stringers, posts down to the water
    const parts = [];
    const box = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(b.toNonIndexed()); };
    box(PIER.len, 0.16, PIER.w, PIER.len / 2, -0.08, 0);
    for (const zz of [-1, 1]) box(PIER.len, 0.2, 0.18, PIER.len / 2, -0.24, zz * (PIER.w / 2 - 0.22));
    const depth = deckY - seaY + 3.4;
    for (const x of [0.35, PIER.len / 2, PIER.len - 0.35]) for (const zz of [-1, 1]) {
      const top = x > PIER.len - 1 ? 0.45 : -0.1;
      const c = new THREE.CylinderGeometry(0.13, 0.15, depth + top, 8); c.translate(x, (top - depth) / 2, zz * (PIER.w / 2 - 0.06)); parts.push(c.toNonIndexed());
    }
    for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
    const geo = mergeGeometries(parts);
    const m = new THREE.Mesh(geo, ink({ shade: 0.95, bias: 0.06 }));
    m.castShadow = m.receiveShadow = true;
    const grp = new THREE.Group(); grp.name = 'pier'; grp.add(m);
    return { group: grp };
  })();
  pier.group.position.set(PIER.x, deckY, PIER.z);
  g.add(pier.group);
  const pierEnd = new V3(PIER.x + PIER.len - 0.55, deckY, PIER.z);

  // ---- the road: from the pier's end down to the water and inward into the AI zone (r ≈ 52); one fixed path
  const waterY = seaY + 0.42;
  const roadPts = [];
  for (let i = 0; i <= 14; i++) {
    const s = i / 14;
    const x = PIER.x + PIER.len - 0.2 + 17.4 * s, z = PIER.z + 6.2 * Math.pow(s, 1.7);
    const fall = s < 0.62 ? 0.5 - 0.5 * Math.cos((Math.PI * s) / 0.62) : 1;
    roadPts.push(new V3(x, lerp(deckY + 0.02, waterY, fall), z));
  }
  const road = P.makeRoad(roadPts, ROAD_W, { hug: g, accent: 'lime', lift: 0.06, shade: 1.0 });
  road.material.userData.u.uShadeBias.value = 0.34;   // lit: a lime road, not a hatched ramp
  g.add(road.group);
  road.draw(0);

  // ---- three AI cubes (typed, teal): out of the printer, carry the card, travel the road
  const cubes = new THREE.Group();
  cubes.name = 'cubes';
  // typed faces in three tones and graphite edges: over the typed sea a plain teal cube was a few teal glyph cells
  const cubeMat = ink({ style: 1, shade: 0.62, accent: 'teal' });
  cubeMat.vertexColors = true;
  const cubeGeo = faceTones(new THREE.BoxGeometry(CUBE, CUBE, CUBE).toNonIndexed(), { top: 1.15, px: 0.55, nx: 0.55, pz: 0.85, nz: 0.85, bottom: 0.5 });
  const cubeEdgeGeo = edgeBars(CUBE, CUBE, CUBE, { y0: -CUBE / 2, th: 0.07 });
  const cubeEdgeMat = ink({ accent: 'ink' });
  const cubeList = [0, 1, 2].map((j) => {
    const c = new THREE.Mesh(cubeGeo, cubeMat);
    c.name = `cube${j + 1}`;
    c.castShadow = true; c.receiveShadow = true;
    const e = new THREE.Mesh(cubeEdgeGeo, cubeEdgeMat);
    e.castShadow = false;
    c.add(e);
    cubes.add(c);
    return c;
  });
  g.add(cubes);
  cubes.visible = false;
  /** the cubes' places (local, around a centre) under a card carried flat: two in front, one behind (no overlap) */
  const FORM = [new V3(0.55, 0, -0.66), new V3(0.55, 0, 0.66), new V3(-0.62, 0, 0)];
  // on the road they go one after another, zig-zag inside the lime (cube 1 leads, cube 3 is last)
  const LANE = [-0.45, 0.45, -0.45];
  const GAP_U = 1.45 / road.length;
  const U_END = 0.34;                      // where the lead cube is when the beat ends: inside shot B, on the lime

  // ---- hit proxies (children of the parts, so they follow them)
  const hits = {
    printer: P.makeHitProxy(printer.group, 0.35),
    heap: P.makeHitProxy(heap, 0.25),
    person: P.makeHitProxy(person.group, 0.35),
    card: P.makeHitProxy(card.group, 0.45),
    road: (() => {
      const pos = [], idx = [], n = 60;
      for (let i = 0; i <= n; i++) {
        const k = i / n, p = road.pointAt(k), tg = road.curve.getTangentAt(Math.min(0.999, Math.max(0.001, k)));
        const side = new V3(-tg.z, 0, tg.x).normalize().multiplyScalar(1.5);
        pos.push(p.x - side.x, p.y + 0.25, p.z - side.z, p.x + side.x, p.y + 0.25, p.z + side.z);
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
      m.name = 'hit:road'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
      road.group.add(m);
      return m;
    })(),
  };
  // the cubes' proxy: one padded box round each cube, rewritten as they move (one mesh, so the part has one proxy;
  // a single box round the whole convoy also covered the road between them)
  const CUBE_HIT = CUBE / 2 + 0.4;
  hits.cubes = (() => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const base = one.attributes.position.array;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(base.length * 3), 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
    m.name = 'hit:cubes'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.userData.place = () => {
      const a = geo.attributes.position.array;
      cubeList.forEach((c, j) => {
        for (let i = 0; i < base.length; i += 3) {
          a[j * base.length + i] = c.position.x + base[i] * 2 * CUBE_HIT;
          a[j * base.length + i + 1] = c.position.y + base[i + 1] * 2 * CUBE_HIT;
          a[j * base.length + i + 2] = c.position.z + base[i + 2] * 2 * CUBE_HIT;
        }
      });
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere(); geo.computeBoundingBox();
    };
    cubes.add(m);
    return m;
  })();
  // the shortlist: one proxy per card, at its lifted place
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
  const slots = SL.map((i, j) => {
    const o = new THREE.Group(); o.name = `pick${j + 1}`;
    o.add(new THREE.Mesh(new THREE.BoxGeometry(CARD.w, 0.3, CARD.d + 0.2), HIDDEN));
    liftedM[j].decompose(o.position, o.quaternion, _s);
    g.add(o);
    return { o, hit: P.makeHitProxy(o, 0.25) };
  });
  const pickable = (mesh, on) => { if (on) mesh.layers.enable(0); else mesh.layers.disableAll(); };

  // ---- at map scale (look a; mapcue.js): the place where one person decides is printed as a seal's imprint on the
  // shore -- a square in the brand's red-ochre with a darker frame, the printer's type and the white heap of proposals on
  // it -- and the way the decision leaves it, the pier and the road into the AI's water, in the brand's ochre.  Up close
  // none of this is there: the story's frames are drawn as before.
  const mapPaint = mapPaintOf('brand');
  const sealMap = groundPlate(roundRect(-9.9, 3.1, -7.6, 7.6, 0.9, 3), gy, {
    lift: 0.1, border: 0.8, rise: 0.4,
    fill: mapInk({ zone: 'brand', paint: 'large', shade: 1.0, bias: 0.1 }),
    edge: mapInk({ zone: 'brand', paint: 'small', shade: 0.85, bias: 0.04, side: THREE.DoubleSide }),
  });
  sealMap.group.name = 'map-seal';
  g.add(sealMap.group);
  // (and the seal's inner frame: a raised line a step inside its edge)
  const sealLine = groundPlate(roundRect(-8.75, 1.95, -6.45, 6.45, 0.5, 2), gy, {
    lift: 0.12, border: 0.34, rise: 0.26, sheet: false,
    edge: mapInk({ zone: 'brand', paint: 'small', shade: 0.85, bias: 0.04, side: THREE.DoubleSide }),
  });
  sealLine.group.name = 'map-seal-line';
  g.add(sealLine.group);
  const mapCue = mapOnly(sealMap.group, sealLine.group);
  mapPaint.add(table.material, 'mid');
  mapPaint.add(heap.material, 0);
  mapPaint.add(pier.group.children[0].material, 'mid');
  mapPaint.add(road.material, 'mid');

  // every mesh's own shadow setting, so dimming can switch shadows off and emphasis can give them back
  g.traverse((o) => { if (o.isMesh) o.userData.cast0 = o.castShadow; });

  // ------------------------------------------------------------------ the person's poses (pure)
  const memo = new Map();
  const pz = (name, o) => {
    const key = name + JSON.stringify(o || {});
    if (!memo.has(key)) memo.set(key, person.pose(name, o));
    return memo.get(key);
  };
  const POSE = {
    stand: sealHand(clonePose(pz('stand'))),
    stepBack: pz('stepBack'),
    hold: sealHand(clonePose(pz('hold'))),
    // after the stamp: facing the reader, the seal held up in front (the person with the seal)
    shown: sealShown(clonePose(pz('stand'))),
  };
  const walkPose = (d) => person.pose('walk', { dist: d, stride: STRIDE });
  // the right hand down to a card's near edge on the table (to pick it up or to lay it down); the seal tucked
  const reachFwd = CARD_X - CARD.d / 2 + 0.04 - WALK_X;
  const reachPose = (rootY) => sealHand(clonePose(pz('stamp', { y: +rootY.toFixed(3), fwd: reachFwd, x: -0.02, table: TBL.h })), true);
  // the left hand brings the seal down onto the card's centre (a mirrored stamp)
  const stampPose = (rootY) => mirrorPose(pz('stamp', { y: +rootY.toFixed(3), fwd: CARD_X - WALK_X, x: 0, table: TBL.h }));
  const watchPose = (yaw) => sealShown(person.pose('watch', { yaw, pitch: -0.05 }));

  // the picked card: the story's own (DEF), or the reader's (lever.card)
  const pickOf = (lever) => (lever && typeof lever === 'object' && Number.isInteger(lever.card) ? lever.card : DEF);
  const levering = (lever) => !!(lever && typeof lever === 'object' && !lever.stamped);

  // the shots' azimuths (local: 0 = from the inward side, + toward +z; the sun is at about +2.2, so positive azimuths
  // see the figures side-lit); the person turns to show the card to shot A
  const SHOT = { phoneA: [0.55, 0.75], phoneB: [0.36, 0.78], landB: [0.78, 0.5], deskA: [0.62, 0.55], deskB: [0.6, 0.62] };
  const YAW_CAM = Math.atan2(Math.cos(SHOT.phoneA[0]), Math.sin(SHOT.phoneA[0]));
  const Y0 = yawTo(P0.x, P0.z, slot.x, slot.z);
  const YAW_TABLE = Math.PI / 2;

  /** where the person stands after stamping the card at zs: the side step is needed only near the printer's end of
   *  the table; from the far end it would take them out of shot A */
  const backZ = (zs) => zs + BACK_DZ * clamp(1 - zs / 3.6);

  /** the person's frame at (beat, t): { x, z, yaw, v } (v: a pose vector in the root at x, z, yaw) */
  function personAt(beat, t, lever) {
    const j = pickOf(lever), zs = rest[SL[j]].p.z;
    const st = (x, z, yaw, v) => ({ x, z, yaw, v });
    const blendTo = (a, b, k) => st(b.x, b.z, b.yaw, blendPoses(reframe(a.v, a, b), b.v, sm(k)));
    // beat 1: watching the printer, then half a pace back
    const B1a = st(P0.x, P0.z, Y0, POSE.stand);
    const B1b = st(P0.x, P0.z, Y0, POSE.stepBack);
    if (beat === 0) return t < 0.5 ? B1a : blendTo(B1a, B1b, seg(t, 0.5, 0.95));
    // beat 2: along the heap to the card, reach, take it, turn to the reader holding it up
    const walkLen = zs - P0.z;
    const W0 = st(P0.x, P0.z, 0, walkPose(0));
    const W1 = st(WALK_X, zs, 0, walkPose(walkLen));
    const RCH = st(WALK_X, zs, YAW_TABLE, reachPose(rest[SL[j]].p.y + CARD.t + 0.05 - gy(WALK_X, zs)));
    const HLD = st(WALK_X, zs, YAW_CAM, POSE.hold);
    if (beat === 1) {
      if (levering(lever)) {
        // the reader is choosing: the person waits at the story's place, holding the chosen card once there is one
        const has = Number.isInteger(lever.card);
        return st(WALK_X, rest[SL[DEF]].p.z, YAW_CAM, has ? POSE.hold : POSE.stand);
      }
      if (t < T2.turn) return blendTo(B1b, W0, seg(t, 0, T2.turn));
      if (t < T2.walk) {
        const d = walkLen * sm(seg(t, T2.turn, T2.walk));
        return st(WALK_X, P0.z + d, 0, walkPose(d));
      }
      if (t < T2.reach) return blendTo(W1, RCH, seg(t, T2.walk, T2.reach));
      return blendTo(RCH, HLD, seg(t, T2.reach, T2.held));
    }
    // beat 3: to the table, the card laid down, seal down, the mark, seal up, a step back to face the reader
    const LAY = st(WALK_X, zs, YAW_TABLE, reachPose(TOP + 0.003 + CARD.t + 0.05 - gy(WALK_X, zs)));
    const sealY = TOP + 0.003 + CARD.t + knobY - gy(WALK_X, zs);
    const DOWN = st(WALK_X, zs, YAW_TABLE, stampPose(sealY));
    const UP = st(WALK_X, zs, YAW_TABLE, stampPose(sealY + 0.75));
    const bz = backZ(zs);
    const BACK = st(BACK_X, bz, YAW_CAM, POSE.shown);
    if (beat === 2) {
      if (t < T3.lay) return blendTo(HLD, LAY, seg(t, 0, T3.lay));
      if (t < T3.down) return blendTo(LAY, DOWN, seg(t, T3.lay, T3.down));
      if (t < T3.mark) return DOWN;
      if (t < T3.up) return blendTo(DOWN, UP, seg(t, T3.mark, T3.up));
      return blendTo(UP, BACK, seg(t, T3.up, T3.back));
    }
    // beat 4: the person turns to watch the cubes go; the head follows them along the road
    const look = yawTo(BACK_X, bz, PIER.x + 3, PIER.z);
    const WA = st(BACK_X, bz, look, watchPose(0.1));
    if (t < T4.out) return BACK;
    if (t < 1.9) return blendTo(BACK, WA, seg(t, T4.out, 1.9));
    return st(BACK_X, bz, look, watchPose(0.1 - 0.35 * ss(t, T4.travel0, T4.travel1)));
  }

  // ------------------------------------------------------------------ the cubes and the card
  const carryCache = new Map();
  const CARRY_END = pierEnd.x - 1.8;       // the front cubes' faces stay clear of the card laid at the pier's end
  const pathFor = (zs) => {
    if (!carryCache.has(zs)) carryCache.set(zs, new THREE.CatmullRomCurve3([
      new V3(CARD_X + 0.25, TOP + 0.5 + CUBE / 2, zs),
      new V3(TBL.x + 0.4, TOP + 1.6, zs + 0.4),
      new V3(TBL.x + 3.4, deckY + 1.5, lerp(zs, PIER.z, 0.6)),
      new V3(PIER.x + 0.5, deckY + 1.05 + CUBE / 2, PIER.z),
      // they stop short of the pier's end and slide the card off in front of them
      new V3(CARRY_END, deckY + 1.0 + CUBE / 2, PIER.z),
    ], false, 'centripetal'));
    return carryCache.get(zs);
  };

  /** cube j's local transform in beat 4 at t: { p, q } or null (still inside the printer) */
  function cubeAt(j, t, zs) {
    const F = FORM[j];
    const stag = j * 0.1;
    if (t < 0.02 + stag) return null;
    const onTable = new V3(CARD_X + 0.25 + F.x, TOP + 0.06 + CUBE / 2, zs + F.z);
    if (t < T4.out) {
      // out of the slot in a short hop onto the table's end, tumbling, then along the table to the card
      const u = seg(t, stag, T4.out);
      const from = new V3(slot.x - 0.3, slot.y, slot.z + (j - 1) * 0.6);
      const land = new V3(BACK_EDGE + 1.0 + F.x * 0.5, TOP + 0.06 + CUBE / 2, -TBL.d / 2 + 0.9 + F.z * 0.6);
      const a = sm(seg(u, 0, 0.5)), b = sm(seg(u, 0.5, 1));
      const p = from.clone().lerp(land, a).lerp(onTable, b);
      p.y += Math.sin(Math.PI * seg(u, 0, 0.5)) * 1.0;
      const dir = (u < 0.5 ? land.clone().sub(from) : onTable.clone().sub(land)).setY(0).normalize();
      const axis = new V3().crossVectors(YAX, dir).normalize();
      return { p, q: new Q().setFromAxisAngle(axis, (a + b) * Math.PI / 2) };
    }
    if (t < T4.lift) {
      const p = onTable.clone();
      p.y = lerp(TOP + 0.06 + CUBE / 2, TOP + 0.5 + CUBE / 2, ss(t, T4.out, T4.lift));
      return { p, q: new Q() };
    }
    // the card on top: over the table, down past the front, onto the pier, a little bob as they go; then they hold
    // still while the card slides off in front of them onto the pier's end
    const carried = (tt) => {
      const u = ss(tt, T4.lift, T4.carry);
      const path = pathFor(zs);
      const c = path.getPointAt(u), tg = path.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
      const q = new Q().setFromAxisAngle(YAX, Math.atan2(-tg.z, tg.x) * ss(tt, T4.lift, T4.lift + 0.35));
      const p = c.clone().add(F.clone().applyQuaternion(q));
      p.y += Math.sin(tt * 9 + j * 2) * 0.05 * (1 - ss(tt, T4.carry - 0.3, T4.carry));
      return { p, q };
    };
    if (t < T4.laid) return carried(t);
    // on the road: one after another, hovering over the lime
    const onRoad = (u) => {
      const p = road.pointAt(clamp(u, 0, 1));
      const tg = road.curve.getTangentAt(clamp(u, 0.001, 0.999));
      p.add(new V3(-tg.z, 0, tg.x).normalize().multiplyScalar(LANE[j]));
      p.y += 0.3 + CUBE / 2;
      return { p, q: new Q().setFromAxisAngle(YAX, Math.atan2(-tg.z, tg.x)) };
    };
    const u0 = 0.02 + (2 - j) * GAP_U;
    if (t < T4.travel0) {
      // over the card in a hop, down onto the head of the road
      const a = carried(T4.laid), b = onRoad(u0), s = ss(t, T4.laid, T4.travel0);
      const p = a.p.lerp(b.p, s);
      p.y += Math.sin(Math.PI * s) * 0.9;
      return { p, q: a.q.slerp(b.q, s) };
    }
    const r = onRoad(lerp(u0, U_END - j * GAP_U, ss(t, T4.travel0, T4.travel1)));
    r.p.y += Math.sin(t * 6 + j * 2.1) * 0.05 * (1 - ss(t, T4.travel1 - 0.4, T4.travel1));
    return r;
  }

  const HOLD_R = new M4().makeRotationX(Math.PI / 2);
  const HANDLE = new M4().makeTranslation(0, -CARD.t / 2, -CARD.d / 2);
  /** the card held in the right hand (local matrix): in the grip's frame, upright, facing forward */
  function heldMatrix(out) {
    const grip = person.hand('R');
    grip.updateWorldMatrix(true, false);
    return out.multiplyMatrices(gInv, grip.matrixWorld).multiply(HOLD_R).multiply(HANDLE);
  }
  const _la = [new V3(), new Q(), new V3()], _lb = [new V3(), new Q(), new V3()];
  const lerpM = (a, b, k, out) => {
    a.decompose(..._la); b.decompose(..._lb);
    return out.compose(_la[0].lerp(_lb[0], k), _la[1].slerp(_lb[1], k), _la[2].lerp(_lb[2], k));
  };
  const flatAt = (x, y, z, yaw = CARD_YAW) => new M4().compose(new V3(x, y, z), new Q().setFromAxisAngle(YAX, yaw), ONE);
  const endM = flatAt(pierEnd.x, deckY + 0.004, PIER.z, Math.PI / 2);

  // ------------------------------------------------------------------ the pose
  // what pose() decided and emphasize() needs: the beat, its time, the lever, what the card carries
  const S = { beat: BEATS.length - 1, t: BEATS[BEATS.length - 1].dur, lever: null, emph: null, stamped: true, cardOn: true, cardWith: 'road', lift: false, walkZ: 0 };
  const _hm = new M4();

  /** pure: every explanatory transform for (beat, k, lever) */
  function pose(beat, k = 1, lever = null) {
    beat = clamp(Math.round(+beat || 0), 0, BEATS.length - 1);
    const t = clamp(+k || 0) * BEATS[beat].dur;
    const j = pickOf(lever), hi = SL[j], zs = rest[hi].p.z;
    const lev = levering(lever);

    // the printer shudders while it prints
    const sh = beat === 0 && t > 0 ? (t < 0.3 ? 1 : t < 2.6 ? 0.45 : 0.45 * (1 - ss(t, 2.6, 2.9))) : 0;
    printer.group.position.set(PRN.x + Math.sin(t * 71) * 0.05 * sh, prY + Math.abs(Math.sin(t * 53)) * 0.04 * sh, PRN.z + Math.sin(t * 61 + 1) * 0.04 * sh);
    printer.group.rotation.set(0, Math.sin(t * 47) * 0.012 * sh, Math.sin(t * 59) * 0.01 * sh);

    // the person
    const F = personAt(beat, t, lever);
    person.apply(F.v);
    person.group.position.set(F.x, gy(F.x, F.z), F.z);
    person.group.rotation.set(0, F.yaw, 0);
    person.group.updateMatrixWorld(true);

    // the heap: in flight in beat 1, at rest after; the shortlist lifted while the reader chooses
    const picked = beat > 1 || (beat === 1 && !lev && t >= T2.reach) || (lev && Number.isInteger(lever.card));
    for (let i = 0; i < N; i++) {
      const c = rest[i];
      if (beat === 0 && t < emitAt[i] + FLY) {
        if (t < emitAt[i]) { heap.setCard(i, _m.compose(slot, restQ[i], TINY)); continue; }
        const u = seg(t, emitAt[i], emitAt[i] + FLY);
        const e = 1 - (1 - u) * (1 - u);    // fast out of the slot, settling onto its place
        _p.copy(slot).lerp(c.p, e);
        _p.y += Math.sin(Math.PI * u) * (1.3 + 0.22 * slot.distanceTo(c.p));
        _q.setFromAxisAngle(YAX, lerp(Math.PI / 2, c.yaw, e) + (1 - e) * (i % 2 ? 2.4 : -2.4));
        _q2.setFromAxisAngle(XAX, Math.sin(Math.PI * u) * (i % 3 ? 0.5 : -0.7));
        heap.setCard(i, _m.compose(_p, _q.multiply(_q2), ONE));
        continue;
      }
      if (lev && i < SL.length) { heap.setCard(i, lever.card === i ? _m.compose(c.p, restQ[i], TINY) : liftedM[i]); continue; }
      heap.setCard(i, _m.compose(c.p, restQ[i], picked && i === hi ? TINY : ONE));
    }
    slots.forEach((s, i) => pickable(s.hit, lev && lever.card !== i));

    // the picked card: from its place to the hand, onto the table's edge, onto the cubes, onto the pier's end
    const restM = new M4().compose(rest[hi].p, restQ[hi], ONE);
    const layM = flatAt(CARD_X, TOP + 0.003, zs);
    const m = card.group.matrix;
    let cardOn = picked, stamped = false;
    m.copy(restM);
    if (lev) {
      if (cardOn) heldMatrix(m);
    } else if (beat === 1) {
      if (cardOn) lerpM(restM, heldMatrix(_hm), ss(t, T2.reach, T2.reach + 0.3), m);
    } else if (beat === 2) {
      if (t < T3.lay) lerpM(heldMatrix(_hm), layM, ss(t, 0.05, T3.lay), m);
      else m.copy(layM);
      stamped = t >= T3.mark;
    } else if (beat === 3) {
      stamped = true;
      if (t < T4.out) m.copy(layM);
      else if (t < T4.laid) {
        // resting on the cubes: lifted, carried, laid at the pier's end square with the road
        const f = [0, 1, 2].map((i) => cubeAt(i, t, zs));
        const top = f[0].p.clone().add(f[1].p).add(f[2].p).multiplyScalar(1 / 3);
        top.y = Math.max(f[0].p.y, f[1].p.y, f[2].p.y) + CUBE / 2 + 0.01;
        const onCubes = new M4().compose(top, f[2].q.clone().multiply(new Q().setFromAxisAngle(YAX, Math.PI / 2)), ONE);
        if (t < T4.lift) lerpM(layM, onCubes, ss(t, T4.out, T4.lift), m);
        else if (t < T4.carry) m.copy(onCubes);
        else {
          // slid forward off the cubes' tops, then set down on the pier's end in front of them
          const u = seg(t, T4.carry, T4.laid);
          lerpM(onCubes, endM, ss(u, 0, 0.6), m);
          m.decompose(..._la);
          _la[0].y = lerp(onCubes.elements[13], endM.elements[13], ss(u, 0.55, 1));
          m.compose(..._la);
        }
      } else m.copy(endM);
    }
    m.decompose(card.group.position, card.group.quaternion, card.group.scale);
    card.group.visible = cardOn;
    pickable(hits.card, cardOn);

    // the cubes and the road (beat 4; held at the end)
    let cubesOn = false;
    const fr = beat === 3 ? [0, 1, 2].map((i) => cubeAt(i, t, zs)) : [null, null, null];
    const on = fr.filter(Boolean);
    cubesOn = on.length > 0;
    cubes.position.copy(slot);
    if (cubesOn) { cubes.position.set(0, 0, 0); for (const f of on) cubes.position.add(f.p); cubes.position.multiplyScalar(1 / on.length); }
    fr.forEach((f, i) => {
      const cb = cubeList[i];
      cb.visible = !!f;
      if (f) { cb.position.copy(f.p).sub(cubes.position); cb.quaternion.copy(f.q); }
      else { cb.position.copy(FORM[i]); cb.quaternion.identity(); }
    });
    cubes.visible = cubesOn;
    hits.cubes.userData.place();
    pickable(hits.cubes, cubesOn);
    const rk = beat === 3 ? ss(t, T4.road0, T4.road1) : 0;
    road.draw(rk);
    road.group.visible = rk > 0;
    pickable(hits.road, rk > 0.05);

    Object.assign(S, { beat, t, lever, lift: lev, stamped, cardOn, cardWith: beat === 3 ? (t >= T4.laid ? 'road' : 'cubes') : null, walkZ: beat === 1 && !lev ? personAt(1, Math.min(t, T2.walk), lever).z : P0.z });
    applyEmphasis();
    return api;
  }

  // ------------------------------------------------------------------ emphasis by subtraction
  const SCENERY = [table.group, pier.group];
  function setDim(obj, k) {
    dim(obj, k);
    obj.traverse((o) => { if (o.isMesh && !o.userData.hitProxy) o.castShadow = k < 0.5 ? !!o.userData.cast0 : false; });
  }
  const sameSet = (set, list) => !!set && set.size === list.length && list.every((x) => set.has(x));
  function applyEmphasis() {
    const E = S.emph;   // null: the map's rest; a Set: those parts full, the rest of the district down to contour
    const map = E === null;
    const full = (id) => map || E.has(id);
    // (drawn on the map only; in focus they drop with the rest)
    setDim(sealMap.group, map ? 0 : 1); setDim(sealLine.group, map ? 0 : 1);
    setDim(printer.group, full('printer') ? 0 : 1);
    // the body and its slot carry the teal; the graphite edges keep their own ink
    for (const o of [printer.body, printer.slotMesh]) P.accent(o, !map && full('printer') ? 'teal' : 'none');
    setDim(person.group, full('person') ? 0 : 1);
    // in beat 4 the card is the cubes' load, and once laid at the pier's end the road's head: it goes with them
    const cardFull = full('card') || (!!S.cardWith && full(S.cardWith));
    setDim(card.group, cardFull ? 0 : 1);
    mark.visible = S.cardOn && S.stamped && (map || S.cardWith === 'road');
    card.material.userData.u.uAccent.value = !map && cardFull ? ACCENT.lime : 0;
    setDim(cubes, full('cubes') ? 0 : 1);
    cubeMat.userData.u.uAccent.value = !map && full('cubes') ? ACCENT.teal : 0;
    setDim(road.group, full('road') ? 0 : 1);
    P.accent(road.group, !map && full('road') ? 'lime' : 'none');
    // on the map the road is drawn in neutral pencil (hatched), in the district it is a lit lime road
    road.material.userData.u.uShadeMul.value = map ? 0.7 : 1.0;
    road.material.userData.u.uShadeBias.value = map ? 0.0 : 0.34;
    for (const o of SCENERY) setDim(o, map ? 0 : 1);
    // the heap, card by card.  The subject: teal.  Otherwise lighter, its lines kept (a heap still, not the subject).
    // Beat 2: the teal drains from the cards the person walks past.  The reader choosing: the five stay teal.
    const heapFull = !map && E.has('heap');
    heap.castShadow = map || heapFull;   // not the subject: no shadow either (contour only)
    heap.material.userData.u.uAccent.value = 0;
    heap.material.userData.u.uDim.value = 0;
    const story = !map && S.beat === 1 && !S.lift && sameSet(E, BEATS[1].parts);
    for (let i = 0; i < N; i++) {
      let d = HEAP_REST, teal = heapFull;
      if (heapFull) d = 0;
      else if (S.lift && i < SL.length) { d = 0; teal = true; }
      else if (story) {
        // a card drains once the person has walked past it (from 0.4 s on), the rest as they reach for the card
        const passed = clamp((S.walkZ - rest[i].p.z) / 1.4 + 0.5);
        const k = Math.max(ss(S.t, 0.4, 0.8) * passed, ss(S.t, T2.walk - 0.25, T2.reach + 0.15));
        d = HEAP_REST * k;
        teal = k < 0.5;
      }
      heap.setDim(i, d);
      heap.tint(i, 1, -1, teal ? ACCENT.teal : -1);
    }
  }
  function emphasize(ids) {
    S.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }

  // ------------------------------------------------------------------ anchors: labels, words, hotspots, framing
  const heapSpot = new V3(TBL.x + 0.6, TOP + 0.08, -2.4);   // a point on the heap clear of the person in both shots
  // the last cube (the highest on screen in shot B): a label above it stays clear of the other two
  const cubeTop = () => { cubeList[2].updateWorldMatrix(true, false); return cubeList[2].localToWorld(new V3(0, CUBE * 0.5, 0)); };
  const cardTop = () => { card.group.updateWorldMatrix(true, false); return card.group.localToWorld(new V3(0, CARD.t + 0.02, 0)); };
  const parts = {
    printer: { hit: hits.printer, anchor: () => printer.group.localToWorld(new V3(PRN.w / 2, PRN.h * 0.8, -PRN.d * 0.25)), beat: 0 },
    heap: { hit: hits.heap, anchor: () => W(heapSpot.x, heapSpot.y, heapSpot.z), beat: 0 },
    person: { hit: hits.person, anchor: () => person.joints.hips.localToWorld(new V3(0, -0.02 * H, 0.05 * H)), beat: 1 },
    // the ring on the card's corner, clear of the word 核准 at its centre
    card: { hit: hits.card, anchor: () => { card.group.updateWorldMatrix(true, false); return card.group.localToWorld(new V3(-0.8, CARD.t, 0.55)); }, beat: 2 },
    cubes: { hit: hits.cubes, anchor: cubeTop, beat: 3 },
    // ahead of the lead cube, where the road runs on toward the centre: its ring sits on lime, clear of the cubes
    road: { hit: hits.road, anchor: () => g.localToWorld(road.pointAt(U_END + 0.075)), beat: 3 },
  };
  // a shortlisted card's ring stays on its lifted place, also once chosen (shown filled there): following the card
  // into the person's hand put it on top of the middle card's ring on a phone held sideways
  slots.forEach((s, j) => { parts[`pick${j + 1}`] = { hit: s.hit, anchor: () => s.o.localToWorld(new V3(0, 0.05, 0)), beat: 1 }; });
  const labelAt = {
    printer: () => printer.group.localToWorld(new V3(PRN.w * 0.2, PRN.h * 1.0, 0)),
    heap: () => W(heapSpot.x, heapSpot.y, heapSpot.z),
    // the crown: the label sits above the head instead of over the face
    person: () => person.top(),
    card: cardTop,
    cubes: cubeTop,
    road: () => g.localToWorld(road.pointAt(0.5)),
  };
  const decalAt = {
    // the machine's name, on its face toward the reader, below the slot
    printer: () => printer.group.localToWorld(new V3(PRN.w / 2 + 0.03, PRN.h * 0.3, 0)),
    // 核准: on the card from the moment the seal comes down until the cubes lay it at the pier's end
    card: () => (S.cardOn && S.stamped && S.cardWith !== 'road' ? cardTop() : null),
  };

  // the shots: fixed points, so the framing never depends on where the motion happens to be
  const deck = (x) => W(x, deckY, PIER.z);
  const roadAt = (s) => g.localToWorld(road.pointAt(s));
  const around = (x, z, top = true) => [-0.75, 0.75].flatMap((d) => [W(x + d, 0, z + d), ...(top ? [W(x - d, H + 0.15, z + d)] : [])]);
  const printerPts = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => W(PRN.x + sx * PRN.w / 2, prY + (sx < 0 ? 0 : PRN.h + 0.25), PRN.z + sz * PRN.d / 2)));
  const heapBox = [W(BACK_EDGE - 0.1, TOP, -5.6), W(BACK_EDGE - 0.1, TOP, 5.6), W(TBL.x + 2.4, 0, -5.6), W(TBL.x + 2.4, 0, 5.6)];
  const A_PTS = [...printerPts, ...heapBox, ...around(P0.x, P0.z), ...around(WALK_X, PICK_Z[DEF])];
  const actorB = around(BACK_X, backZ(PICK_Z[DEF]));
  // the person, the pier and the first third of the road (where the cubes end up), as the spec frames it
  const B_PHONE = [...actorB, deck(PIER.x), deck(PIER.x + PIER.len), roadAt(0.38)];
  const B_DESK = [...actorB, deck(PIER.x), deck(PIER.x + PIER.len), roadAt(0.42)];
  const shot = ([az, el], pts, margin) => ({ az: AZ0 + az, el, anchors: () => pts, margin });
  // a phone held sideways (the phone layout below 500 px tall): shot B's portrait stack (the person above, the road
  // running down toward the reader) left the person at 56 px; seen across, the same things lie side by side
  const land = () => typeof innerWidth === 'number' && innerWidth > innerHeight;
  const phoneB = shot(SHOT.phoneB, B_PHONE), landB = shot(SHOT.landB, B_PHONE);
  const shots = {
    phone: [shot(SHOT.phoneA, A_PTS), {
      get az() { return land() ? landB.az : phoneB.az; },
      get el() { return land() ? landB.el : phoneB.el; },
      anchors: () => (land() ? landB : phoneB).anchors(),
      margin: undefined,
    }],
    desk: [shot(SHOT.deskA, A_PTS), shot(SHOT.deskB, B_DESK)],
  };

  const lever = { kind: 'pick', fromBeat: 1, parts: SL.map((_, j) => `pick${j + 1}`), def: null };
  function rest_() { return pose(BEATS.length - 1, 1, lever.def); }
  // no material motion (the held result stays still); the map-scale seal and fills follow the reader's place
  function ambient() { mapCue.update(); mapPaint.update(); }

  const api = {
    id: 'judge',
    group: g,
    zone: 'brand',
    anchor: W(TBL.x, TOP + 0.1, TBL.z),
    pin: W(TBL.x, TOP + 0.1, TBL.z),
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    lever,
    restParts: ['road', 'person', 'cubes', 'card'],
    mainActor: 'person',
    pose,
    rest: rest_,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
  };
  rest_();
  emphasize(null);
  return api;
}
