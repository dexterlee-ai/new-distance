// The world disk.  Distance from the centre is distance from people:
//   r <  14  the consumers' town square on the levelled hilltop (SQUARE, square.js)
//   r 16–42  the consumers' land — believed, remembered, wanted   (fingerprint-ridged hills)
//   r 46–68  the AI's water — read, chosen, authorised by AI (an ASCII sea), with the twins' island in it (ISLAND,
//            128 deg: People Model and how it is made) and a bay of it opening into the brands' plateau round the island
//   r 72–96  the brands' shore — judgment, craft, culture        (the brand's own ground)
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, inkDepth } from './mat.js';
import { LOOK, P, figSlot } from './look.js';

export const R = 100;
export const RING = {
  core: [0, 14], heart: [16, 42], sea: [46, 68], shore: [72, 96],
};
export const SEA_Y = 0.35;
export const BASE_Y = -16;

// ---- the twins' island (數位分身 and 數位分身怎麼來, d-core.js / d-twins.js): one island in the AI's water, between
// the brands' shore and the consumers' land, because the digital twins are what now stands between brand and people.
// It lies at 128 deg, r 57.5, between 從想買到下單 (market, inland) and the brands' plateau, which opens into a bay
// round it.  Its shape is drawn round what the two districts stand on over all their beats (their own frames, the
// sunflower's foot at x, z): the hall of 數位分身怎麼來 west and north-west of the flower, the counter and the table of
// 數位分身 south of it (toward the stories' camera), plus a beach.  islandSd(x, z) < 0 on the island (world units,
// signed distance to its waterline); the same function in GLSL (ISL_GLSL) paints its ground and calms its water.
export const ISLAND = { x: -35.4, z: 45.3, r: 46, plateau: 4.5 };
/** the consumers' town square on the levelled hilltop in the middle of their land (square.js lays it out) */
export const SQUARE = { y: 5.0, r: 10 };
// (the hall's block, the counter-and-table block, and a neck between them so the island reads as one)
const ISL_A = [-16.5, -4, 9.5, 12, 4], ISL_B = [1, 11, 10, 13, 7], ISL_C = [-12, 9, 4, 4, 3], ISL_K = 7, ISL_BEACH = 2.6;
const rbox = (px, pz, [cx, cz, hx, hz, r]) => {
  const qx = Math.abs(px - cx) - hx + r, qz = Math.abs(pz - cz) - hz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
};
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
/** signed distance to the island's waterline (world units; < 0 on the island), 99 far from it */
export function islandSd(x, z) {
  const px = x - ISLAND.x, pz = z - ISLAND.z;
  if (px * px + pz * pz > ISLAND.r * ISLAND.r) return 99;
  const wob = 0.5 * Math.sin(x * 0.37 + z * 0.21) + 0.35 * Math.sin(z * 0.43 - x * 0.17 + 1.3);
  return smin(smin(rbox(px, pz, ISL_A), rbox(px, pz, ISL_B), ISL_K), rbox(px, pz, ISL_C), ISL_K) - ISL_BEACH + wob;
}
const g1 = (v) => v.toFixed(2);
/** GLSL: islandSd() for the shaders (the same numbers) */
export const ISL_GLSL = `
      float islBox(vec2 p, vec2 c, vec2 h, float r){ vec2 q = abs(p - c) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      float islSd(vec2 xz){
        vec2 p = xz - vec2(${g1(ISLAND.x)}, ${g1(ISLAND.z)});
        if (dot(p, p) > ${g1(ISLAND.r * ISLAND.r)}) return 99.0;
        float a = islBox(p, vec2(${g1(ISL_A[0])}, ${g1(ISL_A[1])}), vec2(${g1(ISL_A[2])}, ${g1(ISL_A[3])}), ${g1(ISL_A[4])});
        float b = islBox(p, vec2(${g1(ISL_B[0])}, ${g1(ISL_B[1])}), vec2(${g1(ISL_B[2])}, ${g1(ISL_B[3])}), ${g1(ISL_B[4])});
        float c = islBox(p, vec2(${g1(ISL_C[0])}, ${g1(ISL_C[1])}), vec2(${g1(ISL_C[2])}, ${g1(ISL_C[3])}), ${g1(ISL_C[4])});
        float h = max(${g1(ISL_K)} - abs(a - b), 0.0) / ${g1(ISL_K)};
        float d = min(a, b) - h * h * ${g1(ISL_K * 0.25)};
        h = max(${g1(ISL_K)} - abs(d - c), 0.0) / ${g1(ISL_K)};
        d = min(d, c) - h * h * ${g1(ISL_K * 0.25)};
        float wob = 0.5 * sin(xz.x * 0.37 + xz.y * 0.21) + 0.35 * sin(xz.y * 0.43 - xz.x * 0.17 + 1.3);
        return d - ${g1(ISL_BEACH)} + wob;
      }
`;

