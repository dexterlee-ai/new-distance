// 數位分身怎麼來 · how People Model is made (article 12, p.97–103) — on the meadow west of the sunflower, in six beats.
// The reader comes here right before 數位分身 (d-core.js): this district shows where the 人 in the sunflower's head come
// from, so that the head reads as people before its own story asks them anything.
//
// The camera stands where the core's does (STAGE_AZ 1.45), so the move on to 數位分身 keeps its bearing, and everything
// here stays left of the flower (the core's stage stands under its head from this side).  From the front back:
// the moderator, nearest the camera with his back to it (the reader stands behind the one who asks), with a stand
// for the report at his right; five people on stools beyond him; then a hall of two-seat desks; at its back, on two
// legs, a board.  Hall → board → flower read upward in a portrait frame, the way the twins go.
//   1  the five answer (bubbles into his clipboard), the report thumps down on the stand, they get up and walk off;
//      his new 「？」 drifts over empty stools (傳統研究問完一次，訪談對象就散了, 12 b2)
//   2  the hall fills front to back with people working through thick questionnaires; the answered pages stack up
//   3  one of them in the front row: his stack bursts into typed data points that build a figure of 人 in the seat
//      beside him (one to one, 12 b20); then the same runs through the hall and every seat gets its twin
//   4  the board rises: the sheets kept out of the training fly to its foot, the twins' answers to its face, the dots
//      fall along one diagonal, the diagonal is drawn (相關係數 0.89, 12 b69)
//   5  the people get up and go, as the five did; the twins stay: his new question flies over and every twin answers
//      at once, and a follow-up to part of them (同一群消費者，隨時都在，隨時能追問, 12 b2)
//   6  the twins lift off and stream into the sunflower's head, which fills with 人 — 五千多位數位分身 (the rest)
//
// Encoding (design §7.4): pencil = real people and real things; type (style 1, teal) = what AI makes (the data points,
// the plot's axes); the 人 band (style 0.8) = the digital twins.  Lime is the diagonal (the twins answer as the
// people do).  The seed head is drawn by this district over the core's own field, and only while it is in focus.
// Everything the reader sees is a pure function of (beat, k): pose().  No copy lives here: captions, labels, the words
// on the report and the board, and the tap lines come from world.json by part id.
// Local frame: +z toward the camera, +x the camera's right (toward the sunflower), y = 0 the ground at the origin.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { rng, clamp } from './kit.js';
import { heightAt } from './terrain.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
/** a pop: 0 → a little past 1 → 1 */
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
const YAW = Math.PI / 2 - CAM_AZ;                    // group turn: local +z → the camera
const ORIGIN = { x: -17.5, z: -5.5 };                // world xz of the local origin (the meadow west of the flower)
const HA = 4.4;                                      // the moderator (the one who asks)
const HP = 3.4;                                      // the five of beat 1
const HC = 2.8;                                      // the people in the hall, and their twins
// beat 1: the moderator stands nearest the camera with his back to it (the reader stands behind the one who asks);
// the five sit on an arc round C1 beyond him, facing him (and the reader); the stand with the report at his right
const C1 = { x: -1.1, z: 3.6, r: 2.6 };
const ASK = { x: 1.3, z: 8.5 };
const STAND = { x: 3.7, z: 6.6, w: 1.7, d: 1.2, h: 2.3 };
// the hall: rows of two-seat desks facing the camera; the person sits on the left seat, the twin comes to the right
const HALL = { x0: -13.5, pitchX: 2.3, z0: -3.6, pitchZ: 1.9, rows: 12, cols: 9, xMax: 5.8 };
const DESK = { w: 2.0, top: 0.42, near: 0.24, depth: 0.27, t: 0.035 };   // normalised by HC (the desk top in front)
const HERO = { row: 0, col: 5 };
// the board (the exam) stands at the back of the hall on two legs, over the last rows: hall → board → flower read
// upward in the frame, the way the twins go
const BOARD = { x: -1.2, z: -27.4, w: 12.5, h: 8.2, foot: 2.6, yaw: 0.05 };
// the sunflower's seed head (d-core.js at its rest): found in the scene when the world is assembled; these constants
// are the fallback (core: STAGE_AZ 1.45, the head 21 over the ground at the centre, its rest yaw 0.42 and nod 0.12)
const CORE = { az: 1.45, rise: 21, yaw: 0.42, nod: 0.12, r: 8.6, bed: 0.15 };

// ------------------------------------------------------------------ the beats
// dur = the motion; the caption lands at keyAt and is held 0.8 s + 0.2 s per 字 (story.js)
const BEATS = [
  // 1 傳統調查…問完人就散了，新問題只能等下一輪 — the five answer, the report thumps down, they leave; a 「？」, nobody
  { dur: 3.6, keyAt: 1.95, shot: 0, parts: ['asker', 'circle', 'report'] },
  // 2 電通每年調查全台 5,000 多人，每人花約 60 分鐘答數百題 — the hall fills; the answered pages stack up
  { dur: 3.8, keyAt: 1.75, shot: 1, parts: ['crowd', 'hero'] },
  // 3 每人的回答展開成約 6,900 個資料點，一比一做成數位分身 — one stack bursts into points that build a twin; then all
  { dur: 4.6, keyAt: 2.25, shot: 2, parts: ['hero', 'twin', 'data', 'twins', 'crowd'] },
  // 4 拿沒用來訓練的真人答案考它們，相關係數達 0.89 — the board rises; the kept sheets and the twins' answers meet on it
  { dur: 4.2, keyAt: 2.6, shot: 3, parts: ['board', 'twins', 'crowd'] },
  // 5 從此同一群人隨時都在… — the people leave; a new question, every twin answers at once, and a follow-up
  { dur: 4.4, keyAt: 1.8, shot: 3, parts: ['asker', 'twins'] },
  // 6 這 5,000 多位數位分身就是向日葵的種子… — the twins stream into the sunflower's head
  { dur: 4.8, keyAt: 2.75, shot: 4, parts: ['seeds', 'twins'] },
];
const LAST = BEATS.length - 1;
const REST = ['seeds', 'board'];
const ACTOR = ['asker', 'crowd', 'hero', 'twins', 'asker', 'seeds'];
// beat-local times (seconds)
const T0 = { ans: [0.0, 0.4], fly: [0.4, 0.78], thump: [0.72, 0.95], up: [0.95, 1.2], walk: [1.2, 2.75], q: [1.5, 1.8], drift: [1.85, 3.4], turn: [1.6, 2.2] };
const T1 = { rise: [0.0, 1.15], pop: 0.26, write: [0.35, 3.7] };
const T2 = { lift: [0.2, 0.42], burst: [0.38, 0.7], form: [0.95, 1.9], look: [1.95, 2.45], wave: [2.25, 3.75], wDur: 0.75 };
const T3 = { rise: [0.0, 0.55], keys: [0.35, 1.35], dots: [1.0, 2.2], line: [2.2, 2.55] };
const T4 = { up: [0.0, 0.3], leave: [0.3, 1.15], q1: [0.95, 1.2], f1: [1.2, 1.5], a1: [1.45, 1.75], b1: [1.75, 2.1], q2: [2.6, 2.85], f2: [2.85, 3.12], a2: [3.08, 3.36], b2: [3.36, 3.72] };
const T5 = { go: [0.25, 3.3], fl: 1.25, extra: [0.35, 3.5] };

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
/** bent over the desk, the head down to the booklet, both hands on the desk top (a pen in the right) */
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
/** seated upright, the head turned by yaw (the twin who looks at its person; the hero who looks at his twin) */
function turnHead(v, yaw, pitch = 0) {
  const o = clonePose(v);
  o.neck.multiply(eul(pitch * 0.4, yaw * 0.42, 0));
  o.head.multiply(eul(pitch * 0.6, yaw * 0.58, 0));
  return o;
}
/** the pose moved by (dx, dz) in its own frame (normalised): the stand moved forward, so the feet stay where they sat */
function shift(v, dx, dz) {
  const o = clonePose(v), t = new V3(dx, 0, dz);
  o.hips.p.add(t);
  for (const s of ['L', 'R']) { o.foot[s].p.add(t); o.hand[s].p.add(t); }
  return o;
}

