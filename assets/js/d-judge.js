// 衡斷之塔 · Judgment (articles 1, 5, 14) — on the shore.
// AI throws out answers like fireworks: dozens of dotted trajectories fan across the agent sea ("解法太多").
// The lighthouse's beam — Sense / Connect / Judge, the tower's three tiers — sweeps them and fixes one as the course;
// only that one is drawn solid.  At its foot a learning loop spirals outward, each turn a little faster (1).
import * as THREE from '../vendor/three.module.min.js';
import { ink } from './mat.js';
import { polar, rng, TAU, smooth, clamp, ease, _m, _q, _v, _s } from './kit.js';
import { heightAt, SEA_Y } from './terrain.js';

export function buildJudge() {
  const g = new THREE.Group();
  g.name = 'judge';
  const TH = 200, RR = 79;
  const base = polar(RR, TH);
  g.position.copy(base);
  const inward = new THREE.Vector3(-base.x, 0, -base.z).normalize();
  g.rotation.y = Math.atan2(-inward.z, inward.x);   // local +x → toward people
  const R = rng(14);

  // ---- tower (lathe), white-washed, with three tiers
  const prof = [
    [3.6, -2], [3.4, 0], [3.0, 6], [3.3, 6.2], [3.3, 6.8], [2.8, 7.0], [2.5, 13.2], [2.9, 13.4], [2.9, 14.0], [2.3, 14.2],
    [2.0, 19.6], [3.0, 19.8], [3.0, 20.4], [1.7, 20.6], [1.7, 23.6], [2.2, 23.8], [1.0, 25.6], [0.2, 26.6], [0.0, 26.8],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const tower = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), ink({ shade: 1.0, bias: 0.05 }));
  tower.castShadow = tower.receiveShadow = true;
  g.add(tower);
  // painted bands (graphite stripes like a real lighthouse)
  for (const [y0, y1, r0, r1] of [[2.2, 3.6, 3.32, 3.22], [9.2, 10.6, 2.72, 2.66], [16.4, 17.6, 2.18, 2.12]]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r1 + 0.04, r0 + 0.04, y1 - y0, 40, 1, true), ink({ shade: 0.25 }));
    band.position.y = (y0 + y1) / 2;
    g.add(band);
  }
  // Sense: a radar dish on the first gallery
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 8, 0, TAU, 0, 0.9), ink({ shade: 0.9, side: THREE.DoubleSide }));
  dish.position.set(3.6, 8.2, 0);
  dish.rotation.z = -1.1;
  dish.castShadow = true;
  g.add(dish);
  // Connect: guy-lines from the second gallery to the ground (threads that tie the tower to its world)
  const lineMat = ink({ shade: 0.15 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const p0 = new THREE.Vector3(Math.cos(a) * 2.8, 13.7, Math.sin(a) * 2.8);
    const p1 = new THREE.Vector3(Math.cos(a) * 9.5, -0.2, Math.sin(a) * 9.5);
    const len = p0.distanceTo(p1);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 4), lineMat);
    c.position.copy(p0).add(p1).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    g.add(c);
  }
  // Judge: lantern room — typeset glass, a lens that glows iridescent
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 2.8, 24, 1, true), ink({ style: 1, shade: 0.75, side: THREE.DoubleSide }));
  glass.position.y = 22.2;
  g.add(glass);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), ink({ accent: 'iris', shade: 1.0, bias: 0.3 }));
  lens.position.y = 22.2;
  g.add(lens);

  // ---- the beam: a long dithered cone that sweeps the sea
  const beamLen = 62;
  const beamGeo = new THREE.ConeGeometry(5.5, beamLen, 24, 1, true);
  beamGeo.translate(0, -beamLen / 2, 0);
  beamGeo.rotateZ(Math.PI / 2);            // cone tip at the lens, opening toward +x
  const beam = new THREE.Mesh(beamGeo, ink({ accent: 'iris', shade: 1.0, bias: 0.4, opacity: 0.28, side: THREE.DoubleSide }));
  // light, not a solid: the dithered beam must not write depth, or every kept pixel gets outlined as soot
  beam.material.depthWrite = false;
  beam.renderOrder = 2;
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 22.2;
  beamPivot.add(beam);
  beam.rotation.z = -0.36;                 // tilted down toward the water
  g.add(beamPivot);

  // ---- option trajectories: dotted paths fanning from the tower foot over the sea
  const NP = 34, DOTS = 30;
  const paths = [];
  for (let i = 0; i < NP; i++) {
    const spread = (i / (NP - 1) - 0.5) * 2.3 + (R() - 0.5) * 0.08;   // radians either side of inward
    const len = 26 + R() * 22;
    const lift = 3 + R() * 9;
    const ctrl = new THREE.Vector3(Math.cos(spread * 0.5) * len * 0.5, lift, Math.sin(spread * 0.5) * len * 0.5);
    const end = new THREE.Vector3(Math.cos(spread) * len, SEA_Y - base.y + 0.6, Math.sin(spread) * len);
    paths.push({ p0: new THREE.Vector3(4.5, 0.5, 0), c: ctrl, p1: end, sp: 0.06 + R() * 0.06, off: R() });
  }
  const dotGeo = new THREE.SphereGeometry(0.32, 6, 4);
  const dots = new THREE.InstancedMesh(dotGeo, ink({ shade: 0.2 }), NP * DOTS);
  dots.frustumCulled = false;
  g.add(dots);
  // the chosen course: a solid road that draws itself along the selected trajectory
  const chosenMat = ink({ shade: 0.15, accent: 'lime' });
  const chosen = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.35, 0.8), chosenMat, 60);
  chosen.frustumCulled = false;
  g.add(chosen);

  // ---- learning loop (1): a spiral on the ground at the tower foot, a marker running ever faster
  g.updateMatrixWorld(true);
  const spiralPts = [];
  for (let i = 0; i <= 220; i++) {
    const t = i / 220, a = t * TAU * 3.2, r = 4.2 + t * 7.5;
    const lx = Math.cos(a) * r - 2, lz = Math.sin(a) * r;
    const w = g.localToWorld(new THREE.Vector3(lx, 0, lz));
    spiralPts.push(new THREE.Vector3(lx, heightAt(w.x, w.z) - base.y + 0.25, lz));
  }
  const spiral = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 300, 0.13, 4), ink({ shade: 0.1 }));
  g.add(spiral);
  const runner = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), ink({ accent: 'lime', shade: 0.6 }));
  g.add(runner);
  const spiralCurve = new THREE.CatmullRomCurve3(spiralPts);

  const bez = (P, t, out) => {
    const u = 1 - t;
    return out.set(
      u * u * P.p0.x + 2 * u * t * P.c.x + t * t * P.p1.x,
      u * u * P.p0.y + 2 * u * t * P.c.y + t * t * P.p1.y,
      u * u * P.p0.z + 2 * u * t * P.c.z + t * t * P.p1.z,
    );
  };
  const tmp = new THREE.Vector3();
  let pick = 7, pickT = 0, cycle = -1;
  const CYCLE = 9;
  function update(t) {
    // every CYCLE seconds a new course is chosen: sweep → lock → draw
    const c = Math.floor(t / CYCLE), ph = (t % CYCLE) / CYCLE;
    if (c !== cycle) { cycle = c; pick = Math.floor(rng(c * 7 + 3)() * NP); }
    const P = paths[pick];
    const targetAng = Math.atan2(P.p1.z, P.p1.x);
    // beam: sweeping during the first 40%, then locked on the chosen path
    const sweep = Math.sin(t * 0.9) * 1.25;
    const lock = smooth(0.3, 0.45, ph) * (1 - smooth(0.92, 1.0, ph));
    beamPivot.rotation.y = -(sweep * (1 - lock) + targetAng * lock);
    let k = 0;
    for (let i = 0; i < NP; i++) {
      const Q = paths[i];
      const isPick = i === pick;
      const fade = isPick ? 1 : 1 - 0.45 * lock;   // the other options stay visible: there are still too many
      for (let j = 0; j < DOTS; j++) {
        const tt = ((j / DOTS) + t * Q.sp + Q.off) % 1;
        bez(Q, tt, tmp);
        const s = (0.35 + 0.65 * Math.sin(tt * Math.PI)) * fade * (isPick ? 1 + lock * 0.5 : 1);
        _m.compose(tmp, _q.identity(), _s.setScalar(Math.max(0.001, s)));
        dots.setMatrixAt(k++, _m);
      }
    }
    dots.instanceMatrix.needsUpdate = true;
    // the road is drawn while locked
    const draw = smooth(0.42, 0.75, ph) * (1 - smooth(0.93, 1.0, ph));
    for (let j = 0; j < 60; j++) {
      const tt = j / 59;
      const on = tt <= draw ? 1 : 0;
      bez(P, tt, tmp);
      const t2 = Math.min(1, tt + 0.02);
      const ahead = bez(P, t2, new THREE.Vector3());
      _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), ahead.sub(tmp).normalize());
      _m.compose(tmp, _q, _s.setScalar(on ? 1 : 0.001));
      chosen.setMatrixAt(j, _m);
    }
    chosen.instanceMatrix.needsUpdate = true;
    // learning loop: the marker laps the spiral faster each turn (outward = bigger loops, quicker)
    const lap = (t * 0.05) % 1;
    const u = Math.pow(lap, 0.6);
    runner.position.copy(spiralCurve.getPointAt(u));
    runner.position.y += 0.5;
    lens.scale.setScalar(1 + 0.15 * Math.sin(t * 3));
  }

  g.updateMatrixWorld(true);
  const wp = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  const tgt = wp(12, 9, 0);
  const N = [['Sense 看見問題', 4.2, 10.2, 0], ['Connect 串聯解法', 3.2, 15.4, 0], ['Judge 決定方向', 0, 28.2, 0], ['解法太多', 24, 7, 6], ['學習循環', -1.2, 2.4, -11.5]]
    .map(([t, x, y, z]) => ({ t, p: wp(x, y, z) }));
  const notes = () => N;
  return {
    id: 'judge',
    group: g,
    notes,
    anchor: wp(0, 30, 0),
    // swung round past the undercurrent next door, so its pipes and stranded ship stay out of the foreground
    view: { target: [tgt.x, tgt.y, tgt.z], az: (TH * Math.PI) / 180 + 1.5, el: 0.4, dist: 104 },
    update,
  };
}