// ---- ?look only (look.js): the land-use map the ground and the sea read their paint from, 512² over the disk
// (x, z ∈ [-100, 100] → u, v), filled by scenery.js once the districts stand:
//   r: the districts' sites (their clearings) · g: footpaths · b: paving (quays, town squares, roads) · a: water depth
export const LAND = LOOK ? (() => {
  const N = 512, data = new Uint8Array(N * N * 4);
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return { N, data, tex };
})() : null;
// ---- look a only: the districts' stages, 512² over the disk (filled by scenery.js once the districts stand):
//   r: signed distance to the nearest stage's edge, world units, (d / 16 + 0.5) (< 0.5 inside, ±8 units of range)
//   g: that stage's zone (64 brand · 128 ai · 192 consumer), so its rim is printed in its ring's colour
//   b: 255 inside a stage printed as its zone's plate (scenery.js PLATE_STAGE), else 0
export const STAGE = LOOK === 'a' ? (() => {
  const N = 512, data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) data[i * 4] = 255;
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return { N, data, tex, range: 16 };
})() : null;
/** the sun's side (engine.js: the sun at (-70, 120, 50)): a stage's soft shadow falls the other way, this far */
const STAGE_SHADOW = [0.95, -0.66];
const SLOT = (k) => P[k].toFixed(1);
/** GLSL (look a; on the ground it needs isl, the twins' island's distance: its printed shadow is lighter there, as
 *  a screen of lavender dots would read as water): the stage under a district — its clearing: its ring's ground, lighter and calm (no texture), a crisp
 *  rim in its zone's ink, a soft printed shadow outside it on the sun's far side.  Sets p (the slot) and darkens sh in
 *  the shadow; `sea` says whether the shadow falls on water (the sea switches to pencil there, so the composite's
 *  halftone screens it) */
const STAGE_GLSL = (sea) => `
          {
            vec2 suv = xz / 200.0 + 0.5;
            vec4 stg = texture2D(uStage, suv);
            float sd = (stg.r - 0.5) * 16.0;
            // the rim: about 0.45 units, never thinner than a device pixel and a half
            float rimW = max(0.45, 1.5 * fwidth(sd));
            // (a district whose own masses are few on a wide stage: its stage is printed as its plate, b, the zone's
            // plate ink, so it reads as a figure and not as an empty plot)
            if (sd < 0.0) { p = stg.g < 0.375 ? ${SLOT('stageBrand')} : (stg.g < 0.625 ? ${SLOT('stageAi')} : ${SLOT('stageConsumer')}); if (stg.b > 0.5) p = stg.g < 0.375 ? ${figSlot('brand', 'plate').toFixed(1)} : (stg.g < 0.625 ? ${figSlot('ai', 'plate').toFixed(1)} : ${figSlot('consumer', 'plate').toFixed(1)}); ${sea ? 'sh = 0.97;' : ''} }
            else if (sd < rimW) { p = stg.g < 0.375 ? ${SLOT('rimBrand')} : (stg.g < 0.625 ? ${SLOT('rimAi')} : ${SLOT('rimConsumer')}); sh = ${sea ? '0.97' : '1.0'}; }
            else {
              float so = (texture2D(uStage, suv - vec2(${STAGE_SHADOW[0].toFixed(3)}, ${STAGE_SHADOW[1].toFixed(3)}) / 200.0).r - 0.5) * 16.0;
              float shd = (1.0 - smoothstep(-0.4, 2.4, so)) * smoothstep(rimW, rimW + 0.25, sd);
              ${sea ? `if (shd > 0.02) { st = 0.0; sh = mix(0.95, 0.5, shd); }` : `sh *= 1.0 - (isl < 0.5 ? 0.22 : 0.44) * shd;`}
            }
          }
`;
/** GLSL: value noise on dHash (mat.js), for the look's ground and sea */
const GN = `
      float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        float a = dHash(i), b = dHash(i + vec2(1.0, 0.0)), c = dHash(i + vec2(0.0, 1.0)), d = dHash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
`;
/** GLSL (?look): the ground's paint slot from where it is: zone, height above the water, slope, the land-use map */
const GROUND_PAINT = () => `
        {
          vec2 xz = vWPos.xz;
          float r = length(xz);
          float wl = vWPos.y - ${SEA_Y.toFixed(2)};
          vec4 land = texture2D(uLand, xz / 200.0 + 0.5);
          vec3 nW = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
          float slope = 1.0 - abs(nW.y);
          float n1 = gn(xz * 0.075), n2 = gn(xz * 0.23 + 11.0), n3 = gn(xz * 0.05 + 37.0);
          float p;
          if (r < 46.0) {
            // the consumers' land: two meadows, a patchwork of striped fields on the gentler slopes, a lawn on the dome
            p = n1 + (n2 - 0.5) * 0.35 > 0.52 ? ${SLOT('meadow2')} : ${SLOT('meadow')};
            vec2 cellId = floor(xz / 13.0 + vec2(0.37, 0.71));
            float fa = dHash(cellId + 3.3) * 3.14159;
            float fieldOn = step(0.56, gn(xz * 0.05 + 5.0)) * step(slope, 0.32) * step(16.5, r) * step(r, 40.0) * step(0.25, dHash(cellId + 9.1));
            if (fieldOn > 0.5) p = fract(dot(xz, vec2(cos(fa), sin(fa))) * 0.62) > 0.5 ? ${SLOT('field')} : ${SLOT('field2')};
            if (r < 14.5) p = ${SLOT('lawn')};
${LOOK === 'a' ? `            // the printed map's contour lines on the hills
            float cz = vWPos.y * 0.9;
            float cw = fwidth(cz);
            if (wl > 1.3 && r > 15.0 && abs(fract(cz) - 0.5) > 0.5 - cw * 0.8) p = ${SLOT('contour')};
