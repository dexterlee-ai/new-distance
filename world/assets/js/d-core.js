// 人之核 · People Model (articles 12, 2)
// A sunflower — the Model chapter's emblem — whose seed head is 5,000 tiny people: one digital twin per real CCS respondent.
// The seed head is banded by what the model can claim (12's three output layers):
//   inner  資料直接支持的洞察  solid pencil figures
//   middle 模型估計           half-dissolved figures
//   outer  情境模擬           typeset ASCII cubes
// "Simulation before decision": a question makes part of the crowd lift into an answer cloud, then settle back.
import * as THREE from '../vendor/three.module.min.js';
import { ink, CLOCK } from './mat.js';
import { ACCENT } from './npr.js';
import { figureGeo, rng, tube, TAU, clamp, ease, _m, _q, _v, _s } from './kit.js';
import { heightAt } from './terrain.js';

const N = 5000;

export function buildCore() {
  const g = new THREE.Group();
  g.name = 'core';
  const baseY = heightAt(0, 0);
  const headY = baseY + 25.5;

  // ---- stem with a gentle S-curve and two leaves
  const stemPts = [
    new THREE.Vector3(0, baseY - 1, 0), new THREE.Vector3(0.6, baseY + 6, 0.3),
    new THREE.Vector3(-0.5, baseY + 12, -0.2), new THREE.Vector3(0, headY - 8.5, 0),
  ];
  const stem = new THREE.Mesh(tube(stemPts, 0.62, 60, 10), ink({ shade: 0.95 }));
  stem.castShadow = stem.receiveShadow = true;
  g.add(stem);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(2.2, 1.6, 4.6, 2.6, 7.4, 0.4);
  leafShape.bezierCurveTo(4.8, -2.4, 2.0, -1.8, 0, 0);
  for (const [y, rot, s] of [[baseY + 7, 0.4, 1.0], [baseY + 12.5, Math.PI + 0.9, 0.85]]) {
    const lg = new THREE.ShapeGeometry(leafShape, 24);
    const p = lg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -0.06 * x * x + Math.sin(x * 0.8) * 0.3); }
    lg.computeVertexNormals();
    const leaf = new THREE.Mesh(lg, ink({ side: THREE.DoubleSide, shade: 0.92 }));
    leaf.scale.setScalar(s);
    leaf.position.set(0, y, 0);
    leaf.rotation.set(-0.5, rot, 0.25);
    leaf.castShadow = leaf.receiveShadow = true;
    g.add(leaf);
  }

  // ---- the head pivots on the stem axis and turns toward the viewer
  // (heliotropism: the model always turns toward the person asking)
  const pivot = new THREE.Group();
  pivot.position.set(0, headY, 0);
  g.add(pivot);
  // neck: from the stem top (on the axis) curving up behind the bowl, so the stem never pokes through the face
  const neck = new THREE.Mesh(tube([
    new THREE.Vector3(0, -8.6, 0), new THREE.Vector3(0, -5.5, -1.2), new THREE.Vector3(0, -2.4, -2.6), new THREE.Vector3(0, -0.4, -3.0),
  ], 0.6, 24, 10), ink({ shade: 0.9 }));
  neck.castShadow = true;
  pivot.add(neck);
  const head = new THREE.Group();
  head.rotation.x = -0.22;           // nod slightly toward the land
  pivot.add(head);
  const RH = 8.6;                     // seed disk radius

  // back bowl (receptacle)
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(RH * 1.04, 48, 16, 0, TAU, 0, Math.PI * 0.32), ink({ shade: 0.85, side: THREE.DoubleSide }));
  bowl.rotation.x = -Math.PI / 2;
  bowl.scale.set(1, 1, 0.42);
  bowl.position.z = -0.2;
  bowl.castShadow = true;
  head.add(bowl);
  // seed bed: paper-white inside, a typeset ring outside (the simulation layer)
  const B1 = 0.5, B2 = 0.78;
  const bedIn = new THREE.Mesh(new THREE.CircleGeometry(RH * B2, 96), ink({ shade: 1.0, bias: 0.25 }));
  bedIn.position.z = 0.15;
  head.add(bedIn);
  const bedOut = new THREE.Mesh(new THREE.RingGeometry(RH * B2, RH * 1.02, 96, 2), ink({ style: 1, shade: 1.0, bias: 0.05 }));
  bedOut.position.z = 0.15;
  head.add(bedOut);

  // petals: Fibonacci counts, pink like the Model chapter band
  const petal = new THREE.Shape();
  petal.moveTo(0, -0.9);
  petal.bezierCurveTo(1.0, 0.8, 0.9, 3.6, 0, 5.6);
  petal.bezierCurveTo(-0.9, 3.6, -1.0, 0.8, 0, -0.9);
  const pg = new THREE.ShapeGeometry(petal, 16);
  {
    const p = pg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i); p.setZ(i, 0.05 * y * y - Math.abs(x) * 0.35); }
    pg.computeVertexNormals();
  }
  const R = rng(12);
  for (const [count, rad, tilt, scale] of [[34, RH + 0.4, 0.42, 1.05], [21, RH - 0.4, 0.62, 0.9]]) {
    const pm = new THREE.InstancedMesh(pg, ink({ side: THREE.DoubleSide, accent: 'pink', shade: 1.0 }), count);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + (rad < RH ? 0.09 : 0) + (R() - 0.5) * 0.05;
      const e = new THREE.Euler(tilt + (R() - 0.5) * 0.25, 0, a - Math.PI / 2 + (R() - 0.5) * 0.1, 'ZXY');
      _q.setFromEuler(e);
      _v.set(Math.cos(a) * rad, Math.sin(a) * rad, -0.3 - R() * 0.4);
      const s = scale * (0.85 + R() * 0.3);
      _m.compose(_v, _q, _s.set(s, s * (0.9 + R() * 0.25), s));
      pm.setMatrixAt(i, _m);
    }
    pm.castShadow = true;
    head.add(pm);
  }

  // ---- 5,000 seeds = 5,000 digital twins, golden-angle phyllotaxis, split into the three layers
  const GA = Math.PI * (3 - Math.sqrt(5));
  const c = RH / Math.sqrt(N);
  const all = [];
  for (let i = 0; i < N; i++) {
    const r = c * Math.sqrt(i + 0.5), a = i * GA;
    const t = r / RH;
    all.push({
      x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0.2 + 0.9 * (1 - t * t), r,
      band: t < B1 ? 0 : t < B2 ? 1 : 2,
      ph: R(),
      pick: R() < 0.58,   // 58%: the article's simulated first-purchase rate (新產品上市測試, a simulation case)
    });
  }
  // answer cloud targets: the picked twins gather on a Fibonacci sphere in front of the head
  {
    const picked = all.filter((s) => s.pick);
    const M = picked.length;
    picked.forEach((s, j) => {
      const yy = 1 - (2 * (j + 0.5)) / M, rr = Math.sqrt(1 - yy * yy), th = j * GA;
      const rad = 4.2 + (s.ph - 0.5) * 0.5;
      s.tx = Math.cos(th) * rr * rad; s.ty = yy * rad; s.tz = Math.sin(th) * rr * rad;
    });
  }
  const fig = figureGeo(0);
  fig.rotateX(Math.PI / 2);               // stand along +z, out of the disk
  const cube = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  cube.translate(0, 0, 0.35);
  const layers = [
    // solid graphite dots read as seeds from afar and as tiny people up close
    { geo: fig, mat: ink({ shade: 0.2, accent: 'ink' }) },
    { geo: fig, mat: ink({ shade: 0.3, accent: 'ink', opacity: 0.5 }) },
    { geo: cube, mat: ink({ style: 1, shade: 0.35 }) },
  ].map((L, b) => {
    const list = all.filter((s) => s.band === b);
    const mesh = new THREE.InstancedMesh(L.geo, L.mat, list.length);
    mesh.receiveShadow = true;
    head.add(mesh);
    return { mesh, list, mat: L.mat };
  });
  const scale0 = c * 1.7;
  const cloudC = new THREE.Vector3(0, 0.5, 9.5);

  const VIEW_AZ = 0.9;
  // start already turned toward the district view (the head only turns while the world is in motion)
  const state = { bursting: false, t0: 0, yaw: Math.atan2(Math.cos(VIEW_AZ), Math.sin(VIEW_AZ)), hl: -1, near: 0 };

  const look = new THREE.Vector3();
  function placeSeeds(t, k, tb = t) {
    for (const L of layers) {
      const cs = L.mesh.geometry === cube ? 0.42 : 1;
      for (let j = 0; j < L.list.length; j++) {
        const s = L.list[j];
        let x = s.x, y = s.y, z = s.z + Math.sin(s.r * 1.1 - t * 1.6) * 0.12 * state.near;
        let sc = scale0 * cs;
        if (k > 0 && s.pick) {
          const kk = clamp((k - s.ph * 0.25) / 0.75);
          const spin = tb * 0.35;
          const cs2 = Math.cos(spin), sn2 = Math.sin(spin);
          const tx = cloudC.x + s.tx * cs2 - s.tz * sn2, ty = cloudC.y + s.ty, tz = cloudC.z + s.tx * sn2 + s.tz * cs2;
          const lift = Math.sin(kk * Math.PI) * 2.0;
          x += (tx - x) * kk; y += (ty - y) * kk + lift * 0.2; z += (tz - z) * kk + lift;
          sc *= 1 + kk * 0.6;
        }
        _m.compose(_v.set(x, y, z), _q.identity(), _s.set(sc, sc, sc));
        L.mesh.setMatrixAt(j, _m);
      }
      L.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  placeSeeds(0, 0);

  let lastK = -1, lastC = CLOCK.value;
  function update(t, dt, ctx) {
    // turning toward the reader answers their own camera move, so it keeps the real clock (also with motion off)
    const rdt = Math.min(0.1, CLOCK.value - lastC);
    lastC = CLOCK.value;
    look.copy(ctx.camera.position).sub(pivot.getWorldPosition(_v));
    const targetYaw = Math.atan2(look.x, look.z);
    let d = targetYaw - state.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    state.yaw += d * Math.min(1, rdt * 0.7);
    pivot.rotation.y = state.yaw;
    pivot.rotation.z = Math.sin(t * 0.3) * 0.02;

    // simulation burst timeline (6.5 s): lift → hold → settle.  The reader asked for it, so it plays on the
    // real clock even while the rest of the world is paused
    let k = 0;
    if (state.bursting) {
      const e = (CLOCK.value - state.t0) / 6.5;
      if (e >= 1) state.bursting = false;
      k = e < 0.35 ? ease(e / 0.35) : e < 0.7 ? 1 : 1 - ease((e - 0.7) / 0.3);
    }
    const nearT = ctx.focus === 'core' ? 1 : 0;
    state.near += (nearT - state.near) * Math.min(1, rdt * 2);
    // only re-place the crowd when something is moving (the ripple runs while the camera is close)
    const ripple = state.near > 0.01 && (dt > 0 || Math.abs(nearT - state.near) > 0.002);
    if (ripple || k > 0 || lastK !== k) placeSeeds(t, k, CLOCK.value);
    lastK = k;
  }

  const _n = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const notes = () => {
    head.localToWorld(_n[0].set(-1.2, 1.6, 2.2));
    head.localToWorld(_n[1].set(-RH * 0.47, -RH * 0.47, 2.0));
    head.localToWorld(_n[2].set(RH * 0.62, RH * 0.62, 1.8));
    pivot.localToWorld(_n[3].set(0, -10.5, 0));
    return [
      { t: '資料直接支持', p: _n[0] }, { t: '模型估計', p: _n[1] }, { t: '情境模擬', p: _n[2] },
      { t: '5,000 份以上樣本的數位分身', p: _n[3] },
    ];
  };
  return {
    id: 'core',
    group: g,
    notes,
    anchor: new THREE.Vector3(0, headY + 11, 0),
    view: { target: [0, headY - 2.5, 0], az: VIEW_AZ, el: 0.16, dist: 74 },
    update,
    simulate() { if (!state.bursting) { state.bursting = true; state.t0 = CLOCK.value; } },
    /** accent one output layer (0 data, 1 estimate, 2 simulation; -1 none) */
    highlight(b) {
      layers.forEach((L, i) => { L.mat.userData.u.uAccent.value = i === b ? ACCENT.pink : (i < 2 ? ACCENT.ink : 0); });
      bedOut.material.userData.u.uAccent.value = b === 2 ? ACCENT.pink : 0;
    },
  };
}