// ------------------------------------------------------------------ geometry
/** a lathe profile [[r, y], …] bottom → top, low poly; sz squashes the depth */
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
/** a low-poly lay figure, one geometry per bone (the hall's people and twins: some hundred of each) */
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

export function buildTwins() {
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
  const layer = (name, ...objs) => { (layers[name] ||= []).push(...objs); return objs[0]; };
  const cast0 = (o) => o.traverse((m) => { if (m.isMesh) m.userData.cs0 = m.castShadow; });

  // =================================================================== the moderator (the one who asks)
  const asker = makePerson({ height: HA });
  asker.group.name = 'asker';
  const ASK_Y = gy(ASK.x, ASK.z);
  asker.group.position.set(ASK.x, ASK_Y, ASK.z);
  const ASK_FACE = Math.atan2(C1.x - ASK.x, C1.z - ASK.z) - 0.25;   // toward the five, a little turned to his right
  asker.group.rotation.y = ASK_FACE;
  asker.material.userData.u.uShadeBias.value = 0.32;
  const clip = P.makeClipboard({ w: 1.15, h: 1.5 });
  asker.hold('L', clip);
  g.add(asker.group);
  layer('asker', asker.group);
  const askerHit = P.makeHitProxy(asker.group, 0.3);
  // his questions: one bubble with a 「？」 (beat 1, and twice in beat 5)
  const qBub = P.makeBubble({ w: 1.9, h: 1.9, tail: 'left', t: 0.2 });
  const qMark = new THREE.Mesh(questionGeo(), ink({ accent: 'ink' }));
  qMark.scale.setScalar(1.25);
  qMark.position.set(0, -0.72, 0.16);
  qBub.group.add(qMark);
  qBub.group.visible = false;
  g.add(qBub.group);
  layer('asker', qBub.group);

  // =================================================================== beat 1: the five on stools, the report on its stand
  const circleG = new THREE.Group(); circleG.name = 'circle';
  g.add(circleG);
  layer('circle', circleG);
  const phi0 = Math.atan2(ASK.z - C1.z, ASK.x - C1.x);
  const five = [-1.0, -0.5, 0, 0.5, 1.0].map((d, i) => {
    const th = phi0 + Math.PI + d * 1.05;
    const x = C1.x + Math.cos(th) * C1.r, z = C1.z + Math.sin(th) * C1.r, y = gy(x, z);
    const p = makePerson({ height: HP, seated: true });
    p.group.position.set(x, y, z);
    const face = Math.atan2(ASK.x - x, ASK.z - z);
    p.group.rotation.y = face;
    p.material.userData.u.uShadeBias.value = 0.3;
    const st = P.makeStool({ h: p.seatH, r: 0.32 });
    st.group.position.set(x, y, z);
    st.group.rotation.y = face;
    circleG.add(st.group, p.group);
    // where each walks off to: away from the moderator, fanning out
    const out = th + (i - 2) * 0.12;
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
  // the moderator's stand and the report on it
  const reportG = new THREE.Group(); reportG.name = 'report';
  g.add(reportG);
  layer('report', reportG);
  const stand = P.makeTable({ w: STAND.w, d: STAND.d, h: STAND.h });
  const STAND_Y = gy(STAND.x, STAND.z);
  stand.group.position.set(STAND.x, STAND_Y, STAND.z);
  stand.group.rotation.y = -0.3;
  reportG.add(stand.group);
  const REP = { w: 1.5, d: 1.95, h: 0.55 };
  const report = new THREE.Group(); report.name = 'report-book';
  {
    const pages = new THREE.Mesh(new THREE.BoxGeometry(REP.w * 0.96, REP.h * 0.84, REP.d * 0.97).translate(0, REP.h / 2, 0), ink({ shade: 1.0, bias: 0.3 }));
    const cover = new THREE.Mesh(new THREE.BoxGeometry(REP.w, 0.06, REP.d).translate(0, REP.h - 0.03, 0), ink({ shade: 0.8, bias: 0.12 }));
    const back = new THREE.Mesh(new THREE.BoxGeometry(REP.w, 0.06, REP.d).translate(0, 0.03, 0), ink({ shade: 0.8, bias: 0.12 }));
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.1, REP.h, REP.d).translate(-REP.w / 2 + 0.05, REP.h / 2, 0), ink({ shade: 0.4 }));
    for (const o of [pages, cover, back, spine]) { o.castShadow = o.receiveShadow = true; report.add(o); }
  }
  report.position.set(0, STAND.h, 0.05);
  report.rotation.y = 0.12;
  stand.group.add(report);
  const reportHit = P.makeHitProxy(report, 0.35);

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
  const UP = shift(STANDP, 0, 0.2);
  const FRAMES = { write: WRITE, sit: SIT, half: blendPoses(WRITE, UP, 0.5), up: UP };
  const NWALK = 6;
  for (let j = 0; j < NWALK; j++) FRAMES['w' + j] = baker.pose('walk', { phase: j / NWALK, stride: 0.3 });
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

  // the seats: rows of pairs, every other row half a pair over; the hero's pair is drawn on its own
  const pairs = [];
  for (let r = 0; r < HALL.rows; r++) {
    for (let c = 0; c < HALL.cols + 1; c++) {
      const cx = HALL.x0 + c * HALL.pitchX + (r % 2 ? HALL.pitchX / 2 : 0) + (R() - 0.5) * 0.2;
      if (cx > HALL.xMax) continue;
      const cz = HALL.z0 - r * HALL.pitchZ + (R() - 0.5) * 0.15;
      if (r === HERO.row && c === HERO.col) { pairs.hero = { cx, cz, r, c }; continue; }
      // not on the bank: the meadow runs down to the water behind the hall's far left corner
      if (Math.min(gy(cx - 1.1, cz), gy(cx + 1.1, cz), gy(cx, cz - 1)) + oy < 3.2) continue;
      pairs.push({ cx, cz, r, c, y: 0, yaw: (R() - 0.5) * 0.08, ph: R(), sp: R(), jit: R() });
    }
  }
  for (const p of pairs) p.y = gy(p.cx, p.cz);
  const NP = pairs.length;
  const maxD = Math.max(...pairs.map((p) => Math.hypot(p.cx - pairs.hero.cx, p.cz - pairs.hero.cz)));
  for (const p of pairs) {
    p.d = Math.hypot(p.cx - pairs.hero.cx, p.cz - pairs.hero.cz) / maxD;
    // beat 2: the hall fills from the front back, row by row, a little ragged
    p.t1 = T1.rise[0] + (p.r / (HALL.rows - 1)) * (T1.rise[1] - T1.rise[0] - T1.pop) + p.jit * 0.08;
    // beat 3: the wave of twins runs out from the hero
    p.t2 = T2.wave[0] + p.d * (T2.wave[1] - T2.wave[0] - T2.wDur);
    // beat 5: they get up at their own moment and walk off, out of the hall to the sides and the back
    p.t4 = T4.up[0] + p.sp * 0.25;
    // (a turn away from the desk: to the right, toward the aisle, or round to the back)
    p.out = -Math.PI * (0.55 + 0.4 * p.jit);
    // beat 6: the twins lift off, the back rows first (they are the farthest from the flower… and nobody waits)
    p.t5 = T5.go[0] + (1 - p.d * 0.5 - p.sp * 0.5) * (T5.go[1] - T5.go[0] - T5.fl);
  }
  const hallG = new THREE.Group(); hallG.name = 'hall';
  g.add(hallG);
  layer('crowd', hallG);
  const deskMat = ink({ shade: 0.95, bias: 0.1 });
  const desks = new THREE.InstancedMesh(deskGeo(HC), deskMat, NP);
  desks.castShadow = desks.receiveShadow = true;
  hallG.add(desks);
  const _m = new M4(), _q = new Q(), _v = new V3(), _s = new V3(1, 1, 1);
  pairs.forEach((p, i) => { desks.setMatrixAt(i, _m.compose(_v.set(p.cx, p.y, p.cz), _q.setFromAxisAngle(YAX, p.yaw), _s.set(1, 1, 1))); });
  desks.instanceMatrix.needsUpdate = true;
  // the questionnaire in front of each, and the answered pages stacked beside it (they grow as the hour goes)
  const BK = { w: 0.44, d: 0.34, t0: 0.16, t1: 0.035 };
  const ST = { w: 0.34, d: 0.36, h: 0.62, held: 0.06 };
  const deskTop = DESK.top * HC, deskZ = (DESK.near + DESK.depth / 2) * HC;
  const pageMat = ink({ shade: 1.0, bias: 0.34 });
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(BK.w, 1, BK.d).translate(0, 0.5, 0), pageMat, NP);
  const stacks = new THREE.InstancedMesh(new THREE.BoxGeometry(ST.w, 1, ST.d).translate(0, 0.5, 0), pageMat, NP);
  for (const m of [books, stacks]) { m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); hallG.add(m); }
  // the people (one instanced mesh per baked frame) and their twins
  const folkMat = ink({ shade: 1.0, bias: 0.28, hooks: FOLK });
  folkMat.vertexColors = true;
  const FR = {};
  for (const [name, v] of Object.entries(FRAMES)) {
    const geo = bake(v);
    const mesh = new THREE.InstancedMesh(geo, folkMat, NP);
    mesh.name = 'folk-' + name;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.customDepthMaterial = folkDepth;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    FR[name] = { mesh, fade: fadeAttr(geo, NP), n: 0 };
    hallG.add(mesh);
  }
  const twinsG = new THREE.Group(); twinsG.name = 'twins-hall';
  g.add(twinsG);
  layer('twins', twinsG);
  const twinMat = ink({ style: 0.8, shade: 1.0, bias: 0.1, hooks: TWIN });
  twinMat.vertexColors = true;
  const twinGeo = bake(SIT);
  const twins = new THREE.InstancedMesh(twinGeo, twinMat, NP);
  twins.name = 'twins';
  twins.frustumCulled = false;
  twins.castShadow = false; twins.receiveShadow = true;
  twins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const twinFade = fadeAttr(twinGeo, NP);
  twinsG.add(twins);

  // =================================================================== the hero: one of them, drawn whole, and his twin
  const H0 = pairs.hero;
  H0.y = gy(H0.cx, H0.cz);
  const heroG = new THREE.Group(); heroG.name = 'hero-set';
  heroG.position.set(H0.cx, H0.y, H0.cz);
  g.add(heroG);
  layer('hero', heroG);
  const heroDesk = new THREE.Mesh(deskGeo(HC), ink({ shade: 0.95, bias: 0.1 }));
  heroDesk.castShadow = heroDesk.receiveShadow = true;
  heroG.add(heroDesk);
  const hero = makePerson({ height: HC, seated: true });
  hero.group.name = 'hero';
  hero.group.position.set(-0.5, 0, 0);
  hero.material.userData.u.uShadeBias.value = 0.3;
  heroG.add(hero.group);
  const heroMat = ink({ shade: 1.0, bias: 0.34 });
  const heroBook = new THREE.Mesh(new THREE.BoxGeometry(BK.w, 1, BK.d).translate(0, 0.5, 0), heroMat);
  heroBook.position.set(-0.45, deskTop, deskZ);
  const heroStack = new THREE.Mesh(new THREE.BoxGeometry(ST.w, 1, ST.d).translate(0, 0.5, 0), heroMat);
  heroStack.position.set(-0.84, deskTop, deskZ);
  for (const o of [heroBook, heroStack]) { o.castShadow = o.receiveShadow = true; heroG.add(o); }
  const heroHit = P.makeHitProxy(hero.group, 0.3);
  // his twin: the same figure, in the 人 band
  const twinG = new THREE.Group(); twinG.name = 'twin-set';
  heroG.add(twinG);
  layer('twin', twinG);
  const twin = makePerson({ height: HC, seated: true });
  twin.group.name = 'twin';
  twin.group.position.set(0.5, 0, 0);
  {
    const u = twin.material.userData.u;
    u.uStyle.value = 0.8; u.uShadeMul.value = 0.36; u.uShadeBias.value = 0.05;
  }
  twinG.add(twin.group);
  const twinHit = P.makeHitProxy(twin.group, 0.3);

  // =================================================================== the data points (typed, teal)
  const NDH = 420, NDW = 4;                          // the hero's, and four per seat for the wave
  const ND = NDH + NP * NDW;
  const dataG = new THREE.Group(); dataG.name = 'data';
  g.add(dataG);
  layer('data', dataG);
  const dataMat = ink({ style: 1, shade: 0.5, accent: 'teal', focus: false });
  const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.075, 0.075), dataMat, ND);
  dots.frustumCulled = false;
  dots.castShadow = false;
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dataG.add(dots);
  // targets on the twin's body: points of its baked figure (the hero's twin sits at the same place and pose)
  const tPos = twinGeo.attributes.position;
  const D = [];
  for (let i = 0; i < NDH; i++) {
    const vi = Math.floor(R() * tPos.count);
    D.push({ tx: tPos.getX(vi), ty: tPos.getY(vi), tz: tPos.getZ(vi), a: R() * Math.PI * 2, r: 0.35 + R() * 0.6, h: 0.3 + R() * 1.0, t0: T2.burst[0] + R() * 0.32, fl: 0.68 + R() * 0.45, sp: R() });
  }

  // =================================================================== the board (the exam)
  const boardG = new THREE.Group(); boardG.name = 'board';
  const BOARD_Y = gy(BOARD.x, BOARD.z);
  boardG.position.set(BOARD.x, BOARD_Y, BOARD.z);
  boardG.rotation.y = BOARD.yaw;
  g.add(boardG);
  layer('board', boardG);
  const panel = new THREE.Group(); panel.name = 'panel';
  boardG.add(panel);
  const PL = { x0: -BOARD.w / 2 + 1.25, x1: BOARD.w / 2 - 0.6, y0: 1.05, y1: BOARD.h - 0.65 };   // the plot area (panel frame)
  {
    const face = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, BOARD.h, 0.16).translate(0, BOARD.h / 2, 0), ink({ shade: 1.0, bias: 0.36 }));
    face.castShadow = face.receiveShadow = true;
    panel.add(face);
    const rim = new THREE.Mesh(mergeGeometries([
      new THREE.BoxGeometry(BOARD.w + 0.2, 0.16, 0.24).translate(0, BOARD.h, 0), new THREE.BoxGeometry(BOARD.w + 0.2, 0.16, 0.24).translate(0, 0, 0),
      new THREE.BoxGeometry(0.16, BOARD.h, 0.24).translate(-BOARD.w / 2 - 0.02, BOARD.h / 2, 0), new THREE.BoxGeometry(0.16, BOARD.h, 0.24).translate(BOARD.w / 2 + 0.02, BOARD.h / 2, 0),
    ].map(strip)), ink({ shade: 0.6, bias: 0.05 }));
    rim.castShadow = true;
    panel.add(rim);
  }
  // the axes (typed, teal: a machine's plot) and a light grid
  const axisMat = ink({ style: 1, shade: 0.45, accent: 'teal', focus: false });
  const axes = new THREE.Mesh(mergeGeometries([
    new THREE.BoxGeometry(PL.x1 - PL.x0 + 0.1, 0.09, 0.06).translate((PL.x0 + PL.x1) / 2, PL.y0, 0.11),
    new THREE.BoxGeometry(0.09, PL.y1 - PL.y0 + 0.1, 0.06).translate(PL.x0, (PL.y0 + PL.y1) / 2, 0.11),
    ...[0.25, 0.5, 0.75, 1].map((k) => new THREE.BoxGeometry(0.06, 0.24, 0.06).translate(lerp(PL.x0, PL.x1, k), PL.y0 - 0.12, 0.11)),
    ...[0.25, 0.5, 0.75, 1].map((k) => new THREE.BoxGeometry(0.24, 0.06, 0.06).translate(PL.x0 - 0.12, lerp(PL.y0, PL.y1, k), 0.11)),
  ].map(strip)), axisMat);
  panel.add(axes);
  // the diagonal: where the twins' answers equal the people's (lime once it is drawn and the board is the subject)
  const diagLen = Math.hypot(PL.x1 - PL.x0, PL.y1 - PL.y0), diagA = Math.atan2(PL.y1 - PL.y0, PL.x1 - PL.x0);
  const diagMat = ink({ shade: 0.5, bias: 0.05, focus: false });
  const diag = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 0.05).translate(0.5, 0, 0), diagMat);
  diag.position.set(PL.x0, PL.y0, 0.13);
  diag.rotation.z = diagA;
  panel.add(diag);
  // the dots on the plot (solid ink), and the people's kept sheets as small ticks under the axis
  const NB = 96;
  const plotMat = ink({ shade: 0.1, bias: 0.0 });   // dark pencil discs: dimmed, they stay as their outlines
  const plot = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 8).rotateX(Math.PI / 2), plotMat, NB);
  plot.frustumCulled = false; plot.castShadow = false;
  plot.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  panel.add(plot);
  const keyMat = ink({ shade: 1.0, bias: 0.3 });
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.3, 0.03), keyMat, NB);
  keys.frustumCulled = false; keys.castShadow = false;
  keys.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  g.add(keys);
  layer('board', keys);
  // each dot: the person it comes from (its kept sheet) and the twin beside them (its answer); x = the person's
  // answer, y = the twin's — close to it, as the book's plot (r 0.89: a band along the diagonal, a few far off)
  const B = [];
  for (let i = 0; i < NB; i++) {
    const src = pairs[Math.floor(R() * NP)];
    const x = 0.04 + 0.92 * Math.pow(R(), 0.85);
    const far = R() < 0.1;
    const y = clamp(x + (far ? (R() - 0.5) * 0.55 : (R() + R() + R() - 1.5) * 0.11), 0.03, 0.98);
    B.push({ src, x, y, t0: T3.keys[0] + R() * 0.55, t1: T3.dots[0] + (i / NB) * (T3.dots[1] - T3.dots[0] - 0.45) + R() * 0.1 });
  }
  const boardHit = P.makeHitProxy(panel, 0.25);

  // =================================================================== beat 5: the twins' answers (small bubbles)
  const NA = NP * 2;
  const ansG = new THREE.Group(); ansG.name = 'answers';
  g.add(ansG);
  layer('twins', ansG);
  const ansGeo = P.makeBubble({ w: 1.45, h: 0.95, tail: 'left', t: 0.14 }).mesh.geometry;
  const ans = new THREE.InstancedMesh(ansGeo, ink({ shade: 1.0, bias: 0.3 }), NA);
  ans.frustumCulled = false; ans.castShadow = false;
  ans.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ansG.add(ans);
  // the follow-up is put to part of them (a target group): the left of the hall
  for (const p of pairs) p.follow = p.cx < -4;

  // =================================================================== beat 6: the sunflower's seed head
  const seedsG = new THREE.Group(); seedsG.name = 'seeds';
  g.add(seedsG);
  layer('seeds', seedsG);
  const FILL = { value: 0 };
  const SEED = {
    key: 'twins-seeds',
    fOut: `{
  vec2 p = vLPos.xy / ${CORE.r.toFixed(2)};
  float h = dHash(floor(vLPos.xy * 1.45) + 5.7);
  if (h > uFill * 1.04 - 0.02 || length(p) > 1.0) discard;
  float D = 0.84 + (dHash(floor(vLPos.xy * 1.3) + 3.1) - 0.5) * 0.1;
  sh = clamp(1.0 - D, 0.0, 1.0);
}`,
  };
  const seedDisk = new THREE.Mesh(new THREE.CircleGeometry(CORE.r, 72), ink({ style: 0.8, hooks: SEED, uniforms: { uFill: FILL } }));
  seedDisk.name = 'seed-head';
  seedDisk.receiveShadow = false; seedDisk.castShadow = false;
  seedDisk.visible = false;
  seedsG.add(seedDisk);
  const NX = 520;                                     // the rest of the five thousand, streaming in with them
  const extraMat = ink({ style: 0.8, shade: 0.2, bias: 0.02, focus: false });
  const extras = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), extraMat, NX);
  extras.frustumCulled = false; extras.castShadow = false;
  extras.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  seedsG.add(extras);
  const X = [];
  for (let i = 0; i < NX; i++) {
    // from beyond the hall (its far side and both flanks): the people the frame does not hold
    const side = R();
    const sx = side < 0.4 ? lerp(-12, 5, R()) : side < 0.7 ? -14.5 - R() * 5 : lerp(-13, 5.5, R());
    const sz = side < 0.4 ? -25 - R() * 5 : side < 0.7 ? lerp(-20, 1, R()) : -4 - R() * 19;
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.95;
    X.push({ sx, sz, sy: gy(sx, sz) + 1.2, hx: Math.cos(a) * rr, hy: Math.sin(a) * rr, t0: T5.extra[0] + R() * (T5.extra[1] - T5.extra[0] - 1.4), fl: 1.1 + R() * 0.4, lift: 3 + R() * 4 });
  }
  // where each twin of the hall lands on the head (disk coordinates, −1 … 1)
  for (const p of pairs) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.92; p.hx = Math.cos(a) * rr; p.hy = Math.sin(a) * rr; }
  const heroSeed = { hx: -0.2, hy: -0.35 };
  // the head's frame in this group's local frame: from the core's own head once the world is assembled (it rests
  // there whenever this district is in focus), else from the constants
  const headM = new M4();
  let headFound = false;
  function coreHead() {
    if (headFound) return;
    const scene = g.parent;
    let bed = null;
    scene?.getObjectByName?.('core')?.traverse((o) => { if (!bed && o.isMesh && o.material?.userData?.u?.uBed) bed = o; });
    g.updateMatrixWorld(true);
    const inv = new M4().copy(g.matrixWorld).invert();
    if (bed) {
      bed.updateWorldMatrix(true, false);
      headM.copy(inv).multiply(bed.matrixWorld);
      headFound = true;
    } else {
      const gc = new M4().makeRotationY(Math.PI / 2 - CORE.az);
      const pv = new M4().compose(new V3(0, heightAt(0, 0) + CORE.rise, 0), new Q().setFromAxisAngle(YAX, CORE.yaw), new V3(1, 1, 1));
      const nod = new M4().makeRotationX(CORE.nod);
      const bz = new M4().makeTranslation(0, 0, CORE.bed);
      headM.copy(inv).multiply(gc).multiply(pv).multiply(nod).multiply(bz);
    }
    seedDisk.matrixAutoUpdate = false;
    seedDisk.matrix.copy(headM).multiply(new M4().makeTranslation(0, 0, 0.22));
    seedDisk.matrixWorldNeedsUpdate = true;
  }
  /** a point on the head (disk coordinates −1 … 1, lifted off it by z), in the local frame */
  const onHead = (hx, hy, z = 0.3, out = new V3()) => out.set(hx * CORE.r, hy * CORE.r, CORE.bed + z).applyMatrix4(headM);
  coreHead();
  const seedHit = new THREE.Mesh(new THREE.CylinderGeometry(CORE.r + 0.6, CORE.r + 0.6, 1.2, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
  seedHit.userData.hitProxy = true;
  seedHit.matrixAutoUpdate = false;
  seedsG.add(seedHit);
  const placeSeedHit = () => { seedHit.matrix.copy(headM); seedHit.matrixWorldNeedsUpdate = true; };
  placeSeedHit();

  // =================================================================== hit proxies for the hall and its twins
  const boxProxy = (name, min, max) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
    m.name = 'hit:' + name; m.userData.hitProxy = true;
    m.scale.set(max.x - min.x, max.y - min.y, max.z - min.z);
    m.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    g.add(m);
    return m;
  };
  const hallMin = new V3(HALL.x0 - 1.2, -0.2, HALL.z0 - (HALL.rows - 1) * HALL.pitchZ - 0.6), hallMax = new V3(HALL.xMax + 1.2, HC * 0.85, HALL.z0 + 1.5);
  const crowdHit = boxProxy('crowd', hallMin, hallMax);
  const twinsHit = boxProxy('twins', hallMin, hallMax);
  // a proxy answers only while its part is on the ground: the hall's people until they leave, the hero likewise
  const proxyScale = (m, on) => { m.userData.s0 ||= m.scale.clone(); if (on) m.scale.copy(m.userData.s0); else m.scale.setScalar(1e-4); m.updateMatrixWorld(true); };

  for (const o of [g]) cast0(o);

  // =================================================================== pose: (beat, k) → everything
  const S_ = { beat: LAST, k: 1, t: 0, emph: null, qShown: false, cards: false, fill: 0, diag: 0, people: true };
  // fades that come and go with the motion (someone leaving, a twin coming into being): applied on top of the part's dim
  const FADES = new Map();   // figure (Object3D) → [layer, k]
  const fade = (obj, layerName, k) => FADES.set(obj, [layerName, k]);
  const tv = new V3(), tv2 = new V3(), tq = new Q();
  /** a figure of the hall, put into the instanced mesh of its frame */
  function putFolk(frame, i, pos, yaw, fade) {
    const F = FR[frame];
    const j = F.n++;
    F.mesh.setMatrixAt(j, _m.compose(pos, tq.setFromAxisAngle(YAX, yaw), _s.set(1, 1, 1)));
    F.fade.setX(j, fade);
  }
  function walkFrame(dist) { const ph = (dist / (2 * 0.3 * HC)) % 1; return 'w' + (Math.floor(ph * NWALK) % NWALK); }

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    coreHead();
    placeSeedHit();
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i */
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : clamp((t - a) / (z - a)));
    S_.beat = beat; S_.k = k; S_.t = t;

    // ---- the moderator: holds his clipboard; lifts it when he asks (beats 1 and 5); turns to the flower (beat 6)
    {
      const ask1 = beat === 0 ? ss(t, T0.q[0] - 0.2, T0.q[1]) * (1 - ss(t, T0.drift[1] - 0.6, T0.drift[1])) : 0;
      const ask5 = beat === 4 ? Math.max(ss(t, T4.q1[0] - 0.25, T4.q1[1]) * (1 - ss(t, T4.b1[1], T4.b1[1] + 0.3)), ss(t, T4.q2[0] - 0.25, T4.q2[1]) * (1 - ss(t, T4.b2[1], T4.b2[1] + 0.3))) : 0;
      const raise = Math.max(ask1, ask5);
      const look = beat === LAST ? ss(t, 0.3, 1.4) : 0;
      if (look > 0) asker.setPose('watch', look, { yaw: 1.15, pitch: -0.35, from: 'hold' });
      else asker.setPose('raise', raise, { side: 'L', from: 'hold' });
      // beat 1: he turns his head to the empty stools as the question comes
      if (beat === 0) {
        const tn = ss(t, T0.turn[0], T0.turn[1]);
        if (tn > 0) asker.joints.head.rotateY(-0.5 * tn);
      }
    }

    asker.group.updateMatrixWorld(true);
    const clipAt = g.worldToLocal(clip.group.localToWorld(new V3(0, 0.9, 0.1)));
    // ---- beat 1: the five answer (bubbles), the answers go into the clipboard, the report thumps down, they leave
    S_.qShown = false;
    five.forEach((f, i) => {
      const a = Wn(0, T0.ans[0] + i * 0.06, T0.ans[0] + i * 0.06 + 0.22);
      const fl = Wn(0, T0.fly[0] + i * 0.04, T0.fly[1]);
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
        fade(f.p.group, 'circle', beat === 0 ? ss(t, T0.walk[1] - 0.85, T0.walk[1] - 0.05) : 1);
      }
    });
    // the report: drops onto the stand with a thump (squash), and stays there (the report does not change again)
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
    // the question: pops above the moderator (beat 1: and drifts over the empty stools; beat 5: flies into the hall)
    {
      const at = tv.set(ASK.x - 1.4, ASK_Y + HA + 2.2, ASK.z - 0.6);
      let vis = false, s = 0;
      qBub.group.position.copy(at);
      qBub.group.rotation.set(0, -0.25, 0);
      if (beat === 0) {
        const a = seg(t, T0.q[0], T0.q[1]);
        vis = a > 0;
        s = pop(a);
        const dr = ss(t, T0.drift[0], T0.drift[1]);
        // over the empty stools, where the five were: it bobs there, nobody answers
        qBub.group.position.lerpVectors(at, tv2.set(C1.x + 0.6, gy(C1.x, C1.z) + HP + 1.2, C1.z), dr);
        qBub.group.position.y += Math.sin(t * 4.2) * 0.12 * dr;
      } else if (beat === 4) {
        for (const [q, f] of [[T4.q1, T4.f1], [T4.q2, T4.f2]]) {
          const a = seg(t, q[0], q[1]), b = seg(t, f[0], f[1]);
          if (a > 0 && b < 1) {
            vis = true;
            s = pop(a) * (1 - sm(seg(b, 0.6, 1))) * lerp(1, 1.5, sm(b));
            const to = f === T4.f2 ? tv2.set(-8.5, HC + 3, -11) : tv2.set(-3.5, HC + 3, -12);
            qBub.group.position.lerpVectors(at, to, sm(b));
            qBub.group.position.y += Math.sin(Math.PI * b) * 2.4;
          }
        }
      }
      qBub.group.visible = vis && s > 0.01;
      qBub.group.scale.setScalar(Math.max(1e-3, s));
      S_.qShown = qBub.group.visible;
    }

    // ---- the hall (beats 2–6)
    for (const F of Object.values(FR)) F.n = 0;
    S_.people = beat < 4 || (beat === 4 && t < T4.leave[1]);
    pairs.forEach((p, i) => {
      // seated from beat 2 (each at its moment: the hall fills from the front)
      const rise = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, p.t1, p.t1 + T1.pop);
      const px = p.cx - 0.5, base = tv.set(px, p.y, p.cz);
      const wr = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, T1.write[0] + p.jit * 0.2, T1.write[1]);
      // the answered pages: stacked by beat 2's end; in beat 3 the stack turns into points (a thin sheaf is kept back);
      // in beat 4 the kept sheaf flies to the board
      const conv = beat < 2 ? 0 : beat > 2 ? 1 : seg(t, p.t2, p.t2 + 0.3);
      const stackH = rise > 0 ? lerp(0.02, ST.h, wr) * (1 - conv) + ST.held * conv : 0;
      const keptGone = beat > 3 || (beat === 3 && B.some((b) => b.src === p && t >= b.t0)) ? 1 : 0;
      // the booklet thins as its pages move to the stack
      const bt = lerp(BK.t0, BK.t1, wr);
      const show = rise > 0;
      const desk = (dx, dz) => _v.set(p.cx + dx * Math.cos(p.yaw) + dz * Math.sin(p.yaw), p.y + deskTop, p.cz - dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw));
      const pp = pop(rise);
      books.setMatrixAt(i, _m.compose(desk(-0.45, deskZ), _q.setFromAxisAngle(YAX, p.yaw), _s.set(show ? 1 : 1e-4, Math.max(1e-4, bt * pp), show ? 1 : 1e-4)));
      const sh = keptGone && beat >= 3 ? 1e-4 : stackH;
      stacks.setMatrixAt(i, _m.compose(desk(-0.84, deskZ), _q.setFromAxisAngle(YAX, p.yaw), _s.set(show ? 1 : 1e-4, Math.max(1e-4, sh * pp), show ? 1 : 1e-4)));
      desks.setMatrixAt(i, _m.compose(_v.set(p.cx, p.y - (1 - pp) * 1.2, p.cz), _q.setFromAxisAngle(YAX, p.yaw), _s.set(1, Math.max(1e-3, pp), 1)));
      // the person: writing from the moment the hall fills; in beat 5 up and away, gone after
      if (show && S_.people) {
        let fd = sm(rise * 1.6);
        if (beat === 4) {
          // up from the bench, half a turn and a step away, gone: the seat beside the twin is empty
          const up = seg(t, p.t4, p.t4 + 0.26), wk = seg(t, p.t4 + 0.26, T4.leave[1] + p.sp * 0.05);
          if (wk <= 0) putFolk(up <= 0 ? 'write' : up < 0.5 ? 'half' : 'up', i, base, p.yaw, 1);
          else {
            const yawW = p.yaw + p.out * sm(seg(wk, 0, 0.4));
            const dist = 0.9 * sm(seg(wk, 0.25, 1));
            const x = px + 0.2 * Math.sin(yawW) + Math.sin(yawW) * dist, z = p.cz + 0.2 * Math.cos(yawW) + Math.cos(yawW) * dist;
            fd = 1 - sm(seg(wk, 0.35, 1));
            if (fd > 0.3) putFolk(wk < 0.25 ? 'up' : walkFrame(dist), i, tv2.set(x, gy(x, z), z), yawW, fd);
          }
        } else putFolk('write', i, base, p.yaw, fd);
      }
      // the twin: comes in the wave (beat 3), answers (beat 5), flies to the flower (beat 6)
      let tw = beat < 2 ? 0 : beat > 2 ? 1 : seg(t, p.t2 + 0.15, p.t2 + T2.wDur);
      const tpos = tv2.set(p.cx + 0.5 * Math.cos(p.yaw), p.y, p.cz - 0.5 * Math.sin(p.yaw));
      let tsc = 1, tyaw = p.yaw;
      if (beat === LAST) {
        const u = seg(t, p.t5, p.t5 + T5.fl);
        if (u > 0) {
          const end = onHead(p.hx, p.hy, 0.35, new V3());
          const st = tpos.clone(), lift = st.clone().add(new V3(0, 3.2 + p.sp * 2, 0));
          const e = u * u * (3 - 2 * u);
          // up out of the seat, then an arc over to the head
          const mid = lift.clone().lerp(end, 0.5).add(new V3(0, 4 + p.jit * 3, 0));
          const a0 = (1 - e) * (1 - e), a1 = 2 * (1 - e) * e, a2 = e * e;
          tpos.set(a0 * lift.x + a1 * mid.x + a2 * end.x, a0 * lift.y + a1 * mid.y + a2 * end.y, a0 * lift.z + a1 * mid.z + a2 * end.z);
          const up0 = sm(seg(u, 0, 0.18));
          tpos.lerpVectors(st, tpos, up0);
          tsc = lerp(1, 0.22, sm(seg(u, 0.25, 0.95)));
          tyaw = p.yaw + u * 1.5;
          if (u >= 1) tw = 0;
        }
      }
      twins.setMatrixAt(i, _m.compose(tpos, tq.setFromAxisAngle(YAX, tyaw), _s.setScalar(Math.max(1e-4, tw > 0 ? tsc : 1e-4))));
      twinFade.setX(i, 0.3 + 0.7 * sm(tw * 1.25));
      // the wave's points: from the stack to the twin's seat
      for (let j = 0; j < NDW; j++) {
        const di = NDH + i * NDW + j;
        let s = 0;
        if (beat === 2) {
          const u = seg(t, p.t2 + j * 0.05, p.t2 + 0.4 + j * 0.05);
          if (u > 0 && u < 1) {
            const from = desk(-0.84, deskZ).clone().add(new V3(0, 0.5, 0)), to = tv2.clone().add(new V3(0, 0.6 * HC, 0));
            _v.lerpVectors(from, to, u);
            _v.y += Math.sin(Math.PI * u) * (0.7 + j * 0.2);
            s = 1.6;
            dots.setMatrixAt(di, _m.compose(_v, _q.identity(), _s.setScalar(s)));
            continue;
          }
        }
        dots.setMatrixAt(di, _m.compose(_v.set(p.cx, p.y, p.cz), _q.identity(), _s.setScalar(1e-4)));
      }
    });
    for (const F of Object.values(FR)) { F.mesh.count = F.n; F.mesh.instanceMatrix.needsUpdate = true; F.fade.needsUpdate = true; }
    // the hall answers as its people until they have left, then as their twins
    proxyScale(crowdHit, beat >= 1 && beat <= 3);
    proxyScale(twinsHit, beat >= 2);
    for (const m of [books, stacks, desks, twins, dots]) m.instanceMatrix.needsUpdate = true;
    twinFade.needsUpdate = true;
    desks.visible = beat >= 1;
    books.visible = stacks.visible = beat >= 1;

    // ---- the hero and his twin
    {
      const rise = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, T1.rise[0], T1.rise[0] + T1.pop);
      const pp = pop(rise);
      heroG.visible = rise > 0;
      heroG.scale.set(1, Math.max(1e-3, pp), 1);
      const wr = beat < 1 ? 0 : beat > 1 ? 1 : seg(t, T1.write[0], T1.write[1]);
      const lift = Wn(2, T2.lift[0], T2.lift[1]);
      const burst = Wn(2, T2.burst[0], T2.burst[1]);
      heroBook.scale.set(1, lerp(BK.t0, BK.t1, wr), 1);
      // his stack lifts a little, then turns into points; a thin sheaf (the part kept out of the training) stays
      const sh = lerp(0.02, ST.h, wr);
      const kept = beat > 3 || (beat === 3 && t >= T3.keys[0]) ? 0 : 1;
      heroStack.visible = beat < 2 || burst < 1 || kept > 0;
      heroStack.scale.set(1, Math.max(1e-3, burst >= 1 ? ST.held * kept : sh * (1 - 0.85 * burst)), 1);
      heroStack.position.y = deskTop + lift * 0.35 * (1 - burst);
      // beat 3: he sits up and looks at his twin; beat 5: he gets up and leaves with the others
      const look = Wn(2, T2.look[0], T2.look[1]);
      const lv = turnHead(SIT, 0.9, 0.05);
      hero.group.visible = true;
      if (beat < 2) hero.apply(WRITE);
      else if (beat < 4) hero.apply(blendPoses(WRITE, lv, sm(look)));
      hero.group.position.set(-0.5, 0, 0);
      hero.group.rotation.y = 0;
      let hf = 0;
      if (beat === 4) {
        const up = seg(t, 0.05, 0.31), wk = seg(t, 0.31, T4.leave[1] - 0.1);
        if (wk <= 0) hero.apply(blendPoses(lv, UP, sm(up)));
        else {
          const yawW = -Math.PI * 0.75 * sm(seg(wk, 0, 0.4)), dist = 0.9 * sm(seg(wk, 0.25, 1));
          hero.group.rotation.y = yawW;
          hero.group.position.set(-0.5 + (0.2 + dist) * Math.sin(yawW), 0, (0.2 + dist) * Math.cos(yawW));
          hero.setPose(wk < 0.25 ? 'stand' : 'walk', 1, { dist, stride: 0.3 * HC });
        }
        hf = ss(wk, 0.35, 1);
        if (wk >= 1) hero.group.visible = false;
      } else if (beat > 4) hero.group.visible = false;
      fade(hero.group, 'hero', hf);
      proxyScale(heroHit, hero.group.visible && heroG.visible);
      // his twin: built up by the points (beat 3), looks back at him, answers and flies with the others
      const form = Wn(2, T2.form[0], T2.form[1]);
      twin.group.visible = form > 0 && !(beat === LAST && t >= T5.go[0] + 0.2);
      twin.apply(beat >= 2 ? turnHead(SIT, -0.7 * sm(Wn(2, T2.look[0], T2.look[1])) * (beat < 4 ? 1 : 0), 0.05) : SIT);
      twin.group.scale.set(1, Math.max(1e-3, beat > 2 ? 1 : sm(Math.min(1, form * 1.25))), 1);
      fade(twin.group, 'twin', beat === 2 ? 1 - sm(Math.min(1, form * 1.6)) : twin.group.visible ? 0 : 1);
    }
    // ---- the hero's points: out of his stack in a swirl, onto his twin's body
    for (let i = 0; i < NDH; i++) {
      const d = D[i];
      let s = 0;
      if (beat === 2) {
        const u = seg(t, d.t0, d.t0 + d.fl);
        if (u > 0 && u < 1) {
          const from = new V3(H0.cx - 0.84, H0.y + deskTop + ST.h * 0.6, H0.cz + deskZ);
          const to = new V3(H0.cx + 0.5 + d.tx, H0.y + d.ty, H0.cz + d.tz);
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
    dots.visible = beat === 2;

    // ---- the board (beat 4): it rises; the kept sheets fly to its foot, the twins' answers to its face
    {
      const up = Wn(3, T3.rise[0], T3.rise[1]);
      boardG.visible = up > 0;
      boardG.position.y = BOARD_Y - (1 - eo(up)) * (BOARD.h + BOARD.foot);
      panel.position.y = BOARD.foot;
      const dl = Wn(3, T3.line[0], T3.line[1]);
      diag.visible = dl > 0;
      diag.scale.x = Math.max(1e-3, diagLen * eo(dl));
      S_.diag = dl;
      g.updateMatrixWorld(true);
      panel.updateMatrixWorld(true);
      const inv = new M4().copy(g.matrixWorld).invert().multiply(panel.matrixWorld);
      B.forEach((b, i) => {
        const P0 = new V3(lerp(PL.x0, PL.x1, b.x), PL.y0 - 0.45, 0.2).applyMatrix4(inv);
        // the kept sheet: from the person's desk to the foot of the plot
        const u = beat < 3 ? 0 : beat > 3 ? 1 : seg(t, b.t0, b.t0 + 0.7);
        const from = new V3(b.src.cx - 0.84, b.src.y + deskTop + 0.2, b.src.cz + deskZ);
        if (u > 0 && u < 1) {
          const e = u * u * (3 - 2 * u);
          _v.lerpVectors(from, P0, e); _v.y += Math.sin(Math.PI * u) * 3.2;
          keys.setMatrixAt(i, _m.compose(_v, tq.setFromAxisAngle(YAX, BOARD.yaw + u * 2), _s.setScalar(1)));
        } else if (u >= 1) keys.setMatrixAt(i, _m.compose(P0, tq.setFromAxisAngle(YAX, BOARD.yaw), _s.set(0.5, 0.5, 1)));
        else keys.setMatrixAt(i, _m.compose(from, _q.identity(), _s.setScalar(1e-4)));
        // the twin's answer: from the twin beside them up to its place over that tick
        const v = beat < 3 ? 0 : beat > 3 ? 1 : seg(t, b.t1, b.t1 + 0.55);
        const Pl = new V3(lerp(PL.x0, PL.x1, b.x), lerp(PL.y0, PL.y1, b.y), 0.16);
        if (v > 0 && v < 1) {
          const e = v * v * (3 - 2 * v);
          const fromT = new V3(b.src.cx + 0.5, b.src.y + HC * 0.7, b.src.cz);
          _v.lerpVectors(fromT, Pl.clone().applyMatrix4(inv), e); _v.y += Math.sin(Math.PI * v) * 2.5;
          // in flight it is a point in the group's frame: put it on the panel by converting back
          const loc = _v.clone().applyMatrix4(new M4().copy(inv).invert());
          plot.setMatrixAt(i, _m.compose(loc, _q.identity(), _s.setScalar(1.4)));
        } else if (v >= 1) plot.setMatrixAt(i, _m.compose(Pl, _q.identity(), _s.setScalar(1)));
        else plot.setMatrixAt(i, _m.compose(Pl, _q.identity(), _s.setScalar(1e-4)));
      });
      keys.instanceMatrix.needsUpdate = true;
      plot.instanceMatrix.needsUpdate = true;
      keys.visible = beat >= 3;
      proxyScale(boardHit, beat >= 3);
    }

    // ---- beat 5: every twin answers at once (and the follow-up: a part of them)
    {
      const at = clipAt;
      let n = 0;
      pairs.forEach((p, i) => {
        for (let w = 0; w < 2; w++) {
          const j = i * 2 + w;
          let s = 0;
          if (beat === 4 && (w === 0 || p.follow)) {
            const A = w ? T4.a2 : T4.a1, Bk = w ? T4.b2 : T4.b1;
            const a = seg(t, A[0] + p.d * 0.15, A[0] + p.d * 0.15 + 0.16), b = seg(t, Bk[0] + p.sp * 0.1, Bk[1]);
            if (a > 0 && b < 1) {
              const from = new V3(p.cx + 0.5, p.y + HC * 1.05 + 0.3, p.cz);
              _v.lerpVectors(from, at, sm(b));
              _v.y += Math.sin(Math.PI * b) * 1.5;
              s = pop(a) * (1 - sm(seg(b, 0.7, 1)));
              ans.setMatrixAt(j, _m.compose(_v, tq.setFromAxisAngle(YAX, 0.2), _s.setScalar(Math.max(1e-4, s))));
              n++;
              continue;
            }
          }
          ans.setMatrixAt(j, _m.compose(_v.set(p.cx, p.y, p.cz), _q.identity(), _s.setScalar(1e-4)));
        }
      });
      ans.instanceMatrix.needsUpdate = true;
      ans.visible = n > 0;
    }

    // ---- beat 6: the twins and the rest of them stream into the head, which fills with 人
    {
      let landed = 0, all = 0;
      if (beat === LAST) {
        for (const p of pairs) { all++; if (t >= p.t5 + T5.fl) landed++; }
      }
      X.forEach((x, i) => {
        let s = 0;
        if (beat === LAST) {
          all++;
          const u = seg(t, x.t0, x.t0 + x.fl);
          if (u >= 1) landed++;
          if (u > 0 && u < 1) {
            const end = onHead(x.hx, x.hy, 0.35, new V3());
            const st = new V3(x.sx, x.sy, x.sz);
            const mid = st.clone().lerp(end, 0.5).add(new V3(0, x.lift + 3, 0));
            const e = u * u * (3 - 2 * u), a0 = (1 - e) * (1 - e), a1 = 2 * (1 - e) * e, a2 = e * e;
            _v.set(a0 * st.x + a1 * mid.x + a2 * end.x, a0 * st.y + a1 * mid.y + a2 * end.y, a0 * st.z + a1 * mid.z + a2 * end.z);
            s = Math.min(1, u / 0.15) * lerp(1, 0.55, e);
            extras.setMatrixAt(i, _m.compose(_v, _q.identity(), _s.setScalar(s)));
            return;
          }
        }
        extras.setMatrixAt(i, _m.compose(_v.set(x.sx, x.sy, x.sz), _q.identity(), _s.setScalar(1e-4)));
      });
      extras.instanceMatrix.needsUpdate = true;
      extras.visible = beat === LAST;
      const fill = beat < LAST ? 0 : k >= 1 ? 1 : all ? landed / all : 0;
      FILL.value = fill;
      S_.fill = fill;
      seedDisk.visible = fill > 0.001;
    }
    applyEmphasis();
    return api;
  }

  // =================================================================== emphasis by subtraction
  // which dim groups each part keeps at full strength
  const FULL = {
    asker: ['asker'], circle: ['circle', 'asker'], report: ['report'],
    crowd: ['crowd', 'hero'], hero: ['hero'], twin: ['twin', 'data'], data: ['data', 'twin', 'hero'],
    twins: ['twins', 'twin', 'data'], board: ['board'], seeds: ['seeds', 'twins'],
  };
  function applyEmphasis() {
    const E = S_.emph;
    const map = E === null;
    const full = new Set();
    if (!map) for (const id of E) for (const l of FULL[id] || []) full.add(l);
    for (const [name, objs] of Object.entries(layers)) {
      // the seed head is this district's own drawing over the core's: on the map the core shows its own field
      if (name === 'seeds') seedsG.visible = !map;
      const a = map ? 0 : full.has(name) ? 0 : 1;
      for (const o of objs) {
        dim(o, a);
        o.traverse((m) => { if (m.isMesh && m.userData.cs0 !== undefined) m.castShadow = a < 0.5 ? m.userData.cs0 : false; });
      }
    }
    // the people of beat 1, the hero and his twin keep their own fade (pose) on top of the part's dim
    for (const [obj, [ln, k]] of FADES) {
      // (on the map nothing is dimmed: a figure that has gone is hidden, not faded)
      const a = map ? 0 : Math.max(full.has(ln) ? 0 : 1, k);
      dim(obj, a);
      obj.traverse((m) => { if (m.isMesh && m.userData.cs0 !== undefined) m.castShadow = a < 0.5 ? m.userData.cs0 : false; });
    }
    // accents: teal on the points and the axes (always: they are typed), lime on the diagonal once it is drawn and the
    // board is the subject (or the held result)
    diagMat.userData.u.uAccent.value = !map && full.has('board') && S_.diag >= 1 ? ACCENT.lime : 0;
  }
  function emphasize(ids) {
    S_.emph = ids && ids.length ? [...ids] : null;
    applyEmphasis();
  }

  // =================================================================== anchors: labels, words, hotspots, framing
  g.updateMatrixWorld(true);
  const wp = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(new V3(x, y, z)); };
  const hipFront = (p) => () => wp(p.joints.hips, 0, -0.02 * p.height, 0.06 * p.height);
  const panelPt = (x, y, z = 0.2) => wp(panel, x, y, z);
  // the board as it stands once it has risen (the shots must not depend on where the motion is)
  const BOARD_M = new M4().compose(new V3(BOARD.x, BOARD_Y + BOARD.foot, BOARD.z), new Q().setFromAxisAngle(YAX, BOARD.yaw), new V3(1, 1, 1));
  const boardAt = (x, y, z = 0) => g.localToWorld(new V3(x, y, z).applyMatrix4(BOARD_M));
  const headW = (hx, hy, z = 0.3) => g.localToWorld(onHead(hx, hy, z));
  // the pair right behind the hero (row 2, nearest his x)
  const behind = pairs.filter((p) => p.r === 1).sort((a, b) => Math.abs(a.cx - H0.cx) - Math.abs(b.cx - H0.cx))[0];
  const parts = {
    asker: { hit: askerHit, anchor: hipFront(asker), beat: 0 },
    circle: { hit: null, anchor: () => W(C1.x, gy(C1.x, C1.z) + 0.5, C1.z), beat: 0, box: () => new THREE.Box3(W(C1.x - C1.r, 0, C1.z - C1.r), W(C1.x + C1.r, HP, C1.z + C1.r)) },
    report: { hit: reportHit, anchor: () => wp(report, 0.2, REP.h, 0.3), beat: 0 },
    crowd: { hit: crowdHit, anchor: () => W(behind.cx - 0.5, behind.y + HC * 0.42, behind.cz + 0.2), beat: 1 },
    hero: { hit: heroHit, anchor: hipFront(hero), beat: 2 },
    twin: { hit: twinHit, anchor: hipFront(twin), beat: 2 },
    data: { hit: null, anchor: () => W(H0.cx - 0.4, H0.y + HC * 1.1, H0.cz), beat: 2, object: dataG, box: () => new THREE.Box3(W(H0.cx - 1.6, H0.y, H0.cz - 1), W(H0.cx + 1.6, H0.y + HC * 1.3, H0.cz + 1)) },
    twins: { hit: twinsHit, anchor: () => W(behind.cx + 0.5, behind.y + HC * 0.42, behind.cz + 0.2), beat: 4 },
    board: { hit: boardHit, anchor: () => panelPt(PL.x0 - 0.3, PL.y0 - 0.45), beat: 3 },
    seeds: { hit: seedHit, anchor: () => headW(-0.62, -0.62, 0.4), beat: LAST },
  };
  const labelAt = {
    hero: () => wp(hero.joints.head, 0, 0.16 * HC, 0),
    twin: () => (twin.group.visible ? wp(twin.joints.head, 0, 0.16 * HC, 0) : null),
    board: () => panelPt(PL.x0 + 1.4, PL.y1 - 0.3),
    seeds: () => (S_.fill > 0.5 ? headW(-0.35, -0.5, 0.4) : null),
  };
  const decalAt = {
    report: () => (S_.cards && S_.emph !== null ? wp(report, 0.12, REP.h + 0.02, 0) : null),
    'axis-x': () => (boardG.visible && S_.diag > 0 ? panelPt(PL.x1 - 2.0, PL.y0 + 0.62) : null),
    'axis-y': () => (boardG.visible && S_.diag > 0 ? panelPt(PL.x0 + 1.9, PL.y1 + 0.32) : null),
  };
  const decalUnit = { report: 0.42, 'axis-x': 1.05, 'axis-y': 1.05 };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const hallPt = (x, y, z) => W(x, gy(x, z) + y, z);
  // beat 1: the five (heads and the bubbles over them, their feet), the moderator's back, the stand, the 「？」
  const S_CIRCLE = () => [
    ...five.map((f) => W(f.x, f.y + HP + 1.5, f.z)), ...five.map((f) => W(f.x, f.y, f.z + 0.4)),
    W(ASK.x, ASK_Y + HA + 2.9, ASK.z), W(ASK.x, ASK_Y, ASK.z + 0.7), W(STAND.x + 1.0, STAND_Y, STAND.z + 0.6),
    W(C1.x + 0.6, gy(C1.x, C1.z) + HP + 2.6, C1.z),
  ];
  const zBack = HALL.z0 - (HALL.rows - 1) * HALL.pitchZ;
  const hallFront = () => [hallPt(HALL.x0 - 0.6, 0, HALL.z0 + 1.6), hallPt(HALL.xMax + 0.6, 0, HALL.z0 + 1.6)];
  // beat 2: the hall from its front row to its back, the moderator in front of it
  const S_HALL = () => [
    hallPt(-8.5, 0, HALL.z0 + 1.6), hallPt(2.5, 0, HALL.z0 + 1.6), hallPt(-7, HC * 1.1, zBack + 4), hallPt(2, HC * 1.1, zBack + 4),
  ];
  // beat 3: close on the hero and the seat beside him, the rows behind rising up the frame
  const S_HERO = () => [
    W(H0.cx - 2.0, H0.y, H0.cz + 1.7), W(H0.cx + 2.0, H0.y, H0.cz + 1.7),
    W(H0.cx - 1.8, H0.y + HC * 1.25 + 1.4, H0.cz), W(H0.cx + 1.8, H0.y + HC * 1.25 + 1.4, H0.cz),
  ];
  const boardCorners = () => [boardAt(-BOARD.w / 2 - 0.2, -BOARD.foot + 0.1), boardAt(BOARD.w / 2 + 0.2, -BOARD.foot + 0.1), boardAt(-BOARD.w / 2 - 0.2, BOARD.h + 1.0), boardAt(BOARD.w / 2 + 0.2, BOARD.h + 1.0)];
  // beats 4–5: the board over the back of the hall, the hall, the moderator in front (his 「？」 over him)
  const S_EXAM = () => [...boardCorners().slice(2), ...hallFront(), W(ASK.x, ASK_Y + HA + 2.9, ASK.z), W(ASK.x, ASK_Y, ASK.z + 0.6)];
  // beat 6 and the end: the head (with room round it for the twins coming in), the board, the hall's right side
  const ring = (r) => Array.from({ length: 12 }, (_, i) => headW(Math.cos((i / 12) * Math.PI * 2) * r, Math.sin((i / 12) * Math.PI * 2) * r));
  const S_HEAD = () => [...ring(1.12), ...boardCorners(), hallPt(-2, HC, HALL.z0 - 6), hallPt(HALL.xMax, 0, HALL.z0 - 4)];
  const S_END = () => [...S_HEAD(), ...hallFront(), ...boardCorners().slice(2)];
  const land = () => typeof innerWidth === 'number' && innerWidth > innerHeight && innerHeight < 560;
  const shot = (pts, o = {}) => ({ az: CAM_AZ, get el() { return land() ? (o.elL ?? o.el) : o.el; }, get margin() { return o.margin; }, anchors: pts });
  // by beats[i].shot: 0 the five, 1 the hall, 2 the hero, 3 the exam (beats 4–5), 4 the flower (beat 6, the end)
  const shots = {
    phone: [shot(S_CIRCLE, { el: 0.3 }), shot(S_HALL, { el: 0.4 }), shot(S_HERO, { el: 0.32 }), shot(S_EXAM, { el: 0.36 }), shot(S_HEAD, { el: 0.5 })],
    desk: [shot(() => [...S_CIRCLE(), W(C1.x - 4.5, 0, C1.z), W(ASK.x + 4.5, 0, ASK.z)], { el: 0.3 }), shot(S_HALL, { el: 0.36 }), shot(() => [...S_HERO(), hallPt(H0.cx - 3.6, HC, H0.cz - 4), hallPt(H0.cx + 3.6, HC, H0.cz - 4)], { el: 0.32 }), shot(S_EXAM, { el: 0.34 }), shot(S_END, { el: 0.46 })],
  };

  function rest() { return pose(LAST, 1); }
  const api = {
    id: 'twins',
    group: g,
    zone: 'consumer',
    // the map pill: over the hall
    anchor: W(-8, 8, -9),
    pin: W(-4, HC + 0.6, -12),
    focus: { pos: W(-3, 6, -8), r: 24 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalUnit,
    lever: null,
    get mainActor() { return S_.emph === null ? 'asker' : ACTOR[S_.beat] || 'asker'; },
    restParts: REST,
    pose,
    rest,
    ambient() {},
    emphasize,
    update(t, dt) { this.ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { asker: asker.group, hero: hero.group, twin: twin.group, five: five.map((f) => f.p.group), board: boardG, seedDisk, headM, pairs: NP },
  };
  rest();
  emphasize(null);
  return api;
}
