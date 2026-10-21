// Interface: intro → three questions → a personal route flown stop by stop → free exploration of the map,
// plus the 22-article index and the full-text reader.  Everything shown in 3D also exists here as text.
//
// The camera is the reader's.  Only going somewhere flies it (a new place); within a place a story may ease it
// to its next shot only while the reader has not touched it; interface actions (the strip, the reading layer,
// folding the panel) only ease the projection offset.  Each district remembers the reader's camera.
import * as Route from './route.js';
import { planRoute, reasons, encodeProfile, decodeProfile } from './route.js';
import { esc, CH, loadArticle, renderReader } from './reader.js';
import { Story, holdFor } from './story.js';
import { Strip } from './strip.js';
import { Overlay } from './overlay.js';
import { Picker } from './pick.js';
import { SEA_Y } from './terrain.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// where the camera leans while a reader is choosing (a preview of the part of the world that answers them)
const HOME = {
  roles: { ceo: 'judge', brand: 'trust', strategy: 'judge', creative: 'foundry', media: 'memory', cx: 'gates', data: 'core', org: 'under' },
  industries: { retail: 'market', beauty: 'memory', health: 'gates', fnb: 'market', tech: 'oracle', finance: 'gates', ent: 'memory', auto: 'market', travel: 'gates', all: 'core' },
  focus: Route.FOCUS_HOME || { trust: 'trust', memory: 'memory', choice: 'oracle', cx: 'gates', judgment: 'judge', production: 'foundry', insight: 'core' },
};
const STEPS = [
  { key: 'role', list: 'roles', title: '你在品牌這一側，<br>做的是哪一種工作？', hint: '鏡頭會先帶你看見，和你的工作最相關的地方。' },
  { key: 'industry', list: 'industries', title: '你的品牌，<br>在哪個產業？', hint: '書裡的案例橫跨零售、美妝、保健、餐飲、金融、娛樂與運動。' },
  { key: 'focus', list: 'focus', title: '此刻，你最在意的是？', hint: '選一個就好，路線會從品牌出發，一路走到消費者。' },
];
const SITE = '新距離';
const TITLE0 = document.title;
const MOBILE = () => innerWidth <= 860;       // the dialogs' layout (intro, questions, route summary)
const DESK = () => innerWidth >= 900 && innerHeight >= 500;   // the strip's layout: the side panel on wide, tall screens
const ZONES0 = [{ id: 'brand', name: '品牌' }, { id: 'ai', name: 'AI' }, { id: 'consumer', name: '消費者' }];
const RING_ZONE = { shore: 'brand', sea: 'ai', heart: 'consumer', core: 'consumer' };
// zone lettering: written on the ground at the middle of each zone's band (outside → in)
const ZONE_R = { brand: 86, ai: 57, consumer: 30 };

// fit the whole disk (radius ≈ 105 with margin) in the visible frame, whatever the screen shape
function fitDist(el, share = 1) {
  const tv = Math.tan((32 * Math.PI) / 360);
  const aspect = (innerWidth * share) / innerHeight;
  return Math.max((108 * (0.35 + 0.65 * Math.sin(el))) / tv, 108 / (tv * aspect)) * 1.06;
}
// desktop: the text column (intro, questions, route summary) is on the left; centre the disk in the space to its right.
const colRight = () => Math.min(96, Math.max(24, innerWidth * 0.06)) + Math.min(640, innerWidth - 48);
function sideView(el, k) {
  const off = colRight() + 24, free = Math.max(240, innerWidth - off);
  return { off: [-off, 0], view: { target: [0, 0, 0], az: 0.62, el, dist: fitDist(el, free / innerWidth) * k } };
}
// phones: the world sits above the text; the vertical view offset widens the frame, so step back to keep the width
function topView(el, share) {
  const tv = Math.tan((32 * Math.PI) / 360), oy = innerHeight * share, fullH = innerHeight + oy;
  return { off: [0, oy], view: { target: [0, 0, 0], az: 0.62, el, dist: (106 / (tv * (innerWidth / fullH))) * 0.96 } };
}

function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch { return null; } return v; }

export class UI {
  constructor({ W, index, engine, world, reduced, sound, still }) {
    this.W = W; this.index = index; this.E = engine; this.world = world; this.reduced = reduced;
    this.sound = sound; this.still = still;
    this.meta = Object.fromEntries(index.articles.map((a) => [a.n, a]));
    this.D = Object.fromEntries(W.districts.map((d) => [d.id, d]));
    this.R = Object.fromEntries(W.rings.map((r) => [r.id, r]));
    this.Z = Object.fromEntries((W.zones || ZONES0).map((z) => [z.id, z]));
    this.profile = this.cleanProfile(store('nd.profile') || {});
    const read = store('nd.read');
    this.read = new Set((Array.isArray(read) ? read : []).filter((n) => Object.hasOwn(this.meta, n)));
    this.route = null;
    this.stop = -1;
    this.step = 0;
    this.focusId = null;
    this.mode = '';
    this.ui = $('#ui');
    this.sheet = $('#sheet');
    this.sheetKind = null;
    this.lastWorldHash = '#/map';
    this.booted = false;
    this._sfxT = {};
    this.stories = {};          // district id → Story (new-style districts only)
    this.seen = new Set();      // districts whose story has played once this session
    this.camMem = {};           // district id → the reader's camera when they left it
    this.preview = null;        // district id previewed on the map (first tap)
    this.zone = null;           // phone: the zone being looked at on the map
    this.part = null;           // the part in focus
    this.levering = false;
    this.strip = new Strip($('#strip'), { esc, onAct: (n, el) => this.stripAct(n, el) });
    this.ov = new Overlay($('#ov'), { esc });
    this.pick = engine && world ? new Picker(engine, world) : null;
    this.bindToggles();
    this.bind();
  }

  start() { this.onHash(); this.booted = true; }

  get sheetOpen() { return this.sheet.classList.contains('open'); }

  /** profile ids come from the URL or storage: keep only ids the world knows */
  cleanProfile(p) {
    if (Route.cleanProfile) return Route.cleanProfile(this.W, p);
    const ok = (list, v) => (typeof v === 'string' && this.W.profile[list].some((x) => x.id === v) ? v : null);
    return { role: ok('roles', p?.role), industry: ok('industries', p?.industry), focus: ok('focus', p?.focus) };
  }

  // the plain names of the map
  zoneOf(d) { return d.zone || RING_ZONE[d.ring] || 'consumer'; }
  zoneName(id) { return this.Z[id]?.name || id; }
  pill(d) { return d.pill || d.name; }
  isStory(id) { return !!this.world?.D[id]?.beats && !!this.D[id]?.beats; }

