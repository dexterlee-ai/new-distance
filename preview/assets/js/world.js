// Assembles the whole world: terrain, the agent sea, nine districts and the life that connects them.
import * as THREE from '../vendor/three.module.min.js';
import { buildTerrain, buildSea, heightAt, SEA_Y } from './terrain.js';
import { buildCore } from './d-core.js';
import { buildTwins } from './d-twins.js';
import { buildOracle } from './d-oracle.js';
import { buildJudge } from './d-judge.js';
import { buildTrust } from './d-trust.js';
import { buildMemory } from './d-memory.js';
import { buildGates } from './d-gates.js';
import { buildFoundry } from './d-foundry.js';
import { buildMarket } from './d-market.js';
import { buildUnder } from './d-under.js';
import { buildLife } from './life.js';
import { CLOCK, ink, dim } from './mat.js';
// ---- ?look hook (map art direction, scenery.js): the world's own environment; null without ?look ----
import { buildScenery } from './scenery.js';

// neighbours that stand between a district's camera and its subject dissolve while that district is in focus
const ASIDE = { trust: ['oracle'], oracle: ['trust', 'foundry'], gates: ['market'], memory: ['oracle', 'core'], under: ['judge', 'gates'], twins: ['market'] };

export function buildWorld(scene, { head }) {
  const { group: ground } = buildTerrain();
  scene.add(ground);
  const sea = buildSea();
  scene.add(sea);
  const D = {
    core: buildCore(),
    twins: buildTwins(),
    oracle: buildOracle(head),
    judge: buildJudge(),
    under: buildUnder(),
    foundry: buildFoundry(),
    trust: buildTrust(),
    memory: buildMemory(),
    gates: buildGates(),
    market: buildMarket(),
  };
  for (const d of Object.values(D)) scene.add(d.group);
  // each map label draws a line down to a pin: the top of the district's own geometry straight under its anchor
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  for (const d of Object.values(D)) {
    if (d.pin) continue;
    ray.set(d.anchor, down);
    const hit = ray.intersectObject(d.group, true).find((h) => h.object.isMesh && h.object.visible);
    d.pin = hit ? hit.point.clone().setY(hit.point.y + 0.4) : d.anchor.clone();
  }
  // the footprint ring: a dashed circle on the ground that lights under a district the reader is previewing
  const FP = 56;
  const foot = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.18, 0.36), ink({ shade: 0.15, accent: 'ink', focus: false }), FP);
  foot.frustumCulled = false;
  foot.visible = false;
  scene.add(foot);
  const _fm = new THREE.Matrix4(), _fq = new THREE.Quaternion(), _fs = new THREE.Vector3(1, 1, 1), _fp = new THREE.Vector3(), _fy = new THREE.Vector3(0, 1, 0);
  function footprint(id) {
    const d = id && D[id];
    foot.visible = !!d;
    if (!d) return;
    const c = d.pin || d.anchor, r = id === 'core' ? 13 : id === 'under' ? 10 : id === 'twins' ? 14 : 12;
    for (let i = 0; i < FP; i++) {
      const a = (i / FP) * Math.PI * 2;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      _fp.set(x, Math.max(heightAt(x, z), SEA_Y) + 0.35, z);
      _fq.setFromAxisAngle(_fy, -a + Math.PI / 2);
      _fm.compose(_fp, _fq, _fs);
      foot.setMatrixAt(i, _fm);
    }
    foot.instanceMatrix.needsUpdate = true;
  }
  const life = buildLife(D);
  scene.add(life.group);
  // ---- ?look hook: the environment (needs the districts and the flows' courses to keep clear of them) ----
  const scenery = buildScenery(D, { life });
  if (scenery) scene.add(scenery.group);

  const aside = Object.entries(D).map(([id, d]) => {
    const us = [];
    d.group.traverse((o) => { const u = o.material?.userData?.u; if (u?.uAside && !us.includes(u)) us.push(u); });
    return { id, d, us, k: 0 };
  });
  let last = CLOCK.value;
  function update(t, dt, ctx) {
    // stepping aside follows the camera, so it runs on the real clock (also while the world's motion is paused)
    const rdt = Math.min(0.1, CLOCK.value - last);
    last = CLOCK.value;
    const away = (ctx && ASIDE[ctx.focus]) || [];
    for (const A of aside) {
      const goal = away.includes(A.id) ? 1 : 0;
      if (A.k === goal) continue;
      A.k = goal > A.k ? Math.min(goal, A.k + rdt * 2.5) : Math.max(goal, A.k - rdt * 2.5);
      for (const u of A.us) u.uAside.value = A.k;
      A.d.group.visible = A.k < 1;
    }
    for (const d of Object.values(D)) d.update(t, dt, ctx);
    life.update(t, dt, ctx);
    scenery?.update(t, dt, ctx);   // ?look hook
  }
  // while one district is in focus the others drop to contour (their accents off), so the only highlight on
  // screen is the focused story's; on the map everything is drawn in full
  function focusDim(id) {
    for (const [k, d] of Object.entries(D)) {
      if (k === id) { dim(d.group, 0); continue; }
      dim(d.group, id ? 0.72 : 0);
      if (!id) d.emphasize?.(null);
    }
  }
  return { D, life, scenery, update, ground, sea, footprint, focusDim, heightAt, THREE };
}
