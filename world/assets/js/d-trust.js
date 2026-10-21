// 品牌怎麼被相信 · trust (articles 6, 3) — in the heartland (TH 300°, r 28), told in five beats on a balance.
// A brand's ad stands as a billboard on the left pan of a big balance, its maker (the brand, with a camera on a
// tripod) beside it; the right pan is empty, so the balance leans to the left.
//  1  AI reads the ad (a teal scan climbs it) and in about a second a stream of typed cells builds the same billboard
//     on the right pan: as the copy fills in, the right pan comes down and the balance swings level — the copy weighs
//     just what the original does (06 b20).  The brand turns to it and steps back.
//  2  Two passers-by come up to look.  One points at the copy: 「這張是真的」; the other points at the real ad:
//     「一定是 AI！」, and a ？ lands over the real billboard (06 b21; 03 b3).  The balance does not move: looking adds
//     nothing.  The brand opens both hands.
//  3  The passers-by step aside.  Three sources come in from three sides (left, front, right), one after another, each
//     carrying a ✓ weight (來源 1 · 2 · 3), set it on a stack on the real ad's pan and go back the way they came; with
//     each the balance tips a notch toward the ad.  With the third the ？ drops off and the ad turns lime; over the
//     copy a ？ appears: no source vouches for it (06 b14, b20).  The camera comes closer for this and for beat 4.
//  4  The brand raises an arm and throws its own words onto its pan — 「這不是 AI！」, 「真的是我們拍的」 — and each
//     bubble bounces off and pops: the needle only trembles (06 b39, b24).
//  5  Three people walk up and step onto the real ad's pan, one after another, each speaking for it in turn; with each
//     the pan goes down, until the balance rests on its stop and the copy hangs high and alone (06 b39, b31).
// Everything the reader sees is a pure function of (beat, k): pose().  No copy lives here: captions, labels, the
// words in the bubbles and on the sources and the tap lines come from world.json by part id.
// Local frame: +z points at the camera (across the ring), +x is the camera's right; y = 0 is the ground at the
// district's centre.  The real ad is on the left (read first), the copy on the right.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp } from './kit.js';
import { heightAt } from './terrain.js';
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
const boxAt = (w, h, d, x, y, z) => strip(new THREE.BoxGeometry(w, h, d).translate(x, y, z));

// ------------------------------------------------------------------ the set (local units)
const TH = 300, RR = 28;
// the camera's side (world azimuth): across the ring, about a quarter turn from the old view.  Seen from the sea side
// (the old view) the twins' hall at the centre filled the background; from here the boards stand against open ground
const VIEW_AZ = (TH * Math.PI) / 180 + 1.4;
const YAW = Math.PI / 2 - VIEW_AZ;                    // group turn: local +z → the camera
// the balance: a column with a beam pivoting on it, a pan (platform) on a short post at each end that stays level
const BAL = { L: 4.4, PY: 1.05, beamT: 0.34, beamD: 0.44, beamZ: 0.4, post: 0.26, colTop: 4.9 };
const PLAT = { w: 4.2, d: 3.8, t: 0.3, z: 0.45 };
const PT0 = BAL.PY + BAL.beamT / 2 + BAL.post + PLAT.t;   // a pan's top when the beam is level
const TMAX = 0.32;                                    // the beam's stop (radians): a pan goes ±1.05 units
const XR = -BAL.L, XC = BAL.L;                        // the real ad's pan (left) and the copy's (right)
// a billboard on each pan: two posts and a panel, the picture on its face (pan-local: z from the pan's centre)
const BB = { postH: 5.9, postX: 1.35, postW: 0.22, z: -1.35, pw: 3.5, ph: 2.6, pt: 0.2, yaw: -0.22 };
const BB_TOP = BB.postH + BB.ph;
// people
const H_MK = 5.2, H_P = 4.8, H_S = 4.9, H_V = 4.8;    // the brand, passers-by, sources, the people who vouch
const STRIDE = (H) => 0.38 * H;
const WB = { w: 1.25, h: 0.85, d: 1.0 };              // a ✓ weight: a block; three of them stack up on the ad's pan

// the picture on the ad (panel-local, x right, y up, z = 0 on the face): a rainbow over two clouds
function pictureLines() {
  const L = [];
  for (const r of [1.22, 1.0, 0.78]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const a = 0.1 * Math.PI + (i / 40) * 0.8 * Math.PI; pts.push(new V3(Math.cos(a) * r, -0.82 + Math.sin(a) * r, 0)); }
    L.push(pts);
  }
  const cloud = (cx, cy, s) => {
    const pts = [];
    // a run of bumps along the top and a flat bottom
    const bumps = [[-0.5, 0.0, 0.22], [-0.22, 0.12, 0.28], [0.14, 0.1, 0.26], [0.44, -0.02, 0.2]];
    for (const [bx, by, br] of bumps) for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 - i / 10); pts.push(new V3(cx + (bx + Math.cos(a) * br) * s, cy + (by + Math.sin(a) * br) * s, 0)); }
    pts.push(new V3(cx + 0.66 * s, cy - 0.12 * s, 0), new V3(cx - 0.74 * s, cy - 0.12 * s, 0), pts[0].clone());
    return pts;
  };
  L.push(cloud(-1.05, -0.86, 1.0), cloud(1.08, -0.9, 0.92));
  // the horizon
  L.push([new V3(-1.6, -1.12, 0), new V3(1.6, -1.12, 0)]);
  // scaled to the panel and lifted to its middle
  return L.map((pts) => pts.map((p) => new V3(p.x * 0.94, p.y * 0.94 + 0.3, 0)));
}

// ------------------------------------------------------------------ the beats
// dur = the motion; the caption lands at keyAt and is held 0.8 s + 0.2 s per 字 (story.js)
const BEATS = [
  // 1 AI 幾秒就仿出一張以假亂真的 — the scan climbs the ad; typed cells build the same billboard on the empty pan, which
  //   comes down until the balance hangs level
  { dur: 3.0, keyAt: 1.35, shot: 0, parts: ['copy', 'real', 'scale', 'maker'] },
  // 2 連真的也被說是 AI — two passers-by: 「這張是真的」 at the copy, 「一定是 AI！」 at the ad; a ？ over the ad
  { dur: 2.8, keyAt: 1.5, shot: 0, parts: ['real', 'copy', 'passers'] },
  // 3 三個獨立來源說法一致，才開始可信 — three sources set three ✓ weights on the ad's pan; it goes lime
  { dur: 5.0, keyAt: 3.15, shot: 1, parts: ['sources', 'real', 'scale'] },
  // 4 品牌自己說得再多也不算 — the brand's own words bounce off its pan
  { dur: 3.0, keyAt: 1.95, shot: 1, parts: ['maker', 'scale', 'real'] },
  // 5 有多少人願意替你說話 — three people step onto the ad's pan; the balance comes down on its stop
  { dur: 4.4, keyAt: 3.3, shot: 0, parts: ['vouchers', 'scale', 'real'] },
];
const LAST = BEATS.length - 1;
const REST_PARTS = ['real', 'scale', 'vouchers', 'copy'];
// beat-local times (seconds)
const T1 = { scan0: 0.12, scan1: 1.0, fly: 0.42, level: 1.2 };
const T2 = { walk1: 0.95, pointB: 0.75, bubB: 0.85, pointA: 1.05, bubA: 1.2, q: 1.32, shrug: [1.5, 1.95] };
const T3 = { land: [1.45, 2.2, 2.95], lime: 3.0, qC: 3.4 };
const T4 = { turn: 0.35, arm: [0.25, 0.55], b: [{ pop: 0.45, fly: 0.7, land: 1.1, out: 1.7 }, { pop: 1.0, fly: 1.3, land: 1.72, out: 2.35 }], down: [2.3, 2.8] };
const T5 = { up: [1.6, 2.2, 2.8], bub: [1.9, 2.55, 3.2] };
// the beam's angle (+ = the real ad's pan down), as a share of its stop
const TILT = { start: 0.85, w: [0.25, 0.45, 0.62], v: [0.78, 0.9, 1.0] };

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
/** both hands open at the sides, palms up: "but it is real" */
function shrug(v) {
  const o = clonePose(v);
  o.hand.L.p.copy(chestPt(o, 0.25, -0.05, 0.13)); o.hand.L.pole.copy(chestDir(o, 1, -0.6, -0.4));
  o.hand.R.p.copy(chestPt(o, -0.25, -0.05, 0.13)); o.hand.R.pole.copy(chestDir(o, -1, -0.6, -0.4));
  o.head.multiply(new Q().setFromEuler(new THREE.Euler(-0.08, 0, 0.12)));
  return o;
}
/** a weight carried in both hands in front of the chest */
function carry(v) {
  const o = clonePose(v);
  o.hand.R.p.copy(chestPt(o, -0.06, -0.08, 0.2)); o.hand.R.pole.copy(chestDir(o, -0.7, -1, -0.3));
  o.hand.L.p.copy(chestPt(o, 0.06, -0.08, 0.2)); o.hand.L.pole.copy(chestDir(o, 0.7, -1, -0.3));
  return o;
}
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

