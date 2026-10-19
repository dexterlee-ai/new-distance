// People: an artist's lay figure (a wooden drawing mannequin), pencil-hatched like every real thing in the world.
// Pencil person = real person (design system §7.4).  The figure is built at its real size (feet at y = 0, facing +z,
// its left hand on +x) from one merged mesh per bone, so it reads as a person at 60–140 px: an egg head on a slim
// neck, a ribcage and a pelvis with a ball at the waist, tapered limbs with dark ball joints, mitten hands, wedge feet.
//
// Poses are pose vectors (hips, spine, head, hand targets, foot targets), solved by two-bone IK, so a hand lands
// exactly where a pose puts it (a seal on a table, a cup at the mouth) and a planted foot never slides.
// setPose(name, k, opts) blends from a base pose to the named pose by k (0 … 1). It is deterministic: the same
// arguments always give the same frame, however often or in whatever order they are called.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink } from './mat.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion;

// ---- proportions in heights (H = 1): about 6.8 heads, the head a touch large so it still reads when small
const FH = 0.042;                         // ankle above the sole
const SHIN = 0.245, THIGH = 0.245, LEG = SHIN + THIGH;
const HIP_X = 0.054, HIP_DY = -0.012;     // hip joints in the hips frame
const WAIST_DY = 0.066;                   // waist ball above the hips node
const SH_X = 0.114, SH_Y = 0.182;         // shoulder joints in the chest (waist) frame
const NECK_Y = 0.2, HEAD_DY = 0.054;
const UARM = 0.168, FARM = 0.142, PALM = 0.046, ARM_B = FARM + PALM;
const HIPS_Y = FH + 0.99 * LEG - HIP_DY;  // hips node when standing
const STEP = 0.3, STANCE = 0.6;             // one walking step (a walk cycle is two) and the share of a cycle a foot is planted
const SIT_HIP = FH + SHIN + 0.004;         // hip joints when seated (thighs level, shins upright)
const SEAT = SIT_HIP - 0.047;              // the seat top under the thighs

// tone per part (multiplies the lit shade): joints darker so the articulation reads, limbs a step below the torso
const TONE = { torso: 1.0, head: 1.0, limb: 0.86, joint: 0.26, hand: 0.86, foot: 0.6, neck: 0.86 };

const X_AXIS = new V3(1, 0, 0);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** 'L' / 'l' → 'L'; anything else → 'R' (the right hand is the default everywhere) */
const sideOf = (s) => (typeof s === 'string' && s.toUpperCase() === 'L' ? 'L' : 'R');
const smooth01 = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const eul = (x, y, z, order = 'YXZ') => new Q().setFromEuler(new THREE.Euler(x, y, z, order));

// ------------------------------------------------------------------ geometry (normalised: H = 1)

function tone(g, t) {
  let x = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
  const n = x.attributes.position.count, c = new Float32Array(n * 3);
  // vertex colour = (shade multiplier, -1 keep the material's style, -1 keep its accent)
  for (let i = 0; i < n; i++) { c[i * 3] = t; c[i * 3 + 1] = -1; c[i * 3 + 2] = -1; }
  x.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return x;
}
const at = (g, x = 0, y = 0, z = 0) => { g.translate(x, y, z); return g; };
const ball = (r, x = 0, y = 0, z = 0, sz = 1) => { const g = new THREE.SphereGeometry(r, 12, 9); if (sz !== 1) g.scale(1, 1, sz); return at(g, x, y, z); };

/** lathe from a profile [[r, y], …] listed bottom → top; sz squashes the depth */
function lathe(profile, seg = 16, sz = 1) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  if (sz !== 1) g.scale(1, 1, sz);
  return g;
}

/** a limb hanging from y = 0 to y = -len, tapering r0 → r1, slightly bellied, with rounded ends */
function spindle(r0, r1, len, seg = 12) {
  const pts = [[0, -len - r1 * 0.4]];
  const n = 8;
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    pts.push([(r0 + (r1 - r0) * t) * (0.84 + 0.22 * Math.sin(Math.PI * t)), -t * len]);
  }
  pts.push([0, r0 * 0.4]);
  return lathe(pts, seg);
}

function headGeo() {
  const g = new THREE.SphereGeometry(1, 22, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const jaw = y < 0 ? 1 + 0.2 * y : 1;            // narrower toward the chin: an egg, not a ball
    const skull = z < 0 ? 1.06 : 1;                  // a fuller back of the head
    p.setXYZ(i, x * 0.054 * jaw, y * 0.074, z * 0.063 * jaw * skull);
  }
  g.computeVertexNormals();
  g.rotateX(-0.22);                                  // the long axis leans back: the chin forward, the crown behind
  return at(g, 0, 0.068, 0.008);
}

