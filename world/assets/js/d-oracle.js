// AI 怎麼挑牌子 · how AI picks a brand (articles 9, 19, 13) — in the AI zone, TH 330°.
// The book's case acted out, one physical act per beat (the picture first, the caption names it):
//  1 a shopper on the jetty raises a phone; the question 「耳機哪個牌子好？」 comes out of its screen (its tail on the
//    phone), hangs there a moment, then flies to the AI (David's head standing in the typed sea) and goes in at the
//    brow as the head turns to the asker.  Brand A's loudspeaker blasts 「A 牌最好！」 at the face: the shout, a
//    jagged comic balloon, hits the brow, squashes, shatters and sinks; the people on the bluff talk, and their
//    words stream into the ear, which flashes at each one taken in, all through the beat;
//  2 the 推薦名單 (its heading on it from the start) comes out of the mouth onto the shopper's phone.  One of the
//    people holds up a bubble of five stars alone: it hits the cheek and drops into the sea.  Then three others say
//    something concrete (when they use it, what it solved, who it suits): each bubble flies into the ear, and a
//    typed slip out of the mouth writes that brand onto the list (whoever speaks is drawn in full, the others in
//    contour);
//  3 the shopper turns from the AI to the people: 「B 牌缺點？」 comes out of the phone and flies to the one who named
//    B, who turns and puts a hand up; the shopper walks back along the jetty to them, the list coming down to
//    their side;
//  4 that person answers honestly (「缺點：電量普通」); the shopper nods twice, taps the phone and B's box on the list
//    gets its tick, then looks the list over;
//  5 the loudspeaker blasts three times, each shout bigger than the last: every one shatters on the face and sinks,
//    then the mast and its loudspeaker fade slowly to a dashed outline — nobody spoke for A, so A is not on the list.
// Every beat lasts its keyAt plus its caption's reading time (story.js holdFor), and its motion runs to its end:
// nothing stands still while its words are read.
// Lever (換你試試, from beat 2): a = 廣告加碼 (the story as played); b = 讓用過的人說: the one who named D talks
// about A concretely instead, A takes D's row, the shopper asks about A and ticks it, and in beat 5 the loudspeaker
// is put down instead of blasting.
//
// Staging: the phone camera stands behind the people on the bluff and looks out to sea, so a portrait frame reads,
// bottom to top, 消費者 → AI → 品牌: the five people in front, the shopper on the jetty to the right, the head, A's
// mast beyond; from beat 2 the camera stands higher, so the people stand clear of the bust's chest.  The words go on their objects and leave with them: a bubble keeps its words until it is swallowed
// (the bubble and its words go together), the shout keeps its words until it breaks.
// Everything that explains is a pure function of (beat, k, lever): pose().  The words live in world.json.
// life.js (the map's flows) reads ear, mouth, phoneWorld, talkersWorld (indices 1 and 4), bustBase, pin and
// _dbg { hg, consumer, people }.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp } from './kit.js';
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
const bump = (t, a, m, b) => (t <= a || t >= b ? 0 : t < m ? sm((t - a) / (m - a)) : 1 - sm((t - m) / (b - m)));
/** a pop: 0 → a little over 1 → 1 */
const pop = (x) => { const t = clamp(x); return t >= 1 ? 1 : eo(t) * (1 + 0.18 * Math.sin(Math.PI * t)); };

/** parse data/head.bin (see tools/head_mesh.py) into a BufferGeometry, height 1, face toward +x */
export function parseHead(buf) {
  const dv = new DataView(buf);
  const nV = dv.getUint32(0, true), nT = dv.getUint32(4, true);
  const sc = [dv.getFloat32(8, true), dv.getFloat32(12, true), dv.getFloat32(16, true)];
  const of = [dv.getFloat32(20, true), dv.getFloat32(24, true), dv.getFloat32(28, true)];
  const q = new Int16Array(buf, 32, nV * 3);
  const pos = new Float32Array(nV * 3);
  for (let i = 0; i < nV * 3; i++) pos[i] = (q[i] / 32767) * sc[i % 3] + of[i % 3];
  const idxOff = 32 + nV * 6;
  const idx = new Uint16Array(buf.slice(idxOff, idxOff + nT * 6));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

/** strip a geometry to position + normal, non-indexed (for merging) */
function flat(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  return g;
}
/** n dashes along a → b (a thin box each, covering `fill` of its share): a drawn dashed line */
function dashLine(a, b, n, th = 0.1, fill = 0.55) {
  const out = [], d = b.clone().sub(a), L = d.length();
  const q = new Q().setFromUnitVectors(XAX, d.clone().normalize());
  for (let i = 0; i < n; i++) {
    const c = a.clone().addScaledVector(d, (i + 0.5) / n);
    out.push(flat(new THREE.BoxGeometry((L / n) * fill, th, th).applyMatrix4(new M4().compose(c, q, new V3(1, 1, 1)))));
  }
  return out;
}
/** a five-pointed star in the xy plane, extruded t (centred on z = 0) */
function starGeo(r, t) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2);
  return flat(g);
}

// ------------------------------------------------------------------ the set
const H = 18;                 // the bust (its chest under water): the largest figure, yet a person reads beside it on a phone
const CONS_H = 5.4;           // the shopper: the decisive person
const TALK_H = 5.0;           // the five who talk (standing, so each reads as a person and a raised hand shows)
const R0 = 43;                // the stage origin: the heartland shore's edge on the 330° line
// The phone camera's azimuth in the stage frame (0 = straight in from the centre).  Turned off the radial line so the
// line of sight passes beside the sunflower at the centre; everything is laid out in view coordinates (u into the
// picture, v to the right), so a portrait frame stacks it in depth.
const PHI = 0.45;
const cP = Math.cos(PHI), sP = Math.sin(PHI);
/** view coordinates (u forward from the camera, v to its right) → stage (x inward, z along the shore) */
const VP = (u, v, y = 0) => new V3(-u * cP + v * sP, y, -u * sP - v * cP);
const RIGHT = new V3(sP, 0, -cP);   // the picture's right (the phone camera's), in the stage frame
const FWD = new V3(-cP, 0, -sP);    // into the picture

const HEAD_AT = { u: 17, v: -4.6 };
// the face's turn from the camera toward the reader's right (rad): out to sea before the question; to the asker once
// asked (and from beat 3 on); a little further while it listens, so its ear turns to the people
const FACE_REST = 0.65, FACE_AWAY = 1.75, FACE_LISTEN = 1.0;
const HEAD_LIFT = 6.6;          // the bust stands this much higher than half-sunk: its chin above the people's heads
// the five people stand on a terrace on the bluff (the foreground), in one shallow arc open to the camera, a person's
// width apart, so on a phone each one reads (two staggered rows of seated people drew one tangle of limbs)
const TALK = [[-5.9, -7.6], [-5.3, -6.1], [-5.0, -4.6], [-5.3, -3.1], [-5.9, -1.6]];
// each faces the camera's side, turned toward a neighbour (people chatting, not a row facing out)
const TURN = [0.8, -0.45, 0.4, -0.55, 0.15];
// who says what (beat 2): the stars (left of the middle), then B, C, D.  The one who named B is at the row's right
// end, nearest the jetty, so when the shopper comes back to ask them (beats 3-4) the two stand close and the picture
// can hold them large (lever b: the one who named D, next to them, talks about A instead, and is the one asked)
const ROLE = { stars: 1, b: 4, c: 2, d: 3, a: 3 };
const REV_A = ['b', 'c', 'd'], REV_B = ['b', 'c', 'a'];
// the jetty: off the terrace's right end at its level, out over the water toward the face, slanting a little right
const PIER = { u0: -1.0, v0: -0.3, u1: 6.4, v1: 2.2, w: 2.2 };
const onPier = (u) => ({ u, v: PIER.v0 + ((u - PIER.u0) / (PIER.u1 - PIER.u0)) * (PIER.v1 - PIER.v0) });
const CONS_AT = onPier(4.2);        // where the shopper asks the AI
// beat 3: back along the jetty and onto the terrace beside the one asked (the row's right end), at their depth, so
// the two face each other side by side in the picture, a person's width apart
const CONS_BACK = { u: -5.3, v: 0.35 };
// the 推薦名單 (typed, AI-made): out of the mouth it flies onto the shopper's phone (beat 2) and rides there, the
// phone's screen shown large, at one size all the way (so its words fit it all the way).  Its rows are the brands
// (what each review wrote onto it), at 12 px and more on a phone, with a margin on the left for the shopper's tick.
// (the margin holds a box per brand row, left of the words, where the shopper's tick goes: the words' paper strip
// starts after it, about 6 px left of the rows' anchor, so it never covers a box)
const CARD = { w: 6.0, h: 4.6, ml: 1.45, box: 0.5, bx: 0.62 };
// from the phone (its bottom edge's centre): over the shopper's head while the AI writes it (the shopper at the jetty's
// end); low at the shopper's right, nearer the camera, once they are back among the people (the face stays clear)
const CARD_UP = { dv: 1.4, du: 0.6, y: 3.2 }, CARD_LOW = { dv: 2.8, du: 0.6, y: 2.4 };
const RB = { w: 8.0, h: 1.8 };      // a review bubble: eight characters at 12 px and more on a phone
const STARS = { w: 4.6, h: 1.7 };
const NS = 14;                      // beat 1's stream: copies of their words into the ear (to the beat's end)
const NW = 3;                       // shouts in beat 5, each bigger (beat 1: one)
const BIG = [1, 1.35, 1.75];
// brand A's loudspeaker mast on the brand shore beyond the head (right of the head as far as a phone's frame allows,
// so the loudspeaker is seen from the side, aimed at the brow; right of the shopper, so on a phone its mast does not
// stand behind the raised phone; on the level ground behind the map's pond, which with ?look=a read as a sign)
const A_AT = { u: 34, v: 4.5, mast: 12.0 };
const HORN_L = 4.2, HORN_R = 1.75;            // the loudspeaker (a flared PA horn): its length and its bell
// the shout: a jagged comic balloon, its spikes, their depth, the wedges it shatters into
const SHOUT = { w: 6.8, h: 3.2, n: 12, j: 0.2, k: 6 };

