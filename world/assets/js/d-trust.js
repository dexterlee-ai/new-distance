// 品牌怎麼被相信 · trust (articles 6, 3) - in the heartland (TH 300 deg, r 28), told in five beats around one photo.
// A two-step display stand.  On its front step, in the middle, stands the brand's photo (a rainbow over clouds: the
// real photo of 03 b2); the brand who took it stands at the stand's left end.  At the stand's right end stands the AI:
// a typed printer, its slot toward the reader.  Maker - photos - copier, left to right.
//  1  The printer wakes (teal) and throws four prints out of its slot, one after another; they land on the stand round
//     the photo, every one drawn exactly like it, and one by one they lose their teal: nothing tells them apart (06 b20).
//  2  A passer-by walks up: 「一定是 AI！」 and throws a red pencil X onto the real photo, which rocks with the hit.  A
//     second one comes up and points at it too.  Nobody questions the copies (03 b3; 06 b21).
//  3  The brand comes out to them (出面) and says it: 「真的是我們拍的」, pointing at its photo.  They turn their backs;
//     the second walks off for good, the first a few steps; the X stays (06 b39, b24; 03 b4).
//  4  Three people come the long way, each along its own dashed trail from its own side, each holding up a check card,
//     and stick them on the photo's margin; each card knocks the X a little further off, the third leaves it crooked.
//     All the while the printer spits copy after copy onto the ground in front of it: a heap grows there.  The three
//     walk off again; the printer keeps going (06 b14, b20).
//  5  Two people who were there walk in from the sides and speak for the photo (「我在現場」, 「我親眼看過」).  The one
//     who threw the X walks up to the photo and pulls it off himself, the photo turns lime, and he walks back to stand
//     with the two, throws the X away and says it: 「原來是真的」 (06 b31, b39).
// Framing: every screen opens on the brand, the stand and the printer, then eases once to the stand and the people in
// front of it (on an upright phone at the same scale: the picture only slides up).
// Everything the reader sees is a pure function of (beat, k): pose().  No copy lives here: captions, labels, the
// words in the bubbles and on the printer and the tap lines come from world.json by part id.
// Local frame: +z points at the camera, +x is the camera's right; y = 0 is the ground at the district's centre.
// The camera stands west of the district and looks east, away from the centre and its tall neighbours.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, clamp } from './kit.js';
import { heightAt } from './terrain.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), XAX = new V3(1, 0, 0), ZAX = new V3(0, 0, 1);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
/** a pop: 0 → a little past 1 → 1 */
const pop = (x) => { x = clamp(x); const c = 2.2; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const strip = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
const boxAt = (w, h, d, x, y, z) => strip(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
/** a fixed scatter (the same every run): 0 … 1 */
const hash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };

// ------------------------------------------------------------------ the set (local units)
const TH = 300, RR = 28;
// the camera's side (world azimuth): west of the district, looking east - away from the centre (which will become a
// town square) and from the hall that stood behind the old view
const VIEW_AZ = (200 * Math.PI) / 180;
const YAW = Math.PI / 2 - VIEW_AZ;                    // group turn: local +z → the camera
// Everything is laid out for a phone held upright first: the action runs in depth (top to bottom of the screen), and
// nothing reaches far to the sides.  People stand well in front of the stand, so they and their words never cover the
// photos.
// the stand: a front step and a taller back step (x across, z toward the camera)
const STD = { w0: 8.4, d0: 1.8, h0: 1.0, z0: 0.7, w1: 5.6, d1: 1.7, h1: 2.4, z1: -1.05 };
const FRONT = STD.z0 + STD.d0 / 2;                    // the stand's front face
// a photo print, an instant photo: the picture near the top, a wide white margin under it (where the checks go);
// origin at its bottom edge's middle, standing on a back strut, leaning back a little
const PH = { w: 2.4, h: 3.2, t: 0.16, lean: 0.06, pic: 2.0, top: 0.2 };
const PIC_Y = PH.h - PH.top - PH.pic / 2;             // the picture's centre on the print
const MARGIN_Y = (PH.h - PH.top - PH.pic) / 2;        // the middle of the margin under the picture
// the five places on the stand (index REAL is the brand's own photo, front middle)
const SLOT = [
  { x: -2.75, y: STD.h0, z: STD.z0 - 0.1 },           // front left
  { x: 0, y: STD.h0, z: STD.z0 - 0.1 },               // front middle: the real photo
  { x: 2.75, y: STD.h0, z: STD.z0 - 0.1 },            // front right
  { x: -1.4, y: STD.h1, z: STD.z1 - 0.05 },           // back left
  { x: 1.4, y: STD.h1, z: STD.z1 - 0.05 },            // back right
];
const REAL = 1;
const COPIES = [0, 2, 3, 4];
// a check card (square): carried in at this size and stuck on the real photo's margin at the same size, side by side
// (a little over one another), each a little askew
const CARD = 1.0;
const CARD_X = [-0.74, 0.02, 0.76];
const CARD_RZ = [-0.11, 0.05, 0.13];
// the AI: a typed printer at the stand's right end, its slot toward the reader; in beat 4 what it keeps making lands
// on the open ground in front of it
const PRN = { x: 5.75, z: -0.15, w: 2.2, h: 3.0, d: 2.5 };  // w: along its slot's way (local z here), d: across (x)
// the heap of copies in beat 4: N prints, each landing a little farther out than the last (fixed scatter)
const HEAP = { th: 0.05, at: [
  [5.6, 3.3, 0.15], [4.7, 3.5, -0.35], [6.2, 4.0, 0.5], [5.2, 4.3, -0.1], [4.1, 4.4, 0.3], [5.9, 5.0, -0.45],
  [4.8, 5.2, 0.6], [3.75, 5.35, -0.25], [5.4, 5.8, 0.2], [6.4, 5.9, -0.6], [4.35, 6.15, 0.45], [3.5, 6.5, -0.5],
  [5.05, 6.65, -0.2], [6.05, 6.85, 0.35]] };
HEAP.n = HEAP.at.length;
// people
const H_MK = 5.0, H_D = 4.8, H_S = 4.9, H_V = 4.75;
const STRIDE = (H) => 0.38 * H;
// the brand at the stand's left end; in beat 3 it comes out to the two who doubt (MO), so its words hang over the open
// ground, never over the photos
const MK = { x: -5.15, z: 0.25 };
const MO = { x: -4.9, z: 9.3 };
// the two who doubt: from the front up to their places, facing the photo (the second comes later, from farther off)
const DB = [
  { from: [-2.6, 17.5], at: [-1.55, 9.3] },
  { from: [7.5, 20.5], at: [2.25, 9.8] },
];
// the three who check: each from far off on its own side, along its own line, to a place facing the photo (far enough
// in front that their heads stay under the photos)
const SRC = [
  { from: [-11.5, 19.5], at: [-3.4, 6.0], w: [0.0, 1.6] },
  { from: [8.5, 21.5], at: [1.85, 6.4], w: [0.1, 1.75] },
  { from: [-1.5, 23.0], at: [-0.75, 7.0], w: [0.2, 1.9] },
];
// the two who were there: in from the sides, facing the one who doubted
const VC = [
  { from: [-9.5, 8.6], at: [-4.25, 8.8], w: [0.0, 0.8] },
  { from: [9.8, 9.2], at: [4.45, 9.1], w: [0.12, 0.92] },
];
const VDY = -0.55;                                    // their words a little lower than over a head: beside the face
const AWAY_D = 1.6;                                   // how far the first walks off from the brand's words (beat 3)
// beat 5: where the one who doubted stands to pull the X off (beside the photo, reaching it), where he ends, with the
// two who were there, and where he throws the X (away past the reader, out of the picture)
const PULL = { x: 1.55, z: 2.35 };
const FLING = { x: -9.5, z: 26.0 };
const CONV = { x: -0.55, z: 11.0 };
// the second doubter leaves the picture in beat 3 (toward the bottom right, out of every shot)
const GONE2 = { x: 9.5, z: 21.0 };

// the picture on a print (picture-local, x right, y up, centred): a rainbow over two clouds and the horizon
function pictureLines() {
  const L = [];
  for (const r of [1.02, 0.84, 0.66]) {
    const pts = [];
    for (let i = 0; i <= 36; i++) { const a = 0.08 * Math.PI + (i / 36) * 0.84 * Math.PI; pts.push(new V3(Math.cos(a) * r, -0.5 + Math.sin(a) * r, 0)); }
    L.push(pts);
  }
  const cloud = (cx, cy, s) => {
    const pts = [];
    const bumps = [[-0.5, 0.0, 0.22], [-0.22, 0.12, 0.28], [0.14, 0.1, 0.26], [0.44, -0.02, 0.2]];
    for (const [bx, by, br] of bumps) for (let i = 0; i <= 9; i++) { const a = Math.PI * (1 - i / 9); pts.push(new V3(cx + (bx + Math.cos(a) * br) * s, cy + (by + Math.sin(a) * br) * s, 0)); }
    pts.push(new V3(cx + 0.66 * s, cy - 0.12 * s, 0), new V3(cx - 0.74 * s, cy - 0.12 * s, 0), pts[0].clone());
    return pts;
  };
  L.push(cloud(-0.72, -0.56, 0.78), cloud(0.76, -0.6, 0.72));
  L.push([new V3(-1.18, -0.86, 0), new V3(1.18, -0.86, 0)]);
  return L;
}

// ------------------------------------------------------------------ the beats
// dur = the motion, and it runs on while the caption is read: each beat lasts keyAt + the caption's hold (0.8 s + 0.2 s
// per 字, story.js), so nothing stands still before the next beat
const BEATS = [
  // 1 AI copies it in seconds, exactly - four prints thrown onto the stand one after another; they lose their teal
  { dur: 5.0, keyAt: 1.35, shot: 0, parts: ['copy', 'real', 'maker'] },
  // 2 everything looks real, so the real one is called AI - 「一定是 AI！」, a red X on the real photo, a second joins
  { dur: 5.2, keyAt: 1.2, shot: 1, parts: ['passers', 'real', 'copy'] },
  // 3 the brand comes out and says so; they turn their backs - the X stays
  { dur: 4.9, keyAt: 1.1, shot: 1, parts: ['maker', 'passers', 'real'] },
  // 4 three unrelated people check it, the long way round - meanwhile the printer heaps up copies; the X comes loose
  { dur: 7.3, keyAt: 2.5, shot: 1, parts: ['sources', 'real', 'copy', 'passers'] },
  // 5 what makes him take it back: people who saw it and speak for it - he pulls the X off himself; lime
  { dur: 6.1, keyAt: 1.1, shot: 1, parts: ['vouchers', 'passers', 'real', 'maker'] },
];
const LAST = BEATS.length - 1;
const REST_PARTS = ['real', 'vouchers', 'passers', 'copy', 'maker'];
// beat-local times (seconds)
const T1 = { shake: [0.4, 1.85], emit: [0.45, 0.75, 1.05, 1.35], fly: 0.42, plain: [2.1, 2.85, 3.6, 4.35], look: [0.4, 0.75], back: [0.85, 1.35], hesit: [4.25, 4.85] };
const T2 = { walk: [[0.0, 0.8], [1.0, 2.75]], point: [0.72, 0.88], bub: 0.78, x: [0.86, 1.2], slam: 0.14, rock: [1.2, 2.0], point2: [2.85, 3.25], nod: [3.7, 4.1], cross: [3.25, 3.75], brand: [2.4, 3.1] };
const T3 = { out: [0.0, 0.8], up: [0.75, 1.0], bub: 0.82, look: [0.45, 0.85], away: [1.05, 2.2], gone: [1.0, 4.4], cross: [2.35, 2.85], point: [1.9, 2.3], down: [3.6, 4.1] };
// beat 4: each source walks in (SRC[j].w), raises its card (+0.1), tosses it (+0.22), it lands (+0.56); they leave from
// `out`; the printer heaps up copies all through the beat
const T4 = { raise: 0.1, toss: 0.22, fly: 0.34, home: [0.05, 1.35], watch: [0.25, 1.45], out: 3.7, outDur: 2.7, work: [0.1, 6.9] };
const LAND4 = SRC.map((s) => s.w[1] + T4.toss + T4.fly);
// the copies of beat 4: nine before the third card lands, then on at a steadier pace to the end of the beat
const HEAP_T = Array.from({ length: HEAP.n }, (_, i) => (i < 9 ? 0.15 + i * 0.25 : 2.55 + (i - 9) * 0.75));
const HEAP_FLY = 0.36;
// beat 5: the two who were there come in and speak; the one who doubted walks up to the photo, pulls the X off, drops
// it on his way back, the photo turns lime, and he says so
const T5 = { bub: 0.08, to: [0.8, 2.3], grab: [2.25, 2.5], pull: [2.5, 2.75], lime: 2.68, back: [2.8, 4.45], throw: [4.4, 4.7], fly: [4.5, 5.05], face: [4.75, 5.1], convert: 4.75, watch: [1.0, 1.5], face2: [4.75, 5.25] };

// ------------------------------------------------------------------ pose vectors (people.js, normalised units)
const hc = (h) => ({ p: h.p.clone(), pole: h.pole.clone(), grip: h.grip.clone() });
const fc = (f) => ({ p: f.p.clone(), q: f.q.clone() });
function clonePose(v) {
  return {
    hips: { p: v.hips.p.clone(), q: v.hips.q.clone() }, waist: v.waist.clone(), neck: v.neck.clone(), head: v.head.clone(),
    hand: { L: hc(v.hand.L), R: hc(v.hand.R) }, foot: { L: fc(v.foot.L), R: fc(v.foot.R) },
  };
}
/** the same body seen from a root turned by a and moved by (tx, tz) (normalised units) */
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
function reframe(v, from, to, H) {
  const c = Math.cos(to.yaw), s = Math.sin(to.yaw);
  const dx = from.x - to.x, dz = from.z - to.z;
  return movePose(v, from.yaw - to.yaw, (dx * c - dz * s) / H, (dx * s + dz * c) / H);
}
const chestQ = (v) => v.hips.q.clone().multiply(v.waist);
const chestPt = (v, x, y, z) => new V3(x, y, z).applyQuaternion(v.waist).add(new V3(0, 0.066, -0.004)).applyQuaternion(v.hips.q).add(v.hips.p);
const chestDir = (v, x, y, z) => new V3(x, y, z).applyQuaternion(chestQ(v));
const qy = (a) => new Q().setFromAxisAngle(YAX, a);
/** the head (and neck) turned by yaw on top of a pose: the hands keep their places */
function look(v, yaw, pitch = 0) {
  const o = clonePose(v);
  const e = (a, p) => new Q().setFromEuler(new THREE.Euler(p, a, 0, 'YXZ'));
  o.neck.multiply(e(yaw * 0.42, pitch * 0.4));
  o.head.multiply(e(yaw * 0.58, pitch * 0.6));
  return o;
}
/** the right arm stretched toward dir (root frame), the body turned a little that way */
function pointAt(v, dir) {
  const o = clonePose(v);
  const d = dir.clone().normalize();
  o.waist.premultiply(qy(clamp(Math.atan2(d.x, d.z) * 0.25, -0.35, 0.35)));
  const sh = chestPt(o, -0.114, 0.182, 0);
  o.hand.R.p.copy(sh).addScaledVector(d, 0.335);
  o.hand.R.pole.copy(chestDir(o, -0.7, -0.9, -0.3));
  o.hand.R.grip.copy(chestQ(o));
  o.head.premultiply(qy(clamp(Math.atan2(d.x, d.z) * 0.3, -0.5, 0.5)));
  return o;
}
/** arms folded across the chest: not having it */
function crossArms(v) {
  const o = clonePose(v);
  o.hand.R.p.copy(chestPt(o, 0.07, 0.05, 0.15)); o.hand.R.pole.copy(chestDir(o, -1, -0.45, 0.25));
  o.hand.L.p.copy(chestPt(o, -0.07, 0.075, 0.16)); o.hand.L.pole.copy(chestDir(o, 1, -0.45, 0.25));
  return o;
}
/** a card held up in front of the chest with the right hand (walking or standing) */
function cardHeld(v) {
  const o = clonePose(v);
  o.hand.R.p.copy(chestPt(o, -0.06, 0.06, 0.2)); o.hand.R.pole.copy(chestDir(o, -0.6, -1, -0.3));
  return o;
}
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

/** strokes (glyphs drawn in 3D): polylines of points → cylinders with round joints, one geometry */
function strokeGeo(lines, r, segs = 8) {
  const parts = [];
  for (const pts of lines) {
    for (let i = 0; i < pts.length; i++) {
      parts.push(strip(new THREE.SphereGeometry(r, segs, 6).translate(pts[i].x, pts[i].y, pts[i].z)));
      if (i === 0) continue;
      const a = pts[i - 1], b = pts[i], d = new V3().subVectors(b, a), L = d.length();
      if (L < 1e-5) continue;
      const c = new THREE.CylinderGeometry(r, r, L, segs, 1, true);
      c.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, d.normalize()), new V3(1, 1, 1)));
      parts.push(strip(c));
    }
  }
  return mergeGeometries(parts);
}
/** a check mark, w wide, origin at its corner */
function checkGeo(w) {
  return strokeGeo([[new V3(-0.36 * w, 0.3 * w, 0), new V3(0, 0, 0), new V3(0.56 * w, 0.72 * w, 0)]], 0.12 * w, 10);
}
/** the edges of a box as thin bars (a typed box has no outline of its own) */
function edgeBars(w, h, d, { y0 = 0, th = 0.07, grow = 0.01 } = {}) {
  const bars = [], x = w / 2 + grow, z = d / 2 + grow, y1 = y0 + h;
  const Pt = (sx, y, sz) => new V3(sx * x, y, sz * z);
  const bar = (a, b) => {
    const dir = new V3().subVectors(b, a), L = dir.length();
    const geo = new THREE.BoxGeometry(th, L + th, th);
    geo.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, dir.normalize()), new V3(1, 1, 1)));
    bars.push(strip(geo));
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(Pt(sx, y0, sz), Pt(sx, y1, sz));
  for (const y of [y0, y1]) {
    for (const sz of [-1, 1]) bar(Pt(-1, y, sz), Pt(1, y, sz));
    for (const sx of [-1, 1]) bar(Pt(sx, y, -1), Pt(sx, y, 1));
  }
  return mergeGeometries(bars);
}
/** typed faces told apart by tone: the top light, the sides a step or two darker */
function faceTones(geo, { top = 1, px = 0.5, nx = 0.6, pz = 0.78, nz = 0.6, bottom = 0.5 } = {}) {
  const n = geo.attributes.normal, c = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
    const t = y > 0.6 ? top : y < -0.6 ? bottom : Math.abs(x) > Math.abs(z) ? (x > 0 ? px : nx) : (z > 0 ? pz : nz);
    c[i * 3] = t; c[i * 3 + 1] = -1; c[i * 3 + 2] = -1;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

export function buildTrust() {
  const g = new THREE.Group();
  g.name = 'trust';
  const base = polar(RR, TH);
  g.position.copy(base);
  g.rotation.y = YAW;
  g.updateMatrixWorld(true);
  const _gw = new V3();
  /** ground height under a local point (local y) */
  const gy = (x, z) => { _gw.set(x, 0, z).applyMatrix4(g.matrixWorld); return heightAt(_gw.x, _gw.z) - base.y; };
  const W = (x, y, z) => g.localToWorld(new V3(x, y, z));
  const G0 = gy(0, STD.z0);                           // the stand's floor

  // =================================================================== the stand
  const stand = new THREE.Group(); stand.name = 'stand';
  stand.position.y = G0;
  g.add(stand);
  {
    // two steps on a footing sunk into the ground (the ground is not quite flat)
    let lo = 0;
    for (const x of [-STD.w0 / 2, 0, STD.w0 / 2]) for (const z of [STD.z1 - STD.d1 / 2, FRONT]) lo = Math.min(lo, gy(x, z) - G0);
    const sink = -lo + 0.4;
    const parts = [
      boxAt(STD.w0, STD.h0 + sink, STD.d0, 0, (STD.h0 - sink) / 2, STD.z0),
      boxAt(STD.w1, STD.h1 + sink, STD.d1, 0, (STD.h1 - sink) / 2, STD.z1),
    ];
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ shade: 0.9, bias: 0.14 }));
    m.castShadow = m.receiveShadow = true;
    stand.add(m);
  }

  // =================================================================== the five prints (one drawing for all five)
  const lines = pictureLines().map((pts) => pts.map((p) => new V3(p.x * PH.pic / 2.75, p.y * PH.pic / 2.75 + PIC_Y, PH.t / 2 + 0.05)));
  const strutGeo = (() => {
    const b = new THREE.BoxGeometry(0.46, PH.h * 0.72, 0.08);
    b.applyMatrix4(new M4().compose(new V3(0, PH.h * 0.34, -0.55), new Q().setFromAxisAngle(XAX, 0.32), new V3(1, 1, 1)));
    return strip(b);
  })();
  const printGeo = mergeGeometries([boxAt(PH.w, PH.h, PH.t, 0, PH.h / 2, 0), strutGeo]);
  const picGeo = boxAt(PH.pic, PH.pic, 0.04, 0, PIC_Y, PH.t / 2 + 0.01);
  const lineGeo = strokeGeo(lines, 0.055);
  const prints = SLOT.map((s, i) => {
    const grp = new THREE.Group(); grp.name = i === REAL ? 'real' : `copy${i}`;
    const body = new THREE.Mesh(printGeo, ink({ shade: 1.0, bias: 0.5 }));
    body.castShadow = body.receiveShadow = true;
    const pic = new THREE.Mesh(picGeo, ink({ shade: 0.9, bias: 0.1 }));
    pic.castShadow = false;
    const ln = new THREE.Mesh(lineGeo, ink({ accent: 'ink' }));
    ln.castShadow = false;
    // the tilt sits on an inner group, so a print in flight can turn as a whole
    const inner = new THREE.Group();
    inner.rotation.x = -PH.lean;
    inner.add(body, pic, ln);
    grp.add(inner);
    stand.add(grp);
    return { group: grp, inner, body, pic, ln, slot: new V3(s.x, s.y, s.z) };
  });
  const realP = prints[REAL];
  const copyGrp = new THREE.Group(); copyGrp.name = 'copies';
  stand.add(copyGrp);
  for (const i of COPIES) copyGrp.add(prints[i].group);

  // =================================================================== the AI: a typed printer
  const ai = new THREE.Group(); ai.name = 'ai';
  g.add(ai);
  const printer = P.makePrinter({ w: PRN.w, h: PRN.h, d: PRN.d });
  faceTones(printer.body.geometry, { top: 1.05, px: 0.62, pz: 0.5, nz: 0.5 });
  printer.body.material.vertexColors = true;
  {
    const e = new THREE.Mesh(edgeBars(PRN.w, PRN.h * 0.9, PRN.d, { th: 0.075 }), ink({ accent: 'ink' }));
    e.name = 'printer-edges'; e.castShadow = false;
    printer.group.add(e);
  }
  const prY = gy(PRN.x, PRN.z);
  printer.group.position.set(PRN.x, prY, PRN.z);
  printer.group.rotation.y = -Math.PI / 2;            // its slot (+x) toward the reader (+z)
  ai.add(printer.group);
  printer.group.updateMatrixWorld(true);
  const _gInv0 = new M4().copy(g.matrixWorld).invert();
  const SLOT_MOUTH = printer.slotWorld().applyMatrix4(_gInv0);   // district-local

  // ---- the heap of copies the printer spits out in beat 4: the same print, lying face up on the open ground in front
  // of it, each landing a little farther out than the last, so the heap visibly spreads and every print shows a corner
  const heapGrp = new THREE.Group(); heapGrp.name = 'heap';
  ai.add(heapGrp);
  const heapMat = { body: ink({ shade: 1.0, bias: 0.5 }), pic: ink({ shade: 0.9, bias: 0.1 }), ln: ink({ accent: 'ink' }) };
  const flatGeo = boxAt(PH.w, PH.h, HEAP.th, 0, PH.h / 2, 0);
  // a print lying on others shows no depth step, so each one carries its own drawn edge: every print in the heap
  // reads as one more photo
  const rimW = 0.075, rimZ = HEAP.th / 2 + 0.015;
  const rimGeo = mergeGeometries([
    boxAt(PH.w, rimW, 0.03, 0, rimW / 2, rimZ), boxAt(PH.w, rimW, 0.03, 0, PH.h - rimW / 2, rimZ),
    boxAt(rimW, PH.h, 0.03, -PH.w / 2 + rimW / 2, PH.h / 2, rimZ), boxAt(rimW, PH.h, 0.03, PH.w / 2 - rimW / 2, PH.h / 2, rimZ),
  ]);
  heapMat.rim = ink({ accent: 'ink' });
  const heapRest = [];
  for (let i = 0; i < HEAP.n; i++) {
    const [x, z, yaw] = HEAP.at[i];
    // on top of every earlier print it overlaps
    let y = 0;
    for (let j = 0; j < i; j++) if (Math.hypot(heapRest[j].x - x, heapRest[j].z - z) < 2.3) y = Math.max(y, heapRest[j].y + HEAP.th + 0.012);
    heapRest.push({ x, z, y, yaw });
  }
  let heapY = -1e9;
  for (const R of heapRest) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) heapY = Math.max(heapY, gy(R.x + sx * 1.1, R.z + sz * 1.1));
  const heap = heapRest.map((R, i) => {
    const grp = new THREE.Group(); grp.name = `heap${i}`;
    // lying face up: the print's face (+z) to the sky, its top away from the reader, so the picture reads upright
    const flat = new THREE.Group();
    flat.rotation.x = -Math.PI / 2;
    const inner = new THREE.Group();
    inner.position.y = -PH.h / 2;
    const body = new THREE.Mesh(flatGeo, heapMat.body);
    const pic = new THREE.Mesh(picGeo, heapMat.pic);
    pic.position.z = -PH.t / 2 + HEAP.th / 2;
    const ln = new THREE.Mesh(lineGeo, heapMat.ln);
    ln.position.z = -PH.t / 2 + HEAP.th / 2;
    const rim = new THREE.Mesh(rimGeo, heapMat.rim);
    for (const o of [body, pic, ln, rim]) { o.castShadow = false; o.receiveShadow = i === 0; }
    inner.add(body, pic, ln, rim);
    flat.add(inner);
    grp.add(flat);
    heapGrp.add(grp);
    return { group: grp, rest: { x: R.x, z: R.z, y: heapY + 0.03 + R.y, yaw: R.yaw }, arc: 1.0 + hash(i, 4) * 0.7, spin: (hash(i, 5) - 0.5) * 2.4 };
  });
  // the heap's extent (district-local), for framing and its hit box
  const HEAP_BOX = (() => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const R of heapRest) { x0 = Math.min(x0, R.x - 1.45); x1 = Math.max(x1, R.x + 1.45); z0 = Math.min(z0, R.z - 1.45); z1 = Math.max(z1, R.z + 1.45); }
    return { x0, x1, z0, z1, y0: heapY, y1: heapY + 0.6 };
  })();

  // ---- the red ✕ the doubter puts on the real photo
  const X = (() => {
    const cross = (L, w, t, z) => mergeGeometries([Math.PI / 4, -Math.PI / 4].map((a) => boxAt(L, w, t, 0, 0, 0).applyMatrix4(new M4().compose(new V3(0, 0, z), new Q().setFromAxisAngle(ZAX, a), new V3(1, 1, 1)))));
    const L = 2.3, w = 0.5, t = 0.3;
    const mesh = new THREE.Mesh(cross(L, w, t, 0), ink({ shade: 0.32, accent: 'red' }));
    const rim = new THREE.Mesh(cross(L + 0.16, w + 0.16, t * 0.5, -t * 0.45), ink({ accent: 'ink' }));
    const group = new THREE.Group(); group.name = 'x';
    group.add(mesh, rim);
    for (const o of [mesh, rim]) o.castShadow = false;
    return { group, mesh, rim };
  })();
  stand.add(X.group);
  // ---- three ✓ cards: carried in by the sources, then on the plate
  const cards = [0, 1, 2].map((j) => {
    const grp = new THREE.Group(); grp.name = `check${j + 1}`;
    const b = new THREE.Mesh(boxAt(CARD, CARD, 0.07, 0, 0, 0), ink({ shade: 1.0, bias: 0.5 }));
    b.castShadow = false;
    // a ✓ on both faces: it reads whichever way its holder turns it
    const cg = checkGeo(CARD * 0.7);
    const c = new THREE.Mesh(cg, ink({ accent: 'ink' }));
    c.position.set(-0.08, -CARD * 0.26, 0.06);
    const c2 = new THREE.Mesh(cg, c.material);
    c2.position.set(0.08, -CARD * 0.26, -0.06); c2.rotation.y = Math.PI;
    for (const o of [c, c2]) o.castShadow = false;
    grp.add(b, c, c2);
    g.add(grp);
    return grp;
  });
  // ---- the trails the sources leave: dashes on the ground along each path, shown as the walker passes them
  const trails = new THREE.Group(); trails.name = 'trails';
  g.add(trails);
  const trailDash = SRC.map((s) => {
    const [fx, fz] = s.from, [ax, az] = s.at;
    const L = Math.hypot(ax - fx, az - fz), dir = Math.atan2(ax - fx, az - fz);
    const list = [];
    for (let d = 0.8; d < L - 1.2; d += 1.05) {
      const x = fx + ((ax - fx) * d) / L, z = fz + ((az - fz) * d) / L;
      const m = new THREE.Mesh(boxAt(0.16, 0.05, 0.55, 0, 0, 0), ink({ accent: 'ink' }));
      m.position.set(x, gy(x, z) + 0.05, z); m.rotation.y = dir;
      m.castShadow = false; m.receiveShadow = false;
      trails.add(m);
      list.push({ m, d });
    }
    return { list, L };
  });

  // =================================================================== people
  const tone = (p) => { p.material.userData.u.uShadeBias.value = 0.36; return p; };   // a drawing, not a silhouette
  const maker = tone(makePerson({ height: H_MK }));
  maker.group.name = 'maker';
  g.add(maker.group);
  const passers = new THREE.Group(); passers.name = 'passers';
  g.add(passers);
  const dbs = DB.map(() => { const p = tone(makePerson({ height: H_D })); passers.add(p.group); return p; });
  const team = new THREE.Group(); team.name = 'sources';
  g.add(team);
  const srcs = SRC.map(() => { const p = tone(makePerson({ height: H_S })); team.add(p.group); return p; });
  const crowd = new THREE.Group(); crowd.name = 'vouchers';
  g.add(crowd);
  const vs = VC.map(() => { const p = tone(makePerson({ height: H_V })); crowd.add(p.group); return p; });

  // bubbles: the doubter's words (beat 2), the brand's (beat 3), the people who speak for the photo (beat 5).  Each is
  // as wide as its words need at 13 px on a phone (about 0.6 units a character at the phone's scale, plus the rim);
  // each leans toward the middle of the picture from its speaker's head (tail 'left': the bubble lies to the right)
  const BUB = {
    doubt: { w: 5.0, tail: 'left', parent: passers },
    claim: { w: 5.6, tail: 'left', parent: g },
    'voucher-1': { w: 3.7, tail: 'left', parent: crowd },
    'voucher-2': { w: 4.3, tail: 'right', parent: crowd },
    convert: { w: 4.3, tail: 'left', parent: passers, dx: 0.1, dy: -0.9 },
  };
  const BH = 1.5;
  for (const [id, b] of Object.entries(BUB)) {
    const bub = P.makeBubble({ w: b.w, h: BH, tail: b.tail });
    bub.mesh.castShadow = false;
    bub.group.name = `bubble-${id}`;
    b.parent.add(bub.group);
    b.bub = bub;
    b.k = 0;
  }

  // =================================================================== hit proxies
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
  /** one box round each person of a group (and round any extra boxes), rewritten as they move (one mesh, so the
   *  part has one proxy); a person who is not there folds into the first extra box */
  const groupProxy = (name, parent, people, H, ...extras) => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const b = one.attributes.position.array;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(b.length * (people.length + extras.length)), 3));
    const m = new THREE.Mesh(geo, HIDDEN);
    m.name = `hit:${name}`; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    const sx = 0.36 * H + 0.5, sy = H + 0.6, sz = 0.3 * H + 0.5;
    m.userData.place = () => {
      const a = geo.attributes.position.array;
      const c0 = extras.length ? extras[0]().c : null;
      people.forEach((p, j) => {
        const on = p.group.visible && p.group.parent.visible;
        // a person who is not there folds to nothing: into the first extra box, or onto the first person
        const o = on ? p.group.position : c0 || people[0].group.position, k = on ? 1 : 0;
        for (let i = 0; i < b.length; i += 3) {
          a[j * b.length + i] = o.x + b[i] * sx * k;
          a[j * b.length + i + 1] = k ? o.y + (b[i + 1] + 0.5) * sy - 0.3 : o.y;
          a[j * b.length + i + 2] = o.z + b[i + 2] * sz * k;
        }
      });
      extras.forEach((extra, e) => {
        const { c, s } = extra(), j = people.length + e;
        for (let i = 0; i < b.length; i += 3) {
          a[j * b.length + i] = c.x + b[i] * s.x; a[j * b.length + i + 1] = c.y + b[i + 1] * s.y; a[j * b.length + i + 2] = c.z + b[i + 2] * s.z;
        }
      });
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere(); geo.computeBoundingBox();
    };
    parent.add(m);
    return m;
  };
  const hits = { real: P.makeHitProxy(realP.group, 0.3) };
  // the brand (it comes out in beat 3; its box goes with it)
  hits.maker = groupProxy('maker', g, [maker], H_MK);
  hits.passers = groupProxy('passers', passers, dbs, H_D);
  // the copies answer together with the printer that made them and the heap it keeps making (the AI and what it made)
  hits.copy = groupProxy('copy', copyGrp, [], 1,
    ...COPIES.map((i) => () => ({ c: new V3(SLOT[i].x, SLOT[i].y + PH.h / 2, SLOT[i].z), s: new V3(PH.w + 0.4, PH.h + 0.4, 1.4) })),
    () => ({ c: new V3(PRN.x, prY - G0 + PRN.h / 2, PRN.z), s: new V3(PRN.d + 0.3, PRN.h + 0.3, PRN.w + 0.3) }),
    // the heap, once there is one
    () => (S_.heapOn ? { c: new V3((HEAP_BOX.x0 + HEAP_BOX.x1) / 2, HEAP_BOX.y0 - G0 + 0.4, (HEAP_BOX.z0 + HEAP_BOX.z1) / 2), s: new V3(HEAP_BOX.x1 - HEAP_BOX.x0, 1.0, HEAP_BOX.z1 - HEAP_BOX.z0) }
      : { c: new V3(PRN.x, prY - G0 + PRN.h / 2, PRN.z), s: new V3(0, 0, 0) }));
  // the sources while they are in; the three checks on the plate after
  hits.sources = groupProxy('sources', g, srcs, H_S, () => ({ c: new V3(0, G0 + SLOT[REAL].y + MARGIN_Y, SLOT[REAL].z + 0.3), s: new V3(PH.w + 0.2, 1.1, 0.6) }));
  hits.vouchers = groupProxy('vouchers', crowd, vs, H_V);
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
  // a → b by k at b's place (the body keeps its shape relative to a root that turns from a's facing to b's the short way)
  const blendTo = (a, b, k, H) => {
    const e = sm(k);
    const v = a.x === b.x && a.z === b.z ? a.v : reframe(a.v, a, { x: b.x, z: b.z, yaw: a.yaw }, H);
    return st(b.x, b.z, a.yaw + wrapA(b.yaw - a.yaw) * e, blendPoses(v, b.v, e));
  };
  /** a walk from frame A to frame B over [t0, t1]: turn, walk, settle.  run: already walking when the window opens */
  function walk(p, A, B, t, t0, t1, run = false, carryPose = null) {
    const H = p.height, stride = STRIDE(H);
    const d = Math.hypot(B.x - A.x, B.z - A.z);
    if (t <= t0 && !run) return A;
    if (d < 0.05) return blendTo(A, B, seg(t, t0, t1), H);
    const yw = yawTo(A.x, A.z, B.x, B.z);
    const tt = Math.min(0.28, (t1 - t0) * 0.25);
    const wp = (dist) => { const v = p.pose('walk', { dist, stride }); return carryPose ? carryPose(v) : v; };
    const ta = run ? t0 : t0 + tt;
    if (t < ta) return blendTo(A, st(A.x, A.z, yw, wp(0)), seg(t, t0, t0 + tt), H);
    if (t < t1 - tt) {
      const r = seg(t, ta, t1 - tt), u = run ? r * (1.25 - 0.25 * r) : sm(r) * 0.85 + r * 0.15;
      return st(A.x + (B.x - A.x) * u, A.z + (B.z - A.z) * u, yw, wp(d * u));
    }
    return blendTo(st(B.x, B.z, yw, wp(d)), B, seg(t, t1 - tt, t1), H);
  }
  /** how far along A → B a walk() is at t (0 … 1) */
  function walked(A, B, t, t0, t1, run = false) {
    const tt = Math.min(0.28, (t1 - t0) * 0.25);
    const ta = run ? t0 : t0 + tt;
    if (t <= ta) return 0;
    if (t >= t1 - tt) return 1;
    const r = seg(t, ta, t1 - tt);
    return run ? r * (1.25 - 0.25 * r) : sm(r) * 0.85 + r * 0.15;
  }
  const headTo = (x, z, yaw, hx, hz) => clamp(wrapA(yawTo(x, z, hx, hz) - yaw), -1.25, 1.25);
  const RX = SLOT[REAL].x, RZ = SLOT[REAL].z;         // where everyone looks: the real photo

  // ---- the brand
  const MK_YAW = 0.55;                                 // to the reader, a little toward the photo
  const MO_YAW = yawTo(MO.x, MO.z, (DB[0].at[0] + DB[1].at[0]) / 2, (DB[0].at[1] + DB[1].at[1]) / 2);
  function makerAt(beat, t) {
    const p = maker, H = H_MK;
    const stand0 = pz(p, 'stand'), back0 = pz(p, 'stepBack');
    const toReal = headTo(MK.x, MK.z, MK_YAW, RX, RZ);
    const toPrn = headTo(MK.x, MK.z, MK_YAW, PRN.x, PRN.z);
    const A0 = st(MK.x, MK.z, MK_YAW, look(stand0, toReal * 0.7, -0.15));
    // beat 1: looks up at the printer as it wakes, half a pace back as the copies land, then from copy to copy as
    // each one loses its teal (which one is mine?)
    const L1 = st(MK.x, MK.z, MK_YAW, look(stand0, toPrn * 0.8, 0.05));
    const E1 = st(MK.x, MK.z, MK_YAW, look(back0, toReal * 0.6, -0.1));
    const seq = ORDER.map((i) => st(MK.x, MK.z, MK_YAW, look(back0, headTo(MK.x, MK.z, MK_YAW, SLOT[i].x, SLOT[i].z) * 0.85, -0.12)));
    const b1 = (tt) => {
      if (tt < T1.back[0]) return blendTo(A0, L1, ss(tt, T1.look[0], T1.look[1]), H);
      if (tt < T1.plain[0] - 0.25) return blendTo(L1, E1, ss(tt, T1.back[0], T1.back[1]), H);
      let F = E1;
      for (let n = 0; n < seq.length; n++) {
        const t0 = T1.plain[n] - 0.25;
        if (tt < t0) break;
        F = blendTo(F, seq[n], ss(tt, t0, t0 + 0.3), H);
      }
      return F;
    };
    if (beat === 0) return b1(t);
    // beat 2: turns to the two as they cross out its photo
    const E1e = b1(BEATS[0].dur);
    const W2 = st(MK.x, MK.z, MK_YAW, look(stand0, headTo(MK.x, MK.z, MK_YAW, DB[0].at[0], DB[0].at[1]) * 0.7, -0.08));
    if (beat === 1) return blendTo(E1e, W2, ss(t, T2.brand[0], T2.brand[1]), H);
    // beat 3: comes out to them, raises an arm (its words), points at its photo, and in the end lets the arm drop
    const OUT = st(MO.x, MO.z, MO_YAW, look(stand0, 0, -0.05));
    const UP = st(MO.x, MO.z, MO_YAW, look(pz(p, 'raise', { side: 'R' }), 0, 0.02));
    const aim = new V3(RX - MO.x, G0 + SLOT[REAL].y + PIC_Y - gy(MO.x, MO.z), RZ - MO.z).applyAxisAngle(YAX, -MO_YAW).divideScalar(H).sub(new V3(-0.114, 0.78, 0));
    const PT = st(MO.x, MO.z, MO_YAW, pointAt(stand0, aim));
    const DOWN = st(MO.x, MO.z, MO_YAW, look(stand0, 0.15, -0.3));
    const b3 = (tt) => {
      if (tt < T3.up[0]) return walk(p, W2, OUT, tt, T3.out[0], T3.out[1]);
      if (tt < T3.point[0]) return blendTo(OUT, UP, ss(tt, T3.up[0], T3.up[1]), H);
      if (tt < T3.down[0]) return blendTo(UP, PT, ss(tt, T3.point[0], T3.point[1]), H);
      return blendTo(PT, DOWN, ss(tt, T3.down[0], T3.down[1]), H);
    };
    if (beat === 2) return b3(t);
    // beat 4: back to its place; watches the checks arrive.  Beat 5: watches the people who speak for it, then the one
    // who doubted as he goes up to the photo, and at the end turns to the reader with them
    const HOME = st(MK.x, MK.z, MK_YAW, look(stand0, headTo(MK.x, MK.z, MK_YAW, RX, RZ + 4) * 0.7, -0.15));
    if (beat === 3) return walk(p, b3(BEATS[2].dur), HOME, t, T4.home[0], T4.home[1]);
    const W5 = st(MK.x, MK.z, MK_YAW, look(stand0, headTo(MK.x, MK.z, MK_YAW, VC[0].at[0], VC[0].at[1]) * 0.6, -0.12));
    const W5b = st(MK.x, MK.z, MK_YAW, look(stand0, headTo(MK.x, MK.z, MK_YAW, PULL.x, PULL.z) * 0.8, -0.12));
    const W5c = st(MK.x, MK.z, 0.3, look(stand0, 0, -0.04));
    let F = blendTo(HOME, W5, ss(t, 0.4, 0.9), H);
    if (t >= T5.to[0] + 0.5) F = blendTo(W5, W5b, ss(t, T5.to[0] + 0.5, T5.to[0] + 1.0), H);
    if (t >= T5.face2[0]) F = blendTo(W5b, W5c, ss(t, T5.face2[0], T5.face2[1]), H);
    return F;
  }

  // ---- the X: where it sits on the real photo (stand frame), and where it hangs once the checks have loosened it
  const X_ON = new V3(0, PIC_Y, PH.t / 2 + 0.28).applyAxisAngle(XAX, -PH.lean).add(new V3(SLOT[REAL].x, SLOT[REAL].y, SLOT[REAL].z));
  // loosened, it tips forward off the picture about its foot (which stays clear of the cards on the margin): each check
  // knocks it further, the third also turns it crooked
  const X_PIV = new V3(0, -0.8, 0);
  const X_LOOSE = { rx: 0.62, rz: 0.17, out: 0.12 };
  /** the X's place and turn (stand frame) on the photo turned back by `rock`, tipped by k (0 … 1), crooked by c (0 … 1),
   *  swinging by sw */
  const xOnPhoto = (rock, k, sw = 0, cr = k) => {
    const q0 = new Q().setFromAxisAngle(XAX, -PH.lean + rock);
    const R = new Q().setFromAxisAngle(ZAX, X_LOOSE.rz * cr).multiply(new Q().setFromAxisAngle(XAX, X_LOOSE.rx * k + sw));
    const c = X_ON.clone().sub(restOf(REAL)).applyAxisAngle(XAX, rock).add(restOf(REAL));
    const d = X_PIV.clone().sub(X_PIV.clone().applyQuaternion(R)).add(new V3(0, 0, X_LOOSE.out * k)).applyQuaternion(q0);
    return { p: c.add(d), q: q0.multiply(R) };
  };
  const restOf = (i) => new V3(SLOT[i].x, SLOT[i].y, SLOT[i].z);
  const { p: X_L, q: X_LQ } = xOnPhoto(0, 1);
  // the place on it the one who doubted takes hold of (its lower right arm), in the district frame
  const X_GRIP = new V3(0.6, -0.55, 0.2).applyQuaternion(X_LQ).add(X_L).add(new V3(0, G0, 0));

  // ---- the two who doubt
  /** where the first walks off to in beat 3: away from the brand's words, its back to them */
  function awayOf(j) {
    const [ax, az] = DB[j].at;
    const yaw = yawTo(ax, az, MO.x, MO.z) + Math.PI + (j === 0 ? 0.25 : -0.15);
    return { yaw, x: ax + Math.sin(yaw) * AWAY_D, z: az + Math.cos(yaw) * AWAY_D };
  }
  function doubterAt(j, beat, t) {
    const p = dbs[j], H = H_D, S = DB[j];
    const [fx, fz] = S.from, [ax, az] = S.at;
    const stand0 = pz(p, 'stand');
    const face = yawTo(ax, az, RX, RZ);
    const F0 = st(fx, fz, yawTo(fx, fz, ax, az), p.pose('walk', { dist: 0, stride: STRIDE(H) }));
    if (beat === 0) return F0;
    const AT = st(ax, az, face, look(stand0, 0, -0.12));
    // beat 2: the first walks up, points at the real photo (and throws); the second comes up later, points at it too
    // and turns to the first with a nod; the first folds his arms
    const aim = new V3(RX - ax, G0 + SLOT[REAL].y + PIC_Y - gy(ax, az), RZ - az).applyAxisAngle(YAX, -face).divideScalar(H).sub(new V3(-0.114, 0.78, 0));
    const PT = st(ax, az, face, pointAt(stand0, aim));
    const toOther = headTo(ax, az, face, DB[1 - j].at[0], DB[1 - j].at[1]);
    const NOD = st(ax, az, face, look(pointAt(stand0, aim), toOther * 0.75, 0.14));
    const CROSS = st(ax, az, face, look(crossArms(stand0), toOther * 0.5, -0.05));
    const b2 = (tt) => {
      const [w0, w1] = T2.walk[j];
      if (tt < w1) return walk(p, F0, AT, tt, w0, w1, true);
      if (j === 0) {
        if (tt < T2.cross[0]) return blendTo(AT, PT, seg(tt, T2.point[0], T2.point[1]), H);
        return blendTo(PT, CROSS, ss(tt, T2.cross[0], T2.cross[1]), H);
      }
      if (tt < T2.nod[0]) return blendTo(AT, PT, ss(tt, T2.point2[0], T2.point2[1]), H);
      return blendTo(PT, NOD, ss(tt, T2.nod[0], T2.nod[1]), H);
    };
    if (beat === 1) return b2(t);
    const E2 = b2(BEATS[1].dur);
    // beat 3: they look round at the brand as it comes out; as it speaks they turn their backs on it: the second walks
    // off for good, the first a few steps, and folds his arms - its words reach nobody
    const LOOK = st(ax, az, face, look(j === 0 ? crossArms(stand0) : stand0, headTo(ax, az, face, MO.x, MO.z) * 0.9, -0.05));
    if (j === 1) {
      const OFF = st(GONE2.x, GONE2.z, yawTo(ax, az, GONE2.x, GONE2.z), p.pose('walk', { dist: 0, stride: STRIDE(H) }));
      if (beat > 2) return OFF;
      if (t < T3.gone[0]) return blendTo(E2, LOOK, ss(t, T3.look[0], T3.look[1]), H);
      return walk(p, LOOK, OFF, t, T3.gone[0], T3.gone[1]);
    }
    const { yaw: awayYaw, x: ox, z: oz } = awayOf(0);
    const GONE = st(ox, oz, awayYaw, look(stand0, 0, -0.08));
    const SULK = st(ox, oz, awayYaw, look(crossArms(stand0), 0, -0.1));
    const b3 = (tt) => {
      if (tt < T3.away[0]) return blendTo(E2, LOOK, ss(tt, T3.look[0], T3.look[1]), H);
      if (tt < T3.away[1]) return walk(p, LOOK, GONE, tt, T3.away[0], T3.away[1]);
      return blendTo(GONE, SULK, ss(tt, T3.cross[0], T3.cross[1]), H);
    };
    if (beat === 2) return b3(t);
    const E3 = b3(BEATS[2].dur);
    // beat 4: he stays where he walked off to, but turns round to watch the checks come in
    const bx = ox, bz = oz, bf = yawTo(bx, bz, RX, RZ);
    const WATCH = st(bx, bz, bf, look(crossArms(stand0), 0, -0.14));
    if (beat === 3) return blendTo(E3, WATCH, ss(t, T4.watch[0], T4.watch[1]), H);
    // beat 5: he listens to the two who were there, walks up to the photo, takes hold of his X and pulls it off (half
    // a pace back), and walks back to stand with them, facing the reader
    const toV = headTo(bx, bz, bf, VC[0].at[0], VC[0].at[1]);
    const LISTEN = st(bx, bz, bf, look(stand0, toV * 0.8, -0.05));
    const yP = yawTo(PULL.x, PULL.z, X_GRIP.x, X_GRIP.z);
    const pg = gy(PULL.x, PULL.z);
    const AT_P = st(PULL.x, PULL.z, yP, look(stand0, 0, 0.2));
    const GRAB = st(PULL.x, PULL.z, yP, pz(p, 'stamp', { y: X_GRIP.y - pg, fwd: Math.hypot(X_GRIP.x - PULL.x, X_GRIP.z - PULL.z), x: 0 }));
    const PULLED = st(PULL.x, PULL.z, yP, look(pz(p, 'stepBack'), 0, 0.1));
    const END = st(CONV.x, CONV.z, 0.1, look(stand0, 0, -0.02));
    const ENDUP = st(CONV.x, CONV.z, 0.1, look(pz(p, 'raise', { side: 'L' }), 0, 0.05));
    // the throw's follow-through: the right arm out toward where the X goes (down past the reader, on his right)
    const THROW = st(CONV.x, CONV.z, 0.1, pointAt(stand0, new V3(-0.45, -0.35, 1)));
    if (t < T5.to[0]) return blendTo(WATCH, LISTEN, ss(t, 0.3, 0.75), H);
    if (t < T5.to[1]) return walk(p, LISTEN, AT_P, t, T5.to[0], T5.to[1]);
    if (t < T5.pull[0]) return blendTo(AT_P, GRAB, ss(t, T5.grab[0], T5.grab[1]), H);
    if (t < T5.back[0]) return blendTo(GRAB, PULLED, ss(t, T5.pull[0], T5.pull[1]), H);
    if (t < T5.back[1]) return walk(p, PULLED, END, t, T5.back[0], T5.back[1]);
    if (t < T5.face[0]) return blendTo(END, THROW, ss(t, T5.throw[0], T5.throw[1]), H);
    return blendTo(THROW, ENDUP, ss(t, T5.face[0], T5.face[1]), H);
  }

  // ---- the three who check: in from far off on their own side with a check card, the card up, stuck on the photo's
  // margin, and away again the way they came
  function sourceAt(j, beat, t) {
    const p = srcs[j], H = H_S, S = SRC[j];
    const [fx, fz] = S.from, [ax, az] = S.at;
    const face = yawTo(ax, az, RX, RZ);
    const F0 = st(fx, fz, yawTo(fx, fz, ax, az), cardHeld(p.pose('walk', { dist: 0, stride: STRIDE(H) })));
    if (beat !== 3) return F0;
    const AT = st(ax, az, face, cardHeld(look(pz(p, 'stand'), 0, -0.15)));
    const UP = st(ax, az, face, look(pz(p, 'raise', { side: 'R' }), 0, 0.0));
    const DONE = st(ax, az, face, look(pz(p, 'stand'), 0, -0.2));
    const [w0, w1] = S.w;
    if (t < w1) return walk(p, F0, AT, t, w0, w1, true, cardHeld);
    if (t < w1 + T4.toss) return blendTo(AT, UP, seg(t, w1, w1 + T4.raise + 0.06), H);
    const o0 = T4.out + j * 0.15;
    if (t < o0) return blendTo(UP, DONE, seg(t, w1 + T4.toss, w1 + T4.toss + 0.4), H);
    const OUT = st(fx, fz, yawTo(ax, az, fx, fz), p.pose('walk', { dist: 0, stride: STRIDE(H) }));
    return walk(p, DONE, OUT, t, o0, o0 + T4.outDur);
  }

  // ---- the two who were there: in from the sides, an arm up as they speak; they watch the one who doubted go up to
  // the photo, and turn to the reader with him at the end
  function voucherAt(j, beat, t) {
    const p = vs[j], H = H_V, S = VC[j];
    const [fx, fz] = S.from, [ax, az] = S.at;
    const F0 = st(fx, fz, yawTo(fx, fz, ax, az), p.pose('walk', { dist: 0, stride: STRIDE(H) }));
    if (beat < 4) return F0;
    const a0 = awayOf(0);
    const face = yawTo(ax, az, a0.x, a0.z);
    const AT = st(ax, az, face, look(pz(p, 'stand'), 0, -0.05));
    // facing the reader, the figure's left hand is on the screen's right: the outer hand goes up
    const side = ax < 0 ? 'R' : 'L';
    const UP = st(ax, az, face, look(pz(p, 'raise', { side }), 0, 0.06));
    const SEE = st(ax, az, face, look(pz(p, 'stand'), headTo(ax, az, face, PULL.x, PULL.z) * 0.9, -0.1));
    const OUTUP = st(ax, az, j ? -0.12 : 0.12, look(pz(p, 'raise', { side }), 0, 0.04));
    const [w0, w1] = S.w;
    if (t < w1) return walk(p, F0, AT, t, w0, w1, true);
    if (t < T5.to[0] + 0.3) return blendTo(AT, UP, seg(t, w1 + 0.02, w1 + 0.3), H);
    if (t < T5.face2[0] + j * 0.12) return blendTo(UP, SEE, ss(t, T5.to[0] + 0.3 + j * 0.15, T5.to[0] + 0.85 + j * 0.15), H);
    return blendTo(SEE, OUTUP, ss(t, T5.face2[0] + j * 0.12, T5.face2[1] + j * 0.12), H);
  }

  // =================================================================== the pose
  const S_ = { beat: LAST, t: BEATS[LAST].dur, emph: null, lime: true, aiOn: false, teal: [false, false, false, false, false], dbIn: true, srcStand: false, vcIn: [true, true], heapOn: true };
  const _p = new V3(), _q = new Q();
  const _gInv = new M4();

  function placePerson(p, F) {
    p.apply(F.v);
    p.group.position.set(F.x, gy(F.x, F.z), F.z);
    p.group.rotation.set(0, F.yaw, 0);
  }
  // the copies' flight: out of the slot lying flat (as paper leaves a printer), up and over to the left, standing up
  // as they come down on their places: the nearest first, the farthest last
  const ORDER = [2, 4, 3, 0];                          // front right, back right, back left, front left
  const emitOf = new Map(ORDER.map((i, n) => [i, T1.emit[n]]));
  const plainOf = new Map(ORDER.map((i, n) => [i, T1.plain[n]]));
  const mouth = new V3(SLOT_MOUTH.x, SLOT_MOUTH.y - G0, SLOT_MOUTH.z);   // in the stand's frame
  const handLocal = (p, side) => {
    const h = p.hand(side);
    h.updateWorldMatrix(true, false);
    return new V3().setFromMatrixPosition(h.matrixWorld).applyMatrix4(_gInv);
  };
  // where the thrown X goes (stand frame): out of the picture, past the reader
  const X_FAR = new V3(FLING.x, gy(CONV.x, CONV.z) - G0 + 1.0, FLING.z);
  const _qa = new Q(), _qb = new Q(), _e = new THREE.Euler();

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const t = k * BEATS[beat].dur;

    // ---- the printer at work: beat 1 (the four copies) and beat 4 (the heap)
    const working = (beat === 0 && t > T1.shake[0] && t < T1.shake[1]) || (beat === 3 && t > T4.work[0] && t < T4.work[1]);
    const sh = !working ? 0 : beat === 0 ? Math.sin(Math.PI * seg(t, T1.shake[0], T1.shake[1])) : Math.min(1, seg(t, T4.work[0], T4.work[0] + 0.2), seg(T4.work[1] - t, 0, 0.2)) * 0.8;
    printer.group.position.set(PRN.x + Math.sin(t * 71) * 0.05 * sh, prY + Math.abs(Math.sin(t * 53)) * 0.05 * sh, PRN.z + Math.sin(t * 61 + 1) * 0.05 * sh);
    S_.aiOn = working;
    // the real photo rocks back when the X hits it (beat 2)
    const ru = beat === 1 ? seg(t, T2.rock[0], T2.rock[1]) : 0;
    const rock = ru > 0 && ru < 1 ? -0.2 * Math.exp(-3 * ru) * Math.sin(Math.PI * 3 * ru) * (1 - ru) : 0;
    for (let i = 0; i < SLOT.length; i++) {
      const pr = prints[i];
      if (i === REAL) {
        pr.group.position.copy(restOf(i)); pr.group.quaternion.setFromAxisAngle(XAX, rock); pr.group.scale.setScalar(1);
        pr.group.visible = true; S_.teal[i] = false; continue;
      }
      const te = emitOf.get(i), tl = te + T1.fly;
      const u = beat === 0 ? seg(t, te, tl) : 1;
      pr.group.visible = beat > 0 || t >= te;
      // teal while it is being made, plain once it has settled: from then on nothing tells it from the real one
      S_.teal[i] = beat === 0 && t >= te && t < plainOf.get(i);
      if (!pr.group.visible) continue;
      const e = sm(u);
      const to = restOf(i);
      _p.copy(mouth).lerp(to, e);
      _p.y += Math.sin(Math.PI * u) * (3.0 + (i % 2) * 0.6);
      pr.group.position.copy(_p);
      // flat -> standing (the print turns about its bottom edge), with a turn about y on the way
      _q.setFromAxisAngle(XAX, (Math.PI / 2) * (1 - e)).premultiply(new Q().setFromAxisAngle(YAX, Math.sin(Math.PI * u) * (i % 2 ? 0.5 : -0.5)));
      pr.group.quaternion.copy(_q);
      // a small squash as it lands
      const sq = beat === 0 ? Math.sin(Math.PI * seg(t, tl, tl + 0.14)) * 0.1 : 0;
      pr.group.scale.set(1 + sq * 0.5, 1 - sq, 1);
    }
    // ---- the heap: each copy out of the slot, over, and down flat onto the ground in front of the printer
    S_.heapOn = beat > 3 || (beat === 3 && t >= HEAP_T[0]);
    heap.forEach((s, i) => {
      const t0 = HEAP_T[i], t1 = t0 + HEAP_FLY;
      const on = beat > 3 || (beat === 3 && t >= t0);
      s.group.visible = on;
      if (!on) return;
      const u = beat === 3 ? seg(t, t0, t1) : 1, e = sm(u), R = s.rest;
      s.group.position.set(lerp(SLOT_MOUTH.x, R.x, e), lerp(SLOT_MOUTH.y, R.y, e) + Math.sin(Math.PI * u) * s.arc, lerp(SLOT_MOUTH.z, R.z, e));
      s.group.rotation.set(0, R.yaw + (1 - e) * s.spin, 0);
    });

    // ---- the people
    placePerson(maker, makerAt(beat, t));
    passers.visible = beat >= 1;
    dbs.forEach((p, j) => placePerson(p, doubterAt(j, beat, t)));
    // the second comes up later in beat 2 and is gone for good once he has walked off in beat 3
    dbs[1].group.visible = (beat === 1 && t >= T2.walk[1][0]) || (beat === 2 && t < T3.gone[1] - 0.15);
    team.visible = beat === 3;
    srcs.forEach((p, j) => {
      placePerson(p, sourceAt(j, beat, t));
      // gone once it is well out of the shot again
      p.group.visible = beat === 3 && t >= SRC[j].w[0] && t < T4.out + j * 0.15 + T4.outDur * 0.92;
    });
    crowd.visible = beat >= 4;
    vs.forEach((p, j) => placePerson(p, voucherAt(j, beat, t)));
    g.updateMatrixWorld(true);
    _gInv.copy(g.matrixWorld).invert();

    // ---- the red X: thrown from the first doubter's raised hand onto the real photo (beat 2), jolted by each check and
    // knocked loose by the third (beat 4), pulled off by the same hand and dropped (beat 5)
    const xIn = beat === 1 ? seg(t, T2.x[0], T2.x[1]) : beat > 1 ? 1 : 0;
    X.group.visible = xIn > 0 && !(beat === 4 && t >= T5.fly[1]);
    if (X.group.visible) {
      const hand = () => { const h = handLocal(dbs[0], 'R'); h.y -= G0; return h; };
      // on the photo (it follows the photo as it rocks)
      const on = xOnPhoto(rock, 0).p;
      // each check knocks it a little further off the picture (a quarter, a quarter, then the rest, crooked); loose,
      // it rocks on its foot a while
      const kn = (j) => (beat === 3 ? ss(t, LAND4[j], LAND4[j] + 0.22) : beat > 3 ? 1 : 0);
      const loose = 0.25 * kn(0) + 0.25 * kn(1) + 0.5 * kn(2);
      const ts = beat === 3 ? t - LAND4[2] - 0.22 : 99;
      const sway = ts > 0 ? 0.1 * Math.exp(-1.6 * ts) * Math.sin(2 * Math.PI * 1.3 * ts) : 0;
      const L = xOnPhoto(rock, loose, sway, kn(2));
      const cl = L.p.clone();
      const grabbed = beat === 4 && t >= T5.pull[0];
      if (xIn < 1) {
        // in flight: from the hand, up and over, spinning, growing to its size
        const h = hand(), e = sm(xIn);
        X.group.position.copy(h).lerp(on, e);
        X.group.position.y += Math.sin(Math.PI * xIn) * 1.6;
        X.group.rotation.set((-PH.lean + rock) * e, 0, (1 - e) * Math.PI * 1.5);
        X.group.scale.setScalar(Math.max(1e-3, 0.45 + 0.55 * e));
      } else if (grabbed) {
        // in his hand: pulled off the photo and brought down to his side (the hand holds its lower right arm); at the
        // end he throws it away, out of the picture
        const h = hand();
        const yaw = dbs[0].group.rotation.y;
        const hang = new V3(-0.3, -0.7, 0.3).applyAxisAngle(YAX, yaw);
        const pe = sm(seg(t, T5.pull[0], T5.pull[1]));
        const held = cl.clone().lerp(h.clone().add(hang), pe);
        _qa.copy(X_LQ);
        _qb.setFromEuler(_e.set(0.1, yaw, 0.12));
        const hq = _qa.clone().slerp(_qb, pe);
        const du = seg(t, T5.fly[0], T5.fly[1]), de = du * (2 - du);
        X.group.position.copy(held).lerp(X_FAR, de);
        X.group.position.y += Math.sin(Math.PI * du) * 2.2;
        X.group.quaternion.copy(hq.multiply(_qb.setFromAxisAngle(ZAX, -du * Math.PI * 3)));
        X.group.scale.setScalar(1);
      } else {
        // on the photo: it lands with a slam; loose in beat 4
        const sl = beat === 1 ? seg(t, T2.x[1], T2.x[1] + T2.slam) : 1;
        const slam = 1 + 0.3 * Math.sin(Math.PI * sl);
        X.group.position.copy(cl);
        X.group.quaternion.copy(L.q);
        X.group.scale.setScalar(slam);
      }
    }

    // ---- the trails: each dash shows once its walker has passed it (beat 4 only)
    trails.visible = beat === 3;
    SRC.forEach((s, j) => {
      const [fx, fz] = s.from, [ax, az] = s.at;
      const u = beat !== 3 ? 0 : walked({ x: fx, z: fz }, { x: ax, z: az }, t, s.w[0], s.w[1], true);
      const d = u * trailDash[j].L;
      for (const { m, d: dd } of trailDash[j].list) m.visible = dd < d;
    });

    // ---- the check cards: in the sources' hands, held up, tossed, then stuck on the margin at the size they came in
    cards.forEach((c, j) => {
      const tl = LAND4[j];
      const onPlate = beat > 3 || (beat === 3 && t >= tl);
      c.visible = beat > 3 || (beat === 3 && t >= SRC[j].w[0]);
      if (!c.visible) return;
      const slot = new V3(CARD_X[j], MARGIN_Y, PH.t / 2 + 0.05 + 0.03 * j).applyAxisAngle(XAX, -PH.lean).add(restOf(REAL)).add(new V3(0, G0, 0));
      if (onPlate) {
        // a little press as it sticks
        const pr = beat === 3 ? Math.sin(Math.PI * seg(t, tl, tl + 0.16)) * 0.12 : 0;
        c.position.copy(slot); c.rotation.set(-PH.lean, 0, CARD_RZ[j]); c.scale.setScalar(1 + pr);
        return;
      }
      const h = handLocal(srcs[j], 'R');
      h.y += CARD * 0.42;
      const t0 = SRC[j].w[1] + T4.toss;
      if (t < t0) {
        // in hand: the card faces the way its holder faces; held up, it faces the photo and the reader
        c.position.copy(h);
        c.position.y += CARD * 0.2;
        c.rotation.set(0, srcs[j].group.rotation.y, 0);
        c.scale.setScalar(1);
        return;
      }
      const u = seg(t, t0, tl), e = sm(u);
      c.position.copy(h).lerp(slot, e);
      c.position.y += Math.sin(Math.PI * u) * 1.6;
      c.rotation.set(-PH.lean * e, lerp(srcs[j].group.rotation.y, 0, e), lerp(Math.sin(Math.PI * u) * 1.2 * (j - 1 || 1), CARD_RZ[j], e));
      c.scale.setScalar(1);
    });
    // lime once the one who doubted has pulled the X off
    S_.lime = beat === 4 && t >= T5.lime;

    hits.maker.userData.place();
    hits.passers.userData.place();
    hits.sources.userData.place();
    hits.vouchers.userData.place();
    hits.copy.userData.place();
    pickable(hits.passers, beat >= 1);
    pickable(hits.sources, beat >= 3);
    pickable(hits.vouchers, beat >= 4);
    pickable(hits.copy, beat > 0 || t > T1.emit[1]);

    // ---- bubbles
    const headOf = (p) => g.worldToLocal(p.top());
    /** a bubble over a speaker's head, its tail to the mouth: in at once at its full size (with its words) at t0, gone
     *  at once at outT */
    const over = (b, p, dx, on, t0, outT = null, dy = 0) => {
      const shown = on && t >= t0 && !(outT !== null && t >= outT);
      const kk = shown ? 0.88 + 0.12 * pop(seg(t, t0, t0 + 0.16)) : 0;
      b.k = shown ? 1 : 0;
      const hd = headOf(p);
      const tip = b.bub.tipLocal;
      b.bub.group.position.set(hd.x - tip.x + dx, hd.y + 0.3 + dy - tip.y, hd.z + 0.2);
      b.bub.group.rotation.set(0, 0, 0);
      b.bub.group.scale.setScalar(Math.max(1e-3, kk));
      b.bub.group.visible = shown;
    };
    over(BUB.doubt, dbs[0], -0.3, beat === 1, T2.bub);
    over(BUB.claim, maker, 0.3, beat === 2, T3.bub, null, -0.35);
    VC.forEach((v, j) => over(BUB[`voucher-${j + 1}`], vs[j], v.at[0] < 0 ? -0.25 : 0.25, beat === 4, v.w[1] + T5.bub, null, VDY));
    over(BUB.convert, dbs[0], BUB.convert.dx, beat === 4, T5.convert, null, BUB.convert.dy);

    // who has arrived (their labels and hotspots wait for them, so nothing points off the frame at an empty place)
    S_.dbIn = beat > 1 || (beat === 1 && t >= T2.walk[0][1]);
    S_.srcStand = beat === 3 && t >= SRC[2].w[1] && t < T4.out + 0.3;
    S_.vcIn = VC.map((v) => beat > 4 || (beat === 4 && t >= v.w[1]));
    Object.assign(S_, { beat, t });
    applyEmphasis();
    return api;
  }

  // =================================================================== emphasis by subtraction
  function setDim(obj, k) {
    dim(obj, k);
    obj.traverse((o) => { if (o.isMesh && !o.userData.hitProxy) o.castShadow = k < 0.5 ? !!o.userData.cast0 : false; });
  }
  function applyEmphasis() {
    const E = S_.emph;                       // null: the map (everything in plain ink); a Set: those parts full
    const map = E === null;
    const full = (id) => map || E.has(id);
    setDim(stand, full('real') || full('copy') ? 0 : 1);
    setDim(realP.group, full('real') ? 0 : 1);
    setDim(copyGrp, full('copy') ? 0 : 1);
    setDim(ai, full('copy') ? 0 : 1);
    // the copies' pictures never fade: a copy always looks exactly like the photo, whatever else is dimmed (a light
    // dim keeps the solid ink of the strokes: the accent only goes off above 0.5)
    for (const i of COPIES) dim(prints[i].ln, full('copy') ? 0 : 0.12);
    dim(heap[0].group, full('copy') ? 0 : 0.12);     // (the heap's prints share their materials)
    setDim(X.group, full('real') || full('passers') ? 0 : 1);
    for (const c of cards) setDim(c, full('sources') || full('real') ? 0 : 1);
    setDim(trails, full('sources') ? 0 : 0.7);
    setDim(maker.group, full('maker') ? 0 : 1);
    setDim(passers, full('passers') ? 0 : 1);
    setDim(team, full('sources') ? 0 : 1);
    setDim(crowd, full('vouchers') ? 0 : 1);
    setDim(BUB.claim.bub.group, full('maker') ? 0 : 1);
    // lime on the photo once the doubter takes the ✕ back (only in focus: on the map the result rests in plain ink)
    realP.body.material.userData.u.uAccent.value = !map && S_.lime && full('real') ? ACCENT.lime : 0;
    // the AI and each copy are teal only while it is being made, plain afterwards: the copies look just like the photo
    for (const i of COPIES) prints[i].body.material.userData.u.uAccent.value = !map && S_.teal[i] && full('copy') ? ACCENT.teal : 0;
    P.accent(printer.body, !map && S_.aiOn && full('copy') ? 'teal' : 'none');
    P.accent(printer.slotMesh, !map && S_.aiOn && full('copy') ? 'teal' : 'none');
  }
  function emphasize(ids) {
    S_.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }

  // =================================================================== anchors: labels, words, hotspots, framing
  g.updateMatrixWorld(true);
  const onPrint = (i) => (x, y, z = PH.t / 2 + 0.05) => {
    const pr = prints[i].group;
    pr.updateWorldMatrix(true, false);
    return pr.localToWorld(new V3(x, y, z).applyAxisAngle(XAX, -PH.lean));
  };
  const onReal = onPrint(REAL), onCopy = onPrint(0);
  const bubAt = (id, needEmph = true) => () => {
    const b = BUB[id];
    if (!(b.k > 0.6) || !b.bub.group.visible || (needEmph && S_.emph === null)) return null;
    b.bub.group.updateWorldMatrix(true, false);
    return b.bub.group.localToWorld(new V3(0, 0.02, 0.2));
  };
  const parts = {
    // the ring on the print's top corner, clear of the label under it
    real: { hit: hits.real, anchor: () => onReal(PH.pic / 2 - 0.3, PIC_Y + PH.pic / 2 - 0.3), beat: 1 },
    copy: { hit: hits.copy, anchor: () => onCopy(-PH.w / 2 + 0.45, PIC_Y + PH.pic / 2 - 0.3), beat: 0 },
    maker: { hit: hits.maker, anchor: () => maker.chest(), beat: 2 },
    passers: { hit: hits.passers, anchor: () => (S_.dbIn ? dbs[0].chest() : null), beat: 1 },
    // on the plate of checks (the sources come and go; the plate stays in the shot)
    sources: { hit: hits.sources, anchor: () => W(CARD_X[2] + 0.2, G0 + STD.h0 * 0.45, FRONT + 0.05), beat: 3 },
    vouchers: { hit: hits.vouchers, anchor: () => (S_.vcIn[1] ? vs[1].chest() : null), beat: 4 },
  };
  const labelAt = {
    // under each print, on the stand's front face: the word sits on that print's own margin, never on another photo
    real: () => W(SLOT[REAL].x + 0.15, G0 + STD.h0 * 0.5, FRONT + 0.03),
    copy: () => W(SLOT[0].x - 0.15, G0 + STD.h0 * 0.5, FRONT + 0.03),
    maker: () => maker.top(),
    sources: () => (S_.srcStand ? srcs[2].top() : null),
  };
  const decalAt = {
    ai: () => printer.group.localToWorld(new V3(PRN.w * 0.08, PRN.h + 0.04, 0)),
    doubt: bubAt('doubt'),
    claim: bubAt('claim'),
    'voucher-1': bubAt('voucher-1'),
    'voucher-2': bubAt('voucher-2'),
    convert: bubAt('convert'),
  };
  // the surfaces the words sit on (world units): the bubbles' insides, the printer's face
  const decalSize = { ai: [PRN.d * 0.6, PRN.w * 0.5] };
  for (const [id, b] of Object.entries(BUB)) decalSize[id] = [b.w * 0.9, BH * 0.72];

  // ---- the shot: fixed points, so the framing never depends on where the motion happens to be
  const corners = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [z0, z1].map((z) => W(x, y, z))));
  /** the top corners of a bubble over a speaker standing at [x, z] (as over() places it: its tail tip dx beside the head) */
  const bubbleBox = (id, [x, z], H, dx, dy = 0) => {
    const b = BUB[id], tip = b.bub.tipLocal, cx = x + dx - tip.x, top = gy(x, z) + H + 0.35 + dy - tip.y + BH / 2;
    return [W(cx - b.w / 2, top, z + 0.2), W(cx + b.w / 2, top, z + 0.2)];
  };
  const PRINTER = () => [
    // (as wide as its hit box)
    ...corners(PRN.x - PRN.d / 2 - 0.15, PRN.x + PRN.d / 2 + 0.15, prY, prY + PRN.h * 1.08, PRN.z - PRN.w / 2 - 0.15, PRN.z + PRN.w / 2 + 0.15),
  ];
  // the heap in front of it (beat 4 on)
  const HEAPPTS = () => corners(HEAP_BOX.x0, HEAP_BOX.x1, HEAP_BOX.y0 - 0.1, HEAP_BOX.y0 + 0.9, HEAP_BOX.z0, HEAP_BOX.z1);
  const STAND = () => [
    // the stand and the photos on it (the back step's prints are the highest)
    ...corners(-STD.w0 / 2, STD.w0 / 2, G0, G0, STD.z1 - STD.d1 / 2, FRONT),
    W(-1.4 - PH.w / 2, G0 + STD.h1 + PH.h + 0.2, STD.z1), W(1.4 + PH.w / 2, G0 + STD.h1 + PH.h + 0.2, STD.z1),
    // the brand
    W(MK.x - 1.35, gy(MK.x, MK.z), MK.z + 0.6), W(MK.x - 1.25, gy(MK.x, MK.z) + H_MK + 0.3, MK.z),
  ];
  const FRONTS = () => [
    // the two who doubt, the places of the sources and of the people who speak (with their words)
    ...DB.map(({ at: [x, z] }) => W(x, gy(x, z) - 0.1, z + 0.9)),
    ...DB.map((_, j) => { const a = awayOf(j); return W(a.x + Math.sign(a.x) * 1.2, gy(a.x, a.z) - 0.2, a.z + 1.3); }),
    ...SRC.map((v) => W(v.at[0] + Math.sign(v.at[0]) * 0.9, gy(v.at[0], v.at[1]), v.at[1])),
    ...bubbleBox('voucher-1', VC[0].at, H_V, -0.25, VDY), ...bubbleBox('voucher-2', VC[1].at, H_V, 0.25, VDY),
    // the two who were there, as wide and as low as their hit boxes
    ...VC.map(({ at: [x, z] }) => W(x + Math.sign(x) * 1.25, gy(x, z) - 0.3, z + 1.05)),
    ...bubbleBox('doubt', DB[0].at, H_D, -0.3), ...bubbleBox('convert', [CONV.x, CONV.z], H_D, BUB.convert.dx, BUB.convert.dy),
    // where the one who doubted pulls the X off, and where he ends
    W(PULL.x + 0.8, gy(PULL.x, PULL.z), PULL.z + 0.5), W(CONV.x, gy(CONV.x, CONV.z) - 0.1, CONV.z + 0.8),
    // the brand out in front of the two, with its words (beat 3)
    W(MO.x - 1.2, gy(MO.x, MO.z), MO.z + 0.4), W(MO.x - 1.2, gy(MO.x, MO.z) + H_MK, MO.z), ...bubbleBox('claim', [MO.x, MO.z], H_MK, 0.3, -0.35),
  ];
  // beat 1 on the brand, the stand and the printer (centred: the opening act sits in the middle of the screen); then
  // the stand, the heap and everyone in front of it.  On an upright phone both shots are as wide as the scene, so the
  // second only slides the picture up to make room for the people (ui.fit centres the anchors' projected box).
  const SHOT_PTS = [() => [...PRINTER(), ...STAND()], () => [...STAND(), ...FRONTS(), ...PRINTER(), ...HEAPPTS()]];
  // one height for every screen: high enough that the words over the people in front stay below the photos, and the
  // printer shows beside the back step
  const SHOT = { phone: [0.0, 0.7], land: [0.0, 0.66], land1: 0.76, desk: [0.0, 0.66], desk1: 0.76 };
  const portrait = () => typeof innerWidth !== 'number' || innerHeight >= innerWidth;
  const shots = {
    phone: SHOT_PTS.map((pts, i) => ({ get az() { return VIEW_AZ + (portrait() ? SHOT.phone[0] : SHOT.land[0]); }, get el() { return portrait() ? SHOT.phone[1] : i ? SHOT.land1 : SHOT.land[1]; }, get margin() { return 0.045; }, anchors: () => pts() })),
    desk: SHOT_PTS.map((pts, i) => ({ az: VIEW_AZ + SHOT.desk[0], el: i ? SHOT.desk1 : SHOT.desk[1], anchors: () => pts() })),
  };

  function rest() { return pose(LAST, 1); }
  function ambient() { /* nothing moves by itself: the held result stays still */ }

  const api = {
    id: 'trust',
    group: g,
    zone: 'consumer',
    anchor: W(0, G0 + STD.h1 + PH.h + 1.6, STD.z1),
    pin: W(0, G0 + STD.h0 + PH.h, SLOT[REAL].z),
    // accents at full strength round the stand, the printer and the people in front of it
    focus: { pos: W(0, 3, 2), r: 18 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalSize,
    decalUnit: Object.fromEntries([...Object.keys(BUB).map((k) => [k, 0.95]), ['ai', 0.8]]),
    lever: null,
    mainActor: 'maker',
    restParts: REST_PARTS,
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { SLOT, DB, SRC, VC, BUB, gy, SHOT, maker: maker.group, passers: dbs.map((p) => p.group), sources: srcs.map((p) => p.group), vouchers: vs.map((p) => p.group), prints: prints.map((p) => p.group), printer: printer.group, heap: heapGrp, X: X.group, cards, stand, HEAP_BOX },
  };
  rest();
  emphasize(null);
  return api;
}
