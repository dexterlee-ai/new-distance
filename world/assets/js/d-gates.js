// 授權之橋 · The next step (articles 15, 18, 22) — a bridge across the agent sea, shore → heartland.
// Four gates stand on it: 觀察／理解 → 推薦 → 決策 → 行動 (22's permission layers).  Each gate has a door for people
// and a socket for agents (18: from UX to AX).  Agent drones carry tasks only as far as they are authorised —
// retail runs through all four, others stop at the second; at 決策 and 行動 a person confirms.
// The deck itself evolves (15): rigid slabs near the shore (static), hinged ones mid-span (adaptive), and near the
// heartland tiles that assemble themselves just ahead of whoever is walking (generative).
import * as THREE from '../vendor/three.module.min.js';
import { ink, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, TAU, smooth, clamp, figureGeo, _m, _q, _v, _s, _e } from './kit.js';
import { SEA_Y } from './terrain.js';

export const GATE_NAMES = ['觀察／理解', '推薦', '決策', '行動'];

export function buildGates() {
  const g = new THREE.Group();
  g.name = 'gates';
  const R = rng(22);
  const A = polar(75, 64), B = polar(41, 92);
  const mid = A.clone().lerp(B, 0.5);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const p = A.clone().lerp(B, t);
    // bow the bridge sideways a little and lift it in an arc over the water
    const side = new THREE.Vector3(-(B.z - A.z), 0, B.x - A.x).normalize().multiplyScalar(Math.sin(t * Math.PI) * 5);
    p.add(side);
    p.y = (1 - t) * A.y + t * B.y + Math.sin(t * Math.PI) * 3.2 + 0.4;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const up = new THREE.Vector3(0, 1, 0);

  // ---- deck tiles
  const NT = 58;
  const tileGeo = new THREE.BoxGeometry(1.15, 0.45, 3.4);
  const tiles = new THREE.InstancedMesh(tileGeo, ink({ shade: 1.0, bias: 0.05 }), NT);
  tiles.castShadow = tiles.receiveShadow = true;
  g.add(tiles);
  const tileInfo = [];
  for (let i = 0; i < NT; i++) {
    const t = (i + 0.5) / NT;
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const zone = t < 0.36 ? 0 : t < 0.68 ? 1 : 2;  // static / adaptive / generative
    tileInfo.push({ t, p, tg, zone, ph: R() });
    setInst(tiles, i, 1, zone === 2 ? 1 : 0, -1);
  }
  // piers under the static part
  for (let i = 0; i < 4; i++) {
    const p = curve.getPointAt(0.05 + i * 0.09);
    const h = p.y - (SEA_Y - 2);
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, h, 8), ink({ shade: 0.7 }));
    pier.position.set(p.x, SEA_Y - 2 + h / 2, p.z);
    pier.castShadow = true;
    g.add(pier);
  }

  // ---- four gates: half door (pencil) for people, half socket (type) for agents
  const gates = [];
  const gt = [0.2, 0.4, 0.6, 0.8];
  gt.forEach((t, i) => {
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const G = new THREE.Group();
    G.position.copy(p);
    G.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(tg.x, 0, tg.z).normalize());
    g.add(G);
    const H = 6.2 - i * 0.3;
    const postGeo = new THREE.BoxGeometry(0.6, H, 0.6);
    const human = ink({ shade: 0.95 });
    const agent = ink({ style: 1, shade: 0.55, accent: 'teal' });
    const pL = new THREE.Mesh(postGeo, human); pL.position.set(0, H / 2, -2.2); G.add(pL);
    const pR = new THREE.Mesh(postGeo, agent); pR.position.set(0, H / 2, 2.2); G.add(pR);
    const pM = new THREE.Mesh(new THREE.BoxGeometry(0.35, H - 0.6, 0.35), ink({ shade: 0.4 })); pM.position.set(0, (H - 0.6) / 2, 0); G.add(pM);
    // door arch on the people side
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.18, 6, 24, Math.PI), human);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(0, H - 1.6, -1.1);
    G.add(arch);
    // socket frame on the agent side (a square port)
    const sock = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.2, 4, 4), agent);
    sock.rotation.set(0, Math.PI / 2, Math.PI / 4);
    sock.position.set(0, H - 1.8, 1.1);
    G.add(sock);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 5.2), ink({ shade: 0.85 }));
    lintel.position.set(0, H + 0.3, 0);
    G.add(lintel);
    // signal lamp: iris when the agent is cleared through, red when it must stop
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), ink({ shade: 1, bias: 0.3 }));
    lamp.position.set(0, H + 1.0, 0);
    G.add(lamp);
    [pL, pR, pM, arch, sock, lintel].forEach((m) => { m.castShadow = true; });
    gates.push({ G, lamp, t, top: p.clone().setY(p.y + H + 1) });
  });

  // ---- agent drones: a cube cluster each, travelling only as deep as their authorisation
  const drones = [];
  const depth = [4, 2, 4, 3, 2, 4];   // how many gates each task is cleared through
  const droneGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const dmesh = new THREE.InstancedMesh(droneGeo, ink({ style: 1, shade: 0.5, accent: 'teal' }), depth.length * 5);
  dmesh.castShadow = true;
  g.add(dmesh);
  depth.forEach((d, i) => drones.push({ d, off: i / depth.length, speed: 0.035 + R() * 0.01 }));
  // people walking the deck
  const NW = 9;
  const walkers = new THREE.InstancedMesh(figureGeo(0), ink({ shade: 0.4 }), NW);
  walkers.castShadow = true;
  g.add(walkers);
  const walk = Array.from({ length: NW }, (_, i) => ({ off: i / NW, lane: (R() - 0.5) * 1.6, speed: 0.012 + R() * 0.006 }));

  const tmp = new THREE.Vector3();
  function deckY(t) { return curve.getPointAt(clamp(t, 0, 1)).y + 0.25; }
  function update(t, dt) {
    // walkers move shore → heartland; the generative tiles assemble just ahead of the leading walker
    let lead = 0;
    walk.forEach((W, i) => {
      const u = (W.off + t * W.speed) % 1;
      // hesitate at each gate
      let uu = u;
      for (const G of gates) { const d = u - G.t; if (d > -0.02 && d < 0.02) uu = G.t - 0.02 + (d + 0.02) * 0.25; }
      const p = curve.getPointAt(uu), tg = curve.getTangentAt(uu);
      const side = tmp.crossVectors(tg, up).normalize().multiplyScalar(W.lane - 0.6);
      _m.compose(_v.set(p.x + side.x, p.y + 0.25, p.z + side.z), _q.identity(), _s.setScalar(1.2));
      walkers.setMatrixAt(i, _m);
      if (uu > lead && uu < 0.98) lead = uu;
    });
    walkers.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NT; i++) {
      const I = tileInfo[i];
      let y = 0, rz = 0, vis = 1, fly = 0;
      if (I.zone === 1) { rz = Math.sin(t * 1.4 + I.t * 20) * 0.08; y = Math.sin(t * 1.4 + I.t * 20) * 0.15; }
      if (I.zone === 2) {
        // assemble ahead of the lead walker, dissolve behind the last
        const ahead = I.t - lead;
        fly = ahead > 0.12 ? 1 : ahead > 0.02 ? (ahead - 0.02) / 0.1 : 0;
        fly = fly * fly;
      }
      const p = I.p;
      _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), I.tg);
      _q.multiply(new THREE.Quaternion().setFromEuler(_e.set(rz, 0, 0)));
      _m.compose(_v.set(p.x, p.y + y - fly * 5.5, p.z + Math.sin(I.ph * 9) * fly * 2), _q, _s.set(1, 1, 1).multiplyScalar(Math.max(0.001, 1 - fly * 0.7)));
      tiles.setMatrixAt(i, _m);
    }
    tiles.instanceMatrix.needsUpdate = true;

    // drones: each travels until its last authorised gate, waits, then returns to the shore
    let k = 0;
    drones.forEach((D, i) => {
      const cyc = (D.off + t * D.speed) % 1;
      const stopT = gates[D.d - 1].t + (D.d === 4 ? 0.17 : 0.05);
      // out (0..0.55), hold (0.55..0.75), back (0.75..1)
      const u = cyc < 0.55 ? (cyc / 0.55) * stopT : cyc < 0.75 ? stopT : stopT * (1 - (cyc - 0.75) / 0.25);
      const p = curve.getPointAt(clamp(u, 0, 1)), tg = curve.getTangentAt(clamp(u, 0, 1));
      const side = tmp.crossVectors(tg, up).normalize().multiplyScalar(1.4);
      const hover = 2.6 + Math.sin(t * 3 + i) * 0.25;
      for (let c = 0; c < 5; c++) {
        const ox = [0, 0.55, -0.55, 0, 0][c], oy = [0, 0, 0, 0.55, -0.55][c];
        _q.setFromEuler(_e.set(t * 0.8 + i, t * 0.6, 0));
        _m.compose(_v.set(p.x + side.x + ox * 0.6, p.y + hover + oy * 0.6, p.z + side.z), _q, _s.setScalar(c === 0 ? 1.1 : 0.75));
        dmesh.setMatrixAt(k++, _m);
      }
    });
    dmesh.instanceMatrix.needsUpdate = true;
    // gate lamps: blink iris when a drone is cleared through, red at a drone's last gate
    gates.forEach((G, gi) => {
      let state = 0;
      drones.forEach((D) => {
        const cyc = (D.off + t * D.speed) % 1;
        if (cyc > 0.55 && cyc < 0.75) state = Math.max(state, D.d - 1 === gi ? 2 : D.d - 1 > gi ? 1 : 0);
      });
      G.lamp.material.userData.u.uAccent.value = state === 2 ? ACCENT.red : state === 1 ? ACCENT.iris : 0;
    });
  }

  const GN = gates.map((G, i) => ({ t: `${i + 1} ${GATE_NAMES[i]}`, p: G.top.clone().setY(G.top.y + 0.6) }))
    .concat([['固定路徑 Static', 0.1], ['適應式 Adaptive', 0.5], ['生成式 Generative', 0.9]].map(([t, u]) => ({ t, p: curve.getPointAt(u).clone().add(new THREE.Vector3(0, 1.4, 0)), mono: true })));
  const notes = () => GN;
  const tgt = curve.getPointAt(0.5);
  // look at the bridge broadside from the core's side, so the four gates read left to right, 1 → 4
  const dir = B.clone().sub(A).setY(0).normalize();
  let side = new THREE.Vector3(-dir.z, 0, dir.x);
  if (side.dot(tgt.clone().setY(0)) > 0) side.negate();
  const viewAz = Math.atan2(side.z, side.x) + 0.35;
  const look = curve.getPointAt(0.42);   // a little toward the shore, so the Static deck stays in frame
  return {
    id: 'gates',
    group: g,
    notes,
    anchor: tgt.clone().setY(tgt.y + 12),
    gateTops: gates.map((G) => G.top),
    view: { target: [look.x, look.y + 2.5, look.z], az: viewAz, el: 0.26, dist: 64 },
    update,
    curve,
  };
}