` : ''}
          } else {
            // the brand's plateau: sandstone in two tones, its cliff, small parks
            p = n1 + (n2 - 0.5) * 0.3 > 0.6 ? ${SLOT('stone2')} : ${SLOT('stone')};
            if (n3 > 0.7 && wl > 3.0) p = ${SLOT('park')};
            if (slope > 0.45) p = ${SLOT('rock')};
          }
          // the twins' island: the AI's own ground (two quiet tones), its own pale beach
          float isl = islSd(xz);
          if (isl < 0.4) p = n1 + (n2 - 0.5) * 0.3 > 0.55 ? ${SLOT('islGround2')} : ${SLOT('islGround')};
          // the banks: sand on the consumers' side, rock on the brand's, the island's own shore
          if (wl < 1.0 && r < 54.0) p = ${SLOT('sand')};
          if (wl < 0.9 && r >= 54.0) p = ${SLOT('rock')};
          // (the island's beach and its surf by its own outline, isl, not by the mesh's height: a band read off the
          // interpolated height would follow the ground's triangles and print a stepped coast)
          if (isl > -1.0 && isl < 1.5) p = ${SLOT('islShore')};
          // paving, footpaths, the districts' own sites
          if (land.b > 0.5) p = r < 46.0 ? ${SLOT('path')} : ${SLOT('quay')};
          // the town square (square.js): warm paving laid in rings of setts round the column, its joints only seen close
          if (land.b > 0.5 && r < ${(SQUARE.r + 0.8).toFixed(1)}) {
            float cr = r * 0.9, jw = fwidth(cr);
            float seg = abs(fract(atan(xz.y, xz.x) * max(floor(cr), 1.0) * 0.955) - 0.5);
            float joint = step(0.43, abs(fract(cr) - 0.5)) + step(0.45, seg);
            p = joint > 0.5 && jw < 0.16 ? ${SLOT('sqPave2')} : ${SLOT('sqPave')};
          }
          if (land.g > 0.5) p = ${SLOT('path')};
${LOOK === 'a' ? `          // (look a: the districts stand on stages, below)` : `          // (b, c: each site is a plot laid for its district, edged with a kerb — the base a model stands on)
          if (land.r > 0.5) p = land.r < 0.66 ? ${SLOT('kerb')} : (r < 46.0 ? ${SLOT('clear')} : ${SLOT('clear2')});`}
          // surf where the water meets the land
          if (isl < 4.0 ? isl > -0.1 && isl < 0.3 + 0.1 * sin(xz.x * 0.9 + xz.y * 0.7 + uTime * 1.3) : wl > -0.05 && wl < 0.28 + 0.12 * sin(xz.x * 0.9 + xz.y * 0.7 + uTime * 1.3)) p = ${SLOT('foam')};${LOOK === 'a' ? STAGE_GLSL(false) : ''}
          // seen close, grass is not one flat colour: tufts (darker specks) and, in b, wildflowers; both fade out with
          // the ground's size on screen, so the map seen whole stays calm
          {
            float grass = step(abs(p - ${SLOT('meadow')}), 0.1) + step(abs(p - ${SLOT('meadow2')}), 0.1) + step(abs(p - ${SLOT('lawn')}), 0.1) + step(abs(p - ${SLOT('park')}), 0.1);
            float near = 1.0 - smoothstep(0.1, 0.26, fwidth(xz.x) + fwidth(xz.y));
            if (grass > 0.5 && near > 0.01) {
              vec2 q = xz * 1.9, cq = floor(q);
              float hq = dHash(cq + 13.7);
              float dd = length(fract(q) - 0.5 - (vec2(dHash(cq + 2.1), dHash(cq + 5.3)) - 0.5) * 0.5);
              if (hq > 0.5 && dd < 0.24) sh *= 1.0 - 0.11 * near;
${LOOK === 'b' ? `              if (hq > 0.955 && dd < 0.18 && near > 0.5) p = hq > 0.982 ? ${SLOT('garden')} : ${SLOT('blossom')};
` : ''}            }
          }
          pn = p;${LOOK === 'a' ? '' : `
          // painted ground is never quite flat: a slow variation of its light, like gouache on board
          sh = clamp(sh * (0.93 + 0.1 * n1 + 0.04 * n2), 0.0, 1.0);`}
        }
`;
// the terrain mesh: rings out to the rim (denser near the shore so the rim stays round) and columns of 1°
const NR = 150, NA = 360;
const ringR = (i) => R * Math.pow(i / NR, 0.92);
/**
 * The dock (組織文化, article 16): a slot cut into the rim at 216°–239°, from the ring nearest r 90 out to the rim.
 * The ship is stranded at th (232°) and, afloat, sails off toward 216° a hull length and more: the slot runs on that
 * way, past its bow at the end of the run (nothing else stands on the rim between 216° and 221°).
 * Inside it the ground is gone down to the dock floor; the slot holds water at SEA_Y, and below the waterline its
 * walls are solid ink (the dark water a section drawing shows), above it they show the rim's strata.  Seen from
 * outside the rim, the cut is one frame through the waterline: a ship above, the iceberg's mass below.
 * Its edges lie on the mesh's own rings and columns (i0, a0, a1), so the hole in the ground and the walls meet exactly.
 */
