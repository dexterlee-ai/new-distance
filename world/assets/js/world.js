// Assembles the whole world: terrain, the agent sea, ten districts (two of them on the twins' island in the AI's
// water), the consumers' town square and the life that connects them.
import * as THREE from '../vendor/three.module.min.js';
import { buildTerrain, buildSea, heightAt, SEA_Y, ISLAND, DOCK_U } from './terrain.js';
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
import { buildSquare } from './square.js';
import { CLOCK, ink, dim } from './mat.js';
// ---- ?look hook (map art direction, scenery.js): the world's own environment; null without ?look ----
import { buildScenery } from './scenery.js';

// neighbours that stand between a district's camera and its subject dissolve while that district is in focus
// (core and twins, on their island, have open water and the brands' bay between their camera and them: none)
const ASIDE = { trust: ['oracle'], oracle: ['trust', 'foundry'], gates: ['market'], memory: ['oracle'], under: ['judge', 'gates'] };

export function buildWorld(scene, { head }) {
  const { group: ground } = buildTerrain();
  scene.add(ground);
  const sea = buildSea();
  scene.add(sea);
  const D = {
    // the twins' island in the AI's water (terrain.js ISLAND): the flower's foot there, the hall beside it
    core: buildCore({ origin: [ISLAND.x, ISLAND.z] }),
    twins: null,
    oracle: buildOracle(head),
    judge: buildJudge(),
    under: buildUnder(),
    foundry: buildFoundry(),
    trust: buildTrust(),
    memory: buildMemory(),
    gates: buildGates(),
    market: buildMarket(),
  };
  D.twins = buildTwins({ core: D.core });
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
    // (the core's ring round its flower and counter; the twins' round its hall, centred on the hall, not the clock)
    const c = id === 'twins' ? d.group.localToWorld(new THREE.Vector3(0.2, 0, 2.5)) : id === 'core' ? d.group.localToWorld(new THREE.Vector3(1, 0, 7)) : d.pin || d.anchor;
    const r = id === 'core' ? 15 : id === 'under' ? 10 : id === 'twins' ? 15 : 12;
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
  // the consumers' town square in the middle, between 品牌怎麼被相信, 品牌記憶 and 從想買到下單 (square.js)
  const square = buildSquare(D);
  scene.add(square.group);
  const life = buildLife(D);
  scene.add(life.group);
  // ---- ?look hook: the environment (needs the districts, the square and the flows' courses to keep clear of them) ----
  const scenery = buildScenery(D, { life, square });
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
    // the dock's section: a light printed water from the map, dark with depth only in 組織文化's own view (it changes
    // with the focus, as the other districts' dimming does)
    DOCK_U.uDockMap.value = ctx && ctx.focus === 'under' ? 0 : 1;
    for (const d of Object.values(D)) d.update(t, dt, ctx);
    life.update(t, dt, ctx);
    scenery?.update(t, dt, ctx);   // ?look hook
  }
  // while one district is in focus the others drop to contour (their accents off), so the only highlight on
  // screen is the focused story's; on the map everything is drawn in full
  function focusDim(id) {
    // (the square is the setting of the consumers' three districts: in any district it drops to its contour)
    dim(square.group, id ? 0.72 : 0);
    for (const [k, d] of Object.entries(D)) {
      if (k === id) { dim(d.group, 0); continue; }
      // (the sunflower beside 數位分身怎麼來 is that story's end: it dims only a little, so its petals keep their colour --
      // the composite takes a district's fill away from a dim of 0.2 on, all of it by 0.62)
      dim(d.group, !id ? 0 : id === 'twins' && k === 'core' ? 0.3 : 0.72);
      if (!id) d.emphasize?.(null);
    }
  }
  return { D, life, scenery, square, update, ground, sea, footprint, focusDim, heightAt, THREE };
}
