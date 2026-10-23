// AI 內容產製 · Content production (articles 20, 21, 4) — on the shore, TH 288°, r 84.
// One AI hopper (typed, teal) pours without a pause, from the first second to the held frame, into two lanes — two
// brands, each with its flag over its own press — at one rate: one piece per lane every 0.7 s, piece for piece side by
// side.  What tells the brands apart is never the machine, only what is clipped on each press's board (20 b23, b24).
//  1  On arrival the hopper bursts: both belts fill with the same paper boat in under a second and run; the boats slide
//     down both slipways into the water, and the three people on the shore between them turn to look: a ? over every
//     head — nobody can tell whose is whose (20 b3).
//  2  The camera stays; what lights up is the cause: on both boards the same one-line request (a slip with one typed
//     line) over the dashed outline of a page that is not there.  The copies of both brands heap up in one pool of type
//     and go under, one after another (20 b23, b6).
//  3  The person who writes the spec walks to the left press and clips a full page over the one-liner.  From the next
//     piece on, that press stamps every copy the AI sends it into one of the brand's boats — a different kind each time
//     (a sloop, a banner boat, a steamer, a schooner, a junk, a tall narrow one: one content, many formats, 21 b24) and
//     every one with the same two marks the page fixes: the lime emblem and the black hull (20 b24, b29).  The right
//     lane, with its one-liner, keeps turning out the copy at the same rate.
//  4  Three people check the boats on the line before they ship (像不像品牌 · 有沒有侵權 · 手機上看得清); the first
//     lifts out the one that came out without its emblem — only the empty ring where the mark should be — and drops it
//     into the bin: a red ✕ (20 b38, b39, b37).
//  5  The brand's boats sail out in two rows past the shore, as many as the copies heaping up and going under on the
//     right; the three people turn from the copies to the fleet, one points, and the emblem lands in every bubble:
//     recognised at a glance (20 b15, b29).
// The held frame: the AI still pouring; the spec on the left press, the one-liner on the right; the brand's fleet and
// the heap of copies the same size; the people on the shore with the emblem in their bubbles, turned to the fleet.
//
// Staging (portrait, design §5.4): seen from the sea, looking at the shore.  The lanes run along the camera's depth
// axis, so on a phone they stack vertically: the hopper at the top, the presses, the belts, the shore with its people,
// the water with the fleet (left) and the pool of copies (right) at the bottom.  Lane 2 (the spec lane) is on the left.
// Local frame: +z toward the sea (and the camera), +x camera right, y = 0 is the shore at the district's centre.
// Every explanatory transform is a pure function of the story's clock G (beat start + t): pose().  The stream of pieces
// is one schedule over G, so playing, jumping and replaying land on the same frame.  The words live in world.json.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp, boatGeo } from './kit.js';
import { heightAt, SEA_Y } from './terrain.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), XAX = new V3(1, 0, 0), ZAX = new V3(0, 0, 1);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const eiq = (x) => clamp(x) * clamp(x);
/** a pop: 0 → a little past 1 → 1 */
const pop = (x) => { x = clamp(x); const c = 2.2; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const eul = (x, y, z) => new Q().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));

// ------------------------------------------------------------------ the set (local units)
const TH = 288, RR = 84;
const H = 5.4, HI = 3.5, HC = 4.7;               // the person who writes the spec (the hero); the inspectors; the shore
const L2X = -4.0, L1X = 4.0;                   // lane 2 (the brand that writes a spec, left) and lane 1 (right)
const BELT = { z0: -3.0, z1: 11.6, top: 1.25, w: 3.0, t: 0.32 };
const BS = 1.1;                                // the copies' scale: 2.2 long, 1.5 tall (an origami boat, typed)
const BOAT_H = 1.37 * BS;
const SLOT = 1.9;
const slotZ = (s) => -0.5 + SLOT * (s - 1);
const HEADZ = slotZ(0);
// the three checks along lane 2, on either side of it in turn (inner, outer, inner), turned to the lane and a little to
// the reader (on a phone they never stand one behind another)
const SZI = [slotZ(3), slotZ(5), slotZ(7)];
const INNER = L2X + BELT.w / 2 + 0.85, OUTER = L2X - BELT.w / 2 - 0.85;
const IX = [INNER, OUTER, INNER];
const HOP = { x: 0, z: -7.0, rTop: 2.4, rBot: 0.7, yTop: 7.6, yBot: 4.7 };
const MOUTH = new V3(HOP.x, HOP.yBot - 0.35, HOP.z);
// a press over each lane (the brand's tallest boat passes under it); only a press with a spec on its board stamps
const PRESS = { z: slotZ(1), w: 3.8, yb: 4.4, yt: 5.5, d: 1.15 };
const BOARD = { w: 4.6, h: 4.0, y0: 5.7 };
const SHEET = { w: 4.2, d: 3.6, t: 0.04 };
const NOTE = { w: 4.2, d: 1.0, t: 0.04 };      // the one-line request, under each board's clip
const EMB_R = 0.52;                            // the brand's emblem on the page (the boats carry the same mark)
// each brand's flag, on a pole rising from its press's outer post
const FLAG = { off: PRESS.w / 2 - 0.18, y0: PRESS.yt + 0.1, y1: BOARD.y0 + BOARD.h + 1.5, w: 1.9, h: 1.25 };
// the reject bin, at the first checker's right, level with them; wide enough to take a boat, tipped
const BIN = { x: INNER + 2.1, z: SZI[0] - 0.7, r: 1.15, h: 1.3 };
const W_HOME = { x: -7.4, z: -4.6 };            // the writer, beside the hopper, before the spec
const W_PUT = { x: L2X - 2.3, z: PRESS.z + 0.3 };   // by the press's left post
const W_BY = { x: L2X - 2.5, z: PRESS.z - 0.2 };    // a step back beside the press, facing the reader
const STRIDE = 0.4 * H;
// the drawn water's pool of type: where the copies heap up and go under (in front of lane 1's slipway)
const POOL = { x: 4.9, z: 24.6, rx: 2.8, rz: 4.4 };
// a jetty from the bank between the two slipways, with a landing at its end over the water: the people stand there,
// facing the sea, between the brand's fleet (left) and the pool of copies (right)
const PIER = { z0: 13.2, z1: 17.0, w: 2.0, y: -2.5, px: 2.7, pz1: 19.6 };
const CROWD = [{ x: -1.8, z: 18.2 }, { x: 0.0, z: 18.65 }, { x: 1.8, z: 18.2 }];
// the brand's fleet: two rows sailing out to sea, bows first, down and away to the left
const ROWZ = [20.8, 25.4];
const FLEET_A = 0.75, FLEET_V = 2.5, X_GONE = -30;

// ---- the brand's boats: one kind each (one content, many formats), the same two marks on every one: the lime emblem
// on its biggest face and the black hull with its raised prow
const KIND = { sloop: { L: 2.6 }, banner: { L: 3.6 }, steamer: { L: 3.0 }, schooner: { L: 3.4 }, junk: { L: 2.4 }, tall: { L: 2.0 } };
const KINDS = ['sloop', 'banner', 'steamer', 'schooner', 'junk', 'tall'];
const CAPK = 6;                                // instances per kind
// on the belt the brand's boats ride a little smaller (their sails would otherwise cover the boat behind on a phone:
// each kind stays readable in the queue); they reach full size as they slide down into the water
const BELT_S = 0.8;

// ---- the stream: one schedule on the story's clock G for both lanes
const V_B = 3.4, PITCH = 2.4;                  // belt speed; one piece every PITCH / V_B ≈ 0.7 s per lane
const T_RUN = 0.8;                             // the burst has lined both belts; from here they run
const NB = 6;                                  // the burst: the first six pieces of each lane
const QZ = (n) => 10.9 - PITCH * n;            // piece n's place in the line at T_RUN
const zLine = (n, G) => QZ(n) + V_B * Math.max(0, G - T_RUN);
const tLine = (n, z) => T_RUN + (z - QZ(n)) / V_B;
const CHUTE = 0.28, SLIDE = 0.4;
const burstS = (lane, k) => 0.06 + k * 0.1 + lane * 0.05;
const NMAX = 64;                               // pieces per lane over the whole story
// a copy in the water: glides into its place in the heap, then goes under (gone S_LIFE after it lands)
const GLIDE = [0.75, 1.5], SINK0 = 1.0, SINKD = 4.2;
const NCOP = 52;                               // copies drawn at once (both lanes)

// beats: dur ≥ keyAt + the caption's hold (0.8 s + 0.2 s per 字), so the stream never freezes while a caption is read
// (the captions are 28 · 27 · 25 · 28 · 26 字: if they change, these change; the story is about 40 s in all.  The
// story holds a beat until keyAt + hold even past dur, and k stops at 1 there: the stream would stand still)
const BEATS = [
  // 1 AI 讓兩家做得又快又多，風險不是出錯，是沒人分得出誰是誰 — the burst; boats into the water; a ? over every head
  { dur: 8.4, keyAt: 2.0, shot: 0, parts: ['hopper', 'avg', 'crowd', 'flags'] },
  // 2 不是 AI 不夠強：需求只寫一句，它只能給大家都一樣的答案 — at the presses: the one-liners light up, the outline
  //   of the missing page draws itself round each, and both belts keep carrying the same boat
  { dur: 7.8, keyAt: 1.6, shot: 1, parts: ['hopper', 'brief', 'sheet', 'avg'] },
  // 3 所以先寫下品牌規格：不寫要做什麼，寫什麼絕不能妥協 — the spec is clipped on; every stamp a new kind of the brand's boat
  { dur: 8.0, keyAt: 2.3, shot: 1, parts: ['hopper', 'sheet', 'writer', 'boats', 'avg'] },
  // 4 規格防平庸，人來防出錯：有人把關，投報率比全自動高一倍多 — the checks; the one without its emblem: a red ring
  //   round the empty place, the ✕, into the bin
  { dur: 8.7, keyAt: 2.0, shot: 2, parts: ['hopper', 'inspectors', 'bin', 'boats', 'sheet'] },
  // 5 同樣的產量，有規格的那家件件不同，大家卻一眼認出是它 — the fleet sails out; the people turn to it, the emblem in every bubble
  { dur: 7.4, keyAt: 1.35, shot: 3, parts: ['hopper', 'boats', 'crowd', 'avg', 'sheet'] },
];
const LAST = BEATS.length - 1;
const START = BEATS.reduce((a, b, i) => (a.push(a[i] + b.dur), a), [0]);
// the held result: everything that made it, lit
const REST_PARTS = ['hopper', 'boats', 'crowd', 'avg', 'sheet', 'brief', 'writer', 'inspectors', 'flags'];
// beat 3 (index 2): the walk and the clip
const T2 = { walk0: 0.05, walk1: 0.95, show: 1.1, put: 1.32, back0: 1.55, back1: 2.3 };
const G_CLIP = START[2] + T2.put;
const stampT = (n) => tLine(n, PRESS.z);
// the first piece the spec reaches: the next one to pass under the press after the page is on
const N0 = (() => { let n = NB; while (stampT(n) < G_CLIP + 0.12) n++; return n; })();
BEATS[2].keyAt = +(stampT(N0) - START[2] + 0.45).toFixed(2);
// beat 4 (index 3): the piece that comes out of the press without its emblem, caught by the first check
const N_ODD = (() => {
  let best = N0, d = 1e9;
  for (let n = N0 + 1; n < NMAX; n++) { const e = Math.abs(tLine(n, SZI[0]) - START[3] - 0.85); if (e < d) { d = e; best = n; } }
  return best;
})();
const T3 = (() => {
  const g = tLine(N_ODD, SZI[0]) - START[3];
  return { reach0: g - 0.45, grab: g, lift: g + 0.35, look: g + 0.6, drop: g + 1.05, back: g + 1.75 };
})();
BEATS[3].keyAt = +(T3.drop + 0.05).toFixed(2);
const G_GRAB = START[3] + T3.grab, G_DROP = START[3] + T3.drop;
const kindOf = (n) => KINDS[(n - N0) % KINDS.length];
const rowOf = (n) => (n - N0) % 2;
// beat 2: the outline of the missing page draws itself round each board
const T_GAP = { a: 0.45, b: 1.35 };
// beat 1 and beat 5 (the shore): when each person turns and their bubble changes
const T_SEE = { turn0: 1.2, turn1: 1.75, q: 1.5, gap: 0.14 };
const T_KNOW = { turn0: 0.15, turn1: 0.85, gap: 0.12, out: 0.5, emb: 0.78, point0: 0.45, point1: 0.95 };

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
/** a district point in a root's frame ({ x, z, yaw }), normalised by h */
const inRoot = (root, p, h) => {
  const c = Math.cos(root.yaw), s = Math.sin(root.yaw), dx = p.x - root.x, dz = p.z - root.z;
  return new V3((dx * c - dz * s) / h, p.y / h, (dx * s + dz * c) / h);
};
const look = (v, yaw = 0, pitch = 0) => { v.neck.copy(eul(pitch * 0.4, yaw * 0.4, 0)); v.head.copy(eul(pitch * 0.6, yaw * 0.6, 0)); return v; };

// ------------------------------------------------------------------ small geometry helpers
function strip(g) {
  let x = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
  return x;
}
const m4 = (p = [0, 0, 0], r = [0, 0, 0], s = 1) => new M4().compose(new V3(...p), new Q().setFromEuler(new THREE.Euler(...r)), new V3(...(Array.isArray(s) ? s : [s, s, s])));
const merge = (list) => mergeGeometries(list.map(([g, m]) => { const x = strip(g); if (m) x.applyMatrix4(m); return x; }));
/** faces told apart by tone (a white box on white ground has no outline of its own) */
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
function toned(geo, t) {
  const x = strip(geo), n = x.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = t; c[i * 3 + 1] = -1; c[i * 3 + 2] = -1; }
  x.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return x;
}
/** a bar from a to b (thickness th): a box geometry */
function barGeo(a, b, th) {
  const dir = new V3().subVectors(b, a), L = dir.length();
  const geo = new THREE.BoxGeometry(th, L + th, th);
  geo.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, dir.normalize()), new V3(1, 1, 1)));
  return strip(geo);
}

/** a sailing hull, keel at y = 0, bow toward +x: the side profile extruded across the beam, then drawn in toward the
 *  bow and toward the keel (a V section) — one shape for every boat of the brand */