export const DOCK = { a0: 216, a1: 239, th: 232, i0: 133, r0: ringR(133), r1: R, floor: BASE_Y + 0.2 };
/** the dock's section seen from the map (1) or from 組織文化's own camera (0, world.js eases it while that district is
 *  in focus): from the map the water in the cut is a light printed blue, a section drawing's water, never a dark box
 *  on the rim; up close it darkens with depth to solid ink at the floor, the iceberg's mass white against it */
export const DOCK_U = { uDockMap: { value: 1 } };
/** inside the dock's slot (its open edges excluded: the shore along them keeps its height) */
const DOCK_R0SQ = (DOCK.r0 + 1e-3) ** 2, DOCK_R1SQ = (R + 0.5) ** 2;
export function inDock(x, z) {
  // cheap first: heightAt is called for every vertex of the disk, and almost all of them are well inside the rim
  if (z > 0 || x > 0) return false;              // 216°–239° lies in the quadrant x < 0, z < 0
  const r2 = x * x + z * z;
  if (r2 <= DOCK_R0SQ || r2 > DOCK_R1SQ) return false;
  let a = (Math.atan2(z, x) * 180) / Math.PI;
  if (a < 0) a += 360;
  return a > DOCK.a0 + 1e-3 && a < DOCK.a1 - 1e-3;
}

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// fingerprint-like ridges: rings around a few drifting centres, warped by noise
function ridges(x, z) {
  const w = (fbm(x * 0.03 + 7, z * 0.03) - 0.5) * 9;
  const c1 = Math.hypot(x - 8 + w, z + 6), c2 = Math.hypot(x + 14, z - 12 + w * 0.6);
  const d = Math.min(c1 * 1.0, c2 * 1.15 + 3);
  return Math.sin(d * 1.45);
}

