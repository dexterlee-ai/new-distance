// AI 能替人做到哪 · how far an AI Agent may go on its own (articles 22, 18, 15) — a bridge across the AI sea, from the
// brand shore to a customer on the heartland landing, behind a table at the deck's end, a small cash box (a safe) on the
// ground beside them.  Four plain gates stand on the landing end of the span, their step names inside the lintels
// (理解需求 · 推薦 · 決策 · 行動, 22 b39–b42); gate 3 has one long striped barrier across its opening.  The words live in
// world.json.
//
// Every AI Agent is the same machine: a small teal typed quad-drone (a body, four rotor rings, skids, an eye), its
// errand hanging under it on a cable it can let out and reel in.  Told in four beats, picture first (the caption lands
// on the key event, and the result keeps acting while it is read):
//   1  two identical drones drop out of the sky and race down the two lanes, lighting the gates they pass.  The
//      barrier swings down behind the first and slams in front of the second, which carries a coin; the first goes on
//      through 3 and 4 and sets its card (查詢訂單) on the customer's table, the customer never looking up from the
//      phone.  While the caption is read the stopped one keeps trying the barrier, about once a second: it could, it
//      is not allowed (22 b2, b53).
//   2  a red ✕ pops up on that card.  The drone over it lets its cable down and takes the card back up (the caption),
//      the ✕ goes, and it lets the card down again: now it reads 查詢訂單 / 已出貨, and the drone climbs away.  Nobody
//      was needed: a mistake here is simply taken back (22 b54, 18 b27).
//   3  a third drone, carrying medicine (a pill bottle with a cross), comes down the other lane into the same barrier.
//      A typed 確認付款？ hops from the coin's card to the customer's raised phone.  The customer taps (the caption): a
//      lime ✓ flies onto the coin's card, the barrier lifts, the drone goes through 4 行動 to hang high over the cash
//      box and lets the coin go: it falls into the slot, a clunk, the padlock snaps shut.  Then the very move that set
//      the order right: the empty hook ring goes down into the slot, tugs, and comes up with nothing — what is paid
//      cannot be taken back.  The card is set on the box; the barrier is down again in front of the medicine
//      (22 b54, b47; 18 b27).
//   4  the customer holds the phone up again: the next errand (預約門市) comes up out of it, words and all; the drone
//      takes it on its hook (the caption) and flies off with it out of the picture; the customer goes back to the phone
//      (18 b27, b26; 15 b92; 22 b17).
// Held: the order card set right, the locked box with the 金融交易 card and its ✓ on it, the medicine still waiting at
// the barrier, the customer on the phone.
//
// Staging: shot A sees the span from the landing a little off its axis and from above, so the four gates stand one
// behind the other, each name alone, and the barrier's swing reads; shot C (beats 2–4 on a phone held upright; beats
// 3–4 elsewhere, beat 2 there closer, shot B) looks up the bridge from behind the customer: the barrier with what waits
// at it, 4 行動, the table, the box.  Nobody walks the deck.  Everything that explains is a pure function of (beat, k):
// pose().  The group sits at the world origin, so its local frame is the world frame.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, clamp } from './kit.js';
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
/** a pop: 0 → a little past 1 → 1 */
const popK = (x) => { x = clamp(x); const c = 2.2; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

// ------------------------------------------------------------------ the set (world units)
const GH = 5.7;            // gate height: a drone and its errand pass under the lintel
const GHS = [GH, GH, 6.5, GH];   // gate 3 (決策) stands taller: a drone waiting at it is seen under its lintel
const GW = 4.1;            // half the distance between a gate's posts (post centres)
const POST = 0.45;
const LIN_H = 1.45;        // the lintel: deep enough to carry its step's name inside it
const LIN_T = 0.55;
const LIN_W = 2 * GW;      // the stretch of the lintel the name may use
const DECK_W = 9.2;        // the deck carries two lanes
const DECK = 0.225;        // deck top above the bridge curve
const U_GATE = [0.62, 0.715, 0.81, 0.975];
const LANE = 2.0;          // the two lanes (± across the deck: + is screen right seen from the landing)
const FREE = LANE;         // the right lane: it comes out over the table's right part
const WAIT = -LANE;        // the left lane: its barrier comes down first
const AG = 1.42;           // a drone's scale
const ALT = 4.8;           // a drone's centre above the deck
const BAR_X = 0.62;        // the barrier at gate 3: on the landing side of the gate's posts
const BOOM_LEN = 2 * GW - 0.4;         // one long arm across the whole opening
const CABLE = 0.9;         // from a drone's hook to the top of the card it carries: the barrier crosses in between
const CAB_BOX = 0.3;       // beat 3: the coin's drone winds its cable in to hang low and still over the cash box
const CARD_N = { w: 3.4, d: 1.2 };    // an errand's card (金融交易, 醫療建議, 預約門市): wide enough for 4 字
const CARD_O = { w: 4.0, d: 2.2 };     // 查詢訂單's: deep enough for two rows (the task and its result)
const MINI = { w: 3.7, d: 1.3 };
const CARD_T = { w: 3.4, d: 2.0 };    // the next errand's (預約門市): deep enough for its result row too (已預約)       // the question that hops to the customer: wide enough for 確認付款？
const COIN_R = 0.72;
const LINE = 0.3;          // the coin's own line, from the bottom of its card down to the hook ring it hangs from
const RING = 0.34;         // that hook ring (it stays on the line when the coin is let go: the hook comes back empty)
const DROP = 1.35;         // beat 3: from the hanging coin's bottom down to the slot, in open air
const BOX = { w: 2.9, h: 1.85, d: 1.6 };     // the locked cash box the coin is paid into (its slot on top, across)
const BOX_FS = [3.6, 0.85];                 // where it stands on the ground, in front of the table at the customer's side
const H = 5.0;             // the customer
const U0 = 0.545;           // where the drones come down out of the sky onto the deck, short of gate 1
const V = 21;              // their speed along the deck (units per second): fast, but each gate passed can be seen
const T_GO = 0.35;         // beat 1: the race starts as the arrival flight settles
const LEAN = 0.5;          // a card set on the table stands leaning back this far, its face to the customer
const LP = 2.4;            // beat 2: how far the parked drone lets its cable down to reach its card on the table
const LIFT_C = 0.35;       // ... and how short it winds it to take the card back: right up under itself

// ------------------------------------------------------------------ the beats
// Each caption is read for 0.8 s + 0.2 s per 字 from its key event (story.js holdFor); a beat's motion runs on
// through that time, so the picture never stands still under its words.  READ = those holds for the four captions
// (20, 16, 20, 21 字, the comma counted).
const READ = [4.8, 4.0, 4.8, 5.0];
// beat 2: the ✕, the card taken back up on the cable (the caption), the ✕ gone, the card let down again with its
// answer, the cable in, and the drone up and away into the sky; the customer glances at the card and back
const T2 = { x: [0.55, 0.75], lower: [0.8, 1.1], up: [1.1, 1.5], key: 1.4, xoff: [1.5, 1.7], relay: [1.75, 2.15], rows: 2.17, reel: [2.2, 2.5], rise: [2.55, 2.9], away: [2.7, 5.3], glance: [2.9, 3.4], back: [4.4, 5.0] };
// beat 3: the medicine into the same barrier; 確認付款？ from the coin's card to the customer's raised phone; the tap
// and its ✓ (the caption); the ✓ onto the coin's card, the barrier up, through 4 行動 to high over the cash box; the
// coin let go, falling into the slot (a clunk, the padlock snaps shut); the empty hook let down into the slot, a tug or
// two, reeled up with nothing on it; the card propped against the box; up and aside
const T3 = {
  med: 0.15, look: [0.6, 0.9], raise: [0.8, 1.3], hop: [0.7, 1.4], tap: [1.62, 1.78], check: 1.7, key: 1.8,
  fly: [1.85, 2.2], fade: [2.12, 2.32], up: [2.1, 2.35], go: [2.3, 2.6], over: [2.6, 2.95], boomDown: [2.7, 2.95],
  drop: [3.0, 3.36], lock: [3.42, 3.56], fish: [3.7, 4.05], tug: [4.05, 4.4], reel: [4.45, 4.85],
  lay: [4.95, 5.45], lower: [3.0, 3.6], idle: [5.45, 6.2],
};
// beat 4: the phone up again; the next errand comes up out of it, words and all; the drone comes down and takes it on
// its hook (the caption), carries it to the table and sets it there done (已預約: nobody had to look), then climbs
// away; the customer watches it go to the table, glances at it, and goes back to the phone
const T4 = { raise: [0, 0.45], tap: [0.45, 0.6], pop: [0.5, 0.9], rise: [0.85, 1.15], fetch: [0.15, 1.05], grab: 1.1, key: 1.2, over: [1.3, 2.3], lay: [2.3, 2.65], rows: 2.9, park: [2.7, 3.2], away: [3.5, 6.0], watch: [1.3, 1.9], glance: [2.6, 3.1], back: [4.6, 5.3] };
const BEATS = [
  // 1 模型誰都買得到，差別在它被允許自己走幾步 — two identical drones; the barrier stops one at 決策, the other goes
  //   all the way to the table (dur and keyAt are set from the race below)
  { dur: 6.6, keyAt: 1.8, shot: 0, parts: ['agents', 'gate-3', 'pay', 'order', 'gate-1', 'gate-2', 'gate-4', 'customer'] },
  // 2 查訂單錯了收得回，就放手讓它做完 — the ✕, the card taken back up on the cable, let down again: 已出貨
  { dur: T2.key + READ[1], keyAt: T2.key, shot: 1, parts: ['order', 'customer'] },
  // 3 錢和健康錯了收不回，它就停在決策等人點頭 — the medicine stopped too; 確認付款？ to the customer; the tap; the
  //   coin into the locked box and the hook back up empty
  { dur: T3.key + READ[2], keyAt: T3.key, shot: 2, parts: ['pay', 'med', 'gate-3', 'customer'] },
  // 4 正因為它肯停下來問，人才敢把下一件事交給它 — the next errand handed up to the drone, which sets it on the table
  //   done (已預約) and flies off
  { dur: T4.key + READ[3], keyAt: T4.key, shot: 2, parts: ['customer', 'todo', 'agents'] },
];
const LAST = BEATS.length - 1;
// held: the order set right, the cash box with its card and ✓, the medicine still waiting at the barrier, the next
// errand done on the table
const REST = ['customer', 'pay', 'med', 'gate-3', 'gate-4', 'order', 'todo'];

// ------------------------------------------------------------------ shared drawing helpers
const clean = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
/** a bar of square section th from a to b */
function rod(a, b, th = 0.07) {
  const dir = new V3().subVectors(b, a), len = dir.length();
  const geo = new THREE.BoxGeometry(th, len + th, th);
  geo.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, dir.normalize()), new V3(1, 1, 1)));
  return clean(geo);
}
/** the twelve edges of a box (w × h × d, from y0 up, centred on x and z) as thin bars */
function edgeBars(w, h, d, { y0 = 0, th = 0.07, grow = 0.01 } = {}) {
  const bars = [], x = w / 2 + grow, z = d / 2 + grow, y1 = y0 + h;
  const pt = (sx, y, sz) => new V3(sx * x, y, sz * z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bars.push(rod(pt(sx, y0, sz), pt(sx, y1, sz), th));
  for (const y of [y0, y1]) {
    for (const sz of [-1, 1]) bars.push(rod(pt(-1, y, sz), pt(1, y, sz), th));
    for (const sx of [-1, 1]) bars.push(rod(pt(sx, y, -1), pt(sx, y, 1), th));
  }
  return mergeGeometries(bars);
}
/** typed faces told apart by tone (a typed surface has no outline): the top light, the sides a step or two darker */
function faceTones(geo, { top = 1.15, px = 0.55, nx = 0.55, pz = 0.85, nz = 0.85, bottom = 0.5 } = {}) {
  geo = clean(geo);
  const n = geo.attributes.normal, c = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
    const t = y > 0.6 ? top : y < -0.6 ? bottom : Math.abs(x) > Math.abs(z) ? (x > 0 ? px : nx) : (z > 0 ? pz : nz);
    c[i * 3] = t; c[i * 3 + 1] = -1; c[i * 3 + 2] = -1;   // shade multiplier; keep the material's style and accent
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

/**
 * droneGeo() — the one look of an AI that acts here: a quad-drone.  A typed body (a flat box under a smaller one,
 * faces in tones), and in graphite: its edges, four arms on the diagonals, four rotor rings with hubs, two skids, a
 * round eye at the front.  The blades are separate (they turn).  Unit size; its centre at the origin, front +z.
 */
function droneGeo() {
  const body = mergeGeometries([
    faceTones(new THREE.BoxGeometry(1.0, 0.44, 1.0)),
    faceTones(new THREE.BoxGeometry(0.62, 0.2, 0.62).translate(0, 0.32, 0)),
  ]);
  const R = 0.86, RY = 0.3, RR = 0.47;   // the rotors: on the diagonals, a little above the body
  const fr = [edgeBars(1.0, 0.44, 1.0, { y0: -0.22, th: 0.06 })];
  const rotors = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    fr.push(rod(new V3(sx * 0.42, 0.05, sz * 0.42), new V3(sx * R, RY - 0.04, sz * R), 0.14));
    fr.push(clean(new THREE.TorusGeometry(RR, 0.06, 6, 30).rotateX(Math.PI / 2).translate(sx * R, RY, sz * R)));
    fr.push(clean(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 8).translate(sx * R, RY, sz * R)));
    rotors.push(new V3(sx * R, RY + 0.1, sz * R));
  }
  for (const sx of [-1, 1]) {
    fr.push(rod(new V3(sx * 0.4, -0.54, -0.6), new V3(sx * 0.4, -0.54, 0.6), 0.09));
    fr.push(rod(new V3(sx * 0.3, -0.22, -0.3), new V3(sx * 0.4, -0.54, -0.36), 0.075));
    fr.push(rod(new V3(sx * 0.3, -0.22, 0.3), new V3(sx * 0.4, -0.54, 0.36), 0.075));
  }
  // the eye: a round lens on the front face
  fr.push(clean(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 18).rotateX(Math.PI / 2).translate(0, 0.0, 0.52)));
  // the hook under the body
  fr.push(rod(new V3(0, -0.22, 0), new V3(0, -0.5, 0), 0.1));
  const blade = clean(new THREE.BoxGeometry(RR * 1.75, 0.04, 0.12));
  return { body, frame: mergeGeometries(fr), blade, rotors, hookY: -0.5, front: R + RR + 0.03 };
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

