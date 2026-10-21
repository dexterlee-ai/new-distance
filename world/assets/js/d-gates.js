// AI 能替人做到哪 · how far an AI Agent may go on its own (articles 22, 18, 15) — a bridge across the AI sea, from the
// brand shore to a customer on the heartland landing, behind a small table at the deck's end.  Four plain gates stand
// on the landing end of the span, numbered on the lintel with the permission layers 觀察／理解 · 推薦 · 決策 · 行動
// (22 b39–b42); gate 3 (決策) has a boom arm over each lane, like a car-park barrier.  The words live in world.json.
//
// Told in four beats, picture first (the caption lands once the key event has happened):
//   1  identical AI Agents (teal typed drones: the same machine) come down out of the sky onto the deck and race through
//      the gates, lighting them one after another; card after card drops onto the customer's table.  One of them
//      carries coins: the boom over its lane comes down as it passes gate 1 and it slams into it at 決策 (a burst of
//      strokes, the coins swinging) and stays there; the other lane keeps flowing (22 b2: the difference is how many
//      steps it may take without a person).
//   2  查詢訂單 runs the free lane end to end; its card lands standing on the table, 已出貨, while the customer keeps
//      reading the phone (22 b54, 18 b27).
//   3  close, from the land side: a capsule (醫療建議) comes down the free lane and that lane's boom drops in front of
//      it too; the coins nose their boom twice; a typed 確認付款？ hops from them to the customer (22 b54, b47).
//   4  the customer holds the phone up to it and taps: a lime ✓ flies onto the coin card; only then the boom lifts,
//      the agent goes through 4 行動 and lays card and coins on the table; its boom comes down again.  The customer
//      picks up the next errands from the table (預約門市 on top) and hands them up to the agent, which sets off with
//      them over the bridge (18 b27, 15 b92: the confirmation is what lets people hand things over).
// Held: the coins with their ✓ on the table among the finished errands, the capsule still waiting at its boom, the
// agent carrying the new errands back over the gates.
//
// Nobody walks the deck: no person is ever stopped by an agents' gate.  Everything that explains is a pure function
// of (beat, k): pose().  The group sits at the world origin, so its local frame is the world frame.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp } from './kit.js';
import { heightAt, SEA_Y } from './terrain.js';
import { makePerson } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), XAX = new V3(1, 0, 0), ZAX = new V3(0, 0, 1);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const ei = (x) => { const t = clamp(x); return t * t; };

// ------------------------------------------------------------------ the set (world units)
const GH = 7.6;            // gate height: the waiting agents show whole under gate 4's lintel
const GW = 3.25;           // half the distance between a gate's posts (post centres)
const POST = 0.55;
const DECK_W = 7.3;        // the deck carries two lanes
const DECK = 0.225;        // deck top above the bridge curve
const U_GATE = [0.76, 0.825, 0.89, 0.955];
const ALT = 3.9;           // an agent's cubes fly this high over the deck; its card hangs below
const AGS = 0.95;          // the stream's scale (the named ones, the subjects, are a little larger)
const AGN = 1.2;           // the named ones' (查詢訂單, the coins, the capsule)
const ALT_P = 3.8;         // the coins agent's height over the deck: its coins hang clear of it
const ALT_M = 3.8;         // the capsule's
const BAR_Y = 3.3;         // the booms at gate 3: across the top of a waiting agent's card, on the landing side of the posts
const BAR_X = 0.72;
const LANE = 1.65;         // the two lanes (± across the deck: + is screen right seen from the landing)
const FREE = LANE;         // the lane that keeps flowing
const WAIT = -LANE;        // the lane whose boom comes down: the near side for the cameras, which stand on the land side
const CARD_N = { w: 3.0, d: 1.35 };    // a named task card: wide enough for its name
const CARD_F = { w: 1.6, d: 1.0 };     // an errand in the stream
const H = 5.0;             // the customer
const U0 = 0.6;            // where the agents come down out of the sky onto the deck, just short of gate 1
const V = 22;              // their speed along the deck (units per second)
const VN = 15;             // the named errand's (查詢訂單)

// ------------------------------------------------------------------ the beats
// (caption at keyAt; the strip holds it 0.8 s + 0.2 s per 字, see story.js; dur covers the motion)
const BEATS = [
  // 1 模型誰都買得到；Agent 的差別，在它被允許不經人手走幾步 — the burst: card after card lands on the table; the boom
  //   comes down in front of the coins and they slam into it; the free lane keeps flowing
  { dur: 7.8, keyAt: 0.95, shot: 0, parts: ['agents', 'gate-3', 'pay', 'gate-1', 'gate-2', 'gate-4', 'pile', 'customer'] },
  // 2 錯了容易撤回的事，像查訂單，就放手讓它一路做完 — 查詢訂單 all the way; 已出貨 on the table; the customer hands off
  { dur: 7.1, keyAt: 1.65, shot: 0, parts: ['order', 'pile', 'agents', 'customer', 'gate-1', 'gate-2', 'gate-3', 'gate-4'] },
  // 3 但動到錢、健康這類收不回的事，走到決策這一關就得停下等人 — close: the capsule stopped by the other boom; the
  //   coins nose theirs; 確認付款？ hops to the customer
  { dur: 7.8, keyAt: 0.95, shot: 1, parts: ['med', 'pay', 'gate-3', 'customer'] },
  // 4 顧客按下確認，它才繼續；正是這一步，讓人敢把事交給它 — the tap, the ✓, the boom lifts, the coins delivered; the new
  //   errands handed over
  { dur: 7.4, keyAt: 1.25, shot: 1, parts: ['customer', 'pay', 'gate-3', 'todo', 'gate-4'] },
];
const LAST = BEATS.length - 1;
// where each beat starts on the stream's clock
const OFF = BEATS.reduce((a, b, i) => (a.push(i ? a[i - 1] + BEATS[i - 1].dur : 0), a), []);
const REST = ['customer', 'pay', 'med', 'gate-3', 'pile', 'order', 'todo'];

// the stream: [beat, start (beat-local s), lane].  Its clock runs on across the beats (every beat's motion is at least
// as long as its caption's hold, so the end of one beat is the start of the next): an errand still under way at a
// beat's end goes on in the next one.  The first one comes down side by side with the coins (the same machine, a race);
// the free lane keeps flowing, also while the captions are read (the one stopped at the boom stays put)
const FLOOD = [
  [0, 0.0, FREE], [0, 0.1, FREE], [0, 0.2, FREE], [0, 0.32, FREE], [0, 0.44, FREE], [0, 0.58, FREE], [0, 0.74, FREE], [0, 0.92, FREE],
  [0, 2.9, FREE], [0, 4.5, FREE], [0, 6.2, FREE], [0, 7.5, FREE],
  [1, 3.0, FREE], [1, 5.0, FREE], [1, 6.75, FREE],
];
const NF = FLOOD.length;
// beat 1: the boom over the waiting lane comes down as the coins come through gate 1; they slam into it at gate 3
const T1 = { boom: [0.3, 0.42], pay: 0.0, settle: 0.5 };
// beat 3: the capsule comes down the free lane and its boom drops in front of it; the coins nose their boom twice;
// then the question hops to the customer
const T3 = { med: 0.05, boom: [0.34, 0.46], nudge: [[1.45, 1.75], [1.9, 2.2]], hop: [2.35, 2.85], look: [2.55, 3.05] };
// beat 4: the phone held up (0–0.35), the tap, the ✓ to the card, the boom up, the agent through 4 and down to the
// table, card and coins laid; its boom down again; the next errands picked up, handed up and carried off
const T4 = {
  raise: [0, 0.35], tap: [0.35, 0.47], check: 0.45, fly: [0.55, 0.95], fade: [0.8, 1.0], up: [0.95, 1.15], go: [1.15, 1.75],
  down: [1.75, 2.1], lay: [2.1, 2.35], boomDown: [2.35, 2.55],
  lower: [1.2, 1.6], reach: [2.3, 2.72], take: [2.72, 2.92], give: [2.8, 3.25], fetch: [2.45, 3.25], grab: 3.3, letGo: [3.4, 4.0], away: [3.35, 7.4],
};

// ------------------------------------------------------------------ shared drawing helpers
/** the twelve edges of a box (w × h × d, from y0 up, centred on x and z) as thin bars, offset by (ox, oz) */
function edgeBars(w, h, d, { y0 = 0, th = 0.07, grow = 0.01, ox = 0, oz = 0 } = {}) {
  const bars = [], x = w / 2 + grow, z = d / 2 + grow, y1 = y0 + h;
  const pt = (sx, y, sz) => new V3(ox + sx * x, y, oz + sz * z);
  const bar = (a, b) => {
    const dir = new V3().subVectors(b, a), len = dir.length();
    const geo = new THREE.BoxGeometry(th, len + th, th);
    geo.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, dir.normalize()), new V3(1, 1, 1)));
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    bars.push(geo.toNonIndexed());
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(pt(sx, y0, sz), pt(sx, y1, sz));
  for (const y of [y0, y1]) {
    for (const sz of [-1, 1]) bar(pt(-1, y, sz), pt(1, y, sz));
    for (const sx of [-1, 1]) bar(pt(sx, y, -1), pt(sx, y, 1));
  }
  return mergeGeometries(bars);
}
/** typed faces told apart by tone (a typed surface has no outline): the top light, the sides a step or two darker */
function faceTones(geo, { top = 1.15, px = 0.55, nx = 0.55, pz = 0.85, nz = 0.85, bottom = 0.5 } = {}) {
  const n = geo.attributes.normal, c = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
    const t = y > 0.6 ? top : y < -0.6 ? bottom : Math.abs(x) > Math.abs(z) ? (x > 0 ? px : nx) : (z > 0 ? pz : nz);
    c[i * 3] = t; c[i * 3 + 1] = -1; c[i * 3 + 2] = -1;   // shade multiplier; keep the material's style and accent
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
const clean = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };

