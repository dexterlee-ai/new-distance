// Interface: intro → three questions → a personal route flown stop by stop → free exploration,
// plus the 22-article index and the full-text reader.  Everything shown in 3D also exists here as text.
import * as Route from './route.js';
import { planRoute, reasons, encodeProfile, decodeProfile } from './route.js';
import { esc, CH, loadArticle, renderReader } from './reader.js';

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
  { key: 'focus', list: 'focus', title: '此刻，你最在意的是？', hint: '選一個就好，路線會從岸邊出發，一路走向人。' },
];
const SITE = '新距離';
const TITLE0 = document.title;
const MOBILE = () => innerWidth <= 860;

// fit the whole disk (radius ≈ 105 with margin) in the visible frame, whatever the screen shape
function fitDist(el, share = 1) {
  const tv = Math.tan((32 * Math.PI) / 360);
  const aspect = (innerWidth * share) / innerHeight;
  return Math.max((108 * (0.35 + 0.65 * Math.sin(el))) / tv, 108 / (tv * aspect)) * 1.06;
}
// desktop: the text column (intro, questions, route summary) is on the left; centre the disk in the space to its right.
// A view offset of -off puts the frame centre at (w + off) / 2, the middle of [off, w].
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
// the map: three-quarter view, the whole disk clear of the top bar and the distance meter;
// on a tall phone screen a steeper view gives the nine labels room to spread
const MAP = () => (MOBILE() && innerHeight > innerWidth
  ? { target: [0, 0, 0], az: 0.62, el: 1.08, dist: fitDist(1.08) }
  : { target: [10, 2, 7], az: 0.62, el: 0.7, dist: fitDist(0.7) * (innerHeight < 760 ? 1.2 : innerHeight < 820 ? 1.14 : 1.075) });

function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch { return null; } return v; }

