// 從想買到下單 · From wanting it to buying it (articles 7, 17) — in the 消費者 zone, TH 120°, r 29.
// Two shoppers and one AI on a plaza.  One man asks the AI shopping assistant (the teal cube cluster) which brand is
// best; only then do the brands appear: it throws down a typed staircase (a ranking: the cheapest on the top step) with
// four near-identical boxes, and its beams sort them by price while the question still hangs beside it (beat 1).  The
// brands start cutting their prices: a tag flips to a lower price and that box leapfrogs to the top, then another
// undercuts it; the ◆, which never cuts, sinks to the last step (beat 2).  A second man sits on a bench: three small
// framed moments of his own days come up out of his head, one after another, and in each the ◆ does something for
// him (morning, late: a ◆ coffee lands in his hand on his way out; working late: a ◆ meal lands on his desk and he
// sits up; the weekend: he lifts a ◆ gift for himself).  Each ◆ then jumps into the thought bubble over his head,
// which turns lime (beat 3).  He stands and points past the ranking to the ◆ on the last step; the ◆ in his head
// flies into it, the other three drop to contour, and the AI comes down for the ◆ and carries it to its belt (beat 4).
// The belt runs it to the checkout; he reaches for the terminal and stops (不合適怎麼辦？) (beat 5).  The terminal
// pops a discount; he shakes his head and waves it off, and a ✕ lands on it.  The clerk holds up one line,
// 不合適可以換; his doubt is gone, he pays and walks out with the box toward the reader (beat 6).
//
// Staging (portrait, design §5.4), four shots: (0) beats 1–2, the asker below, the floating ranking above him, the
// AI on top (on desktop only the asker, the ranking and the AI, so the event fills the wide frame); (1) beat 3, close
// on the bench and the man on it, his moments beside him, his bubble right over him; (3) beat 4, seen from the right
// so the ranking climbs away to the left, the man standing in front of its last step, the assistant's carry out to
// its belt; (2) beats 5–6, the checkout: the man at the counter's left end in profile, the counter and its terminal,
// the clerk behind it with the slip held up over the counter, the belt coming in from behind, the way out toward the
// reader.
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
const H = 4.5, HA = 4.2, HC = 3.6;     // the hero (on the bench); the asker; the clerk (secondary people are smaller)
const BENCH = { x: -3.9, z: 3.6, w: 2.3, d: 1.1 };
const SEAT_YAW = 0.3;                  // seated facing the reader (a little to camera-right, toward his moments), the
                                       // bench's long side across the view so it reads under him
const STAND = { x: -2.1, z: 2.2 };     // where he stands to name his brand: a step in front of the bench
const ASKER = { x: -8.0, z: -1.3 };    // the man who asks, in front of the ranking's top steps
// the ranking: a typed staircase floating behind them (AI-made), four steps, the top one on the left (rank 1)
const POD = { x: -3.9, z: -4.8, y: 4.4, d: 1.9, step: 0.95, slot: 2.65, base: 0.9 };
const SX = [-1.5, -0.5, 0.5, 1.5].map((s) => POD.x + s * POD.slot);
const TOP = [0, 1, 2, 3].map((r) => POD.y + (3 - r) * POD.step);          // the top of the step of rank r
const POD_BOT = POD.y - POD.base;
const BOX = 1.25;                      // the gift boxes (one he can carry by its bow)
const BOW = BOX * 1.07;                // from a box's bottom to where a fist round its bow holds it
const BOX_Z = POD.z + 0.3;
const CL_HOME = new V3(POD.x - 0.6, 10.5, POD.z - 0.5);   // the AI shopping assistant hovers over its ranking
const CUBE = 0.95;
// the four marks and their prices (illustrative): ▲ $990, ■ $1,050 → $890, ◆ $1,280, ● $1,300 → $950
const MARKS = ['tri', 'square', 'diamond', 'circle'];
const DIA = 2;                         // the ◆ box
// where each box stands (box i → slot = rank): dropped, sorted by price, then after each price cut
const R_DROP = [3, 2, 1, 0];
// sorted: [0, 1, 2, 3]; after ● cuts to $950: [1, 2, 3, 0]; after ■ cuts to $890: [2, 0, 3, 1] (◆ at $1,280 stays last)
// the checkout, laid out along the belt's line BX (just past the ranking's right end, so the AI's drop onto the belt is
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
// dur = the motion; the caption lands at keyAt and holds 0.8 s + 0.2 s per 字 (story.js), so a beat lasts the longer
const BEATS = [
  // 1 等人開口問 AI 才出現的品牌，只能拚價格 — he asks; only then do the brands appear: the AI throws down a
  // staircase of four boxes and its beams sort them by price (the question stays beside it until the caption is read)
  { dur: 1.7, keyAt: 1.62, shot: 0, parts: ['asker', 'assistant', 'ranking'] },
  // 2 降價換來的第一名，轉眼就被更便宜的搶走 — ● cuts its price and jumps to the top; ■ cuts lower and takes it
  { dur: 1.85, keyAt: 1.82, shot: 0, parts: ['ranking'] },
  // 3 另一個人不必問：那個牌子在他需要時出現 — three moments of his days come up out of his head; in each the ◆
  // helps him, and each ◆ jumps into his bubble
  { dur: 2.8, keyAt: 2.7, shot: 1, parts: ['shopper', 'moments'] },
  // 4 所以他指名它，排最後也要；AI 只管下單 — he points to the ◆ on the last step; the ◆ in his head flies
  // into it; the assistant comes down for it and carries it to its belt
  { dur: 2.9, keyAt: 1.3, shot: 3, parts: ['shopper', 'ranking', 'assistant'] },
  // 5 付錢前他停住：不是找不到按鈕，是怕後悔 — the belt runs the box to the counter; he reaches to pay, stops
  { dur: 1.85, keyAt: 1.8, shot: 2, parts: ['shopper', 'counter', 'belt'] },
  // 6 再降價也搖頭；說清楚他擔心的，他才敢買 — a discount pops: he shakes his head and waves it off (a ✕ lands
  // on it, and it stays up until the caption is read); the clerk's one line: the doubt goes, he pays and walks out
  { dur: 4.45, keyAt: 1.6, shot: 2, parts: ['clerk', 'shopper', 'counter'] },
];
const LAST = BEATS.length - 1;
// beat-local times of the key events (seconds)
const T0 = { raise1: 0.3, ask0: 0.12, ask1: 0.45, shelf0: 0.4, shelf1: 0.65, drop0: 0.5, scan0: 0.9, scan1: 1.15, lower0: 1.1, lower1: 1.45 };
// beat 2: the question, read, goes into the AI as the price war starts
const T1 = { unask0: 0.0, unask1: 0.3 };
// beat 3: moment i comes up at T2.m0 + i·T2.gap (out of his head, T2.rise long); its act starts T2.act later and
// takes T2.actLen; its ◆ leaves for his bubble T2.flyAt after the act starts and takes T2.fly
const T2 = { m0: 0.08, gap: 0.75, rise: 0.3, act: 0.26, actLen: 0.34, flyAt: 0.3, fly: 0.3, grow0: 0.62, grow1: 0.92 };
const T3 = { unpost: 0.3, up1: 0.45, point0: 0.4, point1: 0.7, fly0: 0.45, fly1: 0.85, pop0: 0.75, pop1: 0.95,
  dimOthers0: 0.75, dimOthers1: 1.0, grab0: 1.05, grab1: 1.4, carry1: 2.1, fall1: 2.4, home1: 2.9, arm0: 1.3, arm1: 1.7 };
const T4 = { ride0: 0.1, ride1: 0.85, onto1: 1.0, turn1: 0.15, walk1: 1.25, reach1: 1.58, doubt0: 1.5, doubt1: 1.78 };
// beat 6: the discount pops; he shakes his head and waves it off; a ✕ lands on it; the clerk's slip comes up and the
// doubt goes — all of it before the caption (keyAt 1.6), the crossed-out discount still up; then it drops, he pays
const T5 = { promo0: 0.05, promo1: 0.35, shake0: 0.35, shake1: 1.3, wave0: 0.35, wave1: 0.6, unwave0: 1.15, unwave1: 1.45,
  x0: 0.75, x1: 0.95, off0: 1.95, off1: 2.2, slip0: 0.95, slip1: 1.38, undoubt0: 1.25, undoubt1: 1.58,
  pay0: 1.95, pay1: 2.27, beep: 2.25, pocket0: 2.27, pocket1: 2.37,
  step1: 2.57, grab1: 2.75, lift1: 2.93, lime: 2.75, turn1: 3.23, walk1: 4.15, face1: 4.4 };
