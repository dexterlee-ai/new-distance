// 交付工坊與增長港 · Delivery (articles 20, 21, 4) — on the shore.
// A hopper pours out generated stock: identical grey typeset cubes, the average of the market (AI Slop).
// The line runs it through SLIP — Spec (a mould press), Line (modules snapped on), Inspection (three human
// gates; some pieces are rejected), Pattern (a return pipe feeding winners back to the spec) — and what leaves
// the slipway is a paper boat with its own colour (20).  The boats are built here, not just steered (21).
// They sail out through the Growth Triangle — 演算法 · 人心 · 文化 — standing in the harbour mouth (4).
import * as THREE from '../vendor/three.module.min.js';
import { ink, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, TAU, smooth, clamp, boatGeo, tube, _m, _q, _v, _s, _e } from './kit.js';
import { heightAt, SEA_Y } from './terrain.js';

export function buildFoundry() {
  const g = new THREE.Group();
  g.name = 'foundry';
  const TH = 288, RR = 84;
  const base = polar(RR, TH);
  g.position.copy(base);
  const inward = new THREE.Vector3(-base.x, 0, -base.z).normalize();
  g.rotation.y = Math.atan2(-inward.z, inward.x);   // local +x → toward the sea / people
  g.scale.setScalar(1.3);
  g.updateMatrixWorld(true);
  const groundAt = (x, z) => { const w = g.localToWorld(new THREE.Vector3(x, 0, z)); return heightAt(w.x, w.z) - base.y; };
  const R = rng(20);

  // the line runs along local z (tangent to the shore), then turns down the slipway toward +x
  const lineY = 1.6;
  // ---- hall with a saw-tooth roof
  const hall = new THREE.Group();
  g.add(hall);
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 4.2, 20), ink({ shade: 0.9, bias: 0.32 }));
  body.position.set(-3, 2.1, 0);
  hall.add(body);
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 2.2, 7, 3, 1), ink({ shade: 0.85, bias: 0.25 }));
    tooth.rotation.set(0, 0, Math.PI / 2);
    tooth.rotation.x = Math.PI / 6;
    tooth.position.set(-3, 5.0, -8 + i * 4);
    tooth.scale.set(1, 1, 0.95);
    hall.add(tooth);
  }
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 9, 12), ink({ shade: 0.85, bias: 0.25 }));
  chim.position.set(-5.5, 6.5, 7.5);
  hall.add(chim);
  hall.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });

  // ---- hopper of generated stock (typeset, all the same)
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 1.0, 4.5, 16, 1, true), ink({ shade: 0.85, side: THREE.DoubleSide }));
  hopper.position.set(1.5, 6.2, -13);
  hopper.castShadow = true;
  g.add(hopper);
  const heap = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), ink({ style: 1, shade: 0.55 }), 60);
  for (let i = 0; i < 60; i++) {
    const a = R() * TAU, r = Math.sqrt(R()) * 3.0;
    _q.setFromEuler(_e.set(R(), R(), R()));
    _m.compose(_v.set(1.5 + Math.cos(a) * r, 8.2 + R() * 1.6, -13 + Math.sin(a) * r), _q, _s.setScalar(1));
    heap.setMatrixAt(i, _m);
  }
  g.add(heap);

  // ---- conveyor path: from under the hopper along z, then out to the slipway (+x) and into the sea
  const seaLocal = (SEA_Y - base.y) / g.scale.y;
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.5, lineY, -13), new THREE.Vector3(1.5, lineY, -6), new THREE.Vector3(1.5, lineY, 2),
    new THREE.Vector3(1.8, lineY, 8), new THREE.Vector3(5, lineY - 0.2, 11), new THREE.Vector3(9.5, lineY - 2.2, 11.5),
    new THREE.Vector3(13.5, seaLocal + 0.3, 12),
  ], false, 'centripetal');
  const belt = new THREE.Mesh(new THREE.TubeGeometry(path, 160, 0.9, 4, false), ink({ shade: 0.6 }));
  belt.scale.set(1, 0.35, 1);
  belt.position.y = lineY * 0.65 - 0.3;
  g.add(belt);
  const beltLine = new THREE.Mesh(new THREE.TubeGeometry(path, 160, 0.12, 4, false), ink({ shade: 0.1 }));
  g.add(beltLine);

  // ---- stations along the line
  const st = (z) => new THREE.Vector3(1.5, lineY, z);
  // S · Spec: a mould press that stamps every piece
  const press = new THREE.Group();
  press.position.copy(st(-7));
  const frame = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.3, 4, 4), ink({ shade: 0.85 }));
  frame.rotation.set(0, Math.PI / 2, Math.PI / 4);
  frame.position.y = 1.6;
  press.add(frame);
  const ram = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), ink({ shade: 0.35 }));
  ram.position.y = 3.0;
  press.add(ram);
  g.add(press);
  // L · Line: modular arms snapping parts on
  const arms = [];
  for (const z of [-2.5, 0.5]) {
    const arm = new THREE.Group();
    arm.position.copy(st(z)).add(new THREE.Vector3(-2.4, 0, 0));
    const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.5), ink({ shade: 0.8 }));
    a1.position.y = 1.7;
    arm.add(a1);
    const a2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.45), ink({ shade: 0.75 }));
    a2.position.set(1.2, 3.3, 0);
    arm.add(a2);
    g.add(arm);
    arms.push({ arm, a2 });
  }
  // I · Inspection: three gates (brand · licence & law · media readiness), each with an eye
  const eyes = [];
  [4, 5.8, 7.6].forEach((z, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.2, 6, 24, Math.PI), ink({ shade: 0.9 }));
    ring.position.copy(st(z));
    ring.rotation.y = 0;
    g.add(ring);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), ink({ shade: 1, bias: 0.25, accent: 'iris' }));
    eye.position.copy(st(z)).add(new THREE.Vector3(0, 1.9, 0));
    g.add(eye);
    eyes.push(eye);
  });
  // reject bin
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 1.8, 12, 1, true), ink({ shade: 0.7, side: THREE.DoubleSide }));
  bin.position.set(-1.6, 0.9, 6.3);
  g.add(bin);
  // P · Pattern: a return pipe from the end of inspection back over the hall to the spec press
  const pipe = new THREE.Mesh(tube([
    new THREE.Vector3(1.5, 2.6, 8.4), new THREE.Vector3(1.0, 7.5, 6), new THREE.Vector3(-0.5, 9.5, 0),
    new THREE.Vector3(0.6, 7.6, -5.5), new THREE.Vector3(1.5, 4.8, -7),
  ], 0.35, 80, 8), ink({ shade: 0.7, accent: 'lime' }));
  pipe.castShadow = true;
  g.add(pipe);
  [press, ...arms.map((a) => a.arm)].forEach((o) => o.traverse((m) => { if (m.isMesh) m.castShadow = true; }));

  // ---- items on the line: cube → (Spec) boat → (Inspection) passed or rejected → launched
  const NI = 26;
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const items = new THREE.InstancedMesh(cubeGeo, ink({ style: 1, shade: 0.55 }), NI);
  const boats = new THREE.InstancedMesh(boatGeo(), ink({ shade: 1.0, bias: 0.08, side: THREE.DoubleSide }), NI);
  items.castShadow = boats.castShadow = true;
  items.frustumCulled = boats.frustumCulled = false;
  g.add(items, boats);
  const acc = [ACCENT.lime, ACCENT.pink, ACCENT.teal, 0, ACCENT.lime, ACCENT.pink];
  const spec = Array.from({ length: NI }, (_, i) => ({ off: i / NI, rej: R() < 0.22, acc: acc[i % acc.length] }));
  spec.forEach((S, i) => setInst(boats, i, 1, 0, S.acc));
  const tAt = (z) => { // parameter where the line passes a z (first straight part)
    let best = 0, bd = 1e9;
    for (let i = 0; i <= 200; i++) { const p = path.getPointAt(i / 200); const d = Math.abs(p.z - z) + (p.x > 2.5 ? 50 : 0); if (d < bd) { bd = d; best = i / 200; } }
    return best;
  };
  const T_SPEC = tAt(-7), T_INSP = tAt(5.8);

  // ---- Growth Triangle standing in the harbour mouth
  const tri = new THREE.Group();
  tri.position.set(22, seaLocal, 12.5);
  g.add(tri);
  const triH = 9.5, triR = 5.2;
  const vtx = [0, 1, 2].map((i) => new THREE.Vector3(0, i === 0 ? triH : 1.2, i === 0 ? 0 : (i === 1 ? -triR : triR)));
  const vMat = [ink({ style: 1, shade: 0.5 }), ink({ shade: 0.6 }), ink({ shade: 0.7, accent: 'lime' })];
  const vNames = ['演算法', '人心', '文化'];
  vtx.forEach((v, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), vMat[i]);
    s.position.copy(v);
    s.castShadow = true;
    tri.add(s);
    const n = vtx[(i + 1) % 3];
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, v.distanceTo(n), 6), ink({ shade: 0.3 }));
    bar.position.copy(v).add(n).multiplyScalar(0.5);
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.clone().sub(v).normalize());
    bar.castShadow = true;
    tri.add(bar);
  });
  for (const z of [-triR, triR]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 6), ink({ shade: 0.5 }));
    leg.position.set(0, -1, z);
    tri.add(leg);
  }

  function update(t) {
    const sp = 0.028;
    for (let i = 0; i < NI; i++) {
      const S = spec[i];
      const u = (S.off + t * sp) % 1;
      let p = path.getPointAt(u);
      const tg = path.getTangentAt(u);
      let isBoat = u > T_SPEC;
      let drop = 0;
      // rejected pieces fall into the bin after inspection
      if (S.rej && u > T_INSP) {
        const k = clamp((u - T_INSP) / 0.04);
        p = p.clone().lerp(new THREE.Vector3(-1.6, 0.6, 6.3), k);
        drop = k;
        if (k >= 1) { p.y = -50; }
      }
      const s = isBoat ? 0.95 : 0.85;
      _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(tg.x, 0, tg.z).normalize());
      if (isBoat) {
        _m.compose(_v.set(p.x, p.y + 0.15, p.z), _q, _s.setScalar(s * (1 - drop * 0.5)));
        boats.setMatrixAt(i, _m);
        _m.makeScale(0, 0, 0); items.setMatrixAt(i, _m);
      } else {
        _q.multiply(new THREE.Quaternion().setFromEuler(_e.set(0, u * 9, 0)));
        _m.compose(_v.set(p.x, p.y + 0.5, p.z), _q, _s.setScalar(s));
        items.setMatrixAt(i, _m);
        _m.makeScale(0, 0, 0); boats.setMatrixAt(i, _m);
      }
    }
    items.instanceMatrix.needsUpdate = true;
    boats.instanceMatrix.needsUpdate = true;
    // press stamps, arms swing, eyes blink in turn
    ram.position.y = 3.0 - Math.pow(Math.max(0, Math.sin(t * 3.2)), 8) * 1.4;
    arms.forEach((A, i) => { A.a2.rotation.y = Math.sin(t * 2.4 + i * 1.7) * 0.6; });
    eyes.forEach((e, i) => { e.scale.y = Math.sin(t * 1.3 + i * 2.1) > 0.97 ? 0.15 : 1; });
    tri.rotation.y = Math.sin(t * 0.3) * 0.05;
  }

  const FN0 = [['生成的平均值', 1.5, 11.2, -13], ['S 規格 Spec', 1.5, 6.4, -7], ['L 產線 Line', -1, 5.4, -1], ['I 檢驗 Inspection', 1.5, 5.6, 5.8], ['P 模式 Pattern', -0.5, 11.4, 0]];
  const wp = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  const tgt = wp(10, 2, 6);
  const FN = FN0.map(([t, x, y, z]) => ({ t, p: wp(x, y, z) }))
    .concat(vNames.map((n, i) => ({ t: n, p: wp(22 + vtx[i].x, seaLocal + vtx[i].y + 1.8, 12.5 + vtx[i].z) })));
  const notes = () => FN;
  return {
    id: 'foundry',
    group: g,
    notes,
    anchor: wp(0, 16, 0),
    slipway: wp(13.5, seaLocal + 0.3, 12),
    triangle: wp(22, seaLocal + 5, 12.5),
    triNames: vNames.map((n, i) => ({ name: n, pos: wp(22 + vtx[i].x, seaLocal + vtx[i].y + 1.6, 12.5 + vtx[i].z) })),
    // from the sea side, looking back at the shore: the line runs in front of the hall (not hidden behind its
    // roof) and the Growth Triangle stands whole in the harbour mouth below it
    view: { target: [tgt.x, tgt.y, tgt.z], az: (TH * Math.PI) / 180 - Math.PI + 0.55, el: 0.55, dist: 82 },
    update,
  };
}
