// 文化暗流 · The undercurrent (article 16) — beneath the shore, under the world disk.
// On the surface: a company ship run aground, its AI engine — a big propeller — spinning in the air.
// Below the disk: the iceberg of culture (失業恐懼、權力焦慮、穀倉效應、層級慣性) and two currents that never meet:
// a warm upper flow (in Taiwan, leaders feel 19% more positive about the transformation) and a cold lower one (the front line).
// Three pipes go down — Check · Connect · Cultivate — and while they pulse, the two currents slowly align.
// The camera dives under the disk to see it; the page turns to night (the chapter-opener's dark spreads).
import * as THREE from '../vendor/three.module.min.js';
import { ink, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, TAU, smooth, clamp, boatGeo, tube, _m, _q, _v, _s, _e } from './kit.js';
import { heightAt, BASE_Y, R as WR } from './terrain.js';
import { fbm } from './terrain.js';

export function buildUnder() {
  const g = new THREE.Group();
  g.name = 'under';
  const TH = 232;
  const R = rng(16);
  const a = (TH * Math.PI) / 180;
  const ice = polar(68, TH);
  const iceC = new THREE.Vector3(ice.x, BASE_Y - 15, ice.z);

  // ---- the iceberg below the disk (an inverted, noisy mass)
  const ig = new THREE.IcosahedronGeometry(1, 5);
  const p = ig.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = fbm(x * 1.6 + 4, z * 1.6 + y * 1.3, 4);
    const down = y < 0 ? 1 + (-y) * 0.9 : 0.55;
    const r = 0.75 + n * 0.55;
    p.setXYZ(i, x * r * 16, y * r * 14 * down, z * r * 13);
  }
  ig.computeVertexNormals();
  const berg = new THREE.Mesh(ig, ink({ shade: 0.62, flat: true }));
  berg.position.copy(iceC);
  berg.castShadow = false;
  g.add(berg);

  // ---- two currents around it: dashes flowing on rings
  const NDASH = 140;
  const dashGeo = new THREE.BoxGeometry(2.2, 0.35, 0.35);
  // seen only from under the disk, far below the district's surface anchor: keep their colour at full strength
  const upper = new THREE.InstancedMesh(dashGeo, ink({ shade: 0.6, accent: 'red', focus: false }), NDASH);
  const lower = new THREE.InstancedMesh(dashGeo, ink({ shade: 0.6, accent: 'teal', focus: false }), NDASH);
  upper.frustumCulled = lower.frustumCulled = false;
  g.add(upper, lower);
  const dU = Array.from({ length: NDASH }, () => ({ a: R() * TAU, r: 22 + R() * 9, y: (R() - 0.5) * 2.5, s: 0.8 + R() * 0.4 }));
  const dL = Array.from({ length: NDASH }, () => ({ a: R() * TAU, r: 20 + R() * 10, y: (R() - 0.5) * 2.5, s: 0.8 + R() * 0.4 }));

  // ---- 3C: three pipes from the shore surface down to the ice
  const pipes = [];
  const names = ['Check', 'Connect', 'Cultivate'];
  [-6, 0, 6].forEach((da, i) => {
    const top = polar(84, TH + da);
    const pts = [new THREE.Vector3(top.x, top.y + 3, top.z), new THREE.Vector3(top.x, BASE_Y - 1, top.z),
      new THREE.Vector3((top.x + iceC.x) / 2, BASE_Y - 8, (top.z + iceC.z) / 2), iceC.clone().add(new THREE.Vector3((i - 1) * 5, 6, 0))];
    const m = new THREE.Mesh(tube(pts, 0.55, 60, 8), ink({ shade: 0.85 }));
    g.add(m);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 12), ink({ shade: 0.4, accent: 'lime' }));
    cap.position.copy(pts[0]);
    g.add(cap);
    pipes.push({ m, cap, name: names[i], top: pts[0] });
  });

  // ---- on the surface: a ship run aground with its propeller spinning in the air
  const shipPos = polar(88, TH - 1);
  const ship = new THREE.Group();
  ship.position.copy(shipPos);
  ship.rotation.y = -a + Math.PI;
  g.add(ship);
  const hull = new THREE.Mesh(boatGeo(), ink({ shade: 0.95, side: THREE.DoubleSide }));
  hull.scale.set(6, 5, 6);
  hull.position.y = -0.4;
  hull.rotation.z = 0.06;
  ship.add(hull);
  const mastPivot = new THREE.Group();
  mastPivot.position.set(-6.4, 4.8, 0);
  ship.add(mastPivot);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 12), ink({ shade: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  mastPivot.add(hub);
  const prop = new THREE.Group();
  mastPivot.add(prop);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 1.3), ink({ style: 1, shade: 0.55, accent: 'teal' }));
    blade.geometry.translate(0, 2.2, 0);
    blade.rotation.x = (i / 3) * TAU;
    blade.rotation.y = 0.35;
    prop.add(blade);
  }
  ship.traverse((m) => { if (m.isMesh) m.castShadow = true; });

  function update(t, dt) {
    // engines race on the surface, going nowhere
    prop.rotation.x = t * 9;
    // currents: opposite directions, slowly aligning while 3C pulses (a 24 s cycle)
    const cyc = (t % 24) / 24;
    const align = smooth(0.35, 0.75, cyc) * (1 - smooth(0.9, 1, cyc));
    const gap = 9 * (1 - align);               // vertical gap between the two flows
    for (let i = 0; i < NDASH; i++) {
      const U = dU[i];
      U.a += dt * 0.18 * U.s;
      const ua = U.a;
      const uy = iceC.y + 4 + gap * 0.6 + U.y + Math.sin(ua * 3 + t) * 0.6;
      _q.setFromEuler(_e.set(0, -ua - Math.PI / 2, 0));
      _m.compose(_v.set(iceC.x + Math.cos(ua) * U.r, uy, iceC.z + Math.sin(ua) * U.r), _q, _s.set(U.s, 1, 1));
      upper.setMatrixAt(i, _m);
      const L = dL[i];
      L.a += dt * 0.18 * L.s * (1 - 2 * (1 - align));  // opposite direction until aligned
      const la = L.a;
      const ly = iceC.y - 6 - gap * 0.4 + L.y + Math.sin(la * 2 - t) * 0.6;
      _q.setFromEuler(_e.set(0, -la - Math.PI / 2, 0));
      _m.compose(_v.set(iceC.x + Math.cos(la) * L.r, ly, iceC.z + Math.sin(la) * L.r), _q, _s.set(L.s, 1, 1));
      lower.setMatrixAt(i, _m);
    }
    upper.instanceMatrix.needsUpdate = true;
    lower.instanceMatrix.needsUpdate = true;
    // 3C pulses in turn
    pipes.forEach((P, i) => {
      const on = smooth(0.12 + i * 0.12, 0.2 + i * 0.12, cyc) * (1 - smooth(0.85, 0.95, cyc));
      P.cap.material.userData.u.uAccent.value = on > 0.5 ? ACCENT.lime : 0;
      P.cap.scale.y = 1 + on * 0.6;
    });
    // the iceberg's base melts a little while they align
    berg.scale.setScalar(1 - align * 0.12);
  }

  const UN = pipes.map((P, i) => ({ t: ['Check 健檢', 'Connect 連結', 'Cultivate 培養'][i], p: P.top.clone().add(new THREE.Vector3(0, 2.6, 0)) }))
    .concat([
      { t: '空轉的 AI 引擎', p: shipPos.clone().add(new THREE.Vector3(0, 12, 0)) },
      { t: '台灣高層：正面感受高出 19%', p: iceC.clone().add(new THREE.Vector3(0, 13, 0)) },
      { t: '基層', p: iceC.clone().add(new THREE.Vector3(0, -12, 0)) },
    ]);
  const notes = () => UN;
  const view = { target: [iceC.x * 0.86, BASE_Y - 14, iceC.z * 0.86], az: a + 0.75, el: -0.16, dist: 118 };
  return {
    id: 'under',
    group: g,
    notes,
    anchor: new THREE.Vector3(shipPos.x, shipPos.y + 14, shipPos.z),
    deepAnchor: iceC.clone().add(new THREE.Vector3(0, -20, 0)),
    pipesTop: pipes.map((P) => ({ name: P.name, pos: P.top.clone().add(new THREE.Vector3(0, 2.5, 0)) })),
    gapLabel: iceC.clone().add(new THREE.Vector3(0, 2, 0)),
    view,
    update,
  };
}
