// Agent 權限 · how far an AI Agent may go on its own (articles 22, 18, 15) — a bridge across the AI sea, from the
// brand shore to a customer on the heartland landing.  Four plain gates stand on it, numbered on the lintel: the
// permission layers 觀察／理解 · 推薦 · 決策 · 行動 (22 b39–b42).  The words live in world.json.
//
// Told in four beats (design_system §3, districts spec §2), picture first:
//   1  a stream of AI Agents, each carrying a typed task card, pours off the brand shore and across the bridge.  Six
//      fly through all four gates and drop their cards on the customer's table; then the bar at gate 3 (決策) swings
//      down and the last one knocks against it and waits.  Each task goes only as far as it may (22 b2, b44).
//   2  查詢訂單 flies the whole way: the bar lifts for it by itself, and its card is set down on the table, 已出貨.
//   3  金融交易 runs up to 決策 and knocks against the bar; a small typed 確認交易？ hops over the customer's head.
//   4  the customer holds the phone up to it; a lime ✓ shows on the question and flies onto the card; only then the bar
//      lifts and the agent goes on, through 行動, down beside the customer.
// Held: the confirmed card with its ✓ held up beside the customer, the bar down again, one task still waiting at 決策.
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
const GH = 6.5;            // gate height: one height for all four, so the stack reads by perspective
const GW = 2.55;           // half the distance between a gate's posts (post centres)
const POST = 0.5;
const DECK_W = 5.6;        // the deck carries two lanes
const DECK = 0.225;        // deck top above the bridge curve
// the gates stand close together (about 4.5 units apart) on the landing end of the span: on a phone, seen from behind
// the customer, the four stack up the frame with the far lintel still large enough for its number.  6.5 high, so that
// through one gate the next one's opening shows with what waits in it
const U_GATE = [0.58, 0.68, 0.78, 0.88];
const ALT = 3.9;           // an agent's cubes fly this high over the deck; its card hangs below
// the bar at gate 3: across the opening at the height of an agent's cubes, on the landing side of the posts, so that
// seen from the landing (the phone looks down at 0.7) it lies in front of whatever waits in the gate, above gate 4's
// lintel: inside gate 3's frame, not under gate 4's
const BAR_Y = 4.0;
const BAR_X = 0.62;
const LANE = 0.85;         // the two lanes (± across the deck)
const CARD_N = { w: 2.6, d: 1.75 };     // a named task card (查詢訂單, 金融交易): tall enough for two rows of words
const CARD_F = { w: 2.0, d: 1.25 };    // a card in the stream
const H = 4.5;             // the customer

