// 購買動機與猶豫 · Desire and hesitation (articles 7, 17) — in the 消費者 zone, TH 120°, r 29.
// One shopper, one purchase, on the plaza (districts §3).  He sits on a bench with his phone; a post about a gift pops
// out of it and the ◆ on the gift jumps into a thought bubble over his head: he wants it before he asks anyone.  He
// asks the AI shopping assistant (the teal cube cluster); it throws down a typed shelf with four near-identical gift
// boxes, reads their prices and sorts them, the cheapest first.  He points past them to the ◆ box: the ◆ in his head
// flies into it.  The AI lifts it off the shelf and drops it on its belt, which runs it straight to the checkout; he
// follows, reaches to pay, and stops (會不會後悔？).  The clerk holds up one line, 不合適可以換; he pays, picks the box
// up by its bow and walks out with it toward the reader.
//
// Staging (portrait, design §5.4), three phone shots: (0) close on the bench, the post and the bubble; (1) the man
// below, his bubble, the floating shelf above, the cluster on top, the belt's start beside the shelf; (2) the checkout:
// the man at the counter's left end in profile, the counter and its pay terminal, the clerk behind it with the slip
// held up over the counter (above both heads, so the words cover nobody), the belt coming in from behind, and the way
// out straight toward the reader.  Nothing stands between the camera and a person: the belt runs in the gap between
// the two people, the clerk stands clear of it, and the box he carries hangs at his side, not in front of him.
// Local frame: +z toward the camera (STAGE_AZ), +x camera right, y = 0 is the plaza's top.
// Everything that explains is a pure function of (beat, k): pose().  The words live in world.json.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, clamp } from './kit.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const back = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const eul = (x, y, z) => new Q().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));

// ------------------------------------------------------------------ the set (local units)
const STAGE_AZ = 2.15;                 // the camera's azimuth: the sun (az ≈ 2.5) lights the fronts from the upper left
const H = 4.5, HC = 3.6;               // the shopper; the clerk (secondary people are smaller, design §5.4)
const BENCH = { x: -3.9, z: 3.6, w: 2.8, d: 1.1 };
const SEAT_YAW = 1.4;                  // seated in profile, facing camera-right: the bent head and the phone read
const STAND = { x: -2.1, z: 2.2 };     // where he stands to ask: a step in front of the bench
const SHELF = { x: -4.2, y: 5.6, z: -4.6, w: 12.0, d: 2.2, t: 0.34 };   // the typed comparison shelf (floats: AI-made)
const BOX = 1.25;                      // the gift boxes (one he can carry by its bow)
const BOW = BOX * 1.07;                // from a box's bottom to where a fist round its bow holds it
const SLOT_DX = 3.2;                   // wide enough that four price tags never touch on a phone
const SLOT_X = [-1.5, -0.5, 0.5, 1.5].map((s) => SHELF.x + s * SLOT_DX);
const BOX_Z = SHELF.z + 0.35;
const SHELF_TOP = SHELF.y + SHELF.t;
const CL_HOME = new V3(SHELF.x + 0.4, 9.4, SHELF.z - 0.4);   // the AI shopping assistant hovers over its shelf
const CUBE = 0.95;
// the four marks, by price (illustrative): sorted cheapest first, the ◆ is the third
const MARKS = ['tri', 'square', 'diamond', 'circle'];
const PRICE_ORDER = [0, 1, 2, 3];      // box i goes to slot PRICE_ORDER[i] once sorted
const START_SLOT = [3, 2, 1, 0];       // where each box lands first (the reverse, so the sort is seen to happen)
// the sort: the two end boxes swap first (one passing in front, one behind), then the middle two; each hop has its
// own lane and height, so no two boxes ever pass through each other
const HOP = [{ a: 1.28, b: 1.46, z: -0.85, h: 1.9 }, { a: 1.44, b: 1.62, z: -0.85, h: 0.35 }, { a: 1.44, b: 1.62, z: 0.85, h: 1.55 }, { a: 1.28, b: 1.46, z: 0.85, h: 1.9 }];
const DIA = 2;                         // the ◆ box
// the checkout, laid out along the belt's line BX (just past the shelf's right end, so the AI's drop onto the belt is
// seen whole): the terminal on the counter's left end, the box delivered beside it, the clerk behind the right half
const BX = 2.6;
const BELT = { x0: BX, z0: -5.0, x1: BX, z1: -0.85, y: 1.5, w: 1.1 };
const COUNTER = { x: BX + 0.6, z: 0.1, w: 3.6, d: 1.5, h: 1.5 };   // x 1.4 … 5.0
const TERM = new V3(BX - 0.88, COUNTER.h, 0.55);                   // the pay terminal, on the counter's front-left corner
const BOXC = new V3(BX, COUNTER.h, -0.1);                           // where the belt sets the box down, beside the terminal
const CLERK = { x: BX + 1.55, z: -1.45, yaw: -0.4 };                // behind the counter, clear of the belt, turned to him
const PAY = { x: BX - 1.95, z: 0.3 };                               // where he stands to pay (the counter's left end)
const TAKE = { x: BX - 1.5, z: 0.25 };                              // a step on, to take the box by its bow
const EXIT = { x: BX - 1.8, z: 4.7 };                               // out toward the reader
const STRIDE = 0.4 * H;

// ------------------------------------------------------------------ the beats
// dur = the motion; the caption lands at keyAt and holds 0.8 s + 0.25 s per 字 (story.js), so a beat lasts the longer
const BEATS = [
  // 1 問 AI 之前，他就想要了 — a post pops out of his phone; its ◆ jumps into a thought bubble over his head
  { dur: 1.5, keyAt: 0.8, shot: 0, parts: ['shopper', 'post'] },
  // 2 AI 會替人比價 — he asks; the AI throws down a shelf of four boxes, reads the prices and sorts them
  { dur: 2.0, keyAt: 1.6, shot: 1, parts: ['assistant', 'shopper'] },
  // 3 想買你的理由，要在比價前種下 — he points to ◆; the ◆ in his head flies into that box; the AI drops it on its belt
  { dur: 3.1, keyAt: 0.8, shot: 1, parts: ['shopper', 'assistant'] },
  // 4 結帳前停下來，是怕後悔 — the belt runs the box to the counter; he follows, reaches to pay, and stops
  { dur: 1.85, keyAt: 1.8, shot: 2, parts: ['counter', 'shopper', 'belt'] },
  // 5 一句說明，讓他安心 — the clerk holds up the slip; he pays, takes the box and walks out toward the reader
  { dur: 2.95, keyAt: 0.5, shot: 2, parts: ['clerk', 'shopper'] },
];
const LAST = BEATS.length - 1;
// beat-local times of the key events (seconds)
const T0 = { post0: 0.08, post1: 0.44, want0: 0.44, want1: 0.76, fly0: 0.48, fly1: 0.8 };
const T1 = { unpost: 0.3, up0: 0.0, up1: 0.38, raise0: 0.32, raise1: 0.52, ask0: 0.42, ask1: 0.72, lower0: 1.0, lower1: 1.35,
  shelf0: 0.68, shelf1: 0.92, drop0: 0.76, scan0: 1.06, scan1: 1.3, nudge0: 1.66, nudge1: 1.92 };
const T2 = { unask: 0.25, point0: 0.0, point1: 0.35, lift0: 0.3, lift1: 0.65, fly0: 0.42, fly1: 0.78, pop0: 0.66, pop1: 0.86,
  dimOthers0: 0.6, dimOthers1: 0.9, arm0: 1.2, arm1: 1.6, grab0: 1.05, grab1: 1.4, carry1: 2.2, fall1: 2.5, home1: 3.05 };
const T3 = { ride0: 0.1, ride1: 0.85, onto1: 1.0, turn1: 0.15, walk1: 1.25, reach1: 1.58, doubt0: 1.5, doubt1: 1.78 };
const T4 = { slip0: 0.0, slip1: 0.45, undoubt0: 0.35, undoubt1: 0.7, pay0: 0.5, pay1: 0.82, beep: 0.8, pocket0: 0.82, pocket1: 0.92,
  step1: 1.12, grab1: 1.3, lift1: 1.48, lime: 1.3, turn1: 1.78, walk1: 2.7, face1: 2.95 };

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
/** a pose held at root `from` ({ x, z, yaw }), expressed in root `to` (blending it to a pose at `to` steps the feet) */
function reframe(v, from, to, h) {
  const c = Math.cos(to.yaw), s = Math.sin(to.yaw);
  const dx = from.x - to.x, dz = from.z - to.z;
  return movePose(v, from.yaw - to.yaw, (dx * c - dz * s) / h, (dx * s + dz * c) / h);
}
const chestQ = (v) => v.hips.q.clone().multiply(v.waist);
const chestPt = (v, x, y, z) => new V3(x, y, z).applyQuaternion(v.waist).add(new V3(0, 0.066, -0.004)).applyQuaternion(v.hips.q).add(v.hips.p);
const chestDir = (v, x, y, z) => new V3(x, y, z).applyQuaternion(chestQ(v));
const setHand = (v, side, p, pole, grip) => { const h = v.hand[side]; h.p.copy(p); h.pole.copy(pole); h.grip.copy(grip || chestQ(v)); return v; };
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
/** a → b the short way round */
const lerpAng = (a, b, k) => a + (Math.atan2(Math.sin(b - a), Math.cos(b - a))) * k;
/** a world-ish point (local to the district) in a root's frame ({ x, z, yaw }), normalised by h */
const inRoot = (root, p, h) => {
  const c = Math.cos(root.yaw), s = Math.sin(root.yaw), dx = p.x - root.x, dz = p.z - root.z;
  return new V3((dx * c - dz * s) / h, p.y / h, (dx * s + dz * c) / h);
};

