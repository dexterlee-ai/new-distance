// 答案引擎 · Share of Choice Context (articles 13, 19, 9) — in the agent sea.
// A classical head rises from the ASCII sea: David, reconstructed in 3D from the publication's own pencil drawing
// and drawn here in graphite.  Its back breaks into cubes that drift off as type — a model made from people,
// turning into machine (the AI chapter's dissolving face).  It faces the heartland and listens: what people say
// about brands flows into its ear as speech marks (9); what comes out is a short ranked answer with room for few
// brands (13, 19), drawn as five slots.  A five-step stair climbs behind it toward the ear: i-Proof.
import * as THREE from '../vendor/three.module.min.js';
import { ink, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, TAU, _m, _q, _v, _s, _e } from './kit.js';
import { SEA_Y } from './terrain.js';

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

const H = 30;          // bust height in world units (the chest stays under water)

export function buildOracle({ headGeo, shards }) {
  const g = new THREE.Group();
  g.name = 'oracle';
  const at = polar(57, 330);
  g.position.set(at.x, SEA_Y - 0.4 * H, at.z);
  {
    // face the people — turned 25° toward the arriving camera, so the face is seen three-quarter while it
    // still looks out over the heartland
    const dir = new THREE.Vector3(-at.x, 0, -at.z).normalize();
    g.rotation.y = Math.atan2(-dir.z, dir.x) + 0.436;
  }
  const R = rng(19);

  // ---- the head, in graphite; blocky holes open toward the back where it breaks into cubes
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
        // viewer's upper left (view space), with grazing silhouettes (nose, brow, lips) darkened like a contour
        vec3 Lk = normalize(vec3(-0.45, 0.62, 0.62));
        float ndv = abs(dot(normal, normalize(vViewPosition)));
        sh = clamp(0.34 + 0.8 * max(dot(normal, Lk), 0.0), 0.0, 1.0) * mix(0.55, 1.0, smoothstep(0.05, 0.4, ndv));
        // inside surfaces seen through the breaks read darker
        if (!gl_FrontFacing) sh *= 0.45;
      `,
    },
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.scale.setScalar(H);
  head.castShadow = true;
  g.add(head);

  // ---- shards: cubes leaving the back of the head, typeset and teal
  const pts = shards.pts;
  const cube = new THREE.BoxGeometry(0.62, 0.62, 0.62);
  const shardMesh = new THREE.InstancedMesh(cube, ink({ style: 1, accent: 'teal', shade: 0.85 }), pts.length);
  const S = pts.map(([x, y, z]) => ({
    p: [x * H, y * H, z * H], ph: R(), amp: 2 + R() * 11 * Math.min(1, -x * 3),
    dir: [-(0.6 + R() * 0.8), (R() - 0.35) * 0.7, (R() - 0.5) * 1.1], sc: 0.6 + R() * 0.7,
  }));
  S.forEach((c, i) => setInst(shardMesh, i, 0.7 + R() * 0.4, R() < 0.55 ? 1 : 0, R() < 0.6 ? ACCENT.teal : 0));
  shardMesh.castShadow = true;
  g.add(shardMesh);

  // ---- answer slots: five short panels in front of the face (an AI answer has room for few brands)
  const slots = [];
  const slotGeo = new THREE.BoxGeometry(0.3, 1.8, 5.6);
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(slotGeo, ink({ shade: 1.0, bias: 0.1 }));
    m.position.set(17 + i * 0.3, 0.83 * H - i * 2.6, 0);
    m.rotation.y = 0.55;   // turned toward the arriving reader, so the boards read as boards
    m.castShadow = true;
    g.add(m);
    slots.push(m);
  }

  // ---- i-Proof stair: five blocks climbing out of the water toward the ear, from behind the head's line of sight
  // (on the ear's side, below it: it never stands between the reader and the face)
  const steps = [];
  const sea = 0.4 * H;
  for (let i = 0; i < 5; i++) {
    const h = 1.4 + i * 1.5;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, h, 1.8), ink({ shade: 0.95 }));
    m.position.set(-7.8 + i * 1.8, sea + h / 2 - 1.0, -13.1 + i * 0.25);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    steps.push(m);
  }

  // ---- three rings on the water: System / Community / Memory share
  const ringMat = [ink({ style: 1, shade: 0.45 }), ink({ shade: 0.4 }), ink({ shade: 0.3, accent: 'lime' })];
  const rings = [17, 22, 27].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.18 + i * 0.05, 6, 160), ringMat[i]);
    m.rotation.x = Math.PI / 2;
    m.position.set(2, sea + 1.4, 0);
    g.add(m);
    return m;
  });

  function update(t) {
    // shards drift out and come back: the model keeps forming and re-forming
    for (let i = 0; i < S.length; i++) {
      const c = S[i];
      const k = 0.5 + 0.5 * Math.sin(t * 0.22 + c.ph * TAU);
      const a = c.amp * k;
      _q.setFromEuler(_e.set(k * c.ph * 4, k * c.ph * 3, 0));
      _m.compose(_v.set(c.p[0] + c.dir[0] * a, c.p[1] + c.dir[1] * a, c.p[2] + c.dir[2] * a), _q, _s.setScalar(c.sc * (1 - k * 0.45)));
      shardMesh.setMatrixAt(i, _m);
    }
    shardMesh.instanceMatrix.needsUpdate = true;
    slots.forEach((m, i) => { m.position.z = Math.sin(t * 0.8 - i * 0.6) * 0.25; });
    rings.forEach((m, i) => { m.rotation.z = t * (0.03 + i * 0.015) * (i % 2 ? -1 : 1); });
  }

  const wp = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  g.updateMatrixWorld(true);
  const ON = [
    { t: '答案位置有限', p: wp(17.3, 0.83 * H + 2.2, 0) },
    { t: 'i-Proof 五階', p: wp(-4.2, sea + 8.6, -12.6) },
    { t: '耳朵：讀的是別人怎麼說你', p: wp(1.6, 0.62 * H + 3.2, -6.6) },
    ...[[17, -0.62, 'System Share'], [22, -0.86, 'Community Share'], [27, -1.08, 'Memory Share']]
      .map(([r, a, t]) => ({ t, p: wp(2 + r * Math.cos(a), sea + 2.2, r * Math.sin(a)), mono: true })),
  ];
  const notes = () => ON;
  return {
    id: 'oracle',
    group: g,
    notes,
    anchor: wp(0, H + 3, 0),
    ear: wp(1.6, 0.63 * H, -6.2),
    mouth: wp(0.25 * H, 0.6 * H, 0),
    slotsWorld: slots.map((m) => wp(m.position.x, m.position.y, m.position.z)),
    // three-quarter view of the face from the ear side, the answer slots on the left, the dissolving back on the right
    view: { target: [wp(8, 0, 0).x, SEA_Y + 10.5, wp(8, 0, 0).z], az: -g.rotation.y - 1.03, el: 0.19, dist: 68 },
    update,
    slots,
    steps,
    rings,
  };
}
