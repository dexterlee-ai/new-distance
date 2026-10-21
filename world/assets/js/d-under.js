// 組織文化 · culture (article 16) — in the dock cut into the rim at 216°–239° (terrain.js DOCK), told in five beats.
// The camera stands outside the rim, just over the water at about the height of the deck, and looks into the cut the
// way a section drawing does: an undulating waterline across the frame; above it a company's ship stranded on the tip
// of an iceberg, below it the iceberg's mass in the water of the cut (lit under the surface, dark with depth).  The tip
// and the mass are one white block through the waterline.
// Beat 1: an AI engine and a heap of AI tools (typed, teal) fall out of the sky onto the stern deck (16 b41: 「你只是
// 買了一堆 AI 工具」); the engine's screw races in the air well clear of the water, its wash blown up into the sky;
// twice the ship rears up, bow high, and is shoved forward over the ice, and twice the ice throws it back with a
// heavy jolt — chips fly, impact strokes burst at the contact — it goes nowhere.  Beat 2: beside each group a pencil
// bar rises, the 高層's (at the stern, by the two cheering with their arms up at the engine) 19 % taller than the
// 基層's (at the bow, by the three who are down: one slumped, one crouched, one sitting with his head in his hands);
// the 基層's level is carried across as a dashed line and the 19 % stands above it, dark, under 「高 19%」 (16 b4).
// Beat 3: the camera goes down the iceberg as red runs down it from the tip (the obstacle; lime is kept for what gets
// better), and three paper slips show in it, 怕失業 · 怕失去權力 · 部門各做各的 (people's fears: human words on paper).
// Beat 4 (back on deck, close): 先把人放在 AI 工具之前 — the heap of tools shows faint teal again behind the leader;
// he turns his back on it and walks to the 基層, puts his hand on the first one's shoulder (a human act, no device:
// 16 b9, b36); that one straightens up and turns lime, then the crouching one gets up, then the sitting one stands —
// the lime goes through them one by one — and the other 高層 follows him over.  All the while the ice under them stays
// red with its three fears (nothing has made them go yet).  Beat 5 (wide): with the people lime, the slips go out one
// by one and the red leaves the ice, the ice shrinks to half and its tip sinks well under water; the ship lurches
// forward as in beat 1, only now nothing throws it back: it slides down into the water, its screw bites, it turns lime
// (the 基層 keep theirs) and surges off a hull length and more, clear of the ice, a long wake of foam and bubbles
// behind it.
//
// Everything the reader sees is a pure function of (beat, k): pose().  No copy lives here: captions, labels, the words
// on the slips and the bar and the tap lines come from world.json by part id.
// Local frame: +z points out of the rim, at the camera; +x is the camera's right (toward 216°); y = 0 is the waterline.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { rng, clamp } from './kit.js';
import { SEA_Y, DOCK, fbm } from './terrain.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), ZAX = new V3(0, 0, 1);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
/** a pop: 0 → a little past 1 → 1 */
const pop = (x) => { x = clamp(x); const c = 2.2; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const strip = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };

// ------------------------------------------------------------------ the set (local units)
const TH = DOCK.th, RC = 95;                         // where the ship is stranded (the dock runs on toward 216°)
const A = (TH * Math.PI) / 180;
const YAW = Math.PI / 2 - A;                         // group turn: local +z → out of the rim
const DELTA = 0.5;                                   // the camera stands a little round toward the stern's side, so the
                                                     // screw's disc reads as a disc and the hull as a hull
const VIEW_AZ = A + DELTA;
// the iceberg: elliptical rows (y, half-width along x, half-depth along z), its tip 4.2 above the water (the ship sits on
// it high enough that the screw under the stern turns well clear of the water — at phone scale a strip of paper of
// 30 px and more between the blades and the waterline — and low enough to come down into the water)
const ICE = { x: -0.8, z: 0.2 };
const ROWS = [
  [4.2, 2.9, 1.6], [3.7, 3.5, 1.95], [2.2, 4.2, 2.35], [0.0, 4.9, 2.75], [-1.8, 5.7, 3.2], [-4.0, 6.6, 3.6],
  [-6.0, 7.0, 3.85], [-8.5, 6.6, 3.6], [-11.0, 5.4, 3.0], [-13.2, 3.4, 2.0], [-14.6, 1.2, 0.8],
];
const ICE_TOP = 4.2, ICE_BOT = -14.95;
const SHRINK = { y: -10, k: 0.5 };                  // beat 5: the ice shrinks about this height to half (its tip well under)
// the ship (its own frame: keel at y = 0 amidships, bow toward +x): 14 long, beam 4, 2.4 deep
const HULL = { x0: -7.0, x1: 7.3, hw: 2.0, deck: 2.4, bul: 0.3 };
// z1: afloat it drifts out toward the mouth of the cut while it glides, so the screw it has put into the water is
// seen through the cut under the waterline (from where it sat on the ice, the water's surface hid it).  x1: it sails
// off a little more than its own length (14.3), its screw well clear of the shrunken ice, leaving a long wake (the
// dock runs on toward 216°, terrain.js)
const SHIP = { x0: -1.0, x1: 13.6, z: 0.15, z1: 1.45, keel0: ICE_TOP, keel1: -1.45, tilt: 0.02 };
const WH = { x0: -4.7, x1: -2.4, z0: -1.85, z1: 0.3, h: 3.0 };    // the wheelhouse, off the near side
const ENG = { x: -6.0, z: -0.75, w: 1.6, h: 1.4, d: 1.8 };          // the AI engine on the stern deck, over its screw
// the propeller's centre (ship frame), its axis along the ship: stranded, its lowest tip is a clear metre over the
// water (it turns in the air); afloat, the whole disc is under it
const PROP = { x: -7.6, y: -0.35, r: 1.65 };
const SPIN_W = 22;                                   // rad/s at full speed: it races
const DROP = 8.5;                                    // the tools fall out of the sky this far onto the deck
const HH = 4.6, HS = 4.0;                            // the leader (the decisive actor), everyone else
const STRIDE_H = 0.4 * HH, STRIDE_S = 0.4 * HS;
// people (ship frame, x along the ship, z across: + is the camera's side)
const AT = {
  hero: [-4.85, 1.35], lead: [-6.25, 1.25],
  s1: [1.6, 1.3], s2: [3.65, 1.05], s3: [5.75, 0.15],
  // beat 4: the leader stands at the first one's side (toward the stern, a little nearer the camera than him), his
  // hand on that one's shoulder; the other 高層 comes over after him and stops on the open deck between him and the
  // wheelhouse (against the sky, not the wheelhouse's white face), a little farther back: their hit boxes do not
  // touch, so a tap on one never answers for the other
  heroEnd: [0.15, 1.0], leadEnd: [-2.0, 0.55],
};
const CRATE = { x: 5.75, z: 0.15, w: 0.95, d: 0.9 };
// beat 2's two bars, each beside its own group (ship frame x of each bar's centre; the 高層's in front of the
// wheelhouse, just bow-side of the leader; the 基層's just stern-side of the first of them): the 基層's hS tall, the
// 高層's × ratio.  Between them the empty deck
const GA = { xH: -3.15, xS: 0.3, z: 0.75, w: 1.15, d: 0.6, hS: 5.0, ratio: 1.19 };

// ------------------------------------------------------------------ the beats
// dur = the motion; the caption lands at keyAt and is held 0.8 s + 0.25 s per 字 (story.js)
const BEATS = [
  // 1 買了 AI 工具，船還是不動 — tools rain onto the deck, the screw races in the air, the ship rears up on the ice and
  // is thrown back, twice
  { dur: 2.6, keyAt: 1.65, shot: 0, parts: ['propeller', 'ship', 'tip', 'mass'] },
  // 2 高層比基層，正面感受高 19% — a bar rises by each group, the 高層's a fifth taller; the 高層 cheer, the 基層 are
  // down
  { dur: 1.8, keyAt: 0.8, shot: 0, parts: ['leaders', 'hero', 'staff'] },
  // 3 卡住的，在水面下 — the camera goes down the iceberg; it turns red from the tip down; three slips show in it
  { dur: 1.9, keyAt: 1.15, shot: 1, parts: ['mass', 'tip'] },
  // 4 先把人放在 AI 工具之前 — close on the deck: the leader leaves the tools for the people, his hand on a shoulder;
  // they come up one by one, lime.  The ice under them steps back only half-way: still red, its fears still on it
  // (nothing has made them go yet: they go in beat 5, once the people are lime)
  { dur: 3.0, keyAt: 1.45, shot: 3, parts: ['hero', 'staff', 'leaders'] },
  // 5 船終於開得動了 — wide: the fears go out, the ice gives way, the ship comes down into the water and sails off
  { dur: 4.0, keyAt: 1.85, shot: 2, parts: ['ship', 'propeller', 'staff', 'hero', 'leaders', 'mass', 'tip'] },
];
const LAST = BEATS.length - 1;
const ACT = 3;                                       // the beat of the decisive act
// beat 1: the engine is dropped onto the stern deck (bought, installed), a heap of tools after it, its screw races in
// the air and the ship strains (16 b41: 「你只是買了一堆 AI 工具」, b42: 只能在水面上空轉)
const T0 = { drop0: 0.0, land: 0.36, pile: [0.1, 0.8], fall: 0.34, spin0: 0.75, spin1: 1.05, lurch: [[1.1, 1.6], [1.72, 2.18]], strain1: 2.5 };
const T1 = { cheer0: 0.05, cheer1: 0.5, slump0: 0.1, slump1: 0.6, sit0: 0.12, sit1: 0.75, bars: [0.05, 0.62], gap: 0.6 };
// beat 3: the red runs down the ice from its tip to its foot; the slips show as it passes them
const T2 = { sweep0: 0.0, sweep1: 0.8, slip: [0.4, 0.62, 0.84] };
// beat 4: the walk (the other 高層 0.3 s behind), the hand onto the shoulder, the three come up one by one (each
// turns lime as he starts up)
const T3 = { walk: [0.05, 1.1], lead: [0.35, 1.55], reach: [1.05, 1.4], up: [[1.38, 1.9], [1.62, 2.15], [1.86, 2.55]] };
// beat 5: the slips go out one by one, 怕失業 first, the red leaving the ice with them; the ice shrinks, and the ship —
// its screw has raced since beat 1 — lurches forward as it did then, only this time the ice lets it go: it slides
// down off the sinking tip into the water, its screw bites, it surges on and sails off a hull length and more.
// glide: [start, stop] of the run, p: where in it the surge peaks (the speed rises to there and eases off after)
const T4 = { out: [0.3, 0.55, 0.8], drain: [0.25, 1.15], shrink: [1.0, 1.8], glide: [1.0, 3.9], p: 0.16 };
const REST = ['ship', 'hero', 'staff', 'leaders', 'propeller', 'mass', 'tip'];

// ---- beat 5's motion as functions of its time t (pose(), the wake and the framing all read them)
/** the ice's scale about SHRINK.y, and its top (local y) */
const iceScale5 = (t) => lerp(1, SHRINK.k, ss(t, T4.shrink[0], T4.shrink[1]));
const iceTop5 = (t) => SHRINK.y + (ICE_TOP - SHRINK.y) * iceScale5(t);
/** the keel rides the sinking tip down until it floats (the settling bob comes on top) */
const keel5 = (t) => Math.max(SHIP.keel1, iceTop5(t));
/** the run: the speed rises to its peak at p and eases off to the stop (a triangle; C1 at p) */
const run = (u) => { u = clamp(u); const p = T4.p; return u < p ? (u * u) / p : 1 - ((1 - u) * (1 - u)) / (1 - p); };
const runInv = (f) => { f = clamp(f); const p = T4.p; return f < p ? Math.sqrt(f * p) : 1 - Math.sqrt((1 - f) * (1 - p)); };
const shipX5 = (t) => lerp(SHIP.x0, SHIP.x1, run(seg(t, T4.glide[0], T4.glide[1])));
const shipZ5 = (t) => lerp(SHIP.z, SHIP.z1, ss(t, T4.shrink[1] - 0.2, T4.glide[1]));
/** when, in beat 5, the keel has come down to y (the tip sinks steadily: bisection) */
const keelAt = (y) => { let a = T4.shrink[0], b = T4.shrink[1]; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (keel5(m) > y) a = m; else b = m; } return b; };
/** when, in beat 5, the ship's centre passes x */
const timeAtX = (x) => T4.glide[0] + (T4.glide[1] - T4.glide[0]) * runInv((x - SHIP.x0) / (SHIP.x1 - SHIP.x0));
// the moments of beat 5: the screw's hub goes under (sub), the transom meets the water (touch), it floats (afloat)
const T5 = { sub: keelAt(0.15), touch: keelAt(-0.6), afloat: keelAt(SHIP.keel1 + 1e-3) };