function hullGeo(L, B, D, inkSides = true) {
  const s = new THREE.Shape();
  const rise = 0.28 + 0.07 * L;
  s.moveTo(-L / 2, D * 0.5);
  s.quadraticCurveTo(-L * 0.46, 0.02, -L * 0.28, 0);
  s.lineTo(L * 0.18, 0);
  s.quadraticCurveTo(L * 0.44, 0.02, L / 2 + 0.18, D + rise);
  s.quadraticCurveTo(L * 0.22, D - 0.04, -L / 2, D + 0.06);
  s.lineTo(-L / 2, D * 0.5);
  const geo = strip(new THREE.ExtrudeGeometry(s, { depth: B, bevelEnabled: false, curveSegments: 12 }));
  geo.translate(0, 0, -B / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const u = clamp((x + L / 2) / L);
    const w = Math.sqrt(Math.max(0, 1 - Math.pow(u, 4))) * (0.84 + 0.16 * Math.min(1, u * 3));
    p.setZ(i, z * w * (0.36 + 0.64 * clamp(y / D)));
  }
  geo.computeVertexNormals();
  // the sides in solid ink: the brand's black hull (the off-brand one takes its colour from its material: it goes red)
  const n = geo.attributes.normal, c = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) { c[i * 3] = 1; c[i * 3 + 1] = -1; c[i * 3 + 2] = inkSides ? 1 : -1; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
/** one kind of the brand's boat (local: keel at y = 0, bow toward +x, faces ±z) as merged geometries: the black hull,
 *  the ink parts (frames, masts, bands, pennants), the paper parts (sails, a cabin) and the lime emblem.  The off-brand
 *  one (emblem: false) has only the empty ring where its mark should be. */
function kindGeo(name, { emblem = true } = {}) {
  const L = KIND[name].L, B = clamp(0.3 * L, 0.6, 1.0), D = 0.42 + 0.07 * L;
  const inkP = [], paper = [], emb = [];
  const FR = 0.065;
  const y0 = D + 0.22;
  let top = D;
  const bar = (a, b, th = FR) => inkP.push(barGeo(new V3(a[0], a[1], a[2] || 0), new V3(b[0], b[1], b[2] || 0), th));
  /** a flat sail: a polygon in the xy plane (double-sided), framed in ink */
  const panel = (pts) => {
    const s = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    paper.push(strip(new THREE.ShapeGeometry(s)));
    for (let i = 0; i < pts.length; i++) bar(pts[i], pts[(i + 1) % pts.length]);
    for (const [, y] of pts) top = Math.max(top, y);
  };
  const mast = (x, y1) => { bar([x, D - 0.12], [x, y1], 0.085); top = Math.max(top, y1); };
  // the pennant at a masthead, flying aft
  const pennant = (x, y) => {
    const f = new THREE.Shape();
    f.moveTo(0, 0); f.lineTo(-0.7, -0.15); f.lineTo(0, -0.32); f.lineTo(0, 0);
    inkP.push(strip(new THREE.ExtrudeGeometry(f, { depth: 0.05, bevelEnabled: false }).translate(x, y, -0.025)));
  };
  // the brand's emblem: a lime disc in an ink ring, on both faces (zf: the faces' distance from the middle plane)
  let markAt = null;
  const mark = (x, y, r, zf = 0) => {
    markAt = new V3(x, y, zf ? zf + 0.04 : 0.07);
    if (emblem) {
      if (zf) for (const sz of [-1, 1]) emb.push(strip(new THREE.CylinderGeometry(r, r, 0.06, 28).rotateX(Math.PI / 2).translate(x, y, sz * zf)));
      else emb.push(strip(new THREE.CylinderGeometry(r, r, 0.12, 28).rotateX(Math.PI / 2).translate(x, y, 0)));
    }
    for (const sz of [-1, 1]) inkP.push(strip(new THREE.TorusGeometry(r + 0.02, 0.055, 6, 36).translate(x, y, sz * (zf ? zf + 0.035 : 0.065))));
  };
  if (name === 'sloop') {
    // one tall triangle and a small jib
    const xm = 0.2;
    mast(xm, y0 + 2.6);
    panel([[xm - 0.04, y0], [xm - 0.04, y0 + 2.35], [xm - 1.4, y0]]);
    panel([[xm + 0.1, y0], [xm + 0.1, y0 + 1.75], [xm + 1.0, y0]]);
    mark(xm - 0.5, y0 + 0.62, 0.34);
    pennant(xm, y0 + 2.6);
  } else if (name === 'banner') {
    // a wide banner between two masts, an ink band across its head
    mast(-1.3, y0 + 2.05); mast(1.3, y0 + 2.05);
    const ya = y0 + 0.32, yb = y0 + 1.78;
    panel([[-1.25, ya], [1.25, ya], [1.25, yb], [-1.25, yb]]);
    inkP.push(strip(new THREE.BoxGeometry(2.5, 0.26, 0.07).translate(0, yb - 0.13, 0)));
    mark(0, (ya + yb - 0.26) / 2, 0.44);
    pennant(-1.3, y0 + 2.05); pennant(1.3, y0 + 2.05);
  } else if (name === 'steamer') {
    // no sail: a cabin with the emblem on its sides and a black funnel
    const cw = 1.5, ch = 0.95, cd = B * 0.78, cx = -0.3;
    paper.push(strip(new THREE.BoxGeometry(cw, ch, cd).translate(cx, D + ch / 2, 0)));
    inkP.push(strip(new THREE.BoxGeometry(cw + 0.16, 0.1, cd + 0.14).translate(cx, D + ch + 0.05, 0)));
    for (const [a, b] of [[[cx - cw / 2, D], [cx - cw / 2, D + ch]], [[cx + cw / 2, D], [cx + cw / 2, D + ch]]]) for (const sz of [-1, 1]) bar([...a, sz * (cd / 2 + 0.01)], [...b, sz * (cd / 2 + 0.01)]);
    inkP.push(strip(new THREE.CylinderGeometry(0.3, 0.34, 1.25, 16).translate(cx + 0.35, D + ch + 0.62, 0)));
    mark(cx - 0.18, D + ch * 0.5, 0.33, cd / 2 + 0.02);
    mast(0.95, y0 + 1.35);
    pennant(0.95, y0 + 1.35);
    top = Math.max(top, D + ch + 1.25);
  } else if (name === 'schooner') {
    // two masts, two gaff sails, the aft one taller
    mast(0.95, y0 + 1.95); mast(-0.55, y0 + 2.6);
    panel([[0.9, y0], [0.9, y0 + 1.75], [0.1, y0 + 1.45], [0.1, y0]]);
    panel([[-0.6, y0], [-0.6, y0 + 2.4], [-1.55, y0 + 2.0], [-1.55, y0]]);
    mark(-1.07, y0 + 0.95, 0.36);
    pennant(0.95, y0 + 1.95); pennant(-0.55, y0 + 2.6);
  } else if (name === 'junk') {
    // a square battened sail, its head raked
    mast(0, y0 + 2.25);
    const pts = [[-0.95, y0 + 0.2], [0.85, y0 + 0.2], [0.85, y0 + 1.85], [-1.05, y0 + 2.08]];
    panel(pts);
    for (const f of [0.26, 0.74]) bar([-0.95 - 0.1 * f, y0 + 0.2 + 1.7 * f], [0.85, y0 + 0.2 + 1.65 * f]);
    mark(-0.05, y0 + 1.05, 0.33);
    pennant(0, y0 + 2.25);
  } else {
    // tall: one tall narrow panel (the 9:16 of a story), an ink band across its head
    mast(0.1, y0 + 3.05);
    const ya = y0 + 0.25, yb = y0 + 2.75;
    panel([[-0.45, ya], [0.5, ya], [0.5, yb], [-0.45, yb]]);
    inkP.push(strip(new THREE.BoxGeometry(0.95, 0.26, 0.07).translate(0.025, yb - 0.13, 0)));
    mark(0.025, y0 + 1.3, 0.31);
    pennant(0.1, y0 + 3.05);
  }
  return { hull: hullGeo(L, B, D, emblem), ink: mergeGeometries(inkP), sail: mergeGeometries(paper), emb: emb.length ? mergeGeometries(emb) : null, L, B, D, top, markAt };
}
/** a typed question mark (facing +z), about 0.9 tall, centred on its origin */
function qmarkGeo(s = 1) {
  const r = 0.24 * s, th = 0.085 * s;
  const arc = new THREE.TorusGeometry(r, th, 6, 22, Math.PI * 1.42).rotateZ(-Math.PI / 2).translate(0, 0.2 * s, 0);
  const stem = new THREE.BoxGeometry(th * 2, 0.2 * s, th * 2).translate(0, 0.2 * s - r - 0.08 * s, 0);
  const dot = new THREE.SphereGeometry(th * 1.25, 10, 8).translate(0, -0.36 * s, 0);
  return mergeGeometries([strip(arc), strip(stem), strip(dot)]);
}
/** a thought bubble: a cloud of lobes (facing +z, centred at its origin) and two dots down toward the head */
function cloudGeo(w, h, t = 0.07) {
  const s = new THREE.Shape(), n = 110, lobes = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    const r = 0.84 + 0.16 * Math.sqrt(Math.abs(Math.sin(((a - Math.PI / 2) * lobes) / 2 + Math.PI / 2)));
    const x = (Math.cos(a) * w * r) / 2, y = (Math.sin(a) * h * r) / 2;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const cloud = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -t / 2);
  const dot = (r, x, y) => new THREE.CylinderGeometry(r, r, t, 16).rotateX(Math.PI / 2).translate(x, y, 0);
  return mergeGeometries([strip(cloud), strip(dot(0.13, -0.12, -h / 2 - 0.2)), strip(dot(0.08, -0.06, -h / 2 - 0.48))]);
}

// per-instance contour-only dimming for the copies (one program for every copy of this district)
const COPY_HOOKS = {
  key: 'foundry-copies-3',
  vHead: /* glsl */`attribute float aDim;
varying float vBDim;`,
  vPos: /* glsl */`vBDim = aDim;`,
  fHead: /* glsl */`varying float vBDim;`,
  fOut: /* glsl */`dm = max(dm, vBDim);`,
};