// dur = keyAt + the caption's reading time (0.8 s + 0.2 s per 字, story.js), so the motion runs while it is read
const BEATS = [
  // 1 很多人買東西先問 AI，它聽網友的，不聽品牌自誇 (23) — the question out of the phone and in at the brow; A's shout
  // breaks on the brow and sinks; the people's words stream into the ear to the end of the beat
  // (the question is the shopper's: it is drawn in full with them, and gone by the end of the beat)
  { dur: 7.4, keyAt: 2.0, shot: 0, parts: ['consumer', 'head', 'horn', 'talkers'] },
  // 2 它挑細節：什麼情境、解決什麼、適合誰 (18) — the list out of the mouth onto the phone; the five stars drop off the
  // cheek; three concrete reviews go in, each writes its brand onto the list
  { dur: 6.1, keyAt: 1.7, shot: 1, parts: ['talkers', 'card', 'head'] },
  // 3 拿到名單，不少人還會上論壇搜「缺點」 (18) — 「B 牌缺點？」 out of the phone to the one who named B, who turns; the
  // walk back to them with the list
  { dur: 5.7, keyAt: 1.3, shot: 2, parts: ['consumer', 'card', 'talkers'] },
  // 4 老實講缺點，反而更讓人放心 (13) — the honest answer; the nods; the tap and the tick in B's box
  { dur: 4.4, keyAt: 1.0, shot: 3, parts: ['con', 'consumer', 'card', 'talkers'] },
  // 5 廣告再響，沒人具體替你說，AI 就看不見你 (20) — three shouts, each bigger, all shatter; A fades to a dashed outline
  { dur: 6.1, keyAt: 1.3, shot: 4, parts: ['horn', 'head', 'card', 'consumer', 'con'] },
];
const LAST = BEATS.length - 1;
// beat-local times (seconds).  Beat 1 starts while the arrival flight settles (its last quarter, about 0.4 s): the
// question comes out of the phone once the camera has landed, holds a moment over it, then flies
const T1 = {
  raise0: 0, raise1: 0.35, ask0: 0.5, askPop: 0.15, fly0: 0.9, fly1: 1.35, in0: 1.4, in1: 1.55,
  turn0: 0.8, turn1: 1.4, ear0: 2.0, ear1: 2.6, lower0: 1.6, lower1: 2.2,
  // (the shout leaves once the question has gone in: the two never meet at the brow)
  shout: 1.45, flight: 0.55, sq: 0.12, talk: 1.75, chatOff0: 6.75, chatOff1: 7.15,
  stream0: 2.0, gap: 0.3, fly: 0.85,
};
T1.earOn = T1.stream0 + T1.fly;   // the first of their words reaches the ear
// (the first concrete review is said once the five stars have sunk: the two never share the picture)
const T2 = { stars0: 0.15, starsFly0: 0.45, starsFly1: 0.95, starsFall: 1.0, rev: [1.9, 2.95, 4.0], pop: 0.2, hold: 0.45, fly: 0.5, gulp: 0.2, slip: 0.35 };
const T3 = { turn1: 0.4, ask0: 0.35, askPop: 0.15, afly0: 0.7, afly1: 1.25, turnB0: 1.25, turnB1: 1.8, hand0: 1.45, hand1: 2.05, walk0: 1.0, walk1: 4.4, stop1: 4.85 };
const T4 = { ans1: 0.25, talk1: 1.7, nod0: 0.4, nod1: 1.5, reach0: 1.5, reach1: 1.85, tick0: 1.82, tick1: 2.1, back0: 2.25, back1: 2.75, look0: 2.8, look1: 3.7 };
const T5 = { s0: 0.15, gap: 0.9, flight: 0.55, sq: 0.12, fade0: 3.3, fade1: 5.3, down0: 0.2, down1: 1.4 };
const BREAK_T = 0.9;   // a shattered shout's pieces: falling and sinking (s)
// review r's times in beat 2: pops, words on, flies, swallowed, its row written
const revT = (r) => { const p = T2.rev[r]; return { p, on: p + T2.pop, f0: p + T2.pop + T2.hold, f1: p + T2.pop + T2.hold + T2.fly, g1: p + T2.pop + T2.hold + T2.fly + T2.gulp }; };
// the list comes out of the mouth when the first concrete review has gone in, that brand written on it (five stars
// write nothing, so there is never an empty list on screen); each later review sends a slip with its brand
const CARD_T0 = revT(0).f1 + T2.gulp * 0.5, CARD_T1 = CARD_T0 + 0.5;
const rowAtT = (r) => (r === 0 ? CARD_T1 : revT(r).f1 + T2.gulp * 0.5 + T2.slip);