// the box moves on the ranking: { beat, a, b, i (box), from, to (slots), lane (z, + toward the reader), h (lift) }.
// A box that goes up passes high in the back lane; the ones that step down go low in the front lane, so no two boxes
// ever pass through each other or through a step
const MOVES = [
  // beat 1: sorted by price (▲ and ● swap ends, ■ and ◆ swap the middle)
  { beat: 0, a: 1.15, b: 1.45, i: 0, from: 3, to: 0, lane: -1.35, h: 2.0 },
  { beat: 0, a: 1.15, b: 1.45, i: 3, from: 0, to: 3, lane: 1.25, h: 1.6 },
  { beat: 0, a: 1.3, b: 1.6, i: 1, from: 2, to: 1, lane: -0.95, h: 0.95 },
  { beat: 0, a: 1.3, b: 1.6, i: 2, from: 1, to: 2, lane: 0.85, h: 0.4 },
  // beat 2, round 1: ● cuts to $950 and, its new price on show, leaps behind the others to the top; ▲ ■ ◆ step down
  { beat: 1, a: 0.5, b: 0.95, i: 3, from: 3, to: 0, lane: -1.35, h: 1.5 },
  { beat: 1, a: 0.6, b: 0.95, i: 0, from: 0, to: 1, lane: 0.8, h: 0.45 },
  { beat: 1, a: 0.6, b: 0.95, i: 1, from: 1, to: 2, lane: 0.8, h: 0.45 },
  { beat: 1, a: 0.6, b: 0.95, i: 2, from: 2, to: 3, lane: 0.8, h: 0.45 },
  // round 2: ■ cuts to $890 and leaps over ● to the top; ● and ▲ step down one; ◆ stays last
  { beat: 1, a: 1.35, b: 1.8, i: 1, from: 2, to: 0, lane: -1.35, h: 1.4 },
  { beat: 1, a: 1.45, b: 1.8, i: 3, from: 0, to: 1, lane: 0.8, h: 0.45 },
  { beat: 1, a: 1.45, b: 1.8, i: 0, from: 1, to: 2, lane: 0.8, h: 0.45 },
];
// a price cut: the tag spins once and comes round with the lower price, which shows a moment before the leap (beat 2)
const CUT = { 3: { a: 0.05, b: 0.28 }, 1: { a: 0.95, b: 1.18 } };

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
function edgeBars(w, h, d, { y0 = 0, th = 0.07, grow = 0.01, x0 = 0 } = {}) {
  const bars = [], x = w / 2 + grow, z = d / 2 + grow, y1 = y0 + h;
  const pt = (sx, y, sz) => new V3(x0 + sx * x, y, sz * z);
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

  // =================================================================== the hero, his phone, the bench
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

  // =================================================================== the asker and his phone
  const asker = makePerson({ height: HA });
  asker.material.userData.u.uShadeBias.value = 0.34;
  asker.group.name = 'asker';
  const aPhone = P.makePhone({ h: 0.62 });
  asker.hold('R', aPhone, { rot: [0, Math.PI, 0] });
  g.add(layer('asker', asker.group));

  // ---- his moments: three small framed scenes of his own days, stacked beside him in the order they happened (the
  // first on top).  Each is a little stage (a paper back with a dark frame, a ledge for a floor) with a small him in
  // it, and in each the ◆ does something for him: (0) a weekday morning, the clock past the hour, he hurries out and
  // a ◆ coffee hops off the counter into his hand; (1) working late (a moon in the corner, a lamp, a laptop), he is
  // slumped over his desk when a ◆ meal lands on it and he sits up; (2) the weekend, he lifts a ◆ gift for himself
  // high.  The words (the moment) sit on each ledge's front, from world.json
  const MOM = { w: 3.6, h: 3.35, t: 0.12, d: 1.3, lt: 0.18, gap: 0.5 };
  const MH = 2.3;                                                     // the small him in each
  const MOM_AT = [2, 1, 0].map((r) => new V3(-0.8, 0.45 + MOM.h / 2 + r * (MOM.h + MOM.gap), 4.3));
  const roundRect = (w, h, r) => {
    const s = new THREE.Shape(), x = w / 2, y = h / 2;
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r);
    s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r);
    s.quadraticCurveTo(-x, -y, -x + r, -y);
    return s;
  };
  const backGeo = slabOf(roundRect(MOM.w, MOM.h, 0.28), MOM.t, 0.03);
  const ringGeo = (() => {
    const s = roundRect(MOM.w + 0.06, MOM.h + 0.06, 0.31), hole = roundRect(MOM.w - 0.12, MOM.h - 0.12, 0.23);
    s.holes.push(new THREE.Path(hole.getPoints(8)));
    return slabOf(s, 0.06, 0.012, 8);
  })();
  const ledgeGeo = faceTones(new THREE.BoxGeometry(MOM.w - 0.3, MOM.lt, MOM.d).toNonIndexed(), { top: 1.0, pz: 0.66, nz: 0.6, px: 0.55, nx: 0.55, bottom: 0.5 });
  const backMat = ink({ shade: 1, bias: 0.36 });
  const ringMat = ink({ accent: 'ink' });
  const ledgeMat = ink({ shade: 1, bias: 0.1 }); ledgeMat.vertexColors = true;
  const propMat = ink({ shade: 0.9, bias: 0.06 }); propMat.vertexColors = true;
  const markMat = ink({ accent: 'ink' });
  const momDiaGeo = slabOf(markShape('diamond', 0.34), 0.05, 0.012);
  const toneBox = (w, h, d, o) => faceTones(new THREE.BoxGeometry(w, h, d).toNonIndexed(), { top: 1.0, pz: 0.8, nz: 0.6, px: 0.56, nx: 0.6, bottom: 0.5, ...o });
  const pm = (geo, mat = propMat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };
  const diaOn = (parent, x, y, z, s = 1) => { const m = new THREE.Mesh(momDiaGeo, markMat); m.castShadow = false; m.position.set(x, y, z); m.scale.setScalar(s); parent.add(m); return m; };
  const moms = [0, 1, 2].map((i) => {
    const grp = new THREE.Group(); grp.name = `moment${i}`;
    const back = pm(backGeo, backMat); back.position.z = -MOM.d / 2 - MOM.t / 2;
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.castShadow = false; ring.position.z = -MOM.d / 2 + 0.03;
    const ledge = pm(ledgeGeo, ledgeMat); ledge.position.y = -MOM.h / 2 + MOM.lt / 2 + 0.12;
    // the stage: the ledge's top, the panel's centre line (props and the small him stand on y = 0 of it)
    const stage = new THREE.Group(); stage.position.y = -MOM.h / 2 + MOM.lt + 0.12;
    grp.add(back, ring, ledge, stage);
    const me = makePerson({ height: MH });
    me.material.userData.u.uShadeBias.value = 0.3;
    me.group.name = `me${i}`;
    stage.add(me.group);
    grp.visible = false;
    g.add(layer('moments', grp));
    return { grp, ledge, stage, me };
  });
  // (0) the morning: a counter on the left with the ◆ coffee on it, a clock on the wall at ten to eight
  const CNT = { x: -1.25, h: 0.86 };
  {
    const s = moms[0].stage;
    const counter = pm(toneBox(0.62, CNT.h, 0.55)); counter.position.set(CNT.x, CNT.h / 2, -0.15); s.add(counter);
    const face = new THREE.Mesh(discGeo(0.36, 0.05), ink({ shade: 1, bias: 0.3 })); face.castShadow = false;
    const rim = new THREE.Mesh(slabOf((() => { const c = new THREE.Shape(); c.absarc(0, 0, 0.42, 0, Math.PI * 2, false); c.holes.push(new THREE.Path().absarc(0, 0, 0.35, 0, Math.PI * 2, true)); return c; })(), 0.06, 0.01, 20), ringMat);
    // ten to eight: the hour hand just short of 8, the minute hand on 10 (both turn clockwise from 12)
    const hands = new THREE.Mesh(merge([
      [new THREE.BoxGeometry(0.06, 0.2, 0.03).translate(0, 0.1, 0), m4([0, 0, 0.04], [0, 0, -2 * Math.PI * (7.83 / 12)])],
      [new THREE.BoxGeometry(0.04, 0.3, 0.03).translate(0, 0.15, 0), m4([0, 0, 0.05], [0, 0, -2 * Math.PI * (50 / 60)])],
    ]), ringMat);
    const ticks = new THREE.Mesh(merge([0, 1, 2, 3].map((j) => [new THREE.BoxGeometry(0.04, 0.08, 0.03).translate(0, 0.28, 0), m4([0, 0, 0.04], [0, 0, (j * Math.PI) / 2])])), ringMat);
    hands.castShadow = rim.castShadow = ticks.castShadow = false;
    const clock = new THREE.Group(); clock.add(face, rim, hands, ticks);
    clock.position.set(-1.1, MOM.h - 0.95, -MOM.d / 2 + 0.06);
    s.add(clock);
    // the way out: an open door on the right of the back wall
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.85, 0.05).translate(0, 0.925, 0), ink({ shade: 0.32, bias: 0.0 }));
    door.castShadow = false; door.position.set(1.28, 0, -MOM.d / 2 + 0.05); s.add(door);
    const jamb = new THREE.Mesh(edgeBars(0.74, 1.9, 0.06, { th: 0.06 }), ringMat); jamb.castShadow = false;
    jamb.position.set(1.28, 0, -MOM.d / 2 + 0.06); s.add(jamb);
  }
  // the coffee: a lidded cup with the ◆ on its front
  const cup = new THREE.Group(); cup.name = 'coffee';
  {
    const body = pm(new THREE.CylinderGeometry(0.2, 0.15, 0.5, 16).translate(0, 0.25, 0), ink({ shade: 1, bias: 0.3 }));
    const lid = pm(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 16).translate(0, 0.535, 0), ink({ shade: 0.4, bias: 0.0 }));
    cup.add(body, lid);
    diaOn(cup, 0, 0.25, 0.19, 0.95);
    moms[0].stage.add(cup);
  }
  // (1) working late: a desk with a laptop and a lamp, a stool, a moon in the top right corner
  const DESK = { x: 0.38, w: 1.5, d: 0.75 };
  const deskH = 0.42 * MH;
  {
    const s = moms[1].stage;
    const desk = P.makeTable({ w: DESK.w, d: DESK.d, h: deskH, top: 0.08, leg: 0.07 });
    desk.group.position.set(DESK.x, 0, -0.1); s.add(desk.group);
    const stool = P.makeStool({ h: moms[1].me.seatH, r: 0.2 });
    stool.group.position.set(-0.78, 0, -0.1); s.add(stool.group);
    const laptop = pm(merge([[new THREE.BoxGeometry(0.62, 0.04, 0.42), m4([0, 0.02, 0])], [new THREE.BoxGeometry(0.04, 0.42, 0.6), m4([0.3, 0.22, 0], [0, 0, 0.22])]]), ink({ shade: 0.55, bias: 0.04 }));
    laptop.position.set(DESK.x + 0.05, deskH, -0.12); s.add(laptop);
    const lamp = pm(merge([[new THREE.CylinderGeometry(0.12, 0.14, 0.05, 12), m4([0, 0.025, 0])], [new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6), m4([0.06, 0.32, 0], [0, 0, -0.2])], [new THREE.ConeGeometry(0.2, 0.26, 14, 1, true), m4([-0.06, 0.62, 0], [0, 0, 0.9])]]), ink({ shade: 0.5, bias: 0.04 }));
    lamp.position.set(DESK.x + 0.6, deskH, -0.25); s.add(lamp);
    // a crescent: the outer circle's left side, back along a second circle's left side
    const moon = new THREE.Shape(), R = 0.38, r = 0.32, dx = 0.24;
    const ix = (R * R - r * r + dx * dx) / (2 * dx), iy = Math.sqrt(R * R - ix * ix);
    const a1 = Math.atan2(iy, ix), a2 = Math.atan2(iy, ix - dx);
    moon.absarc(0, 0, R, a1, 2 * Math.PI - a1, false);
    moon.absarc(dx, 0, r, 2 * Math.PI - a2, a2, true);
    const mn = new THREE.Mesh(slabOf(moon, 0.06, 0.012, 24), ink({ shade: 0.45, bias: 0.05 })); mn.castShadow = false;
    mn.position.set(1.25, MOM.h - 0.95, -MOM.d / 2 + 0.06); s.add(mn);
  }
  // the meal: a takeaway bag with a folded top, the ◆ on its front
  const meal = new THREE.Group(); meal.name = 'meal';
  {
    meal.add(pm(toneBox(0.44, 0.42, 0.3).translate(0, 0.21, 0)), pm(toneBox(0.46, 0.06, 0.12, { top: 0.8 }).translate(0, 0.45, 0)));
    diaOn(meal, 0, 0.21, 0.16, 0.95);
    moms[1].stage.add(meal);
  }
  // (2) the weekend: a low stand in front of him with the ◆ gift on it, and he lifts it overhead; a sun in the corner
  const GIFT = 0.56;
  const GIFT_AT = new V3(-0.1, 0.42, 0.3);
  {
    const s = moms[2].stage;
    const stand = pm(toneBox(0.66, 0.42, 0.42)); stand.position.set(GIFT_AT.x, 0.21, GIFT_AT.z); s.add(stand);
    const sun = new THREE.Mesh(merge([[discGeo(0.26, 0.05), null], ...Array.from({ length: 8 }, (_, j) => [new THREE.BoxGeometry(0.05, 0.16, 0.04).translate(0, 0.38, 0), m4([0, 0, 0], [0, 0, (j / 8) * Math.PI * 2])])]), ink({ shade: 0.5, bias: 0.05 }));
    sun.castShadow = false; sun.position.set(1.15, MOM.h - 0.95, -MOM.d / 2 + 0.06); s.add(sun);
  }
  const gift = new THREE.Group(); gift.name = 'gift';
  {
    const gm = ink({ shade: 1, bias: 0.16 }); gm.vertexColors = true;
    gift.add(pm(giftGeo(GIFT), gm));
    diaOn(gift, 0, GIFT * 0.5, GIFT / 2 + 0.03, 1.0);
    moms[2].stage.add(gift);
  }
  const momItems = [cup, meal, gift];
  // the ◆ on its way from a moment into his head (one at a time; the moment keeps its own)
  const fly = new THREE.Mesh(slabOf(markShape('diamond', 1.0), 0.24, 0.05), ink({ shade: 0.4, bias: 0.1, accent: 'ink', focus: false }));
  fly.castShadow = true;
  fly.visible = false;
  g.add(layer('moments', fly));

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

  // ---- the want: a thought bubble over his head, and the ◆ in it (it grows with every moment's ◆)
  const WANT = { w: 2.6, h: 2.0 };
  const wantMat = ink({ shade: 1, bias: 0.34 });
  const want = makeCloud('want', WANT.w, WANT.h, wantMat);
  g.add(layer('want', want.grp, ...want.dots));
  want.dots.forEach((d) => g.add(d));
  const dia = new THREE.Mesh(slabOf(markShape('diamond', 1.45), 0.3, 0.06), ink({ shade: 0.5, bias: 0.2, focus: false }));
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

  // ---- the ranking: a typed staircase (AI-made: it floats), unfolding from the cluster.  Origin at its top centre's
  // level of the lowest step, so it can grow out of the cluster
  const podium = new THREE.Group(); podium.name = 'ranking';
  const podMat = ink({ style: 1, shade: 0.72, focus: false });
  podMat.vertexColors = true;
  accents.push(podMat);
  {
    const steps = [], edges = [];
    for (let r = 0; r < 4; r++) {
      const h = TOP[r] - POD_BOT, cx = SX[r] - POD.x;
      steps.push([new THREE.BoxGeometry(POD.slot, h, POD.d), m4([cx, POD_BOT + h / 2 - POD.y, 0])]);
      edges.push(strip(edgeBars(POD.slot, h, POD.d, { y0: POD_BOT - POD.y, th: 0.06, x0: cx })));
    }
    const slab = new THREE.Mesh(faceTones(merge(steps), { top: 1.1, pz: 0.7, nz: 0.6, px: 0.5, nx: 0.55, bottom: 0.45 }), podMat);
    slab.castShadow = true; slab.receiveShadow = true;
    const e = new THREE.Mesh(mergeGeometries(edges), ink({ accent: 'ink' }));
    e.castShadow = false;
    podium.add(slab, e);
  }
  podium.position.set(POD.x, POD.y, POD.z);
  g.add(layer('podium', podium));
  // the scan: a typed sheet that sweeps the staircase from left to right, reading the prices
  const scanMat = ink({ style: 1, shade: 0.4, bias: 0.3, focus: false });
  accents.push(scanMat);
  const scan = new THREE.Mesh(new THREE.BoxGeometry(0.12, BOX + 3.2, POD.d + 0.3).translate(0, (BOX + 3.2) / 2, 0), scanMat);
  scan.castShadow = false;
  scan.visible = false;
  g.add(layer('scan', scan));
  // its beams: while it moves a box on the ranking, a typed beam runs from it down to that box (the AI does the sorting)
  const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 8, 1, true).translate(0, 0.5, 0);
  const beams = [0, 1, 2, 3].map(() => {
    const m = new THREE.Mesh(beamGeo, scanMat); m.castShadow = false; m.visible = false;
    g.add(layer('beam', m));
    return m;
  });
  const _bd = new V3();

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
    // the price tag hangs from its step's front edge under the box; it spins round when the price is cut
    const tag = new THREE.Group(); tag.name = `tag-${kind}`;
    const tMat = ink({ style: 1, shade: 0.9, bias: 0.25, focus: false });
    accents.push(tMat);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.62, 0.06), tMat);
    plate.position.y = -0.31;
    plate.castShadow = false;
    tag.add(plate);
    tag.visible = false;
    g.add(layer('tags', tag));
    return { grp, body, mat, tag, tMat, kind };
  });
  const TAG_Z = POD.z + POD.d / 2 + 0.06;

  // ---- the ask: a speech bubble from the asker's phone to the assistant
  const ask = P.makeBubble({ w: 4.1, h: 1.6, tail: 'left' });
  ask.group.visible = false;
  g.add(layer('ask', ask.group));
  const ASK_AT = new V3(ASKER.x + 1.2, CL_HOME.y - 0.6, ASKER.z - 1.6);

  // =================================================================== the checkout: belt, counter, terminal, clerk
  // the typed belt (AI 直送結帳): from beside the ranking's right end, where the AI drops the box, to the counter's back
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
  // the pay terminal: a slanted reader whose screen is one big pay button, lit while he reaches for it
  const termScreen = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.38), ink({ shade: 0.3, bias: 0.0 }));
  {
    const t = new THREE.Group(); t.name = 'terminal';
    const tb = new THREE.Mesh(merge([[new THREE.BoxGeometry(0.62, 0.12, 0.52), m4([0, 0.06, 0])], [new THREE.BoxGeometry(0.58, 0.1, 0.48), m4([0, 0.23, -0.02], [-0.45, 0, 0])]]), ink({ shade: 0.6, bias: 0.04 }));
    tb.castShadow = true;
    termScreen.position.set(0, 0.29, 0.0);
    termScreen.rotation.x = -0.45;
    t.add(tb, termScreen);
    t.position.copy(TERM);
    t.rotation.y = Math.PI / 2;             // the screen (tilted toward local -z) toward the customer, at -x
    counter.add(t);
  }
  g.add(layer('counter', counter));
  accents.push(termScreen.material);

  // ---- the discount the terminal pushes: a typed card that pops up over the counter (machine-made)
  const promo = new THREE.Group(); promo.name = 'promo';
  const promoMat = ink({ style: 1, shade: 0.85, bias: 0.25, focus: false });
  accents.push(promoMat);
  {
    const card = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.95, 0.08), promoMat);
    card.castShadow = true;
    const e = new THREE.Mesh(edgeBars(2.3, 0.95, 0.08, { y0: -0.475, th: 0.05 }), ink({ accent: 'ink' }));
    e.castShadow = false;
    promo.add(card, e);
  }
  // the ✕ that lands on it once he has waved it off
  const noX = P.makeX({ size: 1.5, w: 0.2, t: 0.1 });
  noX.group.visible = false;
  promo.add(noX.group);
  accents.push(noX.material);
  promo.visible = false;
  g.add(layer('promo', promo));
  const PROMO_AT = new V3(TERM.x + 0.75, 4.55, TERM.z + 0.2);   // over the counter, right of his head

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
  const doubt = makeCloud('doubt', 3.6, 2.1, doubtMat);
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
  asker.setPose('stand', 1);
  const hits = {
    shopper: P.makeHitProxy(person.group, 0.35),
    asker: P.makeHitProxy(asker.group, 0.35),
    // the moments answer on their column while it is up (beat 3); otherwise on the bench, where he remembered them
    // (pose() moves this proxy between the two)
    moments: zone('moments', -MOM.w / 2 - 0.03, 0, 0, MOM.w / 2 + 0.03, 1, MOM.d),
    assistant: zone('assistant', CL_HOME.x - 1.7, CL_HOME.y - 1.4, CL_HOME.z - 1.2, CL_HOME.x + 1.7, CL_HOME.y + 1.4, CL_HOME.z + 1.2),
    ranking: zone('ranking', SX[0] - POD.slot / 2, POD_BOT - 0.8, POD.z - POD.d / 2, SX[3] + POD.slot / 2, TOP[0] + BOX + 0.3, POD.z + POD.d / 2 + 0.2),
    counter: P.makeHitProxy(counter, 0.3),
    belt: P.makeHitProxy(belt, 0.3),
    clerk: clerkHit,
  };

  // every mesh's own shadow setting, so dimming can switch shadows off and emphasis can give them back
  g.traverse((o) => { if (o.isMesh) o.userData.cast0 = o.castShadow; });

  // =================================================================== the people's poses (pure)
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
  /** seated, the phone lowered to the lap, the head up: remembering (the moments come up out of his head) */
  const SIT_UP = (() => {
    const v = clonePose(SIT);
    v.waist.copy(eul(0.0, 0, 0)); v.neck.copy(eul(-0.1, 0, 0)); v.head.copy(eul(-0.16, 0, 0));
    setHand(v, 'R', chestPt(v, -0.06, -0.12, 0.2), chestDir(v, -0.6, -1, -0.2), chestQ(v).multiply(eul(-1.2, 0, 0)));
    setHand(v, 'L', chestPt(v, 0.06, -0.13, 0.19), chestDir(v, 0.6, -1, -0.2));
    return v;
  })();
  /** standing, the phone at the chest, looking up at the ranking */
  const LOOK = (() => {
    const v = clonePose(pz(person, 'stand'));
    v.neck.copy(eul(-0.12, 0, 0)); v.head.copy(eul(-0.2, 0, 0));
    setHand(v, 'R', chestPt(v, -0.06, -0.02, 0.17), chestDir(v, -0.6, -1, -0.3), chestQ(v).multiply(eul(-0.5, 0, 0)));
    return hl(v);
  })();
  /** pointing at a box on the ranking (computed for his place and the box's) */
  const pointAt = (who, h, root, target) => {
    const v = clonePose(pz(who, 'stand'));
    v.neck.copy(eul(-0.14, 0, 0)); v.head.copy(eul(-0.22, 0, 0));
    v.waist.copy(eul(-0.04, 0, 0));
    const t = inRoot(root, target, h);
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
    const v = clonePose(pz(person, 'stamp', { y: +(TERM.y + 0.46).toFixed(3), fwd: +(tIn.z - 0.12).toFixed(3), x: -0.12, table: COUNTER.h }));
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
  /** waving the discount off: the reaching hand up, palm out toward it */
  const WAVE = (() => {
    const v = clonePose(HESIT);
    setHand(v, 'R', chestPt(v, -0.13, 0.2, 0.22), chestDir(v, -1, -0.5, -0.2), chestQ(v).multiply(eul(-1.4, 0, 0)));
    return v;
  })();
  /** no to the discount (beat 6, time t): the head shaken from side to side (three times, wide), the hand up and
   *  waving with it */
  const refuse = (t) => {
    const u = seg(t, T5.shake0, T5.shake1), w = ss(t, T5.wave0, T5.wave1) * (1 - ss(t, T5.unwave0, T5.unwave1));
    const v = blendPoses(HESIT, WAVE, w);
    const sw = Math.sin(u * Math.PI * 6) * Math.sin(u * Math.PI);
    v.neck.copy(HESIT.neck).multiply(eul(0, sw * 0.22, 0));
    v.head.copy(HESIT.head).multiply(eul(0, sw * 0.5, 0));
    v.hand.R.p.add(chestDir(v, 0, 0, 1).cross(new V3(0, 1, 0)).normalize().multiplyScalar(0.035 * sw * w));
    return v;
  };
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
  const walkCarry = (d, hi = 0) => carryHand(clonePose(walkPose(d)), hi);

  // the asker: looking up at the ranking with his phone; the phone raised toward the assistant while he asks
  const A_LOOK = (() => {
    const v = clonePose(pz(asker, 'stand'));
    v.neck.copy(eul(-0.16, 0, 0)); v.head.copy(eul(-0.26, 0, 0));
    setHand(v, 'R', chestPt(v, -0.06, -0.02, 0.17), chestDir(v, -0.6, -1, -0.3), chestQ(v).multiply(eul(-0.5, 0, 0)));
    return hl(v);
  })();
  const A_RAISE = (() => {
    const v = clonePose(pz(asker, 'raise', { side: 'R' }));
    v.hand.R.grip.copy(chestQ(v).multiply(eul(-0.6, 0, 0)));
    return v;
  })();
  const aYaw = yawTo(ASKER.x, ASKER.z, POD.x - 2.2, POD.z);

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

  // ------------------------------------------------------------------ the small him in each moment (pure)
  // stage coordinates (y = 0 on the ledge, +z toward the reader); τ = seconds since the moment came up
  const stageTo = (i, p) => moms[i].stage.worldToLocal(p);
  const mHand = (i, side = 'R') => stageTo(i, moms[i].me.hand(side).getWorldPosition(new V3()));
  const placeMe = (i, x, z, yaw, v) => {
    const me = moms[i].me;
    me.apply(v);
    me.group.position.set(x, 0, z);
    me.group.rotation.set(0, yaw, 0);
    me.group.updateMatrixWorld(true);
  };
  // (0) the morning: he hurries to camera-right (his right hand, toward the reader, takes the cup and holds it up)
  const M0 = { x0: -0.82, z: 0.12, walk: 0.8, stride: 0.36 * MH };
  const m0Walk = (d) => moms[0].me.pose('walk', { dist: d, stride: M0.stride });
  const cupHand = (v) => setHand(v, 'R', chestPt(v, -0.14, 0.03, 0.22), chestDir(v, -0.6, -1, -0.3), chestQ(v));
  const CUP_AT = new V3(CNT.x, CNT.h, -0.15);
  // (1) working late: on the stool, slumped over the desk; then sat up, a hand to the meal
  const M1 = { x: -0.78, z: -0.1, yaw: Math.PI / 2 };
  const MEAL_AT = new V3(DESK.x - 0.32, deskH, 0.16);
  const m1Root = { x: M1.x, z: M1.z, yaw: M1.yaw };
  const SLUMP = (() => {
    const v = clonePose(pz(moms[1].me, 'sit'));
    v.waist.copy(eul(0.62, 0, 0)); v.neck.copy(eul(0.32, 0, 0)); v.head.copy(eul(0.42, 0, 0));
    setHand(v, 'R', inRoot(m1Root, new V3(DESK.x - 0.62, deskH + 0.04, 0.02), MH), chestDir(v, -0.7, -0.5, -0.4));
    setHand(v, 'L', inRoot(m1Root, new V3(DESK.x - 0.6, deskH + 0.04, -0.24), MH), chestDir(v, 0.7, -0.5, -0.4));
    return v;
  })();
  const PERK = (() => {
    const v = clonePose(pz(moms[1].me, 'sit'));
    v.waist.copy(eul(-0.06, 0, 0)); v.neck.copy(eul(-0.08, 0, 0)); v.head.copy(eul(-0.12, 0, 0));
    setHand(v, 'R', inRoot(m1Root, MEAL_AT.clone().add(new V3(-0.24, 0.24, 0.06)), MH), chestDir(v, -0.7, -0.6, -0.3));
    setHand(v, 'L', chestPt(v, 0.17, 0.12, 0.1), chestDir(v, 0.8, -0.5, -0.4));
    return v;
  })();
  // (2) the weekend: behind a low stand with the gift on it, facing the reader; he takes it and lifts it overhead
  const M2 = { x: -0.15, z: -0.3, yaw: 0.12 };
  const m2Root = { x: M2.x, z: M2.z, yaw: M2.yaw };
  const STAND2 = hl(clonePose(pz(moms[2].me, 'stand')));
  const G_REACH = (() => {
    const tip = inRoot(m2Root, GIFT_AT.clone().setY(GIFT_AT.y + GIFT * 1.07), MH);
    const v = clonePose(pz(moms[2].me, 'stamp', { y: +(tip.y * MH).toFixed(3), fwd: +(tip.z * MH).toFixed(3), x: +(tip.x * MH).toFixed(3), table: 0.42 }, MH));
    return v;
  })();
  const TADA = (() => {
    const v = clonePose(pz(moms[2].me, 'stand'));
    v.neck.copy(eul(-0.12, 0, 0)); v.head.copy(eul(-0.2, 0, 0)); v.waist.copy(eul(-0.06, 0, 0));
    setHand(v, 'R', chestPt(v, -0.09, 0.31, 0.12), chestDir(v, -1, 0.1, -0.3));
    setHand(v, 'L', chestPt(v, 0.09, 0.31, 0.12), chestDir(v, 1, 0.1, -0.3));
    return v;
  })();
  /** moment i at τ: the small him, its ◆ thing; → the ◆ thing (an Object3D) */
  function momentAt(i, τ) {
    const A = T2.act, L = T2.actLen;
    if (i === 0) {
      const d = M0.walk * seg(τ, 0.05, A + L + 0.35);
      const v = blendPoses(m0Walk(d), cupHand(clonePose(m0Walk(d))), ss(τ, A + 0.05, A + 0.24));
      placeMe(0, M0.x0 + d, M0.z, Math.PI / 2, v);
      // off the counter, in an arc, into his hand
      const u = seg(τ, A, A + 0.24), hp = mHand(0).sub(new V3(0, 0.24, 0));
      if (u <= 0) cup.position.copy(CUP_AT);
      else {
        cup.position.lerpVectors(CUP_AT, hp, sm(u));
        cup.position.y += Math.sin(Math.PI * u) * 0.35;
      }
      cup.rotation.set(0, 0, 0);
      return cup;
    }
    if (i === 1) {
      placeMe(1, M1.x, M1.z, M1.yaw, blendPoses(SLUMP, PERK, ss(τ, A + 0.12, A + L + 0.08)));
      // delivered: down onto the desk, a little bounce
      const u = seg(τ, A, A + 0.2);
      meal.visible = τ > A - 0.02;
      meal.position.copy(MEAL_AT);
      meal.position.y += (1 - u * u) * 1.1;
      if (u >= 1) meal.position.y += 0.06 * Math.sin(Math.PI * seg(τ, A + 0.2, A + 0.32));
      meal.scale.setScalar(Math.max(1e-3, ss(τ, A - 0.02, A + 0.06)));
      return meal;
    }
    // i === 2: reach for the gift, then lift it overhead
    const r = ss(τ, A, A + 0.12), up = ss(τ, A + 0.12, A + L + 0.06);
    placeMe(2, M2.x, M2.z, M2.yaw, up > 0 ? blendPoses(G_REACH, TADA, up) : blendPoses(STAND2, G_REACH, r));
    if (up <= 0) gift.position.copy(GIFT_AT);
    else {
      // held by the bow at first, then on both raised hands
      const R = mHand(2, 'R'), Lh = mHand(2, 'L');
      const bow = R.clone().sub(new V3(0, GIFT * 1.07, 0)), top = R.clone().lerp(Lh, 0.5).add(new V3(0, 0.02, 0));
      gift.position.copy(bow).lerp(top, ss(up, 0.35, 1));
    }
    gift.rotation.set(0, 0.25 * ss(up, 0.4, 1), 0);
    return gift;
  }

  // ------------------------------------------------------------------ the hero's frame at (beat, t)
  const st = (x, z, yaw, v) => ({ x, z, yaw, v });
  const blendTo = (a, b, k) => st(b.x, b.z, b.yaw, blendPoses(reframe(a.v, a, b, H), b.v, sm(k)));
  const diaLast = new V3(SX[3], TOP[3] + BOX * 0.5, BOX_Z);             // the ◆ on the last step
  const yStand = yawTo(STAND.x, STAND.z, diaLast.x, diaLast.z);
  const S_SIT = st(BENCH.x, BENCH.z, SEAT_YAW, SIT);
  const S_SIT_UP = st(BENCH.x, BENCH.z, SEAT_YAW, SIT_UP);
  const S_LOOK = st(STAND.x, STAND.z, yStand, LOOK);
  const S_POINT = st(STAND.x, STAND.z, yStand, pointAt(person, H, { x: STAND.x, z: STAND.z, yaw: yStand }, diaLast.clone().setY(diaLast.y + 0.3)));
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
    if (beat < 2) return S_SIT;
    if (beat === 2) return blendTo(S_SIT, S_SIT_UP, seg(t, 0.0, 0.3));
    if (beat === 3) {
      if (t < T3.up1) return blendTo(S_SIT_UP, S_LOOK, seg(t, 0, T3.up1));
      if (t < T3.arm0) return blendTo(S_LOOK, S_POINT, seg(t, T3.point0, T3.point1));
      return blendTo(S_POINT, S_WATCH, seg(t, T3.arm0, T3.arm1));
    }
    if (beat === 4) {
      if (t < T4.turn1) return blendTo(S_WATCH, S_W0, seg(t, 0, T4.turn1));
      if (t < T4.walk1) {
        const d = walkLen * seg(t, T4.turn1, T4.walk1);
        return st(STAND.x + Math.sin(walkYaw) * d, STAND.z + Math.cos(walkYaw) * d, walkYaw, walkPose(d));
      }
      return blendTo(S_W1, S_HESIT, seg(t, T4.walk1, T4.reach1));
    }
    // beat 6: shakes his head at the discount; once the doubt is answered he pays, takes the box and walks out
    if (t < T5.pay0) return t > T5.shake0 ? st(PAY.x, PAY.z, payYaw, refuse(t)) : S_HESIT;
    if (t < T5.pocket1) return blendTo(S_HESIT, S_REACH, seg(t, T5.pay0, T5.pay1));
    if (t < T5.grab1) return blendTo(S_REACH, S_GRAB, seg(t, T5.pocket1, T5.grab1));
    if (t < T5.lift1) {
      // straight up off the counter (clear of the terminal), then in toward him
      const u = seg(t, T5.grab1, T5.lift1), F = blendTo(S_GRAB, S_LIFT, u);
      const a = handAt(S_GRAB), b = handAt(S_LIFT);
      const p = new V3(lerp(a.x, b.x, ss(u, 0.35, 1)), lerp(a.y, b.y, ss(u, 0, 0.55)), lerp(a.z, b.z, ss(u, 0.35, 1)));
      F.v.hand.R.p.copy(inRoot(F, p, H));
      return F;
    }
    if (t < T5.turn1) {
      // he turns to the reader; the box swings round in front of him, high, and only drops to his side once it is
      // clear of the counter
      const u = seg(t, T5.lift1, T5.turn1), F = blendTo(S_LIFT, S_TURN, u);
      const a = handAt(S_LIFT), b = handAt(S_TURN), e = sm(u);
      const x = (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * SWING.x + e * e * b.x;
      const z = (1 - e) * (1 - e) * a.z + 2 * (1 - e) * e * SWING.z + e * e * b.z;
      F.v.hand.R.p.copy(inRoot(F, new V3(x, lerp(a.y, b.y, ss(u, 0.55, 1)), z), H));
      return F;
    }
    if (t < T5.walk1) {
      const u = seg(t, T5.turn1, T5.walk1), d = exitLen * u;
      return st(TAKE.x + Math.sin(exitYaw) * d, TAKE.z + Math.cos(exitYaw) * d, exitYaw, walkCarry(d, 1 - sm(seg(u, 0, 0.45))));
    }
    return blendTo(S_E1, S_OUT, seg(t, T5.walk1, T5.face1));
  }
  function askerPose(beat, t) {
    if (beat > 0) return A_LOOK;
    if (t < T0.lower0) return blendPoses(A_LOOK, A_RAISE, sm(seg(t, 0, T0.raise1)));
    return blendPoses(A_RAISE, A_LOOK, sm(seg(t, T0.lower0, T0.lower1)));
  }

  // =================================================================== pose: (beat, k) → everything
  const S = { beat: LAST, t: BEATS[LAST].dur, emph: null, ask: false, tags: [false, false, false, false], cut: [false, false, false, false],
    mom: [false, false, false], doubt: false, slip: false, promo: false,
    lime: { want: false, box: false, doubt: false, slip: false }, boxDim: [1, 1, 0, 1], chosen: 0 };
  const _a = new V3(), _b = new V3(), _c = new V3();

  /** where box i stands on the ranking at (beat, t), and whether it is on the move */
  function boxOnRank(i, beat, t, out) {
    let slot = R_DROP[i], moving = false;
    for (const m of MOVES) {
      if (m.i !== i) continue;
      if (beat > m.beat || (beat === m.beat && t >= m.b)) { slot = m.to; continue; }
      if (beat === m.beat && t > m.a) {
        const u = seg(t, m.a, m.b), e = ss(u, 0.18, 0.82);
        const lift = sm(seg(u, 0, 0.25)) * sm(seg(1 - u, 0, 0.25));
        out.set(lerp(SX[m.from], SX[m.to], e), lerp(TOP[m.from], TOP[m.to], e) + lift * m.h, BOX_Z + lift * m.lane);
        return { slot: e < 0.5 ? m.from : m.to, from: m.from, to: m.to, e, moving: true };
      }
      break;
    }
    out.set(SX[slot], TOP[slot], BOX_Z);
    return { slot, from: slot, to: slot, e: 1, moving };
  }

  // the assistant's carry: the ◆ lifted out of the last step, up, out past the ranking's right end over the belt's
  // start; it lets go there and the box drops onto the belt
  const beltStart = new V3(B0.x, BELT.y, B0.z + 0.45);
  const lifted = new V3(SX[3], TOP[3] + 1.05, BOX_Z + 0.5);       // the box's bottom when lifted out
  const HANG = CUBE * 1.25 + 0.15;                                  // from the cluster's centre to a carried box's top
  const overBox = lifted.clone().add(new V3(0, BOX + HANG, 0));
  const CARRY_Y = overBox.y + 0.4;
  const overBelt = new V3(beltStart.x, CARRY_Y, beltStart.z);
  const carryPath = new THREE.CatmullRomCurve3([overBox, new V3(overBox.x + 0.5, CARRY_Y, overBox.z - 0.2), new V3(lerp(overBox.x, overBelt.x, 0.65), CARRY_Y + 0.15, lerp(overBox.z, overBelt.z, 0.65)), overBelt], false, 'centripetal');
  const releaseAt = overBelt.clone().sub(new V3(0, HANG + BOX, 0));
  const beltEnd = new V3(B1.x, BELT.y, B1.z);

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    const t = clamp(Number.isNaN(+k) ? 1 : +k) * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i: 0 before it, 1 after */
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : seg(t, a, z));
    S.beat = beat; S.t = t;

    // ---- the asker
    asker.apply(askerPose(beat, t));
    asker.group.position.set(ASKER.x, 0, ASKER.z);
    asker.group.rotation.set(0, aYaw, 0);
    asker.group.updateMatrixWorld(true);
    const aPhonePt = g.worldToLocal(aPhone.screenAnchor());

    // ---- the hero
    const F = shopperAt(beat, t);
    person.apply(F.v);
    person.group.position.set(F.x, 0, F.z);
    person.group.rotation.set(0, F.yaw, 0);
    person.group.updateMatrixWorld(true);
    // the phone: in his hand until he has paid, then put away
    const pocket = Wn(5, T5.pocket0, T5.pocket1);
    phone.group.visible = pocket < 1;
    phone.group.scale.setScalar(Math.max(1e-3, 1 - pocket));
    const head = g.worldToLocal(person.top());

    // ---- his moments: up out of his head one after another (beat 3), back into it as he stands (beat 4).  His bubble
    // sits right over his head, its trail down to him, seated or standing
    const side = Wn(3, 0, T3.up1);
    const wantAt = _a.set(head.x + lerp(0.05, 0.2, sm(side)), head.y + lerp(2.0, 2.05, sm(side)), head.z + 0.3);
    const centre = _b.copy(wantAt).add(new V3(0.05, 0.12, 0.2));
    const down = Wn(3, 0, T3.unpost);
    let flyOn = false, landed = 0, popK = 0;
    const from = head.clone().add(new V3(0.2, 0.3, 0.3));
    moms.forEach((m, i) => {
      const a = T2.m0 + i * T2.gap;
      const up = Wn(2, a, a + T2.rise);
      const kk = back(up) * (1 - sm(down));
      m.grp.visible = kk > 0.01;
      // out of his head in a small arc to its place in the column; back the same way
      const e = down > 0 ? 1 - sm(down) : eo(up);
      m.grp.position.lerpVectors(from, MOM_AT[i], e);
      m.grp.position.y += Math.sin(Math.PI * e) * 0.6;
      m.grp.scale.setScalar(Math.max(1e-3, kk));
      m.grp.rotation.set(-0.04, 0.0, 0.03 * (1 - e) * (i - 1));
      m.grp.updateMatrixWorld(true);
      // what happens in it (time since it came up; fixed at the end of the beat from beat 4 on)
      const tau = beat === 2 ? t - a : beat > 2 ? 9 : -1;
      const item = momentAt(i, tau);
      S.mom[i] = up >= 0.95 && down < 0.2;
      // its ◆ jumps from the moment into his bubble
      const f0 = a + T2.act + T2.flyAt, fk = Wn(2, f0, f0 + T2.fly);
      if (fk >= 1) { landed++; if (beat === 2) popK = Math.max(popK, Math.sin(Math.PI * seg(t, f0 + T2.fly, f0 + T2.fly + 0.25))); }
      if (fk > 0 && fk < 1 && m.grp.visible) {
        flyOn = true;
        const p = g.worldToLocal(item.children[item.children.length - 1].getWorldPosition(new V3()));
        const e2 = sm(fk);
        fly.position.lerpVectors(p, centre, e2);
        fly.position.y += Math.sin(Math.PI * e2) * 0.8;
        fly.scale.setScalar(Math.max(1e-3, lerp(0.35, 0.62 + 0.22 * landed, e2)));
        fly.rotation.set(0, (1 - e2) * Math.PI, 0);
      }
    });
    fly.visible = flyOn;
    // the moments' hotspot: on their column while it is up, else on the bench
    {
      const on = beat === 2;
      const hm = hits.moments;
      // (its box: MOM.w + 0.06 wide, 1 high, MOM.d deep, centred on its position)
      if (on) { hm.position.set(MOM_AT[0].x, (MOM_AT[0].y + MOM_AT[2].y) / 2, MOM_AT[0].z); hm.scale.set(1, MOM_AT[0].y - MOM_AT[2].y + MOM.h + 0.06, 1); }
      else { hm.position.set(BENCH.x, 0.95, BENCH.z); hm.scale.set(3.6 / (MOM.w + 0.06), 1.9, 2.8 / MOM.d); }
      hm.updateMatrixWorld(true);
    }

    // ---- the want: a thought bubble over his head; it grows with each ◆ that lands, and the ◆ flies into the box
    const grow = Wn(2, T2.grow0, T2.grow1), pop = Wn(3, T3.pop0, T3.pop1);
    placeCloud(want, wantAt, head, pop >= 1 ? 0 : back(grow) * (1 - sm(pop)) * (1 + 0.15 * Math.sin(Math.PI * pop)));
    const fly2 = Wn(3, T3.fly0, T3.fly1);
    if (landed === 0) dia.visible = false;
    else {
      dia.visible = fly2 < 1;
      const size = (0.45 + 0.2 * landed) * (1 + 0.16 * popK);
      if (fly2 > 0) {
        // into the ◆ box's front face, on the last step of the ranking
        const target = _c.copy(diaLast).add(new V3(0, 0, BOX / 2 + 0.05));
        const e = sm(fly2);
        dia.position.lerpVectors(centre, target, e);
        dia.position.y += Math.sin(Math.PI * e) * 1.6;
        dia.scale.setScalar(Math.max(1e-3, lerp(size, 0.4, e)));
        dia.rotation.set(0, e * Math.PI * 2, 0);
      } else {
        dia.position.copy(centre);
        dia.scale.setScalar(size);
        dia.rotation.set(0, 0, 0);
      }
    }
    S.lime.want = dia.visible;

    // ---- the assistant: hovers; works (a small turn) while it builds and re-sorts the ranking; carries the ◆ to its belt
    const grab = Wn(3, T3.grab0, T3.grab1), carry = Wn(3, T3.grab1, T3.carry1), fall = Wn(3, T3.carry1, T3.fall1), home = Wn(3, T3.fall1, T3.home1);
    {
      const p = cluster.position.copy(CL_HOME);
      if (beat === 3) {
        if (t >= T3.grab0 && t < T3.grab1) p.lerpVectors(CL_HOME, overBox, sm(grab));
        else if (t >= T3.grab1 && t < T3.carry1) p.copy(carryPath.getPointAt(sm(carry)));
        else if (t >= T3.carry1 && t < T3.fall1) p.copy(overBelt).y += 0.35 * Math.sin(Math.PI * 0.5 * fall);
        else if (t >= T3.fall1) p.lerpVectors(overBelt.clone().setY(overBelt.y + 0.35), CL_HOME, sm(home));
      }
      const work = beat === 0 ? Math.sin(Math.PI * seg(t, 0.35, 1.6)) : beat === 1 ? 0.6 * Math.sin(Math.PI * seg(t, 0.1, 1.75)) : beat === 3 ? Math.sin(Math.PI * seg(t, T3.grab0, T3.home1)) : 0;
      cluster.rotation.set(0.15 * work, 0.9 * work, 0);
    }

    // ---- the ranking unfolds from the cluster (beat 1) and stays
    {
      const u = Wn(0, T0.shelf0, T0.shelf1);
      podium.visible = u > 0;
      podium.position.set(lerp(CL_HOME.x, POD.x, eo(u)), lerp(CL_HOME.y - 1.2, POD.y, eo(u)), lerp(CL_HOME.z, POD.z, eo(u)));
      podium.scale.set(Math.max(1e-3, lerp(0.08, 1, eo(u))), Math.max(1e-3, lerp(0.2, 1, eo(u))), Math.max(1e-3, lerp(0.3, 1, eo(u))));
      const sc = beat === 0 ? seg(t, T0.scan0, T0.scan1) : 0;
      scan.visible = beat === 0 && sc > 0 && sc < 1;
      scan.position.set(lerp(SX[0] - POD.slot / 2 + 0.3, SX[3] + POD.slot / 2 - 0.3, sc), POD_BOT, POD.z);
    }

    // ---- the boxes: dropped from the cluster, read, sorted by price; then the price war; then the ◆ chosen and carried
    const chosen = Wn(3, T3.dimOthers0, T3.dimOthers1);
    S.chosen = chosen;
    const scanX = beat > 0 ? 1e9 : lerp(SX[0] - POD.slot / 2 + 0.3, SX[3] + POD.slot / 2 - 0.3, seg(t, T0.scan0, T0.scan1));
    for (let i = 0; i < 4; i++) {
      const b = boxes[i], p = b.grp.position;
      const d0 = T0.drop0 + R_DROP[i] * 0.07;
      const dropK = Wn(0, d0, d0 + 0.3);
      b.grp.visible = dropK > 0;
      const R = boxOnRank(i, beat, t, p);
      if (dropK < 1) {
        // falling out of the cluster onto its first step
        const from = _c.set(lerp(CL_HOME.x, SX[R_DROP[i]], 0.42), CL_HOME.y - 1.0, CL_HOME.z + 0.4);
        p.lerpVectors(from, p.clone(), dropK * dropK);
      }
      let rot = 0, sc = 1;
      if (i === DIA) {
        const lift = Wn(3, T3.grab0 + 0.15, T3.grab1);
        if (lift > 0) p.lerpVectors(p.clone(), lifted, sm(lift));
        rot = 0.35 * sm(lift);
        // the ◆ arrives from his head: a small pop as it takes the lime
        sc = 1 + 0.14 * Math.sin(Math.PI * Wn(3, T3.fly1 - 0.04, T3.fly1 + 0.2));
        if (beat === 3 && t >= T3.grab1) {
          // under the cluster; let go over the belt's start, it drops onto the belt (a little bounce)
          p.copy(cluster.position).sub(new V3(0, HANG + BOX, 0));
          rot = 0.35 * (1 - sm(carry));
          if (t >= T3.carry1) {
            const f = fall;
            p.copy(releaseAt).lerp(beltStart, Math.min(1, (f / 0.8) * (f / 0.8)));
            if (f > 0.8) p.y = beltStart.y + 0.18 * Math.sin(Math.PI * (f - 0.8) / 0.2);
            rot = 0;
          }
        }
        if (beat > 3) {
          // the belt runs it to the counter (beat 5) and it slides off onto the counter beside the terminal
          const ride = Wn(4, T4.ride0, T4.ride1), onto = Wn(4, T4.ride1, T4.onto1);
          p.lerpVectors(beltStart, beltEnd, sm(ride));
          rot = 0;
          if (onto > 0) p.lerpVectors(beltEnd, BOXC, sm(onto));
          if (beat === 5 && t >= T5.grab1) {
            // in his right hand by its bow, hanging below the fist
            const Rh = g.worldToLocal(person.hand('R').getWorldPosition(new V3()));
            p.copy(Rh).sub(new V3(0, BOW, 0));
          }
        }
      }
      // the assistant's beam onto a box it is moving (beats 1–2)
      {
        const bm = beams[i], on = beat <= 1 && R.moving && R.e > 0.02 && R.e < 0.98;
        bm.visible = on;
        if (on) {
          const a = _c.copy(cluster.position).add(new V3(0, -CUBE * 0.9, 0)), tip = p.clone().add(new V3(0, BOX * 1.1, 0));
          _bd.subVectors(tip, a);
          bm.position.copy(a);
          bm.quaternion.setFromUnitVectors(YAX, _bd.clone().normalize());
          bm.scale.set(1, Math.max(1e-3, _bd.length()), 1);
        }
      }
      b.grp.rotation.set(0, rot, 0);
      b.grp.scale.setScalar(sc);
      // the tag: on its step's front under the box; it types in as the scan passes, steps aside while its box moves,
      // and spins round once when the price is cut
      const typed = beat > 0 || (dropK >= 1 && scanX >= SX[R_DROP[i]] - 0.2);
      // a box that has just cut its price leaps with its new price under it; the others' tags step aside while they move
      const leaping = R.moving && beat === 1 && !!CUT[i] && R.to < R.from;
      const tagY = lerp(TOP[R.from], TOP[R.to], R.e) - 0.06;
      b.tag.visible = typed && (!R.moving || leaping);
      if (leaping) b.tag.position.set(p.x, p.y - 0.04, p.z + BOX / 2 + 0.08);
      else b.tag.position.set(p.x, tagY, TAG_Z);
      if (i === DIA && beat >= 3) b.tag.position.x = SX[3];
      const cut = CUT[i];
      const spin = cut ? Wn(1, cut.a, cut.b) : 0;
      b.tag.rotation.set(cut ? Math.PI * 2 * sm(spin) : 0, 0, 0);
      const spinning = beat === 1 && spin > 0 && spin < 1;
      S.cut[i] = !!cut && spin >= 0.5;
      S.tags[i] = typed && (!R.moving || leaping) && !spinning && (beat <= 1 || beat === 3);
      b.tMat.userData.u.uAccent.value = 0;
      b.tMat.userData.flash = spinning || leaping || (beat === 1 && !!cut && t > cut.b && t < cut.b + 0.3);
      // the three not chosen drop to contour once the ◆ is chosen
      S.boxDim[i] = i === DIA ? 0 : chosen;
    }

    // ---- the ask: from the asker's raised phone to the assistant's side, where it stays while the caption is read;
    // into the AI as the price war starts (beat 2)
    {
      const out = Wn(0, T0.ask0, T0.ask1), into = Wn(1, T1.unask0, T1.unask1);
      const from = aPhonePt.clone().add(new V3(0, 0.6, 0));
      const e = sm(out);
      ask.group.position.lerpVectors(from, ASK_AT, e);
      ask.group.position.y += Math.sin(Math.PI * e) * 1.0;
      if (into > 0) ask.group.position.lerpVectors(ASK_AT, CL_HOME, sm(into));
      const s = (0.3 + 0.7 * eo(out)) * (1 - sm(into));
      ask.group.scale.setScalar(Math.max(1e-3, s));
      ask.group.rotation.set(0, 0, 0);
      ask.group.visible = out > 0 && into < 1;
      S.ask = out >= 0.9 && into < 0.3;
    }

    // ---- the doubt at the counter (beat 5); it swells at the discount and is gone once the slip is up (beat 6)
    {
      const up = Wn(4, T4.doubt0, T4.doubt1), gone = Wn(5, T5.undoubt0, T5.undoubt1);
      const swell = beat === 5 ? 0.1 * Math.sin(Math.PI * seg(t, T5.promo0, T5.off1)) : 0;
      const at = _c.set(head.x - 0.6, head.y + 2.05, head.z + 0.35);
      placeCloud(doubt, at, head, gone >= 1 ? 0 : back(up) * (1 - sm(gone)) * (1 + swell));
      S.doubt = up >= 0.9 && gone < 0.5;
      S.lime.doubt = (beat === 4 && up > 0.5) || (beat === 5 && t < T5.slip0);
    }

    // ---- the discount: pops up over the terminal; he shakes his head and waves it off, a ✕ lands on it, and it
    // stays up, crossed out, until the caption is read; then it drops away as he pays
    {
      const on = Wn(5, T5.promo0, T5.promo1), off = Wn(5, T5.off0, T5.off1);
      const s = back(on) * (1 - sm(off));
      promo.visible = beat === 5 && s > 0.01;
      promo.position.copy(TERM).lerp(PROMO_AT, eo(on));
      promo.position.y -= 1.2 * sm(off);
      promo.rotation.set(0, 0.35, -0.5 * sm(off));
      promo.scale.setScalar(Math.max(1e-3, s));
      S.promo = beat === 5 && on >= 0.9 && off < 0.2;
      const xk = Wn(5, T5.x0, T5.x1);
      noX.group.visible = beat === 5 && xk > 0;
      noX.group.scale.setScalar(Math.max(1e-3, xk > 0 ? lerp(1.7, 1, back(xk)) : 0));
      noX.group.position.set(0, 0, 0.12 + 0.4 * (1 - xk));
    }

    // ---- the clerk and the slip; the terminal (its screen one big pay button) lights while he reaches, and when he pays
    {
      const show = Wn(5, T5.slip0, T5.slip1);
      clerk.apply(blendPoses(C_IDLE, C_SHOW, sm(show)));
      slip.group.visible = show > 0.02;
      slip.group.scale.setScalar(Math.max(1e-3, sm(seg(show, 0, 0.6))));
      S.slip = show >= 0.9;
      S.lime.slip = beat === 5 && show > 0.3 && t < T5.lime;
      const lit = (beat === 4 && t >= T4.walk1) || (beat === 5 && t < T5.pocket1);
      termScreen.material.userData.u.uShadeBias.value = Wn(5, T5.beep, T5.beep + 0.12) >= 1 ? 0.75 : lit ? 0.5 : 0.0;
      termScreen.material.userData.lit = lit;
    }
    S.lime.box = (beat === 3 && t >= T3.fly1) || (beat === 5 && t >= T5.lime);

    applyEmphasis();
  }

  // =================================================================== emphasis by subtraction
  // which dim groups each part id keeps at full strength
  const FULL = {
    asker: ['asker', 'ask'],
    assistant: ['cluster', 'scan', 'beam', 'ask'],
    ranking: ['podium', 'scan', 'beam', 'tags', 'box0', 'box1', 'box2', 'box3'],
    moments: ['moments', 'bench'],
    shopper: ['shopper', 'want', 'doubt', `box${DIA}`],
    counter: ['counter', 'promo'],
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
      // the three boxes not chosen stay at contour once the ◆ is chosen, even while the ranking is the subject
      const bi = /^box(\d)$/.exec(name);
      if (!map && bi && +bi[1] !== DIA && S.beat >= 3) a = Math.max(a, S.boxDim[+bi[1]]);
      // the ◆ box is his (the shopper's) once chosen; before that it is one of the ranking's four
      if (!map && bi && +bi[1] === DIA && S.beat < 3 && !full.has('podium')) a = 1;
      for (const o of objs) setDim(o, a);
      // a box let go of keeps its mark (▲ ■ ●), so the reader still sees what was passed over
      if (bi && !map) dim(boxes[+bi[1]].grp.children[1], S.beat >= 3 ? Math.min(a, 0.45) : a);
    }
    // accents: only in focus (on the map the held result rests in plain ink: one lime object on the map at most)
    const on = !map;
    const lime = ACCENT.lime, teal = ACCENT.teal;
    dia.material.userData.u.uAccent.value = on && S.lime.want ? lime : 0;
    boxes.forEach((b, i) => {
      b.mat.userData.u.uAccent.value = on && i === DIA && S.lime.box ? lime : 0;
      b.tMat.userData.u.uAccent.value = on && full.has('tags') && b.tMat.userData.flash ? teal : 0;
    });
    doubtMat.userData.u.uAccent.value = on && S.lime.doubt ? lime : 0;
    slip.material.userData.u.uAccent.value = on && S.lime.slip ? lime : 0;
    cubeMat.userData.u.uAccent.value = on && full.has('cluster') ? teal : 0;
    podMat.userData.u.uAccent.value = on && full.has('podium') && S.beat <= 1 ? teal : 0;
    scanMat.userData.u.uAccent.value = on && full.has('scan') ? teal : 0;
    beltMat.userData.u.uAccent.value = on && full.has('belt') ? teal : 0;
    promoMat.userData.u.uAccent.value = on && full.has('promo') && S.promo ? teal : 0;
    noX.material.userData.u.uAccent.value = on && full.has('promo') ? ACCENT.red : 0;
    termScreen.material.userData.u.uAccent.value = on && full.has('counter') && termScreen.material.userData.lit ? teal : 0;
  }
  function emphasize(ids) {
    S.emph = ids && ids.length ? [...ids] : null;
    applyEmphasis();
  }
  for (const m of accents) m.userData.u.uAccentAll = { value: 1 };

  // =================================================================== anchors: labels, words, hotspots, framing
  const parts = {
    asker: { hit: hits.asker, anchor: () => asker.chest(), beat: 0 },
    assistant: { hit: hits.assistant, anchor: () => W(CL_HOME.x, CL_HOME.y, CL_HOME.z + 0.6), beat: 0 },
    // low on the last step's front (clear of its tag, and low in every frame, under the top bar)
    ranking: { hit: hits.ranking, anchor: () => W(SX[3] - POD.slot / 2 + 0.35, POD_BOT + 0.4, POD.z + POD.d / 2 + 0.05), beat: 1 },
    // the middle moment's top right while they are up; else the bench's seat, where he remembered them
    moments: { hit: hits.moments, anchor: () => (S.mom[1] ? wp(moms[1].grp, MOM.w * 0.36, MOM.h * 0.3, -MOM.d / 2) : W(BENCH.x, bench.topY + 0.05, BENCH.z)), beat: 2 },
    shopper: { hit: hits.shopper, anchor: () => person.chest(), beat: 3 },
    belt: { hit: hits.belt, anchor: () => g.localToWorld(B0.clone().lerp(B1, 0.4).setY(BELT.y + 0.05)), beat: 3 },
    // on the counter's front, under the clerk (clear of the terminal, the box and the slip)
    counter: { hit: hits.counter, anchor: () => W(COUNTER.x + 0.95, COUNTER.h * 0.5, COUNTER.z + COUNTER.d / 2 + 0.05), beat: 4 },
    clerk: { hit: hits.clerk, anchor: () => clerk.chest(), beat: 5 },
  };
  const labelAt = {
    assistant: () => wp(cluster, 0, CUBE * 1.4, 0),
    // the top step's upper left corner
    ranking: () => W(SX[0] - POD.slot / 2 + 0.1, TOP[0], POD.z + POD.d / 2),
    // the top moment's upper left corner
    moments: () => wp(moms[0].grp, -MOM.w * 0.42, MOM.h * 0.5, -MOM.d / 2),
    belt: () => g.localToWorld(B0.clone().lerp(B1, 0.55).setY(BELT.y + 0.05)),
    // the terminal's screen: the button he does not press
    counter: () => wp(termScreen, 0, 0.03, 0),
    // the elbow of the arm that hangs (away from the raised slip): the name sits beside him, under the slip's words
    clerk: () => wp(clerk.joints.elbowL, 0.05 * HC, 0, 0),
  };
  const tagAt = (i, cut) => () => (S.tags[i] && S.cut[i] === cut ? wp(boxes[i].tag, 0, -0.31, 0.04) : null);
  // the words of a moment: on its ledge's front
  const momAt = (i) => () => (S.mom[i] ? wp(moms[i].ledge, 0, 0, MOM.d / 2 + 0.03) : null);
  const decalAt = {
    ask: () => (S.ask ? wp(ask.group, 0, 0, 0.2) : null),
    'tag-tri': tagAt(0, false),
    'tag-square': tagAt(1, false),
    'cut-square': tagAt(1, true),
    'tag-diamond': tagAt(2, false),
    'tag-circle': tagAt(3, false),
    'cut-circle': tagAt(3, true),
    'moment-1': momAt(0),
    'moment-2': momAt(1),
    'moment-3': momAt(2),
    doubt: () => (S.doubt ? wp(doubt.grp, 0, 0.05, 0.2) : null),
    promo: () => (S.promo ? wp(promo, 0, 0, 0.06) : null),
    slip: () => (S.slip ? wp(slip.group, 0, 0.06, 0) : null),
  };
  // the words' own height (world units): small enough that the four prices and the three moments never meet
  const decalUnit = { 'tag-tri': 0.58, 'tag-square': 0.58, 'cut-square': 0.58, 'tag-diamond': 0.58, 'tag-circle': 0.58, 'cut-circle': 0.58, 'moment-1': 0.5, 'moment-2': 0.5, 'moment-3': 0.5 };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const L3 = (x, y, z) => W(x, y, z);
  const around = (x, z, top, r = 0.7) => [W(x - r, 0, z), W(x + r, 0, z), W(x - r, top, z), W(x + r, top, z)];
  // the ranking: its ends (the tags under the steps, the boxes and their hops over them)
  const RANK_PTS = [
    L3(SX[0] - POD.slot / 2, POD_BOT - 0.8, POD.z + POD.d / 2 + 0.2), L3(SX[3] + POD.slot / 2, POD_BOT - 0.8, POD.z + POD.d / 2 + 0.2),
    L3(SX[0] - POD.slot / 2, TOP[0] + BOX + 0.6, POD.z), L3(SX[3] + POD.slot / 2, TOP[3] + BOX + 0.6, POD.z),
  ];
  // shot 0 (beats 1–2): the asker, the ranking over him, the assistant on top and the ask beside it; the other man on
  // his bench in front (whole, never cut by the frame's edge: he is the one the next beats follow)
  const S0_PTS = [
    ...around(ASKER.x, ASKER.z, HA + 0.6, 0.8), W(ASKER.x, 0, ASKER.z + 1.0),
    ...RANK_PTS,
    ...around(BENCH.x, BENCH.z + 0.3, H * 0.8, 1.2), W(BENCH.x, 0, BENCH.z + 1.1),
    L3(CL_HOME.x, CL_HOME.y + CUBE * 1.6, CL_HOME.z), L3(ASK_AT.x - 2.1, ASK_AT.y + 0.9, ASK_AT.z), L3(ASK_AT.x + 2.1, ASK_AT.y + 0.9, ASK_AT.z),
  ];
  // shot 3 (beat 4): seen from the right, so the ranking climbs away to the left (its top step far, its last step near)
  // and fits beside him: the hero standing in front with his bubble over him, pointing at the last step; the assistant
  // coming down for his box and carrying it out to its belt, whose start stays well inside the frame
  const S3_PTS = [
    L3(SX[0] - POD.slot / 2, POD_BOT - 0.8, POD.z + POD.d / 2 + 0.2), L3(SX[0] - POD.slot / 2, TOP[0] + BOX + 0.3, POD.z - POD.d / 2),
    L3(SX[0], TOP[0] + BOX + 0.5, POD.z), L3(SX[3] + POD.slot / 2, POD_BOT - 0.8, POD.z + POD.d / 2 + 0.2),
    L3(CL_HOME.x - 1.7, CL_HOME.y + 1.4, CL_HOME.z), L3(CL_HOME.x + 1.7, CL_HOME.y + 1.4, CL_HOME.z),
    ...around(STAND.x, STAND.z, H + 0.3, 0.8), W(STAND.x, 0, STAND.z + 1.2),
    L3(STAND.x - 1.4, H + 3.2, STAND.z + 0.3), L3(STAND.x + 1.8, H + 3.2, STAND.z + 0.3),
    L3(lifted.x, overBox.y + 1.15, lifted.z), L3(overBelt.x, overBelt.y + 1.15, overBelt.z),
    L3(B0.x + 0.6, BELT.y, B0.z), L3(B0.x, 0, B0.z + 0.5),
  ];
  // shot 1 (beat 3): close on the bench and the man on it, his bubble right over him, his three moments beside him
  const S1_PTS = [
    ...around(BENCH.x, BENCH.z + 0.4, 0.2, 1.3), W(BENCH.x, 0, BENCH.z + 1.3),
    ...MOM_AT.flatMap((p) => [L3(p.x - MOM.w / 2 - 0.1, p.y - MOM.h / 2 - 0.05, p.z + MOM.d / 2), L3(p.x + MOM.w / 2 + 0.1, p.y + MOM.h / 2 + 0.05, p.z - MOM.d / 2)]),
    L3(BENCH.x - 1.45, 6.9, BENCH.z + 0.3), L3(BENCH.x + 1.45, 6.9, BENCH.z + 0.3),   // the bubble over him, seated
  ];
  // shot 2 (beats 5–6): the man at the counter's end with his doubt over him, the counter and the discount over it, the
  // clerk with the slip held up, the belt coming in from behind, and the way out toward the reader (the box at his side)
  const S2_PTS = [
    ...around(PAY.x, PAY.z, H + 0.2), W(PAY.x, 0, PAY.z + 1.3),
    L3(PAY.x - 2.2, H + 3.5, PAY.z + 0.4), L3(PAY.x + 1.6, H + 3.5, PAY.z + 0.4),   // the doubt bubble
    L3(CLERK.x + 0.55, HC + 0.2, CLERK.z), L3(CLERK.x - 2.4, HC + 1.7, CLERK.z),      // the clerk and the slip held up
    L3(PROMO_AT.x + 1.3, PROMO_AT.y + 0.6, PROMO_AT.z),
    L3(COUNTER.x + COUNTER.w / 2 - 0.3, 0, COUNTER.z + COUNTER.d / 2), L3(B0.x, BELT.y, lerp(B0.z, B1.z, 0.3)),
    ...around(S_OUT.x, S_OUT.z, H + 0.1, 0.9), W(S_OUT.x - 1.9, 0, S_OUT.z), W(S_OUT.x, 0, S_OUT.z + 1.0),
  ];
  const shot = (az, el, pts, margin) => ({ az: STAGE_AZ + az, el, anchors: () => pts, margin });
  // desktop shot 0: only the asker, the ranking, the assistant and the question, so the event fills the wide frame (the
  // other man on his bench is out of it until his own beat)
  const D0_PTS = [
    ...around(ASKER.x, ASKER.z, HA + 0.6, 0.8), W(ASKER.x, 0, ASKER.z + 0.8),
    ...RANK_PTS,
    L3(CL_HOME.x, CL_HOME.y + CUBE * 1.6, CL_HOME.z), L3(ASK_AT.x - 2.1, ASK_AT.y + 0.9, ASK_AT.z), L3(ASK_AT.x + 2.1, ASK_AT.y + 0.9, ASK_AT.z),
  ];
  const shots = {
    phone: [shot(0, 0.42, S0_PTS), shot(0.05, 0.4, S1_PTS, 0.05), shot(-0.3, 0.55, S2_PTS), shot(-0.55, 0.42, S3_PTS)],
    desk: [shot(0, 0.3, D0_PTS), shot(0.05, 0.42, S1_PTS), shot(-0.3, 0.55, S2_PTS), shot(-0.55, 0.45, S3_PTS)],
  };

  const rest = () => pose(LAST, 1);
  function ambient() { /* no material motion: the held result stays still */ }

  const api = {
    id: 'market',
    group: g,
    zone: 'consumer',
    anchor: W(-1.5, 11.5, 0),
    pin: W(-1.5, 0.3, 0),
    // accents of this district are drawn at full strength in focus (they ignore the attention radius)
    focus: { pos: W(-1.5, 4, 0), r: 17 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalUnit,
    lever: null,
    mainActor: 'shopper',
    restParts: ['shopper', 'clerk'],
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { person: person.group, asker: asker.group, clerk: clerk.group, boxes: boxes.map((b) => b.grp), cluster, podium, moments: moms.map((m) => m.grp), mes: moms.map((m) => m.me.group), want: want.grp, doubt: doubt.grp, ask: ask.group, counter, belt, slip: slip.group, promo, S },
  };
  rest();
  emphasize(null);
  return api;
}
