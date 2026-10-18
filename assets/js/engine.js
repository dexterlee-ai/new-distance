// Renderer, lights, the NPR pass and a cinematic camera rig with gentle user orbit.
import * as THREE from '../vendor/three.module.min.js';
import { NPR } from './npr.js';
import { T, CLOCK, FOCUS } from './mat.js';
import { BASE_Y } from './terrain.js';
import { ease, clamp, lerp } from './kit.js';

const angDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
// the world clock starts (and, with motion off, rests) at a moment where every district shows its key state:
// the lighthouse's course drawn, the three lamps lit together, a shared moment running round the bowl …
const REST_T = 61;

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
    this.camera = new THREE.PerspectiveCamera(32, 1, 1, 1600);
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

    // camera state: current + goal, all in (target, az, el, dist)
    this.cur = { target: new THREE.Vector3(0, 0, 0), az: 0.6, el: 1.05, dist: 300 };
    this.goal = { target: new THREE.Vector3(0, 0, 0), az: 0.6, el: 1.05, dist: 300 };
    this.flight = null;
    this.user = { az: 0, el: 0, zoom: 1, vaz: 0, vel: 0 };
    this.limits = { el: [-0.4, 1.45], zoom: [0.55, 1.7] };
    this.idleDrift = 0;
    this.lastInput = 0;
    this.offset = { x: 0, y: 0, tx: 0, ty: 0 };   // projection offset (px) for side panels
    this.focus = { pos: new THREE.Vector3(), r: 1e5, all: 1, tall: 1, tr: 1e5 };
    this.listeners = [];
    this.resizers = [];
    this.last = performance.now();
    // two clocks: `clock` (real seconds) drives the camera and input; `time` (world seconds) drives everything
    // that moves by itself, and stops while motion is off
    this.clock = 0;
    this.time = REST_T;
    this.timeScale = reduced ? 0.35 : 1;
    this._bindInput(canvas);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    this.w = w; this.h = h; this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.npr.setSize(w, h, dpr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const fn of this.resizers) fn(w, h);
  }

  /** fn(w, h) runs after every renderer resize */
  onResize(fn) { this.resizers.push(fn); }

  /** world animation on/off (camera flights and the reader's own orbit keep working) */
  setMotion(on) { this.motion = !!on; }

  /** fly to a view {target:[x,y,z], az, el, dist}; returns a promise */
  flyTo(view, { duration, arc = true } = {}) {
    const to = { target: new THREE.Vector3(...view.target), az: view.az, el: view.el, dist: view.dist };
    const from = { target: this.cur.target.clone(), az: this.cur.az + this.user.az, el: this.cur.el + this.user.el, dist: this.cur.dist * this.user.zoom };
    this.user.az = 0; this.user.el = 0; this.user.zoom = 1; this.user.vaz = this.user.vel = 0;
    const travel = from.target.distanceTo(to.target);
    const dur = this.reduced ? 0.01 : (duration ?? clamp(1.6 + travel / 70, 1.8, 4.2));
    this.goal = to;
    return new Promise((res) => {
      this.flight = { from, to, t0: this.clock, dur, arc: arc ? Math.min(140, travel * 0.55) : 0, res };
    });
  }

  setFocus(pos, r = 32) { this.focus.tall = 0; this.focus.tr = r; if (pos) this.focus.pos.copy(pos); }
  clearFocus() { this.focus.tall = 0.62; this.focus.tr = 1e5; }

  setPanelOffset(px, py) { this.offset.tx = px; this.offset.ty = py; }

  _bindInput(el) {
    let drag = null, pinch = null;
    const pts = new Map();   // every pointer that is down, so a pinch never leaves a stale drag origin behind
    const now = () => this.clock;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!drag) drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 };
      else drag.moved += 100;   // a second finger: this gesture is never a tap
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    });
    el.addEventListener('pointermove', (e) => {
      const pt = pts.get(e.pointerId);
      if (pt) { pt.x = e.clientX; pt.y = e.clientY; }
      if (!drag || e.pointerId !== drag.id) return;
      if (pinch || pts.size > 1) { drag.x = e.clientX; drag.y = e.clientY; return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      this.user.vaz = -dx * 0.0042;
      this.user.vel = dy * 0.0034;
      this.user.az += this.user.vaz;
      this.user.el += this.user.vel;
      this.lastInput = now();
      if (this.flight) this._settle();
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (!drag) return;
      if (pts.size) {
        // one finger of several lifted: carry on from where a remaining finger is now, without a jump
        const [id, p] = pts.entries().next().value;
        drag = { id, x: p.x, y: p.y, moved: drag.moved };
        this.user.vaz = this.user.vel = 0;
      } else { this.wasDrag = drag.moved > 6; drag = null; }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.user.zoom = clamp(this.user.zoom * (1 + e.deltaY * 0.0011), ...this.limits.zoom);
      this.lastInput = now();
    }, { passive: false });
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        pinch = { d, z: this.user.zoom };
      }
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (pinch && e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.user.zoom = clamp(pinch.z * (pinch.d / d), ...this.limits.zoom);
        this.lastInput = now();
      }
    }, { passive: true });
    const touchEnd = (e) => { if (e.touches.length < 2) pinch = null; };
    el.addEventListener('touchend', touchEnd, { passive: true });
    el.addEventListener('touchcancel', touchEnd, { passive: true });
  }

  _settle() {
    // interrupting a flight: jump the "current" state to where the camera is now
    const f = this.flight;
    this.flight = null;
    f.res();
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
      // lift the camera over the world while travelling far
      c.el += Math.sin(k * Math.PI) * Math.min(0.35, f.arc / 300);
      if (k >= 1) { this.flight = null; c.az = f.to.az; f.res(); }
    } else {
      // inertia + idle drift
      if (this.clock - this.lastInput > 0.05) {
        u.vaz *= Math.pow(0.04, dt); u.vel *= Math.pow(0.04, dt);
        u.az += u.vaz * dt * 6; u.el += u.vel * dt * 6;
      }
      if (this.clock - this.lastInput > 5 && this.motion && !this.reduced) u.az += dt * this.idleDrift;
    }
    const el = clamp(c.el + u.el, ...this.limits.el);
    u.el = el - c.el;
    const az = c.az + u.az;
    const dist = c.dist * u.zoom;
    const cam = this.camera;
    cam.position.set(
      c.target.x + Math.cos(az) * Math.cos(el) * dist,
      c.target.y + Math.sin(el) * dist,
      c.target.z + Math.sin(az) * Math.cos(el) * dist,
    );
    cam.lookAt(c.target);
    // projection offset so the subject sits in the space beside a panel
    const o = this.offset;
    o.x += (o.tx - o.x) * Math.min(1, dt * 4);
    o.y += (o.ty - o.y) * Math.min(1, dt * 4);
    if (Math.abs(o.x) > 0.5 || Math.abs(o.y) > 0.5) cam.setViewOffset(this.w + Math.abs(o.x), this.h + Math.abs(o.y), Math.max(0, o.x), Math.max(0, o.y), this.w, this.h);
    else cam.clearViewOffset();
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
const _p = new THREE.Vector3();