// ------------------------------------------------------------------ pose vectors (people.js, normalised units)
const hc = (h) => ({ p: h.p.clone(), pole: h.pole.clone(), grip: h.grip.clone() });
const fc = (f) => ({ p: f.p.clone(), q: f.q.clone() });
function clonePose(v) {
  return {
    hips: { p: v.hips.p.clone(), q: v.hips.q.clone() }, waist: v.waist.clone(), neck: v.neck.clone(), head: v.head.clone(),
    hand: { L: hc(v.hand.L), R: hc(v.hand.R) }, foot: { L: fc(v.foot.L), R: fc(v.foot.R) },
  };
}
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
/** a pose held at root `from` ({ x, z, yaw }), expressed in root `to` (normalised by the figure's height H) */
function reframe(v, from, to, H) {
  const c = Math.cos(to.yaw), s = Math.sin(to.yaw);
  const dx = from.x - to.x, dz = from.z - to.z;
  return movePose(v, from.yaw - to.yaw, (dx * c - dz * s) / H, (dx * s + dz * c) / H);
}
const chestQ = (v) => v.hips.q.clone().multiply(v.waist);
const chestPt = (v, x, y, z) => new V3(x, y, z).applyQuaternion(v.waist).add(new V3(0, 0.066, -0.004)).applyQuaternion(v.hips.q).add(v.hips.p);
const chestDir = (v, x, y, z) => new V3(x, y, z).applyQuaternion(chestQ(v));
const eul = (x, y, z) => new Q().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
/** the head (and neck) turned by yaw and nodded by pitch on top of a pose: the hands keep their places */
function look(v, yaw, pitch = 0) {
  const o = clonePose(v);
  o.neck.multiply(eul(pitch * 0.4, yaw * 0.42, 0));
  o.head.multiply(eul(pitch * 0.6, yaw * 0.58, 0));
  return o;
}
/** both arms thrown up (a cheer): the raised arm of 'raise' on both sides */
function cheer(v) {
  const o = clonePose(v);
  o.neck.copy(eul(-0.12, 0, 0)); o.head.copy(eul(-0.2, 0, 0));
  o.waist.copy(eul(-0.06, 0, 0));
  o.hand.R.p.copy(chestPt(o, -0.21, 0.5, 0.09)); o.hand.R.pole.copy(chestDir(o, -1, -0.2, -0.6));
  o.hand.L.p.copy(chestPt(o, 0.21, 0.5, 0.09)); o.hand.L.pole.copy(chestDir(o, 1, -0.2, -0.6));
  return o;
}
/** bent over, shoulders down, the head hung below them, the arms dangling in front */
function slump(v) {
  const o = clonePose(v);
  o.hips.q.multiply(eul(0.12, 0, 0));
  o.waist.multiply(eul(0.5, 0, 0));
  o.neck.multiply(eul(0.6, 0, 0));
  o.head.multiply(eul(0.7, 0, 0));
  for (const k of ['L', 'R']) {
    const s = k === 'L' ? 1 : -1;
    o.hand[k].p.copy(chestPt(o, s * 0.11, -0.2, 0.09));
    o.hand[k].pole.copy(chestDir(o, s * 0.3, -0.1, -1));
    o.hand[k].grip.copy(chestQ(o));
  }
  return o;
}
/** squatting on his heels, folded over his knees, the head down on his forearms */
function crouch(v) {
  const o = clonePose(v);
  o.foot.L.p.set(0.085, v.foot.L.p.y, 0.06); o.foot.R.p.set(-0.085, v.foot.R.p.y, 0.06);
  o.hips.p.set(0, 0.25, -0.1);
  o.hips.q.copy(eul(0.5, 0, 0));
  o.waist.copy(eul(0.5, 0, 0));
  o.neck.copy(eul(0.45, 0, 0));
  o.head.copy(eul(0.4, 0, 0));
  for (const k of ['L', 'R']) {
    const s = k === 'L' ? 1 : -1;
    // the forearms across the knees
    o.hand[k].p.set(-s * 0.03, 0.31, 0.2);
    o.hand[k].pole.set(s * 1, -0.3, -0.2);
    o.hand[k].grip.copy(chestQ(o));
  }
  return o;
}
/** the right hand on a shoulder: `at` is the point in this figure's root frame (normalised), the arm bent, the head
 * and the chest leaning a little toward him */
function touch(v, at) {
  const o = clonePose(v);
  o.waist.multiply(eul(0.06, 0, 0));
  o.head.multiply(eul(0.16, 0, 0));
  o.hand.R.p.copy(at);
  o.hand.R.pole.copy(chestDir(o, -1, -0.7, -0.3));
  o.hand.R.grip.copy(chestQ(o)).multiply(eul(0, 0, -0.5));
  return o;
}
/** seated, bent far forward, the elbows down on the knees and the head low in the hands (the elbows out to the
 * sides read as arms thrown up at phone scale) */
function headInHands(v) {
  const o = clonePose(v);
  o.waist.multiply(eul(0.72, 0, 0));
  o.neck.multiply(eul(0.4, 0, 0));
  o.head.multiply(eul(0.45, 0, 0));
  for (const k of ['L', 'R']) {
    const s = k === 'L' ? 1 : -1;
    o.hand[k].p.copy(chestPt(o, s * 0.045, 0.26, 0.17));
    o.hand[k].pole.copy(chestDir(o, s * 0.3, -1, 0.35));
    o.hand[k].grip.copy(chestQ(o));
  }
  return o;
}
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
/** the ice chips' size: on a phone twice as large (at its scale they were specks) */
const chipK = () => (typeof innerWidth === 'number' && Math.min(innerWidth, innerHeight) < 600 ? 2 : 1.15);

// ------------------------------------------------------------------ geometry
/** the hull: lofted sections (a boxy U) from the transom to a pointed, raked bow, a low bulwark, a deck */
function hullGeo() {
  const NS = 40, NC = 16;
  const { x0, x1, hw: HW, deck: D, bul } = HULL;
  const hw = (x) => (x <= 2.4 ? HW : HW * Math.sqrt(Math.max(0, 1 - ((x - 2.4) / (x1 - 2.4)) ** 2)));
  const keel = (x) => (x < -6.0 ? 0.65 * ((-6.0 - x) / 1.0) ** 1.3 : x > 4.6 ? 1.95 * ((x - 4.6) / (x1 - 4.6)) ** 1.7 : 0);
  const deck = (x) => D + (x > 2.6 ? 0.55 * ((x - 2.6) / (x1 - 2.6)) ** 2 : 0) + (x < -5.2 ? 0.15 * ((-5.2 - x) / 1.8) : 0);
  const xs = Array.from({ length: NS + 1 }, (_, i) => x0 + (x1 - x0) * (i / NS));
  // the skin: per station, from the starboard rail (+z, the camera's side) round under the keel to the port rail
  const skin = [], sIdx = [];
  for (const x of xs) {
    const w = Math.max(hw(x), 0.004), yk = keel(x), yd = deck(x) + bul;
    for (let c = 0; c <= NC; c++) {
      const f = (c / NC) * Math.PI, cs = Math.cos(f), sn = Math.sin(f);
      skin.push(w * Math.sign(cs) * Math.pow(Math.abs(cs), 0.32), yd - (yd - yk) * Math.pow(sn, 0.38), 0);
      // the z set below (after the push: the rail's x is the station)
    }
  }
  // rewrite: (z, y) were pushed as (x, y, 0); put the station's x in place
  for (let i = 0; i <= NS; i++) for (let c = 0; c <= NC; c++) {
    const k = (i * (NC + 1) + c) * 3;
    const z = skin[k];
    skin[k] = xs[i]; skin[k + 2] = z;
  }
  for (let i = 0; i < NS; i++) for (let c = 0; c < NC; c++) {
    const a = i * (NC + 1) + c, b = (i + 1) * (NC + 1) + c;
    sIdx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g1 = new THREE.BufferGeometry();
  g1.setAttribute('position', new THREE.Float32BufferAttribute(skin, 3));
  g1.setIndex(sIdx);
  g1.computeVertexNormals();
  // the deck: inside the bulwark, flat across
  const dk = [], dIdx = [];
  for (const x of xs) { const w = Math.max(hw(x) - 0.08, 0.002); dk.push(x, deck(x), w, x, deck(x), -w); }
  for (let i = 0; i < NS; i++) { const a = i * 2; dIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.Float32BufferAttribute(dk, 3));
  g2.setIndex(dIdx);
  g2.computeVertexNormals();
  // the transom: the first section, closed (a fan from its middle)
  const tr = [x0, (keel(x0) + deck(x0)) / 2, 0];
  for (let c = 0; c <= NC; c++) { const k = c * 3; tr.push(skin[k], skin[k + 1], skin[k + 2]); }
  const tIdx = [];
  for (let c = 0; c < NC; c++) tIdx.push(0, c + 2, c + 1);
  const g3 = new THREE.BufferGeometry();
  g3.setAttribute('position', new THREE.Float32BufferAttribute(tr, 3));
  g3.setIndex(tIdx);
  g3.computeVertexNormals();
  return { geo: mergeGeometries([strip(g1), strip(g2), strip(g3)]), deck, keel, hw };
}

/** the iceberg: noisy elliptical rows (the old recipe's fbm), a flat top, a point at the bottom; origin at its axis */
function icebergGeo() {
  const NA = 40;
  const pos = [], idx = [];
  const rows = ROWS.map(([y, wx, wz], r) => ({ y, wx, wz, r }));
  rows.forEach(({ y, wx, wz, r }) => {
    for (let j = 0; j < NA; j++) {
      const a = (j / NA) * Math.PI * 2;
      const top = r === 0;
      // craggy below the water, a cleaner block above it
      const n = fbm(Math.cos(a) * 1.7 + 4 + r * 0.31, Math.sin(a) * 1.7 + y * 0.23, 4) - 0.5;
      const k = 1 + n * (y > 0 ? 0.3 : 0.34);
      const yy = top ? y : y + (fbm(a * 2.1 + 9, y * 0.4, 3) - 0.5) * (y > 0 ? 0.5 : 0.9);
      pos.push(Math.cos(a) * wx * k, yy, Math.sin(a) * wz * k);
    }
  });
  const nr = rows.length;
  for (let r = 0; r < nr - 1; r++) for (let j = 0; j < NA; j++) {
    const a = r * NA + j, b = r * NA + ((j + 1) % NA), c = (r + 1) * NA + j, d = (r + 1) * NA + ((j + 1) % NA);
    idx.push(a, b, c, b, d, c);
  }
  // flat top and bottom point
  const topC = pos.length / 3; pos.push(0, ROWS[0][0], 0);
  for (let j = 0; j < NA; j++) idx.push(topC, (j + 1) % NA, j);
  const botC = pos.length / 3; pos.push(0.3, ICE_BOT, -0.1);
  for (let j = 0; j < NA; j++) idx.push(botC, (nr - 1) * NA + j, (nr - 1) * NA + ((j + 1) % NA));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  // faceted (one normal per face): ice, and no flat-shading program of its own
  const f = strip(g);
  f.computeVertexNormals();
  return f;
}

/** the twelve edges of a box (w × h × d, from y = 0 up, centred on x and z) as thin bars: one geometry */
function edgeBars(w, h, d, { th = 0.07, grow = 0.01 } = {}) {
  const bars = [], x = w / 2 + grow, z = d / 2 + grow;
  const Pt = (sx, y, sz) => new V3(sx * x, y, sz * z);
  const bar = (a, b) => {
    const dir = new V3().subVectors(b, a), L = dir.length();
    const geo = new THREE.BoxGeometry(th, L + th, th);
    geo.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, dir.normalize()), new V3(1, 1, 1)));
    bars.push(strip(geo));
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(Pt(sx, 0, sz), Pt(sx, h, sz));
  for (const y of [0, h]) {
    for (const sz of [-1, 1]) bar(Pt(-1, y, sz), Pt(1, y, sz));
    for (const sx of [-1, 1]) bar(Pt(sx, y, -1), Pt(sx, y, 1));
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

/** an arc of a circle (radius r, from a0 to a1 rad) in the y–z plane at x, as a stroke */
function arcGeo(x, r, a0, a1, th = 0.05) {
  const pts = [];
  for (let i = 0; i <= 16; i++) { const a = lerp(a0, a1, i / 16); pts.push(new V3(x, Math.cos(a) * r, Math.sin(a) * r)); }
  return strip(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, th, 5, false));
}