  // ------------------------------------------------------------------ routing
  bind() {
    addEventListener('hashchange', () => this.onHash());
    $$('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      const n = b.dataset.nav;
      if (n === 'map') location.hash = '#/map';
      if (n === 'index') location.hash = '#/index';
      if (n === 'route') location.hash = this.profile.role || this.profile.focus ? `#/route/${encodeProfile(this.profile)}` : '#/start';
    }));
    // any touch or key hands the camera to the reader: the map stops drifting by itself
    const handled = () => { this._handled = true; if (this.E && this.mode === 'explore') this.E.idleDrift = 0; };
    addEventListener('pointerdown', handled, { capture: true, passive: true });
    addEventListener('keydown', handled, { capture: true });
    addEventListener('keydown', (e) => {
      if (e.target.closest?.('input,textarea,select')) return;
      const inPlace = this.mode === 'district' || this.mode === 'tour';
      if (e.key === 'Escape') {
        if (this.sheetOpen) return this.closeSheet();
        if (this.levering) return this.endLever();
        if (this.part) return this.clearPart();
        if (this.strip.reading) return this.setReading(false);
        if (this.preview) return this.clearPreview();
        if (inPlace) return this.leavePlace();
      }
      if (this.sheetOpen || !inPlace) return;
      const st = this.story;
      if (e.key === 'ArrowRight') { e.preventDefault(); if (st) this.storyNext(); else if (this.mode === 'tour') this.goStop(this.stop + 1); else location.hash = `#/d/${this.nextDistrict(this.focusId, 1)}`; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (st) st.prev(); else if (this.mode === 'tour') this.goStop(this.stop - 1); else location.hash = `#/d/${this.nextDistrict(this.focusId, -1)}`; }
      if (e.key === ' ' && st && !e.target.closest('button,a')) { e.preventDefault(); if (st.playing) st.pause(); else this.storyNext(); }
      if ((e.key === 'r' || e.key === 'R') && st) this.replay();
      if (e.key === ']') location.hash = `#/d/${this.nextDistrict(this.focusId, 1)}`;
      if (e.key === '[') location.hash = `#/d/${this.nextDistrict(this.focusId, -1)}`;
      if (e.key === 'm' || e.key === 'M') location.hash = '#/map';
      if (e.key === '0') this.resetView();
    });
    // delegated actions inside the sheet / dialogs
    document.addEventListener('click', (e) => {
      const r = e.target.closest('[data-read]');
      if (r) { e.preventDefault(); location.hash = `#/read/${r.dataset.read}`; return; }
      const g = e.target.closest('[data-go]');
      if (g) { e.preventDefault(); location.hash = `#/d/${g.dataset.go}`; return; }
      const a = e.target.closest('[data-act]');
      if (a && !a.closest('#strip')) this.act(a.dataset.act, a, e);
    });
    if (this.E) {
      // one picking for every state: a part of the district in focus, any district, or the ground
      const cv = this.E.renderer.domElement;
      cv.addEventListener('click', (e) => {
        if (this.E.wasDrag) { this.E.wasDrag = false; return; }
        this.tapWorld(e.clientX, e.clientY);
      });
      this.E.onDoubleTap?.(({ x, y }) => this.doubleTap(x, y));
    }
    // re-fit the camera and the offsets when the window changes shape (or a phone turns)
    const rz = () => { clearTimeout(this._rz); this._rz = setTimeout(() => this.reframe(), 150); };
    if (this.E?.onResize) this.E.onResize(rz); else addEventListener('resize', rz);
    if (!this.E) addEventListener('resize', rz);
  }

  redirect(h) { history.replaceState(null, '', h); this.onHash(); }

  onHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [p0, p1, p2, p3] = h.split('/');
    if (p0 !== 'read' && p0 !== 'index') this.closeSheet(true);
    if (!p0) return this.intro();
    if (p0 === 'start') return this.profileStep(/^[0-2]$/.test(p1 || '0') ? +(p1 || 0) : 0);
    if (p0 === 'route') {
      if (p1) { this.profile = this.cleanProfile({ ...this.profile, ...decodeProfile(p1, this.W) }); store('nd.profile', this.profile); }
      this.route = planRoute(this.W, this.profile);
      if (p2 !== undefined && p2 !== '') {
        if (/^\d+$/.test(p2)) return this.tourStop(+p2);
        return this.redirect(`#/route/${encodeProfile(this.profile)}`);
      }
      return this.routeSummary();
    }
    if (p0 === 'map') return this.explore();
    if (p0 === 'zone' && this.Z[p1]) return this.explore({ zone: p1 });
    if (p0 === 'd' && Object.hasOwn(this.D, p1 || '')) {
      // #/d/core · #/d/core/3 (beat, 1-based) · #/d/core/end
      const at = p2 === 'end' ? 'end' : /^\d+$/.test(p2 || '') ? Math.max(0, +p2 - 1) : null;
      if (p2 && at === null) return this.redirect(`#/d/${p1}`);
      return this.district(p1, { at, part: p2 === 'p' ? p3 : null });
    }
    if (p0 === 'index') return this.openIndex();
    if (p0 === 'read' && /^\d+$/.test(p1 || '') && Object.hasOwn(this.meta, +p1)) return this.openReader(+p1, /^b\d+$/.test(p2 || '') ? p2 : null);
    this.redirect('#/');
  }

  setMode(m) {
    this.mode = m;
    document.body.dataset.mode = m;
    $$('[data-nav]').forEach((b) => {
      const cur = (b.dataset.nav === 'map' && (m === 'explore' || m === 'district')) || (b.dataset.nav === 'route' && (m === 'tour' || m === 'summary' || m === 'profile'));
      if (cur) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('#veil').classList.toggle('on', m === 'intro' || m === 'profile' || m === 'summary');
    if (m === 'intro' || m === 'profile' || m === 'summary') { this.strip.show('hidden'); this.ov.clear(); }
    // in a place, the strip and the reading layer only slide the picture (padding); the dialogs' framing
    // (topView / sideView) assumes the old offset, which also enlarges
    if (this.E && 'slideOffset' in this.E) this.E.slideOffset = m === 'explore' || m === 'district' || m === 'tour';
    if (this.E) {
      // the map may drift a little before the reader's first touch; a district never does
      this.E.idleDrift = m === 'intro' ? 0.035 : 0;
      if (m === 'district' || m === 'tour') this._handled = true;
    }
  }

  fly(view, opts) {
    if (!this.E || !view) return Promise.resolve();
    const c = this.E.cur, t = view.target;
    const travel = Math.hypot(c.target.x - t[0], c.target.y - t[1], c.target.z - t[2]) + Math.abs(c.dist - view.dist) * 0.5;
    if (travel > 80 && !this.E.reduced) this.sfx('whoosh');
    return this.E.flyTo(view, opts);
  }

  frameTo(fr, opts) {
    if (!this.E) return Promise.resolve();
    this.setOffset(fr.off[0], fr.off[1]);
    return this.fly(fr.view, opts);
  }

  setOffset(x, y, o) { if (this.E?.setOffset) this.E.setOffset(x, y, o); else this.E?.setPanelOffset(x, y); }

  /** the part of the screen the world may use: below the top bar, beside the panel / above the strip */
  freeRect() {
    const W = innerWidth, H = innerHeight;
    const top = DESK() ? 64 : 48;
    if (this.mode !== 'explore' && this.mode !== 'district' && this.mode !== 'tour') return { x: 0, y: top, w: W, h: H - top };
    const s = this.strip.size();
    return { x: 0, y: top, w: Math.max(200, W - s.right), h: Math.max(160, H - top - s.bottom) };
  }

  /** the camera pose that fits a set of points into the free rect (falls back to a plain view) */
  fit(points, { az, el, margin } = {}) {
    const rect = this.freeRect();
    const off = this.E.offsetFor ? this.E.offsetFor(rect) : [0, 0];
    const pose = this.E.fitAnchors ? this.E.fitAnchors(points, rect, { az, el, margin }) : null;
    return { off, view: pose };
  }

  /** camera framing for each screen */
  screenFrame(kind, id) {
    const mobile = MOBILE();
    if (kind === 'map') {
      const rim = this._rim || (this._rim = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return new this.world.THREE.Vector3(Math.cos(a) * 102, 0, Math.sin(a) * 102); }));
      const portrait = !DESK() && innerHeight > innerWidth;
      const f = this.fit(rim, { az: 0.62, el: portrait ? 1.08 : 0.72, margin: 0.03 });
      if (!f.view) f.view = { target: [0, 0, 0], az: 0.62, el: portrait ? 1.08 : 0.72, dist: fitDist(portrait ? 1.08 : 0.72) * 1.1 };
      return f;
    }
    if (kind === 'zone') {
      const ds = this.W.districts.filter((d) => this.zoneOf(d) === id).map((d) => this.world.D[d.id]);
      const pts = ds.flatMap((d) => [d.pin || d.anchor, d.anchor]);
      const c = pts.reduce((s, v) => s.add(v), new this.world.THREE.Vector3()).multiplyScalar(1 / pts.length);
      const az = Math.hypot(c.x, c.z) > 8 ? Math.atan2(c.z, c.x) : 0.62;
      return this.fit(pts, { az, el: 0.95, margin: DESK() ? 0.12 : 0.2 });
    }
    if (kind === 'district') return this.shotFrame(id, this.story?.beat ?? 0);
    if (kind === 'peek') {
      const wd = this.world?.D[id];
      const v = wd?.view || (wd?.shots && this.shotFrame(id, 0).view);
      const base = this.screenFrame('profile');
      return { off: base.off, view: v && { target: v.target, az: v.az, el: Math.max(0.42, v.el + 0.2), dist: 120 } };
    }
    if (mobile) return topView(0.9, kind === 'intro' ? 0.5 : 0.7);
    return kind === 'summary' ? sideView(0.76, 0.96) : sideView(0.9, 1);
  }

  /** a district's fitted shot for a beat: its own shots, or (not yet rebuilt) its preset seen from the same side */
  shotFrame(id, beat = 0) {
    const wd = this.world.D[id];
    if (wd.shots) {
      const list = (DESK() ? wd.shots.desk : wd.shots.phone) || wd.shots.phone || wd.shots.desk;
      const s = list[Math.min(list.length - 1, wd.beats[beat]?.shot ?? 0)];
      return this.fit(s.anchors(), { az: s.az, el: s.el, margin: s.margin });
    }
    // legacy districts: fit their bounding box from the preset's direction
    const v = wd.view;
    if (!this._bbox) this._bbox = {};
    if (!this._bbox[id]) {
      const T = this.world.THREE;
      const b = new T.Box3().setFromObject(wd.group);
      const c = new T.Vector3(...v.target), r = Math.min(26, b.getSize(new T.Vector3()).length() / 2);
      this._bbox[id] = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new T.Vector3(c.x + x * r * 0.62, c.y + y * r * 0.45, c.z + z * r * 0.62))));
    }
    const f = this.fit(this._bbox[id], { az: v.az, el: v.el, margin: 0.04 });
    if (f.view) f.view.target = v.target;
    return f;
  }

  reframe() {
    this.ov.remeasure();
    this._topBar = null;
    $('.route-list', this.ui)?.dispatchEvent(new Event('scroll'));
    if (!this.E) return;
    const m = this.mode;
    if (m === 'intro' || m === 'summary') return this.frameTo(this.screenFrame(m), { duration: 0.6 });
    if (m === 'profile') { const cur = this.profile[STEPS[this.step].key]; return this.frameTo(cur ? this.screenFrame('peek', HOME[STEPS[this.step].list][cur]) : this.screenFrame('profile'), { duration: 0.6 }); }
    // a place: keep the reader's camera, re-centre the free rect; refit only if they have not moved it
    const fr = m === 'explore' ? this.screenFrame(this.zone ? 'zone' : 'map', this.zone) : (m === 'district' || m === 'tour') && this.focusId ? this.shotFrame(this.focusId, this.story?.beat ?? 0) : null;
    if (!fr) return;
    this.setOffset(fr.off[0], fr.off[1]);
    if (fr.view && !this.touched()) this.E.easeTo ? this.E.easeTo(fr.view, { duration: 0.6 }) : this.E.flyTo(fr.view, { duration: 0.6 });
  }

  /** has the reader moved the camera since the place (or the last 回到原視角) set it? */
  touched() { return this.E?.touchedSince ? this.E.touchedSince(this.camMark ?? 0) : false; }
  markCamera() { this.camMark = this.E?.clock ?? 0; }

  focusHeading(sel, root = document) {
    const h = $(sel, root);
    if (!h) return;
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  }

  sfx(kind) {
    if (!this.sound?.on) return;
    const t = performance.now();
    if (t - (this._sfxT[kind] || 0) < 400) return;
    this._sfxT[kind] = t;
    this.sound.play(kind);
  }

  // ------------------------------------------------------------------ sound & motion toggles
  bindToggles() {
    const snd = $('#snd'), mot = $('#motion');
    if (snd && !this.sound) snd.hidden = true;
    if (snd && this.sound) {
      // never autoplay: a remembered "on" only marks the button; the reader's click starts the sound
      let want = false;
      if (store('nd.sound') === 1) { snd.classList.add('remembered'); snd.title = '上次開著聲音，按一下繼續'; }
      snd.addEventListener('click', async () => {
        want = !want;
        snd.setAttribute('aria-pressed', String(want));
        snd.classList.remove('remembered');
        snd.removeAttribute('title');
        store('nd.sound', want ? 1 : 0);
        if (!want) { this.sound.disable(); return; }
        snd.classList.add('loading');
        const ok = await this.sound.enable().catch(() => false);
        snd.classList.remove('loading');
        if (!want) { this.sound.disable(); return; }   // switched off again while loading
        if (!ok) { want = false; snd.setAttribute('aria-pressed', 'false'); store('nd.sound', 0); this.toast('這個瀏覽器無法播放聲音'); }
      });
    }
    if (mot && !this.E) mot.hidden = true;
    if (mot && this.E) {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      const apply = (on) => {
        this.motionOn = on;
        this.E.setMotion?.(on);
        mot.classList.toggle('off', !on);
        $('.tl', mot).textContent = on ? '暫停動畫' : '播放動畫';
        // 暫停動畫 also stops a district's autoplay; the reader can still step with 下一步
        if (!on) this.story?.pause();
      };
      const saved = store('nd.motion');
      // screenshots (?still) rest on the world's key moment; otherwise the reader's choice, then the system setting
      apply(this.still ? false : saved === 0 || saved === 1 ? saved === 1 : !mq.matches);
      mq.addEventListener?.('change', () => { if (!this.still && store('nd.motion') == null) apply(!mq.matches); });
      mot.addEventListener('click', () => {
        const on = !this.motionOn;
        apply(on);
        store('nd.motion', on ? 1 : 0);
        this.toast(on ? '動畫繼續播放' : '動畫已暫停；拖曳與鏡頭移動仍可使用');
      });
    }
  }

  // ------------------------------------------------------------------ screens
  intro() {
    this.setMode('intro');
    this.leavePlaceState();
    this.E?.clearFocus();
    this.lastWorldHash = '#/';
    document.title = TITLE0;
    const w = this.W.world;
    this.ui.innerHTML = `
      <section class="intro" aria-labelledby="h-world">
        <div class="col">
          <p class="kicker"><b>dentsu</b>｜決策智慧 2026｜Agentic 時代：重塑品牌與人的真實距離</p>
          <h1 class="h-world" id="h-world">${esc(w.name)}</h1>
          <p class="h-en">${esc(w.en)}</p>
          <p class="q">${esc(w.question)}</p>
          <p class="thesis"><span class="m-cut">這是依 22 篇文章畫成的一張地圖。</span><em>${esc(this.W.map?.sentence || '品牌與消費者之間，多了一層 AI')}</em>。</p>
          <div class="ctas">
            <a class="btn btn-ink" href="#/start">為我規劃一條路線 <span class="arr">→</span></a>
            <a class="btn btn-line" href="#/map">${this.E ? '自己看地圖' : '看文字版地圖'}</a>
            <a class="btn-text" href="#/index">直接看 22 篇目錄</a>
          </div>
          <p class="fine">${esc(w.note)}</p>
        </div>
      </section>`;
    this.frameTo(this.screenFrame('intro'), { duration: 2.6 });
    if (this.booted) this.focusHeading('#h-world');
  }

  profileStep(i) {
    i = Math.max(0, Math.min(2, i || 0));
    this.step = i;
    this.setMode('profile');
    this.leavePlaceState();
    this.E?.clearFocus();
    this.lastWorldHash = `#/start/${i}`;
    document.title = `第 ${i + 1}／3 題｜${SITE}`;
    const S = STEPS[i];
    const list = this.W.profile[S.list];
    const cur = this.profile[S.key];
    this.ui.innerHTML = `
      <section class="dlg" aria-labelledby="dlg-h">
        <div class="step"><span>0${i + 1} / 03</span><span class="bar"><i id="stepbar"></i></span><a class="btn-text" href="#/map">略過，${this.E ? '自己看地圖' : '看地圖'}</a></div>
        <h2 id="dlg-h">${S.title}</h2>
        <p class="hint">${esc(S.hint)}</p>
        <div class="chips2" role="group" aria-label="${esc(S.title.replace(/<br>/g, ''))}">
          ${list.map((o) => `<button type="button" class="chip" data-act="pick" data-key="${S.key}" data-val="${esc(o.id)}" aria-pressed="${cur === o.id}">${esc(o.label)}</button>`).join('')}
        </div>
        <div class="row">
          ${i > 0 ? `<a class="btn btn-line" href="#/start/${i - 1}">← 上一題</a>` : ''}
          <button type="button" class="btn btn-ink" data-act="next-step" data-i="${i}" ${cur ? '' : 'disabled aria-describedby="pick-hint"'}>${i < 2 ? '下一題' : '規劃我的路線'} <span class="arr">→</span></button>
          <span class="hint-sm" id="pick-hint"${cur ? ' hidden' : ''}>先選一個選項</span>
        </div>
      </section>`;
    $('#stepbar').style.width = `${((i + (cur ? 1 : 0)) / 3) * 100}%`;
    this.frameTo(cur ? this.screenFrame('peek', HOME[S.list][cur]) : this.screenFrame('profile'), { duration: cur ? 2.2 : 2 });
    this.focusHeading('#dlg-h');
  }

  routeSummary() {
    this.setMode('summary');
    this.leavePlaceState();
    this.E?.clearFocus();
    const P = this.profile, enc = encodeProfile(P);
    this.lastWorldHash = `#/route/${enc}`;
    document.title = `你的路線｜${SITE}`;
    const lab = (list, id) => (this.W.profile[list].find((x) => x.id === id) || {}).label || '—';
    const arts = this.route.flatMap((s) => s.articles);
    const minutes = arts.reduce((t, n) => t + (+this.meta[n]?.minutes || 0), 0);
    const done = arts.filter((n) => this.read.has(n)).length;
    // resume where the reader stopped: the first stop that still has an unread article
    const resume = done ? Math.max(0, this.route.findIndex((s) => s.articles.some((n) => !this.read.has(n)))) : 0;
    const items = this.route.map((s, i) => {
      const d = this.D[s.id];
      const list = s.articles.map((n) => {
        const m = this.meta[n], r = this.read.has(n);
        return `<li class="t">No.${esc(m.id)}〈${esc(m.title)}〉${r ? '<span class="rd-mark">已讀</span>' : ''}</li>`;
      }).join('');
      return `<li><div class="d">${i + 1}<small>站</small></div><div><div class="r">${esc(this.zoneName(this.zoneOf(d)))}</div><div class="n">${esc(this.pill(d))}<span class="ts">${esc(d.title)}</span></div><ul class="arts">${list}</ul></div></li>`;
    }).join('');
    this.ui.innerHTML = `
      <section class="dlg dlg-route" aria-labelledby="dlg-h">
        <div class="step"><span>你的路線</span><span class="bar"><i id="stepbar"></i></span><a class="btn-text" href="#/start">重新選擇</a></div>
        <h2 id="dlg-h">從品牌出發，<br>${this.route.length} 站走到消費者身邊</h2>
        <p class="hint">${esc(lab('roles', P.role))} · ${esc(lab('industries', P.industry))} · ${esc(lab('focus', P.focus))}</p>
        <p class="facts">${this.route.length} 站・${arts.length} 篇・全文約 ${minutes} 分鐘${done ? `・已讀 ${done} / ${arts.length} 篇` : ''}<span class="m-cut">｜每站先看動畫，再決定要不要讀全文</span></p>
        <ol class="route-list" aria-label="路線上的 ${this.route.length} 站">${items}</ol>
        <div class="row">
          <a class="btn btn-ink" href="#/route/${enc}/${resume}">${resume > 0 ? `從第 ${resume + 1} 站繼續` : '出發'} <span class="arr">→</span></a>
          ${resume > 0 ? `<a class="btn btn-line" href="#/route/${enc}/0">從第 1 站出發</a>` : `<a class="btn btn-line" href="#/map">先看整張地圖</a>`}
        </div>
      </section>`;
    $('#stepbar').style.width = '100%';
    // a long route scrolls inside the list: fade its lower edge while there is more below
    const lst = $('.route-list', this.ui);
    const more = () => lst.classList.toggle('more', lst.scrollTop + lst.clientHeight < lst.scrollHeight - 4);
    lst.addEventListener('scroll', more, { passive: true });
    requestAnimationFrame(more);
    this.frameTo(this.screenFrame('summary'), { duration: 2.4 });
    this.sfx('chime');
    this.focusHeading('#dlg-h');
  }

  tourStop(i) {
    if (!this.route) this.route = planRoute(this.W, this.profile);
    i = Math.max(0, Math.min(this.route.length - 1, i));
    this.stop = i;
    const d = this.D[this.route[i].id];
    document.title = `第 ${i + 1} 站 ${this.pill(d)}｜${SITE}`;
    this.openPlace(d.id, { tour: true });
  }

  goStop(i) {
    if (!this.route || i < 0 || i >= this.route.length) return;
    location.hash = `#/route/${encodeProfile(this.profile)}/${i}`;
  }

  // ------------------------------------------------------------------ the map
  explore({ zone = null } = {}) {
    const prevId = this.mode === 'district' || this.mode === 'tour' ? this.focusId : null;
    const ret = this._ret;
    this._ret = null;
    this.leavePlaceState();
    this.setMode('explore');
    this.focusId = null;
    this.zone = !DESK() ? zone : null;
    this.preview = null;
    this.lastWorldHash = this.zone ? `#/zone/${this.zone}` : '#/map';
    document.title = `地圖｜${SITE}`;
    if (!this.E) return this.textMap(prevId);
    this.ui.innerHTML = '';
    this.E.clearFocus();
    this.mapStrip();
    this.setLimits('map');
    requestAnimationFrame(() => {
      const fr = this.screenFrame(this.zone ? 'zone' : 'map', this.zone);
      this.setOffset(fr.off[0], fr.off[1]);
      // back on the map: the reader's last map camera, else the fitted view
      const mem = !this.zone && this.camMem['#map'];
      this.fly(mem || fr.view, { duration: 2.0 }).then(() => this.markCamera());
      this.markCamera();
    });
    this.mapOverlay();
    if (!store('nd.mapHint')) { this.toast(DESK() ? '拖曳可以旋轉地圖，點一區看看' : '拖曳可以旋轉地圖，點一個區域看看'); store('nd.mapHint', 1); }
    const focusBack = () => {
      const el = (prevId && $(`.ov-pill[data-id="${prevId}"]`)) || (ret?.el?.isConnected && !this.sheet.contains(ret.el) ? ret.el : null) || (ret && this.booted ? $('[data-nav="map"]') : null);
      el?.focus({ preventScroll: true });
    };
    requestAnimationFrame(() => requestAnimationFrame(focusBack));
  }

  mapStrip() {
    const zones = (this.W.zones || ZONES0).map((z) => ({ ...z, districts: this.orderedDistricts().filter((d) => this.zoneOf(d) === z.id).map((d) => ({ id: d.id, pill: this.pill(d), title: d.title })) }));
    const hint = this.zone ? `${this.zoneName(this.zone)}：點一區看看` : DESK() ? '點一區看看，或跟著路線走' : '點一個區域看看';
    this.strip.map({ sentence: this.W.map?.sentence || '品牌與消費者之間，多了一層 AI', zones: this.zone ? zones.filter((z) => z.id === this.zone) : zones, hint });
  }

  /** desktop: the nine district pills on their places; phone: three zone pills, then the zone's districts */
  mapOverlay() {
    const items = [];
    const phoneZones = !DESK() && !this.zone;
    for (const z of this.W.zones || ZONES0) {
      if (phoneZones) {
        // phone: the zone buttons stand in one row under the disc (centre outward: 消費者 → AI → 品牌), off the
        // picture; the rings name themselves on the ground
        const ds = this.W.districts.filter((d) => this.zoneOf(d) === z.id);
        const dock = ['consumer', 'ai', 'brand'].indexOf(z.id);
        items.push({ key: `zone-${z.id}`, kind: 'zone', dock, text: `${z.name}・${ds.length} 區`, onTap: () => { location.hash = `#/zone/${z.id}`; }, aria: `${z.name}，${ds.length} 區` });
        items.push({ key: `letter-${z.id}`, kind: 'letter', text: z.name, at: () => this.zoneLetterAt(z.id) });
      } else if (DESK()) {
        items.push({ key: `letter-${z.id}`, kind: 'letter', text: z.name, at: () => this.zoneLetterAt(z.id) });
      }
    }
    if (!phoneZones) {
      for (const d of this.W.districts) {
        if (this.zone && this.zoneOf(d) !== this.zone) continue;
        items.push({ ...this.pillItem(d, { on: this.preview === d.id }), ...(d.id === 'core' ? { pri: 5.5 } : {}) });
      }
    }
    // the flow that is on names itself (one at a time; below the pills, so a name never pushes a pill away)
    if (this.world.life?.active && !this.still) {
      for (const F of this.W.map?.flows || []) items.push({ key: `flow-${F.id}`, kind: 'label', text: F.name, pri: 4, cls: 'is-flow', avoid: () => this.world.life.keepBoxes?.(this.E, 4, { now: true, except: F.id }) || [], at: () => { const a = this.world.life.active(); return a && a.id === F.id ? a.at : null; } });
    }
    this.ov.set(items);
  }

  pillItem(d, { dim = false, on = false } = {}) {
    const wd = this.world.D[d.id];
    return {
      key: `pill-${d.id}`, kind: 'pill', text: this.pill(d), sub: DESK() ? d.title : null, dim, on,
      at: () => wd.anchor, aria: `${this.pill(d)}：${d.title}`, cls: dim ? 'is-nb' : '',
      onTap: () => this.tapDistrict(d.id),
    };
  }

  zoneCentre(id) {
    const T = this.world.THREE;
    if (id === 'consumer') return this.world.D.core.anchor;
    const ds = this.W.districts.filter((d) => this.zoneOf(d) === id).map((d) => this.world.D[d.id].pin || this.world.D[d.id].anchor);
    const c = ds.reduce((s, v) => s.add(v), new T.Vector3()).multiplyScalar(1 / ds.length);
    return c;
  }

  /** zone lettering on the ground, on the side of each band that faces the camera */
  zoneLetterAt(id, straight = false) {
    const T = this.world.THREE;
    const key = straight ? `${id}-s` : id;
    const v = this._zl?.[key] || ((this._zl ||= {})[key] = new T.Vector3());
    const az = this.E.getPose ? this.E.getPose().az : this.E.cur.az;
    // pills: 消費者 at the centre, AI on its band, 品牌 at the rim, so three 40 px pills never touch on a phone
    const r = straight ? { consumer: 17, ai: 57, brand: 95 }[id] : ZONE_R[id];
    // lettering sits a little off the camera's line, so it does not cover the centre district; pills line up
    const a = az + (straight ? 0 : id === 'consumer' ? 0.0 : id === 'ai' ? 0.18 : -0.12);
    v.set(Math.cos(a) * r, this.world.heightAt ? Math.max(this.world.heightAt(Math.cos(a) * r, Math.sin(a) * r), SEA_Y) + 0.5 : 2, Math.sin(a) * r);
    return v;
  }

  /** tap on a district (pill or object): preview first, a second tap goes; desktop goes at once */
  tapDistrict(id) {
    if (this.mode === 'district' || this.mode === 'tour') {
      if (id === this.focusId) return;
      if (this.preview === id) { location.hash = `#/d/${id}`; return; }
      return this.setPreview(id);
    }
    if (DESK() || this.preview === id) { location.hash = `#/d/${id}`; return; }
    this.setPreview(id);
  }

  setPreview(id) {
    this.preview = id;
    const d = this.D[id];
    this.world.footprint?.(id);
    this.strip.preview({ id, name: this.pill(d), title: this.previewLine(d), zone: this.zoneName(this.zoneOf(d)) });
    if (this.mode === 'explore') this.mapOverlay(); else this.placeOverlay();
    this.reframeOffset();
  }

  /** 「一段 20 秒的動畫・第 14、1、5 篇」: what a tap on 去看 will show, without its conclusion */
  previewLine(d) {
    const wd = this.world?.D[d.id];
    const arts = (d.panel || '').replace(/^.*?·\s*/, '');
    if (!wd?.beats) return arts || d.title;
    const secs = wd.beats.reduce((t, b, i) => t + Math.max(b.dur, (b.keyAt ?? b.dur * 0.4) + holdFor(d.beats?.[i]?.cap)), 0);
    return `一段 ${Math.max(10, Math.round(secs / 5) * 5)} 秒的動畫${arts ? `・${arts}` : ''}`;
  }

  clearPreview() {
    if (!this.preview) return;
    this.preview = null;
    this.world.footprint?.(null);
    if (this.mode === 'explore') { this.mapStrip(); this.mapOverlay(); }
    else if (this.focusId) { this.renderPlaceStrip(); this.placeOverlay(); }
    this.reframeOffset();
  }

  /** the strip changed size: move only the projection offset */
  reframeOffset() {
    if (!this.E?.offsetFor) return;
    requestAnimationFrame(() => { const o = this.E.offsetFor(this.freeRect()); this.setOffset(o[0], o[1]); });
  }

  orderedDistricts() {
    return ['brand', 'ai', 'consumer'].flatMap((z) => this.W.districts.filter((d) => this.zoneOf(d) === z));
  }

  /** the districts in reading order (brand → AI → consumer); step ±1 from id, wrapping round */
  nextDistrict(id, step = 1) {
    const order = this.orderedDistricts().map((d) => d.id);
    return order[(order.indexOf(id) + step + order.length) % order.length];
  }

  // ------------------------------------------------------------------ a place (district or route stop)
  district(id, { at = null, part = null } = {}) {
    // already here (back from the reader, or a beat / part link): no flight, no reset
    if (this.mode === 'district' && this.focusId === id && this.strip.mode !== 'hidden') {
      if (this.story && at !== null) { if (at === 'end') this.story.toEnd(); else this.story.goto(at, { k: 1 }); }
      if (this.story && part) this.focusPart(part);
      this.refreshReadMarks();
      return;
    }
    document.title = `${this.pill(this.D[id])}｜${SITE}`;
    this.openPlace(id, { tour: false, at, part });
  }

  openPlace(id, { tour, at = null, part = null }) {
    const d = this.D[id];
    const wasHere = this.focusId === id && (this.mode === 'district' || this.mode === 'tour');
    if (!wasHere) this.leavePlaceState();
    this.setMode(tour ? 'tour' : 'district');
    this.focusId = id;
    this.lastWorldHash = location.hash;
    this.preview = null;
    this.part = null;
    this.levering = false;
    this.world?.footprint?.(null);
    if (!this.E) { this.worldText(); this.renderPlaceStrip({ tour }); this.setReading(true); return; }
    this.ui.innerHTML = '';
    const wd = this.world.D[id];
    // the story: new-style districts are told in beats; the others show their title
    if (this.isStory(id)) {
      if (!this.stories[id]) this.stories[id] = new Story(wd, d, { reduced: this.reduced || this.still, onState: (s, why) => this.onStory(id, s, why) });
      this.story = this.stories[id];
    } else this.story = null;
    this.renderPlaceStrip({ tour });
    this.setLimits('district', id);
    this.world.focusDim?.(id);
    this.E.setFocus(wd.focus?.pos ?? wd.anchor, wd.focus?.r ?? 34);
    const first = !this.seen.has(id) || tour;
    const mem = this.camMem[id];
    const st = this.story;
    // what the reader sees on arrival: a first visit (or a route stop) plays once; a revisit holds the result
    if (st) {
      if (this.still || at !== null) { if (at === 'end' || at === null) st.toEnd(); else st.goto(at, { k: 1 }); }
      else if (first) st.goto(0, { k: 0 });
      else st.toEnd();
    }
    requestAnimationFrame(() => {
      const fr = this.shotFrame(id, st ? st.beat : 0);
      this.setOffset(fr.off[0], fr.off[1]);
      const pose = !first && mem ? mem : fr.view;
      const go = this.still ? (this.E.setPose ? (this.E.setPose(pose), Promise.resolve()) : this.E.flyTo(pose, { duration: 0.01 })) : this.fly(pose);
      this.markCamera();
      if (first && !this.still && at === null && st) { this.seen.add(id); this._autoplay = id; this._held = id; this.syncStrip(); }
      go.then(() => {
        this.markCamera();
        if (this.focusId !== id || !st) return;
        if (this._autoplay === id) { this._autoplay = null; st.play(); }
        if (part) this.focusPart(part);
      });
    });
    this.sfx('pencil');
    this.placeOverlay();
    setTimeout(() => $('#st-name')?.focus({ preventScroll: true }), 60);
  }

  /** leave the district (or the stop) for the map (or the route) */
  leavePlace() { location.hash = this.mode === 'tour' ? `#/route/${encodeProfile(this.profile)}` : this.zone ? `#/zone/${this.zone}` : '#/map'; }

  /** forget the place: remember the reader's camera there, rest its story, clear the overlay */
  leavePlaceState() {
    if (this.E && (this.mode === 'district' || this.mode === 'tour') && this.focusId) {
      if (this.E.getPose) this.camMem[this.focusId] = this.E.getPose();
      const st = this.stories[this.focusId];
      this._leaving = true;
      if (st) { st.focusPart = null; st.toEnd(); }
      this._leaving = false;
      this.world.D[this.focusId]?.emphasize?.(null);
    }
    if (this.E && this.mode === 'explore' && !this.zone && this.E.getPose) this.camMem['#map'] = this.E.getPose();
    this.story = null;
    this.part = null;
    this.levering = false;
    this.preview = null;
    this._autoplay = null;
    this._held = null;
    this.strip.setHeld?.(false);
    this.world?.footprint?.(null);
    this.world?.focusDim?.(null);
    if (this.strip.reading) this.setReading(false);
  }

  /** the layout of the text beside the picture: 'strip' (phone), 'column' (phone landscape), 'panel' (desktop) */
  get layout() { return this.strip.layout; }

  setLimits(kind, id) {
    if (!this.E?.limits) return;
    const L = this.E.limits;
    if (kind === 'map') {
      Object.assign(L, { el: [0.55, 1.42], zoom: [0.6, 1.6], az: null, pan: { center: new this.world.THREE.Vector3(0, 0, 0), r: 70 } });
    } else {
      const wd = this.world.D[id];
      const s = wd.shots ? ((DESK() ? wd.shots.desk : wd.shots.phone) || wd.shots.phone)[0] : wd.view;
      const az = s?.az ?? 0;
      Object.assign(L, { el: [0.05, 1.35], zoom: [0.35, 2.5], az: wd.shots ? [az - Math.PI / 2, az + Math.PI / 2] : null, pan: { center: (wd.pin || wd.anchor).clone(), r: 24 } });
    }
  }

  /** the strip for the place in focus */
  renderPlaceStrip({ tour = this.mode === 'tour' } = {}) {
    const id = this.focusId;
    const d = this.D[id];
    const story = this.story;
    const next = this.wayOn(tour);
    this.strip.district({
      id, zone: this.zoneName(this.zoneOf(d)), name: this.pill(d), panel: d.panel || '',
      n: story ? story.n : 0, tour: tour ? { i: this.stop, n: this.route.length } : null,
      reading: this.readingHTML(d, tour), legacy: !story,
    });
    if (story) this.syncStrip();
    else { this.strip.update({ caption: d.title, cite: '', beat: 0, n: 0, k: 1, ended: true }); this.strip.legacyControls(next); }
  }

  /** the way on from a place: the next stop on a route, else the next district in reading order */
  wayOn(tour) {
    if (tour) {
      const last = this.stop >= this.route.length - 1;
      return last ? { label: '看完整張地圖', act: 'to-map' } : { label: `下一站：${this.pill(this.D[this.route[this.stop + 1].id])}`, act: 'next-stop' };
    }
    return { label: `下一區：${this.pill(this.D[this.nextDistrict(this.focusId)])}`, act: 'next-district' };
  }

  // ------------------------------------------------------------------ story ↔ strip ↔ overlay ↔ camera
  onStory(id, s, why) {
    if (this._leaving || id !== this.focusId || this.story?.mod !== this.world.D[id]) return;
    if (s.ended && this._held === id) this._held = null;
    this.syncStrip();
    if (why === 'beat' || why === 'next' || why === 'goto' || why === 'prev' || why === 'play' || why === 'lever' || why === 'end' || why === 'part') {
      this.placeOverlay();
      if (why !== 'part') this.followShot();
      // the address follows the beat (replaceState: the back gesture returns to the previous place, not beat)
      if (!this.still && this.mode === 'district') {
        const h = s.ended ? `#/d/${id}` : `#/d/${id}/${s.beat + 1}`;
        if (location.hash !== h && why !== 'part' && location.hash.startsWith(`#/d/${id}`)) history.replaceState(null, '', h);
        this.lastWorldHash = `#/d/${id}`;
      }
    }
    // the neighbours' names come back when the story rests (held, paused or ended)
    if (why === 'caption' || why === 'end' || why === 'held' || why === 'pause' || why === 'resume') this.placeOverlay();
  }

  syncStrip() {
    const st = this.story;
    if (!st) return;
    const d = this.D[this.focusId];
    const s = st.state;
    const cite = (s.captionShown || s.ended ? d.beats?.[s.beat]?.cite : s.beat > 0 ? d.beats?.[s.beat - 1]?.cite : '') || '';
    const tapLine = this.part ? (d.taps || []).find((t) => t.part === this.part)?.line : '';
    const ask = this.levering && this._leverAsk ? d.lever?.ask : '';
    this.strip.update({
      ...s, caption: ask || st.caption(), cite: s.ended || ask ? '' : cite, line: tapLine,
      stale: !ask && !tapLine && !s.ended && !s.captionShown && s.beat > 0,
      lever: !!(d.lever && this.world.D[this.focusId].lever), next: this.wayOn(this.mode === 'tour'),
      levering: this.levering ? this.leverControls() : '',
      // while the arrival flight settles the story is about to play: show its pause, not 下一步
      playing: s.playing || this._autoplay === this.focusId,
    });
    this.strip.setHeld?.(this._held === this.focusId && !s.ended && !this.still);
  }

  /** a story's next shot: ease there only if the reader has not moved the camera; otherwise point at it */
  followShot() {
    const st = this.story;
    if (!st || !this.E?.easeTo) return;
    const wd = this.world.D[this.focusId];
    const list = wd.shots ? ((DESK() ? wd.shots.desk : wd.shots.phone) || wd.shots.phone || wd.shots.desk) : null;
    const shot = list ? Math.min(list.length - 1, wd.beats[st.beat]?.shot ?? 0) : wd.beats[st.beat]?.shot ?? 0;
    if (shot === this._shot && this._shotId === this.focusId) return;
    const before = this._shotId === this.focusId ? this._shot : null;
    this._shot = shot; this._shotId = this.focusId;
    if (before === null || this.still) return;
    if (!this.touched()) {
      const fr = this.shotFrame(this.focusId, st.beat);
      this.setOffset(fr.off[0], fr.off[1]);
      this.E.easeTo(fr.view, { duration: 0.8 });
      this.markCamera();
    }
  }

  storyNext() {
    const st = this.story;
    if (!st) return;
    if (this.part) this.clearPart();
    if (st.ended) return;
    st.next();
  }

  replay() {
    const st = this.story;
    if (!st) return;
    this.endLever(true);
    this.clearPart(true);
    this._shot = null;
    st.replay();
    if (!this.touched()) {
      const fr = this.shotFrame(this.focusId, 0);
      this.setOffset(fr.off[0], fr.off[1]);
      this.E.easeTo?.(fr.view, { duration: 0.8 });
      this.markCamera();
    }
    const wd0 = this.world.D[this.focusId], l0 = wd0.shots ? ((DESK() ? wd0.shots.desk : wd0.shots.phone) || wd0.shots.phone || wd0.shots.desk) : null;
    this._shot = l0 ? Math.min(l0.length - 1, wd0.beats[0]?.shot ?? 0) : wd0.beats[0]?.shot ?? 0;
  }

  resetView() {
    if (!this.E || !(this.mode === 'district' || this.mode === 'tour' || this.mode === 'explore')) return;
    const fr = this.mode === 'explore' ? this.screenFrame(this.zone ? 'zone' : 'map', this.zone) : this.shotFrame(this.focusId, this.story?.beat ?? 0);
    this.setOffset(fr.off[0], fr.off[1]);
    if (fr.view) (this.E.easeTo ? this.E.easeTo(fr.view, { duration: 0.6 }) : this.E.flyTo(fr.view, { duration: 0.6 }));
    this.markCamera();
    this._dbl = null;
  }

  // ------------------------------------------------------------------ parts and levers
  tapWorld(x, y) {
    if (!this.pick || this.sheetOpen) return;
    const inPlace = this.mode === 'district' || this.mode === 'tour';
    if (!inPlace && this.mode !== 'explore') return;
    const hit = this.pick.pick(x, y, inPlace ? this.focusId : null);
    if (hit?.kind === 'part') {
      if (this.levering && this.leverPick?.(hit.part)) return;
      return this.focusPart(hit.part);
    }
    if (hit?.kind === 'district') return this.tapDistrict(hit.id);
    if (this.part) return this.clearPart();
    if (this.preview) return this.clearPreview();
  }

  doubleTap(x, y) {
    if (!this.E?.easeTo || !this.pick) return;
    const now = this.E.clock;
    // a second double-tap soon after goes back to the framing
    if (this._dbl && now - this._dbl < 4) return this.resetView();
    const lvl = this.focusId ? (this.world.D[this.focusId].pin || this.world.D[this.focusId].anchor).y - 4 : 0;
    const g = this.pick.ground(x, y, lvl);
    if (!g) return;
    const p = this.E.getPose();
    this.E.easeTo({ target: [g.x, g.y, g.z], az: p.az, el: p.el, dist: p.dist * 0.6 }, { duration: 0.4 });
    this.E.lastInput = this.E.clock;   // the reader asked for it: the camera is now theirs (回到原視角 appears)
    this._dbl = now;
  }

  focusPart(part) {
    const st = this.story;
    const d = this.D[this.focusId];
    const wd = this.world.D[this.focusId];
    if (!st || !wd.parts?.[part]) return;
    const tap = (d.taps || []).find((t) => t.part === part);
    this.part = part;
    st.focus(part, tap?.beat ?? wd.parts[part].beat);
    this.syncStrip();
    this.placeOverlay();
    // off screen: an edge arrow points at it (the camera does not move by itself)
  }

  clearPart(quiet) {
    if (!this.part) return;
    this.part = null;
    this.story?.clearFocus();
    if (!quiet) { this.syncStrip(); this.placeOverlay(); }
  }

  /** 換你試試: a choice between the article's options (core) or picking a card and stamping it (judge) */
  startLever() {
    const st = this.story, wd = this.world.D[this.focusId];
    if (!st || !wd.lever) return;
    this.clearPart(true);
    this.levering = true;
    this._leverAsk = true;
    this.leverPick = null;
    if (wd.lever.kind === 'pick') {
      // the reader picks one of the shortlisted parts, then confirms
      this._pick = null;
      st.setLever({ card: null, stamped: false }, { play: false });
      this.leverPick = (part) => {
        const i = (wd.lever.parts || []).indexOf(part);
        if (i < 0) return false;
        this._pick = i;
        st.setLever({ card: i, stamped: false }, { play: false });
        this.syncStrip();
        this.placeOverlay();
        return true;
      };
    }
    this.syncStrip();
    this.placeOverlay();
  }

  leverControls() {
    const d = this.D[this.focusId], wd = this.world.D[this.focusId], L = d.lever;
    if (!L) return '';
    if (wd.lever.kind === 'pick') {
      const ready = this._pick !== null && this._pick !== undefined;
      return `${ready ? `<button type="button" class="st-btn is-ink" data-act="lever-stamp">${esc(L.act || '蓋章')}</button>` : ''}<button type="button" class="st-btn" data-act="lever-done">完成</button>`;
    }
    const cur = this.story.lever;
    return `${L.options.map((o) => `<button type="button" class="st-btn${cur === o.k ? ' is-ink' : ''}" data-act="lever-opt" data-k="${esc(o.k)}" aria-pressed="${cur === o.k}">${esc(o.label)}</button>`).join('')}<button type="button" class="st-btn" data-act="lever-done">完成</button>`;
  }

  endLever(quiet) {
    if (!this.levering) return;
    this.levering = false;
    this.leverPick = null;
    if (!quiet) { this.syncStrip(); this.placeOverlay(); }
  }

  // ------------------------------------------------------------------ the strip's actions
  stripAct(name, el) {
    const st = this.story;
    if (name === 'go') { location.hash = `#/d/${el.dataset.id}`; return; }
    if (name === 'unpreview') return this.clearPreview();
    if (name === 'crumb') return this.leavePlace();
    if (name === 'read') return this.setReading(!this.strip.reading);
    if (name === 'fold') { const was = this.strip.folded; this.strip.setFolded(!was); if (was) this.reframeOffset(); if (this.focusId) this.placeOverlay(); return; }
    if (name === 'seg' && st) { this.clearPart(true); st.goto(+el.dataset.i, { k: 1 }); return; }
    if (name === 'pause' && st && this._autoplay === this.focusId) { this._autoplay = null; this._held = null; return this.syncStrip(); }
    if (name === 'pause' && st) return st.pause();
    if (name === 'next' && st) return this.storyNext();
    if (name === 'replay') return this.replay();
    if (name === 'lever') return this.startLever();
    if (name === 'lever-opt' && st) { this._leverAsk = false; st.setLever(el.dataset.k); this.syncStrip(); return; }
    if (name === 'lever-stamp' && st) { this._leverAsk = false; st.setLever({ card: this._pick, stamped: true }); this.endLever(); return; }
    if (name === 'lever-done') return this.endLever();
    if (name === 'next-district') { location.hash = `#/d/${this.nextDistrict(this.focusId)}`; return; }
    if (name === 'next-stop') return this.goStop(this.stop + 1);
    if (name === 'to-map') { location.hash = '#/map'; return; }
    if (name === 'beat' && st) { this.clearPart(true); this.setReading(false); st.goto(+el.dataset.i, { k: 1 }); return; }
    if (name === 'part') { this.setReading(false); return this.focusPart(el.dataset.part); }
    if (name === 'lever-radio' && st) { this.setReading(false); st.setLever(el.value || el.dataset.k); this.syncStrip(); }
  }

  setReading(on) {
    this.strip.setReading(on);
    if (on) setTimeout(() => $('#st-body')?.focus({ preventScroll: true }), 50);
    this.reframeOffset();
  }

  // ------------------------------------------------------------------ the overlay for a place
  placeOverlay() {
    if (!this.E || !this.focusId) return;
    const id = this.focusId, d = this.D[id], wd = this.world.D[id], st = this.story;
    const items = [];
    const mobile = !DESK();
    if (st) {
      const s = st.state;
      const beat = s.beat;
      // labels: those of the current beat once its key event has landed; the result's label stays at the end
      for (const L of d.labels || []) {
        const now = s.ended ? L.rest : L.beat === beat && s.captionShown;
        if (!now || !wd.labelAt?.[L.part]) continue;
        if (this.part && L.part !== this.part) continue;
        items.push({ key: `lab-${L.part}-${L.beat}`, kind: 'label', part: L.part, text: L.text, at: wd.labelAt[L.part], pri: 8 });
      }
      // words on objects: shown whenever the module says the object carries them
      for (const D of d.decals || []) {
        const f = wd.decalAt?.[D.part];
        if (!f) continue;
        // the data says when a word is on its object: in which beats, at the end, under which choice
        if (D.lever && s.lever !== D.lever) continue;
        if (s.ended ? !(D.rest ?? !D.beats) : D.beats && !D.beats.includes(beat)) continue;
        const cls = (D.typed || (D.rows && D.typed !== false) ? 'is-typed' : D.seal || (D.part === 'card' && D.text === '核准') ? 'is-seal' : '') + (D.hl ? ' is-hl' : '');
        // a card's rows can be its parts: the row itself is the button (no separate dot)
        const rowTaps = D.rowParts?.map((p) => (p && wd.parts?.[p] ? { part: p, line: (d.taps || []).find((t) => t.part === p)?.line || '', on: this.part === p } : null));
        const unit = D.unit ?? wd.decalUnit?.[D.part] ?? (D.rows ? 0.55 : 0.75);
        // the surface the words sit on ([w, h] in world units, from the data or the module): they fit inside it
        const size = D.size ?? wd.decalSize?.[D.part] ?? null;
        const lead = (wd.beats?.[beat]?.parts || []).includes(D.part) || this.part === D.part;
        items.push({ key: `dec-${D.part}${this.part || ''}`, kind: 'decal', text: D.text || '', rows: D.rows, rowTaps, onRow: (p) => this.focusPart(p), at: f, unit, size, cls, pri: lead ? 8.7 : 8.5 });
      }
      // hotspots: at the end, on the parts that answer (up to five), or the lever's shortlist
      if (this.levering && wd.lever?.kind === 'pick') {
        const lab = d.lever?.pickLabel || '方案 {i}';
        (wd.lever.parts || []).forEach((p, i) => { if (this._pick !== i) items.push({ key: `hot-${p}`, kind: 'hot', text: lab.replace('{i}', i + 1), at: wd.parts[p].anchor, onTap: () => this.leverPick?.(p) }); });
      } else if (s.ended || this.part) {
        const taps = (d.taps || []).filter((t) => wd.parts?.[t.part] && t.dot !== false).slice(0, 5);
        const shownLab = new Set(items.filter((x) => x.kind === 'label').map((x) => x.part));
        for (const t of taps) {
          const word = (d.labels || []).find((L) => L.part === t.part)?.text;
          items.push({ key: `hot-${t.part}`, kind: 'hot', text: t.line, word: word && !shownLab.has(t.part) ? word : '', at: wd.parts[t.part].anchor, on: this.part === t.part, onTap: () => this.focusPart(t.part) });
        }
      }
      if (this.part && DESK() && this.strip.folded) {
        const line = (d.taps || []).find((t) => t.part === this.part)?.line;
        const at = wd.labelAt?.[this.part] || wd.parts?.[this.part]?.anchor;
        if (line && at) items.push({ key: `tapline-${this.part}`, kind: 'label', text: line, at, pri: 8.8, cls: 'is-tapline' });
      }
      // the camera chip, once the reader has moved it
      items.push({ key: 'chip-reset', kind: 'chip', text: '回到原視角', onTap: () => this.resetView(), aria: '回到原視角', cls: 'is-reset' });
    } else if (wd.notes) {
      // not yet rebuilt: its own notes, as labels (at most three survive the budget)
      wd.notes().slice(0, 3).forEach((N, i) => items.push({ key: `note-${i}`, kind: 'label', text: N.t, at: () => N.p, pri: 6 }));
      items.push({ key: 'chip-reset', kind: 'chip', text: '回到原視角', onTap: () => this.resetView(), aria: '回到原視角', cls: 'is-reset' });
    }
    // an edge arrow when the subject of the beat (or the focused part) is off screen
    const subj = this.part && wd.parts?.[this.part] ? wd.parts[this.part].anchor : st && wd.beats[st.beat]?.parts?.[0] && wd.parts?.[wd.beats[st.beat].parts[0]] ? wd.parts[wd.beats[st.beat].parts[0]].anchor : null;
    if (subj) {
      const sp = this.part || wd.beats[st.beat]?.parts?.[0];
      const name = (d.labels || []).find((L) => L.part === sp)?.text || (d.decals || []).find((x) => x.part === sp && x.text)?.text || this.pill(d);
      items.push({ key: 'arrow', kind: 'arrow', text: `在畫面外：${name}`, at: subj, onTap: () => this.resetView() });
    }
    // neighbours keep their names (smaller, quieter, never over the subject)
    const nbMax = mobile ? 3 : 6;
    const others = this.W.districts.filter((x) => x.id !== id);
    if (!st || st.ended || !st.playing) others.slice(0, 9).forEach((x) => items.push({ ...this.pillItem(x, { dim: true, on: this.preview === x.id }), pri: this.preview === x.id ? 7 : 2 }));
    this._nbMax = nbMax;
    this.ov.set(items);
  }

  // ------------------------------------------------------------------ per frame
  frame(t, dt) {
    if (!this.E || this.E.paused) return;
    const E = this.E;
    const night = E.npr.u.uNight.value > 0.5;
    if (night !== this._night) { this._night = night; document.body.classList.toggle('night', night); }
    // the story runs on the real clock
    const rdt = Math.min(0.1, E.clock - (this._lastClock ?? E.clock));
    this._lastClock = E.clock;
    // a first visit's story starts while the arrival flight settles (its last quarter), so the picture is
    // already acting when the camera lands
    const fl = this.E.flight;
    const landing = fl && fl.kind !== 'ease' ? (E.clock - fl.t0) / fl.dur : 1;
    if (this._autoplay && this._autoplay === this.focusId && this.story && landing > 0.75) { this._autoplay = null; this.story.play(); }
    if (this.story && landing > 0.75) this.story.update(rdt);
    const place = this.mode === 'district' || this.mode === 'tour';
    const world = place || this.mode === 'explore';
    if (!world) return;
    // the reset chip appears only after the reader has moved the camera
    const chip = $('.ov-chip.is-reset');
    if (chip) chip.hidden = !this.touched() || !!E.flight;
    const free = this.freeRect();
    let subject = null;
    if (place && this.world.D[this.focusId]?.shots && this.story) {
      const wd = this.world.D[this.focusId];
      const list = (DESK() ? wd.shots.desk : wd.shots.phone) || wd.shots.phone;
      const s = list[Math.min(list.length - 1, wd.beats[this.story.beat]?.shot ?? 0)];
      const pts = s.anchors();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const v of pts) { const p = E.project(v, { x: 0, y: 0, z: 0 }); if (!p) continue; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
      if (x0 < x1) subject = { x0, y0, x1, y1 };
    }
    // the zone lettering fades out as the camera comes down into a district
    $('#ov').classList.toggle('close-up', place);
    const cover = this.strip.cover();
    const vis = cover ? { ...free, h: Math.max(80, innerHeight - free.y - cover) } : free;
    const topBar = this._topBar ?? (this._topBar = ($('.top')?.getBoundingClientRect().bottom || 0));
    const keep = this.mode === 'explore' && this.world.life?.keepBoxes ? this.world.life.keepBoxes(E, 12) : null;
    this.ov.frame(E, { free: vis, mobile: !DESK(), subject, reading: this.strip.reading && !DESK(), top: topBar, keep });
  }

  // ------------------------------------------------------------------ the reading layer
  title(n) { return this.meta[n].title; }
  authors(n) { return this.meta[n].authors.map((a) => a.zh || a.en).join('、'); }

  artCard(n, why, dId) {
    const m = this.meta[n], c = this.W.articles[n];
    const own = (this.D[dId]?.cards || []).find((x) => x.n === n);
    const rs = why ? reasons(this.W, n, this.profile) : [];
    const whyHtml = rs.length
      ? `<p class="why"><span class="why-h">推薦原因</span>${rs.map((r) => `<span>${esc(r)}</span>`).join('')}</p>`
      : why && dId === 'core' ? '<p class="why"><span class="why-h">每條路線都在數位分身結束：不論從哪裡出發，答案都從懂消費者開始。</span></p>' : '';
    return `<div class="art ch-${esc(m.ch)}">
      <div class="no">No.${esc(m.id)} · ${esc(CH[m.ch] || m.ch)} · 約 ${esc(m.minutes)} 分鐘${this.read.has(n) ? ' · <span class="rd-mark">已讀</span>' : ''}</div>
      ${m.kicker ? `<div class="sub2">${esc(m.kicker)}</div>` : ''}
      <h4>${esc(m.title)}</h4>
      ${m.sub ? `<div class="sub2">${esc(m.sub)}</div>` : ''}
      <div class="by">${esc(this.authors(n))}</div>
      ${own ? `<p class="core">${esc(own.line)}</p>` : `<p class="core"><b>${esc(c.coreName)}</b>${esc(c.core)}</p>`}
      ${whyHtml}
      <div class="go"><button type="button" class="act primary" data-read="${n}">讀全文</button></div>
    </div>`;
  }

  readingHTML(d, tour) {
    const stopInfo = tour ? this.route[this.stop] : null;
    const onRoute = stopInfo ? stopInfo.articles : [];
    const arts = tour && onRoute.length ? onRoute : d.articles;
    const others = tour ? d.articles.filter((n) => !onRoute.includes(n)) : [];
    const q = d.quote;
    const qcite = `第 ${q.n} 篇〈${esc(this.meta[q.n].title)}〉${q.page ? ` · p.${esc(q.page)}` : ''}`;
    const cards = `<section class="rl"><h3>${tour ? '為你挑的文章' : '這一區的文章'}</h3>${arts.map((n) => this.artCard(n, tour, d.id)).join('')}${others.length ? `<h3>同一區還有</h3>${others.map((n) => this.artCard(n, false, d.id)).join('')}` : ''}</section>`;
    const near = d.related ? d.related.map((id) => this.D[id]).filter(Boolean) : this.W.districts.filter((x) => x.id !== d.id && this.zoneOf(x) === this.zoneOf(d)).slice(0, 3);
    const rel = near.length ? `<section class="rl"><h3>相關區域</h3><p class="nb">${near.map((x) => `<button type="button" data-go="${x.id}">${esc(this.pill(x))}</button>`).join('')}</p></section>` : '';
    if (!d.beats) {
      // not yet rebuilt: its one line and its steps
      return `<section class="rl"><h3>這一區在說</h3><p class="idea">${esc(d.line)}</p></section>
        <section class="rl"><ol class="steps">${(d.steps || []).map((s) => `<li>${esc(s.t ?? s)}</li>`).join('')}</ol></section>
        <section class="rl qbox"><blockquote>${esc(q.t || q.text)}</blockquote><cite>${qcite}</cite></section>
        ${cards}${rel}`;
    }
    const L = d.lever;
    const lever = L ? `<section class="rl"><h3>換你試試</h3><p>${esc(L.ask || '')}</p>${L.options?.length ? `<div class="radio" role="radiogroup" aria-label="${esc(L.ask || '換你試試')}">${L.options.map((o) => `<button type="button" role="radio" class="act" data-act="lever-radio" data-k="${esc(o.k)}" aria-checked="${(this.story?.lever ?? L.def) === o.k}">${esc(o.label)}</button>`).join('')}</div>` : '<p><button type="button" class="act" data-act="lever">開始</button></p>'}</section>` : '';
    const parts = (d.taps || []).length ? `<section class="rl"><h3>這一區可以點的東西</h3><p class="nb">${d.taps.map((t) => `<button type="button" data-act="part" data-part="${esc(t.part)}">${esc(t.line)}</button>`).join('')}</p></section>` : '';
    return `<section class="rl"><h3>這一區在說</h3><p class="idea">${esc(d.idea || d.line)}</p></section>
      <section class="rl"><h3>動畫的 ${d.beats.length} 步</h3><ol class="beats">${d.beats.map((b, i) => { const m = /^(\d+)\s+(b\d+)/.exec(b.src || ''); return `<li>${m ? `<a class="to-src" href="#/read/${+m[1]}/${m[2]}">${esc(b.cap)}</a>` : `<button type="button" data-act="beat" data-i="${i}">${esc(b.cap)}</button>`}${b.cite ? `<span>${esc(b.cite)}</span>` : ''}</li>`; }).join('')}</ol></section>
      ${(d.terms || []).length ? `<section class="rl"><h3>書裡怎麼說</h3><dl class="terms">${d.terms.map((t) => `<dt>${esc(t.term)}</dt><dd>${esc(t.gloss)}</dd>`).join('')}</dl></section>` : ''}
      <section class="rl qbox"><blockquote>${esc(q.text || q.t)}</blockquote><cite>${qcite}</cite></section>
      ${d.note ? `<p class="rl-note">${esc(d.note)}</p>` : ''}
      ${cards}${lever}${rel}${parts}`;
  }

  // a kept panel (back from the reader) shows the 已讀 mark of what was just read
  refreshReadMarks() {
    for (const art of $$('.art', $('#strip'))) {
      const n = +($('[data-read]', art)?.dataset.read || 0);
      const no = $('.no', art);
      if (n && no && this.read.has(n) && !$('.rd-mark', no)) no.insertAdjacentHTML('beforeend', ' · <span class="rd-mark">已讀</span>');
    }
  }

  // ------------------------------------------------------------------ without WebGL
  worldText() {
    if (this.E) this.ui.innerHTML = '';
    else if (!$('.textmap', this.ui)) this.textMap(null, true);
  }

  textMap(prevId, quiet) {
    this.ui.innerHTML = `
      <section class="textmap" aria-labelledby="tm-h"><div class="idx">
        <h1 id="tm-h">地圖</h1>
        <p class="lead">這台裝置無法顯示 3D 地圖，這裡是同一張地圖的文字版：由外而內，從品牌出發，經過 AI，走到消費者。點區名看這一區在說什麼，點篇名讀全文。</p>
        ${this.ringGroups('tm', '打開這一區')}
      </div></section>`;
    this.strip.show('hidden');
    const back = prevId && $(`[data-go="${prevId}"]`, this.ui);
    if (back) back.focus();
    else if (this.booted && !quiet) this.focusHeading('#tm-h');
  }

  act(name, el) {
    if (name === 'pick') {
      const { key, val } = el.dataset;
      this.profile = this.cleanProfile({ ...this.profile, [key]: val });
      store('nd.profile', this.profile);
      const i = STEPS.findIndex((s) => s.key === key);
      $$('.chip', el.parentElement).forEach((c) => c.setAttribute('aria-pressed', String(c === el)));
      const nb = $('[data-act="next-step"]');
      nb.disabled = false;
      nb.removeAttribute('aria-describedby');
      const ph = $('#pick-hint');
      if (ph) ph.hidden = true;
      $('#stepbar').style.width = `${((i + 1) / 3) * 100}%`;
      this.sfx('type');
      this.frameTo(this.screenFrame('peek', HOME[STEPS[i].list][val]), { duration: 2.2 });
    }
    if (name === 'next-step') {
      const i = +el.dataset.i;
      if (i < 2) location.hash = `#/start/${i + 1}`;
      else location.hash = `#/route/${encodeProfile(this.profile)}`;
    }
    if (name === 'back') this.closeSheet();
    if (name === 'retry') this.openReader(+el.dataset.n);
    if (name === 'jump-core') this.jumpTo($('#core-line', this.sheet), 'center');
    if (name === 'show-district') {
      const n = this.reading;
      if (!n) return;
      const k = this.stopOf(n);
      location.hash = k >= 0 ? `#/route/${encodeProfile(this.profile)}/${k}` : `#/d/${this.W.articles[n].district}`;
    }
  }

  /** touring: the stop that holds article n (or its district), else -1 */
  stopOf(n) {
    if (this.mode !== 'tour' || !this.route) return -1;
    const k = this.route.findIndex((s) => s.articles.includes(n));
    return k >= 0 ? k : this.route.findIndex((s) => s.id === this.W.articles[n].district);
  }

  // scroll a target into view and move keyboard / screen-reader focus with it
  jumpTo(t, block = 'start') {
    if (!t) return;
    t.scrollIntoView({ behavior: this.reduced ? 'auto' : 'smooth', block });
    if (!t.hasAttribute('tabindex')) t.tabIndex = -1;
    t.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ index + reader
  ringGroups(pre, go) {
    return ['brand', 'ai', 'consumer'].map((zid) => {
      const z = this.Z[zid] || ZONES0.find((x) => x.id === zid);
      const ds = this.orderedDistricts().filter((d) => this.zoneOf(d) === zid);
      return `<section class="idx-ring" aria-labelledby="${pre}-ring-${zid}">
        <div class="rh"><h2 id="${pre}-ring-${zid}">${esc(z.name)}</h2></div>
        <div>${ds.map((d) => `<div class="idx-d"><h3>${esc(this.pill(d))} <small>${esc(d.title)}</small> <button type="button" data-go="${d.id}">${go}<span class="sr">：${esc(this.pill(d))}</span></button></h3>
          ${d.articles.map((n) => { const m = this.meta[n]; return `<button type="button" class="idx-a" data-read="${n}"><span class="no">${esc(m.id)}</span><span class="tt"><span class="chtag ch-${esc(m.ch)}">${esc(CH[m.ch] || m.ch)}</span>${m.kicker ? `${esc(m.kicker)}｜` : ''}${esc(m.title)}${m.sub ? `<small>${esc(m.sub)}</small>` : ''}</span><span class="au">${esc(this.authors(n))} · ${esc(m.minutes)} 分${this.read.has(n) ? ' · <span class="rd-mark">已讀</span>' : ''}</span></button>`; }).join('')}</div>`).join('')}</div>
      </section>`;
    }).join('');
  }

  openIndex() {
    this.reading = null;
    document.title = `22 篇目錄｜${SITE}`;
    this.showSheet(`
      <div class="sheet-top"><button type="button" class="back" data-act="back">← 回到地圖</button><div class="where">22 篇 · 由品牌到消費者</div><div></div></div>
      <div class="idx">
        <h1 id="idx-h">22 篇，三個區域</h1>
        <p class="lead">從品牌出發，經過 AI，走到消費者。同一區的文章談同一件事的不同現場；點標題讀全文，或回到地圖看它的動畫。</p>
        ${this.ringGroups('ix', this.E ? '在地圖上看' : '打開這一區')}
      </div>`, '22 篇目錄', 'index');
    // back from an article: the index where it was left, focus on that article's entry
    const back = this._idx;
    this._idx = null;
    this.sheet.scrollTop = back ? back.scroll : 0;
    const entry = back && $(`.idx-a[data-read="${back.n}"]`, this.sheet);
    if (entry) entry.focus({ preventScroll: true }); else this.focusHeading('#idx-h', this.sheet);
  }

  async openReader(n, at = null) {
    // opened from the index: "back" returns to the index, not all the way to the map
    if (!this.sheetOpen) this._readerBack = null;
    else if (this.sheetKind === 'index') { this._readerBack = '#/index'; this._idx = { scroll: this.sheet.scrollTop, n }; }
    else if (this._idx) this._idx.n = n;
    this.reading = n;
    const m = this.meta[n], c = this.W.articles[n];
    const d = this.D[c.district], ring = this.R[d.ring];
    // touring: the article's own stop is where "back" leads
    const k = this.stopOf(n);
    if (k >= 0) this.lastWorldHash = `#/route/${encodeProfile(this.profile)}/${k}`;
    // next: along the reader's route if this article is on it, otherwise the next article in the same district
    let next = null;
    if (this.route) {
      const flat = this.route.flatMap((s) => s.articles);
      const j = flat.indexOf(n);
      if (j >= 0 && j < flat.length - 1) next = flat[j + 1];
    }
    if (!next) { const j = d.articles.indexOf(n); next = d.articles[j + 1] || null; }
    const related = c.links.slice(0, 4).map((L) => ({ n: L.to, title: `第 ${L.to} 篇〈${this.meta[L.to].title}〉`, why: L.why }));
    document.title = `${m.title}｜${SITE}`;
    this.showSheet('<div class="idx"><p class="lead">載入全文…</p></div>', m.title, 'reader');
    try {
      const a = await loadArticle(n);
      if (this.reading !== n) return;
      this.sheet.innerHTML = renderReader(a, {
        meta: m, concept: c, district: { ...d, name: this.pill(d) }, ring: { ...ring, name: this.zoneName(this.zoneOf(d)) }, related,
        route: { next: next ? { n: next, title: this.meta[next].title } : null },
        stop: k >= 0 ? { i: k, name: this.pill(d) } : null,
        back: this._readerBack ? '回到目錄' : '回到畫面',
        see: this.E ? '在地圖上看它的動畫' : '打開這一區',
      });
      this.sheet.scrollTop = 0;
      this.focusHeading('#rd-h', this.sheet);
      // opened from a beat: its passage, lit for a moment
      const spot = at && $(`[data-b="${CSS.escape(at)}"]`, this.sheet);
      if (spot) { spot.classList.add('jump'); requestAnimationFrame(() => this.jumpTo(spot, 'center')); setTimeout(() => spot.classList.remove('jump'), 2600); }
      const heads = $$('.body h2', this.sheet);
      $$('[data-h]', this.sheet).forEach((a2) => a2.addEventListener('click', (e) => { e.preventDefault(); this.jumpTo(heads[+a2.dataset.h]); }));
      $$('[data-note]', this.sheet).forEach((a2) => a2.addEventListener('click', (e) => { e.preventDefault(); this.jumpTo($(`#note-${CSS.escape(a2.dataset.note)}`, this.sheet), 'center'); }));
      $$('[data-ref]', this.sheet).forEach((a2) => a2.addEventListener('click', (e) => { e.preventDefault(); this.jumpTo($(`#ref-${CSS.escape(a2.dataset.ref)}`, this.sheet), 'center'); }));
    } catch {
      if (this.reading !== n) return;
      this.sheet.innerHTML = `<div class="sheet-top"><button type="button" class="back" data-act="back">← 回到畫面</button></div><div class="idx"><p class="lead" id="rd-err">全文載入失敗，請檢查網路後重試。</p><button type="button" class="btn btn-ink" data-act="retry" data-n="${n}">重試</button></div>`;
      this.focusHeading('#rd-err', this.sheet);
    }
  }

  showSheet(html, label, kind) {
    if (!this.sheetOpen) {
      // remember where the reader came from (to come back to it), and take the world out of the tab order
      this._ret = { hash: this.lastWorldHash, el: document.activeElement, tour: this.mode === 'tour' };
      for (const s of ['.top', '#ov', '#ui', '#strip']) { const el = $(s); if (el) el.inert = true; }
      this.sfx('page');
    }
    this.sheetKind = kind;
    this.sheet.innerHTML = html;
    this.sheet.setAttribute('aria-label', label || '閱讀');
    this.sheet.classList.add('open');
    this.sheet.tabIndex = -1;
    if (this.E) this.E.paused = true;
    if (!this._sheetScroll) {
      this._sheetScroll = () => {
        const f = this.sheet.scrollTop / Math.max(1, this.sheet.scrollHeight - this.sheet.clientHeight);
        const p = $('#read-progress', this.sheet);
        if (p) p.style.width = `${f * 100}%`;
        // most of the way through counts as read
        if (this.sheetKind === 'reader' && this.reading && f > 0.6 && !this.read.has(this.reading)) {
          this.read.add(this.reading);
          store('nd.read', [...this.read]);
        }
      };
      this.sheet.addEventListener('scroll', this._sheetScroll, { passive: true });
    }
  }

  closeSheet(silent) {
    if (!this.sheetOpen) return;
    if (!silent && this.sheetKind === 'reader' && this._readerBack) { location.hash = this._readerBack; this._readerBack = null; return; }
    this.sheet.classList.remove('open');
    this.sheetKind = null;
    this._readerBack = null;
    this._idx = null;
    this.reading = null;
    if (this.E) { this.E.paused = false; this._lastClock = this.E.clock; }
    for (const s of ['.top', '#ov', '#ui']) { const el = $(s); if (el) el.inert = false; }
    $('#strip').inert = this.strip.mode === 'hidden';
    this.sfx('page');
    if (!silent) {
      const back = this.lastWorldHash && this.lastWorldHash !== location.hash ? this.lastWorldHash : '#/map';
      location.hash = back;
    }
  }

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('on'), 3600);
  }
}
