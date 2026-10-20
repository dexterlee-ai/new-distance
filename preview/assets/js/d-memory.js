// 品牌記憶 · memory (articles 8, 10, 11) — told in four beats, in the 消費者 zone (TH 25°, r 29).
// One device carries the whole story: a thought bubble over every head shows what that person remembers.
// The set: a horseshoe of three terraces round a small stage; over the stage a four-sided big screen hangs from an
// arch across the bowl, and under it a band with the exposure counter.  The open side is closed by the venue's wall,
// with a gate in the middle; outside the gate a paved plaza (the street).
// Beat 1 (廣告每打到一個人，曝光數就加一，卻沒有人真的看進去): low behind the stage, the stands facing the camera.  The
// screen plays an ad (lime, a 廣告 tag, a progress bar); at every loop its mark pops and fires a volley of copies at
// the crowd.  Each copy hits a bowed head or a phone: the counter goes up by one, the copy bounces off and falls on
// the floor in front of the stands, where the copies pile up.  Every bubble stays empty.  It starts as the camera
// lands, so the first hits come within a second of arriving.
// Beat 2 (同一面螢幕改成邀請，自己決定舉燈的人，反而記住了品牌): the ad stops; the same screen goes dark and asks
// (a phone held up with its light on, and 要一起點亮嗎？).  The heads come up.  A few raise their lights on their own,
// the rest follow them; the parent (front row, drawn whole) looks at the neighbour who raised, lifts the light half
// way, lowers it, then raises it; two never do.  Each light that goes up puts the mark in its own bubble (the two who
// did not raise keep theirs empty); the counter does not move.  The screen gathers the lights into the mark.
// Beat 3 (沒人要求，大家自己拍照傳出去，把記憶帶出了場外): high, from the street outside the gate.  Everyone who took
// part stands and photographs the moment (a flash at each phone); five photos fly over the venue's wall to people
// outside, each bowed over a phone with an empty bubble: the mark lands in their bubbles, and they look up.
// Beat 4 (十年後記得的人又回來了，還帶著孩子，換孩子第一次參與): low behind the gate.  The screen reads 十週年; the
// stands fill with people who remember (their bubbles hold the mark); the parent (grey now) walks in through the gate
// with a child, puts a hand on its shoulder and raises a light; the child raises its own, and its bubble gets its
// first mark.  The end holds both halves of the title: the counter over the screen (bought) and the bubbles (lived).
// Mark, counter, numbers and people: 示意.
//
// Everything the reader sees is a pure function of (beat, k): pose().  No copy lives here: captions, labels and tap
// lines come from world.json by part id.  The crowd (≈ 40 seated people at 2 units, every other seat, the rows
// staggered so a bubble sits between the two heads behind it) is people.js's lay figure baked into a few poses (low
// poly, a phone in the hands where the pose has one) and instanced: each pose is an InstancedMesh, and pose() deals
// the seats out to them.
// Local frame: +z points at the camera's side (VIEW_AZ: the plaza side, front-lit), +x is the camera's right, y = 0 is
// the orchestra floor (FLOOR_Y in the world, above every bump of the hill inside the horseshoe).
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp } from './kit.js';
import { heightAt } from './terrain.js';
import { makePerson, blendPoses } from './people.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), XAX = new V3(1, 0, 0), ZAX = new V3(0, 0, 1);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
/** a pop: 0 → a little past 1 → 1 */
const pop = (x) => { x = clamp(x); const c = 2.2; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const strip = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
/** per-vertex (shade multiplier, style, accent); -1 keeps the material's */
function toned(geo, t, st = -1, ac = -1) {
  const x = strip(geo), n = x.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = t; c[i * 3 + 1] = st; c[i * 3 + 2] = ac; }
  x.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return x;
}

// ------------------------------------------------------------------ the set (local units)
const TH = 25, RR = 29;
const VIEW_AZ = (120 * Math.PI) / 180;               // world azimuth of the camera's side, seen from the bowl's centre
const YAW = Math.PI / 2 - VIEW_AZ;                    // group turn: local +z → the camera
const FLOOR_Y = 6.0;                                  // the bowl's floor in the world (the hill inside reaches 5.9)
const H = 2.0, HC = 1.3;                              // everyone here is 2 units (the bowl cannot grow); the child 1.3
const OPEN = (70 * Math.PI) / 180;                    // the stands leave ±70° open toward the camera (a horseshoe)
const STAGE = { r: 2.5, h: 0.3 };
const TER = { r0: 5.0, depth: 2.4, rise: 1.2, n: 3, floor: 1.4, bench: 0.49 };   // three terraces, a bench on each
const RISER = 0.76;                                   // the steps' risers, a shade darker than the treads
const ROW_Y = (i) => (i + 1) * TER.rise;              // the row's floor (the feet)
const SEAT_R = (i) => TER.r0 + i * TER.depth + TER.floor + 0.32;  // where the hips sit, row i
const RIM = { r0: TER.r0 + TER.n * TER.depth, r1: TER.r0 + TER.n * TER.depth + 1.2, y: ROW_Y(TER.n - 1) + TER.bench + 0.45 };
const WALL = { r: RIM.r1 + 0.6, bot: -6.5 };
const PHI0 = OPEN + 0.04, PHI1 = Math.PI * 2 - OPEN - 0.04;   // the seats' arc
const SEAT_SP = 2.2;                                  // every other seat: a bubble needs the room of two
// two flights of steps from the orchestra up to the rim, either side of the middle
const AISLES = [Math.PI - 0.66, Math.PI + 0.66];
const NA = AISLES.length, AISLE_PHI = (a) => AISLES[a], AISLE_HW = 0.06;
const NSTEP = 12;
// a phone in the hands of a 2-unit figure (larger than life, so it reads at 30 px: a black back, a white screen), and
// the light a raised one shows: a star facing the camera's side
const PHONE = { w: 0.25, h: 0.42, t: 0.05 };
const STAR = { r0: 0.44, r1: 0.14, n: 8, t: 0.03 };
// the venue's wall closes the open side: an arc on the forecourt's outer edge, a gate in the middle (two posts and a
// lintel over the way in); outside it a paved plaza, the street, level with the forecourt's edge
const VWALL = { r: 12.0, t: 0.5, top: 1.15, gate: 1.95, post: 0.62, postTop: 2.05, lintel: [1.56, 1.9] };
const PLAZA = { y: -0.8, x: 6.2, z1: 17.4 };
// the forecourt: from the orchestra down to the wall, filling the open side
const APRON = { r1: VWALL.r };
const GATE_Z = Math.sqrt(VWALL.r * VWALL.r - VWALL.gate * VWALL.gate);
// the big screen: a four-sided box over the stage, hung from an arch that spans the bowl from rim to rim; under it a
// band (a little narrower) carries the exposure counter on its camera face
const SCR = { w: 4.4, h: 2.8, y0: 9.0 };
const BAND = { h: 0.66, d: 4.2 };
const BAND_Y = SCR.y0 - 0.05 - BAND.h / 2;
const ARCH = { x: RIM.r0 + 0.6, apex: 15.6, r: 0.17 };
// the counter: three digits of seven segments, right-aligned on the band's plate (one exposure per hit: 示意)
const DIG = { n: 3, cw: 0.46, w: 0.3, h: 0.46, t: 0.07, y: 0, x1: 1.72 };
// a thought bubble for a 2-unit figure: its origin at the top of the head; the cloud above, two dots rising beside the
// head (never touching it: a bubble on a string read as a puppet)
const BUB = { w: 1.12, h: 0.8, lift: 0.5, tilt: 0.22, dx: 0.3 };
// the profile of the stands (r, y), from the orchestra floor out over the rim and down the back wall
const PROF = [[TER.r0, 0]];
for (let i = 0; i < TER.n; i++) {
  const r0 = TER.r0 + i * TER.depth, y = ROW_Y(i);
  PROF.push([r0, y], [r0 + TER.floor, y], [r0 + TER.floor, y + TER.bench], [r0 + TER.depth, y + TER.bench]);
}
PROF.push([RIM.r0, RIM.y], [RIM.r1, RIM.y], [WALL.r, WALL.bot]);

// ------------------------------------------------------------------ the beats
// dur = the motion; the caption lands at keyAt and is held 0.8 s + 0.2 s per 字 (story.js).  Beat 1 lasts as long as
// its caption is read, so the volleys go on while it is: nothing stands still
const BEATS = [
  // 1 — the ad fires a volley at every loop; the hits count; the copies pile up; the bubbles stay empty
  { dur: 7.6, keyAt: 1.75, shot: 0, parts: ['screen', 'pile', 'stands', 'bubble'] },
  // 2 — the invitation; a few raise, the parent hesitates and joins, the rest follow, two never do; each light puts
  // the mark in its own bubble (keyAt: set below, once the parent's mark has landed)
  { dur: 3.6, keyAt: 2.6, shot: 0, parts: ['light', 'bubble', 'stands', 'screen'] },
  // 3 — the photos go over the wall into the bubbles outside (keyAt: set below, once the last has landed)
  { dur: 3.4, keyAt: 3.0, shot: 1, parts: ['friend', 'bubble', 'stands'] },
  // 4 — ten years on: the stands fill, the parent and the child walk in, their lights go up, the child's first mark
  { dur: 3.9, keyAt: 3.25, shot: 2, parts: ['child'] },
];
const LAST = BEATS.length - 1;
// beat 1: the ad's loop (l0: the first loop starts, as the camera lands); at each loop the mark pops (pop), and a
// volley of n copies leaves the screen (fire, then one every gap) and flies (fly) to its target; gravity of the
// bounce (g), the rise over the hit (rise), the little hop on landing (hop)
const T1 = { l0: 0.18, loop: 1.15, pop: 0.26, fire: 0.08, gap: 0.045, n: 8, nv: 6, fly: 0.42, g: 26, rise: 0.55, hop: 0.1 };
// beat 2: the screen goes dark (tone) and asks (invite); the heads come up (up: start, spread); the first lights go up
// on their own (early), the parent hesitates (P), the rest follow (follow: from the first to the last, by distance
// from the nearest early one); a light is up `rise` after it starts, its bubble gets the mark `fill` later (pop over
// `mark`); the screen gathers the lights into the mark (gather) and it lights up (bloom)
const T2 = {
  tone: [0.0, 0.4], invite: [0.35, 0.65], up: [0.3, 0.35], early: [0.95, 1.3], follow: [1.5, 2.5], rise: 0.24, fill: 0.04, mark: 0.28,
  P: { look: [1.0, 1.3], half: [1.32, 1.55], back: [1.55, 1.78], raise: [1.84, 2.18] }, gather: [2.85, 3.15], bloom: [3.0, 3.3],
};
// beat 3: everyone who took part stands (stand, spread by `late`), lifts the phone to the moment (snap: start, spread)
// and its flash goes off (flash, `fl` long); a sender's photo leaves the phone right after and flies over the wall
// (fly) into a bubble outside (land); the receiver looks up (look)
const T3 = { stand: [0.05, 0.38], snap: [0.42, 0.5], up: 0.16, flash: 0.2, fl: 0.18, send: [0.6, 0.15], fly: 1.0, land: 0.26, look: 0.32, arc: 2.3 };
// beat 4: the screen shows its slate (十週年) and then asks again (tone, invite); the parent and the child walk in
// through the gate (walk); the stands fill (refill); the hand on the shoulder (hand), the parent's light (pRaise), the
// child's light (cRaise) and the child's first mark (cFill); the lights spread from the middle of the stands out
const T4 = { walk: [0.0, 1.45], refill: [0.1, 1.0], tone: [0.95, 1.3], invite: [1.15, 1.45], hand: [1.45, 1.8], pRaise: [1.8, 2.15], cRaise: [2.12, 2.5], cFill: [2.58, 2.86], wave0: 1.8, lap: 1.3, rise: 0.24, gather: [2.95, 3.3], bloom: [3.1, 3.45] };

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
function reframe(v, from, to, h) {
  const c = Math.cos(to.yaw), s = Math.sin(to.yaw);
  const dx = from.x - to.x, dz = from.z - to.z;
  return movePose(v, from.yaw - to.yaw, (dx * c - dz * s) / h, (dx * s + dz * c) / h);
}
const chestQ = (v) => v.hips.q.clone().multiply(v.waist);
const chestPt = (v, x, y, z) => new V3(x, y, z).applyQuaternion(v.waist).add(new V3(0, 0.066, -0.004)).applyQuaternion(v.hips.q).add(v.hips.p);
const chestDir = (v, x, y, z) => new V3(x, y, z).applyQuaternion(chestQ(v));
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
/** both hands at chest-frame points (±x, y, z), the elbows out */
function hands(v, x, y, z, pole = [0.6, -1, -0.3]) {
  const o = clonePose(v);
  o.hand.L.p.copy(chestPt(o, x, y, z)); o.hand.L.pole.copy(chestDir(o, pole[0], pole[1], pole[2]));
  o.hand.R.p.copy(chestPt(o, -x, y, z)); o.hand.R.pole.copy(chestDir(o, -pole[0], pole[1], pole[2]));
  o.hand.L.grip.copy(chestQ(o)); o.hand.R.grip.copy(chestQ(o));
  return o;
}
/** the phone held in both hands low in front of the body, the screen up to the face */
const inHands = (v) => hands(v, 0.05, 0.02, 0.27, [0.5, -1, -0.25]);
/** the head bowed deep over the phone (yaw: a little to one side) */
const phoneDown = (v, yaw = 0) => look(inHands(v), yaw, 1.15);
/** the phone still in the hands, the face up to the screen */
const faceUp = (v, yaw = 0) => look(inHands(v), yaw, -0.6);
/** one arm raised high, the phone held up in it (its light toward the stage); the other hand where it was */
function lightUp(v, side = 'R', out = 0.36) {
  const o = clonePose(v), s = side === 'L' ? 1 : -1;
  o.hand[side].p.copy(chestPt(o, s * out, 0.42, 0.14));
  o.hand[side].pole.copy(chestDir(o, s * 1, -0.3, -0.5));
  o.hand[side].grip.copy(chestQ(o));
  return o;
}
/** the head turned by yaw and pitched (positive: down) on top of a pose: the hands keep their places */
function look(v, yaw, pitch = 0) {
  const o = clonePose(v);
  const e = (a, p) => new Q().setFromEuler(new THREE.Euler(p, a, 0, 'YXZ'));
  o.neck.multiply(e(yaw * 0.42, pitch * 0.4));
  o.head.multiply(e(yaw * 0.58, pitch * 0.6));
  return o;
}
/** the phone held up before the face in both hands, its back to the stage: a photo of the moment */
const snapUp = (v) => look(hands(v, 0.06, 0.33, 0.33, [0.6, -1, -0.45]), 0, -0.3);

// ------------------------------------------------------------------ the crowd's figure: people.js's lay figure, low poly
// (the same bones, proportions and tones; fewer segments, so dozens of them stay cheap)
const FH = 0.042, SHIN = 0.245, THIGH = 0.245, UARM = 0.168, FARM = 0.142;
const TONE = { torso: 1.0, head: 1.0, limb: 0.86, joint: 0.4, hand: 0.86, foot: 0.6, neck: 0.86, hair: 0.34 };
/** the hair: a dark cap over the crown, the back and the sides of people.js's head (its normalised head frame), a
 *  touch larger than the head: a light face under a dark cap tells, at 30 px, which way a head is turned */