/** the $ sign as a raised graphite tube and bar, on both faces of a coin of radius r (faces at ±z); one face only
 * when `one` */
function dollarGeo(r, z, one = false) {
  const s = r * 0.62;
  const pts = [[0.44, 0.48], [0.06, 0.68], [-0.36, 0.56], [-0.42, 0.26], [0.0, 0.03], [0.42, -0.22], [0.38, -0.54], [-0.04, -0.68], [-0.44, -0.48]];
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new V3(x * s, y * s, 0)));
  const tube = clean(new THREE.TubeGeometry(curve, 48, 0.1 * s, 6, false));
  const bar = clean(new THREE.BoxGeometry(0.17 * s, 1.8 * s, 0.14 * s));
  const front = mergeGeometries([tube, bar]).translate(0, 0, z);
  if (one) return front;
  const back = front.clone().rotateY(Math.PI);
  return mergeGeometries([front, back]);
}
/** a big coin (pencil: real money), standing upright facing +z, origin at its centre: a pale face, a dark rim, a $ */
function makeCoin(r = COIN_R, t = 0.26) {
  const g = new THREE.Group(); g.name = 'coin';
  const face = new THREE.Mesh(clean(new THREE.CylinderGeometry(r * 0.84, r * 0.84, t, 36).rotateX(Math.PI / 2)), ink({ shade: 1, bias: 0.3 }));
  const rim = new THREE.Mesh(clean(new THREE.TorusGeometry(r * 0.9, r * 0.11, 8, 44)), ink({ accent: 'ink' }));
  const edge = new THREE.Mesh(clean(new THREE.CylinderGeometry(r, r, t * 0.92, 44, 1, true).rotateX(Math.PI / 2)), ink({ shade: 0.45, bias: 0.05, side: THREE.DoubleSide }));
  const sign = new THREE.Mesh(dollarGeo(r, t / 2 + 0.02), ink({ accent: 'ink' }));
  face.castShadow = rim.castShadow = true; edge.castShadow = sign.castShadow = false;
  g.add(face, rim, edge, sign);
  return { group: g, r };
}
/** a medicine bottle (pencil: a real thing), upright, origin at the top of its cap: a dark cap, a pale body, a label
 * band with a graphite cross on its front and back */
function makeBottle({ r = 0.58, h = 1.2 } = {}) {
  const g = new THREE.Group(); g.name = 'bottle';
  const cap = new THREE.Mesh(clean(new THREE.CylinderGeometry(r * 0.74, r * 0.74, 0.38, 24).translate(0, -0.19, 0)), ink({ accent: 'ink' }));
  const neck = new THREE.Mesh(clean(new THREE.CylinderGeometry(r * 0.6, r * 0.9, 0.16, 24).translate(0, -0.46, 0)), ink({ shade: 0.95, bias: 0.2 }));
  const y0 = -0.54, yc = y0 - h / 2;
  const body = new THREE.Mesh(clean(new THREE.CylinderGeometry(r, r, h, 28).translate(0, yc, 0)), ink({ shade: 0.5, bias: 0.02 }));
  const band = new THREE.Mesh(clean(new THREE.CylinderGeometry(r * 1.03, r * 1.03, h * 0.6, 28, 1, true).translate(0, yc, 0)), ink({ shade: 1, bias: 0.34, side: THREE.DoubleSide }));
  const crossOne = (z) => [clean(new THREE.BoxGeometry(r * 0.95, r * 0.3, 0.12).translate(0, yc, z)), clean(new THREE.BoxGeometry(r * 0.3, r * 0.95, 0.12).translate(0, yc, z))];
  const cross = new THREE.Mesh(mergeGeometries([...crossOne(r * 1.04), ...crossOne(-r * 1.04)]), ink({ accent: 'ink' }));
  for (const m of [cap, neck, body, band, cross]) m.castShadow = m !== band;
  g.add(cap, neck, body, band, cross);
  return { group: g, r, h: 0.54 + h };
}
/** the locked cash box the payment goes into (pencil: a real thing), standing on its base, front +z: a dark body
 * with a paler lid, a black slot across the lid (as wide as a coin is tall), a big $ on a pale plate on the front and a
 * padlock hanging from the lid's front edge.  setLock(k): its shackle from open (0, raised) to shut (1).  What drops
 * in is gone: there is no way to reach it again */
function makeBox({ w = BOX.w, h = BOX.h, d = BOX.d } = {}) {
  const g = new THREE.Group(); g.name = 'box';
  const LT = 0.18;
  const body = new THREE.Mesh(clean(new THREE.BoxGeometry(w, h - LT, d).translate(0, (h - LT) / 2, 0)), ink({ shade: 0.42, bias: 0.04 }));
  const lid = new THREE.Mesh(clean(new THREE.BoxGeometry(w + 0.12, LT, d + 0.12).translate(0, h - LT / 2, 0)), ink({ shade: 0.95, bias: 0.16 }));
  const slot = new THREE.Mesh(clean(new THREE.BoxGeometry(COIN_R * 2.3, 0.05, 0.3).translate(0, h + 0.005, 0)), ink({ accent: 'ink' }));
  // the $ plate, low on the front (the padlock hangs over it, from the lid's edge)
  const PX = 0, PY = 0.55, PS = 0.85;
  const plate = new THREE.Mesh(clean(new THREE.BoxGeometry(PS, PS, 0.06).translate(PX, PY, d / 2 + 0.03)), ink({ shade: 1, bias: 0.34 }));
  const sign = new THREE.Mesh(dollarGeo(PS * 0.78, 0.04, true).translate(PX, PY, d / 2 + 0.03), ink({ accent: 'ink' }));
  // the padlock: a body on a hasp under the lid's edge, its shackle a loop over it
  const LX = 0, LY = h - LT - 0.34;
  const lock = new THREE.Group();
  lock.position.set(LX, LY, d / 2 + 0.12);
  const lbody = new THREE.Mesh(clean(new THREE.BoxGeometry(0.5, 0.42, 0.16)), ink({ shade: 0.7, bias: 0.1 }));
  const shackle = new THREE.Mesh(clean(new THREE.TorusGeometry(0.15, 0.05, 6, 16, Math.PI)), ink({ accent: 'ink' }));
  lock.add(lbody, shackle);
  const hasp = new THREE.Mesh(clean(new THREE.BoxGeometry(0.16, 0.3, 0.08).translate(LX, h - LT - 0.1, d / 2 + 0.05)), ink({ accent: 'ink' }));
  const setLock = (k) => { shackle.position.y = 0.21 + 0.17 * (1 - clamp(k)); lock.updateMatrixWorld(true); };
  setLock(0);
  for (const m of [body, lid]) { m.castShadow = true; m.receiveShadow = true; }
  for (const m of [slot, plate, sign, lbody, shackle, hasp]) m.castShadow = false;
  g.add(body, lid, slot, plate, sign, hasp, lock);
  return { group: g, h, setLock, lockAt: new V3(LX, LY, d / 2 + 0.2) };
}

// ------------------------------------------------------------------ pose vectors (people.js, normalised units)
const hc = (h) => ({ p: h.p.clone(), pole: h.pole.clone(), grip: h.grip.clone() });
function clonePose(v) {
  const fc = (f) => ({ p: f.p.clone(), q: f.q.clone() });
  return {
    hips: { p: v.hips.p.clone(), q: v.hips.q.clone() }, waist: v.waist.clone(), neck: v.neck.clone(), head: v.head.clone(),
    hand: { L: hc(v.hand.L), R: hc(v.hand.R) }, foot: { L: fc(v.foot.L), R: fc(v.foot.R) },
  };
}
const eul = (x, y, z) => new Q().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));

