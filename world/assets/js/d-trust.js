// 真實與信任 · trust (articles 6, 3) — told in four beats, in the heartland (TH 300°, r 28).
// Two hearts on two identical plinths.  The real one is the People chapter's emblem, a heart drawn as a fingerprint
// (pencil).  Beat 1: AI reads it — a teal scan line climbs it — and within two seconds a stream of typed cells builds
// the same heart on the empty plinth beside it, its ridges printed as rows of dots.  The passers-by who were looking
// at the real heart turn to the copy, and one steps back.  Beat 2: they cannot tell which is which; a ？ hangs over each
// heart, one of them points at the real heart: 「一定是 AI！」.  Beat 3: three checkers walk in with their sources; one
// after another a ✓ flies from a clipboard to the real heart (✓ ✓ ✓, and it turns lime) while over the copy the ？
// stays and they shake their heads.  Beat 4: the checkers lower their sources and step back to the hearts' feet
// between the plinths, turned to the real heart; the passers-by gather in a wedge at the real heart's foot, facing
// out, and speak for it.  Nobody stands by the copy.  The copy is never red and never crossed out: its ？ means only
// "unverified".
//
// Everything the reader sees is a pure function of (beat, k): pose().  No copy lives here: captions, labels, the
// words in the bubbles and on the clipboards and the tap lines come from world.json by part id.
// Local frame: +z points at the camera (the sea side, looking inward over clear ground), +x is the camera's right;
// y = 0 is the ground at the district's centre.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp } from './kit.js';
import { heightAt } from './terrain.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
/** a pop: 0 → a little past 1 → 1 */
const pop = (x) => { x = clamp(x); const c = 2.2; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const strip = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };

// ------------------------------------------------------------------ the set (local units)
const TH = 300, RR = 28;
const VIEW_AZ = (TH * Math.PI) / 180 + 0.5;          // the camera's side (world azimuth): the sea side, a little round
                                                     // from the old view, so the ground behind the hearts is clear of the
                                                     // core's stage and the memory bowl
const YAW = Math.PI / 2 - VIEW_AZ;                    // group turn: local +z → the camera
const S = 0.21;                                      // heart scale: 6.7 wide, 6.1 tall
const XR = 4.05, XC = -4.05;                          // the real heart (camera right) and the copy (camera left)
const PL = { w: 7.3, h: 1.3, d: 2.6 };               // two identical plinths
const TILT = -0.22;                                  // both hearts lean back a little, toward a camera above
const HP = 3.9, HC = 4.6;                            // passers-by (who become vouchers), checkers
const STRIDE_P = 0.4 * HP, STRIDE_C = 0.4 * HC;

function heartXY(t, s = 1) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [x * s, y * s];
}
const Y_TIP = -17 * S, Y_TOP = 11.95 * S;            // the heart's own frame: tip and top of the lobes
const HALF_W = 16 * S;

// ------------------------------------------------------------------ the beats
// dur = the motion; the caption lands at keyAt and is held 0.8 s + 0.25 s per 字 (story.js)
const BEATS = [
  // 1 AI 幾秒就做出一樣的 — the scan climbs the real heart; typed cells stream over and build the copy (complete at
  // 1.7 s: long enough to be seen on arrival, short enough to be "seconds"); then the passers-by turn to it
  { dur: 2.3, keyAt: 1.7, shot: 0, parts: ['copy', 'real', 'vouchers'] },
  // 2 真假難辨，連真的也被懷疑 — the passers-by spread between the hearts; a ？ over each; 「一定是 AI！」
  { dur: 1.9, keyAt: 1.25, shot: 0, parts: ['copy', 'real', 'vouchers'] },
  // 3 三個來源交叉驗證，才開始可信 — three checkers; ✓ ✓ ✓ over the real heart (lime); the copy keeps its ？
  { dur: 3.4, keyAt: 2.1, shot: 1, parts: ['real', 'checkers', 'copy'] },
  // 4 有人願意替你說話，才會被相信 — the passers-by gather at the real heart and speak for it
  { dur: 3.2, keyAt: 1.7, shot: 1, parts: ['vouchers', 'real', 'copy'] },
];
const LAST = BEATS.length - 1;
// beat-local times (seconds)
const T1 = { scan0: 0.15, scan1: 1.15, fly: 0.5, turn0: 1.3, turn1: 1.8 };
const T2 = { qC: 0.7, qR: 0.85, point1: 1.3, b1: 1.15, b2: 1.3, look: 1.35 };
const T3 = { check: [1.0, 1.7, 1.35], fly: 0.4 };   // per checker (left, middle, right); a ✓ lands at check + fly
const T4 = { out1: 1.7, b: [1.45, 1.58, 1.7] };

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
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