/**
 * agentGeo() — the one look of an AI that acts (districts spec §0.2): a typed cube with four smaller cubes round it,
 * like a small drone, faces in three tones and graphite edges.  Its centre is at the origin; its front is +z.
 * → { body (vertex-coloured: give its ink() material vertexColors), edges, r (half its height), w (its width) }
 */
export function agentGeo({ c0 = 0.95, c1 = 0.62, off = 0.74, drop = 0.12 } = {}) {
  const cubes = [[c0, 0, 0, 0], ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [c1, sx * off, -drop, sz * off])];
  const body = mergeGeometries(cubes.map(([s, x, y, z]) => faceTones(new THREE.BoxGeometry(s, s, s).toNonIndexed().translate(x, y, z))));
  for (const k of Object.keys(body.attributes)) if (!['position', 'normal', 'color'].includes(k)) body.deleteAttribute(k);
  const edges = mergeGeometries(cubes.map(([s, x, y, z]) => edgeBars(s, s, s, { y0: y - s / 2, th: 0.065, ox: x, oz: z })));
  return { body, edges, r: c0 / 2, w: 2 * off + c1 };
}

/** the lime ✓: an extruded tick with a graphite rim behind it, standing in the xy plane facing +z, origin at its centre */
function makeCheck(size = 1.1) {
  const s = size;
  const sh = new THREE.Shape();
  const pts = [[-0.5, 0.02], [-0.3, 0.2], [-0.12, 0.0], [0.34, 0.5], [0.52, 0.32], [-0.12, -0.4]];
  sh.moveTo(pts[0][0] * s, pts[0][1] * s);
  for (const [x, y] of pts.slice(1)) sh.lineTo(x * s, y * s);
  sh.closePath();
  const geo = clean(new THREE.ExtrudeGeometry(sh, { depth: 0.22 * s, bevelEnabled: false }));
  geo.translate(0, 0, -0.11 * s);
  const rimGeo = clean(new THREE.ExtrudeGeometry(sh, { depth: 0.1 * s, bevelEnabled: false }));
  rimGeo.scale(1.16, 1.16, 1).translate(0.01 * s, -0.01 * s, -0.17 * s);
  const material = ink({ shade: 1, bias: 0.35, accent: 'lime', focus: false });
  const g = new THREE.Group(); g.name = 'check';
  const m = new THREE.Mesh(geo, material);
  const rim = new THREE.Mesh(rimGeo, ink({ accent: 'ink' }));
  m.castShadow = true; rim.castShadow = false;
  g.add(m, rim);
  return { group: g, mesh: m, material };
}

/** a stack of coins (pencil: real money), standing on y = 0, upright */
function makeCoins({ r = 0.42, h = 0.14, gap = 0.05 } = {}) {
  const R = rng(5);
  const dark = [], rim = [];
  // three stacks of different heights, close together: a little pile of money
  const STACKS = [[-0.48, -0.1, 5], [0.42, -0.18, 3], [0.0, 0.38, 4]];
  const n = Math.max(...STACKS.map((x) => x[2]));
  for (const [sx, sz, m] of STACKS) for (let i = 0; i < m; i++) {
    const x = sx + (R() - 0.5) * 0.1, z = sz + (R() - 0.5) * 0.1, y = h / 2 + i * (h + gap);
    dark.push(clean(new THREE.CylinderGeometry(r * 0.96, r * 0.96, h, 24).translate(x, y, z)));
    // a pale milled edge round each coin, so the stacks read as coins and not as posts
    rim.push(clean(new THREE.CylinderGeometry(r, r, h * 0.42, 24, 1, true).translate(x, y, z)));
  }
  const m = new THREE.Mesh(mergeGeometries(dark), ink({ accent: 'ink' }));
  const e = new THREE.Mesh(mergeGeometries(rim), ink({ shade: 1, bias: 0.3, side: THREE.DoubleSide }));
  m.castShadow = true; e.castShadow = false;
  const g = new THREE.Group(); g.name = 'coins'; g.add(m, e);
  return { group: g, height: n * (h + gap), r };
}

