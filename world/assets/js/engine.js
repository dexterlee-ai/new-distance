// Renderer, lights, the NPR pass and the camera.
// The camera changes in exactly three ways the app can ask for — a flight (arced, between places), an ease (no arc,
// within a place) and an offset (projection padding only) — plus whatever the reader does: orbit, pan, zoom toward
// the pointer.  Every change is written to `moveLog` so a verifier can prove nothing else moved it.
import * as THREE from '../vendor/three.module.min.js';
import { NPR } from './npr.js';
import { T, CLOCK, FOCUS } from './mat.js';
import { BASE_Y } from './terrain.js';
import { ease, clamp, lerp } from './kit.js';

const angDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
// the world clock starts (and, with motion off, rests) at a moment where every district shows its key state:
// the lighthouse's course drawn, the three lamps lit together, a shared moment running round the bowl …
const REST_T = 61;
export const FOV = 32;                                // vertical field of view (degrees) of every camera here
const TAN = Math.tan((FOV * Math.PI) / 360);
const TAP_SLOP = 8;                                   // px a pointer may wander and still be a tap
const DOUBLE_MS = 320, DOUBLE_PX = 32;                // second tap: this soon, this close
const LOG_CAP = 200;
const HOLD_MS = 100;                                  // a release this long after the last move does not fling
const WHEEL_GAP_MS = 150;                             // wheel events closer than this belong to one stream
const EL_ANY = [-1.5, 1.5];
const EL_SAFE = 1.54;                                 // never quite straight up or down (lookAt would flip)

/** cubic-bezier(x1, y1, x2, y2) as a function of time 0…1, like CSS */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t;
  const Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 28; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
// the site's --ease (world.css), so the picture slides with the sheet or panel that caused the offset
const EASE_UI = bezier(0.2, 0.7, 0.1, 1);

/**
 * The projection of every camera of this engine: today's view offset, setViewOffset(w+|ox|, h+|oy|, max(0,ox),
 * max(0,oy), w, h), so the frame centre lands at ((w-ox)/2, (h-oy)/2).  three sets aspect = full frame, so pixels
 * stay square; the 32° field spans the full height h+|oy|, so a vertical offset also enlarges the picture by
 * (h+|oy|)/h, as it always has.  With `slide` the field widens with the frame instead and an offset only slides the
 * picture (map padding: the scale stays h / (2·d·tan 16°) px per unit at depth d whatever the offset).
 * Without an offset the aspect goes back to w/h (clearViewOffset alone would keep the full frame's).
 */
function applyView(cam, w, h, ox, oy, slide = false) {
  const ax = Math.abs(ox), ay = Math.abs(oy);
  // any offset at all (an ease ends exactly on its target, so there is no residue to filter out; a threshold
  // would make the picture jump by up to half a pixel where the offset crosses it)
  if (ax > 1e-6 || ay > 1e-6) {
    const fw = w + ax, fh = h + ay;
    cam.fov = slide ? (2 * Math.atan((TAN * fh) / h) * 180) / Math.PI : FOV;
    cam.setViewOffset(fw, fh, Math.max(0, ox), Math.max(0, oy), w, h);   // sets aspect = fw/fh, updates the projection
  } else {
    cam.fov = FOV;
    cam.aspect = w / h;
    cam.clearViewOffset();
  }
}
/** px per world unit at unit depth for a camera set up by applyView (at depth d: divide by d) */
const pxScale = (cam, h) => (cam.view?.enabled ? cam.view.fullHeight : h) / (2 * Math.tan((cam.fov * Math.PI) / 360));

/** camera position for a pose: target + spherical(az, el, dist) */
function placeCam(cam, target, az, el, dist) {
  cam.position.set(
    target.x + Math.cos(az) * Math.cos(el) * dist,
    target.y + Math.sin(el) * dist,
    target.z + Math.sin(az) * Math.cos(el) * dist,
  );
  cam.lookAt(target);
  cam.updateMatrixWorld();
}

const vec3 = (v, out = new THREE.Vector3()) => (Array.isArray(v) ? out.set(v[0], v[1], v[2]) : out.copy(v));