// ------------------------------------------------------------------ the beats
// (caption at keyAt; the strip holds it 0.8 s + 0.25 s per 字, see story.js)
const BEATS = [
  // 1 每件事，Agent 能做到哪一步？ — the stream: six go all the way, the bar drops, the last one knocks against it
  { dur: 2.6, keyAt: 1.8, shot: 0, parts: ['gate-1', 'gate-2', 'gate-3', 'gate-4', 'agents', 'customer'] },
  // 2 查詢訂單：可以一路做完 — the bar lifts for it by itself; its card lands at the customer, 已出貨
  { dur: 2.2, keyAt: 1.8, shot: 0, parts: ['order', 'gate-1', 'gate-2', 'gate-3', 'gate-4', 'customer'] },
  // 3 金融交易：走到決策就停下 — it knocks against the bar; 確認交易？ hops over the customer's head
  // (決策 first: the beat's subject, which the UI's edge arrow names, is where it stops; 金融交易 itself flies in from
  // beyond the top of shot B, and an arrow 「在畫面外」 flashed until it came into the frame)
  { dur: 2.0, keyAt: 1.05, shot: 1, parts: ['gate-3', 'pay', 'gate-4', 'customer'] },
  // 4 顧客確認了，Agent 才往下走 — the phone held up, the ✓ flies onto the card, the bar lifts, the agent goes on
  { dur: 2.6, keyAt: 1.15, shot: 1, parts: ['customer', 'pay', 'gate-3', 'gate-4'] },
];
const LAST = BEATS.length - 1;
// beat-local times of the key events (seconds)
// the six that pass have all cleared 決策 by 1.5 s; then the bar comes down, and the last one knocks against it (1.83 s)
const T1 = { launch0: 0.05, every: 0.11, trip: 1.15, risky: [1.13], tripR: 1.0, bar: [1.56, 1.7] };
// the named agents fly down out of the sky just short of gate 1 at the start of their own beat (rise), then on
const T2 = { rise: [0, 0.3], lift: 0.3, trip: 1.0, barUp: [0.6, 0.76], barDown: [1.0, 1.14], land: 0.3, drop: 0.2, note: 1.8 };
// 金融交易 knocks against the bar at lift + 0.7 trip (1.02 s)
const T3 = { rise: [0, 0.25], lift: 0.25, trip: 1.1, hop: [1.25, 1.7] };
// the phone held up (0–0.35) and pushed toward the question (the tap); the ✓ shows on the question, flies to the card,
// and the question folds away behind it; then the bar lifts and the agent goes on
const T4 = { raise: [0, 0.35], tap: [0.35, 0.47], check: 0.45, fly: [0.6, 0.98], barUp: [1.0, 1.16], go: [1.16, 1.85], land: 0.35, barDown: [2.24, 2.4], fade: [0.85, 1.05] };

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
 * (Meant for kit.js, so the market's AI 購物助理 can share it; until then it lives here.)
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
    // bowed sideways a little and lifted in an arc over the water
    const side = new V3(-(B.z - A.z), 0, B.x - A.x).normalize().multiplyScalar(Math.sin(t * Math.PI) * 5);
    p.add(side);
    p.y = (1 - t) * A.y + t * B.y + Math.sin(t * Math.PI) * 3.2 + 0.4;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const LEN = curve.getLength();
  // samples of the curve, so pose() does not walk the spline for every agent every frame
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
  // piers under the shore half
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
      new THREE.BoxGeometry(0.62, 0.66, 2 * GW + 1.1).translate(0, GH + 0.33, 0),
      // feet, so the posts stand on the deck
      new THREE.BoxGeometry(0.9, 0.18, 0.9).translate(0, 0.09, GW),
      new THREE.BoxGeometry(0.9, 0.18, 0.9).translate(0, 0.09, -GW),
    ].map(clean));
    const m = new THREE.Mesh(geo, ink({ shade: 0.98, bias: 0.12 }));
    m.castShadow = m.receiveShadow = true;
    G.add(m);
    g.add(G);
    return { G, u, mesh: m };
  });
  // the bar at gate 3: a boom hinged on the left post (seen from the landing), in front of the portal on the landing
  // side.  One solid graphite bar with paper sleeves: drawn in bands of graphite and paper it fell apart into a row of
  // small hatched blocks on a phone; solid, it reads as one bar across the opening (no red: a pause, not a rejection)
  const bar = new THREE.Group();
  bar.name = 'bar';
  const BAR_LEN = 2 * GW - 0.2;
  {
    const arm = new THREE.Group();
    const core = new THREE.Mesh(clean(new THREE.BoxGeometry(0.42, 0.42, BAR_LEN)).translate(0, 0, -BAR_LEN / 2 - 0.05), ink({ accent: 'ink' }));
    const sleeves = new THREE.Mesh(mergeGeometries([0.3, 0.62].map((f) => clean(new THREE.BoxGeometry(0.5, 0.5, BAR_LEN * 0.16)).translate(0, 0, -0.05 - BAR_LEN * f))), ink({ shade: 1, bias: 0.3 }));
    core.castShadow = sleeves.castShadow = true;
    arm.add(core, sleeves);
    // the hinge: a short graphite drum on the post's landing face
    const hub = new THREE.Mesh(clean(new THREE.CylinderGeometry(0.36, 0.36, BAR_X + 0.15, 16)).rotateZ(Math.PI / 2).translate(-(BAR_X + 0.15) / 2 + 0.25, 0, 0), ink({ shade: 0.45, bias: 0.05 }));
    hub.castShadow = true;
    bar.add(arm, hub);
    bar.position.set(BAR_X, BAR_Y, GW);
    gates[2].G.add(bar);
  }
  const BAR_UP = Math.PI * 0.5;

  // ================================================================== the landing: the customer and their table
  // a frame at the deck's end: f into the land (toward the camera of the phone shots), s across (screen right)
  const O = curve.getPointAt(1).clone();
  const F = flatTan(1).clone();
  const S = new V3(F.z, 0, -F.x);
  const land = (f, s, up = null) => { const p = O.clone().addScaledVector(F, f).addScaledVector(S, s); p.y = up === null ? heightAt(p.x, p.z) : up; return p; };
  const YAW_F = Math.atan2(F.x, F.z);          // a group turned by this faces +f (its +z along f)

  // the table where finished tasks land (camera left of the deck's end)
  const TBL = { f: 1.6, s: -5.4, w: 3.8, d: 2.6, h: 1.25 };
  const table = P.makeTable({ w: TBL.d, d: TBL.w, h: TBL.h });   // makeTable: w along its x, d along its z
  const tPos = land(TBL.f, TBL.s);
  table.group.position.copy(tPos);
  table.group.rotation.y = YAW_F + Math.PI / 2;                 // its long side across, facing the bridge
  g.add(table.group);
  const TOP = tPos.y + TBL.h;
  /** a point on the table top: (f, s) relative to its centre in the landing frame */
  const onTable = (f, s, up = 0) => { const p = tPos.clone().addScaledVector(F, f).addScaledVector(S, s); p.y = TOP + up; return p; };

  // the customer (the one who confirms), just past the deck's end, half turned from the bridge toward the table
  const CUST = land(3.0, -1.0);
  const CUST_YAW = YAW_F + Math.PI + 0.95;      // half turned from the bridge toward the table: seen in profile
  const person = makePerson({ height: H });
  person.material.userData.u.uShadeBias.value = 0.14;
  const phone = P.makePhone({ h: 0.78 });
  person.hold('R', phone, { rot: [-0.55, Math.PI, 0] });
  person.group.position.copy(CUST);
  person.group.rotation.y = CUST_YAW;
  g.add(person.group);

  // ================================================================== the agents
  const AG = agentGeo();
  const cardLocal = (c) => new M4().compose(new V3(0, -AG.r - 0.08 - c.d / 2, 0.15), new Q().setFromAxisAngle(XAX, Math.PI / 2), new V3(1, 1, 1));
  /** a named agent: its cubes and edges, and its task card hanging below, facing its front (+z) */
  function makeNamed(name, seed, free = false) {
    const grp = new THREE.Group(); grp.name = name;
    const bodyMat = ink({ style: 1, shade: 0.62, accent: 'teal' });
    bodyMat.vertexColors = true;
    const body = new THREE.Mesh(AG.body, bodyMat);
    const edges = new THREE.Mesh(AG.edges, ink({ accent: 'ink' }));
    body.castShadow = true; edges.castShadow = false;
    const card = P.makeCard({ w: CARD_N.w, d: CARD_N.d, t: 0.06, lines: 2, seed });
    const cm = cardLocal(CARD_N);
    cm.decompose(card.group.position, card.group.quaternion, card.group.scale);
    grp.add(body, edges);
    if (free) { card.group.name = name + '-card'; card.group.matrixAutoUpdate = false; g.add(card.group); } else grp.add(card.group);
    g.add(grp);
    return { grp, body, bodyMat, edges, card, cm, free };
  }
  // 查詢訂單's card is let go on the table like the stream's; 金融交易's agent keeps its card (the ✓ goes on it)
  const order = makeNamed('order', 3, true);
  const pay = makeNamed('pay', 11);

  // the stream: seven agents with cards; six fly through, the last (the risky one) is held at 決策
  const NF = 7, NPASS = 6;
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
  // each passer's place on the table's pile (back two thirds of the top, a loose heap) and the risky ones' halts
  const pile = [];
  for (let i = 0; i < NPASS; i++) {
    const row = i % 2, col = Math.floor(i / 2);
    const f = -0.5 + row * 0.7 + (R() - 0.5) * 0.3, s = -1.3 + col * 1.1 + (R() - 0.5) * 0.3;
    pile.push({ p: onTable(f, s, 0.004 + (i % 3) * 0.03), yaw: YAW_F + (R() - 0.5) * 0.9 });
  }
  const U3 = U_GATE[2];
  // a task held at 決策 waits right behind the bar, its front cubes just short of it (the arm, lifting, swings up in its
  // own plane in front of them)
  const FRONT = AG.w / 2 + 0.06;
  const U_STOP = U3 + dU(BAR_X - 0.25 - FRONT);
  const BACK = 0.14;                       // after the knock it rests this far back from touching
  const HALT = [{ u: U_STOP, lane: LANE, up: 0, knock: true }];
  /** up to the bar at speed and a knock against it: k 0…1 → [fraction of the way, how far it has come back (units)] */
  const knock = (k, hit = 0.7) => {
    if (k < hit) { const x = k / hit; return [x * x * (2 - x), 0]; }
    const q = seg(k, hit, 1);
    return [1, BACK * sm(q) + 0.3 * Math.sin(Math.PI * Math.min(1, q * 1.7)) * (1 - q)];
  };
  const flood = Array.from({ length: NF }, (_, i) => {
    const pass = i < NPASS;
    return {
      pass,
      t0: pass ? T1.launch0 + i * T1.every : T1.risky[i - NPASS],
      lane: pass ? (i % 2 ? LANE : -LANE) * (0.85 + R() * 0.3) : HALT[i - NPASS].lane,
      alt: ALT + (R() - 0.5) * 0.5,
      spin: (R() - 0.5) * 0.8,
      ph: R() * 6.28,
      pile: pass ? pile[i] : null,
      halt: pass ? null : HALT[i - NPASS],
    };
  });

  // the named ones fly in from above, just short of gate 1, at the start of their own beat
  const WAIT = { order: { u: U_GATE[0] - dU(4.2), lane: -LANE }, pay: { u: U_GATE[0] - dU(4.2), lane: -LANE } };
  // 查詢訂單's card lands at the front of the table among the finished tasks; 金融交易 comes down to the customer's
  // left, at head height, its card held up to them
  const ORDER_STAND = onTable(0.75, 0.35, CARD_N.d / 2 + 0.02);    // the card's centre, standing on the table's front edge
  const ENDP = { order: ORDER_STAND.clone().add(new V3(0, 0.3 + CARD_N.d / 2 + AG.r, 0)), pay: land(2.6, -3.5) };
  ENDP.pay.y += 6.6;
  const END_YAW = YAW_F - 0.18;
  const PAY_HALT = { u: U_STOP, lane: -LANE };

  // the confirm card that hops to the phone (typed, small) and the ✓
  const mini = P.makeCard({ w: 1.25, d: 0.8, t: 0.05, lines: 2, seed: 5 });
  mini.group.name = 'confirm';
  const miniG = new THREE.Group(); miniG.name = 'confirm-card';
  mini.group.rotation.x = Math.PI / 2;
  miniG.add(mini.group);
  g.add(miniG);
  const check = makeCheck(1.15);
  g.add(check.group);

  // ================================================================== hit proxies
  const hits = {
    customer: P.makeHitProxy(person.group, 0.35),
    order: P.makeHitProxy(order.card.group, 0.45),
    pay: P.makeHitProxy(pay.grp, 0.3),
  };
  gates.forEach((G, i) => { hits[`gate-${i + 1}`] = P.makeHitProxy(G.G, 0.25); });
  // the stream's proxy: one padded box round each agent that is on screen, rewritten as they move
  hits.agents = (() => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const base = one.attributes.position.array;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(base.length * NF), 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
    m.name = 'hit:agents'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.frustumCulled = false;
    const HW = AG.w / 2 + 0.35, HH = (AG.r + CARD_F.d + 0.5) / 2 + 0.3;
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
    return v;
  };
  const POSE = {
    rest: holdLook(0, 0.15),               // looking down at the phone
    up: holdLook(-0.7, -0.25),             // looking up the bridge (to the figure's right)
    left: holdLook(0.1, 0.05),             // toward the table and the agent beside it
    // the phone held up high toward the question, as one shows it: the decisive act, readable from behind
    raised: clonePose(pz('raise', { side: 'R' })),
  };
  POSE.push = clonePose(POSE.raised);
  POSE.push.hand.R.p.add(new V3(0, 0.035, 0.03));
  // the question (確認交易？) sits above the customer's head, over the phone as it is held up: one fixed place
  const NOTE = (() => {
    person.apply(POSE.raised);
    person.group.position.copy(CUST);
    person.group.rotation.set(0, CUST_YAW, 0);
    person.group.updateMatrixWorld(true);
    return phone.group.localToWorld(new V3(0, 0.39, 0)).setY(CUST.y + H + 1.15);
  })();
  const NOTE_Q = new Q().setFromAxisAngle(YAX, YAW_F + 0.25);
  const NOTE_FRONT = new V3(0, 0, 0.3).applyQuaternion(NOTE_Q).add(NOTE);   // the ✓ on the question's face
  const blendV = (a, b, k) => person.blend(a, b, sm(k));

  // ================================================================== pose
  // what pose() decided and the anchors and emphasis need
  const ST = { beat: LAST, t: BEATS[LAST].dur, emph: null, gateLit: [1, 1, 1, 1], orderOn: true, payOn: true, orderAt: 'end', payAt: 'end', note: true, mini: false, check: true, risky: [] };
  const _m = new M4(), _m2 = new M4(), _q = new Q(), _q2 = new Q(), _s = new V3(1, 1, 1);
  const ZERO = new V3(1e-4, 1e-4, 1e-4), ONE = new V3(1, 1, 1);
  const faceTo = (dir, out = new Q()) => out.setFromUnitVectors(ZAX, _b.copy(dir).setY(0).normalize());

  /** an agent flying along the deck: { p (its cubes' centre), q (its front along the bridge) } */
  const onDeck = (u, lane, alt, out) => {
    deckPt(u, lane, alt, out.p);
    faceTo(flatTan(u, _a), out.q);
    return out;
  };
  /** from the deck's end down to a place at the landing: an arc, its front turning to `yaw` */
  const descend = (from, fromQ, to, yaw, k, out) => {
    const e = sm(k);
    out.p.copy(from).lerp(to, e);
    out.p.y += Math.sin(Math.PI * e) * 0.9;
    out.q.copy(fromQ).slerp(_q2.setFromAxisAngle(YAX, yaw), e);
    return out;
  };

  /** a boom coming down: it falls (accelerating), hits its rest and kicks up once */
  const drop = (t, a, b) => { const k = seg(t, a, b); return k < 1 ? ei(k) : 1 - 0.1 * Math.sin(Math.PI * seg(t, b, b + 0.16)); };
  /** the bar shudders where a task knocks against it */
  const wob = (t, at) => (t > at ? 0.06 * Math.sin((t - at) * 32) * Math.exp(-(t - at) * 7) : 0);
  /** the bar's angle (0 down … BAR_UP) at (beat, t) */
  function barAngle(beat, t) {
    if (beat === 0) return BAR_UP * (1 - drop(t, T1.bar[0], T1.bar[1])) + wob(t, T1.risky[0] + 0.7 * T1.tripR);
    if (beat === 1) return BAR_UP * (ss(t, T2.barUp[0], T2.barUp[1]) - drop(t, T2.barDown[0], T2.barDown[1]));
    if (beat === 2) return wob(t, T3.lift + 0.7 * T3.trip);
    return BAR_UP * (ss(t, T4.barUp[0], T4.barUp[1]) - drop(t, T4.barDown[0], T4.barDown[1]));
  }

  const F0 = { p: new V3(), q: new Q() }, F1 = { p: new V3(), q: new Q() };
  /** a named agent's frame (beat, t): waiting at the shore end, flying, halted, landed; null = not there yet */
  function namedAt(who, beat, t, out) {
    const W = WAIT[who], mine = who === 'order' ? 1 : 2;
    const endQ = (o) => o.q.setFromAxisAngle(YAX, END_YAW);
    if (beat < mine) return null;
    if (beat === mine) {
      // down out of the sky at the start of its own beat
      const rs = mine === 1 ? T2.rise : T3.rise;
      const k = seg(t, rs[0], rs[1]);
      if (k <= 0) return null;
      if (k < 1) { onDeck(W.u - dU(3) * (1 - eo(k)), W.lane, lerp(ALT + 7, ALT, eo(k)), out); out.s = Math.max(1e-3, eo(k * 1.6)); return out; }
    }
    out.s = 1;
    if (who === 'order') {
      if (beat > 1) return null;
      // beat 2: the whole way, then down to the landing
      const k = seg(t, T2.lift, T2.lift + T2.trip);
      if (k < 1) {
        onDeck(lerp(W.u, 1, sm(k) * 0.3 + k * 0.7), -LANE, ALT, out);
        return out;
      }
      onDeck(1, -LANE, ALT, F0);
      descend(F0.p, F0.q, ENDP.order, YAW_F, seg(t, T2.lift + T2.trip, T2.lift + T2.trip + T2.land), out);
      // its card let go on the table, its task done, it is gone
      const t1 = T2.lift + T2.trip + T2.land;
      out.s = Math.max(0, 1 - ss(t, t1 + 0.05, t1 + T2.drop + 0.12));
      return out.s > 1e-3 ? out : null;
    }
    // pay: beat 3 to the bar; beat 4 on, after the ✓
    if (beat === 2) {
      // it runs up to the bar and knocks against it, comes back a little, then a slow bob while it waits
      const k = seg(t, T3.lift, T3.lift + T3.trip);
      const [f, back] = knock(k);
      onDeck(lerp(W.u, PAY_HALT.u, f) - dU(back), lerp(W.lane, PAY_HALT.lane, ss(k, 0, 0.3)), ALT, out);
      const after = t - (T3.lift + T3.trip);
      if (after > 0) out.p.y += 0.08 * Math.sin(after * 4.2) * clamp(after / 0.4);
      return out;
    }
    if (beat === 3) {
      const after = BEATS[2].dur - (T3.lift + T3.trip) + t;
      const held = PAY_HALT.u - dU(BACK);
      if (t < T4.go[0]) { onDeck(held, PAY_HALT.lane, ALT, out); out.p.y += 0.08 * Math.sin(after * 4.2) * (1 - ss(t, T4.barUp[0], T4.go[0])); return out; }
      const k = seg(t, T4.go[0], T4.go[1]);
      if (k < 1) { onDeck(lerp(held, 1, ss(k, 0, 1)), PAY_HALT.lane, ALT, out); return out; }
      onDeck(1, PAY_HALT.lane, ALT, F0);
      return descend(F0.p, F0.q, ENDP.pay, END_YAW, seg(t, T4.go[1], T4.go[1] + T4.land), out);
    }
    out.p.copy(ENDP.pay); endQ(out); return out;
  }

  const NA = { p: new V3(), q: new Q(), s: 1 };
  const placeNamed = (N, f) => {
    N.grp.visible = !!f;
    if (!f) return;
    N.grp.position.copy(f.p);
    N.grp.quaternion.copy(f.q);
    N.grp.scale.setScalar(f.s ?? 1);
  };
  const ORDER_STAND_M = new M4().compose(ORDER_STAND, new Q().setFromAxisAngle(YAX, YAW_F - 0.12).multiply(new Q().setFromAxisAngle(XAX, Math.PI / 2 - 0.12)), new V3(1, 1, 1));
  const _la = [new V3(), new Q(), new V3()], _lb = [new V3(), new Q(), new V3()];
  /** 查詢訂單's card: carried under its agent, then set down standing on the front of the table */
  function placeOrderCard(beat, t) {
    const C = order.card.group;
    const t1 = T2.lift + T2.trip + T2.land;
    let on = true;
    if (beat < 1) on = false;
    else if (beat > 1 || t >= t1 + T2.drop) C.matrix.copy(ORDER_STAND_M);
    else if (!order.grp.visible) on = false;
    else {
      const carried = _m2.compose(order.grp.position, order.grp.quaternion, _s.setScalar(Math.max(1e-3, order.grp.scale.x))).multiply(order.cm);
      if (t < t1) C.matrix.copy(carried);
      else {
        // from the agent's hands down onto the table's edge, where it stands
        const d = seg(t, t1, t1 + T2.drop);
        _m.compose(order.grp.position, order.grp.quaternion, ONE).multiply(order.cm).decompose(..._la);
        ORDER_STAND_M.decompose(..._lb);
        C.matrix.compose(_la[0].lerp(_lb[0], ei(d)), _la[1].slerp(_lb[1], sm(d)), ONE);
      }
    }
    C.visible = on;
    C.matrixWorldNeedsUpdate = true;
    return on;
  }

  /** pure: every explanatory transform for (beat, k) */
  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const t = k * BEATS[beat].dur;

    // ---- the gates light far to near as the story opens
    for (let i = 0; i < 4; i++) ST.gateLit[i] = beat > 0 ? 1 : ss(t, 0.0 + 0.16 * i, 0.3 + 0.16 * i);

    // ---- the bar
    bar.rotation.set(barAngle(beat, t), 0, 0);

    // ---- the stream (beat 1 plays it; afterwards the cards lie on the table and two agents wait at 決策)
    const centres = [];
    ST.risky.length = 0;
    for (let i = 0; i < NF; i++) {
      const A_ = flood[i];
      const tt = beat === 0 ? t : 99;           // after beat 1 everything in the stream has arrived
      let show = true, sc = 1, cardM = null;
      const fr = F1;
      if (tt < A_.t0) show = false;
      else if (A_.pass) {
        const tripEnd = A_.t0 + T1.trip, landEnd = tripEnd + 0.34, dropEnd = landEnd + 0.22;
        if (tt < tripEnd) {
          const kk = (tt - A_.t0) / T1.trip;
          onDeck(lerp(0.02, 1, kk), A_.lane * ss(kk, 0, 0.1), A_.alt, fr);
          fr.p.y -= (1 - eo(clamp(kk / 0.06))) * 2.4;      // rising out of the shore end
          fr.q.multiply(_q.setFromAxisAngle(YAX, A_.spin * Math.sin(kk * 3 + A_.ph) * 0.4));
        } else {
          onDeck(1, A_.lane, A_.alt, F0);
          const over = A_.pile.p.clone(); over.y += 1.0 + CARD_F.d + AG.r;
          descend(F0.p, F0.q, over, A_.pile.yaw, seg(tt, tripEnd, landEnd), fr);
          if (tt >= landEnd) {
            // the card is let go: down flat onto the pile; the agent, its task done, is gone
            const d = seg(tt, landEnd, dropEnd);
            _m.compose(fr.p, fr.q, ONE).multiply(CARD_FL);
            const flat = _m2.compose(A_.pile.p, _q.setFromAxisAngle(YAX, A_.pile.yaw), ONE);
            cardM = d >= 1 ? flat : (() => {
              const a = [new V3(), new Q(), new V3()], b = [new V3(), new Q(), new V3()];
              _m.decompose(...a); flat.decompose(...b);
              return new M4().compose(a[0].lerp(b[0], ei(d)), a[1].slerp(b[1], sm(d)), ONE);
            })();
            sc = 1 - ss(tt, landEnd + 0.05, dropEnd + 0.12);
          }
        }
      } else {
        // the risky one: it runs up to the closed bar and knocks against it (a halt without a knock eases in)
        const kk = clamp((tt - A_.t0) / T1.tripR);
        const [f, back] = A_.halt.knock ? knock(kk) : [eo(kk), 0];
        onDeck(lerp(0.02, A_.halt.u, f) - dU(back), A_.lane * ss(kk, 0, 0.12), ALT + A_.halt.up * ss(kk, 0.3, 1), fr);
        fr.p.y -= (1 - eo(clamp(kk / 0.08))) * 2.4;
        // a slow bob while it waits, settled by the end of the beat (the next beats hold it still)
        const after = tt - A_.t0 - T1.tripR;
        if (after > 0 && beat === 0) fr.p.y += 0.07 * Math.sin(after * 4 + A_.ph) * clamp(after / 0.3) * (1 - ss(tt, BEATS[0].dur - 0.35, BEATS[0].dur));
        ST.risky.push(fr.p.clone());
      }
      const on = show && sc > 1e-3;
      if (on) {
        _m.compose(fr.p, fr.q, _s.setScalar(sc));
        floodBody.setMatrixAt(i, _m); floodEdges.setMatrixAt(i, _m);
        centres.push(fr.p.clone().add(new V3(0, -(CARD_F.d + 0.2) / 2, 0)));
      } else {
        _m.compose(O, _q.identity(), ZERO);
        floodBody.setMatrixAt(i, _m); floodEdges.setMatrixAt(i, _m);
      }
      if (!show) floodCards.setCard(i, _m.compose(O, _q.identity(), ZERO));
      else if (cardM) floodCards.setCard(i, cardM);
      else floodCards.setCard(i, _m.compose(fr.p, fr.q, ONE).multiply(CARD_FL));
    }
    floodBody.instanceMatrix.needsUpdate = true;
    floodEdges.instanceMatrix.needsUpdate = true;
    hits.agents.userData.place(centres);
    pickable(hits.agents, centres.length > 0);

    // ---- the named two
    const fo = namedAt('order', beat, t, NA);
    placeNamed(order, fo);
    ST.orderOn = placeOrderCard(beat, t);
    ST.orderAt = !ST.orderOn ? null : beat === 1 && t < T2.lift + T2.trip + T2.land + T2.drop ? 'fly' : 'end';
    const fp = namedAt('pay', beat, t, NA);
    placeNamed(pay, fp);
    ST.payOn = !!fp;
    ST.payAt = !fp ? null : beat === 2 ? (t < T3.lift + T3.trip ? 'fly' : 'halt') : t < T4.go[0] ? 'halt' : t < T4.go[1] + T4.land ? 'fly' : 'end';
    pickable(hits.order, ST.orderOn); pickable(hits.pay, ST.payOn);
    ST.note = beat > 1 || (beat === 1 && t >= T2.note);

    // ---- the customer: looks up the bridge at the stream, watches the order land, reads the phone, confirms
    let v;
    if (beat === 0) v = blendV(POSE.rest, POSE.up, seg(t, 0.1, 0.6));
    else if (beat === 1) v = t < 1.2 ? POSE.up : blendV(POSE.up, POSE.left, seg(t, 1.2, 1.7));
    else if (beat === 2) v = t < T3.hop[0] ? blendV(POSE.left, POSE.up, seg(t, 0, 0.4)) : blendV(POSE.up, POSE.rest, seg(t, T3.hop[0], T3.hop[1]));
    else {
      // the phone held up to the question, a push (the tap), held while the ✓ flies and the bar lifts, then lowered to
      // watch the agent come through 4 and down beside them
      if (t < T4.raise[1]) v = blendV(POSE.rest, POSE.raised, seg(t, T4.raise[0], T4.raise[1]));
      else if (t < T4.tap[1]) v = blendV(POSE.raised, POSE.push, Math.sin(Math.PI * seg(t, T4.tap[0], T4.tap[1])));
      else if (t < 1.6) v = blendV(POSE.raised, POSE.up, seg(t, 1.2, 1.6));
      else v = blendV(POSE.up, POSE.left, seg(t, 1.9, 2.5));
    }
    person.apply(v);
    person.group.position.copy(CUST);
    person.group.rotation.set(0, CUST_YAW, 0);
    person.group.updateMatrixWorld(true);

    // ---- the confirm card: from the halted agent's card to above the customer's head (beat 3), where the phone is held
    // up to it; the ✓ shows on it at the tap; it folds away once the ✓ has left (beat 4)
    const phoneTop = NOTE;
    let miniOn = false;
    if (beat === 2 && t >= T3.hop[0]) {
      const h = seg(t, T3.hop[0], T3.hop[1]);
      pay.card.group.updateWorldMatrix(true, false);
      const from = pay.card.group.localToWorld(new V3(0, 0.1, 0));
      miniG.position.copy(from).lerp(phoneTop, sm(h));
      miniG.position.y += Math.sin(Math.PI * sm(h)) * 2.2;
      miniG.scale.setScalar(Math.max(1e-3, lerp(0.6, 1, sm(h))));
      miniOn = true;
    } else if (beat === 3 && t < T4.fade[1]) {
      miniG.position.copy(phoneTop);
      miniG.scale.setScalar(Math.max(1e-3, 1 - ss(t, T4.fade[0], T4.fade[1])));
      miniOn = true;
    }
    miniG.quaternion.copy(NOTE_Q);
    miniG.visible = miniOn;
    // its words until the tap; from then on the ✓ is on it (a word box would hide the ✓)
    ST.mini = miniOn && (beat === 3 ? t < T4.check : seg(t, T3.hop[0], T3.hop[1]) >= 1);

    // ---- the ✓: appears on the confirm card at the tap, flies onto the 金融交易 card and stays there
    let chkOn = false;
    if (beat === 3 && t >= T4.check) {
      pay.grp.updateMatrixWorld(true);
      // on the card's right edge, high, standing out past it: the card's name (in its middle) does not cover it, and
      // while the agent waits at the bar it shows over gate 4's lintel.  (The card hangs upright: its local x runs
      // across the face, its local z down the face, its local y out of it.)
      const onCard = pay.card.group.localToWorld(new V3(CARD_N.w * 0.5 + 0.4, 0.25, -CARD_N.d * 0.32));
      const start = NOTE_FRONT;
      const fk = seg(t, T4.fly[0], T4.fly[1]);
      check.group.position.copy(start).lerp(onCard, sm(fk));
      check.group.position.y += Math.sin(Math.PI * sm(fk)) * 1.6;
      check.group.quaternion.copy(pay.grp.quaternion);
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
  const REST = ['customer', 'pay', 'order', 'gate-3'];
  function applyEmphasis() {
    const E = ST.emph;   // null: the map's rest; a Set: those parts full, the rest of the district down to contour
    const map = E === null;
    const full = (id) => map || E.has(id);
    const story1 = !map && ST.beat === 0 && sameSet(E, BEATS[0].parts);
    gates.forEach((G, i) => {
      // beat 1 lights the gates one after another, far to near
      const d = full(`gate-${i + 1}`) ? (story1 ? 1 - ST.gateLit[i] : 0) : 1;
      setDim(G.G, d);
    });
    setDim(person.group, full('customer') ? 0 : 1);
    // the confirm card is the customer's (it arrives on their phone)
    setDim(miniG, full('customer') || full('pay') ? 0 : 1);
    mini.material.userData.u.uAccent.value = !map && (full('customer') || full('pay')) ? ACCENT.teal : 0;
    for (const [N, id] of [[order, 'order'], [pay, 'pay']]) {
      const on = full(id);
      setDim(N.grp, on ? 0 : 1);
      if (N.free) setDim(N.card.group, on ? 0 : 1);
      N.bodyMat.userData.u.uAccent.value = !map && on ? ACCENT.teal : 0;
      N.card.material.userData.u.uAccent.value = 0;
    }
    // the ✓ is the customer's mark: lime whenever it is there and the district is in focus
    setDim(check.group, 0);
    check.material.userData.u.uAccent.value = map ? ACCENT.ink : ACCENT.lime;
    // the stream: teal while it is the subject; otherwise contour (the cards on the table are a pile still)
    const fl = full('agents');
    setDim(floodBody, fl ? 0 : 1); setDim(floodEdges, fl ? 0 : 1);
    floodMat.userData.u.uAccent.value = !map && fl ? ACCENT.teal : 0;
    floodCards.castShadow = fl;
    floodCards.material.userData.u.uAccent.value = 0;
    floodCards.material.userData.u.uDim.value = 0;
    for (let i = 0; i < NF; i++) {
      floodCards.setDim(i, fl ? 0 : PILE_REST);
      floodCards.tint(i, 1, -1, -1);
    }
    for (const o of SCENERY) setDim(o, map ? 0 : 1);
  }
  function emphasize(ids) {
    ST.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }
  const atRest = () => sameSet(ST.emph, REST);

  // ================================================================== anchors: labels, words, hotspots, framing
  // the number sits on the lintel's face, at its left end (seen from the landing): on the lintel, not above it, where the
  // phone sees into the next gate; and clear of the right lane, where a task waits and its label goes
  const lintel = (i, up = 0.33) => { const G = gates[i].G; G.updateWorldMatrix(true, false); return G.localToWorld(new V3(0.34, GH + up, GW * 0.8)); };
  // a gate's ring low on its left post: on the near gates it stays clear of the bar's hinge; the far ones, at the top of
  // the closer shot, lower still, so the ring stays below the top bar
  const postMid = (i) => { const G = gates[i].G; G.updateWorldMatrix(true, false); return G.localToWorld(new V3(0.2, GH * (i < 2 ? 0.1 : 0.28), GW)); };
  const cardPt = (N, x, y) => { N.card.group.updateWorldMatrix(true, false); return N.card.group.localToWorld(new V3(x, 0.08, y)); };
  // a card hangs upright: its local x runs across the face, its local z down the face (−z the top row)
  const cardRow = (N, r, x = -0.13) => cardPt(N, x, (r === 0 ? -0.33 : 0.62) * CARD_N.d);
  const gateDecal = (i) => () => {
    const beats = i < 2 ? [0, 1] : [0, 1, 2, 3];
    let on = atRest() ? i === 2 : beats.includes(ST.beat) && (ST.beat > 0 || ST.gateLit[i] > 0.6);
    // 4 行動 waits for 金融交易: while it is held at the bar its name would sit on that lintel; the number comes back
    // as the agent goes on
    if (i === 3 && !atRest() && (ST.beat === 2 || (ST.beat === 3 && ST.t < T4.go[0] + 0.3))) on = false;
    return on ? lintel(i) : null;
  };
  const decalAt = {
    'gate-1': gateDecal(0), 'gate-2': gateDecal(1), 'gate-3': gateDecal(2), 'gate-4': gateDecal(3),
    // the task cards' names: while they are the story's (and on the held result)
    // (not while it flies through the gates: there the numbers on the lintels have the room)
    order: () => (ST.orderOn && ST.orderAt === 'end' && (atRest() || ST.beat <= 1) ? cardRow(order, 0) : null),
    // the status at the card's foot (a row of its own, well clear of the name, also on a small screen)
    'order-note': () => (ST.orderOn && ST.note && (atRest() || ST.beat === 1) ? cardRow(order, 1) : null),
    // its name below the bar, on the middle of the card (the bar crosses the card's top while it waits)
    pay: () => (ST.payOn && ST.payAt !== 'fly' && (atRest() || ST.beat !== 1) ? cardPt(pay, -0.3, 0.1 * CARD_N.d) : null),
    confirm: () => { if (!ST.mini) return null; miniG.updateWorldMatrix(true, false); return miniG.localToWorld(new V3(0, 0, 0.1)); },
  };
  // (to the right of the front one: above it, the label would sit on 3 決策's number)
  const frontRisky = () => (ST.risky[0] ? ST.risky[0].clone().add(new V3(0, AG.r + 0.1, 0)).addScaledVector(sample(SR, HALT[0].u, new V3()), 1.3) : deckPt(HALT[0].u, HALT[0].lane + 1.3, ALT + AG.r));
  const labelAt = {
    agents: frontRisky,
    // over the right shoulder (seen from the landing): the confirmed card is held up on the customer's left
    customer: () => person.top().addScaledVector(S, 0.8).add(new V3(0, -0.5, 0)),
  };
  const parts = {
    customer: { hit: hits.customer, anchor: () => person.chest(), beat: 3 },
    order: { hit: hits.order, anchor: () => cardPt(order, CARD_N.w / 2 + 0.9, 0.15 * CARD_N.d), beat: 1 },
    // its ring on the cubes: the card's face carries the name
    pay: { hit: hits.pay, anchor: () => { pay.grp.updateWorldMatrix(true, false); return pay.grp.localToWorld(new V3(-0.7, AG.r + 0.15, 0)); }, beat: 2 },
    agents: { hit: hits.agents, anchor: frontRisky, beat: 0 },
  };
  gates.forEach((G, i) => { parts[`gate-${i + 1}`] = { hit: hits[`gate-${i + 1}`], anchor: () => postMid(i), beat: i === 2 ? 2 : i === 3 ? 3 : 0 }; });

  // ---- shots: fixed points, so the framing never depends on where the motion happens to be
  // (with the hit proxy's pad, so the measured box stays inside the frame too)
  // the customer: the corners of the world box round their hit proxy (the box the reader taps, as the checks measure it)
  hits.customer.updateWorldMatrix(true, false);
  const custAABB = new THREE.Box3().setFromObject(hits.customer);
  const custBox = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => new V3(x ? custAABB.max.x : custAABB.min.x, y ? custAABB.max.y : custAABB.min.y, z ? custAABB.max.z : custAABB.min.z))));
  const tableBox = [onTable(-1.4, -2.3), onTable(-1.4, 2.3), onTable(1.6, -2.3, -TBL.h), onTable(1.6, 2.3, -TBL.h)];
  const endCards = [-1, 1].flatMap((d) => [
    ORDER_STAND.clone().addScaledVector(S, d * CARD_N.w / 2).add(new V3(0, CARD_N.d / 2, 0)),
    ENDP.pay.clone().addScaledVector(S, d * (CARD_N.w / 2 + (d > 0 ? 1.1 : 0.2))).add(new V3(0, 0.6, 0)),
    ENDP.pay.clone().addScaledVector(S, d * CARD_N.w / 2).add(new V3(0, -CARD_N.d - 0.7, 0)),
  ]);
  const gateBox = (i) => [-1, 1].flatMap((sd) => [deckPt(U_GATE[i], sd * (GW + 0.4), 0), deckPt(U_GATE[i], sd * (GW + 0.4), GH + 0.8)]);
  const landing = [...custBox, ...tableBox, ...endCards];
  const A_PTS = [...landing, ...gateBox(0), ...gateBox(3)];
  const B_PTS = [...landing, ...gateBox(2), ...gateBox(3)];
  // along the chord from gate 1 to the deck's end: seen from there the gates stack up the phone frame
  const chord = O.clone().sub(curve.getPointAt(U_GATE[0])).setY(0).normalize();
  const AZ_C = Math.atan2(chord.z, chord.x);
  const shot = (az, el, pts, margin) => ({ az, el, anchors: () => pts, margin });
  // desktop: from the outer side, west of the landing, about 40° off the line of the gates: the bridge comes down the
  // frame from the upper right, gates 1 → 4 in perspective, to the customer in the foreground; looking down enough
  // (el 0.62) that the bar at 決策 and what waits behind it show above gate 4's lintel, and seen at an angle, the bar
  // reads as a bar (from the broadside it was end-on, a dot)
  const AZ_DESK = 182 * Math.PI / 180;
  const D_PTS = [...landing, ...gateBox(0), ...gateBox(1), ...gateBox(2), ...gateBox(3)];
  const DB_PTS = [...landing, ...gateBox(1), ...gateBox(2), ...gateBox(3)];
  const desk = [shot(AZ_DESK, 0.62, D_PTS), shot(AZ_DESK, 0.64, DB_PTS)];
  // the phone (portrait): from behind the landing along the line of the gates, looking well down (el 0.7) so that each
  // gate's opening shows above the next one's lintel: the bar at 決策 and the task held behind it sit inside gate 3,
  // clear of gate 4.  A (beats 1–2): the whole stack; B (beats 3–4): gates 3–4 and the landing, closer
  const portrait = [shot(AZ_C + 0.15, 0.7, A_PTS), shot(AZ_C, 0.7, B_PTS)];
  // a phone held sideways (the phone layout below 500 px tall) has a wide, short world: any view down the bridge left
  // the customer and the numbers a few pixels, so it looks across the bridge from the sea side, the set laid out
  // left to right
  const AZ_SIDE = 172 * Math.PI / 180;
  // (a slim margin: at the usual 7.5 % the numbers on the far lintels came out under the 10 px the words need)
  const side = [shot(AZ_SIDE, 0.45, D_PTS, 0.03), shot(AZ_SIDE, 0.45, DB_PTS, 0.05)];
  const sideways = () => typeof innerWidth === 'number' && innerWidth > innerHeight;
  const either = (i) => ({
    get az() { return (sideways() ? side : portrait)[i].az; },
    get el() { return (sideways() ? side : portrait)[i].el; },
    anchors: () => (sideways() ? side : portrait)[i].anchors(),
    get margin() { return (sideways() ? side : portrait)[i].margin; },
  });
  const shots = {
    phone: [either(0), either(1)],
    desk,
  };

  function rest() { return pose(LAST, 1); }
  function ambient() { /* the held result stays still */ }

  const api = {
    id: 'gates',
    group: g,
    zone: 'ai',
    // the map pill over the gates (the landing half of the span), its footprint on the deck among them
    anchor: deckPt(0.72, 0, GH + 4),
    pin: deckPt(0.7, 0, 0),
    // accents at full strength over the whole span the stream flies (the shore end is about 34 u from here)
    focus: { pos: deckPt(0.7, 0, 0), r: 34 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    lever: null,
    restParts: REST,
    mainActor: 'customer',
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    curve,
    // for lab and screenshot scripts only; nothing in the app reads it
    _dbg: { person: person.group, order: order.grp, pay: pay.grp, bar, gates: gates.map((G) => G.G), table: table.group, mini: miniG, check: check.group },
  };
  rest();
  emphasize(null);
  return api;
}