function hairGeo(segW = 12, segH = 9, inflate = 1.07) {
  const s = new THREE.SphereGeometry(1, segW, segH).toNonIndexed(), p = s.attributes.position;
  const pos = [], nor = [];
  for (let i = 0; i < p.count; i += 3) {
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < 3; k++) { cx += p.getX(i + k); cy += p.getY(i + k); cz += p.getZ(i + k); }
    const l = Math.hypot(cx, cy, cz) || 1; cx /= l; cy /= l; cz /= l;
    if (!(cy > 0.52 || (cz < 0.3 && cy > -0.12) || (cz < -0.25 && cy > -0.62))) continue;
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      const jaw = y < 0 ? 1 + 0.2 * y : 1, skull = z < 0 ? 1.06 : 1;
      pos.push(x * 0.054 * jaw * inflate, y * 0.074 * inflate, z * 0.063 * jaw * skull * inflate);
      const n = new V3(x / 0.054, y / 0.074, z / 0.063).normalize();
      nor.push(n.x, n.y, n.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.rotateX(-0.22);
  return g.translate(0, 0.068, 0.008);
}
const ballL = (r, x = 0, y = 0, z = 0, sz = 1) => { const g = new THREE.SphereGeometry(r, 6, 4); if (sz !== 1) g.scale(1, 1, sz); return g.translate(x, y, z); };
function latheL(profile, segs, sz = 1) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  if (sz !== 1) g.scale(1, 1, sz);
  return g;
}
function spindleL(r0, r1, len) {
  const pts = [[0, -len - r1 * 0.4]];
  for (let i = 3; i >= 0; i--) { const t = i / 3; pts.push([(r0 + (r1 - r0) * t) * (0.84 + 0.22 * Math.sin(Math.PI * t)), -t * len]); }
  pts.push([0, r0 * 0.4]);
  return latheL(pts, 5);
}
function lowFigure() {
  const m = (list) => mergeGeometries(list.map(([g, t, ac = -1]) => toned(g, t, -1, ac)));
  const head = new THREE.SphereGeometry(1, 9, 6);
  {
    const p = head.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const jaw = y < 0 ? 1 + 0.2 * y : 1, skull = z < 0 ? 1.06 : 1;
      p.setXYZ(i, x * 0.054 * jaw, y * 0.074, z * 0.063 * jaw * skull);
    }
    head.computeVertexNormals();
    head.rotateX(-0.22);
    head.translate(0, 0.068, 0.008);
  }
  const palm = new THREE.SphereGeometry(1, 5, 4);
  palm.scale(0.017, 0.05, 0.03); palm.translate(0, -0.046, 0.002);
  const foot = new THREE.BoxGeometry(0.058, 0.044, 0.155, 1, 1, 3);
  foot.translate(0, -FH + 0.022, 0.0375);
  {
    const p = foot.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getZ(i) + 0.04) / 0.155;
      if (p.getY(i) > -FH + 0.01) p.setY(i, -FH + 0.044 * (1 - 0.55 * sm((t - 0.3) / 0.7)));
      p.setX(i, p.getX(i) * (1 - 0.3 * sm((t - 0.62) / 0.38)));
    }
    foot.computeVertexNormals();
  }
  const G = {
    pelvis: m([[latheL([[0, -0.078], [0.05, -0.07], [0.085, -0.035], [0.088, 0.015], [0.06, 0.055], [0, 0.064]], 8, 0.7), TONE.torso]]),
    chest: m([[ballL(0.056, 0, 0, 0, 0.78), TONE.joint], [latheL([[0, -0.01], [0.06, 0], [0.085, 0.07], [0.097, 0.14], [0.088, 0.188], [0.04, 0.21], [0, 0.214]], 8, 0.62), TONE.torso]]),
    neck: m([[new THREE.CylinderGeometry(0.021, 0.024, 0.064, 6).translate(0, 0.03, 0), TONE.neck]]),
    head: m([[head, TONE.head], [ballL(0.012, 0, 0.06, 0.069, 1.6), TONE.joint], [hairGeo(9, 7), TONE.hair, ACCENT.ink]]),
  };
  for (const k of ['L', 'R']) {
    G[k + 'uarm'] = m([[ballL(0.036), TONE.joint], [spindleL(0.03, 0.025, UARM), TONE.limb], [ballL(0.027, 0, -UARM, 0), TONE.joint]]);
    G[k + 'farm'] = m([[spindleL(0.025, 0.019, FARM), TONE.limb], [ballL(0.02, 0, -FARM, 0), TONE.joint]]);
    G[k + 'hand'] = m([[palm.clone(), TONE.hand]]);
    G[k + 'thigh'] = m([[spindleL(0.048, 0.035, THIGH), TONE.limb], [ballL(0.036, 0, -THIGH, 0), TONE.joint]]);
    G[k + 'shin'] = m([[spindleL(0.037, 0.025, SHIN), TONE.limb], [ballL(0.025, 0, -SHIN, 0), TONE.joint]]);
    G[k + 'foot'] = m([[foot.clone(), TONE.foot]]);
  }
  return G;
}
const BONES = [['hips', 'pelvis'], ['waist', 'chest'], ['neck', 'neck'], ['head', 'head']];
for (const k of ['L', 'R']) BONES.push([`shoulder${k}`, `${k}uarm`], [`elbow${k}`, `${k}farm`], [`wrist${k}`, `${k}hand`], [`hip${k}`, `${k}thigh`], [`knee${k}`, `${k}shin`], [`ankle${k}`, `${k}foot`]);

// the brand mark (示意): a ring with a dot, in the xy plane facing +z, centred, t thick
function markGeo(R, t) {
  const ring = new THREE.Shape(); ring.absarc(0, 0, R, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.64, 0, Math.PI * 2, true); ring.holes.push(hole);
  const dot = new THREE.Shape(); dot.absarc(0, 0, R * 0.3, 0, Math.PI * 2, false);
  const ex = (s) => strip(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 18 }).translate(0, 0, -t / 2));
  return mergeGeometries([ex(ring), ex(dot)]);
}
/** a phone (示意): a solid black slab (as the hair: it reads at 30 px) with a white screen on its face, facing +z, its
 *  long side along +y, centred */
function phoneGeo() {
  const { w, h, t } = PHONE;
  return mergeGeometries([toned(new THREE.BoxGeometry(w, h, t), 0.3, -1, ACCENT.ink), toned(new THREE.BoxGeometry(w * 0.82, h * 0.84, t * 0.4).translate(0, 0, t / 2), 1.0)]);
}
/** the light a raised phone shows: a sparkle of eight points (four long, four short) in the xy plane, facing +z */
function starGeo(sc = 1, n = STAR.n) {
  const { r0, r1, t } = STAR, sh = new THREE.Shape();
  for (let i = 0; i <= 2 * n; i++) {
    const a = (i / (2 * n)) * Math.PI * 2 + Math.PI / 2, r = (i % 2 ? r1 : i % 4 ? r0 * 0.62 : r0) * sc;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return strip(new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -t / 2));
}
/** a camera flash: a burst of four long thin points (paper), facing +z */
function flashGeo(sc = 1) {
  const sh = new THREE.Shape(), n = 4;
  for (let i = 0; i <= 2 * n; i++) {
    const a = (i / (2 * n)) * Math.PI * 2 + Math.PI / 4, r = (i % 2 ? 0.07 : 0.42) * sc;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return strip(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -0.015));
}
/** the screen's invitation: a phone held up with its light on (paper on the dark screen), centred, facing +z */
function inviteGeo() {
  const body = new THREE.BoxGeometry(0.34, 0.58, 0.04).translate(0, -0.26, 0);
  const screen = new THREE.BoxGeometry(0.26, 0.46, 0.02).translate(0, -0.26, 0.03);
  return mergeGeometries([toned(body, 1), toned(screen, 0.55), toned(starGeo(1.25).translate(0, 0.32, 0), 1)]);
}

// ---- the thought bubble: a cloud of nine round lobes, and two dots rising beside the head
function cloudShape(w, h, lobes = 9, n = 126) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    const r = 0.84 + 0.16 * Math.sqrt(Math.abs(Math.sin(((a - Math.PI / 2) * lobes) / 2 + Math.PI / 2)));
    const x = (Math.cos(a) * w * r) / 2, y = (Math.sin(a) * h * r) / 2;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  return s;
}
const BUB_T = 0.05;
/** the cloud's centre over the head (dx: shifted to one side, away from a neighbour; the dots lean toward it) */
const bubC = (dx) => new V3(0.04 + dx, BUB.lift + BUB.h / 2, 0);
/** the bubble in the plane facing +z, origin at the top of the head; tilted back by BUB.tilt where it is placed */
function bubbleGeo(dx = 0) {
  const c = bubC(dx), sg = dx < 0 ? -1 : 1;
  const cloud = new THREE.ExtrudeGeometry(cloudShape(BUB.w, BUB.h), { depth: BUB_T, bevelEnabled: false, curveSegments: 4 }).translate(c.x, c.y, -BUB_T / 2);
  const dot = (r, x, y) => new THREE.CylinderGeometry(r, r, BUB_T, 16).rotateX(Math.PI / 2).translate(x, y, 0);
  return mergeGeometries([strip(cloud), strip(dot(0.078, sg * 0.1 + dx * 0.6, 0.33)), strip(dot(0.05, sg * 0.17 + dx * 0.3, 0.15))]);
}
const Q_TILT = new Q().setFromAxisAngle(XAX, -BUB.tilt);
/** where the mark sits in a bubble (dx), from the top of the head, tilted with the bubble */
const markIn = (dx, s = 1) => bubC(dx).multiplyScalar(s).add(new V3(0, 0, (BUB_T / 2 + 0.02) * s)).applyQuaternion(Q_TILT);
const MARK_R = 0.24;
const MARK_F = 0.22;                                   // the ad's copies fired at the crowd

// ---- the counter's seven segments: a … g, in a digit cell centred on its origin
const SEGS = (() => {
  const { w, h, t } = DIG, hw = w / 2, hh = h / 2;
  return {
    a: [0, hh, w, t], g: [0, 0, w, t], d: [0, -hh, w, t],
    b: [hw, hh / 2, t, hh], c: [hw, -hh / 2, t, hh], f: [-hw, hh / 2, t, hh], e: [-hw, -hh / 2, t, hh],
  };
})();
const SEG_ORDER = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const DIGITS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];

// per-instance fade for everyone who comes and goes: one hook, one program for the crowd, its lights and its bubbles
const FOLK_HOOKS = {
  key: 'memory-folk',
  vHead: 'attribute float aFade;\nvarying float vFade;',
  vPos: 'vFade = aFade;',
  fHead: 'varying float vFade;',
  // coming and going, a figure drops to its contour (as a dimmed part does) and then goes at once
  fOut: 'dm = max(dm, 1.0 - smoothstep(0.3, 1.0, vFade)); if (vFade < 0.3) discard;',
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
  m.customProgramCacheKey = () => 'memory-folk-depth';
  return m;
})();

