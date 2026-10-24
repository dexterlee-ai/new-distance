// Map-scale presence for the districts that need it (look a only).  At map distance a district is a figure on the
// printed ground: what it stands on and its masses are printed in its ring's inks, strong enough to read as a place
// beside its neighbours.  Up close the story draws itself exactly as before: everything here shows only while the
// reader looks at the map (a zone view included) and drops away as the reader enters any district, on the same
// clock as the setting's own colour (look.js LOOK_U.calm, eased by scenery.js).
//   mapInk(o)      an ink() material drawn only on the map: screen-door faded out as calm rises (gone at 0.6)
//   mapOnly(obj)   hides an object from the build of the map (the stages, the spot fills and the scenery are laid
//                  from what a district stands up at build time: map-only geometry must not move them) and shows it
//                  from the first frame on, while calm is under 0.6 (where mapInk's fade ends): a fully faded ink
//                  still leaves a sparse pattern of pixels (its dither hash is not quite random), so up close the
//                  object is not drawn at all
//   mapPaint(zone) the map's spot fill for a district's own materials: { add(material, kind), update() } -- update()
//                  every frame (ambient) prints `kind` while calm < 0.5 and the fill the map gave it otherwise
//   liftAtBuild(parent, objs)  what floats on the water (a fleet) is held up while the map is
//                  built and set down on the first frame: a stage is printed under whatever of a district stands on the
//                  ground or the water, and under a fleet it read as a pier.  Held up, it still counts as a silhouette
//                  the scenery and the zone names keep clear of.  (All looks: it only moves a holder group.)
//   hideAtBuild(parent, objs)  something added to a story that the map's build must not see (it is shown from the
//                  first frame on), so the setting is laid exactly as before
//   groundPlate(outline, gy, o)  a sheet laid on the ground over a convex outline (local x, z points), following the
//                  ground's height, with a low raised border round it: what a district stands on at map scale
//   roundRect(x0, x1, z0, z1, r, n)  a convex outline for groundPlate
import * as THREE from '../vendor/three.module.min.js';
import { ink } from './mat.js';
import { LOOK, LOOK_U, figSlot } from './look.js';

export const MAP_CUES = LOOK === 'a';

const FADE = 'op *= 1.0 - smoothstep(0.0, 0.6, uCalm);';

/** an ink() material for map-only geometry; `paint` may be a fig kind ('large' | 'mid' | 'small' | 'plate' |
 *  'people') with `zone`, or a slot number */
export function mapInk(o = {}) {
  const h = o.hooks || {};
  const m = ink({ ...o, paint: 0, uniforms: { ...(o.uniforms || {}), uCalm: LOOK_U.calm }, hooks: { ...h, fOut: (h.fOut || '') + '\n' + FADE } });
  m.userData.mapPaint = typeof o.paint === 'string' ? figSlot(o.zone || 'consumer', o.paint) : (o.paint ?? 0);
  return m;
}

/** map-only objects: kept out of the map's build, shown (with their paint) from the first frame on */
export function mapOnly(...objs) {
  const list = objs.filter(Boolean);
  for (const o of list) o.visible = false;
  let on = false, shown = false;
  return {
    list,
    update() {
      if (!on) {
        on = true;
        for (const o of list) {
          o.traverse((x) => {
            const mats = Array.isArray(x.material) ? x.material : [x.material];
            for (const m of mats) if (m && m.userData && m.userData.u && m.userData.u.uPaint && m.userData.mapPaint != null) m.userData.u.uPaint.value = m.userData.mapPaint;
          });
        }
      }
      const show = MAP_CUES && LOOK_U.calm.value < 0.6;
      if (show !== shown) { shown = show; for (const o of list) o.visible = show; }
    },
  };
}

/** the map's spot fill for a district's own materials (see the head of this file) */
export function mapPaint(zone) {
  const list = [];
  let orig = null, was = null;
  return {
    add(m, kind) { if (m && m.userData && m.userData.u && m.userData.u.uPaint) list.push([m, typeof kind === 'number' ? kind : figSlot(zone, kind)]); return m; },
    update() {
      if (!MAP_CUES || !list.length) return;
      if (!orig) orig = list.map(([m]) => m.userData.u.uPaint.value);
      const map = LOOK_U.calm.value < 0.5;
      if (map === was) return;
      was = map;
      list.forEach(([m, s], i) => { m.userData.u.uPaint.value = map ? s : orig[i]; });
    },
  };
}

/** see the head of this file: a holder group (identity in `parent`) that carries `objs`, `dy` up until update() */
export function liftAtBuild(parent, objs, dy = 8) {
  const holder = new THREE.Group();
  holder.name = 'build-lift';
  parent.add(holder);
  for (const o of objs) if (o) holder.add(o);
  holder.position.y = dy;
  holder.updateMatrixWorld(true);
  let down = false;
  return { holder, update() { if (down) return; down = true; holder.position.y = 0; holder.updateMatrixWorld(true); } };
}

