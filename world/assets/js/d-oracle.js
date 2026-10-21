// AI 怎麼挑牌子 · how AI picks a brand (articles 9, 19, 13) — in the AI zone, TH 330°.
// The book's case acted out, one physical act per beat (the picture first, the caption names it):
//  1 a shopper on a short pier raises a phone; the question 「耳機哪個牌子好？」 flies out of it to the AI (David's
//    head standing in the typed sea), which turns from the sea to the asker;
//  2 the brand A shouts 「A 牌最好！」 from its megaphone: the shout hits the face, breaks and sinks.  The head turns its
//    ear to six people talking on the shore instead: their words pour into the ear, and the ear lights;
//  3 three of them say something concrete (when they use it, what it solved, who it suits): each bubble flies into
//    the ear and comes out of the mouth as a row of the 推薦名單, the same words beside the brand;
//  4 the list goes into the shopper's phone; the shopper turns away from the AI, walks back along the pier to the people,
//    and the list pops up above the phone; they ask the one who named B 「B 牌缺點？」, get an honest answer, tick B;
//  5 A's megaphone swells and blasts again, louder: every wave breaks on the face and sinks, and A's board fades to a
//    dashed outline — nobody spoke for it, so it is not on the list.
// Lever (換你試試, from beat 2): a = 廣告加碼 (the story as played); b = 讓用過的人說: the megaphone stays silent, the one
// who named D talks about A concretely instead, A takes D's row, the shopper checks A, and A's board stays.
//
// Staging: the phone camera stands behind the people on the shore and looks out to sea, so a portrait frame reads,
// bottom to top, 消費者 → AI → 品牌: the talkers in front, the shopper on the pier, the head, A's board beyond.
// Everything that explains is a pure function of (beat, k, lever): pose().  The words live in world.json.
// life.js (the map's flows) reads ear, mouth, phoneWorld, talkersWorld, bustBase, pin and _dbg { hg, consumer, people }.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp } from './kit.js';
import { heightAt, SEA_Y } from './terrain.js';
import { makePerson, blendPoses } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), ZAX = new V3(0, 0, 1);
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

// ------------------------------------------------------------------ the set
const H = 18;                 // the bust (its chest under water): the largest figure, yet a person of 4.8 reads beside it on a phone
const CONS_H = 5.0;           // the shopper: the decisive person
const TALK_H = 3.9;           // the six who talk (secondary people)
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
// asked (and at rest); a little further while it listens, so its ear turns to the talkers
const FACE_REST = 0.55, FACE_AWAY = 1.75, FACE_LISTEN = 0.95;
const HEAD_LIFT = 4.6;          // the bust stands this much higher than half-sunk: the chin clears the water
const PIER = { u0: -0.6, u1: 7.2, v: 0.5, w: 2.2 };
const CONS_AT = { u: 5.8, v: 0.5 };
const CONS_BACK = { u: 1.1, v: 0.5 };          // beat 4: back along the pier to its shore end, beside the people
const ASK_AT = { u: 10, v: 2.9, y: 9.6 };   // where the question waits, right of the face
// the six talkers on the bluff (left foreground): two rows of three
const TALK = [[-6.8, -7.4], [-4.7, -6.6], [-6.1, -5.8], [-3.9, -5.0], [-5.4, -4.2], [-3.2, -3.4]];
// whose concrete words become the rows B, C, D; lever b: the one who named D talks about A instead
const SPK = [5, 1, 3];
const ROWS_A = ['b', 'c', 'd'], ROWS_B = ['b', 'c', 'a'];
// the 推薦名單 (typed, AI-made): out of the mouth, it hangs beside the face where the question waited (beat 3); then it
// goes into the shopper's phone and, back among the people, pops out above it: the phone's screen shown large (beat 4 on)
const CARD = { w: 5.4, h: 3.9 };
const CARD_AT = { u: 11, v: 3.2, y: 6.9 };
const CARD_PH = { du: -0.3, dv: 1.9, y: 5.9 };   // its bottom edge, from the shopper's place at the shore end (CONS_BACK)
// the review bubbles (beat 3): big enough for eight characters at a readable size on a phone
const RB = { w: 5.6, h: 1.75 };
const RB_RISE = [2.0, 3.0, 2.0];   // how high over each speaker's head (the back row's speaker higher)
const NS = 12;                     // beat 2's stream: two bubbles from each talker
const NW = 4;                      // waves per blast in beat 5 (beat 2: one)