export function buildMemory() {
  const g = new THREE.Group();
  g.name = 'memory';
  const base = polar(RR, TH);
  g.position.set(base.x, FLOOR_Y, base.z);
  g.rotation.y = YAW;
  g.updateMatrixWorld(true);
  const _gw = new V3();
  /** ground height under a local point (local y) */
  const gy = (x, z) => { _gw.set(x, 0, z).applyMatrix4(g.matrixWorld); return heightAt(_gw.x, _gw.z) - FLOOR_Y; };
  const W = (x, y, z) => g.localToWorld(new V3(x, y, z));
  const R = rng(11);
  const ONE = new V3(1, 1, 1);

  // =================================================================== the bowl (scenery)
  const scenery = new THREE.Group(); scenery.name = 'bowl';
  let bowl = null;
  g.add(scenery);
  // the forecourt: a fan between the two ends of the stands, sloping from the orchestra's edge down to the plaza's
  // level at the venue's wall, never under the hill
  const NAR = 10, NAA = 20;
  const apH = [];
  for (let i = 0; i <= NAR; i++) {
    const r = lerp(TER.r0 - 0.1, APRON.r1, i / NAR), row = [];
    for (let j = 0; j <= NAA; j++) {
      const a = lerp(-OPEN, OPEN, j / NAA), x = r * Math.sin(a), z = r * Math.cos(a);
      const u = (r - TER.r0) / (APRON.r1 - TER.r0);
      row.push(Math.max(lerp(0, PLAZA.y, sm(u) * 0.6 + 0.4 * clamp(u)), gy(x, z) + 0.05));
    }
    apH.push(row);
  }
  const apronY = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(x, z);
    const u = clamp((r - (TER.r0 - 0.1)) / (APRON.r1 - TER.r0 + 0.1)) * NAR, i = Math.min(NAR - 1, Math.floor(u));
    const v = clamp((a + OPEN) / (2 * OPEN)) * NAA, j = Math.min(NAA - 1, Math.floor(v));
    const A = lerp(apH[i][j], apH[i][j + 1], v - j), B = lerp(apH[i + 1][j], apH[i + 1][j + 1], v - j);
    return lerp(A, B, u - i);
  };
  const bowlMat = ink({
    shade: 0.82, bias: 0.3, side: THREE.DoubleSide,
    // the back wall faces away from the stands: keep it a light drawing, so on the map the eye goes inside
    hooks: { key: 'memory-bowl', fOut: `if (length(vLPos.xz) > ${(RIM.r1 + 0.05).toFixed(2)}) sh = 1.0 - (1.0 - sh) * 0.4;` },
  });
  bowlMat.vertexColors = true;
  {
    const parts = [toned(new THREE.CircleGeometry(TER.r0 + 0.02, 72).rotateX(-Math.PI / 2), 1)];
    const STAIR = [[TER.r0, 0]];
    const sd = (RIM.r0 - TER.r0) / NSTEP, sr = RIM.y / NSTEP;
    for (let s = 0; s < NSTEP; s++) STAIR.push([TER.r0 + s * sd, (s + 1) * sr], [TER.r0 + (s + 1) * sd, (s + 1) * sr]);
    STAIR.push([RIM.r1, RIM.y], [WALL.r, WALL.bot]);
    const contour = PROF.map(([r, y]) => [r, y]);
    contour.push([TER.r0, WALL.bot]);
    const side = (phi, sgn) => endGeo(contour, phi, new V3(sgn * Math.cos(phi), 0, -sgn * Math.sin(phi)));
    let a0 = OPEN;
    for (let a = 0; a <= NA; a++) {
      const a1 = a < NA ? AISLE_PHI(a) - AISLE_HW : Math.PI * 2 - OPEN;
      parts.push(sectorLathe(PROF, a0, a1, Math.max(2, Math.round(((a1 - a0) / (Math.PI * 2)) * 200)), RISER));
      if (a < NA) {
        parts.push(sectorLathe(STAIR, a1, a1 + 2 * AISLE_HW, 3, RISER));
        parts.push(side(a1, 1), side(a1 + 2 * AISLE_HW, -1));
        a0 = a1 + 2 * AISLE_HW;
      }
    }
    parts.push(endGeo(contour, OPEN, new V3(-Math.cos(OPEN), 0, Math.sin(OPEN))), endGeo(contour, -OPEN, new V3(Math.cos(OPEN), 0, Math.sin(OPEN))));
    parts.push(toned(new THREE.CylinderGeometry(TER.r0, TER.r0, -WALL.bot, 48, 1, true, -OPEN, 2 * OPEN).translate(0, WALL.bot / 2, 0), 1));
    const pos = [], nor = [];
    const q = (a, b, c, d, n) => { for (const p of [a, b, c, a, c, d]) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); } };
    const AP = (i, j) => { const r = lerp(TER.r0 - 0.1, APRON.r1, i / NAR), a = lerp(-OPEN, OPEN, j / NAA); return new V3(r * Math.sin(a), apH[i][j], r * Math.cos(a)); };
    for (let i = 0; i < NAR; i++) for (let j = 0; j < NAA; j++) {
      const a = AP(i, j), b = AP(i + 1, j), c = AP(i + 1, j + 1), d = AP(i, j + 1);
      const n = new V3().crossVectors(new V3().subVectors(d, a), new V3().subVectors(b, a)).normalize();
      q(a, b, c, d, n.y > 0 ? n : n.negate());
    }
    for (let j = 0; j < NAA; j++) {
      const a = AP(NAR, j), b = AP(NAR, j + 1), m = (lerp(-OPEN, OPEN, (j + 0.5) / NAA));
      q(new V3(a.x, WALL.bot, a.z), new V3(b.x, WALL.bot, b.z), b, a, new V3(Math.sin(m), 0, Math.cos(m)));
    }
    // the plaza outside the gate: level, from the wall out to the street's far edge, its sides dropping to the ground
    {
      const NX = 24, NZ = 6, x0 = -PLAZA.x, x1 = PLAZA.x;
      const zIn = (x) => Math.sqrt(Math.max(0, (VWALL.r + VWALL.t / 2) ** 2 - x * x)) - 0.05;
      const P_ = (i, j) => { const x = lerp(x0, x1, i / NX), z = lerp(zIn(x), PLAZA.z1, j / NZ); return new V3(x, PLAZA.y, z); };
      const up = new V3(0, 1, 0);
      for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) q(P_(i, j), P_(i, j + 1), P_(i + 1, j + 1), P_(i + 1, j), up);
      const down = (p) => new V3(p.x, WALL.bot, p.z);
      for (let i = 0; i < NX; i++) { const a = P_(i, NZ), b = P_(i + 1, NZ); q(down(a), down(b), b, a, new V3(0, 0, 1)); }
      for (let j = 0; j < NZ; j++) {
        const a = P_(0, j), b = P_(0, j + 1), c = P_(NX, j), d = P_(NX, j + 1);
        q(down(b), down(a), a, b, new V3(-1, 0, 0));
        q(down(c), down(d), d, c, new V3(1, 0, 0));
      }
    }
    const apron = new THREE.BufferGeometry();
    apron.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    apron.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    parts.push(toned(apron, 1));
    bowl = new THREE.Mesh(mergeGeometries(parts), bowlMat);
    bowl.name = 'stands-structure';
    bowl.castShadow = bowl.receiveShadow = true;
    scenery.add(bowl);
  }
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(STAGE.r, STAGE.r, STAGE.h, 64).translate(0, STAGE.h / 2, 0), ink({ shade: 1.0, bias: 0.18 }));
  stage.name = 'stage';
  stage.receiveShadow = true; stage.castShadow = true;
  scenery.add(stage);
  // a low wall along the far rim, behind the top row: without it the far sea of letters showed through above the crowd,
  // a band of garbled type right behind the bubbles
  const BACK = { r: RIM.r1 - 0.25, y0: RIM.y - 0.05, y1: RIM.y + 2.2, a0: Math.PI - 1.35, a1: Math.PI + 1.35 };
  const backWall = new THREE.Mesh(
    strip(new THREE.CylinderGeometry(BACK.r, BACK.r, BACK.y1 - BACK.y0, 72, 1, true, BACK.a0, BACK.a1 - BACK.a0).translate(0, (BACK.y0 + BACK.y1) / 2, 0)),
    ink({ shade: 0.78, bias: 0.24, side: THREE.DoubleSide }),
  );
  backWall.name = 'back-wall';
  backWall.receiveShadow = true; backWall.castShadow = false;
  scenery.add(backWall);
  // the venue's wall and its gate: the line between those who were there and those who were not
  const gateA = Math.asin(VWALL.gate / VWALL.r), postA = VWALL.post / VWALL.r;
  const wallMesh = (() => {
    const parts = [];
    for (const sg of [-1, 1]) parts.push(arcWall(sg > 0 ? gateA + postA * 0.5 : -OPEN - 0.02, sg > 0 ? OPEN + 0.02 : -gateA - postA * 0.5, VWALL.r - VWALL.t / 2, VWALL.r + VWALL.t / 2, WALL.bot, VWALL.top, 28));
    for (const sg of [-1, 1]) {
      const a = sg * (gateA + postA * 0.5);
      parts.push(new THREE.BoxGeometry(VWALL.post, VWALL.postTop - WALL.bot, VWALL.post).translate(0, (VWALL.postTop + WALL.bot) / 2, 0).rotateY(a).translate(VWALL.r * Math.sin(a), 0, VWALL.r * Math.cos(a)));
    }
    const span = 2 * (VWALL.gate + VWALL.post * 0.5);
    parts.push(new THREE.BoxGeometry(span, VWALL.lintel[1] - VWALL.lintel[0], VWALL.post * 0.7).translate(0, (VWALL.lintel[0] + VWALL.lintel[1]) / 2, GATE_Z));
    const m = new THREE.Mesh(mergeGeometries(parts.map(strip)), ink({ shade: 0.84, bias: 0.2 }));
    m.name = 'venue-wall';
    m.castShadow = m.receiveShadow = true;
    scenery.add(m);
    return m;
  })();

  /** the floor under a local point: the stage, the orchestra, the forecourt, the plaza, or the ground */
  const inPlaza = (x, z) => Math.abs(x) <= PLAZA.x && z <= PLAZA.z1 && Math.hypot(x, z) > VWALL.r;
  const floorAt = (x, z) => {
    const r = Math.hypot(x, z);
    if (r < STAGE.r) return STAGE.h;
    if (r <= TER.r0) return 0;
    if (r <= APRON.r1 && Math.abs(Math.atan2(x, z)) <= OPEN) return apronY(x, z);
    if (inPlaza(x, z)) return PLAZA.y;
    return gy(x, z) + 0.06;
  };

  // =================================================================== the big screen, on its arch, and the counter's band
  const screenG = new THREE.Group(); screenG.name = 'screen';
  g.add(screenG);
  const SC = new V3(0, SCR.y0 + SCR.h / 2, 0);
  // each face's frame: origin at the centre of the face, +z out of it (face 0 looks at the camera)
  const faceM = [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2;
    return new M4().compose(new V3(Math.sin(a) * (SCR.w / 2), SC.y, Math.cos(a) * (SCR.w / 2)), new Q().setFromAxisAngle(YAX, a), new V3(1, 1, 1));
  });
  // the counter's plate: the band's camera face (its frame: origin at the plate's centre, +z out of it)
  const bandM = new M4().compose(new V3(0, BAND_Y, BAND.d / 2 + 0.04), new Q(), new V3(1, 1, 1));
  {
    const parts = [new THREE.BoxGeometry(SCR.w, SCR.h, SCR.w).translate(0, SC.y, 0), new THREE.BoxGeometry(BAND.d, BAND.h, BAND.d).translate(0, BAND_Y, 0)];
    // the arch: a parabola from rim to rim through the apex, in the plane over the stage, with a foot block on each rim
    const pts = [];
    for (let i = 0; i <= 48; i++) { const u = -1 + (2 * i) / 48; pts.push(new V3(u * ARCH.x, RIM.y + (ARCH.apex - RIM.y) * (1 - u * u), 0)); }
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, ARCH.r, 7, false));
    for (const sx of [-1, 1]) parts.push(new THREE.BoxGeometry(1.0, 0.5, 1.0).translate(sx * ARCH.x, RIM.y + 0.25, 0));
    // four cables from the arch down to the screen's top corners
    const archY = (x) => RIM.y + (ARCH.apex - RIM.y) * (1 - (x / ARCH.x) ** 2);
    const rod = (a, b, r) => {
      const d = new V3().subVectors(b, a), L = d.length();
      return new THREE.CylinderGeometry(r, r, L, 5).translate(0, L / 2, 0).applyQuaternion(new Q().setFromUnitVectors(YAX, d.normalize())).translate(a.x, a.y, a.z);
    };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(rod(new V3(sx * 0.9, archY(0.9), 0), new V3(sx * (SCR.w / 2 - 0.25), SCR.y0 + SCR.h, sz * (SCR.w / 2 - 0.25)), 0.035));
    const body = new THREE.Mesh(mergeGeometries(parts.map(strip)), ink({ shade: 0.62, bias: 0.12 }));
    body.name = 'screen-body';
    body.castShadow = body.receiveShadow = true;
    screenG.add(body);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(BAND.d - 0.26, BAND.h - 0.16, 0.04).translate(0, 0, -0.02), ink({ shade: 1.0, bias: 0.36 }));
    plate.matrixAutoUpdate = false;
    plate.matrix.copy(bandM);
    plate.name = 'counter-plate';
    plate.receiveShadow = true;
    screenG.add(plate);
  }
  // the faces: lime while the ad plays, dark for the moment, paper for the slate; on them the ad's mark and progress
  // bar, the invitation, the dots of light and the mark of the moment (lime)
  const FACE = { w: SCR.w - 0.34, h: SCR.h - 0.34 };
  const faceIM = new THREE.InstancedMesh(new THREE.BoxGeometry(FACE.w, FACE.h, 0.05).translate(0, 0, 0.025), ink({ shade: 1.0, bias: 0.32 }), 4);
  faceIM.name = 'screen-faces';
  faceIM.frustumCulled = false;
  faceIM.receiveShadow = true;
  const MARK_Y = 0.1, MARK_S = 0.62;
  const smarkIM = new THREE.InstancedMesh(markGeo(MARK_S, 0.06), ink({ accent: 'ink' }), 4);
  smarkIM.name = 'screen-ad-marks';
  const BAR = { x0: -FACE.w / 2 + 0.24, w: FACE.w - 0.48, y: -FACE.h / 2 + 0.2, h: 0.08 };
  const trackIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.03).translate(0.5, 0, 0), ink({ shade: 0.55, bias: 0.1 }), 4);
  trackIM.name = 'screen-ad-track';
  const barIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.04).translate(0.5, 0, 0), ink({ accent: 'ink' }), 4);
  barIM.name = 'screen-ad-bar';
  const iconIM = new THREE.InstancedMesh(inviteGeo(), ink({ shade: 1.0, bias: 0.5 }), 4);
  iconIM.material.vertexColors = true;
  iconIM.name = 'screen-invitation';
  const ND = 42;
  const dotMat = ink({ shade: 1.0, bias: 0.4, accent: 'lime' });
  const dotIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.04, 10).rotateX(Math.PI / 2), dotMat, 4 * ND);
  dotIM.name = 'screen-dots';
  const bloomMat = ink({ shade: 1.0, bias: 0.3, accent: 'lime' });
  const bloomIM = new THREE.InstancedMesh(markGeo(MARK_S, 0.07), bloomMat, 4);
  bloomIM.name = 'screen-moment-marks';
  const digitIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.05), ink({ accent: 'ink' }), DIG.n * 7);
  digitIM.name = 'screen-counter';
  for (const m of [smarkIM, trackIM, barIM, iconIM, dotIM, bloomIM, digitIM]) { m.frustumCulled = false; m.castShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
  screenG.add(faceIM, smarkIM, trackIM, barIM, iconIM, dotIM, bloomIM, digitIM);
  for (let k = 0; k < 4; k++) faceIM.setColorAt(k, new THREE.Color(1, -1, 0));
  // the dots: the stands' lights seen on the screen (lime), each showing up as a light goes up (a scatter over the
  // face), then going to its place on the mark: 34 round the ring, 8 in the middle
  const DOTS = [];
  {
    const Rd = rng(5), xm = FACE.w / 2 - 0.3, ym = FACE.h / 2 - 0.42;
    for (let i = 0; i < ND; i++) {
      const x = (Rd() * 2 - 1) * xm, y = (Rd() * 2 - 1) * ym + 0.08;
      const ring = i < 34, a = ring ? (i / 34) * Math.PI * 2 : ((i - 34) / 8) * Math.PI * 2;
      const rr = ring ? MARK_S * 0.82 : MARK_S * (i % 2 ? 0.16 : 0.07);
      DOTS.push({ x, y, tx: Math.cos(a) * rr, ty: MARK_Y + Math.sin(a) * rr, u: Math.abs(x) / xm, r: 0.07 + 0.03 * Rd() });
    }
  }
  // the digit cells (x of each centre, in the plate's frame), right-aligned
  const DX = [];
  for (let i = DIG.n - 1, x = DIG.x1 - DIG.cw / 2; i >= 0; i--, x -= DIG.cw) DX[i] = x;
  const screenHit = (() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(SCR.w + 0.8, SCR.h + BAND.h + 0.9, SCR.w + 0.8).translate(0, SC.y - BAND.h / 2, 0), new THREE.MeshBasicMaterial({ visible: false }));
    m.name = 'hit:screen'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    screenG.add(m);
    return m;
  })();

  // =================================================================== the crowd: baked poses, instanced
  const crowdG = new THREE.Group(); crowdG.name = 'crowd';
  g.add(crowdG);
  const lightG = new THREE.Group(); lightG.name = 'lights';
  g.add(lightG);
  const bubbleG = new THREE.Group(); bubbleG.name = 'bubbles';
  g.add(bubbleG);
  const LOW = lowFigure();
  const PHONE_GEO = phoneGeo(), STAR_GEO = starGeo();
  const baker = makePerson({ height: H });
  /** where a phone is (root frame of its figure): in both hands in front ('lap', 'two'), or up in the right hand
   *  ('hand'; 'up' with its light on); the screen faces the eyes */
  function phoneFrame(kind, gL, gR, eye) {
    const c = (kind === 'lap' || kind === 'two' ? gL.clone().add(gR).multiplyScalar(0.5) : gR.clone()).add(new V3(0, kind === 'two' ? 0.04 : 0.08, 0));
    let z = eye.clone().sub(c).normalize();
    // (a phone in the lap lies flatter: its white screen shows to a camera above and in front, under the bowed head)
    if (kind === 'lap') z = z.multiplyScalar(0.45).add(new V3(0, 1, 0)).normalize();
    const ref = new V3(0, 1, 0);
    const y = ref.addScaledVector(z, -ref.dot(z)).normalize();
    const x = new V3().crossVectors(y, z);
    return new M4().makeBasis(x, y, z).setPosition(c);
  }
  const LIGHT_AT = new V3(0, PHONE.h / 2 + 0.24, -0.04);
  const bake = (v, phone) => {
    baker.apply(v);
    baker.group.updateMatrixWorld(true);
    const J = baker.joints;
    const list = BONES.map(([node, key]) => LOW[key].clone().scale(H, H, H).applyMatrix4(J[node].matrixWorld));
    const gL = new V3().setFromMatrixPosition(J.gripL.matrixWorld), gR = new V3().setFromMatrixPosition(J.gripR.matrixWorld);
    const head = J.head.localToWorld(new V3(0, 0.142 * H, -0.01 * H));
    const eye = J.head.localToWorld(new V3(0, 0.07 * H, 0.06 * H));
    let light = null, ph = null;
    if (phone) {
      const P = phoneFrame(phone, gL, gR, eye);
      list.push(PHONE_GEO.clone().applyMatrix4(P));
      ph = new V3().setFromMatrixPosition(P);
      if (phone === 'up') light = LIGHT_AT.clone().applyMatrix4(P);
    }
    return { body: mergeGeometries(list), head, light, phone: ph };
  };
  const SIT = baker.pose('sit'), STAND = baker.pose('stand');
  // beat 1: every head bowed over its own phone (a few a little to one side)
  const DOWN = [phoneDown(SIT, 0), phoneDown(SIT, 0.3), phoneDown(SIT, -0.3)];
  // beat 2: the face up to the screen, then the right arm up with the phone's light on
  const UPF = faceUp(SIT, 0), RAISED = look(lightUp(inHands(SIT), 'R'), 0, -0.6);
  // beat 3: standing up from the bench (the stand moved forward so the feet stay where the seated feet were), the
  // phone in the hands, then held up to photograph the moment
  const ST0 = movePose(STAND, 0, 0, 0.227), STP = look(inHands(ST0), 0, 0.3), SNAP = snapUp(ST0);
  const POSES = {
    P0: [DOWN[0], 'lap'], P1: [DOWN[1], 'lap'], P2: [DOWN[2], 'lap'],
    Q: [blendPoses(DOWN[0], UPF, 0.5), 'lap'], L: [UPF, 'lap'],
    R1: [blendPoses(UPF, RAISED, 0.4), 'hand'], R2: [blendPoses(UPF, RAISED, 0.75), 'up'], U: [RAISED, 'up'],
    T1: [blendPoses(RAISED, STP, 0.33), 'hand'], T2: [blendPoses(RAISED, STP, 0.67), 'lap'], ST: [STP, 'lap'],
    S1: [blendPoses(STP, SNAP, 0.5), 'two'], SN: [SNAP, 'two'],
  };
  const folkMat = ink({ shade: 1.0, bias: 0.28, hooks: FOLK_HOOKS });
  folkMat.vertexColors = true;
  const lightMat = ink({ shade: 1.0, bias: 0.3, accent: 'lime', hooks: FOLK_HOOKS });
  lightMat.vertexColors = true;
  const FR = {};   // name → { mesh, fade, n, light: V3 | null (root frame), head: V3, phone: V3 | null }
  const fadeAttr = (geo, cap) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap).fill(1), 1); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aFade', a); return a; };

  // ---- seats: one row per terrace on the horseshoe's arc, every other seat, each row half a place off the one in front
  // (so a bubble rises between the two heads behind it), nobody in the aisles
  const seats = [];
  for (let i = 0; i < TER.n; i++) {
    const r = SEAT_R(i), dphi = SEAT_SP / r, off = (i % 2) * 0.5;
    const kMax = Math.ceil((Math.PI - PHI0) / dphi) + 1;
    for (let k = -kMax; k <= kMax; k++) {
      const phi = Math.PI + (k + off) * dphi + (R() - 0.5) * 0.08 / r;
      R();   // (a draw kept so the crowd keeps its place and its looks)
      const late = R(), idle = R();
      if (phi < PHI0 || phi > PHI1) continue;
      let inAisle = false;
      for (let a = 0; a < NA; a++) if (Math.abs(phi - AISLE_PHI(a)) < AISLE_HW + 0.55 / r) inAisle = true;
      if (inAisle) continue;
      const u = Math.abs(phi - Math.PI) / (Math.PI - PHI0);   // 0 in the middle, 1 at either end
      seats.push({
        row: i, phi, M: new M4().compose(new V3(r * Math.sin(phi), ROW_Y(i), r * Math.cos(phi)), new Q().setFromAxisAngle(YAX, phi + Math.PI), new V3(1, 1, 1)),
        x: r * Math.sin(phi), z: r * Math.cos(phi),
        late, idle: idle < 0.5 ? 0 : idle < 0.75 ? 1 : 2,
        wave4: T4.wave0 + T4.lap * u,
      });
    }
  }
  const NS = seats.length;
  const nearest = (row, phi) => seats.reduce((b, s, i) => (s.row === row && (b < 0 || Math.abs(s.phi - phi) < Math.abs(seats[b].phi - phi)) ? i : b), -1);
  // the parent: a front-row seat right of the middle, drawn whole (the one the story follows)
  const PS = nearest(0, Math.PI - 0.3);
  seats[PS].parent = true;
  // beat 2: who raises when.  Five raise on their own first (one of them the parent's neighbour, nearer the middle);
  // two never do; the rest follow, the nearer to one who already has the sooner; the parent hesitates in between
  const NB = nearest(0, Math.PI);
  const EARLY = [NB, nearest(1, Math.PI + 0.48), nearest(2, Math.PI - 0.3), nearest(1, Math.PI - 0.84), nearest(2, Math.PI + 0.86)];
  const NEVER = [nearest(1, Math.PI + 0.12), nearest(2, Math.PI - 0.58)];
  EARLY.forEach((i, k) => { seats[i].raise = lerp(T2.early[0], T2.early[1], k / (EARLY.length - 1)) + (k ? 0.04 * (k % 2) : 0); });
  NEVER.forEach((i) => { seats[i].never = true; });
  seats[PS].raise = T2.P.raise[0];
  for (const s of seats) {
    if (s.raise !== undefined || s.never) continue;
    const d = Math.min(...EARLY.map((i) => Math.hypot(seats[i].x - s.x, seats[i].z - s.z) + 1.2 * Math.abs(seats[i].row - s.row)));
    s.raise = lerp(T2.follow[0], T2.follow[1], clamp(d / 8)) + (s.late - 0.5) * 0.16;
  }
  for (const s of seats) if (!s.never) s.fill = s.raise + T2.rise + T2.fill;
  // the screen's dots: one per light that goes up, in the order they go up
  const DOT_T = seats.filter((s) => !s.never).map((s) => s.raise + T2.rise).sort((a, b) => a - b).slice(0, ND);
  BEATS[1].keyAt = seats[PS].fill + T2.mark + 0.08;
  // beat 3: who sends a photo out, and to whom (sorted left to right on both sides, so no two flights cross)
  const SENDERS = [nearest(1, Math.PI + 0.62), nearest(0, Math.PI + 0.33), NB, PS, nearest(1, Math.PI - 0.62)]
    .sort((a, b) => seats[b].phi - seats[a].phi);
  for (const s of seats) {
    s.st3 = T3.stand[0] + s.late * 0.12;
    s.sn3 = T3.snap[0] + s.late * T3.snap[1];
  }
  SENDERS.forEach((i, k) => { seats[i].send = k; seats[i].sn3 = T3.send[0] + T3.send[1] * k; });


  for (const [name, [v, phone]] of Object.entries(POSES)) {
    const b = bake(v, phone);
    const mesh = new THREE.InstancedMesh(b.body, folkMat, NS);
    mesh.name = `folk-${name}`;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.customDepthMaterial = folkDepth;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const fade = fadeAttr(b.body, NS);
    crowdG.add(mesh);
    FR[name] = { mesh, fade, n: 0, light: b.light, head: b.head, phone: b.phone };
  }
  // the crowd's lights (never a shadow) and their bubbles (paper, never a shadow: a cloud's shadow on the row behind
  // read as a dark smudge) and the marks in them (per instance: lime when remembered)
  const lightIM = new THREE.InstancedMesh(toned(STAR_GEO, 1), lightMat, NS + 2);
  lightIM.name = 'lights';
  const lFade = fadeAttr(lightIM.geometry, NS + 2);
  lightIM.count = 0; lightIM.frustumCulled = false; lightIM.castShadow = false; lightIM.receiveShadow = false;
  lightIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lightG.add(lightIM);
  const BUB_GEO = bubbleGeo(0);
  const bubMat = ink({ shade: 1.0, bias: 0.4, hooks: FOLK_HOOKS });
  const bubIM = new THREE.InstancedMesh(BUB_GEO.clone(), bubMat, NS);
  bubIM.name = 'bubbles';
  const bFade = fadeAttr(bubIM.geometry, NS);
  const MARK_GEO = markGeo(MARK_R, 0.03);
  const markMat = ink({ shade: 1.0, bias: 0.3, hooks: FOLK_HOOKS });
  const markIM = new THREE.InstancedMesh(MARK_GEO.clone(), markMat, NS);
  markIM.name = 'bubble-marks';
  const mFade = fadeAttr(markIM.geometry, NS);
  for (const m of [bubIM, markIM]) { m.count = 0; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); bubbleG.add(m); }
  for (let i = 0; i < NS; i++) markIM.setColorAt(i, new THREE.Color(1, -1, 0));
  // the camera flashes of beat 3 (paper, a moment each)
  const flashIM = new THREE.InstancedMesh(flashGeo(), ink({ shade: 1.0, bias: 0.6 }), NS);
  flashIM.name = 'flashes';
  flashIM.count = 0; flashIM.frustumCulled = false; flashIM.castShadow = false; flashIM.receiveShadow = false;
  flashIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  crowdG.add(flashIM);

  // =================================================================== beat 1: the ad's copies fired at the crowd
  // Every loop of the ad fires a volley: each copy leaves the screen's mark, comes down under the band and goes to a
  // bowed head or a phone in the middle of the stands (the ones in every shot), bounces off it and falls on the floor
  // in front of the stands, where it stays: the pile is as big as the count.  All of it worked out here, once.
  const pileG = new THREE.Group(); pileG.name = 'pile';
  g.add(pileG);
  const adMat = ink({ shade: 0.4, bias: 0.06, accent: 'ink' });
  const NSHOT = T1.n * T1.nv;
  const adIM = new THREE.InstancedMesh(markGeo(MARK_F, 0.045), adMat, NSHOT);
  adIM.name = 'ad-copies';
  adIM.frustumCulled = false; adIM.castShadow = false; adIM.receiveShadow = true;
  adIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pileG.add(adIM);
  const SHOTS = [];
  const PILE = { r: [3.0, 4.7], a: 0.62 };
  {
    const Rs = rng(29);
    const vis = seats.map((s, i) => i).filter((i) => Math.abs(seats[i].phi - Math.PI) < 0.62 && !seats[i].never);
    // a fixed shuffle, dealt round: every volley hits different people, the same people again volleys later
    for (let i = vis.length - 1; i > 0; i--) { const j = Math.floor(Rs() * (i + 1)); [vis[i], vis[j]] = [vis[j], vis[i]]; }
    const srcZ = SCR.w / 2 + 0.12;
    for (let v = 0; v < T1.nv; v++) for (let j = 0; j < T1.n; j++) {
      const i = SHOTS.length, seat = seats[vis[i % vis.length]];
      const tf = T1.l0 + v * T1.loop + T1.fire + j * T1.gap, th = tf + T1.fly;
      const pose0 = FR[`P${seat.idle}`];
      const onPhone = (i % 3) === 1;
      const hit = (onPhone ? pose0.phone.clone().add(new V3(0, 0.05, 0.06)) : pose0.head.clone().add(new V3(0, 0.02, 0.07))).applyMatrix4(seat.M);
      const src = new V3((Rs() - 0.5) * 0.9, SC.y + MARK_Y + (Rs() - 0.5) * 0.5, srcZ);
      // under the band and a little in front of it, on the way down to the target
      const ctl = new V3(lerp(src.x, hit.x, 0.35), BAND_Y - 1.3, SCR.w / 2 + 1.4);
      // where it ends: in front of the stands, toward the middle of the target's side; stacked on what is there
      const phi = Math.PI + (seat.phi - Math.PI) * 0.72 + (Rs() - 0.5) * 0.22, r = lerp(PILE.r[0], PILE.r[1], Rs());
      const rx = r * Math.sin(phi), rz = r * Math.cos(phi);
      let under = 0;
      for (const o of SHOTS) if (Math.hypot(o.rest.x - rx, o.rest.z - rz) < MARK_F * 1.6) under++;
      const tilt = 0.8 + 0.4 * Rs();
      const rest = new V3(rx, 0.015 + MARK_F * Math.cos(tilt) * 0.85 + Math.min(3, under) * 0.05, rz);
      const restQ = new Q().setFromEuler(new THREE.Euler(-tilt, (Rs() - 0.5) * 0.9, (Rs() - 0.5) * 0.6, 'YXZ'));
      // the bounce: up off the hit and over to the rest, under gravity
      const vy = Math.sqrt(2 * T1.g * T1.rise);
      const D = (vy + Math.sqrt(vy * vy + 2 * T1.g * Math.max(0, hit.y - rest.y))) / T1.g;
      const hopD = 2 * Math.sqrt((2 * T1.hop) / T1.g);
      SHOTS.push({ tf, th, D, hopD, tl: th + D, tr: th + D + hopD, src, ctl, hit, rest, restQ, vy, spin: 1 + (i % 2), seat });
    }
  }
  const NHIT = SHOTS.length;
  const hitsBy = (t) => { let n = 0; for (const s of SHOTS) if (s.th <= t) n++; return n; };
  /** the exposure counter: one per hit in beat 1; nothing is fired after it, so it stays where beat 1 left it */
  const countAt = (beat, t) => (beat === 0 ? hitsBy(t) : NHIT);
  const _sq = new Q(), _sq2 = new Q();
  /** where copy i is at beat-1 time t (or at rest, later): matrix into _m, false while it has not left the screen */
  function shotAt(s, t, out) {
    if (t < s.tf) return false;
    if (t < s.th) {
      const u = (t - s.tf) / (s.th - s.tf), a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      _p.set(a * s.src.x + b * s.ctl.x + c * s.hit.x, a * s.src.y + b * s.ctl.y + c * s.hit.y, a * s.src.z + b * s.ctl.z + c * s.hit.z);
      out.compose(_p, _sq.identity(), _s.setScalar(lerp(1.15, 1, u)));
      return true;
    }
    if (t < s.tl) {
      const tt = t - s.th, u = tt / s.D;
      _p.set(lerp(s.hit.x, s.rest.x, u), s.hit.y + s.vy * tt - 0.5 * T1.g * tt * tt, lerp(s.hit.z, s.rest.z, u));
      _p.y = Math.max(_p.y, s.rest.y);
      // (face to the camera all the way, so it reads as the mark; it tips over onto the floor as it comes down, with a
      // little wobble on the way)
      _sq.setFromAxisAngle(ZAX, 0.5 * Math.sin(Math.PI * 2 * s.spin * u) * (1 - u));
      out.compose(_p, _sq2.identity().slerp(s.restQ, ss(u, 0.62, 1)).multiply(_sq), _s.setScalar(1));
      return true;
    }
    _p.copy(s.rest);
    if (t < s.tr) { const tt = t - s.tl, v = Math.sqrt(2 * T1.g * T1.hop); _p.y += Math.max(0, v * tt - 0.5 * T1.g * tt * tt); }
    out.compose(_p, s.restQ, _s.setScalar(1));
    return true;
  }
  const pileHit = (() => {
    const pts = [];
    for (const a of [-PILE.a, PILE.a]) for (const r of PILE.r) pts.push(new V3(r * Math.sin(Math.PI + a), 0, r * Math.cos(Math.PI + a)));
    const bb = new THREE.Box3().setFromPoints(pts);
    const sz = bb.getSize(new V3()), c = bb.getCenter(new V3());
    const m = new THREE.Mesh(new THREE.BoxGeometry(sz.x + 0.6, 0.9, sz.z + 0.6).translate(c.x, 0.4, c.z), new THREE.MeshBasicMaterial({ visible: false }));
    m.name = 'hit:pile'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    pileG.add(m);
    return m;
  })();

  /** what the screen shows at (beat, t): tone (0 paper … 1 dark), lime (the ad), ad (the ad's mark), bar (the ad's
   *  progress, -1: none), icon (the invitation), the dots (dot(i): its scale, g: gathered 0…1), bloom (the moment's
   *  mark), slate (the idle mark) */
  const loopPh = (t) => { const x = (t - T1.l0) / T1.loop; return x - Math.floor(x); };
  const BAR_END = loopPh(BEATS[0].dur);
  function screenAt(beat, t) {
    const S = { tone: 0, lime: false, ad: 0, bar: -1, icon: 0, dot: null, g: 0, bloom: 0, slate: 0 };
    if (beat === 0) {
      const tl = loopPh(t) * T1.loop;
      S.lime = true;
      S.ad = pop(seg(tl, 0, T1.pop)) * (1 - sm(seg(tl, T1.loop - 0.14, T1.loop)));
      if (t < T1.l0) S.ad = 1 - sm(seg(t, 0.04, T1.l0));
      S.bar = loopPh(t);
      return S;
    }
    if (beat === 2) {
      // the moment, held while everyone photographs it
      S.tone = 1; S.bloom = 1;
      return S;
    }
    if (beat === 1) {
      // the ad's last loop runs out, then the screen goes dark and asks
      S.lime = t < T2.tone[1] * 0.7;
      S.ad = BAR_END > 0.85 ? 0 : 1 - sm(seg(t, 0, 0.3));
      S.bar = S.lime ? lerp(BAR_END, 1, seg(t, 0, 0.3)) : -1;
      S.tone = ss(t, T2.tone[0], T2.tone[1]);
      S.icon = pop(seg(t, T2.invite[0], T2.invite[1])) * (1 - sm(seg(t, T2.gather[0] - 0.4, T2.gather[0])));
      S.dot = (i) => (i < DOT_T.length ? pop(seg(t, DOT_T[i], DOT_T[i] + 0.22)) : 0) * (1 - sm(seg(t, T2.bloom[0] + 0.04, T2.bloom[1] + 0.08)));
      S.g = ss(t, T2.gather[0], T2.gather[1]);
      S.bloom = pop(seg(t, T2.bloom[0], T2.bloom[1]));
      return S;
    }
    // ten years on: the slate (paper, the mark small and in ink, 十週年 over it), then dark, asking again
    S.slate = 1 - ss(t, T4.tone[0], T4.tone[1]);
    S.tone = ss(t, T4.tone[0], T4.tone[1]);
    S.icon = pop(seg(t, T4.invite[0], T4.invite[1])) * (1 - sm(seg(t, T4.wave0 + 0.3, T4.wave0 + 0.65)));
    S.dot = (i) => { const tA = T4.wave0 + T4.lap * DOTS[i].u; return pop(seg(t, tA, tA + 0.22)) * (1 - sm(seg(t, T4.bloom[0] + 0.04, T4.bloom[1] + 0.08))); };
    S.g = ss(t, T4.gather[0], T4.gather[1]);
    S.bloom = pop(seg(t, T4.bloom[0], T4.bloom[1]));
    return S;
  }

  // the same hair on the people drawn whole (in their own material: they light and dim with the figure)
  const HAIR = toned(hairGeo(), 0.42, -1, ACCENT.ink);
  const addHair = (p) => {
    const m = new THREE.Mesh(HAIR.clone().scale(p.height, p.height, p.height), p.material);
    m.name = 'hair'; m.castShadow = m.receiveShadow = true;
    p.head.add(m);
    return m;
  };

  // =================================================================== the people drawn whole, each with a bubble
  // (each its own materials: a part lights and dims on its own)
  const BUBG = { 0: BUB_GEO, 1: bubbleGeo(BUB.dx), '-1': bubbleGeo(-BUB.dx) };
  function thinker(h, group, name) {
    const p = makePerson({ height: h });
    p.material.userData.u.uShadeBias.value = h < H ? 0.34 : 0.3;
    p.group.name = name;
    const hair = addHair(p);
    group.add(p.group);
    const bm = ink({ shade: 1.0, bias: 0.4 });
    const bub = { 0: new THREE.Mesh(BUBG[0], bm), 1: new THREE.Mesh(BUBG[1], bm), '-1': new THREE.Mesh(BUBG['-1'], bm) };
    const mm = ink({ shade: 1.0, bias: 0.3 });
    const mark = new THREE.Mesh(MARK_GEO, mm);
    for (const m of [...Object.values(bub), mark]) { m.matrixAutoUpdate = false; m.castShadow = m.receiveShadow = false; m.visible = false; bubbleG.add(m); }
    // a phone like the crowd's (in the figure's material: it dims with it), placed from the hands every pose
    const phone = new THREE.Mesh(PHONE_GEO, p.material);
    phone.name = 'phone'; phone.matrixAutoUpdate = false; phone.visible = false; phone.castShadow = true;
    group.add(phone);
    return { p, h, bm, mm, bub, mark, hair, phone, bs: Math.max(0.78, h / H), on: false, side: 0, mk: 0 };
  }
  const kinG = new THREE.Group(); kinG.name = 'kin'; g.add(kinG);
  const friendG = new THREE.Group(); friendG.name = 'friends'; g.add(friendG);
  // the parent: in the crowd's front row in beats 1–3, at the gate with the child in beat 4
  const parentG = new THREE.Group(); parentG.name = 'parent'; g.add(parentG);
  const parent = thinker(H, parentG, 'parent');
  const child = thinker(HC, kinG, 'child');
  // the people outside on the street in beat 3, each bowed over a phone (x, z, yaw)
  const OUT = [
    { x: -4.6, z: 14.4, yaw: 0.9 }, { x: -2.3, z: 16.3, yaw: 0.25 }, { x: 0.35, z: 14.6, yaw: -0.35 },
    { x: 2.6, z: 16.4, yaw: -0.15 }, { x: 4.9, z: 14.0, yaw: -0.85 },
  ];
  const friends = OUT.map((o, k) => thinker(H, friendG, `outside-${k}`));
  // (years later, in beat 4, the parent's hair has gone grey)
  parent.hairGrey = new THREE.Mesh(toned(hairGeo(), 0.8, -1, 0).scale(H, H, H), parent.p.material);
  parent.hairGrey.name = 'hair-grey';
  parent.hairGrey.castShadow = parent.hairGrey.receiveShadow = true;
  parent.hairGrey.visible = false;
  parent.p.head.add(parent.hairGrey);
  for (const T of [parent, child]) {
    T.starMat = ink({ shade: 1.0, bias: 0.3, accent: 'lime' });
    T.star = new THREE.Mesh(STAR_GEO, T.starMat);
    T.star.name = 'light';
    T.star.matrixAutoUpdate = false;
    T.star.visible = false;
    T.star.castShadow = T.star.receiveShadow = false;
    lightG.add(T.star);
  }
  parent.flash = new THREE.Mesh(flashGeo(), flashIM.material);
  parent.flash.name = 'flash'; parent.flash.matrixAutoUpdate = false; parent.flash.visible = false; parent.flash.castShadow = false;
  parentG.add(parent.flash);
  // the trails: little paper dots running from a phone to a bubble
  const TRAIL_N = 5, TRAIL_DOTS = 6;
  const trailMat = ink({ shade: 1.0, bias: 0.4 });
  const trailIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, BUB_T, 16).rotateX(Math.PI / 2), trailMat, TRAIL_N * TRAIL_DOTS);
  trailIM.name = 'trails';
  trailIM.frustumCulled = false;
  trailIM.castShadow = false;
  trailIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bubbleG.add(trailIM);
  // the photo on its way along a trail (the mark of the moment: lime)
  const flyMat = ink({ shade: 1.0, bias: 0.3, accent: 'lime' });
  const flyIM = new THREE.InstancedMesh(MARK_GEO.clone(), flyMat, TRAIL_N);
  flyIM.name = 'photos-on-the-way';
  flyIM.frustumCulled = false;
  flyIM.castShadow = false;
  flyIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bubbleG.add(flyIM);

  // =================================================================== hit proxies
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
  const UNIT = new THREE.BoxGeometry(1, 1, 1).toNonIndexed().attributes.position.array;
  /** one mesh of boxes, rewritten each pose: boxes = [M (matrix of a unit box)] */
  const boxProxy = (name, parentObj, cap, staticGeo = null) => {
    const nStatic = staticGeo ? staticGeo.attributes.position.count * 3 : 0;
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(nStatic + cap * UNIT.length);
    if (staticGeo) arr.set(staticGeo.attributes.position.array, 0);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const m = new THREE.Mesh(geo, HIDDEN);
    m.name = `hit:${name}`; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    const _p = new V3();
    m.userData.place = (list) => {
      let o = nStatic;
      for (const M of list.slice(0, cap)) {
        for (let i = 0; i < UNIT.length; i += 3) { _p.set(UNIT[i], UNIT[i + 1], UNIT[i + 2]).applyMatrix4(M); arr[o++] = _p.x; arr[o++] = _p.y; arr[o++] = _p.z; }
      }
      geo.setDrawRange(0, o / 3);
      geo.attributes.position.needsUpdate = true;
      // (bounds over the boxes in use only: the rest of the array is stale)
      const bb = geo.boundingBox || (geo.boundingBox = new THREE.Box3());
      bb.makeEmpty();
      for (let i = 0; i < o; i += 3) bb.expandByPoint(_p.set(arr[i], arr[i + 1], arr[i + 2]));
      if (bb.isEmpty()) bb.set(_p.set(0, -1e3, 0), _p.clone());
      geo.boundingSphere = bb.getBoundingSphere(geo.boundingSphere || new THREE.Sphere());
    };
    parentObj.add(m);
    return m;
  };
  // the stands: a band over each row's people (static), plus the parent while it sits among them
  const standsBand = (() => {
    const list = [];
    for (let i = 0; i < TER.n; i++) {
      const r = SEAT_R(i) - 0.3;
      list.push(strip(new THREE.CylinderGeometry(r, r, 1.7, 48, 1, true, PHI0, PHI1 - PHI0).translate(0, ROW_Y(i) + 0.85, 0)));
    }
    return mergeGeometries(list);
  })();
  const standsHit = boxProxy('stands', crowdG, 2, standsBand);
  const lightHit = boxProxy('light', lightG, NS + 2);
  const bubbleHit = boxProxy('bubble', bubbleG, NS + 8);
  const personBox = (p, h) => { const o = p.group.position; return new M4().compose(new V3(o.x, o.y + h / 2 + 0.1, o.z), new Q(), new V3(0.36 * h + 0.6, h + 0.6, 0.3 * h + 0.6)); };
  const friendHit = boxProxy('friend', friendG, OUT.length);
  const kinHit = boxProxy('child', kinG, 2);
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
  const blendTo = (a, b, k, h) => {
    const e = sm(k);
    const v = a.x === b.x && a.z === b.z ? a.v : reframe(a.v, a, { x: b.x, z: b.z, yaw: a.yaw }, h);
    return st(b.x, b.z, a.yaw + wrapA(b.yaw - a.yaw) * e, blendPoses(v, b.v, e));
  };
  /** a walk from frame A to frame B over [t0, t1]: turn, walk, settle */
  function walk(p, A, B, t, t0, t1, stride, run = false) {
    const d = Math.hypot(B.x - A.x, B.z - A.z);
    if (t <= t0 && !run) return A;
    if (d < 0.05) return blendTo(A, B, seg(t, t0, t1), p.height);
    const yw = yawTo(A.x, A.z, B.x, B.z);
    const tt = Math.min(0.28, (t1 - t0) * 0.25);
    const ta = run ? t0 : t0 + tt;
    if (t < ta) return blendTo(A, st(A.x, A.z, yw, p.pose('walk', { dist: 0, stride })), seg(t, t0, t0 + tt), p.height);
    if (t < t1 - tt) {
      const r = seg(t, ta, t1 - tt), u = run ? r * (1.25 - 0.25 * r) : sm(r) * 0.85 + r * 0.15;
      return st(A.x + (B.x - A.x) * u, A.z + (B.z - A.z) * u, yw, p.pose('walk', { dist: d * u, stride }));
    }
    return blendTo(st(B.x, B.z, yw, p.pose('walk', { dist: d, stride })), B, seg(t, t1 - tt, t1), p.height);
  }

  // ---- the parent in the stands (beats 1–3): as the crowd, drawn whole.  Beat 2: it looks up with the others, turns
  // to its neighbour as the neighbour's light goes up, lifts its own half way and lowers it again, looks back at the
  // screen, and then raises it.  Beat 3: it stands and photographs the moment, and sends the photo out.
  const PSeat = seats[PS];
  const P0 = { x: PSeat.M.elements[12], z: PSeat.M.elements[14], yaw: PSeat.phi + Math.PI };
  // which way the neighbour is, as the parent's head turns: + is the figure's left (+x)
  const NBside = Math.sign(new V3(seats[NB].x - P0.x, 0, seats[NB].z - P0.z).dot(new V3(1, 0, 0).applyAxisAngle(YAX, P0.yaw))) || 1;
  const NBLOOK = look(inHands(SIT), NBside * 1.0, -0.35);
  const HALF = blendPoses(UPF, RAISED, 0.45);
  function parentStands(beat, t) {
    const F = (v, kind, lit = false) => ({ F: { ...st(P0.x, P0.z, P0.yaw, v), y: ROW_Y(0) }, on: true, phone: kind, lit });
    if (beat === 0) return F(DOWN[PSeat.idle], 'lap');
    if (beat === 1) {
      const P = T2.P;
      if (t < P.look[0]) return F(blendPoses(DOWN[PSeat.idle], UPF, ss(t, T2.up[0], T2.up[0] + 0.32)), 'lap');
      if (t < P.half[0]) return F(blendPoses(UPF, NBLOOK, ss(t, P.look[0], P.look[0] + 0.22)), 'lap');
      if (t < P.back[0]) return F(blendPoses(NBLOOK, HALF, ss(t, P.half[0], P.half[1])), t > P.half[0] + 0.1 ? 'hand' : 'lap');
      if (t < P.raise[0]) return F(blendPoses(HALF, UPF, ss(t, P.back[0], P.back[1])), t < P.back[1] - 0.08 ? 'hand' : 'lap');
      const u = ss(t, P.raise[0], P.raise[1]);
      return F(blendPoses(UPF, RAISED, u), u > 0.1 ? (u > 0.6 ? 'up' : 'hand') : 'lap', u > 0.6);
    }
    // beat 3: stand (the light coming down), lift the phone, the flash, and the photo goes
    const u1 = ss(t, PSeat.st3, PSeat.st3 + (T3.stand[1] - T3.stand[0]));
    if (t < PSeat.sn3) return { F: { ...st(P0.x, P0.z, P0.yaw, blendPoses(RAISED, STP, u1)), y: ROW_Y(0) }, on: true, phone: u1 < 0.3 ? 'hand' : 'lap' };
    const u2 = ss(t, PSeat.sn3, PSeat.sn3 + T3.up);
    return { F: { ...st(P0.x, P0.z, P0.yaw, blendPoses(STP, SNAP, u2)), y: ROW_Y(0) }, on: true, phone: u2 > 0.5 ? 'two' : 'lap', flash: t >= PSeat.sn3 + T3.flash && t < PSeat.sn3 + T3.flash + T3.fl };
  }

  // ---- the parent and the child (beat 4).  They walk in through the gate side by side toward the stage, their backs
  // to the reader; the parent puts its left hand on the child's shoulder and looks down at it, then raises its light
  // and looks up at the screen; the child looks up at the parent, then raises its own light (on the outer side)
  const K4 = { yaw: Math.PI, p: { x: 0.45, z: 9.55 }, c: { x: -0.4, z: 9.65 }, from: GATE_Z + 1.1 };
  const STRIDE = 0.42 * H, STRIDE_C = 0.42 * HC;
  /** a local point → root-frame normalised units of a figure h tall at (x, z, yaw) */
  const toRoot = (p, x, z, yaw, h) => {
    const dx = p.x - x, dz = p.z - z, c = Math.cos(yaw), s = Math.sin(yaw);
    return new V3((dx * c - dz * s) / h, (p.y - floorAt(x, z)) / h, (dx * s + dz * c) / h);
  };
  /** a pose with hands at local points (null: keep that hand), the elbows out */
  const handsTo = (v0, PL, PR, x, z, yaw, h) => {
    const v = clonePose(v0);
    for (const [k, P, sx] of [['L', PL, 1], ['R', PR, -1]]) {
      if (!P) continue;
      v.hand[k].p.copy(toRoot(P, x, z, yaw, h));
      v.hand[k].pole.copy(chestDir(v, sx * 0.8, -1, -0.3));
      v.hand[k].grip.copy(chestQ(v));
    }
    return v;
  };
  function parentAt(beat, t) {
    if (beat < 3) return parentStands(beat, t);
    const T = parent, stand = pz(T.p, 'stand');
    const { x, z } = K4.p, yaw = K4.yaw;
    const FROM = st(x, K4.from, yaw, T.p.pose('walk', { dist: 0, stride: STRIDE }));
    const AT = st(x, z, yaw, stand);
    if (t < T4.walk[1]) return { F: walk(T.p, FROM, AT, t, T4.walk[0], T4.walk[1], STRIDE, true), on: true };
    // the left hand on the child's right shoulder
    const sh = new V3(K4.c.x + 0.15, floorAt(K4.c.x, K4.c.z) + 0.83 * HC, K4.c.z + 0.02);
    const HAND = handsTo(stand, sh, null, x, z, yaw, H);
    const DOWNC = st(x, z, yaw, look(HAND, 0.5, 0.45));
    const RAISE = st(x, z, yaw, look(lightUp(HAND, 'R'), 0.12, -0.55));
    const F = t < T4.pRaise[0] ? blendTo(AT, DOWNC, seg(t, T4.hand[0], T4.hand[1]), H) : blendTo(DOWNC, RAISE, seg(t, T4.pRaise[0], T4.pRaise[1]), H);
    const up = t >= T4.pRaise[0] + 0.12;
    return { F, on: true, phone: up ? (t >= T4.pRaise[0] + 0.28 ? 'up' : 'hand') : null, lit: t >= T4.pRaise[0] + 0.28 };
  }
  function childAt(beat, t) {
    const T = child, stand = pz(T.p, 'stand');
    const { x, z } = K4.c, yaw = K4.yaw;
    if (beat !== 3) return { F: st(x, z, yaw, stand), on: false };
    const FROM = st(x, K4.from + 0.1, yaw, T.p.pose('walk', { dist: 0, stride: STRIDE_C }));
    const AT = st(x, z, yaw, stand);
    if (t < T4.walk[1]) return { F: walk(T.p, FROM, AT, t, T4.walk[0], T4.walk[1], STRIDE_C, true), on: true };
    const UPP = st(x, z, yaw, look(stand, -0.55, -0.5));            // up at the parent, on its right
    const RAISE = st(x, z, yaw, look(lightUp(stand, 'L', 0.42), -0.1, -0.72));
    const F = t < T4.cRaise[0] ? blendTo(AT, UPP, seg(t, T4.hand[0], T4.hand[1]), HC) : blendTo(UPP, RAISE, seg(t, T4.cRaise[0], T4.cRaise[1]), HC);
    const up = t >= T4.cRaise[0] + 0.12;
    return { F, on: true, phone: up ? (t >= T4.cRaise[0] + 0.28 ? 'up' : 'hand') : null, lit: t >= T4.cRaise[0] + 0.28, side: 'L' };
  }
  // ---- the people outside (beat 3): standing on the street, bowed over their phones; when a photo lands in a bubble
  // that one looks up from the phone
  const OUTV = OUT.map(() => look(inHands(STAND), 0, 1.0));
  const OUTUP = OUT.map(() => look(inHands(STAND), 0, 0.15));
  function friendAt(k, beat, t, land) {
    if (beat !== 2) return null;
    const o = OUT[k];
    return { F: st(o.x, o.z, o.yaw, blendPoses(OUTV[k], OUTUP[k], ss(t, land, land + T3.look))), on: true, phone: 'lap' };
  }

  // =================================================================== the pose
  const S_ = { beat: LAST, t: BEATS[LAST].dur, emph: null, scr: {} };
  const _m = new M4(), _m2 = new M4(), _p = new V3(), _q = new Q(), _s = new V3(1, 1, 1);
  const lightBoxes = [], bubbleBoxes = [];
  const LBOX = new M4().makeScale(STAR.r0 * 2 + 0.3, STAR.r0 * 2 + 0.3, 0.4);
  /** a bubble's box (head top P, side dx, scale bs) */
  const bubBox = (P, dx, bs) => new M4().compose(P.clone().add(bubC(dx).multiplyScalar(bs).applyQuaternion(Q_TILT)), Q_TILT, new V3((BUB.w + 0.15) * bs, (BUB.h + 0.2) * bs, 0.3));

  /** the frame and the fade of seat i at (beat, t), and what its bubble holds (mk: the mark's size); null: nobody there */
  const LIT = (u, rise) => (u < 0 ? null : u < rise / 2 ? 'R1' : u < rise ? 'R2' : 'U');
  function seatState(i, beat, t) {
    const s = seats[i];
    if (s.parent && beat < 3) return null;   // (drawn whole)
    // beat 1: bowed over the phone, the bubble empty
    if (beat === 0) return { f: `P${s.idle}`, fade: 1, mk: 0 };
    if (beat === 1) {
      // the head comes up to the screen; the seat's light goes up when it decides to; its mark lands right after
      const up = t - (T2.up[0] + s.late * T2.up[1]);
      const head = up < 0 ? `P${s.idle}` : up < 0.14 ? 'Q' : 'L';
      if (s.never) return { f: head, fade: 1, mk: 0 };
      return { f: LIT(t - s.raise, T2.rise) || head, fade: 1, mk: pop(seg(t, s.fill, s.fill + T2.mark)) };
    }
    if (beat === 2) {
      // the moment is over: those who took part stand up and photograph it; the two who did not stay seated
      if (s.never) return { f: 'L', fade: 1, mk: 0 };
      const u = seg(t, s.st3, s.st3 + (T3.stand[1] - T3.stand[0]));
      if (t < s.sn3) return { f: u <= 0 ? 'U' : ['T1', 'T2', 'ST'][Math.min(2, Math.floor(u * 3))], fade: 1, mk: 1 };
      return { f: t < s.sn3 + T3.up * 0.5 ? 'S1' : 'SN', fade: 1, mk: 1, flash: t >= s.sn3 + T3.flash && t < s.sn3 + T3.flash + T3.fl };
    }
    // beat 4, ten years on: the stands fill again, every one of them remembering; the screen asks, and the lights go
    // up again from the middle out
    const fade = ss(t, T4.refill[0] + s.late * 0.75, T4.refill[0] + 0.4 + s.late * 0.75);
    if (fade <= 0.002) return null;
    return { f: LIT(t - (s.wave4 - T4.rise), T4.rise) || 'L', fade, mk: 1 };
  }

  /** a figure drawn whole: place it, its phone, its bubble (side, size) and the mark in it */
  const _inv = new M4();
  const _gL = new V3(), _gR = new V3(), _eye = new V3();
  function placeThinker(T, A, side, mk) {
    T.on = !!A;
    T.p.group.visible = T.on;
    for (const k of ['0', '1', '-1']) T.bub[k].visible = false;
    T.mark.visible = false;
    T.phone.visible = false;
    T.phoneM = null;
    if (!A) return;
    T.p.apply(A.F.v);
    T.p.group.position.set(A.F.x, A.F.y ?? floorAt(A.F.x, A.F.z), A.F.z);
    T.p.group.rotation.set(0, A.F.yaw, 0);
    T.p.group.updateMatrixWorld(true);
    if (A.phone) {
      const J = T.p.joints, h = T.h;
      _gL.setFromMatrixPosition(J.gripL.matrixWorld).applyMatrix4(_inv);
      _gR.setFromMatrixPosition(J[A.side === 'L' ? 'gripL' : 'gripR'].matrixWorld).applyMatrix4(_inv);
      _eye.copy(J.head.localToWorld(new V3(0, 0.07 * h, 0.06 * h))).applyMatrix4(_inv);
      T.phoneM = phoneFrame(A.phone, _gL, _gR, _eye);
      if (h < H) T.phoneM.multiply(_m2.makeScale(0.8, 0.8, 0.8));
      T.phone.matrix.copy(T.phoneM);
      T.phone.matrixWorldNeedsUpdate = true;
      T.phone.visible = true;
    }
    const head = g.worldToLocal(T.p.top());
    const dx = side * BUB.dx, b = T.bub[String(side)];
    b.visible = true;
    b.matrix.compose(head, Q_TILT, _s.setScalar(T.bs));
    b.matrixWorldNeedsUpdate = true;
    T.side = side; T.mk = mk; T.head = head;
    if (mk > 0.001) {
      T.mark.visible = true;
      T.mark.matrix.compose(head.clone().add(markIn(dx, T.bs)), Q_TILT, _s.setScalar(T.bs * mk));
      T.mark.matrixWorldNeedsUpdate = true;
    }
    bubbleBoxes.push(bubBox(head, dx, T.bs));
  }
  /** a trail from point a (scale sa) to bubble B at u (0 … 1): the photo leaves a, arcs over (arc high) and drops into
   *  B's cloud, a row of paper dots trailing behind it */
  const trails = [], flies = [];
  function trail(a, sa, B, u, arc) {
    if (u <= 0 || u >= 1) return;
    const b = B.head.clone().add(markIn(B.side * BUB.dx, B.bs));
    const at = (v) => { const p = a.clone().lerp(b, v); p.y += arc * Math.sin(Math.PI * v); p.z += 0.06; return p; };
    const s = lerp(sa, B.bs, sm(u)) * (0.8 + 0.2 * Math.abs(Math.cos(Math.PI * u)));
    flies.push(new M4().compose(at(u), Q_TILT, new V3(s, s, s)));
    for (let j = 1; j <= TRAIL_DOTS; j++) {
      const v = u - j * 0.075;
      if (v <= 0.03) continue;
      const r = (0.1 - 0.01 * j) * Math.max(B.bs, 0.9);
      trails.push(new M4().compose(at(v), Q_TILT, new V3(r, r, 1)));
    }
  }
  /** the photo's flight from sender k's phone to the bubble outside: leave, arrive, land */
  const SENDT = SENDERS.map((i, k) => { const s = seats[i], c0 = s.sn3 + T3.flash + 0.06; return { i, k, c0, c1: c0 + T3.fly, l1: c0 + T3.fly + T3.land }; });
  BEATS[2].keyAt = Math.max(...SENDT.map((x) => x.l1)) + 0.1;
  const seatPhone = (i) => FR.SN.phone.clone().applyMatrix4(seats[i].M);

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const t = k * BEATS[beat].dur;
    g.updateMatrixWorld(true);
    _inv.copy(g.matrixWorld).invert();

    // ---- the screen
    const S = screenAt(beat, t);
    S_.scr = S;
    for (let f = 0; f < 4; f++) {
      const F = faceM[f];
      const put = (im, i, x, y, z, sx, sy = sx) => im.setMatrixAt(i, _m.copy(F).multiply(_m2.compose(_p.set(x, y, z), _q.identity(), _s.set(Math.max(1e-4, sx), Math.max(1e-4, sy), 1))));
      // (each loop of the ad gives the face a kick)
      const kick = beat === 0 && t >= T1.l0 ? 1 + 0.035 * Math.sin(Math.PI * seg(loopPh(t) * T1.loop, 0, 0.22)) : 1;
      put(faceIM, f, 0, 0, 0, kick);
      const ms = Math.max(S.ad, S.slate * 0.62);
      smarkIM.setMatrixAt(f, _m.copy(F).multiply(_m2.compose(_p.set(0, S.slate > 0.5 ? MARK_Y - 0.28 : MARK_Y, 0.08), _q.identity(), _s.setScalar(Math.max(1e-4, ms)))));
      const bar = S.bar >= 0;
      put(trackIM, f, BAR.x0, BAR.y, 0.07, bar ? BAR.w : 0, bar ? BAR.h * 0.55 : 0);
      put(barIM, f, BAR.x0, BAR.y, 0.08, bar ? BAR.w * S.bar : 0, bar ? BAR.h : 0);
      iconIM.setMatrixAt(f, _m.copy(F).multiply(_m2.compose(_p.set(0, 0.12, 0.08), _q.identity(), _s.setScalar(Math.max(1e-4, S.icon)))));
      bloomIM.setMatrixAt(f, _m.copy(F).multiply(_m2.compose(_p.set(0, MARK_Y, 0.09), _q.identity(), _s.setScalar(Math.max(1e-4, S.bloom)))));
      for (let i = 0; i < ND; i++) {
        const d = DOTS[i], sc = S.dot ? S.dot(i) : 0;
        put(dotIM, f * ND + i, lerp(d.x, d.tx, S.g), lerp(d.y, d.ty, S.g), 0.085, sc * d.r);
      }
    }
    for (const m of [faceIM, smarkIM, trackIM, barIM, iconIM, dotIM, bloomIM]) m.instanceMatrix.needsUpdate = true;
    {
      const str = String(countAt(beat, t));
      let n = 0;
      for (let i = 0; i < DIG.n; i++) {
        const ch = str.length >= DIG.n - i ? str[str.length - (DIG.n - i)] : null;   // right-aligned, blank on the left
        const on = ch === null ? '' : DIGITS[+ch];
        for (const sg of SEG_ORDER) {
          const [x, y, w, h] = SEGS[sg];
          const show = on.includes(sg);
          digitIM.setMatrixAt(n++, _m.copy(bandM).multiply(_m2.compose(_p.set(DX[i] + x, DIG.y + y, 0.03), _q.identity(), _s.set(show ? w : 1e-4, show ? h : 1e-4, 1))));
        }
      }
      digitIM.instanceMatrix.needsUpdate = true;
    }
    // ---- the ad's copies: flying, bouncing, piled (beats 1–3: the same night); gone ten years on
    let na = 0;
    if (beat < 3) {
      const tt = beat === 0 ? t : 1e9;
      for (const s of SHOTS) if (shotAt(s, tt, _m)) adIM.setMatrixAt(na++, _m);
    }
    adIM.count = na; adIM.visible = na > 0; adIM.instanceMatrix.needsUpdate = true;
    pickable(pileHit, beat < 3);

    // ---- the crowd: deal every seat to its pose's mesh, its light, its bubble and the mark in it
    for (const F of Object.values(FR)) F.n = 0;
    let nl = 0, nb = 0, nf = 0;
    lightBoxes.length = 0; bubbleBoxes.length = 0; trails.length = 0; flies.length = 0;
    const put = (name, M, fade, mk, flash) => {
      const F = FR[name];
      F.mesh.setMatrixAt(F.n, M);
      F.fade.array[F.n] = fade;
      F.n++;
      if (F.light) {
        _m.compose(F.light.clone().applyMatrix4(M), Q_TILT, ONE);
        lightIM.setMatrixAt(nl, _m);
        lFade.array[nl] = fade;
        nl++;
        if (fade > 0.5) lightBoxes.push(_m.clone().multiply(LBOX));
      }
      if (flash && F.phone) flashIM.setMatrixAt(nf++, _m.compose(F.phone.clone().applyMatrix4(M).add(new V3(0, 0.05, 0)), _q.identity(), _s.setScalar(1)));
      // the bubble rides over the head (it faces the camera whichever way the head turns)
      const head = F.head.clone().applyMatrix4(M);
      bubIM.setMatrixAt(nb, _m.compose(head, Q_TILT, ONE));
      bFade.array[nb] = fade;
      markIM.setMatrixAt(nb, _m.compose(head.clone().add(markIn(0)), Q_TILT, _s.setScalar(Math.max(1e-4, mk))));
      mFade.array[nb] = mk > 0.001 ? fade : 0;
      nb++;
      if (fade > 0.5) bubbleBoxes.push(bubBox(head, 0, 1));
    };
    for (let i = 0; i < NS; i++) {
      const s = seatState(i, beat, t);
      if (!s) continue;
      put(s.f, seats[i].M, s.fade, s.mk, s.flash);
    }
    for (const F of Object.values(FR)) {
      F.mesh.count = F.n;
      F.mesh.visible = F.n > 0;
      F.mesh.instanceMatrix.needsUpdate = true;
      F.fade.needsUpdate = true;
    }
    // ---- the parent (one of the crowd in beats 1–3; in beat 4, at the gate with the child) and the child
    const PA = parentAt(beat, t), CA = childAt(beat, t);
    const pmk = beat === 0 ? 0 : beat === 1 ? pop(seg(t, PSeat.fill, PSeat.fill + T2.mark)) : 1;
    placeThinker(parent, PA.on ? PA : null, 0, pmk);
    parent.hairGrey.visible = beat === 3;
    parent.hair.visible = beat !== 3;
    parent.flash.visible = !!PA.flash;
    if (PA.flash && parent.phoneM) { parent.flash.matrix.compose(_p.setFromMatrixPosition(parent.phoneM).add(new V3(0, 0.05, 0)), _q.identity(), _s.setScalar(1.1)); parent.flash.matrixWorldNeedsUpdate = true; }
    placeThinker(child, CA.on ? CA : null, 0, beat === 3 ? pop(seg(t, T4.cFill[0], T4.cFill[1])) : 0);
    // the lights of the parent (beat 2, beat 4) and the child (beat 4): a star over the raised phone
    for (const [T, A] of [[parent, PA], [child, CA]]) {
      const on = !!(A.on && A.lit && T.phoneM);
      T.star.visible = on;
      if (!on) continue;
      T.star.matrix.compose(LIGHT_AT.clone().applyMatrix4(T.phoneM), Q_TILT, _s.setScalar(T === child ? 0.75 : 1));
      T.star.matrixWorldNeedsUpdate = true;
      lightBoxes.push(T.star.matrix.clone().multiply(LBOX));
    }
    // ---- the people outside (beat 3): an empty bubble until the photo lands in it
    const friendBoxes = [];
    friends.forEach((T, k) => {
      const sd = SENDT[k];
      const A = friendAt(k, beat, t, sd.c1);
      placeThinker(T, A, 0, beat === 2 ? pop(seg(t, sd.c1, sd.l1)) : 0);
      if (A) friendBoxes.push(personBox(T.p, H));
    });
    if (beat === 2) {
      SENDT.forEach((sd) => {
        const from = seats[sd.i].parent ? (parent.phoneM ? _p.setFromMatrixPosition(parent.phoneM).clone() : null) : seatPhone(sd.i);
        if (from && friends[sd.k].on) trail(from, 0.85, friends[sd.k], seg(t, sd.c0, sd.c1), T3.arc);
      });
    }
    // the flashes of the crowd
    flashIM.count = nf; flashIM.visible = nf > 0; flashIM.instanceMatrix.needsUpdate = true;
    lightIM.count = nl; lightIM.visible = nl > 0; lightIM.instanceMatrix.needsUpdate = true; lFade.needsUpdate = true;
    bubIM.count = nb; bubIM.visible = nb > 0; bubIM.instanceMatrix.needsUpdate = true; bFade.needsUpdate = true;
    markIM.count = nb; markIM.visible = nb > 0; markIM.instanceMatrix.needsUpdate = true; mFade.needsUpdate = true;
    kinG.updateMatrixWorld(true);
    parentG.updateMatrixWorld(true);
    const kinBoxes = [], standBoxes = [];
    if (beat === 3) { if (parent.on) kinBoxes.push(personBox(parent.p, H)); if (child.on) kinBoxes.push(personBox(child.p, HC)); }
    else if (parent.on) standBoxes.push(personBox(parent.p, H));
    kinHit.userData.place(kinBoxes);
    pickable(kinHit, kinBoxes.length > 0);
    friendHit.userData.place(friendBoxes);
    pickable(friendHit, friendBoxes.length > 0);
    lightHit.userData.place(lightBoxes);
    pickable(lightHit, lightBoxes.length > 0);
    standsHit.userData.place(standBoxes);
    bubbleHit.userData.place(bubbleBoxes);
    // the trails
    trails.slice(0, trailIM.count = Math.min(trails.length, TRAIL_N * TRAIL_DOTS)).forEach((M, i) => trailIM.setMatrixAt(i, M));
    trailIM.visible = trailIM.count > 0;
    trailIM.instanceMatrix.needsUpdate = true;
    flies.slice(0, flyIM.count = Math.min(flies.length, TRAIL_N)).forEach((M, i) => flyIM.setMatrixAt(i, M));
    flyIM.visible = flyIM.count > 0;
    flyIM.instanceMatrix.needsUpdate = true;

    Object.assign(S_, { beat, t });
    applyEmphasis();
    return api;
  }

  // =================================================================== emphasis by subtraction
  function setDim(obj, k) {
    dim(obj, k);
    obj.traverse((o) => { if (o.isMesh && !o.userData.hitProxy) o.castShadow = k < 0.5 ? !!o.userData.cast0 : false; });
  }
  // the end holds both halves of the title: the counter on the screen (bought) and every bubble with the mark in lime
  // (lived), the parent and the child in the gate
  const REST = ['bubble', 'child', 'light', 'stands', 'screen'];
  const _c = new THREE.Color();
  function applyEmphasis() {
    const E = S_.emph;                       // null: the map (everything in plain ink); a Set: those parts full
    const map = E === null;
    const full = (id) => map || E.has(id);
    const S = S_.scr || {}, beat = S_.beat;
    // in beat 4 the stands, their lights and the screen are the parent's and the child's background (half drawn, the
    // lights, the marks and the counter kept)
    const back = !map && beat === 3 && full('child') && !full('stands');
    // the screen and its band
    setDim(screenG, full('screen') ? 0 : back ? 0.42 : E.size === 1 ? 1 : 0.45);
    const scrLit = !map && (full('screen') || back);
    for (let f = 0; f < 4; f++) faceIM.setColorAt(f, _c.setRGB(lerp(1, 0.14, S.tone || 0), -1, scrLit && S.lime ? ACCENT.lime : 0, THREE.LinearSRGBColorSpace));
    faceIM.instanceColor.needsUpdate = true;
    bloomMat.userData.u.uAccent.value = scrLit ? ACCENT.lime : 0;
    dotMat.userData.u.uAccent.value = scrLit ? ACCENT.lime : 0;
    // the ad's copies, flying and piled
    setDim(pileG, full('pile') ? 0 : 0.85);
    // the crowd, its lights and its bubbles
    const crowdK = full('stands') ? 0 : back ? 0.42 : 1;
    setDim(crowdG, crowdK);
    const lightK = full('light') || full('stands') ? 0 : back ? 0.42 : 1;
    setDim(lightIM, lightK);
    lightMat.userData.u.uAccent.value = !map && lightK < 0.5 ? ACCENT.lime : 0;
    const bubK = full('bubble') || full('stands') ? 0 : back ? 0.42 : 1;
    setDim(bubIM, bubK);
    setDim(markIM, bubK);
    const keptLime = !map && bubK < 0.5;
    // (no lime: a dark mark, drawn in pencil)
    for (let i = 0; i < markIM.count; i++) markIM.setColorAt(i, _c.setRGB(keptLime ? 1 : 0.14, -1, keptLime ? ACCENT.lime : 0, THREE.LinearSRGBColorSpace));
    if (markIM.instanceColor) markIM.instanceColor.needsUpdate = true;
    const bub = full('bubble');
    const flying = bub || full('friend');
    setDim(trailIM, flying ? 0 : 1);
    setDim(flyIM, flying ? 0 : 1);
    flyMat.userData.u.uAccent.value = !map && flying ? ACCENT.lime : 0;
    setDim(flashIM, full('stands') ? 0 : 1);
    // the people drawn whole: each with its own bubble (a person in focus keeps it)
    const who = (T, own) => {
      const on = full(own), b = bub || on || (own === 'stands' && back);
      setDim(T.p.group, on ? 0 : back && own === 'stands' ? 0.42 : 1);
      dim(T.bm, b ? 0 : 1); dim(T.mm, b ? 0 : 1);
      const lit = !map && b;
      T.mm.userData.u.uAccent.value = lit ? ACCENT.lime : 0;
      T.mm.userData.u.uShadeMul.value = lit ? 1 : 0.15;
      T.mm.userData.u.uShadeBias.value = lit ? 0.3 : 0.0;
      return on;
    };
    who(parent, beat === 3 ? 'child' : 'stands');
    friends.forEach((T) => who(T, 'friend'));
    who(child, 'child');
    for (const T of [parent, child]) {
      const on = full('child') || full('light') || full('stands');
      setDim(T.star, on ? 0 : 1);
      T.starMat.userData.u.uAccent.value = !map && on ? ACCENT.lime : 0;
    }
    // the scenery drops to its contour in focus, except the terraces (drawn half while the stands are full), the stage,
    // and the venue's wall where it is the line between inside and out (beats 3–4)
    setDim(scenery, map ? 0 : 1);
    setDim(bowl, !full('stands') ? (back ? 0.7 : 1) : map || beat >= 2 ? 0 : 0.6);
    setDim(stage, full('stands') || full('pile') ? 0 : 1);
    setDim(wallMesh, map || beat >= 2 ? 0 : 0.8);
  }
  function emphasize(ids) {
    S_.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }

  // =================================================================== anchors: labels, hotspots, framing
  const facePt = (f, x, y, z = 0.1) => g.localToWorld(new V3(x, y, z).applyMatrix4(faceM[f]));
  const bandPt = (x, y, z = 0.06) => g.localToWorld(new V3(x, y, z).applyMatrix4(bandM));
  const seatPt = (row, dphi, dy) => { const r = SEAT_R(row), phi = Math.PI + dphi; return W(r * Math.sin(phi), ROW_Y(row) + dy, r * Math.cos(phi)); };
  const thinkerBubble = (T, top) => (T.on && T.head ? g.localToWorld(T.head.clone().add(bubC(T.side * BUB.dx).multiplyScalar(T.bs).add(new V3(0, (top ? 0.5 : -0.5) * BUB.h * T.bs, 0.03)).applyQuaternion(Q_TILT))) : null);
  // the light the ring names: the parent's (beats 2 and 4) or a front-row one near the middle
  const lightSeat = nearest(0, Math.PI + 0.33);
  const seatLight = (i) => {
    const s = seatState(i, S_.beat, S_.t), F = s && FR[s.f];
    if (!F || !F.light || s.fade < 0.5) return null;
    return g.localToWorld(F.light.clone().applyMatrix4(seats[i].M));
  };
  const lightAt = () => (parent.star.visible ? g.localToWorld(new V3().setFromMatrixPosition(parent.star.matrix)) : seatLight(lightSeat));
  const bubbleAt = (top) => (S_.beat === 3 ? thinkerBubble(child.on ? child : parent, top)
    : S_.beat === 2 ? thinkerBubble(friends[2].on ? friends[2] : parent, top) : thinkerBubble(parent, top));
  const pileC = () => W(0, 0.25, -lerp(PILE.r[0], PILE.r[1], 0.45));
  const parts = {
    screen: { hit: screenHit, anchor: () => facePt(0, -FACE.w / 2 + 0.25, -FACE.h / 2 + 0.05), beat: 0 },
    pile: { hit: pileHit, anchor: pileC, beat: 0 },
    // (the middle of the second row: in the frame of every shot, the stands behind the parent and the child included)
    stands: { hit: standsHit, anchor: () => seatPt(1, 0.12, TER.bench + 0.3), beat: 3 },
    bubble: { hit: bubbleHit, anchor: () => bubbleAt(false) || seatPt(0, 0, 2.2), beat: 1 },
    light: { hit: lightHit, anchor: () => lightAt() || seatPt(0, 0.33, 2.6), beat: 1 },
    // (the people outside are not there at the end: their tap has no ring then, dot: false in the copy)
    friend: { hit: friendHit, anchor: () => (friends[2].on ? friends[2].p.base() : W(OUT[2].x, PLAZA.y, OUT[2].z)), beat: 2 },
    child: { hit: kinHit, anchor: () => (child.on ? child.p.base() : W(K4.c.x, floorAt(K4.c.x, K4.c.z), K4.c.z)), beat: 3 },
  };
  const labelAt = {
    pile: () => (S_.beat < 3 ? W(-1.2, 0.35, -lerp(PILE.r[0], PILE.r[1], 0.3)) : null),
    // (at the head of the outermost one outside: the label finds room on the street beside it)
    friend: () => (friends[0].on ? g.localToWorld(friends[0].head.clone()) : null),
    bubble: () => bubbleAt(true),
    light: () => lightAt(),
    child: () => (child.on ? child.p.base() : null),
  };
  const decalAt = {
    counter: () => bandPt(-BAND.d / 2 + 0.72, 0),
    // the ad's tag, in the face's top left corner, as on a feed
    adtag: () => facePt(0, -FACE.w / 2 + 0.42, FACE.h / 2 - 0.3, 0.1),
    // the screen's question, under the invitation, while it is asked
    invite: () => ((S_.scr.icon || 0) > 0.6 ? facePt(0, 0, -FACE.h / 2 + 0.36, 0.12) : null),
    // ten years on: the screen's slate names the year (beat 4 and the end)
    year: () => (S_.beat === 3 ? facePt(0, 0, FACE.h / 2 - 0.34, 0.12) : null),
  };
  const decalUnit = { counter: 0.34, adtag: 0.34, invite: 0.3, year: 0.36 };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const portrait = () => typeof innerWidth !== 'number' || innerHeight >= innerWidth;
  const faceBox = () => [facePt(0, -SCR.w / 2, SCR.h / 2), facePt(0, SCR.w / 2, SCR.h / 2), bandPt(-BAND.d / 2, -BAND.h / 2), bandPt(BAND.d / 2, -BAND.h / 2)];
  const feet = (x, z, h = H, up = 0.2) => [W(x - 0.5, floorAt(x, z) - 0.1, z + 0.6), W(x + 0.5, floorAt(x, z) + h + up, z)];
  // the top of a seated person's bubble (row, dphi)
  const SEATED_TOP = 1.52 + BUB.lift + BUB.h + 0.1;
  const bubTop = (row, dphi) => seatPt(row, dphi, SEATED_TOP);
  // beats 1–2, low behind the stage: the screen above, the middle of the stands with their bubbles below it, and the
  // floor in front of them where the copies pile up
  const pileFront = (w) => [W(-w * 4.2, 0, -PILE.r[0] + 0.2), W(w * 4.2, 0, -PILE.r[0] + 0.2)];
  const A_PTS = (w = 0.5) => [...faceBox(), seatPt(0, -w, 0), seatPt(0, w, 0), bubTop(2, -w * 0.6), bubTop(2, w * 0.6), ...pileFront(w)];
  const DA_PTS = () => [...faceBox(), seatPt(0, -0.95, 0), seatPt(0, 0.95, 0), bubTop(2, -0.6), bubTop(2, 0.6), ...pileFront(0.8)];
  // beat 3, from the street: the people outside with their bubbles, the wall and its gate, the front of the stands
  // with the ones who send their photos
  const outPts = () => OUT.flatMap((o) => feet(o.x, o.z, H, BUB.lift + BUB.h + 0.2));
  const C_PTS = () => [...outPts(), seatPt(0, -0.45, 2.4), seatPt(0, 0.45, 2.4), seatPt(1, 0, 2.6)];
  const CL_PTS = () => [...outPts(), seatPt(0, -0.7, 2.4), seatPt(0, 0.7, 2.4), seatPt(1, 0, 2.6)];
  // beat 4 and the end, low behind the gate: the parent and the child large in the middle with their bubbles and their
  // lights, the stands full of lights and bubbles beyond them, the screen with its counter over them
  const KIN_PTS = () => [...feet(K4.p.x, K4.p.z, H, BUB.lift + BUB.h + 0.25), ...feet(K4.c.x, K4.c.z, HC, (BUB.lift + BUB.h) * 0.8 + 0.2),
    // (their raised lights: the parent's out to its right, the child's to its left)
    W(K4.p.x + 1.05, floorAt(K4.p.x, K4.p.z) + 2.55, K4.p.z), W(K4.c.x - 0.85, floorAt(K4.c.x, K4.c.z) + 1.75, K4.c.z)];
  const END_PTS = () => [...KIN_PTS(), ...faceBox()];
  const K4AZ = 0.0;
  // fitAnchors aims at the centre of the anchors' bounding box.  Seen from above and in front, the near half of a set
  // this deep projects larger than its far half, so the picture sat low with an empty band above it.  aim() finds the
  // point whose projection centres the set, at the distance the fit will choose for the free rect ui.js lays out, and
  // adds two anchors on the camera's line through that point, one before and one beyond the set: they always land on
  // the frame's centre, so they never limit the fit, but they put the bounding box's centre there
  const TANF = Math.tan((32 * Math.PI) / 360);              // engine.js FOV
  const _ac = new THREE.PerspectiveCamera(32, 1, 0.5, 4000), _av = new V3();
  function aim(pts, az, el, margin = 0.075) {
    const Wd = innerWidth, Ht = innerHeight, desk = Wd >= 900 && Ht >= 500, tall = Ht >= Wd;
    const rw = desk ? Wd - 400 : tall ? Wd : Wd * 0.62, rh = desk ? Ht - 64 : tall ? Ht - 200 : Ht - 48;
    const hx = TANF * (rw / Ht) * (1 - 2 * margin), hy = TANF * (rh / Ht) * (1 - 2 * margin);
    const dir = new V3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    const T = new THREE.Box3().setFromPoints(pts).getCenter(new V3());
    const ext = (d) => {
      _ac.position.copy(T).addScaledVector(dir, d);
      _ac.lookAt(T);
      _ac.updateMatrixWorld(true);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) {
        const q = _av.copy(p).applyMatrix4(_ac.matrixWorldInverse), w = Math.max(1e-3, -q.z);
        x0 = Math.min(x0, q.x / w); x1 = Math.max(x1, q.x / w); y0 = Math.min(y0, q.y / w); y1 = Math.max(y1, q.y / w);
      }
      return [x0, x1, y0, y1];
    };
    let d = 50;
    for (let it = 0; it < 5; it++) {
      let lo = 1, hi = 4000;
      for (let i = 0; i < 40; i++) { const m = Math.sqrt(lo * hi), [x0, x1, y0, y1] = ext(m); if (x1 - x0 <= 2 * hx && y1 - y0 <= 2 * hy) hi = m; else lo = m; }
      d = hi;
      const [x0, x1, y0, y1] = ext(d);
      T.addScaledVector(new V3().setFromMatrixColumn(_ac.matrixWorld, 0), ((x0 + x1) / 2) * d)
        .addScaledVector(new V3().setFromMatrixColumn(_ac.matrixWorld, 1), ((y0 + y1) / 2) * d);
    }
    let v = 0;
    for (const p of pts) for (const a of ['x', 'y', 'z']) { const f = Math.abs(dir[a]); if (f > 0.15) v = Math.max(v, Math.abs(p[a] - T[a]) / f); }
    v = Math.min(v, d * 0.7);
    const far = T.clone().addScaledVector(dir, -v);
    if (Math.abs(dir.y) <= 0.15) {
      let y0 = Math.min(T.y - v * dir.y, T.y + v * dir.y), y1 = Math.max(T.y - v * dir.y, T.y + v * dir.y);
      for (const p of pts) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      const fy = y1 - T.y > T.y - y0 ? 2 * T.y - y1 : 2 * T.y - y0;
      if (Math.abs(fy - T.y) / (d + v) < hy * 0.97) far.y = fy;
    }
    return [...pts, T.clone().addScaledVector(dir, v), far];
  }
  const shot = (az, el, pts, margin) => ({ az: VIEW_AZ + az, el, margin, anchors: () => aim(pts(), VIEW_AZ + az, el, margin) });
  const phoneShot = (az, el, pts, elLand, ptsLand = pts, margin) => ({
    az: VIEW_AZ + az,
    margin,
    get el() { return portrait() ? el : elLand; },
    anchors: () => (portrait() ? aim(pts(), VIEW_AZ + az, el, margin) : aim(ptsLand(), VIEW_AZ + az, elLand, margin)),
  });
  const shots = {
    phone: [
      phoneShot(0.0, 0.3, () => A_PTS(0.5), 0.24, () => A_PTS(0.8)),
      phoneShot(0.0, 0.38, C_PTS, 0.32, CL_PTS),
      phoneShot(K4AZ, 0.3, END_PTS, 0.26, END_PTS),
    ],
    desk: [shot(0.0, 0.28, DA_PTS), shot(0.0, 0.34, CL_PTS), shot(K4AZ, 0.28, END_PTS)],
  };

  function rest() { return pose(LAST, 1); }
  function ambient() { /* nothing moves by itself: the held result stays still */ }

  const api = {
    id: 'memory',
    group: g,
    zone: 'consumer',
    anchor: W(0, RIM.y + 9, 0),
    pin: W(0, STAGE.h, 0),
    // accents at full strength over the stands and the way out in front of them
    focus: { pos: W(0, 3, 6), r: 22 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalUnit,
    lever: null,
    // the beat's decisive actor: beat 1's subject is the screen; the crowd takes part in beat 2; the people outside
    // receive in beat 3; the parent and the child carry beat 4 and the end
    get mainActor() { return S_.beat === 0 ? 'screen' : S_.beat === 1 ? 'stands' : S_.beat === 2 ? 'friend' : 'child'; },
    restParts: REST,
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // for lab and screenshot scripts only; nothing in the app reads it
    _dbg: { seats, FR, parent, child, friends, SHOTS, SENDT, K4, floorAt, S_, aim, faceM, countAt, screenAt, PS, NB, EARLY, NEVER },
  };
  rest();
  emphasize(null);
  return api;
}