export function buildGates() {
  const g = new THREE.Group();
  g.name = 'gates';

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
    const gh = GHS[i];
    const geo = mergeGeometries([
      new THREE.BoxGeometry(POST, gh, POST).translate(0, gh / 2, GW),
      new THREE.BoxGeometry(POST, gh, POST).translate(0, gh / 2, -GW),
      new THREE.BoxGeometry(LIN_T, LIN_H, 2 * GW + 1.2).translate(0, gh + LIN_H / 2, 0),
      new THREE.BoxGeometry(0.95, 0.2, 0.95).translate(0, 0.1, GW),
      new THREE.BoxGeometry(0.95, 0.2, 0.95).translate(0, 0.1, -GW),
    ].map(clean));
    const m = new THREE.Mesh(geo, ink({ shade: 0.98, bias: 0.12 }));
    m.castShadow = m.receiveShadow = true;
    G.add(m);
    g.add(G);
    return { G, u, mesh: m };
  });
  // the barrier at gate 3: one long striped arm across the whole opening, hinged in a housing on the right post (seen
  // from the landing) on the landing side; up, it stands along the post; down, it lies across both lanes at a drone's
  // height.  Graphite and paper bands (no red: a pause, not a rejection)
  const boom = (() => {
    const grp = new THREE.Group(); grp.name = 'barrier';
    const arm = new THREE.Group();
    const NB = 7, th = 0.52, L0 = 0.4;
    const band = (i) => clean(new THREE.BoxGeometry(th, th, BOOM_LEN / NB + 0.002).translate(0, 0, L0 + (BOOM_LEN * (i + 0.5)) / NB));
    const dark = new THREE.Mesh(mergeGeometries([0, 2, 4, 6].map(band)), ink({ accent: 'ink' }));
    const light = new THREE.Mesh(mergeGeometries([1, 3, 5].map(band)), ink({ shade: 1, bias: 0.32 }));
    dark.castShadow = light.castShadow = true;
    arm.add(dark, light);
    const housing = new THREE.Mesh(clean(new THREE.BoxGeometry(1.0, 1.35, 1.0)), ink({ shade: 0.45, bias: 0.05 }));
    housing.castShadow = true;
    grp.add(arm, housing);
    grp.position.set(BAR_X, ALT, -(GW - 0.05));
    gates[2].G.add(grp);
    return { grp, arm };
  })();
  const BOOM_UP = Math.PI / 2;
  /** the barrier: up 0 (down, across) … BOOM_UP (standing along its post); shake: a knock (local x, to the landing) */
  const setBoom = (up, shake = 0) => { boom.arm.rotation.set(-up, 0, 0); boom.arm.position.x = shake; boom.grp.updateMatrixWorld(true); };

  // ================================================================== the landing: the customer and the table
  // a frame at the deck's end: f into the land (toward the camera of the phone shots), s across (screen right)
  const O = curve.getPointAt(1).clone();
  const F = flatTan(1).clone();
  const S = new V3(F.z, 0, -F.x);
  const land = (f, s, up = null) => { const p = O.clone().addScaledVector(F, f).addScaledVector(S, s); p.y = up === null ? heightAt(p.x, p.z) : up; return p; };
  const YAW_F = Math.atan2(F.x, F.z);          // a group turned by this faces +f (its +z along f)

  // the table where finished errands land: a counter across the deck's end, between it and the customer
  const TBL = { f: 1.0, s: 1.6, w: 8.8, d: 3.2, h: 1.25 };
  const table = P.makeTable({ w: TBL.d, d: TBL.w, h: TBL.h });   // makeTable: w along its x, d along its z
  const tPos = land(TBL.f, TBL.s);
  table.group.position.copy(tPos);
  table.group.rotation.y = YAW_F + Math.PI / 2;                 // its long side across, facing the bridge
  table.material.userData.u.uShadeMul.value = 0.66;             // a darker top: the paper cards on it read as cards
  g.add(table.group);
  const TOP = tPos.y + TBL.h;
  /** a point on the table top: (f, s) in the landing frame, f relative to the table's centre */
  const onTable = (f, s, up = 0) => { const p = tPos.clone().addScaledVector(F, f).addScaledVector(S, s - TBL.s); p.y = TOP + up; return p; };

  // the customer (the one who confirms), behind the table's left part, facing up the bridge
  const CUST_F = 3.0, CUST_S = -1.6;
  const CUST = land(CUST_F, CUST_S);
  const CUST_YAW = YAW_F + Math.PI;
  const person = makePerson({ height: H });
  person.material.userData.u.uShadeBias.value = 0.1;
  const phone = P.makePhone({ h: 0.8 });
  person.hold('R', phone, { rot: [-0.55, Math.PI, 0] });
  person.group.position.copy(CUST);
  person.group.rotation.y = CUST_YAW;
  g.add(person.group);

  // ================================================================== the drones (all the same machine)
  const DG = droneGeo();
  const HOOK = DG.hookY * AG;                 // the hook below a drone's centre
  const FRONT = DG.front * AG;                // from its centre to the front of its front rotors
  /** a card hanging under a drone on `len` of cable, facing its front (+z): its matrix in the drone's frame */
  const cardLocal = (c, len = CABLE) => new M4().compose(new V3(0, HOOK - len - c.d / 2, 0.0), new Q().setFromAxisAngle(XAX, Math.PI / 2), new V3(1, 1, 1));
  const lightCard = (card) => { card.material.userData.u.uShadeBias.value = 0.3; card.material.userData.u.uShadeMul.value = 1.0; };
  function makeDrone(name, CS, seed) {
    const grp = new THREE.Group(); grp.name = name;
    const inner = new THREE.Group(); inner.scale.setScalar(AG);
    const bodyMat = ink({ style: 1, shade: 0.62, accent: 'teal' });
    bodyMat.vertexColors = true;
    const frameMat = ink({ accent: 'ink' });
    const body = new THREE.Mesh(DG.body, bodyMat);
    const frame = new THREE.Mesh(DG.frame, frameMat);
    body.castShadow = frame.castShadow = true;
    inner.add(body, frame);
    const blades = DG.rotors.map((p) => { const m = new THREE.Mesh(DG.blade, frameMat); m.position.copy(p); m.castShadow = false; inner.add(m); return m; });
    grp.add(inner);
    // the cable from the hook down (a unit bar scaled to the length let out)
    const cable = new THREE.Mesh(rod(new V3(0, 0, 0), new V3(0, -1, 0), 0.07), frameMat);
    cable.position.y = HOOK;
    cable.castShadow = false;
    grp.add(cable);
    g.add(grp);
    // the card lives on its own (matrixAutoUpdate off): carried under the drone, then laid down where its task ends.
    // Plain paper, no typed lines: its words are the HTML on it
    const card = P.makeCard({ w: CS.w, d: CS.d, t: 0.06, lines: 0, seed });
    lightCard(card);
    card.group.name = name + '-card';
    card.group.matrixAutoUpdate = false;
    g.add(card.group);
    return { grp, inner, body, bodyMat, frame, blades, cable, card, CS };
  }
  const setCable = (N, len) => { N.cable.visible = len > 0.04; N.cable.scale.set(1, Math.max(1e-3, len + 0.05), 1); };
  const order = makeDrone('order', CARD_O, 3);
  const pay = makeDrone('pay', CARD_N, 11);
  const med = makeDrone('med', CARD_N, 17);
  const DRONES = [order, pay, med];
  // what is at stake: a coin under the 金融交易 card, a medicine bottle under the 醫療建議 card
  const coin = makeCoin();
  coin.group.matrixAutoUpdate = false;
  g.add(coin.group);
  const bottle = makeBottle();
  bottle.group.matrixAutoUpdate = false;
  g.add(bottle.group);
  const CARD_TOP = HOOK - CABLE;                       // a hanging card's top edge (drone frame)
  const BOTTLE_L = new V3(0, CARD_TOP - CARD_N.d - 0.08, 0.12);
  // the coin hangs on its own short line under the 金融交易 card, from a hook ring; let go, it falls, and the ring
  // stays on the line (that is the hook that comes back up empty)
  const lineMat = ink({ accent: 'ink' });
  const payLine = new THREE.Mesh(rod(new V3(0, 0, 0), new V3(0, -1, 0), 0.09), lineMat);
  const payRing = new THREE.Mesh(clean(new THREE.TorusGeometry(RING, 0.085, 6, 22)), lineMat);
  for (const m of [payLine, payRing]) { m.matrixAutoUpdate = false; m.castShadow = false; g.add(m); }
  // the coin's centre below the bottom edge of its card, and the ring's
  const RING_DY = -(LINE + RING), COIN_DY = RING_DY - RING * 0.45 - COIN_R;

  // the red ✕ on the wrong answer (beat 2) and the knocks (a burst of short ink strokes: against the barrier, and the
  // clunk of the coin in the box)
  const cross = P.makeX({ size: 1.15 });
  cross.group.name = 'wrong';
  g.add(cross.group);
  const NBURST = 10;
  const burst = new THREE.InstancedMesh(clean(new THREE.BoxGeometry(0.12, 0.12, 1)).translate(0, 0, 0.5), ink({ accent: 'ink' }), NBURST);
  burst.name = 'knock'; burst.castShadow = false; burst.frustumCulled = false;
  g.add(burst);

  // the question that hops to the customer (paper, small) and the ✓
  const mini = P.makeCard({ w: MINI.w, d: MINI.d, t: 0.05, lines: 0, seed: 5 });
  lightCard(mini);
  mini.group.name = 'confirm';
  const miniG = new THREE.Group(); miniG.name = 'confirm-card';
  mini.group.rotation.x = Math.PI / 2;
  miniG.add(mini.group);
  g.add(miniG);
  const check = makeCheck(0.9);
  g.add(check.group);
  const CHK_BIG = 1.7;       // the ✓ at the phone, before it flies onto the coin's card
  const CHK_ON = new V3(CARD_N.w / 2 - 0.5, 0.12, -CARD_N.d / 2 - 0.3);   // where it rides on that card (card frame: over its top right corner)

  // the customer's next errand: it comes up out of the phone in beat 4 and goes off under the drone
  const todo = P.makeCard({ w: CARD_T.w, d: CARD_T.d, t: 0.06, lines: 0, seed: 31 });
  lightCard(todo);
  todo.group.name = 'todo';
  todo.group.matrixAutoUpdate = false;
  g.add(todo.group);

  // where the finished errands stand on the table, leaning back, their faces to the customer: 查詢訂單 at the back of
  // the right part (where the right lane comes out); the locked box in the middle, the paid card propped against it
  const ONE = new V3(1, 1, 1);
  const propM = (f, s, CS, yaw = 0) => {
    const p = onTable(f, s, (CS.d / 2) * Math.cos(LEAN) + 0.03);
    const q = new Q().setFromAxisAngle(YAX, YAW_F + yaw).multiply(new Q().setFromAxisAngle(XAX, Math.PI / 2 - LEAN));
    return new M4().compose(p, q, ONE);
  };
  const ORDER_M = propM(-0.95, 4.2, CARD_O, -0.1);
  // the cash box: a small safe on the ground in front of the table, at the customer's right (in open view of the
  // camera, low in the picture, so the drone hangs over it well below 4 行動)
  const BOX_F = BOX_FS[0], BOX_S = BOX_FS[1];
  const BOX_Y = land(BOX_F, BOX_S).y;
  /** a point by the box: f, s in the landing frame (f absolute), up above the ground it stands on */
  const atBox = (f, s, up) => { const p = land(BOX_F + f, s); p.y = BOX_Y + up; return p; };
  const box = makeBox();
  box.group.position.copy(atBox(0, BOX_S, 0));
  box.group.rotation.y = YAW_F;
  g.add(box.group);
  const SLOT = atBox(0, BOX_S, BOX.h + 0.02);
  // its card stands on the lid at the end, leaning back a little, face to the customer (the $ and the padlock below
  // it stay in view)
  const LEAN_L = 0.3;
  const PAY_M = new M4().compose(
    atBox(-0.2 - (CARD_N.d / 2) * Math.sin(LEAN_L), BOX_S, BOX.h + (CARD_N.d / 2) * Math.cos(LEAN_L) + 0.02),
    new Q().setFromAxisAngle(YAX, YAW_F).multiply(new Q().setFromAxisAngle(XAX, Math.PI / 2 - LEAN_L)), ONE);

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
    order: boxProxy('order'),
    pay: boxProxy('pay'),
    med: boxProxy('med'),
    todo: boxProxy('todo'),
  };
  gates.forEach((G, i) => { hits[`gate-${i + 1}`] = P.makeHitProxy(G.G, 0.25); });
  // the drones' proxy: one padded box round each drone that is on screen, rewritten as they move
  hits.agents = (() => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const base = one.attributes.position.array;
    const NA = DRONES.length;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(base.length * NA), 3));
    const m = new THREE.Mesh(geo, HID);
    m.name = 'hit:agents'; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.frustumCulled = false;
    const HW = FRONT + 0.2, HH = 0.9 * AG;
    m.userData.place = (centres) => {
      const a = geo.attributes.position.array;
      const first = centres[0] || new V3();
      for (let j = 0; j < NA; j++) {
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
    v.hand.L = hc(pz('stand').hand.L);
    return v;
  };
  const POSE = {
    phone: holdLook(0, 0.42),             // reading the phone, head down: it needs nobody
    note: holdLook(-0.2, -0.42),          // up at the question coming down
    raised: clonePose(pz('raise', { side: 'R' })),
  };
  POSE.raised.hand.L = hc(pz('stand').hand.L);
  POSE.push = clonePose(POSE.raised);
  POSE.push.hand.R.p.add(new V3(0, 0.035, 0.035));
  POSE.table = holdLook(0.15, 0.4);      // looking down at what has landed on the table
  POSE.glance = holdLook(-0.5, 0.3);     // a glance at the card on the table to the right: done, without them
  POSE.watch = clonePose(POSE.raised);   // the phone still up, the head turned after the drone as it goes
  POSE.watch.head.copy(eul(-0.3, -0.25, 0));
  POSE.watch.neck.copy(eul(-0.12, -0.15, 0));
  const blendV = (a, b, k) => person.blend(a, b, sm(k));

  // the raised phone (where the question arrives and the next errand leaves from): measured once on the pose
  const PHONE_UP = (() => {
    person.apply(POSE.raised);
    person.group.position.copy(CUST);
    person.group.rotation.set(0, CUST_YAW, 0);
    person.group.updateMatrixWorld(true);
    return person.hand('R').getWorldPosition(new V3());
  })();
  // the question stands just over the raised phone, its face to the reader
  const NOTE = PHONE_UP.clone().add(new V3(0, MINI.d / 2 + 0.75, 0)).addScaledVector(S, 0.35);
  const NOTE_Q = new Q().setFromAxisAngle(YAX, YAW_F + 0.12);
  // the ✓ shows at the question's right end (its words stay readable until the ✓ leaves)
  const NOTE_CHK = new V3(MINI.w / 2 + 0.7, 0, 0.35).applyQuaternion(NOTE_Q).add(NOTE);
  // the next errand: first at the phone (small), then held up over it, then up to the drone's hook
  const TODO_AT = PHONE_UP.clone().add(new V3(0, 0.1, 0)).addScaledVector(S, CARD_T.w / 2 + 0.55);
  const TODO_UP = TODO_AT.clone().add(new V3(0, 0.5, 0)).addScaledVector(S, 0.2);
  const TODO_0 = PHONE_UP.clone().add(new V3(0, 0.35, 0));
  const UPRIGHT = new Q().setFromAxisAngle(YAX, YAW_F).multiply(new Q().setFromAxisAngle(XAX, Math.PI / 2));

  // ================================================================== the drones' paths (pure functions of (beat, t))
  const ST = { beat: LAST, t: BEATS[LAST].dur, emph: null, lit: [1, 1, 1, 1], orderQ: false, orderSet: true, payAt: 'laid', medOn: true, mini: false, todoQ: false, todoSet: true, boxIn: true };
  const _m = new M4(), _m2 = new M4(), _q = new Q(), _q2 = new Q(), _q3 = new Q(), _s = new V3(1, 1, 1), _p = new V3();
  const ZERO = new V3(1e-4, 1e-4, 1e-4);
  const faceTo = (dir, out = new Q()) => out.setFromUnitVectors(ZAX, _b.copy(dir).setY(0).normalize());
  /** a drone flying along the deck: { p (its centre), q (its front along the bridge) } */
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
  /** in from the sky: dt seconds after its start at u0, at speed v: the frame on the deck (null when past uEnd) */
  const inbound = (dt, lane, out, { u0 = U0, v = V, uEnd = 1, drop = 7 } = {}) => {
    const u = u0 + (dt * v) / LEN;
    if (u >= uEnd) return null;
    onDeck(u, lane, ALT, out);
    out.p.y += (1 - eo(clamp(dt / 0.42))) * drop;     // down out of the sky
    out.s = Math.max(1e-3, eo(clamp(dt / 0.2)));
    return out;
  };
  /** a barrier shudders where it is knocked */
  const wob = (t, at) => (t > at ? 0.13 * Math.sin((t - at) * 34) * Math.exp(-(t - at) * 6) : 0);
  const hover = (T, ph = 0, a = 0.09) => a * Math.sin(T * 3.6 + ph);

  // the waiting lane's drone stops right behind its barrier
  // the body's front against the barrier (its rotors pass over it)
  const U_STOP = U_GATE[2] + dU(BAR_X - 0.27 - 0.6 * AG);
  const BACK = 0.3;
  const W_HOLD = U_STOP - dU(BACK);
  /** up to the barrier at speed and a knock against it: dt since the hit → how far it has come back (units) */
  const knockBack = (dt) => { if (dt <= 0) return 0; const q = clamp(dt / 0.55); return BACK * sm(q) + 1.0 * Math.sin(Math.PI * Math.min(1, q * 1.7)) * (1 - q); };
  // beat 1: the order goes first; the coin a moment later, side by side in the other lane
  const DT_P = T_GO + 0.5;
  const tPassO = T_GO + (U_GATE[2] + dU(BAR_X + 0.35 + FRONT) - U0) * LEN / V;   // the order's drone clear of the barrier
  const tHit = DT_P + (U_STOP - U0) * LEN / V;                 // the coin against it
  const BOOM1 = [tPassO + 0.02, Math.min(tPassO + 0.24, tHit - 0.06)];   // it swings down just ahead of the coin
  const tEnd = T_GO + (1 - U0) * LEN / V;                      // beat 1: the order drone at the deck's end
  const K1 = +(tHit + 0.22).toFixed(2);                        // the caption: one stopped, the other through
  const T1 = { over: [tEnd, tEnd + 0.32], lay: [tEnd + 0.32, tEnd + 0.6], park: [tEnd + 0.62, tEnd + 1.15] };
  // while the caption is read the stopped drone keeps trying the barrier, about once a second: it backs off, dashes
  // at it nose down, is knocked back (a burst, the barrier shudders, the coin swings).  It could; it is not allowed
  const RETRY = [[K1 + 0.7, K1 + 1.4], [K1 + 1.85, K1 + 2.55], [K1 + 3.0, K1 + 3.7], [K1 + 4.1, K1 + 4.75]];
  const HIT_Q = 0.55;                                          // the moment of contact in a try
  const RT = RETRY.map(([a, b]) => a + HIT_Q * (b - a));
  const RAMP = [0.65, 0.6, 0.55, 0.5];
  /** a try at the barrier (q 0...1): [how far from its waiting place along the deck (units), its pitch] */
  const tryAt = (q) => {
    if (q < 0.35) { const k = q / 0.35; return [-0.6 * sm(k), 0.12 * Math.sin(Math.PI * k)]; }
    if (q < HIT_Q) { const k = (q - 0.35) / (HIT_Q - 0.35); return [lerp(-0.6, BACK, ei(k)), -0.26 * Math.sin(Math.PI * 0.5 * k)]; }
    const k = (q - HIT_Q) / (1 - HIT_Q);
    return [BACK * (1 - sm(k)) + 0.35 * Math.sin(Math.PI * Math.min(1, k * 1.6)) * -(1 - k), -0.26 * (1 - sm(k * 1.5)) + 0.1 * Math.sin(Math.PI * k)];
  };
  BEATS[0].keyAt = K1;
  BEATS[0].dur = +(K1 + READ[0]).toFixed(2);
  // where each beat starts on the story's clock (for the rotors and the hover)
  const OFF = BEATS.reduce((a, b, i) => (a.push(i ? a[i - 1] + BEATS[i - 1].dur : 0), a), []);
  // beat 3: the medicine comes down out of the sky between gates 2 and 3, into the right lane, and into its barrier
  const U_MED = U_GATE[1] - dU(1.0);
  const VM = 13;
  const tHitM = T3.med + (U_STOP - U_MED) * LEN / VM;

  // the order card's top edge as it stands on the table; the drone parks right over it (level, low), the length of
  // cable it lets down (LP) above it
  const ORDER_C = new V3().setFromMatrixPosition(ORDER_M);
  const ORDER_TOPE = new V3(0, 0.06, -CARD_O.d / 2).applyMatrix4(ORDER_M);
  const OVER_ORDER = ORDER_C.clone().add(new V3(0, -(HOOK - CABLE - CARD_O.d / 2) + 0.15, 0));
  const PARK = ORDER_TOPE.clone().add(new V3(0, LP - HOOK, 0));
  const SKY2 = PARK.clone().add(new V3(0, 11, 0)).addScaledVector(F, -3);
  // high over the box's slot: the coin hanging DROP above it in open air (the card and the drone well clear of the
  // slot); FISH: the cable it lets out after, to reach the empty hook ring down into the slot
  const HANG = HOOK - CAB_BOX - CARD_N.d;               // there, its card's bottom edge below the drone's centre
  const OVER_BOX = SLOT.clone().add(new V3(0, DROP + COIN_R - (HANG + COIN_DY), 0));
  // FISH: how far the coin's line pays out after, to reach the empty ring down into the slot
  const FISH = DROP + 2 * COIN_R + 0.45 * RING - RING + 0.2;
  const PAY_C = new V3().setFromMatrixPosition(PAY_M);
  const OVER_PAY = PAY_C.clone().add(new V3(0, -(HOOK - CAB_BOX - CARD_N.d / 2) + 0.12, 0));
  const IDLE = onTable(-1.2, 2.4, 3.9);                  // where it waits after: up to the right, clear of the box
  // where the drone takes the next errand over the raised phone; then it flies off with it, low and to the right
  // (clear of the barrier and what waits there), out of the picture
  const AT_HAND = TODO_UP.clone().add(new V3(0, CARD_T.d / 2 - (HOOK - CABLE) + 0.05, 0));
  // where the next errand is set down, done: at the back of the table, left of the order card (clear of the customer
  // in front); the drone over it, then a little higher, then off to the right, low under 4 行動's words, out of the
  // picture (clear of the barrier and what waits there)
  const TODO_M = propM(-0.95, 0.5, CARD_T, 0.04);
  const TODO_C = new V3().setFromMatrixPosition(TODO_M);
  const OVER_TODO = TODO_C.clone().add(new V3(0, -(HOOK - CABLE - CARD_T.d / 2) + 0.15, 0));
  const PARK_T = OVER_TODO.clone().add(new V3(0, 0.9, 0));
  const SKY = PARK_T.clone().add(new V3(0, -0.3, 0)).addScaledVector(S, 12);

  const NA = { p: new V3(), q: new Q(), s: 1 }, F0 = { p: new V3(), q: new Q() };
  const place = (N, f, T, ph) => {
    N.grp.visible = !!f;
    if (!f) return;
    N.grp.position.copy(f.p);
    N.grp.quaternion.copy(f.q);
    N.grp.scale.setScalar(f.s ?? 1);
    N.blades.forEach((b, i) => { b.rotation.y = (i % 2 ? 1 : -1) * (T * 9 + ph) + i * 0.8; });
    N.grp.updateMatrixWorld(true);
  };
  /** the card carried under a drone on `len` of cable (its matrix) */
  const carried = (N, out, len = CABLE, CS = N.CS) => out.compose(N.grp.position, N.grp.quaternion, _s.setScalar(Math.max(1e-3, N.grp.scale.x))).multiply(cardLocal(CS, len));
  const _la = [new V3(), new Q(), new V3()], _lb = [new V3(), new Q(), new V3()], _lc = [new V3(), new Q(), new V3()];
  const lerpM = (a, b, k, out) => { a.decompose(..._la); b.decompose(..._lb); return out.compose(_la[0].lerp(_lb[0], k), _la[1].slerp(_lb[1], k), _la[2].lerp(_lb[2], k)); };
  /** something hanging under a drone at local point L, upright (yaw only) */
  const hangM = (N, L, out) => {
    const k = Math.max(1e-3, N.grp.scale.x);
    _p.copy(L).multiplyScalar(k).applyQuaternion(N.grp.quaternion).add(N.grp.position);
    const yaw = new THREE.Euler().setFromQuaternion(N.grp.quaternion, 'YXZ').y;
    return out.compose(_p, _q.setFromAxisAngle(YAX, yaw), _s.setScalar(k));
  };

  /** 查詢訂單's drone: beat 1 all the way down the right lane, its card set on the table, then parked over it;
   * beat 2 the card reeled back up and let down again, then away */
  function orderFrame(beat, t, out) {
    out.s = 1;
    const T = OFF[beat] + t;
    if (beat === 0) {
      if (t < T_GO) return null;
      const f = inbound(t - T_GO, FREE, out);
      if (f) return f;
      onDeck(1, FREE, ALT, F0);
      if (t < T1.lay[1]) {
        arcTo(F0.p, F0.q, OVER_ORDER, YAW_F, seg(t, T1.over[0], T1.over[1]), out, 0.4);
        out.p.y -= 0.25 * Math.sin(Math.PI * seg(t, T1.lay[0], T1.lay[1]));   // a dip as it lets go
        return out;
      }
      out.q.setFromAxisAngle(YAX, YAW_F);
      out.p.copy(OVER_ORDER).lerp(PARK, ss(t, T1.park[0], T1.park[1]));
      out.p.y += hover(T) * ss(t, T1.park[1] - 0.2, T1.park[1] + 0.3);
      return out;
    }
    if (beat === 1) {
      out.q.setFromAxisAngle(YAX, YAW_F);
      // parked over its card while it reaches down for it and lets it down again (still: the cable does the work)
      const still = 1 - ss(t, T2.lower[0] - 0.25, T2.lower[0]) + ss(t, T2.reel[1], T2.reel[1] + 0.3);
      out.p.copy(PARK); out.p.y += hover(T) * clamp(still);
      if (t < T2.rise[0]) return out;
      // its task done: up, and away into the sky over the bridge, out of the picture
      const k = seg(t, T2.away[0], T2.away[1]);
      if (k >= 1) return null;
      out.p.y += 1.4 * ss(t, T2.rise[0], T2.rise[1]);
      out.p.lerp(SKY2, 0.45 * k + 0.55 * k * k);
      out.q.multiply(_q3.setFromAxisAngle(XAX, -0.14 * Math.sin(Math.PI * Math.min(1, k * 1.4))));
      return out;
    }
    return null;
  }
  /** beat 2: the cable the order drone has let out */
  const orderCable = (t) => {
    if (t < T2.up[0]) return LP * ss(t, T2.lower[0], T2.lower[1]);
    if (t < T2.relay[0]) return lerp(LP, LIFT_C, ss(t, T2.up[0], T2.up[1]));
    if (t < T2.reel[0]) return lerp(LIFT_C, LP, ss(t, T2.relay[0], T2.relay[1]));
    return LP * (1 - ss(t, T2.reel[0], T2.reel[1]));
  };

  /** the cable the coin's drone has let out: beat 3, after the coin is let go, the empty hook down into the slot, a
   * tug or two, and up again with nothing on it; reeled in once its card is propped; beat 4 let down for the next errand */
  const payCable = (beat, t) => {
    if (beat < 2) return CABLE;
    if (beat === 2) {
      if (t < T3.lay[1]) return lerp(CABLE, CAB_BOX, ss(t, T3.over[0], T3.over[1]));
      return CAB_BOX * (1 - ss(t, T3.lay[1], T3.lay[1] + 0.3));
    }
    if (t < T4.grab) return CABLE * ss(t, T4.fetch[1] - 0.35, T4.grab);
    return CABLE * (1 - ss(t, T4.lay[1], T4.lay[1] + 0.3));
  };


  /** the coin's own line under its card: beat 3, after the coin is let go, paid out until the empty ring is down in the
   * slot, a tug or two, and wound up again with nothing on it */
  const payLineLen = (beat, t) => {
    if (beat !== 2 || t < T3.fish[0]) return LINE;
    if (t < T3.tug[0]) return LINE + FISH * ss(t, T3.fish[0], T3.fish[1]);
    if (t < T3.reel[0]) return LINE + FISH - 0.34 * Math.abs(Math.sin(2 * Math.PI * seg(t, T3.tug[0], T3.tug[1])));
    return LINE + FISH * (1 - ss(t, T3.reel[0], T3.reel[1]));
  };

  /** the coin's drone: beat 1 stopped by the barrier (and trying it once more); waits; beat 3 through 4 行動 to the
   * box once the customer has said yes, the coin let fall into its slot, the card propped against it; beat 4 up to the
   * raised phone for the next errand and away with it */
  function payFrame(beat, t, out) {
    out.s = 1;
    const T = OFF[beat] + t;
    if (beat === 0) {
      if (t < DT_P) return null;
      const f = inbound(t - DT_P, WAIT, out, { uEnd: U_STOP });
      if (f) return f;
      // knocked back; then it tries again, and again: it could go on, it is not allowed to
      let off = 0, pitch = 0, on = 0;
      for (const [a, b] of RETRY) if (t >= a && t < b) { [off, pitch] = tryAt(seg(t, a, b)); on = 1; }
      onDeck(U_STOP - dU(knockBack(t - tHit)) + dU(off), WAIT, ALT, out);
      if (pitch) out.q.multiply(_q3.setFromAxisAngle(XAX, -pitch));
      out.p.y += hover(T) * ss(t, tHit + 0.5, tHit + 0.9) * (on ? 0.3 : 1);
      return out;
    }
    if (beat === 1) { onDeck(W_HOLD, WAIT, ALT, out); out.p.y += hover(T); return out; }
    if (beat === 2) {
      if (t < T3.go[0]) { onDeck(W_HOLD, WAIT, ALT, out); out.p.y += hover(T) * (1 - ss(t, T3.up[0], T3.go[0])); return out; }
      if (t < T3.go[1]) { onDeck(lerp(W_HOLD, 1, ss(t, T3.go[0], T3.go[1])), WAIT, ALT, out); return out; }
      onDeck(1, WAIT, ALT, F0);
      if (t < T3.over[1]) { arcTo(F0.p, F0.q, OVER_BOX, YAW_F, seg(t, T3.over[0], T3.over[1]), out, 0.8); return out; }
      _q.setFromAxisAngle(YAX, YAW_F);
      if (t < T3.reel[1]) {
        // held still high over the slot while the coin falls and the hook fishes for it (only a little lift, lighter)
        out.q.copy(_q);
        out.p.copy(OVER_BOX);
        out.p.y += 0.16 * Math.sin(Math.PI * seg(t, T3.drop[0], T3.drop[0] + 0.35));
        return out;
      }
      if (t < T3.lay[1]) {
        arcTo(OVER_BOX, _q.clone(), OVER_PAY, YAW_F, seg(t, T3.reel[1] + 0.05, T3.lay[0] + 0.2), out, 0.3);
        out.p.y -= 0.22 * Math.sin(Math.PI * seg(t, T3.lay[0], T3.lay[1]));
        return out;
      }
      out.q.copy(_q);
      out.p.copy(OVER_PAY).lerp(IDLE, ss(t, T3.idle[0], T3.idle[1]));
      out.p.y += Math.sin(Math.PI * ss(t, T3.idle[0], T3.idle[1])) * 0.6 + hover(T) * ss(t, T3.idle[1] - 0.2, T3.idle[1] + 0.3);
      return out;
    }
    // beat 4
    _q.setFromAxisAngle(YAX, YAW_F);
    if (t < T4.grab) {
      arcTo(IDLE, _q.clone(), AT_HAND, YAW_F, seg(t, T4.fetch[0], T4.fetch[1]), out, 0.6);
      out.p.y += hover(T) * (1 - ss(t, T4.fetch[0], T4.fetch[0] + 0.3));
      return out;
    }
    // the errand to the table, set down there done, a little higher, then off to the right and out of the picture
    if (t < T4.lay[1]) {
      arcTo(AT_HAND, _q.clone(), OVER_TODO, YAW_F, seg(t, T4.over[0], T4.over[1]), out, 0.8);
      out.p.y -= 0.25 * Math.sin(Math.PI * seg(t, T4.lay[0], T4.lay[1]));
      return out;
    }
    const k = seg(t, T4.away[0], T4.away[1]);
    if (k >= 1) return null;
    out.q.copy(_q);
    out.p.copy(OVER_TODO).lerp(PARK_T, ss(t, T4.park[0], T4.park[1]));
    out.p.y += hover(T) * ss(t, T4.park[1] - 0.2, T4.park[1] + 0.3) * (1 - k);
    out.p.lerp(SKY, 0.25 * k + 0.75 * k * k);
    out.s = 1 - ss(k, 0.88, 1);
    return out;
  }

  /** the medicine's drone: beat 3 down out of the sky into the right lane and into its barrier; waits */
  function medFrame(beat, t, out) {
    out.s = 1;
    if (beat < 2) return null;
    const T = OFF[beat] + t;
    if (beat === 2) {
      const dt = t - T3.med;
      if (dt < 0) return null;
      const f = inbound(dt, FREE, out, { u0: U_MED, v: VM, uEnd: U_STOP, drop: 6 });
      if (f) return f;
      onDeck(U_STOP - dU(knockBack(t - tHitM) * 0.8), FREE, ALT, out);
      out.p.y += hover(T, 1.3) * ss(t, tHitM + 0.5, tHitM + 0.9);
      return out;
    }
    onDeck(W_HOLD, FREE, ALT, out);
    out.p.y += hover(T, 1.3);
    return out;
  }

  /** the barrier coming down: it falls (accelerating), hits its rest and kicks up once */
  const fall = (t, a, b) => { const k = seg(t, a, b); return k < 1 ? ei(k) : 1 - 0.1 * Math.sin(Math.PI * seg(t, b, b + 0.18)); };
  /** the barrier (0 down … BOOM_UP up) and its shake at (beat, t) */
  function boomAt(beat, t) {
    if (beat === 0) return [BOOM_UP * (1 - fall(t, BOOM1[0], BOOM1[1])), wob(t, tHit) + RT.reduce((a, r, i) => a + RAMP[i] * wob(t, r), 0)];
    if (beat === 1) return [0, 0];
    if (beat === 2) return [BOOM_UP * (ss(t, T3.up[0], T3.up[1]) - fall(t, T3.boomDown[0], T3.boomDown[1]) * ss(t, T3.up[0], T3.up[1])), wob(t, tHitM) * 0.8];
    return [0, 0];
  }

  // ================================================================== pose
  /** pure: every explanatory transform for (beat, k) */
  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const t = k * BEATS[beat].dur;
    const T = OFF[beat] + t;

    // ---- the gates light far to near as the drones go through them (beat 1)
    for (let i = 0; i < 4; i++) {
      const tp = T_GO + (U_GATE[i] - U0) * LEN / V;
      ST.lit[i] = beat > 0 ? 1 : ss(t, tp - 0.1, tp + 0.06);
    }

    // ---- the barrier
    { const [up, sh] = boomAt(beat, t); setBoom(up, sh); }

    // ---- 查詢訂單
    const fo = orderFrame(beat, t, NA);
    place(order, fo, T, 0);
    {
      const C = order.card.group;
      let cab = 0;
      if (beat === 0) {
        if (t < T1.lay[0]) { carried(order, C.matrix); cab = CABLE; }
        else if (t < T1.lay[1]) { lerpM(carried(order, _m2), ORDER_M, sm(seg(t, T1.lay[0], T1.lay[1])), C.matrix); cab = CABLE; }
        else C.matrix.copy(ORDER_M);
      } else if (beat === 1) {
        cab = orderCable(t);
        if (t < T2.up[0] || t >= T2.relay[1]) C.matrix.copy(ORDER_M);
        else if (t < T2.up[1]) lerpM(ORDER_M, carried(order, _m2, LIFT_C), sm(seg(t, T2.up[0], T2.up[1])), C.matrix);
        else if (t < T2.relay[0]) carried(order, C.matrix, LIFT_C);
        else lerpM(carried(order, _m2, LIFT_C), ORDER_M, sm(seg(t, T2.relay[0], T2.relay[1])), C.matrix);
      } else C.matrix.copy(ORDER_M);
      if (fo) setCable(order, cab);
      C.visible = !!fo || beat > 0 || t >= T1.lay[0];
      C.matrixWorldNeedsUpdate = true;
      C.updateMatrixWorld(true);
      // its words: 查詢訂單 once it is on the table (and while it is reeled back), both rows once it is set right
      const laid0 = beat === 0 ? t >= T1.lay[0] : beat === 1 && t < T2.rows;
      ST.orderSet = beat > 1 || (beat === 1 && t >= T2.rows);
      ST.orderQ = laid0 && !ST.orderSet;
      const c = new V3().setFromMatrixPosition(C.matrix);
      hits.order.userData.set(c, CARD_O.w + 0.5, CARD_O.d + 0.6, CARD_O.w + 0.5);
      pickable(hits.order, C.visible);
    }
    // ---- the red ✕ on the wrong answer: pops up on the card's answer row, goes up with the card as it is taken back,
    // and is gone before the card comes down again
    {
      const on = beat === 1 && t >= T2.x[0] && t < T2.xoff[1];
      cross.group.visible = on;
      if (on) {
        const kx = popK(seg(t, T2.x[0], T2.x[1])) * (1 - ss(t, T2.xoff[0], T2.xoff[1]));
        const C = order.card.group;
        // in the second row's place, where the answer is written (it was wrong); just in front of the card's face
        cross.group.position.copy(cardAt(C, -CARD_O.w / 2 + 1.0, 0.26 * CARD_O.d)).addScaledVector(_a.set(0, 1, 0).transformDirection(C.matrix), 0.2);
        C.matrix.decompose(_la[0], _la[1], _la[2]);
        cross.group.quaternion.copy(_la[1]).multiply(_q.setFromAxisAngle(XAX, -Math.PI / 2));
        cross.group.scale.setScalar(Math.max(1e-3, kx));
      }
    }

    // ---- the coin's drone (金融交易): its card, the coin on its line and ring, the cash box and its padlock
    const fp = payFrame(beat, t, NA);
    place(pay, fp, T, 0.7);
    const payLaid = beat === 3 || (beat === 2 && t >= T3.lay[1]);
    const coinIn = beat === 3 || (beat === 2 && t >= T3.drop[1]);
    let clunk = -1, click = -1;
    {
      const C = pay.card.group;
      const cab = payCable(beat, t);
      if (payLaid) C.matrix.copy(PAY_M);
      else if (beat === 2 && t >= T3.lay[0]) lerpM(carried(pay, _m2, cab), PAY_M, sm(seg(t, T3.lay[0], T3.lay[1])), C.matrix);
      else if (fp) carried(pay, C.matrix, cab);
      const payOn = !!fp || payLaid;
      C.visible = payOn;
      C.matrixWorldNeedsUpdate = true;
      C.updateMatrixWorld(true);
      if (fp) setCable(pay, cab);
      // the line and its ring under the card (taken in as the card is propped against the box), the coin on the ring
      const lk = beat === 2 ? 1 - ss(t, T3.lay[0], T3.lay[0] + 0.25) : 1;
      const lineOn = payOn && beat < 3 && lk > 0.02;
      const bot = new V3(0, 0, CARD_N.d / 2).applyMatrix4(C.matrix);      // the card's bottom edge, middle
      const yaw = new THREE.Euler().setFromQuaternion(pay.grp.quaternion, 'YXZ').y;
      // it swings as the drone slams into the barrier, and with every try after
      let sw = 0;
      if (beat === 0) for (const [t1, amp] of [[tHit, 0.32], ...RT.map((r) => [r, 0.2])]) if (t > t1) sw += amp * Math.sin((t - t1) * 12) * Math.exp(-(t - t1) * 3.5);
      const qy = new Q().setFromAxisAngle(YAX, yaw), qs = qy.clone().multiply(_q3.setFromAxisAngle(XAX, sw));
      const axis = new V3(1, 0, 0).applyQuaternion(qy);
      const swing = (p) => (sw ? p.sub(bot).applyAxisAngle(axis, sw).add(bot) : p);
      const LL = payLineLen(beat, t);
      payLine.matrix.compose(bot, qs, _s.set(1, Math.max(1e-3, LL * lk), 1));
      payRing.matrix.compose(swing(bot.clone().add(new V3(0, -(LL + RING) * lk, 0))), qs, _s.setScalar(Math.max(1e-3, lk)));
      payLine.visible = payRing.visible = lineOn;
      payLine.matrixWorldNeedsUpdate = payRing.matrixWorldNeedsUpdate = true;
      const Cn = coin.group;
      const coinOn = payOn && !coinIn;
      if (coinOn) {
        let cc = swing(bot.clone().add(new V3(0, COIN_DY, 0)));
        if (beat === 2 && t >= T3.drop[0]) {
          // let go: straight down into the slot, faster and faster; the lid hides it as it goes in
          const fk = seg(t, T3.drop[0], T3.drop[1]);
          cc = SLOT.clone().add(new V3(0, DROP + COIN_R - ei(fk) * (DROP + 2 * COIN_R + 0.3), 0));
        }
        Cn.matrix.compose(cc, qs, _s.setScalar(1));
      }
      Cn.visible = coinOn;
      Cn.matrixWorldNeedsUpdate = true;
      ST.boxIn = coinIn;
      if (beat === 2 && t >= T3.drop[1] && t < T3.drop[1] + 0.42) clunk = (t - T3.drop[1]) / 0.42;
      if (beat === 2 && t >= T3.lock[1] && t < T3.lock[1] + 0.34) click = (t - T3.lock[1]) / 0.34;
      // the box gives a little under the clunk; then its padlock snaps shut
      box.group.scale.set(1, 1 - 0.07 * Math.sin(Math.PI * clamp(clunk < 0 ? 0 : clunk * 2)), 1);
      box.setLock(beat === 3 ? 1 : beat === 2 ? ei(seg(t, T3.lock[0], T3.lock[1])) : 0);
      box.group.updateMatrixWorld(true);
      ST.payAt = payLaid ? 'laid' : beat === 0 && t < tHit ? 'fly' : beat === 2 && t >= T3.go[0] ? 'go' : 'halt';
      // the proxy: round the hanging card and coin; at the end round the box and its card
      if (payLaid) hits.pay.userData.set(atBox(0, BOX_S, (BOX.h + CARD_N.d) / 2), CARD_N.w + 0.4, BOX.h + CARD_N.d + 0.4, BOX.d + 0.6);
      else {
        const c0 = new V3().setFromMatrixPosition(C.matrix), c1 = coinOn ? new V3().setFromMatrixPosition(Cn.matrix) : bot;
        hits.pay.userData.set(c0.clone().lerp(c1, 0.5), CARD_N.w + 0.4, c0.distanceTo(c1) + CARD_N.d / 2 + COIN_R + 0.6, CARD_N.w + 0.4);
      }
      pickable(hits.pay, payOn);
    }

    // ---- the medicine's drone (醫療建議)
    const fm = medFrame(beat, t, NA);
    place(med, fm, T, 1.4);
    {
      const C = med.card.group;
      if (fm) { carried(med, C.matrix); setCable(med, CABLE); }
      C.visible = !!fm;
      C.matrixWorldNeedsUpdate = true;
      const Cb = bottle.group;
      if (fm) hangM(med, BOTTLE_L, Cb.matrix);
      Cb.visible = !!fm;
      Cb.matrixWorldNeedsUpdate = true;
      ST.medOn = !!fm;
      if (fm) hits.med.userData.set(fm.p.clone().add(new V3(0, (HOOK - CABLE - CARD_N.d - bottle.h) / 2, 0)), CARD_N.w + 0.4, CABLE + CARD_N.d + bottle.h + 0.8, CARD_N.w + 0.4);
      pickable(hits.med, !!fm);
    }

    // ---- the bursts: a drone against the barrier, or the coin's clunk in the box
    {
      const hitsAt = beat === 0 ? [[tHit, 1, WAIT], ...RT.map((r, i) => [r, RAMP[i], WAIT])] : beat === 2 ? [[tHitM, 0.8, FREE]] : [];
      let kb = -1, amp = 1, ln = WAIT;
      for (const [t1, a, l] of hitsAt) if (t >= t1 && t < t1 + 0.42) { kb = (t - t1) / 0.42; amp = a; ln = l; }
      let c = deckPt(U_GATE[2] + dU(BAR_X - 0.3), ln, ALT);
      const tg = flatTan(U_STOP, new V3()), up = new V3(0, 1, 0);
      let acr = new V3().crossVectors(tg, up).normalize();
      let r0k = 0.8, lenk = 1.2;
      if (clunk >= 0) { kb = clunk; amp = 0.75; c = SLOT.clone().add(new V3(0, 0.15, 0)); acr = S.clone(); r0k = 0.7; lenk = 1.0; }
      else if (click >= 0) { kb = click; amp = 0.45; c = box.group.localToWorld(box.lockAt.clone()); acr = S.clone(); r0k = 0.32; lenk = 0.8; }
      for (let i = 0; i < NBURST; i++) {
        if (kb < 0) { burst.setMatrixAt(i, _m.compose(O, _q.identity(), ZERO)); continue; }
        // the clunk sprays up and to the sides only (the box is below it)
        const a = clunk >= 0 || click >= 0 ? (i / (NBURST - 1)) * Math.PI : (i / NBURST) * Math.PI * 2 + 0.3;
        const dir = new V3().addScaledVector(up, Math.sin(a)).addScaledVector(acr, Math.cos(a)).normalize();
        const r0 = (r0k + 1.7 * eo(kb)) * AG, len = (lenk * (1 - kb) + 0.1) * amp * AG;
        _q.setFromUnitVectors(ZAX, dir);
        burst.setMatrixAt(i, _m.compose(c.clone().addScaledVector(dir, r0), _q, _s.set(1, 1, len)));
      }
      burst.instanceMatrix.needsUpdate = true;
    }

    // ---- the drones' proxy
    const centres = [];
    for (const N of DRONES) if (N.grp.visible && N.grp.scale.x > 0.3) centres.push(N.grp.position.clone());
    hits.agents.userData.place(centres);
    pickable(hits.agents, centres.length > 0);

    // ---- the customer: reads the phone (beats 1-2: nobody is needed); looks up at the question coming down and holds
    // the phone up to it; taps; lowers it and looks at the table as the coin goes in; beat 4 holds it up again, the
    // next errand goes up out of it; watches the drone go, then back to the phone
    let v;
    if (beat === 0) v = POSE.phone;
    else if (beat === 1) v = blendV(blendV(POSE.phone, POSE.glance, seg(t, T2.glance[0], T2.glance[1])), POSE.phone, seg(t, T2.back[0], T2.back[1]));
    else if (beat === 2) {
      if (t < T3.raise[0]) v = blendV(POSE.phone, POSE.note, seg(t, T3.look[0], T3.look[1]));
      else if (t < T3.tap[0]) v = blendV(blendV(POSE.phone, POSE.note, seg(t, T3.look[0], T3.look[1])), POSE.raised, seg(t, T3.raise[0], T3.raise[1]));
      else if (t < T3.tap[1]) v = blendV(POSE.raised, POSE.push, Math.sin(Math.PI * seg(t, T3.tap[0], T3.tap[1])));
      else v = blendV(POSE.raised, POSE.table, seg(t, T3.lower[0], T3.lower[1]));
    } else {
      if (t < T4.tap[0]) v = blendV(POSE.table, POSE.raised, seg(t, T4.raise[0], T4.raise[1]));
      else if (t < T4.tap[1]) v = blendV(POSE.raised, POSE.push, Math.sin(Math.PI * seg(t, T4.tap[0], T4.tap[1])));
      else if (t < T4.glance[0]) v = blendV(POSE.raised, POSE.watch, seg(t, T4.watch[0], T4.watch[1]));
      else if (t < T4.back[0]) v = blendV(POSE.watch, POSE.table, seg(t, T4.glance[0], T4.glance[1]));
      else v = blendV(POSE.table, POSE.phone, seg(t, T4.back[0], T4.back[1]));
    }
    person.apply(v);
    person.group.position.copy(CUST);
    person.group.rotation.set(0, CUST_YAW, 0);
    person.group.updateMatrixWorld(true);

    // ---- the next errand: up out of the raised phone (beat 4), its words on it from the start, held up beside the
    // phone, taken on the drone's hook, carried to the table and set down there, where its result shows: 已預約
    {
      const Tg = todo.group;
      const on = beat === 3 && t >= T4.pop[0];
      if (on) {
        if (t >= T4.lay[1]) Tg.matrix.copy(TODO_M);
        else if (t >= T4.lay[0]) lerpM(carried(pay, _m2, CABLE, CARD_T), TODO_M, sm(seg(t, T4.lay[0], T4.lay[1])), Tg.matrix);
        else if (t >= T4.grab) carried(pay, Tg.matrix, CABLE, CARD_T);
        else {
          const pk = popK(seg(t, T4.pop[0], T4.pop[1]));
          const p = TODO_0.clone().lerp(TODO_AT, eo(seg(t, T4.pop[0], T4.pop[1]))).lerp(TODO_UP, ss(t, T4.rise[0], T4.rise[1]));
          Tg.matrix.compose(p, UPRIGHT, _s.setScalar(Math.max(1e-3, pk)));
        }
      }
      Tg.visible = on;
      Tg.matrixWorldNeedsUpdate = true;
      Tg.updateMatrixWorld(true);
      ST.todoSet = on && t >= T4.rows;
      ST.todoQ = on && t >= T4.pop[0] + 0.12 && !ST.todoSet;
      const c = new V3().setFromMatrixPosition(Tg.matrix);
      hits.todo.userData.set(c, CARD_T.w + 0.5, CARD_T.d + 0.6, CARD_T.w + 0.5);
      pickable(hits.todo, on);
    }

    // ---- the question: pops out under the halted coin card, words and all, and hops to over the customer's raised
    // phone (beat 3); it stays there, moving with the phone, until the ✓ has left it, then folds away
    let miniOn = false;
    if (beat === 2 && t >= T3.hop[0] && t < T3.fade[1]) {
      const h = seg(t, T3.hop[0], T3.hop[1]);
      const from = new V3().setFromMatrixPosition(pay.card.group.matrix).add(new V3(0, -CARD_N.d - 0.5, 0));
      const ph = person.hand('R').getWorldPosition(new V3()).sub(PHONE_UP);
      const to = NOTE.clone().add(ph.multiplyScalar(ss(t, T3.raise[0], T3.raise[1])));
      miniG.position.copy(from).lerp(to, sm(h));
      miniG.position.y += Math.sin(Math.PI * sm(h)) * 1.6;
      miniG.scale.setScalar(Math.max(1e-3, popK(clamp(h / 0.22)) * (1 - ss(t, T3.fade[0], T3.fade[1]))));
      miniOn = true;
    }
    miniG.quaternion.copy(NOTE_Q);
    miniG.visible = miniOn;
    // its words from the moment it is full size until it folds below that
    ST.mini = miniOn && seg(t, T3.hop[0], T3.hop[1]) >= 0.16 && miniG.scale.x >= 0.82;

    // ---- the ✓: pops up beside the question at the tap, flies onto the coin's card (its right end, on its face) and
    // stays there, through 4 行動, into the box and propped against it, always turned the way the card is
    let chkOn = false;
    if (beat === 3 || (beat === 2 && t >= T3.check)) {
      const C = pay.card.group;
      _m.copy(C.matrix).multiply(_m2.compose(CHK_ON, _q.setFromAxisAngle(XAX, -Math.PI / 2), ONE));
      _m.decompose(_lc[0], _lc[1], _lc[2]);
      const fk = beat === 3 ? 1 : sm(seg(t, T3.fly[0], T3.fly[1]));
      check.group.position.copy(NOTE_CHK).lerp(_lc[0], fk);
      check.group.position.y += Math.sin(Math.PI * fk) * 1.4;
      check.group.quaternion.copy(NOTE_Q).slerp(_lc[1], fk);
      const p0 = beat === 3 ? 1 : ss(t, T3.check, T3.check + 0.12);
      check.group.scale.setScalar(Math.max(1e-3, (0.6 + 0.4 * p0) * (1 + 0.25 * Math.sin(Math.PI * p0)) * lerp(CHK_BIG, 1, fk)));
      chkOn = true;
    }
    check.group.visible = chkOn;

    Object.assign(ST, { beat, t });
    applyEmphasis();
    return api;
  }

  // ================================================================== emphasis by subtraction
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
    gates.forEach((G, i) => setDim(G.G, full(`gate-${i + 1}`) ? (story1 ? 1 - ST.lit[i] : 0) : 1));
    setDim(person.group, full('customer') ? 0 : 1);
    // the question is the customer's (it arrives on their phone)
    setDim(miniG, full('customer') || full('pay') ? 0 : 1);
    mini.material.userData.u.uAccent.value = !map && (full('customer') || full('pay')) ? ACCENT.teal : 0;
    // a drone is drawn in full when the drones or its own errand are the subject; an errand's card in teal paper
    // whenever it is in the picture's subject, so it stands off the table
    for (const [N, id] of [[order, 'order'], [pay, 'pay'], [med, 'med']]) {
      const on = full(id) || full('agents');
      setDim(N.grp, on ? 0 : 1);
      N.bodyMat.userData.u.uAccent.value = !map && on ? ACCENT.teal : 0;
      setDim(N.card.group, full(id) ? 0 : 1);
      N.card.material.userData.u.uAccent.value = !map && full(id) ? ACCENT.teal : 0;
    }
    setDim(coin.group, full('pay') ? 0 : 1);
    setDim(payLine, full('pay') ? 0 : 1);
    setDim(box.group, full('pay') ? 0 : 1);
    setDim(bottle.group, full('med') ? 0 : 1);
    setDim(burst, 0);
    setDim(cross.group, 0);
    setDim(todo.group, full('todo') ? 0 : 1);
    todo.material.userData.u.uAccent.value = !map && full('todo') ? ACCENT.teal : 0;
    // the ✓ is the customer's mark: lime whenever it is there and the district is in focus
    setDim(check.group, 0);
    check.material.userData.u.uAccent.value = map ? ACCENT.ink : ACCENT.lime;
    setDim(table.group, map || full('order') || full('pay') || full('todo') ? 0 : 1);
    for (const o of [tiles, piers]) setDim(o, map ? 0 : 1);
  }
  function emphasize(ids) {
    ST.emph = ids ? new Set(ids) : null;
    applyEmphasis();
  }
  const atRest = () => sameSet(ST.emph, REST);

  // ================================================================== anchors: labels, words, hotspots, framing
  // the step's name sits in the middle of the lintel's face (seen from the landing)
  const lintel = (i) => { const G = gates[i].G; G.updateWorldMatrix(true, false); return G.localToWorld(new V3(LIN_T / 2 + 0.03, GHS[i] + LIN_H * 0.62, 0)); };
  const cardAt = (C, x, z) => new V3(x, 0.09, z).applyMatrix4(C.matrix);
  const gateDecal = (i) => () => (atRest() ? i >= 2 : ST.beat > 0 || ST.lit[i] > 0.6) ? lintel(i) : null;
  // on the barrier, in the left lane's middle (where it stops the coin)
  const boomAt3 = () => { boom.arm.updateWorldMatrix(true, false); return boom.arm.localToWorld(new V3(0, 0.3, 0.4 + BOOM_LEN * 0.72)); };
  const decalAt = {
    'gate-1': gateDecal(0), 'gate-2': gateDecal(1), 'gate-3': gateDecal(2), 'gate-4': gateDecal(3),
    // 查詢訂單 alone while it is the answer found wrong (on the table, and as it is reeled back up and let down)
    'order-q': () => (ST.orderQ ? cardAt(order.card.group, -0.75, -0.24 * CARD_O.d) : null),
    // 查詢訂單 / 已出貨: once the card stands on the table the second time, one point per row, from the left margin
    order: () => (ST.orderSet ? [cardAt(order.card.group, -CARD_O.w / 2 + 0.32, -0.24 * CARD_O.d), cardAt(order.card.group, -CARD_O.w / 2 + 0.32, 0.24 * CARD_O.d)] : null),
    pay: () => (ST.payAt && ST.payAt !== 'fly' ? cardAt(pay.card.group, 0, 0) : null),
    med: () => (ST.medOn ? cardAt(med.card.group, 0, 0) : null),
    confirm: () => { if (!ST.mini) return null; miniG.updateWorldMatrix(true, false); return miniG.localToWorld(new V3(-0.15, 0, 0.1)); },
    // 預約門市 alone while it is on its way; 預約門市 / 已預約 once it is set down and done
    'todo-q': () => (ST.todoQ ? cardAt(todo.group, -0.6, -0.24 * CARD_T.d) : null),
    todo: () => (ST.todoSet ? [cardAt(todo.group, -CARD_T.w / 2 + 0.32, -0.24 * CARD_T.d), cardAt(todo.group, -CARD_T.w / 2 + 0.32, 0.24 * CARD_T.d)] : null),
  };
  const labelAt = {
    // beat 1: the one stopped at the barrier (it holds still there); beat 2: the one that reels its card back
    agents: () => {
      const N = ST.beat === 1 ? order : pay;
      if (!N.grp.visible || N.grp.scale.x < 0.6) return null;
      return N.grp.localToWorld(new V3(-0.6 * AG, 0.42 * AG, 0.2));
    },
    customer: () => person.top().addScaledVector(S, -0.9).add(new V3(0, -0.5, 0)),
  };
  const parts = {
    customer: { hit: hits.customer, anchor: () => person.chest(), beat: 3 },
    order: { hit: hits.order, anchor: () => cardAt(order.card.group, 0.35 * CARD_O.w, 0.1 * CARD_O.d), beat: 1 },
    // the box (the coin went in there), beside its card's words
    // the box (the coin went in there): its padlock; before, the coin
    pay: { hit: hits.pay, anchor: () => (ST.boxIn ? box.group.localToWorld(box.lockAt.clone()) : new V3().setFromMatrixPosition(coin.group.matrix)), beat: 2 },
    med: { hit: hits.med, anchor: () => new V3().setFromMatrixPosition(bottle.group.matrix).add(new V3(0, -0.54 - 0.95, 0)), beat: 2 },
    agents: { hit: hits.agents, anchor: () => (ST.beat === 1 && order.grp.visible ? order.grp.position.clone() : pay.grp.visible ? pay.grp.position.clone() : med.grp.position.clone()), beat: 0 },
    todo: { hit: hits.todo, anchor: () => cardAt(todo.group, 0.35 * CARD_T.w, 0.1 * CARD_T.d), beat: 3 },
  };
  gates.forEach((G, i) => { parts[`gate-${i + 1}`] = { hit: hits[`gate-${i + 1}`], anchor: () => (i === 2 ? boomAt3() : lintel(i).add(new V3(0, -LIN_H / 2 - 0.4, 0))), beat: i === 2 ? 2 : i === 3 ? 3 : 0 }; });

  // ---- shots: fixed points, so the framing never depends on where the motion happens to be
  hits.customer.updateWorldMatrix(true, false);
  const custAABB = new THREE.Box3().setFromObject(hits.customer);
  const custBox = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => new V3(x ? custAABB.max.x : custAABB.min.x, y ? custAABB.max.y + 0.6 : custAABB.min.y, z ? custAABB.max.z : custAABB.min.z))));
  const tableBox = [-1, 1].flatMap((sd) => [onTable(-TBL.d / 2 - 0.3, TBL.s + sd * (TBL.w / 2 + 0.2), 1.2), onTable(TBL.d / 2 + 0.3, TBL.s + sd * (TBL.w / 2 + 0.2), -TBL.h)]);
  const gateBox = (i) => [-1, 1].flatMap((sd) => [deckPt(U_GATE[i], sd * (GW + 0.45), 0), deckPt(U_GATE[i], sd * (GW + 0.45), GHS[i] + LIN_H + 0.2)]);
  const top = (i) => [-1, 1].map((sd) => deckPt(U_GATE[i], sd * (GW + 0.45), GHS[i] + LIN_H + 0.2));
  const raisedBox = [NOTE.clone().add(new V3(0, MINI.d / 2 + 0.5, 0)).addScaledVector(S, -MINI.w / 2 - 0.3), NOTE.clone().add(new V3(0, MINI.d / 2 + 0.5, 0)).addScaledVector(S, MINI.w / 2 + 1.4)];
  const landing = [...custBox, ...tableBox, ...raisedBox];
  const cashBox = [-1, 1].flatMap((x) => [atBox(x * (BOX.d / 2 + 0.2), BOX_S - BOX.w / 2 - 0.2, -0.05), atBox(x * (BOX.d / 2 + 0.2), BOX_S + BOX.w / 2 + 0.2, BOX.h + 0.3)]);
  const A_PTS = [...custBox, ...tableBox, ...cashBox, ...top(0), ...top(1), ...gateBox(2), ...gateBox(3)];
  // B (beat 2): close on the right of the table: the card, the drone parked over it, the customer beside
  const cardBox = [-1, 1].flatMap((x) => [-1, 1].map((z) => new V3(x * (CARD_O.w / 2 + 0.3), 0.1, z * (CARD_O.d / 2 + 0.2)).applyMatrix4(ORDER_M)));
  const parkBox = [-1, 1].flatMap((k) => [PARK.clone().addScaledVector(S, k * (FRONT + 0.4)).add(new V3(0, 1.0, 0)), PARK.clone().addScaledVector(S, k * (FRONT + 0.4)).add(new V3(0, -0.9, 0))]);
  const B_PTS = [...custBox, ...cardBox, ...parkBox, onTable(TBL.d / 2 + 0.3, CUST_S - 0.8, -TBL.h), onTable(TBL.d / 2 + 0.3, TBL.s + TBL.w / 2 + 0.2, -TBL.h), onTable(-TBL.d / 2 - 0.3, TBL.s + TBL.w / 2 + 0.2, 0)];
  // C (beats 3-4): the barrier of gate 3 with what waits behind it, gate 4, the table and the customer with the
  // raised phone; where the drone leaves to
  const waitBox = [WAIT, FREE].flatMap((ln) => [-1, 1].flatMap((sd) => [deckPt(U_STOP, ln + sd * (FRONT * 0.7), 0.3), deckPt(U_STOP, ln + sd * (FRONT * 0.7), ALT + 1.0)]));
  const handBox = [TODO_UP.clone().addScaledVector(S, CARD_T.w / 2 + 0.2), AT_HAND.clone().add(new V3(0, 1.0, 0)).addScaledVector(S, -FRONT - 0.3), AT_HAND.clone().add(new V3(0, 1.0, 0)).addScaledVector(S, FRONT + 0.3)];
  const todoBox = [-1, 1].flatMap((x) => [-1, 1].map((z) => new V3(x * (CARD_T.w / 2 + 0.3), 0.1, z * (CARD_T.d / 2 + 0.2)).applyMatrix4(TODO_M))).concat([PARK_T.clone().add(new V3(0, 1.0, 0))]);
  const departBox = [-1, 1].map((k) => OVER_BOX.clone().add(new V3(0, 1.0, 0)).addScaledVector(S, k * (FRONT + 0.3)));
  const C_PTS = [...landing, ...waitBox, ...top(2), lintel(3), ...handBox, ...departBox, ...cardBox, ...todoBox, IDLE.clone().add(new V3(0, 1.0, 0))];
  // C on a phone held upright (beats 2-4): only what acts, so the picture is as large as the narrow screen allows: the
  // barrier with the two drones waiting at it (and the step's name over it), 4 行動, the drone high over the cash box,
  // the box, the order card, and the customer with the raised phone (the question, the next errand); the table's far
  // ends may run off the sides
  const CP_PTS = [...custBox, ...raisedBox, ...handBox, ...cashBox, ...cardBox, ...todoBox, ...waitBox, lintel(2).add(new V3(0, 0.9, 0)), lintel(3), ...departBox];
  // along the chord from gate 1 to the deck's end
  const chord = O.clone().sub(curve.getPointAt(U_GATE[0])).setY(0).normalize();
  const AZ_C = Math.atan2(chord.z, chord.x);
  const shot = (az, el, pts, margin) => ({ az, el, anchors: () => pts, margin });
  // A (beat 1): from the landing, three-quarters on, so the four gates stand apart as portals along a deck that recedes
  // diagonally and the barrier's swing reads; B and C from behind the customer, nearly up the bridge, so the two lanes
  // (and what waits in them) lie side by side
  const desk = [shot(AZ_C + 0.35, 0.55, A_PTS, 0.03), shot(AZ_C - 0.2, 0.6, B_PTS, 0.05), shot(AZ_C - 0.3, 0.62, C_PTS, 0.04)];
  const portrait = [shot(AZ_C - 0.2, 0.7, A_PTS, 0.04), shot(AZ_C - 0.06, 0.8, CP_PTS, 0.04), shot(AZ_C - 0.06, 0.8, CP_PTS, 0.04)];
  // a phone held sideways: a wide, short world; seen more from the side, the landing and the gates lie side by side
  const side = [shot(AZ_C + 0.3, 0.52, A_PTS, 0.035), shot(AZ_C - 0.25, 0.56, B_PTS, 0.05), shot(AZ_C - 0.42, 0.58, C_PTS, 0.04)];
  const sideways = () => typeof innerWidth === 'number' && innerWidth > innerHeight;
  const either = (i) => ({
    get az() { return (sideways() ? side : portrait)[i].az; },
    get el() { return (sideways() ? side : portrait)[i].el; },
    anchors: () => (sideways() ? side : portrait)[i].anchors(),
    get margin() { return (sideways() ? side : portrait)[i].margin; },
  });
  const shots = { phone: [either(0), either(1), either(2)], desk };

  function rest() { return pose(LAST, 1); }
  function ambient() { /* the held result stays as it is */ }

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
    decalUnit: { order: 0.75, 'order-q': 0.75, pay: 0.75, med: 0.75, todo: 0.75, 'todo-q': 0.75, confirm: 0.75, 'gate-1': 0.62, 'gate-2': 0.62, 'gate-3': 0.62, 'gate-4': 0.62 },
    // the surfaces the words sit on (world units): the words shrink to stay inside them
    decalSize: {
      'gate-1': [LIN_W, LIN_H - 0.1], 'gate-2': [LIN_W, LIN_H - 0.1], 'gate-3': [LIN_W, LIN_H - 0.1], 'gate-4': [LIN_W, LIN_H - 0.1],
      order: [CARD_O.w - 0.45, CARD_O.d * 0.9], 'order-q': [CARD_O.w - 0.45, CARD_O.d * 0.45],
      pay: [CARD_N.w - 0.2, CARD_N.d], med: [CARD_N.w - 0.2, CARD_N.d],
      confirm: [MINI.w - 0.2, MINI.d], todo: [CARD_T.w - 0.45, CARD_T.d * 0.9], 'todo-q': [CARD_T.w - 0.45, CARD_T.d * 0.45],
    },
    lever: null,
    restParts: REST,
    mainActor: 'customer',
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    curve,
    _dbg: { coin: coin.group, bottle: bottle.group, box: box.group, payCard: pay.card.group, orderCard: order.card.group, person: person.group, order: order.grp, pay: pay.grp, med: med.grp, boom: boom.grp, gates: gates.map((G) => G.G), table: table.group, mini: miniG, check: check.group, todo: todo.group, ST, LEN, AZ_C, A_PTS, B_PTS, C_PTS, tHit, K1, BEATS },
  };
  rest();
  emphasize(null);
  return api;
}
