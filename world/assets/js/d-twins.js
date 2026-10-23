// 數位分身怎麼來 · how People Model is made (article 12, p.97-101) - on the twins' island in the AI's water, west of the
// sunflower, in five beats.  The reader comes here right before 數位分身 (d-core.js): this district shows where the 人
// in the sunflower's head come from, so that the head reads as people before its own story asks them anything.
//
// The camera stands where the core's does (CAM_AZ 1.45), so the move on to 數位分身 keeps its bearing.  It looks at an
// exam room from its back: at the far end the moderator faces the camera with his clipboard, the report's stand at his
// right; before him five people on stools (their backs to the camera); between them and the camera the rows of
// two-seat desks, everyone facing the moderator (the hero's pair and its neighbour with an envelope in the aisle
// beside the person).  The hall's big clock
// stands on a short post at the room's near left corner, where the map sees it beside the flower (the district's own
// object on the map: its pin).
//   1  the five answer (bubbles into his clipboard), the report slams down on the stand, they get up and walk off; his
//      new 「？」 drifts over the empty stools and sinks onto one; more new questions follow it, one onto each empty
//      stool: nobody is there to answer them until the next round (12 b2, b7)
//   2  the hall fills: people drop into the seats and write, the clock's minute hand goes once round (an hour each,
//      12 b19); then one of them in the back row: two pages of his answers slide into the envelope at his desk's end
//      and it is sealed (kept from the twin, 12 b69); the rest of his pile bursts into teal points that build a
//      figure of 人 in the empty seat beside him, the same shape as he (one to one, 12 b20); the same runs through the
//      hall, pair after pair
//   3  the test: his envelope opens and a page rises out of it over his head, its question side to us; the twin
//      answers in a bubble (a face that likes it, or not); the page turns over: his own answer, the same face; a
//      check.  A second page: a dislike, and the twin's dislike too; a second check.  The pairs round them do the
//      same (likes and dislikes), the rest of the hall gets its checks (12 b69, b74)
//   4  the people stand up and walk out toward the camera; the twins stay.  The questions that waited on the stools
//      lift and fly over the hall and every twin answers at once; a follow-up, answered at once too; the answers stay
//      over the twins, and the clock has moved a few minutes (12 b2, b113)
//   5  the twins stand up and fly to the flower, round in front of its head and into it, the rest of the five thousand
//      after them, and the head fills with 人 (5,000 多位數位分身, its words on the head)
//
// Encoding (design §7.4): pencil = real people and real things; teal = AI at work (the points the answers become);
// the 人 band (style 0.8) = the digital twins, each drawn with a pencil contour (a hull) so it keeps the figure of the
// person it was made from.  Everything the reader sees is a pure function of (beat, k): pose().
// No copy lives here: captions, labels, the words on the report and on the head, the tap lines come from world.json.
// Local frame: +z toward the camera, +x the camera's right (toward the sunflower), y = 0 the ground at the origin.
// The set is placed from the core's own position (buildTwins({ core })), so the two move together.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { rng, clamp } from './kit.js';
import { heightAt } from './terrain.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';
import { LOOK, P as PAINT } from './look.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), XAX = new V3(1, 0, 0);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
/** a pop: 0 -> a little past 1 -> 1 */
const pop = (x) => { x = clamp(x); const c = 2.0; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const strip = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
/** a vertex colour on every vertex: (shade multiplier, style or -1, accent or -1) */
function toned(geo, t, st = -1, ac = -1) {
  const g = strip(geo.clone());
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = t; c[i * 3 + 1] = st; c[i * 3 + 2] = ac; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// ------------------------------------------------------------------ the set (local units)
const CAM_AZ = 1.45;                                 // the core's camera side: the move on to 數位分身 keeps its bearing
const YAW = Math.PI / 2 - CAM_AZ;                    // group turn: local +z -> the camera
const OFF = { x: -14, z: -7 };                       // the local origin, from the sunflower's foot (world axes)
const HA = 4.6;                                      // the moderator (the one who asks)
const HP = 3.8;                                      // the five of beat 1
const HC = 3.2;                                      // the people in the hall, and their twins
// beat 1: the five sit on an arc round C1 (on its camera side) facing the moderator, who faces the camera
const C1 = { x: 0.2, z: -4.3, r: 2.05 };
const ASK = { x: 0.2, z: -6.9 };
const STAND = { x: -2.95, z: -7.45, w: 3.3, d: 1.8, h: 2.2 };
const WAIT = 2;                                      // the stool the 「？」 sinks onto (the middle one)
// the hall: rows of two-seat desks facing the moderator (their backs to the camera), aisles between the columns; row 0
// is the front (nearest him), the rows come toward the camera.  Seen from behind, the person sits on the left-hand seat,
// his twin comes to the right one (the flower's side)
const HALL = { x0: -4.15, pitchX: 2.9, z0: -0.4, pitchZ: 2.6, rows: 5, cols: 4 };
const DESK = { w: 2.0, top: 0.42, near: 0.24, depth: 0.27, t: 0.035 };   // normalised by HC (the desk top in front)
const HERO = { row: 4, col: 0 };                 // the back row (nearest the camera), the column next to the clock
// the hall's clock on its short post at the room's near left corner, its face leaning back toward the cameras: from
// the map's default views this corner is the part of the set that the flower's head does not hide, so the district's
// pill points at the clock (big enough to read as a clock on the map)
const CLOCK = { x: -8.8, z: 14.6, h: 2.4, r: 2.65, turn: 0.42, tilt: 0.32 };
// the envelope of a tested person, standing on the floor in the aisle beside his seat, leaning back, its face to the
// camera (pair frame: x across the bench, the person at +0.5; z toward the desk; y from the ground): where nothing
// hides it from the camera behind them.  The pages kept from the twin go in (beat 2), the test's pages come out (beat 3)
const ENV = { x: 1.25, z: 0.3, w: 1.1, h: 1.35, t: 0.09, lean: 0.38 };
// the order the waiting questions land on the empty stools (beat 1), and when each new one is asked
const PILE = [2, 1, 3, 0, 4];
// the sunflower's seed head, when neither the core nor its bed can be found (d-core.js at its rest: the head 21 over
// the ground at the core's centre, turned by HEAD_YAW 0.3 off the core's camera side, nodding 0.02)
const CORE = { az: 1.45, rise: 21, yaw: 0.3, nod: 0.02, r: 8.6, bed: 0.15 };

// ------------------------------------------------------------------ the beats
// The caption lands at keyAt and is held 0.8 s + 0.2 s per 字 (story.js); every beat's motion runs on through that
// hold (dur = keyAt + the hold of its caption in world.json), so the picture never stands still while it is read.
const BEATS = [
  // 1 they answer, the report slams down, they leave; new questions pile up on the empty stools
  { dur: 5.5, keyAt: 1.1, shot: 0, parts: ['circle', 'report', 'asker', 'question'] },
  // 2 the hall fills and answers for an hour; two of his pages go into his envelope, the rest becomes his twin
  { dur: 6.1, keyAt: 1.3, shot: 1, parts: ['crowd', 'clock', 'hero', 'twin', 'data', 'twins', 'envelope'] },
  // 3 the test: a page out of his envelope, the twin's answer, the page turned: the same; a like, then a dislike
  { dur: 5.15, keyAt: 0.95, shot: 2, parts: ['hero', 'twin', 'envelope', 'crowd', 'twins'] },
  // 4 the people walk out; the waiting questions are answered at once by the twins, and a follow-up
  { dur: 5.9, keyAt: 1.1, shot: 1, parts: ['twins', 'asker', 'clock', 'twin'] },
  // 5 the twins fly into the flower's head: its seeds
  { dur: 5.6, keyAt: 1.2, shot: 3, parts: ['seeds'] },
];
const LAST = BEATS.length - 1;
const REST = ['seeds'];
const ACTOR = ['asker', 'hero', 'hero', 'asker', 'seeds'];
// beat-local times (seconds)
// (q: the first question pops by his head; more: when each of the next four is asked, each pops, drifts over its
// stool in mF seconds and drops onto it in mD)
const T0 = { ans: [0.0, 0.3], fly: [0.3, 0.62], thump: [0.55, 0.76], up: [0.74, 0.98], walk: [0.98, 2.3], q: [0.95, 1.2], float: [1.4, 1.95], drop: [1.95, 2.25], turn: [1.2, 1.7], more: [2.3, 2.85, 3.4, 3.95], mPop: 0.25, mF: 0.5, mD: 0.3 };
// (the camera eases in over the first 0.8 s: the desks rise while it moves, the people drop in as it lands; his two
// pages go into his envelope before his twin forms; the wave: each pair's page into its envelope, then its twin)
const T1 = { desks: [0.0, 0.3], fill: [0.08, 0.5], drop: 0.22, write: [0.4, 0.95], keep: [0.82, 1.06], kFly: 0.26, seal: [1.06, 1.18], lift: [1.12, 1.2], burst: [1.16, 1.36], form: [1.22, 1.46], look: [1.55, 1.9], wave: [1.75, 5.9], wDur: 0.55, wKeep: 0.32 };
// two questions; per question q (from qs[q]): a page out of the envelope up over his head (its question side to us),
// the twin's answer in a bubble, the page turned over (his own answer), a check; the first page and bubble go as the
// second comes.  The pairs round him follow by their lag; the rest of the hall gets its checks in a wave
const T2 = { sit: [0.0, 0.25], open: [0.0, 0.2], qs: [0.08, 2.0], up: [0.0, 0.3], tw: [0.32, 0.5], flip: [0.54, 0.74], ck: [0.74, 0.87], away: [-0.12, 0.06], far: [1.0, 3.2] };
// (the people are out of the room before the questions reach the twins: walk ends by 1.1 s at the latest)
const T3 = { up: [0.0, 0.2], aisle: [0.2, 0.36], walk: [0.36, 1.08], qup: [0.55, 0.78], qfly: [0.78, 1.05], r1: 1.05, q2: [2.2, 2.45], f2: [2.45, 2.75], r2: 2.77, clock: [[0.78, 1.2, 3], [2.75, 3.05, 1]] };
// beat 5: the twins stand up and fly, the front rows first, round in front of the head's face onto their places; the
// head fills from the side they come in from, the rest of the five thousand arriving until the beat's end
const T4 = { go: 0.0, spread: 0.8, stand: 0.2, fly: 0.9, extra: [0.3, 3.5], efl: 1.1, look: [0.4, 1.4] };

// ------------------------------------------------------------------ pose vectors (people.js, normalised units)
const hc = (h) => ({ p: h.p.clone(), pole: h.pole.clone(), grip: h.grip.clone() });
const fc = (f) => ({ p: f.p.clone(), q: f.q.clone() });
function clonePose(v) {
  return {
    hips: { p: v.hips.p.clone(), q: v.hips.q.clone() }, waist: v.waist.clone(), neck: v.neck.clone(), head: v.head.clone(),
    hand: { L: hc(v.hand.L), R: hc(v.hand.R) }, foot: { L: fc(v.foot.L), R: fc(v.foot.R) },
  };
}
const eul = (x, y, z) => new Q().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
/** bent over the desk, the head down to the booklet, both hands on the desk top */
function writing(v) {
  const o = clonePose(v);
  o.waist.copy(eul(0.34, 0, 0));
  o.neck.copy(eul(0.22, 0, 0));
  o.head.copy(eul(0.34, 0.04, 0));
  o.hand.R.p.set(-0.05, DESK.top + 0.018, 0.33); o.hand.R.pole.set(-0.6, -0.5, -0.6);
  o.hand.L.p.set(0.085, DESK.top + 0.018, 0.31); o.hand.L.pole.set(0.6, -0.5, -0.6);
  o.hand.R.grip.copy(eul(0, 0, 0)); o.hand.L.grip.copy(eul(0, 0, 0));
  return o;
}
/** seated upright, the head turned by yaw (the twin who looks at its person; the person who looks at his twin) */
function turnHead(v, yaw, pitch = 0) {
  const o = clonePose(v);
  o.neck.multiply(eul(pitch * 0.4, yaw * 0.42, 0));
  o.head.multiply(eul(pitch * 0.6, yaw * 0.58, 0));
  return o;
}
/**
 * seated upright, the right hand raised to a height: a rating.  level 1: the hand up beside the head; level 2:
 * straight up.  The person and the twin beside him raise the same hand (the twin is his copy, not his mirror).
 */
function rating(v, side, level) {
  const o = clonePose(v), s = side === 'L' ? 1 : -1;
  const h = o.hand[side];
  if (level >= 2) { h.p.set(s * 0.17, 0.915, 0.04); h.pole.set(s, 0.1, -0.4); o.waist.multiply(eul(-0.04, 0, -s * 0.045)); o.head.copy(eul(-0.12, 0, 0)); }
  else { h.p.set(s * 0.2, 0.75, 0.07); h.pole.set(s, -0.4, -0.5); o.waist.multiply(eul(-0.02, 0, -s * 0.02)); o.head.copy(eul(-0.04, 0, 0)); }
  h.grip.identity();
  return o;
}
/** the pose moved by (dx, dz) in its own frame (normalised): the stand moved forward, so the feet stay where they sat */
function shift(v, dx, dz) {
  const o = clonePose(v), t = new V3(dx, 0, dz);
  o.hips.p.add(t);
  for (const s of ['L', 'R']) { o.foot[s].p.add(t); o.hand[s].p.add(t); }
  return o;
}
/** standing with both arms up (a twin leaping into the head) */
function leaping(v) {
  const o = clonePose(v);
  o.hand.L.p.set(0.16, 0.98, 0.04); o.hand.L.pole.set(1, 0, -0.4);
  o.hand.R.p.set(-0.16, 0.98, 0.04); o.hand.R.pole.set(-1, 0, -0.4);
  o.head.copy(eul(-0.2, 0, 0));
  return o;
}

// ------------------------------------------------------------------ geometry
/** a lathe profile [[r, y], ...] bottom -> top, low poly; sz squashes the depth */
function latheL(profile, seg = 7, sz = 1) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  if (sz !== 1) g.scale(1, 1, sz);
  return g;
}
const ballL = (r, x = 0, y = 0, z = 0, sz = 1) => { const g = new THREE.SphereGeometry(r, 6, 4); if (sz !== 1) g.scale(1, 1, sz); return g.translate(x, y, z); };
const limbL = (r0, r1, len) => new THREE.CylinderGeometry(r1, r0, len, 5, 1).translate(0, -len / 2, 0);
// people.js proportions (H = 1)
const FH = 0.042, SHIN = 0.245, THIGH = 0.245, UARM = 0.168, FARM = 0.142;
const TONE = { torso: 1.0, head: 1.0, limb: 0.86, joint: 0.3, hand: 0.86, foot: 0.6, neck: 0.86 };
/** a low-poly lay figure, one geometry per bone (the hall's people and twins) */
function lowFigure() {
  const m = (list) => mergeGeometries(list.map(([g, t]) => toned(g, t)));
  const head = new THREE.SphereGeometry(1, 7, 5);
  head.scale(0.054, 0.074, 0.063); head.rotateX(-0.22); head.translate(0, 0.068, 0.008);
  const foot = new THREE.BoxGeometry(0.058, 0.044, 0.155).translate(0, -FH + 0.022, 0.0375);
  const G = {
    pelvis: m([[latheL([[0, -0.078], [0.074, -0.052], [0.088, 0.0], [0.07, 0.048], [0, 0.064]], 7, 0.7), TONE.torso]]),
    chest: m([[latheL([[0, -0.01], [0.062, 0.02], [0.092, 0.11], [0.094, 0.17], [0.06, 0.204], [0, 0.214]], 7, 0.62), TONE.torso]]),
    neck: m([[new THREE.CylinderGeometry(0.021, 0.024, 0.064, 5).translate(0, 0.03, 0), TONE.neck]]),
    head: m([[head, TONE.head], [ballL(0.012, 0, 0.06, 0.069, 1.6), TONE.joint]]),
  };
  for (const k of ['L', 'R']) {
    G[k + 'uarm'] = m([[limbL(0.03, 0.025, UARM), TONE.limb], [ballL(0.028), TONE.joint]]);
    G[k + 'farm'] = m([[limbL(0.025, 0.019, FARM), TONE.limb]]);
    G[k + 'hand'] = m([[ballL(0.022, 0, -0.04, 0.004, 0.8).scale(0.8, 1.1, 1), TONE.hand]]);
    G[k + 'thigh'] = m([[limbL(0.048, 0.035, THIGH), TONE.limb], [ballL(0.034, 0, -THIGH, 0), TONE.joint]]);
    G[k + 'shin'] = m([[limbL(0.037, 0.025, SHIN), TONE.limb]]);
    G[k + 'foot'] = m([[foot.clone(), TONE.foot]]);
  }
  return G;
}
const BONES = [['hips', 'pelvis'], ['waist', 'chest'], ['neck', 'neck'], ['head', 'head']];
for (const k of ['L', 'R']) BONES.push([`shoulder${k}`, `${k}uarm`], [`elbow${k}`, `${k}farm`], [`wrist${k}`, `${k}hand`], [`hip${k}`, `${k}thigh`], [`knee${k}`, `${k}shin`], [`ankle${k}`, `${k}foot`]);

/** a 「？」 in the xy plane facing +z, about 1 tall, its foot at y = 0: a hook and a dot */
function questionGeo(t = 0.13) {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * 1.05 - (i / 14) * Math.PI * 1.55;
    pts.push(new V3(Math.cos(a) * 0.3, 0.74 + Math.sin(a) * 0.26, 0));
  }
  pts.push(new V3(0.02, 0.38, 0), new V3(0, 0.3, 0));
  const hook = strip(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, t, 6, false));
  const dot = strip(new THREE.SphereGeometry(t * 1.25, 10, 8).translate(0, 0.08, 0));
  return mergeGeometries([hook, dot]);
}