export class Engine {
  constructor(canvas, { reduced = false, motion = !reduced } = {}) {
    this.reduced = reduced;
    this.motion = !!motion;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.npr = new NPR(this.renderer);
    this.npr.u.uReveal.value = 0;
    this.scene = new THREE.Scene();
    this.fov = FOV;
    // false: a vertical offset enlarges the picture by (h+|oy|)/h, as today.  true: offsets only slide it (padding)
    this.slideOffset = false;
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 1600);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 1.55));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-70, 120, 50);
    sun.castShadow = true;
    const mobile = Math.min(innerWidth, innerHeight) < 700;
    sun.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
    Object.assign(sun.shadow.camera, { left: -115, right: 115, top: 115, bottom: -115, near: 10, far: 400 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.35;
    this.scene.add(sun);
    this.sun = sun;
    // a weak light from below gives the underworld (16) its form; upward-facing ground is untouched by it
    const under = new THREE.DirectionalLight(0xffffff, 0.9);
    under.position.set(-40, -120, 60);
    this.scene.add(under);

    // camera state.  `cur` is the base pose the app sets (pan moves its target); `user` holds the reader's orbit
    // and zoom on top of it.  The composite (what the camera shows) is cur ⊕ user — see getPose().
    this.cur = { target: new THREE.Vector3(0, 0, 0), az: 0.6, el: 1.05, dist: 300 };
    this.goal = { target: new THREE.Vector3(0, 0, 0), az: 0.6, el: 1.05, dist: 300 };
    this.flight = null;                                 // the running flight or ease: { kind, from, to, t0, dur, arc, res }
    this.user = { az: 0, el: 0, zoom: 1, vaz: 0, vel: 0 };
    // the UI sets these per place.  az: absolute radians for base + reader az; pan: { center: Vector3, r }
    this.limits = { el: [-0.4, 1.45], zoom: [0.55, 1.7], az: null, pan: null };
    this.idleDrift = 0;
    this.tilt = null;                                   // setTilt(): the map keeps its width while tilted
    this.lastInput = 0;                                 // clock time of the reader's last camera move
    this.touched = false;                               // has the reader moved the camera at all
    this._input = false;                                // any press or wheel on the canvas yet (ends idle drift)
    this._held = false;                                 // a gesture holds the camera (no inertia under a finger)
    // the current wheel stream (event time of its first and its last event) and a stream muted by a move
    this._wheelRun = -Infinity; this._wheelAt = -Infinity; this._wheelMute = null;
    this.moveLog = [];
    this.offset = { x: 0, y: 0, tx: 0, ty: 0, fx: 0, fy: 0, t0: 0, dur: 0, easing: EASE_UI };   // projection offset (px)
    this.focus = { pos: new THREE.Vector3(), r: 1e5, all: 1, tall: 1, tr: 1e5 };
    this.listeners = [];
    this.resizers = [];
    this.dblListeners = [];
    this._wasDrag = false; this._wasDragAt = 0;
    this._fitCam = new THREE.PerspectiveCamera(FOV, 1, 1, 1600);
    this._ray = new THREE.Raycaster();
    this.last = performance.now();
    // two clocks: `clock` (real seconds) drives the camera and input; `time` (world seconds) drives everything
    // that moves by itself, and stops while motion is off
    this.clock = 0;
    this.time = REST_T;
    this.timeScale = reduced ? 0.35 : 1;
    this._bindInput(canvas);
    this.resize();
    addEventListener('resize', () => this.resize());
    // Safari's bars and the on-screen keyboard change the visual viewport without always resizing the window
    const vv = globalThis.visualViewport;
    if (vv) {
      vv.addEventListener('resize', () => {
        if (innerWidth !== this.w || innerHeight !== this.h) this.resize();
        else for (const fn of this.resizers) fn(this.w, this.h);
      });
    }
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    this.w = w; this.h = h; this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.npr.setSize(w, h, dpr);
    applyView(this.camera, w, h, this.offset.x, this.offset.y, this.slideOffset);
    for (const fn of this.resizers) fn(w, h);
  }

  /** fn(w, h) runs after every renderer resize (and on visualViewport resizes) */
  onResize(fn) { this.resizers.push(fn); }

  /** pointer and wheel input that starts on an overlay layer over the canvas (its .ov elements) moves the camera too */
  addInputRoot(root) { if (root && this._overlayInput) this._overlayInput(root); }

  /** fn({ x, y }) (CSS px) on a double-tap or double-click on the canvas; the engine itself does not move */
  onDoubleTap(fn) { this.dblListeners.push(fn); }

  /** world animation on/off (camera flights and the reader's own orbit keep working) */
  setMotion(on) { this.motion = !!on; }

  /** a click right after a drag is not a tap (expires, so a drag that produced no click never eats the next one) */
  get wasDrag() { return this._wasDrag && performance.now() - this._wasDragAt < 400; }
  set wasDrag(v) { this._wasDrag = !!v; this._wasDragAt = performance.now(); }

  // ------------------------------------------------------------------ poses

  /** the composite pose (base + the reader's orbit and zoom) as a plain object */
  getPose() {
    const c = this.cur, u = this.user;
    const el = clamp(c.el + u.el, -EL_SAFE, EL_SAFE);
    return { target: [c.target.x, c.target.y, c.target.z], az: c.az + u.az, el, dist: c.dist * u.zoom * this._tiltK(el) };
  }

  /**
   * The map keeps its width while the reader tilts it: fn(el) → a distance factor (relative to any other el), applied
   * to the reader's tilt on top of the base pose (the base pose itself is never scaled).  null: off.  Changing it
   * keeps the picture where it is.
   */
  setTilt(fn) {
    if (fn === this.tilt) return;
    const el = this.cur.el + this.user.el, k0 = this._tiltK(el);
    this.tilt = fn || null;
    this.user.zoom *= k0 / this._tiltK(el);
  }
  _tiltK(el) {
    const f = this.tilt;
    if (!f || !(Math.abs(this.user.el) > 1e-6)) return 1;
    const a = f(clamp(el, -EL_SAFE, EL_SAFE)), b = f(this.cur.el);
    return a > 0 && b > 0 ? a / b : 1;
  }

  /** jump to a pose now.  Clears the reader's offsets unless keepUser (a rebase, e.g. after a resize) */
  setPose(pose, { keepUser = false } = {}) {
    this._endTransition();
    const c = this.cur, u = this.user;
    vec3(pose.target, c.target);
    c.az = pose.az; c.el = pose.el; c.dist = pose.dist;
    this.goal = { target: c.target.clone(), az: c.az, el: c.el, dist: c.dist };
    if (!keepUser) { u.az = 0; u.el = 0; u.zoom = 1; }
    u.vaz = u.vel = 0;
    this._log('set');
    this._place();
  }

  /** the design's retarget(): rebase on a pose (after a resize or rotation), keeping the reader's orbit and zoom */
  retarget(view) { this.setPose(view, { keepUser: true }); }

  /**
   * fly to a view {target:[x,y,z], az, el, dist}; arced, folds the reader's orbit/zoom into the start; returns a
   * promise.  Without a duration it takes 1.2–2.0 s by how far it goes (design §5.2)
   */
  flyTo(view, { duration, arc = true } = {}) {
    const travel = this.cur.target.distanceTo(vec3(view.target, _a));
    const span = travel + 0.5 * Math.abs(this.cur.dist * this.user.zoom - view.dist);
    const dur = this.reduced ? 0.01 : (duration ?? clamp(1.2 + span / 200, 1.2, 2.0));
    return this._transition('flight', view, dur, arc ? Math.min(140, travel * 0.55) : 0, false);
  }

  /** ease within a place: no arc, no lift.  keepUser: the reader's orbit/zoom stay on top of the new base pose */
  easeTo(view, { duration = 0.8, keepUser = false } = {}) {
    return this._transition('ease', view, this.reduced ? Math.min(duration, 0.01) : duration, 0, keepUser);
  }

  _transition(kind, view, dur, arc, keepUser) {
    const c = this.cur, u = this.user;
    const to = { target: vec3(view.target), az: view.az, el: view.el, dist: view.dist };
    const from = keepUser
      ? { target: c.target.clone(), az: c.az, el: c.el, dist: c.dist }
      : { target: c.target.clone(), az: c.az + u.az, el: c.el + u.el, dist: c.dist * u.zoom * this._tiltK(c.el + u.el) };
    if (!keepUser) { u.az = 0; u.el = 0; u.zoom = 1; }
    u.vaz = u.vel = 0;
    this._endTransition();
    this.goal = to;
    this._log(kind, { dur });
    if (!(dur > 0)) {
      c.target.copy(to.target); c.az = to.az; c.el = to.el; c.dist = to.dist;
      this._place();
      return Promise.resolve();
    }
    // a wheel stream still running as the move begins (trackpad momentum) is muted until it pauses
    if (performance.now() - this._wheelAt < WHEEL_GAP_MS) this._wheelMute = this._wheelRun;
    return new Promise((res) => { this.flight = { kind, from, to, t0: this.clock, dur, arc, res }; });
  }

  _endTransition() {
    const f = this.flight;
    if (!f) return;
    this.flight = null;
    f.res();
  }

  setFocus(pos, r = 32) { this.focus.tall = 0; this.focus.tr = r; if (pos) this.focus.pos.copy(pos); }
  clearFocus() { this.focus.tall = 0.62; this.focus.tr = 1e5; }

  // ------------------------------------------------------------------ projection offset

  /**
   * Slide the picture so the frame centre lands at ((w-px)/2, (h-py)/2) in screen px.  Time-based, done within
   * `duration` seconds (0 = now); orbit, zoom and target do not change.  easing: optional fn 0…1 → 0…1
   */
  setOffset(px, py, { duration = 0.25, easing } = {}) {
    const o = this.offset;
    px = +px || 0; py = +py || 0;
    const dur = this.reduced ? 0 : Math.max(0, +duration || 0);
    if (Math.abs(px - o.tx) < 0.01 && Math.abs(py - o.ty) < 0.01 && (dur > 0 || (o.x === o.tx && o.y === o.ty))) return;
    o.fx = o.x; o.fy = o.y; o.tx = px; o.ty = py; o.t0 = this.clock; o.dur = dur; o.easing = easing || EASE_UI;
    this._log('offset', { dur });
    if (!dur) { o.x = px; o.y = py; this._place(); }
  }

  /** today's name for setOffset */
  setPanelOffset(px, py) { this.setOffset(px, py); }

  /** the [ox, oy] that centres the picture in a free rect { x, y, w, h } (CSS px) */
  offsetFor(rect) { return [this.w - 2 * (rect.x + rect.w / 2), this.h - 2 * (rect.y + rect.h / 2)]; }

  /**
   * The pose at (az, el) whose camera shows every point inside `rect` shrunk by `margin` (a fraction of the rect's
   * width and height) on each side, as close as possible, with the picture centred in the rect by offsetFor(rect).
   * Pure: projects with a camera of its own.
   * Without a `target` the points' projected box is centred in the rect (the target slides in the screen plane until
   * it is), so a set seen from above does not sit low with empty paper over it; with a target the camera turns round
   * that point as given.  only: 'w' fits (and centres) the width alone.
   */
  fitAnchors(points, rect, { az, el, margin = 0.075, target, only = null } = {}) {
    const now = this.getPose();
    az = az ?? now.az; el = el ?? now.el;
    const pts = (points || []).map((p) => vec3(p));
    // nothing to fit: the current distance on the given target (an empty list must not put the camera at 1 unit)
    if (!pts.length) return { target: target ? vec3(target).toArray() : now.target, az, el, dist: now.dist };
    margin = clamp(+margin || 0, 0, 0.45);               // at 0.5 the shrunk rect is empty and nothing ever fits
    const fixed = !!target;
    const tg0 = target ? vec3(target) : _box.setFromPoints(pts).getCenter(new THREE.Vector3());
    const tg = tg0.clone();
    const [ox, oy] = this.offsetFor(rect);
    const cam = this._fitCam;
    cam.near = this.camera.near; cam.far = this.camera.far;
    applyView(cam, this.w, this.h, ox, oy, this.slideOffset);
    const x0 = rect.x + rect.w * margin, x1 = rect.x + rect.w * (1 - margin);
    const y0 = rect.y + rect.h * margin, y1 = rect.y + rect.h * (1 - margin);
    const cxR = (x0 + x1) / 2, cyR = (y0 + y1) / 2;
    const bx = { x0: 0, y0: 0, x1: 0, y1: 0 };
    // the points' screen box with the camera on target t at distance d (null: one is behind the camera)
    const boxAt = (t, d) => {
      placeCam(cam, t, az, el, d);
      bx.x0 = bx.y0 = Infinity; bx.x1 = bx.y1 = -Infinity;
      for (const p of pts) {
        _b.copy(p).applyMatrix4(cam.matrixWorldInverse);
        if (_b.z > -cam.near) return null;                  // behind the camera or inside the near plane
        _b.applyMatrix4(cam.projectionMatrix);
        const sx = (_b.x * 0.5 + 0.5) * this.w, sy = (-_b.y * 0.5 + 0.5) * this.h;
        if (sx < bx.x0) bx.x0 = sx; if (sx > bx.x1) bx.x1 = sx;
        if (sy < bx.y0) bx.y0 = sy; if (sy > bx.y1) bx.y1 = sy;
      }
      return bx;
    };
    // at distance d: slide the target in the screen plane until the projected box's centre is the rect's centre (a
    // few rounds: points nearer or farther than the target move a little more or less than it)
    const solve = (d) => {
      tg.copy(tg0);
      let b = boxAt(tg, d);
      for (let i = 0; !fixed && b && i < 4; i++) {
        const dx = cxR - (b.x0 + b.x1) / 2, dy = only === 'w' ? 0 : cyR - (b.y0 + b.y1) / 2;
        if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) break;
        const s = d / pxScale(cam, this.h), m = cam.matrixWorld.elements;   // columns: right (0,1,2), up (4,5,6)
        tg.x += (-m[0] * dx + m[4] * dy) * s;
        tg.y += (-m[1] * dx + m[5] * dy) * s;
        tg.z += (-m[2] * dx + m[6] * dy) * s;
        b = boxAt(tg, d);
      }
      return b;
    };
    const fits = (d) => {
      const b = solve(d);
      return !!b && b.x0 >= x0 - 0.01 && b.x1 <= x1 + 0.01 && (only === 'w' || (b.y0 >= y0 - 0.01 && b.y1 <= y1 + 0.01));
    };
    // first guess: the sphere round the target that holds every point (A1's formula), then bracket and bisect
    let r = 0.25;
    for (const p of pts) r = Math.max(r, p.distanceTo(tg0));
    const q = Math.max(1, Math.min(x1 - x0, y1 - y0) / 2) / pxScale(cam, this.h);   // tan of the half-angle that fits
    let hi = r * Math.sqrt(1 + 1 / (q * q));
    for (let i = 0; i < 40 && !fits(hi); i++) hi *= 1.6;
    let lo = hi;
    const minD = cam.near * 2;
    for (let i = 0; i < 60 && lo > minD && fits(lo); i++) { hi = lo; lo *= 0.6; }
    // fits(d) is monotone (closer only spreads the points), so the smallest fitting distance is bracketed
    if (lo <= minD && fits(lo)) hi = minD;               // a point-like set: never closer than twice the near plane
    else for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
    solve(hi);
    return { target: [tg.x, tg.y, tg.z], az, el, dist: hi };
  }

  // ------------------------------------------------------------------ the reader's camera

  /** whether the reader moved the camera at or after clock time t */
  touchedSince(t) { return this.touched && this.lastInput >= t; }

  /** pan the base target in the screen plane by (dx, dy) CSS px, so the point at the target's depth follows */
  panBy(dx, dy) {
    if (!dx && !dy) return false;
    this._place();
    const D = this.cur.dist * this.user.zoom * this._tiltK(this.cur.el + this.user.el);
    const s = D / pxScale(this.camera, this.h);            // world units per px at the target's depth
    const m = this.camera.matrixWorld.elements;            // columns: right (0,1,2), up (4,5,6)
    const t = this.cur.target, prev = _a.copy(t);
    t.x += (-m[0] * dx + m[4] * dy) * s;
    t.y += (-m[1] * dx + m[5] * dy) * s;
    t.z += (-m[2] * dx + m[6] * dy) * s;
    this._clampPan(prev);
    return !t.equals(prev);
  }

  /** multiply the zoom by f, keeping the ground point (plane y = target.y) under screen point (sx, sy) in place */
  zoomAt(sx, sy, f) {
    const u = this.user, Z = this.limits.zoom || [0.05, 20];
    // never past the limits, but a zoom already outside them (the limits changed) may come back without a jump
    const z1 = clamp(u.zoom * f, Math.min(Z[0], u.zoom), Math.max(Z[1], u.zoom));
    const k = z1 / u.zoom;
    if (!(Math.abs(k - 1) > 1e-7)) return false;
    const P = this._ground(sx, sy);
    const t = this.cur.target, prev = _a.copy(t);
    // scaling camera and target about P keeps the ray to P, so P stays under the pointer
    if (P) t.sub(P).multiplyScalar(k).add(P);
    u.zoom = z1;
    this._clampPan(prev);
    return true;
  }

  /** the point on the plane y = target.y under a screen point, or null above the horizon */
  _ground(sx, sy) {
    this._place();
    this._ray.setFromCamera(_v2.set((sx / this.w) * 2 - 1, 1 - (sy / this.h) * 2), this.camera);
    const { origin: o, direction: d } = this._ray.ray, t = this.cur.target;
    if (Math.abs(d.y) < 1e-6) return null;
    const s = (t.y - o.y) / d.y;
    if (!(s > 0)) return null;
    const P = _g.copy(o).addScaledVector(d, s);
    // near the horizon the hit runs away: keep it within a few camera distances of the target
    const lim = 4 * this.cur.dist * this.user.zoom * this._tiltK(this.cur.el + this.user.el), r = P.distanceTo(t);
    if (r > lim) P.sub(t).multiplyScalar(lim / r).add(t);
    return P;
  }

  _clampPan(prev) {
    const P = this.limits.pan;
    if (!P || !P.center) return;
    const t = this.cur.target, c = vec3(P.center, _c);
    const d = t.distanceTo(c);
    const allowed = Math.max(P.r, prev.distanceTo(c));     // never further out; a target already outside may come back
    if (d > allowed) t.sub(c).multiplyScalar(allowed / d).add(c);
  }

  /** the reader's elevation stays inside limits.el; one already outside (a pose the app set) may only come back */
  _clampEl(prevEl) {
    const c = this.cur, u = this.user, L = this.limits.el || EL_ANY;
    const el = c.el + u.el, lo = Math.min(L[0], prevEl), hi = Math.max(L[1], prevEl);
    if (el < lo || el > hi) { u.el = clamp(el, lo, hi) - c.el; u.vel = 0; }
  }

  _clampAz(prevAz) {
    const A = this.limits.az;
    if (!A) return;
    const u = this.user, az = this.cur.az + u.az;
    const mid = (A[0] + A[1]) / 2, half = Math.abs(A[1] - A[0]) / 2;
    const d = angDelta(mid, az);
    const allowed = Math.max(half, Math.abs(angDelta(mid, prevAz)));
    if (Math.abs(d) > allowed) { u.az += Math.sign(d) * allowed - d; u.vaz = 0; }
  }

  /** the reader takes the camera: a running flight or ease stops where it is */
  _take() { if (this.flight) this._settle(); }

  /** the reader moved the camera */
  _moved() {
    // one entry per run of reader input: a new one after any other move or after a pause
    const last = this.moveLog[this.moveLog.length - 1];
    if (!this.touched || last?.kind !== 'user' || this.clock - this.lastInput > 0.3) this._log('user');
    this.lastInput = this.clock;
    this.touched = true;
  }

  _log(kind, extra) {
    this.moveLog.push(extra ? { t: this.clock, kind, ...extra } : { t: this.clock, kind });
    if (this.moveLog.length > LOG_CAP) this.moveLog.splice(0, this.moveLog.length - LOG_CAP);
  }

  _doubleTap(x, y) { for (const fn of this.dblListeners) fn({ x, y }); }

  _orbit(dx, dy) {
    const u = this.user, prevAz = this.cur.az + u.az, prevEl = this.cur.el + u.el;
    u.vaz = -dx * 0.0042;
    u.vel = dy * 0.0034;
    u.az += u.vaz;
    u.el += u.vel;
    this._clampEl(prevEl);
    this._clampAz(prevAz);
  }

  _bindInput(el) {
    const pts = new Map();   // every pointer that is down, so a pinch never leaves a stale drag origin behind
    // the gesture: { mode: 'orbit' | 'pan' | 'two', id, x, y, sx, sy, t0, mt (last orbit move), live, type, button }
    let g = null;
    let tap = null;          // the last touch/pen tap, for double-tap: { t, x, y }
    let lastType = 'mouse';
    let mouseTaps = 0;       // left-button taps in a row: a dblclick counts only after two of them (not after drags)
    const pair = () => {
      const [p, q] = pts.values();
      return { cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2, d: Math.hypot(p.x - q.x, p.y - q.y) };
    };
    const startTwo = () => {
      const p = pair();
      Object.assign(g, { mode: 'two', live: true, cx: p.cx, cy: p.cy, d: p.d });
      this.user.vaz = this.user.vel = 0;                       // fingers resting on the world hold it still
    };
    el.addEventListener('contextmenu', (e) => e.preventDefault());   // the right button pans
    const down = (e, ov = false) => {
      const mouse = e.pointerType === 'mouse';
      lastType = e.pointerType;
      this._input = true;
      if (mouse && e.button !== 0 && e.button !== 2) return;
      // a mouse press always starts afresh: a mouse gesture still open here lost its release outside the page
      if (mouse && g?.type === 'mouse') { pts.delete(g.id); g = null; }
      if (g && (mouse || g.type === 'mouse')) return;          // one mouse gesture at a time
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // (a touch that starts on the overlay is already held by its element, the browser's implicit capture)
      if (!ov) try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      if (!g) {
        g = { mode: mouse && (e.button === 2 || e.shiftKey) ? 'pan' : 'orbit', id: e.pointerId, x: e.clientX, y: e.clientY,
          sx: e.clientX, sy: e.clientY, t0: e.timeStamp, mt: -Infinity, live: false, type: e.pointerType, button: e.button, ov };
        this._held = true;
        this.user.vaz = this.user.vel = 0;                     // a finger on a turning world stops it
      } else if (pts.size >= 2) startTwo();                    // a second finger: pinch and pan from here, never a tap
    };
    el.addEventListener('pointerdown', (e) => down(e));
    const move = (e) => {
      const pt = pts.get(e.pointerId);
      if (!pt || !g) return;
      // a mouse moving with no button down lost its release somewhere: end the gesture, never orbit on a hover
      if (e.pointerType === 'mouse' && !e.buttons) { up(e); return; }
      pt.x = e.clientX; pt.y = e.clientY;
      if (g.mode === 'two') {
        if (pts.size < 2) return;
        const p = pair();
        const dx = p.cx - g.cx, dy = p.cy - g.cy, f = p.d > 1 && g.d > 1 ? g.d / p.d : 1;
        g.cx = p.cx; g.cy = p.cy; g.d = p.d;
        this._take();
        const a = this.panBy(dx, dy), b = f !== 1 && this.zoomAt(p.cx, p.cy, f);
        if (a || b) this._moved();
        return;
      }
      if (e.pointerId !== g.id) return;
      if (!g.live) {
        // inside the tap slop nothing moves; past it the whole way from the press point counts, so what was under
        // the pointer stays under it
        if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) <= TAP_SLOP) return;
        g.live = true;
      }
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      g.x = e.clientX; g.y = e.clientY;
      if (!dx && !dy) return;
      this._take();
      if (g.mode === 'orbit') { this._orbit(dx, dy); g.mt = e.timeStamp; } else this.panBy(dx, dy);
      this._moved();
    };
    el.addEventListener('pointermove', move);
    const up = (e) => {
      if (!pts.delete(e.pointerId) || !g) return;
      if (pts.size) {
        if (g.mode === 'two' && pts.size >= 2) { startTwo(); return; }
        // one finger of several lifted: carry on orbiting from where a remaining finger is now, without a jump
        const [id, p] = pts.entries().next().value;
        Object.assign(g, { mode: 'orbit', id, x: p.x, y: p.y, mt: -Infinity });
        this.user.vaz = this.user.vel = 0;
        return;
      }
      this._held = false;
      // inertia only from a release in motion: a finger that stopped before lifting leaves the world where it is
      if (!(e.timeStamp - g.mt <= HOLD_MS)) this.user.vaz = this.user.vel = 0;
      // event time stamps, not handler time: a slow frame must not split a double-tap
      const isTap = !g.live && e.type === 'pointerup' && e.timeStamp - g.t0 < 500;
      // a right-button drag fires no click afterwards, so it leaves nothing to swallow
      this.wasDrag = g.live && g.button !== 2;
      if (g.type === 'mouse') mouseTaps = isTap && g.button === 0 ? mouseTaps + 1 : 0;
      // (a tap on an overlay word or pill is that element's own click, never half of a double-tap on the world)
      if (isTap && g.ov) tap = null;
      else if (isTap && g.type !== 'mouse') {
        const now = e.timeStamp;
        if (tap && now - tap.t < DOUBLE_MS && Math.hypot(g.sx - tap.x, g.sy - tap.y) < DOUBLE_PX) {
          const { x, y } = tap;
          tap = null;
          this._doubleTap(x, y);
        } else tap = { t: now, x: g.sx, y: g.sy };
      } else if (!isTap) tap = null;
      g = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);   // a pointer that left without an up never stays "down"
    // the mouse's double-click (touch and pen are detected above, so a synthesized dblclick is ignored).  The
    // browser also counts a drag and a click, or two quick flick-orbits from one spot, as a double-click: only two
    // real taps in a row are one
    el.addEventListener('dblclick', (e) => { if (lastType === 'mouse' && mouseTaps >= 2) this._doubleTap(e.clientX, e.clientY); });
    const wheel = (e) => {
      e.preventDefault();
      this._input = true;
      if (e.timeStamp - this._wheelAt > WHEEL_GAP_MS) this._wheelRun = e.timeStamp;   // a new stream begins
      this._wheelAt = e.timeStamp;
      // a stream that was already running when a flight or ease began (a trackpad's momentum after the reader
      // clicked 去看) is not the reader taking the camera: it neither cancels the move nor zooms after it
      if (this._wheelRun === this._wheelMute) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.h : 1);
      // a trackpad pinch arrives as a wheel with ctrlKey and small deltas (a ctrl+wheel notch must not leap)
      const f = e.ctrlKey ? Math.exp(clamp(dy, -30, 30) * 0.01) : Math.exp(clamp(dy, -240, 240) * 0.0011);
      this._take();
      if (this.zoomAt(e.clientX, e.clientY, f)) this._moved();
    };
    el.addEventListener('wheel', wheel, { passive: false });
    // touches and wheels that start on the overlay (a pill, a label, a word on an object) still turn, pan and zoom
    // the world under it, never the page; a tap there stays the element's own click
    this._overlayInput = (root) => {
      root.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && e.target.closest?.('.ov')) down(e, true); });
      root.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') move(e); });
      // (a release anywhere ends it: the element under the finger may have been replaced meanwhile; up() runs once)
      addEventListener('pointerup', up);
      addEventListener('pointercancel', up);
      root.addEventListener('wheel', wheel, { passive: false });
      for (const k of ['gesturestart', 'gesturechange']) root.addEventListener(k, (e) => e.preventDefault());
    };
    // Safari's trackpad pinch (on iOS the fingers already arrive as pointers above)
    let gs = 0;
    el.addEventListener('gesturestart', (e) => { e.preventDefault(); this._input = true; gs = pts.size ? 0 : 1; });
    el.addEventListener('gesturechange', (e) => {
      e.preventDefault();
      if (!gs || pts.size || !(e.scale > 0)) return;
      const f = gs / e.scale;
      gs = e.scale;
      this._take();
      if (this.zoomAt(e.clientX, e.clientY, f)) this._moved();
    });
    el.addEventListener('gestureend', (e) => { e.preventDefault(); gs = 0; });
  }

  _settle() {
    // interrupting a flight: the current state stays where the camera is now
    this._endTransition();
  }

  onFrame(fn) { this.listeners.push(fn); }

  start() {
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0, ((now ?? performance.now()) - this.last) / 1000));
      this.last = now ?? performance.now();
      if (this.paused || document.hidden) return;   // reading: let the world rest
      this.step(dt);
    };
    loop();
  }

  step(dt) {
    // opening: the world is drawn outward from the core over the first seconds
    const rv = this.npr.u.uReveal;
    if (rv.value < 1) rv.value = Math.min(1, rv.value + dt / (this.reduced ? 0.01 : 4.2));
    this.clock += dt;
    CLOCK.value = this.clock;
    const wdt = this.motion ? dt * this.timeScale : 0;
    this.time += wdt;
    T.value = this.time;
    this._camera(dt);
    for (const fn of this.listeners) fn(this.time, wdt);
    this.npr.render(this.scene, this.camera, this.time);
  }

  /** advance n frames synchronously (testing while the page is not being painted) */
  tick(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) this.step(dt); }

  /** put the camera where cur ⊕ user and the current offset say (no time passes) */
  _place() {
    const c = this.cur, u = this.user, cam = this.camera;
    placeCam(cam, c.target, c.az + u.az, clamp(c.el + u.el, -EL_SAFE, EL_SAFE), c.dist * u.zoom * this._tiltK(c.el + u.el));
    applyView(cam, this.w, this.h, this.offset.x, this.offset.y, this.slideOffset);
  }

  _camera(dt) {
    const c = this.cur, u = this.user;
    if (this.flight) {
      const f = this.flight;
      const k = clamp((this.clock - f.t0) / f.dur);
      const e = ease(k);
      c.target.lerpVectors(f.from.target, f.to.target, e);
      c.az = f.from.az + angDelta(f.from.az, f.to.az) * e;
      c.el = lerp(f.from.el, f.to.el, e);
      c.dist = lerp(f.from.dist, f.to.dist, e) + Math.sin(k * Math.PI) * f.arc;
      // lift the camera over the world while travelling far (flights only: an ease has no arc), never above the
      // elevation limit unless an end of the flight already is.  Limits never write into the reader's offsets here,
      // so a flight lands exactly on its pose.
      const lift = Math.sin(k * Math.PI) * Math.min(0.35, f.arc / 300);
      if (lift > 0) {
        const cap = Math.max((this.limits.el || EL_ANY)[1], f.from.el, f.to.el);
        c.el = Math.min(c.el + lift, Math.max(c.el, cap));
      }
      if (k >= 1) {
        this.flight = null;
        c.target.copy(f.to.target); c.az = f.to.az; c.el = f.to.el; c.dist = f.to.dist;
        f.res();
      }
    } else {
      const prevAz = c.az + u.az, prevEl = c.el + u.el;
      // inertia after a drag is released (never while a finger or button still holds the world)
      if (!this._held && (u.vaz || u.vel)) {
        u.vaz *= Math.pow(0.04, dt); u.vel *= Math.pow(0.04, dt);
        u.az += u.vaz * dt * 6; u.el += u.vel * dt * 6;
        if (Math.abs(u.vaz) < 1e-6) u.vaz = 0;
        if (Math.abs(u.vel) < 1e-6) u.vel = 0;
      }
      // idle drift, only until the reader's first press or wheel on the canvas
      if (!this.touched && !this._input && this.clock - this.lastInput > 5 && this.motion && !this.reduced) u.az += dt * this.idleDrift;
      this._clampAz(prevAz);
      this._clampEl(prevEl);
    }
    // projection offset: time-based, done within its duration
    const o = this.offset;
    if (o.x !== o.tx || o.y !== o.ty) {
      const k = o.dur > 0 ? clamp((this.clock - o.t0) / o.dur) : 1;
      if (k >= 1) { o.x = o.tx; o.y = o.ty; } else {
        const e = o.easing(k);
        o.x = lerp(o.fx, o.tx, e); o.y = lerp(o.fy, o.ty, e);
      }
    }
    this._place();
    const cam = this.camera, dist = c.dist * u.zoom * this._tiltK(c.el + u.el);
    // night under the disk
    const night = cam.position.y < BASE_Y - 1 ? 1 : 0;
    this.npr.u.uNight.value += (night - this.npr.u.uNight.value) * Math.min(1, dt * 2.5);
    // colour follows attention
    const F = this.focus;
    FOCUS.all.value += (F.tall - FOCUS.all.value) * Math.min(1, dt * 2);
    const tr = Math.min(F.tr, 400), cr = Math.min(FOCUS.r.value, 400);
    FOCUS.r.value = cr + (tr - cr) * Math.min(1, dt * 2);
    FOCUS.pos.value.lerp(F.pos, Math.min(1, dt * 3));
    // fog depends on how far we are
    this.npr.u.uFogNear.value = dist * 1.05 + 40;
    this.npr.u.uFogFar.value = dist * 2.2 + 160;
  }

  /** world → screen px; returns null if behind the camera */
  project(v, out = { x: 0, y: 0, z: 0 }) {
    const p = _p.copy(v).project(this.camera);
    if (p.z > 1) return null;
    out.x = (p.x * 0.5 + 0.5) * this.w;
    out.y = (-p.y * 0.5 + 0.5) * this.h;
    out.z = p.z;
    return out;
  }

  /** distance of the camera target from the centre of the world (the "distance to people") */
  get distanceToPeople() { return Math.hypot(this.cur.target.x, this.cur.target.z); }
}
const _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _g = new THREE.Vector3();
const _v2 = new THREE.Vector2();
const _box = new THREE.Box3();
