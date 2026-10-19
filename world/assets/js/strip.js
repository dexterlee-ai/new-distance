// The text beside the picture.  Phone: a strip of three rows under the world (about 18% of the screen), with a
// half sheet (at most 55%) for the reading layer, opened only on request.  Desktop: a 400 px panel on the right
// whose top block mirrors the strip and whose body is the reading layer; × folds it to a 56 px rail.
// The strip never moves the camera: the UI only eases the projection offset when its size changes.
const $ = (s, r = document) => r.querySelector(s);

export class Strip {
  constructor(root, { esc, onAct }) {
    this.root = root;
    this.esc = esc;
    this.onAct = onAct;
    this.mode = 'hidden';
    this.reading = false;
    this.folded = false;
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (a && root.contains(a)) { e.preventDefault(); this.onAct(a.dataset.act, a, e); }
    });
  }

  get desktop() { return innerWidth >= 900 && innerHeight >= 500; }
  get landscape() { return !this.desktop && innerHeight < 500 && innerWidth > innerHeight; }

  /** px the strip takes: [right, bottom] (desktop panel width or phone strip height) */
  size() {
    if (this.mode === 'hidden') return { right: 0, bottom: 0, left: 0 };
    if (this.desktop) return { right: this.folded ? 56 : this.root.offsetWidth || 400, bottom: 0, left: 0 };
    if (this.landscape) return { right: Math.round(innerWidth * 0.38), bottom: 0, left: 0 };
    // the strip's resting height frames the picture; the half sheet covers it while open and moves nothing
    return { right: 0, bottom: $('.st-top', this.root)?.offsetHeight || 136, left: 0 };
  }

  /** px the strip covers right now (the half sheet included): what the overlay must keep clear of */
  cover() {
    if (this.mode === 'hidden' || this.desktop || this.landscape) return 0;
    return this.root.offsetHeight;
  }

  get layout() { return this.desktop ? 'panel' : this.landscape ? 'column' : 'strip'; }

  show(mode) {
    this.mode = mode;
    this.root.dataset.mode = mode;
    this.root.hidden = mode === 'hidden';
    this.root.inert = mode === 'hidden';
    if (mode === 'hidden') this.setReading(false);
  }

  setReading(on) {
    this.reading = !!on;
    this.root.classList.toggle('reading', this.reading);
    const b = $('[data-act="read"]', this.root);
    if (b) b.setAttribute('aria-expanded', String(this.reading));
  }

  setFolded(on) {
    this.folded = !!on;
    this.root.classList.toggle('folded', this.folded);
    const f = $('[data-act="fold"]', this.root);
    if (f) { f.setAttribute('aria-label', this.folded ? '展開說明' : '收起說明'); f.textContent = this.folded ? '‹' : '×'; }
  }

  // ---------------------------------------------------------------- states
  /** the map: the one sentence, the zones (desktop lists them with their districts), the route */
  map({ sentence, zones, hint }) {
    const e = this.esc;
    this.show('map');
    this.root.innerHTML = `
      <div class="st-top">
        <div class="st-r1"><span class="crumb is-static">地圖</span><a class="st-go" href="#/start">跟著路線走 ›</a></div>
        <p class="st-cap" id="st-cap" aria-live="polite">${e(sentence)}</p>
        <div class="st-r3"><span class="st-hint">${e(hint)}</span></div>
      </div>
      <div class="st-body">
        ${zones.map((z) => `<section class="st-zone"><h3>${e(z.name)}</h3><ul>${z.districts.map((d) => `<li><button type="button" data-act="go" data-id="${e(d.id)}"><b>${e(d.pill)}</b><span>${e(d.title)}</span></button></li>`).join('')}</ul></section>`).join('')}
      </div>
      ${this._fold()}`;
    this.setReading(false);
  }

  /** first tap on a place: name · title · 去看 */
  preview({ id, name, title, zone }) {
    const e = this.esc;
    this.show('preview');
    this.root.innerHTML = `
      <div class="st-top">
        <div class="st-r1"><span class="crumb is-static">${e(zone)} › ${e(name)}</span><button type="button" class="st-go is-ink" data-act="go" data-id="${e(id)}">去看 ›</button></div>
        <p class="st-cap" id="st-cap" aria-live="polite">${e(title)}</p>
        <div class="st-r3"><button type="button" class="st-btn" data-act="unpreview">回到地圖</button></div>
      </div>
      ${this._fold()}`;
    this.setReading(false);
  }

  /**
   * a district told in beats
   * @param o { id, zone, name, panel, n, tour: {i, n}|null, next: {label, act}, reading: html, lever: bool, legacy: bool }
   */
  district(o) {
    const e = this.esc;
    this.show(o.legacy ? 'legacy' : 'district');
    this.o = o;
    const crumb = o.tour ? `第 ${o.tour.i + 1}／${o.tour.n} 站・${o.name}` : `${o.zone} › ${o.name}`;
    const segs = o.legacy ? '' : `<div class="segs" role="group" aria-label="動畫的 ${o.n} 步">${Array.from({ length: o.n }, (_, i) => `<button type="button" class="seg" data-act="seg" data-i="${i}" aria-label="第 ${i + 1} 步"><i></i></button>`).join('')}</div>`;
    this.root.innerHTML = `
      <div class="st-top">
        <div class="st-r1"><button type="button" class="crumb" data-act="crumb" title="回到地圖">${e(crumb)}</button><button type="button" class="st-go" data-act="read" aria-expanded="false" aria-controls="st-body">讀這一區 ›</button></div>
        <h2 class="st-name" id="st-name" tabindex="-1">${e(o.name)}</h2>
        <div class="st-panel">${e(o.panel || '')}</div>
        <p class="st-cap" id="st-cap" aria-live="polite"></p>
        <div class="st-cite" id="st-cite"></div>
        <div class="st-r3" id="st-r3">${segs}<span class="st-ctls" id="st-ctls"></span></div>
      </div>
      <div class="st-body" id="st-body" tabindex="-1">${o.reading || ''}</div>
      ${this._fold()}`;
    this.setReading(false);
    this.setFolded(this.folded);
  }

  /** the parts of the strip that follow the story (cheap; called on every story change) */
  update({ caption, cite, beat, n, k, ended, playing, line, lever, levering, next, captionShown }) {
    const cap = $('#st-cap', this.root);
    const text = line || caption || '';
    if (cap && cap.textContent !== text) {
      cap.textContent = text;
      cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
    }
    cap?.classList.toggle('is-line', !!line);
    const ct = $('#st-cite', this.root);
    if (ct && ct.textContent !== (cite || '')) ct.textContent = cite || '';
    for (const s of this.root.querySelectorAll('.seg')) {
      const i = +s.dataset.i;
      s.classList.toggle('done', ended || i < beat || (i === beat && k >= 1 && captionShown));
      s.classList.toggle('cur', !ended && i === beat);
      s.firstElementChild.style.transform = `scaleX(${ended || i < beat ? 1 : i === beat ? Math.min(1, k) : 0})`;
      if (!ended && i === beat) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    }
    // at the end the segments give their room to the way on
    $('#st-r3', this.root)?.classList.toggle('is-end', !!ended && !levering);
    const box = $('#st-ctls', this.root);
    if (!box) return;
    const e = this.esc;
    let html;
    if (levering) {
      html = levering;
    } else if (ended) {
      html = `<button type="button" class="st-btn" data-act="replay" aria-label="再看一次"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.4 1.9v2.9h2.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>${lever ? '<button type="button" class="st-btn" data-act="lever">換你試試</button>' : ''}${next ? `<button type="button" class="st-btn is-ink" data-act="${next.act}">${e(next.label)} ›</button>` : ''}`;
    } else if (playing) {
      html = '<button type="button" class="st-btn" data-act="pause" aria-label="暫停"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M5.2 3.6v8.8M10.8 3.6v8.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
    } else {
      html = `<button type="button" class="st-btn is-ink" data-act="next">下一步 ›</button>`;
    }
    if (box._html !== html) { box.innerHTML = html; box._html = html; }
  }

  /** a legacy district has no beats: the title is the caption, the way on sits in row 3 */
  legacyControls(next) {
    const box = $('#st-ctls', this.root);
    if (box) box.innerHTML = next ? `<button type="button" class="st-btn is-ink" data-act="${next.act}">${this.esc(next.label)} ›</button>` : '';
  }

  _fold() { return '<button type="button" class="st-fold" data-act="fold" aria-label="收起說明">×</button>'; }
}