/** strokes (glyphs drawn in 3D): polylines of points → cylinders with round joints, one geometry */
function strokeGeo(lines, r, seg = 8) {
  const parts = [];
  for (const pts of lines) {
    for (let i = 0; i < pts.length; i++) {
      parts.push(strip(new THREE.SphereGeometry(r, seg, 6).translate(pts[i].x, pts[i].y, pts[i].z)));
      if (i === 0) continue;
      const a = pts[i - 1], b = pts[i], d = new V3().subVectors(b, a), L = d.length();
      if (L < 1e-5) continue;
      const c = new THREE.CylinderGeometry(r, r, L, seg, 1, true);
      c.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, d.normalize()), new V3(1, 1, 1)));
      parts.push(strip(c));
    }
  }
  return mergeGeometries(parts);
}
/** the same lines printed as rows of square dots (a machine's rendering of the picture) */
function dotGeo(lines, d, pitch) {
  const list = [];
  for (const pts of lines) {
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const n = Math.max(3, Math.round(c.getLength() / pitch));
    for (const p of c.getSpacedPoints(n)) list.push(boxAt(d, d, 0.08, p.x, p.y, p.z + 0.02));
  }
  return mergeGeometries(list);
}
/** a question mark, h tall, origin at its foot, in the xy plane */
function qGeo(h) {
  const pts = [[-0.3, 0.66], [-0.27, 0.82], [-0.13, 0.95], [0.06, 0.98], [0.24, 0.9], [0.32, 0.75], [0.27, 0.6], [0.12, 0.49], [0.02, 0.4], [0.0, 0.3], [0.0, 0.24]];
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new V3(x * h, y * h, 0)), false, 'centripetal');
  const hook = [];
  for (let i = 0; i <= 24; i++) hook.push(c.getPointAt(i / 24));
  const r = 0.075 * h;
  return mergeGeometries([strokeGeo([hook], r, 10), strip(new THREE.SphereGeometry(r * 1.45, 12, 10).translate(0, 0.06 * h, 0))]);
}
/** a check mark, w wide, origin at its corner */
function checkGeo(w) {
  return strokeGeo([[new V3(-0.36 * w, 0.3 * w, 0), new V3(0, 0, 0), new V3(0.56 * w, 0.72 * w, 0)]], 0.09 * w, 10);
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
  const R = rng(6);

  // =================================================================== the balance
  const scale = new THREE.Group(); scale.name = 'scale';
  g.add(scale);
  let lo = Infinity;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) lo = Math.min(lo, gy(i * 1.6, j * 1.0));
  const baseY = Math.max(0, gy(0, 0)) ;
  const stand = (() => {
    const parts = [];
    // a heavy base slab down into the ground, a tapered column, a cap
    parts.push(boxAt(3.2, 0.4 + (baseY - lo) + 1.0, 2.0, 0, baseY + 0.2 - ((baseY - lo) + 1.0) / 2, 0));
    const col = new THREE.CylinderGeometry(0.2, 0.3, BAL.colTop - baseY - 0.4, 14).translate(0, baseY + 0.4 + (BAL.colTop - baseY - 0.4) / 2, 0);
    parts.push(strip(col));
    parts.push(strip(new THREE.SphereGeometry(0.34, 14, 10).translate(0, BAL.colTop + 0.05, 0)));
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ shade: 0.95, bias: 0.12 }));
    m.castShadow = m.receiveShadow = true;
    return m;
  })();
  scale.add(stand);
  // the dial: a fan plate on the column, ticks, the zero longer (the needle sweeps over it)
  const DIAL = { r0: 2.75, r1: 3.75, a: 0.36, z: BAL.beamZ + 0.12 };
  const dial = (() => {
    const s = new THREE.Shape();
    const n = 24;
    for (let i = 0; i <= n; i++) { const a = -DIAL.a + (2 * DIAL.a * i) / n; const x = Math.sin(a) * DIAL.r1, y = Math.cos(a) * DIAL.r1; i === 0 ? s.moveTo(x, y) : s.lineTo(x, y); }
    for (let i = n; i >= 0; i--) { const a = -DIAL.a + (2 * DIAL.a * i) / n; s.lineTo(Math.sin(a) * DIAL.r0, Math.cos(a) * DIAL.r0); }
    const plate = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
    plate.translate(0, BAL.PY, DIAL.z - 0.04);
    const m = new THREE.Mesh(strip(plate), ink({ shade: 1, bias: 0.4 }));
    m.castShadow = false; m.receiveShadow = true;
    const ticks = [];
    for (let i = -3; i <= 3; i++) {
      const a = i * DIAL.a * 0.3, r0 = i === 0 ? DIAL.r0 + 0.05 : DIAL.r1 - 0.42;
      const c = new V3(Math.sin(a) * (r0 + DIAL.r1 - 0.05) / 2, BAL.PY + Math.cos(a) * (r0 + DIAL.r1 - 0.05) / 2, DIAL.z + 0.05);
      const b = new THREE.BoxGeometry(i === 0 ? 0.11 : 0.07, DIAL.r1 - 0.05 - r0, 0.05);
      b.applyMatrix4(new M4().compose(c, new Q().setFromAxisAngle(ZAX, -a), new V3(1, 1, 1)));
      ticks.push(strip(b));
    }
    const t = new THREE.Mesh(mergeGeometries(ticks), ink({ accent: 'ink' }));
    t.castShadow = false;
    const grp = new THREE.Group(); grp.name = 'dial'; grp.add(m, t);
    return grp;
  })();
  scale.add(dial);
  // the beam: pivots on a pin at the column, carries the needle and the pans' posts
  const beam = new THREE.Group(); beam.name = 'beam';
  beam.position.set(0, BAL.PY, 0);
  scale.add(beam);
  {
    const parts = [boxAt(2 * BAL.L + 0.7, BAL.beamT, BAL.beamD, 0, 0, BAL.beamZ)];
    const pin = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 18).rotateX(Math.PI / 2).translate(0, 0, BAL.beamZ + BAL.beamD / 2 + 0.08);
    parts.push(strip(pin));
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ shade: 0.9, bias: 0.1 }));
    m.castShadow = m.receiveShadow = true;
    beam.add(m);
  }
  const NEEDLE = 3.6;
  const needle = (() => {
    const parts = [boxAt(0.13, NEEDLE - 0.3, 0.08, 0, (NEEDLE - 0.3) / 2, DIAL.z + 0.2)];
    const tip = new THREE.ConeGeometry(0.17, 0.42, 4).rotateY(Math.PI / 4).translate(0, NEEDLE - 0.12, DIAL.z + 0.2);
    parts.push(strip(tip));
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink' }));
    m.castShadow = false;
    return m;
  })();
  beam.add(needle);
  // the pans: a platform on a short post at each end of the beam; they stay level and ride up and down
  const panMat = () => ink({ shade: 0.95, bias: 0.2 });
  const makePan = (name) => {
    const grp = new THREE.Group(); grp.name = name;
    const top = new THREE.Mesh(boxAt(PLAT.w, PLAT.t, PLAT.d, 0, -PLAT.t / 2, 0), panMat());
    top.castShadow = top.receiveShadow = true;
    const post = new THREE.Mesh(boxAt(0.42, BAL.post + 0.2, 0.42, 0, -PLAT.t - (BAL.post + 0.2) / 2 + 0.1, BAL.beamZ - PLAT.z), panMat());
    post.castShadow = true;
    grp.add(top, post);
    scale.add(grp);
    return grp;
  };
  const panR = makePan('pan-real'), panC = makePan('pan-copy');

  // =================================================================== the two billboards
  const lines = pictureLines();
  const PYc = BB.postH + BB.ph / 2;                     // the picture's centre on the board
  const onPanel = (pts) => pts.map((p) => new V3(p.x, p.y + PYc + 0.02, BB.z + BB.pt / 2 + 0.03));
  const panelLines = lines.map(onPanel);
  // ---- the real ad (pencil: canvas, a darker frame, the picture drawn in ink)
  // each board is turned a little toward the reader's usual side (front left), so its face is seen nearly square
  const realB = new THREE.Group(); realB.name = 'real';
  realB.rotation.y = BB.yaw;
  panR.add(realB);
  const realPosts = new THREE.Mesh(mergeGeometries([-1, 1].map((s) => boxAt(BB.postW, BB.postH + 0.2, BB.postW, s * BB.postX, (BB.postH + 0.2) / 2 - 0.05, BB.z - 0.05))), ink({ shade: 0.9, bias: 0.12 }));
  realPosts.castShadow = realPosts.receiveShadow = true;
  const realCanvas = new THREE.Mesh(boxAt(BB.pw, BB.ph, BB.pt, 0, PYc, BB.z), ink({ shade: 1.0, bias: 0.46 }));
  realCanvas.castShadow = realCanvas.receiveShadow = true;
  const frameGeo = (w, h, th, z) => mergeGeometries([
    boxAt(w + th, th, th, 0, PYc + h / 2, z), boxAt(w + th, th, th, 0, PYc - h / 2, z),
    boxAt(th, h, th, -w / 2, PYc, z), boxAt(th, h, th, w / 2, PYc, z),
  ]);
  const realFrame = new THREE.Mesh(frameGeo(BB.pw, BB.ph, 0.16, BB.z + BB.pt / 2), ink({ shade: 0.6, bias: 0.02 }));
  realFrame.castShadow = false;
  const realLines = new THREE.Mesh(strokeGeo(panelLines, 0.06), ink({ accent: 'ink' }));
  realLines.castShadow = false;
  realB.add(realPosts, realCanvas, realFrame, realLines);
  // ---- the copy: the same billboard drawn in type, its picture printed as rows of dots; it fills from the pan up
  const FILL = { value: 99 };
  const FILL_HOOKS = { key: 'trust-fill2', fOut: /* glsl */`{ if (vLPos.y > uFill) op = 0.0; }` };
  const fillMat = (o) => ink({ ...o, hooks: FILL_HOOKS, uniforms: { uFill: FILL } });
  const copyB = new THREE.Group(); copyB.name = 'copy';
  copyB.rotation.y = BB.yaw;
  panC.add(copyB);
  const copyPosts = new THREE.Mesh(mergeGeometries([-1, 1].map((s) => boxAt(BB.postW * 0.7, BB.postH + 0.2, BB.postW * 0.7, s * BB.postX, (BB.postH + 0.2) / 2 - 0.05, BB.z - 0.05))), fillMat({ accent: 'ink' }));
  const copyCanvas = new THREE.Mesh(boxAt(BB.pw, BB.ph, BB.pt, 0, PYc, BB.z), fillMat({ style: 1, shade: 0.82, bias: 0.08 }));
  const copyFrame = new THREE.Mesh(frameGeo(BB.pw, BB.ph, 0.1, BB.z + BB.pt / 2), fillMat({ accent: 'ink' }));
  const copyLines = new THREE.Mesh(dotGeo(panelLines, 0.13, 0.22), fillMat({ accent: 'ink' }));
  for (const m of [copyPosts, copyCanvas, copyFrame, copyLines]) { m.castShadow = false; m.receiveShadow = true; copyB.add(m); }

  // ---- the AI at work (beat 1): a teal scan line climbing the ad, typed cells flying to the copy
  const fx = new THREE.Group(); fx.name = 'copying';
  g.add(fx);
  const scan = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 0.16), ink({ style: 1, shade: 0.4, accent: 'teal' }));
  scan.castShadow = false;
  fx.add(scan);
  // the cells: one per spot of the billboard (both posts, then the panel), from the bottom up
  const spots = [];
  for (let y = 0.25; y < BB.postH; y += 0.5) for (const s of [-1, 1]) spots.push([s * BB.postX, y]);
  for (let y = BB.postH + 0.2; y < BB_TOP; y += 0.42) for (let x = -BB.pw / 2 + 0.22; x < BB.pw / 2; x += 0.42) spots.push([x + (R() - 0.5) * 0.08, y + (R() - 0.5) * 0.08]);
  const NCELL = spots.length;
  const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(0.38, 0.38, 0.2), ink({ style: 1, shade: 0.45, accent: 'teal' }), NCELL);
  cells.frustumCulled = false;
  cells.castShadow = false;
  fx.add(cells);
  const yN = (y) => y / BB_TOP;
  const cellT = spots.map(([, y], i) => T1.scan0 + yN(y) * (T1.scan1 - T1.scan0) + (((i * 7919) % 13) / 13) * 0.05);
  const cellArc = spots.map(() => 1.4 + R() * 1.6);
  /** the copy's fill height (board-local y) at beat-1 time t */
  /** a board-local point (x, y, z) of the board on the pan at (px, top), in the district's frame */
  const boardPt = (px, top, x, y, z) => new V3(x, y, z).applyAxisAngle(YAX, BB.yaw).add(new V3(px, top, PLAT.z));
  const BOARD_N = new V3(0, 0, 1).applyAxisAngle(YAX, BB.yaw);
  const fillAt = (t) => -0.05 + clamp((t - T1.scan0 - T1.fly) / (T1.scan1 - T1.scan0 + 0.05)) * (BB_TOP + 0.6);

  // ---- the glyphs: a ？ over the ad (beat 2, until the third ✓), a ？ over the copy (from beat 3)
  const QH = 1.9;
  const qR = new THREE.Mesh(qGeo(QH), ink({ accent: 'ink' }));
  const qC = new THREE.Mesh(qGeo(QH), ink({ accent: 'ink' }));
  // each ？ on its board's inner top corner (the labels take the outer ones)
  qR.position.set(BB.pw / 2 - 0.35, BB_TOP + 0.3, BB.z + 0.2);
  qC.position.set(-BB.pw / 2 + 0.35, BB_TOP + 0.3, BB.z + 0.2);
  for (const m of [qR, qC]) m.castShadow = false;
  realB.add(qR); copyB.add(qC);

  // ---- the ✓ weights: blocks with a check on their face; carried in, then stacked on the ad's pan, one on another
  const STACK = { x: 1.35, z: 1.2 };                  // pan-local: the pan's front corner by the column
  const weights = [0, 1, 2].map((j) => {
    const grp = new THREE.Group(); grp.name = `weight${j + 1}`;
    const b = new THREE.Mesh(new THREE.BoxGeometry(WB.w, WB.h, WB.d), ink({ shade: 0.95, bias: 0.3 }));
    b.position.y = WB.h / 2;
    b.castShadow = b.receiveShadow = true;
    const c = new THREE.Mesh(checkGeo(0.68), ink({ accent: 'ink' }));
    c.position.set(-0.1, WB.h * 0.16, WB.d / 2 + 0.03);
    c.castShadow = false;
    grp.add(b, c);
    g.add(grp);
    return grp;
  });

  // =================================================================== people
  const tone = (p) => { p.material.userData.u.uShadeBias.value = 0.36; return p; };   // a drawing, not a silhouette
  // the brand, by its billboard, with a camera on a tripod behind it
  const maker = tone(makePerson({ height: H_MK }));
  maker.group.name = 'maker';
  g.add(maker.group);
  const MK = { x: -7.0, z: 2.8 };                    // at the front corner of its pan
  const tripod = (() => {
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4, top = new V3(0, 2.6, 0), foot = new V3(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55);
      const d = new V3().subVectors(top, foot), L = d.length();
      const c = new THREE.CylinderGeometry(0.05, 0.06, L, 6);
      c.applyMatrix4(new M4().compose(top.clone().add(foot).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, d.normalize()), new V3(1, 1, 1)));
      parts.push(strip(c));
    }
    parts.push(boxAt(0.95, 0.62, 0.55, 0, 2.95, 0));
    parts.push(strip(new THREE.CylinderGeometry(0.22, 0.25, 0.42, 14).rotateX(Math.PI / 2).translate(0, 2.95, 0.46)));
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ shade: 0.7, bias: 0.06 }));
    m.castShadow = m.receiveShadow = true;
    const grp = new THREE.Group(); grp.name = 'tripod'; grp.add(m);
    const x = -7.7, z = 1.15;
    grp.position.set(x, gy(x, z), z);
    grp.rotation.y = yawTo(x, z, XR, 0.4) ;
    g.add(grp);
    return grp;
  })();
  // two passers-by
  const passers = new THREE.Group(); passers.name = 'passers';
  g.add(passers);
  const pA = tone(makePerson({ height: H_P })), pB = tone(makePerson({ height: H_P }));
  passers.add(pA.group, pB.group);
  // three sources
  const team = new THREE.Group(); team.name = 'sources';
  g.add(team);
  const srcs = [0, 1, 2].map(() => { const p = tone(makePerson({ height: H_S })); team.add(p.group); return p; });
  // three people who vouch
  const crowd = new THREE.Group(); crowd.name = 'vouchers';
  g.add(crowd);
  const vs = [0, 1, 2].map(() => { const p = tone(makePerson({ height: H_V })); crowd.add(p.group); return p; });

  // stations (x, z)
  const SX = XR + STACK.x, SZ = PLAT.z + STACK.z;     // the stack, in the district's frame
  const ST = {
    // b3: out of the sources' way, to the copy's side, from where they watch the rest
    A: { b1: [-0.6, 6.6], b2: [-0.3, 5.0], b3: [2.3, 6.5] },
    B: { b1: [2.8, 6.8], b2: [2.5, 5.2], b3: [4.7, 5.9] },
    // the sources: one from the left, one from the front, one from the right; each sets its weight on the stack and
    // goes back the way it came (they do not know one another)
    S: [
      { from: [-10.0, 4.4], at: [-4.05, 3.15], out: [-11.5, 5.8], w: [0.0, 1.1] },
      { from: [-2.0, 10.5], at: [-2.55, 3.45], out: [-1.6, 12.0], w: [0.4, 1.85] },
      { from: [9.0, 1.9], at: [-1.15, 1.75], out: [10.0, 1.5], w: [0.3, 2.55] },
    ],
    // the people who vouch: up from the front, onto the ad's pan at its front edge, to their places, turned out
    V: [
      { from: [-5.5, 11.0], edge: [-5.55, 2.95], on: [-5.6, 2.0], at: [-5.75, 0.25], w0: 0.0 },
      { from: [-4.6, 11.4], edge: [-4.6, 2.95], on: [-4.6, 2.0], at: [-4.55, 0.75], w0: 0.6 },
      { from: [-3.3, 11.8], edge: [-3.4, 2.95], on: [-3.4, 2.0], at: [-3.45, 0.05], w0: 1.2 },
    ],
  };

  // bubbles: the passers-by's words (beat 2), the brand's own words (beat 4), the vouchers' words (beat 5)
  const BUB = {
    'passer-a': { w: 4.0, tail: 'right' },
    'passer-b': { w: 3.9, tail: 'left' },
    'claim-1': { w: 4.0, tail: 'left' },
    'claim-2': { w: 5.0, tail: 'left' },
    'voucher-1': { w: 3.5, tail: 'right' },
    'voucher-2': { w: 3.9, tail: 'right' },
    'voucher-3': { w: 3.9, tail: 'left' },
  };
  const BH = 1.55;
  for (const [id, b] of Object.entries(BUB)) {
    const bub = P.makeBubble({ w: b.w, h: BH, tail: b.tail });
    bub.mesh.castShadow = false;
    bub.group.name = `bubble-${id}`;
    (id.startsWith('passer') ? passers : id.startsWith('claim') ? g : crowd).add(bub.group);
    b.bub = bub;
    b.k = 0;
  }

  // =================================================================== hit proxies
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
  const hits = {
    real: P.makeHitProxy(realB, 0.3),
    copy: P.makeHitProxy(copyB, 0.3),
    maker: P.makeHitProxy(maker.group, 0.3),
  };
  // the copy's proxy must not shrink to the clip: it was fitted to the whole board above
  // the balance: one box round the column, the beam and both pans at level (fixed)
  hits.scale = (() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), HIDDEN);
    m.name = 'hit:scale'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.scale.set(2 * (BAL.L + PLAT.w / 2) + 0.6, BAL.colTop + 0.8, PLAT.d + 0.6);
    m.position.set(0, (BAL.colTop + 0.8) / 2 - 0.2, PLAT.z);
    scale.add(m);
    return m;
  })();
  /** one box round each person of a group, rewritten as they move (one mesh, so the part has one proxy) */
  const groupProxy = (name, parent, people, H, extra = null) => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const b = one.attributes.position.array;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(b.length * (people.length + (extra ? 1 : 0))), 3));
    const m = new THREE.Mesh(geo, HIDDEN);
    m.name = `hit:${name}`; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    const sx = 0.36 * H + 0.5, sy = H + 0.6, sz = 0.3 * H + 0.5;
    m.userData.place = () => {
      const a = geo.attributes.position.array;
      people.forEach((p, j) => {
        const o = p.group.position;
        for (let i = 0; i < b.length; i += 3) {
          a[j * b.length + i] = o.x + b[i] * sx;
          a[j * b.length + i + 1] = o.y + (b[i + 1] + 0.5) * sy - 0.3;
          a[j * b.length + i + 2] = o.z + b[i + 2] * sz;
        }
      });
      if (extra) {
        const { c, s } = extra(), j = people.length;
        for (let i = 0; i < b.length; i += 3) {
          a[j * b.length + i] = c.x + b[i] * s.x; a[j * b.length + i + 1] = c.y + b[i + 1] * s.y; a[j * b.length + i + 2] = c.z + b[i + 2] * s.z;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere(); geo.computeBoundingBox();
    };
    parent.add(m);
    return m;
  };
  hits.passers = groupProxy('passers', passers, [pA, pB], H_P);
  hits.sources = groupProxy('sources', g, srcs, H_S, () => ({ c: new V3(SX, panTop(-1, S_.th) + 1.5 * WB.h, SZ), s: new V3(WB.w + 0.8, 3 * WB.h + 0.8, WB.d + 0.8) }));
  hits.vouchers = groupProxy('vouchers', crowd, vs, H_V);
  const pickable = (mesh, on) => { if (on) mesh.layers.enable(0); else mesh.layers.disableAll(); };

  // every mesh's own shadow setting, so dimming can switch shadows off and emphasis can give them back
  g.traverse((o) => { if (o.isMesh) o.userData.cast0 = o.castShadow; });
  for (const m of [copyPosts, copyCanvas]) m.userData.cast0 = true;   // once it is there, the copy casts like the ad

  // =================================================================== the balance's angle (pure)
  /** a settle from a to b over [t0, t0 + d] with a small overshoot */
  const settle = (t, t0, a, b, d = 0.55) => {
    if (t <= t0) return a;
    const u = (t - t0) / d;
    if (u >= 2.2) return b;
    const e = 1 - Math.exp(-u * 3.2) * Math.cos(u * 5.2);
    return a + (b - a) * e;
  };
  function tiltAt(beat, t) {
    if (beat === 0) {
      // the copy's weight comes on as it fills (the posts are light, the panel heavy); then it swings and settles level
      return settle(t, T1.scan0 + T1.fly, TILT.start, 0, 0.55);
    }
    if (beat === 1) return 0;
    if (beat === 2) {
      let a = 0;
      T3.land.forEach((tl, j) => { a = settle(t, tl, a, TILT.w[j], 0.45); });
      return a;
    }
    if (beat === 3) {
      // the brand's words land and bounce off: the needle trembles and stays
      let a = TILT.w[2];
      for (const b of T4.b) a += Math.sin(Math.PI * seg(t, b.land, b.land + 0.3)) * 0.018 * Math.exp(-seg(t, b.land, b.land + 0.3) * 2);
      return a;
    }
    let a = TILT.w[2];
    T5.up.forEach((tu, j) => { a = settle(t, tu + 0.12, a, TILT.v[j], 0.5); });
    return a;
  }
  const panTop = (side, th) => PT0 + side * BAL.L * Math.sin(th);   // side −1: the ad's pan (left, down for th > 0), +1: the copy's

  // =================================================================== the people's motion (pure)
  const memo = new Map();
  const pz = (p, name, o) => {
    const key = p.height + name + JSON.stringify(o || {});
    if (!memo.has(key)) memo.set(key, p.pose(name, o));
    return memo.get(key);
  };
  const st = (x, z, yaw, v, on = 0) => ({ x, z, yaw, v, on });
  // a → b by k at b's place (the body keeps its shape relative to a root that turns from a's facing to b's the short way)
  const blendTo = (a, b, k, H) => {
    const e = sm(k);
    const v = a.x === b.x && a.z === b.z ? a.v : reframe(a.v, a, { x: b.x, z: b.z, yaw: a.yaw }, H);
    return st(b.x, b.z, a.yaw + wrapA(b.yaw - a.yaw) * e, blendPoses(v, b.v, e), lerp(a.on, b.on, e));
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
    if (t < ta) return blendTo(A, st(A.x, A.z, yw, wp(0), A.on), seg(t, t0, t0 + tt), H);
    if (t < t1 - tt) {
      const r = seg(t, ta, t1 - tt), u = run ? r * (1.25 - 0.25 * r) : sm(r) * 0.85 + r * 0.15;
      return st(A.x + (B.x - A.x) * u, A.z + (B.z - A.z) * u, yw, wp(d * u), lerp(A.on, B.on, u));
    }
    return blendTo(st(B.x, B.z, yw, wp(d), B.on), B, seg(t, t1 - tt, t1), H);
  }
  const headTo = (x, z, yaw, hx, hz) => clamp(wrapA(yawTo(x, z, hx, hz) - yaw), -1.25, 1.25);
  const BOARD_Y = PT0 + BB.postH + BB.ph / 2;          // where people look: the ads' faces

  // ---- the brand
  function makerAt(beat, t) {
    const p = maker, H = H_MK;
    const stand = pz(p, 'stand');
    const yaw0 = 0.55;                                 // turned to the reader, a little toward the ad
    const toReal = headTo(MK.x, MK.z, yaw0, XR, BB.z + PLAT.z);
    const toCopy = headTo(MK.x, MK.z, yaw0, XC, 0);
    const A0 = st(MK.x, MK.z, yaw0, look(stand, toReal * 0.8, -0.25));
    if (beat === 0) {
      // the copy appears: the brand turns to it and steps back half a pace
      const k = ss(t, 1.0, 1.6);
      return blendTo(A0, st(MK.x, MK.z, yaw0, look(pz(p, 'stepBack'), toCopy * 0.7, -0.1)), k, H);
    }
    const E1 = st(MK.x, MK.z, yaw0, look(pz(p, 'stepBack'), toCopy * 0.7, -0.1));
    const S0 = st(MK.x, MK.z, yaw0, look(stand, toCopy * 0.4, -0.05));
    if (beat === 1) {
      const a = blendTo(E1, S0, ss(t, 0.0, 0.6), H);
      // 「一定是 AI！」: the brand opens both hands — it is real
      const sh = st(MK.x, MK.z, yaw0, shrug(look(stand, 0.25, 0.05)));
      if (t < T2.shrug[0]) return a;
      return blendTo(a, sh, ss(t, T2.shrug[0], T2.shrug[1]), H);
    }
    const SH = st(MK.x, MK.z, yaw0, shrug(look(stand, 0.25, 0.05)));
    const W3 = st(MK.x, MK.z, yaw0, look(stand, toReal * 0.3, -0.05));
    if (beat === 2) return blendTo(SH, W3, ss(t, 0.0, 0.7), H);
    // beat 4: faces the people in front, raises an arm and speaks (twice); then the arm comes down
    const yawOut = 0.25;
    const UP = st(MK.x, MK.z, yawOut, look(pz(p, 'raise', { side: 'R' }), 0.1, 0.05));
    const DOWN = st(MK.x, MK.z, yawOut, look(stand, toReal * 0.5, -0.12));
    if (beat === 3) {
      if (t < T4.down[0]) return blendTo(W3, UP, ss(t, 0.0, T4.arm[1]), H);
      return blendTo(UP, DOWN, ss(t, T4.down[0], T4.down[1]), H);
    }
    // beat 5: watches the people step onto its pan
    const toV = headTo(MK.x, MK.z, yawOut, -6.0, 0.35);
    return blendTo(DOWN, st(MK.x, MK.z, yawOut, look(stand, toV * 0.6, -0.1)), ss(t, 0.6, 1.6), H);
  }

  // ---- the passers-by
  function passerAt(who, beat, t) {
    const p = who === 'A' ? pA : pB, H = H_P;
    const S = ST[who];
    const stand = pz(p, 'stand');
    const [x1, z1] = S.b1, [x2, z2] = S.b2;
    // beat 1: looking at the ad; once the copy is there they turn to it
    const y1 = yawTo(x1, z1, who === 'A' ? XR : 0, 0);
    const L1 = st(x1, z1, y1, look(stand, 0, -0.18));
    const toCopy1 = headTo(x1, z1, y1, XC, 0);
    const T1v = st(x1, z1, y1 + toCopy1 * 0.4, look(pz(p, 'watch', { yaw: toCopy1 * 0.3, pitch: -0.15 }), toCopy1 * 0.2, -0.15));
    const b1 = (tt) => blendTo(L1, T1v, ss(tt, 1.05 + (who === 'A' ? 0 : 0.12), 1.6 + (who === 'A' ? 0 : 0.12)), H);
    if (beat === 0) return b1(t);
    const E1 = b1(BEATS[0].dur);
    // beat 2: up closer; B points at the copy (「這張是真的」), A at the ad (「一定是 AI！」)
    const target = who === 'A' ? [XR, BB.z + PLAT.z] : [XC, BB.z + PLAT.z];
    const face2 = yawTo(x2, z2, target[0] * 0.55, target[1]);
    const S2 = st(x2, z2, face2, look(stand, 0, -0.15));
    const aim = new V3(target[0] - x2, BOARD_Y + 0.6 - gy(x2, z2), target[1] - z2).applyAxisAngle(YAX, -face2).divideScalar(H).sub(new V3(-0.114, 0.78, 0));
    const PT = st(x2, z2, face2, pointAt(stand, aim));
    const b2 = (tt) => {
      if (tt < T2.walk1) return walk(p, E1, S2, tt, 0.0, T2.walk1);
      const t0 = who === 'A' ? T2.pointA : T2.pointB;
      return blendTo(S2, PT, seg(tt, t0 - 0.1, t0 + 0.2), H);
    };
    if (beat === 1) return b2(t);
    const E2 = b2(BEATS[1].dur);
    // beat 3 on: the arm comes down and they step aside, to the copy's side, out of the sources' way; they watch
    const [x3, z3] = S.b3;
    const face3 = yawTo(x3, z3, XR + 1.5, 1.0);
    const W = st(x3, z3, face3, look(stand, 0, -0.12));
    const DOWN = st(x2, z2, face2, look(stand, 0, -0.12));
    if (beat === 2) {
      if (t < 0.35) return blendTo(E2, DOWN, seg(t, 0, 0.35), H);
      return walk(p, DOWN, W, t, 0.35, 1.25 + (who === 'A' ? 0 : 0.1));
    }
    if (beat === 3) return W;
    // beat 5: they turn to the people stepping onto the pan
    const W5 = st(x3, z3, face3, look(stand, headTo(x3, z3, face3, -4.5, 0.4) * 0.8, -0.1));
    return blendTo(W, W5, ss(t, 0.8, 1.6), H);
  }

  // ---- the sources: in, the ✓ weight set on the stack, and away again
  const placeMemo = new Map();
  /** the j-th weight's bottom on the stack (local y) for a beam angle th: it rides the pan */
  const stackY = (j, th) => panTop(-1, th) + j * WB.h;
  /** reaching out to the stack, the weight held down onto it with both hands (low: bent over; high: arms out) */
  function placePose(p, j, rootY, yb, fwd) {
    const key = `${j}:${rootY.toFixed(2)}:${yb.toFixed(2)}`;
    if (!placeMemo.has(key)) {
      const v = clonePose(pz(p, 'stamp', { y: +(yb + WB.h * 0.75 - rootY).toFixed(3), fwd: +fwd.toFixed(3), x: 0.0, table: yb - rootY }));
      v.hand.L.p.copy(v.hand.R.p).add(new V3(0.11, 0, 0));
      v.hand.R.p.add(new V3(-0.09, 0, 0));
      v.hand.L.pole.copy(chestDir(v, 0.8, -0.4, -1));
      placeMemo.set(key, v);
    }
    return placeMemo.get(key);
  }
  function sourceAt(j, beat, t) {
    const p = srcs[j], H = H_S, S = ST.S[j];
    const [fx, fz] = S.from, [ax, az] = S.at, [ox, oz] = S.out;
    const F0 = st(fx, fz, yawTo(fx, fz, ax, az), carry(p.pose('walk', { dist: 0, stride: STRIDE(H) })));
    if (beat < 2) return F0;
    const face = yawTo(ax, az, SX, SZ);                 // facing the stack
    const AT = st(ax, az, face, carry(pz(p, 'stand')));
    const tl = T3.land[j];
    const OUT = st(ox, oz, yawTo(ax, az, ox, oz), p.pose('walk', { dist: 0, stride: STRIDE(H) }));
    if (beat === 2) {
      const [w0, w1] = S.w;
      if (t < w1) return walk(p, F0, AT, t, w0, w1, true, carry);
      // reach to the stack, the weight set, up again, and off the way it came
      const rootY = gy(ax, az), yb = stackY(j, TMAX * tiltAt(2, tl));
      const fwd = Math.hypot(SX - ax, SZ - az) - 0.25;
      const PL = st(ax, az, face, placePose(p, j, rootY, yb, fwd));
      const UPR = st(ax, az, face, look(pz(p, 'stand'), 0, -0.2));
      if (t < tl) return blendTo(AT, PL, seg(t, w1, tl), H);
      if (t < tl + 0.3) return blendTo(PL, UPR, seg(t, tl + 0.02, tl + 0.3), H);
      return walk(p, UPR, OUT, t, tl + 0.35, tl + 2.3);
    }
    return OUT;
  }

  // ---- the people who vouch: up the lane, onto the pan from its inner edge, along it to their places, turned out
  function voucherAt(j, beat, t) {
    const p = vs[j], H = H_V, S = ST.V[j];
    const [fx, fz] = S.from, [ex, ez] = S.edge, [nx, nz] = S.on, [ax, az] = S.at;
    const F0 = st(fx, fz, yawTo(fx, fz, ex, ez), p.pose('walk', { dist: 0, stride: STRIDE(H) }));
    if (beat < 4) return F0;
    const tu = T5.up[j];
    const up = yawTo(ex, ez, nx, nz);
    const EDGE = st(ex, ez, up, pz(p, 'stand'), 0);
    const ON = st(nx, nz, up, pz(p, 'stand'), 1);       // just up on the pan
    const AT = st(ax, az, up, pz(p, 'stand'), 1);
    const OUT = st(ax, az, 0.12 * (j - 1), look(pz(p, 'stand'), 0, 0.05), 1);
    if (t < tu - 0.05) return walk(p, F0, EDGE, t, S.w0, tu - 0.05, true);
    // the step up: the root rises from the ground onto the pan as the feet step
    if (t < tu + 0.3) return blendTo(EDGE, ON, seg(t, tu - 0.05, tu + 0.3), H);
    if (t < tu + 0.85) return walk(p, ON, AT, t, tu + 0.3, tu + 0.85);
    // and turns round to face out, by the ad
    return blendTo(AT, OUT, seg(t, tu + 0.85, tu + 1.45), H);
  }

  // =================================================================== the pose
  const S_ = { beat: LAST, t: BEATS[LAST].dur, emph: null, lime: true, copyTeal: false, srcOn: [false, false, false], th: 0 };
  const _m = new M4(), _p = new V3(), _q = new Q(), _s = new V3();
  const _gInv = new M4();

  function placePerson(p, F, side, th) {
    p.apply(F.v);
    const ground = gy(F.x, F.z);
    const top = panTop(side, th);
    p.group.position.set(F.x, lerp(ground, top, F.on), F.z);
    p.group.rotation.set(0, F.yaw, 0);
  }

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const t = k * BEATS[beat].dur;
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : seg(t, a, z));

    // ---- the balance
    const th = TMAX * tiltAt(beat, t);
    S_.th = th;
    beam.rotation.z = th;
    const yR = panTop(-1, th), yC = panTop(1, th);
    panR.position.set(XR, yR, PLAT.z);
    panC.position.set(XC, yC, PLAT.z);
    scale.updateMatrixWorld(true);

    // ---- beat 1: the scan and the cells; the copy fills from its pan up
    const fill = beat > 0 ? 99 : fillAt(t);
    FILL.value = fill;
    copyB.visible = fill > -0.04;
    const built = fill >= BB_TOP + 0.05;
    for (const m of [copyPosts, copyCanvas]) m.userData.cast0 = built;
    const scanning = beat === 0 && t > T1.scan0 && t < T1.scan1 + 0.12;
    scan.visible = scanning;
    if (scanning) {
      const yb = seg(t, T1.scan0, T1.scan1) * BB_TOP;
      const onPanelY = yb > BB.postH;
      const fade = 1 - seg(t, T1.scan1, T1.scan1 + 0.12);
      scan.scale.set((onPanelY ? BB.pw + 0.5 : 2 * BB.postX + 0.6) * fade + 1e-3, 1, 1);
      scan.position.copy(boardPt(XR, yR, 0, yb, BB.z + BB.pt / 2 + 0.12));
      scan.rotation.y = BB.yaw;
    }
    let anyCell = false;
    for (let i = 0; i < NCELL; i++) {
      const [x, y] = spots[i];
      const u = beat === 0 ? seg(t, cellT[i], cellT[i] + T1.fly) : 1;
      if (u <= 0 || u >= 1) { cells.setMatrixAt(i, _m.compose(boardPt(XC, yC, x, y, BB.z), _q.identity(), _s.setScalar(1e-4))); continue; }
      anyCell = true;
      const e = u * u * (3 - 2 * u);
      // a low arc over the gap (over the needle), bulging toward the reader
      const yRu = panTop(-1, TMAX * tiltAt(0, cellT[i])), yCu = panTop(1, TMAX * tiltAt(0, cellT[i] + T1.fly));
      _p.copy(boardPt(XR, yRu, x, y, BB.z + 0.3)).lerp(boardPt(XC, yCu, x, y, BB.z + 0.3), e);
      _p.y += Math.sin(Math.PI * u) * (1.2 + cellArc[i] * 0.5);
      _p.addScaledVector(BOARD_N, Math.sin(Math.PI * u) * cellArc[i]);
      _q.setFromAxisAngle(YAX, BB.yaw + Math.sin(Math.PI * u) * (i % 2 ? 0.8 : -0.8));
      cells.setMatrixAt(i, _m.compose(_p, _q, _s.setScalar(Math.min(1, u / 0.15))));
    }
    cells.instanceMatrix.needsUpdate = true;
    cells.visible = anyCell;
    S_.copyTeal = beat === 0;

    // ---- the glyphs: ？ over the ad from 「一定是 AI！」 until the third ✓; ？ over the copy once no source names it
    const qInR = pop(Wn(1, T2.q, T2.q + 0.3));
    const out = Wn(2, T3.land[2] - 0.02, T3.land[2] + 0.35);
    const jolt = beat === 1 ? Math.sin(Math.PI * seg(t, T2.q, T2.q + 0.35)) * 0.25 : 0;
    qR.visible = qInR > 0.001 && out < 1;
    qR.scale.setScalar(Math.max(1e-3, qInR * (1 + jolt)));
    // it drops off the ad as the third weight lands
    qR.position.y = BB_TOP + 0.35 - out * out * 4.5;
    qR.rotation.z = -jolt * 0.5 + out * 1.4;
    const qInC = pop(Wn(2, T3.qC, T3.qC + 0.3));
    qC.visible = qInC > 0.001;
    qC.scale.setScalar(Math.max(1e-3, qInC));

    // ---- the people
    placePerson(maker, makerAt(beat, t), -1, th);
    placePerson(pA, passerAt('A', beat, t), -1, th);
    placePerson(pB, passerAt('B', beat, t), -1, th);
    team.visible = beat === 2;
    srcs.forEach((p, j) => { placePerson(p, sourceAt(j, beat, t), -1, th); p.group.visible = beat === 2 && t < T3.land[j] + 2.25; });
    crowd.visible = beat >= 4;
    vs.forEach((p, j) => placePerson(p, voucherAt(j, beat, t), -1, th));
    g.updateMatrixWorld(true);
    _gInv.copy(g.matrixWorld).invert();

    // ---- the ✓ weights: in the sources' hands, then on the pan (they ride it)
    weights.forEach((w, j) => {
      const tl = T3.land[j];
      w.visible = beat >= 2;
      if (!w.visible) return;
      const slot = new V3(SX, stackY(j, th), SZ);
      const placed = beat > 2 || t >= tl;
      if (placed) { w.position.copy(slot); w.quaternion.identity(); return; }
      // carried: centred between the hands, a little below them
      const pr = srcs[j];
      const hR = pr.hand('R'), hL = pr.hand('L');
      hR.updateWorldMatrix(true, false); hL.updateWorldMatrix(true, false);
      const c = new V3().setFromMatrixPosition(hR.matrixWorld).add(new V3().setFromMatrixPosition(hL.matrixWorld)).multiplyScalar(0.5).applyMatrix4(_gInv);
      c.y -= WB.h * 0.75;
      const [w0, w1] = ST.S[j].w;
      const toSlot = beat === 2 ? ss(t, w1, tl) : 0;
      w.position.copy(c).lerp(slot, toSlot * toSlot);
      w.quaternion.setFromAxisAngle(YAX, pr.group.rotation.y);
      w.quaternion.slerp(_q.identity(), toSlot);
    });
    S_.srcOn = srcs.map((_, j) => beat === 2 && t < T3.land[j] + 0.6);   // the tag stays a moment after the weight is down
    S_.lime = beat > 2 || (beat === 2 && t >= T3.lime);

    hits.passers.userData.place();
    hits.sources.userData.place();
    hits.vouchers.userData.place();
    pickable(hits.sources, beat >= 2);   // the people while they are in; the stack of checks after
    pickable(hits.vouchers, beat >= 4);
    pickable(hits.copy, beat > 0 || fill > BB_TOP * 0.5);

    // ---- bubbles: over their speakers in their beat; the brand's fly onto its pan and bounce off
    const headOf = (p) => g.worldToLocal(p.top());
    const over = (b, p, dx, beatOk, t0, outT) => {
      const k = beatOk ? pop(seg(t, t0, t0 + 0.28)) * (outT ? 1 - ss(t, outT[0], outT[1]) : 1) : 0;
      b.k = k;
      const hd = headOf(p);
      const tip = b.bub.tipLocal;
      b.bub.group.position.set(hd.x - tip.x + dx, hd.y + 0.35 - tip.y, hd.z + 0.3);
      b.bub.group.rotation.set(0, 0, 0);
      b.bub.group.scale.setScalar(Math.max(1e-3, k));
      b.bub.group.visible = k > 0.001;
    };
    over(BUB['passer-a'], pA, -0.2, beat === 1, T2.bubA);
    over(BUB['passer-b'], pB, 0.2, beat === 1, T2.bubB);
    // the brand's words: pop over its head, fly in an arc onto the pan, squash, bounce up and away, and pop
    T4.b.forEach((tb, i) => {
      const b = BUB[`claim-${i + 1}`];
      const grp = b.bub.group;
      if (beat !== 3 || t < tb.pop) { grp.visible = false; b.k = 0; return; }
      const hd = headOf(maker);
      const tip = b.bub.tipLocal;
      const start = new V3(hd.x - tip.x + 0.4, hd.y + 0.45 - tip.y, hd.z + 0.4);
      const land = new V3(XR - 0.9 + i * 1.1, yR + BH * 0.5 + 0.1, PLAT.z + 0.4 - i * 0.5);
      const away = new V3(land.x - 1.4 + i * 2.6, land.y + 2.6, land.z - 1.0);
      let p, sc = pop(seg(t, tb.pop, tb.pop + 0.25)), sy = 1;
      if (t < tb.fly) p = start;
      else if (t < tb.land) {
        const u = seg(t, tb.fly, tb.land);
        p = start.clone().lerp(land, u); p.y += Math.sin(Math.PI * u) * 1.6;
      } else {
        const u = seg(t, tb.land, tb.out);
        p = land.clone().lerp(away, sm(u)); p.y += Math.sin(Math.PI * Math.min(1, u * 1.6)) * 0.6;
        sy = 1 - 0.35 * Math.sin(Math.PI * seg(t, tb.land, tb.land + 0.16));
        sc *= 1 - ss(t, tb.out - 0.15, tb.out);
      }
      grp.position.copy(p);
      grp.rotation.set(0, 0, t >= tb.land ? -0.6 * ss(t, tb.land, tb.out) * (i ? -1 : 1) : 0);
      grp.scale.set(Math.max(1e-3, sc * (2 - sy)), Math.max(1e-3, sc * sy), Math.max(1e-3, sc));
      grp.visible = sc > 0.001;
      b.k = sc;
    });
    T5.bub.forEach((tb, j) => over(BUB[`voucher-${j + 1}`], vs[j], [-0.2, 0.3, 1.2][j], beat === 4, tb, j < 2 ? [T5.bub[j + 1] - 0.05, T5.bub[j + 1] + 0.2] : null));

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
    // the balance and its pans, then the boards on them (children of the pans: set after)
    setDim(scale, full('scale') ? 0 : 1);
    setDim(realB, full('real') ? 0 : 1);
    setDim(copyB, full('copy') ? 0 : 1);
    setDim(fx, full('copy') ? 0 : 1);
    for (const w of weights) setDim(w, full('sources') || full('scale') || full('real') ? 0 : 1);
    setDim(tripod, full('maker') ? 0 : 1);
    setDim(maker.group, full('maker') ? 0 : 1);
    setDim(passers, full('passers') ? 0 : 1);
    setDim(team, full('sources') ? 0 : 1);
    setDim(crowd, full('vouchers') ? 0 : 1);
    setDim(BUB['claim-1'].bub.group, full('maker') ? 0 : 1);
    setDim(BUB['claim-2'].bub.group, full('maker') ? 0 : 1);
    // lime on the ad once three sources agree (only in focus: on the map the result rests in plain ink)
    realCanvas.material.userData.u.uAccent.value = !map && S_.lime && full('real') ? ACCENT.lime : 0;
    // the copy is teal only while AI makes it (beat 1), plain type afterwards
    copyCanvas.material.userData.u.uAccent.value = !map && S_.copyTeal && full('copy') ? ACCENT.teal : 0;
  }
  function emphasize(ids) {
    S_.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }

  // =================================================================== anchors: labels, words, hotspots, framing
  g.updateMatrixWorld(true);
  const onBoard = (grp) => (x, y, z = BB.z + BB.pt / 2 + 0.05) => { grp.updateWorldMatrix(true, false); return grp.localToWorld(new V3(x, y, z)); };
  const onReal = onBoard(realB), onCopy = onBoard(copyB);
  const bubAt = (id, needEmph = true) => () => {
    const b = BUB[id];
    if (!(b.k > 0.85) || !b.bub.group.visible || (needEmph && S_.emph === null)) return null;
    b.bub.group.updateWorldMatrix(true, false);
    return b.bub.group.localToWorld(new V3(0, 0.02, 0.2));
  };
  const badgeAt = (j) => () => {
    if (!S_.srcOn[j] || !team.visible) return null;
    const p = srcs[j].top();
    return p.setY(p.y + 0.55);                         // a tag over the head: the weight in the hands stays in view
  };
  const parts = {
    // the ring on the ad's lower left corner, clear of the ？ and the label on its upper corners
    real: { hit: hits.real, anchor: () => onReal(-BB.pw / 2 + 0.55, BB.postH + 0.5), beat: 1 },
    copy: { hit: hits.copy, anchor: () => onCopy(-BB.pw / 2 + 0.55, BB.postH + 0.5), beat: 0 },
    scale: { hit: hits.scale, anchor: () => W(0, BAL.PY + DIAL.r0 + 0.3, DIAL.z + 0.3), beat: 2 },
    maker: { hit: hits.maker, anchor: () => maker.chest(), beat: 3 },
    passers: { hit: hits.passers, anchor: () => pA.chest(), beat: 1 },
    sources: { hit: hits.sources, anchor: () => (S_.beat === 2 && srcs[1].group.visible ? srcs[1].chest() : W(SX, weights[2].position.y + WB.h * 0.5, SZ + WB.d / 2)), beat: 2 },
    vouchers: { hit: hits.vouchers, anchor: () => vs[1].chest(), beat: 4 },
  };
  const labelAt = {
    // on each board's outer top corner
    real: () => onReal(-BB.pw / 2 + 0.3, BB_TOP - 0.3),
    copy: () => onCopy(BB.pw / 2 - 0.3, BB_TOP - 0.3),
    maker: () => maker.top(),
    vouchers: () => vs[1].top(),
  };
  const decalAt = {
    'passer-a': bubAt('passer-a'),
    'passer-b': bubAt('passer-b'),
    'source-1': badgeAt(0),
    'source-2': badgeAt(1),
    'source-3': badgeAt(2),
    'claim-1': bubAt('claim-1'),
    'claim-2': bubAt('claim-2'),
    'voucher-1': bubAt('voucher-1'),
    'voucher-2': bubAt('voucher-2'),
    'voucher-3': bubAt('voucher-3'),
  };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const hi = PT0 + BAL.L * Math.sin(TMAX);            // the copy's pan at the stop
  const boards = [
    W(XR - BB.pw / 2 - 0.2, PT0 + BB_TOP + 0.3, PLAT.z + BB.z), W(XR + BB.pw / 2, PT0 + BB_TOP + QH + 0.6, PLAT.z + BB.z),
    W(XC - BB.pw / 2, hi + BB_TOP + 0.3, PLAT.z + BB.z), W(XC + BB.pw / 2 + 0.2, hi + BB_TOP + QH + 0.5, PLAT.z + BB.z),
  ];
  const pans = [W(XR - PLAT.w / 2, 0, PLAT.z + PLAT.d / 2), W(XC + PLAT.w / 2, 0, PLAT.z + PLAT.d / 2)];
  const feet = (list) => list.map(([x, z]) => W(x, gy(x, z) - 0.2, z + 0.8));
  const heads = (list, H) => list.map(([x, z]) => W(x, gy(x, z) + H + 0.3, z));
  // the fit centres the anchors' box: every point on one side has its mirror on the other, so the stage sits in the
  // middle of the frame and the margins on both sides are used
  const mirror = (list) => list.flatMap(([x, z]) => [[x, z], [-x, z]]);
  const PTS = () => [...boards, ...pans, ...feet(mirror([[MK.x - 0.3, MK.z], ST.A.b2, ST.B.b2])),
    ...heads(mirror([[MK.x - 0.4, MK.z]]), H_MK)];
  const shot = (az, el) => ({ az: VIEW_AZ + az, el, anchors: PTS });
  const portrait = () => typeof innerWidth !== 'number' || innerHeight >= innerWidth;
  // shot B (beats 3 and 4, phone): closer on the ad's pan, the column and the brand — the stack of checks and the
  // words that bounce off; the copy's board may leave the frame at the top right
  const stackTop = W(SX, PT0 + 3 * WB.h + 0.2, SZ);
  const PTS_B = () => [W(XR - PLAT.w / 2, 0, PLAT.z + PLAT.d / 2), W(XR + PLAT.w / 2, 0, PLAT.z + PLAT.d / 2),
    W(0.3, BAL.colTop + 0.4, 0),
    W(XR, PT0 + BB_TOP + QH + 0.4, PLAT.z + BB.z), W(0.4, BAL.PY + DIAL.r1 + 0.3, DIAL.z), stackTop,
    ...feet([[MK.x - 0.3, MK.z], ...ST.S.map((s) => s.at)]), ...heads([[MK.x - 0.4, MK.z]], H_MK)];
  // seen a little from the left, so both boards face the reader nearly square
  const SHOT = { phone: [0.15, 0.7], phoneB: [0.2, 0.62], land: [0.15, 0.34], desk: [0.3, 0.36] };
  const phoneShot = (key, pts) => ({ get az() { return VIEW_AZ + (portrait() ? SHOT[key][0] : SHOT.land[0]); }, get el() { return portrait() ? SHOT[key][1] : SHOT.land[1]; }, anchors: () => (portrait() ? pts() : PTS()) });
  const shots = {
    phone: [phoneShot('phone', PTS), phoneShot('phoneB', PTS_B)],
    desk: [shot(...SHOT.desk)],
  };

  function rest() { return pose(LAST, 1); }
  function ambient() { /* nothing moves by itself: the held result stays still */ }

  const api = {
    id: 'trust',
    group: g,
    zone: 'consumer',
    anchor: W(0, PT0 + BB_TOP + 1.0, 0),
    pin: W(XR, PT0 + BB_TOP, PLAT.z + BB.z),
    // accents at full strength round the balance and the people in front of it
    focus: { pos: W(0, 4, 3), r: 15 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalUnit: Object.fromEntries(Object.keys(BUB).map((k) => [k, 0.95])),
    lever: null,
    mainActor: 'maker',
    restParts: REST_PARTS,
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { ST, BUB, gy, SHOT, maker: maker.group, passers: [pA.group, pB.group], sources: srcs.map((p) => p.group), vouchers: vs.map((p) => p.group), panR, panC, realB, copyB },
  };
  rest();
  emphasize(null);
  return api;
}