export function buildFoundry() {
  const g = new THREE.Group();
  g.name = 'foundry';
  const base = polar(RR, TH);
  g.position.copy(base);
  const AZ_IN = Math.atan2(-base.z, -base.x);        // world azimuth of the way inward (toward the sea and people)
  g.rotation.y = Math.PI / 2 - AZ_IN;                 // local +z → inward
  g.updateMatrixWorld(true);
  const W = (x, y, z) => g.localToWorld(new V3(x, y, z));
  const wp = (o, x, y, z) => { o.updateWorldMatrix(true, false); return o.localToWorld(new V3(x, y, z)); };
  const gInv = g.matrixWorld.clone().invert();
  const _gw = new V3();
  const gy = (x, z) => { _gw.set(x, 0, z).applyMatrix4(g.matrixWorld); return heightAt(_gw.x, _gw.z) - base.y; };
  const seaY = SEA_Y - base.y;
  // the harbour's drawn water lies over the typed sea's swell (which rises up to 0.3): the boats float on it
  const waterY = seaY + 0.34;
  const R = rng(20);
  const layers = {};
  const layer = (name, ...objs) => { (layers[name] ||= []).push(...objs); return objs[0]; };
  const accents = [];

  // =================================================================== the hall (scenery, at the back)
  {
    const hall = new THREE.Group(); hall.name = 'hall';
    const HW = 18, HD = 3.4, HH = 4.4, HZ = -10.8;
    const mat = ink({ shade: 0.95, bias: 0.12 });
    mat.vertexColors = true;
    const body = new THREE.Mesh(faceTones(new THREE.BoxGeometry(HW, HH, HD).translate(0, HH / 2, 0).toNonIndexed(), { top: 1, pz: 0.86, nz: 0.6, px: 0.6, nx: 0.7 }), mat);
    body.position.set(0, gy(0, HZ) - 0.1, HZ);
    hall.add(body);
    const teeth = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Shape();
      const w = HW / 5, x0 = -HW / 2 + i * w;
      s.moveTo(x0, 0); s.lineTo(x0 + w, 0); s.lineTo(x0 + w, 1.9); s.lineTo(x0, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: HD, bevelEnabled: false });
      geo.translate(0, HH, -HD / 2);
      teeth.push([geo, null]);
    }
    const roof = new THREE.Mesh(toned(merge(teeth), 0.92), mat);
    roof.position.copy(body.position);
    hall.add(roof);
    const chim = new THREE.Mesh(toned(new THREE.CylinderGeometry(0.75, 1.0, 9.5, 14).translate(0, 4.75, 0), 0.9), mat);
    chim.position.set(6.9, gy(6.9, HZ - 0.4), HZ - 0.4);
    hall.add(chim);
    hall.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
    g.add(layer('hall', hall));
  }

  // =================================================================== the AI hopper (typed), its stock and two chutes
  const hopper = new THREE.Group(); hopper.name = 'hopper';
  const hopMat = ink({ style: 1, shade: 0.62, focus: false, side: THREE.DoubleSide });
  accents.push(hopMat);
  {
    const hgt = HOP.yTop - HOP.yBot;
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(HOP.rTop, HOP.rBot, hgt, 28, 1, true).translate(0, (HOP.yTop + HOP.yBot) / 2, 0), hopMat);
    funnel.castShadow = true; funnel.receiveShadow = true;
    hopper.add(funnel);
    const edge = ink({ accent: 'ink' });
    const rim = new THREE.Mesh(merge([
      [new THREE.TorusGeometry(HOP.rTop, 0.1, 6, 48), m4([0, HOP.yTop, 0], [Math.PI / 2, 0, 0])],
      [new THREE.TorusGeometry(HOP.rBot + 0.03, 0.09, 6, 24), m4([0, HOP.yBot, 0], [Math.PI / 2, 0, 0])],
      [new THREE.TorusGeometry(lerp(HOP.rBot, HOP.rTop, 0.5) + 0.02, 0.06, 6, 40), m4([0, (HOP.yTop + HOP.yBot) / 2, 0], [Math.PI / 2, 0, 0])],
    ]), edge);
    rim.castShadow = false;
    hopper.add(rim);
    const legs = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const top = new V3(Math.cos(a) * (HOP.rTop * 0.62), HOP.yBot + 1.7, Math.sin(a) * (HOP.rTop * 0.62));
      const bot = new V3(Math.cos(a) * (HOP.rTop * 0.8), 0, Math.sin(a) * (HOP.rTop * 0.8));
      legs.push([barGeo(bot, top, 0.22), null]);
    }
    const legMesh = new THREE.Mesh(merge(legs), hopMat);
    legMesh.castShadow = true;
    hopper.add(legMesh);
    // the heap of generated stock, mounded over the rim
    const heap = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), hopMat, 46);
    heap.name = 'heap';
    const _m = new M4(), _q = new Q();
    for (let i = 0; i < 46; i++) {
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * (HOP.rTop - 0.5);
      const y = HOP.yTop - 0.15 + (1 - (r / HOP.rTop) ** 2) * 1.0 + R() * 0.3;
      _q.setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3));
      heap.setMatrixAt(i, _m.compose(new V3(Math.cos(a) * r, y, Math.sin(a) * r), _q, new V3(1, 1, 1)));
    }
    heap.castShadow = true;
    hopper.add(heap);
    hopper.userData.heap = heap;
    hopper.position.set(HOP.x, gy(HOP.x, HOP.z), HOP.z);
  }
  g.add(layer('hopper', hopper));
  const chuteA = (lx) => new V3(HOP.x + Math.sign(lx) * 0.55, MOUTH.y - 0.1, HOP.z + 0.25);
  const chuteB = (lx) => new V3(lx, BELT.top + 0.45, HEADZ);
  {
    const parts = [];
    for (const lx of [L2X, L1X]) {
      const a = chuteA(lx), b = chuteB(lx);
      const dir = b.clone().sub(a), L = dir.length();
      const q = new Q().setFromUnitVectors(ZAX, dir.clone().normalize());
      const trough = merge([
        [new THREE.BoxGeometry(1.25, 0.1, L), m4([0, -0.3, 0])],
        [new THREE.BoxGeometry(0.1, 0.55, L), m4([-0.62, -0.05, 0])],
        [new THREE.BoxGeometry(0.1, 0.55, L), m4([0.62, -0.05, 0])],
      ]);
      trough.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), q, new V3(1, 1, 1)));
      parts.push(trough);
    }
    const chutes = new THREE.Mesh(mergeGeometries(parts), hopMat);
    chutes.name = 'chutes';
    chutes.castShadow = true;
    g.add(layer('hopper', chutes));
  }

  // =================================================================== two lanes: belts and slipways (scenery)
  const beltMat = ink({ shade: 0.95, bias: 0.08 });
  beltMat.vertexColors = true;
  const slipEnd = [];
  for (const lx of [L2X, L1X]) {
    const lane = new THREE.Group(); lane.name = lx < 0 ? 'lane2' : 'lane1';
    const len = BELT.z1 - BELT.z0, zc = (BELT.z0 + BELT.z1) / 2;
    const top = new THREE.Mesh(faceTones(new THREE.BoxGeometry(BELT.w, BELT.t, len).translate(0, -BELT.t / 2, 0).toNonIndexed(), { top: 0.7, px: 0.5, nx: 0.5, pz: 0.6, nz: 0.55 }), beltMat);
    top.position.set(lx, BELT.top, zc);
    top.castShadow = top.receiveShadow = true;
    lane.add(top);
    const legs = [];
    for (let i = 0; i <= 6; i++) {
      const z = BELT.z0 + 0.5 + (i / 6) * (len - 1);
      for (const sx of [-1, 1]) {
        const x = lx + sx * (BELT.w / 2 - 0.15), y0 = gy(x, z) - 0.2;
        legs.push([new THREE.BoxGeometry(0.16, BELT.top - BELT.t - y0, 0.16), m4([x, (BELT.top - BELT.t + y0) / 2, z])]);
      }
    }
    const legMesh = new THREE.Mesh(toned(merge(legs), 0.62), beltMat);
    legMesh.castShadow = true;
    lane.add(legMesh);
    const slats = new THREE.Mesh(merge(Array.from({ length: 24 }, (_, i) => [new THREE.BoxGeometry(BELT.w + 0.02, 0.03, 0.05), m4([lx, BELT.top + 0.005, BELT.z0 + ((i + 0.5) / 24) * len])])), ink({ accent: 'ink' }));
    slats.castShadow = false;
    lane.add(slats);
    // the slipway: from the belt's end down the shore into the water (a side launch: boats slide down broadside)
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const z = BELT.z1 + i * 0.42;
      const yy = Math.max(Math.max(gy(lx, z), gy(lx - 0.9, z), gy(lx + 0.9, z)) + 0.42, BELT.top - 0.02 - (z - BELT.z1) * 1.2);
      pts.push(new V3(lx, Math.min(BELT.top - 0.02, Math.max(seaY - 0.6, yy)), z));
    }
    const slip = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const sp = [];
    for (let i = 0; i < 60; i++) {
      const a = slip.getPointAt(i / 60), b = slip.getPointAt((i + 1) / 60);
      for (const sx of [-1, 1]) sp.push(barGeo(a.clone().setX(lx + sx * 0.85), b.clone().setX(lx + sx * 0.85), 0.16));
    }
    for (let i = 0; i < 9; i++) { const a = slip.getPointAt(i / 9 + 0.03); sp.push(strip(new THREE.BoxGeometry(BELT.w, 0.09, 0.24).translate(a.x, a.y - 0.04, a.z))); }
    for (let i = 1; i < 8; i++) {
      const a = slip.getPointAt(i / 8);
      for (const sx of [-1, 1]) {
        const x = lx + sx * 0.85, y0 = Math.max(gy(x, a.z), seaY - 1.2);
        if (a.y - y0 > 0.5) sp.push(barGeo(new V3(x, y0, a.z), new V3(x, a.y - 0.1, a.z), 0.14));
      }
    }
    const slipMesh = new THREE.Mesh(toned(mergeGeometries(sp), 0.7), beltMat);
    slipMesh.castShadow = true;
    lane.add(slipMesh);
    slipEnd.push(slip);
    g.add(layer('belts', lane));
  }
  const [slip2, slip1] = slipEnd;
  const wetU = (slip) => { for (let i = 0; i <= 200; i++) { const p = slip.getPointAt(i / 200); if (p.y <= seaY + 0.5) return i / 200; } return 1; };
  const WET2 = wetU(slip2), WET1 = wetU(slip1);

  // =================================================================== a press over each lane, its board, its flag
  const pressMat = ink({ shade: 0.95, bias: 0.06 });
  pressMat.vertexColors = true;
  const RAM = { w: 1.9, h: 0.7, d: 1.0, rest: PRESS.yb + 0.25, down: BELT.top + BOAT_H * 0.78 };
  const boardFace = (lx = L2X) => new V3(lx, BOARD.y0 + BOARD.h / 2 - 0.05, PRESS.z + PRESS.d / 2 - 0.04);
  const noteM = (lx) => new M4().compose(new V3(lx, BOARD.y0 + BOARD.h - NOTE.d / 2 - 0.22, PRESS.z + PRESS.d / 2 - 0.04 + 0.02), new Q().setFromAxisAngle(XAX, Math.PI / 2), new V3(1, 1, 1));
  /** the press over lane lx: housing, ram (drawn up inside it), the board facing the reader with its clip, the dashed
   *  outline of a page that is not there, and the one-line request clipped at its top */
  function makePress(lx) {
    const press = new THREE.Group(); press.name = lx < 0 ? 'press2' : 'press1';
    const ram = new THREE.Group(); ram.name = 'ram';
    const P_ = PRESS;
    const posts = [], y0 = gy(lx, P_.z);
    for (const sx of [-1, 1]) posts.push([new THREE.BoxGeometry(0.36, P_.yt - y0, 0.44), m4([sx * (P_.w / 2 - 0.18), (P_.yt + y0) / 2, 0])]);
    posts.push([new THREE.BoxGeometry(P_.w, P_.yt - P_.yb, P_.d), m4([0, (P_.yt + P_.yb) / 2, 0])]);
    posts.push([new THREE.BoxGeometry(P_.w + 0.24, 0.16, P_.d + 0.24), m4([0, P_.yt + 0.08, 0])]);
    const body = new THREE.Mesh(faceTones(merge(posts), { top: 1, pz: 0.8, nz: 0.6, px: 0.55, nx: 0.62 }), pressMat);
    press.add(body);
    const rb = new THREE.Mesh(faceTones(merge([
      [new THREE.BoxGeometry(RAM.w, RAM.h, RAM.d), m4([0, RAM.h / 2, 0])],
      [new THREE.BoxGeometry(0.3, 1.5, 0.3), m4([0, RAM.h + 0.75, 0])],
    ]), { top: 0.9, pz: 0.5, nz: 0.4, px: 0.42, nx: 0.46, bottom: 0.3 }), pressMat);
    ram.add(rb);
    ram.position.y = RAM.rest;
    press.add(ram);
    const board = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, BOARD.h, 0.08), ink({ shade: 0.86, bias: 0.06 }));
    board.position.set(0, BOARD.y0 + BOARD.h / 2, P_.d / 2 - 0.1);
    press.add(board);
    const stays = new THREE.Mesh(toned(merge([-1, 1].map((sx) => [new THREE.BoxGeometry(0.16, BOARD.h + 0.3, 0.16), m4([sx * (BOARD.w / 2 - 0.2), BOARD.y0 + BOARD.h / 2 - 0.15, P_.d / 2 - 0.2])])), 0.6), pressMat);
    press.add(stays);
    const clip = new THREE.Mesh(merge([[new THREE.BoxGeometry(1.1, 0.28, 0.2), m4([0, 0, 0])], [new THREE.TorusGeometry(0.19, 0.055, 6, 14), m4([0, 0.2, 0])]]), ink({ shade: 0.3 }));
    clip.position.set(0, BOARD.y0 + BOARD.h - 0.06, P_.d / 2 - 0.02);
    press.add(clip);
    // the flag on its pole, from the outer post: the brand's own (a disc on the left, a triangle on the right)
    const side = lx < 0 ? -1 : 1;
    const flag = new THREE.Group(); flag.name = lx < 0 ? 'flag2' : 'flag1';
    const fx = side * FLAG.off;
    const pole = new THREE.Mesh(barGeo(new V3(fx, FLAG.y0, -0.1), new V3(fx, FLAG.y1, -0.1), 0.12), ink({ accent: 'ink' }));
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(FLAG.w, FLAG.h, 0.06).translate(fx + side * (FLAG.w / 2 + 0.06), FLAG.y1 - FLAG.h / 2 - 0.05, -0.1), ink({ shade: 1.0, bias: 0.2 }));
    const hem = new THREE.Mesh(merge([[new THREE.BoxGeometry(FLAG.w, 0.07, 0.08), m4([fx + side * (FLAG.w / 2 + 0.06), FLAG.y1 - 0.05, -0.1])], [new THREE.BoxGeometry(FLAG.w, 0.07, 0.08), m4([fx + side * (FLAG.w / 2 + 0.06), FLAG.y1 - FLAG.h - 0.05, -0.1])], [new THREE.BoxGeometry(0.07, FLAG.h, 0.08), m4([fx + side * (FLAG.w + 0.06), FLAG.y1 - FLAG.h / 2 - 0.05, -0.1])]]), ink({ accent: 'ink' }));
    const mc = new V3(fx + side * (FLAG.w / 2 + 0.06), FLAG.y1 - FLAG.h / 2 - 0.05, -0.1);
    let markMesh;
    if (lx < 0) {
      markMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 28).rotateX(Math.PI / 2).translate(mc.x, mc.y, mc.z), ink({ shade: 1.0, bias: 0.1, accent: 'ink', focus: false }));
      const ring = new THREE.Mesh(merge([-1, 1].map((sz) => [new THREE.TorusGeometry(0.42, 0.06, 6, 32), m4([mc.x, mc.y, mc.z + sz * 0.075])])), ink({ accent: 'ink' }));
      flag.add(ring);
    } else {
      const s = new THREE.Shape(); s.moveTo(-0.46, -0.36); s.lineTo(0.46, -0.36); s.lineTo(0, 0.44); s.lineTo(-0.46, -0.36);
      markMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }).translate(mc.x, mc.y, mc.z - 0.07), ink({ accent: 'ink' }));
    }
    flag.add(pole, cloth, hem, markMesh);
    flag.userData.mark = markMesh; flag.userData.mc = mc;
    press.add(flag);
    press.position.set(lx, 0, P_.z);
    // the dashed outline of the page that belongs on the board (a page's folded corner, so it reads as a page)
    const dashes = [];
    const fz = P_.d / 2 - 0.06 + 0.025, cy = BOARD.y0 + BOARD.h / 2 - 0.05;
    // (a little thicker than a hairline: on a phone the gap must read from the whole frame)
    const hw = SHEET.w / 2, hh = SHEET.d / 2, ear = 0.6;
    const edge = (ax, ay, bx, by, len = 0.62) => {
      const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / len));
      for (let i = 0; i < n; i++) {
        const u0 = (i + 0.22) / n, u1 = (i + 0.78) / n;
        dashes.push(barGeo(new V3(lerp(ax, bx, u0), cy + lerp(ay, by, u0), fz), new V3(lerp(ax, bx, u1), cy + lerp(ay, by, u1), fz), 0.18));
      }
    };
    edge(-hw, hh, hw - ear, hh); edge(hw - ear, hh, hw, hh - ear, 0.4); edge(hw, hh - ear, hw, -hh); edge(hw, -hh, -hw, -hh); edge(-hw, -hh, -hw, hh);
    edge(hw - ear, hh, hw - ear, hh - ear, 0.4); edge(hw - ear, hh - ear, hw, hh - ear, 0.4);
    const slot = new THREE.Mesh(mergeGeometries(dashes), ink({ accent: 'ink' }));
    slot.name = 'slot';
    slot.userData.n = dashes.length;
    slot.userData.per = dashes[0].attributes.position.count;
    slot.position.set(lx, 0, P_.z);
    // the one-line request: a strip of paper with a single typed line
    const note = P.makeCard({ w: NOTE.w, d: NOTE.d, t: NOTE.t, lines: 1 });
    note.group.name = 'note';
    note.material.userData.u.uShadeBias.value = 0.3;
    note.material.userData.u.uAccentAll = { value: 1 };
    accents.push(note.material);
    note.group.matrixAutoUpdate = false;
    note.group.matrix.copy(noteM(lx));
    for (const o of [press, slot, note.group]) o.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    return { press, ram, slot, note, flag };
  }
  const P2 = makePress(L2X), P1 = makePress(L1X);
  accents.push(P2.flag.userData.mark.material);
  const ram = P2.ram;
  g.add(layer('press2', P2.press), layer('slot', P2.slot), layer('brief2', P2.note.group));
  g.add(layer('press1', P1.press), layer('slot1', P1.slot), layer('brief1', P1.note.group));
  layer('flags', P2.flag, P1.flag);
  // the stamp's impact: short graphite strokes bursting out on both sides of the piece for a moment
  const impact = (() => {
    const parts = [];
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, k = i % 4;
      const a = (-0.55 + k * 0.37) + (side < 0 ? Math.PI : 0);
      const dir = new V3(Math.cos(a), 0.35 + 0.25 * (k % 2), Math.sin(a) * 0.9).normalize();
      parts.push(barGeo(dir.clone().multiplyScalar(0.25), dir.clone().multiplyScalar(0.85), 0.075));
    }
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink' }));
    m.castShadow = false; m.visible = false; m.name = 'impact';
    return m;
  })();
  g.add(layer('press2', impact));

  // =================================================================== the reject bin and its ✕
  const bin = new THREE.Group(); bin.name = 'bin';
  {
    const mat = ink({ shade: 0.92, bias: 0.06, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(BIN.r, BIN.r * 0.84, BIN.h, 20, 1, true).translate(0, BIN.h / 2, 0), mat);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(BIN.r * 0.84, BIN.r * 0.84, 0.06, 20).translate(0, 0.03, 0), ink({ shade: 0.3 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(BIN.r, 0.06, 6, 28).rotateX(Math.PI / 2).translate(0, BIN.h, 0), ink({ accent: 'ink' }));
    for (const m of [body, floor]) { m.castShadow = m.receiveShadow = true; bin.add(m); }
    rim.castShadow = false; bin.add(rim);
    bin.position.set(BIN.x, gy(BIN.x, BIN.z), BIN.z);
  }
  g.add(layer('bin', bin));
  const xMark = P.makeX({ size: 1.05 });
  xMark.group.name = 'x';
  xMark.material.userData.u.uAccentAll = { value: 1 };
  accents.push(xMark.material);
  xMark.group.position.set(BIN.x + BIN.r * 0.8, bin.position.y + BIN.h + 0.3, BIN.z + BIN.r * 0.55);
  xMark.group.visible = false;
  g.add(layer('x', xMark.group));

  // =================================================================== the copies: one InstancedMesh (typed)
  const bGeo = boatGeo().scale(BS, BS, BS);
  bGeo.setAttribute('aDim', new THREE.InstancedBufferAttribute(new Float32Array(NCOP), 1));
  const copyMat = ink({ shade: 1.0, bias: 0.1, side: THREE.DoubleSide, hooks: COPY_HOOKS, focus: false });
  accents.push(copyMat);
  const copies = new THREE.InstancedMesh(bGeo, copyMat, NCOP);
  copies.name = 'copies';
  copies.castShadow = true; copies.receiveShadow = true;
  copies.frustumCulled = false;
  {
    const col = new Float32Array(NCOP * 3);
    for (let i = 0; i < NCOP; i++) { col[i * 3] = 0.5; col[i * 3 + 1] = 1; col[i * 3 + 2] = -1; }
    copies.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
  }
  const bDim = bGeo.getAttribute('aDim');
  // every copy's edges in graphite (a typed surface has no outline of its own)
  const edgeGeo = (() => {
    const L = 1.0, w = 0.36, Hh = 0.42, Sl = 0.95;
    const P_ = { kb: [-0.55, 0, 0], kf: [0.55, 0, 0], gbL: [-L, Hh, -w], gfL: [L, Hh, -w], gbR: [-L, Hh, w], gfR: [L, Hh, w], sb: [-0.42, Hh, 0], sf: [0.42, Hh, 0], st: [0, Hh + Sl, 0] };
    const E = [['kb', 'kf'], ['gbL', 'gfL'], ['gbR', 'gfR'], ['gbL', 'gbR'], ['gfL', 'gfR'], ['kb', 'gbL'], ['kb', 'gbR'], ['kf', 'gfL'], ['kf', 'gfR'], ['sb', 'st'], ['st', 'sf']];
    const geo = mergeGeometries(E.map(([a, b]) => barGeo(new V3(...P_[a]).multiplyScalar(BS), new V3(...P_[b]).multiplyScalar(BS), 0.075)));
    geo.setAttribute('aDim', new THREE.InstancedBufferAttribute(new Float32Array(NCOP), 1));
    return geo;
  })();
  const copyEdges = new THREE.InstancedMesh(edgeGeo, ink({ accent: 'ink', hooks: COPY_HOOKS }), NCOP);
  copyEdges.name = 'copy-edges';
  copyEdges.castShadow = false;
  copyEdges.frustumCulled = false;
  const eDim = edgeGeo.getAttribute('aDim');
  g.add(copyEdges, copies);

  // =================================================================== the brand's boats: instanced, one set per kind
  const brandMats = {
    hull: Object.assign(ink({ accent: 0, shade: 1, bias: 0.1, side: THREE.DoubleSide }), { vertexColors: true }),
    ink: ink({ accent: 'ink' }),
    sail: ink({ shade: 1.0, bias: 0.16, side: THREE.DoubleSide }),
    emb: ink({ shade: 1.0, bias: 0.1, accent: 'lime', focus: false }),
  };
  accents.push(brandMats.emb);
  const fleetGroup = new THREE.Group(); fleetGroup.name = 'fleet';
  const KG = {};
  for (const name of KINDS) {
    const G_ = kindGeo(name);
    const ims = [];
    for (const [geo, mat] of [[G_.hull, brandMats.hull], [G_.ink, brandMats.ink], [G_.sail, brandMats.sail], [G_.emb, brandMats.emb]]) {
      if (!geo) continue;
      const im = new THREE.InstancedMesh(geo, mat, CAPK);
      im.name = `brand-${name}`;
      im.castShadow = mat !== brandMats.ink; im.receiveShadow = true;
      im.frustumCulled = false;
      im.count = 0;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      fleetGroup.add(im);
      ims.push(im);
    }
    KG[name] = { ...G_, ims };
  }
  g.add(layer('fleet', fleetGroup));
  // the off-brand one: a sloop that came out without its emblem (the empty ring), its sail still typed; red once caught
  const oddMats = {
    hull: Object.assign(ink({ accent: 'ink', shade: 1, bias: 0.1, side: THREE.DoubleSide }), { vertexColors: true }),
    ink: ink({ accent: 'ink' }),
    sail: ink({ style: 1, shade: 0.72, bias: 0.04, side: THREE.DoubleSide, focus: false }),
  };
  accents.push(oddMats.hull, oddMats.sail);
  const oddB = kindGeo('sloop', { emblem: false });
  const oddGroup = new THREE.Group(); oddGroup.name = 'odd';
  for (const [geo, mat] of [[oddB.hull, oddMats.hull], [oddB.ink, oddMats.ink], [oddB.sail, oddMats.sail]]) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; oddGroup.add(m); }
  // the red ring the inspector's look puts round the empty place of the emblem (both faces)
  const oddRingMat = ink({ shade: 0.2, accent: 'red', focus: false });
  accents.push(oddRingMat);
  const oddRing = new THREE.Mesh(mergeGeometries([-1, 1].map((sz) => strip(new THREE.TorusGeometry(0.5, 0.1, 6, 36).translate(oddB.markAt.x, oddB.markAt.y, sz * 0.1)))), oddRingMat);
  oddRing.name = 'odd-ring'; oddRing.castShadow = false; oddRing.visible = false;
  oddGroup.add(oddRing);
  oddGroup.visible = false;
  g.add(layer('odd', oddGroup));

  // =================================================================== the harbour's water and its pool of type
  let harbour = null;
  {
    const WAT = { x: 2, z: 30, rx: 56, rz: 34 };
    const geo = new THREE.PlaneGeometry(2 * WAT.rx, 2 * WAT.rz, 1, 1).rotateX(-Math.PI / 2);
    const mat = ink({
      shade: 0.95, bias: 0.05, side: THREE.DoubleSide,
      hooks: {
        key: 'foundry-water',
        fOut: /* glsl */`
float ex = vLPos.x / ${WAT.rx.toFixed(2)}, ez = vLPos.z / ${WAT.rz.toFixed(2)};
float er = sqrt(ex * ex + ez * ez);
sh = max(sh, 0.92);
op *= 1.0 - smoothstep(0.86, 1.0, er);`,
      },
    });
    const water = new THREE.Mesh(geo, mat);
    water.name = 'water';
    water.position.set(WAT.x, waterY, WAT.z);
    water.castShadow = false; water.receiveShadow = true;
    const r = rng(77), parts = [];
    for (let z = -WAT.rz + 1.2; z < WAT.rz - 0.8; z += 1.45) {
      let x = -WAT.rx + r() * 2.2;
      while (x < WAT.rx) {
        const len = 1.0 + r() * 1.4, zz = z + (r() - 0.5) * 0.5;
        const mid = (x + len / 2) / WAT.rx, mz = zz / WAT.rz;
        const px = (WAT.x + x + len / 2 - POOL.x) / (POOL.rx + 1.0), pz = (WAT.z + zz - POOL.z) / (POOL.rz + 0.9);
        if (Math.hypot(mid, mz) < 0.84 && Math.hypot(px, pz) > 1) {
          const pts = [];
          for (let i = 0; i <= 4; i++) pts.push(new V3(x + (len * i) / 4, 0.03, zz + Math.sin(i * 1.6 + x) * 0.07));
          parts.push(strip(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.045, 3, false)));
        }
        x += len + 1.4 + r() * 2.6;
      }
    }
    const strokes = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink' }));
    strokes.name = 'ripples';
    strokes.castShadow = false;
    water.add(strokes);
    g.add(water);
    harbour = water;
  }
  // the pool: a ragged patch of type on the water where the copies heap up and go under — the sea of AI content they
  // drown in.  Denser toward its middle, in rings, like water closing over something.
  const poolMat = ink({
    style: 1, shade: 0.7, bias: 0.02, side: THREE.DoubleSide, focus: false,
    hooks: {
      key: 'foundry-pool',
      fOut: /* glsl */`
float pr = length(vec2(vLPos.x / ${POOL.rx.toFixed(2)}, vLPos.y / ${POOL.rz.toFixed(2)}));
sh = clamp(mix(0.3, 0.78, smoothstep(0.0, 1.0, pr)) + 0.07 * sin(pr * 19.0 + atan(vLPos.y, vLPos.x) * 2.0), 0.0, 1.0);`,
    },
  });
  accents.push(poolMat);
  const pool = (() => {
    const r = rng(9), s = new THREE.Shape(), n = 40;
    const k = Array.from({ length: 5 }, () => [r() * 6.28, 0.05 + r() * 0.07]);
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const w = 1 + k.reduce((acc, [ph, amp], m) => acc + amp * Math.sin(a * (m + 2) + ph), 0);
      const x = Math.cos(a) * POOL.rx * w, y = Math.sin(a) * POOL.rz * w;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    const m = new THREE.Mesh(strip(new THREE.ShapeGeometry(s, 1)), poolMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(POOL.x, waterY + 0.03, POOL.z);
    m.name = 'pool';
    m.castShadow = false; m.receiveShadow = true;
    return m;
  })();
  g.add(layer('pool', pool));
  // the jetty and its landing (scenery): planks, a rail along the landing's front, posts down into the water
  {
    const mat = ink({ shade: 0.92, bias: 0.06 });
    mat.vertexColors = true;
    const parts = [];
    const deck = (x0, x1, z0, z1) => {
      for (let z = z0 + 0.2; z < z1; z += 0.42) parts.push([new THREE.BoxGeometry(x1 - x0, 0.12, 0.34), m4([(x0 + x1) / 2, PIER.y - 0.06, z])]);
      for (const x of [x0 + 0.15, x1 - 0.15]) for (const z of [z0 + 0.2, (z0 + z1) / 2, z1 - 0.2]) {
        const yb = Math.max(gy(x, z), seaY - 3.5) - 0.2;
        if (PIER.y - yb > 0.3) parts.push([new THREE.CylinderGeometry(0.12, 0.14, PIER.y - yb, 8), m4([x, (PIER.y + yb) / 2, z])]);
      }
    };
    deck(-PIER.w / 2, PIER.w / 2, PIER.z0, PIER.z1);
    deck(-PIER.px, PIER.px, PIER.z1, PIER.pz1);
    const body = new THREE.Mesh(toned(merge(parts), 0.8), mat);
    body.castShadow = body.receiveShadow = true;
    const rail = new THREE.Mesh(merge([
      [new THREE.BoxGeometry(2 * PIER.px, 0.1, 0.1), m4([0, PIER.y + 1.05, PIER.pz1 - 0.1])],
      ...[-PIER.px + 0.1, -PIER.px / 3, PIER.px / 3, PIER.px - 0.1].map((x) => [new THREE.BoxGeometry(0.1, 1.05, 0.1), m4([x, PIER.y + 0.52, PIER.pz1 - 0.1])]),
    ]), ink({ accent: 'ink' }));
    rail.castShadow = false;
    const jetty = new THREE.Group(); jetty.name = 'jetty';
    jetty.add(body, rail);
    g.add(layer('jetty', jetty));
  }

  // =================================================================== the person who writes the spec, and the sheet
  const writer = makePerson({ height: H });
  writer.material.userData.u.uShadeBias.value = 0.34;
  writer.group.name = 'writer';
  g.add(layer('writer', writer.group));
  const sheet = P.makeCard({ w: SHEET.w, d: SHEET.d, t: SHEET.t, lines: 4 });
  sheet.group.name = 'sheet';
  sheet.material.userData.u.uShadeBias.value = 0.32;
  sheet.material.userData.u.uAccentAll = { value: 1 };
  accents.push(sheet.material);
  sheet.group.matrixAutoUpdate = true;
  // the brand's emblem printed on the page, at its top right: the mark every boat will carry
  const sheetEmb = (() => {
    const grp = new THREE.Group(); grp.name = 'sheet-emblem';
    const at = new V3(SHEET.w / 2 - 0.62, SHEET.t + 0.02, -SHEET.d / 2 - 0.02);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(EMB_R, EMB_R, 0.05, 28).translate(at.x, at.y, at.z), ink({ shade: 1.0, bias: 0.1, accent: 'lime', focus: false }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(EMB_R + 0.03, 0.07, 6, 36).rotateX(Math.PI / 2).translate(at.x, at.y + 0.02, at.z), ink({ accent: 'ink' }));
    disc.castShadow = ring.castShadow = false;
    grp.add(disc, ring);
    accents.push(disc.material);
    return grp;
  })();
  sheet.group.add(sheetEmb);
  g.add(layer('sheet', sheet.group));

  // =================================================================== three inspectors at the checks of lane 2
  const team = new THREE.Group(); team.name = 'inspectors';
  const inspectors = [0, 1, 2].map((j) => {
    const p = makePerson({ height: HI });
    p.group.name = `inspector-${j + 1}`;
    p.material.userData.u.uShadeBias.value = 0.34;
    team.add(p.group);
    return p;
  });
  g.add(layer('inspectors', team));

  // =================================================================== the people on the shore, each with a bubble
  const crowdG = new THREE.Group(); crowdG.name = 'crowd';
  const BUB = { w: 2.3, h: 1.65 };
  const cloudMat = ink({ shade: 1, bias: 0.3 });
  // (the ? in dark pencil, not in ink: while the people are not the subject it stays as a faint drawing, it never goes)
  const qMat = ink({ shade: 0.12, bias: 0 }), ringMat = ink({ accent: 'ink' });
  const bubEmbMat = ink({ shade: 1.0, bias: 0.1, accent: 'lime', focus: false });
  accents.push(bubEmbMat);
  const CLOUD = cloudGeo(BUB.w, BUB.h), QM = qmarkGeo(1.3);
  const EMBD = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 28).rotateX(Math.PI / 2);
  const EMBR = mergeGeometries([-1, 1].map((sz) => strip(new THREE.TorusGeometry(0.52, 0.07, 6, 32).translate(0, 0, sz * 0.07))));
  const crowd = CROWD.map((c, i) => {
    const p = makePerson({ height: HC });
    p.group.name = `shore-${i + 1}`;
    p.material.userData.u.uShadeBias.value = 0.3;
    crowdG.add(p.group);
    const bub = new THREE.Group(); bub.name = 'bubble';
    const cloud = new THREE.Mesh(CLOUD, cloudMat);
    const q = new THREE.Mesh(QM, qMat); q.position.z = 0.06;
    const e = new THREE.Group(); e.add(new THREE.Mesh(EMBD, bubEmbMat), new THREE.Mesh(EMBR, ringMat)); e.position.z = 0.06;
    bub.add(cloud, q, e);
    bub.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = false; });
    crowdG.add(bub);
    return { p, bub, q, e, ...c };
  });
  // the marks that fly from three passing boats into the three bubbles (beat 5): recognised
  const flyers = crowd.map(() => {
    const f = new THREE.Group(); f.name = 'flyer';
    f.add(new THREE.Mesh(EMBD, bubEmbMat), new THREE.Mesh(EMBR, ringMat));
    const dots = [0, 1, 2].map((j) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16 - j * 0.03, 10, 8), ringMat); crowdG.add(m); return m; });
    f.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    for (const d of dots) d.castShadow = false;
    f.visible = false; for (const d of dots) d.visible = false;
    crowdG.add(f);
    return { f, dots };
  });
  g.add(layer('crowd', crowdG));

  // =================================================================== hit proxies
  const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
  /** one padded box per point set, rewritten as things move (one mesh, so the part has one proxy) */
  const multiProxy = (name, n) => {
    const one = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const b = one.attributes.position.array;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(b.length * n), 3));
    const m = new THREE.Mesh(geo, HIDDEN);
    m.name = `hit:${name}`; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.frustumCulled = false;
    /** boxes: [{ c: V3, s: V3 }] (unused slots collapse onto the first box) */
    m.userData.place = (boxes) => {
      const a = geo.attributes.position.array;
      for (let j = 0; j < n; j++) {
        const B = boxes[Math.min(j, boxes.length - 1)] || { c: new V3(0, -50, 0), s: new V3(0.01, 0.01, 0.01) };
        for (let i = 0; i < b.length; i += 3) {
          a[j * b.length + i] = B.c.x + b[i] * B.s.x;
          a[j * b.length + i + 1] = B.c.y + b[i + 1] * B.s.y;
          a[j * b.length + i + 2] = B.c.z + b[i + 2] * B.s.z;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere(); geo.computeBoundingBox();
    };
    g.add(m);
    return m;
  };
  writer.setPose('stand', 1);
  inspectors.forEach((p) => p.setPose('stand', 1));
  const hits = {
    hopper: P.makeHitProxy(hopper, 0.3),
    writer: P.makeHitProxy(writer.group, 0.35),
    sheet: multiProxy('sheet', 1),
    brief: multiProxy('brief', 2),
    bin: P.makeHitProxy(bin, 0.35),
    avg: multiProxy('avg', NCOP + 1),
    boats: multiProxy('boats', 24),
    inspectors: multiProxy('inspectors', 3),
    crowd: multiProxy('crowd', 3),
    flags: multiProxy('flags', 2),
  };
  const pickable = (mesh, on) => { if (on) mesh.layers.enable(0); else mesh.layers.disableAll(); };
  // every mesh's own shadow setting, so dimming can switch shadows off and emphasis can give them back
  g.traverse((o) => { if (o.isMesh) o.userData.cast0 = o.castShadow; });

  // =================================================================== the people's poses (pure)
  const memo = new Map();
  const pz = (who, name, o) => {
    const key = who.group.name + name + JSON.stringify(o || {});
    if (!memo.has(key)) memo.set(key, who.pose(name, o));
    return memo.get(key);
  };
  const st = (x, z, yaw, v) => ({ x, z, yaw, v });
  const blendTo = (a, b, k, h) => {
    const e = sm(k);
    const v = a.x === b.x && a.z === b.z ? a.v : reframe(a.v, a, { x: b.x, z: b.z, yaw: a.yaw }, h);
    return st(b.x, b.z, a.yaw + wrapA(b.yaw - a.yaw) * e, blendPoses(v, b.v, e));
  };
  /** a walk from frame A to frame B over [t0, t1]: turn, walk, settle */
  function walk(p, A, B, t, t0, t1, stride) {
    const h = p.height;
    const d = Math.hypot(B.x - A.x, B.z - A.z);
    if (t <= t0) return A;
    if (d < 0.05) return blendTo(A, B, seg(t, t0, t1), h);
    const yw = yawTo(A.x, A.z, B.x, B.z);
    const tt = Math.min(0.22, (t1 - t0) * 0.2);
    if (t < t0 + tt) return blendTo(A, st(A.x, A.z, yw, p.pose('walk', { dist: 0, stride })), seg(t, t0, t0 + tt), h);
    if (t < t1 - tt) {
      const r = seg(t, t0 + tt, t1 - tt), u = sm(r) * 0.8 + r * 0.2;
      return st(A.x + (B.x - A.x) * u, A.z + (B.z - A.z) * u, yw, p.pose('walk', { dist: d * u, stride }));
    }
    return blendTo(st(B.x, B.z, yw, p.pose('walk', { dist: d, stride })), B, seg(t, t1 - tt, t1), h);
  }
  const hangL = (v) => setHand(v, 'L', chestPt(v, 0.176, -0.16, 0.03), chestDir(v, 0.4, -0.1, -1));
  const hangR = (v) => setHand(v, 'R', chestPt(v, -0.176, -0.16, 0.03), chestDir(v, -0.4, -0.1, -1));

  // ---- the writer
  const yHome = yawTo(W_HOME.x, W_HOME.z, 0, 6);
  /** the sheet carried flat against the thigh in the right hand (high enough that the page clears the ground) */
  const carry = (v) => setHand(v, 'R', chestPt(v, -0.2, 0.03, 0.06), chestDir(v, -0.5, -0.1, -1), chestQ(v).multiply(eul(0, 0, 0)));
  const carried = (F) => st(F.x, F.z, F.yaw, carry(clonePose(F.v)));
  const W_IDLE = carry(hangL(look(clonePose(pz(writer, 'stand')), 0.1, 0.05)));
  // watching the copies run off and go under (beat 2): head and chest turned to the right
  const W_WATCH = carry(hangL(clonePose(pz(writer, 'watch', { yaw: -0.45, pitch: 0.12 }))));
  const yPut = yawTo(W_PUT.x, W_PUT.z, W_PUT.x, W_PUT.z + 5);
  const W_SHOW = (() => { const v = clonePose(pz(writer, 'hold')); v.head.copy(eul(0.02, 0, 0)); return v; })();
  const yBoard = yawTo(W_PUT.x, W_PUT.z, L2X, PRESS.z);
  const W_CLIP = (() => {
    const v = clonePose(pz(writer, 'stand'));
    v.waist.copy(eul(0.05, 0, 0));
    const root = { x: W_PUT.x, z: W_PUT.z, yaw: yBoard };
    setHand(v, 'R', inRoot(root, boardFace().add(new V3(0.45, -SHEET.d / 2 + 0.45, 0.12)), H), chestDir(v, -1, -0.4, -0.2), chestQ(v).multiply(eul(-1.4, 0, 0)));
    setHand(v, 'L', inRoot(root, boardFace().add(new V3(-0.8, -SHEET.d / 2 + 0.3, 0.12)), H), chestDir(v, 1, -0.4, -0.2));
    v.neck.copy(eul(-0.18, 0, 0)); v.head.copy(eul(-0.34, 0, 0));
    return v;
  })();
  const yBy = yawTo(W_BY.x, W_BY.z, W_BY.x + 1.6, W_BY.z + 6);
  const W_BYP = (() => {
    const v = hangL(clonePose(pz(writer, 'stand')));
    const tgt = inRoot({ x: W_BY.x, z: W_BY.z, yaw: yBy }, boardFace().add(new V3(-0.4, -0.5, 0.4)), H);
    setHand(v, 'R', chestPt(v, -0.15, 0.0, 0.2).lerp(tgt, 0.35), chestDir(v, -0.8, -0.6, -0.2));
    return look(v, 0.35, 0.0);
  })();
  const W_BYW = (yaw) => { const v = clonePose(W_BYP); return look(v, yaw, 0.1); };
  const SW0 = st(W_HOME.x, W_HOME.z, yHome, W_IDLE);
  const SW1 = st(W_HOME.x, W_HOME.z, yHome, W_WATCH);
  const SW_ARR = st(W_PUT.x, W_PUT.z, yPut, carry(hangL(clonePose(pz(writer, 'stand')))));
  const SW_SHOW = st(W_PUT.x, W_PUT.z, yPut, W_SHOW);
  const SW_CLIP = st(W_PUT.x, W_PUT.z, yBoard, W_CLIP);
  const SW_BY = st(W_BY.x, W_BY.z, yBy, W_BYP);
  function writerAt(beat, t) {
    if (beat === 0) return SW0;
    if (beat === 1) return blendTo(SW0, SW1, seg(t, 0.05, 0.6), H);
    if (beat === 2) {
      if (t < T2.walk1) return carried(walk(writer, SW1, SW_ARR, t, T2.walk0, T2.walk1, STRIDE));
      if (t < T2.show) return blendTo(SW_ARR, SW_SHOW, seg(t, T2.walk1, T2.show), H);
      if (t < T2.put) return blendTo(SW_SHOW, SW_CLIP, seg(t, T2.show, T2.put), H);
      if (t < T2.back0) return SW_CLIP;
      if (t < T2.back1) return walk(writer, SW_CLIP, SW_BY, t, T2.back0, T2.back1, STRIDE * 0.6);
      return st(W_BY.x, W_BY.z, yBy, W_BYW(lerp(0.35, 0.05, ss(t, T2.back1, 6.5))));
    }
    const yaw = beat === 3 ? lerp(0.05, 0.1, ss(t, 0.2, 1.6)) : lerp(0.1, -0.15, ss(t, 0.2, 2.5));
    return st(W_BY.x, W_BY.z, yBy, W_BYW(yaw));
  }

  // ---- the sheet: carried, shown, clipped on
  const HOLD_R = new M4().makeRotationX(Math.PI / 2);
  const HANDLE = new M4().makeTranslation(0, -SHEET.t / 2, -SHEET.d / 2);
  const heldM = (out) => {
    const grip = writer.hand('R');
    grip.updateWorldMatrix(true, false);
    return out.multiplyMatrices(gInv, grip.matrixWorld).multiply(HOLD_R).multiply(HANDLE);
  };
  const A_CARRY = 0.4;
  const CX = new V3(-Math.sin(A_CARRY), 0, Math.cos(A_CARRY)), CZ = new V3(0, -1, 0), CY = new V3().crossVectors(CZ, CX);
  const CARRY_Q = new Q().setFromRotationMatrix(new M4().makeBasis(CX, CY, CZ));
  const _one = new V3(1, 1, 1);
  const carryM = (out) => {
    const grip = writer.hand('R');
    grip.updateWorldMatrix(true, false);
    const c = g.worldToLocal(grip.getWorldPosition(new V3())).add(new V3(0, -SHEET.d / 2 + 0.05, 0)).addScaledVector(CX, 1.0);
    return out.compose(c, CARRY_Q, _one);
  };
  const boardM = new M4().compose(boardFace().add(new V3(0, 0, 0.03)), new Q().setFromAxisAngle(XAX, Math.PI / 2), new V3(1, 1, 1));
  const _la = [new V3(), new Q(), new V3()], _lb = [new V3(), new Q(), new V3()];
  const lerpM = (a, b, k, out) => {
    a.decompose(..._la); b.decompose(..._lb);
    return out.compose(_la[0].lerp(_lb[0], k), _la[1].slerp(_lb[1], k), _la[2].lerp(_lb[2], k));
  };

  // ---- the inspectors
  const IY = IX.map((x) => yawTo(x, 0, L2X, 0) + (x > L2X ? 0.45 : -0.45));   // to the lane, turned to the reader
  const qHeld = (yaw) => new Q().setFromAxisAngle(YAX, Math.atan2(-Math.cos(yaw), Math.sin(yaw)));
  const heldOut = (b) => b.L / 2 - 0.15;
  const ahead = (yaw, d) => new V3(Math.sin(yaw) * d, 0, Math.cos(yaw) * d);
  const ISTAND = (j) => st(IX[j], SZI[j], IY[j], look(hangR(hangL(clonePose(pz(inspectors[j], 'stand')))), 0, 0.15));
  /** the first one reaching down to the boat in front of them on the belt (both hands to its near end) */
  const IREACH = (() => {
    const p = inspectors[0], root = { x: IX[0], z: SZI[0], yaw: IY[0] };
    const near = new V3(L2X, BELT.top, SZI[0]).add(new V3(oddB.L * 0.3, oddB.D * 0.6, 0));
    const tIn = inRoot(root, near, 1);
    const v = clonePose(pz(p, 'stamp', { y: +(near.y).toFixed(3), fwd: +(tIn.z).toFixed(3), x: +(tIn.x).toFixed(3), table: BELT.top }));
    const c = inRoot(root, near, HI);
    setHand(v, 'R', c.clone().add(new V3(-0.1, 0, 0)), chestDir(v, -0.8, 0.2, -1));
    setHand(v, 'L', c.clone().add(new V3(0.1, 0, 0)), chestDir(v, 0.8, 0.2, -1));
    return v;
  })();
  /** the boat held up at the chest, looked at */
  const IHOLD = (turn = 0) => {
    const v = clonePose(pz(inspectors[0], 'hold'));
    setHand(v, 'R', chestPt(v, -0.1, 0.03, 0.21), chestDir(v, -0.7, -1, -0.3));
    setHand(v, 'L', chestPt(v, 0.1, 0.03, 0.21), chestDir(v, 0.7, -1, -0.3));
    v.neck.copy(eul(0.22, turn * 0.3, 0)); v.head.copy(eul(0.3, turn * 0.4, 0));
    return v;
  };
  const yBin = yawTo(IX[0], SZI[0], BIN.x, BIN.z);
  const IDROP = (() => {
    const p = inspectors[0], root = { x: IX[0], z: SZI[0], yaw: yBin };
    const v = clonePose(pz(p, 'stand'));
    const over = inRoot(root, new V3(BIN.x, BIN.h + 0.6, BIN.z).sub(ahead(yBin, heldOut(oddB))), HI);
    setHand(v, 'R', over.clone().add(new V3(-0.09, 0, 0)), chestDir(v, -0.8, -0.4, -1));
    setHand(v, 'L', over.clone().add(new V3(0.09, 0, 0)), chestDir(v, 0.8, -0.4, -1));
    v.waist.copy(eul(0.12, 0, 0)); v.neck.copy(eul(0.2, 0, 0)); v.head.copy(eul(0.3, 0, 0));
    return v;
  })();
  const handsMid = (p) => {
    const a = g.worldToLocal(p.hand('R').getWorldPosition(new V3())), b = g.worldToLocal(p.hand('L').getWorldPosition(new V3()));
    return a.add(b).multiplyScalar(0.5);
  };
  /** inspector i at (beat, t): { F: frame, holds } */
  function inspectorAt(i, beat, t) {
    const S0 = ISTAND(i);
    // watching the line: the two on the outer side look up the belt toward the press, at the boats coming down
    const watchLine = (k) => st(S0.x, S0.z, S0.yaw, look(clonePose(S0.v), lerp(0, i === 0 ? 0.35 : -0.5, k), 0.25));
    if (beat < 2) return { F: S0, holds: false };
    if (beat === 2) return { F: watchLine(ss(t, 3.0, 4.2)), holds: false };
    if (beat > 3 || i > 0) return { F: watchLine(1), holds: false };
    // the first one: reaches for the boat without its emblem as it comes level, lifts it, looks, drops it in the bin
    const W0 = watchLine(1);
    const RCH = st(IX[0], SZI[0], IY[0], IREACH);
    const HLD = st(IX[0], SZI[0], IY[0], IHOLD(0));
    const LOOK = st(IX[0], SZI[0], IY[0], IHOLD(-0.35));
    const DR = st(IX[0], SZI[0], yBin, IDROP);
    if (t < T3.reach0) return { F: W0, holds: false };
    if (t < T3.grab) return { F: blendTo(W0, RCH, seg(t, T3.reach0, T3.grab), HI), holds: false };
    if (t < T3.lift) return { F: blendTo(RCH, HLD, seg(t, T3.grab, T3.lift), HI), holds: true };
    if (t < T3.look) return { F: blendTo(HLD, LOOK, seg(t, T3.lift, T3.look), HI), holds: true };
    if (t < T3.drop) return { F: blendTo(LOOK, DR, seg(t, T3.look, T3.drop - 0.05), HI), holds: t < T3.drop - 0.06 };
    return { F: blendTo(DR, W0, seg(t, T3.drop + 0.05, T3.back), HI), holds: false };
  }

  // ---- the people on the shore: facing the sea; they turn to the copies (beat 1) and later to the fleet (beat 5)
  const poolDir = (c) => yawTo(c.x, c.z, POOL.x, POOL.z);
  const fleetDir = (c) => yawTo(c.x, c.z, -6.5, (ROWZ[0] + ROWZ[1]) / 2 + 1.0);
  /** a person at the edge: the root turned by a part of the way to the target, head and chest the rest */
  const turnTo = (i, aim, k, point = 0) => {
    const c = crowd[i], body = aim * 0.75 * k, rest = aim - body;
    const v = c.p.pose('watch', { yaw: rest * k, pitch: 0.22 });
    hangL(v); hangR(v);
    if (point > 0) {
      // the right arm up and out, pointing at the fleet below
      const tip = inRoot({ x: c.x, z: c.z, yaw: body }, new V3(-7.5, waterY + 1.5 - PIER.y, (ROWZ[0] + ROWZ[1]) / 2), 1);
      const sh = chestPt(v, -0.17, 0.12, 0.02), dir = tip.clone().multiplyScalar(1 / HC).sub(sh).normalize();
      const up = chestPt(v, -0.176, -0.16, 0.03).lerp(sh.clone().addScaledVector(dir, 0.33), sm(point));
      setHand(v, 'R', up, chestDir(v, -0.6, -0.3, -1));
    }
    return { yaw: body, v };
  };
  function crowdAt(i, beat, t) {
    const c = crowd[i];
    const toPool = poolDir(c), toFleet = fleetDir(c);
    let aim = 0, point = 0, q = 0, e = 0, cl = 1;
    if (beat === 0) {
      const k = ss(t, T_SEE.turn0 + i * 0.06, T_SEE.turn1 + i * 0.06);
      aim = toPool * k;
      q = pop(seg(t, T_SEE.q + i * T_SEE.gap, T_SEE.q + i * T_SEE.gap + 0.3));
      cl = q;
    } else if (beat < 4) {
      aim = toPool; q = 1;
    } else {
      const d = i * T_KNOW.gap;
      const k = ss(t, T_KNOW.turn0 + d, T_KNOW.turn1 + d);
      aim = lerp(toPool, toFleet, k);
      q = 1 - ss(t, T_KNOW.out + d, T_KNOW.out + d + 0.2);
      e = pop(seg(t, T_KNOW.emb + d, T_KNOW.emb + d + 0.32));
      if (i === 0) point = ss(t, T_KNOW.point0, T_KNOW.point1);
    }
    const T = turnTo(i, aim, 1, point);
    return { yaw: T.yaw, v: T.v, q, e, cl };
  }

  // =================================================================== the schedules (pure, on the story's clock G)
  const qPitch = (pitch) => new Q().setFromAxisAngle(XAX, pitch);
  const Q_LEFT = new Q().setFromAxisAngle(YAX, Math.PI);          // the brand's boats face left from the press on
  const Q_FLEET = new Q().setFromAxisAngle(YAX, Math.PI + FLEET_A);   // and sail out bow first, down and to the left
  const onBelt = (lx, z) => new V3(lx, BELT.top, z);
  const _tg = new V3();
  /** on a slipway at u (0 at the belt's end, WET at the water), sliding broadside, tipped with the slope */
  const onSlip = (slip, u, wet) => {
    const k = clamp(u) * wet;
    const p = slip.getPointAt(k);
    slip.getTangentAt(Math.min(0.999, k), _tg);
    const pitch = Math.atan2(-_tg.y, _tg.z);
    return { p: p.clone().add(new V3(0, 0.05, 0)), q: qPitch(pitch * 0.85) };
  };
  function chuteAt(lx, u) {
    const a = chuteA(lx), b = chuteB(lx);
    const p = a.clone().lerp(b, eiq(u));
    p.y += Math.sin(Math.PI * u) * 0.25 - 0.35;
    const yaw = Math.atan2(-(b.z - a.z), b.x - a.x);
    return { p, q: new Q().setFromAxisAngle(YAX, yaw * (1 - sm(seg(u, 0.6, 1)))) };
  }
  /** where piece n of a lane is on its line at G: { chute } or { z } (z past the belt's end means it has left), or null */
  function lineAt(lane, n, G) {
    const lx = lane ? L1X : L2X;
    if (n < NB) {
      const s = burstS(lane, n);
      if (G < s) return null;
      if (G < s + CHUTE) return { chute: chuteAt(lx, seg(G, s, s + CHUTE)) };
      // the burst: it shoots from the head to its place in the line (which starts to run at T_RUN)
      const s1 = s + CHUTE, e = eo(seg(G, s1, s1 + 0.25 + (QZ(n) - HEADZ) / 16));
      return { z: HEADZ + (zLine(n, G) - HEADZ) * e };
    }
    const th = tLine(n, HEADZ);
    if (G < th - CHUTE) return null;
    if (G < th) return { chute: chuteAt(lx, seg(G, th - CHUTE, th)) };
    return { z: zLine(n, G) };
  }
  // the heap: each copy's place in the pool — a golden-angle spiral, lane 2's on the far side of lane 1's; the ones in
  // the middle lie higher (thrown on the others); every heading
  const NSLOT = 12;
  const HEAP_AT = [0, 1].map((lane) => Array.from({ length: NSLOT }, (_, m) => {
    const r = rng(61 + lane * 17 + m);
    const a = m * 2.39996 + lane * Math.PI + 0.4;
    const rr = 2.35 * Math.sqrt(0.18 + 0.82 * ((m * 0.618034 + lane * 0.31) % 1));
    const x = POOL.x + Math.cos(a) * rr * 0.92, z = POOL.z + Math.sin(a) * rr * 1.25;
    const lift = 0.55 * (1 - (rr / 2.35) ** 2);
    const q = new Q().setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * Math.PI * 2, (r() - 0.5) * 0.7, 'YXZ'));
    return { p: new V3(x, waterY + 0.05 + lift, z), lift, q, tip: new V3(r() - 0.5, 0, r() - 0.5).normalize() };
  }));
  const SINK_D = BOAT_H + 0.3;
  /** a copy that left the belt at E: down the slipway, into its place in the heap, then under; null once wholly under */
  function copyOff(lane, n, E, G) {
    const slip = lane ? slip1 : slip2, wet = lane ? WET1 : WET2;
    if (G < E + SLIDE) { const o = onSlip(slip, eiq(seg(G, E, E + SLIDE)), wet); return { p: o.p, q: o.q }; }
    const h = HEAP_AT[lane][n % NSLOT], gl = GLIDE[lane];
    const land = onSlip(slip, 1, wet).p.setY(waterY + 0.05);
    const t1 = E + SLIDE + gl;
    if (G < t1) {
      const u = seg(G, E + SLIDE, t1), v = eo(u);
      // (lane 2's go round the front of the landing)
      const p = lane ? land.clone().lerp(h.p, v) : new V3().addScaledVector(land, (1 - v) * (1 - v)).addScaledVector(new V3(-1.5, waterY + 0.05, PIER.pz1 + 3.2), 2 * v * (1 - v)).addScaledVector(h.p, v * v);
      p.y += Math.sin(Math.PI * seg(G, E + SLIDE, E + SLIDE + 0.25)) * 0.25 + Math.sin(Math.PI * u) * 0.4 * (h.lift > 0.2 ? 1 : 0);
      return { p, q: new Q().slerp(h.q, sm(u)), sink: 0.001 };
    }
    const s = ss(G, t1 + SINK0, t1 + SINK0 + SINKD);
    if (s >= 0.999) return null;
    const p = h.p.clone(); p.y -= s * (SINK_D + h.lift);
    return { p, q: h.q.clone().premultiply(new Q().setFromAxisAngle(h.tip, 0.45 * sm(s))), sink: Math.max(0.001, s) };
  }
  /** a brand boat that left the belt at E: down the slipway, out to its row, along it to the left; null once gone */
  function brandOff(n, E, G) {
    if (G < E + SLIDE) { const o = onSlip(slip2, eiq(seg(G, E, E + SLIDE)), WET2); return { p: o.p, q: o.q.multiply(Q_LEFT), s: lerp(BELT_S, 1, seg(G, E, E + SLIDE)) }; }
    const land = onSlip(slip2, 1, WET2).p.setY(waterY + 0.05);
    const r = rowOf(n), z = ROWZ[r];
    const CURVE = 0.55 + 0.3 * r;
    const start = new V3(L2X - 0.7 - 0.4 * r, waterY + 0.05, z);
    const t1 = E + SLIDE + CURVE;
    if (G < t1) {
      const u = seg(G, E + SLIDE, t1);
      const ctrl = new V3(land.x - 0.3, waterY + 0.05, z);
      const p = new V3().addScaledVector(land, (1 - u) * (1 - u)).addScaledVector(ctrl, 2 * u * (1 - u)).addScaledVector(start, u * u);
      p.y += Math.sin(Math.PI * seg(G, E + SLIDE, E + SLIDE + 0.25)) * 0.25;
      // the bow swings from the slipway's broadside toward the way out
      return { p, q: new Q().setFromAxisAngle(YAX, Math.PI + FLEET_A * sm(u) + 0.4 * Math.sin(Math.PI * u)) };
    }
    const d = FLEET_V * (G - t1);
    const x = start.x - d * Math.cos(FLEET_A);
    if (x < X_GONE) return null;
    return { p: new V3(x, waterY + 0.05, z + d * Math.sin(FLEET_A)), q: Q_FLEET.clone() };
  }

  // beat 5: the boats whose marks fly into the three bubbles — three of different kinds, in the water off the landing
  const FLY = crowd.map((c, i) => ({ ta: T_KNOW.emb + i * T_KNOW.gap - 0.42, tb: T_KNOW.emb + i * T_KNOW.gap, n: null }));
  {
    const used = new Set();
    for (const F of FLY) {
      const Ga = START[4] + F.ta;
      let best = null;
      for (let n = N0; n < NMAX; n++) {
        if (n === N_ODD) continue;
        const E = tLine(n, BELT.z1);
        if (E + SLIDE > Ga) break;
        const o = brandOff(n, E, Ga);
        if (!o || used.has(kindOf(n)) || o.p.x < -9 || o.p.x > -3.2) continue;
        if (!best || o.p.x > best.x) best = { n, x: o.p.x };
      }
      if (best) { F.n = best.n; used.add(kindOf(best.n)); }
    }
  }

  // =================================================================== pose: (beat, k) → everything
  const S = { beat: LAST, t: BEATS[LAST].dur, G: START[LAST + 1], emph: null, sheetOn: 'board', sheetUp: true, rej: true, avgPts: [], boatPts: [], copyN: 0, inPool: new Uint8Array(NCOP), pool: 1 };
  const _m = new M4(), _p = new V3(), _q = new Q(), _s = new V3();
  const TINY = new V3(1e-4, 1e-4, 1e-4);

  function pose(beat, k = 1) {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    const t = clamp(Number.isNaN(+k) ? 1 : +k) * BEATS[beat].dur;
    const G = START[beat] + t;
    S.beat = beat; S.t = t; S.G = G;

    // ---- the hopper: a jolt on arrival, then a shudder with every pair of pieces it drops (it never stops)
    {
      let sh = G < 0.34 ? 1 : G < 1.3 ? lerp(1, 0.5, ss(G, 0.34, 1.3)) : 0;
      if (G > 0.8) { const ph = ((G - T_RUN) / (PITCH / V_B)) % 1; sh = Math.max(sh, 0.32 * Math.sin(Math.PI * clamp(ph / 0.35))); }
      const y0 = gy(HOP.x, HOP.z);
      hopper.position.set(HOP.x + Math.sin(G * 71) * 0.12 * sh, y0 + Math.abs(Math.sin(G * 53)) * 0.1 * sh, HOP.z + Math.sin(G * 61 + 1) * 0.09 * sh);
      hopper.rotation.set(Math.sin(G * 43) * 0.022 * sh, 0, Math.sin(G * 59) * 0.022 * sh);
      const kick = Math.sin(Math.PI * seg(G, 0.02, 0.3));
      hopper.scale.set(1 + 0.05 * kick, 1 - 0.06 * kick, 1 + 0.05 * kick);
      hopper.userData.heap.position.y = -0.6 * ss(G, 0.3, 3.8);
    }

    // ---- the writer and the sheet
    const F = writerAt(beat, t);
    writer.apply(F.v);
    writer.group.position.set(F.x, gy(F.x, F.z), F.z);
    writer.group.rotation.set(0, F.yaw, 0);
    writer.group.updateMatrixWorld(true);
    {
      const m = sheet.group.matrix;
      let on = 'hand';
      if (beat < 2 || (beat === 2 && t < T2.walk1)) carryM(m);
      else if (beat === 2 && t < T2.show) lerpM(carryM(_m), heldM(new M4()), ss(t, T2.walk1, T2.show), m);
      else if (beat === 2 && t < T2.put) lerpM(heldM(_m), boardM, ss(t, T2.show + 0.06, T2.put), m);
      else { m.copy(boardM); on = 'board'; }
      m.decompose(sheet.group.position, sheet.group.quaternion, sheet.group.scale);
      S.sheetOn = on; S.sheetUp = on === 'board';
    }
    // the page covers the one-liner and the dashed outline on its board; the right one keeps both to the end.  The
    // outline is not there in beat 1: in beat 2 it draws itself round the empty board, dash by dash
    const gapK = beat === 0 ? 0 : beat === 1 ? sm(seg(t, T_GAP.a, T_GAP.b)) : 1;
    for (const Pp of [P2, P1]) {
      const n = Math.round(gapK * Pp.slot.userData.n);
      Pp.slot.geometry.setDrawRange(0, n * Pp.slot.userData.per);
      Pp.slot.visible = n > 0;
    }
    P2.slot.visible &&= !S.sheetUp;
    P2.note.group.visible = !S.sheetUp;

    // ---- the press on the left: its ram comes down on every piece that passes once the spec is on
    {
      let down = 0, a = 1e9;
      for (let n = N0; n < NMAX; n++) {
        const ts = stampT(n);
        if (ts > G + 0.3) break;
        down = Math.max(down, Math.max(0, 1 - Math.abs((G - ts) / (ts > G ? 0.14 : 0.22))));
        if (G >= ts) a = Math.min(a, G - ts);
      }
      ram.position.y = lerp(RAM.rest, RAM.down, Math.pow(down, 0.7));
      const u = a / 0.3;
      impact.visible = u < 1;
      impact.position.set(L2X, BELT.top + BOAT_H * 0.55, PRESS.z);
      impact.scale.set(1.8 + 1.6 * u, 1 + 0.5 * u, 1.0 + u);
    }

    // ---- the inspectors (before the boats: the first one carries the odd one)
    let held = null;
    inspectors.forEach((p, i) => {
      const I = inspectorAt(i, beat, t);
      p.apply(I.F.v);
      p.group.position.set(I.F.x, gy(I.F.x, I.F.z), I.F.z);
      p.group.rotation.set(0, I.F.yaw, 0);
      p.group.updateMatrixWorld(true);
      if (I.holds) held = { p: handsMid(p).add(new V3(0, -oddB.D * 0.6, 0)).add(ahead(I.F.yaw, heldOut(oddB))), q: qHeld(I.F.yaw) };
    });

    // ---- the people on the shore and their bubbles
    crowd.forEach((c, i) => {
      const C = crowdAt(i, beat, t);
      c.p.apply(C.v);
      c.p.group.position.set(c.x, PIER.y, c.z);
      c.p.group.rotation.set(0, C.yaw, 0);
      c.p.group.updateMatrixWorld(true);
      const head = g.worldToLocal(c.p.top());
      c.bub.visible = C.cl > 0.001;
      // (the middle one's bubble rides higher, so the three never overlap)
      c.bub.position.set(c.x + (i - 1) * 0.12, head.y + 0.55 + BUB.h / 2 + (i === 1 ? 1.15 : 0), c.z);
      c.bub.rotation.set(-0.18, 0.22, 0);
      c.bub.scale.setScalar(Math.max(1e-3, C.cl));
      c.q.visible = C.q > 0.001; c.q.scale.setScalar(Math.max(1e-3, C.q));
      c.e.visible = C.e > 0.001; c.e.scale.setScalar(Math.max(1e-3, C.e));
    });

    // ---- the stream: every piece of both lanes
    const avgPts = [], boatPts = [];
    let nc = 0;
    const counts = {};
    for (const name of KINDS) counts[name] = 0;
    const putCopy = (pl) => {
      if (nc >= NCOP) return;
      const sq = pl.sq ?? 1;
      _s.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      copies.setMatrixAt(nc, _m.compose(pl.p, pl.q, _s));
      copyEdges.setMatrixAt(nc, _m);
      S.inPool[nc] = pl.sink ? 1 : 0;
      avgPts.push(pl.p);
      nc++;
    };
    const putBrand = (name, pl) => {
      const K = KG[name], i = counts[name];
      if (i >= CAPK) return;
      const sq = pl.sq ?? 1, u = pl.s ?? 1;
      _s.set(u * (1 + (1 - sq) * 0.35), u * sq, u * (1 + (1 - sq) * 0.35));
      _m.compose(pl.p, pl.q, _s);
      for (const im of K.ims) im.setMatrixAt(i, _m);
      counts[name] = i + 1;
      boatPts.push({ p: pl.p, L: K.L, top: K.top, B: K.B });
    };
    let oddPl = null;
    for (let lane = 0; lane < 2; lane++) {
      const lx = lane ? L1X : L2X;
      for (let n = 0; n < NMAX; n++) {
        const L = lineAt(lane, n, G);
        if (!L) break;
        const spec = lane === 0 && n >= N0;
        if (L.chute) { putCopy(L.chute); continue; }
        const z = L.z;
        if (!spec) {
          if (z < BELT.z1) { putCopy({ p: onBelt(lx, z), q: new Q() }); continue; }
          const o = copyOff(lane, n, tLine(n, BELT.z1), G);
          if (o) putCopy(o);
          continue;
        }
        // the spec lane: a copy until the press, then the brand's boat it stamps
        const ts = stampT(n);
        if (G < ts + 0.04) {
          putCopy({ p: onBelt(lx, Math.min(z, PRESS.z)), q: new Q(), sq: 1 - 0.3 * ss(G, ts - 0.1, ts) });
          if (G < ts) continue;
        }
        const sq = 0.45 + 0.55 * pop(seg(G, ts, ts + 0.3));
        if (n === N_ODD) {
          if (G < G_GRAB) oddPl = { p: onBelt(lx, z), q: Q_LEFT.clone(), sq, s: BELT_S };
          else if (held) oddPl = { p: held.p, q: held.q, s: BELT_S };
          else oddPl = { bin: true };
          continue;
        }
        if (z < BELT.z1) { putBrand(kindOf(n), { p: onBelt(lx, z), q: Q_LEFT.clone(), sq, s: BELT_S }); continue; }
        const o = brandOff(n, tLine(n, BELT.z1), G);
        if (o) putBrand(kindOf(n), o);
      }
    }
    for (let i = nc; i < NCOP; i++) { copies.setMatrixAt(i, _m.compose(_p.set(0, -50, 0), _q.identity(), TINY)); copyEdges.setMatrixAt(i, _m); S.inPool[i] = 0; }
    copies.count = copyEdges.count = Math.max(1, nc);
    copies.instanceMatrix.needsUpdate = true;
    copyEdges.instanceMatrix.needsUpdate = true;
    for (const name of KINDS) for (const im of KG[name].ims) { im.count = counts[name]; im.instanceMatrix.needsUpdate = true; }
    S.copyN = nc;

    // ---- beat 5: a copy of each passing boat's mark flies into a bubble, where the emblem then lands
    crowd.forEach((c, i) => {
      const F = FLY[i], fl = flyers[i];
      const o = beat === 4 && F.n !== null && t >= F.ta && t < F.tb ? brandOff(F.n, tLine(F.n, BELT.z1), G) : null;
      fl.f.visible = !!o;
      for (const d of fl.dots) d.visible = !!o;
      if (!o) return;
      const u = sm(seg(t, F.ta, F.tb));
      const a = KG[kindOf(F.n)].markAt.clone().applyQuaternion(o.q).add(o.p), b = c.bub.position.clone();
      const ctrl = a.clone().lerp(b, 0.5); ctrl.y += 2.6;
      const bz = (v) => new V3().addScaledVector(a, (1 - v) * (1 - v)).addScaledVector(ctrl, 2 * v * (1 - v)).addScaledVector(b, v * v);
      fl.f.position.copy(bz(u));
      fl.f.rotation.copy(c.bub.rotation);
      fl.f.scale.setScalar(0.65 + 0.35 * u);
      fl.dots.forEach((dm, j) => dm.position.copy(bz(Math.max(0, u - 0.1 * (j + 1)))));
    });

    // ---- the odd one: on the line, in the hands, in the bin
    let rejOn = false;
    if (oddPl && oddPl.bin) {
      const inBin = new V3(0.15, 0, 0).applyAxisAngle(YAX, A_BIN).setY(0.36).add(bin.position);
      const from = new V3(BIN.x, bin.position.y + BIN.h + 0.1, BIN.z);
      const kk = seg(G, G_DROP - 0.06, G_DROP + 0.14);
      oddPl = { p: from.lerp(inBin, kk * kk), q: Q_HELD_BIN.clone().slerp(Q_BIN, kk), s: BELT_S };
      rejOn = true;
    }
    oddGroup.visible = !!oddPl;
    if (oddPl) {
      const sq = oddPl.sq ?? 1;
      oddGroup.position.copy(oddPl.p); oddGroup.quaternion.copy(oddPl.q);
      const u = oddPl.s ?? 1;
      oddGroup.scale.set(u * (1 + (1 - sq) * 0.35), u * sq, u * (1 + (1 - sq) * 0.35));
      if (!rejOn) boatPts.push({ p: oddPl.p, L: oddB.L, top: oddB.top, B: oddB.B });
    }
    S.rej = rejOn; S.avgPts = avgPts; S.boatPts = boatPts;
    // the fault found: the inspector's look rings the empty place in red, and the ✕ over the bin comes with it
    const found = beat > 3 || (beat === 3 && t >= T3.look - 0.15);
    S.found = found;
    oddRing.visible = found && !!oddPl;
    oddRing.scale.setScalar(beat === 3 ? Math.max(1e-3, pop(seg(t, T3.look - 0.15, T3.look + 0.15))) : 1);
    xMark.group.visible = found;
    xMark.group.scale.setScalar(beat === 3 ? Math.max(1e-3, pop(seg(t, T3.look - 0.1, T3.look + 0.25))) : 1);

    // ---- the pool: it spreads as the first copies come in, and stays
    {
      const k2 = Math.max(0.001, 0.25 + 0.75 * ss(G, 1.9, 4.6));
      S.pool = G < 1.85 ? 0 : k2;
      pool.scale.set(k2, k2, 1);
      pool.userData.on = G >= 1.85;
    }

    // ---- hit proxies that follow what they stand for
    const box = (c, sx, sy, sz) => ({ c: c.clone().add(new V3(0, sy / 2 - 0.2, 0)), s: new V3(sx, sy, sz) });
    const avgBoxes = avgPts.map((p) => box(p, 2 * BS + 0.6, BOAT_H + 0.8, 2 * BS * 0.6 + 0.6));
    if (S.pool > 0.2) avgBoxes.push({ c: new V3(POOL.x, waterY + 0.4, POOL.z), s: new V3(POOL.rx * 1.6 * S.pool, 1.2, POOL.rz * 1.6 * S.pool) });
    hits.avg.userData.place(avgBoxes);
    pickable(hits.avg, avgBoxes.length > 0);
    const bBoxes = boatPts.slice(0, 24).map((b) => box(b.p, b.L + 0.6, b.top + 0.6, b.B + 0.8));
    hits.boats.userData.place(bBoxes);
    pickable(hits.boats, bBoxes.length > 0);
    hits.inspectors.userData.place(inspectors.map((p) => box(p.group.position, 0.3 * HI + 0.3, HI + 0.5, 0.26 * HI + 0.3)));
    hits.crowd.userData.place(crowd.map((c) => box(c.p.group.position, 0.3 * HC + 0.5, HC + 0.4 + (c.bub.visible ? BUB.h + 0.8 : 0), 0.3 * HC + 0.4)));
    hits.flags.userData.place([P2, P1].map((Pp) => { const c = wpL(Pp.flag, Pp.flag.userData.mc); return { c, s: new V3(FLAG.w + 0.6, FLAG.h + 0.6, 0.8) }; }));
    hits.brief.userData.place([P2, P1].filter((Pp) => Pp.note.group.visible).map((Pp) => ({ c: new V3().setFromMatrixPosition(Pp.note.group.matrix), s: new V3(NOTE.w + 0.5, NOTE.d + 0.6, 0.8) })));
    if (beat < 2) {
      const f = boardFace();
      hits.sheet.userData.place([{ c: f, s: new V3(BOARD.w + 0.8, BOARD.h + 0.8, 0.9) }]);
    } else {
      const m = sheet.group.matrix, lo = new V3(1e9, 1e9, 1e9), hi = new V3(-1e9, -1e9, -1e9);
      for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) {
        const c = new V3((sx * SHEET.w) / 2, sy * SHEET.t, (sz * SHEET.d) / 2).applyMatrix4(m);
        lo.min(c); hi.max(c);
      }
      hits.sheet.userData.place([{ c: lo.clone().add(hi).multiplyScalar(0.5), s: hi.clone().sub(lo).addScalar(0.8) }]);
    }

    applyEmphasis();
  }
  // a point of an object in the district's frame
  function wpL(o, v) { o.updateWorldMatrix(true, false); return g.worldToLocal(o.localToWorld(v.clone())); }
  // the rejected one in the bin: the heading it had in the inspector's hands, tipped, wholly inside the wall
  const A_BIN = Math.atan2(-Math.cos(yBin), Math.sin(yBin));
  const Q_HELD_BIN = new Q().setFromAxisAngle(YAX, A_BIN);
  const Q_BIN = Q_HELD_BIN.clone().multiply(new Q().setFromAxisAngle(ZAX, 0.5));

  // =================================================================== emphasis by subtraction
  const FULL = {
    hopper: ['hopper'],
    avg: ['pool'],
    // the one-line requests on both boards, with the dashed page under each and the presses that hold them
    brief: ['brief2', 'brief1', 'slot', 'slot1', 'press2', 'press1'],
    sheet: ['sheet', 'press2'],
    writer: ['writer'],
    inspectors: ['inspectors'],
    bin: ['bin', 'x', 'odd'],
    boats: ['fleet'],
    crowd: ['crowd'],
    flags: ['flags', 'press2', 'press1'],
  };
  function setDim(obj, k) {
    dim(obj, k);
    obj.traverse((o) => { if (o.isMesh && !o.userData.hitProxy) o.castShadow = k < 0.5 ? !!o.userData.cast0 : false; });
  }
  const binMat = bin.children[0].material;
  // before the spec is on, its part is the empty board (the press with the dashed page and the one-liner under the clip)
  const fullOf = (id) => (id === 'sheet' && S.beat < 2 ? ['press2', 'slot', 'brief2'] : FULL[id] || []);
  function applyEmphasis() {
    const E = S.emph;
    const map = !E;
    const full = new Set();
    if (E) for (const id of E) for (const l of fullOf(id)) full.add(l);
    const own = BEATS[S.beat].parts;
    const has = (id) => map || E.has(id);
    // the off-brand one is one of the brand's boats until it is caught: it lights with them, then with the bin
    if (!map && !S.rej && E.has('boats')) full.add('odd');
    if (!map && S.rej && (E.has('bin') || E.has('inspectors'))) full.add('odd');
    // the flags stay with their presses whenever a press is lit
    if (full.has('press2') || full.has('press1')) full.add('flags');
    for (const [name, objs] of Object.entries(layers)) for (const o of objs) setDim(o, map || full.has(name) ? 0 : 1);
    // a part the reader picked by itself (not its beat's own set) also gains contrast: darker drawing
    const solo = !map && E.size === 1 && !(own.length === 1 && E.has(own[0]));
    const lift = (id) => solo && E.has(id);
    // the copies: teal type whenever they are the story; otherwise they rest lighter, their glyphs kept
    const TYPED_REST = 0.12, POOLED = 0.22;
    const teal = !map && has('avg');
    const typedDim = has('avg') ? 0 : TYPED_REST;
    for (let i = 0; i < NCOP; i++) bDim.array[i] = map ? 0 : typedDim;
    bDim.needsUpdate = true;
    eDim.array.set(bDim.array);
    eDim.needsUpdate = true;
    const ca = copies.instanceColor.array;
    // (a copy going under is drawn darker than the type it sinks into: a boat, not more glyphs)
    for (let i = 0; i < NCOP; i++) { ca[i * 3] = lift('avg') ? 0.32 : S.inPool[i] ? POOLED : 0.5; ca[i * 3 + 1] = 1; ca[i * 3 + 2] = -1; }
    copies.instanceColor.needsUpdate = true;
    copyMat.userData.u.uAccent.value = teal ? ACCENT.teal : 0;
    poolMat.userData.u.uAccent.value = teal ? ACCENT.teal : 0;
    harbour.visible = !map;
    pool.visible = !map && pool.userData.on !== false;
    const on = !map;
    // the AI: teal whenever it is lit (every beat: it never stops)
    hopMat.userData.u.uAccent.value = on && full.has('hopper') ? ACCENT.teal : 0;
    hopMat.userData.u.uShadeMul.value = lift('hopper') ? 0.45 : 0.62;
    // the brand's boats: the lime emblem whenever they are in full; the odd one red once it is caught (with its ✕)
    const fleetOn = map || full.has('fleet');
    brandMats.emb.userData.u.uAccent.value = on && fleetOn ? ACCENT.lime : 0;
    brandMats.sail.userData.u.uShadeBias.value = lift('boats') ? 0.0 : 0.16;
    const oddOn = map || full.has('odd');
    oddMats.hull.userData.u.uAccent.value = S.rej ? (on && oddOn && has('bin') ? ACCENT.red : 0) : ACCENT.ink;
    oddMats.hull.userData.u.uShadeMul.value = S.rej ? 0.75 : 1;
    // its sail is still the AI's type: teal while it rides with the brand's boats, red once it is in the bin
    oddMats.sail.userData.u.uAccent.value = S.rej ? (on && oddOn && has('bin') ? ACCENT.red : 0) : on && oddOn ? ACCENT.teal : 0;
    oddRingMat.userData.u.uAccent.value = on && (has('bin') || has('inspectors')) ? ACCENT.red : 0;
    xMark.material.userData.u.uAccent.value = on && has('bin') ? ACCENT.red : 0;
    binMat.userData.u.uShadeMul.value = lift('bin') ? 0.6 : 0.92;
    // the spec: lime whenever it is in full (its emblem is the boats' emblem); the one-liners: lime while they are the
    // caption's subject (beat 2)
    sheet.material.userData.u.uAccent.value = on && full.has('sheet') ? ACCENT.lime : 0;
    sheet.material.userData.u.uShadeBias.value = lift('sheet') ? 0.12 : 0.32;
    sheetEmb.children[0].material.userData.u.uAccent.value = on && full.has('sheet') ? ACCENT.lime : 0;
    const noteLime = on && S.beat === 1 && has('brief');
    for (const Pp of [P2, P1]) Pp.note.material.userData.u.uAccent.value = noteLime || (on && lift('brief')) ? ACCENT.lime : 0;
    // the brand's flag carries its mark: lime once the mark is the brand's (from the spec on), ink before
    P2.flag.userData.mark.material.userData.u.uAccent.value = on && S.beat >= 2 && full.has('flags') ? ACCENT.lime : ACCENT.ink;
    // the bubbles: the emblem lime when the people are lit
    bubEmbMat.userData.u.uAccent.value = on && full.has('crowd') ? ACCENT.lime : 0;
    const person = (p, up) => { p.material.userData.u.uShadeBias.value = up ? 0.0 : 0.34; p.material.userData.u.uShadeMul.value = up ? 0.6 : 1; };
    person(writer, lift('writer'));
    for (const p of inspectors) person(p, lift('inspectors'));
    for (const c of crowd) person(c.p, lift('crowd'));
  }
  function emphasize(ids) {
    S.emph = ids && ids.length ? new Set(ids) : null;
    applyEmphasis();
  }
  for (const m of accents) if (m.userData.u.uAccentAll && m.userData.u.uAccentAll.value !== 1) m.userData.u.uAccentAll = { value: 1 };

  // =================================================================== anchors: labels, words, hotspots, framing
  const centre = (pts) => pts.reduce((a, p) => a.add(p), new V3()).multiplyScalar(1 / Math.max(1, pts.length));
  const poolMid = () => W(POOL.x - 0.4, waterY + 0.1, POOL.z + 0.2);
  const avgSpot = () => {
    // the line while the copies are on it, the pool once they are in it
    if ((S.beat === 0 && S.t < 2.0) || S.beat === 3) return W(L1X, BELT.top + BOAT_H * 0.7, slotZ(4.5));
    if (S.beat === 1 || S.beat === 2) return W(L1X, BELT.top + BOAT_H * 0.7, slotZ(2.6));
    return poolMid();
  };
  const fleetMid = () => W(-7.0, waterY + 0.6, (ROWZ[0] + ROWZ[1]) / 2);
  const boatsSpot = () => {
    if (S.beat >= 4) return fleetMid();
    // in beat 3 the frame ends a little past the first check: the ones just stamped under the press
    const zEnd = S.beat === 2 ? slotZ(3.4) : BELT.z1;
    let onLine = S.boatPts.filter((b) => b.p.z < zEnd && b.p.x < 0);
    if (!onLine.length) onLine = S.boatPts.filter((b) => b.p.z < BELT.z1 && b.p.x < 0);
    if (onLine.length) { const c = centre(onLine.map((b) => b.p.clone())); return W(c.x, c.y + 0.4, c.z + 0.6); }
    return fleetMid();
  };
  const sheetPt = (x, y) => { sheet.group.updateWorldMatrix(true, false); return sheet.group.localToWorld(new V3(x, SHEET.t + 0.01, y)); };
  const notePt = (Pp, x) => g.localToWorld(new V3(x, 0, 0).applyMatrix4(Pp.note.group.matrix).add(new V3(0, 0, 0.06)));
  const flagPt = (Pp, dx, dy) => { const c = wpL(Pp.flag, Pp.flag.userData.mc); return W(c.x + dx, c.y + dy, c.z + 0.1); };
  const parts = {
    hopper: { hit: hits.hopper, anchor: () => W(HOP.x + 0.4, (HOP.yTop + HOP.yBot) / 2, HOP.z + lerp(HOP.rBot, HOP.rTop, 0.5) + 0.05), beat: 0 },
    avg: { hit: hits.avg, anchor: avgSpot, beat: 1 },
    flags: { hit: hits.flags, anchor: () => flagPt(P2, -FLAG.w / 2 + 0.2, -FLAG.h / 2 + 0.1), beat: 0 },
    brief: { hit: hits.brief, anchor: () => notePt(P1, NOTE.w / 2 - 0.15), beat: 1 },
    sheet: { hit: hits.sheet, anchor: () => (S.beat < 2 ? g.localToWorld(boardFace().add(new V3(BOARD.w / 2 - 0.1, -0.6, 0.05))) : sheetPt(SHEET.w / 2 - 0.08, 0.4)), beat: 2 },
    writer: { hit: hits.writer, anchor: () => writer.base().add(new V3(0, 0.12, 0)), beat: 2 },
    inspectors: { hit: hits.inspectors, anchor: () => inspectors[2].base().add(new V3(0, 0.12, 0)), beat: 3 },
    bin: { hit: hits.bin, anchor: () => wp(bin, 0, BIN.h, BIN.r), beat: 3 },
    boats: { hit: hits.boats, anchor: boatsSpot, beat: 4 },
    crowd: { hit: hits.crowd, anchor: () => crowd[2].p.base().add(new V3(0, 0.12, 0)), beat: 4 },
  };
  const labelAt = {
    flag2: () => flagPt(P2, 0, FLAG.h / 2 + 0.15),
    flag1: () => flagPt(P1, 0, FLAG.h / 2 + 0.15),
    'inspector-1': () => inspectors[0].top().add(W(-0.35, 0, -0.2).sub(W(0, 0, 0))),
    'inspector-2': () => inspectors[1].top(),
    'inspector-3': () => inspectors[2].top(),
    hopper: () => W(HOP.x - HOP.rTop * 0.6, HOP.yTop + 0.4, HOP.z + HOP.rTop * 0.6),
    sheet: () => (S.beat < 2 ? g.localToWorld(boardFace().add(new V3(-BOARD.w / 2 + 0.2, -0.9, 0.05))) : sheetPt(-SHEET.w / 2, -SHEET.d / 2)),
    writer: () => writer.top(),
    inspectors: () => inspectors[1].top(),
    bin: () => wp(bin, 0, BIN.h, 0),
    boats: boatsSpot,
    avg: () => poolMid(),
    crowd: () => crowd[1].p.top(),
    brief: () => notePt(P1, 0),
  };
  const decalAt = {
    // the machine's name on the hopper's front, the whole time: it is the AI that makes every piece
    // (at the presses, a little to the right of the funnel's middle: seen from the left, the left one-liner's words
    // come next to it)
    hopper: () => {
      const r = lerp(HOP.rBot, HOP.rTop, 0.6), x = S.beat === 1 || S.beat === 2 ? 0.8 : 0;
      return W(HOP.x + x, lerp(HOP.yBot, HOP.yTop, 0.6), HOP.z + Math.sqrt(r * r - x * x) + 0.08);
    },
    // the one-line request on each board (the left one until the page covers it)
    brief2: () => (P2.note.group.visible ? notePt(P2, 0) : null),
    brief1: () => notePt(P1, 0),
    // the spec, once it is on the press's board: its three rules, from the page's left edge, under the emblem
    sheet: () => {
      if (!S.sheetUp) return null;
      return [0, 1, 2].map((r) => sheetPt(-SHEET.w / 2 + 0.35, -0.55 + r * 0.9));
    },
  };
  const decalUnit = { hopper: 1.3, sheet: 0.85, brief1: 1.2, brief2: 1.2 };
  // the surfaces the words must stay inside ([w, h], world units): the funnel's front, the one-line slip, the page
  const decalSize = { hopper: [2.6, 1.6], brief1: [NOTE.w - 0.2, NOTE.d], brief2: [NOTE.w - 0.2, NOTE.d], sheet: [SHEET.w - 0.5, 2.9] };

  // ---- the shots: fixed points, so the framing never depends on where the motion happens to be
  const L3 = (x, y, z) => W(x, y, z);
  const around = (x, z, top, r = 0.7) => [W(x - r, gy(x, z), z), W(x + r, gy(x, z), z), W(x - r, top, z), W(x + r, top, z)];
  const HOP_PTS = [L3(HOP.x - HOP.rTop, HOP.yTop + 1.1, HOP.z), L3(HOP.x + HOP.rTop, HOP.yTop + 1.1, HOP.z), L3(HOP.x, HOP.yTop + 1.1, HOP.z - HOP.rTop)];
  const HOP_MOUTH = L3(HOP.x, HOP.yBot, HOP.z);
  const FLAG_PTS = [L3(L2X - FLAG.off - FLAG.w - 0.2, FLAG.y1 + 0.3, PRESS.z), L3(L1X + FLAG.off + FLAG.w + 0.2, FLAG.y1 + 0.3, PRESS.z)];
  const BOARD_TOP = [L3(L2X, BOARD.y0 + BOARD.h + 0.2, PRESS.z), L3(L1X, BOARD.y0 + BOARD.h + 0.2, PRESS.z)];
  const BOARD_EDGE = [L3(L2X - BOARD.w / 2 - 0.2, BOARD.y0 + BOARD.h, PRESS.z), L3(L1X + BOARD.w / 2 + 0.2, BOARD.y0 + BOARD.h, PRESS.z)];
  const POOL_PTS = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([a, b]) => L3(POOL.x + a * POOL.rx * 1.05, waterY, POOL.z + b * POOL.rz * 1.1));
  const FLEET_PTS = [L3(-8.6, waterY + 2.9, ROWZ[0] + 2.4), L3(-8.6, waterY, ROWZ[1] + 3.2), L3(-3.0, waterY, ROWZ[1] + 0.6)];
  const CROWD_PTS = CROWD.flatMap((c, i) => [L3(c.x, PIER.y, c.z), L3(c.x, PIER.y + HC + 0.6 + BUB.h + (i === 1 ? 1.2 : 0), c.z)]);
  const LANE_MID = (z, h = BOAT_H) => [L3(L2X - BELT.w / 2, BELT.top + h, z), L3(L1X + BELT.w / 2, BELT.top + h, z)];
  const LANE_END = LANE_MID(BELT.z1, 0);
  // The wide frames (A, E) end at the near half of the pool (the heap is in its middle) and carry one point under the
  // hopper's foot.  The UI fits a frame round the centre of its anchors' box, which would otherwise lie far behind the
  // stack's middle (the top of the screen stayed empty); that point moves the centre to the middle of the stack, so the
  // whole frame is used and the people on the shore read larger (phone ~88 px, held sideways ~65 px, desk ~135 px)
  const POOL_NEAR = L3(POOL.x, waterY, POOL.z + POOL.rz * 0.66);
  const UNDER = L3(HOP.x, -12, HOP.z - 2);
  // A (beat 1): the whole line from the hopper to the pool, both flags, the people on the shore
  const A_PTS = [...HOP_PTS, ...FLAG_PTS, ...LANE_END, ...CROWD_PTS, ...POOL_PTS.slice(0, 3), POOL_NEAR, L3(-POOL.x - POOL.rx, waterY, POOL.z), UNDER];
  // C (beat 3): the person at the press, both boards and flags, the hopper's mouth; both lanes down past the first check
  const C_PTS = [...around(W_PUT.x, W_PUT.z, H + 0.45, 0.7), ...BOARD_EDGE, ...BOARD_TOP, HOP_MOUTH, ...LANE_MID(slotZ(3.2), 3.1), L3(L2X - BELT.w / 2, BELT.top, slotZ(3.6)), L3(L1X + 0.8, BELT.top, slotZ(3.6))];
  // D (beat 4): the hopper's mouth, the spec on its press, the checks and the bin along lane 2, down to its end
  const D_PTS = [HOP_MOUTH, BOARD_TOP[0], FLAG_PTS[0], ...around(W_BY.x, W_BY.z, H + 0.45, 0.6), ...around(IX[0], SZI[0], HI + 1.4), ...around(IX[1], SZI[1], HI + 1.4), ...around(IX[2], SZI[2], HI + 1.4),
    L3(BIN.x + BIN.r + 0.4, BIN.h + 1.4, BIN.z), L3(L2X, BELT.top, BELT.z1), L3(L1X - BELT.w / 2 + 0.4, BELT.top + BOAT_H, slotZ(5))];
  // E (beat 5 and the end): the hopper, both flags, the people on the shore, the fleet and the pool
  const E_PTS = [...HOP_PTS, ...FLAG_PTS, ...CROWD_PTS, ...POOL_PTS.slice(0, 3), POOL_NEAR, FLEET_PTS[0], FLEET_PTS[2], UNDER];
  const shot = (az, el, pts, margin) => ({ az: AZ_IN + az, el, anchors: () => pts, margin });
  // a phone held sideways: the portrait stacks are seen from a little to the right
  const land = () => typeof innerWidth === 'number' && innerWidth > innerHeight;
  const sideways = (portrait, landscape) => ({
    get az() { return land() ? landscape.az : portrait.az; },
    get el() { return land() ? landscape.el : portrait.el; },
    anchors: () => (land() ? landscape : portrait).anchors(),
    get margin() { return land() ? landscape.margin : portrait.margin; },
  });
  // (a phone held sideways has a short frame, about 580 x 380 px beside the caption: its wide frames are seen lower.
  // az > 0 swings the camera to the left of the set, az < 0 to its right.  The wide desk frames are seen from a little
  // to the right: the fleet sails out to the left broadside, and the AI's funnel shows between the two boards; the press
  // and the checks on lane 2 from the left)
  const shots = {
    phone: [sideways(shot(0, 0.6, A_PTS), shot(-0.4, 0.42, A_PTS, 0.04)), sideways(shot(0, 0.62, C_PTS), shot(0.3, 0.55, C_PTS)),
      sideways(shot(-0.25, 0.62, D_PTS), shot(0.3, 0.55, D_PTS)), sideways(shot(0, 0.6, E_PTS, 0.05), shot(-0.4, 0.42, E_PTS, 0.04))],
    desk: [shot(-0.4, 0.5, A_PTS, 0.04), shot(0.5, 0.45, [...C_PTS, ...FLAG_PTS, ...D_PTS]), shot(0.5, 0.45, [...C_PTS, ...FLAG_PTS, ...D_PTS]), shot(-0.4, 0.5, E_PTS, 0.04)],
  };

  const rest = () => pose(LAST, 1);
  function ambient() { /* no material motion: the held result stays still */ }

  const slipLocal = slip2.getPointAt(1);
  const slipAvgLocal = slip1.getPointAt(1);
  const api = {
    id: 'foundry',
    group: g,
    zone: 'brand',
    anchor: W(0, 13, 0),
    pin: W(0, BELT.top + 0.1, 4.5),
    // accents of this district are drawn at full strength in focus (they ignore the attention radius)
    focus: { pos: W(-1, 3, 12), r: 28 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalUnit,
    decalSize,
    lever: null,
    // the person who acts in the beat: the people on the shore (beats 1 and 5, the end), the one who writes the spec
    // (beats 2 and 3), the checks (beat 4)
    get mainActor() { return S.beat === 0 || S.beat >= 4 ? 'crowd' : S.beat === 3 ? 'inspectors' : 'writer'; },
    restParts: REST_PARTS,
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // flow 1 (life.js): the brand's boats leave from lane 2's slipway, the typed average ones from lane 1's
    slipway: W(slipLocal.x, seaY, slipLocal.z + 1.5),
    slipwayAvg: W(slipAvgLocal.x, seaY, slipAvgLocal.z + 1.5),
    // for lab and screenshot scripts only (sizes on screen); nothing in the app reads it
    _dbg: { writer: writer.group, inspectors: inspectors.map((p) => p.group), crowd: crowd.map((c) => c.p.group), hopper, sheet: sheet.group, copies, fleet: fleetGroup, odd: oddGroup, pool, bin, S, N0, N_ODD, START, KG },
  };
  rest();
  emphasize(null);
  return api;
}