export function buildOracle({ headGeo, shards }) {
  const g = new THREE.Group();
  g.name = 'oracle';
  const base = polar(R0, 330);
  g.position.set(base.x, 0, base.z);
  const inward = new V3(-base.x, 0, -base.z).normalize();
  g.rotation.y = Math.atan2(-inward.z, inward.x);    // local +x → toward the centre (people)
  g.updateMatrixWorld(true);
  const AZ0 = Math.atan2(inward.z, inward.x);          // world azimuth of local +x
  const _gw = new V3();
  const gy = (x, z) => { _gw.set(x, 0, z).applyMatrix4(g.matrixWorld); return heightAt(_gw.x, _gw.z); };
  const R = rng(9);
  const layers = {};
  const layer = (name, ...objs) => { (layers[name] ||= []).push(...objs); return objs[0]; };
  const camYaw = Math.atan2(cP, sP);
  const qCam = new Q().setFromAxisAngle(YAX, camYaw);    // facing the phone camera
  const boxProxy = (parent, c, s, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
    m.name = 'hit:' + name; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.position.copy(c); m.scale.copy(s);
    parent.add(m);
    return m;
  };
  const pickable = (mesh, on) => { if (on) mesh.layers.enable(0); else mesh.layers.disableAll(); };

  // =================================================================== the head (David, graphite, dissolving into type)
  const hg = new THREE.Group();
  hg.name = 'head';
  const HP = VP(HEAD_AT.u, HEAD_AT.v);
  hg.position.set(HP.x, SEA_Y - 0.4 * H + HEAD_LIFT, HP.z);
  g.add(hg);
  // the bust is whole: a back of the head dissolving into cubes read, under the drawing's boil, as a head always
  // flaking away, a motion without a meaning (the ear's ring and the typed slips say it is the AI)
  const headMat = ink({
    side: THREE.DoubleSide,
    hooks: {
      key: 'oracle-head-whole',
      fOut: `
        // the sun only grazes the face from the district camera, so the bust has its own portrait light: from the
        // viewer's upper right (view space), where the face turns, with grazing silhouettes (nose, brow, lips) darkened like a contour
        vec3 Lk = normalize(vec3(0.5, 0.62, 0.6));
        float ndv = abs(dot(normal, normalize(vViewPosition)));
        sh = clamp(0.5 + 0.62 * max(dot(normal, Lk), 0.0), 0.0, 1.0) * mix(0.62, 1.0, smoothstep(0.05, 0.4, ndv));
        // inside surfaces seen through the breaks read darker
        if (!gl_FrontFacing) sh *= 0.45;
      `,
    },
  });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.name = 'bust';
  headMesh.scale.setScalar(H);
  headMesh.castShadow = true;
  hg.add(headMesh);
  layer('head', headMesh);

  void shards;   // (main.js still loads the old dissolve's points: not drawn)

  const CP = VP(CONS_AT.u, CONS_AT.v);
  /** the head's yaw (stage) for a face turned by a from the camera toward the reader's right */
  const yawFor = (a) => { const du = -Math.cos(a), dv = Math.sin(a); const x = -du * cP + dv * sP, z = -du * sP - dv * cP; return Math.atan2(-z, x); };
  const YAW_REST = yawFor(FACE_REST);
  hg.rotation.y = YAW_REST;
  hg.updateMatrixWorld(true);
  /** a point in bust units (head-local, height 1) → stage */
  const onHead = (x, y, z) => { hg.updateWorldMatrix(true, false); return g.worldToLocal(hg.localToWorld(new V3(x * H, y * H, z * H))); };
  const EAR_H = [0.03, 0.665, 0.3];          // the right ear (bust units)
  const MOUTH_H = [0.3, 0.6, 0.05];
  const BROW_H = [0.36, 0.84, -0.06];        // where the question goes in

  // the ear's teal rim (beat 1 on): a typed oval on the ear's surface — it lights as the people's words go in
  const earRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 6, 40), ink({ style: 1, shade: 0.5, accent: 'teal', focus: false }));
  earRing.name = 'ear';
  earRing.scale.set(0.045 * H, 0.075 * H, 0.045 * H);
  earRing.position.set(EAR_H[0] * H, EAR_H[1] * H, (EAR_H[2] + 0.012) * H);
  earRing.castShadow = false;
  earRing.visible = false;
  hg.add(earRing);
  layer('head', earRing);
  const headHitRoot = new THREE.Group();
  headHitRoot.name = 'head-part';
  hg.add(headHitRoot);
  // the face and the ear (the dissolving back does not answer)
  const headHit = boxProxy(headHitRoot, new V3(0.15 * H, 0.7 * H, 0.04 * H), new V3(0.46 * H, 0.5 * H, 0.62 * H), 'head');

  // =================================================================== the five people on the bluff
  const talkers = new THREE.Group();
  talkers.name = 'talkers';
  g.add(talkers);
  layer('talkers', talkers);
  const tPts = TALK.map(([u, v]) => VP(u, v));
  let tLo = Infinity, tHi = -Infinity;
  for (const p of tPts) for (const dx of [-1.6, 0, 1.6]) for (const dz of [-1.6, 0, 1.6]) { const y = gy(p.x + dx, p.z + dz); tLo = Math.min(tLo, y); tHi = Math.max(tHi, y); }
  const TY = tHi + 0.08;
  const faceYaw = (d) => Math.atan2(d.x, d.z);
  const toCam = FWD.clone().negate();
  const TALK_YAW = TURN.map((s) => faceYaw(toCam.clone().addScaledVector(RIGHT, s)));
  const people = TALK.map(([u, v], i) => {
    const p = makePerson({ height: TALK_H });
    const at = tPts[i];
    p.group.position.set(at.x, TY, at.z);
    p.group.rotation.y = TALK_YAW[i];
    // (a lighter shade drops their bodies into the typed sea behind them: only the joints were left)
    p.material.userData.u.uShadeBias.value = 0.1;
    talkers.add(p.group);
    p.setPose('stand', 1, { from: 'stand' });
    return p;
  });
  // one level stone terrace under them (a rectangle in view coordinates); the jetty leaves it at its level
  const TER = (() => {
    const us = TALK.map(([u]) => u), vs = TALK.map(([, v]) => v);
    // (deep behind them: seen from above, the people stand against its stone, not against the typed sea, where a
    // fully drawn lay figure lost its outline)
    return { u0: Math.min(...us) - 1.6, u1: Math.max(...us) + 4.6, v0: Math.min(...vs) - 1.5, v1: Math.max(...vs) + 2.4 };
  })();
  const terrace = P.makeDais({ w: 2, d: 2, h: 1 });
  {
    const c = VP((TER.u0 + TER.u1) / 2, (TER.v0 + TER.v1) / 2);
    terrace.group.scale.set((TER.v1 - TER.v0) / 2, TY - tLo + 0.6, (TER.u1 - TER.u0) / 2);
    terrace.group.position.set(c.x, tLo - 0.6, c.z);
    terrace.group.rotation.y = Math.atan2(cP, sP);
  }
  g.add(terrace.group);
  layer('scenery', terrace.group);
  g.updateMatrixWorld(true);
  const tops = people.map((p) => { p.group.updateMatrixWorld(true); return g.worldToLocal(p.top()); });
  // talking: a hand up beside the face (the speaker of the bubble that just popped)
  const P_STAND = people[0].pose('stand');
  const P_TALK = people[0].pose('raise', { side: 'R' });
  const P_TALK_HALF = blendPoses(P_STAND, P_TALK, 0.55);
  const talkPose = (p, k) => p.apply(blendPoses(P_STAND, P_TALK_HALF, clamp(k)));

  // =================================================================== the jetty and the shopper
  const deckY = TY;
  const p0 = VP(PIER.u0, PIER.v0), p1 = VP(PIER.u1, PIER.v1);
  const pierLen = p0.distanceTo(p1);
  const pier = (() => {
    const parts = [];
    const box = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(flat(b)); };
    box(pierLen, 0.18, PIER.w, pierLen / 2, -0.09, 0);
    for (const zz of [-1, 1]) box(pierLen, 0.2, 0.18, pierLen / 2, -0.27, zz * (PIER.w / 2 - 0.2));
    const depth = deckY - SEA_Y + 4;
    // piles under the deck only (posts standing up at its end made a frame round the shopper)
    for (const x of [pierLen * 0.42, pierLen * 0.7, pierLen - 0.3]) for (const zz of [-1, 1]) {
      const c = new THREE.CylinderGeometry(0.14, 0.16, depth - 0.1, 8); c.translate(x, (-0.1 - depth) / 2, zz * (PIER.w / 2 - 0.06)); parts.push(flat(c));
    }
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ shade: 0.95, bias: 0.06 }));
    m.castShadow = m.receiveShadow = true;
    const grp = new THREE.Group(); grp.name = 'pier'; grp.add(m);
    return grp;
  })();
  pier.position.set(p0.x, deckY, p0.z);
  pier.rotation.y = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);
  g.add(pier);
  layer('scenery', pier);

  const consumer = makePerson({ height: CONS_H });
  // drawn a little darker than the others: the asker must stand out against the typed sea behind them
  consumer.material.userData.u.uShadeBias.value = -0.05;
  const phone = P.makePhone({ h: 1.2 });
  consumer.hold('R', phone, { rot: [0, Math.PI, 0] });     // the screen toward the person (and the camera behind them)
  consumer.group.position.set(CP.x, deckY, CP.z);
  g.add(consumer.group);
  layer('consumer', consumer.group);
  const CONS_YAW = (() => { const d = new V3(HP.x - CP.x, 0, HP.z - CP.z); return Math.atan2(d.x, d.z) - 0.12; })();

  // =================================================================== bubbles: paper inside a solid ink rim
  // (a comic bubble at any size: over the typed sea a pencil outline alone was lost)
  const RIM = 0.16;
  /** a bubble group facing +z: a paper face (its own material: it may be lit lime) and an ink rim just behind */
  const bubble = (name, w, h, tail, { strokes = false, t = 0.22 } = {}) => {
    const grp = new THREE.Group(); grp.name = name;
    const face = P.makeBubble({ w, h, tail, t });
    face.material.userData.u.uShadeBias.value = 0.5;
    face.material.userData.u.uAccentAll = { value: 1 };
    const rimMat = ink({ accent: 'ink', side: THREE.DoubleSide, focus: false });
    const rimGeo = flat(P.makeBubble({ w: w + 2 * RIM, h: h + 2 * RIM, tail, t: 0.08 }).mesh.geometry.clone());
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(0, -RIM * 0.55, -t / 2 - 0.06);
    rim.castShadow = false;
    grp.add(rim, face.group);
    if (strokes) {
      // three short typed strokes inside: someone's words, not yet read
      const words = new THREE.Mesh(mergeGeometries([[-0.42, 0.24, 0.62], [-0.42, -0.02, 0.84], [-0.42, -0.28, 0.48]].map(([x, y, ww]) => flat(new THREE.BoxGeometry(ww * w, 0.13 * h, 0.06).translate((x + ww / 2) * w, y * h, t / 2 + 0.04)))), rimMat);
      words.castShadow = false;
      grp.add(words);
    }
    grp.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    return { group: grp, face, mat: face.material, rimMat, tipLocal: face.tipLocal, w, h };
  };
  /** where a bubble's middle goes so its tail's tip is just over a person's head (tail 'left': the tip is 0.36 w left
   *  of the middle, so the bubble stands out to the right; tail 'right': out to the left) */
  const overHead = (ti, b, rise, side = 1) => tops[ti].clone().add(new V3(0, rise + b.h / 2 + 0.42 * b.h, 0)).addScaledVector(RIGHT, side * (0.36 * b.w - 0.15));

  // =================================================================== the question (beat 1)
  // (its tail on the right: it comes out of the phone with the tail's tip on the screen, its body to the left, over
  // the water, so before it flies the reader sees whose question it is)
  const ask = bubble('ask', 6.0, 2.0, 'right');
  ask.group.visible = false;
  g.add(ask.group);
  layer('ask', ask.group);
  const askHit = P.makeHitProxy(ask.group, 0.3);
  /** where a bubble's middle goes so its tail's tip stands just over a point (a phone's screen) */
  const tipOn = (b, at, gap = 0.25) => at.clone().add(new V3(0, gap - b.tipLocal.y, 0)).addScaledVector(RIGHT, -b.tipLocal.x);

  // ---- beat 1: everyone talks.  A small bubble over each (typed strokes: words not yet read), and a stream of copies
  // arcing into the ear
  const CHAT_AT = tops.map((p, i) => p.clone().add(new V3(0, 1.0 + (i % 2) * 1.1, 0)).addScaledVector(RIGHT, 0.45));
  const chats = people.map((_, i) => {
    const b = bubble(`said${i}`, 1.6, 0.85, 'left', { strokes: true, t: 0.18 });
    b.group.position.copy(CHAT_AT[i]);
    b.group.quaternion.copy(qCam);
    b.group.visible = false;
    talkers.add(b.group);
    return b;
  });
  const streamFace = flat(P.makeBubble({ w: 1.5, h: 0.75, tail: 'left', t: 0.14 }).mesh.geometry.clone());
  const streamRim = flat(P.makeBubble({ w: 1.5 + 2 * RIM * 0.7, h: 0.75 + 2 * RIM * 0.7, tail: 'left', t: 0.05 }).mesh.geometry.clone()).translate(0, -RIM * 0.4, -0.1);
  const streamMat = ink({ shade: 1, bias: 0.5, side: THREE.DoubleSide, focus: false });
  const streamRimMat = ink({ accent: 'ink', side: THREE.DoubleSide, focus: false });
  const stream = new THREE.InstancedMesh(streamFace, streamMat, NS);
  const streamR = new THREE.InstancedMesh(streamRim, streamRimMat, NS);
  for (const s of [stream, streamR]) { s.name = 'stream'; s.frustumCulled = false; s.castShadow = false; talkers.add(s); }

  // ---- beat 2: five stars (a review that says nothing), then the concrete reviews (lever b: the third is about A)
  const stars = bubble('stars', STARS.w, STARS.h, 'left');
  {
    const sg = starGeo(0.36, 0.1);
    const geo = mergeGeometries([0, 1, 2, 3, 4].map((i) => sg.clone().translate((i - 2) * 0.82, 0, 0.16)));
    const m = new THREE.Mesh(geo, ink({ accent: 'ink', focus: false }));
    m.castShadow = false;
    stars.group.add(m);
  }
  stars.group.visible = false;
  talkers.add(stars.group);
  const STARS_AT = overHead(ROLE.stars, stars, 1.0);
  const reviews = { b: 0, c: 1, d: 2, a: 2 };
  const rbs = {};
  for (const [id, r] of Object.entries(reviews)) {
    // (over the two at the right end the bubble stands out to the left, so it stays in the picture)
    const side = ROLE[id] >= 3 ? -1 : 1;
    const b = bubble(`talk-${id}`, RB.w, RB.h, side < 0 ? 'right' : 'left');
    b.group.visible = false;
    talkers.add(b.group);
    rbs[id] = { ...b, r, ti: ROLE[id], at: overHead(ROLE[id], b, 1.0, side) };
  }
  const talkHit = P.makeHitProxy(talkers, 0.3);

  // ---- beats 3–4: the shopper's question, flown to the one who named B (or A), and the honest answer under it: a
  // thread over that person, the question on top
  // (out of the phone like the first question, its tail on the screen; landed, the tail points back at the asker)
  const ask2 = bubble('ask2', 4.8, 1.6, 'right');
  ask2.group.visible = false;
  g.add(ask2.group);
  layer('consumer', ask2.group);
  const con = bubble('con', 5.9, 1.7, 'right');
  con.group.visible = false;
  g.add(con.group);
  layer('con', con.group);
  const conHit = P.makeHitProxy(con.group, 0.3);
  /** the answer: its tail's tip just over its speaker's head, the bubble out to the left, over the others (the
   *  shopper and the list stand to the right) */
  const conAt = (ti) => overHead(ti, con, 0.7, -1);
  /** the question, landed: just over the head of the one asked (beat 3), its tail toward the shopper who asked it;
   *  pushed up over the answer when that comes (beat 4), clear of the list on the right */
  const askLow = (ti) => tops[ti].clone().add(new V3(0, 1.1 + 0.92 * ask2.h, 0)).addScaledVector(RIGHT, 0.3 - 0.36 * ask2.w);
  const askAt = (ti) => conAt(ti).add(new V3(0, con.h + 1.0, 0)).addScaledVector(RIGHT, -0.3);

  // =================================================================== brand A: a loudspeaker on a mast, on the brand shore
  const aT = new THREE.Group(); aT.name = 'brand-a';
  g.add(aT);
  layer('horn', aT);
  const hornMat = ink({ shade: 0.85, bias: 0.05, side: THREE.DoubleSide, focus: false });
  const dashMat = ink({ accent: 'ink', focus: false });
  const mast = (() => {
    const at = VP(A_AT.u, A_AT.v);
    const y0 = gy(at.x, at.z) - 0.2;
    const grp = new THREE.Group(); grp.name = 'a-mast';
    grp.position.set(at.x, y0, at.z);
    grp.rotation.y = camYaw;
    const mH = A_AT.mast;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, mH, 8).translate(0, mH / 2, 0), hornMat);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3).translate(0, 0.25, 0), hornMat);
    for (const m of [pole, foot]) { m.castShadow = m.receiveShadow = true; grp.add(m); }
    // its dashed outline: what is left of A once nobody talks about it
    const dashes = new THREE.Mesh(mergeGeometries([...dashLine(new V3(0, 0, 0.3), new V3(0, mH, 0.3), 10, 0.14), ...dashLine(new V3(-0.65, 0.5, 0.3), new V3(0.65, 0.5, 0.3), 2, 0.12)]), dashMat);
    dashes.name = 'a-outline'; dashes.castShadow = false; dashes.visible = false;
    grp.add(dashes);
    aT.add(grp);
    return { grp, solid: [pole, foot], dashes, top: new V3(at.x, y0 + mH, at.z) };
  })();
  const horn = new THREE.Group(); horn.name = 'horn';
  const hornSolid = [];
  {
    // a PA horn: a narrow throat flaring out to a wide bell (a straight cone on a post read as a lamp), and the round
    // driver at its back
    const flare = (r0, r1, L, x0 = 0, n = 16, a = 2.6) => Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(r0 + (r1 - r0) * ((Math.exp((a * i) / n) - 1) / (Math.exp(a) - 1)), x0 + (L * i) / n));
    const along = (geo) => geo.rotateZ(-Math.PI / 2);   // the lathe's axis (y) → the horn's (+x)
    const coneM = new THREE.Mesh(along(new THREE.LatheGeometry(flare(0.32, HORN_R, HORN_L), 28)), hornMat);
    const inside = new THREE.Mesh(along(new THREE.LatheGeometry(flare(0.27, HORN_R * 0.93, HORN_L * 0.97, 0.08), 28)), ink({ shade: 0.25, side: THREE.BackSide, focus: false }));
    const rimM = new THREE.Mesh(new THREE.TorusGeometry(HORN_R, 0.12, 6, 32).rotateY(Math.PI / 2).translate(HORN_L, 0, 0), hornMat);
    const driver = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.9, 16).rotateZ(-Math.PI / 2).translate(-0.4, 0, 0), hornMat);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2).translate(-0.85, 0, 0), hornMat);
    // (no cast shadow: on the brand shore beneath it the horn's shadow read as a sign on a post)
    for (const m of [coneM, inside, rimM, driver, cap]) { m.castShadow = false; horn.add(m); hornSolid.push(m); }
  }
  aT.add(horn);
  // the loudspeaker sits on a short bracket off the mast's top, its bell clear of the mast
  const HORN_AT = mast.top.clone().addScaledVector(RIGHT, -0.6).add(new V3(0, 0.7, 0));
  const rod = (() => {
    const d = HORN_AT.clone().sub(mast.top), L = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, L, 8), hornMat);
    m.position.copy(mast.top).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(YAX, d.normalize());
    m.name = 'horn-bracket'; m.castShadow = true;
    aT.add(m);
    return m;
  })();
  // where its shouts break: in front of the brow (the head is at its rest turn while the set is built) — the shout
  // hits the face and does not get in
  const BREAK = onHead(0.5, 0.88, -0.02);
  // the loudspeaker points across the picture at the face, in the picture's plane, its bell turned a little away from
  // the reader: seen from the side it reads as a loudspeaker (seen down its axis it was a ball on a post, and with its
  // bell toward the reader the inside showed like a lamp's shade)
  const HORN_DIR = (() => {
    const d = BREAK.clone().sub(HORN_AT);
    const dv = d.dot(RIGHT);
    // never steeper than about 30° below the horizontal: pointing down it read as a lamp
    const side = Math.sign(dv || -1) * Math.max(Math.abs(dv), 1.75 * Math.abs(d.y));
    return FWD.clone().multiplyScalar(0.18 * Math.abs(side)).addScaledVector(RIGHT, side).setY(d.y).normalize();
  })();
  const HORN_Q = new Q().setFromUnitVectors(XAX, HORN_DIR);
  // 換你試試 b, beat 5: the loudspeaker is put down, its bell to the ground
  const HORN_Q_DOWN = new Q().setFromUnitVectors(XAX, RIGHT.clone().multiplyScalar(-0.35).add(new V3(0, -1, 0)).normalize());
  horn.position.copy(HORN_AT);
  horn.quaternion.copy(HORN_Q);
  // its dashed outline (beat 5, lever a): the bell's ring and the two edges of the cone as the phone camera sees them
  const hornDash = (() => {
    const tc = FWD.clone().multiplyScalar(-Math.cos(0.3)).add(new V3(0, Math.sin(0.3), 0)).normalize();
    const dl = tc.applyQuaternion(HORN_Q.clone().invert());
    const r = XAX.clone().cross(dl).normalize();
    const parts = [];
    for (const s of [1, -1]) parts.push(...dashLine(r.clone().multiplyScalar(s * 0.3), new V3(HORN_L, 0, 0).addScaledVector(r, s * HORN_R), 5, 0.12));
    const N = 12;
    for (let i = 0; i < N; i++) parts.push(flat(new THREE.TorusGeometry(HORN_R, 0.07, 4, 4, ((2 * Math.PI) / N) * 0.55).rotateZ((i * 2 * Math.PI) / N).rotateY(Math.PI / 2).translate(HORN_L, 0, 0)));
    parts.push(...dashLine(new V3(-0.75, 0, 0).addScaledVector(r, 0.5), new V3(-0.75, 0, 0).addScaledVector(r, -0.5), 2, 0.1));
    const m = new THREE.Mesh(mergeGeometries(parts), dashMat);
    m.name = 'horn-outline'; m.castShadow = false; m.visible = false;
    horn.add(m);
    return m;
  })();
  const hornHit = P.makeHitProxy(horn, 0.5);

  // the loudspeaker's 「))」 at its bell while it blasts (a drawn sound mark, in solid ink, its bulge toward the face)
  const HORN_MOUTH0 = HORN_AT.clone().add(new V3(HORN_L, 0, 0).applyQuaternion(HORN_Q));
  const WAVE_TH = (() => { const d = BREAK.clone().sub(HORN_MOUTH0); return Math.atan2(d.y, d.dot(RIGHT)); })();
  const waveGeo = mergeGeometries([flat(new THREE.TorusGeometry(1, 0.09, 5, 28, Math.PI * 0.7)), flat(new THREE.TorusGeometry(0.68, 0.085, 5, 24, Math.PI * 0.7))]).rotateZ(WAVE_TH - Math.PI * 0.35);
  const WAVE_MID = HORN_MOUTH0.clone().lerp(BREAK, 0.5).add(new V3(0, 1.2, 0));
  const waveMat = ink({ accent: 'ink', focus: false });
  const waves = Array.from({ length: NW }, (_, i) => {
    const m = new THREE.Mesh(waveGeo, waveMat);
    m.name = `wave${i}`; m.castShadow = false; m.visible = false;
    aT.add(m);
    return m;
  });
  // the shouts: each a jagged comic balloon (paper inside a solid ink rim) carrying 「A 牌最好！」 from the bell to the
  // face; there it squashes and shatters into wedges that drop into the sea and sink
  const star = (w, h) => Array.from({ length: 2 * SHOUT.n }, (_, i) => {
    const a = (i / (2 * SHOUT.n)) * Math.PI * 2 + 0.11, r = i % 2 ? 1 - SHOUT.j : 1;
    return new THREE.Vector2((Math.cos(a) * r * w) / 2, (Math.sin(a) * r * h) / 2);
  });
  const slab = (pts, t) => { const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: t, bevelEnabled: false }); geo.translate(0, 0, -t / 2); return flat(geo); };
  const shoutFace = ink({ shade: 1, bias: 0.5, side: THREE.DoubleSide, focus: false });
  const shoutRim = ink({ accent: 'ink', side: THREE.DoubleSide, focus: false });
  const SP_IN = star(SHOUT.w, SHOUT.h), SP_OUT = star(SHOUT.w + 2 * RIM * 1.4, SHOUT.h + 2 * RIM * 1.4);
  const shouts = Array.from({ length: NW }, (_, i) => {
    const grp = new THREE.Group(); grp.name = `shout${i}`;
    const f = new THREE.Mesh(slab(SP_IN, 0.2), shoutFace);
    const r = new THREE.Mesh(slab(SP_OUT, 0.08).translate(0, 0, -0.16), shoutRim);
    for (const m of [f, r]) { m.castShadow = false; grp.add(m); }
    grp.visible = false;
    aT.add(grp);
    return grp;
  });
  // its wedges (pie slices of the balloon, each round its own middle): one instanced pair per slice, one instance per shout
  const per = (2 * SHOUT.n) / SHOUT.k;
  const WEDGE = Array.from({ length: SHOUT.k }, (_, k) => {
    const pick = (Pp) => [new THREE.Vector2(0, 0), ...Array.from({ length: per + 1 }, (_, j) => Pp[(k * per + j) % Pp.length])];
    const inn = pick(SP_IN), out = pick(SP_OUT);
    const c = inn.reduce((m, v) => m.add(v), new THREE.Vector2()).multiplyScalar(1 / inn.length);
    const face = new THREE.InstancedMesh(slab(inn.map((v) => v.clone().sub(c)), 0.2), shoutFace, NW);
    const rim = new THREE.InstancedMesh(slab(out.map((v) => v.clone().sub(c).multiplyScalar(1.06)), 0.08).translate(0, 0, -0.16), shoutRim, NW);
    for (const m of [face, rim]) { m.name = 'shatter'; m.frustumCulled = false; m.castShadow = false; aT.add(m); }
    return { face, rim, c, dir: c.clone().normalize(), spin: (R() - 0.5) * 5, out: 0.8 + R() * 0.9 };
  });

  // =================================================================== the 推薦名單 (typed, AI-made), its tick
  const card = P.makeResultCard({ w: CARD.w, h: CARD.h, rows: 4, lean: 0, t: 0.1 });
  card.group.name = 'card';
  const YAW_LISTEN = yawFor(FACE_LISTEN);
  card.group.visible = false;
  g.add(card.group);
  layer('card', card.group);
  const cardHit = P.makeHitProxy(card.group, 0.3);
  const ins = 0.05 * Math.min(CARD.w, CARD.h);
  const rowZ = (i) => { const z0 = -CARD.h / 2 + 2 * ins, z1 = CARD.h / 2 - 2 * ins; return z0 + ((i + 0.5) / 4) * (z1 - z0); };
  // a box at the head of each brand row (rows 1-3; row 0 is the heading): the list is one to tick
  {
    const s = CARD.box, th = 0.07, x = -CARD.w / 2 + CARD.bx, y = 0.1 + 0.03;
    const parts = [];
    for (let r = 1; r <= 3; r++) {
      const z = rowZ(r);
      for (const [w, d, dx, dz] of [[s + th, th, 0, -s / 2], [s + th, th, 0, s / 2], [th, s + th, -s / 2, 0], [th, s + th, s / 2, 0]]) parts.push(flat(new THREE.BoxGeometry(w, 0.04, d).translate(x + dx, y, z + dz)));
    }
    const boxes = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink', focus: false }));
    boxes.name = 'tick-boxes'; boxes.castShadow = false;
    card.mesh.add(boxes);
  }
  // the tick: a lime check in the checked row's box (people tick: it is not the AI's)
  const tick = (() => {
    const grp = new THREE.Group(); grp.name = 'tick';
    const mat = ink({ shade: 0.5, accent: 'lime', focus: false });
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.14).translate(0.31, 0, 0), mat);
    a.rotation.z = 2.35; a.position.set(0.05, -0.2, 0);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.2, 0.14).translate(0.575, 0, 0), mat);
    b.rotation.z = 0.95; b.position.set(0.05, -0.2, 0);
    const rim = ink({ accent: 'ink', focus: false });
    const ra = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.32, 0.06).translate(0.31, 0, 0), rim); ra.rotation.z = 2.35; ra.position.set(0.05, -0.2, -0.08);
    const rb = new THREE.Mesh(new THREE.BoxGeometry(1.27, 0.32, 0.06).translate(0.575, 0, 0), rim); rb.rotation.z = 0.95; rb.position.set(0.05, -0.2, -0.08);
    grp.add(a, b, ra, rb);
    grp.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    return { group: grp, mat };
  })();
  tick.group.visible = false;
  card.mesh.add(tick.group);
  // the AI writing a row: a typed slip out of the mouth onto the list, one per review read (beat 2)
  const SLIP_W = CARD.w - CARD.ml - 0.3, SLIP_H = 0.9;
  const slipMat = ink({ style: 1, shade: 0.8, accent: 'teal', focus: false });
  const slips = [0, 1, 2].map((r) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(SLIP_W, SLIP_H, 0.08), slipMat);
    m.name = `slip${r}`; m.castShadow = false; m.visible = false;
    g.add(m);
    return m;
  });
  layer('card', ...slips);
  /** where slip r lands: its row on the list (wherever the list is) */
  const rowAt = (i) => { card.group.updateMatrixWorld(true); return g.worldToLocal(card.mesh.localToWorld(new V3((CARD.ml - 0.15) / 2, 0.12, rowZ(i)))); };
  // a teal hairline from the phone to the card, once the card rides the phone
  const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6).translate(0, 0.5, 0), ink({ shade: 0.5, accent: 'teal', focus: false }));
  tether.name = 'tether'; tether.castShadow = false; tether.visible = false;
  g.add(tether);
  layer('card', tether);

  // =================================================================== pose
  // what pose() decided and emphasize() / the anchors need
  const S = {
    beat: LAST, t: BEATS[LAST].dur, lever: 'a', emph: null,
    askW: false, rows: 3, card: 'phone', cardFull: true, rb: {}, rbLime: null, ask2W: false, conW: false, ticked: false,
    waveLead: -1, aFade: 0, starsOn: false, speaker: -1,
  };
  const _m = new M4(), _p = new V3(), _q = new Q(), _q2 = new Q(), _s = new V3();
  const phoneAt = () => { phone.group.updateWorldMatrix(true, false); return g.worldToLocal(phone.group.localToWorld(new V3(0, 0.6, 0.1))); };
  const CB = VP(CONS_BACK.u, CONS_BACK.v);
  const WALK_L = CP.distanceTo(CB), WALK_YAW = Math.atan2(CB.x - CP.x, CB.z - CP.z);
  const STRIDE = 0.36 * CONS_H;
  const P_HOLD = consumer.pose('hold');
  const P_RAISE = consumer.pose('raise');
  const P_CSTAND = consumer.pose('stand');
  // the nod: the hold pose with the head bowed
  const ex = (x) => new Q().setFromEuler(new THREE.Euler(x, 0, 0, 'YXZ'));
  const P_NOD = (() => { const v = consumer.pose('hold'); v.head.multiply(ex(0.55)); v.neck.multiply(ex(0.3)); v.waist.multiply(ex(0.12)); return v; })();
  // the tap: the free hand to the phone's screen, the head bowed to it
  const P_TAP = (() => { const v = consumer.pose('hold'); v.hand.L.p.copy(P_HOLD.hand.R.p).add(new V3(0.04, 0.05, -0.03)); v.head.multiply(ex(0.3)); return v; })();
  // the list looked over: the phone a little higher, the head bowed to it
  const P_LOOK = (() => { const v = consumer.pose('hold'); for (const s of ['L', 'R']) v.hand[s].p.add(new V3(0, 0.045, 0.02)); v.head.multiply(ex(0.22)); return v; })();
  /** walking with the phone kept in front of the chest */
  const walkHold = (dist) => { const v = consumer.pose('walk', { dist, stride: STRIDE }); for (const k of ['p', 'pole', 'grip']) v.hand.R[k].copy(P_HOLD.hand.R[k]); return v; };
  const revOf = (L) => (L === 'b' ? REV_B : REV_A);
  /** a quadratic arc a → c → b at u */
  const arc = (a, c, b, u, out) => out.set(0, 0, 0).addScaledVector(a, (1 - u) * (1 - u)).addScaledVector(c, 2 * (1 - u) * u).addScaledVector(b, u * u);
  const turnTo = (a, b, kk) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * kk; };
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  /** where the card rides above the phone */
  const cardOnPhone = (k = 0) => phoneAt().addScaledVector(RIGHT, lerp(CARD_UP.dv, CARD_LOW.dv, k)).addScaledVector(FWD, lerp(CARD_UP.du, CARD_LOW.du, k)).add(new V3(0, lerp(CARD_UP.y, CARD_LOW.y, k), 0));

  function pose(beat, k = 1, lever = 'a') {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const L = lever === 'b' ? 'b' : 'a';
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i: 1 once past, 0 before */
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : clamp((t - a) / (z - a)));
    const at = (i, x) => beat > i || (beat === i && t >= x);
    const revs = revOf(L);
    // when the people talk and their words stream into the ear: all through beat 1; and with 換你試試 b in beat 5, once
    // the loudspeaker is put down (the people talking is what is left, and the AI keeps listening)
    const TW = beat === 0 ? { talk: T1.talk, s0: T1.stream0, off0: T1.chatOff0, off1: T1.chatOff1 }
      : beat === LAST && L === 'b' ? { talk: T5.down1 - 0.1, s0: T5.down1 + 0.15, off0: BEATS[LAST].dur - 0.4, off1: BEATS[LAST].dur } : null;
    const asked = L === 'b' ? 'a' : 'b';   // the brand the shopper checks with a real person
    const askedTi = ROLE[asked];

    // ---- the head: out to sea, then to the asker as the question reaches it, then its ear to the people (beat 1);
    // listening through beat 2; back to the asker from beat 3
    let face;
    if (beat === 0) face = t < T1.ear0 ? lerp(FACE_AWAY, FACE_REST, ss(t, T1.turn0, T1.turn1)) : lerp(FACE_REST, FACE_LISTEN, ss(t, T1.ear0, T1.ear1));
    else if (beat === 1) face = FACE_LISTEN;
    else if (beat === 2) face = lerp(FACE_LISTEN, FACE_REST, ss(t, 0, 0.7));
    else face = FACE_REST;
    const away = beat === 0 ? 1 - ss(t, T1.turn0, T1.turn1) : 0;
    hg.rotation.set(0, yawFor(face), 0.06 * away);
    hg.updateMatrixWorld(true);
    earRing.visible = at(0, T1.earOn);
    // it flashes as each of their words goes in (beat 1)
    let earPulse = 0;
    if (TW) for (let i = 0; i < NS; i++) { const ta = TW.s0 + i * T1.gap + T1.fly; if (ta < TW.off1) earPulse = Math.max(earPulse, bump(t, ta - 0.03, ta + 0.07, ta + 0.32)); }
    earRing.scale.set(0.045 * H, 0.075 * H, 0.045 * H).multiplyScalar(1 + 0.3 * earPulse);
    S.earPulse = earPulse;
    const ear = onHead(EAR_H[0] + 0.03, EAR_H[1], EAR_H[2] + 0.05);
    const mouth = onHead(...MOUTH_H);

    // ---- the shopper: raises the phone to ask, then holds it at the chest (beats 1–2); beat 3: turns from the AI to
    // the people (the question goes from the phone to one of them), then walks back along the jetty to them and faces
    // the one asked; beat 4: nods at the answer, taps the phone (the tick), and looks the list over
    const yawB = yawTo(CB, tPts[askedTi]);
    const yawAsk = yawTo(CP, tPts[askedTi]);
    if (beat < 2) {
      consumer.group.position.set(CP.x, deckY, CP.z);
      consumer.group.rotation.set(0, CONS_YAW, 0);
      if (beat === 0) {
        if (t < T1.lower0) consumer.apply(blendPoses(P_HOLD, P_RAISE, ss(t, T1.raise0, T1.raise1)));
        else consumer.apply(blendPoses(P_RAISE, P_HOLD, ss(t, T1.lower0, T1.lower1)));
      } else consumer.apply(P_HOLD);
    } else if (beat === 2) {
      const w = ss(t, T3.walk0, T3.walk1);
      _p.copy(CP).lerp(CB, w);
      consumer.group.position.set(_p.x, deckY, _p.z);
      let yaw, v;
      if (t < T3.walk0) { yaw = turnTo(CONS_YAW, yawAsk, ss(t, 0, T3.turn1)); v = blendPoses(P_HOLD, walkHold(0), ss(t, T3.walk0 - 0.25, T3.walk0)); }
      else if (t < T3.walk1) { yaw = turnTo(yawAsk, WALK_YAW, ss(t, T3.walk0, T3.walk0 + 0.4)); v = walkHold(WALK_L * w); }
      else { const kk = ss(t, T3.walk1, T3.stop1); yaw = turnTo(WALK_YAW, yawB, kk); v = blendPoses(walkHold(WALK_L), P_HOLD, kk); }
      consumer.group.rotation.set(0, yaw, 0);
      consumer.apply(v);
    } else {
      consumer.group.position.set(CB.x, deckY, CB.z);
      consumer.group.rotation.set(0, yawB, 0);
      if (beat === 3) {
        // two nods as the answer comes; the other hand to the phone's screen (the tick), back; then the phone up a
        // little, looked at
        const nh = (T4.nod1 - T4.nod0) / 2;
        const nod = bump(t, T4.nod0, T4.nod0 + 0.45 * nh, T4.nod0 + nh) + bump(t, T4.nod0 + nh, T4.nod0 + 1.45 * nh, T4.nod1);
        const tap = ss(t, T4.reach0, T4.reach1) * (1 - ss(t, T4.back0, T4.back1));
        const v = blendPoses(blendPoses(P_HOLD, P_NOD, nod), P_TAP, tap);
        consumer.apply(blendPoses(v, P_LOOK, ss(t, T4.look0, T4.look1)));
      } else consumer.apply(P_LOOK);
    }
    consumer.group.updateMatrixWorld(true);
    const consAt = consumer.group.position;

    // ---- the question: out of the phone (its tail's tip on the screen), held there a moment, then up to the brow,
    // where its words go in and the bubble after them (they never travel apart)
    {
      const a = beat === 0 ? pop(seg(t, T1.ask0, T1.ask0 + T1.askPop)) : 0;
      const f = beat === 0 ? seg(t, T1.fly0, T1.fly1) : 1;
      const gin = beat === 0 ? seg(t, T1.in0, T1.in1) : 1;
      const on = beat === 0 && t >= T1.ask0 && gin < 1;
      ask.group.visible = on;
      // the words once it is full size, until it starts to go in at the brow
      S.askW = on && t >= T1.ask0 + 0.5 * T1.askPop && t < T1.in0;
      if (on) {
        const from = tipOn(ask, phoneAt());
        // in front of the brow, on the camera's side of the face
        const brow = onHead(...BROW_H), front = brow.clone().addScaledVector(FWD, -2.2).add(new V3(0, 0.4, 0));
        if (f <= 0) _p.copy(from);
        else { const c = from.clone().lerp(front, 0.5); c.y = Math.max(from.y, front.y) + 1.6; arc(from, c, front, sm(f), _p); }
        if (gin > 0) _p.lerp(brow, sm(gin));
        ask.group.position.copy(_p);
        ask.group.quaternion.copy(qCam);
        ask.group.scale.setScalar(Math.max(1e-3, (0.3 + 0.7 * a) * (1 - 0.97 * sm(gin))));
      }
    }

    // ---- the people: everyone talks in beat 1 (a hand up, a little out of step); in beat 2 each speaker raises a
    // hand as their bubble pops; in beat 3 the one asked turns to the shopper and puts a hand up (they can tell), and
    // in beat 4 answers with it, then lowers it
    const SPEAK = { [ROLE.stars]: { p: T2.stars0, e: T2.starsFly1 } };
    for (const id of revs) { const rt = revT(reviews[id]); SPEAK[ROLE[id]] = { p: rt.p, e: rt.g1 }; }
    people.forEach((p, i) => {
      let gesture = 0;
      if (TW && i > 0) gesture = 0.75 * bump(t, TW.talk + 0.06 * i, TW.talk + 0.4 + 0.06 * i, TW.off1 - 0.1);
      else if (beat === 1 && SPEAK[i]) gesture = bump(t, SPEAK[i].p - 0.15, SPEAK[i].p + 0.15, SPEAK[i].e + 0.2);
      else if (beat === 2 && i === askedTi) gesture = 0.6 * ss(t, T3.hand0, T3.hand1);
      else if (beat === 3 && i === askedTi) gesture = t < 0.2 ? lerp(0.6, 1, ss(t, 0, 0.2)) : t < T4.talk1 ? 1 - 0.12 * Math.sin(((t - 0.2) / (T4.talk1 - 0.2)) * Math.PI * 3) ** 2 : 1 - ss(t, T4.talk1, T4.talk1 + 0.6);
      talkPose(p, gesture);
      // the one asked turns to the shopper (and keeps facing them as they come back along the jetty)
      const turnK = i === askedTi ? (beat === 2 ? ss(t, T3.turnB0, T3.turnB1) : beat > 2 ? 1 : 0) : 0;
      p.group.rotation.y = turnTo(TALK_YAW[i], yawTo(tPts[i], beat === 2 ? consAt : CB), 0.8 * turnK);
    });
    // their small bubbles (beat 1)
    chats.forEach((b, i) => {
      const kk = TW && i > 0 ? Math.min(pop(seg(t, TW.talk + 0.07 * i, TW.talk + 0.3 + 0.07 * i)), 1 - ss(t, TW.off0, TW.off1)) : 0;
      b.group.visible = kk > 0.001;
      b.group.position.copy(CHAT_AT[i]);
      b.group.scale.setScalar(Math.max(1e-3, kk));
    });
    // the stream: copies of their words arcing up into the ear, shrinking as they go in
    let lastIn = -1;
    for (let i = 0; i < NS; i++) {
      const ti = 1 + ((i * 3) % 4), t0 = TW ? TW.s0 + i * T1.gap : 0;
      const u = TW && t0 + T1.fly < TW.off1 ? (t - t0) / T1.fly : -1;
      if (TW && u >= 1) lastIn = Math.max(lastIn, t0 + T1.fly);
      if (u <= 0 || u >= 1) { stream.setMatrixAt(i, _m.compose(tops[ti], qCam, _s.setScalar(1e-4))); streamR.setMatrixAt(i, _m); continue; }
      const a = CHAT_AT[ti];
      const mid = a.clone().lerp(ear, 0.45); mid.y = Math.max(a.y, ear.y) + 2.6 + ((i * 7) % 5) * 0.5;
      const e = u * u * (3 - 2 * u) * 0.55 + u * 0.45;
      arc(a, mid, ear, e, _p);
      const sc = Math.min(1, u / 0.12) * (u > 0.7 ? Math.max(0.05, 1 - (u - 0.7) / 0.3) : 1);
      stream.setMatrixAt(i, _m.compose(_p, qCam, _s.setScalar(Math.max(1e-4, sc))));
      streamR.setMatrixAt(i, _m);
    }
    stream.instanceMatrix.needsUpdate = true; streamR.instanceMatrix.needsUpdate = true;
    stream.visible = streamR.visible = !!TW;

    // ---- the five stars (beat 2): pop over their speaker, fly at the ear, hit the cheek and drop into the sea
    {
      const a = beat === 1 ? pop(seg(t, T2.stars0, T2.stars0 + 0.2)) : 0;
      const f = beat === 1 ? seg(t, T2.starsFly0, T2.starsFly1) : 0;
      const d = beat === 1 ? seg(t, T2.starsFly1, T2.starsFly1 + T2.starsFall) : 0;
      const on = beat === 1 && t >= T2.stars0 && d < 1;
      stars.group.visible = on;
      S.starsOn = on;
      S.speaker = on && d < 0.5 ? ROLE.stars : -1;
      if (on) {
        const hit = onHead(0.26, 0.6, 0.36);   // the cheek in front of the ear
        if (f <= 0) _p.copy(STARS_AT);
        else { const c = STARS_AT.clone().lerp(hit, 0.5); c.y = Math.max(STARS_AT.y, hit.y) + 1.6; arc(STARS_AT, c, hit, sm(f), _p); }
        let sc = a, spin = 0;
        if (d > 0) {
          // knocked back off the cheek, then it falls and sinks — out to the left, the way it came, away from where
          // the first concrete review rises after it (on the right)
          _p.copy(hit).addScaledVector(FWD, -1.4 * d).addScaledVector(RIGHT, -2.2 * d);
          _p.y += 2.4 * d - 13 * d * d;
          if (_p.y < SEA_Y) { const sink = SEA_Y - _p.y; _p.y = SEA_Y - Math.min(sink, 1) * 0.4; sc *= Math.max(0, 1 - sink / 1.2); }
          spin = 2.8 * d;
        }
        stars.group.position.copy(_p);
        stars.group.quaternion.copy(qCam).multiply(_q2.setFromAxisAngle(ZAX, spin));
        stars.group.scale.setScalar(Math.max(1e-3, sc));
      }
    }

    // ---- the list: out of the mouth onto the shopper's phone (beat 2), where it rides from then on
    {
      const a = Wn(1, CARD_T0, CARD_T1);
      card.group.visible = a > 0;
      if (a > 0) {
        // over the shopper's head while it is written; it comes down to their side as they walk back
        const to = cardOnPhone(beat < 2 ? 0 : beat === 2 ? ss(t, T3.walk0, T3.walk1) : 1);
        if (a < 1) {
          const e = sm(a);
          const c = mouth.clone().lerp(to, 0.5); c.y = Math.max(mouth.y, to.y) + 1.5;
          arc(mouth, c, to, e, _p);
          card.group.position.copy(_p);
          card.group.scale.setScalar(Math.max(1e-3, 0.15 + 0.85 * e));
        } else {
          card.group.position.copy(to);
          card.group.scale.setScalar(1);
        }
        card.group.quaternion.copy(qCam);
      }
      S.card = a >= 1 ? 'phone' : a > 0 ? 'flying' : 'none';
      S.cardFull = a >= 1;
      // the tether to the phone, once it is there
      const th = a >= 1;
      tether.visible = th;
      if (th) {
        card.group.updateMatrixWorld(true);
        const from = phoneAt();
        const tc = g.worldToLocal(card.mesh.localToWorld(new V3(-CARD.w / 2 + 0.3, 0.05, CARD.h / 2 - 0.05)));
        const d = tc.clone().sub(from);
        tether.position.copy(from);
        tether.quaternion.setFromUnitVectors(YAX, d.clone().normalize());
        tether.scale.set(1, Math.max(1e-3, d.length()), 1);
      }
    }

    // ---- the reviews (beat 2): each pops over its speaker, holds, flies into the ear and is swallowed there (its
    // words with it); a typed slip out of the mouth writes that brand onto the list
    S.rb = {}; S.rbLime = null; S.slip = null;
    let nRows = beat > 1 ? 3 : 0;
    for (const [id, b] of Object.entries(rbs)) {
      const mine = revs.includes(id);
      const r = b.r, rt = revT(r);
      let vis = false, sc = 0, word = false;
      if (beat === 1 && mine && t >= rt.p && t < rt.g1) {
        const up = pop(seg(t, rt.p, rt.on)), f = seg(t, rt.f0, rt.f1), gl = seg(t, rt.f1, rt.g1);
        vis = true;
        const c = b.at.clone().lerp(ear, 0.5); c.y = Math.max(b.at.y, ear.y) + 2.2;
        if (f <= 0) _p.copy(b.at);
        else arc(b.at, c, ear, sm(f), _p);
        sc = up * (1 - 0.95 * sm(gl));
        // its words once it is full size (its pop overshoots to full size halfway), until it reaches the ear (then
        // the bubble goes in)
        word = t >= rt.p + 0.5 * T2.pop && t < rt.f1;
        b.group.position.copy(_p);
        b.group.quaternion.copy(qCam);
        if (t < rt.f1) S.rbLime = id;
        S.speaker = b.ti;
      }
      if (beat === 1 && mine && t >= rowAtT(r)) nRows = Math.max(nRows, r + 1);
      // out of the mouth to its row on the list
      if (mine) {
        const sl = slips[r], s0 = rt.f1 + T2.gulp * 0.5, u = beat === 1 && r > 0 ? (t - s0) / T2.slip : -1;
        sl.visible = u > 0 && u < 1;
        if (sl.visible) {
          const to = rowAt(r + 1);
          const c = mouth.clone().lerp(to, 0.5); c.y = Math.max(mouth.y, to.y) + 1.0;
          arc(mouth, c, to, sm(u), sl.position);
          sl.quaternion.copy(qCam);
          sl.scale.setScalar(0.45 + 0.55 * eo(u / 0.4));
        }
      }
      b.group.visible = vis && sc > 0.01;
      b.group.scale.setScalar(Math.max(1e-3, sc));
      S.rb[id] = word;
    }
    S.rows = nRows;

    // ---- the shopper asks a real person (beat 3): the question from the phone to over that person; the honest
    // answer under it (beat 4); the tick on that row of the list
    {
      const a = Wn(2, T3.ask0, T3.ask0 + T3.askPop), f = Wn(2, T3.afly0, T3.afly1);
      const on = (beat === 2 && t >= T3.ask0) || beat === 3;
      ask2.group.visible = on;
      // its words once it is full size (they ride it to the one asked)
      S.ask2W = on && a >= 0.5;
      if (on) {
        const from = tipOn(ask2, phoneAt());
        const to = askLow(askedTi);
        const c = from.clone().lerp(to, 0.5); c.y = Math.max(from.y, to.y) + 1.6;
        if (f <= 0) _p.copy(from); else arc(from, c, to, sm(f), _p);
        // up over the answer as it comes
        if (beat === 3) _p.lerp(askAt(askedTi), sm(seg(t, 0, T4.ans1 + 0.1)));
        ask2.group.position.copy(_p);
        ask2.group.quaternion.copy(qCam);
        ask2.group.scale.setScalar(Math.max(1e-3, 0.3 + 0.7 * pop(a)));
      }
      const ans = beat > 3 ? 1 : beat === 3 ? pop(seg(t, 0, T4.ans1)) : 0;
      con.group.visible = ans > 0.001;
      S.conW = beat > 3 || (beat === 3 && t >= 0.5 * T4.ans1);
      con.group.position.copy(conAt(askedTi));
      con.group.quaternion.copy(qCam);
      con.group.scale.setScalar(Math.max(1e-3, ans));
      const tk = beat > 3 ? 1 : beat === 3 ? pop(seg(t, T4.tick0, T4.tick1)) : 0;
      S.ticked = tk > 0.5;
      tick.group.visible = tk > 0.001;
      const row = 1 + revs.indexOf(asked);
      // in its box: the check's corner low in the box, its long stroke up to the box's top right corner
      tick.group.position.set(-CARD.w / 2 + CARD.bx - 0.2, 0.16, rowZ(row) + 0.06);
      tick.group.rotation.set(-Math.PI / 2, 0, 0);
      tick.group.scale.setScalar(Math.max(1e-3, 0.6 * tk));
    }

    // ---- A's loudspeaker (lever a): one shout in beat 1; in beat 5 three, each bigger (a bigger balloon, a bigger
    // swell, a harder kick back) — every shout flies at the face, squashes on the brow, shatters and its pieces sink;
    // then A fades to a dashed outline.  Lever b: silent, and put down in beat 5.
    const shout = beat === 0 || (beat === LAST && L === 'a');
    const nW = beat === 0 ? 1 : NW;
    const t0Of = (i) => (beat === 0 ? T1.shout : T5.s0 + i * T5.gap);
    const fly = beat === 0 ? T1.flight : T5.flight, sq = beat === 0 ? T1.sq : T5.sq;
    const bigOf = (i) => (beat === LAST ? BIG[i] : 1);
    // the swell as it draws breath, and the kick back as it blasts
    let swell = 0, kick = 0;
    if (shout) for (let i = 0; i < nW; i++) {
      swell = Math.max(swell, bump(t, t0Of(i) - 0.25, t0Of(i) + 0.02, t0Of(i) + 0.4) * (0.22 + 0.16 * i));
      kick = Math.max(kick, bump(t, t0Of(i) - 0.02, t0Of(i) + 0.06, t0Of(i) + 0.45) * (0.5 + 0.45 * i));
    }
    horn.scale.setScalar(1 + swell);
    horn.position.copy(HORN_AT).addScaledVector(HORN_DIR, -kick);
    horn.quaternion.copy(HORN_Q);
    if (L === 'b' && beat === LAST) horn.quaternion.slerp(HORN_Q_DOWN, ss(t, T5.down0, T5.down1));
    const hornMouth = horn.position.clone().add(new V3(HORN_L * (1 + swell), 0, 0).applyQuaternion(HORN_Q));
    S.waveLead = -1;
    for (let i = 0; i < NW; i++) {
      const t0 = t0Of(i), ta = t0 + fly, tb = ta + sq, big = bigOf(i);
      const live = shout && i < nW;
      // the 「))」 at the bell as it blasts
      const wu = live ? (t - (t0 - 0.05)) / 0.45 : -1;
      waves[i].visible = wu > 0 && wu < 1;
      if (waves[i].visible) {
        waves[i].position.copy(hornMouth).addScaledVector(HORN_DIR, 0.4 + 1.6 * wu);
        waves[i].rotation.set(0, camYaw, 0);
        waves[i].scale.setScalar((0.9 + 1.1 * wu) * big * (1 - 0.4 * sm((wu - 0.6) / 0.4)));
      }
      // the balloon: out of the bell (small), full size within a third of its way, squashed on the brow
      const sh = shouts[i];
      sh.visible = live && t >= t0 && t < tb;
      if (sh.visible) {
        if (t < ta) {
          const u = (t - t0) / fly;
          arc(hornMouth, WAVE_MID, BREAK, u * (0.7 + 0.3 * u), _p);
          sh.position.copy(_p);
          sh.scale.setScalar(Math.max(1e-3, big * (0.45 + 0.55 * eo(u / 0.3))));
          // its words ride it once it is full size, and go when it hits
          if (u >= 0.3) S.waveLead = i;
        } else {
          const qq = sm((t - ta) / sq);
          sh.position.copy(BREAK);
          sh.scale.set(big * (1 + 0.22 * qq), big * (1 - 0.3 * qq), big);
        }
        sh.quaternion.copy(qCam);
      }
      // its pieces: from where they were on the balloon they spring out, spin, fall in front of the face and sink —
      // thrown back and out to the right, away from the list held near the camera
      const fu = live ? (t - tb) / BREAK_T : -1;
      for (const w of WEDGE) {
        if (fu < 0 || fu >= 1) { _m.compose(BREAK, _q.identity(), _s.setScalar(1e-4)); w.face.setMatrixAt(i, _m); w.rim.setMatrixAt(i, _m); continue; }
        const sx = big * 1.22, sy = big * 0.7;
        _p.copy(BREAK).addScaledVector(RIGHT, w.c.x * sx + (w.dir.x * w.out * 1.6 + 1.4) * fu).addScaledVector(FWD, 2.4 * fu);
        _p.y += w.c.y * sy + w.dir.y * w.out * 1.4 * fu + 2.2 * fu - 12 * fu * fu;
        let sc = big * (1 - 0.35 * fu);
        if (_p.y < SEA_Y) { const sink = SEA_Y - _p.y; _p.y = SEA_Y - Math.min(sink, 1) * 0.4; sc *= Math.max(0, 1 - sink / 1.5); }
        _q.copy(qCam).multiply(_q2.setFromAxisAngle(ZAX, w.spin * fu));
        _m.compose(_p, _q, _s.setScalar(Math.max(1e-4, sc)));
        w.face.setMatrixAt(i, _m); w.rim.setMatrixAt(i, _m);
      }
    }
    for (const w of WEDGE) { w.face.instanceMatrix.needsUpdate = true; w.rim.instanceMatrix.needsUpdate = true; w.face.visible = w.rim.visible = shout; }
    S.aFade = L === 'a' ? Wn(LAST, T5.fade0, T5.fade1) : 0;
    const solid = S.aFade < 0.55;
    for (const m of [...mast.solid, ...hornSolid, rod]) m.visible = solid;
    mast.dashes.visible = hornDash.visible = S.aFade >= 0.45;

    Object.assign(S, { beat, t, lever: L });
    // a part that is not drawn does not answer a tap (its proxy would still sit where it was last)
    pickable(askHit, ask.group.visible);
    pickable(cardHit, card.group.visible);
    pickable(conHit, con.group.visible);
    applyEmphasis();
    return api;
  }

  // =================================================================== emphasis by subtraction
  // which dim groups each part keeps at full strength
  const FULL = { consumer: ['consumer'], ask: ['ask'], head: ['head'], talkers: ['talkers'], card: ['card'], con: ['con'], horn: ['horn'] };
  function setDim(objs, k) {
    for (const o of objs) {
      dim(o, k);
      o.traverse((m) => { if (m.isMesh && !m.userData.hitProxy && m.userData.cast0 !== undefined) m.castShadow = k < 0.5 ? m.userData.cast0 : false; });
    }
  }
  const lime = (mat, on) => { mat.userData.u.uAccent.value = on ? ACCENT.lime : 0; };
  function applyEmphasis() {
    const E = S.emph;
    const map = E === null;
    const full = new Set();
    if (!map) for (const id of E) for (const l of FULL[id] || []) full.add(l);
    for (const [name, objs] of Object.entries(layers)) setDim(objs, map ? 0 : name === 'scenery' ? 1 : full.has(name) ? 0 : 1);
    const on = (name) => !map && full.has(name);
    // the question is the shopper's (beat 1): drawn in full with them
    if (S.beat === 0 && on('consumer')) setDim(layers.ask, 0);
    // one of them at a time: while they take turns (beat 2) the one whose bubble is up, and once the shopper asks one
    // of them (beat 3 on, and at the end) that one; the others drop to their contour (five fully hatched lay figures
    // at this size read as one scribble)
    // (換你試試 b, beat 5: the people talk on, drawn in full, as the loudspeaker is put down)
    if (S.beat === LAST && S.lever === 'b' && on('horn')) { setDim(layers.talkers, 0); full.add('talkers'); }
    if (on('talkers') && S.beat >= 1 && !(S.beat === LAST && S.lever === 'b')) {
      const one = S.beat === 1 ? S.speaker : ROLE[S.lever === 'b' ? 'a' : 'b'];
      people.forEach((p, i) => { if (i !== one) dim(p.group, 1); });
    }
    // accents: lime on the one thing the caption is about (one at a time), teal on what the AI makes or does
    lime(ask.mat, S.beat === 0 && (on('ask') || on('consumer')));
    for (const [id, b] of Object.entries(rbs)) lime(b.mat, on('talkers') && S.rbLime === id);
    lime(stars.mat, false);
    lime(ask2.mat, on('consumer') && S.beat === 2);
    lime(con.mat, on('con') && !S.ticked);
    tick.mat.userData.u.uAccent.value = on('card') || on('con') ? ACCENT.lime : 0;
    for (const c of chats) lime(c.mat, false);
    card.material.userData.u.uAccent.value = 0;
    slipMat.userData.u.uAccent.value = on('card') ? ACCENT.teal : 0;
    tether.material.userData.u.uAccent.value = on('card') ? ACCENT.teal : 0;
    earRing.material.userData.u.uAccent.value = on('head') ? ACCENT.teal : 0;
    // A on its way out: down to its contour before the dashed outline takes over
    if (S.aFade > 0 && S.aFade < 0.55) { const kk = Math.max(map || full.has('horn') ? 0 : 1, sm(S.aFade / 0.5)); for (const m of [...mast.solid, ...hornSolid, rod]) dim(m, kk); }
    // ... and the dashed outline that is left of it draws in slowly, faint to firm, while the caption is read
    if (S.aFade >= 0.45) { const kk = Math.max(map || full.has('horn') ? 0 : 1, 1 - sm((S.aFade - 0.45) / 0.55)); dim(mast.dashes, kk); dim(hornDash, kk); }
    waveMat.userData.u.uAccent.value = ACCENT.ink;
    S.lit = (name) => on(name);
  }
  function emphasize(ids) {
    S.emph = ids && ids.length ? new Set(ids) : null;
    applyEmphasis();
  }

  // =================================================================== anchors: labels, words, hotspots, framing
  g.traverse((o) => { if (o.isMesh) o.userData.cast0 = o.castShadow; });
  const Wg = (v) => g.localToWorld(v.clone());
  const headW = (x, y, z) => { hg.updateWorldMatrix(true, false); return hg.localToWorld(new V3(x * H, y * H, z * H)); };
  const restHead = (x, y, z, yaw = YAW_REST) => {
    const save = hg.rotation.y, sz = hg.rotation.z;
    hg.rotation.set(0, yaw, 0); hg.updateMatrixWorld(true);
    const p = hg.localToWorld(new V3(x * H, y * H, z * H));
    hg.rotation.set(0, save, sz); hg.updateMatrixWorld(true);
    return p;
  };
  const centreOf = (grp, x = 0, y = 0, z = 0.14) => { grp.updateWorldMatrix(true, false); return grp.localToWorld(new V3(x, y, z)); };
  const hornPt = (x, y = 0) => { horn.updateWorldMatrix(true, false); return horn.localToWorld(new V3(x, y, 0)); };
  const parts = {
    // the ring on the hips, so it does not cover the figure's chest and phone
    consumer: { hit: P.makeHitProxy(consumer.group, 0.35), anchor: () => consumer.joints.hips.localToWorld(new V3(0, -0.02 * CONS_H, 0.06 * CONS_H)), beat: 0 },
    ask: { hit: askHit, anchor: () => centreOf(ask.group, -1.9, 0.5, 0.2), beat: 0 },
    // the ring in the hair over the forehead, off the face
    head: { hit: headHit, anchor: () => headW(0.25, 0.95, 0.12), beat: 0 },
    // at the knees of the middle one (every shot holds the five), clear of the words above them
    talkers: { hit: talkHit, anchor: () => { people[2].group.updateWorldMatrix(true, false); return people[2].group.localToWorld(new V3(0, 0.3 * TALK_H, 0.12 * TALK_H)); }, beat: 0 },
    // just under the card's bottom right corner (its rows cover the card)
    card: { hit: cardHit, anchor: () => { card.group.updateWorldMatrix(true, false); return card.mesh.localToWorld(new V3(CARD.w / 2 - 0.4, 0.1, CARD.h / 2 + 0.5)); }, beat: 1 },
    // the honest answer: the ring at its tail, clear of its words
    con: { hit: conHit, anchor: () => centreOf(con.group, con.tipLocal.x, con.tipLocal.y + 0.2, 0.2), beat: 3 },
    // brand A's loudspeaker: the ring on its cone
    horn: { hit: hornHit, anchor: () => hornPt(HORN_L * 0.5), beat: 0 },
  };
  const labelAt = {
    consumer: () => consumer.top(),
    head: () => headW(0.12, 1.0, 0.1),
    // over the leftmost person's head (the stream and the bubbles rise from the middle and the right)
    talkers: () => Wg(tops[0].clone().add(new V3(0, 0.3, 0))),
    // 品牌自己說的: on the loudspeaker's cone
    horn: () => hornPt(HORN_L * 0.55, 0.4),
    // 廣告加碼 (beat 5) names the loudspeaker only when it blasts again (換你試試 b: it is put down instead)
    shout: () => (S.lever === 'b' ? null : hornPt(HORN_L * 0.55, 0.4)),
  };
  const lit = (n) => !!(S.lit && S.lit(n));
  // a review's words: on its bubble while it is said and flies, gone the moment it is swallowed
  const rbWord = (id) => () => (S.rb[id] && lit('talkers') ? centreOf(rbs[id].group, 0, 0.05, 0.16) : null);
  // the list's rows: one anchor per drawn row, left-aligned after the tick's margin
  const rowsAt = (n) => { card.mesh.updateWorldMatrix(true, false); return Array.from({ length: n }, (_, i) => card.mesh.localToWorld(new V3(-CARD.w / 2 + CARD.ml, 0.1 + 0.002, rowZ(i)))); };
  /** the list's rows while it is written (beat 2), stage by stage */
  const listAt = (n) => () => (S.beat === 1 && S.card === 'phone' && lit('card') && S.rows === n ? rowsAt(n + 1) : null);
  const cardRows = (lev) => () => (S.card === 'phone' && lit('card') && S.rows >= 3 && S.lever === lev ? rowsAt(4) : null);
  const decalAt = {
    ask: () => (S.askW ? centreOf(ask.group, 0, 0, 0.2) : null),
    'talk-b': rbWord('b'),
    'talk-c': rbWord('c'),
    'talk-d': rbWord('d'),
    'talk-a': rbWord('a'),
    // the list, row by row as the reviews go in (each stage its own words; the last one per 換你試試 option)
    'card-1': listAt(1),
    'card-2': listAt(2),
    card: cardRows('a'),
    'card-b': cardRows('b'),
    ask2: () => (S.ask2W && S.lever === 'a' ? centreOf(ask2.group, 0, 0, 0.2) : null),
    'ask2-b': () => (S.ask2W && S.lever === 'b' ? centreOf(ask2.group, 0, 0, 0.2) : null),
    con: () => (S.conW && S.lever === 'a' && lit('con') ? centreOf(con.group, 0, 0.05, 0.2) : null),
    'con-b': () => (S.conW && S.lever === 'b' && lit('con') ? centreOf(con.group, 0, 0.05, 0.2) : null),
    // the shout's words ride its balloon from a third of its way to the brow, and go with it when it breaks
    waves: () => (S.waveLead >= 0 ? centreOf(shouts[S.waveLead], 0, 0, 0.2) : null),
  };
  // the words' sizes (world height of the text) and the surfaces they sit on ([w, h], world units): they stay inside
  const decalUnit = { 'talk-b': 0.9, 'talk-c': 0.9, 'talk-d': 0.9, 'talk-a': 0.9, con: 0.9, 'con-b': 0.9, ask2: 0.9, 'ask2-b': 0.9, 'card-1': 0.9, 'card-2': 0.9, card: 0.9, 'card-b': 0.9, ask: 0.72, waves: 0.78 };
  const rowH = (CARD.h - 4 * ins) / 4, rowW = CARD.w - CARD.ml - 0.3;
  const decalSize = {
    ask: [5.6, 1.6], ask2: [4.4, 1.25], 'ask2-b': [4.4, 1.25], con: [5.5, 1.35], 'con-b': [5.5, 1.35],
    'talk-b': [RB.w - 0.5, RB.h - 0.35], 'talk-c': [RB.w - 0.5, RB.h - 0.35], 'talk-d': [RB.w - 0.5, RB.h - 0.35], 'talk-a': [RB.w - 0.5, RB.h - 0.35],
    'card-1': [rowW, rowH * 2], 'card-2': [rowW, rowH * 3],
    card: [rowW, rowH * 4], 'card-b': [rowW, rowH * 4],
    // the shout's words: inside the balloon's jagged rim (the box inscribed in its inner ellipse)
    waves: [5.0, 1.1],
  };

  // ---- the shots: fixed points (the rest pose), so the framing never depends on where the motion is
  const consPts = [Wg(CP.clone().setY(deckY)), Wg(CP.clone().setY(deckY + CONS_H + 0.2))];
  const backPts = [Wg(CB.clone().setY(deckY)), Wg(CB.clone().setY(deckY + CONS_H + 0.2))];
  // the face (brow, nose, chin) at the asker's turn and at the listening turn
  const facePts = [restHead(0.3, 0.9, 0.02), restHead(0.37, 0.78, 0), restHead(0.3, 0.5, 0.05)];
  const earPts = [restHead(0.03, 0.66, 0.31, YAW_LISTEN), restHead(0.3, 0.6, 0.05, YAW_LISTEN), restHead(0.3, 0.86, 0.02, YAW_LISTEN)];
  // the five from their knees (from their feet when the frame has room) up to their heads, and their small bubbles
  const KNEE = TY + 1.3;
  const talkPts = TALK.flatMap((_, i) => [Wg(tPts[i].clone().setY(KNEE)), Wg(tops[i].clone().add(new V3(0, 0.4, 0)))]);
  const chatPts = CHAT_AT.map((p) => Wg(p.clone().add(new V3(0, 0.6, 0))));
  const bubbleBox = (p, w, h) => [Wg(p.clone().addScaledVector(RIGHT, -w / 2 - 0.3).add(new V3(0, h / 2 + 0.3, 0))), Wg(p.clone().addScaledVector(RIGHT, w / 2 + 0.3).add(new V3(0, -h / 2 - 0.5, 0)))];
  const rbPts = Object.values(rbs).flatMap((b) => bubbleBox(b.at, RB.w, RB.h));
  const cardBox = (c, m = 0.5) => [Wg(c.clone()), Wg(c.clone().add(new V3(0, CARD.h, 0))), Wg(c.clone().addScaledVector(RIGHT, CARD.w / 2 + m)), Wg(c.clone().addScaledVector(RIGHT, -CARD.w / 2 - m).add(new V3(0, CARD.h, 0)))];
  /** f() with the shopper standing at `at`, turned to `yaw`, in pose v (then put back) */
  const shopperAt = (at, yaw, v, f) => {
    const save = [consumer.group.position.clone(), consumer.group.rotation.y];
    consumer.group.position.set(at.x, deckY, at.z); consumer.group.rotation.set(0, yaw, 0); consumer.apply(v); consumer.group.updateMatrixWorld(true);
    const c = f();
    consumer.group.position.copy(save[0]); consumer.group.rotation.set(0, save[1], 0); consumer.group.updateMatrixWorld(true);
    return c;
  };
  // the card on the phone (its bottom edge's centre) with the shopper at the jetty's end and back among the people
  const cardWith = (at, yaw, k) => shopperAt(at, yaw, P_HOLD, () => cardOnPhone(k));
  // the question as it comes out of the raised phone (beat 1)
  const askPts = bubbleBox(shopperAt(CP, CONS_YAW, P_RAISE, () => tipOn(ask, phoneAt())), ask.w, ask.h);
  const CA = cardWith(CP, CONS_YAW, 0);
  const cardPts = cardBox(CA), phonePts = cardBox(cardWith(CB, yawTo(CB, tPts[ROLE.b]), 1), 0.4);
  const hornPts = [Wg(HORN_AT.clone().add(new V3(0, 2.2, 0)).addScaledVector(RIGHT, -0.8)), Wg(HORN_AT.clone().add(new V3(0, -1.6, 0)).addScaledVector(RIGHT, 1.2))];
  const breakPts = [Wg(BREAK)];
  // the one the shopper asks (the B speaker; with 換你試試 b, the one who now talks about A), the thread over them
  // the one asked and the two beside them, from the knees up (beats 3-4 are between the shopper and them)
  const nearPts = () => { const ti = ROLE[S.lever === 'b' ? 'a' : 'b']; return [ti - 1, ti, Math.min(4, ti + 1)].flatMap((i) => [Wg(tPts[i].clone().setY(KNEE)), Wg(tops[i].clone().add(new V3(0, 0.4, 0)))]); };
  const askedPts = (q = true) => { const ti = ROLE[S.lever === 'b' ? 'a' : 'b']; return [Wg(tPts[ti].clone().setY(KNEE)), ...bubbleBox(conAt(ti), con.w, con.h), ...(q ? bubbleBox(askAt(ti), ask2.w, ask2.h) : [])]; };
  // 1: the asker, the face, the question, the loudspeaker, the people (the whole case at once).  2: the people with
  // their reviews, the ear and the mouth, the list.  3: the jetty from the asker's place back to the people, the list.
  // 4: the shopper with the list, the one asked and the thread.  5: the loudspeaker, the face, the shopper with the
  // list, the people.
  // the crown: a portrait frame has height to spare in beats 2-4 (their width is set by the people and the words);
  // holding the whole head lowers the people into the frame instead of leaving the ground below them empty
  const crownPt = restHead(0.05, 1.02, 0, YAW_LISTEN);
  // (beats 2-4 leave A's loudspeaker out: it has no part in them, and holding its mast in the frame left the shopper a
  // few dozen pixels tall)
  const SH = [
    () => [...consPts, ...facePts, ...askPts, ...hornPts, ...breakPts, ...talkPts],
    () => [...talkPts, ...rbPts, ...earPts, ...cardPts, ...consPts, crownPt],
    () => [...consPts, ...backPts, ...cardPts, ...phonePts, ...nearPts(), ...askedPts(), crownPt],
    () => [...backPts, ...phonePts, ...askedPts(), ...nearPts(), crownPt],
    () => [...backPts, ...phonePts, ...facePts, ...hornPts, ...breakPts, ...askedPts(false), ...talkPts],
  ];
  // a phone held sideways has only about 380 px of height for the whole stack: there each beat keeps what carries its
  // words (the people from their heads up, the shopper from the chest up)
  const headsPts = TALK.map((_, i) => Wg(tops[i].clone()));
  const kneeOf = (i) => Wg(tPts[i].clone().setY(KNEE));
  const SIDE = [
    () => [...consPts, ...facePts, ...askPts, hornPts[0], ...breakPts, ...headsPts, kneeOf(2)],
    () => [...headsPts, kneeOf(2), ...rbPts, ...earPts, ...cardPts, consPts[1]],
    () => [...consPts, ...backPts, ...phonePts, ...headsPts, ...askedPts()],
    () => [...backPts, ...phonePts, ...askedPts(), ...headsPts],
    // (the end: the list and the answer large enough to be read, and the whole loudspeaker, seen from higher so it
    // stands clear above the list instead of behind it)
    () => [...backPts, ...phonePts, facePts[0], facePts[2], ...hornPts, ...bubbleBox(conAt(ROLE[S.lever === 'b' ? 'a' : 'b']), con.w, con.h), ...headsPts, kneeOf(2)],
  ];
  const SIDE_EL = [0.2, 0.26, 0.26, 0.26, 0.3];
  // fitAnchors aims at the centre of the anchors' bounding box; this set is deep (the people near, the loudspeaker far),
  // so its near side projects larger and the picture sat off-centre with a band of the frame unused.  aim() finds the
  // point whose projection centres the set (for the free rect ui.js lays out) and adds anchors that put the bounding
  // box's centre there without limiting the fit: two on the line of sight, one before and one beyond the set, and, for
  // an axis the line of sight hardly moves along (here world z, the frame's width), a pair far beyond, out to each side.
  const TANF = Math.tan((32 * Math.PI) / 360);   // engine.js FOV
  const _ac = new THREE.PerspectiveCamera(32, 1, 0.5, 4000), _av = new V3();
  const AXES = ['x', 'y', 'z'];
  function aim(pts, az, el, margin = 0.075) {
    if (typeof innerWidth !== 'number' || pts.length < 2) return pts;
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
    for (const p of pts) for (const a of AXES) { const f = Math.abs(dir[a]); if (f > 0.15) v = Math.max(v, Math.abs(p[a] - T[a]) / f); }
    v = Math.min(v, d * 0.7);
    // before the set on the line of sight, and far beyond it: the box's centre C lies on that line, d behind T
    const near = T.clone().addScaledVector(dir, v), far = T.clone().addScaledVector(dir, -(v + 2 * d));
    const C = near.clone().add(far).multiplyScalar(0.5);
    const out = [...pts, near, far];
    for (const a of AXES) {
      // an axis the two do not span widely enough (the line of sight hardly moves along it): a pair far beyond the set,
      // out to each side of C on that axis, so the box is centred on C there too (so far off they project well inside)
      let z = Math.abs(near[a] - C[a]);
      for (const p of pts) z = Math.max(z, Math.abs(p[a] - C[a]));
      if (z <= Math.abs(near[a] - C[a]) + 1e-6) continue;
      for (const sgn of [-1, 1]) { const q = far.clone(); q[a] = C[a] + sgn * z; out.push(q); }
    }
    return out;
  }
  const shot = (phi, el, pts, margin) => ({ az: AZ0 + phi, el, anchors: () => aim(pts(), AZ0 + phi, el), margin });
  // a phone held sideways: the frame is short and wide, so the set's depth hardly moves the picture off-centre — and
  // aim()'s extra points, laid out for a tall frame, cost the picture half its size there: plain anchors
  const flatShot = (phi, el, pts, margin) => ({ az: AZ0 + phi, el, anchors: pts, margin });
  // a phone held sideways (the phone layout under 560 px tall) has a short, wide frame: seen lower, the stack is flatter
  const land = () => typeof innerWidth === 'number' && innerWidth > innerHeight && innerHeight < 560;
  const turns = (portrait, sideways) => ({
    get az() { return (land() ? sideways : portrait).az; },
    get el() { return (land() ? sideways : portrait).el; },
    anchors: () => (land() ? sideways : portrait).anchors(),
    margin: undefined,
  });
  const EL = [0.3, 0.36, 0.34, 0.34, 0.44], DAZ = [0, 0, 0, 0, 0];
  const shots = {
    phone: SH.map((pp, i) => turns(shot(PHI + DAZ[i], EL[i], pp), flatShot(PHI + DAZ[i], SIDE_EL[i], SIDE[i]))),
    // the desktop frame is wide: each beat's shot keeps the people on the bluff in view as well
    // (plain anchors: aim()'s extra points, laid out for a tall frame, set the height of a wide one)
    desk: [
      flatShot(PHI - 0.05, 0.3, SH[0]),
      flatShot(PHI - 0.05, 0.4, SH[1]),
      flatShot(PHI - 0.05, 0.4, () => [...SH[2](), ...facePts]),
      flatShot(PHI - 0.05, 0.4, () => [...SH[3](), ...facePts]),
      flatShot(PHI - 0.05, 0.38, SH[4]),
    ],
  };

  const lever = { fromBeat: 1, options: ['a', 'b'], def: 'a' };
  const REST = ['card', 'consumer', 'talkers', 'con', 'head', 'horn'];
  const rest = () => pose(LAST, 1, lever.def);
  const ambient = () => { /* nothing moves at rest: the held result stays still */ };

  const mouthW = () => headW(...MOUTH_H);
  const api = {
    id: 'oracle',
    group: g,
    zone: 'ai',
    // the map pill: low beside the bust on the sea side, clear of the map's head sign that life.js stands on the bust
    // (its face, ear and mouth, where the flows' bubbles go in and the card comes out) at the map's and the AI zone's
    // framing; the pin stays on the crown (the footprint ring is centred there)
    anchor: new V3(Math.cos((334 * Math.PI) / 180) * 86, 2, Math.sin((334 * Math.PI) / 180) * 86),
    pin: restHead(0.05, 1.0, 0),
    focus: { pos: Wg(VP(18, 0, 8)), r: 34 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    decalUnit,
    decalSize,
    lever,
    restParts: REST,
    mainActor: 'consumer',
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // read by life.js (flows 2 and 3 end and start here)
    ear: restHead(...EAR_H),
    mouth: restHead(...MOUTH_H),
    cardWorld: Wg(CA.clone().add(new V3(0, CARD.h / 2, 0))),
    // the shopper's phone where they stand at rest (back at the jetty's shore end, among the people): flow 3 lands there
    phoneWorld: Wg(CB.clone().setY(deckY + CONS_H * 0.62)),
    talkersWorld: tops.map((p) => Wg(p)),
    // where the bust stands in the water (life.js stands the map's head sign there)
    bustBase: Wg(new V3(HP.x, SEA_Y, HP.z)),
    _dbg: { mouthW, hg, consumer: consumer.group, people: people.map((p) => p.group), card: card.group, S },
  };
  rest();
  emphasize(null);
  return api;
}
