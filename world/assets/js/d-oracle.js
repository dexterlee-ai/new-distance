// AI 搜尋 · AI search (articles 9, 13, 19) — in the AI zone, TH 330°.
// The book's case acted out (districts §1): a consumer on a short pier asks the AI 「哪個牌子好？」.  The AI is David's
// head standing in the typed sea, looking out to sea; the question flies up to it and it turns to the asker.  Then it
// turns its ear — not to the brands, but to six people talking on the shore: a stream of their bubbles pours into the
// ear.  Out of its mouth comes a typed 推薦名單 (B 牌 · C 牌 · D 牌) with teal threads back to the words that named each
// brand.  A 牌 has only its own megaphone: its 「A 牌最好！」 waves hit the face, break and sink, and the board fades to a
// broken outline.  A copy of the list pops up on the consumer's phone.
// Each beat opens on its event within its first second: the bubble leaving the phone, the bubbles popping and pouring,
// the card coming out of the mouth, the horn swelling — the picture says it before the caption names it.
// Lever (換你試試): a = the story as played (the ad push); b = the one who named D talks about A instead, concretely —
// A takes D's row, D (now unmentioned) drops, and the megaphone stays silent.
//
// Staging (design §0.1): the camera stands with the consumer and looks outward, so a portrait frame reads, bottom to
// top, 消費者 → AI → 品牌: the talkers on the shore in front, the consumer on the pier, the head, the boards beyond.
// Everything that explains is a pure function of (beat, k, lever): pose().  The words live in world.json.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, dim, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, clamp } from './kit.js';
import { heightAt, SEA_Y } from './terrain.js';
import { makePerson } from './people.js';
import * as P from './props.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
const YAX = new V3(0, 1, 0), ZAX = new V3(0, 0, 1);
const sm = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (t, a, b) => sm(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const bump = (t, a, m, b) => (t <= a || t >= b ? 0 : t < m ? sm((t - a) / (m - a)) : 1 - sm((t - m) / (b - m)));

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

// ------------------------------------------------------------------ the set
const H = 24;                 // the bust (its chest under water), so a person of 4.8 still reads beside it
const CONS_H = 4.8;           // the consumer: the decisive person
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

const HEAD_AT = { u: 18.5, v: -5.6 };
// the face's turn from the camera toward the reader's right (rad): out to sea before the question; to the asker once
// asked (3/4, and at rest); a little further while it listens, so its ear turns to the talkers
const FACE_REST = 1.0, FACE_AWAY = 1.85, FACE_LISTEN = 1.2;
const HEAD_LIFT = 6;          // the bust stands this much higher than half-sunk: the chin clears the water and the whole face reads above the asker
const PIER = { u0: -1.6, u1: 8.2, v: 4.2, w: 2.2 };
const CONS_AT = { u: 7.2, v: 4.2 };
const ASK_AT = { u: 10.5, v: 4.4, y: 12.2 };   // where the question waits, right of the face
// the six talkers along the bluff (left foreground), nearest first
// two rows of three: the back row along the bluff's edge, the front row behind them (nearer the camera)
const TALK = [[-6.8, -7.4], [-4.7, -6.6], [-6.1, -5.8], [-3.9, -5.0], [-5.4, -4.2], [-3.2, -3.4]];
const SPEAKS = [1, 2, 5];                    // whose words become the rows B, C, D
// lever b: the one who named D talks about A instead (concretely), so A takes D's row and D, unmentioned, drops
const A_TALKER = 5;
// their longer words: the bubble is wider, and sits a little left of and above their usual place, clear of the list
const A_SHIFT = -2.2, A_RISE = 1.7;
// the four brands' boards on the far shore, on tall poles so they stand clear above the crown of the head in front of
// them: B, C and D in a row; A at the right end, its horn aimed down across the picture at the face
const BOARDS = [{ id: 'a', u: 30, v: 6.2, post: 14 }, { id: 'b', u: 30, v: -6.5, post: 12 }, { id: 'c', u: 31, v: -2.5, post: 12 }, { id: 'd', u: 32, v: 1.5, post: 12 }];
const CARD_AT = { u: 5, v: 0.6, y: 6.2 };      // where the 推薦名單 hangs: under the chin, between the talkers' words and the asker
const CARD = { w: 4.2, h: 5.0 };

const BEATS = [
  // 1 買之前，先問 AI — the consumer raises the phone; 「哪個牌子好？」 flies to the face; the head turns to them
  { dur: 4.0, keyAt: 1.4, shot: 0, parts: ['consumer', 'ask', 'head'] },
  // 2 網友的評價，流進 AI — the talkers speak; a stream of bubbles pours into the ear; the ear lights teal
  { dur: 4.6, keyAt: 1.3, shot: 1, parts: ['talkers', 'head'] },
  // 3 別人說的，變成 AI 的推薦 — the card unfolds out of the mouth; rows type in, threads run back to the words that
  // named each brand (the speakers' bubbles keep their words: the link is word to row)
  { dur: 4.7, keyAt: 0.9, shot: 1, parts: ['card', 'talkers'] },
  // 4 沒人討論的品牌，等於隱形 — B, C and D stand lit (they are on the list); A's horn blasts, the waves shatter on the
  // face and sink, A fades; the list reaches the phone
  { dur: 5.6, keyAt: 1.8, shot: 2, parts: ['board-a', 'horn', 'boards', 'card', 'consumer'] },
];
const LAST = BEATS.length - 1;
const NS = 30;                 // bubbles in the stream (five from each talker)
const NW = 5;                  // waves (lever a, the story as played)

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

  // =================================================================== the head (David, graphite, dissolving into type)
  const hg = new THREE.Group();
  hg.name = 'head';
  const HP = VP(HEAD_AT.u, HEAD_AT.v);
  hg.position.set(HP.x, SEA_Y - 0.4 * H + HEAD_LIFT, HP.z);
  g.add(hg);
  const pulseU = { value: 0 };
  const headMat = ink({
    side: THREE.DoubleSide,
    hooks: {
      key: 'oracle-head',
      fHead: `
        float bn(vec3 p){ return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      `,
      fOut: `
        // vLPos is in bust units (height 1, +x = face). The back of the head dissolves in cube-sized steps.
        float n = bn(vLPos * 34.0);
        float edge = -0.03 - 0.26 * n + 0.03 * sin(uTime * 0.35 + n * 6.0);
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
  // shader, on the world clock), the listening pulse a uniform the pose sets.
  const SHARD_HOOKS = {
    key: 'oracle-shards',
    vHead: 'attribute vec4 aDrift; attribute float aAmp;',
    vPos: `{
      float kk = 0.5 + 0.5 * sin(uTime * 0.157 + aDrift.w * 6.2831853);
      float a = aAmp * (0.18 * kk + 0.6 * uPulse);
      transformed = transformed * (1.0 - 0.3 * kk) + aDrift.xyz * a;
    }`,
  };
  const pts = shards.pts;
  const cube = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  const nShard = pts.length;
  const drift = new Float32Array(nShard * 4), amp = new Float32Array(nShard);
  const shardMesh = new THREE.InstancedMesh(cube, ink({ style: 1, accent: 'teal', shade: 0.85, hooks: SHARD_HOOKS, uniforms: { uPulse: pulseU } }), nShard);
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

  // the consumer stands here; the face turns to them (the rest pose looks a little past them, to the reader's right,
  // so the right ear still shows to the talkers and the camera)
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

  // the ear's teal rim (beat 2 on): a typed oval on the ear's surface
  const earRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 6, 40), ink({ style: 1, shade: 0.5, accent: 'teal', focus: false }));
  earRing.name = 'ear';
  earRing.scale.set(0.045 * H, 0.075 * H, 0.045 * H);
  earRing.position.set(EAR_H[0] * H, EAR_H[1] * H, (EAR_H[2] + 0.012) * H);
  earRing.castShadow = false;
  earRing.visible = false;
  hg.add(earRing);
  layer('head', earRing);
  // the head's tap target: the part above the water
  const headHitRoot = new THREE.Group();
  headHitRoot.name = 'head-part';
  hg.add(headHitRoot);
  const boxProxy = (parent, c, s, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
    m.name = 'hit:' + name; m.userData.hitProxy = true; m.castShadow = m.receiveShadow = false;
    m.position.copy(c); m.scale.copy(s);
    parent.add(m);
    return m;
  };
  // the face and the ear (the dissolving back does not answer)
  const headHit = boxProxy(headHitRoot, new V3(0.15 * H, 0.7 * H, 0.04 * H), new V3(0.46 * H, 0.5 * H, 0.62 * H), 'head');

  // =================================================================== the pier and the consumer
  const p0 = VP(PIER.u0, PIER.v), p1 = VP(PIER.u1, PIER.v);
  const pierLen = p0.distanceTo(p1);
  const deckY = Math.max(gy(p0.x, p0.z), gy(VP(PIER.u0 + 1.2, PIER.v).x, VP(PIER.u0 + 1.2, PIER.v).z)) + 0.1;
  const pier = (() => {
    const parts = [];
    const box = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(b.toNonIndexed()); };
    box(pierLen, 0.18, PIER.w, pierLen / 2, -0.09, 0);
    for (const zz of [-1, 1]) box(pierLen, 0.2, 0.18, pierLen / 2, -0.27, zz * (PIER.w / 2 - 0.2));
    const depth = deckY - SEA_Y + 4;
    for (const x of [1.6, pierLen / 2 + 0.8, pierLen - 0.3]) for (const zz of [-1, 1]) {
      const top = x > pierLen - 1 ? 0.5 : -0.1;
      const c = new THREE.CylinderGeometry(0.14, 0.16, depth + top, 8); c.translate(x, (top - depth) / 2, zz * (PIER.w / 2 - 0.06)); parts.push(c.toNonIndexed());
    }
    for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
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
  // drawn a little darker than the others: the asker must stand out against the typed sea
  consumer.material.userData.u.uShadeBias.value = 0.1;
  const phone = P.makePhone({ h: 1.15 });
  consumer.hold('R', phone, { rot: [0, Math.PI, 0] });     // the screen toward the person (and the camera behind them)
  consumer.group.position.set(CP.x, deckY, CP.z);
  g.add(consumer.group);
  layer('consumer', consumer.group);
  // the list's copy on the phone (beat 4 on)
  // big enough to be seen arriving (it pops up out of the phone's screen)
  const mini = P.makeResultCard({ w: 1.0, h: 1.4, rows: 3, lean: 0, t: 0.04 });
  mini.group.visible = false;
  g.add(mini.group);
  layer('consumer', mini.group);

  // =================================================================== the question (beat 1)
  const ask = P.makeBubble({ w: 5.4, h: 2.2, tail: 'left', t: 0.3 });
  ask.group.name = 'ask';
  ask.material.userData.u.uAccentAll = { value: 1 };
  ask.group.visible = false;
  g.add(ask.group);
  layer('ask', ask.group);
  const askHit = P.makeHitProxy(ask.group, 0.3);

  // =================================================================== the talkers on the shore
  const talkers = new THREE.Group();
  talkers.name = 'talkers';
  g.add(talkers);
  layer('talkers', talkers);
  // a level terrace along the bluff, a long ledge to sit on
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
    p.setPose('sit', 1);
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
  // their resting bubbles, one over each head (they appear when the talking starts)
  const restB = people.map((p, i) => {
    const b = P.makeBubble({ w: 2.5, h: 1.15, tail: i % 2 ? 'right' : 'left', t: 0.2 });
    b.group.name = `said${i}`;
    b.material.userData.u.uAccentAll = { value: 1 };
    b.group.position.copy(tops[i]).add(new V3(0, i % 2 ? 2.3 : 0.95, 0));   // the back row's higher, so the two rows' bubbles do not overlap
    b.group.rotation.y = Math.atan2(cP, sP);   // facing the phone camera
    b.group.visible = false;
    talkers.add(b.group);
    return b;
  });
  const B_REST = restB.map((b) => b.group.position.clone());
  // the stream: five bubbles from each talker, one instanced mesh
  const streamGeo = P.makeBubble({ w: 2.2, h: 1.1, tail: 'left', t: 0.18 }).mesh.geometry;
  const streamMat = ink({ shade: 1, bias: 0.32, accent: 'lime', focus: false });
  const stream = new THREE.InstancedMesh(streamGeo, streamMat, NS);
  stream.name = 'stream';
  stream.frustumCulled = false;
  stream.castShadow = false;
  for (let i = 0; i < NS; i++) stream.setMatrixAt(i, new M4().compose(B_REST[i % 6], new Q(), new V3(1e-4, 1e-4, 1e-4)));
  talkers.add(stream);
  const talkHit = P.makeHitProxy(talkers, 0.3);

  // =================================================================== the boards on the brand shore, A's horn
  const boards = new THREE.Group(); boards.name = 'boards';
  const boardA = new THREE.Group(); boardA.name = 'board-a';
  g.add(boards, boardA);
  layer('boards', boards);
  layer('board-a', boardA);
  const BOARD = { w: 3.4, h: 2.2, t: 0.28, post: 5.2 };
  const boardOf = BOARDS.map((B) => {
    const at = VP(B.u, B.v);
    const y0 = gy(at.x, at.z) - 0.2;
    const grp = new THREE.Group(); grp.name = `board-${B.id}`;
    grp.position.set(at.x, y0, at.z);
    grp.rotation.y = Math.atan2(cP, sP);
    const mat = ink({ shade: 1, bias: 0.16, focus: false });
    const pH = B.post ?? BOARD.post;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, pH + 0.6, 8).translate(0, (pH + 0.6) / 2, -0.05), mat);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, BOARD.h, BOARD.t).translate(0, pH + BOARD.h / 2, 0.12), mat);
    for (const m of [post, slab]) { m.castShadow = m.receiveShadow = true; grp.add(m); }
    (B.id === 'a' ? boardA : boards).add(grp);
    // a broken outline of the same board: what is left of A once nobody talks about it
    let dashes = null;
    if (B.id === 'a') {
      const parts = [];
      const bar = (w, h, x, y) => { const b = new THREE.BoxGeometry(w, h, 0.06); b.translate(x, y, 0.3); parts.push(b.toNonIndexed()); };
      const y0s = pH, x0 = -BOARD.w / 2, nX = 6, nY = 4, th = 0.09;
      for (let i = 0; i < nX; i++) { const x = x0 + ((i + 0.5) / nX) * BOARD.w; bar(BOARD.w / nX * 0.55, th, x, y0s); bar(BOARD.w / nX * 0.55, th, x, y0s + BOARD.h); }
      for (let i = 0; i < nY; i++) { const y = y0s + ((i + 0.5) / nY) * BOARD.h; bar(th, BOARD.h / nY * 0.55, x0, y); bar(th, BOARD.h / nY * 0.55, -x0, y); }
      for (let i = 0; i < 9; i++) bar(th * 1.4, pH / 9 * 0.5, 0, ((i + 0.5) / 9) * pH);
      for (const p of parts) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
      dashes = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink', focus: false }));
      dashes.name = 'a-outline'; dashes.castShadow = false; dashes.visible = false;
      grp.add(dashes);
    }
    return { id: B.id, grp, mat, slab, post, dashes, pH, centre: () => { grp.updateWorldMatrix(true, false); return grp.localToWorld(new V3(0, pH + BOARD.h / 2, 0.3)); } };
  });
  const bA = boardOf[0];
  // the horn: a megaphone beside the top of A's board, aimed across the picture at the face
  const horn = new THREE.Group(); horn.name = 'horn';
  const hornMat = ink({ shade: 0.85, bias: 0.05, side: THREE.DoubleSide, focus: false });
  const HORN_L = 3.2;
  {
    // a megaphone: a flared cone (its inside dark), a rim at the bell, a short throat and a box driver
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.28, HORN_L, 24, 1, true).rotateZ(-Math.PI / 2).translate(HORN_L / 2, 0, 0), hornMat);
    const inside = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.24, HORN_L * 0.96, 24, 1, true).rotateZ(-Math.PI / 2).translate(HORN_L / 2 + 0.05, 0, 0), ink({ shade: 0.25, side: THREE.BackSide, focus: false }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.09, 6, 28).rotateY(Math.PI / 2).translate(HORN_L, 0, 0), hornMat);
    const driver = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.7, 14).rotateZ(-Math.PI / 2).translate(-0.3, 0, 0), hornMat);
    for (const m of [cone, inside, rim, driver]) { m.castShadow = true; horn.add(m); }
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
  // where its waves break: in front of the nose (the head is at its rest turn while the set is built) — the shout hits
  // the face and does not get in
  const BREAK = onHead(0.47, 0.77, -0.04);
  // the horn points across the picture at the face, in the picture's plane (only a little toward the reader): seen from
  // the side it reads as a megaphone; seen down its axis it was a ball on a post
  const HORN_Q = (() => {
    const d = BREAK.clone().sub(HORN_AT);
    const fwd = new V3(-cP, 0, -sP), right = new V3(sP, 0, -cP);
    const du = d.dot(fwd), dv = d.dot(right);
    // never steeper than about 50° below the horizontal: pointing straight down it read as a lamp
    const side = Math.sign(dv || -1) * Math.max(Math.abs(dv), 0.85 * Math.abs(d.y));
    const dir = fwd.clone().multiplyScalar(du * 0.12).addScaledVector(right, side).setY(d.y).normalize();
    return new Q().setFromUnitVectors(new V3(1, 0, 0), dir);
  })();
  horn.position.copy(HORN_AT);
  const hornHit = P.makeHitProxy(horn, 0.4);
  // B, C and D answer on their boards only (their tall poles run down behind the head, which answers there itself)
  const boardsHit = (() => {
    const bC = boardOf[2], span = (BOARDS[3].v - BOARDS[1].v) + BOARD.w + 0.8;
    return boxProxy(bC.grp, new V3(0, bC.pH + BOARD.h / 2, 0), new V3(span, BOARD.h + 2, 4), 'boards');
  })();
  // A: its board and the top of its pole (the horn above it is a part of its own)
  const boardAHit = boxProxy(bA.grp, new V3(0, (bA.pH * 0.55 + bA.pH + BOARD.h) / 2, 0.1), new V3(BOARD.w + 0.6, bA.pH * 0.45 + BOARD.h + 0.6, 1.2), 'board-a');

  // the waves (lever a): open arcs leaving the horn, breaking on the face
  // each wave is an arc facing the reader, its bulge toward the face (in the picture's plane): a drawn 「)))」
  const WAVE_TH = (() => {
    const d = BREAK.clone().sub(HORN_AT.clone().add(new V3(HORN_L, 0, 0).applyQuaternion(HORN_Q)));
    return Math.atan2(d.y, d.x * sP - d.z * cP);
  })();
  const waveGeo = new THREE.TorusGeometry(1, 0.075, 5, 28, Math.PI * 0.8).rotateZ(WAVE_TH - Math.PI * 0.4);
  // the waves' path bows up a little on the way across
  const WAVE_MID = HORN_AT.clone().add(new V3(HORN_L, 0, 0).applyQuaternion(HORN_Q)).lerp(BREAK, 0.5).add(new V3(0, 1.2, 0));
  // drawn in solid ink: a shout's 「)))」 lines, not shaded objects
  const waveMat = ink({ accent: 'ink', focus: false });
  const waves = Array.from({ length: NW }, (_, i) => {
    const m = new THREE.Mesh(waveGeo, waveMat);
    m.name = `wave${i}`; m.castShadow = false; m.visible = false;
    boardA.add(m);
    return m;
  });
  // the broken shout: at the face each wave cracks into pieces of its arc, which tumble into the sea and sink
  const NF = 4;                                      // pieces per wave
  const fragGeo = new THREE.TorusGeometry(1, 0.075, 5, 8, Math.PI * 0.2).translate(-Math.cos(Math.PI * 0.1), -Math.sin(Math.PI * 0.1), 0);
  const frags = new THREE.InstancedMesh(fragGeo, waveMat, NW * NF);
  frags.name = 'shatter';
  frags.frustumCulled = false;
  frags.castShadow = false;
  boardA.add(frags);
  const FR = Array.from({ length: NW * NF }, (_, i) => ({ w: Math.floor(i / NF), k: i % NF, spin: (R() - 0.5) * 7, out: 0.5 + R() * 1.3, d: R() * 0.08 }));
  const WR0 = 1.1, WR = 3.0;                         // a wave's radius leaving the bell and reaching the face

  // =================================================================== the 推薦名單 (typed, AI-made) and its threads
  const card = P.makeResultCard({ w: CARD.w, h: CARD.h, rows: 4, lean: 0, t: 0.1 });
  card.group.name = 'card';
  const CA = VP(CARD_AT.u, CARD_AT.v, CARD_AT.y);
  const CARD_YAW = Math.atan2(cP, sP);
  card.group.visible = false;
  g.add(card.group);
  layer('card', card.group);
  const cardHit = P.makeHitProxy(card.group, 0.3);
  const threadMat = ink({ shade: 0.4, accent: 'teal', focus: false });
  const threadsG = new THREE.Group(); threadsG.name = 'threads';
  g.add(threadsG);
  layer('card', threadsG);
  // rows (local to the card's face): 0 = the title, 1…3 = the brands
  const ins = 0.05 * Math.min(CARD.w, CARD.h);
  const rowZ = (i) => { const z0 = -CARD.h / 2 + 2 * ins, z1 = CARD.h / 2 - 2 * ins; return z0 + ((i + 0.5) / 4) * (z1 - z0); };
  const rowStart = (i) => {
    // the card's left edge at row i, in the stage frame (from the card's rest matrix, so threads are fixed geometry)
    const o = card.mesh;
    card.group.position.copy(CA); card.group.rotation.set(0, CARD_YAW, 0); card.group.scale.set(1, 1, 1);
    card.group.updateMatrixWorld(true);
    return g.worldToLocal(o.localToWorld(new V3(-CARD.w / 2 + 0.05, 0.12, rowZ(i))));
  };
  const threadTo = (from, to) => {
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.max(from.y, to.y) + 1.6;
    const c = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geo = new THREE.TubeGeometry(c, 48, 0.13, 6, false);
    const m = new THREE.Mesh(geo, threadMat);
    m.castShadow = false; m.visible = false;
    threadsG.add(m);
    return { m, n: geo.index.count };
  };
  const bubbleEdge = (i) => restB[i].group.position.clone().add(new V3(0, -0.2, 0));
  const threadsA = SPEAKS.map((ti, r) => threadTo(rowStart(r + 1), bubbleEdge(ti)));
  // lever b: B and C from their speakers, A from the one who now talks about A (D drops)
  const threadsB = [threadsA[0], threadsA[1], threadTo(rowStart(3), bubbleEdge(A_TALKER).addScaledVector(new V3(sP, 0, -cP), A_SHIFT).add(new V3(0, A_RISE, 0)))];
  card.group.visible = false;

  // =================================================================== pose
  // what pose() decided and emphasize() / the anchors need
  const S = { beat: LAST, t: BEATS[LAST].dur, lever: 'a', emph: null, ask: 0, rows: false, said: 0, aFade: 0, boardsUp: 1, aLime: false, waveLead: -1, words: { talk: false, card: false, boards: false, a: false } };
  const _m = new M4(), _p = new V3(), _q = new Q(), _q2 = new Q(), _s = new V3(), _v = new V3();
  const pickable = (mesh, on) => { if (on) mesh.layers.enable(0); else mesh.layers.disableAll(); };
  const camYaw = Math.atan2(cP, sP);
  const qCam = new Q().setFromAxisAngle(YAX, camYaw);
  const CONS_YAW = (() => { const d = new V3(HP.x - CP.x, 0, HP.z - CP.z); return Math.atan2(d.x, d.z) - 0.12; })();
  const phoneAt = () => { phone.group.updateWorldMatrix(true, false); return g.worldToLocal(phone.group.localToWorld(new V3(0, 0.6, 0.1))); };

  function pose(beat, k = 1, lever = 'a') {
    beat = clamp(Math.round(+beat || 0), 0, LAST);
    k = Number.isNaN(+k) ? 1 : clamp(+k);
    const L = lever === 'b' ? 'b' : 'a';
    const t = k * BEATS[beat].dur;
    /** progress of a window [a, z] (seconds) of beat i */
    const Wn = (i, a, z) => (beat > i ? 1 : beat < i ? 0 : clamp((t - a) / (z - a)));
    const at = (i, x) => beat > i || (beat === i && t >= x);

    // ---- the head turns to the asker as the question reaches it; the shards pulse once (listening)
    // beat 1: it looks out to sea, and turns to the asker as the question flies to it; beat 2: it turns its ear to the
    // talkers; beat 3: back to the asker, to answer
    const turn = beat === 0 ? sm(Wn(0, 0.6, 1.6)) : 1;
    const face = beat === 0 ? lerp(FACE_AWAY, FACE_REST, turn)
      : beat === 1 ? lerp(FACE_REST, FACE_LISTEN, sm(Wn(1, 0.0, 0.6)))
        : beat === 2 ? lerp(FACE_LISTEN, FACE_REST, sm(Wn(2, 0.0, 0.5))) : FACE_REST;
    hg.rotation.set(0, yawFor(face), 0.06 * (1 - turn));
    hg.updateMatrixWorld(true);
    pulseU.value = beat === 0 ? bump(t, 1.35, 1.75, 2.9) : beat === 1 ? 0.35 * bump(t, 1.2, 1.6, 3.4) : 0;
    const glow = at(1, 1.25);
    earRing.visible = glow;

    // ---- the consumer: phone raised to ask, then held at the chest, watching
    consumer.group.position.set(CP.x, deckY, CP.z);
    consumer.group.rotation.set(0, CONS_YAW, 0);
    if (beat === 0) consumer.setPose('raise', sm(Wn(0, 0.0, 0.45)), { from: 'stand' });
    else if (beat === 1) consumer.setPose('hold', sm(Wn(1, 0.2, 0.9)), { from: 'raise' });
    else consumer.setPose('hold', 1, { from: 'hold' });
    consumer.group.updateMatrixWorld(true);

    // ---- the question: out of the phone, up to the face, where it stays until the AI takes it in (beat 2)
    {
      const a = Wn(0, 0.4, 0.62), f = Wn(0, 0.45, 1.4), gone = Wn(1, 0.05, 0.45);
      const on = a > 0 && gone < 1;
      ask.group.visible = on;
      S.ask = on ? (gone > 0 ? 1 - gone : a) : 0;
      if (on) {
        const from = beat === 0 ? phoneAt() : null;
        const hold = VP(ASK_AT.u, ASK_AT.v, ASK_AT.y);
        const into = onHead(...MOUTH_H);
        const e = sm(f);
        if (gone > 0) _p.copy(hold).lerp(into, sm(gone));
        else if (from) { _p.copy(from).lerp(hold, e); _p.y += Math.sin(Math.PI * e) * 1.6; }
        else _p.copy(hold);
        ask.group.position.copy(_p);
        ask.group.quaternion.copy(qCam);
        ask.group.scale.setScalar(Math.max(1e-3, (0.3 + 0.7 * eo(a)) * (1 - 0.85 * sm(gone))));
      }
    }

    // ---- the talkers speak (beat 2): a hand comes up, the bubbles pop, the stream pours into the ear
    people.forEach((p, i) => {
      // all six talk in beat 2 (a hand up as they speak, a little out of step); afterwards only those the list cites
      // keep a hand up
      const cited = SPEAKS.includes(i) || (L === 'b' && i === A_TALKER);
      const gesture = beat === 1 ? sm(Wn(1, 0.02 * i, 0.3 + 0.03 * i)) : beat >= 2 && cited ? 0.75 : 0;
      p.setPose('lift', gesture, { from: 'sit', to: new V3(-0.3, 0.6 * TALK_H, 0.3 * TALK_H) });
    });
    const pop = Wn(1, 0.1, 0.4);
    restB.forEach((b, i) => {
      // after the talking only the bubbles the list cites stay (lever b: the one about A too, raised above the
      // others and larger: its words are longer)
      const on = pop > 0 && (beat === 1 || SPEAKS.includes(i) || (L === 'b' && i === A_TALKER));
      const vouch = L === 'b' && i === A_TALKER;
      b.group.visible = on;
      b.group.position.copy(B_REST[i]);
      if (vouch) b.group.position.addScaledVector(RIGHT, A_SHIFT).y += A_RISE;
      b.group.scale.set(Math.max(1e-3, eo(pop) * (vouch ? 1.9 : 1)), Math.max(1e-3, eo(pop) * (vouch ? 1.15 : 1)), 1);
    });
    const ear = onHead(EAR_H[0] + 0.03, EAR_H[1], EAR_H[2] + 0.05);
    for (let i = 0; i < NS; i++) {
      const ti = i % 6, t0 = 0.3 + i * 0.062, fl = 1.05;
      const u = beat === 1 ? (t - t0) / fl : -1;
      if (u <= 0 || u >= 1) { stream.setMatrixAt(i, _m.compose(tops[ti], qCam, _s.setScalar(1e-4))); continue; }
      // up out of the speaker's bubble in a high arc, then down into the ear, shrinking as it goes in
      const a = B_REST[ti];
      const mid = a.clone().lerp(ear, 0.45); mid.y = Math.max(a.y, ear.y) + 4.5 + ((i * 7) % 5) * 0.75;
      const e = u * u * (3 - 2 * u) * 0.55 + u * 0.45;
      _p.set(0, 0, 0).addScaledVector(a, (1 - e) * (1 - e)).addScaledVector(mid, 2 * (1 - e) * e).addScaledVector(ear, e * e);
      const sc = 1.0 * Math.min(1, u / 0.12) * (u > 0.6 ? Math.max(0.1, 1 - (u - 0.6) / 0.4) : 1);
      stream.setMatrixAt(i, _m.compose(_p, qCam, _s.setScalar(Math.max(1e-4, sc))));
    }
    stream.instanceMatrix.needsUpdate = true;
    stream.visible = beat === 1;

    // ---- the list unfolds out of the mouth (beat 3); its rows; the threads back to the speakers
    {
      const a = Wn(2, 0.0, 0.5);
      const on = a > 0;
      card.group.visible = on;
      if (on) {
        const mouth = onHead(...MOUTH_H);
        const e = sm(a);
        card.group.position.copy(mouth).lerp(CA, e);
        card.group.position.y += Math.sin(Math.PI * e) * 0.8;
        card.group.rotation.set(0, CARD_YAW, 0);
        card.group.scale.set(Math.max(1e-3, e), Math.max(1e-3, 0.25 + 0.75 * e), 1);
      }
      S.rows = at(2, 0.55);
      const list = L === 'b' ? threadsB : threadsA;
      for (const th of [...threadsA, threadsB[2]]) th.m.visible = false;
      list.forEach((th, r) => {
        const d = Wn(2, 0.6 + 0.3 * r, 0.95 + 0.3 * r);
        th.m.visible = d > 0;
        th.m.geometry.setDrawRange(0, Math.round((d * th.n) / 3) * 3);
      });
    }

    // ---- A's horn: swells and blasts (beat 4, lever a); the waves break on the face into pieces that sink; A fades
    const hit = BREAK;
    const hornQ = HORN_Q;
    horn.quaternion.copy(hornQ);
    // it swells as it blasts and goes back to its size once the shouting is over (silent, it stays there)
    const swell = L === 'a' && beat === 3 ? sm(Wn(3, 0.0, 0.4)) * (1 - sm(Wn(3, 1.5, 2.2))) : 0;
    horn.scale.setScalar(1 + 0.35 * swell);
    const hornMouth = HORN_AT.clone().add(new V3(HORN_L * (1 + 0.35 * swell), 0, 0).applyQuaternion(hornQ));
    S.waveLead = -1;
    waves.forEach((w, i) => {
      const t0 = 0.3 + i * 0.2, fl = 0.75;
      const u = beat === 3 && L === 'a' ? (t - t0) / fl : -1;
      w.visible = u > 0 && u < 1;
      if (!w.visible) return;
      if (S.waveLead < 0) S.waveLead = i;
      // out of the bell, across the picture and forward onto the face, growing as a shout does
      const e = u * (0.75 + 0.25 * u);
      _p.set(0, 0, 0).addScaledVector(hornMouth, (1 - e) * (1 - e)).addScaledVector(WAVE_MID, 2 * (1 - e) * e).addScaledVector(hit, e * e);
      w.position.copy(_p);
      w.rotation.set(0, camYaw, 0);
      w.scale.setScalar(WR0 + (WR - WR0) * u);
    });
    for (let i = 0; i < NW * NF; i++) {
      const f = FR[i];
      const u = beat === 3 && L === 'a' ? t - (0.3 + f.w * 0.2 + 0.75 + f.d) : -1;
      if (u < 0) { frags.setMatrixAt(i, _m.compose(hit, _q.identity(), _s.setScalar(1e-4))); continue; }
      // the piece starts where it was on its arc, springs out a little, falls in front of the face (drifting away
      // from the asker, who stands to its right), and sinks out of sight under the sea
      const th = WAVE_TH - Math.PI * 0.4 + (f.k + 0.5) * (Math.PI * 0.8 / NF);
      const r = WR + f.out * u;
      _p.copy(hit).addScaledVector(RIGHT, Math.cos(th) * r - 1.6 * u);
      _p.y += Math.sin(th) * r + 1.5 * u - 4.9 * u * u;
      let sc = WR;
      if (_p.y < SEA_Y) { const sink = SEA_Y - _p.y; _p.y = SEA_Y - Math.min(sink, 1) * 0.5; sc *= Math.max(0, 1 - sink / 1.5); }
      _q.setFromAxisAngle(YAX, camYaw).multiply(_q2.setFromAxisAngle(ZAX, th - Math.PI * 0.1 + f.spin * u));
      frags.setMatrixAt(i, _m.compose(_p, _q, _s.setScalar(Math.max(1e-4, sc))));
    }
    frags.instanceMatrix.needsUpdate = true;
    frags.visible = L === 'a' && beat === 3 && t >= 1.05 && t < 4.2;
    S.aFade = L === 'a' ? Wn(3, 1.6, 2.4) : 0;
    // A fades: the board drops to its contour, then only a broken outline is left (the horn stays, silent)
    bA.slab.visible = bA.post.visible = S.aFade < 0.55;
    bA.dashes.visible = S.aFade >= 0.45;
    S.aLime = beat === 3 && L === 'a' && t < 2.4;

    // ---- the list's copy flies to the phone (end of beat 4)
    {
      const f = Wn(3, 4.4, 5.3);
      mini.group.visible = f > 0;
      if (f > 0) {
        const from = card.group.position.clone().add(new V3(0, CARD.h / 2, 0));
        const to = phoneAt();
        const e = sm(f);
        mini.group.position.copy(from).lerp(to, e);
        mini.group.position.y += Math.sin(Math.PI * e) * 2.0;
        mini.group.rotation.set(0, CARD_YAW, 0);
        mini.group.scale.setScalar(lerp(2.2, 1, e));
      }
    }

    Object.assign(S, { beat, t, lever: L, said: pop, boardsUp: beat < 2 ? 0 : 1 });
    // a part that is not drawn does not answer a tap (its proxy would still sit where it was last)
    pickable(askHit, ask.group.visible);
    pickable(cardHit, card.group.visible);
    applyEmphasis();
    return api;
  }

  // =================================================================== emphasis by subtraction
  // which dim groups each part keeps at full strength
  const FULL = {
    consumer: ['consumer'], ask: ['ask'], head: ['head'], talkers: ['talkers'], card: ['card'],
    boards: ['boards'], 'board-a': ['board-a'], horn: ['board-a'],
  };
  function setDim(objs, k) {
    for (const o of objs) {
      dim(o, k);
      o.traverse((m) => { if (m.isMesh && !m.userData.hitProxy && m.userData.cast0 !== undefined) m.castShadow = k < 0.5 ? m.userData.cast0 : false; });
    }
  }
  function applyEmphasis() {
    const E = S.emph;
    const map = E === null;
    const full = new Set();
    if (!map) for (const id of E) for (const l of FULL[id] || []) full.add(l);
    for (const [name, objs] of Object.entries(layers)) {
      let d = map ? 0 : full.has(name) ? 0 : 1;
      if (name === 'boards' && !map && full.has('boards')) d = Math.max(d, 1 - S.boardsUp);
      if (name === 'scenery') d = map ? 0 : 1;
      setDim(objs, d);
    }
    // lever b: A is on the list instead of D — A's board lights with B and C, D (nobody mentions it now) drops to
    // contour; the horn stays where it is, silent
    if (!map && S.lever === 'b' && S.beat >= 2) {
      setDim([boardOf[3].grp], 1);
      if (full.has('boards')) setDim([bA.grp], 0);
    }
    // accents: lime only in focus (one object at a time), teal on what the AI makes
    const on = !map;
    ask.material.userData.u.uAccent.value = on && full.has('ask') ? ACCENT.lime : 0;
    const streamLime = on && full.has('talkers') && (S.beat === 1 || S.beat === LAST && sameRest(E));
    streamMat.userData.u.uAccent.value = streamLime && S.lever === 'a' ? ACCENT.lime : 0;
    restB.forEach((b, i) => {
      const limeA = S.lever === 'b' && i === A_TALKER && S.beat >= 1;
      b.material.userData.u.uAccent.value = on && full.has('talkers') && (S.lever === 'b' ? limeA : streamLime) ? ACCENT.lime : 0;
    });
    card.material.userData.u.uAccent.value = 0;
    threadMat.userData.u.uAccent.value = on && full.has('card') ? ACCENT.teal : 0;
    earRing.material.userData.u.uAccent.value = on && full.has('head') ? ACCENT.teal : 0;
    bA.mat.userData.u.uAccent.value = on && S.aLime && full.has('board-a') ? ACCENT.lime : 0;
    // A on its way out: down to its contour before the broken outline takes over
    if (S.aFade > 0 && bA.slab.visible) { const k = Math.max(map || full.has('board-a') ? 0 : 1, sm(S.aFade / 0.5)); dim(bA.slab, k); dim(bA.post, k); }
    waveMat.userData.u.uAccent.value = ACCENT.ink;
    // which words the objects carry now (at most six decals on screen, and none on a part drawn as contour only):
    // the speakers' words while the talkers are the subject (beat 2 on), the list's rows while the card is, the
    // board letters while the boards are and the speakers are not (beat 4: B, C, D on the list beside A shouting)
    const lit = (name) => !map && full.has(name);
    S.words.talk = lit('talkers') && S.beat >= 1 && S.said >= 1;
    S.words.card = lit('card') && S.rows;
    S.words.boards = lit('boards') && S.beat >= 2 && !S.words.talk;
    S.words.a = (lit('board-a') || lit('boards')) && S.beat === LAST;
  }
  const sameRest = (E) => !!E && E.size === REST.length && REST.every((x) => E.has(x));
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
  const parts = {
    // the ring on the hips, so it does not cover the figure's chest and phone
    consumer: { hit: P.makeHitProxy(consumer.group, 0.35), anchor: () => consumer.joints.hips.localToWorld(new V3(0, -0.02 * CONS_H, 0.06 * CONS_H)), beat: 0 },
    ask: { hit: askHit, anchor: () => { ask.group.updateWorldMatrix(true, false); return ask.group.localToWorld(new V3(-1.8, 0.4, 0.2)); }, beat: 0 },
    // the ring in the hair above the ear, off the face
    head: { hit: headHit, anchor: () => headW(-0.02, 0.84, 0.3), beat: 1 },
    // the rings sit clear of the words: at the left-front talker's knees (the label is above the middle one), under
    // the card, on A's pole under its board
    talkers: { hit: talkHit, anchor: () => { people[0].group.updateWorldMatrix(true, false); return people[0].group.localToWorld(new V3(0, people[0].seatH * 0.8, 0.25 * TALK_H)); }, beat: 1 },
    // just under the card's bottom edge (its rows cover the card; beside it the asker has a ring of their own)
    card: { hit: cardHit, anchor: () => { card.group.updateWorldMatrix(true, false); return card.mesh.localToWorld(new V3(-0.2, 0.1, CARD.h / 2 + 1.7)); }, beat: 2 },
    boards: { hit: boardsHit, anchor: () => boardOf[2].centre(), beat: 2 },
    'board-a': { hit: boardAHit, anchor: () => { bA.grp.updateWorldMatrix(true, false); return bA.grp.localToWorld(new V3(0, bA.pH * 0.7, 0.3)); }, beat: 3 },
    horn: { hit: hornHit, anchor: () => { horn.updateWorldMatrix(true, false); return horn.localToWorld(new V3(1.6, 0, 0)); }, beat: 3 },
  };
  const labelAt = {
    consumer: () => consumer.top(),
    // on top of the back row's left bubble: the label goes up into the room the stream crossed, clear of the words
    // on the bubbles (labels are placed before the words on objects, so they cannot step aside for them)
    // (lever b: on top of the wider bubble about A, which is raised above that row)
    talkers: () => { const b = restB[S.lever === 'b' ? A_TALKER : 1].group; b.updateWorldMatrix(true, false); return b.localToWorld(new V3(-0.3, 0.62, 0.12)); },
    horn: () => { horn.updateWorldMatrix(true, false); return horn.localToWorld(new V3(1.2, 0.6, 0)); },
  };
  const bubbleC = (i) => () => { const b = restB[i].group; if (!b.visible) return null; b.updateWorldMatrix(true, false); return b.localToWorld(new V3(0, 0, 0.12)); };
  const decalAt = {
    ask: () => (S.ask > 0.6 ? (ask.group.updateWorldMatrix(true, false), ask.group.localToWorld(new V3(0, 0, 0.2))) : null),
    // the speakers keep their words from the moment they speak: the list's threads run back to them
    'talk-b': () => (S.words.talk ? bubbleC(SPEAKS[0])() : null),
    'talk-c': () => (S.words.talk ? bubbleC(SPEAKS[1])() : null),
    'talk-d': () => (S.words.talk && S.lever === 'a' ? bubbleC(SPEAKS[2])() : null),
    'talk-a': () => (S.words.talk && S.lever === 'b' ? bubbleC(A_TALKER)() : null),
    card: () => (S.words.card && S.lever === 'a' ? card.rowAnchors(4, { align: 'left' }) : null),
    'card-b': () => (S.words.card && S.lever === 'b' ? card.rowAnchors(4, { align: 'left' }) : null),
    'board-b': () => (S.words.boards ? boardOf[1].centre() : null),
    'board-c': () => (S.words.boards ? boardOf[2].centre() : null),
    'board-d': () => (S.words.boards && S.lever === 'a' ? boardOf[3].centre() : null),
    waves: () => (S.beat === 3 && S.waveLead >= 0 ? Wg(waves[S.waveLead].position) : null),
    'board-a': () => (S.words.a ? bA.centre() : null),
  };

  // ---- the shots: fixed points (the rest pose), so the framing never depends on where the motion is
  const consPts = [Wg(CP.clone().setY(deckY)), Wg(CP.clone().setY(deckY + CONS_H + 0.2))];
  // the face (brow, nose, chin) and the ear; the crown may be cropped, the dissolving back is left out
  const facePts = [restHead(0.3, 0.9, 0.02), restHead(0.37, 0.78, 0), restHead(0.3, 0.5, 0.05), restHead(0.03, 0.66, 0.31)];
  // the talkers from their knees up (the stools' feet may go under the frame's edge), with their bubbles
  const KNEE = TY + 2.4;
  const talkAt = (y) => TALK.flatMap((_, i) => [Wg(tPts[i].clone().setY(y)), Wg(tops[i].clone().add(new V3(0, i % 2 ? 2.9 : 1.6, 0)))]);
  const talkPts = talkAt(KNEE);
  // the outer edges of the bubbles and stools on the left
  talkPts.push(Wg(B_REST[0].clone().addScaledVector(new V3(sP, 0, -cP), -1.6)), Wg(B_REST[1].clone().addScaledVector(new V3(sP, 0, -cP), -1.6)), Wg(VP(TALK[0][0], TALK[0][1] - 0.9, KNEE)));
  const askPts = [Wg(VP(ASK_AT.u, ASK_AT.v + 2.7, ASK_AT.y)), Wg(VP(ASK_AT.u, ASK_AT.v - 2.7, ASK_AT.y + 1.1))];
  const cardPts = [Wg(CA.clone().add(new V3(0, 0, 0))), Wg(CA.clone().add(new V3(0, CARD.h, 0))), Wg(VP(CARD_AT.u, CARD_AT.v + CARD.w / 2, CARD_AT.y)), Wg(VP(CARD_AT.u, CARD_AT.v - CARD.w / 2, CARD_AT.y))];
  const boardPts = BOARDS.map((B) => { const p = VP(B.u, B.v); return Wg(p.setY(gy(p.x, p.z) + (B.post ?? BOARD.post) + BOARD.h)); });
  // A (beat 1): the asker, the face, the question.  B (beats 2–3): the talkers, the face from the brow down, the list
  // and the asker — close enough for the speakers' words and the list's rows to keep their size.  C (beat 4 and the
  // end): everything, the brands' boards above the head too.  On a desktop one shot holds it all.
  const A_PTS = [...consPts, ...facePts, ...askPts];
  const B_PTS = [...consPts, ...facePts, ...talkPts, ...cardPts];
  const C_PTS = [...B_PTS, ...boardPts];
  const shot = (phi, el, pts, margin) => ({ az: AZ0 + phi, el, anchors: () => pts, margin });
  // a phone held sideways (the phone layout under 560 px tall) has a short, wide frame: seen lower, the stack of
  // talkers, head and boards is flatter, so the words on the card and the boards keep their size
  const land = () => typeof innerWidth === 'number' && innerWidth > innerHeight && innerHeight < 560;
  const turns = (portrait, sideways) => ({
    get az() { return (land() ? sideways : portrait).az; },
    get el() { return (land() ? sideways : portrait).el; },
    anchors: () => (land() ? sideways : portrait).anchors(),
    margin: undefined,
  });
  const shots = {
    phone: [shot(PHI, 0.24, A_PTS), turns(shot(PHI, 0.32, B_PTS), shot(PHI, 0.26, B_PTS)), turns(shot(PHI, 0.32, C_PTS), shot(PHI, 0.3, C_PTS))],
    // the desktop frame has the room for the talkers' stools too
    desk: [shot(PHI - 0.05, 0.3, [...consPts, ...facePts, ...talkAt(TY), ...talkPts.slice(12), ...cardPts, ...boardPts])],
  };

  const lever = { fromBeat: 1, options: ['a', 'b'], def: 'a' };
  const REST = ['talkers', 'card', 'consumer', 'head', 'boards', 'board-a', 'horn'];
  const rest = () => pose(LAST, 1, lever.def);
  const ambient = () => { /* the shards drift in their shader; the held result stays still */ };

  const mouthW = () => headW(...MOUTH_H);
  const api = {
    id: 'oracle',
    group: g,
    zone: 'ai',
    anchor: restHead(0.05, 1.12, 0),
    pin: restHead(0.05, 1.0, 0),
    focus: { pos: Wg(VP(18, 0, 8)), r: 34 },
    beats: BEATS,
    shots,
    parts,
    labelAt,
    decalAt,
    lever,
    restParts: REST,
    mainActor: 'consumer',
    pose,
    rest,
    ambient,
    emphasize,
    update(t, dt) { ambient(t, dt); },
    // read by life.js (flows 2 and 3 end and start here) and by the gates' neighbours
    ear: restHead(...EAR_H),
    mouth: restHead(...MOUTH_H),
    cardWorld: Wg(CA.clone().add(new V3(0, CARD.h / 2, 0))),
    phoneWorld: Wg(CP.clone().setY(deckY + CONS_H * 0.62)),
    talkersWorld: tops.map((p) => Wg(p)),
    _dbg: { mouthW, hg, consumer: consumer.group, people: people.map((p) => p.group), card: card.group },
  };
  rest();
  emphasize(null);
  return api;
}