function mittenGeo() {
  const palm = new THREE.SphereGeometry(1, 12, 10);
  palm.scale(0.017, 0.05, 0.03);
  const p = palm.attributes.position;                // squarer toward the knuckles, like a mitten
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) p.setY(i, y * 0.92); }
  palm.computeVertexNormals();
  palm.translate(0, -0.046, 0.002);
  const thumb = new THREE.SphereGeometry(1, 8, 6);
  thumb.scale(0.012, 0.026, 0.012);
  thumb.rotateX(0.55);
  thumb.translate(0, -0.03, 0.03);
  return [palm, thumb];
}

function footGeo() {
  const g = new THREE.BoxGeometry(0.058, 0.044, 0.155, 1, 1, 5);
  g.translate(0, -FH + 0.022, 0.0375);               // sole at y = -FH, heel 0.04 behind the ankle, toe 0.115 ahead
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getZ(i) + 0.04) / 0.155;
    const top = p.getY(i) > -FH + 0.01;
    if (top) p.setY(i, -FH + 0.044 * (1 - 0.55 * smooth01((t - 0.3) / 0.7)));
    p.setX(i, p.getX(i) * (1 - 0.3 * smooth01((t - 0.62) / 0.38)) * (t < 0.08 ? 0.9 : 1));
  }
  g.computeVertexNormals();
  return g;
}

function buildGeometry() {
  const pelvis = lathe([[0, -0.078], [0.04, -0.072], [0.074, -0.052], [0.088, -0.02], [0.088, 0.015], [0.075, 0.045], [0.05, 0.06], [0, 0.064]], 18, 0.7);
  const chest = lathe([[0, -0.01], [0.056, 0], [0.07, 0.04], [0.086, 0.09], [0.096, 0.135], [0.097, 0.165], [0.088, 0.188], [0.062, 0.204], [0.03, 0.212], [0, 0.214]], 18, 0.62);
  const neck = at(new THREE.CylinderGeometry(0.021, 0.024, 0.064, 10), 0, 0.03, 0);
  const merge = (list) => mergeGeometries(list.map(([g, t]) => tone(g, t)));
  const side = (s) => ({
    uarm: merge([[ball(0.036), TONE.joint], [spindle(0.03, 0.025, UARM), TONE.limb], [ball(0.027, 0, -UARM, 0), TONE.joint]]),
    farm: merge([[spindle(0.025, 0.019, FARM), TONE.limb], [ball(0.02, 0, -FARM, 0), TONE.joint]]),
    hand: merge(mittenGeo().map((g) => [g, TONE.hand])),
    thigh: merge([[spindle(0.048, 0.035, THIGH), TONE.limb], [ball(0.036, 0, -THIGH, 0), TONE.joint]]),
    shin: merge([[spindle(0.037, 0.025, SHIN), TONE.limb], [ball(0.025, 0, -SHIN, 0), TONE.joint]]),
    foot: merge([[footGeo(), TONE.foot]]),
    s,
  });
  return {
    pelvis: merge([[pelvis, TONE.torso]]),
    chest: merge([[ball(0.056, 0, 0, 0, 0.78), TONE.joint], [chest, TONE.torso]]),
    neck: merge([[neck, TONE.neck]]),
    // a small dark nose: front and back of a lay figure look alike, and at 60 px the facing must still read
    head: merge([[headGeo(), TONE.head], [ball(0.012, 0, 0.06, 0.069, 1.6), TONE.joint]]),
    L: side(1), R: side(-1),
  };
}
let GEO = null;   // shared normalised geometry; each figure scales its own copy

// ------------------------------------------------------------------ pose vectors (normalised units)

function blank() {
  const hand = () => ({ p: new V3(), pole: new V3(0, 0, -1), grip: new Q() });
  const foot = () => ({ p: new V3(), q: new Q() });
  return { hips: { p: new V3(0, HIPS_Y, 0), q: new Q() }, waist: new Q(), neck: new Q(), head: new Q(), hand: { L: hand(), R: hand() }, foot: { L: foot(), R: foot() } };
}

function copyPose(s, d = blank()) {
  d.hips.p.copy(s.hips.p); d.hips.q.copy(s.hips.q);
  d.waist.copy(s.waist); d.neck.copy(s.neck); d.head.copy(s.head);
  for (const k of ['L', 'R']) {
    d.hand[k].p.copy(s.hand[k].p); d.hand[k].pole.copy(s.hand[k].pole); d.hand[k].grip.copy(s.hand[k].grip);
    d.foot[k].p.copy(s.foot[k].p); d.foot[k].q.copy(s.foot[k].q);
  }
  return d;
}

/** unit a → unit b by k along the great circle (out may not alias a or b) */
function slerpDir(a, b, k, out) {
  const d = Math.min(1, Math.max(-1, a.dot(b))), th = Math.acos(d);
  if (th < 1e-4 || Math.PI - th < 1e-3) return out.lerpVectors(a, b, k).normalize();
  const s = Math.sin(th);
  return out.copy(a).multiplyScalar(Math.sin((1 - k) * th) / s).addScaledVector(b, Math.sin(k * th) / s);
}
const _ha = new V3(), _hb = new V3(), _hd = new V3(), _sa = new V3(), _sb = new V3(), _so = new V3();
const _qA = new Q(), _qB = new Q(), _qO = new Q();