/** ground height at (x, z) — exported so districts can sit on the terrain */
export function heightAt(x, z) {
  // the dock: the ground is cut away down to its floor (the water stands at SEA_Y)
  if (inDock(x, z)) return DOCK.floor;
  const r = Math.hypot(x, z);
  const n = fbm(x * 0.045, z * 0.045);
  // heartland hills with fingerprint ridges
  const hills = 1.6 + n * 7.5 + ridges(x, z) * 0.55 * smooth(15, 22, r) * (1 - smooth(38, 43, r));
  // the hill in the middle of the consumers' land, its top levelled for the town square (SQUARE: flat out to r 10)
  const coreH = r < 13 ? smin(9.5 - 7.3 * smooth(4, 15, r), SQUARE.y, 1.5) : 9.5 - 7.3 * smooth(4, 15, r);
  // sea floor and shore plateau
  const floor = -3.8 + n * 1.5;
  const shore = 5.6 + (fbm(x * 0.05 + 3, z * 0.05 - 2) - 0.5) * 1.1;
  let h = r < 15 ? coreH + (hills - 2.2) * smooth(9, 15, r) : hills;
  // near the twins' island both shores give way to its water: the consumers' coast a little, the brands' plateau
  // opens into a bay round it (about five units of channel)
  const di = r > 40 ? islandSd(x, z) : 99;
  h += (floor - h) * Math.max(smooth(41, 47.5, r), 1 - smooth(3, 6, di));
  h += (shore - h) * smooth(66, 73, r) * smooth(3.5, 7.5, di);
  if (di < 6) {
    // the island: a low plateau (a little higher round the flower's foot), a beach, its slope down to the sea floor
    const fx = x - ISLAND.x, fz = z - ISLAND.z;
    const top = ISLAND.plateau + 1.1 * (1 - smooth(3, 17, Math.hypot(fx, fz))) + (fbm(x * 0.07 + 9, z * 0.07 - 4, 3) - 0.5) * 0.8;
    const wl = SEA_Y + 0.22;
    const hi = di < 0 ? wl + (top - wl) * smooth(0, 3.4, -di) : wl + (floor - wl) * smooth(0, 3, di);
    h += (hi - h) * (1 - smooth(2.5, 6, di));
  }
  return h;
}