/** a curved wall: the arc [a0, a1] (angles from +z toward +x) between radii ri and ro, from yb up to yt; inner, outer
 *  and top faces and both ends, flat normals */
function arcWall(a0, a1, ri, ro, yb, yt, N) {
  const pos = [], nor = [];
  const P = (r, a, y) => new V3(r * Math.sin(a), y, r * Math.cos(a));
  const quad = (a, b, c, d, n) => { for (const p of [a, b, c, a, c, d]) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); } };
  const _e1 = new V3(), _e2 = new V3(), _n = new V3();
  const face = (a, b, c, d, n) => {
    _n.crossVectors(_e1.subVectors(b, a), _e2.subVectors(c, a));
    if (_n.dot(n) >= 0) quad(a, b, c, d, n); else quad(a, d, c, b, n);
  };
  for (let i = 0; i < N; i++) {
    const u0 = a0 + ((a1 - a0) * i) / N, u1 = a0 + ((a1 - a0) * (i + 1)) / N, m = (u0 + u1) / 2;
    const out = new V3(Math.sin(m), 0, Math.cos(m));
    face(P(ro, u0, yb), P(ro, u1, yb), P(ro, u1, yt), P(ro, u0, yt), out);
    face(P(ri, u0, yb), P(ri, u0, yt), P(ri, u1, yt), P(ri, u1, yb), out.clone().negate());
    face(P(ri, u0, yt), P(ro, u0, yt), P(ro, u1, yt), P(ri, u1, yt), new V3(0, 1, 0));
  }
  for (const [a, sg] of [[a0, -1], [a1, 1]]) {
    const n = new V3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(sg);
    face(P(ri, a, yb), P(ro, a, yb), P(ro, a, yt), P(ri, a, yt), n);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return geo;
}
/** the stands: a lathe of PROF over the arc [a0, a1] (angles from +z toward +x); one band per profile segment, so
 *  the steps keep their edges; normals analytic, every triangle wound to face its normal */