const BEATS = [
  // 1 很多人買東西前先問 AI「哪個牌子好」 — the phone goes up; the question flies to the face; the head turns to them
  { dur: 3.4, keyAt: 1.35, shot: 0, parts: ['consumer', 'ask', 'head'] },
  // 2 讀的不是你怎麼說自己，而是網友怎麼說你 — A's shout breaks on the face and sinks; the ear turns to the talkers and
  // their words pour in; the ear lights
  { dur: 4.2, keyAt: 1.8, shot: 1, parts: ['talkers', 'head', 'board-a', 'horn'] },
  // 3 它讀的是細節 … 再排成推薦名單 — the list comes out of the mouth; three concrete reviews, one by one, fly into the
  // ear and come out as its rows
  { dur: 5.4, keyAt: 2.4, shot: 2, parts: ['talkers', 'card', 'head'] },
  // 4 上了名單還不夠 … 看真人怎麼說 — the list goes into the phone; the shopper walks back to the people, the list pops
  // up above the phone, they ask the one who named B about its weakness, get an honest answer, and tick B
  { dur: 5.2, keyAt: 2.65, shot: 3, parts: ['consumer', 'card', 'talkers', 'con'] },
  // 5 廣告打得再響 … 等於隱形 — the megaphone swells and blasts; every wave breaks and sinks; A fades to a dashed outline
  { dur: 4.6, keyAt: 2.3, shot: 4, parts: ['horn', 'board-a', 'head', 'card', 'consumer', 'con'] },
];
const LAST = BEATS.length - 1;
// beat-local times (seconds)
const T1 = { raise: 0.45, out: 0.35, at: 1.3, turn0: 0.6, turn1: 1.55, lower0: 2.2, lower1: 2.9 };
const T2 = { absorb: 0.4, swell: 0.15, wave0: 0.3, wave1: 1.05, earTurn0: 0.95, earTurn1: 1.55, talk: 1.0, stream0: 1.2, gap: 0.085, fly: 1.0, earOn: 1.6, chatOff0: 3.2, chatOff1: 3.7 };
const T3 = { card0: 0.0, card1: 0.6, pop: 0.3, step: 1.15, hold: 1.0, fly: 0.6 };
const T4 = { in1: 0.7, turn0: 0.45, walk0: 0.8, walk1: 1.75, stop1: 2.1, pop0: 1.95, pop1: 2.3, ask0: 2.35, ask1: 2.9, ans0: 3.3, ans1: 3.6, askOff: 3.35, tick0: 3.9, tick1: 4.2 };
const T5 = { swell0: 0.0, swell1: 0.4, wave0: 0.35, gap: 0.28, fly: 0.8, fade0: 2.1, fade1: 2.9, calm0: 2.5, calm1: 3.0 };

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
  const pulseU = { value: 0 };
  // the shards' own clock: it runs only while a district has focus, so on the map (where the three flows are the only
  // things that move) the head and its shards stand still; it starts at the world clock's first value (engine.js
  // REST_T), so ?still frames are unchanged
  const shardT = { value: 61 };
  const headMat = ink({
    uniforms: { uShardT: shardT },
    side: THREE.DoubleSide,
    hooks: {
      key: 'oracle-head',
      fHead: `
        float bn(vec3 p){ return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      `,
      fOut: `
        // vLPos is in bust units (height 1, +x = face). The back of the head dissolves in cube-sized steps.
        float n = bn(vLPos * 34.0);
        float edge = -0.03 - 0.26 * n + 0.03 * sin(uShardT * 0.35 + n * 6.0);
        if (vLPos.y > 0.47 && vLPos.x < edge) discard;
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

  // ---- shards: cubes leaving the back of the head, typeset and teal.  Their drift is material motion (the vertex
  // shader, on the district's clock), the listening pulse a uniform the pose sets.
  const SHARD_HOOKS = {
    key: 'oracle-shards',
    vHead: 'attribute vec4 aDrift; attribute float aAmp;',
    vPos: `{
      float kk = 0.5 + 0.5 * sin(uShardT * 0.157 + aDrift.w * 6.2831853);
      float a = aAmp * (0.18 * kk + 0.6 * uPulse);
      transformed = transformed * (1.0 - 0.3 * kk) + aDrift.xyz * a;
    }`,
  };
  const pts = shards.pts;
  const cube = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  const nShard = pts.length;
  const drift = new Float32Array(nShard * 4), amp = new Float32Array(nShard);
  const shardMesh = new THREE.InstancedMesh(cube, ink({ style: 1, accent: 'teal', shade: 0.85, hooks: SHARD_HOOKS, uniforms: { uPulse: pulseU, uShardT: shardT } }), nShard);
  shardMesh.name = 'shards';
  {
    const m = new M4(), q = new Q();
    pts.forEach(([x, y, z], i) => {
      const sc = 0.6 + R() * 0.7;
      const d = new V3(-(0.6 + R() * 0.8), (R() - 0.35) * 0.7, (R() - 0.5) * 1.1);
      drift.set([d.x / sc, d.y / sc, d.z / sc, R()], i * 4);
      amp[i] = 2 + R() * 11 * Math.min(1, -x * 3);
      q.setFromAxisAngle(new V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), R() * 3);
      shardMesh.setMatrixAt(i, m.compose(new V3(x * H, y * H, z * H), q, new V3(sc, sc, sc)));
      // a third of them teal: a cloud of all-teal cubes drowned the face beside it
      setInst(shardMesh, i, 0.7 + R() * 0.4, R() < 0.55 ? 1 : 0, R() < 0.32 ? ACCENT.teal : 0);
    });
  }
  cube.setAttribute('aDrift', new THREE.InstancedBufferAttribute(drift, 4));
  cube.setAttribute('aAmp', new THREE.InstancedBufferAttribute(amp, 1));
  shardMesh.castShadow = false;
  shardMesh.frustumCulled = false;
  hg.add(shardMesh);
  layer('head', shardMesh);

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

  // the ear's teal rim (beat 2 on): a typed oval on the ear's surface — it lights as the people's words go in
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

  // =================================================================== the pier and the shopper
  const p0 = VP(PIER.u0, PIER.v), p1 = VP(PIER.u1, PIER.v);
  const pierLen = p0.distanceTo(p1);
  const deckY = Math.max(gy(p0.x, p0.z), gy(VP(PIER.u0 + 1.2, PIER.v).x, VP(PIER.u0 + 1.2, PIER.v).z)) + 0.1;
  const pier = (() => {
    const parts = [];
    const box = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(flat(b)); };
    box(pierLen, 0.18, PIER.w, pierLen / 2, -0.09, 0);
    for (const zz of [-1, 1]) box(pierLen, 0.2, 0.18, pierLen / 2, -0.27, zz * (PIER.w / 2 - 0.2));
    const depth = deckY - SEA_Y + 4;
    for (const x of [1.6, pierLen / 2 + 0.8, pierLen - 0.3]) for (const zz of [-1, 1]) {
      const top = x > pierLen - 1 ? 0.5 : -0.1;
      const c = new THREE.CylinderGeometry(0.14, 0.16, depth + top, 8); c.translate(x, (top - depth) / 2, zz * (PIER.w / 2 - 0.06)); parts.push(flat(c));
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
  // drawn darker than the others: the asker must stand out against the typed sea behind them
  consumer.material.userData.u.uShadeBias.value = -0.1;
  consumer.material.userData.u.uShadeMul.value = 0.9;
  const phone = P.makePhone({ h: 1.15 });
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
    return { group: grp, face, mat: face.material, rimMat, tipLocal: face.tipLocal };
  };

  // =================================================================== the question (beat 1)
  const ask = bubble('ask', 5.4, 2.0, 'left');
  ask.group.visible = false;
  g.add(ask.group);
  layer('ask', ask.group);
  const askHit = P.makeHitProxy(ask.group, 0.3);

  // =================================================================== the talkers on the shore
  const talkers = new THREE.Group();
  talkers.name = 'talkers';
  g.add(talkers);
  layer('talkers', talkers);
  const tPts = TALK.map(([u, v]) => VP(u, v));
  let tLo = Infinity, tHi = -Infinity;
  for (const p of tPts) for (const dx of [-1.6, 0, 1.6]) for (const dz of [-1.6, 0, 1.6]) { const y = gy(p.x + dx, p.z + dz); tLo = Math.min(tLo, y); tHi = Math.max(tHi, y); }
  const TY = tHi + 0.08;
  const people = TALK.map(([u, v], i) => {
    const p = makePerson({ height: TALK_H, seated: true });
    const at = tPts[i];
    p.group.position.set(at.x, TY, at.z);
    // facing the head, each turned a little toward a neighbour (they talk), so some profiles show
    const toH = new V3(HP.x - at.x, 0, HP.z - at.z);
    p.group.rotation.y = Math.atan2(toH.x, toH.z) + [0.35, -0.3, 0.2, -0.25, 0.4, -0.35][i];
    p.material.userData.u.uShadeBias.value = 0.34;
    const st = P.makeStool({ h: p.seatH, r: 0.36 });
    st.group.position.copy(p.group.position);
    st.group.rotation.y = p.group.rotation.y;
    talkers.add(st.group, p.group);
    p.setPose('sit', 1, { from: 'sit' });
    return p;
  });
  const terrace = P.makeDais({ w: 2, d: 2, h: 1 });
  {
    // one level stone terrace under all six stools (a rectangle in view coordinates)
    const us = TALK.map(([u]) => u), vs = TALK.map(([, v]) => v);
    const u0 = Math.min(...us) - 1.5, u1 = Math.max(...us) + 1.3, v0 = Math.min(...vs) - 1.4, v1 = Math.max(...vs) + 1.4;
    const c = VP((u0 + u1) / 2, (v0 + v1) / 2);
    terrace.group.scale.set((v1 - v0) / 2, TY - tLo + 0.6, (u1 - u0) / 2);
    terrace.group.position.set(c.x, tLo - 0.6, c.z);
    terrace.group.rotation.y = Math.atan2(cP, sP);
  }
  g.add(terrace.group);
  layer('scenery', terrace.group);
  g.updateMatrixWorld(true);
  const tops = people.map((p) => { p.group.updateMatrixWorld(true); return g.worldToLocal(p.top()); });
  // whom the shopper faces when turning to the people: the one who named B (lever b: the one who named A)
  const yawFrom = (from, i) => { const d = new V3(tPts[i].x - from.x, 0, tPts[i].z - from.z); return Math.atan2(d.x, d.z); };

  // ---- beat 2: everyone talks.  A small bubble over each (typed strokes: words not yet read), and a stream of copies
  // arcing into the ear
  const CHAT_AT = tops.map((p, i) => p.clone().add(new V3(0, i % 2 ? 1.9 : 1.0, 0)));
  const chats = people.map((_, i) => {
    const b = bubble(`said${i}`, 1.9, 0.95, i % 2 ? 'right' : 'left', { strokes: true, t: 0.18 });
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

  // ---- beat 3: the concrete reviews, one per speaker (lever b: the third speaker's is about A)
  const RB_AT = SPK.map((ti, r) => tops[ti].clone().add(new V3(0, RB_RISE[r], 0)).addScaledVector(RIGHT, [-0.4, 0.2, 0.0][r]));
  const reviews = { b: 0, c: 1, d: 2, a: 2 };
  const rbs = {};
  for (const [id, r] of Object.entries(reviews)) {
    const b = bubble(`talk-${id}`, RB.w, RB.h, r === 1 ? 'right' : 'left');
    b.group.visible = false;
    talkers.add(b.group);
    rbs[id] = { ...b, r, ti: SPK[r], at: RB_AT[r] };
  }
  const talkHit = P.makeHitProxy(talkers, 0.3);

  // ---- beat 4: the shopper's question to the one who named B (or A), and the honest answer
  const ask2 = bubble('ask2', 4.2, 1.6, 'right');
  ask2.group.visible = false;
  g.add(ask2.group);
  layer('consumer', ask2.group);
  const con = bubble('con', 5.0, 1.65, 'left');
  con.group.visible = false;
  g.add(con.group);
  layer('con', con.group);
  const conHit = P.makeHitProxy(con.group, 0.3);
  /** where the honest answer hangs: over its speaker, a little toward the shopper */
  const conAt = (ti) => tops[ti].clone().add(new V3(0, 2.1, 0)).addScaledVector(RIGHT, -1.4);

  // =================================================================== A's board on the brand shore, its megaphone
  const boardA = new THREE.Group(); boardA.name = 'board-a';
  g.add(boardA);
  layer('board-a', boardA);
  const BOARD = { w: 3.6, h: 2.3, t: 0.28 };
  const A_AT = { u: 31, v: 2.5, post: 10 };
  const bA = (() => {
    const at = VP(A_AT.u, A_AT.v);
    const y0 = gy(at.x, at.z) - 0.2;
    const grp = new THREE.Group(); grp.name = 'board-a-sign';
    grp.position.set(at.x, y0, at.z);
    grp.rotation.y = camYaw;
    const mat = ink({ shade: 1, bias: 0.16, focus: false });
    const pH = A_AT.post;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, pH + 0.6, 8).translate(0, (pH + 0.6) / 2, -0.05), mat);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, BOARD.h, BOARD.t).translate(0, pH + BOARD.h / 2, 0.12), mat);
    for (const m of [post, slab]) { m.castShadow = m.receiveShadow = true; grp.add(m); }
    boardA.add(grp);
    // a broken outline of the same board: what is left of A once nobody talks about it
    const parts = [];
    const bar = (w, h, x, y) => { const b = new THREE.BoxGeometry(w, h, 0.06); b.translate(x, y, 0.3); parts.push(flat(b)); };
    const x0 = -BOARD.w / 2, nX = 6, nY = 4, th = 0.1;
    for (let i = 0; i < nX; i++) { const x = x0 + ((i + 0.5) / nX) * BOARD.w; bar(BOARD.w / nX * 0.55, th, x, pH); bar(BOARD.w / nX * 0.55, th, x, pH + BOARD.h); }
    for (let i = 0; i < nY; i++) { const y = pH + ((i + 0.5) / nY) * BOARD.h; bar(th, BOARD.h / nY * 0.55, x0, y); bar(th, BOARD.h / nY * 0.55, -x0, y); }
    for (let i = 0; i < 9; i++) bar(th * 1.4, pH / 9 * 0.5, 0, ((i + 0.5) / 9) * pH);
    const dashes = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink', focus: false }));
    dashes.name = 'a-outline'; dashes.castShadow = false; dashes.visible = false;
    grp.add(dashes);
    return { grp, mat, slab, post, dashes, pH, centre: () => { grp.updateWorldMatrix(true, false); return grp.localToWorld(new V3(0, pH + BOARD.h / 2, 0.3)); } };
  })();
  // the megaphone: a flared cone (its inside dark), a rim at the bell, a short throat and a box driver
  const horn = new THREE.Group(); horn.name = 'horn';
  const hornMat = ink({ shade: 0.85, bias: 0.05, side: THREE.DoubleSide, focus: false });
  const HORN_L = 3.2;
  {
    const coneM = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.28, HORN_L, 24, 1, true).rotateZ(-Math.PI / 2).translate(HORN_L / 2, 0, 0), hornMat);
    const inside = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.24, HORN_L * 0.96, 24, 1, true).rotateZ(-Math.PI / 2).translate(HORN_L / 2 + 0.05, 0, 0), ink({ shade: 0.25, side: THREE.BackSide, focus: false }));
    const rimM = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.09, 6, 28).rotateY(Math.PI / 2).translate(HORN_L, 0, 0), hornMat);
    const driver = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.7, 14).rotateZ(-Math.PI / 2).translate(-0.3, 0, 0), hornMat);
    for (const m of [coneM, inside, rimM, driver]) { m.castShadow = true; horn.add(m); }
  }
  boardA.add(horn);
  // the horn sits off the board's top left corner on a short bracket, its bell clear of the board
  const A_CORNER = bA.grp.position.clone().addScaledVector(RIGHT, -BOARD.w / 2 + 0.15).setY(bA.grp.position.y + bA.pH + BOARD.h - 0.1);
  const HORN_AT = A_CORNER.clone().addScaledVector(RIGHT, -0.55).add(new V3(0, 0.75, 0));
  {
    const d = HORN_AT.clone().sub(A_CORNER), L = d.length();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, L, 8), hornMat);
    rod.position.copy(A_CORNER).addScaledVector(d, 0.5);
    rod.quaternion.setFromUnitVectors(YAX, d.normalize());
    rod.name = 'horn-bracket'; rod.castShadow = true;
    boardA.add(rod);
  }
  // where its waves break: in front of the forehead (the head is at its rest turn while the set is built), above the list
  // the shopper holds up later — the shout hits the face and does not get in
  const BREAK = onHead(0.47, 0.9, -0.02);
  // the horn points across the picture at the face, in the picture's plane (only a little toward the reader): seen from
  // the side it reads as a megaphone; seen down its axis it was a ball on a post
  const HORN_Q = (() => {
    const d = BREAK.clone().sub(HORN_AT);
    const du = d.dot(FWD), dv = d.dot(RIGHT);
    // never steeper than about 50° below the horizontal: pointing straight down it read as a lamp
    const side = Math.sign(dv || -1) * Math.max(Math.abs(dv), 0.85 * Math.abs(d.y));
    const dir = FWD.clone().multiplyScalar(du * 0.12).addScaledVector(RIGHT, side).setY(d.y).normalize();
    return new Q().setFromUnitVectors(new V3(1, 0, 0), dir);
  })();
  horn.position.copy(HORN_AT);
  horn.quaternion.copy(HORN_Q);
  const hornHit = P.makeHitProxy(horn, 0.4);
  // A: its board and the top of its pole (the horn above it is a part of its own)
  const boardAHit = boxProxy(bA.grp, new V3(0, (bA.pH * 0.55 + bA.pH + BOARD.h) / 2, 0.1), new V3(BOARD.w + 0.6, bA.pH * 0.45 + BOARD.h + 0.6, 1.2), 'board-a');

  // the waves: open arcs leaving the horn, breaking on the face — each an arc facing the reader, its bulge toward the
  // face (in the picture's plane): a drawn 「)))」, in solid ink
  const HORN_MOUTH0 = HORN_AT.clone().add(new V3(HORN_L, 0, 0).applyQuaternion(HORN_Q));
  const WAVE_TH = (() => { const d = BREAK.clone().sub(HORN_MOUTH0); return Math.atan2(d.y, d.dot(RIGHT)); })();
  // two arcs, one inside the other: a shout's 「))」
  const waveGeo = mergeGeometries([flat(new THREE.TorusGeometry(1, 0.075, 5, 28, Math.PI * 0.8)), flat(new THREE.TorusGeometry(0.7, 0.07, 5, 24, Math.PI * 0.8).rotateZ(Math.PI * 0.08))]).rotateZ(WAVE_TH - Math.PI * 0.4);
  const WAVE_MID = HORN_MOUTH0.clone().lerp(BREAK, 0.5).add(new V3(0, 1.2, 0));
  const waveMat = ink({ accent: 'ink', focus: false });
  const waves = Array.from({ length: NW }, (_, i) => {
    const m = new THREE.Mesh(waveGeo, waveMat);
    m.name = `wave${i}`; m.castShadow = false; m.visible = false;
    boardA.add(m);
    return m;
  });
  // the broken shout: at the face each wave cracks into pieces of its arc, which drop into the sea and sink
  const NF = 3;
  const fragGeo = new THREE.TorusGeometry(1, 0.07, 5, 8, Math.PI * 0.8 / NF).translate(-Math.cos(Math.PI * 0.4 / NF), -Math.sin(Math.PI * 0.4 / NF), 0);
  const frags = new THREE.InstancedMesh(fragGeo, waveMat, NW * NF);
  frags.name = 'shatter'; frags.frustumCulled = false; frags.castShadow = false;
  boardA.add(frags);
  const FR = Array.from({ length: NW * NF }, (_, i) => ({ w: Math.floor(i / NF), k: i % NF, spin: (R() - 0.5) * 6, out: 0.4 + R() * 0.9, d: R() * 0.08 }));
  const WR0 = 1.0, WR = 2.2;   // a wave's radius leaving the bell and reaching the face

  // =================================================================== the 推薦名單 (typed, AI-made), its tick
  const card = P.makeResultCard({ w: CARD.w, h: CARD.h, rows: 4, lean: 0, t: 0.1 });
  card.group.name = 'card';
  const CA = VP(CARD_AT.u, CARD_AT.v, CARD_AT.y);
  card.group.visible = false;
  g.add(card.group);
  layer('card', card.group);
  const cardHit = P.makeHitProxy(card.group, 0.3);
  const ins = 0.05 * Math.min(CARD.w, CARD.h);
  const rowZ = (i) => { const z0 = -CARD.h / 2 + 2 * ins, z1 = CARD.h / 2 - 2 * ins; return z0 + ((i + 0.5) / 4) * (z1 - z0); };
  // the tick: a lime check left of the checked row, outside the card (people tick; it is not the AI's)
  const tick = (() => {
    const grp = new THREE.Group(); grp.name = 'tick';
    const mat = ink({ shade: 0.5, accent: 'lime', focus: false });
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.14).translate(0.31, 0, 0), mat);
    // (built at unit size, drawn 1.7 times larger: see tick.group.scale)
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
  // the AI writing a row: a typed slip out of the mouth onto the list, one per review read (beat 3)
  const SLIP = 0.45;   // its flight (s)
  const slipMat = ink({ style: 1, shade: 0.7, accent: 'teal', focus: false });
  const slips = [0, 1, 2].map((r) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(CARD.w * 0.62, 0.42, 0.08), slipMat);
    m.name = `slip${r}`; m.castShadow = false; m.visible = false;
    g.add(m);
    return m;
  });
  layer('card', ...slips);
  // where each slip lands: its row on the list hanging beside the face (from the card's rest place, fixed points)
  const ROW_AT = [1, 2, 3].map((i) => {
    card.group.position.copy(CA); card.group.quaternion.copy(qCam); card.group.scale.set(1, 1, 1);
    card.group.updateMatrixWorld(true);
    return g.worldToLocal(card.mesh.localToWorld(new V3(-CARD.w * 0.12, 0.12, rowZ(i))));
  });
  // a teal hairline from the phone to the card, once the card is the phone's screen shown large
  const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6).translate(0, 0.5, 0), ink({ shade: 0.5, accent: 'teal', focus: false }));
  tether.name = 'tether'; tether.castShadow = false; tether.visible = false;
  g.add(tether);
  layer('card', tether);

  // =================================================================== pose
  // what pose() decided and emphasize() / the anchors need
  const S = {
    beat: LAST, t: BEATS[LAST].dur, lever: 'a', emph: null,
    ask: 0, rows: 3, card: 'mouth', rb: {}, rbLime: null, ask2: 0, con: 0, ticked: false,
    waveLead: -1, aFade: 0, shout: false, chat: 0,
  };
  const _m = new M4(), _p = new V3(), _q = new Q(), _q2 = new Q(), _s = new V3(), _v = new V3();
  const phoneAt = () => { phone.group.updateWorldMatrix(true, false); return g.worldToLocal(phone.group.localToWorld(new V3(0, 0.6, 0.1))); };
  const CB = VP(CONS_BACK.u, CONS_BACK.v);
  const CPH = VP(CONS_BACK.u + CARD_PH.du, CONS_BACK.v + CARD_PH.dv, deckY + CARD_PH.y);
  const WALK_L = CP.distanceTo(CB), WALK_YAW = Math.atan2(CB.x - CP.x, CB.z - CP.z);
  const STRIDE = 0.36 * CONS_H;
  const P_HOLD = consumer.pose('hold');
  const rowsOf = (L) => (L === 'b' ? ROWS_B : ROWS_A);
  /** a quadratic arc a → c → b at u */
  const arc = (a, c, b, u, out) => out.set(0, 0, 0).addScaledVector(a, (1 - u) * (1 - u)).addScaledVector(c, 2 * (1 - u) * u).addScaledVector(b, u * u);

  function pose(beat, k = 1, lever = 'a') {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const L = lever === 'b' ? 'b' : 'a';
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i: 1 once past, 0 before */
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : clamp((t - a) / (z - a)));
    const at = (i, x) => beat > i || (beat === i && t >= x);
    const rows = rowsOf(L);
    const spkOf = (id) => rbs[id].ti;
    const asked = L === 'b' ? 'a' : 'b';   // the brand the shopper checks with a real person

    // ---- the head: out to sea, then to the asker as the question reaches it (beat 1); its ear to the talkers as they
    // talk (beat 2); back to the asker to answer (beat 3 on).  The shards pulse once as the question lands.
    const turn = beat === 0 ? ss(t, T1.turn0, T1.turn1) : 1;
    const face = beat === 0 ? lerp(FACE_AWAY, FACE_REST, turn)
      : beat === 1 ? lerp(FACE_REST, FACE_LISTEN, ss(t, T2.earTurn0, T2.earTurn1))
        : beat === 2 ? lerp(FACE_LISTEN, FACE_REST, ss(t, 0, 0.5)) : FACE_REST;
    hg.rotation.set(0, yawFor(face), 0.06 * (1 - turn));
    hg.updateMatrixWorld(true);
    pulseU.value = beat === 0 ? bump(t, 1.3, 1.7, 2.8) : beat === 1 ? 0.3 * bump(t, 1.6, 2.0, 3.4) : 0;
    earRing.visible = at(1, T2.earOn);
    const ear = onHead(EAR_H[0] + 0.03, EAR_H[1], EAR_H[2] + 0.05);
    const mouth = onHead(...MOUTH_H);

    // ---- the shopper: phone raised to ask, then held at the chest; turns to the people (beat 4 on)
    // beat 4: turns from the AI, walks back along the pier to the people, and faces the one they ask
    const yawP = yawFrom(CB, spkOf(asked));
    const turnTo = (a, b, k) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; };
    if (beat < 3) {
      consumer.group.position.set(CP.x, deckY, CP.z);
      consumer.group.rotation.set(0, CONS_YAW, 0);
      if (beat === 0) {
        if (t < T1.lower0) consumer.setPose('raise', ss(t, 0, T1.raise), { from: 'stand' });
        else consumer.setPose('hold', ss(t, T1.lower0, T1.lower1), { from: 'raise' });
      } else consumer.setPose('hold', 1, { from: 'hold' });
    } else {
      const tt = beat === 3 ? t : 1e3;
      const w = ss(tt, T4.walk0, T4.walk1);
      const d = WALK_L * w;
      _p.copy(CP).lerp(CB, w);
      consumer.group.position.set(_p.x, deckY, _p.z);
      let yaw, v;
      if (tt < T4.walk0) { yaw = turnTo(CONS_YAW, WALK_YAW, ss(tt, T4.turn0, T4.walk0)); v = blendPoses(P_HOLD, consumer.pose('walk', { dist: 0, stride: STRIDE }), ss(tt, T4.turn0, T4.walk0)); }
      else if (tt < T4.walk1) { yaw = WALK_YAW; v = consumer.pose('walk', { dist: d, stride: STRIDE }); }
      else { const k2 = ss(tt, T4.walk1, T4.stop1); yaw = turnTo(WALK_YAW, yawP, k2); v = blendPoses(consumer.pose('walk', { dist: WALK_L, stride: STRIDE }), P_HOLD, k2); }
      consumer.group.rotation.set(0, yaw, 0);
      consumer.apply(v);
    }
    consumer.group.updateMatrixWorld(true);

    // ---- the question: out of the phone, up beside the face, where it waits until the AI takes it in (beat 2)
    {
      const a = Wn(0, T1.out, T1.out + 0.25), f = Wn(0, T1.out, T1.at), gone = Wn(1, 0, T2.absorb);
      const on = a > 0 && gone < 1;
      ask.group.visible = on;
      S.ask = on ? (gone > 0 ? 1 - gone : a) : 0;
      if (on) {
        const hold = VP(ASK_AT.u, ASK_AT.v, ASK_AT.y);
        const e = sm(f);
        if (gone > 0) _p.copy(hold).lerp(mouth, sm(gone));
        else if (beat === 0) { _p.copy(phoneAt()).lerp(hold, e); _p.y += Math.sin(Math.PI * e) * 1.6; }
        else _p.copy(hold);
        ask.group.position.copy(_p);
        ask.group.quaternion.copy(qCam);
        ask.group.scale.setScalar(Math.max(1e-3, (0.3 + 0.7 * eo(a)) * (1 - 0.85 * sm(gone))));
      }
    }

    // ---- the talkers: everyone talks in beat 2 (a hand up, a little out of step); in beat 3 each speaker lifts a hand
    // as their review pops; in beat 4 the one asked answers
    const rbT = (r) => T3.pop + r * T3.step;   // when review r pops (beat 3)
    people.forEach((p, i) => {
      let gesture = 0;
      if (beat === 1) gesture = bump(t, T2.talk + 0.04 * i, T2.talk + 0.35 + 0.04 * i, T2.chatOff1 + 0.3);
      else if (beat === 2) {
        const r = SPK.indexOf(i);
        if (r >= 0) gesture = bump(t, rbT(r) - 0.1, rbT(r) + 0.2, rbT(r) + T3.hold + 0.3);
      } else if (beat >= 3 && i === spkOf(asked)) gesture = beat === 3 ? bump(t, T4.ans0 - 0.2, T4.ans0 + 0.15, 5) : 0;
      p.setPose('lift', gesture, { from: 'sit', to: new V3(-0.3, 0.6 * TALK_H, 0.3 * TALK_H) });
    });
    // their small bubbles (beat 2)
    const chatK = beat === 1 ? Math.min(seg(t, T2.talk, T2.talk + 0.3), 1 - seg(t, T2.chatOff0, T2.chatOff1)) : 0;
    S.chat = chatK;
    chats.forEach((b, i) => {
      const kk = beat === 1 ? Math.min(pop(seg(t, T2.talk + 0.05 * i, T2.talk + 0.3 + 0.05 * i)), 1 - ss(t, T2.chatOff0, T2.chatOff1)) : 0;
      b.group.visible = kk > 0.001;
      b.group.position.copy(CHAT_AT[i]);
      b.group.scale.setScalar(Math.max(1e-3, kk));
    });
    // the stream: copies of their words arcing up and down into the ear, shrinking as they go in
    for (let i = 0; i < NS; i++) {
      const ti = i % 6, t0 = T2.stream0 + i * T2.gap;
      const u = beat === 1 ? (t - t0) / T2.fly : -1;
      if (u <= 0 || u >= 1) { stream.setMatrixAt(i, _m.compose(tops[ti], qCam, _s.setScalar(1e-4))); streamR.setMatrixAt(i, _m); continue; }
      const a = CHAT_AT[ti];
      const mid = a.clone().lerp(ear, 0.45); mid.y = Math.max(a.y, ear.y) + 3.5 + ((i * 7) % 5) * 0.6;
      const e = u * u * (3 - 2 * u) * 0.55 + u * 0.45;
      arc(a, mid, ear, e, _p);
      const sc = Math.min(1, u / 0.12) * (u > 0.62 ? Math.max(0.08, 1 - (u - 0.62) / 0.38) : 1);
      stream.setMatrixAt(i, _m.compose(_p, qCam, _s.setScalar(Math.max(1e-4, sc))));
      streamR.setMatrixAt(i, _m);
    }
    stream.instanceMatrix.needsUpdate = true; streamR.instanceMatrix.needsUpdate = true;
    stream.visible = streamR.visible = beat === 1;

    // ---- the reviews (beat 3): each pops over its speaker, holds, then flies into the ear, shrinking; its row comes
    // out on the list as it goes in
    S.rb = {}; S.rbLime = null;
    let nRows = beat > 2 ? 3 : 0;
    for (const [id, b] of Object.entries(rbs)) {
      const mine = rows.includes(id);
      const r = b.r, t0 = rbT(r), tf = t0 + T3.hold, te = tf + T3.fly;
      let vis = false, sc = 0, word = false;
      if (beat === 2 && mine && t >= t0 && t < te) {
        const up = pop(seg(t, t0, t0 + 0.3)), f = seg(t, tf, te);
        vis = true;
        const into = ear;
        const c = b.at.clone().lerp(into, 0.5); c.y = Math.max(b.at.y, into.y) + 2.5;
        if (f <= 0) _p.copy(b.at);
        else arc(b.at, c, into, sm(f), _p);
        sc = up * (1 - 0.88 * sm(f));
        word = up > 0.9 && f < 0.25;
        b.group.position.copy(_p);
        b.group.quaternion.copy(qCam);
        if (t < tf + 0.1) S.rbLime = id;
      }
      if (beat === 2 && mine && t >= te + SLIP) nRows = Math.max(nRows, r + 1);
      // out of the mouth to its row on the list
      if (mine) {
        const sl = slips[r], u = beat === 2 ? (t - te) / SLIP : -1;
        sl.visible = u > 0 && u < 1;
        if (sl.visible) {
          const to = ROW_AT[r];
          const c = mouth.clone().lerp(to, 0.5); c.y += 1.2;
          arc(mouth, c, to, sm(u), sl.position);
          sl.quaternion.copy(qCam);
          sl.scale.setScalar(0.35 + 0.65 * sm(u));
        }
      }
      b.group.visible = vis && sc > 0.01;
      b.group.scale.setScalar(Math.max(1e-3, sc));
      S.rb[id] = word;
    }
    S.rows = nRows;

    // ---- the list: out of the mouth (beat 3); onto the phone (beat 4 on)
    {
      const a = Wn(2, T3.card0, T3.card1);
      const inPh = Wn(3, 0, T4.in1), outPh = Wn(3, T4.pop0, T4.pop1);
      const on = a > 0 && !(inPh >= 1 && outPh <= 0);   // inside the phone while the shopper walks back
      card.group.visible = on;
      if (on) {
        if (inPh <= 0) {
          const e = sm(a);
          card.group.position.copy(mouth).lerp(CA, e);
          card.group.position.y += Math.sin(Math.PI * e) * 0.8 - CARD.h * 0.5 * (1 - e);
          card.group.scale.set(Math.max(1e-3, e), Math.max(1e-3, 0.25 + 0.75 * e), 1);
        } else if (inPh < 1) {
          // into the phone: down to the shopper's hand, shrinking to the size of its screen
          const e = sm(inPh);
          const ph = phoneAt();
          const c = CA.clone().lerp(ph, 0.5); c.y = Math.max(CA.y, ph.y) + 1.6;
          arc(CA, c, ph, e, _p);
          card.group.position.copy(_p);
          card.group.scale.setScalar(Math.max(1e-3, 1 - 0.92 * e));
        } else {
          // and, back among the people, out of it again above the phone: the phone's screen shown large
          const e = outPh;
          card.group.position.copy(phoneAt()).lerp(CPH, eo(e));
          card.group.scale.setScalar(Math.max(1e-3, 0.08 + 0.92 * pop(e)));
        }
        card.group.quaternion.copy(qCam);
      }
      S.card = outPh >= 1 ? 'phone' : inPh > 0 ? 'flying' : 'mouth';
      // the tether to the phone, once it is there
      const th = outPh >= 1;
      tether.visible = th;
      if (th) {
        card.group.updateMatrixWorld(true);
        const from = phoneAt();
        const to = g.worldToLocal(card.mesh.localToWorld(new V3(-CARD.w / 2 + 0.3, 0.05, CARD.h / 2 - 0.05)));
        const d = to.clone().sub(from);
        tether.position.copy(from);
        tether.quaternion.setFromUnitVectors(YAX, d.clone().normalize());
        tether.scale.set(1, Math.max(1e-3, d.length()), 1);
      }
    }

    // ---- the shopper asks a real person (beat 4): the question from the phone to the speaker; the honest answer
    {
      const spk = spkOf(asked);
      const a = Wn(3, T4.ask0, T4.ask0 + 0.25), f = Wn(3, T4.ask0, T4.ask1), off = Wn(3, T4.askOff, T4.askOff + 0.4);
      const on = beat === 3 && a > 0 && off < 1;
      ask2.group.visible = on;
      S.ask2 = on ? (off > 0 ? 0 : a) : 0;
      if (on) {
        const from = phoneAt().add(new V3(0, 1.2, 0));
        const to = tops[spk].clone().add(new V3(0, 1.6, 0)).addScaledVector(RIGHT, 2.9);
        const c = from.clone().lerp(to, 0.5); c.y = Math.max(from.y, to.y) + 2.2;
        arc(from, c, to, sm(f), _p);
        ask2.group.position.copy(_p);
        ask2.group.quaternion.copy(qCam);
        ask2.group.scale.setScalar(Math.max(1e-3, (0.35 + 0.65 * eo(a)) * (1 - sm(off))));
      }
      const ans = beat > 3 ? 1 : beat === 3 ? pop(seg(t, T4.ans0, T4.ans1)) : 0;
      con.group.visible = ans > 0.001;
      S.con = ans;
      con.group.position.copy(conAt(spk));
      con.group.quaternion.copy(qCam);
      con.group.scale.setScalar(Math.max(1e-3, ans));
      // the tick beside the checked row
      const tk = beat > 3 ? 1 : beat === 3 ? pop(seg(t, T4.tick0, T4.tick1)) : 0;
      S.ticked = tk > 0.5;
      tick.group.visible = tk > 0.001;
      const row = 1 + rows.indexOf(asked);
      tick.group.position.set(-CARD.w / 2 - 1.1, 0.16, rowZ(row) + 0.7);
      tick.group.rotation.set(-Math.PI / 2, 0, 0);
      tick.group.scale.setScalar(Math.max(1e-3, 1.7 * tk));
    }

    // ---- A's megaphone (lever a): one blast in beat 2, a louder one in beat 5 — every wave breaks on the face and
    // sinks; then A fades to a dashed outline
    const shout = L === 'a' && (beat === 1 || beat === LAST);
    const nW = beat === 1 ? 1 : NW;
    const w0 = beat === 1 ? T2.wave0 : T5.wave0, wGap = beat === 1 ? 0 : T5.gap, fl = beat === 1 ? T2.wave1 - T2.wave0 : T5.fly;
    const swell = !shout ? 0 : beat === 1 ? bump(t, 0, T2.swell, 1.2) * 0.5 : ss(t, T5.swell0, T5.swell1) * (1 - ss(t, T5.calm0, T5.calm1));
    const big = beat === LAST ? 1.25 : 1;      // the second blast is louder: bigger waves
    horn.scale.setScalar(1 + 0.45 * swell);
    horn.quaternion.copy(HORN_Q);
    const hornMouth = HORN_AT.clone().add(new V3(HORN_L * (1 + 0.45 * swell), 0, 0).applyQuaternion(HORN_Q));
    S.waveLead = -1; S.shout = false;
    waves.forEach((w, i) => {
      const u = shout && i < nW ? (t - (w0 + i * wGap)) / fl : -1;
      w.visible = u > 0 && u < 1;
      if (!w.visible) return;
      if (S.waveLead < 0) S.waveLead = i;
      S.shout = true;
      const e = u * (0.75 + 0.25 * u);
      arc(hornMouth, WAVE_MID, BREAK, e, _p);
      w.position.copy(_p);
      w.rotation.set(0, camYaw, 0);
      w.scale.setScalar((WR0 + (WR - WR0) * u) * big);
    });
    for (let i = 0; i < NW * NF; i++) {
      const f = FR[i];
      const u = shout && f.w < nW ? t - (w0 + f.w * wGap + fl + f.d) : -1;
      if (u < 0) { frags.setMatrixAt(i, _m.compose(BREAK, _q.identity(), _s.setScalar(1e-4))); continue; }
      // the piece starts where it was on its arc, springs out a little, falls in front of the face and sinks under
      const th = WAVE_TH - Math.PI * 0.4 + (f.k + 0.5) * (Math.PI * 0.8 / NF);
      const r = WR * big + f.out * u;
      _p.copy(BREAK).addScaledVector(RIGHT, Math.cos(th) * r + 0.9 * u);
      _p.y += Math.sin(th) * r + 1.2 * u - 6.5 * u * u;
      // it crumbles as it falls: gone a few units below the nose, before it can reach the shopper's part of the picture
      let sc = WR * big * Math.max(0, 1 - u / 0.55);
      if (_p.y < SEA_Y) { const sink = SEA_Y - _p.y; _p.y = SEA_Y - Math.min(sink, 1) * 0.5; sc *= Math.max(0, 1 - sink / 1.2); }
      _q.setFromAxisAngle(YAX, camYaw).multiply(_q2.setFromAxisAngle(ZAX, th - Math.PI * 0.4 / NF + f.spin * u));
      frags.setMatrixAt(i, _m.compose(_p, _q, _s.setScalar(Math.max(1e-4, sc))));
    }
    frags.instanceMatrix.needsUpdate = true;
    frags.visible = shout;
    S.aFade = L === 'a' ? Wn(LAST, T5.fade0, T5.fade1) : 0;
    bA.slab.visible = bA.post.visible = S.aFade < 0.55;
    bA.dashes.visible = S.aFade >= 0.45;

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
  const FULL = {
    consumer: ['consumer'], ask: ['ask'], head: ['head'], talkers: ['talkers'], card: ['card'], con: ['con'],
    'board-a': ['board-a'], horn: ['board-a'],
  };
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
    // accents: lime on the one thing the caption is about (one at a time), teal on what the AI makes or does
    lime(ask.mat, on('ask'));
    for (const [id, b] of Object.entries(rbs)) lime(b.mat, on('talkers') && S.rbLime === id);
    lime(con.mat, on('con') && !S.ticked);
    tick.mat.userData.u.uAccent.value = on('card') || on('con') ? ACCENT.lime : 0;
    lime(ask2.mat, false);
    for (const c of chats) lime(c.mat, false);
    card.material.userData.u.uAccent.value = 0;
    tether.material.userData.u.uAccent.value = on('card') ? ACCENT.teal : 0;
    earRing.material.userData.u.uAccent.value = on('head') ? ACCENT.teal : 0;
    bA.mat.userData.u.uAccent.value = 0;
    // A on its way out: down to its contour before the broken outline takes over
    if (S.aFade > 0 && bA.slab.visible) { const kk = Math.max(map || full.has('board-a') ? 0 : 1, sm(S.aFade / 0.5)); dim(bA.slab, kk); dim(bA.post, kk); }
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
  const restHead = (x, y, z) => {
    const save = hg.rotation.y, sz = hg.rotation.z;
    hg.rotation.set(0, YAW_REST, 0); hg.updateMatrixWorld(true);
    const p = hg.localToWorld(new V3(x * H, y * H, z * H));
    hg.rotation.set(0, save, sz); hg.updateMatrixWorld(true);
    return p;
  };
  const centreOf = (grp, x = 0, y = 0, z = 0.14) => { grp.updateWorldMatrix(true, false); return grp.localToWorld(new V3(x, y, z)); };
  const parts = {
    // the ring on the hips, so it does not cover the figure's chest and phone
    consumer: { hit: P.makeHitProxy(consumer.group, 0.35), anchor: () => consumer.joints.hips.localToWorld(new V3(0, -0.02 * CONS_H, 0.06 * CONS_H)), beat: 0 },
    ask: { hit: askHit, anchor: () => centreOf(ask.group, -1.9, 0.5, 0.2), beat: 0 },
    // the ring in the hair above the ear, off the face
    head: { hit: headHit, anchor: () => headW(-0.02, 0.84, 0.3), beat: 1 },
    // at the left-front talker's knees, clear of the words above them
    talkers: { hit: talkHit, anchor: () => { people[0].group.updateWorldMatrix(true, false); return people[0].group.localToWorld(new V3(0, people[0].seatH * 0.8, 0.25 * TALK_H)); }, beat: 1 },
    // just under the card's bottom edge (its rows cover the card)
    card: { hit: cardHit, anchor: () => { card.group.updateWorldMatrix(true, false); return card.mesh.localToWorld(new V3(CARD.w / 2 - 0.4, 0.1, CARD.h / 2 + 0.5)); }, beat: 2 },
    // the honest answer: the ring at its tail, clear of its words
    con: { hit: conHit, anchor: () => centreOf(con.group, con.tipLocal.x, con.tipLocal.y + 0.2, 0.2), beat: 3 },
    'board-a': { hit: boardAHit, anchor: () => { bA.grp.updateWorldMatrix(true, false); return bA.grp.localToWorld(new V3(0, bA.pH * 0.7, 0.3)); }, beat: 1 },
    horn: { hit: hornHit, anchor: () => { horn.updateWorldMatrix(true, false); return horn.localToWorld(new V3(1.6, 0, 0)); }, beat: 4 },
  };
  const labelAt = {
    consumer: () => consumer.top(),
    head: () => headW(0.12, 1.0, 0.1),
    // on top of the back row's left bubble (beat 2) or the back row's head, clear of the words on the bubbles
    talkers: () => { const b = chats[1].group; if (b.visible) { b.updateWorldMatrix(true, false); return b.localToWorld(new V3(-0.3, 0.6, 0.1)); } return Wg(tops[1].clone().add(new V3(0, 0.3, 0))); },
    'board-a': () => bA.centre(),
    // 廣告加碼 names the megaphone only when it is blasting again (換你試試 b: it stays silent)
    horn: () => (S.lever === 'b' ? null : (horn.updateWorldMatrix(true, false), horn.localToWorld(new V3(1.2, 0.6, 0)))),
  };
  const rbWord = (id) => () => (S.rb[id] && S.lit && S.lit('talkers') ? centreOf(rbs[id].group, 0, 0.05, 0.16) : null);
  const cardRows = (n, lev) => () => {
    if (!card.group.visible || !S.lit || !S.lit('card') || S.card === 'flying') return null;
    if (lev && S.lever !== lev) return null;
    if (n === 3 ? S.rows < 3 : S.rows !== n) return null;
    return card.rowAnchors(4, { align: 'left' });
  };
  const decalAt = {
    ask: () => (S.ask > 0.6 ? centreOf(ask.group, 0, 0, 0.2) : null),
    'talk-b': rbWord('b'),
    'talk-c': rbWord('c'),
    'talk-d': rbWord('d'),
    'talk-a': rbWord('a'),
    // the list, row by row as the reviews go in (each stage its own words; the last one per 換你試試 option)
    'card-1': () => (S.card === 'mouth' && card.group.visible && S.lit && S.lit('card') && S.rows === 1 && S.beat === 2 && card.group.scale.x > 0.9 ? card.rowAnchors(4, { align: 'left' }) : null),
    'card-2': cardRows(2),
    card: cardRows(3, 'a'),
    'card-b': cardRows(3, 'b'),
    ask2: () => (S.ask2 > 0.8 && S.lever === 'a' ? centreOf(ask2.group, 0, 0, 0.2) : null),
    'ask2-b': () => (S.ask2 > 0.8 && S.lever === 'b' ? centreOf(ask2.group, 0, 0, 0.2) : null),
    con: () => (S.con > 0.8 && S.lever === 'a' && S.lit && S.lit('con') ? centreOf(con.group, 0, 0.05, 0.2) : null),
    'con-b': () => (S.con > 0.8 && S.lever === 'b' && S.lit && S.lit('con') ? centreOf(con.group, 0, 0.05, 0.2) : null),
    waves: () => (S.waveLead >= 0 ? Wg(waves[S.waveLead].position) : null),
    'board-a': () => (S.lit && S.lit('board-a') && bA.slab.visible ? bA.centre() : null),
  };
  // the words' sizes (world height of the text): the reviews and the answer as large as their bubbles allow
  const decalUnit = { 'talk-b': 0.62, 'talk-c': 0.62, 'talk-d': 0.62, 'talk-a': 0.62, con: 0.6, 'con-b': 0.6, ask2: 0.6, 'ask2-b': 0.6, 'card-1': 0.62, 'card-2': 0.62, card: 0.62, 'card-b': 0.62, ask: 0.72, waves: 0.8, 'board-a': 0.8 };

  // ---- the shots: fixed points (the rest pose), so the framing never depends on where the motion is
  const consPts = [Wg(CP.clone().setY(deckY)), Wg(CP.clone().setY(deckY + CONS_H + 0.2))];
  const backPts = [Wg(CB.clone().setY(deckY)), Wg(CB.clone().setY(deckY + CONS_H + 0.2))];
  // the face (brow, nose, chin) and the ear; the crown may be cropped, the dissolving back is left out
  const facePts = [restHead(0.3, 0.9, 0.02), restHead(0.37, 0.78, 0), restHead(0.3, 0.5, 0.05), restHead(0.03, 0.66, 0.31)];
  const earPts = [restHead(0.03, 0.66, 0.31), restHead(0.3, 0.6, 0.05), restHead(0.3, 0.82, 0.02)];
  // the talkers from their knees up, with their small bubbles
  const KNEE = TY + 2.4;
  const talkPts = TALK.flatMap((_, i) => [Wg(tPts[i].clone().setY(KNEE)), Wg(CHAT_AT[i].clone().add(new V3(0, 0.6, 0)))]);
  talkPts.push(Wg(VP(TALK[0][0], TALK[0][1] - 1.4, KNEE)), Wg(CHAT_AT[0].clone().addScaledVector(RIGHT, -1.3)));
  // the three speakers, knees to heads
  const spkPts = SPK.flatMap((i) => [Wg(tPts[i].clone().setY(KNEE)), Wg(tops[i].clone().add(new V3(0, 0.3, 0)))]);
  const rbPts = RB_AT.flatMap((p) => [Wg(p.clone().addScaledVector(RIGHT, -RB.w / 2).add(new V3(0, RB.h / 2, 0))), Wg(p.clone().addScaledVector(RIGHT, RB.w / 2).add(new V3(0, -RB.h / 2, 0)))]);
  const askPts = [Wg(VP(ASK_AT.u, ASK_AT.v + 2.7, ASK_AT.y)), Wg(VP(ASK_AT.u, ASK_AT.v - 2.7, ASK_AT.y + 1.1))];
  const cardBox = (c) => [Wg(c.clone()), Wg(c.clone().add(new V3(0, CARD.h, 0))), Wg(c.clone().addScaledVector(RIGHT, CARD.w / 2 + 0.9)), Wg(c.clone().addScaledVector(RIGHT, -CARD.w / 2 - 0.9).add(new V3(0, CARD.h, 0)))];
  const cardPts = cardBox(CA), phonePts = cardBox(CPH);
  const conPtsOf = (ti) => [conAt(ti)].flatMap((p) => [Wg(p.clone().addScaledVector(RIGHT, -2.6).add(new V3(0, 0.9, 0))), Wg(p.clone().addScaledVector(RIGHT, 2.6).add(new V3(0, -0.9, 0)))]);
  const boardPts = [Wg(VP(A_AT.u, A_AT.v - 2.6).setY(bA.grp.position.y + bA.pH + BOARD.h + 1.6)), Wg(VP(A_AT.u, A_AT.v + 2).setY(bA.grp.position.y + bA.pH))];
  const breakPts = [Wg(BREAK), Wg(BREAK.clone().setY(SEA_Y))];
  // 1: the asker, the face, the question.  2: the talkers, the face, the megaphone.  3: the talkers with their reviews,
  // the ear and the mouth, the list.  4: the shopper with the list on the phone, the talkers and the answer.  5: the
  // megaphone, the face, the shopper with the list.  On a desktop one or two shots hold it all.
  // the one the shopper asks (the B speaker; with 換你試試 b, the one who now talks about A) and the answer over them
  const askedPts = () => { const ti = rbs[S.lever === 'b' ? 'a' : 'b'].ti; return [Wg(tPts[ti].clone().setY(KNEE)), ...conPtsOf(ti)]; };
  const SH = [
    () => [...consPts, ...facePts, ...askPts],
    () => [...talkPts, ...facePts, ...boardPts, ...breakPts],
    () => [...spkPts, ...rbPts, ...earPts, ...cardPts],
    () => [...backPts, ...phonePts, ...askedPts()],
    () => [...backPts, ...phonePts, ...facePts, ...boardPts, ...breakPts, ...askedPts()],
  ];
  const shot = (phi, el, pts, margin) => ({ az: AZ0 + phi, el, anchors: pts, margin });
  // a phone held sideways (the phone layout under 560 px tall) has a short, wide frame: seen lower, the stack is flatter
  const land = () => typeof innerWidth === 'number' && innerWidth > innerHeight && innerHeight < 560;
  const turns = (portrait, sideways) => ({
    get az() { return (land() ? sideways : portrait).az; },
    get el() { return (land() ? sideways : portrait).el; },
    anchors: () => (land() ? sideways : portrait).anchors(),
    margin: undefined,
  });
  const ALL = () => [...consPts, ...backPts, ...facePts, ...talkPts, ...cardPts, ...phonePts, ...boardPts, ...askedPts()];
  const EL = [0.24, 0.3, 0.32, 0.36, 0.3], DAZ = [0, 0, 0, 0, 0];
  const shots = {
    phone: SH.map((pp, i) => turns(shot(PHI + DAZ[i], EL[i], pp), shot(PHI + DAZ[i], 0.26, pp))),
    // the desktop frame is wide: each beat's shot keeps the people on the shore in view as well
    desk: [
      shot(PHI - 0.05, 0.26, () => [...SH[0](), ...talkPts]),
      shot(PHI - 0.05, 0.3, SH[1]),
      shot(PHI - 0.05, 0.32, () => [...SH[2](), ...consPts]),
      shot(PHI - 0.05, 0.34, () => [...SH[3](), ...talkPts, ...earPts]),
      shot(PHI - 0.05, 0.3, () => [...SH[4](), ...talkPts]),
    ],
  };

  const lever = { fromBeat: 1, options: ['a', 'b'], def: 'a' };
  const REST = ['card', 'consumer', 'talkers', 'con', 'head', 'board-a', 'horn'];
  const rest = () => pose(LAST, 1, lever.def);
  const ambient = () => { /* the shards drift in their shader; the held result stays still */ };

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
    lever,
    restParts: REST,
    mainActor: 'consumer',
    pose,
    rest,
    ambient,
    emphasize,
    // the shards drift only while a district has focus (on the map they hold still: see shardT)
    update(t, dt, ctx) { if (ctx && ctx.focus) shardT.value += dt; ambient(t, dt); },
    // read by life.js (flows 2 and 3 end and start here) and by the gates' neighbours
    ear: restHead(...EAR_H),
    mouth: restHead(...MOUTH_H),
    cardWorld: Wg(CA.clone().add(new V3(0, CARD.h / 2, 0))),
    // the shopper's phone where they stand at rest (back at the shore end, among the people): flow 3 lands there
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