export function buildTerrain() {
  const group = new THREE.Group();
  const pos = [], idx = [];
  // a quad of the ground between ring i and i + 1, columns j and j + 1, inside the dock: not drawn
  const cut = (i, j) => i >= DOCK.i0 && j >= DOCK.a0 && j < DOCK.a1;
  // centre vertex + rings (denser near the shore so the rim stays round)
  pos.push(0, heightAt(0, 0), 0);
  for (let i = 1; i <= NR; i++) {
    const r = ringR(i);
    for (let j = 0; j < NA; j++) {
      const a = (j / NA) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, heightAt(x, z), z);
    }
  }
  for (let j = 0; j < NA; j++) idx.push(0, 1 + ((j + 1) % NA), 1 + j);
  for (let i = 1; i < NR; i++) {
    const a0 = 1 + (i - 1) * NA, a1 = 1 + i * NA;
    for (let j = 0; j < NA; j++) {
      if (cut(i, j)) continue;
      const j1 = (j + 1) % NA;
      idx.push(a0 + j, a0 + j1, a1 + j, a0 + j1, a1 + j1, a1 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, LOOK ? ink({
    // ?look: the same ground, painted by where it is (GROUND_PAINT); b and c keep more of the light's relief
    shade: 1.08, bias: 0.06,
    uniforms: LOOK === 'a' ? { uLand: { value: LAND.tex }, uStage: { value: STAGE.tex } } : { uLand: { value: LAND.tex } },
    hooks: {
      key: 'ground-look',
      fHead: GN + ISL_GLSL,
      fOut: `
        float r = length(vWPos.xz);
        sh = 1.0 - (1.0 - sh) * ${LOOK === 'a' ? '0.62' : '0.9'};
        sh = clamp(sh + ${LOOK === 'a' ? '0.06' : '0.02'} * (1.0 - smoothstep(14.0, 42.0, r)), 0.0, 1.0);
${GROUND_PAINT()}`,
    },
  }) : ink({
    shade: 1.08, bias: 0.06,
    hooks: {
      key: 'ground',
      fOut: `
        float r = length(vWPos.xz);
        // the shore is drawn a touch darker, the heartland lighter: paper shows through near people
        // flatten gentle slopes so only real relief and cast shadows are drawn
        sh = 1.0 - (1.0 - sh) * 0.62;
        sh = clamp(sh + 0.06 * (1.0 - smoothstep(14.0, 42.0, r)), 0.0, 1.0);
      `,
    },
  }));
  ground.receiveShadow = true;
  ground.castShadow = true;
  ground.name = 'ground';
  group.add(ground);

  // rim wall: the world is a cut disk floating on paper, its edge shows strata
  const wpos = [], widx = [];
  const NV = 10;
  for (let j = 0; j <= NA; j++) {
    const a = (j / NA) * Math.PI * 2;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    const top = heightAt(x, z);
    for (let k = 0; k <= NV; k++) {
      const y = top + (BASE_Y - top) * (k / NV);
      wpos.push(x, y, z);
    }
  }
  for (let j = 0; j < NA; j++) for (let k = 0; k < NV; k++) {
    if (j >= DOCK.a0 && j < DOCK.a1) continue;   // the dock's mouth is open
    const a = j * (NV + 1) + k, b = (j + 1) * (NV + 1) + k;
    widx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
  wg.setIndex(widx);
  wg.computeVertexNormals();
  const wall = new THREE.Mesh(wg, ink({
    hooks: {
      key: 'wall',
      fOut: `
        // strata bands: alternating light / dark layers like a geological section
        float y = vWPos.y;
        float band = smoothstep(0.42, 0.5, abs(fract(y * 0.16 + 0.12 * sin(atan(vWPos.z, vWPos.x) * 5.0)) - 0.5));
        sh = clamp(0.74 + sh * 0.22 - band * 0.26, 0.0, 1.0);${LOOK ? `
        pn = band > 0.5 ? ${SLOT('strata2')} : ${SLOT('strata')};` : ''}
      `,
    },
  }));
  wall.receiveShadow = true;
  group.add(wall);
  group.add(buildDock(wall.material));

  // underside: a slightly domed bottom so the floating disk reads from low angles
  const bg = new THREE.CircleGeometry(R, 120);
  bg.rotateX(Math.PI / 2);
  bg.translate(0, BASE_Y, 0);
  const bottom = new THREE.Mesh(bg, ink({ shade: 0.32, paint: LOOK ? P.under : 0 }));
  group.add(bottom);

  return { group, ground };
}

/** the dock's walls, floor, water and waterline (see DOCK); strata: the rim wall's own material (one program) */
function buildDock(strata) {
  const g = new THREE.Group();
  g.name = 'dock';
  const col = (j) => (j / NA) * Math.PI * 2;          // the mesh's own column angles, so the edges meet exactly
  const at = (i, j) => { const a = col(j), r = ringR(i); return [Math.cos(a) * r, Math.sin(a) * r]; };
  const NV = 12;
  // one wall: a strip of (x, z) points along its top edge, from y0(x, z) down to y1, its faces toward the inside of
  // the dock when `flip` says so
  function strip(pts, flip, y0, y1) {
    const p = [], ix = [];
    pts.forEach(([x, z]) => {
      const top = y0(x, z);
      for (let k = 0; k <= NV; k++) p.push(x, top + (y1 - top) * (k / NV), z);
    });
    for (let n = 0; n < pts.length - 1; n++) for (let k = 0; k < NV; k++) {
      const a = n * (NV + 1) + k, b = (n + 1) * (NV + 1) + k;
      if (flip) ix.push(a, a + 1, b, b, a + 1, b + 1); else ix.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    return geo;
  }
  const radial = (j) => Array.from({ length: NR - DOCK.i0 + 1 }, (_, n) => at(DOCK.i0 + n, j));
  const back = Array.from({ length: DOCK.a1 - DOCK.a0 + 1 }, (_, n) => at(DOCK.i0, DOCK.a0 + n));
  // above the water the cut shows the rim's strata; below it, water as a section drawing shows it: lit under the
  // surface (a light tone with a few level water lines), darker with depth, solid ink at the bottom — so the cut reads
  // as water seen through its side, not as a black box or a hole in the ground
  const deep = ink({
    uniforms: DOCK_U,
    hooks: {
      key: 'dock-deep',
      fOut: `
        float dp = ${SEA_Y.toFixed(2)} - vWPos.y;
        // (from the map the depth only goes half as dark, and the floor stays water)
        float kd = smoothstep(0.15, 9.5, dp) * (1.0 - 0.6 * uDockMap);
        sh = mix(0.76, 0.1, kd);
        // level water lines in the lit band under the surface, closer together near it
        float q = sqrt(max(dp, 0.0)) * 2.1 + 0.05 * sin(vWPos.x * 0.7 + vWPos.z * 0.7);
        float wl = abs(fract(q) - 0.5);
        sh = mix(sh, mix(0.12, 0.5, uDockMap), (1.0 - smoothstep(0.035, 0.07, wl)) * step(0.45, dp) * (1.0 - smoothstep(4.0, 6.0, dp)));
        float floorInk = step(10.5, dp) * step(uDockMap, 0.5);
        if (floorInk > 0.5) ac = 1.0;${LOOK ? `
        pn = ${P.water.toFixed(1)} + 7.0 * kd;
        if (floorInk > 0.5) pn = 0.0;` : ''}
      `,
    },
  });
  for (const [pts, flip] of [[radial(DOCK.a0), true], [radial(DOCK.a1), false], [back, false]]) {
    const up = new THREE.Mesh(strip(pts, flip, heightAt, SEA_Y), strata);
    const down = new THREE.Mesh(strip(pts, flip, () => SEA_Y, BASE_Y), deep);
    for (const m of [up, down]) { m.receiveShadow = true; m.castShadow = false; m.name = 'dock-wall'; g.add(m); }
  }
  // the floor and the water: the same sector of the mesh's rings and columns
  const sector = (y) => {
    const p = [], ix = [], nj = DOCK.a1 - DOCK.a0;
    for (let i = DOCK.i0; i <= NR; i++) for (let n = 0; n <= nj; n++) { const [x, z] = at(i, DOCK.a0 + n); p.push(x, y, z); }
    for (let i = 0; i < NR - DOCK.i0; i++) for (let n = 0; n < nj; n++) {
      const a = i * (nj + 1) + n, b = (i + 1) * (nj + 1) + n;
      ix.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    return geo;
  };
  const floor = new THREE.Mesh(sector(DOCK.floor), deep);
  floor.name = 'dock-floor';
  floor.castShadow = false;
  g.add(floor);
  // the water: real water, so pencil (the AI zone's sea is typed); a slow swell, a light tone (it is not the paper
  // of the shore around it) and drawn ripples
  const water = new THREE.Mesh(sector(SEA_Y), ink({
    shade: 0.95, bias: 0.04, side: THREE.DoubleSide,
    hooks: {
      key: 'dock-water',
      vPos: `
        transformed.y += sin(transformed.x * 0.7 + uTime * 0.9) * 0.05 + sin(transformed.z * 0.9 - uTime * 0.7) * 0.04;
      `,
      fOut: `
        sh = min(sh, 0.8);${LOOK ? `
        pn = ${(P.water + 1).toFixed(1)};` : ''}
      `,
    },
  }));
  water.name = 'dock-water';
  water.receiveShadow = true;
  water.castShadow = false;
  g.add(water);
  // ripples: short level pencil strokes lying on the water in rows along the mouth, the way a drawing says "water"
  // (seen from just above it, a mark drawn flat on the surface would vanish; strokes keep a line's width)
  const RR = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const lineGeo = (pts, r) => {
    const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(6, pts.length * 3), r, 4, false);
    const n = t.index ? t.toNonIndexed() : t;
    for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
    return n;
  };
  {
    const parts = [];
    for (let row = 0; row < 9; row++) {
      const r = R - 0.55 - row * 1.05;
      if (r < DOCK.r0 + 0.4) break;
      let a = DOCK.a0 + 0.35 + RR() * 1.2;
      while (a < DOCK.a1 - 0.6) {
        const len = (1.1 + RR() * 1.6) / r * (180 / Math.PI);       // a dash 1.1–2.7 long
        const a1 = Math.min(a + len, DOCK.a1 - 0.35);
        const pts = [];
        for (let i = 0; i <= 4; i++) {
          const aa = ((a + (a1 - a) * (i / 4)) / 180) * Math.PI;
          const rr = r + Math.sin(i * 1.7 + row) * 0.07;
          pts.push(new THREE.Vector3(Math.cos(aa) * rr, SEA_Y + 0.13, Math.sin(aa) * rr));
        }
        parts.push(lineGeo(pts, 0.05));
        a = a1 + (0.9 + RR() * 1.8) / r * (180 / Math.PI) * (1 + row * 0.12);
      }
    }
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink' }));
    m.name = 'dock-ripples';
    m.castShadow = false;
    g.add(m);
  }
  // the waterline seen edge-on across the mouth: an undulating ink line at the rim, the edge of the section
  {
    const pts = [];
    for (let j = DOCK.a0; j <= DOCK.a1 + 1e-6; j += 0.25) {
      const a = (j / 360) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * (R + 0.06), SEA_Y + 0.11 * Math.sin(j * 4.1), Math.sin(a) * (R + 0.06)));
    }
    const line = new THREE.Mesh(lineGeo(pts, 0.11), ink({ accent: 'ink' }));
    line.name = 'dock-waterline';
    line.castShadow = false;
    g.add(line);
  }
  return g;
}

/** the agent layer: a circulating sea of glyphs between the heartland and the shore */
export function buildSea() {
  // a polar sheet over the AI's water and the bay round the twins' island (out to r 92), without the quads that lie
  // wholly under dry ground or in the dock (its own water)
  const R0 = RING.sea[0] - 4, R1 = 92, NRS = 52, NAS = 360;
  const pos = new Float32Array((NRS + 1) * NAS * 3), nor = new Float32Array((NRS + 1) * NAS * 3), dry = new Uint8Array((NRS + 1) * NAS);
  for (let i = 0; i <= NRS; i++) {
    const r = R0 + ((R1 - R0) * i) / NRS;
    for (let j = 0; j < NAS; j++) {
      const a = (j / NAS) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, k = i * NAS + j;
      pos.set([x, SEA_Y, z], k * 3); nor.set([0, 1, 0], k * 3);
      dry[k] = inDock(x, z) || heightAt(x, z) > SEA_Y + 1.2 ? 1 : 0;
    }
  }
  const idx = [];
  for (let i = 0; i < NRS; i++) for (let j = 0; j < NAS; j++) {
    const a = i * NAS + j, b = i * NAS + ((j + 1) % NAS), c = a + NAS, d = b + NAS;
    if (dry[a] && dry[b] && dry[c] && dry[d]) continue;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  const hooks = {
    key: 'sea',
    vPos: `
      float rr = length(transformed.xz);
      float aa = atan(transformed.z, transformed.x);
      transformed.y += sin(aa * 18.0 + rr * 0.6 - uTime * 0.8) * 0.18 + sin(rr * 1.3 + uTime * 0.6) * 0.12;
    `,
    fHead: `
      float sn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        float a=dHash(i), b=dHash(i+vec2(1,0)), c=dHash(i+vec2(0,1)), d=dHash(i+vec2(1,1));
        return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
    ` + ISL_GLSL,
    fOut: `
      float r = length(vWPos.xz);
      float a = atan(vWPos.z, vWPos.x);
      // the current circulates around the heartland: streams of text flowing clockwise
      float flow = a * r * 0.5 + uTime * 2.2;
      float band = sin(r * 1.15 + sn(vec2(flow * 0.08, r * 0.2)) * 3.0);
      float stream = sn(vec2(flow * 0.35, r * 0.9));
      sh = 0.58 + 0.22 * band + 0.25 * (stream - 0.5);
      // calmer, lighter water near the banks: the consumers', the brands' (and the bay's, round the twins' island) and
      // the island's own
      float isl = islSd(vWPos.xz);
      float bay = 1.0 - smoothstep(7.0, 10.0, isl);
      float calm = smoothstep(RIN + 3.0, RIN - 2.0, r) + smoothstep(ROUT - 3.0, ROUT + 3.0, r) * (1.0 - bay)
        + (1.0 - smoothstep(0.0, 2.2, isl)) + smoothstep(3.2, 5.2, isl) * bay * smoothstep(ROUT - 6.0, ROUT, r);
      sh = mix(sh, 0.97, clamp(calm, 0.0, 1.0));
      st = 1.0;
    `.replace('RIN', RING.sea[0].toFixed(1)).replace('RIN', RING.sea[0].toFixed(1)).replace(/ROUT/g, RING.sea[1].toFixed(1)),
  };
  if (LOOK) {
    // ?look: water with depth (the land-use map's a: shallow by the banks, deep in the channel) under the type;
    // a printed map (a) bands it like a chart, the others shade it smoothly
    hooks.key = 'sea-look';
    hooks.fOut += `
      {
        float dep = texture2D(uLand, vWPos.xz / 200.0 + 0.5).a;
        dep = clamp(dep + (sn(vWPos.xz * 0.12 + uTime * 0.05) - 0.5) * 0.12, 0.0, 1.0);
        ${LOOK === 'a' ? 'dep = floor(dep * 3.999) / 3.0;' : ''}
        pn = ${P.water.toFixed(1)} + 7.0 * dep;${LOOK === 'a' ? '' : `
        // light moving over the water: brighter patches drift with the wind
        float rip = smoothstep(0.6, 0.82, sn(vWPos.xz * 0.3 + vec2(uTime * 0.11, -uTime * 0.07)) * 0.6 + sn(vWPos.xz * 0.7 - vec2(uTime * 0.05, uTime * 0.12)) * 0.4);
        pn = max(${P.water.toFixed(1)}, pn - rip * 1.7);`}
        // the type thins out over the shallows: the current runs in the deep channel
        sh = mix(0.97, sh, smoothstep(0.08, 0.45, dep));${LOOK === 'a' ? `
        vec2 xz = vWPos.xz;
        float p = pn;${STAGE_GLSL(true)}
        pn = p;` : ''}
      }
    `;
  }
  const m = ink({ style: 1, hooks, uniforms: LOOK === 'a' ? { uLand: { value: LAND.tex }, uStage: { value: STAGE.tex } } : LOOK ? { uLand: { value: LAND.tex } } : undefined });
  const sea = new THREE.Mesh(g, m);
  sea.receiveShadow = true;
  sea.name = 'sea';
  return sea;
}

export { inkDepth };
