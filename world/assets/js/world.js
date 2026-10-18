// Assembles the whole world: terrain, the agent sea, nine districts and the life that connects them.
import * as THREE from '../vendor/three.module.min.js';
import { buildTerrain, buildSea } from './terrain.js';
import { buildCore } from './d-core.js';
import { buildOracle } from './d-oracle.js';
import { buildJudge } from './d-judge.js';
import { buildTrust } from './d-trust.js';
import { buildMemory } from './d-memory.js';
import { buildGates } from './d-gates.js';
import { buildFoundry } from './d-foundry.js';
import { buildMarket } from './d-market.js';
import { buildUnder } from './d-under.js';
import { buildLife } from './life.js';
import { CLOCK } from './mat.js';

// neighbours that stand between a district's camera and its subject dissolve while that district is in focus
const ASIDE = { trust: ['oracle'], oracle: ['trust', 'foundry'] };

export function buildWorld(scene, { head }) {
  const { group: ground } = buildTerrain();
  scene.add(ground);
  const sea = buildSea();
  scene.add(sea);
  const D = {
    core: buildCore(),
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
  const life = buildLife(D);
  scene.add(life.group);

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
  }
  return { D, update, ground, sea };
}
