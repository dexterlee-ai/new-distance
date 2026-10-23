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
    if (this.reading) requestAnimationFrame(() => this.relayout());
    const b = $('[data-act="read"]', this.root);
    if (b) { b.setAttribute('aria-expanded', String(this.reading)); b.textContent = this.reading ? '收起 ×' : '讀這一區 ›'; }
  }

  /** a first visit's autoplay: the reading body waits until the picture has told the story */
  setHeld(on) {
    const was = this.root.classList.contains('held');
    this.root.classList.toggle('held', !!on);
    if (was && !on) requestAnimationFrame(() => this.relayout());
  }

  setFolded(on) {
    this.folded = !!on;
    this.root.classList.toggle('folded', this.folded);
    document.body.classList.toggle('panel-folded', this.folded);
    const f = $('[data-act="fold"]', this.root);
    if (f) { f.setAttribute('aria-label', this.folded ? '展開說明' : '收起說明'); f.textContent = this.folded ? '‹' : '×'; }
    if (!this.folded) requestAnimationFrame(() => this.relayout());
  }

  // ---------------------------------------------------------------- states
  /**
   * the map: the one sentence, the zones (desktop lists them with their districts), the route.  zone: the ring being
   * looked at (its section is marked and scrolled to; the crumb leads back to the whole map)
   */
  map({ sentence, zones, hint, zone = null, zoneName = '' }) {
    const e = this.esc;
    this.show('map');
    const crumb = zone ? `<button type="button" class="crumb" data-act="to-map" title="回到整張地圖">地圖 › ${e(zoneName)}</button>` : '<span class="crumb is-static">地圖</span>';
    this.root.innerHTML = `
      <div class="st-top">
        <div class="st-r1">${crumb}<a class="st-go" href="#/start">跟著路線走 ›</a></div>
        <p class="st-cap" id="st-cap" aria-live="polite">${e(sentence)}</p>
        <div class="st-r3"><span class="st-hint">${e(hint)}</span></div>
      </div>
      <div class="st-body">
        ${zones.map((z) => `<section class="st-zone${z.id === zone ? ' is-on' : ''}" data-zone="${e(z.id)}"><h3>${e(z.name)}</h3><ul>${z.districts.map((d) => `<li><button type="button" data-act="go" data-id="${e(d.id)}"><b>${e(d.pill)}</b><span>${e(d.title)}</span></button></li>`).join('')}</ul></section>`).join('')}
      </div>
      ${this._fold()}`;
    this.setReading(false);
    this.relayout();
    const sec = zone && this.root.querySelector(`.st-zone[data-zone="${CSS.escape(zone)}"]`);
    if (sec && this.desktop) requestAnimationFrame(() => { this.root.scrollTop = Math.max(0, sec.offsetTop - ($('.st-top', this.root)?.offsetHeight || 0) - 8); });
  }

  /** first tap on a place: its name and title, what 去看 will show (its length, its articles), 去看 */
  preview({ id, name, title, zone, line = '' }) {
    const e = this.esc;
    this.show('preview');
    this.root.innerHTML = `
      <div class="st-top">
        <div class="st-r1"><span class="crumb is-static st-pv"><span class="z">${e(zone)} ›</span> <b>${e(name)}</b></span><button type="button" class="st-go is-ink" data-act="go" data-id="${e(id)}">去看 ›</button></div>
        <p class="st-cap" id="st-cap" aria-live="polite">${e(title)}</p>
        <div class="st-r3"><span class="st-hint">${e(line)}</span><button type="button" class="st-btn" data-act="unpreview">回到地圖</button></div>
      </div>
      ${this._fold()}`;
    this.setReading(false);
    this.relayout();
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
        <div class="st-panel">${e(articlesOf(o.panel, o.name))}</div>
        <p class="st-cap" id="st-cap" aria-live="polite"></p>
        <div class="st-cite" id="st-cite"></div>
        <div class="st-r3" id="st-r3">${segs}<span class="st-ctls" id="st-ctls"></span></div>
      </div>
      <div class="st-body" id="st-body" tabindex="-1">${o.reading || ''}</div>
      ${this._fold()}`;
    this.setReading(false);
    this.setFolded(this.folded);
    this.relayout();
  }

  /** the parts of the strip that follow the story (cheap; called on every story change) */
  update({ caption, cite, beat, n, k, ended, playing, line, lever, levering, next, captionShown, stale }) {
    const cap = $('#st-cap', this.root);
    const text = line || caption || '';
    if (cap && (cap.dataset.text ?? cap.textContent) !== text) {
      this.setText(cap, text);
      cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
    }
    cap?.classList.toggle('is-line', !!line);
    cap?.classList.toggle('is-stale', !!stale);
    const ct = $('#st-cite', this.root);
    if (ct && ct.textContent !== (cite || '')) ct.textContent = cite || '';
    for (const s of this.root.querySelectorAll('.seg')) {
      const i = +s.dataset.i;
      s.classList.toggle('done', ended || i < beat || (i === beat && k >= 1 && captionShown));
      s.classList.toggle('cur', !ended && i === beat);
      s.firstElementChild.style.transform = `scaleX(${ended || i < beat ? 1 : i === beat ? Math.min(1, k) : 0})`;
      if (!ended && i === beat) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    }
    // at the end, and while the reader chooses (換你試試), the segments give their room to the buttons
    $('#st-r3', this.root)?.classList.toggle('is-end', !!ended || !!levering);
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

  /**
   * a sentence set on as many lines as its box needs, broken only between words: after punctuation or at a space,
   * a phrase that is longer than a line between two of its words, and of the breaks that keep the fewest lines the
   * one with the evenest lines (no word left alone on the last line).  A one-line box (nowrap) gets the plain text.
   */
  setText(el, text, width = null) {
    el.dataset.text = text;
    if (!el.dataset.brk) el.dataset.brk = '1';
    const cs = getComputedStyle(el);
    const W = (width ?? el.clientWidth) - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    if (cs.whiteSpace === 'nowrap' || !text || !(W > 40)) { el.textContent = text; return; }
    // (a box clamped to two lines, the phone strip, gets at most two)
    const clamp = /-webkit-box/.test(cs.display) ? parseInt(cs.webkitLineClamp, 10) : 0;
    const lines = breakLines(text, W - 2, measurer(cs), { maxLines: clamp || 3 });
    if (lines.length < 2) { el.textContent = text; return; }
    // the lines cut from the sentence itself, so the element's text stays the sentence: a space at a cut is kept
    // (it collapses at the start of the next line)
    const parts = [];
    let at = 0;
    for (const l of lines) {
      const i = text.indexOf(l, at);
      if (i < 0) { el.innerHTML = lines.map((x) => this.esc(x)).join('<br>'); return; }
      parts.push(text.slice(at, i + l.length));
      at = i + l.length;
    }
    parts[parts.length - 1] += text.slice(at);
    el.innerHTML = parts.map((p) => this.esc(p)).join('<br>');
  }

  /** set every broken sentence again for its box's width now (a resize, the fonts arriving, the panel unfolding) */
  relayout() {
    const cap = $('#st-cap', this.root);
    if (cap && !cap.dataset.brk) cap.dataset.text = cap.textContent;
    if (cap) cap.dataset.brk = '1';
    for (const el of this.root.querySelectorAll('[data-brk]:not([data-brk="li"])')) this.setText(el, el.dataset.text || '');
    // the reading layer's list of beats: each line beside its number and its page reference
    for (const li of this.root.querySelectorAll('.rl .beats li')) {
      const t = li.querySelector('button, a');
      if (!t || !li.clientWidth) continue;
      if (!t.dataset.brk) { t.dataset.text = t.textContent; t.dataset.brk = 'li'; }
      const cite = li.querySelector(':scope > span');
      this.setText(t, t.dataset.text, li.clientWidth - 24 - (cite ? cite.offsetWidth + 10 : 0));
    }
  }
}

/** the panel's line under the district's name: the articles it tells (第 6、3 篇), not the name again */
export function articlesOf(panel, name) {
  const p = String(panel || '');
  const tail = p.includes('·') ? p.slice(p.indexOf('·') + 1).trim() : p;
  return tail.trim() === String(name || '').trim() ? '' : tail;
}

// ---------------------------------------------------------------- line breaking for Chinese
// Chinese has no spaces, so the browser breaks a caption between any two characters (網／友, 來／源).  These
// sentences are short (two or three lines at most), so they are broken here, by measuring: a break may follow
// punctuation or a space (free), come before an opening bracket (almost free), fall between two words of a phrase
// longer than a line (dear; the words from Intl.Segmenter), or, only if nothing else fits, between two characters.
const SEG = (() => { try { return new Intl.Segmenter('zh-Hant', { granularity: 'word' }); } catch { return null; } })();
const SPACE = /\s/;
const AFTER = /[，、；：。！？」』）〉》…—,;:!?)\]]/;          // a line may end after these
const NO_START = /[，、；：。！？」』）〉》％,.;:!?)\]%]/;        // a line never starts with these
const NO_END = /[「『（〈《(\[]/;                              // a line never ends with these
const OPEN = /[「『（〈《]/;
const ALNUM = /[A-Za-z0-9]/;
const DIGIT = /[0-9]/;
const PARTICLE = /[的了著過們地得]/;
const HIGH = /[\ud800-\udbff]/;
const _ctx = (() => { try { return document.createElement('canvas').getContext('2d'); } catch { return null; } })();
function measurer(cs) {
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const ls = parseFloat(cs.letterSpacing) || 0;
  const cache = new Map();
  return (s) => {
    let v = cache.get(s);
    if (v === undefined) {
      if (_ctx) { _ctx.font = font; v = _ctx.measureText(s).width + ls * [...s].length; }
      else v = [...s].reduce((t, c) => t + (c.charCodeAt(0) < 0x2e80 ? 0.55 : 1), 0) * (parseFloat(cs.fontSize) || 16);
      cache.set(s, v);
    }
    return v;
  };
}

/**
 * text → lines that fit width W (px), measured by m(string) → px, in at most maxLines lines when it can be done:
 * the cheapest set of breaks, where every line after the first costs a little (so two phrases on their own lines
 * beat one phrase split between two of its words), uneven lines cost a little, and a very short last line more
 */
export function breakLines(text, W, m, { maxLines = 3 } = {}) {
  const s = String(text);
  const n = s.length;
  if (m(s) <= W) return [s];
  const words = new Set();
  if (SEG) for (const g of SEG.segment(s)) if (g.index > 0) words.add(g.index);
  // the cost of a break before index i (Infinity: never)
  const cost = (i) => {
    const a = s[i - 1], b = s[i];
    if (SPACE.test(b)) return Infinity;                        // break after the space, not before it
    if (NO_START.test(b) || NO_END.test(a)) return Infinity;
    if ((a === ',' || a === '.') && DIGIT.test(b) && DIGIT.test(s[i - 2] || '')) return Infinity;   // 5,000 · 2.5
    if (SPACE.test(a) || AFTER.test(a)) return 0;
    if (OPEN.test(b)) return 0.5;
    if (ALNUM.test(a) && ALNUM.test(b)) return Infinity;       // inside a Latin word or a number
    if (HIGH.test(a)) return Infinity;                         // inside a surrogate pair
    if (a === b) return Infinity;                              // inside a doubled character (件件, 一一)
    // between two words of a phrase: dear (dearer before a particle that belongs to the word ahead), else dearest
    return words.has(i) ? 6 + (PARTICLE.test(b) ? 2 : 0) : 14;
  };
  const cuts = [0], cc = [0];
  for (let i = 1; i < n; i++) { const c = cost(i); if (c < Infinity) { cuts.push(i); cc.push(c); } }
  cuts.push(n); cc.push(0);
  const K = cuts.length, LINE = 3.5, MAXL = Math.max(maxLines, 1) + 2;
  const line = (i, j) => s.slice(cuts[i], cuts[j]).trim();
  // best[L][j]: the cheapest way to set the text up to cut j on exactly L lines
  const best = Array.from({ length: MAXL + 1 }, () => new Array(K).fill(null));
  best[0][0] = { score: 0, prev: -1, wmin: Infinity, wmax: 0 };
  for (let L = 1; L <= MAXL; L++) {
    for (let j = 1; j < K; j++) {
      for (let i = j - 1; i >= 0; i--) {
        const b = best[L - 1][i];
        if (!b) continue;
        const w = m(line(i, j));
        if (w > W && j - i > 1) break;                         // reaching further back only makes it longer
        const over = w > W ? 50 + (w - W) : 0;                  // one unbreakable piece wider than the line
        const last = j === K - 1;
        const widow = last && L > 1 && w < W * 0.22 ? 4 : 0;
        const score = b.score + (last ? 0 : cc[j]) + over + widow + (L > 1 ? LINE : 0);
        const wmin = Math.min(b.wmin, w), wmax = Math.max(b.wmax, w);
        const tot = score + (last && L > 1 ? ((wmax - wmin) / W) * 2.5 : 0);
        const cur = best[L][j];
        if (!cur || tot < cur.tot - 1e-9) best[L][j] = { score, tot, prev: i, wmin, wmax };
      }
    }
  }
  // within the line budget if possible, else the fewest lines
  let pick = -1;
  for (let L = 1; L <= MAXL; L++) {
    const e = best[L][K - 1];
    if (!e) continue;
    if (L <= maxLines) { if (pick < 0 || e.tot < best[pick][K - 1].tot) pick = L; }
    else if (pick < 0) { pick = L; break; }
  }
  if (pick < 0) return [s];
  const out = [];
  for (let L = pick, j = K - 1; L > 0 && j > 0; L--) { const e = best[L][j]; out.unshift(line(e.prev, j)); j = e.prev; }
  return out.length ? out : [s];
}