/**
 * a ⟶ b by k (0 … 1).  Hands travel on an arc round the shoulder (direction and reach blended in the chest frame),
 * so a raised arm swings out and up instead of folding through the shoulder and passing in front of the face.
 * A foot that changes place is lifted on the way, one foot after the other (the one that travels farther first);
 * the hips travel over the ground with the stepping feet, and sink just enough that every foot can reach its
 * place, so a transition steps instead of skating and never leaves both feet in the air.
 */
export function blendPoses(a, b, k, out = blank()) {
  k = Number.isNaN(+k) ? 1 : clamp01(+k);
  // feet first: their progress drives the hips
  const travel = {}, ek = {};
  for (const s of ['L', 'R']) travel[s] = Math.hypot(b.foot[s].p.x - a.foot[s].p.x, b.foot[s].p.z - a.foot[s].p.z);
  const firstL = travel.L > travel.R;
  for (const s of ['L', 'R']) {
    const fa = a.foot[s], fb = b.foot[s], fo = out.foot[s], steps = travel[s] > 0.015;
    // the farther-travelling foot steps during k 0 … 0.5, the other during 0.5 … 1 (a foot that barely moves slides)
    const u = steps ? clamp01((s === 'L') === firstL ? 2 * k : 2 * k - 1) : k, e = smooth01(u);
    fo.p.lerpVectors(fa.p, fb.p, e); fo.q.slerpQuaternions(fa.q, fb.q, e);
    if (steps) fo.p.y += Math.sin(Math.PI * u) * Math.min(0.06, 0.45 * travel[s]);
    ek[s] = e;
  }
  // hips: over the ground in step with the feet (weighted by how far each travels), up and down and turning by k
  const tsum = travel.L + travel.R, hk = tsum > 0.015 ? (travel.L * ek.L + travel.R * ek.R) / tsum : k;
  out.hips.p.set(a.hips.p.x + (b.hips.p.x - a.hips.p.x) * hk, a.hips.p.y + (b.hips.p.y - a.hips.p.y) * k, a.hips.p.z + (b.hips.p.z - a.hips.p.z) * hk);
  out.hips.q.slerpQuaternions(a.hips.q, b.hips.q, k);
  // …and no higher than every foot can reach (both poses already satisfy this; it bites only in between)
  fitLegs(out);
  out.waist.slerpQuaternions(a.waist, b.waist, k);
  out.neck.slerpQuaternions(a.neck, b.neck, k);
  out.head.slerpQuaternions(a.head, b.head, k);
  _qA.copy(a.hips.q).multiply(a.waist); _qB.copy(b.hips.q).multiply(b.waist); _qO.copy(out.hips.q).multiply(out.waist);
  for (const s of ['L', 'R']) {
    const ha = a.hand[s], hb = b.hand[s], ho = out.hand[s];
    const sx = s === 'L' ? SH_X : -SH_X;
    _sa.copy(inChest(a, sx, SH_Y, 0)); _sb.copy(inChest(b, sx, SH_Y, 0)); _so.copy(inChest(out, sx, SH_Y, 0));
    _ha.subVectors(ha.p, _sa).applyQuaternion(_q1.copy(_qA).invert());
    _hb.subVectors(hb.p, _sb).applyQuaternion(_q1.copy(_qB).invert());
    const la = _ha.length(), lb = _hb.length();
    if (la < 1e-5 || lb < 1e-5) _hd.lerpVectors(_ha, _hb, k);
    else slerpDir(_ha.divideScalar(la), _hb.divideScalar(lb), k, _hd).multiplyScalar(la + (lb - la) * k);
    ho.p.copy(_hd.applyQuaternion(_qO)).add(_so);
    ho.pole.lerpVectors(ha.pole, hb.pole, k); ho.grip.slerpQuaternions(ha.grip, hb.grip, k);
  }
  return out;
}
const _q1 = new Q(), _hj = new V3();
const REACH_LEG = 0.999 * LEG;              // the hips never rise past this hip-to-ankle distance (the IK limit is 0.9995)
/** lower the hips just enough that both ankles are within reach of their hip joints (a no-op for a reachable pose) */
function fitLegs(v) {
  let drop = 0;
  hipsM(v, _mf);
  for (const s of ['L', 'R']) {
    const j = _hj.set(s === 'L' ? HIP_X : -HIP_X, HIP_DY, 0).applyMatrix4(_mf), f = v.foot[s].p;
    const d2 = (j.x - f.x) ** 2 + (j.z - f.z) ** 2, top = f.y + Math.sqrt(Math.max(0, REACH_LEG * REACH_LEG - d2));
    drop = Math.max(drop, j.y - top);
  }
  v.hips.p.y -= Math.min(drop, 0.15);
  return v;
}
const _mf = new THREE.Matrix4();

