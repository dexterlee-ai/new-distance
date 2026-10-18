// 共同記憶 · Memory (articles 8, 10, 11) — in the heartland.
// Exposure falls like rain over an amphitheatre and vanishes the moment it lands ("沒有被看進去的曝光，只是報表上的庫存").
// When the crowd shares a moment — a wave runs around the stands — one stone is added to the cairn on the stage.
// Old stones stay (classics called back), the newest is lime: memory is built, not bought (8, 10, 11).
import * as THREE from '../vendor/three.module.min.js';
import { ink, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, TAU, smooth, clamp, figureGeo, _m, _q, _v, _s, _e } from './kit.js';
import { heightAt } from './terrain.js';

export function buildMemory() {
  const g = new THREE.Group();
  g.name = 'memory';
  const TH = 25, RR = 29;
  const base = polar(RR, TH);
  // sit the bowl a little into the hill
  g.position.set(base.x, base.y - 0.6, base.z);
  const R = rng(11);

  // ---- terraced amphitheatre (lathe of steps)
  const steps = [[0, 0.0], [4.2, 0.0], [4.2, 0.2]];
  const T = 5;
  for (let i = 0; i < T; i++) {
    const r0 = 5.2 + i * 1.7, y0 = 0.2 + i * 0.85;
    steps.push([r0, y0], [r0, y0 + 0.85]);
  }
  const rOut = 5.2 + T * 1.7;
  steps.push([rOut + 0.8, 0.2 + T * 0.85], [rOut + 2.4, -2.5]);
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(steps.map(([r, y]) => new THREE.Vector2(r, y)), 96), ink({
    shade: 0.8, bias: 0.34, side: THREE.DoubleSide,
    // the outer slope faces away from the sun toward the camera: keep it a light drawing so the eye goes inside
    hooks: { key: 'memory-bowl', fOut: `if (length(vLPos.xz) > ${(rOut + 0.6).toFixed(2)}) sh = 1.0 - (1.0 - sh) * 0.35;` },
  }));
  bowl.castShadow = bowl.receiveShadow = true;
  g.add(bowl);
  // stage disk
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.25, 64), ink({ shade: 1.0, bias: 0.15 }));
  stage.position.y = 0.12;
  stage.receiveShadow = true;
  g.add(stage);

  // ---- crowd on the terraces
  const seats = [];
  for (let i = 0; i < T; i++) {
    const r = 5.2 + i * 1.7 + 0.85, y = 0.2 + (i + 1) * 0.85;
    const n = Math.floor((TAU * r) / 0.95);
    for (let j = 0; j < n; j++) {
      if (R() < 0.22) continue;       // empty seats
      const a = (j / n) * TAU + (R() - 0.5) * 0.04;
      // leave an aisle facing the core so the bowl reads as open toward people
      seats.push({ a, r, y, ph: R() });
    }
  }
  const crowd = new THREE.InstancedMesh(figureGeo(0), ink({ shade: 0.3, accent: 'ink' }), seats.length);
  crowd.castShadow = true;
  g.add(crowd);

  // ---- the cairn: memory stones accumulate, one per shared moment
  const MAXS = 11;
  const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
  const stones = new THREE.InstancedMesh(stoneGeo, ink({ shade: 0.9, flat: true }), MAXS);
  stones.castShadow = stones.receiveShadow = true;
  g.add(stones);
  const stoneSpec = [];
  let sy = 0.25;
  for (let i = 0; i < MAXS; i++) {
    const s = 1.35 - i * 0.08;
    const a = R() * TAU, off = i < 3 ? 1.2 : 0.35;
    stoneSpec.push({ x: Math.cos(a) * off * (i < 3 ? 1 : R()), z: Math.sin(a) * off * (i < 3 ? 1 : R()), y: sy + s * 0.75, s, rot: [R() * 3, R() * 3, R() * 3] });
    if (i >= 2) sy += s * 1.2;
  }

  // ---- exposure rain: typeset streaks that fall and vanish on landing
  // (thick enough to catch the glyph grid, so the rain reads as columns of characters, not graphite bars)
  const NR = 180;
  const drops = [];
  const RAIN_H = 18;
  for (let i = 0; i < NR; i++) drops.push({ a: R() * TAU, r: Math.sqrt(R()) * 14, y: R() * RAIN_H, v: 9 + R() * 8 });
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 1.7, 0.36), ink({ style: 1, shade: 0.4 }), NR);
  rain.frustumCulled = false;
  g.add(rain);

  const WAVE = 8.5;        // seconds per shared moment
  let lastWave = -1;
  let count = 3;           // the cairn starts with a few classics
  function update(t, dt, ctx) {
    // the rain only falls while this district (or the whole map) is being looked at: elsewhere it is just noise
    rain.visible = !ctx || !ctx.focus || ctx.focus === 'memory';
    // a wave runs once around the bowl each cycle
    const cyc = t / WAVE, ph = cyc % 1;
    const waveA = ph * TAU * 1.15 - 0.3;
    const waveOn = ph < 0.88 ? 1 : 0;
    for (let i = 0; i < seats.length; i++) {
      const S = seats[i];
      let da = Math.atan2(Math.sin(S.a - waveA), Math.cos(S.a - waveA));
      const up = waveOn * Math.exp(-da * da * 9);
      const x = Math.cos(S.a) * S.r, z = Math.sin(S.a) * S.r;
      _q.setFromEuler(_e.set(0, -S.a + Math.PI / 2, 0));
      _m.compose(_v.set(x, S.y + up * 0.55, z), _q, _s.set(0.95, 0.75 + up * 0.35 + Math.sin(t * 2 + S.ph * 9) * 0.02, 0.95));
      crowd.setMatrixAt(i, _m);
    }
    crowd.instanceMatrix.needsUpdate = true;

    // each completed wave lays one stone; after the cairn is full it slowly resets to the classics
    const w = Math.floor(cyc);
    if (w !== lastWave) { lastWave = w; count = count >= MAXS ? 3 : count + 1; }
    for (let i = 0; i < MAXS; i++) {
      const S = stoneSpec[i];
      const born = i === count - 1 ? smooth(0.0, 0.12, ph) : 1;
      const vis = i < count ? born : 0;
      _q.setFromEuler(_e.set(...S.rot));
      _m.compose(_v.set(S.x, S.y + (1 - born) * 3, S.z), _q, _s.setScalar(Math.max(0.001, S.s * vis)));
      stones.setMatrixAt(i, _m);
      // newest stone is lime; the old ones darken with age like weathered classics
      const age = count - 1 - i;
      setInst(stones, i, age === 0 ? 1.0 : clamp(0.95 - age * 0.06, 0.45, 1), -1, age === 0 ? ACCENT.lime : 0);
    }
    stones.instanceMatrix.needsUpdate = true;
    if (stones.instanceColor) stones.instanceColor.needsUpdate = true;

    for (let i = 0; i < NR; i++) {
      const D = drops[i];
      D.y -= D.v * dt;
      if (D.y < 0.2) { D.y = RAIN_H + Math.random() * 3; D.a = Math.random() * TAU; D.r = Math.sqrt(Math.random()) * 14; }
      _m.compose(_v.set(Math.cos(D.a) * D.r, D.y + 2, Math.sin(D.a) * D.r), _q.identity(), _s.setScalar(1));
      rain.setMatrixAt(i, _m);
    }
    rain.instanceMatrix.needsUpdate = true;
  }

  const wp = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  g.updateMatrixWorld(true);
  const tgt = wp(0, 1.5, 0);
  const MN = [
    { t: '曝光的雨：落地就不見', p: wp(6, 13, -4) },
    { t: '記憶石堆', p: wp(0, 8.5, 0) },
    { t: '共同時刻', p: wp(-12, 6.6, 6) },
  ];
  const notes = () => MN;
  return {
    id: 'memory',
    group: g,
    notes,
    anchor: wp(0, 20, 0),
    // looking down into the bowl: the terraces, the crowd and the cairn on the stage, not the outer slope
    view: { target: [tgt.x, tgt.y, tgt.z], az: (TH * Math.PI) / 180 + 0.45, el: 0.6, dist: 56 },
    update,
  };
}
