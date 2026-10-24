// The flows: what crosses the AI zone between the districts (design_system.md §7.1).  Nothing else moves here.
// On the map the three flows play as ONE story, one event at a time, so the chain 品牌內容 → 網友評價 → AI → 推薦
// reads from the picture alone, and it is already acting when the camera lands on the map:
//  1 「品牌內容」 (content): two boats wait at the brand's pier (the foundry's slipway), side by side: the brand's own
//    (white paper, an ink pennant: it left after the foundry's human checks) and a copy (grey, no mark) from the
//    flotilla of the average.  They leave together; a third of the way across the copy goes under: bow down, into the
//    sea of type, with an ink splash ring and drops (20 b6: 「而平均，正是品牌差異化最大的敵人。」).  The brand's boat
//    sails on and runs up the people's beach, and stays there while they talk about it.
//  2 「網友評價」 (reviews): two of the six people talking on the shore (d-oracle's talkers, seated on the bluff) speak:
//    a speech bubble pops over the speaker and hangs there a moment, then it is drawn into David's ear (the bust's own
//    ear, d-oracle) — an ink ring flashes there as it takes the words in.
//  3 「AI 的推薦」 (recs): a recommendation card (teal frame, a check, typed rows) pops out of the bust's mouth and flies
//    to the consumer's phone on the pier (d-oracle's consumer, who asked); it lands on it with a pop, and goes into it.
// The flows end on the real objects of the world: no map signs (the paper cut-outs of a head, a group of talkers and a
// consumer that used to stand in for them are gone).  Every moving item has a size floor in CSS px (phone: boat 30,
// bubble 22, card 26; ×1.5 on a desktop), and the arcs are drawn in screen px, so the story reads at true size on a
// phone.
// Neutral ink everywhere; the only colour is teal (what AI does and makes).  ?look=c (look.js): the boat, the bubbles
// and the card are drawn in light (an emissive paint), so the flows trace across the dusk.
// Motion by state.  The loop runs on the world clock (it stands still with 暫停動畫).  It starts while the camera
// settles onto the map (its last, slow part) and, on the first visit, as the opening reveal reaches the foundry: the
// reveal draws the two boats in at the pier and they leave once it has passed.  In a district every flow gives way
// (the districts a flow touches tell it themselves, in their beats): the items shrink away rather than dissolve (a
// dissolving sign over the bust reads as an ink blot), and the loop starts over on the next arrival.  With reduced
// motion and ?still the flows show one item each, frozen at its telling point (the boat beached, a bubble on its way
// to the ear, the card on the phone), each with a short dotted trail behind it; nothing is random.
// Interface for world.js / the UI: buildLife(D) → { group, update(t, dt, ctx), active(), flows, keep, keepBoxes(E),
// keepPts(), loop, phase, restart() }, ctx = { camera, focus }.  keepPts() → [{ p: Vector3, r: CSS px }]: the courses
// as chains of discs (for the zone names, scenery.js).
//   active() → { id: 'content' | 'reviews' | 'recs', at: Vector3 } | null: the flow whose result is on screen now and
//   the point on the object it names — 品牌內容: the beached boat (once it has landed; gone before anyone speaks);
//   網友評價: the first bubble's edge toward the bust, while it hangs over its speaker and while it flies (gone as it
//   is swallowed, so it never names the bust); AI 的推薦: the card, landed on the phone.  null between those moments,
//   while the flows are hidden and in the still/reduced view (flows[id].at() gives each flow's telling point there).
//   keep: points where the flows happen (updated every frame).  keepBoxes(E, pad, { now, except }) → screen boxes
//   { x0, y0, x1, y1, flow, what } (CSS px, padded): by default everything the story draws over its loop (for the
//   pills); with now: only what is on screen at this moment; with except: id, without the object that flow's name
//   points at (for that name).
//   _dbg.hold(phase | null) freezes the loop at a phase (tests and boards).
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, CLOCK } from './mat.js';
import { polar, clamp, smooth, boatGeo, rng } from './kit.js';
import { heightAt, SEA_Y, inDock } from './terrain.js';
import * as P from './props.js';
import { LOOK, P as PAINT } from './look.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), ZAX = new V3(0, 0, 1);
const mod = (x, m) => ((x % m) + m) % m;
const lerp = (a, b, k) => a + (b - a) * k;
const sm = (x) => smooth(0, 1, x);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
/** a pop: 0 → a little past 1 → 1 */
const pop = (x) => { x = clamp(x); const c = 1.9; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const bez = (a, b, c, t, out) => {
  const u = 1 - t;
  return out.set(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z);
};

// ------------------------------------------------------------------ the story's clock (map seconds)
const LOOP = 9.4;
// flow 1: both boats wait at the pier, leave together; the copy goes under a third of the way across; the brand's boat
// beaches and stays
const PIER = 0.45;                                           // at the pier until then (the reveal draws them in there)
const CPY = { sail: 0.55, sink: 0.7 };                       // under by PIER + 1.25 = 1.7
const BRD = { sail: 1.3, bump: 0.25, hold: 8.5, fade: 0.4 }; // beached at PIER + 1.55 = 2.0, there until 8.5
// flow 2: two of the talkers speak, a beat apart: a hand comes up, the bubble pops over them and hangs there a moment,
// then it is drawn into the ear; the ear stays lit until the answer is out
const BUBS = [{ who: 0, go: 3.3 }, { who: 1, go: 3.55 }];
const BT = { pop: 0.22, hang: 0.35, fly: 0.95, gulp: 0.22, flash: 0.42 };
const B0_FLY = BUBS[0].go + BT.pop + BT.hang;                 // 3.87
const B0_GULP = B0_FLY + BT.fly;                              // 4.82
const EAR = { on: B0_GULP + BT.gulp, off: [5.95, 6.35] };
// flow 3: the mouth opens, the card pops out, flies, lands on the raised phone; the phone goes down once it is read
const CT = { mouth: [5.45, 5.7, 6.15, 6.45], go: 5.6, pop: 0.3, fly: 1.1, land: 0.25, absorb: [8.6, 8.95], raise: [6.2, 6.8], lower: [8.6, 9.15] };
// the names: each once its thing is there to see, on that thing; 品牌內容 is gone before anyone speaks, 網友評價 rides
// on the first bubble from its pop until it is swallowed (so it never names the head)
const NAME = [['content', 1.95, 3.2], ['reviews', BUBS[0].go + 0.12, B0_GULP], ['recs', 7.1, 8.5]];
// the still / reduced-motion frame: each flow at its telling point
const STILL = { bubble: 0.5 };
const SETTLE = 0.6;                 // the card's size on the phone, once landed (of its flying size)
// engine clock (s) before which the loop does not start: the opening reveal (150 units in 4.2 s) has the pier drawn by
// about 2.2 s, so on a first visit the reader sees the two boats drawn in at the pier before they leave
const START_CLOCK = 1.75;

// ------------------------------------------------------------------ sizes (world units) and their floors (CSS px)
const BOAT_S = 4.0;                 // boatGeo is 2 long: 8
const HEEL = 0.38;                  // how far a boat leans away from the map's camera (radians)
const BUB = { w: 6.0, h: 3.3, t: 0.4, rim: 0.42 };
const CARD = { w: 6.6, h: 5.0, t: 0.3 };
const HEAD_H = 21;                  // (fallback) the bust's crown above the water
const MIN_PX = { boat: 30, bubble: 22, card: 26, ring: 24, splash: 26, drop: 5, dot: 4 };
// ?look=c: what the flows are drawn in (light)
const LIT = LOOK === 'c' ? PAINT.glow : 0;

/** non-indexed, positions and normals only (so any of them merge) */
const flat = (geo) => { const x = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); return x; };
/** a bar from a to b (a box of square section r × r) */
function bar(a, b, r) {
  const d = new V3().subVectors(b, a), len = d.length();
  const geo = new THREE.BoxGeometry(r, len + r * 0.9, r);
  geo.applyMatrix4(new M4().compose(a.clone().add(b).multiplyScalar(0.5), new Q().setFromUnitVectors(YAX, d.normalize()), new V3(1, 1, 1)));
  return flat(geo);
}
const noShadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); return o; };
const opac = (mats, k) => { for (const m of mats) m.userData.u.uOpacity.value = k; };

