// One kind of picking for every state: a tap on the world asks, in order, for a part of the district in focus,
// then for any district, then for the ground.  Parts answer through their hit proxies (enlarged boxes);
// districts through a sphere around their footprint, or a tap on the ground inside that footprint (a low stage the
// sphere's ray passes over still answers for its district).
import * as THREE from '../vendor/three.module.min.js';

export class Picker {
  constructor(E, world) {
    this.E = E;
    this.world = world;
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.spheres = Object.fromEntries(Object.entries(world.D).map(([id, d]) => {
      const box = new THREE.Box3().setFromObject(d.group);
      const s = new THREE.Sphere();
      box.getBoundingSphere(s);
      // a district's own footprint, not the far-flung bits some of them carry (beams, boats)
      const c = (d.pin || d.anchor).clone();
      c.y = Math.min(c.y, s.center.y);
      return [id, new THREE.Sphere(c, Math.min(s.radius, 18))];
    }));
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.foot = null;     // { id: radius } of each district's footprint on the ground (the UI's stage radii)
    this._v = new THREE.Vector3();
  }

  _cast(x, y) {
    this.ndc.set((x / this.E.w) * 2 - 1, -(y / this.E.h) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.E.camera);
    return this.ray;
  }

  /** @returns {{kind:'part', id, part}|{kind:'district', id}|{kind:'ground', point}|null} */
  pick(x, y, focusId) {
    const ray = this._cast(x, y);
    const D = this.world.D;
    const fd = focusId && D[focusId];
    if (fd && fd.parts) {
      const proxies = Object.entries(fd.parts).filter(([, p]) => p.hit).map(([k, p]) => { p.hit.userData.part = k; return p.hit; });
      const hit = ray.intersectObjects(proxies, false)[0];
      if (hit) return { kind: 'part', id: focusId, part: hit.object.userData.part, point: hit.point };
    }
    let best = null, bd = Infinity;
    for (const [id, s] of Object.entries(this.spheres)) {
      if (id === focusId) continue;
      if (!D[id].group.visible) continue;
      if (ray.ray.intersectSphere(s, this._v)) {
        const d = this._v.distanceTo(ray.ray.origin);
        if (d < bd) { bd = d; best = id; }
      }
    }
    if (best) return { kind: 'district', id: best };
    const g = this.ground(x, y);
    if (!g) return null;
    // the ground inside a district's footprint (at its own level) is that district
    let near = null, nd = Infinity;
    for (const [id, s] of Object.entries(this.spheres)) {
      if (id === focusId || !D[id].group.visible) continue;
      const c = D[id].pin || D[id].anchor;
      const q = this.ground(x, y, c.y - 0.4) || g;
      const r = Math.hypot(q.x - c.x, q.z - c.z), R = Math.min(s.radius, this.foot?.[id] ?? 11);
      if (r < R && r < nd) { nd = r; near = id; }
    }
    if (near) return { kind: 'district', id: near };
    return { kind: 'ground', point: g };
  }

  /** the point on the ground (or the focused district's level) under a screen position */
  ground(x, y, level = 0) {
    const ray = this._cast(x, y);
    this.plane.constant = -level;
    const out = new THREE.Vector3();
    return ray.ray.intersectPlane(this.plane, out) ? out : null;
  }
}