// ------------------------------------------------------------------ small geometry helpers
function strip(g) {
  let x = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
  return x;
}
const m4 = (p = [0, 0, 0], r = [0, 0, 0], s = 1) => new M4().compose(new V3(...p), new Q().setFromEuler(new THREE.Euler(...r)), new V3(...(Array.isArray(s) ? s : [s, s, s])));
const merge = (list) => mergeGeometries(list.map(([g, m]) => { const x = strip(g); if (m) x.applyMatrix4(m); return x; }));
/** per-vertex tone (shade multiplier; keep the material's style and accent) */
function toned(geo, t) {
  const x = strip(geo), n = x.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = t; c[i * 3 + 1] = -1; c[i * 3 + 2] = -1; }
  x.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return x;
}
/** faces told apart by tone: the top light, the sides a step or two darker.  A white box on the white plaza has no
 *  outline of its own (its depth step is small), so pencil props get these too: the darker faces are hatched */
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
/** the twelve edges of a box (w × h × d, from y0 up, centred on x and z) as thin bars: one geometry */
function edgeBars(w, h, d, { y0 = 0, th = 0.07, grow = 0.01 } = {}) {
  const bars = [], x = w / 2 + grow, z = d / 2 + grow, y1 = y0 + h;
  const pt = (sx, y, sz) => new V3(sx * x, y, sz * z);
  const bar = (a, b) => {
    const dir = new V3().subVectors(b, a), L = dir.length();
    const geo = new THREE.BoxGeometry(th, L + th, th);
    geo.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, dir.normalize()), new V3(1, 1, 1)));
    bars.push(strip(geo));
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(pt(sx, y0, sz), pt(sx, y1, sz));
  for (const y of [y0, y1]) {
    for (const sz of [-1, 1]) bar(pt(-1, y, sz), pt(1, y, sz));
    for (const sx of [-1, 1]) bar(pt(sx, y, -1), pt(sx, y, 1));
  }
  return mergeGeometries(bars);
}
/** a flat shape extruded to thickness t (centred on z = 0), bevelled a little so its outline reads */
function slabOf(shape, t, bev = 0.04, curve = 12) {
  const b = Math.min(bev, t * 0.3);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-3, t - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: curve });
  geo.translate(0, 0, -(t - 2 * b) / 2);
  geo.computeVertexNormals();
  return geo;
}
/** the brand marks as shapes (not glyphs): ▲ ■ ◆ ●, s across, centred */
function markShape(kind, s) {
  const h = s / 2, sh = new THREE.Shape();
  if (kind === 'tri') { sh.moveTo(-h, -h * 0.82); sh.lineTo(h, -h * 0.82); sh.lineTo(0, h * 0.9); sh.lineTo(-h, -h * 0.82); }
  else if (kind === 'square') { const a = h * 0.84; sh.moveTo(-a, -a); sh.lineTo(a, -a); sh.lineTo(a, a); sh.lineTo(-a, a); sh.lineTo(-a, -a); }
  else if (kind === 'diamond') { sh.moveTo(0, -h * 1.08); sh.lineTo(h * 0.8, 0); sh.lineTo(0, h * 1.08); sh.lineTo(-h * 0.8, 0); sh.lineTo(0, -h * 1.08); }
  else sh.absarc(0, 0, h * 0.92, 0, Math.PI * 2, false);
  return sh;
}
/** a thought bubble's cloud: a scalloped outline (w × h), facing +z, centred */
function cloudGeo(w, h, t = 0.22, puffs = 9) {
  const sh = new THREE.Shape(), N = 144;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 1 + 0.11 * Math.abs(Math.sin((puffs * a) / 2));
    const x = (w / 2) * Math.cos(a) * r / 1.11, y = (h / 2) * Math.sin(a) * r / 1.11;
    if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
  }
  return slabOf(sh, t, 0.06, 12);
}
const discGeo = (r, t) => { const c = new THREE.Shape(); c.absarc(0, 0, r, 0, Math.PI * 2, false); return slabOf(c, t, 0.03, 16); };
/** a gift box (s, origin at the bottom centre, mark face +z): ribbons cross the lid and run down the sides, a bow on top.
 *  Its faces carry tones (the mark face light, the sides hatched) so it reads as a box against the white plaza */
function giftGeo(s) {
  const r = s * 0.17, e = s * 0.012;
  const body = faceTones(new THREE.BoxGeometry(s, s, s).translate(0, s / 2, 0).toNonIndexed(), { top: 1.0, pz: 0.95, nz: 0.62, px: 0.6, nx: 0.6, bottom: 0.5 });
  const ribbon = merge([
    [new THREE.BoxGeometry(s + 2 * e, r * 0.12, r), m4([0, s + e, 0])],                       // over the lid, along x
    [new THREE.BoxGeometry(r, r * 0.12, s + 2 * e), m4([0, s + e, 0])],                       // over the lid, along z
    [new THREE.BoxGeometry(r * 0.12, s, r), m4([-(s / 2 + e), s / 2, 0])],                   // down the sides
    [new THREE.BoxGeometry(r * 0.12, s, r), m4([s / 2 + e, s / 2, 0])],
    [new THREE.SphereGeometry(s * 0.16, 12, 8), m4([-s * 0.13, s + s * 0.07, 0], [0, 0, 0.5], [1.15, 0.55, 0.7])],
    [new THREE.SphereGeometry(s * 0.16, 12, 8), m4([s * 0.13, s + s * 0.07, 0], [0, 0, -0.5], [1.15, 0.55, 0.7])],
  ]);
  return mergeGeometries([strip(body).setAttribute('color', body.getAttribute('color')), toned(ribbon, 0.5)]);
}