export class UI {
  constructor({ W, index, engine, world, reduced, sound, still }) {
    this.W = W; this.index = index; this.E = engine; this.world = world; this.reduced = reduced;
    this.sound = sound; this.still = still;
    this.meta = Object.fromEntries(index.articles.map((a) => [a.n, a]));
    this.D = Object.fromEntries(W.districts.map((d) => [d.id, d]));
    this.R = Object.fromEntries(W.rings.map((r) => [r.id, r]));
    this.profile = this.cleanProfile(store('nd.profile') || {});
    const read = store('nd.read');
    this.read = new Set((Array.isArray(read) ? read : []).filter((n) => Object.hasOwn(this.meta, n)));
    this.route = null;
    this.stop = -1;
    this.step = 0;
    this.focusId = null;
    this.coreLayer = -1;
    this.mode = '';
    this.ui = $('#ui');
    this.panel = $('#panel');
    this.sheet = $('#sheet');
    this.sheetKind = null;
    this.lastWorldHash = '#/map';
    this.booted = false;
    this._sfxT = {};
    this.buildLabels();
    this.buildMeter();
    this.buildLegend();
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

  // ------------------------------------------------------------------ routing
  bind() {
    addEventListener('hashchange', () => this.onHash());
    $$('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      const n = b.dataset.nav;
      if (n === 'map') location.hash = '#/map';
      if (n === 'index') location.hash = '#/index';
      if (n === 'route') location.hash = this.profile.role || this.profile.focus ? `#/route/${encodeProfile(this.profile)}` : '#/start';
    }));
    $('#panel-close').addEventListener('click', () => { location.hash = this.mode === 'tour' ? `#/route/${encodeProfile(this.profile)}` : '#/map'; });
    $('#panel-grab')?.addEventListener('click', (e) => this.expandPanel(!this.panel.classList.contains('expanded'), e.currentTarget));
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.sheetOpen) this.closeSheet();
        else if (this.mode === 'district') location.hash = '#/map';
        else if (this.mode === 'tour') location.hash = `#/route/${encodeProfile(this.profile)}`;
      }
      if (this.mode === 'tour' && !this.sheetOpen && !e.target.closest?.('input,textarea,select')) {
        if (e.key === 'ArrowRight') this.goStop(this.stop + 1);
        if (e.key === 'ArrowLeft') this.goStop(this.stop - 1);
      }
    });
    // delegated actions inside panel / sheet / dialogs
    document.addEventListener('click', (e) => {
      const r = e.target.closest('[data-read]');
      if (r) { e.preventDefault(); location.hash = `#/read/${r.dataset.read}`; return; }
      const g = e.target.closest('[data-go]');
      if (g) { e.preventDefault(); location.hash = `#/d/${g.dataset.go}`; return; }
      const a = e.target.closest('[data-act]');
      if (a) this.act(a.dataset.act, a, e);
    });
    if (this.E) {
      // click a landmark on the map → open its district.  Only on the map: in a close-up the other districts'
      // anchors sit behind the subject and their labels are hidden, so a click there must not jump away.
      const cv = this.E.renderer.domElement;
      cv.addEventListener('click', (e) => {
        if (this.E.wasDrag) { this.E.wasDrag = false; return; }
        if (this.mode !== 'explore') return;
        const id = this.pick(e.clientX, e.clientY);
        if (id) location.hash = `#/d/${id}`;
      });
    }
    // re-fit the camera and the panel offsets when the window changes shape (or a phone turns)
    const rz = () => { clearTimeout(this._rz); this._rz = setTimeout(() => this.reframe(), 150); };
    if (this.E?.onResize) this.E.onResize(rz); else addEventListener('resize', rz);
  }

  redirect(h) { history.replaceState(null, '', h); this.onHash(); }

  onHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [p0, p1, p2] = h.split('/');
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
    if (p0 === 'd' && Object.hasOwn(this.D, p1 || '')) return this.district(p1);
    if (p0 === 'index') return this.openIndex();
    if (p0 === 'read' && /^\d+$/.test(p1 || '') && Object.hasOwn(this.meta, +p1)) return this.openReader(+p1);
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
    $('#legend').style.opacity = m === 'intro' || m === 'explore' ? '1' : '0';
    $('#meter').style.opacity = m === 'explore' || m === 'district' || m === 'tour' ? '1' : '0';
    if (this.E) this.E.idleDrift = m === 'intro' ? 0.035 : m === 'explore' ? 0.012 : 0;
    this.labelMode();
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
    this.E.setPanelOffset(fr.off[0], fr.off[1]);
    return this.fly(fr.view, opts);
  }

  panelW() { return this.panel.offsetWidth || Math.min(452, innerWidth * 0.92); }

  /** camera framing for each screen: the view offset that keeps the subject clear of text, and the view */
  screenFrame(kind, id) {
    const mobile = MOBILE();
    if (kind === 'map') return { off: [0, 0], view: MAP() };
    if (kind === 'district') {
      const v = this.world?.D[id]?.view;
      // phones: the bottom sheet's offset narrows the horizontal field — step back so the machine still fits across
      // (with the sheet's 0.58 h offset this matches the desktop framing's horizontal coverage)
      const k = mobile ? Math.max(1.7, 1.7 * (innerHeight / innerWidth)) : 1;
      return { off: mobile ? [0, innerHeight * 0.58] : [this.panelW(), 0], view: v && (mobile ? { ...v, dist: v.dist * k } : v) };
    }
    if (kind === 'peek') {
      const v = this.world?.D[id]?.view;
      const base = this.screenFrame('profile');
      return { off: base.off, view: v && { target: v.target, az: v.az, el: Math.max(0.42, v.el + 0.2), dist: 120 } };
    }
    if (mobile) return topView(0.9, kind === 'intro' ? 0.5 : 0.7);
    return kind === 'summary' ? sideView(0.76, 0.96) : sideView(0.9, 1);
  }

  reframe() {
    for (const L of this.labels) L.h = L.w = 0;
    for (const n of this.noteNodes) n._k = '';
    this.labelMode();
    $('.route-list', this.ui)?.dispatchEvent(new Event('scroll'));
    if (!this.E) return;
    const m = this.mode;
    let fr = null;
    if (m === 'intro' || m === 'summary') fr = this.screenFrame(m);
    else if (m === 'profile') { const cur = this.profile[STEPS[this.step].key]; fr = cur ? this.screenFrame('peek', HOME[STEPS[this.step].list][cur]) : this.screenFrame('profile'); }
    else if (m === 'explore') fr = this.screenFrame('map');
    else if ((m === 'district' || m === 'tour') && this.focusId) fr = this.screenFrame('district', this.focusId);
    if (!fr) return;
    this.E.setPanelOffset(fr.off[0], fr.off[1]);
    // behind an open sheet only the offset changes; the flight happens when the world is visible again
    if (fr.view && !this.sheetOpen) this.E.flyTo(fr.view, { duration: 0.6 });
    else if (fr.view) this._refly = true;
  }

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
        $('.tl', mot).textContent = on ? '暫停動態' : '播放動態';
      };
      const saved = store('nd.motion');
      // screenshots (?still) rest on the world's key moment; otherwise the reader's choice, then the system setting
      apply(this.still ? false : saved === 0 || saved === 1 ? saved === 1 : !mq.matches);
      mq.addEventListener?.('change', () => { if (!this.still && store('nd.motion') == null) apply(!mq.matches); });
      mot.addEventListener('click', () => {
        const on = !this.motionOn;
        apply(on);
        store('nd.motion', on ? 1 : 0);
        this.toast(on ? '世界又動起來了' : '世界已暫停；拖曳與鏡頭移動仍可使用');
      });
    }
  }

  // ------------------------------------------------------------------ screens
  intro() {
    this.setMode('intro');
    this.closePanel();
    this.focusId = null;
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
          <p class="thesis"><span class="m-cut">這是一座依 22 篇文章畫成的世界。</span><em>品牌在岸上，人在中心</em>；中間隔著一片 AI 代理之海。越往中心，離人越近。</p>
          <div class="ctas">
            <a class="btn btn-ink" href="#/start">為我規劃一條路線 <span class="arr">→</span></a>
            <a class="btn btn-line" href="#/map">${this.E ? '自由探索世界' : '看文字版地圖'}</a>
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
    this.closePanel();
    this.focusId = null;
    this.E?.clearFocus();
    this.lastWorldHash = `#/start/${i}`;
    document.title = `第 ${i + 1}／3 題｜${SITE}`;
    const S = STEPS[i];
    const list = this.W.profile[S.list];
    const cur = this.profile[S.key];
    this.ui.innerHTML = `
      <section class="dlg" aria-labelledby="dlg-h">
        <div class="step"><span>0${i + 1} / 03</span><span class="bar"><i id="stepbar"></i></span><a class="btn-text" href="#/map">略過，${this.E ? '自由探索' : '看地圖'}</a></div>
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
    this.closePanel();
    this.focusId = null;
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
    const first = this.R[this.D[this.route[0].id].ring];
    const from = first.id === 'shore' ? '從岸邊出發' : `從${esc(first.name)}出發`;
    const items = this.route.map((s, i) => {
      const d = this.D[s.id], ring = this.R[d.ring];
      const list = s.articles.map((n) => {
        const m = this.meta[n], r = this.read.has(n);
        return `<li class="t">No.${esc(m.id)}〈${esc(m.title)}〉${r ? '<span class="rd-mark">已讀</span>' : ''}</li>`;
      }).join('');
      return `<li><div class="d">${ring.dist}<small>距離</small></div><div><div class="r">${esc(ring.name)} · 第 ${i + 1} 站</div><div class="n">${esc(d.name)}<span class="ts">${esc(d.title)}</span></div><ul class="arts">${list}</ul></div></li>`;
    }).join('');
    this.ui.innerHTML = `
      <section class="dlg dlg-route" aria-labelledby="dlg-h">
        <div class="step"><span>你的路線</span><span class="bar"><i id="stepbar"></i></span><a class="btn-text" href="#/start">重新選擇</a></div>
        <h2 id="dlg-h">${from}，<br>${this.route.length} 站走到人的身邊</h2>
        <p class="hint">${esc(lab('roles', P.role))} · ${esc(lab('industries', P.industry))} · ${esc(lab('focus', P.focus))}</p>
        <p class="facts">${this.route.length} 站・${arts.length} 篇・全文約 ${minutes} 分鐘${done ? `・已讀 ${done} / ${arts.length} 篇` : ''}<span class="m-cut">｜每站可以先看裝置與摘要，再決定要不要深讀</span></p>
        <p class="scale">每站左側的數字是「與人的距離」：84 是品牌自己的岸邊，0 是人本身。</p>
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
    this.setMode('tour');
    this.worldText();
    const d = this.D[this.route[i].id];
    document.title = `第 ${i + 1} 站 ${d.name}｜${SITE}`;
    this.openDistrict(d.id, { tour: true });
  }

  goStop(i) {
    if (!this.route || i < 0 || i >= this.route.length) return;
    location.hash = `#/route/${encodeProfile(this.profile)}/${i}`;
  }

  explore() {
    // coming back from a district: keyboard focus returns to that district's label
    const prevId = this.mode === 'district' || this.mode === 'tour' ? this.focusId : null;
    const ret = this._ret;
    this._ret = null;
    this.setMode('explore');
    this.closePanel();
    this.focusId = null;
    this.lastWorldHash = '#/map';
    document.title = `地圖｜${SITE}`;
    if (!this.E) return this.textMap(prevId);
    this.ui.innerHTML = '';
    this.E.clearFocus();
    this.frameTo(this.screenFrame('map'), { duration: 2.4 });
    if (!store('nd.mapHint')) { this.toast('拖曳可以旋轉世界，點地標或標籤進入一區'); store('nd.mapHint', 1); }
    const L = prevId && this.labels.find((x) => x.d.id === prevId);
    if (L) requestAnimationFrame(() => requestAnimationFrame(() => L.el.focus({ preventScroll: true })));
    else if (ret && this.booted) {
      // back from the index / an article opened on the map: focus returns to what opened it
      const el = ret.el?.isConnected && !this.sheet.contains(ret.el) ? ret.el : $('[data-nav="map"]');
      requestAnimationFrame(() => el?.focus({ preventScroll: true }));
    }
  }

  // beside an open district panel: nothing with the 3D world, the text map without it
  worldText() {
    if (this.E) this.ui.innerHTML = '';
    else if (!$('.textmap', this.ui)) this.textMap(null, true);
  }

  // without WebGL the map is text: the same rings → districts → articles as the index
  textMap(prevId, quiet) {
    this.ui.innerHTML = `
      <section class="textmap" aria-labelledby="tm-h"><div class="idx">
        <h1 id="tm-h">世界地圖</h1>
        <p class="lead">這台裝置無法顯示 3D 世界，這裡是同一張地圖的文字版：由外而內，從品牌自己的岸邊，經過 AI 代理之層與人心之地，走到人之核。點區名看這一區的概念與它如何運作，點篇名深讀全文。</p>
        ${this.ringGroups('tm', '打開這一區')}
      </div></section>`;
    const back = prevId && $(`[data-go="${prevId}"]`, this.ui);
    if (back) back.focus();
    else if (this.booted && !quiet) this.focusHeading('#tm-h');
  }

  district(id) {
    this.setMode('district');
    this.worldText();
    document.title = `${this.D[id].name}｜${SITE}`;
    this.openDistrict(id, { tour: false });
  }

  openDistrict(id, { tour }) {
    const d = this.D[id];
    // back from the reader to the same place: keep the panel as it was (scroll, focus), no re-render, no flight
    const ret = this._ret;
    this._ret = null;
    const keep = !!ret && ret.hash === location.hash && ret.tour === tour && this.focusId === id && this.panel.classList.contains('open');
    if (id !== 'core') this.setLayer(-1);
    this.focusId = id;
    this.lastWorldHash = location.hash;
    this.panel.classList.add('open');
    this.panel.inert = false;
    const fr = this.screenFrame('district', id);
    if (keep) {
      this.E?.setPanelOffset(fr.off[0], fr.off[1]);
      if (this._refly && fr.view) this.E?.flyTo(fr.view, { duration: 0.6 });
      this._refly = false;
      this.refreshReadMarks();
      $('#panel-body').scrollTop = ret.scroll;
      if (ret.el?.isConnected && this.panel.contains(ret.el)) ret.el.focus({ preventScroll: true });
      else $('#panel-title')?.focus({ preventScroll: true });
      return;
    }
    this.renderPanel(d, tour);
    this.expandPanel(false);
    if (this.E && this.world?.D[id]) {
      this.E.setFocus(this.world.D[id].anchor, id === 'under' ? 48 : 34);
      this.frameTo(fr);
    }
    this.sfx('pencil');
    $('#panel-body').scrollTop = 0;
    setTimeout(() => $('#panel-title')?.focus({ preventScroll: true }), 60);
  }

  // a kept panel (back from the reader) shows the 已讀 mark of what was just read
  refreshReadMarks() {
    for (const art of $$('.art', this.panel)) {
      const n = +($('[data-read]', art)?.dataset.read || 0);
      const no = $('.no', art);
      if (n && no && this.read.has(n) && !$('.rd-mark', no)) no.insertAdjacentHTML('beforeend', ' · <span class="rd-mark">已讀</span>');
    }
  }

  closePanel() {
    if (this.panel.contains(document.activeElement)) document.activeElement.blur();
    this.panel.classList.remove('open');
    this.expandPanel(false);
    this.panel.inert = true;
    this.setLayer(-1);
  }

  // phones: the bottom sheet can grow to nearly the full height
  expandPanel(on, btn = $('#panel-grab')) {
    this.panel.classList.toggle('expanded', on);
    if (!btn) return;
    btn.setAttribute('aria-expanded', String(on));
    $('.sr', btn).textContent = on ? '收合面板' : '展開面板';
  }

  // People Model layers: one source of truth for the world and the buttons
  setLayer(l) {
    this.coreLayer = l;
    this.world?.D.core.highlight(l);
    $$('[data-act="layer"]', this.panel).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.l === l)));
  }

  // ------------------------------------------------------------------ panel
  title(n) { return this.meta[n].title; }
  authors(n) { return this.meta[n].authors.map((a) => a.zh || a.en).join('、'); }

  renderPanel(d, tour) {
    const ring = this.R[d.ring];
    const stopInfo = tour ? this.route[this.stop] : null;
    const onRoute = stopInfo ? stopInfo.articles : [];
    const others = d.articles.filter((n) => !onRoute.includes(n));
    const q = d.quote;
    const card = (n, why) => {
      const m = this.meta[n], c = this.W.articles[n];
      const rs = why ? reasons(this.W, n, this.profile) : [];
      const whyHtml = rs.length
        ? `<p class="why"><span class="why-h">推薦原因</span>${rs.map((r) => `<span>${esc(r)}</span>`).join('')}</p>`
        : why && d.id === 'core' ? '<p class="why"><span class="why-h">每條路線都在人之核結束：不論從哪裡出發，答案都從懂人開始。</span></p>' : '';
      return `<div class="art ch-${esc(m.ch)}">
        <div class="no">No.${esc(m.id)} · ${esc(CH[m.ch] || m.ch)} · 約 ${esc(m.minutes)} 分鐘${this.read.has(n) ? ' · <span class="rd-mark">已讀</span>' : ''}</div>
        ${m.kicker ? `<div class="sub2">${esc(m.kicker)}</div>` : ''}
        <h4>${esc(m.title)}</h4>
        ${m.sub ? `<div class="sub2">${esc(m.sub)}</div>` : ''}
        <div class="by">${esc(this.authors(n))}</div>
        <p class="core"><b>${esc(c.coreName)}</b>${esc(c.core)}</p>
        ${whyHtml}
        <div class="go"><button type="button" class="act primary" data-read="${n}">深讀全文</button></div>
      </div>`;
    };
    // links from this district's articles to other districts: name both ends, since "本篇" in the note is the source
    const seen = new Set();
    const links = [];
    for (const n of d.articles) for (const L of this.W.articles[n].links) {
      const td = this.W.articles[L.to]?.district;
      if (!td || td === d.id || seen.has(L.to)) continue;
      seen.add(L.to);
      links.push({ from: n, to: L.to, td, why: L.why });
    }
    const pressed = (l) => String(this.coreLayer === l);
    const acts = d.id === 'core' && this.E ? `
      <div class="acts" role="group" aria-label="操作 People Model">
        <button type="button" class="act primary" data-act="simulate">向分身提問一次</button>
        <button type="button" class="act" data-act="layer" data-l="0" aria-pressed="${pressed(0)}">資料直接支持</button>
        <button type="button" class="act" data-act="layer" data-l="1" aria-pressed="${pressed(1)}">模型估計</button>
        <button type="button" class="act" data-act="layer" data-l="2" aria-pressed="${pressed(2)}">情境模擬</button>
      </div>` : '';
    // phones: the stop's articles first, before the long explanation
    const quick = tour && onRoute.length ? `<div class="quick"><div class="sec-h">這一站的文章</div><ul class="links">${onRoute.map((n) => `<li><button type="button" data-read="${n}">No.${esc(this.meta[n].id)}〈${esc(this.meta[n].title)}〉</button>・約 ${esc(this.meta[n].minutes)} 分鐘</li>`).join('')}</ul></div>` : '';
    $('#panel-body').innerHTML = `
      <div class="meta"><span class="ring">${esc(ring.name)}</span><span>與人的距離 ${ring.dist}</span>${tour ? `<span>第 ${this.stop + 1} / ${this.route.length} 站</span>` : ''}</div>
      <h2 id="panel-title" tabindex="-1">${esc(d.name)}</h2>
      <div class="en">${esc(ring.en)} · ${esc(ring.verbs)}</div>
      <h3 class="concept">${esc(d.title)}</h3>
      <p class="line">${esc(d.line)}</p>
      ${quick}
      ${acts}
      <div class="sec-h">它如何運作</div>
      <ol class="steps">${d.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="qbox"><blockquote>${esc(q.t)}</blockquote><cite>第 ${q.n} 篇〈${esc(this.meta[q.n].title)}〉· p.${esc(q.page)}</cite></div>
      <div class="sec-h">${tour ? '為你挑的文章' : '這一區的文章'}</div>
      ${(tour ? onRoute : d.articles).map((n) => card(n, tour)).join('')}
      ${tour && others.length ? `<div class="sec-h">同一區還有</div>${others.map((n) => card(n, false)).join('')}` : ''}
      ${links.length ? `<div class="sec-h">相連的概念</div><ul class="links">${links.slice(0, 5).map((L) => `<li><span class="from">第 ${L.from} 篇〈${esc(this.meta[L.from].title)}〉</span> → <button type="button" data-go="${L.td}">${esc(this.D[L.td].name)}</button>：第 ${L.to} 篇〈${esc(this.meta[L.to].title)}〉——${esc(L.why.replace(/本篇/g, `第 ${L.from} 篇`))}</li>`).join('')}</ul>` : ''}
    `;
    $('#panel-close').setAttribute('aria-label', tour ? '關閉，回到路線' : this.E ? '關閉，回到地圖' : '關閉，回到文字版地圖');
    const foot = $('#panel-foot');
    if (tour) {
      const last = this.stop === this.route.length - 1;
      foot.innerHTML = `
        ${this.stop > 0 ? `<button type="button" class="btn btn-line" data-act="prev">← 上一站</button>` : `<a class="btn btn-line" href="#/route/${encodeProfile(this.profile)}">路線</a>`}
        ${last ? `<a class="btn btn-ink" href="#/map">${this.E ? '看完整張地圖' : '看文字版地圖'} <span class="arr">→</span></a>` : `<button type="button" class="btn btn-ink" data-act="next">下一站：${esc(this.D[this.route[this.stop + 1].id].name)} <span class="arr">→</span></button>`}`;
    } else {
      foot.innerHTML = `<a class="btn btn-line" href="#/map">← 地圖</a><a class="btn btn-ink" href="#/index">22 篇目錄</a>`;
    }
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
    if (name === 'next') this.goStop(this.stop + 1);
    if (name === 'prev') this.goStop(this.stop - 1);
    if (name === 'simulate' && this.E && this.world) {
      this.world.D.core.simulate();
      this.sfx('chime');
      this.toast('分身們正在回答——低勝率的方向會先被篩掉');
    }
    if (name === 'layer') this.setLayer(el.getAttribute('aria-pressed') !== 'true' ? +el.dataset.l : -1);
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
    return ['shore', 'sea', 'heart', 'core'].map((rid) => {
      const ring = this.R[rid];
      const ds = this.W.districts.filter((d) => d.ring === rid);
      return `<section class="idx-ring" aria-labelledby="${pre}-ring-${rid}">
        <div class="rh"><div class="d" aria-hidden="true">${ring.dist}</div><h2 id="${pre}-ring-${rid}">${esc(ring.name)}<span class="sr">，與人的距離 ${ring.dist}</span></h2><p>${esc(ring.verbs)}<br>${esc(ring.desc)}</p></div>
        <div>${ds.map((d) => `<div class="idx-d"><h3>${esc(d.name)} <small>${esc(d.title)}</small> <button type="button" data-go="${d.id}">${go}<span class="sr">：${esc(d.name)}</span></button></h3>
          ${d.articles.map((n) => { const m = this.meta[n]; return `<button type="button" class="idx-a" data-read="${n}"><span class="no">${esc(m.id)}</span><span class="tt"><span class="chtag ch-${esc(m.ch)}">${esc(CH[m.ch] || m.ch)}</span>${m.kicker ? `${esc(m.kicker)}｜` : ''}${esc(m.title)}${m.sub ? `<small>${esc(m.sub)}</small>` : ''}</span><span class="au">${esc(this.authors(n))} · ${esc(m.minutes)} 分${this.read.has(n) ? ' · <span class="rd-mark">已讀</span>' : ''}</span></button>`; }).join('')}</div>`).join('')}</div>
      </section>`;
    }).join('');
  }

  openIndex() {
    this.reading = null;
    document.title = `22 篇目錄｜${SITE}`;
    this.showSheet(`
      <div class="sheet-top"><button type="button" class="back" data-act="back">← 回到世界</button><div class="where">22 篇 · 依與人的距離排列</div><div></div></div>
      <div class="idx">
        <h1 id="idx-h">22 篇，四個距離</h1>
        <p class="lead">從品牌自己的岸邊，到 AI 代理之海，到人心，再到人本身。同一區的文章談的是同一個概念的不同現場；點標題深讀全文，或回到世界看它怎麼運作。</p>
        ${this.ringGroups('ix', this.E ? '在世界中看' : '打開這一區')}
      </div>`, '22 篇目錄', 'index');
    // back from an article: the index where it was left, focus on that article's entry
    const back = this._idx;
    this._idx = null;
    this.sheet.scrollTop = back ? back.scroll : 0;
    const entry = back && $(`.idx-a[data-read="${back.n}"]`, this.sheet);
    if (entry) entry.focus({ preventScroll: true }); else this.focusHeading('#idx-h', this.sheet);
  }

  async openReader(n) {
    // opened from the index: "back" returns to the index, not all the way to the world
    if (!this.sheetOpen) this._readerBack = null;
    else if (this.sheetKind === 'index') { this._readerBack = '#/index'; this._idx = { scroll: this.sheet.scrollTop, n }; }
    else if (this._idx) this._idx.n = n;
    this.reading = n;
    const m = this.meta[n], c = this.W.articles[n];
    const d = this.D[c.district], ring = this.R[d.ring];
    // touring: the article's own stop is where "back to the world" leads
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
        meta: m, concept: c, district: d, ring, related,
        route: { next: next ? { n: next, title: this.meta[next].title } : null },
        stop: k >= 0 ? { i: k, name: d.name } : null,
        back: this._readerBack ? '回到目錄' : '回到世界',
        see: this.E ? '在世界中看它運作' : '打開這一區',
      });
      this.sheet.scrollTop = 0;
      this.focusHeading('#rd-h', this.sheet);
      const heads = $$('.body h2', this.sheet);
      $$('[data-h]', this.sheet).forEach((a2) => a2.addEventListener('click', (e) => { e.preventDefault(); this.jumpTo(heads[+a2.dataset.h]); }));
      $$('[data-note]', this.sheet).forEach((a2) => a2.addEventListener('click', (e) => { e.preventDefault(); this.jumpTo($(`#note-${CSS.escape(a2.dataset.note)}`, this.sheet), 'center'); }));
      $$('[data-ref]', this.sheet).forEach((a2) => a2.addEventListener('click', (e) => { e.preventDefault(); this.jumpTo($(`#ref-${CSS.escape(a2.dataset.ref)}`, this.sheet), 'center'); }));
    } catch {
      if (this.reading !== n) return;
      this.sheet.innerHTML = `<div class="sheet-top"><button type="button" class="back" data-act="back">← 回到世界</button></div><div class="idx"><p class="lead" id="rd-err">全文載入失敗，請檢查網路後重試。</p><button type="button" class="btn btn-ink" data-act="retry" data-n="${n}">重試</button></div>`;
      this.focusHeading('#rd-err', this.sheet);
    }
  }

  showSheet(html, label, kind) {
    if (!this.sheetOpen) {
      // remember where the reader came from (to come back to it), and take the world out of the tab order
      this._ret = { hash: this.lastWorldHash, el: document.activeElement, scroll: $('#panel-body').scrollTop, tour: this.mode === 'tour' };
      for (const s of ['.top', '#labels', '#ui', '#panel']) { const el = $(s); if (el) el.inert = true; }
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
    if (this.E) this.E.paused = false;
    for (const s of ['.top', '#labels', '#ui']) { const el = $(s); if (el) el.inert = false; }
    this.panel.inert = !this.panel.classList.contains('open');
    this.sfx('page');
    if (!silent) {
      const back = this.lastWorldHash && this.lastWorldHash !== location.hash ? this.lastWorldHash : '#/map';
      location.hash = back;
    }
  }

  // ------------------------------------------------------------------ world overlays
  buildLabels() {
    const box = $('#labels');
    this.labels = this.W.districts.map((d) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `lbl ring-${d.ring}`;
      b.innerHTML = `<span class="tag"><span class="no">${d.articles.length}</span>${esc(d.name)}</span><span class="stem"></span><span class="sub">${esc(d.title)}・${d.articles.length} 篇</span>`;
      const L = { d, el: b, no: $('.no', b), p: { x: 0, y: 0, z: 0 }, h: 0, w: 0, stop: -1 };
      b.addEventListener('click', () => {
        if (L.stop >= 0) return this.goStop(L.stop);
        if (this.focusId === d.id && this.mode !== 'explore') return;   // already open beside it
        // touring: a label of another stop moves along the route instead of leaving it
        const k = this.mode === 'tour' && this.route ? this.route.findIndex((s) => s.id === d.id) : -1;
        if (k >= 0) return this.goStop(k);
        location.hash = `#/d/${d.id}`;
      });
      box.appendChild(b);
      return L;
    });
    this.notesEl = document.createElement('div');
    this.notesEl.setAttribute('aria-hidden', 'true');
    box.appendChild(this.notesEl);
    this.noteNodes = [];
    this._np = { x: 0, y: 0, z: 0 };
  }

  // the route summary marks its stops on the world with their stop numbers (desktop: the disk is beside the list)
  labelMode() {
    const room = innerWidth - (colRight() + 24) >= 420;
    const stops = this.mode === 'summary' && this.route && !MOBILE() && room ? this.route.map((s) => s.id) : [];
    for (const L of this.labels) {
      const i = stops.indexOf(L.d.id);
      if (i === L.stop && L.el.hasAttribute('aria-label')) continue;
      L.stop = i;
      L.el.classList.toggle('stop', i >= 0);
      L.no.textContent = i >= 0 ? String(i + 1) : String(L.d.articles.length);
      L.el.setAttribute('aria-label', i >= 0 ? `第 ${i + 1} 站：${L.d.name}（${L.d.title}）` : `${L.d.name}：${L.d.title}（${L.d.articles.length} 篇）`);
      L.h = L.w = 0;
    }
  }

  buildMeter() {
    const m = $('#meter');
    const segs = [['shore', 100, 72], ['sea', 72, 44], ['heart', 44, 14], ['core', 14, 0]];
    const x = (r) => `${((100 - r) / 100) * 100}%`;
    m.innerHTML = `<div class="lab"><span>與人的距離</span><b id="m-val">—</b><span class="ringname" id="m-ring"></span></div>
      <div class="ruler" id="ruler"><div class="base"></div>
      ${segs.map(([id, a]) => `<div class="seg" data-x="${x(a)}"><span>${esc(this.R[id].name)}</span></div>`).join('')}
      <div class="mark" id="m-mark"></div></div>`;
    $$('.seg', m).forEach((s) => { s.style.left = s.dataset.x; });
    this.meterEl = m;
    this.meterVal = $('#m-val'); this.meterRing = $('#m-ring'); this.meterMark = $('#m-mark');
  }

  buildLegend() {
    const L = $('#legend');
    L.innerHTML = `<div class="rings">${['core', 'heart', 'sea', 'shore'].map((r) => `<span>${esc(this.R[r].name)}<i>${this.R[r].dist}</i></span>`).join('')}</div>
      <div class="chips"><span class="c-people">People</span><span class="c-model">Model</span><span class="c-ai">AI</span></div>`;
  }

  frame() {
    if (!this.E || this.E.paused) return;
    const E = this.E;
    // under the disk the paper turns dark: the HTML overlays follow
    const night = E.npr.u.uNight.value > 0.5;
    if (night !== this._night) { this._night = night; document.body.classList.toggle('night', night); }
    const world = this.mode === 'explore' || this.mode === 'district' || this.mode === 'tour';
    const topY = MOBILE() ? 52 : 66;   // keep labels below the top bar
    const placed = [];
    for (const L of this.labels) {
      const wd = this.world.D[L.d.id];
      const p = E.project(wd.anchor, L.p);
      const hide = !(world || L.stop >= 0) || !p || p.x < -40 || p.x > E.w + 40 || p.y < 0 || p.y > E.h + 40;
      const focused = this.focusId === L.d.id;
      const hh = hide ? 0 : L.h || (L.h = L.el.offsetHeight);
      const hw = hide ? 0 : L.w || (L.w = L.el.offsetWidth / 2);
      // near the top edge a label is held down instead of being cut off; the focused district's label is
      // dropped there instead, since the panel already names it and a held-down tag would sit on its notes
      const held = !hide && p.y < hh + topY;
      const dim = hide || (this.focusId && this.mode !== 'explore' && (!focused || held));
      L.el.classList.toggle('dim', !!dim);
      L.el.classList.toggle('on', focused);
      L.el.tabIndex = dim ? -1 : 0;
      if (!hide) {
        const x = Math.min(Math.max(p.x, hw + 4), E.w - hw - 4);
        const y = Math.max(p.y, hh + topY);
        if (dim) L.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
        else placed.push({ L, x, y, hw, hh });
      }
    }
    this.declutter(placed);
    // micro annotations for the focused district (kept left of the panel on desktop)
    const right = E.w - (this.panel.classList.contains('open') && !MOBILE() ? this.panelW() : 0);
    const wd = this.focusId && this.world.D[this.focusId];
    const notes = wd && wd.notes && this.mode !== 'explore' ? wd.notes() : [];
    while (this.noteNodes.length < notes.length) { const n = document.createElement('div'); n.className = 'note'; this.notesEl.appendChild(n); this.noteNodes.push(n); }
    this.noteNodes.forEach((n, i) => {
      const N = notes[i];
      if (!N) { n.classList.add('hide'); return; }
      const p = E.project(N.p, this._np);
      const k = `${N.mono ? 'm' : ''}${N.t}`;
      if (n._k !== k) { n.textContent = N.t; n.classList.toggle('mono', !!N.mono); n._k = k; n._w = n.offsetWidth; }
      // hidden when it would be cut by a screen edge or sit under the top bar
      const off = !p || p.y < topY + 8 || p.y > E.h || p.x - n._w / 2 < 4 || p.x + n._w / 2 > right - 4;
      n.classList.toggle('hide', off || E.flight !== null);
      if (p) n.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    });
    // distance meter: live while the camera travels; settled on a district it reads that district's ring, as the
    // panel does.  On the overview the camera is over the whole world, not at a distance from people.
    const overview = this.mode === 'explore' && !this.focusId;
    const under = E.camera.position.y < -14;
    const fd = this.focusId && !E.flight ? this.D[this.focusId] : null;
    const rc = fd ? this.R[fd.ring].dist : Math.min(100, Math.max(0, E.distanceToPeople));
    const ring = under ? this.D.under.ring : fd ? fd.ring : rc > 70 ? 'shore' : rc > 43 ? 'sea' : rc > 14 ? 'heart' : 'core';
    const val = overview ? '—' : under ? '水面下' : String(Math.round(rc));
    const rn = overview ? '總覽' : this.R[ring].name;
    if (this.meterVal.textContent !== val) this.meterVal.textContent = val;
    if (this.meterRing.textContent !== rn) this.meterRing.textContent = rn;
    this.meterEl.classList.toggle('ov', overview);
    this.meterMark.style.left = `${((100 - rc) / 100) * 100}%`;
  }

  // visible labels that would overlap are stacked upward (their stems get longer), nearest-to-camera first stays put
  declutter(list) {
    list.sort((a, b) => b.y - a.y);
    const out = [];
    for (const a of list) {
      const tag = Math.min(a.hh, 34);
      for (let pass = 0; pass < 4; pass++) {
        const hit = out.find((b) => Math.abs(a.x - b.x) < a.hw + b.hw + 6 && a.y > b.y - tag - 4 && a.y - tag < b.y + 4);
        if (!hit) break;
        a.y = hit.y - Math.min(hit.hh, 34) - 6;
      }
      out.push(a);
      a.L.el.style.transform = `translate(${a.x.toFixed(1)}px, ${Math.max(a.y, a.hh).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  pick(x, y) {
    // nearest visible district anchor on screen within a generous radius
    let best = null, bd = 90;
    for (const L of this.labels) {
      if (L.el.classList.contains('dim')) continue;
      const wd = this.world.D[L.d.id];
      const p = this.E.project(wd.group.position.lengthSq() > 0 ? wd.group.position : wd.anchor, { x: 0, y: 0, z: 0 });
      const q = this.E.project(wd.anchor, { x: 0, y: 0, z: 0 });
      for (const s of [p, q]) {
        if (!s) continue;
        const dd = Math.hypot(s.x - x, s.y - y);
        if (dd < bd) { bd = dd; best = L.d.id; }
      }
    }
    return best;
  }

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('on'), 3600);
  }
}
