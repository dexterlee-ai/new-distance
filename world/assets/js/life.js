// Life that ties the districts into one system:
//  · paper boats leave the foundry, pass the answer engine and land in the heartland (content travelling to people)
//  · some boats are grey generated stock — near the engine they dissolve into type and sink
//  · people walk the heartland; what they say rises as speech marks into the engine's ear (it reads what others say)
//  · agent drones carry the engine's answers back toward people
import * as THREE from '../vendor/three.module.min.js';
import { ink, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { polar, rng, TAU, smooth, clamp, figureGeo, boatGeo, _m, _q, _v, _s, _e } from './kit.js';
import { heightAt, SEA_Y } from './terrain.js';

const bez = (a, b, c, t, out) => {
  const u = 1 - t;
  return out.set(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z);
};

export function buildLife(D) {
  const g = new THREE.Group();
  g.name = 'life';
  const R = rng(2026);

  // ---- boats
  const landings = [polar(43.5, 300), polar(43.5, 318), polar(43.5, 12), polar(43.5, 28), polar(43.5, 340)];
  const NB = 16;
  const boatsM = new THREE.InstancedMesh(boatGeo(), ink({ shade: 1.0, bias: 0.08, side: THREE.DoubleSide }), NB);
  boatsM.castShadow = true;
  boatsM.frustumCulled = false;
  g.add(boatsM);
  const accs = [ACCENT.lime, ACCENT.pink, ACCENT.teal, 0];
  const boats = Array.from({ length: NB }, (_, i) => {
    const slop = i % 4 === 3;
    const land = landings[i % landings.length];
    const ctrl = D.oracle.mouth.clone().lerp(land, 0.25);
    ctrl.y = SEA_Y;
    const b = { off: i / NB, slop, land, ctrl, sp: 0.022 + R() * 0.008 };
    setInst(boatsM, i, 1, slop ? 1 : 0, slop ? 0 : accs[i % 3]);
    return b;
  });
  const start = D.foundry.slipway.clone().setY(SEA_Y);

  // ---- walkers in the heartland
  const NW = 150;
  const walkersM = new THREE.InstancedMesh(figureGeo(0), ink({ shade: 0.4 }), NW);
  walkersM.castShadow = true;
  walkersM.frustumCulled = false;
  g.add(walkersM);
  const walkers = Array.from({ length: NW }, () => ({
    a: R() * TAU, r: 17 + R() * 23, dir: R() < 0.5 ? 1 : -1, sp: 0.6 + R() * 0.9, wob: R() * 9, toCore: R() < 0.18,
  }));

  // ---- speech marks rising into the engine's ear
  const NV = 48;
  const bubble = new THREE.Group();
  const bGeo = new THREE.SphereGeometry(0.42, 10, 6);
  bGeo.scale(1.4, 0.9, 0.5);
  const voicesM = new THREE.InstancedMesh(bGeo, ink({ shade: 1.0, bias: 0.2 }), NV);
  voicesM.frustumCulled = false;
  g.add(voicesM);
  const voices = Array.from({ length: NV }, (_, i) => {
    const from = polar(20 + R() * 20, 260 + R() * 140, 1.5);
    const to = D.oracle.ear;
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.max(from.y, to.y) + 10 + R() * 8;
    return { from, mid, to, off: R(), sp: 0.045 + R() * 0.03 };
  });

  // ---- agent drones: answers going back toward people
  const ND = 8;
  const dronesM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), ink({ style: 1, shade: 0.5, accent: 'teal' }), ND * 3);
  dronesM.frustumCulled = false;
  dronesM.castShadow = true;
  g.add(dronesM);
  const drones = Array.from({ length: ND }, (_, i) => {
    const to = polar(24 + R() * 14, 300 + R() * 130, 3);
    const from = D.oracle.mouth.clone();
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 9 + R() * 5;
    return { from, mid, to, off: i / ND, sp: 0.05 + R() * 0.02 };
  });

  const tmp = new THREE.Vector3(), nxt = new THREE.Vector3();
  // travellers that pass right in front of a district camera would fill the frame as blobs of colour: they shrink away
  const cam = new THREE.Vector3(0, 1e4, 0);
  const near = (p) => smooth(9, 24, p.distanceTo(cam));
  function update(t, dt, ctx) {
    if (ctx?.camera) cam.copy(ctx.camera.position);
    for (let i = 0; i < NB; i++) {
      const B = boats[i];
      const u = (B.off + t * B.sp) % 1;
      bez(start, B.ctrl, B.land, u, tmp);
      bez(start, B.ctrl, B.land, Math.min(1, u + 0.01), nxt);
      let s = 1.25, y = SEA_Y + Math.sin(t * 2 + i) * 0.12;
      // slop sinks after passing the engine; real boats fade on landing
      if (B.slop) { const k = smooth(0.45, 0.62, u); s *= 1 - k; y -= k * 1.5; }
      s *= smooth(0.0, 0.04, u) * (1 - smooth(0.93, 1.0, u)) * near(tmp);
      _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), nxt.sub(tmp).setY(0).normalize());
      _q.multiply(new THREE.Quaternion().setFromEuler(_e.set(Math.sin(t * 1.7 + i) * 0.08, 0, 0)));
      _m.compose(_v.set(tmp.x, y, tmp.z), _q, _s.setScalar(Math.max(0.001, s)));
      boatsM.setMatrixAt(i, _m);
    }
    boatsM.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NW; i++) {
      const W = walkers[i];
      W.a += (W.dir * W.sp * dt) / W.r;
      if (W.toCore) { W.r -= dt * 0.6; if (W.r < 9.5) W.r = 40; }
      const r = W.r + Math.sin(t * 0.3 + W.wob) * 1.5;
      const x = Math.cos(W.a) * r, z = Math.sin(W.a) * r;
      const bob = Math.abs(Math.sin(t * 6 * W.sp + W.wob)) * 0.08;
      _m.compose(_v.set(x, heightAt(x, z) + bob, z), _q.identity(), _s.setScalar(1.1));
      walkersM.setMatrixAt(i, _m);
    }
    walkersM.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < NV; i++) {
      const V = voices[i];
      const u = (V.off + t * V.sp) % 1;
      bez(V.from, V.mid, V.to, u, tmp);
      const s = smooth(0, 0.1, u) * (1 - smooth(0.85, 1, u)) * 0.9 * near(tmp);
      _q.setFromEuler(_e.set(0, t * 0.5 + i, Math.sin(t + i) * 0.2));
      _m.compose(tmp, _q, _s.setScalar(Math.max(0.001, s)));
      voicesM.setMatrixAt(i, _m);
    }
    voicesM.instanceMatrix.needsUpdate = true;

    let k = 0;
    for (let i = 0; i < ND; i++) {
      const Dd = drones[i];
      const u = (Dd.off + t * Dd.sp) % 1;
      bez(Dd.from, Dd.mid, Dd.to, u, tmp);
      const s = smooth(0, 0.06, u) * (1 - smooth(0.9, 1, u)) * near(tmp);
      for (let c = 0; c < 3; c++) {
        _q.setFromEuler(_e.set(t + c, t * 1.3 + i, 0));
        _m.compose(_v.set(tmp.x + (c - 1) * 0.7, tmp.y + (c === 1 ? 0.6 : 0), tmp.z), _q, _s.setScalar(Math.max(0.001, s * (c === 1 ? 1 : 0.7))));
        dronesM.setMatrixAt(k++, _m);
      }
    }
    dronesM.instanceMatrix.needsUpdate = true;
  }

  return { group: g, update };
}