/** a check mark in the xy plane facing +z, about 0.8 wide, centred on its middle */
function checkGeo(t = 0.1) {
  const stroke = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    return strip(new THREE.BoxGeometry(len + t, t, t * 0.7).rotateZ(Math.atan2(y1 - y0, x1 - x0)).translate((x0 + x1) / 2, (y0 + y1) / 2, 0));
  };
  return mergeGeometries([stroke(-0.34, 0.02, -0.1, -0.24), stroke(-0.1, -0.24, 0.38, 0.3)]);
}

/** a face drawn in ink in the xy plane facing +z, about 0.66 across: one who likes it (a smile) or does not (a frown) */
function faceGeo(like, r = 0.31, t = 0.042) {
  const ring = strip(new THREE.TorusGeometry(r, t, 5, 28));
  const eye = (x) => strip(new THREE.SphereGeometry(t * 1.55, 8, 6).translate(x, r * 0.28, 0));
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * ((like ? 1.18 : 0.18) + 0.64 * i / 12), cy = like ? r * 0.12 : -r * 0.64;
    pts.push(new V3(Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, 0));
  }
  const mouth = strip(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, t, 5, false));
  return mergeGeometries([ring, eye(-r * 0.36), eye(r * 0.36), mouth]);
}
// the page of his answers that the twin never saw (beat 3): its question side (a 「？」, +z) and, turned over, his own
// answer (the face, -z); origin at its centre
const PG = { w: 0.86, h: 1.02, t: 0.035 };
function pageGeo(like) {
  return mergeGeometries([
    toned(new THREE.BoxGeometry(PG.w, PG.h, PG.t), 1.0),
    toned(questionGeo(0.12).scale(0.62, 0.62, 0.62).translate(0, -0.34, PG.t / 2 + 0.07), 0.12),
    toned(faceGeo(like).rotateY(Math.PI).translate(0, 0, -PG.t / 2 - 0.045), 0.12),
  ]);
}
// the twin's answer (beat 3): a speech bubble with the face in it, its tail down to the twin
function answerGeo(like) {
  const b = P.makeBubble({ w: 1.08, h: 0.96, tail: 'left', t: 0.12 });
  return mergeGeometries([toned(b.mesh.geometry, 1.0), toned(faceGeo(like).translate(0, 0.02, 0.105), 0.12)]);
}

/** the instanced desks of the hall: a two-seat bench and the desk top in front of it, origin under the pair's centre */
function deskGeo(H) {
  const w = DESK.w, seat = 0.244 * H, top = DESK.top * H, z0 = DESK.near * H, dz = DESK.depth * H, t = DESK.t * H;
  const parts = [
    new THREE.BoxGeometry(w, 0.1, 0.5).translate(0, seat - 0.05, 0),                          // the bench
    new THREE.BoxGeometry(0.1, seat - 0.1, 0.4).translate(-w / 2 + 0.1, (seat - 0.1) / 2, 0),
    new THREE.BoxGeometry(0.1, seat - 0.1, 0.4).translate(w / 2 - 0.1, (seat - 0.1) / 2, 0),
    new THREE.BoxGeometry(w, t, dz).translate(0, top - t / 2, z0 + dz / 2),                   // the desk top
    new THREE.BoxGeometry(0.08, top - t, dz * 0.8).translate(-w / 2 + 0.06, (top - t) / 2, z0 + dz / 2),
    new THREE.BoxGeometry(0.08, top - t, dz * 0.8).translate(w / 2 - 0.06, (top - t) / 2, z0 + dz / 2),
    new THREE.BoxGeometry(w - 0.1, (top - t) * 0.55, 0.05).translate(0, (top - t) * 0.6, z0 + dz - 0.03),   // the modesty board
  ];
  return mergeGeometries(parts.map(strip));
}

/** an envelope standing on its long edge (its face toward +z), and its flap hinged on the top edge (shut: hanging
 *  down over the face; the hinge at y = 0 of the flap's frame) */
function envelopeGeo() {
  const body = strip(new THREE.BoxGeometry(ENV.w, ENV.h, ENV.t).translate(0, ENV.h / 2, 0));
  const s = new THREE.Shape();
  s.moveTo(-ENV.w / 2, 0); s.lineTo(ENV.w / 2, 0); s.lineTo(0, -ENV.h * 0.56); s.lineTo(-ENV.w / 2, 0);
  const flap = strip(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }));
  return { body, flap };
}

// the twin's contour: the figure drawn again a little larger on its back faces in dark pencil (an inverted hull), so a
// figure of 人 keeps the outline of the person it was made from.  The push grows with the depth, so the line keeps
// about the same width on screen near and far.  _I: instanced twins (with their per-instance fade); _S: one figure
const HULL_PUSH = 'transformed += normalize(objectNormal) * uOut * max(2.0, -hq.z);';
const HULL_I = {
  key: 'twins-hull-i',
  vHead: 'attribute float aFade;\nvarying float vFade;',
  vPos: `vFade = aFade;
#ifdef USE_INSTANCING
vec4 hq = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
#else
vec4 hq = modelViewMatrix * vec4(transformed, 1.0);
#endif
${HULL_PUSH}`,
  fHead: 'varying float vFade;',
  fOut: 'dm = max(dm, 1.0 - smoothstep(0.3, 1.0, vFade)); if (vFade < 0.3) discard;',
};
const HULL_S = {
  key: 'twins-hull-s',
  vPos: `vec4 hq = modelViewMatrix * vec4(transformed, 1.0);
${HULL_PUSH}`,
};
const OUT = { value: 0.0011 };
const hullMat = (hooks) => ink({ shade: 0, bias: 0.1, side: THREE.BackSide, hooks, uniforms: { uOut: OUT } });
/**
 * a pencil contour round every mesh under obj (its hit proxies left out): the moderator and the envelope stand at the
 * island's far edge, where the screen behind them is the AI's water, and the depth outline does not draw a figure
 * against it; this contour does, the same way the twins' does
 */
function contour(obj) {
  const hm = hullMat(HULL_S), list = [];
  obj.traverse((m) => { if (m.isMesh && !m.userData.hitProxy && m.material?.visible !== false && m.name !== 'contour') list.push(m); });
  for (const m of list) {
    const h = new THREE.Mesh(m.geometry, hm);
    h.name = 'contour';
    h.castShadow = h.receiveShadow = false;
    m.add(h);
  }
}

/**
 * buildTwins({ core }) - core: the 數位分身 module (d-core.js), when the world passes it: the set stands at OFF from
 * its group and the twins land on its seedBed.  Without it the set stands at OFF from the world's centre and finds the
 * head's bed in the scene once it is assembled.
 */