const _ma = new THREE.Matrix4(), _mb = new THREE.Matrix4(), _tv = new V3(), ONE = new V3(1, 1, 1);
function hipsM(v, out) { return out.compose(v.hips.p, v.hips.q, ONE); }
function waistM(v, out) { hipsM(v, out); return out.multiply(_mb.compose(_tv.set(0, WAIST_DY, -0.004), v.waist, ONE)); }
function headM(v, out) {
  waistM(v, out);
  out.multiply(_mb.compose(_tv.set(0, NECK_Y, -0.004), v.neck, ONE));
  return out.multiply(_mb.compose(_tv.set(0, HEAD_DY, 0.004), v.head, ONE));
}
/** a point given in the pose's chest (waist) frame, in the root frame */
const inChest = (v, x, y, z) => new V3(x, y, z).applyMatrix4(waistM(v, _ma));
const inHead = (v, x, y, z) => new V3(x, y, z).applyMatrix4(headM(v, _ma));
/** a direction given in the chest frame, in the root frame */
const dirChest = (v, x, y, z) => new V3(x, y, z).applyQuaternion(_qa.copy(v.hips.q).multiply(v.waist));
const _qa = new Q();

function feetStand(v, spread = 1) {
  v.foot.L.p.set(0.07 * spread, FH, 0.005); v.foot.L.q.copy(eul(0, 0.12, 0));
  v.foot.R.p.set(-0.07 * spread, FH, 0.005); v.foot.R.q.copy(eul(0, -0.12, 0));
}
function armsHang(v, sides = ['L', 'R']) {
  for (const k of sides) {
    const s = k === 'L' ? 1 : -1;
    v.hand[k].p.copy(inChest(v, s * 0.176, -0.16, 0.026));
    v.hand[k].pole.copy(dirChest(v, s * 0.35, -0.1, -1));
    v.hand[k].grip.copy(_qa.copy(v.hips.q).multiply(v.waist));
  }
}
function seatedBase(v) {
  v.hips.p.set(0, SIT_HIP - HIP_DY, 0);
  v.hips.q.copy(eul(-0.05, 0, 0));
  v.waist.copy(eul(0.08, 0, 0));
  v.head.copy(eul(0.06, 0, 0));
  v.foot.L.p.set(0.075, FH, 0.232); v.foot.L.q.copy(eul(0, 0.08, 0));
  v.foot.R.p.set(-0.075, FH, 0.232); v.foot.R.q.copy(eul(0, -0.08, 0));
}
function handOnLap(v, k) {
  const s = k === 'L' ? 1 : -1;
  v.hand[k].p.set(s * 0.07, SIT_HIP + 0.056, 0.19);
  v.hand[k].pole.set(s * 0.35, -0.4, -1);
  v.hand[k].grip.identity();
}

/** world → normalised: options in world units are divided by the figure's height */
const wu = (x, H, def) => (x == null ? def : x / H);