/** a holder group (identity in `parent`) that carries `objs` and is hidden until update(): something added to a
 *  district's story that the map's build (stages, silhouettes, scenery) must not see, so the setting is laid exactly
 *  as before it was added.  (All looks.) */
export function hideAtBuild(parent, objs) {
  const holder = new THREE.Group();
  holder.name = 'build-hide';
  parent.add(holder);
  for (const o of objs) if (o) holder.add(o);
  holder.visible = false;
  let on = false;
  return { holder, update() { if (on) return; on = true; holder.visible = true; } };
}

/** a rounded rectangle's outline (counter-clockwise seen from above, local x, z), n points per corner */
export function roundRect(x0, x1, z0, z1, r, n = 6) {
  const pts = [];
  r = Math.min(r, (x1 - x0) / 2, (z1 - z0) / 2);
  const C = [[x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI], [x1 - r, z0 + r, Math.PI * 1.5]];
  for (const [cx, cz, a0] of C) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return pts;
}

/**
 * A sheet on the ground over a convex outline, and a low border round it (two meshes in one group).
 *  outline  [[x, z], ...] local points, convex, either winding
 *  gy       (x, z) => local ground height
 *  o        { lift = 0.08 (the sheet over the ground), border = 0.55 (its width), rise = 0.32 (its height over the
 *             sheet), rings = 9, fill, edge (materials), sheet = true (false: the border alone, a raised line) }
 */
export function groundPlate(outline, gy, o = {}) {
  const { lift = 0.08, border = 0.55, rise = 0.32, rings = 9 } = o;
  const n = outline.length;
  let cx = 0, cz = 0;
  for (const [x, z] of outline) { cx += x / n; cz += z / n; }
  // the sheet: rings scaled toward the middle, each point on the ground
  const pos = [], idx = [];
  for (let r = 0; r <= rings; r++) {
    const k = 1 - r / rings;
    for (let i = 0; i < n; i++) {
      const x = cx + (outline[i][0] - cx) * k, z = cz + (outline[i][1] - cz) * k;
      pos.push(x, gy(x, z) + lift, z);
    }
  }
  for (let r = 0; r < rings; r++) for (let i = 0; i < n; i++) {
    const a = r * n + i, b = r * n + ((i + 1) % n), c = (r + 1) * n + i, d = (r + 1) * n + ((i + 1) % n);
    idx.push(a, b, c, b, d, c);
  }
  const sheet = new THREE.BufferGeometry();
  sheet.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sheet.setIndex(faceUp(pos, idx));
  sheet.computeVertexNormals();
  // the border: a band along the outline, its outer face down into the ground, its top `rise` over the sheet
  const bp = [], bi = [];
  const out = (i) => {
    const [px, pz] = outline[(i - 1 + n) % n], [nx, nz] = outline[(i + 1) % n];
    let tx = nx - px, tz = nz - pz; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    let ox = tz, oz = -tx;
    const [x, z] = outline[i];
    if ((x - cx) * ox + (z - cz) * oz < 0) { ox = -ox; oz = -oz; }
    return [ox, oz];
  };
  for (let i = 0; i < n; i++) {
    const [x, z] = outline[i], [ox, oz] = out(i);
    const xi = x - ox * border, zi = z - oz * border, g0 = gy(x, z), g1 = gy(xi, zi);
    bp.push(xi, g1 + lift - 0.02, zi, xi, g1 + lift + rise, zi, x, g0 + lift + rise, z, x, g0 - 0.6, z);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 4, b = ((i + 1) % n) * 4;
    for (let s = 0; s < 3; s++) bi.push(a + s, b + s, a + s + 1, b + s, b + s + 1, a + s + 1);
  }
  const band = new THREE.BufferGeometry();
  band.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
  band.setIndex(bi);
  band.computeVertexNormals();
  const g = new THREE.Group();
  g.name = 'map-plate';
  const m1 = o.sheet === false ? null : new THREE.Mesh(sheet, o.fill), m2 = new THREE.Mesh(band, o.edge || o.fill);
  for (const m of [m1, m2]) if (m) { m.castShadow = false; m.receiveShadow = true; g.add(m); }
  return { group: g, sheet: m1, border: m2 };
}
/** the triangles of a ground sheet wound to face up */
function faceUp(pos, idx) {
  const out = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vz = pos[c + 2] - pos[a + 2];
    const ny = uz * vx - ux * vz;
    if (ny >= 0) out.push(idx[t], idx[t + 1], idx[t + 2]); else out.push(idx[t], idx[t + 2], idx[t + 1]);
  }
  return out;
}