export function buildMarket() {
  const g = new THREE.Group();
  g.name = 'market';
  const TH = 120, RR = 29;
  const base = polar(RR, TH);
  g.position.copy(base);
  g.position.y += 1.4;                       // the plaza's top clears every bump of the hills under it
  g.rotation.y = Math.PI / 2 - STAGE_AZ;     // local +z → toward the camera
  g.updateMatrixWorld(true);
  const W = (x, y, z) => g.localToWorld(new V3(x, y, z));
  const wp = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(new V3(x, y, z)); };
  const layers = {};                          // dim groups: name → Object3D[]
  const layer = (name, ...objs) => { (layers[name] ||= []).push(...objs); return objs[0]; };
  const accents = [];                         // every material whose accent this district switches (full strength in focus)

  // =================================================================== the plaza (scenery)
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(12.6, 13.0, 3.6, 72).translate(0, -1.8, 0), ink({ shade: 1.0, bias: 0.12 }));
  plaza.receiveShadow = true;
  g.add(layer('plaza', plaza));

  // =================================================================== the shopper, his phone, the bench
  const person = makePerson({ height: H });
  person.material.userData.u.uShadeBias.value = 0.34;
  person.group.name = 'shopper';
  const phone = P.makePhone({ h: 0.68 });
  person.hold('R', phone, { rot: [0, Math.PI, 0] });   // the screen toward him
  g.add(layer('shopper', person.group));
  const bench = P.makeBench({ w: BENCH.w, d: BENCH.d, h: person.seatH });
  bench.group.position.set(BENCH.x, 0, BENCH.z);
  bench.group.rotation.y = SEAT_YAW;
  g.add(layer('bench', bench.group));

  // ---- the post: a paper slab with a gift drawn on it (a small ◆ box), rising out of the phone
  const POST = { w: 2.9, h: 3.7, t: 0.1 };
  const post = new THREE.Group(); post.name = 'post';
  {
    const card = new THREE.Mesh(new THREE.BoxGeometry(POST.w, POST.h, POST.t), ink({ shade: 1, bias: 0.34 }));
    card.castShadow = true;
    post.add(card);
    // the picture on the post: a gift box with the ◆ mark, in the upper half (the words sit below it)
    const gs = 1.0;
    const gift = new THREE.Mesh(giftGeo(gs), ink({ shade: 1, bias: 0.12 }));
    gift.material.vertexColors = true;
    gift.position.set(-0.05, POST.h * 0.5 - gs - 0.42, POST.t / 2 + gs / 2 + 0.01);
    gift.rotation.y = 0.35;
    post.add(gift);
    const mk = new THREE.Mesh(slabOf(markShape('diamond', gs * 0.46), 0.06, 0.015), ink({ accent: 'ink' }));
    mk.position.set(0, gs * 0.5, gs / 2 + 0.03);
    gift.add(mk);
    // what makes it a post: the poster's round avatar and name line on top, a heart (a like) beside the words
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.5); heart.bezierCurveTo(-0.15, -0.32, -0.62, -0.1, -0.5, 0.25); heart.bezierCurveTo(-0.4, 0.55, -0.05, 0.52, 0, 0.25);
    heart.bezierCurveTo(0.05, 0.52, 0.4, 0.55, 0.5, 0.25); heart.bezierCurveTo(0.62, -0.1, 0.15, -0.32, 0, -0.5);
    const icons = new THREE.Mesh(merge([
      [new THREE.CylinderGeometry(0.26, 0.26, 0.05, 20), m4([-POST.w / 2 + 0.48, POST.h / 2 - 0.44, POST.t / 2 + 0.03], [Math.PI / 2, 0, 0])],
      [new THREE.BoxGeometry(0.95, 0.1, 0.03), m4([-POST.w / 2 + 1.38, POST.h / 2 - 0.44, POST.t / 2 + 0.02])],
      [slabOf(heart, 0.05, 0.01), m4([POST.w / 2 - 0.45, POST.h / 2 - 0.44, POST.t / 2 + 0.03], [0, 0, 0], 0.5)],
    ]), ink({ accent: 'ink' }));
    icons.castShadow = false;
    post.add(icons);
  }
  post.visible = false;
  g.add(layer('post', post));
  // up in front of him (he faces camera-right), above his head, facing the reader: the bench, the man, the post and
  // the bubble stack upward in a phone's tall frame
  const POST_AT = new V3(BENCH.x + 2.25, 6.05, BENCH.z + 0.5);
  const POST_GIFT = new V3(-0.05, POST.h * 0.5 - 1.0 - 0.42 + 0.5, POST.t / 2 + 1.0);   // the drawn ◆, post-local

  // ---- thought bubbles: a cloud and two small rounds trailing down to the thinker's head (placed per frame, so the
  // rounds always lead to the head instead of sitting beside it)
  const makeCloud = (name, w, h, mat) => {
    const grp = new THREE.Group(); grp.name = name;
    const body = new THREE.Mesh(cloudGeo(w, h), mat); body.castShadow = true;
    grp.add(body);
    const dots = [0.24, 0.15].map((r) => { const m = new THREE.Mesh(discGeo(r, 0.16), mat); m.castShadow = true; m.visible = false; return m; });
    grp.visible = false;
    return { grp, dots, w, h };
  };
  /** cloud centred at `at` (scaled by s), its trail from the cloud's rim down to just above `head` (a crown point) */
  const _t0 = new V3(), _t1 = new V3();
  function placeCloud(c, at, head, s) {
    const on = s > 0.01;
    c.grp.position.copy(at);
    c.grp.rotation.set(0, 0, 0);
    c.grp.scale.setScalar(Math.max(1e-3, s));
    c.grp.visible = on;
    // from the rim of the cloud toward the head, ending a little above the crown
    _t1.copy(head).add(new V3(0, 0.42, 0.1));
    const dx = _t1.x - at.x, dy = _t1.y - at.y, a = (c.w / 2) * Math.max(s, 1e-3), b = (c.h / 2) * Math.max(s, 1e-3);
    const lam = Math.min(1, 0.88 / Math.max(1e-6, Math.sqrt((dx / a) ** 2 + (dy / b) ** 2)));
    _t0.set(at.x + dx * lam, at.y + dy * lam, at.z);
    const ks = clamp((s - 0.35) / 0.65);
    c.dots.forEach((d, i) => {
      d.position.lerpVectors(_t0, _t1, i ? 0.8 : 0.42);
      d.scale.setScalar(Math.max(1e-3, ks));
      d.visible = on && ks > 0.02;
    });
  }

  // ---- the want: a thought bubble over his head, and the ◆ in it
  const WANT = { w: 3.0, h: 2.2 };
  const wantMat = ink({ shade: 1, bias: 0.34 });
  const want = makeCloud('want', WANT.w, WANT.h, wantMat);
  g.add(layer('want', want.grp, ...want.dots));
  want.dots.forEach((d) => g.add(d));
  const dia = new THREE.Mesh(slabOf(markShape('diamond', 1.45), 0.3, 0.06), ink({ shade: 0.85, bias: 0.25, focus: false }));
  dia.name = 'want-mark';
  dia.castShadow = true;
  dia.visible = false;
  g.add(layer('want', dia));
  accents.push(dia.material);

  // =================================================================== the AI shopping assistant: a cluster of typed cubes
  const cluster = new THREE.Group(); cluster.name = 'assistant';
  const cubeMat = ink({ style: 1, shade: 0.62, focus: false });
  cubeMat.vertexColors = true;
  accents.push(cubeMat);
  const cubeGeo = faceTones(new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), { top: 1.15, px: 0.55, nx: 0.55, pz: 0.85, nz: 0.85, bottom: 0.5 });
  const cubeEdge = edgeBars(1, 1, 1, { y0: -0.5, th: 0.075 });
  const edgeMat = ink({ accent: 'ink' });
  // the same five-cube cross the Agent bridge uses: a big one in the middle, four smaller round it
  const CROSS = [[0, 0, 0, 1.1], [0.95, 0, 0, 0.75], [-0.95, 0, 0, 0.75], [0, 0.95, 0, 0.75], [0, -0.95, 0, 0.75]];
  CROSS.forEach(([x, y, z, s], i) => {
    const c = new THREE.Mesh(cubeGeo, cubeMat);
    c.name = `cube${i}`;
    c.castShadow = true;
    const e = new THREE.Mesh(cubeEdge, edgeMat); e.castShadow = false; c.add(e);
    c.position.set(x * CUBE, y * CUBE, z * CUBE);
    c.scale.setScalar(s * CUBE);
    cluster.add(c);
  });
  g.add(layer('cluster', cluster));

  // ---- the typed shelf (AI-made: it floats), unfolding from the cluster
  const shelf = new THREE.Group(); shelf.name = 'shelf';
  const shelfMat = ink({ style: 1, shade: 0.72, focus: false });
  shelfMat.vertexColors = true;
  accents.push(shelfMat);
  {
    const slab = new THREE.Mesh(faceTones(new THREE.BoxGeometry(SHELF.w, SHELF.t, SHELF.d).toNonIndexed(), { top: 1.1, pz: 0.7, nz: 0.6, px: 0.5, nx: 0.5 }), shelfMat);
    slab.position.y = SHELF.t / 2;
    slab.castShadow = true; slab.receiveShadow = true;
    const e = new THREE.Mesh(edgeBars(SHELF.w, SHELF.t, SHELF.d, { th: 0.06 }), ink({ accent: 'ink' }));
    e.castShadow = false;
    shelf.add(slab, e);
  }
  shelf.position.set(SHELF.x, SHELF.y, SHELF.z);
  g.add(layer('shelf', shelf));
  // the scan line: a typed sheet that sweeps the shelf from left to right
  const scanMat = ink({ style: 1, shade: 0.4, bias: 0.3, focus: false });
  accents.push(scanMat);
  const scan = new THREE.Mesh(new THREE.BoxGeometry(0.12, BOX + 0.9, SHELF.d + 0.3).translate(0, (BOX + 0.9) / 2, 0), scanMat);
  scan.castShadow = false;
  scan.visible = false;
  g.add(layer('scan', scan));

  // ---- four near-identical gift boxes (real products: pencil), each with its mark, and their typed price tags
  const boxes = MARKS.map((kind, i) => {
    const grp = new THREE.Group(); grp.name = `box-${kind}`;
    const mat = ink({ shade: 1, bias: 0.16, focus: false });
    mat.vertexColors = true;
    accents.push(mat);
    const body = new THREE.Mesh(giftGeo(BOX), mat);
    body.castShadow = true; body.receiveShadow = true;
    const mark = new THREE.Mesh(slabOf(markShape(kind, BOX * 0.52), 0.06, 0.015), ink({ accent: 'ink' }));
    mark.position.set(0, BOX * 0.5, BOX / 2 + 0.03);
    grp.add(body, mark);
    g.add(layer(`box${i}`, grp));
    // the price tag hangs from the shelf's front edge under its box
    const tag = new THREE.Group(); tag.name = `tag-${kind}`;
    const tMat = ink({ style: 1, shade: 0.9, bias: 0.25, focus: false });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 0.06), tMat);
    plate.position.y = -0.31;
    plate.castShadow = false;
    tag.add(plate);
    tag.visible = false;
    g.add(layer('tags', tag));
    return { grp, body, mat, tag, kind };
  });
  const TAG_Y = SHELF.y - 0.06, TAG_Z = SHELF.z + SHELF.d / 2 + 0.06;

  // ---- the ask: a speech bubble from his phone to the assistant
  const ask = P.makeBubble({ w: 4.1, h: 1.6, tail: 'right' });
  ask.group.visible = false;
  g.add(layer('ask', ask.group));
  const ASK_AT = new V3(SHELF.x - 3.2, CL_HOME.y + 0.35, CL_HOME.z + 0.6);

  // =================================================================== the checkout: belt, counter, terminal, clerk
  // the typed belt (AI 直送結帳): from beside the shelf's right end, where the AI drops the box, to the counter's back
  const belt = new THREE.Group(); belt.name = 'belt';
  const beltMat = ink({ style: 1, shade: 0.66, focus: false });
  beltMat.vertexColors = true;
  accents.push(beltMat);
  const B0 = new V3(BELT.x0, BELT.y, BELT.z0), B1 = new V3(BELT.x1, BELT.y, BELT.z1);
  const BLEN = B0.distanceTo(B1), BYAW = Math.atan2(B1.x - B0.x, B1.z - B0.z);
  {
    const run = new THREE.Group();
    const top = new THREE.Mesh(faceTones(new THREE.BoxGeometry(BELT.w, 0.26, BLEN + 0.4).toNonIndexed(), { top: 1.05, px: 0.55, nx: 0.55, pz: 0.7, nz: 0.7 }), beltMat);
    top.position.y = -0.13;
    top.castShadow = true; top.receiveShadow = true;
    const legs = new THREE.Mesh(merge([0.12, 0.5, 0.88].flatMap((f) => [-1, 1].map((s) => [new THREE.BoxGeometry(0.16, BELT.y - 0.26, 0.16), m4([s * (BELT.w / 2 - 0.12), -(BELT.y + 0.26) / 2, (f - 0.5) * BLEN])]))), beltMat);
    legs.castShadow = true;
    const slats = new THREE.Mesh(merge(Array.from({ length: 11 }, (_, i) => [new THREE.BoxGeometry(BELT.w + 0.04, 0.05, 0.06), m4([0, 0.005, ((i + 0.5) / 11 - 0.5) * (BLEN + 0.2)])])), ink({ accent: 'ink' }));
    slats.castShadow = false;
    run.add(top, legs, slats);
    run.position.copy(B0).lerp(B1, 0.5);
    run.rotation.y = BYAW;
    belt.add(run);
  }
  g.add(layer('belt', belt));

  const counter = new THREE.Group(); counter.name = 'counter';
  {
    const C = COUNTER;
    // its faces in three tones (the front hatched), so the counter reads as a solid block, not a white gap
    const geo = faceTones(merge([
      [new THREE.BoxGeometry(C.w, C.h - 0.12, C.d), m4([0, (C.h - 0.12) / 2, 0])],
      [new THREE.BoxGeometry(C.w + 0.2, 0.12, C.d + 0.2), m4([0, C.h - 0.06, 0])],
    ]), { top: 1.0, pz: 0.62, nz: 0.55, px: 0.48, nx: 0.5, bottom: 0.5 });
    const mat = ink({ shade: 0.95, bias: 0.08 });
    mat.vertexColors = true;
    const body = new THREE.Mesh(geo, mat);
    body.castShadow = true; body.receiveShadow = true;
    body.position.set(C.x, 0, C.z);
    counter.add(body);
  }
  // the pay terminal: a small slanted reader with a screen that lights when he pays (its screen toward him)
  const termScreen = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.3), ink({ shade: 0.3, bias: 0.0 }));
  {
    const t = new THREE.Group(); t.name = 'terminal';
    const tb = new THREE.Mesh(merge([[new THREE.BoxGeometry(0.5, 0.1, 0.42), m4([0, 0.05, 0])], [new THREE.BoxGeometry(0.46, 0.09, 0.38), m4([0, 0.19, -0.02], [-0.45, 0, 0])]]), ink({ shade: 0.6, bias: 0.04 }));
    tb.castShadow = true;
    termScreen.position.set(0, 0.245, 0.0);
    termScreen.rotation.x = -0.45;
    t.add(tb, termScreen);
    t.position.copy(TERM);
    t.rotation.y = Math.PI / 2;             // the screen (tilted toward local -z) toward the customer, at -x
    counter.add(t);
  }
  g.add(layer('counter', counter));

  const clerk = makePerson({ height: HC });
  clerk.group.name = 'clerk';
  clerk.material.userData.u.uShadeBias.value = 0.34;
  clerk.group.position.set(CLERK.x, 0, CLERK.z);
  clerk.group.rotation.y = CLERK.yaw;
  g.add(layer('clerk', clerk.group));
  // the clerk answers on the figure, not on the slip held up over the counter (fitted before the slip is in his hand)
  const clerkHit = P.makeHitProxy(clerk.group, 0.3);
  // the slip: one line on a paper card, held up over the counter in the right hand, facing the reader; big enough
  // that its lime shows round the words on it
  const slip = P.makeCard({ w: 2.9, d: 1.2, lines: 0, t: 0.05 });
  slip.material.userData.u.uShadeBias.value = 0.3;
  accents.push(slip.material);
  clerk.hold('R', slip, { rot: [Math.PI / 2, 0, 0] });

  // ---- his doubt: a thought bubble at the counter
  const doubtMat = ink({ shade: 1, bias: 0.34, focus: false });
  accents.push(doubtMat);
  const doubt = makeCloud('doubt', 3.4, 2.1, doubtMat);
  g.add(layer('doubt', doubt.grp, ...doubt.dots));
  doubt.dots.forEach((d) => g.add(d));

  // =================================================================== hit proxies
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
  const zone = (name, x0, y0, z0, x1, y1, z1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), HIDDEN);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.name = 'hit:' + name; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    g.add(m);
    return m;
  };
  person.setPose('stand', 1);
  const hits = {
    shopper: P.makeHitProxy(person.group, 0.35),
    // the post answers on the bench, where it came from (it is gone by the end)
    post: zone('post', BENCH.x - 1.8, 0, BENCH.z - 1.4, BENCH.x + 1.8, 1.9, BENCH.z + 1.4),
    assistant: zone('assistant', SHELF.x - SHELF.w / 2, SHELF.y - 0.3, SHELF.z - SHELF.d / 2, SHELF.x + SHELF.w / 2, CL_HOME.y + 1.3, SHELF.z + SHELF.d / 2),
    counter: P.makeHitProxy(counter, 0.3),
    belt: P.makeHitProxy(belt, 0.3),
    clerk: clerkHit,
  };

  // every mesh's own shadow setting, so dimming can switch shadows off and emphasis can give them back
  g.traverse((o) => { if (o.isMesh) o.userData.cast0 = o.castShadow; });

  // =================================================================== the shopper's poses (pure)
  const memo = new Map();
  const pz = (who, name, o) => {
    const key = who.group.name + name + JSON.stringify(o || {});
    if (!memo.has(key)) memo.set(key, who.pose(name, o));
    return memo.get(key);
  };
  const hl = (v) => setHand(v, 'L', chestPt(v, 0.176, -0.16, 0.03), chestDir(v, 0.4, -0.1, -1));
  /** seated, looking down at the phone held in both hands in front of the chest */
  const SIT = (() => {
    const v = clonePose(pz(person, 'sit'));
    v.waist.copy(eul(0.16, 0, 0)); v.neck.copy(eul(0.22, 0, 0)); v.head.copy(eul(0.34, 0, 0));
    setHand(v, 'R', chestPt(v, -0.035, 0.02, 0.19), chestDir(v, -0.6, -1, -0.2), chestQ(v).multiply(eul(-0.9, 0, 0)));
    setHand(v, 'L', chestPt(v, 0.045, 0.0, 0.18), chestDir(v, 0.6, -1, -0.2));
    return v;
  })();
  /** standing, the phone at the chest, looking up at the shelf */
  const LOOK = (() => {
    const v = clonePose(pz(person, 'stand'));
    v.neck.copy(eul(-0.12, 0, 0)); v.head.copy(eul(-0.2, 0, 0));
    setHand(v, 'R', chestPt(v, -0.06, -0.02, 0.17), chestDir(v, -0.6, -1, -0.3), chestQ(v).multiply(eul(-0.5, 0, 0)));
    return hl(v);
  })();
  /** the phone raised toward the assistant */
  const RAISE = (() => {
    const v = clonePose(pz(person, 'raise', { side: 'R' }));
    v.hand.R.grip.copy(chestQ(v).multiply(eul(-0.6, 0, 0)));
    return v;
  })();
  /** pointing at the ◆ box on the shelf (computed for his place and the box's) */
  const pointAt = (root, target) => {
    const v = clonePose(pz(person, 'stand'));
    v.neck.copy(eul(-0.14, 0, 0)); v.head.copy(eul(-0.22, 0, 0));
    v.waist.copy(eul(-0.04, 0, 0));
    const t = inRoot(root, target, H);
    const sh = chestPt(v, -0.114, 0.182, 0);
    const dir = t.sub(sh).normalize();
    setHand(v, 'R', sh.clone().addScaledVector(dir, 0.335), chestDir(v, -1, 0.2, -0.4), chestQ(v).multiply(eul(-0.6, 0, 0)));
    return hl(v);
  };
  /** standing, turned to follow something (the box going to the belt) */
  const WATCH = (() => {
    const v = clonePose(pz(person, 'watch', { yaw: -0.55, pitch: 0.1 }));
    setHand(v, 'R', chestPt(v, -0.07, -0.05, 0.16), chestDir(v, -0.6, -1, -0.3), chestQ(v).multiply(eul(-0.5, 0, 0)));
    return v;
  })();
  // not memoised: every frame of a walk asks for a new distance
  const walkPose = (d) => person.pose('walk', { dist: d, stride: STRIDE });
  // the hand with the phone toward the terminal
  const payYaw = yawTo(PAY.x, PAY.z, TERM.x, TERM.z);
  const tIn = inRoot({ x: PAY.x, z: PAY.z, yaw: payYaw }, TERM, 1);
  const REACH = (() => {
    const v = clonePose(pz(person, 'stamp', { y: +(TERM.y + 0.42).toFixed(3), fwd: +(tIn.z - 0.12).toFixed(3), x: -0.12, table: COUNTER.h }));
    v.hand.R.grip.copy(chestQ(v).multiply(eul(-1.2, 0, 0)));
    return v;
  })();
  /** the hesitation: the hand stopped halfway, the other hand at the chin, the head tilted */
  const HESIT = (() => {
    const v = blendPoses(LOOK, REACH, 0.5);
    v.hips.p.z -= 0.01;
    v.waist.copy(eul(-0.02, 0.05, 0.03)); v.neck.copy(eul(0.05, 0.12, 0.08)); v.head.copy(eul(0.12, 0.22, 0.14));
    setHand(v, 'L', chestPt(v, 0.035, 0.235, 0.115), chestDir(v, 0.9, -0.6, -0.6));
    return v;
  })();
  // taking the box: the right hand round its bow (where the box sits on the counter), then lifted clear of the counter
  const BOWP = BOXC.clone().setY(BOXC.y + BOW);
  const takeYaw = yawTo(TAKE.x, TAKE.z, BOWP.x, BOWP.z);
  const bIn = inRoot({ x: TAKE.x, z: TAKE.z, yaw: takeYaw }, BOWP, 1);
  const GRAB = (() => {
    const v = clonePose(pz(person, 'stamp', { y: +BOWP.y.toFixed(3), fwd: +bIn.z.toFixed(3), x: +bIn.x.toFixed(3), table: COUNTER.h }));
    v.hand.R.grip.copy(chestQ(v));
    v.hand.L.p.copy(chestPt(v, 0.176, -0.16, 0.03)); v.hand.L.pole.copy(chestDir(v, 0.4, -0.1, -1));
    return v;
  })();
  /** the box lifted by its bow, held up in front, clear of the counter and the terminal */
  const LIFT = (() => {
    const v = clonePose(pz(person, 'stand'));
    v.head.copy(eul(0.12, 0, 0));
    setHand(v, 'R', chestPt(v, -0.04, 0.17, 0.2), chestDir(v, -1, -0.3, -0.2), chestQ(v));
    return hl(v);
  })();
  /** carried at his right side, hanging from the hand by its bow: the box never covers him */
  const carryHand = (v, hi = 0) => setHand(v, 'R', chestPt(v, -0.255, lerp(-0.13, 0.05, hi), 0.03), chestDir(v, -1, -0.2, -0.5), chestQ(v));
  const CARRY = hl(carryHand(clonePose(pz(person, 'stand'))));
  const CARRY_HI = hl(carryHand(clonePose(pz(person, 'stand')), 1));
  const walkCarry = (d, hi = 0) => carryHand(clonePose(walkPose(d)), hi);

  // the clerk: arms at rest, then the slip held up over the counter, toward the customer and the reader
  const C_IDLE = (() => {
    const v = clonePose(pz(clerk, 'stand'));
    setHand(v, 'R', chestPt(v, -0.13, -0.06, 0.17), chestDir(v, -0.6, -1, -0.2), chestQ(v).multiply(eul(-0.3, 0, 0)));
    setHand(v, 'L', chestPt(v, 0.13, -0.05, 0.16), chestDir(v, 0.6, -1, -0.2));
    return v;
  })();
  const C_SHOW = (() => {
    const v = clonePose(pz(clerk, 'raise', { side: 'R' }));
    // the card square to the reader (the figure is turned by CLERK.yaw), tipped back a little
    v.hand.R.grip.copy(eul(-0.12, -CLERK.yaw, 0));
    v.neck.copy(eul(-0.05, -0.12, 0)); v.head.copy(eul(-0.08, -0.2, 0));
    return v;
  })();

  // ------------------------------------------------------------------ the shopper's frame at (beat, t)
  const st = (x, z, yaw, v) => ({ x, z, yaw, v });
  const blendTo = (a, b, k) => st(b.x, b.z, b.yaw, blendPoses(reframe(a.v, a, b, H), b.v, sm(k)));
  const DIA_SLOT = PRICE_ORDER[DIA];
  const diaOnShelf = new V3(SLOT_X[DIA_SLOT], SHELF_TOP + BOX * 0.5, BOX_Z);
  const yStand = yawTo(STAND.x, STAND.z, diaOnShelf.x, diaOnShelf.z);
  const S_SIT = st(BENCH.x, BENCH.z, SEAT_YAW, SIT);
  const S_LOOK = st(STAND.x, STAND.z, yStand, LOOK);
  const S_RAISE = st(STAND.x, STAND.z, yStand, RAISE);
  const S_POINT = st(STAND.x, STAND.z, yStand, pointAt({ x: STAND.x, z: STAND.z, yaw: yStand }, diaOnShelf.clone().setY(diaOnShelf.y + 0.4)));
  const S_WATCH = st(STAND.x, STAND.z, yStand, WATCH);
  const walkYaw = yawTo(STAND.x, STAND.z, PAY.x, PAY.z);
  const walkLen = Math.hypot(PAY.x - STAND.x, PAY.z - STAND.z) - 0.25;
  const S_W0 = st(STAND.x, STAND.z, walkYaw, walkPose(0));
  const S_W1 = st(STAND.x + Math.sin(walkYaw) * walkLen, STAND.z + Math.cos(walkYaw) * walkLen, walkYaw, walkPose(walkLen));
  const S_HESIT = st(PAY.x, PAY.z, payYaw, HESIT);
  const S_REACH = st(PAY.x, PAY.z, payYaw, REACH);
  const S_GRAB = st(TAKE.x, TAKE.z, takeYaw, GRAB);
  const S_LIFT = st(TAKE.x, TAKE.z, takeYaw, LIFT);
  // the way out: turn to the reader with the box held high at his side (clear of the counter), then walk, lowering it
  const exitYaw = yawTo(TAKE.x, TAKE.z, EXIT.x, EXIT.z);
  const exitLen = Math.hypot(EXIT.x - TAKE.x, EXIT.z - TAKE.z) - 0.2;
  const S_TURN = st(TAKE.x, TAKE.z, exitYaw, walkCarry(0, 1));
  const S_E1 = st(TAKE.x + Math.sin(exitYaw) * exitLen, TAKE.z + Math.cos(exitYaw) * exitLen, exitYaw, walkCarry(exitLen));
  const S_OUT = st(S_E1.x, S_E1.z, 0.08, CARRY);
  /** the right hand of a frame, in district coordinates */
  const handAt = (F) => {
    const p = F.v.hand.R.p, c = Math.cos(F.yaw), s = Math.sin(F.yaw);
    return new V3(F.x + (p.x * c + p.z * s) * H, p.y * H, F.z + (-p.x * s + p.z * c) * H);
  };
  const SWING = new V3(TAKE.x + 0.3, 0, TAKE.z + 1.25);   // in front of him, toward the reader

  function shopperAt(beat, t) {
    if (beat === 0) return S_SIT;
    if (beat === 1) {
      if (t < T1.up1) return blendTo(S_SIT, S_LOOK, seg(t, T1.up0, T1.up1));
      if (t < T1.raise1) return blendTo(S_LOOK, S_RAISE, seg(t, T1.up1, T1.raise1));
      if (t < T1.lower0) return S_RAISE;
      return blendTo(S_RAISE, S_LOOK, seg(t, T1.lower0, T1.lower1));
    }
    if (beat === 2) {
      if (t < T2.arm0) return blendTo(S_LOOK, S_POINT, seg(t, T2.point0, T2.point1));
      return blendTo(S_POINT, S_WATCH, seg(t, T2.arm0, T2.arm1));
    }
    if (beat === 3) {
      if (t < T3.turn1) return blendTo(S_WATCH, S_W0, seg(t, 0, T3.turn1));
      if (t < T3.walk1) {
        const d = walkLen * seg(t, T3.turn1, T3.walk1);
        return st(STAND.x + Math.sin(walkYaw) * d, STAND.z + Math.cos(walkYaw) * d, walkYaw, walkPose(d));
      }
      return blendTo(S_W1, S_HESIT, seg(t, T3.walk1, T3.reach1));
    }
    // beat 5: pays, steps on to the box, takes it by its bow, lifts it, turns to the reader and walks out
    if (t < T4.pay0) return S_HESIT;
    if (t < T4.pocket1) return blendTo(S_HESIT, S_REACH, seg(t, T4.pay0, T4.pay1));
    if (t < T4.grab1) return blendTo(S_REACH, S_GRAB, seg(t, T4.pocket1, T4.grab1));
    if (t < T4.lift1) {
      // straight up off the counter (clear of the terminal), then in toward him
      const u = seg(t, T4.grab1, T4.lift1), F = blendTo(S_GRAB, S_LIFT, u);
      const a = handAt(S_GRAB), b = handAt(S_LIFT);
      const p = new V3(lerp(a.x, b.x, ss(u, 0.35, 1)), lerp(a.y, b.y, ss(u, 0, 0.55)), lerp(a.z, b.z, ss(u, 0.35, 1)));
      F.v.hand.R.p.copy(inRoot(F, p, H));
      return F;
    }
    if (t < T4.turn1) {
      // he turns to the reader; the box swings round in front of him, high, and only drops to his side once it is
      // clear of the counter
      const u = seg(t, T4.lift1, T4.turn1), F = blendTo(S_LIFT, S_TURN, u);
      const a = handAt(S_LIFT), b = handAt(S_TURN), e = sm(u);
      const x = (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * SWING.x + e * e * b.x;
      const z = (1 - e) * (1 - e) * a.z + 2 * (1 - e) * e * SWING.z + e * e * b.z;
      F.v.hand.R.p.copy(inRoot(F, new V3(x, lerp(a.y, b.y, ss(u, 0.55, 1)), z), H));
      return F;
    }
    if (t < T4.walk1) {
      const u = seg(t, T4.turn1, T4.walk1), d = exitLen * u;
      return st(TAKE.x + Math.sin(exitYaw) * d, TAKE.z + Math.cos(exitYaw) * d, exitYaw, walkCarry(d, 1 - sm(seg(u, 0, 0.45))));
    }
    return blendTo(S_E1, S_OUT, seg(t, T4.walk1, T4.face1));
  }

  // =================================================================== pose: (beat, k) → everything
  const S = { beat: LAST, t: BEATS[LAST].dur, emph: null, post: false, ask: false, tags: [false, false, false, false], doubt: false, slip: false,
    lime: { want: false, box: false, doubt: false, slip: false }, beltOn: false, boxDim: [1, 1, 0, 1] };
  const _a = new V3(), _b = new V3(), _c = new V3();

  /** where box i stands on the shelf in beat 2 at t (the drop, the sort, the cheapest one nudged forward) */
  function boxOnShelf(i, beat, t, out) {
    const s0 = START_SLOT[i], s1 = PRICE_ORDER[i], hp = HOP[i];
    // up out of its place, across in its lane, down into the new place
    const u = beat > 1 ? 1 : beat < 1 ? 0 : seg(t, hp.a, hp.b);
    const lift = sm(seg(u, 0, 0.25)) * sm(seg(1 - u, 0, 0.25));
    out.set(lerp(SLOT_X[s0], SLOT_X[s1], ss(u, 0.18, 0.82)), SHELF_TOP + lift * hp.h, BOX_Z + lift * hp.z);
    // the cheapest is put forward: the assistant's first pick
    if (PRICE_ORDER[i] === 0) out.z += 0.55 * (beat > 1 ? 1 : beat < 1 ? 0 : ss(t, T1.nudge0, T1.nudge1));
    return out;
  }
  /** a box is hopping to its sorted place (its tag steps aside while it moves, so no two tags cross) */
  const hopping = (i, beat, t) => beat === 1 && START_SLOT[i] !== PRICE_ORDER[i] && t > HOP[i].a + 0.01 && t < HOP[i].b - 0.01;

  // the assistant's carry: the ◆ lifted out of its place, up over the shelf, out past its right end over the belt's
  // start; it lets go there and the box drops onto the belt
  const beltStart = new V3(B0.x, BELT.y, B0.z + 0.45);
  const lifted = diaOnShelf.clone().add(new V3(0, 1.05 - BOX * 0.5, 0.5));   // the box's bottom when lifted out
  const HANG = CUBE * 1.25 + 0.15;                     // from the cluster's centre to a carried box's top
  const overBox = lifted.clone().add(new V3(0, BOX + HANG, 0));
  const CARRY_Y = SHELF_TOP + BOX * 1.25 + BOX + HANG + 0.35;   // a carried box clears the boxes left on the shelf
  const overBelt = new V3(beltStart.x, CARRY_Y, beltStart.z);
  const carryPath = new THREE.CatmullRomCurve3([overBox, new V3(overBox.x + 0.6, CARRY_Y, overBox.z - 0.2), new V3(lerp(overBox.x, overBelt.x, 0.6), CARRY_Y + 0.2, lerp(overBox.z, overBelt.z, 0.6)), overBelt], false, 'centripetal');
  const releaseAt = overBelt.clone().sub(new V3(0, HANG + BOX, 0));
  const beltEnd = new V3(B1.x, BELT.y, B1.z);

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    const t = clamp(Number.isNaN(+k) ? 1 : +k) * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i: 0 before it, 1 after */
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : seg(t, a, z));
    S.beat = beat; S.t = t;

    // ---- the shopper
    const F = shopperAt(beat, t);
    person.apply(F.v);
    person.group.position.set(F.x, 0, F.z);
    person.group.rotation.set(0, F.yaw, 0);
    person.group.updateMatrixWorld(true);
    // the phone: in his hand until he has paid, then put away
    const pocket = Wn(4, T4.pocket0, T4.pocket1);
    phone.group.visible = pocket < 1;
    phone.group.scale.setScalar(Math.max(1e-3, 1 - pocket));
    const phonePt = phone.screenAnchor();
    g.worldToLocal(phonePt);

    // ---- the post: out of the phone (beat 1), back into it as he stands (beat 2)
    {
      const up = Wn(0, T0.post0, T0.post1), down = Wn(1, 0, T1.unpost);
      const k2 = back(up) * (1 - sm(down));
      post.visible = k2 > 0.01;
      if (down > 0) post.position.lerpVectors(POST_AT, phonePt, sm(down));
      else post.position.lerpVectors(phonePt, POST_AT, sm(up));
      post.scale.setScalar(Math.max(1e-3, k2));
      post.rotation.set(-0.08, 0.1 * (1 - sm(up)), 0);
      S.post = up >= 0.95 && down < 0.2;
    }
    const giftPt = g.worldToLocal(wp(post, POST_GIFT.x, POST_GIFT.y, POST_GIFT.z));

    // ---- the want: a thought bubble over his head; the ◆ jumps into it from the post, and later into the box
    const head = g.worldToLocal(person.top());
    const wantAt = _a.set(head.x - 1.65, head.y + 1.8, head.z + 0.3);
    const grow = Wn(0, T0.want0, T0.want1), pop = Wn(2, T2.pop0, T2.pop1);
    placeCloud(want, wantAt, head, pop >= 1 ? 0 : back(grow) * (1 - sm(pop)) * (1 + 0.15 * Math.sin(Math.PI * pop)));
    // the ◆
    const fly1 = Wn(0, T0.fly0, T0.fly1), fly2 = Wn(2, T2.fly0, T2.fly1);
    const centre = _b.copy(wantAt).add(new V3(0.05, 0.12, 0.2));
    if (fly1 <= 0) { dia.visible = false; }
    else {
      dia.visible = fly2 < 1;
      if (fly2 > 0) {
        // into the ◆ box's front face, where it is lifted out of the shelf
        const target = _c.copy(lifted).add(new V3(0, BOX * 0.5, BOX / 2));
        const e = sm(fly2);
        dia.position.lerpVectors(centre, target, e);
        dia.position.y += Math.sin(Math.PI * e) * 1.4;
        dia.scale.setScalar(Math.max(1e-3, lerp(1, 0.4, e)));
        dia.rotation.set(0, e * Math.PI * 2, 0);
      } else {
        const e = sm(fly1);
        dia.position.lerpVectors(giftPt, centre, e);
        dia.position.y += Math.sin(Math.PI * e) * 1.0;
        dia.scale.setScalar(Math.max(1e-3, lerp(0.45, 1, e) * (1 + 0.18 * Math.sin(Math.PI * seg(fly1, 0.8, 1)))));
        dia.rotation.set(0, (1 - e) * -Math.PI, 0);
      }
    }
    S.lime.want = dia.visible && fly1 >= 0.85;

    // ---- the assistant: hovers; works (a small turn) while it builds the shelf; carries the box over to its belt
    const grab = Wn(2, T2.grab0, T2.grab1), carry = Wn(2, T2.grab1, T2.carry1), fall = Wn(2, T2.carry1, T2.fall1), home = Wn(2, T2.fall1, T2.home1);
    {
      const p = cluster.position.copy(CL_HOME);
      if (beat === 2) {
        if (t >= T2.grab0 && t < T2.grab1) p.lerpVectors(CL_HOME, overBox, sm(grab));
        else if (t >= T2.grab1 && t < T2.carry1) p.copy(carryPath.getPointAt(sm(carry)));
        else if (t >= T2.carry1 && t < T2.fall1) p.copy(overBelt).y += 0.35 * Math.sin(Math.PI * 0.5 * fall);
        else if (t >= T2.fall1) p.lerpVectors(overBelt.clone().setY(overBelt.y + 0.35), CL_HOME, sm(home));
      }
      // it turns a little while it works (building the shelf, reading the prices; carrying)
      const work = beat === 1 ? Math.sin(Math.PI * seg(t, 0.35, 1.6)) : beat === 2 ? Math.sin(Math.PI * seg(t, T2.grab0, T2.home1)) : 0;
      cluster.rotation.set(0.15 * work, 0.9 * work, 0);
    }

    // ---- the shelf unfolds from the cluster (beat 2) and stays
    {
      const u = Wn(1, T1.shelf0, T1.shelf1);
      shelf.visible = u > 0;
      shelf.position.set(lerp(CL_HOME.x, SHELF.x, eo(u)), lerp(CL_HOME.y - 1.2, SHELF.y, eo(u)), lerp(CL_HOME.z, SHELF.z, eo(u)));
      shelf.scale.set(Math.max(1e-3, lerp(0.08, 1, eo(u))), 1, Math.max(1e-3, lerp(0.3, 1, eo(u))));
      const sc = beat === 1 ? seg(t, T1.scan0, T1.scan1) : 0;
      scan.visible = beat === 1 && sc > 0 && sc < 1;
      scan.position.set(lerp(SHELF.x - SHELF.w / 2 + 0.3, SHELF.x + SHELF.w / 2 - 0.3, sc), SHELF_TOP, SHELF.z);
    }

    // ---- the boxes: dropped from the cluster in the wrong order, read, sorted; the ◆ one chosen, carried, dropped
    const chosen = Wn(2, T2.dimOthers0, T2.dimOthers1);
    for (let i = 0; i < 4; i++) {
      const b = boxes[i], p = b.grp.position;
      const d0 = T1.drop0 + START_SLOT[i] * 0.07;
      const dropK = Wn(1, d0, d0 + 0.3);
      b.grp.visible = dropK > 0;
      boxOnShelf(i, beat, t, p);
      if (dropK < 1) {
        // falling out of the cluster onto its first slot
        const from = _c.set(lerp(CL_HOME.x, SLOT_X[START_SLOT[i]], 0.42), CL_HOME.y - 1.0, CL_HOME.z + 0.4);
        p.lerpVectors(from, p.clone(), dropK * dropK);
      }
      let rot = 0, sc = 1;
      if (i === DIA) {
        const lift = Wn(2, T2.lift0, T2.lift1);
        if (lift > 0) p.lerpVectors(p.clone(), lifted, sm(lift));
        rot = 0.35 * sm(lift);
        // the ◆ arrives: a small pop as it takes the lime
        sc = 1 + 0.12 * Math.sin(Math.PI * Wn(2, T2.fly1 - 0.04, T2.fly1 + 0.2));
        if (beat === 2 && t >= T2.grab1) {
          // under the cluster; let go over the belt's start, it drops onto the belt (a little bounce)
          p.copy(cluster.position).sub(new V3(0, HANG + BOX, 0));
          rot = 0.35 * (1 - sm(carry));
          if (t >= T2.carry1) {
            const f = fall;
            p.copy(releaseAt).lerp(beltStart, Math.min(1, (f / 0.8) * (f / 0.8)));
            if (f > 0.8) p.y = beltStart.y + 0.18 * Math.sin(Math.PI * (f - 0.8) / 0.2);
            rot = 0;
          }
        }
        if (beat > 2) {
          // the belt runs it to the counter (beat 4) and it slides off onto the counter beside the terminal
          const ride = Wn(3, T3.ride0, T3.ride1), onto = Wn(3, T3.ride1, T3.onto1);
          p.lerpVectors(beltStart, beltEnd, sm(ride));
          rot = 0;
          if (onto > 0) p.lerpVectors(beltEnd, BOXC, sm(onto));
          S.beltOn = beat === 3 && ride > 0 && onto < 1;
          if (beat === 4 && t >= T4.grab1) {
            // in his right hand by its bow, hanging below the fist
            const R = g.worldToLocal(person.hand('R').getWorldPosition(new V3()));
            p.copy(R).sub(new V3(0, BOW, 0));
          }
        } else S.beltOn = false;
      }
      b.grp.rotation.set(0, rot, 0);
      b.grp.scale.setScalar(sc);
      // the tag: under the box's place on the shelf; it types in as the scan passes, steps aside while its box hops
      const scanX = beat > 1 ? 1e9 : beat < 1 ? -1e9 : lerp(SHELF.x - SHELF.w / 2 + 0.3, SHELF.x + SHELF.w / 2 - 0.3, seg(t, T1.scan0, T1.scan1));
      const onShelf = boxOnShelf(i, beat, t, _c);
      const typed = beat >= 1 && dropK >= 1 && scanX >= SLOT_X[START_SLOT[i]] - 0.2;
      b.tag.visible = typed;
      b.tag.position.set(onShelf.x, TAG_Y, TAG_Z);
      S.tags[i] = typed && beat <= 2 && !hopping(i, beat, t);
      // the three not chosen drop to contour once the ◆ is chosen
      S.boxDim[i] = i === DIA ? 0 : chosen;
    }

    // ---- the ask: from his raised phone to the assistant's side, then into it
    {
      const out = Wn(1, T1.ask0, T1.ask1), into = Wn(2, 0, T2.unask);
      const from = phonePt.clone().add(new V3(0, 0.6, 0));
      const e = sm(out);
      ask.group.position.lerpVectors(from, ASK_AT, e);
      ask.group.position.y += Math.sin(Math.PI * e) * 1.2;
      if (into > 0) ask.group.position.lerpVectors(ASK_AT, CL_HOME, sm(into));
      const s = (0.3 + 0.7 * eo(out)) * (1 - sm(into));
      ask.group.scale.setScalar(Math.max(1e-3, s));
      ask.group.rotation.set(0, 0, 0);
      ask.group.visible = out > 0 && into < 1;
      S.ask = out >= 0.9 && into < 0.3;
    }

    // ---- the doubt at the counter (beat 4), gone once the slip is up (beat 5)
    {
      const up = Wn(3, T3.doubt0, T3.doubt1), gone = Wn(4, T4.undoubt0, T4.undoubt1);
      const at = _c.set(head.x - 0.6, head.y + 2.05, head.z + 0.35);
      placeCloud(doubt, at, head, gone >= 1 ? 0 : back(up) * (1 - sm(gone)));
      S.doubt = up >= 0.9 && gone < 0.5;
      S.lime.doubt = beat === 3 && up > 0.5;
    }

    // ---- the clerk and the slip; the terminal lights when he pays
    {
      const show = Wn(4, T4.slip0, T4.slip1);
      clerk.apply(blendPoses(C_IDLE, C_SHOW, sm(show)));
      slip.group.visible = show > 0.02;
      slip.group.scale.setScalar(Math.max(1e-3, sm(seg(show, 0, 0.6))));
      S.slip = show >= 0.9;
      S.lime.slip = beat === 4 && show > 0.3 && t < T4.lime;
      termScreen.material.userData.u.uShadeBias.value = Wn(4, T4.beep, T4.beep + 0.12) >= 1 ? 0.75 : 0.0;
    }
    S.lime.box = (beat === 2 && t >= T2.fly1) || (beat === 4 && t >= T4.lime);

    applyEmphasis();
  }

  // =================================================================== emphasis by subtraction
  // which dim groups each part id keeps at full strength
  const FULL = {
    shopper: ['shopper', 'want', 'doubt', `box${DIA}`],
    post: ['post', 'bench'],
    assistant: ['cluster', 'shelf', 'scan', 'tags', 'ask', 'box0', 'box1', 'box2', 'box3'],
    counter: ['counter'],
    belt: ['belt'],
    clerk: ['clerk'],
  };
  function setDim(obj, k) {
    dim(obj, k);
    obj.traverse((o) => { if (o.isMesh && !o.userData.hitProxy) o.castShadow = k < 0.5 ? !!o.userData.cast0 : false; });
  }
  function applyEmphasis() {
    const E = S.emph;
    const map = !E;
    const full = new Set();
    if (E) for (const id of E) for (const l of FULL[id] || []) full.add(l);
    for (const [name, objs] of Object.entries(layers)) {
      let a = map ? 0 : full.has(name) ? 0 : 1;
      // the three boxes not chosen stay at contour once the ◆ is chosen, even while the assistant is the subject
      const bi = /^box(\d)$/.exec(name);
      if (!map && bi && +bi[1] !== DIA && S.beat >= 2) a = Math.max(a, S.boxDim[+bi[1]]);
      // the ◆ box is his (the shopper's) once chosen; before that it is one of the assistant's four
      if (!map && bi && +bi[1] === DIA && S.beat < 2 && !full.has('shelf')) a = 1;
      for (const o of objs) setDim(o, a);
      // a box let go of keeps its mark (▲ ■ ●), so the reader still sees what was passed over
      if (bi && !map) dim(boxes[+bi[1]].grp.children[1], Math.min(a, 0.45));
    }
    // accents: only in focus (on the map the held result rests in plain ink: one lime object on the map at most)
    const on = !map;
    const lime = ACCENT.lime, teal = ACCENT.teal;
    dia.material.userData.u.uAccent.value = on && S.lime.want ? lime : 0;
    boxes.forEach((b, i) => { b.mat.userData.u.uAccent.value = on && i === DIA && S.lime.box ? lime : 0; });
    doubtMat.userData.u.uAccent.value = on && S.lime.doubt ? lime : 0;
    slip.material.userData.u.uAccent.value = on && S.lime.slip ? lime : 0;
    cubeMat.userData.u.uAccent.value = on && full.has('cluster') ? teal : 0;
    shelfMat.userData.u.uAccent.value = on && full.has('shelf') && S.beat === 1 ? teal : 0;
    scanMat.userData.u.uAccent.value = on && full.has('scan') ? teal : 0;
    beltMat.userData.u.uAccent.value = on && full.has('belt') ? teal : 0;
  }
  function emphasize(ids) {
    S.emph = ids && ids.length ? [...ids] : null;
    applyEmphasis();
  }
  for (const m of accents) m.userData.u.uAccentAll = { value: 1 };

  // =================================================================== anchors: labels, words, hotspots, framing
  const parts = {
    shopper: { hit: hits.shopper, anchor: () => person.chest(), beat: 2 },
    // the bench's seat (where the post came from; at the end the bench is empty)
    post: { hit: hits.post, anchor: () => (S.post ? wp(post, POST.w * 0.36, POST.h * 0.32, POST.t) : W(BENCH.x, bench.topY + 0.05, BENCH.z)), beat: 0 },
    // on the shelf's front edge, between the ◆'s place and the ● box: clear of the boxes, the tags and the top bar
    assistant: { hit: hits.assistant, anchor: () => W((SLOT_X[2] + SLOT_X[3]) / 2, SHELF_TOP + 0.05, SHELF.z + SHELF.d / 2), beat: 1 },
    // on the counter's front, under the clerk (clear of the terminal, the box and the slip)
    counter: { hit: hits.counter, anchor: () => W(COUNTER.x + 0.95, COUNTER.h * 0.5, COUNTER.z + COUNTER.d / 2 + 0.05), beat: 3 },
    belt: { hit: hits.belt, anchor: () => g.localToWorld(B0.clone().lerp(B1, 0.4).setY(BELT.y + 0.05)), beat: 3 },
    clerk: { hit: hits.clerk, anchor: () => clerk.chest(), beat: 4 },
  };
  const labelAt = {
    post: () => wp(post, -POST.w * 0.42, POST.h * 0.5, 0),
    assistant: () => wp(cluster, 0, CUBE * 1.4, 0),
    belt: () => g.localToWorld(B0.clone().lerp(B1, 0.55).setY(BELT.y + 0.05)),
    // the elbow of the arm that hangs (away from the raised slip): the name sits beside him, under the slip's words
    clerk: () => wp(clerk.joints.elbowL, 0.05 * HC, 0, 0),
  };
  const tagAt = (i) => () => (S.tags[i] ? wp(boxes[i].tag, 0, -0.31, 0.04) : null);
  const decalAt = {
    post: () => (S.post ? wp(post, 0, -POST.h * 0.27, POST.t / 2 + 0.02) : null),
    ask: () => (S.ask ? wp(ask.group, 0, 0, 0.2) : null),
    'tag-tri': tagAt(0),
    'tag-square': tagAt(1),
    'tag-diamond': tagAt(2),
    'tag-circle': tagAt(3),
    doubt: () => (S.doubt ? wp(doubt.grp, 0, 0.05, 0.2) : null),
    slip: () => (S.slip ? wp(slip.group, 0, 0.06, 0) : null),
  };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const L3 = (x, y, z) => W(x, y, z);
  const around = (x, z, top, r = 0.7) => [W(x - r, 0, z), W(x + r, 0, z), W(x - r, top, z), W(x + r, top, z)];
  const box3 = (o) => { o.updateWorldMatrix(true, true); const b = new THREE.Box3().setFromObject(o); return [b.min, b.max].flatMap((p) => [new V3(p.x, b.min.y, p.z), new V3(p.x, b.max.y, p.z)]); };
  // shot 0 (beat 1): the bench, the man on it, the post out of his phone and the bubble over his head, close up
  pose(0, 1);
  const S0_PTS = [...around(BENCH.x, BENCH.z, 0.2, 1.6), ...box3(want.grp), ...box3(post), ...box3(person.group)].map((v) => v.clone());
  // shot 1 (beats 2–3): the shelf and its tags, the assistant and the ask over it, the man below, the belt's start
  const S1_PTS = [
    ...around(BENCH.x, BENCH.z + 0.4, 0.2, 1.4),
    ...around(STAND.x, STAND.z + 0.6, H + 1.9), W(STAND.x, 0, STAND.z + 1.6),
    L3(STAND.x - 3.1, H + 3.0, STAND.z + 0.5),                         // the bubble over him, standing
    L3(SHELF.x - SHELF.w / 2, SHELF.y - 0.75, SHELF.z + SHELF.d / 2), L3(SHELF.x + SHELF.w / 2, SHELF.y - 0.75, SHELF.z + SHELF.d / 2),
    L3(SHELF.x - SHELF.w / 2, SHELF_TOP + BOX + 0.3, SHELF.z), L3(SHELF.x + SHELF.w / 2, SHELF_TOP + BOX + 0.3, SHELF.z),
    L3(CL_HOME.x, CL_HOME.y + CUBE * 1.7, CL_HOME.z), L3(ASK_AT.x - 2.2, ASK_AT.y + 0.9, ASK_AT.z),
    L3(B0.x + 0.9, 0, B0.z), L3(B0.x + 0.9, CARRY_Y, B0.z),            // the drop beside the shelf
  ];
  // shot 2 (beats 4–5): the man at the counter's end with his doubt over him, the counter, the clerk with the slip
  // held up, the belt coming in from behind, and the way out toward the reader (the box at his side)
  const S2_PTS = [
    ...around(PAY.x, PAY.z, H + 0.2), W(PAY.x, 0, PAY.z + 1.3),
    L3(PAY.x - 2.1, H + 3.5, PAY.z + 0.4), L3(PAY.x + 1.5, H + 3.5, PAY.z + 0.4),   // the doubt bubble
    L3(CLERK.x + 0.55, HC + 0.2, CLERK.z), L3(CLERK.x - 2.4, HC + 1.7, CLERK.z),      // the clerk and the slip held up
    L3(COUNTER.x + COUNTER.w / 2 - 0.3, 0, COUNTER.z + COUNTER.d / 2), L3(B0.x, BELT.y, lerp(B0.z, B1.z, 0.3)),
    ...around(S_OUT.x, S_OUT.z, H + 0.1, 0.9), W(S_OUT.x - 1.9, 0, S_OUT.z), W(S_OUT.x, 0, S_OUT.z + 1.0),
  ];
  const shot = (az, el, pts, margin) => ({ az: STAGE_AZ + az, el, anchors: () => pts, margin });
  const shots = {
    phone: [shot(0, 0.45, S0_PTS), shot(0, 0.5, S1_PTS), shot(-0.3, 0.55, S2_PTS)],
    // desktop: the bench and the post with the waiting AI over them for beat 1, then the whole plaza
    desk: [shot(0, 0.5, [...S0_PTS, L3(CL_HOME.x, CL_HOME.y + 1.4, CL_HOME.z), L3(PAY.x, 0, PAY.z)]), shot(0, 0.58, [...S0_PTS, ...S1_PTS, ...S2_PTS])],
  };

  const rest = () => pose(LAST, 1);
  function ambient() { /* no material motion: the held result stays still */ }

  const api = {
    id: 'market',
    group: g,
    zone: 'consumer',
    anchor: W(-0.5, 10.5, 0),
    pin: W(-0.5, 0.3, 0),
    // accents of this district are drawn at full strength in focus (they ignore the attention radius)
    focus: { pos: W(-0.5, 4, 0), r: 16 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    lever: null,
    mainActor: 'shopper',
    restParts: ['shopper', 'clerk'],
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { person: person.group, clerk: clerk.group, boxes: boxes.map((b) => b.grp), cluster, shelf, post, want: want.grp, doubt: doubt.grp, ask: ask.group, counter, belt, slip: slip.group, S },
  };
  rest();
  emphasize(null);
  return api;
}