const POSES = {
  stand() {
    const v = blank();
    feetStand(v);
    armsHang(v);
    return v;
  },

  /** half a pace back (a start, as when the printer shudders): the right foot steps back, the weight follows */
  stepBack() {
    const v = blank();
    v.foot.L.p.set(0.062, FH, 0.02); v.foot.L.q.copy(eul(0, 0.12, 0));
    v.foot.R.p.set(-0.078, FH, -0.25); v.foot.R.q.copy(eul(0, -0.22, 0));
    v.hips.p.set(0, HIPS_Y - 0.022, -0.125);
    v.hips.q.copy(eul(-0.03, -0.1, 0));
    v.waist.copy(eul(-0.1, 0.05, 0));
    v.head.copy(eul(-0.08, 0.04, 0));
    v.hand.L.p.copy(inChest(v, 0.14, 0.02, 0.17)); v.hand.L.pole.copy(dirChest(v, 0.5, -1, -0.4));
    v.hand.R.p.copy(inChest(v, -0.13, 0.04, 0.18)); v.hand.R.pole.copy(dirChest(v, -0.5, -1, -0.4));
    return v;
  },

  /** one arm raised, holding a prop high (opts.side 'R' default) */
  raise(o = {}) {
    const k = sideOf(o.side), s = k === 'L' ? 1 : -1, other = k === 'L' ? 'R' : 'L';
    const v = blank();
    feetStand(v);
    v.hips.p.x = -s * 0.008;
    v.waist.copy(eul(-0.03, 0, s * 0.055));
    v.neck.copy(eul(-0.08, s * 0.08, 0));
    v.head.copy(eul(-0.14, s * 0.14, 0));
    v.hand[k].p.copy(inChest(v, s * 0.2, 0.5, 0.075));
    v.hand[k].pole.copy(dirChest(v, s * 1, -0.2, -0.6));
    armsHang(v, [other]);
    return v;
  },

  /** a prop held up at the chest, facing forward: the right hand carries it, the left steadies it */
  hold() {
    const v = blank();
    feetStand(v);
    v.waist.copy(eul(-0.025, 0, 0));
    v.head.copy(eul(0.05, 0, 0));
    v.hand.R.p.copy(inChest(v, -0.045, -0.02, 0.17)); v.hand.R.pole.copy(dirChest(v, -0.6, -1, -0.3));
    v.hand.L.p.copy(inChest(v, 0.075, -0.035, 0.155)); v.hand.L.pole.copy(dirChest(v, 0.6, -1, -0.3));
    return v;
  },

  /**
   * the right hand pressed down onto a table in front (a seal, a stamp).  opts (world units, root frame):
   * y = grip height (default just above the hips), fwd = grip distance in front (default 0.24 H), x (default -0.075 H),
   * table = table-top height for the steadying left hand (default y - 0.17 H).  Leans and bends the knees until the
   * right hand reaches.  The left hand rests on the table beside it when a modest further lean reaches it; otherwise
   * (a low table) on the left thigh just above the knee, as one does bending over a low surface; and if even that is
   * out of reach, it hangs relaxed.
   */
  stamp(o = {}, H = 1) {
    const T = new V3(wu(o.x, H, -0.075), wu(o.y, H, 0.6), wu(o.fwd, H, 0.24));
    const TL = new V3(T.x + 0.17, wu(o.table, H, T.y - 0.17) + 0.02, T.z - 0.04);
    const v = blank();
    v.foot.L.p.set(0.068, FH, 0.04); v.foot.L.q.copy(eul(0, 0.1, 0));
    v.foot.R.p.set(-0.068, FH, -0.05); v.foot.R.q.copy(eul(0, -0.16, 0));
    const R = UARM + ARM_B, STEP_L = 0.024;
    const leanTo = (lean) => {
      v.hips.p.set(0, HIPS_Y - 0.14 * smooth01((lean - 0.3) / 0.85), -0.11 * Math.sin(lean));
      v.hips.q.copy(eul(lean * 0.35, 0, 0));
      v.waist.copy(eul(lean * 0.65 + 0.04, 0, 0));
      fitLegs(v);
    };
    const reaches = (side, p, f) => inChest(v, side === 'L' ? SH_X : -SH_X, SH_Y, 0).distanceTo(p) <= f * R;
    let iR = 50;
    for (let i = 0; i <= 50; i++) { leanTo(i * STEP_L); if (reaches('R', T, 0.94)) { iR = i; break; } }
    // the left hand may ask for up to 0.36 rad more lean (never past 0.6 in all): a deeper bow reads as a collapse
    const iMax = Math.max(iR, Math.min(iR + 15, 25));
    let iL = -1;
    for (let i = iR; i <= iMax; i++) { leanTo(i * STEP_L); if (reaches('L', TL, 0.95)) { iL = i; break; } }
    leanTo((iL >= 0 ? iL : iR) * STEP_L);
    v.neck.copy(eul(0.14, -0.05, 0));
    v.head.copy(eul(0.26, -0.08, 0));
    v.hand.R.p.copy(T); v.hand.R.pole.copy(dirChest(v, -0.8, 0.25, -1));
    const chestQ = _qa.copy(v.hips.q).multiply(v.waist);
    v.hand.L.grip.copy(chestQ);
    if (iL >= 0) {
      v.hand.L.p.copy(TL); v.hand.L.pole.copy(dirChest(v, 0.8, 0.25, -1));
      return v;
    }
    // on the thigh: a quarter of the way from the knee to the hip joint, on top of the thigh
    const hip = new V3(HIP_X, HIP_DY, 0).applyMatrix4(hipsM(v, _ma));
    const knee = kneeOf(hip, v.foot.L.p, new V3(0.08, 0.15, 1));
    const onThigh = knee.lerp(hip, 0.25).add(_tv.set(0.004, 0.05, 0.012));
    if (reaches('L', onThigh, 0.97)) {
      v.hand.L.p.copy(onThigh); v.hand.L.pole.copy(dirChest(v, 1, 0.1, -0.6));
    } else {
      // hanging relaxed: straight down from the shoulder whatever the lean, the arm all but straight (a shorter drop
      // bends the elbow out and reads as a hand on the hip)
      const sh = inChest(v, SH_X, SH_Y, 0);
      v.hand.L.p.set(sh.x + 0.03, sh.y - 0.335, sh.z + 0.03); v.hand.L.pole.set(0.2, 0, -1);
    }
    return v;
  },

  /** seated on a stool or bench (seat top at person.seatH), hands on the lap */
  sit() {
    const v = blank();
    seatedBase(v);
    handOnLap(v, 'L'); handOnLap(v, 'R');
    return v;
  },

  /**
   * seated, a cup raised to the mouth in the right hand: placed so that the straw of a makeCup({ h: opts.cup })
   * held with hold('R', cup) meets the lips (opts.cup in world units, default 0.27 H).  opts.to: the grip point instead.
   */
  lift(o = {}, H = 1) {
    const v = blank();
    seatedBase(v);
    v.waist.copy(eul(0.0, 0, 0));
    v.neck.copy(eul(0.06, 0, 0));
    v.head.copy(eul(0.12, 0, 0));
    const tilt = -0.3;
    if (o.to) v.hand.R.p.set(o.to.x / H, o.to.y / H, o.to.z / H);
    else {
      // makeCup held by hold(): the straw tip sits (0.16 h, 0.83 h, 0) from the grip, before the tilt
      const h = wu(o.cup, H, 0.27), mouth = inHead(v, 0, 0.03, 0.068);
      const up = 0.83 * h;
      v.hand.R.p.set(mouth.x - 0.16 * h, mouth.y - up * Math.cos(tilt), mouth.z - up * Math.sin(tilt) + 0.01);
    }
    v.hand.R.pole.set(-0.7, -0.6, -0.5);
    v.hand.R.grip.copy(eul(tilt, 0, 0));
    handOnLap(v, 'L');
    return v;
  },

  /** standing, head and torso turned by opts.yaw (radians, + turns toward the figure's left); opts.pitch nods */
  watch(o = {}) {
    const yaw = o.yaw ?? 0.7, pitch = o.pitch ?? 0;
    const v = blank();
    feetStand(v);
    v.hips.q.copy(eul(0, yaw * 0.22, 0));
    v.waist.copy(eul(0, yaw * 0.36, 0));
    v.neck.copy(eul(pitch * 0.4, yaw * 0.18, 0));
    v.head.copy(eul(pitch * 0.6, yaw * 0.24, 0));
    armsHang(v);
    return v;
  },

  /**
   * walking: opts.phase 0 … 1 is one cycle of two steps (or opts.dist, world units walked).  The feet are placed for a
   * body that advances 2 · stride per cycle along +z (person.cycle with the default stride): move the group by that
   * much — or pass dist — and a planted foot stays put.  opts.stride: step length in world units (0.16 … 0.42 H).
   * The hips ride on the planted leg (a compass gait), which gives the bob.
   */
  walk(o = {}, H = 1) {
    const st = Math.min(0.42, Math.max(0.16, o.stride != null ? o.stride / H : STEP));
    let p = o.dist != null ? o.dist / (2 * st * H) : (o.phase ?? 0);
    p -= Math.floor(p);
    const v = blank();
    const c = Math.cos(2 * Math.PI * p), sn = Math.sin(2 * Math.PI * p);
    const LM = 0.993 * LEG, reach = STANCE * st;
    // the hips ride as high as every foot allows: the planted feet, and the swinging foot too (its lift counts), so
    // the height is continuous through heel strike and toe-off and the swinging foot can always reach its target
    let hy = LM;
    for (const [k, ph0] of [['L', p], ['R', p + 0.5]]) {
      const s = k === 'L' ? 1 : -1;
      const ph = ph0 - Math.floor(ph0);
      const f = v.foot[k];
      if (ph < STANCE) {                                // stance: flat, moving back under the body
        const z = reach * (1 - 2 * ph / STANCE);
        f.p.set(s * 0.058, FH, z);
        f.q.copy(eul(0, s * 0.06, 0));
        hy = Math.min(hy, Math.sqrt(LM * LM - z * z));
      } else {                                          // swing: an arc forward, toe down then toe up
        const u = (ph - STANCE) / (1 - STANCE), e = u * u * (3 - 2 * u);
        const lift = 0.05 * Math.sin(Math.PI * u), z = reach * (2 * e - 1);
        f.p.set(s * 0.058, FH + lift, z);
        f.q.copy(eul(0.36 * Math.sin(Math.PI * u) * Math.cos(Math.PI * u), s * 0.06, 0));
        hy = Math.min(hy, lift + Math.sqrt(LM * LM - z * z));
      }
    }
    v.hips.p.set(0.01 * sn, FH + hy - HIP_DY, 0);
    const sw = st / STEP;                               // longer strides swing more
    v.hips.q.copy(eul(0, -0.07 * sw * c, 0.02 * sn));
    v.waist.copy(eul(0.04, 0.1 * sw * c, -0.02 * sn));
    v.neck.copy(eul(0, -0.02 * c, 0));
    v.head.copy(eul(0.02, -0.01 * c, 0));
    for (const k of ['L', 'R']) {
      // arms swing against the legs: the right arm goes forward with the left leg
      const s = k === 'L' ? 1 : -1, fw = -s * c;
      // in the chest frame, kept within reach of the shoulder (long strides swing the hand farther)
      const d = _tv.set(s * (0.162 - SH_X), -0.166 + 0.02 * Math.max(0, fw) * sw - SH_Y, 0.03 + 0.1 * sw * fw);
      d.multiplyScalar(Math.min(1, (0.97 * (UARM + ARM_B)) / d.length()));
      v.hand[k].p.copy(inChest(v, s * SH_X + d.x, SH_Y + d.y, d.z));
      v.hand[k].pole.copy(dirChest(v, s * 0.35, -0.1, -1));
      v.hand[k].grip.copy(_qa.copy(v.hips.q).multiply(v.waist));
    }
    return v;
  },
};
export const POSE_NAMES = Object.keys(POSES);

