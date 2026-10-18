// 信任之地 · Trust (articles 3, 6) — in the heartland.
// The People chapter's emblem, a heart drawn as a fingerprint: ridges no generator can copy.
// Beside it stands a generated twin — perfect, smooth, typeset — and it casts no shadow.
// Three lamps on three posts cross their beams on the real heart: a story is believed when three
// independent sources point at the same fact (6).  Under it, a pedestal of trust bricks: 信任庫, not 內容庫.
import * as THREE from '../vendor/three.module.min.js';
import { ink } from './mat.js';
import { polar, rng, TAU, smooth } from './kit.js';
import { heightAt } from './terrain.js';

function heartXY(t, s = 1) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [x * s, y * s];
}

export function buildTrust() {
  const g = new THREE.Group();
  g.name = 'trust';
  const TH = 300, RR = 28;
  const base = polar(RR, TH);
  g.position.copy(base);
  const outward = new THREE.Vector3(base.x, 0, base.z).normalize();
  // face the incoming boats / the viewer coming from the sea
  g.rotation.y = Math.atan2(outward.x, outward.z);
  g.updateMatrixWorld(true);
  const groundAt = (x, z) => { const w = g.localToWorld(new THREE.Vector3(x, 0, z)); return heightAt(w.x, w.z) - base.y; };
  const R = rng(6);
  const S = 0.34;     // heart ≈ 11 wide

  // ---- pedestal of trust bricks
  const brick = new THREE.BoxGeometry(2.2, 0.9, 1.6);
  const brickMat = ink({ shade: 0.95 });
  const rows = [6, 5, 4];
  let y = groundAt(0, 0) + 0.0;
  rows.forEach((n, ri) => {
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(brick, brickMat);
      b.position.set((i - (n - 1) / 2) * 2.3 + (R() - 0.5) * 0.1, y + 0.45, (R() - 0.5) * 0.15);
      b.rotation.y = (R() - 0.5) * 0.05;
      b.castShadow = b.receiveShadow = true;
      g.add(b);
    }
    y += 0.92;
  });
  const top = y;

  // ---- the real heart: fingerprint ridges, lime like the People band
  const real = new THREE.Group();
  real.position.set(0, top + 5.0, 0);
  g.add(real);
  const plate = new THREE.Shape();
  for (let i = 0; i <= 120; i++) { const [x, yy] = heartXY((i / 120) * TAU, S); i === 0 ? plate.moveTo(x, yy) : plate.lineTo(x, yy); }
  const plateGeo = new THREE.ExtrudeGeometry(plate, { depth: 0.6, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 2, curveSegments: 48 });
  plateGeo.translate(0, 0, -0.9);
  const plateMesh = new THREE.Mesh(plateGeo, ink({ shade: 1.0, bias: 0.15, accent: 'lime' }));
  plateMesh.castShadow = plateMesh.receiveShadow = true;
  real.add(plateMesh);
  const ridgeMat = ink({ shade: 0.3 });
  const core = [0.6, 1.2];
  for (let k = 1; k <= 13; k++) {
    const pts = [];
    const sk = (k / 13) * 0.94;
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * TAU;
      const [hx, hy] = heartXY(t, S);
      // a whorl: ridges are scaled copies of the outline, drifting toward an off-centre core, with a slight wobble
      const wob = Math.sin(t * 9 + k * 1.7) * 0.06 + Math.sin(t * 3 - k) * 0.08;
      const x = core[0] + (hx - core[0]) * (sk + wob * 0.12);
      const yy = core[1] + (hy - core[1]) * (sk + wob * 0.12);
      pts.push(new THREE.Vector3(x, yy, 0.05 + Math.sin(t * 2 + k) * 0.05));
    }
    // fingerprints have breaks: open some ridges
    const cut = R();
    const open = k % 3 === 0 ? pts.slice(Math.floor(cut * 40), Math.floor(cut * 40) + 130) : pts;
    // fine ridges with lime paper between them: thick ones merge into one black mass at district distance
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(open, k % 3 !== 0), 200, 0.085, 5, k % 3 !== 0);
    const m = new THREE.Mesh(tube, ridgeMat);
    m.castShadow = true;
    real.add(m);
  }

  // ---- the generated twin: same silhouette, flawless, typeset — and it casts no shadow
  const twin = new THREE.Mesh(plateGeo.clone(), ink({ style: 1, shade: 0.6 }));
  twin.position.set(-14, groundAt(-14, -3) + 1.0 + 5.0, -3);
  twin.rotation.y = 0.12;   // nearly square to the camera, so its silhouette reads as the same heart
  twin.castShadow = false;
  twin.receiveShadow = false;
  g.add(twin);
  // its pedestal is a single seamless slab (nothing was built here, it was generated)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(9, 1.0, 2.4), ink({ style: 1, shade: 0.7 }));
  slab.position.set(-14, groundAt(-14, -3) + 0.5, -3);
  slab.rotation.y = 0.12;
  g.add(slab);

  // ---- three sources: posts with lamps whose beams cross on the real heart
  const lamps = [];
  const target = new THREE.Vector3(0, top + 5, 0);
  [[-12, 6, 8], [12, 6, 8], [3, -9, 15]].forEach(([x, z, hgt], i) => {
    const gy = groundAt(x, z);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, hgt, 8), ink({ shade: 0.6 }));
    post.position.set(x, gy + hgt / 2, z);
    post.castShadow = true;
    g.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), ink({ shade: 1, bias: 0.3, accent: 'iris' }));
    lamp.position.set(x, gy + hgt + 0.4, z);
    g.add(lamp);
    const from = lamp.position.clone();
    const len = from.distanceTo(target);
    const beamGeo = new THREE.ConeGeometry(0.9, len, 16, 1, true);
    beamGeo.translate(0, -len / 2, 0);
    const beam = new THREE.Mesh(beamGeo, ink({ shade: 1, bias: 0.4, accent: 'iris', opacity: 0.3, side: THREE.DoubleSide }));
    beam.position.copy(from);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(from).normalize());
    beam.material.depthWrite = false;   // light: drawn last, without depth, so it is not outlined as soot
    beam.renderOrder = 2;
    g.add(beam);
    lamps.push({ lamp, beam, ph: i * 0.33 });
  });

  function update(t) {
    // verification is a rhythm: the three beams light one after another, then together
    const cyc = (t % 7) / 7;
    lamps.forEach((L, i) => {
      const on = smooth(L.ph * 0.6, L.ph * 0.6 + 0.08, cyc) * (1 - smooth(0.9, 1.0, cyc));
      L.beam.material.userData.u.uOpacity.value = 0.05 + on * 0.32;
      L.lamp.scale.setScalar(0.8 + on * 0.4);
    });
    const all = smooth(0.62, 0.7, cyc) * (1 - smooth(0.9, 1.0, cyc));
    plateMesh.material.userData.u.uShadeBias.value = 0.15 + all * 0.2;
    real.rotation.y = Math.sin(t * 0.2) * 0.12;
    // the twin flickers between glyph densities: perfect, but not there
    twin.material.userData.u.uShadeMul.value = 0.6 + Math.sin(t * 7.0) * 0.05;
  }

  g.updateMatrixWorld(true);
  const wp = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  const tgt = wp(-5, top + 4, 0);
  const TN = [
    { t: '指紋之心', p: wp(0, top + 11.2, 0) },
    { t: '生成的心——沒有影子', p: wp(-14, groundAt(-14, -3) + 12.4, -3) },
    { t: '三個獨立來源', p: wp(8.5, groundAt(8.5, 6) + 9.8, 6) },
    { t: '信任磚', p: wp(6.4, top - 0.6, 0.8) },
  ];
  const notes = () => TN;
  return {
    id: 'trust',
    group: g,
    notes,
    anchor: wp(0, top + 14, 0),
    view: { target: [tgt.x, tgt.y, tgt.z], az: (TH * Math.PI) / 180 + 0.3, el: 0.32, dist: 62 },
    update,
  };
}