/** strokes (glyphs drawn in 3D): polylines of points → cylinders with round joints, one geometry */
function strokeGeo(lines, r) {
  const parts = [];
  for (const pts of lines) {
    for (let i = 0; i < pts.length; i++) {
      parts.push(strip(new THREE.SphereGeometry(r, 10, 8).translate(pts[i].x, pts[i].y, pts[i].z)));
      if (i === 0) continue;
      const a = pts[i - 1], b = pts[i], d = new V3().subVectors(b, a), L = d.length();
      const c = new THREE.CylinderGeometry(r, r, L, 10, 1, true);
      c.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, d.normalize()), new V3(1, 1, 1)));
      parts.push(strip(c));
    }
  }
  return mergeGeometries(parts);
}
/** a question mark, h tall, origin at its foot, in the xy plane */
function qGeo(h) {
  const pts = [[-0.3, 0.66], [-0.27, 0.82], [-0.13, 0.95], [0.06, 0.98], [0.24, 0.9], [0.32, 0.75], [0.27, 0.6], [0.12, 0.49], [0.02, 0.4], [0.0, 0.3], [0.0, 0.24]];
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new V3(x * h, y * h, 0)), false, 'centripetal');
  const hook = [];
  for (let i = 0; i <= 24; i++) hook.push(c.getPointAt(i / 24));
  const r = 0.075 * h;
  return mergeGeometries([strokeGeo([hook], r), strip(new THREE.SphereGeometry(r * 1.45, 12, 10).translate(0, 0.06 * h, 0))]);
}
/** a check mark, w wide, origin at its corner */
function checkGeo(w) {
  return strokeGeo([[new V3(-0.36 * w, 0.3 * w, 0), new V3(0, 0, 0), new V3(0.56 * w, 0.72 * w, 0)]], 0.085 * w);
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

  // =================================================================== two identical plinths
  let hi = -Infinity, lo = Infinity;
  for (const cx of [XR, XC]) for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++) {
    const y = gy(cx - PL.w / 2 + (i / 6) * PL.w, -PL.d / 2 + (j / 2) * PL.d);
    hi = Math.max(hi, y); lo = Math.min(lo, y);
  }
  const P_TOP = hi + PL.h;
  const plinthMat = ink({ shade: 0.95, bias: 0.16 });
  const plinths = [XR, XC].map((cx) => {
    const h = P_TOP - (lo - 0.5);
    const m = new THREE.Mesh(new THREE.BoxGeometry(PL.w, h, PL.d).translate(0, h / 2, 0), plinthMat);
    m.position.set(cx, lo - 0.5, 0);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  });

  // =================================================================== the hearts
  const outline = [];
  for (let i = 0; i <= 240; i++) outline.push(heartXY((i / 240) * Math.PI * 2, S));
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  const DEPTH = 0.36, BEV = 0.14;
  const plateGeo = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelSize: BEV, bevelThickness: BEV, bevelSegments: 2, curveSegments: 48 });
  plateGeo.translate(0, 0, -(DEPTH + BEV));   // the front face at z = 0
  // nine fingerprint ridges: scaled copies of the outline drifting toward an off-centre core, with a wobble and a few
  // breaks (the whorl the district always had); few and fine enough that paper shows between them on a phone
  const ridgeCurves = (() => {
    const core = [0.36, 0.7], list = [], NR = 9;
    for (let k = 1; k <= NR; k++) {
      const pts = [];
      const sk = (k / NR) * 0.9;
      for (let i = 0; i <= 160; i++) {
        const t = (i / 160) * Math.PI * 2;
        const [hx, hy] = heartXY(t, S);
        const wob = Math.sin(t * 9 + k * 1.7) * 0.06 + Math.sin(t * 3 - k) * 0.08;
        pts.push(new V3(core[0] + (hx - core[0]) * (sk + wob * 0.1), core[1] + (hy - core[1]) * (sk + wob * 0.1), 0.04));
      }
      const cut = R();
      const closed = k % 3 !== 0;
      const open = closed ? pts : pts.slice(Math.floor(cut * 40), Math.floor(cut * 40) + 125);
      list.push({ curve: new THREE.CatmullRomCurve3(open, closed), closed });
    }
    return list;
  })();
  const ridgeGeo = mergeGeometries(ridgeCurves.map(({ curve, closed }) => strip(new THREE.TubeGeometry(curve, 160, 0.052, 5, closed))));
  // the copy's ridges: the very same lines, printed as rows of square dots (a machine's rendering of the pattern).
  // Typed cells are 9 px on screen, coarser than the ridges, so in type alone the copy read as a plain dotted heart
  const dotGeo = (() => {
    const list = [], D = 0.13, PITCH = 0.24;
    for (const { curve } of ridgeCurves) {
      const n = Math.max(8, Math.round(curve.getLength() / PITCH));
      for (const p of curve.getSpacedPoints(n).slice(0, n)) list.push(strip(new THREE.BoxGeometry(D, D, 0.08).translate(p.x, p.y, 0.05)));
    }
    return mergeGeometries(list);
  })();
  // the outline as a stroke (the copy is type, which has no drawn edge of its own)
  const rimGeo = strip(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline.slice(0, -1).map(([x, y]) => new V3(x, y, 0.03)), true), 240, 0.06, 5, true));
  const H_Y = P_TOP - Y_TIP * Math.cos(TILT) + 0.1; // the heart's origin: its tip just above the plinth

  // ---- the real heart (pencil; lime once three sources agree)
  const realG = new THREE.Group(); realG.name = 'real';
  realG.position.set(XR, H_Y, 0);
  realG.rotation.x = TILT;
  g.add(realG);
  const realPlate = new THREE.Mesh(plateGeo, ink({ shade: 1.0, bias: 0.42 }));
  realPlate.castShadow = realPlate.receiveShadow = true;
  realG.add(realPlate);
  const realRidges = new THREE.Mesh(ridgeGeo, ink({ accent: 'ink' }));
  realRidges.castShadow = false;
  realG.add(realRidges);

  // ---- the copy: the same plate and the same ridges, drawn in type; it fills from the tip up as the cells land
  const FILL = { value: 99 };
  const FILL_HOOKS = { key: 'trust-fill', fOut: /* glsl */`{ if (vLPos.y > uFill) op = 0.0; }` };
  const copyG = new THREE.Group(); copyG.name = 'copy';
  copyG.position.set(XC, H_Y, 0);
  copyG.rotation.x = TILT;
  g.add(copyG);
  const copyPlate = new THREE.Mesh(plateGeo, ink({ style: 1, shade: 0.82, bias: 0.08, hooks: FILL_HOOKS, uniforms: { uFill: FILL } }));
  copyPlate.castShadow = copyPlate.receiveShadow = true;
  copyG.add(copyPlate);
  const copyRidges = new THREE.Mesh(dotGeo, ink({ accent: 'ink', hooks: FILL_HOOKS, uniforms: { uFill: FILL } }));
  copyRidges.castShadow = false;
  copyG.add(copyRidges);
  const copyRim = new THREE.Mesh(rimGeo, ink({ accent: 'ink', hooks: FILL_HOOKS, uniforms: { uFill: FILL } }));
  copyRim.castShadow = false;
  copyG.add(copyRim);

  // ---- the AI at work (beat 1): a teal scan line climbing the real heart, and typed cells flying to the copy
  const fx = new THREE.Group(); fx.name = 'copying';
  g.add(fx);
  // the heart's width at a height (its own frame): for the scan line and the cells' rows
  const widthAt = (y) => {
    let x0 = Infinity, x1 = -Infinity;
    for (let i = 0; i < outline.length - 1; i++) {
      const [ax, ay] = outline[i], [bx, by] = outline[i + 1];
      if ((ay - y) * (by - y) > 0 || ay === by) continue;
      const x = ax + ((y - ay) / (by - ay)) * (bx - ax);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    }
    return x1 > x0 ? [x0, x1] : null;
  };
  const scan = new THREE.Mesh(new THREE.BoxGeometry(1, 0.24, 0.14), ink({ style: 1, shade: 0.4, accent: 'teal' }));
  scan.castShadow = false;
  fx.add(scan);
  // the cells: one per spot of the heart (a grid inside the outline), lifting off the real heart at the scan line and
  // landing at the same spot of the copy, row by row from the tip up
  const STEP = 0.44;
  const spots = [];
  for (let y = Y_TIP + 0.28; y < Y_TOP - 0.08; y += STEP) {
    const w = widthAt(y);
    if (!w) continue;
    for (let x = Math.ceil((w[0] + 0.18) / STEP) * STEP; x < w[1] - 0.18; x += STEP) spots.push([x + (R() - 0.5) * 0.1, y + (R() - 0.5) * 0.1]);
  }
  const NCELL = spots.length;
  const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.42, 0.2), ink({ style: 1, shade: 0.45, accent: 'teal' }), NCELL);
  cells.frustumCulled = false;
  cells.castShadow = false;
  fx.add(cells);
  const yN = (y) => (y - Y_TIP) / (Y_TOP - Y_TIP);
  const cellT = spots.map(([, y], i) => T1.scan0 + yN(y) * (T1.scan1 - T1.scan0) + (((i * 7919) % 13) / 13) * 0.05);
  const cellArc = spots.map(() => 1.8 + R() * 1.8);
  // the copy fills as its rows land
  const fillAt = (t) => Y_TIP - 0.05 + clamp((t - T1.scan0 - T1.fly) / (T1.scan1 - T1.scan0 + 0.05)) * (Y_TOP - Y_TIP + 0.6);
  // a heart-frame point (x, y, z) of either heart, in the district's frame (the hearts lean back)
  const heartPt = (cx, x, y, z = 0) => new V3(x, y, z).applyAxisAngle(new V3(1, 0, 0), TILT).add(new V3(cx, H_Y, 0));

  // ---- the glyphs: a ？ over each heart, and three ✓ that land over the real heart one by one
  const QH = 2.8, CW = 1.85;
  const GLY = Y_TOP + 1.2;                          // the glyphs' foot, over the lobes (heart frame)
  const qR = new THREE.Mesh(qGeo(QH), ink({ accent: 'ink' }));
  const qC = new THREE.Mesh(qGeo(QH), ink({ accent: 'ink' }));
  qR.position.set(0, GLY, 0.2); qC.position.set(0, GLY, 0.2);
  for (const m of [qR, qC]) m.castShadow = false;
  realG.add(qR); copyG.add(qC);
  const CHECK_X = [0, -2.1, 2.1];                   // per checker: the first where the ？ was, the right one's to the right, the last to the left
  const checkMat = ink({ accent: 'ink' });
  const checks = CHECK_X.map((x) => {
    const m = new THREE.Mesh(checkGeo(CW), checkMat);
    m.position.set(x, GLY + 0.3, 0.2);
    m.castShadow = false;
    realG.add(m);
    return m;
  });

  // =================================================================== people
  // ---- five passers-by (who become the vouchers), in one group with their bubbles
  const crowd = new THREE.Group(); crowd.name = 'crowd';
  g.add(crowd);
  const passers = [0, 1, 2, 3, 4].map(() => {
    const p = makePerson({ height: HP });
    p.material.userData.u.uShadeBias.value = 0.36;   // seen against the light: a drawing, not a hatched silhouette
    crowd.add(p.group);
    return p;
  });
  // ---- three checkers with their sources, in one group
  const team = new THREE.Group(); team.name = 'checkers';
  g.add(team);
  const checkers = [0, 1, 2].map(() => {
    const p = makePerson({ height: HC });
    p.material.userData.u.uShadeBias.value = 0.36;
    const clip = P.makeClipboard({ w: 1.2, h: 1.55 });
    p.hold('R', clip);
    p.clip = clip;
    team.add(p.group);
    return p;
  });

  // ---- stations (x, z) per beat.  Beat 1: in front of the real heart, looking at it.  Beat 2: spread over the front of
  // both hearts (each keeps its order from left to right, so no one walks through another).  Beat 3: back toward the
  // reader on the real heart's side, clear of the checkers' ways in.  Beat 4: a wedge at the real heart's foot, facing
  // out; the two who speak for it stand at the plinth's corners, so their bubbles sit on the plinth, not on a heart.
  // The checkers come in from three sides (from), check both hearts from the middle (at), and in beat 4 step back to
  // the middle of the foreground (end), turned toward the real heart, out of the people's way.  Every pair of people
  // keeps ≥ 1.5 units apart while they walk (checked by a 2D simulation of these windows).
  const ST = {
    b1: [[0.2, 8.8], [2.4, 10.2], [4.4, 8.6], [6.4, 9.8], [-2.2, 10.2]],
    b2: [[-2.4, 8.4], [0.6, 11.0], [2.6, 8.6], [5.8, 10.0], [-5.6, 10.4]],
    b3: [[3.0, 11.8], [4.4, 10.4], [6.0, 11.6], [7.4, 10.2], [1.4, 10.2]],
    b4: [[3.2, 8.4], [4.5, 10.2], [5.9, 8.2], [7.4, 6.2], [2.2, 6.2]],
  };
  // walking windows (beat-local seconds) per person: [start, arrival].  Short walks at a person's pace (mid-walk about
  // 3–7 units a second, 1–1.6 heights): the crowd drifts while the checkers work, the checkers come in walking
  const WIN = {
    b2: [[0.05, 1.0], [0.1, 1.0], [0.1, 0.95], [0.1, 0.6], [0.0, 1.2]],
    b3: [[0.1, 2.6], [0.3, 2.2], [0.2, 2.4], [0.4, 1.8], [0.0, 2.8]],
    b4: [[0.0, 1.4], [0.05, 1.45], [0.0, 1.4], [0.0, 1.4], [0.0, 1.35]],
    c3: [[0.0, 0.85], [0.0, 1.5], [0.1, 1.2]],
    c4: [[0.1, 1.4], [0.1, 1.3], [0.1, 1.6]],
  };
  // what each passer-by looks at in beat 2 (its body turned that way): the real heart, the copy, or both in turn
  const B2_FACE = ['copy', 'both', 'real', 'real', 'copy'];
  const POINTER = 3;   // 「一定是 AI！」: points at the real heart in beat 2, and in beat 4 raises a hand for it (真的不錯)
  const STEPPER = 2;   // steps back when the copy appears
  // the checkers come in walking from the edges, check from in front of each heart and between them (left first, then
  // right, then the middle), and in beat 4 step back to the hearts' feet between the plinths, turned to the real heart
  const CK = {
    from: [[-9.6, 6.6], [9.8, 3.2], [9.6, 6.6]],
    at: [[-4.4, 6.4], [0.2, 5.4], [4.4, 6.4]],
    end: [[-1.5, 3.4], [-0.1, 2.4], [1.0, 3.6]],
  };

  // bubbles: in the crowd's group (they belong to the people who speak); sized for their words
  const BUB = {
    // over the front of the heart each one means: 「一定是 AI！」 over the real heart's, 「是真的嗎？」 over the copy's
    'passer-1': { who: POINTER, w: 4.4, tail: 'right', beat: 1, t: T2.b1, st: 'b2', dx: -0.2 },
    'passer-2': { who: 0, w: 4.1, tail: 'right', beat: 1, t: T2.b2, st: 'b2', dx: -0.3 },
    // the two at the wedge's back corners speak inward, side by side over the plinth's face
    'voucher-1': { who: 4, w: 3.2, tail: 'left', beat: 3, t: T4.b[0], st: 'b4', dx: -0.4 },
    // a quick 「我也用過」 that has gone again when the beat settles: the held result keeps the other two
    'voucher-2': { who: 1, w: 3.7, tail: 'left', beat: 3, t: T4.b[1], st: 'b4', dx: -0.4, dy: 0.5, out: [2.75, 3.05] },
    'voucher-3': { who: POINTER, w: 3.7, tail: 'right', beat: 3, t: T4.b[2], st: 'b4', dx: 0.3 },
  };
  const BH = 1.5;
  for (const [id, b] of Object.entries(BUB)) {
    const bub = P.makeBubble({ w: b.w, h: BH, tail: b.tail });
    bub.mesh.castShadow = false;
    bub.group.name = `bubble-${id}`;
    crowd.add(bub.group);
    b.bub = bub;
  }
  /** each bubble over its speaker's head at its station: the tail's tip just above the head */
  function placeBubbles() {
    for (const b of Object.values(BUB)) {
      const [x, z] = ST[b.st][b.who];
      const tip = b.bub.tipLocal;
      b.at = new V3(x - tip.x + (b.dx || 0), gy(x, z) + HP + 0.3 - tip.y + (b.dy || 0), z + 0.3);
    }
  }
  placeBubbles();

  // =================================================================== hit proxies
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
  const proxy = (name, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), HIDDEN);
    m.name = `hit:${name}`; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    parent.add(m);
    return m;
  };
  const realHit = proxy('real', realG);
  const copyHit = proxy('copy', copyG);
  for (const h of [realHit, copyHit]) { h.scale.set(2 * HALF_W + 0.6, Y_TOP - Y_TIP + 0.6, 1.4); h.position.set(0, (Y_TOP + Y_TIP) / 2, -0.25); }
  /** one box round each person of a group, rewritten as they move (one mesh, so the part has one proxy) */
  const groupProxy = (name, parent, people, H) => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const b = one.attributes.position.array;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(b.length * people.length), 3));
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
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere(); geo.computeBoundingBox();
    };
    parent.add(m);
    return m;
  };
  const crowdHit = groupProxy('vouchers', crowd, passers, HP);
  const teamHit = groupProxy('checkers', team, checkers, HC);
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
  // a → b by k, on the spot (every blend here is between two frames at the same place).  The body keeps its shape
  // relative to a root that turns from a's facing to b's the short way: people.js aims the knees along the root's +z,
  // so expressing a in b's already-turned root flipped the knees on the first frame of a turn, and half-way through a
  // half turn the two bodies' orientations were half a turn apart (no shortest way to blend them)
  const blendTo = (a, b, k, H) => {
    const e = sm(k);
    const v = a.x === b.x && a.z === b.z ? a.v : reframe(a.v, a, { x: b.x, z: b.z, yaw: a.yaw }, H);
    return st(b.x, b.z, a.yaw + wrapA(b.yaw - a.yaw) * e, blendPoses(v, b.v, e));
  };

  /** a walk from frame A to frame B over [t0, t1]: turn, walk, settle (both frames { x, z, yaw, v }) */
  function walk(p, A, B, t, t0, t1, stride, run = false) {
    const H = p.height;
    const d = Math.hypot(B.x - A.x, B.z - A.z);
    if (t <= t0 && !run) return A;
    if (d < 0.05) return blendTo(A, B, seg(t, t0, t1), H);
    const yw = yawTo(A.x, A.z, B.x, B.z);
    const tt = Math.min(0.28, (t1 - t0) * 0.25);
    // run: already walking when the window opens (coming in from outside the frame), so no turn on the spot first
    const ta = run ? t0 : t0 + tt;
    if (t < ta) return blendTo(A, st(A.x, A.z, yw, p.pose('walk', { dist: 0, stride })), seg(t, t0, t0 + tt), H);
    if (t < t1 - tt) {
      const r = seg(t, ta, t1 - tt), u = run ? r * (1.25 - 0.25 * r) : sm(r) * 0.85 + r * 0.15;
      return st(A.x + (B.x - A.x) * u, A.z + (B.z - A.z) * u, yw, p.pose('walk', { dist: d * u, stride }));
    }
    return blendTo(st(B.x, B.z, yw, p.pose('walk', { dist: d, stride })), B, seg(t, t1 - tt, t1), H);
  }
  const facing = (x, z, tx, tz) => yawTo(x, z, tx, tz);
  const headTo = (x, z, yaw, hx, hz) => clamp(wrapA(yawTo(x, z, hx, hz) - yaw), -1.25, 1.25);

  // ---- the passers-by
  function passerAt(i, beat, t) {
    const p = passers[i];
    const H = HP;
    const stand = pz(p, 'stand');
    const [x1, z1] = ST.b1[i], [x2, z2] = ST.b2[i], [x3, z3] = ST.b3[i], [x4, z4] = ST.b4[i];
    // beat 1: looking at the real heart; once the copy stands there they turn to it, and one steps back
    const y1 = facing(x1, z1, XR, 0);
    const L1 = st(x1, z1, y1, look(stand, 0, -0.12));
    const toCopy = headTo(x1, z1, y1, XC, 0);
    const T1v = st(x1, z1, y1 + toCopy * 0.45, look(pz(p, 'watch', { yaw: toCopy * 0.35, pitch: -0.1 }), toCopy * 0.2, -0.1));
    const B1end = i === STEPPER ? st(x1, z1, T1v.yaw, look(pz(p, 'stepBack'), toCopy * 0.5, -0.1)) : T1v;
    const b1 = (tt) => blendTo(L1, B1end, seg(tt, T1.turn0 + i * 0.06, T1.turn1 + i * 0.06 + (i === STEPPER ? 0.15 : 0)), H);
    if (beat === 0) return b1(t);
    const E1 = b1(BEATS[0].dur);
    // beat 2: to a place in front of the hearts; each faces the heart it doubts, one looks from one to the other
    const face2 = B2_FACE[i] === 'real' ? facing(x2, z2, XR, 0) : B2_FACE[i] === 'copy' ? facing(x2, z2, XC, 0) : Math.PI;
    const S2rest = st(x2, z2, face2, look(stand, 0, -0.1));
    const [w20, w21] = WIN.b2[i];
    const b2 = (tt) => {
      if (tt < w21) return walk(p, E1, S2rest, tt, w20, w21, STRIDE_P);
      if (i === POINTER) {
        // 「一定是 AI！」: points at the real heart (from the moment they stop)
        const at = new V3(XR - x2, 4.4 - gy(x2, z2), 0 - z2).applyAxisAngle(YAX, -face2).divideScalar(H).sub(new V3(-0.114, 0.78, 0));
        return blendTo(S2rest, st(x2, z2, face2, pointAt(stand, at)), seg(tt, w21, T2.point1), H);
      }
      // the others look from one heart to the other (one slow turn), the head eased in from where the walk left it
      const a = headTo(x2, z2, face2, XR, 0), b = headTo(x2, z2, face2, XC, 0);
      const u = ss(tt, T2.look + i * 0.05, T2.look + 0.45 + i * 0.05);
      const first = B2_FACE[i] === 'copy' ? b : a, second = B2_FACE[i] === 'copy' ? a : b;
      const k0 = B2_FACE[i] === 'both' ? a : first * 0.25;
      const k = lerp(k0 * ss(tt, w21, T2.look + i * 0.05), B2_FACE[i] === 'both' ? b : second * 0.6, u);
      return st(x2, z2, face2, look(stand, k, -0.1));
    };
    if (beat === 1) return b2(t);
    const E2 = b2(BEATS[1].dur);
    // beat 3: back toward the reader on the real heart's side, watching the checkers
    const S3 = st(x3, z3, facing(x3, z3, x3 * 0.4, 6.5), look(stand, 0, -0.05));
    const b3 = (tt) => walk(p, E2, S3, tt, WIN.b3[i][0], WIN.b3[i][1], STRIDE_P);
    if (beat === 2) return b3(t);
    const E3 = b3(BEATS[2].dur);
    // beat 4: to the real heart, then turn round to face out in front of it
    const S4walk = st(x4, z4, yawTo(x3, z3, x4, z4), stand);
    // the one who pointed at it in beat 2 (「一定是 AI！」) now raises a hand for it
    const S4 = st(x4, z4, (x4 - XR) * 0.05, i === POINTER ? pz(p, 'raise', { side: 'R' }) : stand);
    const [tw0, tw1] = WIN.b4[i];
    if (t < tw1) return walk(p, E3, S4walk, t, tw0, tw1, STRIDE_P);
    return blendTo(S4walk, S4, seg(t, tw1, T4.out1), H);
  }

  // ---- the checkers
  const raisedMemo = new Map();
  /** the clipboard lifted a little toward the hearts (the source shown) */
  function raisedClip(p) {
    if (!raisedMemo.has(p)) {
      const v = clonePose(pz(p, 'hold'));
      v.hand.R.p.copy(chestPt(v, -0.04, 0.13, 0.22));
      v.hand.L.p.copy(chestPt(v, 0.08, 0.11, 0.2));
      raisedMemo.set(p, v);
    }
    return raisedMemo.get(p);
  }
  // they stand three-quarter to the reader, between the reader and the hearts
  const ckFace = (j) => { const [ax, az] = CK.at[j]; return facing(ax, az, ax * 0.5, 30); };
  function checkerAt(j, beat, t) {
    const p = checkers[j];
    const H = HC;
    const [fx0, fz0] = CK.from[j], [ax, az] = CK.at[j], [ex, ez] = CK.end[j];
    const face = ckFace(j);
    const hold = pz(p, 'hold');
    // coming in from the edge, already walking (the clipboard swings with the arm until they stop)
    const F0 = st(fx0, fz0, yawTo(fx0, fz0, ax, az), p.pose('walk', { dist: 0, stride: STRIDE_C }));
    if (beat < 2) return F0;
    const toR = headTo(ax, az, face, XR, 0), toC = headTo(ax, az, face, XC, 0);
    if (beat === 2) {
      const [c0, c1] = WIN.c3[j];
      if (t < c1) return walk(p, F0, st(ax, az, face, hold), t, c0, c1, STRIDE_C, true);
      const tc = T3.check[j];
      // look at the real heart, lift the source (the ✓ goes), look at the copy and shake the head
      const raise = Math.sin(Math.PI * seg(t, tc - 0.15, tc + 0.35));
      const lookR = ss(t, c1, Math.max(c1 + 0.1, tc - 0.1)), lookC = ss(t, tc + 0.35, tc + 0.6);
      const shake = t > tc + 0.55 ? Math.sin((t - tc - 0.55) * Math.PI * 2 * 2.2) * 0.32 * (1 - ss(t, tc + 1.0, tc + 1.3)) : 0;
      const yaw = lerp(lerp(0, toR, lookR), toC, lookC) + shake;
      const v = raise > 0 ? blendPoses(hold, raisedClip(p), raise) : hold;
      return st(ax, az, face, look(v, yaw, -0.08));
    }
    // beat 4: the source goes down; they step back to the hearts' feet between the plinths, out of the people's way,
    // and stand turned toward the real heart (their ✓ ✓ ✓ are over it).  The clipboard comes down as the walk begins
    const AT2 = st(ax, az, face, look(hold, toC, -0.08));
    const yawE = 0.95;
    const END = st(ex, ez, yawE, look(pz(p, 'stand'), headTo(ex, ez, yawE, XR, 1.0) * 0.7, -0.05));
    return walk(p, AT2, END, t, WIN.c4[j][0], WIN.c4[j][1], STRIDE_C);
  }

  // where each ✓ leaves from: its checker's clipboard at its place, lifted (computed once)
  const clipFrom = checkers.map((p, j) => {
    const [ax, az] = CK.at[j];
    p.apply(raisedClip(p));
    p.group.position.set(ax, gy(ax, az), az);
    p.group.rotation.set(0, ckFace(j), 0);
    g.updateMatrixWorld(true);
    p.clip.group.updateWorldMatrix(true, false);
    return g.worldToLocal(p.clip.group.localToWorld(new V3(0, 1.1, 0.1)));
  });

  // =================================================================== the pose
  const S_ = { beat: LAST, t: BEATS[LAST].dur, emph: null, lime: true, copyTeal: false, clipsUp: [false, false, false] };
  const _m = new M4(), _p = new V3(), _q = new Q(), _s = new V3();

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i */
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : seg(t, a, z));

    // ---- beat 1: the scan and the cells; the copy fills from the tip up
    const fill = beat > 0 ? 99 : fillAt(t);
    FILL.value = fill;
    copyG.visible = fill > Y_TIP;
    const scanning = beat === 0 && t > T1.scan0 && t < T1.scan1 + 0.12;
    scan.visible = scanning;
    if (scanning) {
      const y = Y_TIP + seg(t, T1.scan0, T1.scan1) * (Y_TOP - Y_TIP);
      const w = widthAt(Math.min(Y_TOP - 0.02, Math.max(Y_TIP + 0.02, y))) || [-0.3, 0.3];
      const fade = 1 - seg(t, T1.scan1, T1.scan1 + 0.12);
      scan.scale.set(Math.max(0.4, w[1] - w[0] + 0.8) * fade + 1e-3, 1, 1);
      scan.position.copy(heartPt(XR, (w[0] + w[1]) / 2, y, 0.35));
      scan.rotation.x = TILT;
    }
    let anyCell = false;
    for (let i = 0; i < NCELL; i++) {
      const [x, y] = spots[i];
      const u = beat === 0 ? seg(t, cellT[i], cellT[i] + T1.fly) : 1;
      if (u <= 0 || u >= 1) { cells.setMatrixAt(i, _m.compose(heartPt(XC, x, y, 0.2), _q.identity(), _s.setScalar(1e-4))); continue; }
      anyCell = true;
      const e = u * u * (3 - 2 * u);
      // a low arc over the gap, bulging toward the reader
      _p.copy(heartPt(XR, x, y, 0.25)).lerp(heartPt(XC, x, y, 0.25), e);
      _p.y += Math.sin(Math.PI * u) * cellArc[i] * 0.5;
      _p.z += Math.sin(Math.PI * u) * cellArc[i];
      _q.setFromAxisAngle(YAX, Math.sin(Math.PI * u) * (i % 2 ? 0.8 : -0.8));
      cells.setMatrixAt(i, _m.compose(_p, _q, _s.setScalar(Math.min(1, u / 0.15))));
    }
    cells.instanceMatrix.needsUpdate = true;
    cells.visible = anyCell;
    S_.copyTeal = beat === 0;

    // ---- the glyphs: ？ over both hearts (beat 2 on); over the real heart it gives way to the first ✓
    const qInC = beat >= 1 ? pop(Wn(1, T2.qC, T2.qC + 0.3)) : 0;
    const qInR = beat >= 1 ? pop(Wn(1, T2.qR, T2.qR + 0.3)) : 0;
    const land0 = T3.check[0] + T3.fly;
    const qOutR = Wn(2, land0 - 0.12, land0 + 0.05);
    // the copy's ？ shrugs each time a checker shakes their head at it
    let wob = 0;
    if (beat === 2) for (const tc of T3.check) wob += Math.sin(Math.PI * seg(t, tc + 0.6, tc + 0.95)) * 0.14;
    qC.visible = qInC > 0.001;
    qC.scale.setScalar(Math.max(1e-3, qInC * (1 + wob)));
    qC.rotation.z = wob * 0.8;
    qR.visible = qInR * (1 - qOutR) > 0.001;
    // 「一定是 AI！」: the ？ over the real heart jolts as it is said
    const jolt = beat === 1 ? Math.sin(Math.PI * seg(t, T2.b1, T2.b1 + 0.3)) * 0.3 : 0;
    qR.scale.setScalar(Math.max(1e-3, qInR * (1 - qOutR) * (1 + jolt)));
    qR.rotation.z = -jolt * 0.5;
    // the ✓: each flies from its checker's clipboard and lands over the real heart
    let nCheck = 0;
    realG.updateMatrixWorld(true);
    const toReal = new M4().copy(realG.matrix).invert();
    checks.forEach((m, j) => {
      const tc = T3.check[j];
      const fly = Wn(2, tc + 0.02, tc + T3.fly);
      m.visible = fly > 0;
      if (!m.visible) return;
      if (fly >= 1) nCheck++;
      const home = new V3(CHECK_X[j], GLY + 0.3, 0.2);
      const from = clipFrom[j].clone().applyMatrix4(toReal);
      const e = sm(fly);
      m.position.lerpVectors(from, home, e);
      m.position.y += Math.sin(Math.PI * fly) * 2.0;
      const settle = pop(Wn(2, tc + T3.fly - 0.05, tc + T3.fly + 0.25));
      m.scale.setScalar(fly < 1 ? lerp(0.55, 1, e) : Math.max(1e-3, settle));
      m.rotation.z = (1 - e) * 0.6;
    });
    S_.lime = nCheck >= 3;

    // ---- the people
    passers.forEach((p, i) => {
      const F = passerAt(i, beat, t);
      p.apply(F.v);
      p.group.position.set(F.x, gy(F.x, F.z), F.z);
      p.group.rotation.set(0, F.yaw, 0);
    });
    team.visible = beat >= 2;
    checkers.forEach((p, j) => {
      const F = checkerAt(j, beat, t);
      p.apply(F.v);
      p.group.position.set(F.x, gy(F.x, F.z), F.z);
      p.group.rotation.set(0, F.yaw, 0);
      S_.clipsUp[j] = beat === 2 && t >= WIN.c3[j][1] - 0.2;
    });
    crowdHit.userData.place();
    teamHit.userData.place();
    pickable(teamHit, beat >= 2);

    // ---- bubbles: pop over their speakers in their beat (two of the vouchers' stay at the end: applyEmphasis)
    for (const b of Object.values(BUB)) {
      b.k = beat === b.beat ? pop(seg(t, b.t, b.t + 0.28)) * (b.out ? 1 - ss(t, b.out[0], b.out[1]) : 1) : 0;
      b.bub.group.position.copy(b.at);
      b.bub.group.scale.setScalar(Math.max(1e-3, b.k));
      b.bub.group.visible = b.k > 0.001;
    }

    Object.assign(S_, { beat, t });
    applyEmphasis();
    return api;
  }

  // =================================================================== emphasis by subtraction
  const SCENERY = [...plinths];
  function setDim(obj, k) {
    dim(obj, k);
    obj.traverse((o) => { if (o.isMesh && !o.userData.hitProxy) o.castShadow = k < 0.5 ? !!o.userData.cast0 : false; });
  }
  const REST = ['real', 'vouchers', 'copy'];
  function applyEmphasis() {
    const E = S_.emph;                       // null: the map (everything in plain ink); a Set: those parts full
    const map = E === null;
    const full = (id) => map || E.has(id);
    setDim(realG, full('real') ? 0 : 1);
    setDim(copyG, full('copy') ? 0 : 1);
    setDim(fx, full('copy') ? 0 : 1);
    setDim(crowd, full('vouchers') ? 0 : 1);
    setDim(team, full('checkers') ? 0 : 1);
    for (const o of SCENERY) setDim(o, map ? 0 : 1);
    // lime on the real heart once three sources agree (only in focus: on the map the result rests in plain ink)
    realPlate.material.userData.u.uAccent.value = !map && S_.lime && full('real') ? ACCENT.lime : 0;
    // the copy is teal only while AI makes it (beat 1), plain type afterwards
    const teal = !map && S_.copyTeal && full('copy') ? ACCENT.teal : 0;
    copyPlate.material.userData.u.uAccent.value = teal;
  }
  function emphasize(ids) {
    S_.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }

  // =================================================================== anchors: labels, words, hotspots, framing
  g.updateMatrixWorld(true);
  const onHeart = (grp) => (x, y, z = 0.15) => { grp.updateWorldMatrix(true, false); return grp.localToWorld(new V3(x, y, z)); };
  const onReal = onHeart(realG), onCopy = onHeart(copyG);
  const bubAt = (id) => () => {
    const b = BUB[id];
    if (!(b.k > 0.9) || !b.bub.group.visible || S_.emph === null) return null;
    b.bub.group.updateWorldMatrix(true, false);
    return b.bub.group.localToWorld(new V3(0, 0.02, 0.2));
  };
  const clipAt = (j) => () => {
    if (!S_.clipsUp[j] || !team.visible) return null;
    const c = checkers[j].clip;
    c.group.updateWorldMatrix(true, false);
    return c.group.localToWorld(new V3(0, 0.8, 0.1));
  };
  const parts = {
    // the ring high on the left lobe: the vouchers' bubbles sit on the plinth below the heart (and, seen from a low
    // camera, over its lower half), the label 真實的 on the right lobe
    real: { hit: realHit, anchor: () => onReal(-1.9, 1.0), beat: 2 },
    copy: { hit: copyHit, anchor: () => onCopy(1.2, -1.1), beat: 0 },
    checkers: { hit: teamHit, anchor: () => checkers[1].chest(), beat: 2 },
    // the ring on someone clear of the bubbles: the one in front of the wedge (before that, one in the middle)
    vouchers: { hit: crowdHit, anchor: () => passers[S_.beat >= 3 ? 1 : 2].chest(), beat: 3 },
  };
  const labelAt = {
    // on each heart's outer lobe, so the label sits beside the ？ and the ✓, not on them
    real: () => onReal(2.9, 0.6),
    copy: () => onCopy(-2.9, 0.6),
  };
  const decalAt = {
    'passer-1': bubAt('passer-1'),
    'passer-2': bubAt('passer-2'),
    'checker-1': clipAt(0),
    'checker-2': clipAt(1),
    'checker-3': clipAt(2),
    'voucher-1': bubAt('voucher-1'),
    'voucher-2': bubAt('voucher-2'),
    'voucher-3': bubAt('voucher-3'),
  };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const top = H_Y + (GLY + QH + 0.2) * Math.cos(TILT);
  const heartPts = [W(XC - HALF_W - 0.2, H_Y, 0), W(XR + HALF_W + 0.2, H_Y, 0), W(XC, top, 0), W(XR, top, 0), W(XC - 1.5, P_TOP, PL.d / 2), W(XR + 1.5, P_TOP, PL.d / 2)];
  // a person's feet, with room in front of them (the frame's foot should not shave their shoes or shadows)
  const feet = (list) => list.map(([x, z]) => W(x, gy(x, z) - 0.2, z + 1.0));
  const A_PTS = () => [...heartPts, ...feet(ST.b1), ...feet(ST.b2)];
  const B_PTS = () => [...heartPts, ...feet(CK.at), ...feet(ST.b3), ...feet(ST.b4), ...feet(CK.end)];
  const D_PTS = () => [...A_PTS(), ...B_PTS()];
  // a phone held upright has height to spare (the frame is limited by the hearts' width): a point of headroom over
  // the glyphs lowers the picture in it, so the frame's foot stays on the ground in front of the people instead of
  // reaching the sea and its boats.  Half the spare height: all of it made shot B (people from the hearts back to the
  // foreground) taller than the frame, and everyone a tenth smaller
  const portrait = () => typeof innerWidth !== 'number' || innerHeight >= innerWidth;
  // as much headroom as the screen has height to spare (a 390 × 844 phone: the most; a shorter one: less)
  const TUNE = { sky: 0.5 };
  const sky = () => W(0, top + TUNE.sky * clamp(((innerHeight - 184) / innerWidth - 1.1) * 11, 0, 6.5), -2);
  const shot = (az, el, pts) => ({ az: VIEW_AZ + az, el, anchors: pts });
  // a phone held sideways (the phone layout under 500 px tall) is limited by height instead: a lower camera lays the
  // depth of the stage (people in front, hearts behind) flatter, so everyone and the words on them stay large enough
  const phoneShot = (az, el, pts, elLand) => ({
    az: VIEW_AZ + az,
    get el() { return portrait() ? el : elLand; },
    anchors: () => (portrait() ? [...pts(), sky()] : pts()),
  });
  const shots = {
    phone: [phoneShot(-0.06, 0.66, A_PTS, 0.36), phoneShot(-0.06, 0.66, B_PTS, 0.36)],
    desk: [shot(-0.06, 0.6, D_PTS)],
  };

  function rest() { return pose(LAST, 1); }
  function ambient() { /* nothing moves by itself: the held result stays still */ }

  const api = {
    id: 'trust',
    group: g,
    zone: 'consumer',
    anchor: W(0, top + 2.5, 0),
    pin: W(XR, H_Y + Y_TOP, 0),
    // accents at full strength round the two hearts and the people in front of them
    focus: { pos: W(0, 5, 4), r: 14 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    lever: null,
    mainActor: 'vouchers',
    restParts: REST,
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { ST, CK, BUB, TUNE, relayout: placeBubbles, real: realG, copy: copyG, passers: passers.map((p) => p.group), checkers: checkers.map((p) => p.group), bubbles: Object.fromEntries(Object.entries(BUB).map(([k, b]) => [k, b.bub.group])) },
  };
  rest();
  emphasize(null);
  return api;
}