export function buildTwins({ core = null } = {}) {
  const C0 = core?.group?.position ? core.group.position.clone() : new V3();
  const ORIGIN = { x: C0.x + OFF.x, z: C0.z + OFF.z };
  const g = new THREE.Group();
  g.name = 'twins';
  const oy = heightAt(ORIGIN.x, ORIGIN.z);
  g.position.set(ORIGIN.x, oy, ORIGIN.z);
  g.rotation.y = YAW;
  g.updateMatrixWorld(true);
  const cY = Math.cos(YAW), sY = Math.sin(YAW);
  /** the ground under a local point (local y) */
  const gy = (x, z) => heightAt(ORIGIN.x + x * cY + z * sY, ORIGIN.z - x * sY + z * cY) - oy;
  const W = (x, y, z) => g.localToWorld(new V3(x, y, z));
  const R = rng(1207);
  const layers = {};
  // ?look=a: paper prints white (the envelopes, the pages kept in them, the clock's face: on the map the clock reads as
  // a clock, not a blue disc).  Set once, after the map has laid its own fills (scenery.js), as d-core.js does
  const PAINTS = [];
  const paper = (m) => { PAINTS.push(m); return m; };
  let painted = false;
  const paintOnce = () => {
    if (painted) return;
    painted = true;
    if (LOOK !== 'a') return;
    for (const m of PAINTS) if (m.userData?.u?.uPaint) m.userData.u.uPaint.value = PAINT.foam;
  };
  const layer = (name, ...objs) => { (layers[name] ||= []).push(...objs); return objs[0]; };

  // =================================================================== the moderator (the one who asks)
  const asker = makePerson({ height: HA });
  asker.group.name = 'asker';
  const ASK_Y = gy(ASK.x, ASK.z);
  asker.group.position.set(ASK.x, ASK_Y, ASK.z);
  const ASK_FACE = Math.atan2(C1.x - ASK.x, C1.z - ASK.z) - 0.12;   // toward the five and the room (and the camera)
  asker.group.rotation.y = ASK_FACE;
  asker.material.userData.u.uShadeBias.value = 0.12;
  const clip = P.makeClipboard({ w: 1.15, h: 1.5 });
  asker.hold('L', clip);
  contour(asker.group);
  g.add(asker.group);
  layer('asker', asker.group);
  const askerHit = P.makeHitProxy(asker.group, 0.3);
  /** a question: a speech bubble with a 「？」 in it (its tail toward the one who asks: down and to the right) */
  const makeQ = (name) => {
    const b = P.makeBubble({ w: 1.9, h: 1.9, tail: 'right', t: 0.2 });
    const mark = new THREE.Mesh(questionGeo(), ink({ accent: 'ink' }));
    mark.scale.setScalar(1.25);
    mark.position.set(0, -0.72, 0.16);
    b.group.add(mark);
    b.group.name = name;
    b.group.visible = false;
    g.add(b.group);
    return b;
  };
  // the questions that wait (beat 1: the first, then four more, one on each empty stool) and are answered by the
  // twins (beat 4); the follow-up (beat 4)
  const waiting = PILE.map((_, i) => makeQ(i ? 'question-' + i : 'question'));
  const q1 = waiting[0];
  const q2 = makeQ('follow-up');
  layer('question', ...waiting.map((b) => b.group), q2.group);
  const qHit = P.makeHitProxy(q1.group, 0.25);

  // =================================================================== beat 1: the five on stools, the report on its stand
  const circleG = new THREE.Group(); circleG.name = 'circle';
  g.add(circleG);
  layer('circle', circleG);
  const phi0 = Math.atan2(ASK.z - C1.z, ASK.x - C1.x);
  const five = [-1.0, -0.5, 0, 0.5, 1.0].map((d, i) => {
    const th = phi0 + Math.PI + d * 1.1;
    const x = C1.x + Math.cos(th) * C1.r, z = C1.z + Math.sin(th) * C1.r, y = gy(x, z);
    const p = makePerson({ height: HP, seated: true });
    p.group.position.set(x, y, z);
    const face = Math.atan2(ASK.x - x, ASK.z - z);
    p.group.rotation.y = face;
    p.material.userData.u.uShadeBias.value = 0.3;
    const st = P.makeStool({ h: p.seatH, r: 0.34 });
    st.group.position.set(x, y, z);
    st.group.rotation.y = face;
    circleG.add(st.group, p.group);
    // where each walks off to: away from the moderator, fanning out
    const out = th + (i - 2) * 0.14;
    const bub = P.makeBubble({ w: 1.25, h: 0.82, tail: i < 2 ? 'right' : 'left', t: 0.14 });
    for (let j = 0; j < 2; j++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.68 - j * 0.2, 0.08, 0.05), ink({ accent: 'ink' }));
      line.position.set(-0.1 + j * -0.1, 0.12 - j * 0.24, 0.1);
      bub.group.add(line);
    }
    bub.group.visible = false;
    circleG.add(bub.group);
    return { p, st, x, y, z, face, out, bub, th };
  });
  const circleHit = P.makeHitProxy(circleG, 0.2);
  const SEAT_TOP = five[WAIT].p.seatH;
  // the moderator's stand and the report on it (its right end)
  const reportG = new THREE.Group(); reportG.name = 'report';
  g.add(reportG);
  layer('report', reportG);
  const stand = P.makeTable({ w: STAND.w, d: STAND.d, h: STAND.h });
  const STAND_Y = gy(STAND.x, STAND.z);
  stand.group.position.set(STAND.x, STAND_Y, STAND.z);
  stand.group.rotation.y = 0.2;
  reportG.add(stand.group);
  const REP = { w: 1.6, d: 1.1, h: 0.5 };     // a thick bound report, its long side across the camera's view
  const report = new THREE.Group(); report.name = 'report-book';
  {
    const pages = new THREE.Mesh(new THREE.BoxGeometry(REP.w * 0.96, REP.h * 0.84, REP.d * 0.97).translate(0, REP.h / 2, 0), ink({ shade: 1.0, bias: 0.3 }));
    const cover = new THREE.Mesh(new THREE.BoxGeometry(REP.w, 0.06, REP.d).translate(0, REP.h - 0.03, 0), ink({ shade: 0.62, bias: 0.04 }));
    const back = new THREE.Mesh(new THREE.BoxGeometry(REP.w, 0.06, REP.d).translate(0, 0.03, 0), ink({ shade: 0.8, bias: 0.12 }));
    const spine = new THREE.Mesh(new THREE.BoxGeometry(REP.w, REP.h, 0.1).translate(0, REP.h / 2, REP.d / 2 - 0.05), ink({ shade: 0.4 }));
    for (const o of [pages, cover, back, spine]) { o.castShadow = o.receiveShadow = true; report.add(o); }
  }
  const REP_X = 0.55;
  report.position.set(REP_X, STAND.h, 0.22);
  report.rotation.y = 0.05;
  stand.group.add(report);
  const reportHit = P.makeHitProxy(report, 0.35);
  // the envelopes (white paper, the flap a tone darker so that its V reads; a button the flap ties to): the hero's is
  // drawn on its own (heroG, below), the tested neighbour's is instanced with the hall
  const EG = envelopeGeo();
  // (the button the flap's tip ties to, just under the tip: the words on the envelope sit below it)
  const tieGeo = strip(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12).rotateX(Math.PI / 2).translate(0, ENV.h * 0.42, ENV.t / 2 + 0.02));
  // (white paper in every look, the flap a tone darker, the button dark: toned geometry, vertex-coloured materials)
  const ENV_BODY = mergeGeometries([toned(EG.body, 1.0), toned(tieGeo, 0.2)]), ENV_FLAP = toned(EG.flap, 0.8);
  // radians about the hinge: open, the flap swings out toward the camera, still hanging down (never stands up over
  // the envelope, where it would read as a roof); shut: 0, down over its face
  const FLAP_OPEN = -0.95;

  // =================================================================== the hall
  const low = lowFigure();
  const baker = makePerson({ height: 1 });
  /** a pose of the lay figure baked into one geometry (root frame, feet at y = 0, height HC) */
  const bake = (v) => {
    baker.apply(v);
    baker.group.updateMatrixWorld(true);
    const J = baker.joints;
    return mergeGeometries(BONES.map(([node, key]) => low[key].clone().applyMatrix4(J[node].matrixWorld))).scale(HC, HC, HC);
  };
  const SIT = baker.pose('sit'), STANDP = baker.pose('stand');
  const WRITE = writing(SIT);
  const UP = shift(STANDP, 0, 0.12);
  // beat 3: seated, looking up at the answers over their heads
  const UPLOOK = turnHead(SIT, 0, -0.42);
  const NWALK = 6;
  const STRIDE = 0.34 * HC;
  const walks = {};
  for (let j = 0; j < NWALK; j++) walks['w' + j] = baker.pose('walk', { phase: j / NWALK, stride: STRIDE / HC * 1 });
  const FRAMES = { write: WRITE, wsit: blendPoses(WRITE, SIT, 0.5), sit: SIT, look: UPLOOK, half: blendPoses(SIT, UP, 0.5), up: UP, ...walks };
  const TFRAMES = { sit: SIT, look: UPLOOK, half: blendPoses(SIT, UP, 0.5), up: UP, leap: leaping(STANDP) };
  // per-instance fade: coming and going, a figure drops to its contour and then goes
  const FOLK = {
    key: 'twins-folk',
    vHead: 'attribute float aFade;\nvarying float vFade;',
    vPos: 'vFade = aFade;',
    fHead: 'varying float vFade;',
    fOut: 'dm = max(dm, 1.0 - smoothstep(0.3, 1.0, vFade)); if (vFade < 0.3) discard;',
  };
  // a twin: the 人 band, dark enough for its glyphs to read bold (the lit side a step lighter)
  const TWIN = {
    key: 'twins-twin',
    vHead: 'attribute float aFade;\nvarying float vFade;',
    vPos: 'vFade = aFade;',
    fHead: 'varying float vFade;',
    fOut: 'sh = 0.06 + 0.34 * sh; dm = max(dm, 1.0 - smoothstep(0.3, 1.0, vFade)); if (vFade < 0.3) discard;',
  };
  const folkDepth = (() => {
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vFade;')
        .replace('void main() {', 'void main() {\n\tif (vFade < 0.97) discard;');
    };
    m.customProgramCacheKey = () => 'twins-folk-depth';
    return m;
  })();
  const fadeAttr = (geo, n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1), 1); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aFade', a); return a; };

  // the seats: rows of pairs facing the camera, aisles between the columns; the hero's pair is drawn on its own
  const pairs = [];
  for (let r = 0; r < HALL.rows; r++) {
    for (let c = 0; c < HALL.cols; c++) {
      const cx = HALL.x0 + c * HALL.pitchX + (R() - 0.5) * 0.12;
      const cz = HALL.z0 + r * HALL.pitchZ + (R() - 0.5) * 0.12;
      if (r === HERO.row && c === HERO.col) { pairs.hero = { cx: HALL.x0 + c * HALL.pitchX, cz: HALL.z0 + r * HALL.pitchZ, r, c }; continue; }
      // not on the bank: the island's ground runs down to the water behind the hall's far left corner
      if (Math.min(gy(cx - 1.1, cz), gy(cx + 1.1, cz), gy(cx, cz - 1)) + oy < 3.2) continue;
      // the test's two questions: whether the person likes each (the pairs round the hero show it; the twins answer
      // alike); a very few pairs of the far hall get no check (the test is close, not perfect: 0.89 is not 1)
      const like = [R() < 0.55, R() < 0.45];
      const miss = R() < 0.1;
      pairs.push({ cx, cz, r, c, y: 0, yaw: Math.PI + (R() - 0.5) * 0.06, ph: R(), sp: R(), jit: R(), like, miss });
    }
  }
  for (const p of pairs) p.y = gy(p.cx, p.cz);
  const NP = pairs.length;
  /** a point of a pair's own frame (x across the bench: the person at +0.5, the twin's seat at -0.5; z toward the desk) */
  const pairPt = (p, lx, ly, lz, out) => out.set(p.cx + lx * Math.cos(p.yaw) + lz * Math.sin(p.yaw), p.y + ly, p.cz - lx * Math.sin(p.yaw) + lz * Math.cos(p.yaw));
  const H0 = pairs.hero;
  H0.y = gy(H0.cx, H0.cz);
  H0.yaw = Math.PI;
  // the hero's two answers: he likes the first, not the second
  H0.like = [true, false]; H0.miss = false;
  const maxD = Math.max(...pairs.map((p) => Math.hypot(p.cx - H0.cx, p.cz - H0.cz)));
  // the wave of beat 2 runs out from the hero, pair after pair, over the caption's reading
  const order = [...pairs].sort((a, b) => Math.hypot(a.cx - H0.cx, a.cz - H0.cz) - Math.hypot(b.cx - H0.cx, b.cz - H0.cz));
  for (const p of pairs) {
    p.d = Math.hypot(p.cx - H0.cx, p.cz - H0.cz) / maxD;
    // beat 2: the hall fills from the front back, row by row, a little ragged
    p.t1 = T1.fill[0] + (p.r / (HALL.rows - 1)) * (T1.fill[1] - T1.fill[0] - T1.drop) + p.jit * 0.06;
    p.t2 = T1.wave[0] + (order.indexOf(p) / Math.max(1, NP - 1)) * (T1.wave[1] - T1.wave[0] - T1.wDur - 0.4);
    // beat 2: just before its twin forms, a page of its pile goes into the envelope at its desk's end, sealed
    p.tk = p.t2 - T1.wKeep;
    // beat 4: they get up at their own moment and walk out along the aisle on their left, past the camera
    p.t3 = T3.up[0] + p.sp * 0.16;
    // the follow-ups are put to part of them (a target group): the left half of the hall (the hero's side), then the
    // two rows nearest the camera
    p.f2 = p.cx < 0; p.f3 = p.r >= HALL.rows - 2;
    // beat 3: the pairs nearest the hero are the ones the reader watches; the rest of the hall answers as its
    // under-drawing
    p.near = p.r === HERO.row && p.c === HERO.col + 1;
  }
  H0.t1 = T1.fill[0]; H0.d = 0; H0.sp = 0.5; H0.jit = 0.5; H0.f2 = H0.f3 = true;
  // beat 3: the pair tested in full beside the hero (the same row, toward the flower), a little after him, its likes
  // the other way round, so that both faces show at every question (a like and a dislike side by side)
  const TESTED = [H0, ...pairs.filter((p) => p.near).sort((a, b) => a.d - b.d)];
  const LIKES = [[true, false], [false, true]];
  TESTED.forEach((p, i) => { p.like = LIKES[i % LIKES.length]; p.lag = i ? 0.1 + 0.08 * i : 0; p.miss = false; });
  const hallG = new THREE.Group(); hallG.name = 'hall';
  g.add(hallG);
  layer('crowd', hallG);
  const deskMat = ink({ shade: 0.95, bias: 0.1 });
  const desks = new THREE.InstancedMesh(deskGeo(HC), deskMat, NP);
  desks.castShadow = desks.receiveShadow = true;
  desks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hallG.add(desks);
  const _m = new M4(), _m2 = new M4(), _m3 = new M4(), _m4 = new M4(), _q = new Q(), _v = new V3(), _s = new V3(1, 1, 1);
  // the questionnaire in front of each, and the answered pages piled up beside it (they grow as the hour goes)
  const BK = { w: 0.48, d: 0.36, t0: 0.16, t1: 0.035 };
  const ST = { w: 0.42, d: 0.42, h: 0.74, held: 0.05, x: 0.12, kept: 0.1 };
  const BOOK_X = 0.62;
  const deskTop = DESK.top * HC, deskZ = (DESK.near + DESK.depth / 2) * HC;
  const pageMat = ink({ shade: 1.0, bias: 0.34 });
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(BK.w, 1, BK.d).translate(0, 0.5, 0), pageMat, NP);
  const stacks = new THREE.InstancedMesh(new THREE.BoxGeometry(ST.w, 1, ST.d).translate(0, 0.5, 0), pageMat, NP);
  for (const m of [books, stacks]) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); hallG.add(m); }
  // the pages kept from the twins: one from every pile (two from the hero's) into the envelope at its desk's end
  const sheetsG = new THREE.Group(); sheetsG.name = 'kept-pages';
  g.add(sheetsG);
  layer('envelope', sheetsG);
  // (paper drawn white in every look: a toned geometry under a vertex-coloured material, like the test's answers)
  const sheetGeo = toned(new THREE.BoxGeometry(0.56, 0.03, 0.42), 1.0);
  const sheetMat = paper(ink({ shade: 1.0, bias: 0.34 }));
  sheetMat.vertexColors = true;
  const NS = NP + 2;
  const sheets = new THREE.InstancedMesh(sheetGeo, sheetMat, NS);
  sheets.castShadow = false; sheets.frustumCulled = false; sheets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sheetsG.add(sheets);
  /** instanced figures, one mesh per baked frame: { mesh, fade, n, hull } by frame name */
  const frameSet = (frames, mat, n, prefix, cast, hullM = null) => {
    const out = {};
    for (const [name, v] of Object.entries(frames)) {
      const geo = bake(v);
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.name = prefix + name;
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = cast; mesh.receiveShadow = true;
      if (cast) mesh.customDepthMaterial = folkDepth;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const fade = fadeAttr(geo, n);
      let hull = null;
      if (hullM) {
        // the contour: the same instances (their matrices and fades shared), drawn by the hull material
        const hg = new THREE.BufferGeometry();
        hg.setAttribute('position', geo.attributes.position);
        hg.setAttribute('normal', geo.attributes.normal);
        hg.setAttribute('aFade', fade);
        hull = new THREE.InstancedMesh(hg, hullM, n);
        hull.instanceMatrix = mesh.instanceMatrix;
        hull.name = prefix + name + '-hull';
        hull.count = 0;
        hull.frustumCulled = false;
        hull.castShadow = hull.receiveShadow = false;
      }
      out[name] = { mesh, fade, n: 0, hull };
    }
    return out;
  };
  const folkMat = ink({ shade: 1.0, bias: 0.28, hooks: FOLK });
  folkMat.vertexColors = true;
  const FR = frameSet(FRAMES, folkMat, NP, 'folk-', true);
  for (const F of Object.values(FR)) hallG.add(F.mesh);
  // the twins: the hall's (one per pair), the hero's once it leaves its seat (beat 5), and the rest of the five
  // thousand coming from beyond the frame (beat 5)
  const NX = 150;
  const NT = NP + 1 + NX;
  const twinsG = new THREE.Group(); twinsG.name = 'twins-hall';
  g.add(twinsG);
  layer('twins', twinsG);
  const twinMat = ink({ style: 0.8, shade: 1.0, bias: 0.1, hooks: TWIN });
  twinMat.vertexColors = true;
  const TW = frameSet(TFRAMES, twinMat, NT, 'twin-', false, hullMat(HULL_I));
  for (const F of Object.values(TW)) twinsG.add(F.mesh, F.hull);

  // the envelope at the end of every desk of the hall (the hero's is drawn on its own): its body and its flap
  const envsG = new THREE.Group(); envsG.name = 'envelopes';
  hallG.add(envsG);
  const envMat = () => { const m = paper(ink({ shade: 1.0, bias: 0.3 })); m.vertexColors = true; return m; };
  const envBodies = new THREE.InstancedMesh(ENV_BODY, envMat(), NP);
  const envFlaps = new THREE.InstancedMesh(ENV_FLAP, envMat(), NP);
  for (const m of [envBodies, envFlaps]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); envsG.add(m); }

  // beat 3: the answers over the tested pairs (the twin's bubble, the page out of the envelope: a like or a dislike
  // each), and the checks: two over each tested pair, one over every pair of the far hall
  const answersG = new THREE.Group(); answersG.name = 'answers';
  g.add(answersG);
  layer('answers', answersG);
  const ansFaceMat = ink({ shade: 1.0, bias: 0.3 });
  ansFaceMat.vertexColors = true;
  const NQ = TESTED.length * 2;
  const mkAns = (geo) => { const m = new THREE.InstancedMesh(geo, ansFaceMat, NQ); m.frustumCulled = false; m.castShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); answersG.add(m); return m; };
  const ANS = { bub: [mkAns(answerGeo(false)), mkAns(answerGeo(true))], page: [mkAns(pageGeo(false)), mkAns(pageGeo(true))] };

  // =================================================================== the clock (an hour each; then a few minutes)
  const clockG = new THREE.Group(); clockG.name = 'clock';
  const CLOCK_Y = gy(CLOCK.x, CLOCK.z);
  clockG.position.set(CLOCK.x, CLOCK_Y, CLOCK.z);
  // (its face turned half way between the stories' camera and the map's, so both see it nearly face on)
  clockG.rotation.y = CLOCK.turn;
  g.add(clockG);
  layer('clock', clockG);
  const minute = new THREE.Group(), hour = new THREE.Group();
  const CLOCK_FACE_Y = CLOCK.h + CLOCK.r * 0.82;
  // (the face, its ticks and hands in one frame leaning back by CLOCK.tilt about the face's centre: the stories'
  // camera and the map's both look down on it)
  const faceG = new THREE.Group(); faceG.name = 'clock-face';
  faceG.position.set(0, CLOCK_FACE_Y, 0);
  faceG.rotation.x = -CLOCK.tilt;
  clockG.add(faceG);
  {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, CLOCK_FACE_Y, 8).translate(0, CLOCK_FACE_Y / 2, -0.35), ink({ shade: 0.7, bias: 0.05 }));
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.28, 14).translate(0, 0.14, -0.35), ink({ shade: 0.7, bias: 0.05 }));
    const face = new THREE.Mesh(new THREE.CylinderGeometry(CLOCK.r, CLOCK.r, 0.34, 44).rotateX(Math.PI / 2), paper(ink({ shade: 1.0, bias: 0.4 })));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(CLOCK.r, 0.2, 6, 44), ink({ shade: 0.32 }));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 8).translate(0, 0.3, 0), ink({ shade: 0.4 }));
    cap.position.set(0, CLOCK.r + 0.08, 0);
    const ticks = mergeGeometries(Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2, big = i % 3 === 0;
      return strip(new THREE.BoxGeometry(big ? 0.24 : 0.14, big ? 0.56 : 0.34, 0.06).translate(0, CLOCK.r - (big ? 0.46 : 0.36), 0).rotateZ(-a));
    }));
    const tk = new THREE.Mesh(ticks, ink({ shade: 0.22 }));
    tk.position.set(0, 0, 0.18);
    for (const o of [face, rim, cap, tk]) { o.castShadow = o.receiveShadow = true; faceG.add(o); }
    for (const o of [post, foot]) { o.castShadow = o.receiveShadow = true; clockG.add(o); }
    const handMat = ink({ shade: 0.12 });
    const mh = new THREE.Mesh(new THREE.BoxGeometry(0.2, CLOCK.r * 0.86, 0.07).translate(0, CLOCK.r * 0.36, 0), handMat);
    const hh = new THREE.Mesh(new THREE.BoxGeometry(0.28, CLOCK.r * 0.52, 0.07).translate(0, CLOCK.r * 0.2, 0), handMat);
    minute.add(mh); hour.add(hh);
    minute.position.set(0, 0, 0.27);
    hour.position.set(0, 0, 0.22);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10).rotateX(Math.PI / 2), handMat);
    pin.position.set(0, 0, 0.32);
    faceG.add(minute, hour, pin);
  }
  const clockHit = P.makeHitProxy(clockG, 0.3);

  // =================================================================== the hero: one of them, drawn whole, and his twin
  const heroG = new THREE.Group(); heroG.name = 'hero-set';
  heroG.position.set(H0.cx, H0.y, H0.cz);
  heroG.rotation.y = Math.PI;
  g.add(heroG);
  layer('hero', heroG);
  const heroDesk = new THREE.Mesh(deskGeo(HC), ink({ shade: 0.95, bias: 0.1 }));
  heroDesk.castShadow = heroDesk.receiveShadow = true;
  heroG.add(heroDesk);
  const hero = makePerson({ height: HC, seated: true });
  hero.group.name = 'hero';
  hero.group.position.set(0.5, 0, 0);
  hero.material.userData.u.uShadeBias.value = 0.3;
  heroG.add(hero.group);
  const heroMat = ink({ shade: 1.0, bias: 0.34 });
  const heroBook = new THREE.Mesh(new THREE.BoxGeometry(BK.w, 1, BK.d).translate(0, 0.5, 0), heroMat);
  heroBook.position.set(BOOK_X, deskTop, deskZ);
  const heroStack = new THREE.Mesh(new THREE.BoxGeometry(ST.w, 1, ST.d).translate(0, 0.5, 0), heroMat);
  heroStack.position.set(ST.x, deskTop, deskZ);
  for (const o of [heroBook, heroStack]) { o.castShadow = o.receiveShadow = true; heroG.add(o); }
  const heroHit = P.makeHitProxy(hero.group, 0.3);
  // his envelope, standing in the aisle beside his seat, its face to the camera, leaning back: two pages of his
  // answers go into it and it is sealed (beat 2); the test's pages come out of it (beat 3).  (In this group's frame,
  // not the hero set's: it takes its own dim, apart from his)
  const envG = new THREE.Group(); envG.name = 'envelope';
  envG.position.set(H0.cx - ENV.x, H0.y, H0.cz - ENV.z);
  envG.rotation.set(-ENV.lean, 0, 0, 'YXZ');
  g.add(envG);
  layer('envelope', envG);
  const envBody = new THREE.Mesh(ENV_BODY, envMat());
  const envFlap = new THREE.Mesh(ENV_FLAP, envMat());
  envFlap.position.set(0, ENV.h, ENV.t / 2);
  for (const o of [envBody, envFlap]) { o.castShadow = o.receiveShadow = true; envG.add(o); }
  contour(envG);
  const envHit = P.makeHitProxy(envG, 0.25);
  // his twin: the same figure in the seat beside him, drawn in the 人 band, with its contour
  const twinG = new THREE.Group(); twinG.name = 'twin-set';
  heroG.add(twinG);
  layer('twin', twinG);
  const twin = makePerson({ height: HC, seated: true });
  twin.group.name = 'twin';
  twin.group.position.set(-0.5, 0, 0);
  {
    const u = twin.material.userData.u;
    u.uStyle.value = 0.8; u.uShadeMul.value = 0.36; u.uShadeBias.value = 0.05;
    const hm = hullMat(HULL_S);
    const bones = [];
    twin.group.traverse((m) => { if (m.isMesh) bones.push(m); });
    for (const m of bones) {
      const h = new THREE.Mesh(m.geometry, hm);
      h.castShadow = h.receiveShadow = false;
      h.name = 'twin-hull';
      m.add(h);
    }
    twin.group.traverse((m) => { if (m.isMesh && m.name !== 'twin-hull') m.castShadow = false; });
  }
  twinG.add(twin.group);
  const twinHit = P.makeHitProxy(twin.group, 0.3);

  // =================================================================== the data points (teal: AI at work)
  const NDH = 420, NDW = 6;                          // the hero's, and six per seat for the wave
  const ND = NDH + NP * NDW;
  const dataG = new THREE.Group(); dataG.name = 'data';
  g.add(dataG);
  layer('data', dataG);
  const dataMat = ink({ style: 0, shade: 0.45, bias: 0.05, accent: 'teal', focus: false });
  const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), dataMat, ND);
  dots.frustumCulled = false;
  dots.castShadow = false;
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dataG.add(dots);
  // targets on the twin's body: points of its baked figure (the hero's twin sits at the same place and pose)
  const sitGeo = TW.sit.mesh.geometry;
  const tPos = sitGeo.attributes.position;
  const D = [];
  for (let i = 0; i < NDH; i++) {
    const vi = Math.floor(R() * tPos.count);
    D.push({ tx: tPos.getX(vi), ty: tPos.getY(vi), tz: tPos.getZ(vi), a: R() * Math.PI * 2, r: 0.35 + R() * 0.6, h: 0.3 + R() * 1.0, t0: T1.burst[0] + R() * 0.2, fl: 0.3 + R() * 0.2, sp: R() });
  }
  // the data part answers where the points fly: round the hero's pair
  const dataHit = new THREE.Mesh(new THREE.BoxGeometry(3.4, HC * 1.4, 2.6), new THREE.MeshBasicMaterial({ visible: false }));
  dataHit.name = 'hit:data'; dataHit.userData.hitProxy = true;
  dataHit.position.set(H0.cx, H0.y + HC * 0.7, H0.cz - 0.4);
  dataG.add(dataHit);

  // =================================================================== beat 4: the twins' answers (small bubbles)
  const NRA = NP + 1;                                // per round: one for each pair's twin and one for the hero's
  const NA = NRA * 2;
  const ansG = new THREE.Group(); ansG.name = 'answers';
  g.add(ansG);
  layer('twins', ansG);
  // a small speech bubble with two written lines in it (like the five's in beat 1): an answer
  const ansGeo = mergeGeometries([
    toned(P.makeBubble({ w: 1.45, h: 0.95, tail: 'left', t: 0.14 }).mesh.geometry, 1.0),
    toned(new THREE.BoxGeometry(0.78, 0.1, 0.05).translate(-0.04, 0.13, 0.09), 0.1),
    toned(new THREE.BoxGeometry(0.52, 0.1, 0.05).translate(-0.17, -0.11, 0.09), 0.1),
  ]);
  const ansMat = ink({ shade: 1.0, bias: 0.3 });
  ansMat.vertexColors = true;
  const ans = new THREE.InstancedMesh(ansGeo, ansMat, NA);
  ans.frustumCulled = false; ans.castShadow = false;
  ans.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ansG.add(ans);

  // =================================================================== beat 3: the checks
  const checksG = new THREE.Group(); checksG.name = 'checks';
  g.add(checksG);
  layer('checks', checksG);
  const checks = new THREE.InstancedMesh(checkGeo(), ink({ accent: 'ink', shade: 0.2 }), NQ);
  const farG = new THREE.Group(); farG.name = 'checks-far';
  g.add(farG);
  layer('checksFar', farG);
  const farChecks = new THREE.InstancedMesh(checkGeo(), ink({ accent: 'ink', shade: 0.2 }), NP);
  for (const m of [checks, farChecks]) { m.frustumCulled = false; m.castShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
  checksG.add(checks); farG.add(farChecks);

  // =================================================================== beat 5: the sunflower's seed head
  const seedsG = new THREE.Group(); seedsG.name = 'seeds';
  g.add(seedsG);
  layer('seeds', seedsG);
  const BED = { r: CORE.r };
  // the twins' own drawing of the seed bed while this district is in focus: a bare bed (paper) over the core's field,
  // and the 人 field where the twins have landed (bold as they land, settling to a quieter tone at the end).  The field grows from the rim the twins come in by (the hall's side)
  // across the face: a cell is taken once the front (uCut, along uDir in the head's own coordinates) has passed it
  const CUT = { value: -2 }, SDIR = { value: new THREE.Vector2(0, 1) }, SETTLE = { value: 0 };
  const SEED = {
    key: 'twins-seeds-5',
    fOut: `{
  if (length(vLPos.xy) > 1.0) discard;
  vec2 q = vLPos.xy * uBedR;
  vec2 cell = floor(q * 1.45);
  float s = dot((cell + 0.5) / (1.45 * uBedR), uDir) + (dHash(cell + 5.7) - 0.5) * 0.14;
  if (s > uCut) { st = 0.0; sh = 1.0; }
  else { float D = mix(0.84, 0.56, uSettle) + (dHash(floor(q * 1.3) + 3.1) - 0.5) * 0.1; sh = clamp(1.0 - D, 0.0, 1.0); }
}`,
  };
  const BEDR = { value: CORE.r };
  const seedDisk = new THREE.Mesh(new THREE.CircleGeometry(1, 72), ink({ style: 0.8, hooks: SEED, uniforms: { uCut: CUT, uDir: SDIR, uBedR: BEDR, uSettle: SETTLE } }));
  seedDisk.name = 'seed-head';
  seedDisk.receiveShadow = false; seedDisk.castShadow = false;
  seedDisk.visible = false;
  seedDisk.matrixAutoUpdate = false;
  seedsG.add(seedDisk);
  // the head's frame in this group's local frame: centre, in-plane axes and the normal (toward the viewer), radius
  const HD = { c: new V3(), ex: new V3(1, 0, 0), ey: new V3(0, 1, 0), n: new V3(0, 0, 1), r: CORE.r };
  let headFound = false;
  const _inv = new M4();
  function setHead(cW, exW, eyW, nW, r) {
    g.updateMatrixWorld(true);
    _inv.copy(g.matrixWorld).invert();
    HD.c.copy(cW).applyMatrix4(_inv);
    const rot = new M4().extractRotation(_inv);
    HD.ex.copy(exW).applyMatrix4(rot).normalize();
    HD.ey.copy(eyW).applyMatrix4(rot).normalize();
    HD.n.copy(nW).applyMatrix4(rot).normalize();
    HD.r = r; BED.r = r; BEDR.value = r;
    // the disk drawn over the bed, a little in front of it; its local x, y are the bed's (radius r)
    const basis = new M4().makeBasis(HD.ex, HD.ey, HD.n);
    seedDisk.matrix.copy(basis).scale(new V3(r, r, 1)).setPosition(HD.c.clone().addScaledVector(HD.n, 0.22));
    seedDisk.matrixWorldNeedsUpdate = true;
    seedHit.matrix.copy(basis).setPosition(HD.c);
    seedHit.matrixWorldNeedsUpdate = true;
    placeTwins();
  }
  const seedHit = new THREE.Mesh(new THREE.CylinderGeometry(CORE.r + 0.6, CORE.r + 0.6, 1.2, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
  seedHit.name = 'hit:seeds';
  seedHit.userData.hitProxy = true;
  seedHit.matrixAutoUpdate = false;
  seedsG.add(seedHit);
  /** find the head: the core's seedBed (world.js passes the core), else its bed mesh in the scene, else the constants */
  function coreHead() {
    if (headFound) return;
    const sb = core?.seedBed;
    if (sb?.center) {
      setHead(sb.center, sb.ex, sb.ey, sb.normal, sb.radius ?? CORE.r);
      headFound = true;
      return;
    }
    let bed = null;
    let root = g.parent;
    while (root?.parent) root = root.parent;
    root?.getObjectByName?.('core')?.traverse((o) => { if (!bed && o.isMesh && o.material?.userData?.u?.uBed) bed = o; });
    if (bed) {
      bed.updateWorldMatrix(true, false);
      const e = bed.matrixWorld.elements;
      const r = bed.material.userData.u.uBed.value.x || CORE.r;
      setHead(new V3().setFromMatrixPosition(bed.matrixWorld), new V3(e[0], e[1], e[2]), new V3(e[4], e[5], e[6]), new V3(e[8], e[9], e[10]), r);
      headFound = true;
      return;
    }
    // the constants: the core's head at its rest
    const cg = new M4().compose(C0, new Q().setFromAxisAngle(YAX, Math.PI / 2 - CORE.az), new V3(1, 1, 1));
    const pv = new M4().compose(new V3(0, heightAt(C0.x, C0.z) + CORE.rise, 0), new Q().setFromAxisAngle(YAX, CORE.yaw), new V3(1, 1, 1));
    const m = cg.multiply(pv).multiply(new M4().makeRotationX(CORE.nod)).multiply(new M4().makeTranslation(0, 0, CORE.bed));
    const e = m.elements;
    setHead(new V3().setFromMatrixPosition(m), new V3(e[0], e[1], e[2]), new V3(e[4], e[5], e[6]), new V3(e[8], e[9], e[10]), CORE.r);
  }
  /** a point on the head (disk coordinates -1 ... 1, lifted off it by z), in the local frame */
  const onHead = (hx, hy, z = 0.3, out = new V3()) => out.copy(HD.c).addScaledVector(HD.ex, hx * HD.r).addScaledVector(HD.ey, hy * HD.r).addScaledVector(HD.n, z);
  // beat 5: they stand up row after row, the front rows first, and fly
  for (const p of pairs) p.t4 = T4.go + (p.r / (HALL.rows - 1)) * T4.spread + p.jit * 0.25;
  const heroSeed = { t4: T4.go + T4.spread * 0.8 };
  // the rest of the five thousand: they come in from beyond the frame, over the hall's far side, the way the hall's go
  const X = [];
  for (let i = 0; i < NX; i++) X.push({ s: new V3(HALL.x0 - 6 - R() * 10, 2 + R() * 5, HALL.z0 - 6 + R() * 20), t0: T4.extra[0] + R() * (T4.extra[1] - T4.extra[0]), jit: R() });
  // the order they land in: every twin takes the place just behind the front at its landing moment, so the field grows
  // across the head from the side they come in by (one twin, one patch of 人)
  const ALL = [...pairs.map((p) => [p, p.t4 + T4.stand + T4.fly]), [heroSeed, heroSeed.t4 + T4.stand + T4.fly], ...X.map((x) => [x, x.t0 + T4.efl])]
    .sort((a, b) => a[1] - b[1]).map(([o]) => o);
  /** the share of the disk on the near side of the front at u (-1 ... 1 along the sweep), and its inverse */
  const share = (u) => 0.5 + (u * Math.sqrt(Math.max(0, 1 - u * u)) + Math.asin(clamp(u, -1, 1))) / Math.PI;
  const front = (f) => { let a = -1, b = 1; for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (share(m) < f) a = m; else b = m; } return (a + b) / 2; };
  /** the sweep (from the rim nearest the hall across the face) and every twin's place, in the head's own coordinates */
  function placeTwins() {
    const d = new V3(HALL.x0 + (HALL.cols - 1) * HALL.pitchX / 2, 0, HALL.z0 + (HALL.rows / 2) * HALL.pitchZ).sub(HD.c);
    SDIR.value.set(-d.dot(HD.ex), -d.dot(HD.ey)).normalize();
    const w = SDIR.value, R2 = rng(5150);
    ALL.forEach((o, i) => {
      const u = front((i + 0.5) / ALL.length) - 0.03, v = (R2() * 2 - 1) * Math.sqrt(Math.max(0, 1 - u * u)) * 0.88;
      o.hx = u * w.x - v * w.y; o.hy = u * w.y + v * w.x;
    });
  }
  coreHead();

  // =================================================================== hit proxies for the hall and its twins
  const boxProxy = (name, min, max) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
    m.name = 'hit:' + name; m.userData.hitProxy = true;
    m.scale.set(max.x - min.x, max.y - min.y, max.z - min.z);
    m.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    g.add(m);
    return m;
  };
  // (zBack: the back row, nearest the camera; the front row's desks reach toward the moderator)
  const zBack = HALL.z0 + (HALL.rows - 1) * HALL.pitchZ;
  const xL = HALL.x0 - 1.2, xR = HALL.x0 + (HALL.cols - 1) * HALL.pitchX + 1.2;
  const hallMin = new V3(xL, -0.2, HALL.z0 - 1.8), hallMax = new V3(xR, HC * 0.85, zBack + 0.6);
  const crowdHit = boxProxy('crowd', hallMin, hallMax);
  const twinsHit = boxProxy('twins', hallMin, hallMax);
  // the test's answers over the hero's pair (beat 3)
  const answersHit = boxProxy('answers', new V3(H0.cx - 1.6, H0.y + HC * 0.86 + 0.45, H0.cz - 0.8), new V3(H0.cx + 1.6, H0.y + HC * 0.86 + 2.5, H0.cz + 0.4));
  // a proxy answers only while its part is on the ground: the hall's people until they leave, the hero likewise
  const proxyScale = (m, on) => { m.userData.s0 ||= m.scale.clone(); if (on) m.scale.copy(m.userData.s0); else m.scale.setScalar(1e-4); m.updateMatrixWorld(true); };

  // =================================================================== the set's ground (drawn by nothing)
  // The story uses this ground in every beat.  This floor writes no colour and no depth, so it is never seen; it only
  // tells the map (scenery.js, look a) where the set stands, so its clearing covers the hall and nothing is planted on it.
  {
    const cell = 1.5, pts = [];
    const inSet = (x, z) => (x >= xL - 0.4 && x <= xR + 0.4 && z >= HALL.z0 - 2.4 && z <= zBack + 2.0)
      || (x >= STAND.x - 2.6 && x <= xR + 0.4 && z >= ASK.z - 2 && z <= HALL.z0)
      || (Math.hypot(x - CLOCK.x, z - CLOCK.z) < 2.4);
    for (let z = ASK.z - 4; z < CLOCK.z + 4; z += cell) {
      for (let x = Math.min(CLOCK.x, STAND.x) - 3; x < xR + 3; x += cell) {
        const cx = x + cell / 2, cz = z + cell / 2;
        if (!inSet(cx, cz) || gy(cx, cz) + oy < 3.2) continue;
        const q = [[x, z], [x + cell, z], [x + cell, z + cell], [x, z + cell]].map(([u, w]) => [u, gy(u, w) + 0.05, w]);
        pts.push(...q[0], ...q[2], ...q[1], ...q[0], ...q[3], ...q[2]);
      }
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    fg.computeVertexNormals();
    const floor = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    floor.name = 'set-ground';
    floor.castShadow = floor.receiveShadow = false;
    floor.renderOrder = -10;
    g.add(floor);
  }

  g.traverse((m) => { if (m.isMesh) m.userData.cs0 = m.castShadow; });

  // =================================================================== pose: (beat, k) -> everything
  const S_ = { beat: LAST, k: 1, t: 0, emph: null, cards: false, fill: 0, qf: null };
  // fades that come and go with the motion (someone leaving, a twin coming into being): applied on top of the part's dim
  const FADES = new Map();   // figure (Object3D) -> [layer, k]
  const fade = (obj, layerName, k) => FADES.set(obj, [layerName, k]);
  const tv = new V3(), tv2 = new V3(), tv3 = new V3(), _sv = new V3(), tq = new Q(), tq2 = new Q(), tq3 = new Q();
  const HIDE = new M4().makeScale(1e-4, 1e-4, 1e-4), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  /** a figure into the instanced mesh of its frame (s: its size; sy: its height, when it grows up from its seat) */
  function putFig(set, frame, pos, yaw, fd = 1, s = 1, sy = s) {
    const F = set[frame];
    const j = F.n++;
    F.mesh.setMatrixAt(j, _m.compose(pos, tq.setFromAxisAngle(YAX, yaw), _s.set(s, Math.max(1e-3, sy), s)));
    F.fade.setX(j, fd);
  }
  const walkFrame = (dist) => 'w' + (Math.floor(((dist / (2 * STRIDE)) % 1 + 1) % 1 * NWALK) % NWALK);
  const qMark = (b, pos, s, rx = 0, ry = -0.2, rz = 0) => {
    b.group.visible = s > 0.01;
    b.group.position.copy(pos);
    b.group.rotation.set(rx, ry, rz);
    b.group.scale.setScalar(Math.max(1e-3, s));
  };

  /**
   * a twin's flight in beat 5: from a (local) up, then round in front of the head's face and onto its place (hx, hy),
   * shrinking to the size of a patch of the field.  u: seconds since it took off.  -> true once it has landed
   */
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3();
  function flight(u, a, hx, hy, dur, rise) {
    const l = u / dur;
    if (l >= 1) return true;
    onHead(hx, hy, 0.4, _d);
    _b.copy(a); _b.y += rise;
    _c.copy(_d).addScaledVector(HD.n, 7).add(tv2.set(0, 1.5, 0));
    const e = l * l * (3 - 2 * l), m = 1 - e;
    tv.set(0, 0, 0).addScaledVector(a, m * m * m).addScaledVector(_b, 3 * m * m * e).addScaledVector(_c, 3 * m * e * e).addScaledVector(_d, e * e * e);
    // (full size while it crosses in front of the head, where the reader sees it; small only as it settles in)
    const s = lerp(1, 0.34, sm(seg(l, 0.74, 1)));
    putFig(TW, l < 0.06 ? 'up' : 'leap', tv, Math.atan2(_d.x - a.x, _d.z - a.z), 1, s);
    return false;
  }
  /** a twin of the hall in beat 5: it stands up from its seat (s, facing yaw) and flies.  u: seconds since it began */
  function twinGoes(u, sx, sy, sz, yaw, hx, hy) {
    if (u <= 0) { putFig(TW, 'sit', tv.set(sx, sy, sz), yaw); return false; }
    if (u < T4.stand) { putFig(TW, u < T4.stand / 2 ? 'half' : 'up', tv.set(sx, sy, sz), yaw); return false; }
    return flight(u - T4.stand, _a.set(sx, sy, sz + 0.2), hx, hy, T4.fly, 6);
  }
  // an envelope's mouth (a pair's: over its desk's end; the hero's, from his envelope as built), in this group's frame
  const mouthOf = (p, out) => pairPt(p, ENV.x, ENV.h * Math.cos(ENV.lean) + 0.12, ENV.z - ENV.h * Math.sin(ENV.lean), out);
  g.updateMatrixWorld(true);
  const MOUTH_H = g.worldToLocal(envG.localToWorld(new V3(0, ENV.h + 0.12, 0)));

  /** a kept page on its way into an envelope (u 0 ... 1): up off the pile, turning upright, down into the mouth */
  function keptPage(j, from, to, u, yaw, s = 1) {
    _v.lerpVectors(from, to, sm(u)); _v.y += Math.sin(Math.PI * u) * 0.75 * s;
    tq.setFromAxisAngle(YAX, yaw).multiply(tq2.setFromAxisAngle(XAX, (Math.PI / 2) * sm(seg(u, 0.2, 0.8))));
    sheets.setMatrixAt(j, _m.compose(_v, tq, _s.setScalar(s * (u > 0.8 ? 1 - (u - 0.8) / 0.2 * 0.6 : 1))));
  }
  /** an envelope's flap: open as the hall fills (beat 2), shut from sealAt, opened for the test (beat 3) and left so */
  const flapOf = (beat, t, sealAt) => {
    const shut = beat < 1 ? 0 : beat > 1 ? 1 : ss(t, sealAt, sealAt + 0.12);
    const open = beat < 2 ? 0 : beat > 2 ? 1 : ss(t, T2.open[0], T2.open[1]);
    return FLAP_OPEN * (1 - shut * (1 - open));
  };

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    coreHead();
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i */
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : clamp((t - a) / (z - a)));
    S_.beat = beat; S_.k = k; S_.t = t;

    // ---- the moderator: holds his clipboard; raises his right hand when he asks (beats 1 and 4), holds the clipboard
    // up when he puts the test's questions (beat 3), looks at his calendar (beat 1) and turns to the flower (beat 5)
    {
      const up = (a, b) => ss(t, a, b) * (1 - ss(t, b + 0.3, b + 0.55));
      let ask1 = 0;
      if (beat === 0) {
        ask1 = ss(t, T0.q[0] - 0.2, T0.q[1]) * (1 - ss(t, T0.float[1], T0.float[1] + 0.4));
        for (const m of T0.more) ask1 = Math.max(ask1, up(m - 0.2, m + 0.05));
      }
      const ask4 = beat === 3 ? Math.max(up(T3.qup[0] - 0.15, T3.qup[1]), up(T3.q2[0] - 0.25, T3.q2[1])) : 0;
      const look = beat === LAST ? ss(t, T4.look[0], T4.look[1]) : 0;
      asker.group.rotation.y = ASK_FACE;
      if (look > 0) asker.setPose('watch', look, { yaw: 1.2, pitch: -0.4, from: 'hold' });
      else asker.setPose('raise', Math.max(ask1, ask4), { side: 'R', from: 'hold' });
      // beat 1: he turns his head after the five as they go, then back to ask again
      if (beat === 0) asker.joints.head.rotateY(-0.45 * ss(t, T0.turn[0], T0.turn[1]) * (1 - ss(t, T0.more[0] - 0.35, T0.more[0] - 0.05)));
    }
    asker.group.updateMatrixWorld(true);
    const clipAt = g.worldToLocal(clip.group.localToWorld(new V3(0, 0.9, 0.1)));

    // ---- beat 1: the five answer (bubbles), the answers go into the clipboard, the report slams down, they leave
    five.forEach((f, i) => {
      const a = Wn(0, T0.ans[0] + i * 0.05, T0.ans[0] + i * 0.05 + 0.2);
      const fl = Wn(0, T0.fly[0] + i * 0.035, T0.fly[1]);
      const head = new V3(f.x, f.y + HP * 0.98, f.z);
      f.bub.group.visible = a > 0 && fl < 1;
      f.bub.group.position.lerpVectors(head.add(new V3(0, 0.75, 0)), clipAt, sm(fl));
      f.bub.group.position.y += Math.sin(Math.PI * sm(fl)) * 0.8;
      f.bub.group.scale.setScalar(Math.max(1e-3, pop(a) * (1 - 0.6 * sm(fl))));
      f.bub.group.rotation.set(0, 0.2, 0);
      // up and away
      const up = Wn(0, T0.up[0] + i * 0.05, T0.up[1] + i * 0.05);
      const wk = Wn(0, T0.walk[0] + i * 0.05, T0.walk[1]);
      const gone = beat > 0 || wk >= 1;
      f.p.group.visible = !gone;
      if (!gone) {
        if (wk <= 0) {
          f.p.group.position.set(f.x, f.y, f.z);
          f.p.group.rotation.y = f.face;
          f.p.setPose('stand', sm(up), { from: 'sit' });
        } else {
          const turnK = sm(seg(wk, 0, 0.18));
          const dir = Math.atan2(Math.cos(f.out), Math.sin(f.out));   // yaw that walks along (cos, sin) of out (xz)
          const yawW = f.face + Math.atan2(Math.sin(dir - f.face), Math.cos(dir - f.face)) * turnK;
          const dist = 6.2 * seg(wk, 0.06, 1);
          f.p.group.rotation.y = yawW;
          const x = f.x + Math.cos(f.out) * dist, z = f.z + Math.sin(f.out) * dist;
          f.p.group.position.set(x, gy(x, z), z);
          f.p.setPose('walk', 1, { dist, stride: 0.3 * HP });
        }
      }
      fade(f.p.group, 'circle', beat === 0 ? ss(t, T0.walk[1] - 0.75, T0.walk[1] - 0.05) : 1);
    });
    // the report: drops onto the stand with a thump (squash), and stays there
    {
      const d = Wn(0, T0.thump[0], T0.thump[1]);
      report.visible = d > 0;
      const e = d * d;
      report.position.y = STAND.h + (1 - e) * 2.2;
      const sq = Wn(0, T0.thump[1] - 0.02, T0.thump[1] + 0.16);
      const s = Math.sin(Math.PI * sq) * 0.2;
      report.scale.set(1 + s * 0.5, Math.max(0.05, 1 - s), 1 + s * 0.5);
      S_.cards = d >= 1;
    }
    // ---- the questions that wait: his speech bubble pops beside his head, drifts over the empty stools and sinks onto
    // one; four more new questions follow it, one onto each empty stool (beat 1); they lie there (beats 2-3); in beat 4
    // they lift and fly over the hall, each to its part of it, and go once the twins there have answered; a follow-up
    S_.qf = null;
    {
      // up and to the left of his head (on screen), the tail down toward it
      const above = new V3(ASK.x - 1.35, ASK_Y + HA + 1.1, ASK.z + 0.3);
      waiting.forEach((b, i) => {
        const f = five[PILE[i]], rz = i % 2 ? -0.16 : 0.18;
        const lying = tv3.set(f.x, f.y + SEAT_TOP + 0.62, f.z + 0.1);
        if (beat === 0) {
          // (the first: as he asks it, while the five leave; the next ones one after another over the caption)
          const t0 = i === 0 ? T0.q[0] : T0.more[i - 1];
          const t1 = i === 0 ? T0.float[0] : t0 + T0.mPop, t2 = i === 0 ? T0.drop[0] : t1 + T0.mF, t3 = i === 0 ? T0.drop[1] : t2 + T0.mD;
          const a = seg(t, t0, t0 + (i === 0 ? T0.q[1] - T0.q[0] : T0.mPop)), fl = ss(t, t1, t2), dr = seg(t, t2, t3), land = seg(t, t3, t3 + 0.25);
          if (a <= 0) { qMark(b, above, 0); return; }
          const over = tv2.set(f.x, f.y + HP + 1.6, f.z);
          const p = tv.lerpVectors(above, over, fl);
          p.y += Math.sin(Math.PI * fl) * 0.6;
          if (dr > 0) p.lerpVectors(over, lying, dr * dr);
          // when it lands it tips back and settles (a little bounce)
          p.y += Math.sin(Math.PI * land) * 0.25 * (1 - land);
          qMark(b, p, pop(a) * lerp(1, 0.78, dr), -0.55 * sm(land), -0.2, rz * sm(land));
        } else if (beat < 3) qMark(b, lying, 0.78, -0.55, -0.2, rz);
        else if (beat === 3) {
          const d = i * 0.05, u = seg(t, T3.qup[0] + d, T3.qup[1] + d), fl = seg(t, T3.qfly[0] + d, T3.qfly[1] + d);
          const lift = _a.copy(lying); lift.y += 1.3;
          const to = tv2.set(HALL.x0 + (i / (PILE.length - 1)) * (HALL.cols - 1) * HALL.pitchX, HC + 3.0, HALL.z0 + 2.6 + (i % 2) * 2.2);
          const p = tv.lerpVectors(lying, lift, sm(u));
          if (fl > 0) { p.lerpVectors(lift, to, sm(fl)); p.y += Math.sin(Math.PI * fl) * 1.4; }
          const gone = seg(t, T3.r1 + 0.05 + d, T3.r1 + 0.3 + d);
          qMark(b, p, lerp(0.78, 1, sm(u)) * (1 - sm(gone)), -0.55 * (1 - sm(u)), -0.2, rz * (1 - sm(u)));
        } else qMark(b, lying, 0);
      });
      // the follow-up: to the hall's left half (the hero's side)
      if (beat !== 3) qMark(q2, above, 0);
      else {
        const a = seg(t, T3.q2[0], T3.q2[1]), f = seg(t, T3.f2[0], T3.f2[1]), gone = seg(t, T3.r2 + 0.05, T3.r2 + 0.3);
        const p = tv.lerpVectors(above, tv2.set(-2.6, HC + 3.0, HALL.z0 + 4.2), sm(f));
        p.y += Math.sin(Math.PI * f) * 2;
        qMark(q2, p, pop(a) * lerp(1, 1.1, sm(f)) * (1 - sm(gone)));
        if (a > 0.5 && gone < 0.5) S_.qf = q2;
      }
    }

    // ---- the hero's envelope: open on his desk as the hall fills, sealed once his two pages are in (beat 2), opened
    // for the test (beat 3) and left open
    envFlap.rotation.x = flapOf(beat, t, T1.seal[0]);
    // (it swells a little as his pages go in and it is sealed)
    // (it comes up with his desk as the hall fills; goes as he stands up to leave)
    const envUp = beat === 1 ? Math.max(1e-3, pop(ss(t, T1.desks[0], T1.desks[1]))) : 1;
    envG.scale.setScalar(envUp * (beat === 1 ? 1 + 0.14 * Math.sin(Math.PI * seg(t, T1.keep[0] + 0.1, T1.seal[1] + 0.05)) : beat === 3 ? Math.max(1e-3, 1 - sm(seg(t, 0, 0.15))) : beat > 3 ? 1e-3 : 1));
    envG.visible = beat >= 1 && beat <= 3;
    S_.sealed = beat === 2 || (beat === 1 && t >= T1.seal[1]);
    proxyScale(envHit, beat >= 1 && beat <= 2);

    // ---- the clock: once round while they answer (beat 2); a few minutes while the twins answer (beat 4)
    {
      const sweep = beat < 1 ? 0 : beat > 1 ? 1 : ss(t, T1.write[0], T1.write[1]);
      let few = 0;
      for (const [a, b, m] of T3.clock) few += m * (beat < 3 ? 0 : beat > 3 ? 1 : ss(t, a, b));   // (minutes)
      const turn = sweep + few / 60;
      minute.rotation.z = -Math.PI * 2 * turn;
      hour.rotation.z = -Math.PI * 2 * (10 / 12 + turn / 12);
    }

    // ---- the hall (beats 2-5)
    for (const F of Object.values(FR)) F.n = 0;
    for (const F of Object.values(TW)) F.n = 0;
    const deskUp = beat < 1 ? 0 : beat > 1 ? 1 : ss(t, T1.desks[0], T1.desks[1]);
    let landed = 0;
    pairs.forEach((p, i) => {
      // the desk: up from the ground as the camera comes (beat 2), and there to the end (the hall empty at the rest)
      const pp = pop(deskUp);
      // seated from beat 2 (each at its moment: the hall fills from the front, dropping into the seats)
      const drop = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, p.t1, p.t1 + T1.drop);
      const wr = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, T1.write[0] + p.jit * 0.12, T1.write[1]);
      // the answered pages: piled up by the hour's end; one goes into the big envelope, the rest turns into points at
      // the pair's moment of the wave (a thin sheaf stays)
      const kept = !p.near ? 0 : beat < 1 ? 0 : beat > 1 ? 1 : seg(t, p.tk, p.tk + 0.1);
      const conv = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, p.t2, p.t2 + 0.3);
      const stackH = drop > 0 ? (lerp(0.02, ST.h, wr) - ST.kept * kept) * (1 - conv) + ST.held * conv : 0;
      const bt = lerp(BK.t0, BK.t1, wr);
      const show = pp > 1e-3;
      const desk = (dx, dz) => _v.set(p.cx + dx * Math.cos(p.yaw) + dz * Math.sin(p.yaw), p.y + deskTop, p.cz - dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw));
      books.setMatrixAt(i, _m.compose(desk(BOOK_X, deskZ), _q.setFromAxisAngle(YAX, p.yaw), _s.set(show ? 1 : 1e-4, Math.max(1e-4, bt * pp), show ? 1 : 1e-4)));
      stacks.setMatrixAt(i, _m.compose(desk(ST.x, deskZ), _q.setFromAxisAngle(YAX, p.yaw), _s.set(show && stackH > 0 ? 1 : 1e-4, Math.max(1e-4, stackH * pp), show && stackH > 0 ? 1 : 1e-4)));
      desks.setMatrixAt(i, _m.compose(_v.set(p.cx, p.y - (1 - pp) * 1.2, p.cz), _q.setFromAxisAngle(YAX, p.yaw), _s.set(1, Math.max(1e-3, pp), 1)));
      // a tested pair's envelope in the aisle beside the person (it comes up with the desk; gone as they stand up to
      // leave, beat 4), and its flap; the far hall's pairs have none
      {
        pairPt(p, ENV.x, 0, ENV.z, _v);
        _q.setFromEuler(_e.set(-ENV.lean, p.yaw + Math.PI, 0, 'YXZ'));
        const es = p.near ? pp * (beat < 3 ? 1 : beat > 3 ? 0 : 1 - sm(seg(t, 0, 0.15))) : 0;
        _m.compose(_v, _q, _s.setScalar(Math.max(1e-4, es)));
        envBodies.setMatrixAt(i, _m);
        envFlaps.setMatrixAt(i, _m2.copy(_m).multiply(_m3.makeTranslation(0, ENV.h, ENV.t / 2)).multiply(_m4.makeRotationX(flapOf(beat, t, p.tk + T1.kFly * 0.8))));
      }
      // the page it keeps from the twin: off the pile into the envelope
      {
        const u = beat === 1 && p.near ? seg(t, p.tk, p.tk + T1.kFly) : 0;
        if (u > 0 && u < 1) {
          const from = desk(ST.x, deskZ).clone(); from.y += stackH + 0.05;
          keptPage(i, from, mouthOf(p, tv2), u, p.yaw);
        } else sheets.setMatrixAt(i, HIDE);
      }
      // the person: drops in and writes (beat 2), sits up and rates by hand (beat 3), walks out (beat 4)
      const base = pairPt(p, 0.5, 0, 0, tv3.clone());
      if (drop > 0 && beat <= 3) {
        if (beat === 1) {
          const e = sm(drop);
          putFig(FR, 'write', tv2.copy(base).setY(base.y + (1 - e) * 1.3), p.yaw, 0.3 + 0.7 * e);
        } else if (beat === 2) {
          // sitting up from the writing; the people round the hero look up at their answers once they are up
          const su = ss(t, T2.sit[0] + p.jit * 0.1, T2.sit[1] + p.jit * 0.1);
          const fr = su < 0.2 ? 'write' : su < 0.55 ? 'wsit' : p.near && t > T2.qs[0] + p.lag + T2.up[1] ? 'look' : 'sit';
          putFig(FR, fr, base, p.yaw, p.near ? 1 : lerp(1, 0.62, ss(t, 0.05, 0.4)));
        } else {
          // up from the bench, a step to the left into the aisle, half a turn, and out along the aisle past the camera
          const up = seg(t, p.t3, p.t3 + T3.up[1]), side = seg(t, p.t3 + T3.aisle[0], p.t3 + T3.aisle[1]), wk = seg(t, p.t3 + T3.walk[0], p.t3 + T3.walk[1]);
          const lx = 0.5 + 0.95 * sm(side);
          if (wk <= 0) putFig(FR, up < 0.5 ? (up <= 0 ? 'sit' : 'half') : 'up', pairPt(p, lx, 0, 0, tv2), p.yaw);
          else {
            const yawW = p.yaw + Math.PI * sm(seg(wk, 0, 0.2));
            const dist = 6.5 * sm(seg(wk, 0.15, 1));
            pairPt(p, lx, 0, -dist, tv2); tv2.y = gy(tv2.x, tv2.z);
            const fd = 1 - sm(seg(wk, 0.55, 1));
            if (fd > 0.3) putFig(FR, wk < 0.15 ? 'up' : walkFrame(dist), tv2, yawW, fd);
          }
        }
      }
      // the twin: comes in the wave (beat 2), rates by hand (beat 3), answers in words (beat 4), flies into the head (5)
      const seat = pairPt(p, -0.5, 0, 0, _sv), sx = seat.x, sz = seat.z;
      if (beat === 1) {
        const tw = seg(t, p.t2 + 0.15, p.t2 + T1.wDur);
        if (tw > 0) putFig(TW, 'sit', tv2.set(sx, p.y, sz), p.yaw, 0.3 + 0.7 * sm(tw * 1.25), 1, sm(Math.min(1, tw * 1.25)));
      } else if (beat === 2) putFig(TW, p.near && t > T2.qs[0] + p.lag + T2.tw[0] ? 'look' : 'sit', tv2.set(sx, p.y, sz), p.yaw, p.near ? 1 : lerp(1, 0.62, ss(t, 0.05, 0.4)));
      else if (beat === 3) putFig(TW, 'sit', tv2.set(sx, p.y, sz), p.yaw, p.near ? 1 : lerp(0.62, 1, ss(t, 0.0, 0.35)));
      else if (beat === LAST) {
        if (twinGoes(t - p.t4, sx, p.y, sz, p.yaw, p.hx, p.hy)) landed++;
      }
      // the wave's points: from the pile to the twin's seat
      for (let j = 0; j < NDW; j++) {
        const di = NDH + i * NDW + j;
        if (beat === 1) {
          const u = seg(t, p.t2 + j * 0.04, p.t2 + 0.38 + j * 0.04);
          if (u > 0 && u < 1) {
            const from = desk(ST.x, deskZ).clone().add(new V3(0, 0.5, 0)), to = tv2.set(sx, p.y + 0.55 * HC, sz);
            _v.lerpVectors(from, to, u);
            _v.y += Math.sin(Math.PI * u) * (0.6 + j * 0.15);
            dots.setMatrixAt(di, _m.compose(_v, _q.identity(), _s.setScalar(1.6)));
            continue;
          }
        }
        dots.setMatrixAt(di, _m.compose(_v.set(p.cx, p.y, p.cz), _q.identity(), _s.setScalar(1e-4)));
      }
    });
    // the hero's twin goes with them (beat 5), the rest of the five thousand after them
    if (beat === LAST) {
      if (twinGoes(t - heroSeed.t4, H0.cx + 0.5, H0.y, H0.cz, Math.PI, heroSeed.hx, heroSeed.hy)) landed++;
      for (const x of X) {
        if (t <= x.t0) continue;
        if (flight(t - x.t0, x.s, x.hx, x.hy, T4.efl, 3 + 2 * x.jit)) landed++;
      }
    }
    for (const set of [FR, TW]) for (const F of Object.values(set)) {
      F.mesh.count = F.n; F.mesh.instanceMatrix.needsUpdate = true; F.fade.needsUpdate = true;
      if (F.hull) F.hull.count = F.n;
    }
    // the hall answers as its people until they have left, then as their twins
    proxyScale(crowdHit, beat >= 1 && beat <= 2);
    proxyScale(twinsHit, beat >= 1 && beat <= 3);
    for (const m of [books, stacks, desks, envBodies, envFlaps]) m.instanceMatrix.needsUpdate = true;
    desks.visible = beat >= 1;
    books.visible = stacks.visible = envBodies.visible = envFlaps.visible = desks.visible;

    // ---- the hero and his twin
    {
      const pp = pop(deskUp);
      heroG.visible = pp > 1e-3;
      heroG.scale.set(1, Math.max(1e-3, pp), 1);
      const drop = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, H0.t1, H0.t1 + T1.drop);
      const wr = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, T1.write[0], T1.write[1]);
      const lift = Wn(1, T1.lift[0], T1.lift[1]);
      const burst = Wn(1, T1.burst[0], T1.burst[1]);
      const kept = Wn(1, T1.keep[0], T1.keep[0] + 0.2);
      heroBook.scale.set(1, lerp(BK.t0, BK.t1, wr), 1);
      // his pile: a few pages slide into the envelope, the rest lifts a little, then turns into points; a sheaf stays
      const sh = lerp(0.02, ST.h, wr) - ST.kept * 2.2 * kept;
      heroStack.visible = drop > 0;
      heroStack.scale.set(1, Math.max(1e-3, burst >= 1 ? ST.held : sh * (1 - 0.9 * burst)), 1);
      heroStack.position.y = deskTop + lift * 0.35 * (1 - burst);
      // two of his pages go into his envelope (the hero's set is turned half round: its (x, z) is (-x, -z) here)
      for (let j = 0; j < 2; j++) {
        const u = beat === 1 ? seg(t, T1.keep[0] + j * 0.1, T1.keep[0] + j * 0.1 + T1.kFly) : 0;
        if (u > 0 && u < 1) keptPage(NP + j, tv.set(H0.cx - ST.x, H0.y + deskTop + sh + ST.kept * (1 - j) + 0.03, H0.cz - deskZ), MOUTH_H, u, Math.PI + (j - 0.5) * 0.14, 1.5);
        else sheets.setMatrixAt(NP + j, HIDE);
      }
      // beat 2: he drops in, writes, then sits up and looks at his twin; beat 3: he rates by hand; beat 4: he leaves
      const look = Wn(1, T1.look[0], T1.look[1]);
      const lv = turnHead(SIT, -0.9, 0.05);
      hero.group.visible = drop > 0;
      hero.group.position.set(0.5, (1 - sm(drop)) * 1.3, 0);
      hero.group.rotation.y = 0;
      let hf = beat === 1 ? 1 - sm(Math.min(1, drop * 1.6)) : 0;
      if (beat < 1) hero.apply(WRITE);
      else if (beat === 1) hero.apply(blendPoses(WRITE, lv, sm(look)));
      else if (beat === 2) hero.apply(blendPoses(lv, UPLOOK, ss(t, T2.sit[0], T2.sit[1] + 0.15)));
      else if (beat === 3) {
        const up = seg(t, T3.up[0], T3.up[1]), side = seg(t, T3.aisle[0], T3.aisle[1]), wk = seg(t, T3.walk[0], T3.walk[1]);
        const x = 0.5 + 0.95 * sm(side);
        if (wk <= 0) { hero.apply(blendPoses(SIT, UP, sm(up))); hero.group.position.set(x, 0, 0); }
        else {
          const yawW = Math.PI * sm(seg(wk, 0, 0.2)), dist = 6.5 * sm(seg(wk, 0.15, 1));
          hero.group.rotation.y = yawW;
          hero.group.position.set(x, 0, -dist);
          hero.setPose(wk < 0.15 ? 'stand' : 'walk', 1, { dist, stride: 0.3 * HC });
        }
        hf = ss(wk, 0.55, 1);
        if (wk >= 1) hero.group.visible = false;
      } else hero.group.visible = false;
      fade(hero.group, 'hero', hf);
      proxyScale(heroHit, hero.group.visible && heroG.visible);
      // his twin: built up by the points (beat 2), looks back at him; rates with him (beat 3); in beat 5 the
      // instanced one flies
      const form = Wn(1, T1.form[0], T1.form[1]);
      twin.group.visible = form > 0 && beat < LAST;
      const tLook = turnHead(SIT, 0.7 * sm(Wn(1, T1.look[0], T1.look[1])), 0.05);
      if (beat <= 1) twin.apply(tLook);
      else if (beat === 2) twin.apply(blendPoses(tLook, UPLOOK, ss(t, T2.sit[0], T2.sit[1] + 0.15)));
      else twin.apply(SIT);
      twin.group.scale.set(1, Math.max(1e-3, beat > 1 ? 1 : sm(Math.min(1, form * 1.25))), 1);
      fade(twin.group, 'twin', beat === 1 ? 1 - sm(Math.min(1, form * 1.6)) : 0);
      proxyScale(twinHit, twin.group.visible);
    }
    // ---- the hero's points: out of his pile in a swirl, onto his twin's body
    for (let i = 0; i < NDH; i++) {
      const d = D[i];
      let s = 0;
      if (beat === 1) {
        const u = seg(t, d.t0, d.t0 + d.fl);
        if (u > 0 && u < 1) {
          // (the hero's set is turned half round: its local (x, z) is (-x, -z) here)
          const from = tv.set(H0.cx - ST.x, H0.y + deskTop + ST.h * 0.6, H0.cz - deskZ);
          const to = tv2.set(H0.cx + 0.5 - d.tx, H0.y + d.ty, H0.cz - d.tz);
          const e = u * u * (3 - 2 * u);
          _v.lerpVectors(from, to, e);
          // a swirl: out round the pair and up, then in onto the figure
          const sw = Math.sin(Math.PI * u);
          _v.x += Math.cos(d.a + u * 4) * d.r * sw;
          _v.z += Math.sin(d.a + u * 4) * d.r * sw * 0.6;
          _v.y += d.h * sw;
          s = u > 0.85 ? (1 - u) / 0.15 : 1;
        }
      }
      if (s > 0) dots.setMatrixAt(i, _m.compose(_v, _q.identity(), _s.setScalar(s)));
      else dots.setMatrixAt(i, _m.compose(_v.set(H0.cx, H0.y, H0.cz), _q.identity(), _s.setScalar(1e-4)));
    }
    dots.instanceMatrix.needsUpdate = true;
    dots.visible = beat === 1;
    proxyScale(dataHit, beat === 1);
    proxyScale(answersHit, beat === 2);

    // ---- beat 4: every twin answers at once, then the follow-up's part of them answers again (a second bubble over
    // the first); the answers stay over the twins to the beat's end, breathing a little
    {
      let n = 0;
      const rounds = [[T3.r1, () => true], [T3.r2, (p) => p.f2]];
      [...pairs, H0].forEach((p, i) => {
        rounds.forEach(([r0, who], w) => {
          const j = w * NRA + i;
          const a = beat === 3 && who(p) ? seg(t, r0 + p.d * 0.1, r0 + p.d * 0.1 + 0.16) : 0;
          if (a > 0) {
            pairPt(p, -0.5, HC * 1.0 + 0.45 + w * 0.85, 0, _v);
            const s = 0.78 * pop(a) * (1 + 0.035 * Math.sin(Math.PI * 2 * (0.7 * t + p.ph)));
            ans.setMatrixAt(j, _m.compose(_v, tq.setFromAxisAngle(YAX, 0.2 + (p.jit - 0.5) * 0.3), _s.setScalar(s)));
            n++;
          } else ans.setMatrixAt(j, HIDE);
        });
      });
      ans.instanceMatrix.needsUpdate = true;
      ans.visible = n > 0;
    }

    // ---- beat 3: the test round the hero.  For each of the two questions, per tested pair (each a little after the
    // one before): a page rises out of its envelope over the person's head, its 「？」 side to us; the twin answers in a
    // bubble over its own head (a face that likes it, or not); the page turns over: the person's own answer, the same
    // face; a check over the pair.  The first page and bubble go as the second question comes; the checks stay.  The
    // far hall gets one check a pair, in a wave from the hero (a very few none)
    {
      const on = beat === 2;
      const lean = tq2.setFromAxisAngle(XAX, -0.42);
      let na = 0;
      for (const L of [0, 1]) for (let j = 0; j < NQ; j++) { ANS.bub[L].setMatrixAt(j, HIDE); ANS.page[L].setMatrixAt(j, HIDE); }
      TESTED.forEach((p, ti) => {
        for (let q = 0; q < 2; q++) {
          const j = ti * 2 + q, L = p.like[q] ? 1 : 0, q0 = T2.qs[q] + p.lag;
          const away = q === 0 ? seg(t, T2.qs[1] + p.lag + T2.away[0], T2.qs[1] + p.lag + T2.away[1]) : 0;
          const u = on ? seg(t, q0 + T2.up[0], q0 + T2.up[1]) : 0;
          if (u > 0 && away < 1) {
            mouthOf(p, _a);
            pairPt(p, 0.58, HC * 0.86 + 1.05, -0.2, _b);
            _v.lerpVectors(_a, _b, sm(u));
            if (away > 0) _v.lerp(_a, sm(away));
            tq.copy(lean).multiply(tq3.setFromAxisAngle(YAX, Math.PI * ss(t, q0 + T2.flip[0], q0 + T2.flip[1])));
            ANS.page[L].setMatrixAt(j, _m.compose(_v, tq, _s.setScalar(Math.max(1e-3, lerp(0.45, 1, sm(u)) * (1 - sm(away))))));
            na++;
          }
          const b = on ? seg(t, q0 + T2.tw[0], q0 + T2.tw[1]) : 0;
          if (b > 0 && away < 1) {
            pairPt(p, -0.88, HC * 0.86 + 1.1, -0.2, _v);
            ANS.bub[L].setMatrixAt(j, _m.compose(_v, lean, _s.setScalar(Math.max(1e-3, pop(b) * (1 - sm(away))))));
            na++;
          }
          const c = on ? seg(t, q0 + T2.ck[0], q0 + T2.ck[1]) : 0;
          checks.setMatrixAt(j, c > 0 ? _m.compose(pairPt(p, q ? -0.42 : 0.42, HC * 0.86 + 2.0, -0.2, _v), lean, _s.setScalar(pop(c) * (p === H0 ? 0.95 : 0.85))) : HIDE);
        }
      });
      for (const L of [0, 1]) { ANS.bub[L].instanceMatrix.needsUpdate = true; ANS.page[L].instanceMatrix.needsUpdate = true; }
      answersG.visible = on && na > 0;
      checks.instanceMatrix.needsUpdate = true;
      checks.visible = on;
      pairs.forEach((p, i) => {
        const t0 = T2.far[0] + p.d * (T2.far[1] - T2.far[0]);
        const c = on && !p.near && !p.miss ? seg(t, t0, t0 + 0.15) : 0;
        farChecks.setMatrixAt(i, c > 0 ? _m.compose(pairPt(p, 0, HC * 1.12, 0, _v), _q.identity(), _s.setScalar(pop(c) * 0.9)) : HIDE);
      });
      farChecks.instanceMatrix.needsUpdate = true;
      farChecks.visible = on;
    }

    // ---- beat 5: the head fills as they land
    {
      const fill = beat < LAST ? 0 : k >= 1 ? 1 : landed / ALL.length;
      CUT.value = fill <= 0 ? -2 : fill >= 1 ? 2 : front(fill);
      S_.fill = fill;
      // once all have landed they settle and wait to be asked: the field eases to the quieter tone the core's own
      // story opens with (d-core.js wakes them there)
      SETTLE.value = beat < LAST ? 0 : ss(t, BEATS[LAST].dur - 1.0, BEATS[LAST].dur);
      seedDisk.visible = true;
    }
    sheets.instanceMatrix.needsUpdate = true;
    sheets.visible = beat === 1;
    applyEmphasis();
    return api;
  }

  // =================================================================== emphasis by subtraction
  // which dim groups each part keeps at full strength
  const FULL = {
    asker: ['asker', 'question'], circle: ['circle', 'asker'], report: ['report'], question: ['question'], clock: ['clock'],
    crowd: ['crowd', 'hero', 'checksFar'], hero: ['hero', 'envelope', 'answers', 'checks'], twin: ['twin', 'answers', 'checks'], envelope: ['envelope', 'answers'],
    data: ['data', 'twin', 'hero'], twins: ['twins', 'twin', 'checks', 'checksFar'], answers: ['answers', 'checks'], seeds: ['seeds', 'twins'],
  };
  function applyEmphasis() {
    const E = S_.emph;
    const map = E === null;
    const full = new Set();
    if (!map) for (const id of E) for (const l of FULL[id] || []) full.add(l);
    // (in beat 4 the people walking out are the act itself: drawn in full while they go)
    if (!map && S_.beat === 3 && E.includes('twins')) full.add('crowd').add('hero');
    if (map) dim(g, 0);
    for (const [name, objs] of Object.entries(layers)) {
      // the seed head is this district's own drawing over the core's: on the map the core shows its own field
      if (name === 'seeds') seedsG.visible = !map;
      const a = map ? 0 : full.has(name) ? 0 : 1;
      for (const o of objs) {
        // (something not drawn now takes the dim of its own part: full only if that part is the one emphasised)
        dim(o, map ? 0 : o.visible ? a : E.includes(name) ? 0 : 1);
        o.traverse((m) => { if (m.isMesh && m.userData.cs0 !== undefined) m.castShadow = a < 0.5 ? m.userData.cs0 : false; });
      }
    }
    // the people of beat 1, the hero and his twin keep their own fade (pose) on top of the part's dim
    for (const [obj, [ln, k]] of FADES) {
      // (on the map nothing is dimmed: a figure that has gone is hidden, not faded)
      const a = map ? 0 : !obj.visible ? (E.includes(ln) ? 0 : 1) : Math.max(full.has(ln) ? 0 : 1, k);
      dim(obj, a);
      obj.traverse((m) => { if (m.isMesh && m.userData.cs0 !== undefined) m.castShadow = a < 0.5 ? m.userData.cs0 : false; });
    }
  }
  function emphasize(ids) {
    S_.emph = ids && ids.length ? [...ids] : null;
    applyEmphasis();
  }

  // =================================================================== anchors: labels, words, hotspots, framing
  g.updateMatrixWorld(true);
  const wp = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(new V3(x, y, z)); };
  const hipFront = (p) => () => wp(p.joints.hips, 0, -0.02 * p.height, 0.06 * p.height);
  const headW = (hx, hy, z = 0.3) => g.localToWorld(onHead(hx, hy, z));
  // the pair right in front of the hero (the next row toward the moderator, nearest his x)
  const behind = pairs.filter((p) => p.r === HERO.row - 1).sort((a, b) => Math.abs(a.cx - H0.cx) - Math.abs(b.cx - H0.cx))[0];
  const qAt = (b) => () => wp(b.group, 0, 0, 0.2);
  const clockFace = (dx = 0, dy = 0) => wp(faceG, dx, dy, 0.3);
  const parts = {
    asker: { hit: askerHit, anchor: hipFront(asker), beat: 0 },
    circle: { hit: circleHit, anchor: () => W(C1.x, gy(C1.x, C1.z) + 0.5, C1.z), beat: 0 },
    report: { hit: reportHit, anchor: () => wp(report, 0.2, REP.h, 0.3), beat: 0 },
    question: { hit: qHit, anchor: () => (q1.group.visible ? qAt(q1)() : W(five[WAIT].x, five[WAIT].y + SEAT_TOP + 0.6, five[WAIT].z)), beat: 0 },
    crowd: { hit: crowdHit, anchor: () => W(behind.cx - 0.5, behind.y + HC * 0.5, behind.cz + 0.25), beat: 1 },
    clock: { hit: clockHit, anchor: () => clockFace(0, -CLOCK.r * 0.45), beat: 1 },
    hero: { hit: heroHit, anchor: hipFront(hero), beat: 1 },
    twin: { hit: twinHit, anchor: hipFront(twin), beat: 1 },
    envelope: { hit: envHit, anchor: () => wp(envG, 0, ENV.h * 0.55, ENV.t), beat: 2 },
    answers: { hit: answersHit, anchor: () => W(H0.cx, H0.y + HC * 0.86 + 1.1, H0.cz - 0.2), beat: 2 },
    data: { hit: dataHit, anchor: () => W(H0.cx, H0.y + deskTop + 0.6, H0.cz - deskZ), beat: 1 },
    twins: { hit: twinsHit, anchor: () => W(behind.cx + 0.5, behind.y + HC * 0.5, behind.cz + 0.25), beat: 3 },
    seeds: { hit: seedHit, anchor: () => headW(-0.55, -0.55, 0.4), beat: LAST },
  };
  const labelAt = {
    crowd: () => W(behind.cx - 0.5, behind.y + HC * 0.95, behind.cz),
    // (the rim's upper right)
    clock: () => clockFace(CLOCK.r * 0.6, CLOCK.r * 0.8),
    // (the hero's envelope: on its face, left of the button, away from him)
    envelope: () => (envG.visible && S_.sealed ? wp(envG, -ENV.w * 0.2, ENV.h * 0.5, ENV.t / 2) : null),
    // (in the test the answers stand over their heads: the names go on their backs)
    hero: () => (!hero.group.visible ? null : S_.beat === 2 ? wp(hero.joints.waist, 0, 0.1 * HC, -0.08 * HC) : wp(hero.joints.head, 0, 0.16 * HC, 0)),
    twin: () => (!twin.group.visible ? null : S_.beat === 2 ? wp(twin.joints.waist, 0, 0.1 * HC, -0.08 * HC) : wp(twin.joints.head, 0, 0.16 * HC, 0)),
    // (beat 1: the first of the questions that wait, wherever it is; beat 4: the follow-up while it is out)
    question: () => (S_.beat === 0 ? (q1.group.visible ? wp(q1.group, 0.45, 0.55, 0.2) : null) : S_.qf ? wp(S_.qf.group, 0, 0.95, 0.2) : null),
  };
  // words on the objects: one point per row; the surfaces they fit in (world units).  The head's words: two rows
  // across its middle, once it has filled enough to carry them (a district view only; the map shows the core's)
  const decalAt = {
    report: () => (S_.cards && S_.emph !== null ? wp(report, 0.12, REP.h + 0.02, 0) : null),
    seeds: () => (S_.emph !== null && S_.fill > 0.35 ? [headW(-0.36, 0.085, 0.5), headW(-0.36, -0.075, 0.5)] : null),
  };
  const decalUnit = { report: 0.5, seeds: 1.4 };
  const decalSize = { report: [REP.w - 0.1, REP.d - 0.2], seeds: [HD.r * 1.15, HD.r * 0.5] };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const hallPt = (x, y, z) => W(x, gy(x, z) + y, z);
  const clockTop = () => W(CLOCK.x, CLOCK_Y + CLOCK_FACE_Y + CLOCK.r + 0.5, CLOCK.z);
  const clockSide = (s) => W(CLOCK.x + s * (CLOCK.r + 0.3), CLOCK_Y + CLOCK_FACE_Y, CLOCK.z);
  const askTop = () => W(ASK.x, ASK_Y + HA + 1.2, ASK.z);     // (his clipboard held up)
  // beat 1: the five (their heads and the bubbles over them, their feet), the moderator, the stand and its calendar,
  // the 「？」 by him
  const S_CIRCLE = () => [
    ...five.map((f) => W(f.x, f.y + HP + 1.3, f.z)), ...five.map((f) => W(f.x, f.y, f.z + 0.4)),
    W(ASK.x, ASK_Y + HA + 0.3, ASK.z), W(ASK.x, ASK_Y, ASK.z + 0.7), W(STAND.x - STAND.w / 2, STAND_Y, STAND.z + 0.9),
    W(STAND.x - STAND.w / 2, STAND_Y + STAND.h + 1.0, STAND.z), W(ASK.x - 2.5, ASK_Y + HA + 2.2, ASK.z + 0.3),
  ];
  // beats 2-4 (one camera for the three): from behind the hero's pair (his raised hand's height over it) and the clock
  // at the room's near corner, up the room to the moderator
  const S_HERO = () => [
    clockTop(), clockSide(1), W(CLOCK.x + 0.4, CLOCK_Y + CLOCK_FACE_Y - CLOCK.r, CLOCK.z),
    W(H0.cx - 1.3, H0.y, H0.cz + 0.6), W(H0.cx + 1.6, H0.y, H0.cz + 0.6), W(H0.cx + 1.6, H0.y + HC * 1.4, H0.cz),
    W(H0.cx + HALL.pitchX + 1.0, H0.y + HC * 0.9, H0.cz - HALL.pitchZ), askTop(),
    W(STAND.x, STAND_Y + STAND.h + 0.8, STAND.z),
  ];
  // beat 3: close on the test, without the clock: the hero's pair (his envelope at its end, the answers and the
  // checks over their heads) and the pairs tested round it (their answers)
  const S_TEST = () => [
    W(H0.cx - 1.55, H0.y, H0.cz + 0.7), W(H0.cx + 1.35, H0.y, H0.cz + 0.7),
    W(H0.cx - 1.55, H0.y + HC * 0.86 + 2.45, H0.cz - 0.2), W(H0.cx + 1.5, H0.y + HC * 0.86 + 2.45, H0.cz - 0.2),
    ...TESTED.slice(1).flatMap((p) => [g.localToWorld(pairPt(p, -1.45, HC * 0.86 + 2.3, -0.2, new V3())), g.localToWorld(pairPt(p, -1.2, 0, -0.6, new V3()))]),
    // (up the room: the rows ahead, getting their checks, fill the top of a tall screen)
    W(H0.cx + 1.2, H0.y + HC + 4.2, H0.cz - HALL.pitchZ * 2.9),
  ];
  // beat 5 and the end: the head (with room round it for the twins coming in), the room and its clock below it
  const ring = (r) => Array.from({ length: 12 }, (_, i) => headW(Math.cos((i / 12) * Math.PI * 2) * r, Math.sin((i / 12) * Math.PI * 2) * r));
  const S_HEAD = () => [...ring(1.06), clockSide(-1), W(CLOCK.x, CLOCK_Y, CLOCK.z + 0.9), hallPt(xR, 0, zBack + 1), hallPt(HALL.x0 + HALL.pitchX, HC, HALL.z0)];
  const S_END = () => [...ring(1.04), clockSide(-1), W(CLOCK.x, CLOCK_Y, CLOCK.z + 0.9), hallPt(xR, 0, zBack + 1), W(ASK.x, ASK_Y, ASK.z + 0.8)];
  const land = () => typeof innerWidth === 'number' && innerWidth > innerHeight && innerHeight < 560;
  const shot = (pts, o = {}) => ({ az: o.az ?? CAM_AZ, get el() { return land() ? (o.elL ?? o.el) : o.el; }, get margin() { return o.margin; }, anchors: pts });
  // by beats[i].shot: 0 the five, 1 the room from behind the hero with its clock (beats 2, 4), 2 the test (beat 3),
  // 3 the flower (beat 5, the end)
  const shots = {
    phone: [shot(S_CIRCLE, { el: 0.72, az: CAM_AZ + 0.12 }), shot(S_HERO, { el: 0.78, elL: 0.5 }), shot(S_TEST, { el: 0.6, elL: 0.45 }), shot(S_HEAD, { el: 0.52 })],
    desk: [
      shot(() => [...S_CIRCLE(), W(C1.x - 4.5, 0, C1.z), W(ASK.x + 4.5, 0, ASK.z)], { el: 0.34, az: CAM_AZ + 0.12 }),
      shot(() => [...S_HERO(), hallPt(xR, 0, zBack + 0.8), W(STAND.x - STAND.w / 2, STAND_Y + STAND.h, STAND.z)], { el: 0.46 }),
      shot(S_TEST, { el: 0.55 }),
      // (map round, placement only: the desk's end also holds the tasting stage in front of the flower -- 先問數位分身's
      // people under its gate, seen at its rest -- so the bottom edge never cuts them at the heads)
      shot(() => [...S_END(), ...(core?.parts?.tasters ? [core.parts.tasters.anchor(), core.parts.tasters.anchor().clone().setY(core.parts.tasters.anchor().y - 2.4)] : [])], { el: 0.42 }),
    ],
  };

  function rest() { return pose(LAST, 1); }
  const api = {
    id: 'twins',
    group: g,
    // on the twins' island in the AI's water, beside the flower (world.js: buildTwins({ core }))
    zone: 'ai',
    // the map pill: over the hall's clock at the room's near left corner, the one part of the set the flower's head
    // leaves in sight from the map's default views (the core's own pill keeps to the head)
    anchor: W(CLOCK.x - 0.6, CLOCK_Y + CLOCK_FACE_Y + 6, CLOCK.z + 1.0),
    pin: W(CLOCK.x, CLOCK_Y + CLOCK_FACE_Y + CLOCK.r + 0.3, CLOCK.z),
    focus: { pos: W(-0.2, 6, 3), r: 26 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalUnit,
    decalSize,
    lever: null,
    get mainActor() { return S_.emph === null ? 'asker' : ACTOR[S_.beat] || 'asker'; },
    restParts: REST,
    pose,
    rest,
    ambient() { paintOnce(); },
    emphasize,
    update(t, dt) { this.ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { asker: asker.group, hero: hero.group, twin: twin.group, five: five.map((f) => f.p.group), seedDisk, HD, pairs: NP, clock: clockG, envelope: envG, hallG, answers: answersG },
  };
  rest();
  emphasize(null);
  return api;
}