// ------------------------------------------------------------------ two-bone IK

const _D = new V3(), _N = new V3(), _U = new V3(), _W = new V3(), _E = new V3(), _bx = new V3(), _by = new V3(), _bz = new V3(), _MB = new THREE.Matrix4();
/**
 * Upper bone from S, lower bone ending at T (both in the root joint's parent frame).  pole: where the middle joint
 * points.  The bones hang along -y at rest; the upper bone's local +z ends up toward the front of the limb (the
 * side an elbow folds to, the side a knee points to), so mittens and feet keep their facing.
 */
function solve2(S, T, a, b, pole, knee, q1, q2) {
  _D.subVectors(T, S);
  let c = _D.length();
  if (c < 1e-6) _D.set(0, -1, 0); else _D.divideScalar(c);
  c = Math.min(Math.max(c, Math.abs(a - b) + 1e-4), (a + b) * 0.9995);
  _N.copy(pole).addScaledVector(_D, -pole.dot(_D));
  if (_N.lengthSq() < 1e-10) { _N.set(Math.abs(_D.x) < 0.9 ? 1 : 0, Math.abs(_D.x) < 0.9 ? 0 : 1, 0); _N.addScaledVector(_D, -_N.dot(_D)); }
  _N.normalize();
  const ca = Math.min(1, Math.max(-1, (a * a + c * c - b * b) / (2 * a * c)));
  _U.copy(_D).multiplyScalar(ca).addScaledVector(_N, Math.sqrt(1 - ca * ca));
  _E.copy(S).addScaledVector(_U, a);
  _W.copy(S).addScaledVector(_D, c).sub(_E).divideScalar(b);
  _bz.copy(_W).addScaledVector(_U, -_W.dot(_U));
  if (_bz.lengthSq() < 1e-10) _bz.copy(_N).negate();
  _bz.normalize();
  if (knee) _bz.negate();
  _by.copy(_U).negate();
  _bx.crossVectors(_by, _bz);
  q1.setFromRotationMatrix(_MB.makeBasis(_bx, _by, _bz));
  q2.setFromAxisAngle(X_AXIS, (knee ? 1 : -1) * Math.acos(Math.min(1, Math.max(-1, _U.dot(_W)))));
}
const _k1 = new Q(), _k2 = new Q();
/** where the knee of a leg from hip joint S to ankle T sits (same frame as S, T and pole), as apply() would put it */
function kneeOf(S, T, pole) {
  solve2(S, T, THIGH, SHIN, pole, true, _k1, _k2);
  return _E.clone();
}