function sectorLathe(prof, a0, a1, N, riser = 1) {
  const pos = [], nor = [], col = [];
  const _n = new V3(), _e1 = new V3(), _e2 = new V3();
  let tone = 1;
  const push = (p, n) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(tone, -1, -1); };
  const tri = (a, na, b, nb, c, nc) => {
    _e1.subVectors(b, a); _e2.subVectors(c, a); _n.crossVectors(_e1, _e2);
    if (_n.dot(na) + _n.dot(nb) + _n.dot(nc) >= 0) { push(a, na); push(b, nb); push(c, nc); } else { push(a, na); push(c, nc); push(b, nb); }
  };
  const pt = (r, y, phi) => new V3(r * Math.sin(phi), y, r * Math.cos(phi));
  const nm = (nr, ny, phi) => new V3(nr * Math.sin(phi), ny, nr * Math.cos(phi));
  for (let s = 0; s < prof.length - 1; s++) {
    const [ra, ya] = prof[s], [rb, yb] = prof[s + 1];
    const dr = rb - ra, dy = yb - ya, L = Math.hypot(dr, dy);
    if (L < 1e-6) continue;
    const nr = -dy / L, ny = dr / L;
    // the risers a shade darker than the treads: seen from in front, across the stage, nothing else draws the steps
    tone = Math.abs(dy) > Math.abs(dr) && dy > 0 ? riser : 1;
    for (let j = 0; j < N; j++) {
      const p0 = a0 + ((a1 - a0) * j) / N, p1 = a0 + ((a1 - a0) * (j + 1)) / N;
      const A0 = pt(ra, ya, p0), A1 = pt(ra, ya, p1), B0 = pt(rb, yb, p0), B1 = pt(rb, yb, p1);
      const n0 = nm(nr, ny, p0), n1 = nm(nr, ny, p1);
      tri(A0, n0, B0, n0, A1, n1);
      tri(A1, n1, B0, n0, B1, n1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}
/** a flat polygon (contour in (r, y)) in the vertical half-plane at angle phi, facing n */
function endGeo(contour, phi, n, tone = 1) {
  const v2 = contour.map(([r, y]) => new THREE.Vector2(r, y));
  const tris = THREE.ShapeUtils.triangulateShape(v2, []);
  const pos = [], nor = [];
  const e1 = new V3(), e2 = new V3(), c = new V3();
  const at = (v) => new V3(v.x * Math.sin(phi), v.y, v.x * Math.cos(phi));
  for (const [i, j, k] of tris) {
    const a = at(v2[i]), b = at(v2[j]), d = at(v2[k]);
    e1.subVectors(b, a); e2.subVectors(d, a); c.crossVectors(e1, e2);
    for (const p of c.dot(n) >= 0 ? [a, b, d] : [a, d, b]) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 3).fill(0).map((_, i) => (i % 3 ? -1 : tone)), 3));
  return geo;
}