export function buildLife(D) {
  const g = new THREE.Group();
  g.name = 'life';
  const F = D.foundry || {}, O = D.oracle || {};
  const still = (() => {
    try { return new URLSearchParams(location.search).has('still') || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  })();

  // =================================================================== the courses
  const sea = (p) => new V3(p.x, SEA_Y, p.z);
  const slip = sea(F.slipway || polar(64, 285));
  /** where a hull heading from `from` toward `to` first touches land: the boat stops with its bow on it */
  const landing = (from, to) => {
    const d = new V3().subVectors(to, from).setY(0), L = d.length();
    d.normalize();
    for (let s = 0; s < L; s += 0.1) { const x = from.x + d.x * s, z = from.z + d.z * s; if (heightAt(x, z) > SEA_Y - 0.35) return sea(new V3(x - d.x * BOAT_S * 0.9, 0, z - d.z * BOAT_S * 0.9)); }
    return sea(to);
  };
  // the brand's boat: from the spec lane's slipway across the strait to the people's shore, up the shore from the
  // people who talk (their bubbles rise clear of it)
  const LAND = landing(new V3(16, 0, -55), new V3(2, 0, -42));
  const brandC = new THREE.CatmullRomCurve3([slip, sea(new V3(18.4, 0, -57.8)), sea(new V3(16.2, 0, -53.2)), LAND], false, 'centripetal');
  // the copy: from beside the brand's boat at the pier, on a parallel lane on the open strait's side (beyond the
  // brand's boat as the map sees it), to where it goes under, a third of the way across
  const across = new V3().subVectors(LAND, slip).setY(0).normalize();
  const side = new V3(-across.z, 0, across.x);
  if (side.x > 0) side.negate();                        // toward the open strait (−x here: up the map's screen)
  brandC.arcLengthDivisions = 400;
  /** the brand's boat's progress along its course at story time ph (0 at the pier until PIER) */
  const brandU = (ph) => { const k = seg(ph, PIER, PIER + BRD.sail); return clamp(lerp(k, sm(k), 0.5)); };
  // the copy's lane: SEP_MIN…SEP_MAX world units over, enough for a clear gap between the two boats on screen
  const SEP = { min: 10, max: 25 };
  // (the strait narrows toward the slipway: the brand land's shore is about 20 units over there, 27 halfway across)
  const laneCap = (u) => 12.8 + 22 * u;
  const SINK = brandC.getPointAt(0.45).addScaledVector(side, 15).setY(SEA_Y);

  // the real ends of flows 2 and 3 (d-oracle): two of the six talkers on the bluff speak; David's ear takes the words
  // in and his mouth gives the card out; the consumer on the pier holds the phone it lands on
  const tops = (O.talkersWorld && O.talkersWorld.length ? O.talkersWorld : [polar(41, 320, 8.5)]).map((p) => p.clone());
  const bustBase = (O.bustBase || (() => { const h = O._dbg && O._dbg.hg; if (!h) return polar(64, 333); h.updateWorldMatrix(true, false); return h.getWorldPosition(new V3()); })()).clone().setY(SEA_Y);
  const headTop = (O.pin || bustBase.clone().setY(SEA_Y + HEAD_H)).clone();
  const earW = (O.ear || bustBase.clone().setY(SEA_Y + HEAD_H * 0.62)).clone();
  const mouthW = (O.mouth || earW).clone();
  const earRim = earW.clone().setY(earW.y + 1.6);
  const headAt = bustBase.clone().setY((SEA_Y + headTop.y) / 2);
  const phoneW = (O.phoneWorld || bustBase.clone().add(new V3(-8, 7, 8))).clone();
  // the speakers: the second and the fifth of the six (one in each row), so their bubbles rise from apart
  const SPK = [1, 4].map((i) => (tops[i] || tops[0]).clone());
  const deskLayout = () => typeof innerWidth !== 'number' || (innerWidth >= 900 && innerHeight >= 500);

  // =================================================================== flow 1: the boats
  const hull = boatGeo();
  // every boat's edges in graphite: at map size the drawing's own outline misses a hull that sits on the water
  const edgeGeo = (r) => {
    const L = 1.0, w = 0.36, H = 0.42, S = 0.95;
    const p = { kb: [-0.55, 0, 0], kf: [0.55, 0, 0], gbL: [-L, H, -w], gfL: [L, H, -w], gbR: [-L, H, w], gfR: [L, H, w], sb: [-0.42, H, 0], sf: [0.42, H, 0], st: [0, H + S, 0] };
    const E = [['kb', 'kf'], ['gbL', 'gfL'], ['gbR', 'gfR'], ['gbL', 'gbR'], ['gfL', 'gfR'], ['kb', 'gbL'], ['kb', 'gbR'], ['kf', 'gfL'], ['kf', 'gfR'], ['sb', 'st'], ['st', 'sf']];
    return mergeGeometries(E.map(([a, b]) => bar(new V3(...p[a]).multiplyScalar(BOAT_S), new V3(...p[b]).multiplyScalar(BOAT_S), r * BOAT_S)));
  };
  // the brand's mark: a small pennant on a short mast over the sail, streaming aft
  const markGeo = (() => {
    const top = 0.42 + 0.95;
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(-0.78, -0.2); s.lineTo(0, -0.42); s.lineTo(0, 0);
    const flag = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false });
    flag.translate(0, top + 0.72, -0.03);
    const mast = new THREE.BoxGeometry(0.07, 0.8, 0.07); mast.translate(0, top + 0.36, 0);
    return mergeGeometries([flat(mast), flat(flag)]).scale(BOAT_S, BOAT_S, BOAT_S);
  })();
  const makeBoat = (brand) => {
    const grp = new THREE.Group();
    // paper: lit nearly white whichever side the map sees; the copy: grey (the average), inside hairline edges
    const hm = brand ? ink({ shade: 1, bias: 0.55, side: THREE.DoubleSide, focus: false, paint: LIT }) : ink({ shade: 0.42, side: THREE.DoubleSide, focus: false });
    const em = ink({ accent: 'ink', focus: false });
    grp.add(new THREE.Mesh(flat(hull.clone().scale(BOAT_S, BOAT_S, BOAT_S)), hm), new THREE.Mesh(edgeGeo(brand ? 0.07 : 0.05), em));
    const mats = [hm, em];
    if (brand) { const mm = ink({ accent: 'ink', side: THREE.DoubleSide, focus: false }); grp.add(new THREE.Mesh(markGeo, mm)); mats.push(mm); }
    grp.name = brand ? 'flow-content-brand' : 'flow-content-average';
    grp.visible = false;
    noShadow(grp);
    return { grp, mats };
  };
  const brandB = makeBoat(true), avgB = makeBoat(false);
  g.add(brandB.grp, avgB.grp);
  // the copy going under: an ink splash ring on the water where it sinks, and drops of ink that jump and fall back
  const ringGeo = new THREE.TorusGeometry(1, 0.13, 6, 40);
  const makeRing = (name, thick = 1) => {
    const m = new THREE.Mesh(thick === 1 ? ringGeo : new THREE.TorusGeometry(1, 0.13 * thick, 6, 40), ink({ accent: 'ink', focus: false }));
    m.name = name; m.visible = false; m.castShadow = false;
    g.add(m);
    return m;
  };
  const splash = makeRing('flow-content-splash', 1.1);
  const R = rng(20);
  const DROPS = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * Math.PI * 2 + R() * 0.5, up: 0.75 + R() * 0.5, out: 0.55 + R() * 0.45, d: R() * 0.12 }));
  const dropM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1), ink({ accent: 'ink', focus: false }), DROPS.length);
  dropM.name = 'flow-content-drops'; dropM.frustumCulled = false; dropM.visible = false; noShadow(dropM);
  g.add(dropM);

  const earRing = makeRing('flow-reviews-ear');

  // =================================================================== flow 2: the talkers and their bubbles
  // paper white, inside a solid ink rim (a slightly larger bubble just behind it): a comic bubble at any size; the
  // tail points down-left (the bubble is mirrored when its speaker is on its right on screen)
  const bubMat = ink({ shade: 1, bias: 0.5, side: THREE.DoubleSide, focus: false, paint: LIT });
  const rimMat = ink({ accent: 'ink', side: THREE.DoubleSide, focus: false });
  const BUB_TIP = P.makeBubble({ w: BUB.w, h: BUB.h, t: BUB.t, tail: 'left' }).tipLocal.clone();
  const bubbles = BUBS.map(() => {
    const grp = new THREE.Group();
    const face = new THREE.Mesh(flat(P.makeBubble({ w: BUB.w, h: BUB.h, t: BUB.t, tail: 'left' }).mesh.geometry.clone()), bubMat);
    const rim = new THREE.Mesh(flat(P.makeBubble({ w: BUB.w + 2 * BUB.rim, h: BUB.h + 2 * BUB.rim, t: 0.08, tail: 'left' }).mesh.geometry.clone()), rimMat);
    rim.position.set(0, -BUB.rim * 0.55, -BUB.t / 2 - 0.08);
    // three short typed strokes inside: someone's words
    const words = new THREE.Mesh(mergeGeometries([[-1.4, 0.55, 2.2], [-1.4, -0.05, 2.9], [-1.4, -0.65, 1.6]].map(([x, y, w]) => flat(new THREE.BoxGeometry(w, 0.32, 0.1).translate(x + w / 2, y, BUB.t / 2 + 0.06)))), rimMat);
    grp.add(rim, face, words);
    grp.name = 'flow-reviews';
    grp.visible = false;
    noShadow(grp);
    g.add(grp);
    return grp;
  });

  // =================================================================== flow 3: the card, the consumer
  const card = (() => {
    const grp = new THREE.Group();
    grp.name = 'flow-recs';
    const paper = ink({ shade: 1, bias: 0.45, side: THREE.DoubleSide, focus: false, paint: LIT });
    const teal = ink({ shade: 0.45, accent: 'teal', focus: false });
    const inkM = ink({ accent: 'ink', focus: false });
    const { w, h, t } = CARD;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), paper);
    const z = t / 2 + 0.06, fr = 0.3;
    const frame = new THREE.Mesh(mergeGeometries([
      new THREE.BoxGeometry(w, fr, 0.12).translate(0, h / 2 - fr / 2, z), new THREE.BoxGeometry(w, fr, 0.12).translate(0, -h / 2 + fr / 2, z),
      new THREE.BoxGeometry(fr, h, 0.12).translate(w / 2 - fr / 2, 0, z), new THREE.BoxGeometry(fr, h, 0.12).translate(-w / 2 + fr / 2, 0, z),
    ].map(flat)), teal);
    // a check on the first row (the pick), typed rows after it
    const x0 = -w / 2 + 0.75, rowH = 0.42;
    const rows = new THREE.Mesh(mergeGeometries([[x0 + 1.55, 1.25, 3.4], [x0, 0.0, 4.9], [x0, -1.25, 3.6]].map(([x, y, len]) => flat(new THREE.BoxGeometry(len, rowH, 0.12).translate(x + len / 2, y, z)))), inkM);
    const ck = (a, b) => bar(new V3(...a, z), new V3(...b, z), 0.42);
    const check = new THREE.Mesh(mergeGeometries([ck([x0 + 0.05, 1.35], [x0 + 0.5, 0.85]), ck([x0 + 0.5, 0.85], [x0 + 1.25, 1.95])]), teal);
    grp.add(slab, frame, rows, check);
    grp.visible = false;
    noShadow(grp);
    g.add(grp);
    return { grp, mats: [paper, teal, inkM] };
  })();
  const phoneRing = makeRing('flow-recs-pop');

  // =================================================================== the dotted trails (still / reduced motion)
  const NT = 11;
  const trails = Array.from({ length: NT }, () => new V3());
  const dotM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1), ink({ accent: 'ink', focus: false }), NT);
  dotM.name = 'flow-courses';
  dotM.frustumCulled = false;
  dotM.visible = still;
  noShadow(dotM);
  g.add(dotM);

  // =================================================================== frame
  const _m = new M4(), _q = new Q(), _q2 = new Q(), _s = new V3(), _p = new V3(), _t = new V3(), _h = new V3(), _c3 = new V3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  const right = new V3(1, 0, 0), toCam = new V3(0, 0, 1), fwd = new V3(0, 0, -1), camPos = new V3(0, 100, 100), camRight = new V3(1, 0, 0), camUp = new V3(0, 1, 0);
  let cam = null, KD = 1;
  /** CSS px per world unit at p (the camera's vertical field over its full, offset-padded height) */
  const ppu = (p) => {
    if (!cam || !cam.isPerspectiveCamera) return 1e6;
    const fh = cam.view && cam.view.enabled ? cam.view.fullHeight : (typeof innerHeight === 'number' ? innerHeight : 800);
    return fh / (2 * Math.max(1e-3, cam.position.distanceTo(p)) * Math.tan((cam.fov * Math.PI) / 360));
  };
  /** the scale that keeps an item of world length `len` at least `px` CSS px long */
  const floor = (p, len, px) => Math.max(1, (px * KD) / (ppu(p) * len));
  /** the world height that rises `px` CSS px on screen at p (arcs are drawn in screen terms: the phone's steep view
   *  would flatten a fixed world height to nothing) */
  const upW = (p, px) => (px * KD) / (ppu(p) * Math.max(0.25, Math.sqrt(Math.max(0, 1 - fwd.y * fwd.y))));

  /** the copy at story time ph: beside the brand's boat at the same progress, out on its own lane */
  const _ct = new V3();
  function copyAt(ph, out, tan) {
    // (a little ahead of it: the brand's boat later sails past the spot where it went under)
    const u = Math.min(0.6, brandU(Math.max(0, ph)) * 1.15);
    brandC.getPointAt(u, out);
    brandC.getTangentAt(Math.min(Math.max(u, 0.001), 0.999), tan);
    // a boat's length (its floor) plus a little, between the two hulls on screen (as far as the strait allows: at the
    // pier it is narrow, and the lane widens as they leave)
    const sep = clamp((MIN_PX.boat * KD * 1.2 + 4) / pxAlong(out, side), SEP.min, SEP.max);
    const w = Math.min(sep, laneCap(u));
    out.addScaledVector(side, w).setY(SEA_Y);
    // its heading drifts off the brand's a little while it moves out
    _ct.copy(side).multiplyScalar(0.25 * (1 - sm(u / 0.3)) * (u > 0 ? 1 : 0));
    tan.add(_ct).normalize();
    return out;
  }

  const _pj = new V3(), _pk = new V3();
  /** CSS px on screen per world unit along dir at p */
  const pxAlong = (p, dir) => {
    if (!cam) return 1;
    _pj.copy(p).project(cam); _pk.copy(p).add(dir).project(cam);
    const W = typeof innerWidth === 'number' ? innerWidth : 1000, Hh = typeof innerHeight === 'number' ? innerHeight : 800;
    return Math.max(0.05, Math.hypot(((_pk.x - _pj.x) / 2) * W, ((_pk.y - _pj.y) / 2) * Hh));
  };
  /** CSS px from the top of the canvas (the camera's own projection, with its view offset) */
  const projY = (v) => (1 - (_pj.copy(v).project(cam).y + 1) / 2) * (typeof innerHeight === 'number' ? innerHeight : 800);
  let vk = 1;
  // ---- the speakers: over the heads of the two real talkers who speak; their bubbles pop on the bust's side
  const spkTop = SPK.map((p) => p.clone());
  let spkSide = 1;
  function placeSpeakers() {
    SPK.forEach((p, i) => spkTop[i].copy(p).setY(p.y + 0.6));
    spkSide = _t.copy(headAt).sub(SPK[0]).dot(right) >= 0 ? 1 : -1;
  }

  const _a = new V3(), _cb = new V3();
  /** a bubble's course now: from over its speaker's head (a little to the head's side, its tail on the speaker), up
   *  and over the brow, into the ear */
  const bubCourse = (i) => {
    const top = spkTop[BUBS[i].who];
    const sc = floor(top, BUB.w, MIN_PX.bubble);
    // (in the bubble's own plane, which faces the camera: its tail tip just over the speaker's head)
    _a.copy(top).addScaledVector(camRight, spkSide * -BUB_TIP.x * sc * 0.85).addScaledVector(camUp, -BUB_TIP.y * sc + (5 * KD) / ppu(top));
    // up over the brow and down into the ear from above (the control point stands over the ear)
    _cb.copy(_a).lerp(earW, 0.75);
    _cb.y = Math.max(_a.y, headTop.y) + upW(_a, 18);
    return [_a, _cb, earW];
  };
  const _m1 = new V3();
  /** the card's course now: out of the mouth and up, then over to the phone */
  const cardCourse = (to, c) => {
    _m1.copy(mouthW); _m1.y += upW(mouthW, 12);
    c.copy(_m1).lerp(to, 0.5);
    // (on a desktop the consumer stands below the talkers' line: the card glides under them, sagging a little; on a
    // phone it goes over them)
    c.y = Math.max(_m1.y, to.y) + upW(_m1, lay === 'desk' ? -10 : 30);
    return _m1;
  };

  /** a boat at p heading along t: most of its side turned to the map's camera, heeled a little away from it */
  function placeBoat(grp, p, t, s, roll, pitch) {
    const sd = Math.sign(t.x * right.x + t.z * right.z) || 1;
    _h.set(t.x * 0.3 + sd * right.x * 0.7, 0, t.z * 0.3 + sd * right.z * 0.7).normalize();
    const facing = (toCam.x * -_h.z + toCam.z * _h.x) >= 0 ? 1 : -1;
    grp.quaternion.setFromEuler(_e.set(roll - facing * HEEL, Math.atan2(-_h.z, _h.x), pitch));
    grp.position.copy(p);
    grp.position.y += HEEL * 0.7;
    grp.scale.setScalar(s);
    return facing;
  }

  const boatAt = new V3(), bubTop = new V3(), cardAt = new V3();
  let recvSide = 1;
  let bubOn = false;
  // ---- the story, as a pure function of the loop's phase ph (seconds; ph < 0: nothing out yet)
  function draw(ph, vis) {
    const bq = cam ? cam.quaternion : _q2.identity();
    vk = vis >= 0.999 ? 1 : sm(vis);
    placeSpeakers();

    // ---- flow 1a: the copy, beside the brand's boat at the pier (the same course, a lane over on the strait's
    // side), goes under a third of the way across
    {
      const k = seg(ph, PIER, PIER + CPY.sail);
      const u = seg(ph, PIER + CPY.sail, PIER + CPY.sail + CPY.sink);
      const on = !still && ph >= 0 && u < 1;
      avgB.grp.visible = on;
      // where it is (it stops where it goes under), and where that is: SINK
      copyAt(Math.min(ph, PIER + CPY.sail), _p, _t);
      SINK.copy(_p);
      if (on) {
        const s = floor(_p, 2 * BOAT_S, MIN_PX.boat);
        // going under: the bow drops, the hull slides down below the surface of the sea of type
        const down = sm(u / 0.85);
        _p.y = SEA_Y + Math.sin(ph * 7 + 1) * 0.08 * (1 - down) - 1.25 * BOAT_S * s * Math.pow(down, 1.4);
        // (the bow, local +x along the heading, pitches down as it goes)
        placeBoat(avgB.grp, _p, _t, s * pop(ph / 0.25) * vk, Math.sin(ph * 5 + 1) * 0.05 * (1 - down) * (k > 0 ? 1 : 0.6), -0.6 * down);
      }
      // the splash: an ink ring spreading on the water where it went under, and drops jumping out and falling back
      // (both brought forward along the line of sight: the sea's own swell would cut into them)
      const fwdOf = (p, out, d) => out.copy(p).addScaledVector(_c3.subVectors(camPos, p).normalize(), d);
      const t0 = PIER + CPY.sail;
      const sp = seg(ph, t0 + 0.1, t0 + 0.85);
      splash.visible = !still && sp > 0 && sp < 1;
      if (splash.visible) {
        fwdOf(_h.copy(SINK).setY(SEA_Y + 0.4), splash.position, 30);
        const s = floor(splash.position, 2, MIN_PX.splash) * lerp(0.45, 1.1, eo(sp));
        splash.quaternion.setFromUnitVectors(ZAX, YAX);
        splash.scale.setScalar(Math.max(1e-4, s * vk));
        splash.material.userData.u.uOpacity.value = 1 - sm((sp - 0.45) / 0.55);
      }
      const dp = seg(ph, t0 + 0.08, t0 + 0.6);
      dropM.visible = !still && dp > 0 && dp < 1;
      if (dropM.visible) {
        const rs = floor(SINK, 2, MIN_PX.splash), ds = floor(SINK, 1, MIN_PX.drop);
        DROPS.forEach((d, i) => {
          const v = clamp((dp - d.d) / (1 - d.d));
          _h.copy(SINK).addScaledVector(right, Math.cos(d.a) * d.out * rs * 1.1 * v).addScaledVector(toCam, Math.sin(d.a) * d.out * rs * 0.5 * v);
          _h.y = SEA_Y + 0.4 + upW(SINK, 22 * d.up) * 4 * v * (1 - v);
          fwdOf(_h, _h, 30);
          dropM.setMatrixAt(i, _m.compose(_h, _q.identity(), _s.setScalar(v >= 1 ? 1e-4 : Math.max(1e-4, ds * (1 - 0.4 * v) * vk))));
        });
        dropM.instanceMatrix.needsUpdate = true;
      }
    }

    // ---- flow 1b: the brand's boat waits at the pier, sails on and beaches below the people; it stays while they
    // talk about it
    {
      const k = still ? 1 : seg(ph, PIER, PIER + BRD.sail);
      const bump = still ? 1 : seg(ph, PIER + BRD.sail, PIER + BRD.sail + BRD.bump);
      const fade = still ? 1 : 1 - seg(ph, BRD.hold, BRD.hold + BRD.fade);
      const on = still || (ph >= 0 && fade > 0);
      brandB.grp.visible = on;
      if (on) {
        const u = brandU(still ? 99 : ph);
        brandC.getPointAt(u, _p);
        brandC.getTangentAt(Math.min(Math.max(u, 0.001), 0.999), _t);
        // it runs up the beach: the bow lifts and settles, the hull rides up a little
        const up = Math.sin(Math.PI * bump) * 0.35 + (bump > 0 ? 0.28 : 0);
        _p.y = SEA_Y + (k < 1 ? Math.sin(ph * 6) * 0.08 : 0) + up;
        const s = floor(_p, 2 * BOAT_S, MIN_PX.boat) * (still ? 1 : pop(ph / 0.25));
        placeBoat(brandB.grp, _p, _t, Math.max(1e-4, s * vk), k < 1 ? Math.sin(ph * 5) * 0.05 * (k > 0 ? 1 : 0.6) : 0, Math.sin(Math.PI * bump) * 0.16);
        opac(brandB.mats, fade);
        brandB.grp.updateMatrixWorld(true);
        brandB.grp.localToWorld(boatAt.set(0, 0.55, 0));
      }
    }

    // ---- flow 2: the bubbles pop over their speakers, hang a moment, rise into the ear and are swallowed; the ear
    // flashes and stays lit (teal) as it listens
    let flash = -1;
    bubOn = false;
    BUBS.forEach((b, i) => {
      const grp = bubbles[i];
      const [a, c, e] = bubCourse(i);
      const t0 = b.go, t1 = t0 + BT.pop, t1h = t1 + BT.hang, t2 = t1h + BT.fly, t3 = t2 + BT.gulp;
      let sx = 1, sy = 1;
      if (still) {
        grp.visible = i === 0;
        if (i) return;
        bez(a, c, e, STILL.bubble, _p);
      } else {
        grp.visible = ph >= t0 && ph < t3;
        if (ph >= t3 && ph < t3 + BT.flash) flash = Math.max(flash, (ph - t3) / BT.flash);
        if (!grp.visible) return;
        if (ph < t1) { _p.copy(a); sx = sy = pop((ph - t0) / BT.pop); }
        else if (ph < t1h) { _p.copy(a); _p.y += upW(a, 2) * Math.sin(((ph - t1) / BT.hang) * Math.PI); }
        else if (ph < t2) { const k = (ph - t1h) / BT.fly; bez(a, c, e, lerp(k, sm(k), 0.5) * 0.96, _p); }
        else {
          // swallowed: it squashes flat into the ear and is gone
          const k = (ph - t2) / BT.gulp;
          bez(a, c, e, 0.96, _h);
          _p.copy(_h).lerp(e, sm(k));
          sx = 1 + 0.35 * Math.sin(Math.PI * Math.min(1, k * 1.4)) - sm(k);
          sy = (1 - 0.8 * sm(k / 0.6)) * (1 - sm(k));
        }
      }
      _p.addScaledVector(_h.subVectors(camPos, _p).normalize(), 1.5);
      const s = floor(_p, BUB.w, MIN_PX.bubble) * (still ? 0.9 : 1) * vk;
      grp.position.copy(_p);
      grp.quaternion.copy(bq);
      grp.scale.set(Math.max(1e-4, s * sx) * spkSide, Math.max(1e-4, s * sy), Math.max(1e-4, s));
      // the first bubble on its way carries the name: the dot on its edge toward the head (above it there is the
      // beached boat; the name goes on the open side, toward where the words are going)
      if (!bubOn && (still || ph < t2)) {
        grp.updateMatrixWorld(true);
        grp.localToWorld(bubTop.set(BUB.w / 2 + BUB.rim * 0.4, BUB.h * 0.1, BUB.t / 2));
        bubOn = true;
      }
    });
    earRing.visible = !still && flash >= 0;
    if (earRing.visible) {
      const s = floor(earW, 2, MIN_PX.ring);
      earRing.position.copy(earW).addScaledVector(_h.subVectors(camPos, earW).normalize(), 1);
      earRing.quaternion.copy(bq);
      earRing.scale.setScalar(Math.max(1e-4, s * lerp(0.6, 1.4, eo(flash)) * vk));
      earRing.material.userData.u.uOpacity.value = 1 - sm((flash - 0.35) / 0.65);
    }
    // ---- flow 3: the card leaves the bust's mouth, flies to the consumer's phone on the pier and lands with a pop
    // (the side of the phone the bust is on, on screen: the card's name sits on the other side)
    recvSide = _t.copy(headAt).sub(phoneW).dot(right) >= 0 ? 1 : -1;
    {
      const t0 = CT.go, t1 = t0 + CT.pop, t2 = t1 + CT.fly, t3 = t2 + CT.land;
      const on = still || (ph >= t0 && ph < CT.absorb[1]);
      card.grp.visible = on;
      phoneRing.visible = !still && ph >= t2 && ph < t2 + 0.45;
      if (on) {
        // it comes to rest standing on the raised phone (its lower edge on it), small, so the hand and the person
        // under it still show; at the end it goes down into the phone
        const to = _a.copy(phoneW); to.y += upW(phoneW, MIN_PX.card * SETTLE * CARD.h / CARD.w * 0.5);
        const m1 = cardCourse(to, _c3);
        let sc = 1;
        if (still) { _p.copy(to); sc = SETTLE; }
        else if (ph < t1) { const k = (ph - t0) / CT.pop; _p.copy(mouthW).lerp(m1, eo(k)); sc = pop(k); }
        else if (ph < t2) {
          const k = (ph - t1) / CT.fly, e = lerp(k, sm(k), 0.55);
          bez(m1, _c3, to, e, _p);
        } else {
          const k = (ph - t2) / CT.land, ab = sm(seg(ph, CT.absorb[0], CT.absorb[1]));
          _p.copy(to).lerp(phoneW, ab);
          sc = k < 1 ? lerp(1, SETTLE, sm(k)) + 0.3 * Math.sin(Math.PI * clamp(k)) : SETTLE * (1 - ab);
        }
        _p.addScaledVector(_h.subVectors(camPos, _p).normalize(), 2);
        const s = floor(_p, CARD.w, MIN_PX.card);
        card.grp.position.copy(_p);
        card.grp.quaternion.copy(bq);
        card.grp.scale.setScalar(Math.max(1e-4, s * sc * vk));
        // its name's point: the card's upper corner away from the head (the open side: the talkers stand toward it)
        card.grp.updateMatrixWorld(true);
        card.grp.localToWorld(cardAt.set(-recvSide * CARD.w * 0.42, CARD.h * 0.3, CARD.t / 2));
      }
      if (phoneRing.visible) {
        const k = (ph - t2) / 0.45;
        phoneRing.position.copy(phoneW).addScaledVector(toCam, 0.3);
        phoneRing.quaternion.copy(bq);
        phoneRing.scale.setScalar(Math.max(1e-4, floor(phoneW, 2, MIN_PX.ring) * lerp(0.7, 1.35, eo(k)) * vk));
        phoneRing.material.userData.u.uOpacity.value = 1 - sm((k - 0.35) / 0.65);
      }
    }

    // ---- the dotted trails (still / reduced motion): behind each frozen item, where it came from
    if (still) {
      let n = 0;
      for (let i = 0; i < 4; i++) trails[n++].copy(brandC.getPointAt(lerp(0.12, 0.66, i / 3))).setY(SEA_Y + 0.6);
      const [a, b, e] = bubCourse(0);
      for (let i = 0; i < 3; i++) bez(a, b, e, lerp(0.1, 0.34, i / 2), trails[n++]);
      const c = new V3(), m1 = cardCourse(phoneW, c);
      for (let i = 0; i < 3; i++) bez(m1, c, phoneW, lerp(0.5, 0.8, i / 2), trails[n++]);
      for (let i = 0; i < NT; i++) {
        const d = trails[i];
        dotM.setMatrixAt(i, _m.compose(d, _q.identity(), _s.setScalar(i < n ? floor(d, 1, MIN_PX.dot) * vk : 1e-4)));
      }
      dotM.instanceMatrix.needsUpdate = true;
    }
    updateKeep();
  }

  // ---- the loop starts while the camera settles on the map (or after 4.5 s of a moving camera) and, on the first
  // visit, once the opening reveal is near the foundry
  let vis = -1, lastClock = 0, t0 = null, armedAt = -1, calm = 0, phase = -1, hold = null, lastGoal = 1;
  const camPrev = new V3();
  // (every item gives way by its scale, not by a dissolve: these stay opaque, but for the brand boat's own fade at the
  // loop's end and the flashes' rings)
  opac([...avgB.mats, ...brandB.mats, ...card.mats, bubMat, rimMat, dropM.material, dotM.material], 1);
  function update(t, dt, ctx) {
    cam = (ctx && ctx.camera) || null;
    // in a district every flow hands over to the district (see the header); on the map they run
    const goal = ctx && ctx.focus ? 0 : 1;
    const rdt = clamp(CLOCK.value - lastClock, 0, 0.1);
    lastClock = CLOCK.value;
    vis = vis < 0 || still ? goal : goal > vis ? Math.min(goal, vis + rdt * 3) : Math.max(goal, vis - rdt * 3);
    g.visible = vis > 0.002;
    // leaving the map, the story holds its frame and gives way; back on the map, it waits for the camera to settle
    if (goal && !lastGoal) { t0 = null; calm = 0; armedAt = -1; }
    lastGoal = goal;
    if (!g.visible) { t0 = null; calm = 0; armedAt = -1; return; }
    if (cam) {
      right.set(1, 0, 0).applyQuaternion(cam.quaternion).setY(0);
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      right.normalize();
      toCam.set(0, 0, 1).applyQuaternion(cam.quaternion).setY(0);
      if (toCam.lengthSq() < 1e-6) toCam.set(0, 0, 1);
      toCam.normalize();
      fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
      camRight.set(1, 0, 0).applyQuaternion(cam.quaternion);
      camUp.set(0, 1, 0).applyQuaternion(cam.quaternion);
      camPos.copy(cam.position);
      const W = typeof innerWidth === 'number' ? innerWidth : 1000, Hh = typeof innerHeight === 'number' ? innerHeight : 800;
      KD = clamp(Math.min(W, Hh) / 600, 1, 1.5);
      layout();
      if (goal && t0 === null && !still) {
        if (armedAt < 0) armedAt = CLOCK.value;
        // the camera's speed (fraction of its distance per second): an arrival's last, slowing quarter is under 0.3
        const speed = rdt > 0 ? cam.position.distanceTo(camPrev) / rdt / Math.max(1, cam.position.length()) : 1;
        calm = speed < 0.3 ? calm + rdt : 0;
        if (CLOCK.value >= START_CLOCK && (calm > 0.05 || CLOCK.value - armedAt > 4.5)) t0 = t;
      }
      camPrev.copy(cam.position);
    }
    if (goal || hold !== null) phase = hold !== null ? hold : t0 === null ? -1 : mod(t - t0, LOOP);
    draw(hold === null && t0 === null ? -1 : phase, Math.max(0, vis));
  }

  function layout() {
    // desk: the side panel layout; phone: a portrait phone or one held sideways
    const k = deskLayout() ? 'desk' : 'phone';
    if (k === lay) return;
    lay = k;
  }
  let lay = null;
  layout();

  // the names' points: on the object the event happened to
  const flows = {
    content: { at: () => boatAt },
    reviews: { at: () => (bubOn ? bubTop : earRim) },   // the first bubble's edge while it is out (the ear's rim otherwise)
    recs: { at: () => (card.grp.visible ? cardAt : phoneW) },   // the card on the phone (the phone while there is none)
  };
  function active() {
    if (!g.visible || vis < 0.5 || still || (t0 === null && hold === null) || phase < 0) return null;
    for (const [id, a, b] of NAME) if (phase >= a && phase < b) return { id, at: flows[id].at() };
    return null;
  }
  // where the flows happen (updated every frame): the slipway, the sink spot, the landing, the bust (crown, ear,
  // mouth, base), the bubbles' arcs, the card's arc, the consumer's phone, the beached boat, the speakers
  const keep = Array.from({ length: 16 }, () => new V3());
  function updateKeep() {
    const [a0, c0] = bubCourse(0);
    keep[0].copy(slip); keep[1].copy(SINK); keep[2].copy(LAND); keep[3].copy(headTop); keep[4].copy(earW); keep[5].copy(mouthW);
    keep[6].copy(headAt); keep[7].copy(a0); keep[8].copy(c0);
    const c = new V3(); cardCourse(phoneW, c); keep[9].copy(c);
    keep[10].copy(phoneW).setY(SEA_Y); keep[11].copy(phoneW).setY(phoneW.y + 2); keep[12].copy(phoneW);
    keep[13].copy(boatAt); keep[14].copy(SPK[1]); keep[15].copy(spkTop[0]);
  }
  // the real objects the flows end on, as world boxes (the map holds the districts at rest: measured once)
  let realBoxes = null;
  const realBox = (objs) => {
    const b = new THREE.Box3(), t = new THREE.Box3();
    for (const o of objs) if (o) { o.updateWorldMatrix(true, true); t.setFromObject(o); if (!t.isEmpty()) b.union(t); }
    return b.isEmpty() ? null : b;
  };
  const boxPts = (E, b, pad) => {
    if (!b) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const p = E.project(_qv.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z), _pr);
      if (!p) continue;
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    return x0 < x1 ? { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad } : null;
  };
  const _pr = { x: 0, y: 0, z: 0 };
  const boxOf = (E, objs, pad) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const b = new THREE.Box3(), c = new V3();
    for (const o of objs) {
      if (!o || !o.visible) continue;
      b.setFromObject(o, true);
      if (b.isEmpty()) continue;
      for (let i = 0; i < 8; i++) {
        c.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        const p = E.project(c, _pr);
        if (!p) continue;
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
      }
    }
    return x0 < x1 ? { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad } : null;
  };
  /** the screen box of a flat sign (a billboard) from its own local rectangle: a box around its 3D bounds would be
   *  far larger than what it covers on screen */
  const _qv = new V3();
  const signBox = (E, o, x0l, x1l, y0l, y1l, pad) => {
    if (!o || !o.visible) return null;
    o.updateMatrixWorld(true);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of [[x0l, y0l], [x1l, y0l], [x0l, y1l], [x1l, y1l]]) {
      const p = E.project(o.localToWorld(_qv.set(x, y, 0)), _pr);
      if (!p) continue;
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    return x0 < x1 ? { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad } : null;
  };
  /** screen boxes the pills and names should keep off, padded by `pad` CSS px; each carries `flow` (the flow it
   *  belongs to: 'content' | 'reviews' | 'recs', or 'head' for the head sign, which takes reviews in and gives recs
   *  out) and `what`.  By default: everything the story draws or is about to draw over its loop (the head, the
   *  consumer, the talkers, the boats' water from the pier to the beach, the bubbles' and the card's courses) — for the
   *  pills, which stay put.  { now: true }: only what is on screen at this moment, each object's own box (for a flow's
   *  name, which comes and goes); { except: id }: leave out the boxes of the object that flow's name points at (the
   *  brand's boat, the bubbles, the card), so its name can sit by it but off the rest. */
  const NAMED = { content: ['brand-boat', 'copy', 'boats'], reviews: ['bubble', 'bubble-course'], recs: ['card', 'card-course'] };
  function keepBoxes(E, pad = 16, { now = false, except = null } = {}) {
    if (!g.visible || !E || !E.project) return [];
    const out = [];
    const skip = except ? NAMED[except] || [] : [];
    const add = (b, flow, what) => { if (b && !skip.includes(what)) { b.flow = flow; b.what = what; out.push(b); } };
    const OD = O._dbg || {};
    realBoxes ||= {
      head: realBox([OD.hg]) || new THREE.Box3().setFromPoints([bustBase, headTop, earW, mouthW]),
      consumer: realBox([OD.consumer]) || new THREE.Box3().setFromCenterAndSize(phoneW, new V3(3, 6, 3)),
      talkers: realBox(OD.people || []) || new THREE.Box3().setFromPoints(SPK),
    };
    add(boxPts(E, realBoxes.head, pad), 'head', 'head');
    add(boxPts(E, realBoxes.consumer, pad), 'recs', 'consumer');
    add(boxPts(E, realBoxes.talkers, pad), 'reviews', 'talkers');
    if (now) {
      add(boxOf(E, [brandB.grp], pad), 'content', 'brand-boat');
      add(boxOf(E, [avgB.grp], pad), 'content', 'copy');
      bubbles.forEach((b) => add(signBox(E, b, -BUB.w / 2 - BUB.rim, BUB.w / 2 + BUB.rim, BUB_TIP.y, BUB.h / 2 + BUB.rim, pad), 'reviews', 'bubble'));
      add(signBox(E, card.grp, -CARD.w / 2, CARD.w / 2, -CARD.h / 2, CARD.h / 2, pad), 'recs', 'card');
      return out;
    }
    const pts = (list, r) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const v of list) { const p = E.project(v, _pr); if (!p) continue; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
      return x0 <= x1 ? { x0: x0 - r, y0: y0 - r, x1: x1 + r, y1: y1 + r } : null;
    };
    // the boats' water: from the slipways over the sink spot to the landing (half a boat's floor around each point)
    const bh = (MIN_PX.boat * KD) / 2 + pad;
    add(pts([slip, brandC.getPointAt(0.5), SINK, LAND], bh), 'content', 'boats');
    // the bubbles' arcs and the card's arc
    for (let i = 0; i < BUBS.length; i++) {
      const [a, c, e] = bubCourse(i);
      const arc = [];
      for (let j = 0; j <= 4; j++) arc.push(bez(a, c, e, j / 4, new V3()));
      add(pts(arc, (MIN_PX.bubble * KD) / 2 + pad), 'reviews', 'bubble-course');
    }
    const cc = new V3(), m1 = cardCourse(phoneW, cc), carc = [];
    for (let i = 0; i <= 4; i++) carc.push(bez(m1, cc, phoneW, i / 4, new V3()));
    add(pts(carc, (MIN_PX.card * KD) / 2 + pad), 'recs', 'card-course');
    return out;
  }

  /** the flows' courses as points, each with its reach on screen (CSS px): where a boat, a bubble or the card passes
   *  over its loop, and where each ends -- for the zone names, which keep off them (scenery.js).  A course seen as a
   *  chain of discs, not as one box round it: a box round an arc across the map would cover half the island */
  const KP = Array.from({ length: 48 }, () => ({ p: new V3(), r: 0 }));
  function keepPts() {
    if (!g.visible) return [];
    let n = 0;
    const add = (v, r) => { if (n < KP.length) { KP[n].p.copy(v); KP[n].r = r; n++; } };
    const rb = MIN_PX.boat * KD * 0.5 + 3;
    for (let i = 0; i <= 12; i++) {
      const u = (i / 12) * 0.86;
      add(brandC.getPointAt(u, _kp), rb);
      // (the copy sails beside it, out on its own lane, until it goes under)
      if (u < 0.5) add(_kp.addScaledVector(side, SEP.min), rb);
    }
    // (the flows' names, set beside these objects for a moment, keep off the zone names themselves: overlay.js)
    add(SINK, MIN_PX.splash * KD * 0.6 + 4); add(LAND, rb);
    for (let i = 0; i < BUBS.length; i++) {
      const [a, c, e] = bubCourse(i);
      for (let j = 0; j <= 5; j++) add(bez(a, c, e, j / 5, _kp), (MIN_PX.bubble * KD) / 2 + 6);
    }
    const m1 = cardCourse(phoneW, _kc);
    for (let j = 0; j <= 5; j++) add(bez(m1, _kc, phoneW, j / 5, _kp), (MIN_PX.card * KD) / 2 + 6);
    add(earW, (MIN_PX.ring * KD) / 2 + 4); add(phoneW, (MIN_PX.ring * KD) / 2 + 4);
    return KP.slice(0, n);
  }
  const _kp = new V3(), _kc = new V3();

  // every course stays on open water or in the air, and out of the dock (checked once, while building)
  const _c = new V3();
  for (let i = 0; i <= 60; i++) {
    const u = (i / 60) * 0.86;
    brandC.getPointAt(u, _c);
    const uc = Math.min(u, 0.5), c2 = brandC.getPointAt(uc).addScaledVector(side, Math.min(SEP.max, laneCap(uc)));
    for (const p of [_c, c2]) if (inDock(p.x, p.z) || heightAt(p.x, p.z) > SEA_Y - 0.4) console.warn('life: a boat course crosses land at', p.toArray().map((v) => +v.toFixed(1)));
  }

  return {
    group: g, update, active, flows, keep, keepBoxes, keepPts, loop: LOOP,
    /** start the story again from its first event once the camera settles (e.g. after a map intro) */
    restart() { t0 = null; calm = 0; armedAt = -1; },
    get phase() { return t0 === null && hold === null ? null : phase; },
    _dbg: { hold: (ph) => { hold = ph == null ? null : mod(+ph, LOOP); }, brandC, LAND, SINK, ear: earW, mouth: mouthW, phone: phoneW, speakers: SPK, brand: brandB.grp, avg: avgB.grp, splash, drops: dropM, bubbles, earRing, card: card.grp, phoneRing, dots: dotM, draw, tops },
  };
}