/** a capsule (pencil: a medicine), lying along x, its centre at the origin: one half dark, one half light */
function makeCapsule({ r = 0.46, len = 1.35 } = {}) {
  const half = (dark) => {
    const cyl = new THREE.CylinderGeometry(r, r, len / 2, 24).rotateZ(Math.PI / 2).translate((dark ? -1 : 1) * len / 4, 0, 0);
    const cap = new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ((dark ? 1 : -1) * Math.PI / 2).translate((dark ? -1 : 1) * len / 2, 0, 0);
    const m = new THREE.Mesh(mergeGeometries([clean(cyl), clean(cap)]), dark ? ink({ shade: 0.42, bias: 0.02 }) : ink({ shade: 1, bias: 0.22 }));
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const g = new THREE.Group(); g.name = 'capsule';
  g.add(half(true), half(false));
  return { group: g, r, len };
}

/** a small stack of errand cards (the customer's next tasks), flat, origin at its bottom centre */
function makeStack({ w = 1.25, d = 0.85, n = 3 } = {}) {
  const g = new THREE.Group(); g.name = 'todo';
  const cards = [];
  for (let i = 0; i < n; i++) {
    const c = P.makeCard({ w, d, t: 0.045, lines: 2, seed: 31 + i * 7 });
    c.group.position.set((i - 1) * 0.05, i * 0.05, (i % 2 ? 1 : -1) * 0.04);
    c.group.rotation.y = (i - 1) * 0.06;
    g.add(c.group);
    cards.push(c);
  }
  return { group: g, cards, w, d, t: n * 0.05 };
}

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
// the body mirrored left ↔ right (x → −x): a left-handed reach from the right-handed stamp
const mq = (q) => new Q(q.x, -q.y, -q.z, q.w);
const mv = (v) => new V3(-v.x, v.y, v.z);
function mirrorPose(v) {
  const hm = (h) => ({ p: mv(h.p), pole: mv(h.pole), grip: mq(h.grip) });
  const fm = (f) => ({ p: mv(f.p), q: mq(f.q) });
  return {
    hips: { p: mv(v.hips.p), q: mq(v.hips.q) }, waist: mq(v.waist), neck: mq(v.neck), head: mq(v.head),
    hand: { L: hm(v.hand.R), R: hm(v.hand.L) }, foot: { L: fm(v.foot.R), R: fm(v.foot.L) },
  };
}

export function buildGates() {
  const g = new THREE.Group();
  g.name = 'gates';
  const R = rng(22);

  // ================================================================== the bridge (kept from the map: shore → landing)
  const A = polar(75, 64), B = polar(41, 92);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const p = A.clone().lerp(B, t);
    const side = new V3(-(B.z - A.z), 0, B.x - A.x).normalize().multiplyScalar(Math.sin(t * Math.PI) * 5);
    p.add(side);
    p.y = (1 - t) * A.y + t * B.y + Math.sin(t * Math.PI) * 3.2 + 0.4;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const LEN = curve.getLength();
  const NS = 400;
  const SP = [], STG = [], SR = [];
  for (let i = 0; i <= NS; i++) {
    const u = i / NS, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    SP.push(p); STG.push(tg);
    SR.push(new V3(tg.z, 0, -tg.x).normalize());   // across the deck: + is screen right seen from the landing
  }
  const sample = (arr, u, out) => {
    const x = clamp(u) * NS, i = Math.min(NS - 1, Math.floor(x)), f = x - i;
    return out.copy(arr[i]).lerp(arr[i + 1], f);
  };
  const _a = new V3(), _b = new V3();
  /** a point over the deck: u along the bridge (0 shore … 1 landing), lane across (+ right), alt above the deck top */
  const deckPt = (u, lane = 0, alt = 0, out = new V3()) => {
    sample(SP, u, out);
    out.addScaledVector(sample(SR, u, _a).normalize(), lane);
    out.y += DECK + alt;
    return out;
  };
  const flatTan = (u, out = new V3()) => sample(STG, u, out).setY(0).normalize();
  const dU = (d) => d / LEN;

  // ---- deck tiles: one pencil band, static
  const NT = 58;
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.45, DECK_W), ink({ shade: 1.0, bias: 0.06 }), NT);
  tiles.name = 'deck';
  tiles.castShadow = tiles.receiveShadow = true;
  {
    const m = new M4(), q = new Q();
    for (let i = 0; i < NT; i++) {
      const u = (i + 0.5) / NT;
      q.setFromUnitVectors(XAX, curve.getTangentAt(u));
      m.compose(curve.getPointAt(u), q, new V3(1, 1, 1));
      tiles.setMatrixAt(i, m);
    }
    tiles.instanceMatrix.needsUpdate = true;
    tiles.computeBoundingSphere();
  }
  g.add(tiles);
  const piers = new THREE.Group(); piers.name = 'piers';
  for (let i = 0; i < 4; i++) {
    const p = curve.getPointAt(0.05 + i * 0.09);
    const h = p.y - (SEA_Y - 2);
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, h, 8), ink({ shade: 0.85, bias: 0.04 }));
    pier.position.set(p.x, SEA_Y - 2 + h / 2, p.z);
    pier.castShadow = true;
    piers.add(pier);
  }
  g.add(piers);

  // ================================================================== four gates: plain pencil portals
  const gates = U_GATE.map((u, i) => {
    const G = new THREE.Group();
    G.name = `gate-${i + 1}`;
    G.position.copy(deckPt(u, 0, 0));
    // local x along the bridge (toward the landing), local +z across to the screen left seen from the landing
    G.quaternion.setFromUnitVectors(XAX, flatTan(u));
    const geo = mergeGeometries([
      new THREE.BoxGeometry(POST, GH, POST).translate(0, GH / 2, GW),
      new THREE.BoxGeometry(POST, GH, POST).translate(0, GH / 2, -GW),
      new THREE.BoxGeometry(0.66, 0.7, 2 * GW + 1.2).translate(0, GH + 0.35, 0),
      new THREE.BoxGeometry(0.95, 0.2, 0.95).translate(0, 0.1, GW),
      new THREE.BoxGeometry(0.95, 0.2, 0.95).translate(0, 0.1, -GW),
    ].map(clean));
    const m = new THREE.Mesh(geo, ink({ shade: 0.98, bias: 0.12 }));
    m.castShadow = m.receiveShadow = true;
    G.add(m);
    g.add(G);
    return { G, u, mesh: m };
  });
  // the booms at gate 3: one over each lane, hinged on its own post on the landing side of the portal, lying across
  // half the opening when down.  Solid graphite with two paper sleeves (no red: a pause, not a rejection)
  const BOOM_LEN = GW - 0.32;
  const makeBoom = (side) => {
    // side: the sign of the lane it closes (+ is screen right seen from the landing: its post is at local −z)
    const grp = new THREE.Group(); grp.name = side === Math.sign(WAIT) ? 'boom-wait' : 'boom-free';
    const arm = new THREE.Group();
    const dirZ = side > 0 ? 1 : -1;   // from the hinge toward the middle of the opening (local z)
    const core = new THREE.Mesh(clean(new THREE.BoxGeometry(0.44, 0.44, BOOM_LEN)).translate(0, 0, dirZ * (BOOM_LEN / 2 + 0.05)), ink({ accent: 'ink' }));
    const sleeves = new THREE.Mesh(mergeGeometries([0.32, 0.68].map((f) => clean(new THREE.BoxGeometry(0.52, 0.52, BOOM_LEN * 0.17)).translate(0, 0, dirZ * (0.05 + BOOM_LEN * f)))), ink({ shade: 1, bias: 0.3 }));
    core.castShadow = sleeves.castShadow = true;
    arm.add(core, sleeves);
    const hub = new THREE.Mesh(clean(new THREE.CylinderGeometry(0.38, 0.38, BAR_X + 0.15, 16)).rotateZ(Math.PI / 2).translate(-(BAR_X + 0.15) / 2 + 0.25, 0, 0), ink({ shade: 0.45, bias: 0.05 }));
    hub.castShadow = true;
    grp.add(arm, hub);
    grp.position.set(BAR_X, BAR_Y, -side * GW);
    gates[2].G.add(grp);
    return { grp, arm, dirZ };
  };
  const boomW = makeBoom(Math.sign(WAIT)), boomF = makeBoom(Math.sign(FREE));
  const BOOM_UP = Math.PI * 0.5;
  /** a boom's angle: 0 lies across the lane, BOOM_UP stands up along its post */
  const setBoom = (b, up) => { b.arm.rotation.set(-b.dirZ * up, 0, 0); };

  // ================================================================== the landing: the customer and the table
  // a frame at the deck's end: f into the land (toward the camera of the phone shots), s across (screen right)
  const O = curve.getPointAt(1).clone();
  const F = flatTan(1).clone();
  const S = new V3(F.z, 0, -F.x);
  const land = (f, s, up = null) => { const p = O.clone().addScaledVector(F, f).addScaledVector(S, s); p.y = up === null ? heightAt(p.x, p.z) : up; return p; };
  const YAW_F = Math.atan2(F.x, F.z);          // a group turned by this faces +f (its +z along f)

  // the table where finished errands land: a counter across the landing between the deck's end and the customer,
  // so the agents set their cards down in front of the customer (portrait staging: customer, table, gates, crest
  // stack up the phone frame)
  const TBL = { f: 0.95, s: 0, w: 4.6, d: 1.8, h: 1.25 };
  const table = P.makeTable({ w: TBL.d, d: TBL.w, h: TBL.h });   // makeTable: w along its x, d along its z
  const tPos = land(TBL.f, TBL.s);
  table.group.position.copy(tPos);
  table.group.rotation.y = YAW_F + Math.PI / 2;                 // its long side across, facing the bridge
  // a darker top, so the white errand cards on it read as cards
  table.material.userData.u.uShadeMul.value = 0.62;
  g.add(table.group);
  const TOP = tPos.y + TBL.h;
  /** a point on the table top: (f, s) relative to its centre in the landing frame */
  const onTable = (f, s, up = 0) => { const p = tPos.clone().addScaledVector(F, f).addScaledVector(S, s); p.y = TOP + up; return p; };

  // the customer (the one who confirms), behind the table, facing up the bridge, a little right of its middle
  const CUST = land(3.1, 0.75);
  const CUST_YAW = YAW_F + Math.PI;
  const person = makePerson({ height: H });
  person.material.userData.u.uShadeBias.value = 0.3;
  const phone = P.makePhone({ h: 0.8 });
  person.hold('R', phone, { rot: [-0.55, Math.PI, 0] });
  person.group.position.copy(CUST);
  person.group.rotation.y = CUST_YAW;
  g.add(person.group);

  // ================================================================== the agents
  const AG = agentGeo();
  const AR = AG.r * AGS, AW = AG.w * AGS;
  const ARN = AG.r * AGN, AWN = AG.w * AGN;
  const cardLocal = (c, r = AR) => new M4().compose(new V3(0, -r - 0.08 - c.d / 2, 0.15), new Q().setFromAxisAngle(XAX, Math.PI / 2), new V3(1, 1, 1));
  const SC = new V3(AGN, AGN, AGN);
  /** a named agent: its cubes and edges (scaled), and its task card hanging below, facing its front (+z) */
  function makeNamed(name, seed) {
    const grp = new THREE.Group(); grp.name = name;
    const bodyMat = ink({ style: 1, shade: 0.62, accent: 'teal' });
    bodyMat.vertexColors = true;
    const drone = new THREE.Group(); drone.name = name + '-drone';
    const body = new THREE.Mesh(AG.body, bodyMat);
    const edges = new THREE.Mesh(AG.edges, ink({ accent: 'ink' }));
    body.castShadow = true; edges.castShadow = false;
    drone.add(body, edges);
    drone.scale.copy(SC);
    grp.add(drone);
    g.add(grp);
    // the card lives on its own (matrixAutoUpdate off): carried under the agent, then laid down where its task ends
    const card = P.makeCard({ w: CARD_N.w, d: CARD_N.d, t: 0.06, lines: 2, seed });
    card.material.userData.u.uShadeBias.value = -0.02;
    card.material.userData.u.uShadeMul.value = 0.82;
    card.group.name = name + '-card';
    card.group.matrixAutoUpdate = false;
    g.add(card.group);
    return { grp, drone, body, bodyMat, edges, card, cm: cardLocal(CARD_N, ARN) };
  }
  const order = makeNamed('order', 3);
  const pay = makeNamed('pay', 11);
  const med = makeNamed('med', 17);
  // what is at stake: the coins under the 金融交易 card, the capsule under the 醫療建議 card
  const coins = makeCoins();
  coins.group.matrixAutoUpdate = false;
  g.add(coins.group);
  const capsule = makeCapsule();
  capsule.group.matrixAutoUpdate = false;
  g.add(capsule.group);
  // where they hang under the card (agent frame): the coins' foot, the capsule's centre
  const CARD_BOT = -ARN - 0.08 - CARD_N.d;
  const COIN_L = new V3(0, CARD_BOT - 0.12 - coins.height, 0.15);
  const CAPS_L = new V3(0, CARD_BOT - 0.12 - capsule.r, 0.15);

  // the stream: one InstancedMesh for the cubes, one for the edges, one for the cards
  const floodMat = ink({ style: 1, shade: 0.62, accent: 'teal' });
  floodMat.vertexColors = true;
  const floodBody = new THREE.InstancedMesh(AG.body, floodMat, NF);
  const floodEdges = new THREE.InstancedMesh(AG.edges, ink({ accent: 'ink' }), NF);
  floodBody.name = 'flood'; floodEdges.name = 'flood-edges';
  for (const m of [floodBody, floodEdges]) { m.frustumCulled = false; m.castShadow = m === floodBody; }
  const floodCards = P.makeCardInstanced(NF, { w: CARD_F.w, d: CARD_F.d, t: 0.05, lines: 2, seed: 22 });
  floodCards.castShadow = true;
  g.add(floodBody, floodEdges, floodCards);
  const CARD_FL = cardLocal(CARD_F);

  // the pile on the table: a loose heap over the back two thirds, rising in layers as cards arrive
  const pile = [];
  for (let i = 0; i < NF; i++) {
    const col = i % 3, row = Math.floor(i / 3) % 2, layer = Math.floor(i / 6);
    const f = -0.35 + row * 0.6 + (R() - 0.5) * 0.25, s = 0.2 + col * 0.8 + (R() - 0.5) * 0.3;
    pile.push({ p: onTable(f, s, 0.004 + layer * 0.06 + (i % 3) * 0.012), yaw: YAW_F + (R() - 0.5) * 1.1 });
  }
  const pileM = pile.map((c) => new M4().compose(c.p, new Q().setFromAxisAngle(YAX, c.yaw), new V3(1, 1, 1)));

  // the waiting lane: the coins stop right behind the boom, the capsule a body length behind them
  const FRONT = AWN / 2 + 0.06;
  const U_STOP = U_GATE[2] + dU(BAR_X - 0.27 - FRONT);
  const BACK = 0.26;
  /** up to the boom at speed and a knock against it: dt since the hit → how far it has come back (units) */
  const knockBack = (dt) => { if (dt <= 0) return 0; const q = clamp(dt / 0.5); return BACK * sm(q) + 0.8 * Math.sin(Math.PI * Math.min(1, q * 1.7)) * (1 - q); };
  const tHit = T1.pay + (U_STOP - U0) * LEN / V;
  const tHitM = T3.med + (U_STOP - U0) * LEN / V;    // the capsule against the free lane's boom (beat 3)
  const tArrive = (1 - U0) * LEN / V;                // a stream agent from the crest to the deck's end

  // the table's places for the named ones: 查詢訂單 standing on the near edge (facing the phone shots' camera), the
  // coin card laid flat at the end by the customer
  const ORDER_STAND = onTable(TBL.d / 2 - 0.3, 1.75, CARD_N.d / 2 + 0.02);
  const ORDER_M = new M4().compose(ORDER_STAND, new Q().setFromAxisAngle(YAX, YAW_F + 0.1).multiply(new Q().setFromAxisAngle(XAX, Math.PI / 2 - 0.16)), new V3(1, 1, 1));
  const PAY_LAY = onTable(0.05, -1.0, 0.07);
  const PAY_YAW = YAW_F + 0.1;                       // its rows read from the customer's side (and the camera's)
  const PAY_M = new M4().compose(PAY_LAY, new Q().setFromAxisAngle(YAX, PAY_YAW), new V3(1, 1, 1));
  const COINS_LAY = onTable(-0.2, -1.95, 0.01);

  // the question that hops to the customer (typed, small) and the ✓
  const mini = P.makeCard({ w: 1.5, d: 0.9, t: 0.05, lines: 2, seed: 5 });
  mini.group.name = 'confirm';
  const miniG = new THREE.Group(); miniG.name = 'confirm-card';
  mini.group.rotation.x = Math.PI / 2;
  miniG.add(mini.group);
  g.add(miniG);
  const check = makeCheck(1.15);
  g.add(check.group);
  // the knock against the boom: a burst of short ink strokes round the point of contact (in the gate's plane)
  const NBURST = 9;
  const burst = new THREE.InstancedMesh(clean(new THREE.BoxGeometry(0.11, 0.11, 1)).translate(0, 0, 0.5), ink({ accent: 'ink' }), NBURST);
  burst.name = 'knock'; burst.castShadow = false; burst.frustumCulled = false;
  g.add(burst);

  // the customer's next errands: a small stack on the table by their left hand, picked up and handed over at the end
  const todo = makeStack();
  todo.group.matrixAutoUpdate = false;
  g.add(todo.group);
  const TODO_LAY = onTable(0.42, 0.3, 0.005);
  const TODO_M = new M4().compose(TODO_LAY, new Q().setFromAxisAngle(YAX, YAW_F + 0.08), new V3(1, 1, 1));
  todo.group.matrix.copy(TODO_M);

  // ================================================================== hit proxies
  const HID = new THREE.MeshBasicMaterial({ visible: false });
  /** a world-aligned box proxy moved by pose() (a child of the group at the world origin) */
  const boxProxy = (name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), HID);
    m.name = 'hit:' + name; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.userData.set = (c, sx, sy, sz) => { m.position.copy(c); m.scale.set(sx, sy, sz); m.updateMatrixWorld(true); };
    g.add(m);
    return m;
  };
  const hits = {
    customer: P.makeHitProxy(person.group, 0.35),
    order: P.makeHitProxy(order.card.group, 0.45),
    pay: boxProxy('pay'),
    med: boxProxy('med'),
    todo: P.makeHitProxy(todo.group, 0.45),
    pile: (() => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(TBL.d + 0.6, TBL.h + 1.3, TBL.w + 0.6), HID);
      m.name = 'hit:pile'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
      m.position.set(0, (TBL.h + 1.3) / 2, 0);
      table.group.add(m);
      return m;
    })(),
  };
  gates.forEach((G, i) => { hits[`gate-${i + 1}`] = P.makeHitProxy(G.G, 0.25); });
  // the stream's proxy: one padded box round each agent that is on screen, rewritten as they move
  hits.agents = (() => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const base = one.attributes.position.array;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(base.length * NF), 3));
    const m = new THREE.Mesh(geo, HID);
    m.name = 'hit:agents'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.frustumCulled = false;
    const HW = AW / 2 + 0.35, HH = (AR + CARD_F.d + 0.5) / 2 + 0.3;
    m.userData.place = (centres) => {
      const a = geo.attributes.position.array;
      const first = centres[0] || new V3();
      for (let j = 0; j < NF; j++) {
        const c = centres[j] || first;
        const k = centres[j] ? 1 : 0;
        for (let i = 0; i < base.length; i += 3) {
          a[j * base.length + i] = c.x + base[i] * 2 * HW * k;
          a[j * base.length + i + 1] = c.y + base[i + 1] * 2 * HH * k;
          a[j * base.length + i + 2] = c.z + base[i + 2] * 2 * HW * k;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere(); geo.computeBoundingBox();
    };
    g.add(m);
    return m;
  })();
  const pickable = (mesh, on) => { if (on) mesh.layers.enable(0); else mesh.layers.disableAll(); };

  // every mesh's own shadow setting, so dimming can switch shadows off and emphasis can give them back
  g.traverse((o) => { if (o.isMesh) o.userData.cast0 = o.castShadow; });

  // ================================================================== the customer's poses (pure)
  const memo = new Map();
  const pz = (name, o) => { const key = name + JSON.stringify(o || {}); if (!memo.has(key)) memo.set(key, person.pose(name, o)); return memo.get(key); };
  /** holding the phone at the chest; the head turned by yaw (+ to the figure's left) and pitched (+ down) */
  const holdLook = (yaw, pitch) => {
    const v = clonePose(pz('hold'));
    v.waist.multiply(eul(0, yaw * 0.25, 0));
    v.neck.copy(eul(pitch * 0.4, yaw * 0.35, 0));
    v.head.copy(eul(pitch * 0.6, yaw * 0.45, 0));
    // the left hand down by the side (it holds the next errands)
    const st = pz('stand');
    v.hand.L = hc(st.hand.L);
    return v;
  };
  const POSE = {
    phone: holdLook(0, 0.35),             // reading the phone: hands off
    up: holdLook(0.05, -0.3),             // looking up the bridge at the stream
    table: holdLook(0.12, 0.42),          // down at the table in front
    note: holdLook(-0.15, -0.42),         // up at the question over the head
    // the phone held up high toward the question, as one shows it: the decisive act, readable from behind
    raised: clonePose(pz('raise', { side: 'R' })),
  };
  POSE.raised.hand.L = hc(pz('stand').hand.L);
  POSE.push = clonePose(POSE.raised);
  POSE.push.hand.R.p.add(new V3(0, 0.035, 0.035));
  // the next errands held up in the left hand, the phone at the chest in the right
  POSE.give = clonePose(pz('raise', { side: 'L' }));
  POSE.give.hand.R = hc(pz('hold').hand.R);
  POSE.give.head.copy(eul(-0.2, 0.1, 0));
  POSE.watch = holdLook(-0.05, -0.38);   // watching it go
  // the left hand down onto the stack's near edge on the table (a mirrored stamp), the phone kept at the chest
  {
    const edge = TODO_LAY.clone().addScaledVector(F, todo.d / 2);
    const rel = edge.clone().sub(CUST);
    const fwd = -rel.dot(F), left = -rel.dot(S);
    const v = mirrorPose(pz('stamp', { y: +(TODO_LAY.y + todo.t + 0.06 - CUST.y).toFixed(3), fwd: +fwd.toFixed(3), x: +(-left).toFixed(3), table: +(TOP - CUST.y).toFixed(3) }));
    v.hand.R = hc(POSE.table.hand.R);
    POSE.reach = v;
  }
  const blendV = (a, b, k) => person.blend(a, b, sm(k));
  // the question (確認付款？) sits above the customer's head, toward the bridge: one fixed place
  // to the right of the customer's head, where the phone goes up (clear of the bridge behind it on screen)
  const NOTE = land(2.7, 2.7, CUST.y + H + 0.45);
  const NOTE_Q = new Q().setFromAxisAngle(YAX, YAW_F + 0.18);
  const NOTE_FRONT = new V3(0, 0, 0.3).applyQuaternion(NOTE_Q).add(NOTE);

  // ================================================================== pose
  const ST = { beat: LAST, t: BEATS[LAST].dur, emph: null, lit: [1, 1, 1, 1], orderOn: true, orderLanded: true, note: true, mini: false, check: true, payAt: 'laid', medOn: true, todoUp: false, risky: [] };
  const _m = new M4(), _m2 = new M4(), _q = new Q(), _q2 = new Q(), _s = new V3(1, 1, 1), _p = new V3();
  const ZERO = new V3(1e-4, 1e-4, 1e-4), ONE = new V3(1, 1, 1);
  const faceTo = (dir, out = new Q()) => out.setFromUnitVectors(ZAX, _b.copy(dir).setY(0).normalize());
  /** an agent flying along the deck: { p (its cubes' centre), q (its front along the bridge) } */
  const onDeck = (u, lane, alt, out) => {
    deckPt(u, lane, alt, out.p);
    faceTo(flatTan(u, _a), out.q);
    return out;
  };
  /** a flight from a frame to a point: an arc, its front turning to `yaw` */
  const arcTo = (from, fromQ, to, yaw, k, out, lift = 0.9) => {
    const e = sm(k);
    out.p.copy(from).lerp(to, e);
    out.p.y += Math.sin(Math.PI * e) * lift;
    out.q.copy(fromQ).slerp(_q2.setFromAxisAngle(YAX, yaw), e);
    return out;
  };
  /** in from over the crest: dt seconds after its start, at speed v: the frame on the deck (null when past the end) */
  const inbound = (dt, lane, alt, out, v = V, uEnd = 1) => {
    const u = U0 + (dt * v) / LEN;
    if (u >= uEnd) return null;
    onDeck(u, lane, alt, out);
    out.p.y += (1 - eo(clamp(dt / 0.45))) * 7.5;     // down out of the sky just short of gate 1
    return out;
  };
  /** a boom coming down: it falls (accelerating), hits its rest and kicks up once */
  const drop = (t, a, b) => { const k = seg(t, a, b); return k < 1 ? ei(k) : 1 - 0.12 * Math.sin(Math.PI * seg(t, b, b + 0.18)); };
  /** a boom shudders where it is knocked */
  const wob = (t, at) => (t > at ? 0.13 * Math.sin((t - at) * 34) * Math.exp(-(t - at) * 6) : 0);
  /** the waiting lane's boom (0 down … BOOM_UP up) at (beat, t) */
  function boomAngle(beat, t) {
    if (beat === 0) return BOOM_UP * (1 - drop(t, T1.boom[0], T1.boom[1])) + wob(t, tHit);
    if (beat === 1) return 0;
    if (beat === 2) return wob(t, (T3.nudge[0][0] + T3.nudge[0][1]) / 2) + wob(t, (T3.nudge[1][0] + T3.nudge[1][1]) / 2);
    return BOOM_UP * (ss(t, T4.up[0], T4.up[1]) - drop(t, T4.boomDown[0], T4.boomDown[1]));
  }

  const F0 = { p: new V3(), q: new Q() }, F1 = { p: new V3(), q: new Q() };
  const NA = { p: new V3(), q: new Q(), s: 1 };
  const placeNamed = (N, f) => {
    N.grp.visible = !!f;
    if (!f) return;
    N.grp.position.copy(f.p);
    N.grp.quaternion.copy(f.q);
    N.grp.scale.setScalar(f.s ?? 1);
    N.grp.updateMatrixWorld(true);
  };
  /** the card carried under a named agent (its matrix), or null */
  const carried = (N, out) => out.compose(N.grp.position, N.grp.quaternion, _s.setScalar(Math.max(1e-3, N.grp.scale.x))).multiply(N.cm);
  const _la = [new V3(), new Q(), new V3()], _lb = [new V3(), new Q(), new V3()];
  const lerpM = (a, b, k, out) => { a.decompose(..._la); b.decompose(..._lb); return out.compose(_la[0].lerp(_lb[0], k), _la[1].slerp(_lb[1], k), _la[2].lerp(_lb[2], k)); };
  /** something hanging under an agent at local point L, upright (yaw only) */
  const hangM = (N, L, out) => {
    const k = Math.max(1e-3, N.grp.scale.x);
    _p.copy(L).multiplyScalar(k).applyQuaternion(N.grp.quaternion).add(N.grp.position);
    const yaw = new THREE.Euler().setFromQuaternion(N.grp.quaternion, 'YXZ').y;
    return out.compose(_p, _q.setFromAxisAngle(YAX, yaw), _s.setScalar(k));
  };

  // ---- the named ones' frames (pure functions of (beat, t))
  const W_HOLD = U_STOP - dU(BACK);
  const bob = (t, ph = 0, a = 0.08) => a * Math.sin(t * 4.2 + ph);
  function payFrame(beat, t, out) {
    out.s = 1;
    if (beat === 0) {
      const dt = t - T1.pay;
      if (dt < 0) return null;
      const f = inbound(dt, WAIT, ALT_P, out, V, U_STOP);
      if (f) { f.s = Math.max(1e-3, eo(clamp(dt / 0.2))); return f; }
      onDeck(U_STOP - dU(knockBack(t - tHit)), WAIT, ALT_P, out);
      const after = t - tHit - 0.5;
      if (after > 0) out.p.y += bob(OFF[beat] + t) * clamp(after / 0.4);
      return out;
    }
    if (beat === 1) { onDeck(W_HOLD, WAIT, ALT_P, out); out.p.y += bob(OFF[beat] + t); return out; }
    if (beat === 2) {
      // two nudges against the boom: forward to touching, back
      let fw = 0;
      for (const [a, b] of T3.nudge) fw = Math.max(fw, Math.sin(Math.PI * seg(t, a, b)));
      onDeck(W_HOLD + dU(BACK * fw), WAIT, ALT_P, out);
      // still while it noses the boom, then waiting again
      out.p.y += bob(OFF[beat] + t) * (1 - ss(t, T3.nudge[0][0] - 0.3, T3.nudge[0][0]) + ss(t, T3.nudge[1][1] + 0.1, T3.nudge[1][1] + 0.5));
      return out;
    }
    // beat 4: held until the boom is up, through 4 行動, down to the table; then (empty) to the customer's raised
    // hand; the errands taken, off over the bridge with them
    if (t < T4.go[0]) { onDeck(W_HOLD, WAIT, ALT_P, out); out.p.y += bob(OFF[beat] + t) * (1 - ss(t, T4.up[0], T4.go[0])); return out; }
    if (t < T4.go[1]) { onDeck(lerp(W_HOLD, 1, ss(t, T4.go[0], T4.go[1])), WAIT, ALT_P, out); return out; }
    onDeck(1, WAIT, ALT_P, F0);
    const over = PAY_LAY.clone(); over.y = TOP - CARD_BOT + 0.12 + coins.height + 0.3;
    if (t < T4.lay[1]) return arcTo(F0.p, F0.q, over, PAY_YAW + Math.PI, seg(t, T4.go[1], T4.down[1]), out, 0.6);
    // up to the raised hand, where the stack is (it hangs under the agent from the grab on)
    const hand = HAND_UP;
    const atHand = hand.clone(); atHand.y += todo.d + ARN + 0.15;
    _q.setFromAxisAngle(YAX, PAY_YAW + Math.PI);
    if (t < T4.grab) return arcTo(over, _q.clone(), atHand, CUST_YAW + Math.PI, seg(t, T4.fetch[0], T4.fetch[1]), out, 0.8);
    // off over the bridge, rising, carrying the errands
    const k = seg(t, T4.away[0], T4.away[1]);
    const u = lerp(1.04, 0.9, sm(k));
    onDeck(u, WAIT * 0.4, ALT + 4.5, F1);
    F1.q.multiply(_q.setFromAxisAngle(YAX, Math.PI));   // facing the shore now
    _q2.setFromAxisAngle(YAX, CUST_YAW + Math.PI);
    out.p.copy(atHand).lerp(F1.p, ss(k, 0, 0.7));
    out.q.copy(_q2).slerp(F1.q, ss(k, 0, 0.35));
    return out;
  }
  function medFrame(beat, t, out) {
    out.s = 1;
    if (beat < 2) return null;
    if (beat === 2) {
      // beat 3: down the free lane at speed, into the boom that has just come down in front of it
      const dt = t - T3.med;
      if (dt < 0) return null;
      const f = inbound(dt, FREE, ALT_M, out, V, U_STOP);
      if (f) { f.s = Math.max(1e-3, eo(clamp(dt / 0.2))); return f; }
      onDeck(U_STOP - dU(knockBack(t - tHitM)), FREE, ALT_M, out);
      const after = t - tHitM - 0.5;
      if (after > 0) out.p.y += bob(OFF[beat] + t, 1.3) * clamp(after / 0.4);
      return out;
    }
    onDeck(W_HOLD, FREE, ALT_M, out);
    out.p.y += bob(OFF[beat] + t, 1.3);
    return out;
  }
  /** 查詢訂單: beat 2, the free lane end to end, its card set down standing on the table, the agent off */
  const tOrderEnd = (1 - U0) * LEN / VN;
  const ORD = { land: [tOrderEnd, tOrderEnd + 0.32], drop: 0.2, leave: 0.55 };
  function orderFrame(beat, t, out) {
    out.s = 1;
    if (beat !== 1) return null;
    const f = inbound(t, FREE, ALT, out, VN);
    if (f) { f.s = Math.max(1e-3, eo(clamp(t / 0.2))); return f; }
    onDeck(1, FREE, ALT, F0);
    const over = ORDER_STAND.clone(); over.y += CARD_N.d / 2 + ARN + 0.45;
    if (t < ORD.land[1] + ORD.drop) return arcTo(F0.p, F0.q, over, YAW_F, seg(t, ORD.land[0], ORD.land[1]), out);
    // its task done, it rises and is off back over the bridge
    const k = seg(t, ORD.land[1] + ORD.drop, ORD.land[1] + ORD.drop + ORD.leave);
    if (k >= 1) return null;
    out.p.copy(over).addScaledVector(F, -6 * ei(k)); out.p.y += 7 * ei(k);
    out.q.setFromAxisAngle(YAX, YAW_F);
    out.s = 1 - ss(k, 0.4, 1);
    return out;
  }

  // the customer's raised left hand (where the agent takes the errands): measured once on the pose
  const HAND_UP = (() => {
    person.apply(POSE.give);
    person.group.position.copy(CUST);
    person.group.rotation.set(0, CUST_YAW, 0);
    person.group.updateMatrixWorld(true);
    return person.hand('L').getWorldPosition(new V3());
  })();
  const HOLD_R = new M4().makeRotationX(Math.PI / 2);
  const HANDLE = new M4().makeTranslation(0, -todo.t / 2, -todo.d / 2);
  /** the stack in the left hand (upright, facing forward, held by its near edge) */
  const inHand = (out) => { const gr = person.hand('L'); gr.updateWorldMatrix(true, false); return out.copy(gr.matrixWorld).multiply(HOLD_R).multiply(HANDLE); };

  /** pure: every explanatory transform for (beat, k) */
  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const t = k * BEATS[beat].dur;

    // ---- the gates light far to near as the first agents go through them (beat 1)
    for (let i = 0; i < 4; i++) {
      const tp = FLOOD[0][1] + (U_GATE[i] - U0) * LEN / V;
      ST.lit[i] = beat > 0 ? 1 : ss(t, tp - 0.12, tp + 0.06);
    }

    // ---- the booms (and the burst where the coins knock against the waiting lane's one)
    setBoom(boomW, boomAngle(beat, t));
    {
      const hitsAt = beat === 0 ? [[tHit, 1, WAIT]] : beat === 2 ? [[tHitM, 1, FREE], ...T3.nudge.map(([a, b]) => [(a + b) / 2, 0.6, WAIT])] : [];
      let kb = -1, amp = 1, ln = WAIT;
      for (const [t1, a, l] of hitsAt) if (t >= t1 && t < t1 + 0.42) { kb = (t - t1) / 0.42; amp = a; ln = l; }
      const c = deckPt(U_STOP + dU(FRONT - 0.05), ln, BAR_Y + 0.25);
      const tg = flatTan(U_STOP, new V3()), up = new V3(0, 1, 0), acr = new V3().crossVectors(tg, up).normalize();
      for (let i = 0; i < NBURST; i++) {
        if (kb < 0) { burst.setMatrixAt(i, _m.compose(O, _q.identity(), ZERO)); continue; }
        const a = (i / NBURST) * Math.PI * 2 + 0.3;
        const dir = new V3().addScaledVector(up, Math.sin(a)).addScaledVector(acr, Math.cos(a)).normalize();
        const r0 = (0.7 + 1.5 * eo(kb)) * AGN, len = (1.1 * (1 - kb) + 0.1) * amp * AGN;
        _q.setFromUnitVectors(ZAX, dir);
        burst.setMatrixAt(i, _m.compose(c.clone().addScaledVector(dir, r0), _q, _s.set(1, 1, len)));
      }
      burst.instanceMatrix.needsUpdate = true;
    }
    setBoom(boomF, beat < 2 ? BOOM_UP : beat === 2 ? BOOM_UP * (1 - drop(t, T3.boom[0], T3.boom[1])) + wob(t, tHitM) : 0);

    // ---- the stream
    const centres = [];
    for (let i = 0; i < NF; i++) {
      const [b0, t0, lane] = FLOOD[i];
      let show = true, sc = 1, cardM = null;
      const fr = F1;
      const dt = OFF[beat] + t - (OFF[b0] + t0);
      if (dt < 0) show = false;
      else if (dt > tArrive + 1.0) { show = false; cardM = pileM[i]; }
      else {
        const alt = ALT + 0.75 + (i % 3 - 1) * 0.25;   // a little above the waiting ones: the stream passes over them
        const f = inbound(dt, lane, alt, fr);
        if (f) sc = eo(clamp(dt / 0.2));                // it grows in as it comes down out of the sky
        if (!f) {
          const d2 = dt - tArrive;
          onDeck(1, lane, alt, F0);
          const over = pile[i].p.clone(); over.y += 0.75 + CARD_F.d + AR;
          const tRel = 0.16;
          if (d2 < tRel) arcTo(F0.p, F0.q, over, pile[i].yaw, d2 / tRel, fr, 0.2);
          else {
            // let go over the table without stopping: the card drops onto the pile; the agent pulls up and turns back
            // over the bridge for the next errand
            fr.p.copy(over); fr.q.setFromAxisAngle(YAX, pile[i].yaw);
            _m.compose(fr.p, fr.q, ONE).multiply(CARD_FL);
            const d = seg(d2, tRel, tRel + 0.28);
            cardM = d >= 1 ? pileM[i] : lerpM(_m.clone(), pileM[i], ei(d), new M4());
            const lk = seg(d2, tRel, tRel + 0.55);
            fr.p.addScaledVector(F, -5 * ei(lk)); fr.p.y += 8 * sm(lk);
            fr.q.multiply(_q.setFromAxisAngle(YAX, Math.PI * sm(lk)));
            sc = 1 - ss(lk, 0.55, 1);
          }
        }
      }
      const on = show && sc > 1e-3;
      if (on) {
        _m.compose(fr.p, fr.q, _s.setScalar(sc * AGS));
        floodBody.setMatrixAt(i, _m); floodEdges.setMatrixAt(i, _m);
        centres.push(fr.p.clone().add(new V3(0, -(CARD_F.d + 0.2) / 2, 0)));
      } else {
        _m.compose(O, _q.identity(), ZERO);
        floodBody.setMatrixAt(i, _m); floodEdges.setMatrixAt(i, _m);
      }
      if (cardM) floodCards.setCard(i, cardM);
      else if (!show) floodCards.setCard(i, _m.compose(O, _q.identity(), ZERO));
      else floodCards.setCard(i, _m.compose(fr.p, fr.q, ONE).multiply(CARD_FL));
    }
    floodBody.instanceMatrix.needsUpdate = true;
    floodEdges.instanceMatrix.needsUpdate = true;
    hits.agents.userData.place(centres);
    pickable(hits.agents, centres.length > 0);

    // ---- 查詢訂單
    const fo = orderFrame(beat, t, NA);
    placeNamed(order, fo);
    {
      const C = order.card.group;
      let on = beat > 1 || (beat === 1 && (t >= ORD.land[1] + ORD.drop || !!fo));
      const landed = beat > 1 || (beat === 1 && t >= ORD.land[1]);
      if (beat < 1) on = false;
      if (on) {
        if (beat > 1 || t >= ORD.land[1] + ORD.drop) C.matrix.copy(ORDER_M);
        else if (t < ORD.land[1]) carried(order, C.matrix);
        else lerpM(carried(order, _m2), ORDER_M, ei(seg(t, ORD.land[1], ORD.land[1] + ORD.drop)), C.matrix);
      }
      C.visible = on;
      C.matrixWorldNeedsUpdate = true;
      C.updateMatrixWorld(true);
      ST.orderOn = on; ST.orderLanded = landed;
      pickable(hits.order, on);
    }

    // ---- the coins agent (金融交易) and its card, coins and ✓
    const fp = payFrame(beat, t, NA);
    placeNamed(pay, fp);
    const payLaid = beat === 3 && t >= T4.lay[1];
    {
      const C = pay.card.group;
      let on = !!fp || payLaid;
      if (beat === 3 && t >= T4.lay[0]) {
        on = true;
        if (t >= T4.lay[1]) C.matrix.copy(PAY_M);
        else {
          const k2 = seg(t, T4.lay[0], T4.lay[1]);
          lerpM(carried(pay, _m2), PAY_M, sm(k2), C.matrix);
        }
      } else if (fp) carried(pay, C.matrix);
      C.visible = on;
      C.matrixWorldNeedsUpdate = true;
      C.updateMatrixWorld(true);
      // the coins: hanging under the card, then set down on the table beside it
      const Cn = coins.group;
      if (beat === 3 && t >= T4.lay[0]) {
        const k2 = seg(t, T4.lay[0], T4.lay[1]);
        hangM(pay, COIN_L, _m2);
        lerpM(_m2, _m.compose(COINS_LAY, _q.setFromAxisAngle(YAX, PAY_YAW), ONE), sm(k2), Cn.matrix);
      } else if (fp) hangM(pay, COIN_L, Cn.matrix);
      // a swing as it knocks and noses the boom
      if (fp && beat <= 2) {
        const sw = beat === 0 ? Math.sin((t - tHit) * 13) * Math.exp(-Math.max(0, t - tHit) * 4) * (t > tHit ? 0.22 : 0)
          : beat === 2 ? 0.12 * (Math.sin(Math.PI * seg(t, T3.nudge[0][0], T3.nudge[0][1] + 0.3)) + Math.sin(Math.PI * seg(t, T3.nudge[1][0], T3.nudge[1][1] + 0.3))) : 0;
        if (sw) { _m.makeRotationAxis(_a.set(1, 0, 0).applyQuaternion(pay.grp.quaternion), sw); Cn.matrix.premultiply(_m2.makeTranslation(-pay.grp.position.x, -pay.grp.position.y, -pay.grp.position.z)).premultiply(_m).premultiply(_m2.makeTranslation(pay.grp.position.x, pay.grp.position.y, pay.grp.position.z)); }
      }
      Cn.visible = on;
      Cn.matrixWorldNeedsUpdate = true;
      ST.payAt = !fp && !payLaid ? null : payLaid ? 'laid' : beat === 0 && t < tHit ? 'fly' : beat === 3 && t >= T4.go[0] ? 'go' : 'halt';
      // the proxy: round the card and the coins
      if (on) {
        C.updateMatrixWorld(true);
        const c0 = new V3().setFromMatrixPosition(C.matrix), c1 = new V3().setFromMatrixPosition(Cn.matrix);
        const c = c0.clone().lerp(c1, 0.5);
        if (payLaid) hits.pay.userData.set(c.setY(TOP + 0.6), 3.2, 1.4, 3.2);
        else hits.pay.userData.set(c, CARD_N.w + 0.6, CARD_N.d + coins.height + 0.9, CARD_N.w + 0.6);
      }
      pickable(hits.pay, on);
    }

    // ---- the capsule agent (醫療建議)
    const fm = medFrame(beat, t, NA);
    placeNamed(med, fm);
    {
      const C = med.card.group;
      if (fm) carried(med, C.matrix);
      C.visible = !!fm;
      C.matrixWorldNeedsUpdate = true;
      const Cp = capsule.group;
      if (fm) hangM(med, CAPS_L, Cp.matrix);
      Cp.visible = !!fm;
      Cp.matrixWorldNeedsUpdate = true;
      ST.medOn = !!fm;
      if (fm) hits.med.userData.set(fm.p.clone().add(new V3(0, -(CARD_N.d + capsule.r * 2) / 2 - 0.2, 0)), AWN + 0.5, ARN * 2 + CARD_N.d + capsule.r * 2 + 0.9, AWN + 0.5);
      pickable(hits.med, !!fm);
    }

    // ---- the customer: looks up at the stream; reads the phone while the order lands (hands off); looks up at the
    // question; holds the phone up to it and taps; hands over the next errands; watches the agent go
    let v;
    if (beat === 0) v = t < 0.25 ? POSE.phone : t < 2.4 ? blendV(POSE.phone, POSE.up, seg(t, 0.25, 0.7)) : blendV(POSE.up, POSE.phone, seg(t, 5.6, 6.3));
    else if (beat === 1) v = t < ORD.land[1] + 0.3 ? POSE.phone : t < 3.4 ? blendV(POSE.phone, POSE.table, seg(t, ORD.land[1] + 0.3, ORD.land[1] + 0.8)) : blendV(POSE.table, POSE.phone, seg(t, 3.4, 3.9));
    else if (beat === 2) v = blendV(POSE.phone, POSE.note, seg(t, T3.look[0], T3.look[1]));
    else {
      if (t < T4.raise[1]) v = blendV(POSE.note, POSE.raised, seg(t, T4.raise[0], T4.raise[1]));
      else if (t < T4.tap[1]) v = blendV(POSE.raised, POSE.push, Math.sin(Math.PI * seg(t, T4.tap[0], T4.tap[1])));
      else if (t < T4.lower[0]) v = POSE.raised;
      else if (t < T4.reach[0]) v = blendV(POSE.raised, POSE.table, seg(t, T4.lower[0], T4.lower[1] + 0.4));
      else if (t < T4.take[1]) v = blendV(POSE.table, POSE.reach, seg(t, T4.reach[0], T4.reach[1]));
      else if (t < T4.letGo[0]) v = blendV(POSE.reach, POSE.give, seg(t, T4.give[0], T4.give[1]));
      else v = blendV(POSE.give, POSE.watch, seg(t, T4.letGo[0], T4.letGo[1]));
    }
    person.apply(v);
    person.group.position.copy(CUST);
    person.group.rotation.set(0, CUST_YAW, 0);
    person.group.updateMatrixWorld(true);

    // ---- the next errands: in the left hand, then under the agent that takes them
    {
      const Tg = todo.group;
      if (beat === 3 && t >= T4.grab) {
        _m2.copy(pay.grp.matrixWorld);
        Tg.matrix.compose(_p.setFromMatrixPosition(_m2).add(new V3(0, -ARN - 0.25 - todo.d / 2, 0)), _q.setFromRotationMatrix(_m2).multiply(_q2.setFromAxisAngle(YAX, Math.PI)).multiply(new Q().setFromAxisAngle(XAX, Math.PI / 2)), ONE);
        Tg.matrix.multiply(_m.makeTranslation(0, -todo.t / 2, 0));
      } else if (beat === 3 && t >= T4.reach[1]) {
        // taken off the table: from lying flat to upright in the hand
        const k2 = ss(t, T4.reach[1], T4.take[1]);
        if (k2 >= 1) inHand(Tg.matrix); else lerpM(TODO_M, inHand(_m2), k2, Tg.matrix);
      } else Tg.matrix.copy(TODO_M);
      Tg.matrixWorldNeedsUpdate = true;
      Tg.updateMatrixWorld(true);
      ST.todoUp = beat === 3 && t >= T4.give[0] + 0.3;
    }

    // ---- the question: from the halted coin card over gate 4 to above the customer's head (beat 3); the ✓ shows on
    // it at the tap and it folds away (beat 4)
    let miniOn = false;
    if (beat === 2 && t >= T3.hop[0]) {
      const h = seg(t, T3.hop[0], T3.hop[1]);
      const from = new V3().setFromMatrixPosition(pay.card.group.matrix);
      miniG.position.copy(from).lerp(NOTE, sm(h));
      miniG.position.y += Math.sin(Math.PI * sm(h)) * 2.4;
      miniG.scale.setScalar(Math.max(1e-3, lerp(0.55, 1, sm(h))));
      miniOn = true;
    } else if (beat === 3 && t < T4.fade[1]) {
      miniG.position.copy(NOTE);
      miniG.scale.setScalar(Math.max(1e-3, 1 - ss(t, T4.fade[0], T4.fade[1])));
      miniOn = true;
    }
    miniG.quaternion.copy(NOTE_Q);
    miniG.visible = miniOn;
    ST.mini = miniOn && (beat === 3 ? t < T4.check : seg(t, T3.hop[0], T3.hop[1]) >= 1);

    // ---- the ✓: appears on the question at the tap, flies onto the coin card and stays with it
    let chkOn = false;
    if (beat === 3 && t >= T4.check) {
      pay.card.group.updateMatrixWorld(true);
      // on the hanging card: its right edge, high, standing out past it (local x across the face, z down the face,
      // y out of it); on the laid card: standing on it, near its right end
      const lk = beat === 3 ? ss(t, T4.lay[0], T4.lay[1]) : 0;
      const loc = new V3(CARD_N.w * 0.5 + 0.35, 0.25, -CARD_N.d * 0.3).lerp(new V3(CARD_N.w * 0.3, 0.62, 0.0), lk);
      const onCard = loc.applyMatrix4(pay.card.group.matrix);
      const fk = seg(t, T4.fly[0], T4.fly[1]);
      check.group.position.copy(NOTE_FRONT).lerp(onCard, sm(fk));
      check.group.position.y += Math.sin(Math.PI * sm(fk)) * 1.6;
      check.group.quaternion.copy(pay.grp.quaternion).slerp(_q.setFromAxisAngle(YAX, PAY_YAW + Math.PI), lk);
      const pop = ss(t, T4.check, T4.check + 0.12);
      check.group.scale.setScalar(Math.max(1e-3, lerp(0.55, 1, sm(fk)) * (0.6 + 0.4 * pop) * (1 + 0.25 * Math.sin(Math.PI * pop))));
      chkOn = true;
    }
    check.group.visible = chkOn;
    ST.check = chkOn;

    Object.assign(ST, { beat, t });
    applyEmphasis();
    return api;
  }

  // ================================================================== emphasis by subtraction
  const SCENERY = [tiles, piers, table.group];
  const PILE_REST = 0.45;   // the delivered cards when they are not the subject: lighter, their typed lines kept
  function setDim(obj, k) {
    dim(obj, k);
    obj.traverse((o) => { if (o.isMesh && !o.userData.hitProxy) o.castShadow = k < 0.5 ? !!o.userData.cast0 : false; });
  }
  const sameSet = (set, list) => !!set && set.size === list.length && list.every((x) => set.has(x));
  function applyEmphasis() {
    const E = ST.emph;   // null: the map's rest; a Set: those parts full, the rest of the district down to contour
    const map = E === null;
    const full = (id) => map || E.has(id);
    const story1 = !map && ST.beat === 0 && sameSet(E, BEATS[0].parts);
    gates.forEach((G, i) => {
      const d = full(`gate-${i + 1}`) ? (story1 ? 1 - ST.lit[i] : 0) : 1;
      setDim(G.G, d);
    });
    setDim(person.group, full('customer') ? 0 : 1);
    // the question is the customer's (it arrives over their head)
    setDim(miniG, full('customer') || full('pay') ? 0 : 1);
    mini.material.userData.u.uAccent.value = !map && (full('customer') || full('pay')) ? ACCENT.teal : 0;
    for (const [N, id] of [[order, 'order'], [pay, 'pay'], [med, 'med']]) {
      const on = full(id);
      setDim(N.grp, on ? 0 : 1);
      setDim(N.card.group, on ? 0 : 1);
      N.bodyMat.userData.u.uAccent.value = !map && on ? ACCENT.teal : 0;
      N.card.material.userData.u.uAccent.value = 0;
    }
    setDim(coins.group, full('pay') ? 0 : 1);
    setDim(capsule.group, full('med') ? 0 : 1);
    setDim(burst, full('pay') || full('med') ? 0 : 1);
    setDim(todo.group, full('todo') ? 0 : 1);
    // the ✓ is the customer's mark: lime whenever it is there and the district is in focus
    setDim(check.group, 0);
    check.material.userData.u.uAccent.value = map ? ACCENT.ink : ACCENT.lime;
    // the stream: teal while it is the subject; the cards on the table a pile (lighter when not the subject)
    const fl = full('agents');
    setDim(floodBody, fl ? 0 : 1); setDim(floodEdges, fl ? 0 : 1);
    floodMat.userData.u.uAccent.value = !map && fl ? ACCENT.teal : 0;
    floodCards.castShadow = fl || full('pile');
    floodCards.material.userData.u.uAccent.value = 0;
    floodCards.material.userData.u.uDim.value = 0;
    const pl = full('pile') ? 0 : PILE_REST;
    for (let i = 0; i < NF; i++) { floodCards.setDim(i, pl); floodCards.tint(i, 1, -1, -1); }
    // the table carries the pile: drawn when the pile is the subject
    setDim(table.group, map || full('pile') ? 0 : 1);
    for (const o of [tiles, piers]) setDim(o, map ? 0 : 1);
  }
  function emphasize(ids) {
    ST.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }
  const atRest = () => sameSet(ST.emph, REST);

  // ================================================================== anchors: labels, words, hotspots, framing
  // the number sits on the lintel's face, at its left end (seen from the landing)
  const lintel = (i, up = 0.35) => { const G = gates[i].G; G.updateWorldMatrix(true, false); return G.localToWorld(new V3(0.36, GH + up, GW * 0.78)); };
  // a gate's ring low on its left post
  const postMid = (i) => { const G = gates[i].G; G.updateWorldMatrix(true, false); return G.localToWorld(new V3(0.2, GH * (i < 2 ? 0.12 : 0.3), GW)); };
  const cardAt = (C, x, y) => new V3(x, 0.08, y).applyMatrix4(C.matrix);
  // a card hangs upright: its local x runs across the face, its local z down the face (−z the top row)
  const gateDecal = (i) => () => {
    const on = atRest() ? i === 2 : ST.beat > 0 || ST.lit[i] > 0.6;
    return on ? lintel(i) : null;
  };
  const decalAt = {
    'gate-1': gateDecal(0), 'gate-2': gateDecal(1), 'gate-3': gateDecal(2), 'gate-4': gateDecal(3),
    // 查詢訂單 and its status, two rows on the card once it stands on the table
    order: () => (ST.orderOn && ST.orderLanded ? [cardAt(order.card.group, -0.1, -0.27 * CARD_N.d), cardAt(order.card.group, -0.1, 0.27 * CARD_N.d)] : null),
    pay: () => (ST.payAt && ST.payAt !== 'fly' ? cardAt(pay.card.group, ST.payAt === 'laid' ? -0.65 : -0.25, ST.payAt === 'laid' ? -0.05 : 0.05 * CARD_N.d) : null),
    med: () => (ST.medOn ? cardAt(med.card.group, -0.1, 0.05 * CARD_N.d) : null),
    confirm: () => { if (!ST.mini) return null; miniG.updateWorldMatrix(true, false); return miniG.localToWorld(new V3(0, 0, 0.1)); },
    todo: () => (ST.todoUp ? new V3(0, todo.t + 0.05, 0).applyMatrix4(todo.group.matrix) : null),
  };
  const labelAt = {
    // the one that slammed into the boom: it holds still there, so the name stays on it
    agents: () => (ST.payAt === 'halt' ? pay.grp.localToWorld(new V3(0, ARN + 0.35, 0)) : deckPt(U_STOP, WAIT, ALT + ARN + 0.3)),
    customer: () => person.top().addScaledVector(S, -0.9).add(new V3(0, -0.5, 0)),
  };
  const parts = {
    customer: { hit: hits.customer, anchor: () => person.chest(), beat: 3 },
    order: { hit: hits.order, anchor: () => cardAt(order.card.group, CARD_N.w / 2 + 0.6, 0.1 * CARD_N.d), beat: 1 },
    pay: { hit: hits.pay, anchor: () => new V3().setFromMatrixPosition(coins.group.matrix).add(new V3(0, coins.height * 0.5, 0)), beat: 2 },
    med: { hit: hits.med, anchor: () => new V3().setFromMatrixPosition(capsule.group.matrix), beat: 2 },
    agents: { hit: hits.agents, anchor: () => (ST.payAt === 'halt' ? pay.grp.localToWorld(new V3(-0.9, ARN + 0.15, 0)) : deckPt(U_STOP, WAIT, ALT + ARN)), beat: 0 },
    pile: { hit: hits.pile, anchor: () => onTable(-0.3, -0.9, 0.2), beat: 0 },
    todo: { hit: hits.todo, anchor: () => new V3(0, todo.t, todo.d * 0.3).applyMatrix4(todo.group.matrix), beat: 3 },
  };
  gates.forEach((G, i) => { parts[`gate-${i + 1}`] = { hit: hits[`gate-${i + 1}`], anchor: () => postMid(i), beat: i === 2 ? 2 : i === 3 ? 3 : 0 }; });

  // ---- shots: fixed points, so the framing never depends on where the motion happens to be
  hits.customer.updateWorldMatrix(true, false);
  const custAABB = new THREE.Box3().setFromObject(hits.customer);
  const custBox = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => new V3(x ? custAABB.max.x : custAABB.min.x, y ? custAABB.max.y + 0.6 : custAABB.min.y, z ? custAABB.max.z : custAABB.min.z))));
  const tableBox = [onTable(-1.5, -2.2), onTable(-1.5, 2.2), onTable(1.6, -2.2, -TBL.h), onTable(1.6, 2.2, -TBL.h), onTable(1.4, -0.2, CARD_N.d + 0.2)];
  const gateBox = (i) => [-1, 1].flatMap((sd) => [deckPt(U_GATE[i], sd * (GW + 0.45), 0), deckPt(U_GATE[i], sd * (GW + 0.45), GH + 0.9)]);
  const landing = [...custBox, ...tableBox, NOTE.clone().add(new V3(0, 0.8, 0))];
  const top = (i) => [-1, 1].map((sd) => deckPt(U_GATE[i], sd * (GW + 0.45), GH + 0.9));
  const A_PTS = [...landing, ...top(1), ...gateBox(2), ...gateBox(3)];
  // B (beats 3–4): from the land side, the customer in three-quarter view facing the gates, the two waiting at their
  // booms behind gate 4: the question goes from them to the customer and the ✓ comes back across the frame
  const B_PTS = [...landing, ...gateBox(2), ...gateBox(3)];
  // along the chord from gate 1 to the deck's end: seen from there the gates stack up the phone frame
  const chord = O.clone().sub(curve.getPointAt(U_GATE[0])).setY(0).normalize();
  const AZ_C = Math.atan2(chord.z, chord.x);
  const shot = (az, el, pts, margin) => ({ az, el, anchors: () => pts, margin });
  // desktop: the same two views, a little more from the side so the wider frame is filled
  const desk = [shot(AZ_C - 0.75, 0.34, A_PTS), shot(AZ_C - 1.0, 0.32, B_PTS)];
  const portrait = [shot(AZ_C - 0.5, 0.36, A_PTS), shot(AZ_C - 0.8, 0.36, B_PTS)];
  // a phone held sideways: a wide, short world; seen more from the side, the landing and the gates lie side by side
  const side = [shot(AZ_C - 0.75, 0.34, A_PTS, 0.04), shot(AZ_C - 1.0, 0.32, B_PTS, 0.05)];
  const sideways = () => typeof innerWidth === 'number' && innerWidth > innerHeight;
  const either = (i) => ({
    get az() { return (sideways() ? side : portrait)[i].az; },
    get el() { return (sideways() ? side : portrait)[i].el; },
    anchors: () => (sideways() ? side : portrait)[i].anchors(),
    get margin() { return (sideways() ? side : portrait)[i].margin; },
  });
  const shots = { phone: [either(0), either(1)], desk };

  function rest() { return pose(LAST, 1); }
  function ambient() { /* the held result stays still */ }

  const api = {
    id: 'gates',
    group: g,
    zone: 'ai',
    anchor: deckPt(0.72, 0, GH + 4),
    pin: deckPt(0.7, 0, 0),
    focus: { pos: deckPt(0.7, 0, 0), r: 34 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    // the words on the cards are sized to the cards (world height of the text)
    decalUnit: { order: 0.42, pay: 0.5, med: 0.5, todo: 0.36, confirm: 0.4 },
    lever: null,
    restParts: REST,
    mainActor: 'customer',
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    curve,
    _dbg: { coins: coins.group, capsule: capsule.group, payCard: pay.card.group, person: person.group, order: order.grp, pay: pay.grp, med: med.grp, boom: boomW.grp, gates: gates.map((G) => G.G), table: table.group, mini: miniG, check: check.group, todo: todo.group, ST },
  };
  rest();
  emphasize(null);
  return api;
}
