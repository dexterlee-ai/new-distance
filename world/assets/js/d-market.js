// 心動與遲疑 · Desire & hesitation (articles 7, 17) — in the heartland, where the bridge lands.
// A sundial plaza ringed by five life moments (7's 情境需求地圖: 早上快速出門 · 下午需要提神 · 下班需要安慰 ·
// 週末需要犒賞 · 送禮需要不尷尬).  The dial's hand comes round; the moment it points to lights up and people gather.
// Along the edge, an agent conveyor carries boxes straight to checkout — it intercepts the transaction,
// but it does not create the wanting (7).  At the checkout arch people stall: rage-click rings pulse red until a
// lamp explains the next step, then they walk on (17: 不是不知道下一步在哪裡，而是不確定會不會後悔).
import * as THREE from '../vendor/three.module.min.js';
import { ink, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, TAU, smooth, clamp, figureGeo, _m, _q, _v, _s, _e } from './kit.js';
import { heightAt } from './terrain.js';

export const MOMENTS = ['早上快速出門', '下午需要提神', '下班需要安慰', '週末需要犒賞', '送禮需要不尷尬'];

export function buildMarket() {
  const g = new THREE.Group();
  g.name = 'market';
  const TH = 120, RR = 29;
  const base = polar(RR, TH);
  g.position.copy(base);
  g.position.y += 0.4;
  const R = rng(7);

  // ---- plaza
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(12, 12.6, 1.2, 72), ink({ shade: 1.0, bias: 0.1 }));
  plaza.position.y = -0.4;
  plaza.receiveShadow = true;
  g.add(plaza);
  // ring of the 4-step optimisation loop (17): 看見 → 理解 → 驗證 → 沉澱
  const loop = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.16, 4, 120), ink({ shade: 0.15 }));
  loop.rotation.x = Math.PI / 2;
  loop.position.y = 0.25;
  g.add(loop);
  const loopTicks = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.6), ink({ shade: 0.2 }));
    tick.position.set(Math.cos(a) * 10.8, 0.4, Math.sin(a) * 10.8);
    tick.rotation.y = -a;
    g.add(tick);
    loopTicks.push(tick);
  }
  const loopRunner = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), ink({ shade: 0.6, accent: 'lime' }));
  g.add(loopRunner);

  // ---- sundial: gnomon + hand
  const gnomonShape = new THREE.Shape();
  gnomonShape.moveTo(0, 0); gnomonShape.lineTo(4.2, 0); gnomonShape.lineTo(0, 4.0); gnomonShape.lineTo(0, 0);
  const gnomon = new THREE.Mesh(new THREE.ExtrudeGeometry(gnomonShape, { depth: 0.3, bevelEnabled: false }), ink({ shade: 0.9 }));
  gnomon.position.set(-2.1, 0.2, -0.15);
  gnomon.castShadow = true;
  const dial = new THREE.Group();
  dial.add(gnomon);
  g.add(dial);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.18, 0.5), ink({ shade: 0.1 }));
  hand.geometry.translate(3.3, 0, 0);
  hand.position.y = 0.3;
  g.add(hand);

  // ---- five life-moment stalls
  const stalls = [];
  MOMENTS.forEach((name, i) => {
    const a = (i / 5) * TAU + 0.6;
    const S = new THREE.Group();
    S.position.set(Math.cos(a) * 7.8, 0.2, Math.sin(a) * 7.8);
    S.rotation.y = -a + Math.PI / 2;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.4, 4, 1), ink({ shade: 1.0, bias: 0.1 }));
    canopy.position.y = 3.2;
    canopy.rotation.y = Math.PI / 4;
    S.add(canopy);
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 5), ink({ shade: 0.3 }));
      leg.position.set(x, 1.3, z);
      S.add(leg);
    }
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.0), ink({ shade: 0.9 }));
    counter.position.set(0, 0.45, 0.6);
    S.add(counter);
    S.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    g.add(S);
    stalls.push({ S, canopy, a, name });
  });

  // ---- people: drift toward the lit moment
  const NP = 46;
  const people = new THREE.InstancedMesh(figureGeo(0), ink({ shade: 0.45 }), NP);
  people.castShadow = true;
  g.add(people);
  const P = Array.from({ length: NP }, () => ({ a: R() * TAU, r: 3 + R() * 7, ph: R(), sp: 0.4 + R() * 0.6 }));

  // ---- agent conveyor: a straight track along the plaza edge, boxes rushing to checkout
  const trackA = new THREE.Vector3(-13, 0.3, 9.5), trackB = new THREE.Vector3(10, 0.3, 13.5);
  const trackLen = trackA.distanceTo(trackB);
  const track = new THREE.Mesh(new THREE.BoxGeometry(trackLen, 0.3, 1.4), ink({ style: 1, shade: 0.6 }));
  track.position.copy(trackA).lerp(trackB, 0.5);
  track.rotation.y = -Math.atan2(trackB.z - trackA.z, trackB.x - trackA.x);
  g.add(track);
  const NB = 9;
  const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), ink({ style: 1, shade: 0.5, accent: 'teal' }), NB);
  boxes.castShadow = true;
  g.add(boxes);

  // ---- checkout arch where people hesitate (17)
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.3, 6, 32, Math.PI), ink({ shade: 0.85 }));
  const archPos = new THREE.Vector3(11.5, 0, -3.5);
  arch.position.copy(archPos);
  arch.rotation.y = -0.35 + Math.PI / 2;
  arch.castShadow = true;
  g.add(arch);
  const ripples = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.08, 4, 32), ink({ shade: 0.3, accent: 'red' }), 3);
  g.add(ripples);
  const explain = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), ink({ shade: 1, bias: 0.3 }));
  explain.position.copy(archPos).add(new THREE.Vector3(0, 3.4, 0));
  g.add(explain);
  const NQ = 5;
  const queue = new THREE.InstancedMesh(figureGeo(0), ink({ shade: 0.35 }), NQ);
  queue.castShadow = true;
  g.add(queue);

  function update(t, dt) {
    // dial: one moment every ~5 s
    const ang = (t * 0.2) % TAU;
    hand.rotation.y = -ang;
    let lit = 0, best = 9;
    stalls.forEach((S, i) => {
      const d = Math.abs(Math.atan2(Math.sin(S.a - ang), Math.cos(S.a - ang)));
      if (d < best) { best = d; lit = i; }
    });
    stalls.forEach((S, i) => {
      S.canopy.material.userData.u.uAccent.value = i === lit && best < 0.5 ? ACCENT.lime : 0;
      S.canopy.position.y = 3.2 + (i === lit ? Math.sin(t * 4) * 0.08 : 0);
    });
    const litA = stalls[lit].a;
    for (let i = 0; i < NP; i++) {
      const p = P[i];
      // a portion of the crowd is drawn to the lit moment
      const pull = i % 3 === 0 ? 0.04 : 0.012;
      let da = Math.atan2(Math.sin(litA - p.a), Math.cos(litA - p.a));
      p.a += da * pull * dt * 10 + Math.sin(t * p.sp + p.ph * 9) * 0.002;
      p.r += (5.6 + Math.sin(p.ph * 20) * 1.4 - p.r) * dt * 0.3;
      _m.compose(_v.set(Math.cos(p.a) * p.r, 0.2, Math.sin(p.a) * p.r), _q.identity(), _s.setScalar(1.1));
      people.setMatrixAt(i, _m);
    }
    people.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NB; i++) {
      const u = (i / NB + t * 0.11) % 1;
      const p = trackA.clone().lerp(trackB, u);
      _m.compose(_v.set(p.x, 0.95, p.z), _q.identity(), _s.setScalar(1));
      boxes.setMatrixAt(i, _m);
    }
    boxes.instanceMatrix.needsUpdate = true;

    // hesitation cycle at checkout (6 s): stall + red ripples → lamp explains → walk through
    const c = (t % 6) / 6;
    const stall = c < 0.55;
    for (let i = 0; i < 3; i++) {
      const k = ((c * 3 + i / 3) % 1);
      const s = stall ? 0.6 + k * 2.4 : 0.001;
      _q.setFromEuler(_e.set(Math.PI / 2, 0, 0));
      _m.compose(_v.set(archPos.x - 2.2, 0.4 + i * 0.05, archPos.z + 0.8), _q, _s.set(s, s, s));
      ripples.setMatrixAt(i, _m);
    }
    ripples.instanceMatrix.needsUpdate = true;
    explain.material.userData.u.uAccent.value = c > 0.5 && c < 0.8 ? ACCENT.iris : 0;
    explain.scale.setScalar(c > 0.5 && c < 0.8 ? 1.4 : 0.9);
    for (let i = 0; i < NQ; i++) {
      const walk = stall ? 0 : (c - 0.55) / 0.45;
      const x = archPos.x - 2.2 - i * 1.3 + walk * 6;
      _m.compose(_v.set(x, 0.2, archPos.z + 0.8 - i * 0.2), _q.identity(), _s.setScalar(1.15 + (i === 0 && stall ? Math.sin(t * 9) * 0.03 : 0)));
      queue.setMatrixAt(i, _m);
    }
    queue.instanceMatrix.needsUpdate = true;
    // the optimisation loop keeps turning
    const la = t * 0.35;
    loopRunner.position.set(Math.cos(la) * 10.8, 0.7, Math.sin(la) * 10.8);
  }

  const wp = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  g.updateMatrixWorld(true);
  const tgt = wp(1, 1.5, 1);
  const KN = stalls.map((S) => ({ t: S.name, p: wp(S.S.position.x, 5.0, S.S.position.z) }))
    .concat([{ t: '代理輸送帶：直送結帳', p: wp(-1.5, 2.6, 11.5) }, { t: '結帳前的遲疑', p: wp(archPos.x, 5.6, archPos.z) }]);
  const notes = () => KN;
  return {
    id: 'market',
    group: g,
    notes,
    anchor: wp(0, 13, 0),
    stallsWorld: stalls.map((S) => ({ name: S.name, pos: wp(S.S.position.x, 5.2, S.S.position.z) })),
    view: { target: [tgt.x, tgt.y, tgt.z], az: (TH * Math.PI) / 180 + 0.45, el: 0.62, dist: 62 },
    update,
  };
}