export function buildUnder() {
  const g = new THREE.Group();
  g.name = 'under';
  const base = new V3(Math.cos(A) * RC, SEA_Y, Math.sin(A) * RC);
  g.position.copy(base);
  g.rotation.y = YAW;
  g.updateMatrixWorld(true);
  const W = (x, y, z) => g.localToWorld(new V3(x, y, z));
  const R = rng(16);

  // =================================================================== the iceberg (one geometry, two parts)
  const berg = new THREE.Group(); berg.name = 'iceberg';
  berg.position.set(ICE.x, 0, ICE.z);
  g.add(berg);
  const bergGeo = icebergGeo();
  const WY = { value: SEA_Y };
  // one iceberg: the tip above the water and the mass below it are the same white ice, lit and dimmed together, so
  // it reads as one block through the waterline that the ship sits on.  In its beat red runs down it from the tip
  // (the obstacle; lime is kept for what gets better), and as the fears go out in beat 4 the red leaves it the same way
  const RED = { lo: { value: 99 }, hi: { value: 99 } };   // the red band in world y (none when lo ≥ hi)
  // one shader for both parts (uPart 0: the tip, drawn above the water; 1: the mass, drawn below it)
  const ICE_HOOKS = {
    key: 'under-ice-2',
    fOut: /* glsl */`
      if (uPart < 0.5) { if (vWPos.y < uWY - 0.02) op = 0.0; }
      else if (vWPos.y > uWY + 0.02) op = 0.0;
      float rb = smoothstep(uRedLo - 0.45, uRedLo + 0.45, vWPos.y) * (1.0 - smoothstep(uRedHi - 0.45, uRedHi + 0.45, vWPos.y));
      ac = rb > 0.5 && dm < 0.5 ? ${ACCENT.red.toFixed(2)} : 0.0;
    `,
  };
  const iceU = (part) => ({ uWY: WY, uRedLo: RED.lo, uRedHi: RED.hi, uPart: { value: part } });
  const tipMat = ink({ shade: 0.98, bias: 0.3, uniforms: iceU(0), hooks: ICE_HOOKS });
  const massMat = ink({ shade: 0.98, bias: 0.3, uniforms: iceU(1), hooks: ICE_HOOKS });
  const tip = new THREE.Mesh(bergGeo, tipMat); tip.name = 'tip';
  const mass = new THREE.Mesh(bergGeo, massMat); mass.name = 'mass';
  for (const m of [tip, mass]) { m.castShadow = true; m.receiveShadow = true; berg.add(m); }
  mass.castShadow = false;
  // jagged shards on the tip beside the hull (an iceberg, not a plinth) and a few floes round it on the water
  {
    const parts = [];
    const shard = (x, z, h, r, seed) => {
      const c = new THREE.ConeGeometry(r, h, 5, 1);
      const pp = c.attributes.position;
      const RR = rng(seed);
      for (let i = 0; i < pp.count; i++) if (pp.getY(i) < h / 2 - 1e-3) pp.setXYZ(i, pp.getX(i) * (0.75 + RR() * 0.5), pp.getY(i), pp.getZ(i) * (0.75 + RR() * 0.5));
      c.translate(0, h / 2, 0);
      c.rotateZ((RR() - 0.5) * 0.35);
      c.translate(x, ICE_TOP - 0.6, z);
      const f = strip(c); f.computeVertexNormals();
      parts.push(f);
    };
    shard(2.4, 2.45, 2.3, 1.1, 3);
    shard(1.3, 2.6, 1.4, 0.8, 5);
    shard(-3.4, -2.3, 2.0, 1.0, 7);
    shard(3.4, -1.9, 1.6, 0.9, 9);
    const m = new THREE.Mesh(mergeGeometries(parts), tipMat);
    m.castShadow = true; m.receiveShadow = true;
    tip.add(m);
  }
  // ice chips (beat 1): as the screw shoves the hull forward over the tip it scrapes them off the tip's bow-side edge,
  // and as the ice throws the ship back they burst from where the hull lands on it; they fly a moment and drop into
  // the water.  Large enough to read at phone scale (about 10 px)
  const NCHIP = 20;
  const chips = new THREE.InstancedMesh(strip(new THREE.TetrahedronGeometry(0.5)), tipMat, NCHIP);
  chips.name = 'chips';
  chips.castShadow = false;
  chips.frustumCulled = false;
  g.add(chips);
  // (on the tip's edges, just outside the hull's side: under the hull the chips would start hidden)
  const CHIP_AT = [new V3(ICE.x + 2.1, ICE_TOP - 0.1, HULL.hw + SHIP.z + 0.35), new V3(ICE.x - 2.6, ICE_TOP - 0.1, HULL.hw + SHIP.z + 0.35)];
  // per chip: which lurch (0, 1), scrape or slam, its start and its flight
  const CHIP = Array.from({ length: NCHIP }, (_, i) => {
    const lur = i % 2, slam = i % 4 >= 2;
    const at = slam ? (i % 8 >= 4 ? 0 : 1) : 0;    // a slam bursts at both ends of the contact, a scrape at the bow side
    const dir = at === 0 ? 1 : -1;
    return { lur, slam, at, vx: dir * (1.4 + R() * 2.8), vy: (slam ? 4.6 : 3.8) + R() * 2.6, vz: 0.8 + R() * 1.8, sp: 4 + R() * 8, dx: (R() - 0.5) * 1.6, s: 0.75 + R() * 0.5 };
  });
  // impact strokes (beat 1): when the ice throws the ship back down, short graphite strokes burst from the two ends of
  // the contact, the way a drawing shows a heavy blow; they spread and are gone in 0.3 s
  const impact = new THREE.Group(); impact.name = 'impact';
  g.add(impact);
  const IMPACT = [];
  {
    const mat = ink({ accent: 'ink' });
    const geo = new THREE.BoxGeometry(1, 0.11, 0.11).translate(0.5, 0, 0);
    CHIP_AT.forEach((p, e) => {
      const dir = e === 0 ? 1 : -1;
      for (let i = 0; i < 5; i++) {
        // fanned out from the contact, away from the hull and up/down along the ice's face
        const a = dir > 0 ? lerp(-0.75, 0.65, i / 4) : Math.PI - lerp(-0.75, 0.65, i / 4);
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = false;
        m.rotation.set(0, 0, a);
        m.userData = { p: p.clone().add(new V3(dir * 0.25, 0, 0.1)), a, len: 0.8 + (i % 2) * 0.45 };
        impact.add(m);
        IMPACT.push(m);
      }
    });
  }
  const floes = (() => {
    const parts = [];
    const RR = rng(23);
    // clear of the ship's course (it sails off toward +x, out to z 1.45 ± its beam)
    for (const [x, z, s0] of [[-9.8, 2.6, 1.0], [-6.4, 4.1, 0.55], [-12.2, 0.6, 0.6], [15.9, -2.3, 0.7], [5.2, -3.4, 0.5]]) {
      const b = new THREE.DodecahedronGeometry(s0, 0);
      b.scale(1.4, 0.42, 1.1);
      b.rotateY(RR() * 3);
      b.translate(x, 0.05, z);
      parts.push(strip(b));
    }
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ shade: 0.98, bias: 0.3 }));
    m.name = 'floes';
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    return m;
  })();
  // the three slips: paper with a pencil edge, on the mass's front face at three depths (the words are HTML decals)
  const SLIPS = [
    { id: 'slip-1', x: 0.5, y: -2.6, w: 3.3, rz: -0.05 },
    { id: 'slip-2', x: -0.7, y: -6.3, w: 4.7, rz: 0.04 },
    { id: 'slip-3', x: 0.3, y: -9.9, w: 5.5, rz: -0.03 },
  ];
  const frontZ = (x, y) => {
    // the front of the ice at (x, y): its row's half-depth there, plus the rows' noise margin
    let wz = 0, wx = 1;
    for (let r = 0; r < ROWS.length - 1; r++) {
      const [y0, x0, z0] = ROWS[r], [y1, x1, z1] = ROWS[r + 1];
      if (y <= y0 && y >= y1) { const k = (y0 - y) / (y0 - y1); wz = lerp(z0, z1, k); wx = lerp(x0, x1, k); }
    }
    return wz * Math.sqrt(Math.max(0, 1 - (x / wx) ** 2)) * 1.18 + 0.12;
  };
  const slipMat = ink({ shade: 1, bias: 0.4 });
  const slips = SLIPS.map((s) => {
    const o = new THREE.Group(); o.name = s.id;
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, 1.2, 0.08), slipMat);
    m.castShadow = false;
    o.add(m);
    o.position.set(s.x, s.y, frontZ(s.x, s.y));
    o.rotation.set(0, -DELTA * 0.6, s.rz);
    berg.add(o);
    return { ...s, o, home: o.position.clone(), k: 0 };
  });

  // =================================================================== the ship
  const ship = new THREE.Group(); ship.name = 'ship-moving';
  g.add(ship);
  const hullG = new THREE.Group(); hullG.name = 'ship';
  ship.add(hullG);
  const H = hullGeo();
  // white paper: lifted, so the hull reads as a light ship and not as a hatched slab against the light
  // a dark boot-top below the hull's waterline mark, as ships have: it tells the hull from the white ice under it
  const hullMat = ink({ shade: 1.0, bias: 0.36, side: THREE.DoubleSide, hooks: { key: 'under-hull', fOut: /* glsl */`if (vLPos.y < 0.95) sh *= 0.5;` } });
  const hull = new THREE.Mesh(H.geo, hullMat);
  hull.castShadow = hull.receiveShadow = true;
  hullG.add(hull);
  const deckAt = (x) => H.deck(clamp(x, HULL.x0, HULL.x1));
  // the wheelhouse, its windows and the funnel
  const whY = deckAt((WH.x0 + WH.x1) / 2);
  {
    const parts = [];
    const add = (geo, x, y, z) => { geo.translate(x, y, z); parts.push(strip(geo)); };
    add(new THREE.BoxGeometry(WH.x1 - WH.x0, WH.h, WH.z1 - WH.z0), (WH.x0 + WH.x1) / 2, whY + WH.h / 2, (WH.z0 + WH.z1) / 2);
    add(new THREE.BoxGeometry(WH.x1 - WH.x0 + 0.34, 0.16, WH.z1 - WH.z0 + 0.3), (WH.x0 + WH.x1) / 2, whY + WH.h + 0.08, (WH.z0 + WH.z1) / 2);
    add(new THREE.CylinderGeometry(0.42, 0.5, 1.45, 16), -4.3, whY + WH.h + 0.16 + 0.72, -1.35);
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ shade: 1.0, bias: 0.3 }));
    m.castShadow = m.receiveShadow = true;
    hullG.add(m);
    const dark = [];
    const win = (x, y, z, w, h, d) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); dark.push(strip(b)); };
    for (const x of [-4.75, -4.1, -3.45]) win(x, whY + WH.h - 0.62, WH.z1 + 0.02, 0.42, 0.5, 0.05);
    for (const z of [-1.35, -0.8, -0.25]) win(WH.x1 + 0.02, whY + WH.h - 0.62, z, 0.05, 0.5, 0.36);
    // the funnel's band
    { const c = new THREE.CylinderGeometry(0.435, 0.445, 0.32, 16); c.translate(-4.3, whY + WH.h + 0.16 + 1.25, -1.35); dark.push(strip(c)); }
    const d = new THREE.Mesh(mergeGeometries(dark), ink({ accent: 'ink' }));
    d.castShadow = false;
    hullG.add(d);
  }
  // a crate at the bow (where one of the 基層 sits): its top at the seat height of a seated figure
  const crateY = deckAt(CRATE.x), crateH = 0.244 * HS;
  {
    const c = new THREE.Mesh(new THREE.BoxGeometry(CRATE.w, crateH, CRATE.d).translate(CRATE.x, crateY + crateH / 2, CRATE.z - 0.12), ink({ shade: 0.9, bias: 0.04 }));
    c.castShadow = c.receiveShadow = true;
    hullG.add(c);
  }
  // the shaft and its strut under the stern (the hull's, dimmed with the screw's grey when the screw steps back)
  const shaft = (() => {
    const parts = [];
    const sh = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 10); sh.rotateZ(Math.PI / 2); sh.translate(PROP.x + 0.7, PROP.y, 0); parts.push(strip(sh));
    const st = new THREE.BoxGeometry(0.16, 1.3, 0.16); st.translate(-6.55, PROP.y + 0.55, 0); parts.push(strip(st));
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ shade: 0.55 }));
    m.name = 'shaft';
    m.castShadow = true;
    hullG.add(m);
    return m;
  })();
  // ---- beat 2's measure: a pencil bar rises beside each group, the 高層's (at the stern, just bow-side of the leader)
  // 19 % taller than the 基層's (at the bow, just stern-side of the first of them) (16 b4: 正面感受，足足比基層員工高出
  // 19%).  The 基層's level is carried across the empty deck to the 高層's bar as a dashed line; what that bar has
  // above it is hatched dark, and the words 「高 19%」 sit on top of it (a decal)
  const gauge = new THREE.Group(); gauge.name = 'gauge';
  gauge.position.set(0, deckAt(0), GA.z);
  ship.add(gauge);
  // light pencil bars with an outline; what the 高層's bar has over the 基層's is hatched dark, so the 19 % is a block
  const barMat = ink({ shade: 0.3, bias: 0.62 });
  const extraMat = ink({ shade: 0.3, bias: 0.12 });
  const gaugeInk = ink({ accent: 'ink' });
  const barGeo = new THREE.BoxGeometry(GA.w, 1, GA.d).translate(0, 0.5, 0);
  // each bar on its own foot, its face turned to the camera, a short base line under it
  const barX = { H: GA.xH, S: GA.xS };
  const feet = {}, bars = ['H', 'S'].map((k) => {
    const f = new THREE.Group(); f.name = `bar-${k}`;
    f.position.set(barX[k], 0, 0);
    f.rotation.y = -DELTA;
    gauge.add(f);
    feet[k] = f;
    const m = new THREE.Mesh(barGeo, barMat);
    m.castShadow = true; m.receiveShadow = true;
    f.add(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(GA.w + 0.6, 0.07, 0.07).translate(0, 0.04, GA.d / 2 + 0.05), gaugeInk);
    b.castShadow = false;
    f.add(b);
    return m;
  });
  const extra = new THREE.Mesh(new THREE.BoxGeometry(GA.w + 0.02, 1, GA.d + 0.02).translate(0, 0.5, 0), extraMat);
  extra.position.set(0, GA.hS, 0);
  extra.castShadow = true; extra.receiveShadow = true;
  extra.name = 'bar-extra';
  feet.H.add(extra);
  // the 基層's level carried across the deck and over the 高層's bar (dashed), past both bars' outer edges so that it
  // reads as a level line and not as the lid of a box between them: what sticks out above it is the 19 %
  const levelLine = (() => {
    const x0 = barX.H - GA.w / 2 - 0.45, x1 = barX.S + GA.w / 2 + 0.45, n = Math.max(2, Math.round((x1 - x0) / 0.38));
    const list = Array.from({ length: n }, (_, i) => strip(new THREE.BoxGeometry(0.2, 0.07, 0.07).translate(x0 + (i + 0.5) * ((x1 - x0) / n), 0, 0)));
    const m = new THREE.Mesh(mergeGeometries(list), gaugeInk);
    m.castShadow = false;
    m.position.set(0, GA.hS, GA.d / 2 + 0.1);
    gauge.add(m);
    return m;
  })();

  // ---- the AI engine: a teal typed box on the stern deck driving a teal typed screw under the stern (the screw
  // spins in its shader: material motion, stopped by 暫停動畫).  One part: the box and its screw
  const engineG = new THREE.Group(); engineG.name = 'propeller';
  ship.add(engineG);
  // the engine box and the heap of tools stand on the deck in a group of their own (the part's hit proxy covers
  // them): in beat 4 they step back to their contour while the screw, which then drives the ship, stays in teal
  const toolsG = new THREE.Group(); toolsG.name = 'tools';
  ship.add(toolsG);
  const engY = deckAt(ENG.x);
  const engBox = new THREE.Group(); engBox.name = 'engine-box';
  toolsG.add(engBox);
  // typed, but light (every face 0.64 … 1): the ramp's punctuation only ( . , : ; - + = ), so the boxes read as teal
  // type with no letters on them (letters on a box ran together with the AI sea's text behind it)
  // uFaint: the share of its teal that is left out in a fine stipple (beat 4 on: the heap drawn faint, still teal)
  const FAINT = { value: 0 };
  const engMat = ink({ style: 1, shade: 0.22, bias: 0.8, accent: 'teal', uniforms: { uFaint: FAINT },
    hooks: { key: 'under-tools-faint', fOut: /* glsl */`if (uFaint > 0.0 && ac > 0.01 && dHash(floor(gl_FragCoord.xy * 0.5) + 3.7) < uFaint) ac = 0.0;` } });
  engMat.vertexColors = true;
  const LIGHT_FACES = { top: 1.25, px: 0.8, nx: 0.82, pz: 0.93, nz: 0.8, bottom: 0.8 };
  {
    const b = faceTones(new THREE.BoxGeometry(ENG.w, ENG.h, ENG.d).toNonIndexed().translate(0, ENG.h / 2, 0), LIGHT_FACES);
    const m = new THREE.Mesh(b, engMat);
    m.castShadow = m.receiveShadow = true;
    engBox.add(m);
    const e = new THREE.Mesh(edgeBars(ENG.w, ENG.h, ENG.d, { th: 0.07 }), ink({ accent: 'ink' }));
    e.castShadow = false;
    e.name = 'edges';
    engBox.add(e);
  }
  engBox.position.set(ENG.x, engY, ENG.z);
  // the pile of AI tools: typed teal crates that rain down onto the stern deck and the wheelhouse roof (ship frame:
  // x, the height of what each lands on, z, size).  They share the engine's material: one part with it
  const roofY = deckAt((WH.x0 + WH.x1) / 2) + WH.h + 0.16;
  // (in the order they land: the first tier, then what stands on it, each at least 0.2 s after the one below; each
  // one's yaw keeps it clear of its neighbours and of the funnel).  A heap, not a few boxes: at phone scale it has to
  // read in the first second as 「一堆 AI 工具」 (16 b41)
  const E1 = engY + ENG.h;
  const PILE = [
    // first tier: the deck behind the people, the engine's top, the wheelhouse roof
    [-6.7, engY, 0.55, 0.7, 0.2], [-6.4, E1, -1.15, 0.95, 0.3], [-5.3, engY, 0.5, 0.65, 0.35], [-3.2, roofY, -0.65, 0.95, 0.1],
    [-5.55, E1, -0.5, 0.85, -0.25], [-2.8, roofY, 0.15, 0.55, -0.15], [-4.05, roofY, 0.0, 0.65, -0.2], [-6.35, E1, -0.05, 0.55, 0.15],
    // second tier
    [-6.7, engY + 0.7, 0.55, 0.5, -0.3], [-6.2, E1 + 0.95, -1.0, 0.8, -0.35], [-3.1, roofY + 0.95, -0.7, 0.65, 0.4],
    [-5.6, E1 + 0.85, -0.45, 0.65, 0.25], [-3.9, roofY + 0.65, 0.0, 0.5, 0.3],
    // third tier: the tops of the two stacks
    [-5.95, E1 + 1.75, -0.8, 0.6, 0.1], [-3.25, roofY + 1.6, -0.65, 0.45, -0.2],
  ].map(([x, y, z, w, yaw], i, all) => ({ x, y, z, w, yaw, t: lerp(T0.pile[0], T0.pile[1], i / (all.length - 1)) }));
  const crateGeo = faceTones(new THREE.BoxGeometry(1, 1, 1).toNonIndexed().translate(0, 0.5, 0), LIGHT_FACES);
  const crateEdge = edgeBars(1, 1, 1, { th: 0.08 });
  const edgeMat = ink({ accent: 'ink' });
  const crates = PILE.map((c) => {
    const o = new THREE.Group(); o.name = 'tool';
    const m = new THREE.Mesh(crateGeo, engMat); m.castShadow = m.receiveShadow = true;
    const e = new THREE.Mesh(crateEdge, edgeMat); e.castShadow = false; e.name = 'edges';
    o.add(m, e);
    o.scale.setScalar(c.w);
    o.rotation.y = c.yaw;
    o.position.set(c.x, c.y, c.z);
    toolsG.add(o);
    return o;
  });
  const crateEdges = [engBox, ...crates].map((o) => o.getObjectByName('edges'));
  const propG = new THREE.Group(); propG.name = 'screw';
  propG.position.set(PROP.x, PROP.y, 0);
  engineG.add(propG);
  const SPIN = { a: { value: 0 }, w: { value: 0 } };
  const spinHooks = {
    key: 'under-prop-spin',
    vPos: /* glsl */`{ float a = uSpinA + uTime * uSpinW; float c = cos(a), s = sin(a); transformed.yz = mat2(c, s, -s, c) * transformed.yz; }`,
    vNormal: /* glsl */`{ float a = uSpinA + uTime * uSpinW; float c = cos(a), s = sin(a); objectNormal.yz = mat2(c, s, -s, c) * objectNormal.yz; }`,
  };
  const bladeGeo = (() => {
    const list = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.SphereGeometry(1, 16, 10);
      b.scale(0.13, (PROP.r - 0.28) / 2, 0.5);
      b.translate(0, 0.28 + (PROP.r - 0.28) / 2, 0);
      b.rotateY(0.5);                       // pitch
      b.rotateX((i / 3) * Math.PI * 2);
      list.push(strip(b));
    }
    const hub = new THREE.CylinderGeometry(0.34, 0.3, 0.8, 16); hub.rotateZ(Math.PI / 2); list.push(strip(hub));
    const nose = new THREE.SphereGeometry(0.3, 12, 8); nose.scale(1.3, 1, 1); nose.translate(-0.45, 0, 0); list.push(strip(nose));
    return mergeGeometries(list);
  })();
  const bladeMat = ink({ style: 1, shade: 0.26, bias: 0.72, accent: 'teal', uniforms: { uSpinA: SPIN.a, uSpinW: SPIN.w }, hooks: spinHooks });
  const blades = new THREE.Mesh(bladeGeo, bladeMat);
  blades.name = 'blades';
  blades.castShadow = false;                     // (a spinning shadow would need a depth program of its own)
  propG.add(blades);
  // a graphite rim round the blades (a slightly larger shell, its back faces in solid ink): a typed surface has no
  // outline of its own, and in the air, teal on paper, the three blades ran together into one shape
  const rimGeo = bladeGeo.clone();
  { const p = rimGeo.attributes.position, n = rimGeo.attributes.normal; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * 0.07, p.getY(i) + n.getY(i) * 0.07, p.getZ(i) + n.getZ(i) * 0.07); }
  const bladeRim = new THREE.Mesh(rimGeo, ink({ accent: 'ink', side: THREE.BackSide, uniforms: { uSpinA: SPIN.a, uSpinW: SPIN.w }, hooks: spinHooks }));
  bladeRim.name = 'blades-rim';
  bladeRim.castShadow = false;
  propG.add(bladeRim);
  // motion arcs: pencil strokes round the disc, the way a drawing shows a spinning thing (also when motion is off)
  const arcs = new THREE.Mesh(mergeGeometries([
    arcGeo(-0.3, PROP.r + 0.25, 0.3, 1.45, 0.09), arcGeo(-0.3, PROP.r + 0.25, 2.4, 3.55, 0.09), arcGeo(-0.3, PROP.r + 0.25, 4.5, 5.65, 0.09),
    arcGeo(-0.3, PROP.r * 0.62, 1.0, 1.9, 0.06), arcGeo(-0.3, PROP.r * 0.62, 3.1, 4.0, 0.06), arcGeo(-0.3, PROP.r * 0.62, 5.2, 6.1, 0.06),
  ]), ink({ accent: 'ink' }));
  arcs.name = 'spin-arcs';
  arcs.castShadow = false;
  propG.add(arcs);
  // the wash: air streaks blown out behind it while it spins in the air (they stream out as it spins up), fanned up
  // and back into the sky over the dock's wall (aimed straight back they ran into it)
  const NSTREAK = 11;
  const streakGeo = new THREE.BoxGeometry(1, 0.12, 0.12).translate(-0.5, 0, 0);
  const streaks = new THREE.InstancedMesh(streakGeo, ink({ accent: 'ink' }), NSTREAK);
  streaks.name = 'wash';
  streaks.castShadow = false;
  streaks.frustumCulled = false;
  // (a long wash: it races).  phi: how far up from straight back each one points, more for the upper ones
  // (they leave from the upper part of the disc: the lower ones, aimed as steeply, would cross it)
  const STREAK = Array.from({ length: NSTREAK }, (_, i) => {
    const a = lerp(-1.35, 1.35, i / (NSTREAK - 1)) + (R() - 0.5) * 0.2;
    return { a, r: 0.55 + R() * 1.05, len: 0.7 + R() * 0.6, off: R(), phi: 0.5 + 0.2 * Math.cos(a) + R() * 0.1 };
  });
  propG.add(streaks);

  // =================================================================== the people (on deck: children of the ship)
  const crew = new THREE.Group(); crew.name = 'crew';
  ship.add(crew);
  const mk = (h, name) => {
    const p = makePerson({ height: h });
    p.material.userData.u.uShadeBias.value = 0.34;   // against the light: a drawing, not a hatched silhouette
    p.group.name = name;
    return p;
  };
  const hero = mk(HH, 'hero');
  crew.add(hero.group);
  const lead = mk(HS, 'leaders');
  crew.add(lead.group);
  const staffG = new THREE.Group(); staffG.name = 'staff';
  crew.add(staffG);
  const staff = ['s1', 's2', 's3'].map((n) => { const p = mk(HS, n); staffG.add(p.group); return p; });

  // =================================================================== the wake, the churn, the bow wave (in the water)
  // seen from just above the water, marks drawn flat on it vanish: the wake is drawn as graphite strokes lying on the
  // surface (tubes, so they keep a line's width from the side), and behind the stern a few speed lines say "it moves"
  // also in a still frame
  const wakeG = new THREE.Group(); wakeG.name = 'wake';
  g.add(wakeG);
  const stroke = (pts, r = 0.07) => strip(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 4), r, 5, false));
  // in short pieces, each shown once the stern has passed it (no shader of its own)
  const wakeBits = [];
  {
    const mat = ink({ accent: 'ink' });
    const bit = (pts, r) => { const m = new THREE.Mesh(stroke(pts, r), mat); m.castShadow = false; m.userData.x = Math.max(...pts.map((q) => q.x)); wakeG.add(m); wakeBits.push(m); };
    // from where the stern met the water to where it stops (the stern's z at each x read off the run itself)
    const sx = SHIP.x1 + HULL.x0;
    const xw0 = shipX5(T5.touch) + HULL.x0 - 0.8;
    const len = sx + 0.2 - xw0;
    const zAt = (x) => shipZ5(timeAtX(x - HULL.x0));
    const NW = 7;
    for (const side of [-1, 1]) for (let n = 0; n < NW; n++) {
      const pts = [];
      for (let i = 0; i <= 3; i++) { const u = (n * 3 + i) / (NW * 3); const xx = sx + 0.2 - u * len; pts.push(new V3(xx, 0.1, zAt(xx) + side * (1.05 + u * 1.9) + Math.sin(u * 13) * 0.12)); }
      bit(pts, 0.07);
    }
    // short crests between the two lines
    const NC = Math.round(len / 1.4);
    for (let i = 0; i < NC; i++) {
      const x = sx - 0.6 - i * ((len - 1.2) / (NC - 1)), z = zAt(x) + (i % 2 ? 0.55 : -0.45) * (1 + (i / NC) * 0.9);
      bit([new V3(x, 0.1, z), new V3(x - 0.35, 0.12, z + 0.18), new V3(x - 0.75, 0.1, z + 0.05)], 0.055);
    }
    // foam crests along the course: from just over the water the strokes lying on it fold into the waterline, and
    // this row of white humps behind the stern is what shows of the wake (older ones lower)
    const hump = strip(new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2));
    const humpMat = ink({ shade: 1, bias: 0.3 });
    const NH = Math.round(len / 0.8);
    for (let i = 0; i < NH; i++) {
      const u = i / (NH - 1), x = sx - 0.3 - u * (len - 0.6);
      for (const side of [-1, 1]) {
        if ((i + (side > 0 ? 0 : 1)) % 2) continue;
        if (u > 0.45 && i % 4 > 1) continue;            // far back only a few, lying low: it settles
        const m = new THREE.Mesh(hump, humpMat);
        m.scale.set(0.8 - 0.5 * u, 0.45 - 0.36 * u, 0.5 - 0.28 * u);
        m.position.set(x, 0.0, zAt(x) + side * (1.25 + u * 1.5));
        m.castShadow = false; m.receiveShadow = true;
        m.userData.x = x + 0.3;
        wakeG.add(m); wakeBits.push(m);
      }
    }
  }
  // the churn behind the screw and the bow wave: strokes on the surface (ship frame, once it is in the water)
  const foam = new THREE.Group(); foam.name = 'foam';
  {
    const parts = [];
    const arc = (cx, cz, r, a0, a1, y = 0.12, th = 0.06) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const a = lerp(a0, a1, i / 8); pts.push(new V3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r)); }
      parts.push(stroke(pts, th));
    };
    for (let i = 0; i < 4; i++) arc(-0.6 - i * 0.35, 0, 0.7 + i * 0.4, Math.PI * 0.55, Math.PI * 1.45);
    const bx = HULL.x1 - 1.4 - PROP.x;            // the bow, in the churn's frame (which sits under the screw)
    for (const side of [-1, 1]) {
      parts.push(stroke([new V3(bx + 0.9, 0.12, side * 0.35), new V3(bx, 0.16, side * 1.15), new V3(bx - 1.2, 0.12, side * 1.75), new V3(bx - 2.4, 0.1, side * 2.05)], 0.07));
    }
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink' }));
    m.castShadow = false;
    foam.add(m);
  }
  ship.add(foam);
  // the wake as the section shows it: the screw's churn, a trail of white bubbles under the water behind it, each
  // one left where the screw passed and rising a little after
  // (from where the screw went under: before that it turned in the air)
  const NBUB = 44;
  const bubbles = new THREE.InstancedMesh(strip(new THREE.SphereGeometry(1, 10, 7)), ink({ shade: 1, bias: 0.35 }), NBUB);
  bubbles.name = 'bubbles';
  bubbles.castShadow = false;
  bubbles.frustumCulled = false;
  wakeG.add(bubbles);
  const BUB = (() => {
    const xa = shipX5(T5.sub) + PROP.x + 0.3, xb = SHIP.x1 + PROP.x - 0.3;
    return Array.from({ length: NBUB }, (_, i) => {
      const u = (i + R() * 0.8) / NBUB;
      return { x: xa + u * (xb - xa), dy: (R() - 0.5) * 2.4, dz: (R() - 0.2) * 1.4, r: 0.2 + R() * 0.28 };
    });
  })();
  // speed lines behind the stern (ship frame), drawn in graphite at the hull's height
  const speed = new THREE.Mesh(mergeGeometries([[1.6, 2.6], [2.3, 3.6], [3.0, 2.0]].map(([y, L]) => {
    const b = new THREE.BoxGeometry(L, 0.09, 0.09);
    b.translate(HULL.x0 - 0.9 - L / 2, y, HULL.hw + 0.2);
    return strip(b);
  })), ink({ accent: 'ink' }));
  speed.name = 'speed-lines';
  speed.castShadow = false;
  ship.add(speed);

  // =================================================================== hit proxies
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
  const proxy = (name, parent, sx, sy, sz, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), HIDDEN);
    m.name = `hit:${name}`; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  /** one proxy made of several boxes ([x0, x1, y0, y1, z0, z1] each, in the parent's frame): one mesh per part */
  const boxes = (name, parent, list) => {
    const m = new THREE.Mesh(mergeGeometries(list.map(([x0, x1, y0, y1, z0, z1]) =>
      strip(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)))), HIDDEN);
    m.name = `hit:${name}`; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    parent.add(m);
    return m;
  };
  // The people stand on the deck in front of the heap and the wheelhouse (the camera's side is +z).  A box round the
  // whole ship, or round the whole stern with its heap, would sit in front of them, and the nearest proxy answers a
  // tap: a tap on the leader or on the 基層 got the ship.  So the ship is its hull up to the bulwark plus the
  // wheelhouse behind the people's line, and the engine is its screw plus the heap, also behind that line
  /** the box round some of the heap's crates (and the engine under them), from y0 up */
  const heapBox = (list, y0, extra = []) => [
    Math.min(...list.map((c) => c.x - c.w * 0.7), ...extra.map((e) => e[0])) - 0.2, Math.max(...list.map((c) => c.x + c.w * 0.7), ...extra.map((e) => e[1])) + 0.2,
    y0, Math.max(...list.map((c) => c.y + c.w)) + 0.3, -HULL.hw - 0.3, 1.0,
  ];
  const onRoof = PILE.filter((c) => c.x > WH.x0), onStern = PILE.filter((c) => c.x <= WH.x0);
  const railAt = (x) => deckAt(x) + HULL.bul + 0.05;     // the bulwark's top (it hides the people's feet anyway)
  const hits = {
    propeller: boxes('propeller', engineG, [
      [PROP.x - 0.8, PROP.x + 0.6, PROP.y - PROP.r - 0.3, PROP.y + PROP.r + 0.3, -PROP.r - 0.3, PROP.r + 0.3],
      // the stack on the stern deck over the engine, and the one on the wheelhouse roof (the wheelhouse between
      // them is the ship's)
      heapBox(onStern, engY, [[ENG.x - ENG.w / 2, ENG.x + ENG.w / 2]]),
      heapBox(onRoof, roofY - 0.2),
    ]),
    tip: proxy('tip', tip, 2 * 4.8, ICE_TOP + 0.5, 2 * 2.8, 0, (ICE_TOP + 0.5) / 2 - 0.25, 0),
    mass: proxy('mass', mass, 2 * 7.3, -ICE_BOT + 0.4, 2 * 4.1, 0, ICE_BOT / 2 - 0.2, 0),
    ship: boxes('ship', hullG, [
      [HULL.x0 - 0.3, 2.6, -0.3, railAt(HULL.x0), -HULL.hw - 0.3, HULL.hw + 0.3],
      [2.6, HULL.x1 + 0.3, -0.3, railAt(HULL.x1), -HULL.hw - 0.3, HULL.hw + 0.3],
      [WH.x0 - 0.2, WH.x1 + 0.2, whY, whY + WH.h + 1.9, WH.z0 - 0.2, WH.z1 + 0.2],
    ]),
    hero: P.makeHitProxy(hero.group, 0.35),
    leaders: P.makeHitProxy(lead.group, 0.35),
  };
  /** one box round each person of a group, rewritten as they move (one mesh, so the part has one proxy) */
  hits.staff = (() => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const b = one.attributes.position.array;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(b.length * staff.length), 3));
    const m = new THREE.Mesh(geo, HIDDEN);
    m.name = 'hit:staff'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    const sx = 0.36 * HS + 0.5, sy = HS + 0.6, sz = 0.3 * HS + 0.5;
    m.userData.place = () => {
      const a = geo.attributes.position.array;
      staff.forEach((p, j) => {
        const o = p.group.position;
        for (let i = 0; i < b.length; i += 3) {
          a[j * b.length + i] = o.x + b[i] * sx;
          a[j * b.length + i + 1] = o.y + (b[i + 1] + 0.5) * sy - 0.3;
          a[j * b.length + i + 2] = o.z + b[i + 2] * sz;
        }
      });
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere(); geo.computeBoundingBox();
    };
    staffG.add(m);
    return m;
  })();
  const pickable = (mesh, on) => { if (on) mesh.layers.enable(0); else mesh.layers.disableAll(); };

  // every mesh's own shadow setting, so dimming can switch shadows off and emphasis can give them back
  g.traverse((o) => { if (o.isMesh) o.userData.cast0 = o.castShadow; });

  // =================================================================== the people's motion (pure)
  const memo = new Map();
  const pz = (p, name, o) => {
    const key = p.height + name + JSON.stringify(o || {});
    if (!memo.has(key)) memo.set(key, p.pose(name, o));
    return memo.get(key);
  };
  const st = (x, z, yaw, v) => ({ x, z, yaw, v });
  /** a → b by k: the body keeps its shape relative to a root that turns the short way from a's facing to b's */
  const blendTo = (a, b, k, Hh) => {
    const e = sm(k);
    const v = a.x === b.x && a.z === b.z ? a.v : reframe(a.v, a, { x: b.x, z: b.z, yaw: a.yaw }, Hh);
    return st(b.x, b.z, a.yaw + wrapA(b.yaw - a.yaw) * e, blendPoses(v, b.v, e));
  };
  /** a walk from frame A to frame B over [t0, t1]: turn, walk, settle */
  function walk(p, Af, Bf, t, t0, t1, stride) {
    const Hh = p.height;
    const d = Math.hypot(Bf.x - Af.x, Bf.z - Af.z);
    if (t <= t0) return Af;
    if (d < 0.05) return blendTo(Af, Bf, seg(t, t0, t1), Hh);
    const yw = yawTo(Af.x, Af.z, Bf.x, Bf.z);
    const tt = Math.min(0.24, (t1 - t0) * 0.2);
    if (t < t0 + tt) return blendTo(Af, st(Af.x, Af.z, yw, p.pose('walk', { dist: 0, stride })), seg(t, t0, t0 + tt), Hh);
    if (t < t1 - tt) {
      const r = seg(t, t0 + tt, t1 - tt), u = sm(r) * 0.7 + r * 0.3;
      return st(Af.x + (Bf.x - Af.x) * u, Af.z + (Bf.z - Af.z) * u, yw, p.pose('walk', { dist: d * u, stride }));
    }
    return blendTo(st(Bf.x, Bf.z, yw, p.pose('walk', { dist: d, stride })), Bf, seg(t, t1 - tt, t1), Hh);
  }
  const CAM_YAW = -DELTA;                          // facing the camera (yaw of a figure that looks out at it)
  const STERN_YAW = -Math.PI / 2;                  // facing the stern (−x), toward the engine

  /** a point of a figure at F (root frame, normalised by its height Hf) in the crew's frame */
  const toCrew = (F, Hf, p) => {
    const c = Math.cos(F.yaw), s = Math.sin(F.yaw);
    return new V3(F.x + (p.x * c + p.z * s) * Hf, deckAt(F.x) + p.y * Hf, F.z + (-p.x * s + p.z * c) * Hf);
  };
  /** a point in the crew's frame in the root frame of a figure at F (normalised by its height Hf) */
  const toRoot = (F, Hf, q) => {
    const c = Math.cos(F.yaw), s = Math.sin(F.yaw), dx = q.x - F.x, dz = q.z - F.z;
    return new V3((dx * c - dz * s) / Hf, (q.y - deckAt(F.x)) / Hf, (dx * s + dz * c) / Hf);
  };

  // ---- the two 高層 at the stern
  /** F1: where the first of the 基層 is (his shoulder is where the leader's hand goes in beat 4) */
  function leaderAt(p, which, beat, t, F1) {
    const [x, z] = AT[which];
    const yaw0 = STERN_YAW + (which === 'hero' ? 0.8 : 0.6);   // to the stern, turned toward the reader
    const stand = pz(p, 'stand');
    const W0 = st(x, z, yaw0, look(pz(p, 'watch', { yaw: 0, pitch: 0.15 }), 0, 0.2));
    const CH = st(x, z, yaw0, cheer(stand));
    if (beat === 0) return W0;
    if (beat === 1) return blendTo(W0, CH, seg(t, T1.cheer0 + (which === 'lead' ? 0.08 : 0), T1.cheer1 + (which === 'lead' ? 0.08 : 0)), p.height);
    if (beat === 2) return CH;
    // beat 4: down from the cheer, the back turned on the engine and its heap, the walk to the 基層 (the other one
    // 0.3 s behind), the hand on the first one's shoulder.  Beat 5 holds where beat 4 ends
    const tt = beat === ACT ? t : BEATS[ACT].dur;
    const [ex, ez] = which === 'hero' ? AT.heroEnd : AT.leadEnd;
    if (which === 'hero') {
      const yawT = yawTo(ex, ez, AT.s1[0], AT.s1[1]);
      const ARR = st(ex, ez, yawT, look(stand, 0, 0.1));
      if (tt < T3.walk[1]) return walk(p, CH, ARR, tt, T3.walk[0], T3.walk[1], STRIDE_H);
      // his right shoulder, a little in from the top of it: the hand follows it as he straightens up
      const sh = toCrew(F1, HS, chestPt(F1.v, -0.1, 0.205, 0.0));
      const TOUCH = st(ex, ez, yawT, touch(look(stand, 0, 0.1), toRoot(ARR, HH, sh)));
      return blendTo(ARR, TOUCH, seg(tt, T3.reach[0], T3.reach[1]), p.height);
    }
    const END = st(ex, ez, yawTo(ex, ez, AT.s1[0], AT.s1[1]) - 0.25, look(stand, -0.2, 0.05));
    return walk(p, CH, END, tt, T3.lead[0], T3.lead[1], STRIDE_S);
  }

  // ---- the three 基層 at the bow (s3 on the crate)
  function staffAt(i, beat, t) {
    const p = staff[i];
    const [x, z] = AT[`s${i + 1}`];
    const yaw0 = i === 0 ? CAM_YAW - 0.35 : i === 1 ? CAM_YAW + 0.1 : CAM_YAW + 0.25;
    const stand = pz(p, 'stand');
    const sitting = i === 2;
    // s1 bends over, s2 crouches, s3 (who stood in front of the crate) sits down on it, his head in his hands
    const S0 = sitting ? st(x + 0.1, z + 0.55, yaw0, stand) : st(x, z, yaw0, stand);
    const DOWN = st(x, z, yaw0, sitting ? headInHands(pz(p, 'sit')) : i === 1 ? crouch(stand) : slump(stand));
    const b1 = (tt) => blendTo(S0, DOWN, seg(tt, sitting ? T1.sit0 : T1.slump0 + i * 0.05, sitting ? T1.sit1 : T1.slump1 + i * 0.05), p.height);
    if (beat === 0) return S0;
    if (beat === 1) return b1(t);
    if (beat === 2) return DOWN;
    // beat 4: at the leader's touch the first one straightens up and turns his head to him; then the one crouching
    // gets up, then the one sitting stands, both turned toward the two.  Beat 5 holds where beat 4 ends
    const tt = beat === ACT ? t : BEATS[ACT].dur;
    const [u0, u1] = T3.up[i];
    if (i === 0) {
      const yawH = yawTo(x, z, AT.heroEnd[0], AT.heroEnd[1]);
      const UP = st(x, z, lerp(yaw0, yawH, 0.35), look(stand, wrapA(yawH - yaw0) * 0.55, -0.1));
      return blendTo(DOWN, UP, seg(tt, u0, u1), p.height);
    }
    const yawP = yawTo(x, z, (AT.heroEnd[0] + AT.s1[0]) / 2, (AT.heroEnd[1] + AT.s1[1]) / 2);
    const headK = clamp(wrapA(yawP - yaw0), -1.1, 1.1);
    const UPs = (xx, zz) => st(xx, zz, yaw0 + headK * 0.4, look(stand, headK * 0.55, -0.05));
    if (sitting) return blendTo(DOWN, UPs(x + 0.1, z + 0.55), seg(tt, u0, u1), p.height);
    return blendTo(DOWN, UPs(x, z), seg(tt, u0, u1), p.height);
  }

  // =================================================================== the pose
  const S_ = { beat: LAST, t: BEATS[LAST].dur, emph: null, spin: 1, floating: true, red: false, staffLime: [true, true, true], shipLime: true, gap: 0, iceDim: 0 };
  const _m = new M4(), _q = new Q(), _s = new V3(), _p = new V3();
  /** the propeller's angle in a spin-up from rest over [a, b] (rad), at t */
  const spinAngle = (t, a, b) => {
    if (t <= a) return 0;
    const L = b - a;
    if (t >= b) return SPIN_W * (L * 0.5 + (t - b));
    const x = (t - a) / L;
    return SPIN_W * L * (x * x * x - 0.5 * x * x * x * x);
  };
  /** a lurch over [a, b]: shoved up to 1 (the screw pushes), held a moment, then thrown back to 0 (the ice holds) */
  const lurch = (t, a, b) => {
    const u = seg(t, a, b);
    if (u <= 0 || u >= 1) return 0;
    if (u < 0.42) return Math.sin((u / 0.42) * Math.PI / 2);
    if (u < 0.58) return 1;
    const v = (u - 0.58) / 0.42;
    return 1 - v * v;
  };
  /** the jolt when it is thrown back onto the ice at b: a short ringing */
  const slam = (t, b) => { const d = t - b; return d <= 0 || d > 0.45 ? 0 : Math.sin(d * 34) * Math.exp(-d * 9); };

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const t = k * BEATS[beat].dur;

    // ---- the engine: spun up in beat 1; afterwards it runs on the world clock (material motion)
    const spinning = beat > 0 || t >= T0.spin1;
    const spinK = beat > 0 ? 1 : ss(t, T0.spin0, T0.spin1);
    SPIN.a.value = spinning ? 0 : spinAngle(t, T0.spin0, T0.spin1);
    SPIN.w.value = spinning ? SPIN_W : 0;
    arcs.userData.spin = spinK > 0.35;
    arcs.visible = arcs.userData.spin && arcs.userData.on !== false;
    arcs.scale.setScalar(Math.max(1e-3, lerp(0.8, 1, spinK)));

    // ---- the ice: whole until beat 5, then it shrinks about SHRINK.y and its tip sinks under the water
    const sc = beat === LAST ? iceScale5(t) : 1;
    berg.scale.setScalar(sc);
    berg.position.set(ICE.x, SHRINK.y * (1 - sc), ICE.z);
    const iceTop = SHRINK.y + (ICE_TOP - SHRINK.y) * sc;
    pickable(hits.tip, true);           // (sunk at the end, it is still the top of the ice: a tap there answers for it)
    // the red (world y): in beat 3 it runs down from the tip to the foot; it stays through beat 4 (the people come up
    // over it, the fears are still there); in beat 5 it leaves the same way, its upper edge passing each slip as that
    // slip goes out
    let red = false;
    {
      const top = SEA_Y + iceTop + 1.0, foot = SEA_Y + SHRINK.y + (ICE_BOT - SHRINK.y) * sc - 1.0;
      let lo = 99, hi = 99;
      if (beat === 2) { hi = top; lo = lerp(top, foot, ss(t, T2.sweep0, T2.sweep1)); }
      else if (beat === ACT) { hi = top; lo = foot; }
      else if (beat === LAST) { lo = foot; hi = lerp(top, foot, seg(t, T4.drain[0], T4.drain[1])); }
      RED.lo.value = lo; RED.hi.value = hi;
      red = hi - lo > 0.5;
    }

    // ---- the ship: stranded on the tip (it rears up as the engine shoves), then down into the water and away
    let keel = SHIP.keel0, x = SHIP.x0, z = SHIP.z, tilt = SHIP.tilt, jx = 0, jr = 0, px = 0, py = 0;
    // the engine falls onto the stern deck and the stern dips under its weight
    const fall = beat === 0 ? seg(t, T0.drop0, T0.land) : 1;
    engBox.position.y = engY + (DROP + 1) * (1 - fall * fall);
    engBox.visible = fall > 0.02 || beat > 0;
    // the tools: each falls from the sky, lands with a bounce (the stern bobs a little with each)
    let bob = 0;
    crates.forEach((o, i) => {
      const c = PILE[i];
      const u = beat === 0 ? seg(t, c.t, c.t + T0.fall) : 1;
      o.visible = u > 0;
      const b = beat === 0 ? Math.max(0, Math.sin(Math.PI * seg(t, c.t + T0.fall, c.t + T0.fall + 0.14))) : 0;
      o.position.set(c.x, c.y + DROP * (1 - u * u) + b * 0.18 * c.w, c.z);
      bob += b * 0.012;
    });
    jr += bob;
    const hit = beat === 0 ? Math.max(0, Math.sin(Math.PI * seg(t, T0.land, T0.land + 0.32))) * Math.exp(-seg(t, T0.land, T0.land + 0.6) * 1.5) : 0;
    jr += hit * 0.035;
    keel -= hit * 0.12;
    if (beat === 0) {
      // the screw races: twice the ship rears up, bow high, and is shoved forward over the tip — pivoting on the
      // tip's stern-side edge, so the stern stays clear of the water — and twice the ice throws it back down with a
      // heavy jolt; a shudder runs through it the whole time it strains
      const strain = ss(t, T0.spin0 + 0.1, T0.spin0 + 0.4) * (1 - ss(t, T0.strain1 - 0.3, T0.strain1));
      const [l1, l2] = T0.lurch;
      const L = lurch(t, l1[0], l1[1]) + 0.7 * lurch(t, l2[0], l2[1]);
      const J = slam(t, l1[1]) + 0.75 * slam(t, l2[1]);
      jx = 2.1 * L - 0.25 * J + (Math.sin(t * 61) * 0.05 + Math.sin(t * 37 + 1) * 0.03) * strain;
      const up = 0.13 * L;
      jr += up + 0.05 * J + Math.sin(t * 47) * 0.008 * strain;
      keel -= 0.22 * Math.abs(J);
      // the pivot: the tip's stern-side edge, in the ship's frame
      const pv = ICE.x - ROWS[0][1] + 0.2 - (SHIP.x0 + jx);
      px = pv * (1 - Math.cos(up));
      py = -pv * Math.sin(up);
    }
    let floating = false;
    if (beat === LAST) {
      // the ice gives: the ship lurches forward as in beat 1 (bow up a little), but now nothing throws it back — it
      // slides down off the sinking tip into the water, its screw bites and it surges on
      keel = keel5(t);
      const down = clamp((SHIP.keel0 - keel) / (SHIP.keel0 - SHIP.keel1));
      tilt = SHIP.tilt * (1 - down);
      jr += 0.055 * Math.sin(Math.PI * seg(t, T4.shrink[0], T4.shrink[1] + 0.1));
      floating = keel <= SHIP.keel1 + 1e-3;
      // a bob as it settles into the water
      const tf = T5.afloat;
      if (t > tf - 0.05) keel += Math.sin((t - tf) * 7) * 0.14 * Math.exp(-(t - tf) * 2.6) * ss(t, tf - 0.05, tf + 0.05);
      x = shipX5(t);
      z = shipZ5(t);
      keel += Math.sin(t * 3.1) * 0.04 * ss(t, tf, tf + 0.6);
    }
    ship.position.set(x + jx + px, keel + py, z);
    ship.rotation.set(0, 0, tilt + jr);
    // the chips scraped off the ice by each shove and burst from it by each throw back; the impact strokes
    for (let i = 0; i < NCHIP; i++) {
      const c = CHIP[i];
      const t0 = c.slam ? T0.lurch[c.lur][1] : T0.lurch[c.lur][0] + 0.12;
      const te = beat === 0 ? t - t0 : -1;
      if (te <= 0 || te > 0.62) { chips.setMatrixAt(i, _m.makeScale(1e-4, 1e-4, 1e-4)); continue; }
      const o = CHIP_AT[c.at];
      _p.set(o.x + c.dx + c.vx * te, o.y + c.vy * te - 8 * te * te, o.z + c.vz * te);
      _q.setFromEuler(new THREE.Euler(c.sp * te, c.sp * te * 0.7, 0));
      chips.setMatrixAt(i, _m.compose(_p, _q, _s.setScalar(c.s * (c.lur ? 0.85 : 1) * chipK())));
    }
    chips.instanceMatrix.needsUpdate = true;
    {
      let ik = -1;
      for (const [, b] of T0.lurch) { const d = beat === 0 ? t - b : -1; if (d > 0 && d < 0.3) ik = d / 0.3; }
      impact.visible = ik >= 0;
      for (const m of IMPACT) {
        const u = Math.max(ik, 0), r0 = 0.15 + 0.9 * sm(u), len = m.userData.len * (1 - 0.6 * u);
        m.position.copy(m.userData.p).add(_p.set(Math.cos(m.userData.a) * r0, Math.sin(m.userData.a) * r0, 0));
        m.scale.set(Math.max(1e-3, len), 1, 1);
      }
    }

    // ---- the wash (in the air, beats 1–4) and the foam and wake (in the water, beat 5)
    const inAir = !(beat === LAST && keel < 0.6);
    streaks.userData.spin = inAir && spinK > 0.25;
    streaks.visible = streaks.userData.spin && streaks.userData.on !== false;
    for (let i = 0; i < NSTREAK; i++) {
      const s = STREAK[i];
      // streaming out as it spins up, then held as drawn motion lines; up and back from the disc
      const u = beat === 0 ? clamp((t - T0.spin0 - s.off * 0.15) / 0.35) : 1;
      const out = lerp(0.15, 0.3 + s.off * 0.6, sm(u));
      const c = Math.cos(s.phi), sn = Math.sin(s.phi);
      _p.set(-0.55 - out * c, Math.cos(s.a) * s.r + out * sn, Math.sin(s.a) * s.r);
      _q.setFromAxisAngle(ZAX, -s.phi);
      streaks.setMatrixAt(i, _m.compose(_p, _q, _s.set(Math.max(1e-3, s.len * sm(u * 1.3)), 1, 1)));
    }
    streaks.instanceMatrix.needsUpdate = true;
    const inWater = beat === LAST && keel < 0.2;
    foam.visible = inWater;
    foam.position.set(PROP.x - 0.1, -keel + 0.02, 0);
    foam.scale.setScalar(inWater ? Math.max(1e-3, pop(seg(t, T5.sub - 0.05, T5.sub + 0.4))) : 1e-3);
    // the wake from where the stern met the water, drawn as the stern passes; the speed lines once it runs in it
    const sternX = x + HULL.x0;
    const gliding = beat === LAST ? ss(t, T5.touch, T5.touch + 0.45) : 0;
    wakeG.visible = beat === LAST && t >= T5.touch;
    for (const m of wakeBits) m.visible = m.userData.x < sternX - 0.1;
    {
      const screwX = x + PROP.x;
      const by = keel + PROP.y, bz = z;
      for (let i = 0; i < NBUB; i++) {
        const b = BUB[i];
        const on = beat === LAST && t > T5.sub && b.x < screwX - 0.35;
        if (!on) { bubbles.setMatrixAt(i, _m.makeScale(1e-4, 1e-4, 1e-4)); continue; }
        const age = Math.max(0, t - timeAtX(b.x - PROP.x));
        _p.set(b.x, Math.min(-0.75, by + b.dy + 0.18 * age), bz + b.dz);
        bubbles.setMatrixAt(i, _m.compose(_p, _q.identity(), _s.setScalar(b.r)));
      }
      bubbles.instanceMatrix.needsUpdate = true;
    }
    speed.visible = gliding > 0.02;
    speed.scale.set(Math.max(1e-3, gliding), 1, 1);
    speed.position.x = (HULL.x0 - 0.9) * (1 - gliding);

    // ---- beat 2's two bars: they rise at the start of the beat (the 基層's stops first), then the level line
    const gOn = beat === 1;
    gauge.visible = gOn;
    {
      const r0 = T1.bars[0], r1 = T1.bars[1];
      const hH = GA.hS * GA.ratio * (gOn ? sm(seg(t, r0, r1)) : 1);
      const hS = GA.hS * (gOn ? sm(seg(t, r0, r0 + (r1 - r0) / GA.ratio)) : 1);
      bars[0].scale.y = Math.max(1e-3, Math.min(hH, GA.hS));
      bars[1].scale.y = Math.max(1e-3, hS);
      extra.visible = hH > GA.hS + 1e-3;
      extra.scale.y = Math.max(1e-3, hH - GA.hS);
      const shown = gOn && t >= T1.gap;
      levelLine.visible = shown;
      S_.gap = shown && t >= T1.gap + 0.06 ? 1 : 0;
    }

    // ---- the people (the 基層 first: the leader's hand goes to the first one's shoulder)
    const place = (p, F) => { p.apply(F.v); p.group.position.set(F.x, deckAt(F.x), F.z); p.group.rotation.set(0, F.yaw, 0); };
    const FS = staff.map((p, i) => staffAt(i, beat, t));
    staff.forEach((p, i) => place(p, FS[i]));
    place(hero, leaderAt(hero, 'hero', beat, t, FS[0]));
    place(lead, leaderAt(lead, 'lead', beat, t, FS[0]));
    crew.updateMatrixWorld(true);
    hits.staff.userData.place();

    // ---- the slips: show in turn as the red passes them (beat 3), held in beat 4, go out in turn (beat 5), 怕失業
    // first.  A slip shows whole in one frame, with its words (no blank paper first)
    slips.forEach((s, i) => {
      let kk = 0, rise = 0;
      if (beat === 2) kk = t >= T2.slip[i] ? 1 : 0;
      else if (beat === ACT) kk = 1;
      else if (beat === LAST) {
        // it lifts off the ice and is gone: the words go first, the paper folds away after them
        const u = seg(t, T4.out[i], T4.out[i] + 0.35);
        kk = 1 - sm(u);
        rise = sm(u) * 1.1;
      }
      s.k = kk;
      s.o.visible = kk > 0.001;
      s.o.scale.setScalar(Math.max(1e-3, kk));
      s.o.position.set(s.home.x, s.home.y + rise, s.home.z);
    });

    // the lime: each of the 基層 from the moment he starts up (beat 4) to the end; the ship once it is in the water
    const lime = staff.map((_, i) => beat === LAST || (beat === ACT && t >= T3.up[i][0] + 0.04));
    Object.assign(S_, { beat, t, spin: spinK, floating, red, staffLime: lime, shipLime: beat === LAST && keel <= SHIP.keel1 + 0.3 });
    applyEmphasis();
    return api;
  }

  // =================================================================== emphasis by subtraction
  /** dim a part (shadows off whenever it is dimmed at all, unless `shadows` says otherwise) */
  function setDim(obj, k, shadows = k < 0.001) {
    dim(obj, k);
    obj.traverse((o) => { if (o.isMesh && !o.userData.hitProxy) o.castShadow = shadows ? !!o.userData.cast0 : false; });
  }
  // a part that carries a state colour — the ice while it is red, each of the 基層 once he is lime, the hull once it
  // floats lime — steps back only this far when another part is the subject: under 0.5 its colour stays (mat.js), so
  // nothing the story has changed seems to change back (the red does not leave the ice before the fears go; the lime
  // does not leave the people when the reader taps the ship)
  const KEEP = 0.45;
  // the screw, when it is not the subject: a grey pencil screw on its grey shaft, still (no motion marks); in contour
  // only, its round hub and three blades read as a little figure hanging off the stern
  const SCREW_BACK = 0.3;
  const bladeLook = { style: bladeMat.userData.u.uStyle.value, mul: bladeMat.userData.u.uShadeMul.value, bias: bladeMat.userData.u.uShadeBias.value };
  function applyEmphasis() {
    const E = S_.emph;                       // null: the map (plain ink); a Set: those parts full, the rest contour
    const map = E === null;
    const full = (id) => map || E.has(id);
    const eng = full('propeller');
    // 先把人放在 AI 工具之前: from beat 4 on the heap of tools is drawn faint, still teal (it reads as 「那堆工具」, not as
    // part of the ship), and the leader leaves it for the people; the screw that will drive the ship stays as it is
    const faint = !map && S_.beat >= ACT;
    const heap = eng && (map || S_.beat < ACT);
    const heapDim = faint ? 0.45 : heap ? 0 : 1;
    setDim(engBox, heapDim, heapDim < 0.5);
    for (const o of crates) setDim(o, heapDim, heapDim < 0.5);
    FAINT.value = faint ? 0.62 : 0;
    setDim(propG, eng ? 0 : SCREW_BACK);
    const bu = bladeMat.userData.u;
    bu.uAccent.value = !map && eng ? ACCENT.teal : 0;
    bu.uStyle.value = eng ? bladeLook.style : 0;
    bu.uShadeMul.value = eng ? bladeLook.mul : 0.5;
    bu.uShadeBias.value = eng ? bladeLook.bias : 0.22;
    engMat.userData.u.uAccent.value = !map && heapDim < 0.5 ? ACCENT.teal : 0;
    bladeRim.visible = eng;
    // the same for the crates' graphite edges: a dimmed typed box keeps its contour by itself (npr), and with the
    // bars too the heap became a thicket of double lines right behind the 高層 cheering in beat 2; drawn faint, the
    // heap keeps them, lighter (each box still reads as a box)
    for (const e of crateEdges) e.visible = heap || faint;
    // the motion marks belong to the engine at work: in contour they read as limbs
    arcs.userData.on = eng;
    streaks.userData.on = eng;
    arcs.visible = eng && arcs.userData.spin;
    streaks.visible = eng && streaks.userData.spin;
    const shipD = full('ship') ? 0 : !map && S_.shipLime ? KEEP : 1;
    setDim(hullG, shipD);
    setDim(wakeG, shipD);
    setDim(foam, shipD);
    setDim(speed, shipD);
    // the screw's shaft and strut stay grey with it
    setDim(shaft, shipD < 0.001 || eng ? 0 : Math.min(shipD, SCREW_BACK));
    hullMat.userData.u.uAccent.value = !map && S_.shipLime && shipD <= 0.5 ? ACCENT.lime : 0;
    // one iceberg: the tip and the mass step forward and back together
    const ice = full('tip') || full('mass');
    const iceD = ice ? 0 : !map && S_.red ? KEEP : 1;
    setDim(tip, iceD);
    setDim(mass, iceD);
    setDim(floes, map || ice || full('ship') ? 0 : 1);
    const slipD = full('mass') ? 0 : !map && S_.red ? KEEP : 1;
    for (const s of slips) setDim(s.o, slipD);
    S_.slipDim = slipD;
    setDim(gauge, full('leaders') || full('staff') ? 0 : 1);
    setDim(hero.group, full('hero') ? 0 : 1);
    setDim(lead.group, full('leaders') ? 0 : 1);
    staff.forEach((p, i) => {
      const lime = !map && S_.staffLime[i];
      const d = full('staff') ? 0 : lime ? KEEP : 1;
      setDim(p.group, d);
      p.material.userData.u.uAccent.value = lime && d <= 0.5 ? ACCENT.lime : 0;
    });
  }
  function emphasize(ids) {
    S_.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }

  // =================================================================== anchors: labels, words, hotspots, framing
  const wp = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(new V3(x, y, z)); };
  /** a figure's hotspot: on the front of its hips (its base, never the chest or the head) */
  const hipFront = (p) => () => wp(p.joints.hips, 0, -0.02 * p.height, 0.06 * p.height);
  const parts = {
    // on the lower rim of the screw's disc (its edge, not its hub)
    propeller: { hit: hits.propeller, anchor: () => wp(propG, -0.3, -(PROP.r + 0.1), 0.25), beat: 0 },
    tip: { hit: hits.tip, anchor: () => wp(berg, 2.4, ICE_TOP - 1.2, 1.6), beat: 0 },
    // the second 高層 at his knees (his base; the leader's ring is on the leader's hips, a step toward the bow)
    leaders: { hit: hits.leaders, anchor: () => wp(lead.group, 0, 0.3 * HS, 0.08 * HS), beat: 1 },
    // on the last of the 基層 (the leader's ring is by the first): the rings of the deck stay 44 px and more apart
    staff: { hit: hits.staff, anchor: hipFront(staff[2]), beat: 1 },
    // on the mass's front face just under the waterline: in frame whenever the ship is (beats 1–2 show only the
    // top of the section), and clear of the slips
    mass: { hit: hits.mass, anchor: () => wp(berg, -3.4, -1.8, frontZ(-3.4, -1.8)), beat: 2 },
    hero: { hit: hits.hero, anchor: hipFront(hero), beat: ACT },
    // on the hull's flank under the wheelhouse, between the waterline and the deck: clear of the rings of the people
    // at the bow and of the screw's under the stern
    ship: { hit: hits.ship, anchor: () => wp(ship, -4.4, 1.7, HULL.hw + 0.05), beat: LAST },
  };
  const top = (p) => p.top();
  /** the hand of a figure that is farther toward the stern (ship frame x) */
  const sternHand = (p) => {
    const a = wp(p.hand('L'), 0, 0, 0), b = wp(p.hand('R'), 0, 0, 0);
    return ship.worldToLocal(a.clone()).x < ship.worldToLocal(b.clone()).x ? a : b;
  };
  const labelAt = {
    // 「AI 引擎」 names the screw racing in the air (空轉, 16 b42), not the heap of boxes on deck (those are the tools
    // the caption names).  The dot sits on the rim of its disc at the upper left, toward the stern: the label then
    // stands over the wash beside the screw, its short leader down to the rim, clear of the blades
    propeller: () => wp(propG, -0.3, (PROP.r + 0.25) * 0.8, -(PROP.r + 0.25) * 0.6),
    // 高層 (beat 2): on the stern-side hand the second one throws up, so the name stands over the heap on the stern
    // side of the two — never over the bars at their bow side, whose dark top block is the 19 % (16 b4); with his
    // hands down, over his head
    leaders: () => { const h = sternHand(lead), t = top(lead); return h.y > t.y ? h : t; },
    staff: () => top(staff[1]),
  };
  const slipAt = (i) => () => {
    const s = slips[i];
    // on the slip whenever the slip is drawn in full or only half stepped back (beat 4: the fears are still there)
    if (!(s.k > 0.9) || S_.emph === null || !(S_.slipDim <= 0.5)) return null;
    // going out (beat 5): the words leave with the first lift
    if (S_.beat === LAST && S_.t > T4.out[i] + 0.04) return null;
    return wp(s.o, 0, 0, 0.06);
  };
  // 「高 19%」 on top of the 高層's bar, over the dark block it has above the 基層's level
  const gapAt = () => (S_.gap && S_.emph !== null ? wp(feet.H, 0, GA.hS * GA.ratio + 0.62, GA.d / 2) : null);
  const decalAt = { 'slip-1': slipAt(0), 'slip-2': slipAt(1), 'slip-3': slipAt(2), gap: gapAt };
  // the words' own height in world units (overlay.js scales them with it, 12–18 px)
  const decalUnit = { gap: 0.72 };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const shipPt = (sx, keel, sz, x, y, z) => W(sx + x, keel + y, sz + z);
  const stranded = (x, y, z) => shipPt(SHIP.x0, SHIP.keel0, SHIP.z, x, y, z);
  const afloat = (x, y, z) => shipPt(SHIP.x1, SHIP.keel1, SHIP.z1, x, y, z);
  const iceAt = (x, y, z, sc = 1) => W(ICE.x + x * sc, SHRINK.y * (1 - sc) + y * sc, ICE.z + z * sc);
  const HEAD = HH + 0.5;
  // the wash, fanned up and back: how far behind the hub and how high over it its farthest strokes reach
  const WASH = { x: 2.5, y: 2.6 };
  // the ship stranded as beats 1–2 see it: the wash and the screw at the stern, the bow, the people with room over
  // their heads for beat 2's bars, the hands thrown up and the labels
  const SHIP_A = () => [
    stranded(PROP.x - WASH.x, PROP.y + WASH.y, 0),                     // the end of the wash
    stranded(PROP.x, PROP.y - PROP.r - 0.3, 0),                         // the screw's lowest tip
    stranded(HULL.x1 + 0.3, deckAt(HULL.x1) + 0.6, 0),                  // the bow
    stranded(AT.hero[0], deckAt(AT.hero[0]) + HH + 1.4, AT.hero[1]),
    stranded(GA.xH, deckAt(GA.xH) + GA.hS * GA.ratio + 0.9, GA.z),      // over the 高層's bar
  ];
  // beats 1–2 (shot 0): the ship on the tip of the ice and only the top of the water's section under it — the sky
  // over the stern (where the tools fall from) is in the frame, the mass's depth is not
  const S0 = () => [...SHIP_A(), iceAt(-5.9, -3.0, 0), iceAt(5.9, -3.0, 0)];
  // beat 3 (shot 1): down the ice to its foot, the ship still in the frame
  const S1 = () => [...SHIP_A().slice(0, 4), stranded(AT.s2[0], deckAt(AT.s2[0]) + HS + 0.5, AT.s2[1]),
    iceAt(-7.4, -6, 0), iceAt(7.4, -6, 0), iceAt(0, ICE_BOT - 0.4, 0)];
  // beat 4 (shot 3): close on the deck, the people as large as the frame allows — from the heap of tools on the
  // wheelhouse roof and the engine (the leader turns his back on them) to the bow, the heads with room over them, and
  // under the hull the red tip of the ice down to just under the waterline (it has not gone yet).  The screw at the
  // stern, not the subject now, may be cut by the frame's edge
  const DECK = () => [
    stranded(ENG.x - 0.2, engY + ENG.h + 0.5, ENG.z),                  // the engine box and the stack on it
    stranded(-3.25, roofY + 2.1, -0.65),                                // the top of the stack on the wheelhouse roof
    stranded(HULL.x1 + 0.3, deckAt(HULL.x1) + 0.6, 0),                  // the bow
    stranded(AT.hero[0], deckAt(AT.hero[0]) + HEAD, AT.hero[1]),
    stranded(AT.heroEnd[0], deckAt(AT.heroEnd[0]) + HEAD, AT.heroEnd[1]),
    stranded(AT.s2[0], deckAt(AT.s2[0]) + HS + 0.6, AT.s2[1]),
    iceAt(-2.5, -1.2, 1.5), iceAt(2.5, -1.2, 1.5),
  ];
  // the same held upright on a phone: a portrait frame of the deck shows the ice far down under it, red with its
  // three fears — the words of all three are kept wholly in the frame (one cut by the strip would sit on it)
  const DECK_TALL = () => [...DECK(), ...SLIPS.map((sl) => iceAt(sl.x, sl.y - 1.1, frontZ(sl.x, sl.y)))];
  // beat 5 and the end: the ship on the ice as the beat begins (stern to bow, the five of them at the bow with their
  // heads), the stern as it comes down into the water, the ship after it has sailed off, its wake, and the ice down
  // to its foot: the slips go out in the first second of the beat (the deepest at y −9.9), then the ice shrinks
  const at5 = (tt, x, y, z) => shipPt(shipX5(tt), keel5(tt), shipZ5(tt), x, y, z);
  const B_SHIP = () => [
    stranded(AT.heroEnd[0], deckAt(AT.heroEnd[0]) + HEAD, AT.heroEnd[1]),
    stranded(AT.s2[0], deckAt(AT.s2[0]) + HS + 0.5, AT.s2[1]),
    at5(T5.touch, HULL.x0 - 0.3, 0.4, 0),                              // the transom meets the water
    at5(T5.afloat, PROP.x - 0.3, PROP.y - PROP.r - 0.2, 0),            // the screw under it as it floats
    afloat(PROP.x - 0.4, PROP.y - PROP.r - 0.2, 0),
    afloat(HULL.x1 + 0.3, deckAt(HULL.x1) + 0.6, 0),
    afloat(HULL.x0 - 2.6, 1.2, HULL.hw),                               // the wake and the speed lines behind it
    afloat(AT.heroEnd[0], deckAt(AT.heroEnd[0]) + HEAD, AT.heroEnd[1]),
    // the wheelhouse and the heap on its roof as the beat begins (the stern deck with the engine, and the stranded
    // screw in the air, no longer the subject, may be cut by the frame's edge for the first second: the ship that
    // sails off into the frame is drawn larger for it)
    stranded(WH.x0 - 0.4, roofY + 1.0, WH.z1),
  ];
  const B_PTS = () => [...B_SHIP(), iceAt(-7.4, -6, 0, SHRINK.k), iceAt(7.4, -6, 0, SHRINK.k), iceAt(0, ICE_BOT - 0.4, 0, SHRINK.k), W(ICE.x, -10.4, 4.6)];
  // desktop beat 3: the whole section with the ship on it
  const D_S1 = () => [...S0(), ...S1()];
  // beat 5 held sideways: the shrunken ice's waist instead of its foot (the cut runs on below the frame: with the
  // foot in, a frame this short is limited by its height and the leader drops under 60 px)
  const B_LAND = () => [...B_SHIP(), iceAt(-6.6, -4, 0, SHRINK.k), iceAt(6.6, -4, 0, SHRINK.k), iceAt(0, -8, 3, SHRINK.k)];
  // a phone held sideways (the phone layout under 500 px tall) is limited by height: beats 1–2 keep only the top of
  // the section; beat 3 leaves the ice's foot out and keeps the slips; beat 4 the deck down to the waterline
  const land = () => typeof innerWidth === 'number' && innerWidth > innerHeight;
  const S0_LAND = () => [...SHIP_A(), iceAt(-5.9, -2.2, 0), iceAt(5.9, -2.2, 0)];
  const S1_LAND = () => [stranded(AT.hero[0], deckAt(AT.hero[0]) + HH + 0.9, AT.hero[1]), ...SHIP_A().slice(0, 3),
    iceAt(-6.6, -4, 0), iceAt(6.6, -4, 0), iceAt(SLIPS[2].x, SLIPS[2].y - 1.3, 3.2)];
  const DECK_LAND = () => [...DECK().slice(0, 6), iceAt(-2.5, -0.4, 1.5), iceAt(2.5, -0.4, 1.5)];
  // the camera stands just over the water, at about the height of the deck, as a section drawing is seen: the
  // waterline runs level across the frame and every line of sight past the people and the falling tools rises into
  // the paper (from higher up it met the AI zone's typed sea behind them, at 0.13–0.3, or above them, at 0.45)
  const EL = { phone: 0.05, land: 0.05, desk: 0.05 };
  // o.daz / o.margin: held upright only (the result's frame turns a little further round toward the stern and keeps
  // a narrower margin: the ship's run of a hull length and more is wide, and the people on it stay large)
  const phoneShot = (pts, landPts, o = {}) => ({
    get az() { return VIEW_AZ + (land() ? 0 : o.daz || 0); },
    get el() { return land() ? EL.land : EL.phone; },
    get margin() { return land() ? undefined : o.margin; },
    anchors: () => (land() ? landPts() : pts()),
  });
  const deskShot = (pts) => ({ az: VIEW_AZ, get el() { return EL.desk; }, anchors: pts });
  // by beats[i].shot: 0 the ship on the ice (beats 1–2), 1 down the ice (beat 3), 2 the result (beat 5, the end),
  // 3 the deck (beat 4)
  const shots = {
    phone: [phoneShot(S0, S0_LAND), phoneShot(S1, S1_LAND), phoneShot(B_PTS, B_LAND, { daz: 0.2, margin: 0.05 }), phoneShot(DECK_TALL, DECK_LAND)],
    // desktop: beats 1–2 and 4 close on the ship (the struggle and the act at twice the scale), beat 3 the whole
    // section, beat 5 and the end the ship's course over the ice
    desk: [deskShot(S0), deskShot(D_S1), deskShot(B_PTS), deskShot(S0)],
  };

  function rest() { return pose(LAST, 1); }
  function ambient() { /* the propeller and the water move in their shaders (the world clock); nothing else */ }

  const api = {
    id: 'under',
    group: g,
    zone: 'brand',
    // the map pill: high enough over the dock that it does not sit on the ship afloat in the notch (the map's rest)
    anchor: W(1.5, 13, 0),
    pin: W(SHIP.x1 - 1, SHIP.keel1 + HULL.deck + 0.2, SHIP.z1),
    // accents at full strength round the dock, from the stranded stern to the bow at the end of its run
    focus: { pos: W(5.5, -2, 0), r: 21 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalUnit,
    lever: null,
    mainActor: 'hero',
    restParts: REST,
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { EL, gauge, hero: hero.group, lead: lead.group, staff: staff.map((p) => p.group), ship: hullG, propeller: engineG, screw: propG, tools: toolsG, iceberg: berg, slips: slips.map((s) => s.o) },
  };
  rest();
  emphasize(null);
  return api;
}