// ------------------------------------------------------------------ the figure

/**
 * makePerson({ height = 4.5, seated = false })
 * → { group, setPose(name, k = 1, opts), joints, hand(side), head,
 *     hold(side, prop, { rot, handle }), pose(name, opts), blend(a, b, k), apply(vec), poseNames,
 *     height, cycle, seatH, top(), base(), chest(), material }
 *
 * setPose blends from the base pose — `opts.from` (a pose name, { name, opts } or a pose vector) when given,
 * otherwise the last pose that was set with k = 1 (at first: 'stand', or 'sit' when seated) — to the named pose.
 * Calls with k = 1 make that pose the new base.  For a pure pose(beat, k) in a district, pass `from` explicitly.
 * hand(side) is the grip ('L' or 'R'): an Object3D at the palm whose axes stay upright and facing the figure's front
 * in every pose; parent props to it (hold() does that and offsets the prop by its handle()).
 * Dimming: the whole figure shares one ink() material (`material`).  dim(person.material, k) dims the figure alone;
 * dim(person.group, k) also dims every prop it holds (they are children of its grips).
 * Walking with a custom stride: the body advances 2 · stride per cycle (person.cycle is for the default stride).
 */
export function makePerson({ height = 4.5, seated = false } = {}) {
  const H = height;
  if (!GEO) GEO = buildGeometry();
  const mat = ink({ shade: 1.0, bias: 0.2 });
  mat.vertexColors = true;
  const group = new THREE.Group();
  group.name = 'person';
  const J = {};
  const node = (name, parent, x, y, z) => {
    const o = new THREE.Group(); o.name = name; o.position.set(x * H, y * H, z * H); parent.add(o); J[name] = o; return o;
  };
  const body = (geo, parent) => {
    const g = geo.clone(); g.scale(H, H, H);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const hips = node('hips', group, 0, HIPS_Y, 0);
  body(GEO.pelvis, hips);
  const waist = node('waist', hips, 0, WAIST_DY, -0.004);
  body(GEO.chest, waist);
  const neck = node('neck', waist, 0, NECK_Y, -0.004);
  body(GEO.neck, neck);
  const head = node('head', neck, 0, HEAD_DY, 0.004);
  body(GEO.head, head);
  for (const k of ['L', 'R']) {
    const s = k === 'L' ? 1 : -1, G = GEO[k];
    const sh = node('shoulder' + k, waist, s * SH_X, SH_Y, 0); body(G.uarm, sh);
    const el = node('elbow' + k, sh, 0, -UARM, 0); body(G.farm, el);
    const wr = node('wrist' + k, el, 0, -FARM, 0); body(G.hand, wr);
    node('grip' + k, wr, 0, -PALM, 0);
    const hp = node('hip' + k, hips, s * HIP_X, HIP_DY, 0); body(G.thigh, hp);
    const kn = node('knee' + k, hp, 0, -THIGH, 0); body(G.shin, kn);
    const an = node('ankle' + k, kn, 0, -SHIN, 0); body(G.foot, an);
  }

  const cur = blank();
  let base = fitLegs(POSES[seated ? 'sit' : 'stand']({}, H));
  const _S = new V3(), _T = new V3(), _P = new V3(), _M = new THREE.Matrix4(), _Mi = new THREE.Matrix4(), _q = new Q();

  /** pose a vector (normalised units): hips and spine directly, arms and legs by IK */
  function apply(v) {
    J.hips.position.copy(v.hips.p).multiplyScalar(H); J.hips.quaternion.copy(v.hips.q);
    J.waist.quaternion.copy(v.waist); J.neck.quaternion.copy(v.neck); J.head.quaternion.copy(v.head);
    waistM(v, _M); _Mi.copy(_M).invert();
    for (const k of ['L', 'R']) {
      const s = k === 'L' ? 1 : -1, h = v.hand[k];
      _S.set(s * SH_X, SH_Y, 0);
      _T.copy(h.p).applyMatrix4(_Mi);
      _P.copy(h.pole).transformDirection(_Mi);
      const sh = J['shoulder' + k], el = J['elbow' + k];
      solve2(_S, _T, UARM, ARM_B, _P, false, sh.quaternion, el.quaternion);
      _q.copy(v.hips.q).multiply(v.waist).multiply(sh.quaternion).multiply(el.quaternion).invert();
      J['grip' + k].quaternion.copy(_q).multiply(h.grip);
    }
    hipsM(v, _M); _Mi.copy(_M).invert();
    for (const k of ['L', 'R']) {
      const s = k === 'L' ? 1 : -1, f = v.foot[k];
      _S.set(s * HIP_X, HIP_DY, 0);
      _T.copy(f.p).applyMatrix4(_Mi);
      _P.set(s * 0.08, 0.15, 1);   // already in the hips' frame: the knee points the way the hips face
      const hp = J['hip' + k], kn = J['knee' + k];
      solve2(_S, _T, THIGH, SHIN, _P, true, hp.quaternion, kn.quaternion);
      _q.copy(v.hips.q).multiply(hp.quaternion).multiply(kn.quaternion).invert();
      J['ankle' + k].quaternion.copy(_q).multiply(f.q);
    }
    copyPose(v, cur);
    return api;
  }

  function pose(name, opts) {
    const fn = Object.prototype.hasOwnProperty.call(POSES, name) ? POSES[name] : null;
    if (!fn) throw new Error(`people: unknown pose "${name}" (one of ${POSE_NAMES.join(', ')})`);
    return fitLegs(fn(opts || {}, H));
  }
  function resolve(from) {
    if (!from) return base;
    if (typeof from === 'string') return pose(from);
    if (from.hips) return from;
    return pose(from.name, from.opts || {});
  }
  const _blend = blank();
  function setPose(name, k = 1, opts) {
    opts = opts || {};
    k = Number.isNaN(+k) ? 1 : +k;           // a NaN k (e.g. t / 0) shows the target pose instead of no figure
    const to = pose(name, opts);
    apply(blendPoses(resolve(opts.from), to, k, _blend));
    if (k >= 1) base = to;
    return api;
  }

  /** parent a prop ({ group, handle(side) } or an Object3D) to a hand; rot: Euler [x, y, z] in the grip frame */
  function hold(side, prop, { rot = null, handle = null } = {}) {
    if (!prop || !(prop.group || prop).isObject3D) throw new Error('people: hold(side, prop) needs a prop ({ group }) or an Object3D');
    const g = prop.group || prop;
    side = sideOf(side);
    J['grip' + side].add(g);
    g.rotation.set(...(rot || [0, 0, 0]));
    const hp = (handle || (prop.handle ? prop.handle(side) : new V3())).clone().applyQuaternion(g.quaternion);
    g.position.copy(hp).negate();
    return g;
  }

  const wp = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(new V3(x * H, y * H, z * H)); };
  const api = {
    group, joints: J, head: J.head, material: mat, height: H,
    /** world units the body advances per walk cycle (two steps) */
    cycle: 2 * STEP * H,
    /** seat-top height for 'sit' and 'lift' (feet on the ground at y = 0) */
    seatH: SEAT * H,
    poseNames: POSE_NAMES,
    setPose, pose, apply, hold,
    blend: (a, b, k) => blendPoses(a, b, k),
    get current() { return cur; },
    get basePose() { return base; },
    hand: (side = 'R') => J['grip' + sideOf(side)],
    /** world anchors for framing and labels */
    top: () => wp(J.head, 0, 0.142, -0.01),
    base: () => wp(group, 0, 0, 0),
    chest: () => wp(J.waist, 0, 0.12, 0.07),
  };
  apply(base);
  return api;
}
