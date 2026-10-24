// Everything in HTML that is pinned to the 3D scene: pills, zone lettering, labels with short leaders,
// words on objects (decals), tappable hotspots, the flows' quiet names and one edge arrow.  The UI says what should
// be shown; this layer places it every frame and enforces the budgets: labels touch their objects (a leader of at
// most 48 px on a phone, 72 px on desktop) or are not shown, nothing sits under the strip, the panel or the top bar,
// and at most 12 positioned nodes are on screen.
//
// Timing: a node is created hidden and only shows once a frame has placed it (never a flash at 0,0); words on an
// object appear and disappear in the same frame as the object (no fade that would leave them behind it); every
// item's at() is asked again on every frame.
const $ = (s, r = document) => r.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';

export class Overlay {
  /** dragged(): whether the pointer that ends in a click just turned or moved the world (that click is not a tap) */
  constructor(root, { esc, dragged = () => false }) {
    this.root = root;
    this.esc = esc;
    this.dragged = dragged;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'ov-leaders');
    this.svg.setAttribute('aria-hidden', 'true');
    root.appendChild(this.svg);
    this.nodes = new Map();     // key → { el, kind, item, line?, dot? }
    this.items = [];
    this._p = { x: 0, y: 0, z: 0 };
    this._q = { x: 0, y: 0, z: 0 };
    this._r = { x: 0, y: 0, z: 0 };
  }

  /**
   * @param {Array} items  { key, kind: 'pill'|'zone'|'letter'|'label'|'flow'|'decal'|'hot'|'arrow'|'chip', text,
   *                         at: () => Vector3|null, onTap?, aria?, sub?, cls?, unit? (decals: world height of the text),
   *                         size? ([w, h]: the surface a decal fits), rows? (decal rows: at() returns Vector3[]),
   *                         pri? (higher stays when over budget), dim?, on?,
   *                         ring? (map pills: { pin: () => Vector3, r: [r0, r1] } — laid out on that ring, clear of
   *                         the keep-outs, with a leader to the pin when it sits away from it), ready? () => bool,
   *                         hit? (hot: the part's hit proxy, so the ring sits on what it names) }
   */
  set(items) {
    this.items = items;
    const keep = new Set(items.map((i) => i.key));
    for (const [k, n] of this.nodes) if (!keep.has(k)) { n.el.remove(); n.line?.remove(); n.dot?.remove(); this.nodes.delete(k); }
    for (const it of items) {
      let n = this.nodes.get(it.key);
      if (!n || n.kind !== it.kind || n.text !== it.text || n.word !== (it.word || '') || n.rowsKey !== (it.rows || []).join('|') || n.sub !== (it.sub || '')) {
        if (n) { n.el.remove(); n.line?.remove(); n.dot?.remove(); }
        n = this._make(it);
        this.nodes.set(it.key, n);
      }
      n.item = it;
      n.el.classList.toggle('is-dim', !!it.dim);
      n.el.classList.toggle('is-on', !!it.on);
    }
  }

  _make(it) {
    const tap = !!it.onTap;
    const el = document.createElement(tap ? 'button' : 'div');
    if (tap) {
      el.type = 'button';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        // a finger that started on this pill and turned the world is not a tap on it
        if (e.pointerType && e.pointerType !== 'mouse' && this.dragged()) return;
        n.item.onTap?.(e);
      });
    }
    // hidden until a frame has placed it
    el.className = `ov ov-${it.kind}${it.cls ? ` ${it.cls}` : ''} off`;
    if (tap) el.tabIndex = -1;
    const e = this.esc;
    if (it.kind === 'hot') el.innerHTML = `<span class="ring" aria-hidden="true"></span>${it.word ? `<span class="w" aria-hidden="true">${e(it.word)}</span>` : ''}`;
    else if (it.kind === 'decal' && it.rows) {
      el.innerHTML = it.rows.map((r, i) => {
        const t = it.rowTaps?.[i];
        return t ? `<button type="button" class="row is-tap${t.on ? ' is-on' : ''}" data-part="${e(t.part)}" aria-label="${e(r.replace(/^[□■]\s*/, ''))}：${e(t.line)}">${e(r)}</button>` : `<span class="row">${e(r)}</span>`;
      }).join('');
      if (it.rowTaps?.some(Boolean)) el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-part]'); if (b) { ev.stopPropagation(); if (ev.pointerType && ev.pointerType !== 'mouse' && this.dragged()) return; n.item.onRow?.(b.dataset.part); } });
    }
    else if (it.kind === 'pill' || it.kind === 'zone' || it.kind === 'chip') el.innerHTML = `<span class="t">${e(it.text)}</span>${tap && it.kind !== 'chip' ? '<span class="chev" aria-hidden="true">›</span>' : ''}${it.sub ? `<span class="sub">${e(it.sub)}</span>` : ''}`;
    else if (it.kind === 'arrow') el.innerHTML = `<svg class="dir" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M2.5 8h10M8.8 4.2 12.6 8l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="t">${e(it.text)}</span>`;
    else el.textContent = it.text;
    if (it.aria) el.setAttribute('aria-label', it.aria);
    else if (it.kind === 'hot') el.setAttribute('aria-label', it.text);
    if (!tap && !it.rowTaps?.some(Boolean)) el.setAttribute('aria-hidden', 'true');
    this.root.appendChild(el);
    const n = { el, kind: it.kind, text: it.text, word: it.word || '', rowsKey: (it.rows || []).join('|'), sub: it.sub || '', w: 0, h: 0, item: it };
    if (it.kind === 'label' || (it.kind === 'pill' && it.ring)) {
      n.line = document.createElementNS(NS, 'line');
      n.dot = document.createElementNS(NS, 'circle');
      n.dot.setAttribute('r', it.kind === 'pill' ? '2.6' : '2.2');
      n.line.style.display = n.dot.style.display = 'none';
      if (it.kind === 'pill') { n.line.setAttribute('class', 'pl'); n.dot.setAttribute('class', 'pl'); }
      this.svg.append(n.line, n.dot);
    }
    return n;
  }

  /** measure again on the next frame (fonts, resize) */
  remeasure() { for (const n of this.nodes.values()) { n.w = n.h = 0; n.ww = 0; n.subW = 0; } }

  /**
   * @param {Engine} E
   * @param {object} f  { free: {x,y,w,h} (the world's free rect), top: px under the top bar, mobile, subject: {x0,y0,x1,y1}|null,
   *                      reading, keep (boxes the pills keep clear of where they can), keepout (map pills: boxes
   *                      { x0, y0, x1, y1 } or discs { cx, cy, r } they must not cover — the printed zone names, the
   *                      sunflower's head, the stages), stages (boxes: a flow's name hides while its object is over
   *                      one), occ (map pills: the districts' tall parts as discs { cx, cy, r, d, id }, d their distance
   *                      from the camera: what stands in front of a pin), arrow (false: no edge arrow this frame) }
   */
  frame(E, f) {
    const mobile = f.mobile;
    const maxLead = mobile ? 48 : 72;
    const placed = [];   // screen boxes already taken this frame (for labels and pills)
    let count = 0, nb = 0;
    const nbMax = mobile ? 3 : 6;   // neighbours' pills in a district
    const order = [...this.nodes.values()].sort((a, b) => (b.item.pri ?? PRI[b.kind]) - (a.item.pri ?? PRI[a.kind]));
    const fr = f.free;
    const top = Math.max(fr.y, f.top || 0);
    const inFree = (x, y, m = 0) => x >= fr.x + m && x <= fr.x + fr.w - m && y >= fr.y + m && y <= fr.y + fr.h - m;
    const inside = (b, m = 0) => b.x0 >= fr.x + m && b.x1 <= fr.x + fr.w - m && b.y0 >= top + m && b.y1 <= fr.y + fr.h - m;
    // docked buttons share one row, centred, in their own widths
    const docks = order.filter((n) => n.item.dock != null).sort((p, q) => p.item.dock - q.item.dock);
    if (docks.length) {
      for (const n of docks) if (!n.w) { n.w = n.el.offsetWidth; n.h = n.el.offsetHeight; }
      const gap = 8, total = docks.reduce((t, n) => t + n.w, 0) + gap * (docks.length - 1);
      let x = fr.x + Math.max(6, (fr.w - total) / 2);
      for (const n of docks) { n.dockX = x + n.w / 2; x += n.w + gap; }
    }
    for (const n of order) {
      const it = n.item;
      const el = n.el;
      let show = false;
      let lead = null;   // a pill's leader: [x1, y1, x2, y2]
      if (!n.w) { n.w = el.offsetWidth; n.h = el.offsetHeight; }
      const w = n.w, h = n.h;
      if ((it.ready && !it.ready()) || (f.hold && HELD[it.kind])) {
        // not drawn yet (the opening): nothing to name
      } else if (it.kind === 'arrow') {
        // pinned to the edge of the free rect in the direction of an off-screen subject: never while the camera
        // moves (or just after), never while reading (the half sheet covers the picture on purpose), and under every
        // pill and word: it gives way to them
        const a = f.arrow !== false && !f.reading && it.at && it.at();
        const p = a && E.project(a, this._p);
        if (p && !inFree(p.x, p.y)) {
          const cx = fr.x + fr.w / 2, cy = fr.y + fr.h / 2;
          const dx = p.x - cx, dy = p.y - cy;
          const s = Math.min((fr.w / 2 - w / 2 - 10) / Math.max(1e-3, Math.abs(dx)), (fr.h / 2 - h / 2 - 10) / Math.max(1e-3, Math.abs(dy)));
          const x = cx + dx * s, y = Math.max(top + h / 2 + 4, cy + dy * s);
          const box = { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
          if (!hits(box, placed, 2)) {
            el.style.transform = `translate(${box.x0.toFixed(1)}px, ${box.y0.toFixed(1)}px)`;
            $('.dir', el).style.transform = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
            placed.push(box);
            show = true;
          }
        }
      } else if (it.dock != null) {
        const x = n.dockX ?? fr.x + (fr.w * (it.dock + 0.5)) / 3, y = fr.y + fr.h - h / 2 - 14;
        const box = { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
        el.style.transform = `translate(${box.x0.toFixed(1)}px, ${box.y0.toFixed(1)}px)`;
        placed.push(box);
        show = true;
      } else if (it.kind === 'tag') {
        // a fixed note in the free rect's top left corner (畫面為示意), clear of the top bar: placed first, the words of
        // the scene keep clear of it
        const ty = Math.max(fr.y, f.top || 0) + 10;
        el.style.transform = `translate(${(fr.x + 16).toFixed(1)}px, ${ty.toFixed(1)}px)`;
        placed.push({ x0: fr.x + 16, y0: ty, x1: fr.x + 16 + w, y1: ty + h });
        show = true;
      } else if (it.kind === 'chip') {
        // a fixed control in the free rect's top right corner (回到原視角)
        el.style.transform = `translate(${(fr.x + fr.w - w - 12).toFixed(1)}px, ${(fr.y + 10).toFixed(1)}px)`;
        if (!el.hidden) placed.push({ x0: fr.x + fr.w - w - 12, y0: fr.y + 10, x1: fr.x + fr.w - 12, y1: fr.y + 10 + h });
        show = true;
      } else {
        const a = it.at && it.at();
        const pts = Array.isArray(a) ? a : a ? [a] : [];
        const p = pts.length && E.project(pts[0], this._p);
        if (p && p.z < 1 && inFree(p.x, p.y, it.kind === 'letter' ? 0 : 4)) {
          if (it.kind === 'label') show = this._label(n, p, w, h, fr, maxLead, placed, f.subject, top, it.avoid ? it.avoid() : null);
          else if (it.kind === 'flow') show = this._flow(n, p, w, h, fr, top, placed, f.stages, it.avoid ? it.avoid() : null, it.obj ? it.obj(p) : null);
          else if (it.kind === 'decal') {
            show = this._decal(n, E, pts, p, mobile);
            // the words stay inside the visible world: a block that would cross into the strip, the panel or the top
            // bar is not shown (it would sit off its object there anyway)
            if (show && n.box && !inside(n.box)) show = false;
            // words never sit on other words: the beat's own objects are placed first, a later decal that would
            // cover one already placed waits
            if (show && n.box && hits(n.box, placed, 1)) show = false;
            if (show && n.box) placed.push(n.box);
          } else if (it.kind === 'hot') {
            show = this._hot(n, E, it, p, fr, top, placed);
          } else if (it.ring) {
            const r = this._mapPill(n, E, it, w, h, fr, top, placed, f.keepout || [], f.keep || [], f.occ || [], mobile);
            if (r) { show = true; lead = r.lead; }
          } else {
            // pills sit on their place (no leader); near an edge they are slid inward rather than lost; a pill that
            // would overlap one already placed waits
            const cx = Math.min(Math.max(p.x, fr.x + w / 2 + 4), fr.x + fr.w - w / 2 - 4);
            const sub = f.subject;
            const steps = it.kind === 'letter' ? [0] : [0, -1, 1, -2, 2];
            const keep = f.keep || [];
            for (const pass of keep.length && it.kind !== 'letter' ? [true, false] : [!!keep.length]) {
              if (show) break;
              for (const k of steps) {
                const cy = p.y + k * (h + 6);
                const box = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
                const overSubject = it.kind === 'pill' && it.dim && sub && box.x1 > sub.x0 - 48 && box.x0 < sub.x1 + 48 && box.y1 > sub.y0 - 48 && box.y0 < sub.y1 + 48;
                if (overSubject || box.y0 < top || box.y1 > fr.y + fr.h || box.x0 < fr.x || box.x1 > fr.x + fr.w) continue;
                // the ground lettering gives way to every pill and word
                if (hits(box, placed, it.kind === 'letter' ? 2 : 4)) continue;
                if (pass && hits(box, keep, 0)) continue;
                el.style.transform = `translate(${box.x0.toFixed(1)}px, ${box.y0.toFixed(1)}px)`;
                if (it.kind !== 'letter') placed.push(box);
                show = true;
                break;
              }
            }
          }
        }
      }
      if (show && it.kind !== 'letter' && count >= 12) show = false;
      if (show && it.dim && it.kind === 'pill') { if (nb >= nbMax) show = false; else nb++; }
      if (show && it.kind !== 'letter') count++;
      el.classList.toggle('off', !show);
      if (el.tagName === 'BUTTON') el.tabIndex = show ? 0 : -1;
      if (n.line) {
        const on = show && (it.kind === 'label' || !!lead);
        n.line.style.display = n.dot.style.display = on ? '' : 'none';
        if (on && lead) {
          n.line.setAttribute('x1', lead[0].toFixed(1)); n.line.setAttribute('y1', lead[1].toFixed(1));
          n.line.setAttribute('x2', lead[2].toFixed(1)); n.line.setAttribute('y2', lead[3].toFixed(1));
          n.dot.setAttribute('cx', lead[2].toFixed(1)); n.dot.setAttribute('cy', lead[3].toFixed(1));
        }
      }
    }
  }

  // a label on the free side nearest its object, its leader ending on a dot on the object
  _label(n, p, w, h, fr, maxLead, placed, subject, top = 0, avoid = null) {
    const cands = [[0, -1], [1, -0.6], [-1, -0.6], [1, 0.4], [-1, 0.4], [0, 1]];
    const lead = 26;
    for (const [sx, sy] of cands) {
      const cx = p.x + sx * (w / 2 + lead * 0.7), cy = p.y + sy * (h / 2 + lead);
      const box = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
      if (box.x0 < fr.x + 4 || box.x1 > fr.x + fr.w - 4 || box.y0 < Math.max(fr.y + 4, top + 4) || box.y1 > fr.y + fr.h - 4) continue;
      // clear of every word and pill already placed (the beat's decals are placed before any label)
      if (hits(box, placed)) continue;
      if (avoid && hits(box, avoid, 0)) continue;
      // the leader runs from the box edge nearest the dot
      const ex = Math.max(box.x0, Math.min(p.x, box.x1)), ey = Math.max(box.y0, Math.min(p.y, box.y1));
      const len = Math.hypot(ex - p.x, ey - p.y);
      if (len > maxLead) continue;
      placed.push(box);
      n.el.style.transform = `translate(${box.x0.toFixed(1)}px, ${box.y0.toFixed(1)}px)`;
      n.line.setAttribute('x1', ex.toFixed(1)); n.line.setAttribute('y1', ey.toFixed(1));
      n.line.setAttribute('x2', p.x.toFixed(1)); n.line.setAttribute('y2', p.y.toFixed(1));
      n.dot.setAttribute('cx', p.x.toFixed(1)); n.dot.setAttribute('cy', p.y.toFixed(1));
      return true;
    }
    return false;
  }

  // a flow's name: small type set just beside the moving object -- beside its drawn outline (obj: its box on screen,
  // when the UI knows it), never on it -- and never over a district's stage
  _flow(n, p, w, h, fr, top, placed, stages, avoid, obj = null) {
    if (stages && stages.some((s) => p.x > s.x0 && p.x < s.x1 && p.y > s.y0 && p.y < s.y1)) return false;
    const g = 10;
    const cy = obj ? Math.min(Math.max(p.y, obj.y0 + h / 2), obj.y1 - h / 2) : p.y, cx = obj ? (obj.x0 + obj.x1) / 2 : p.x;
    const cands = obj
      ? [[obj.x1 + 7, cy - h / 2], [obj.x0 - 7 - w, cy - h / 2], [cx - w / 2, obj.y0 - 6 - h], [cx - w / 2, obj.y1 + 6]]
      : [[p.x + g, p.y - h / 2], [p.x - g - w, p.y - h / 2], [p.x - w / 2, p.y - g - h], [p.x - w / 2, p.y + g]];
    for (const [x0, y0] of cands) {
      const box = { x0, y0, x1: x0 + w, y1: y0 + h };
      if (box.x0 < fr.x + 4 || box.x1 > fr.x + fr.w - 4 || box.y0 < top + 4 || box.y1 > fr.y + fr.h - 4) continue;
      if (hits(box, placed, 4)) continue;
      if (obj && hits(box, [obj], 2)) continue;
      if (avoid && hits(box, avoid, 0)) continue;
      // (nor do its words lie over a stage: grey type over a district's drawing reads as neither)
      if (stages && hits(box, stages, 2)) continue;
      placed.push(box);
      n.el.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`;
      return true;
    }
    return false;
  }

  /**
   * A map pill on its own ring: tried where its anchor is and at places pushed outward from the map's middle (and a
   * little along the ring); of those that cover no keep-out and no pill already placed, the one nearest its district
   * on screen wins, within reach of a short leader.  It keeps the place it found while that place stays clear, so it
   * does not hop as the map turns.  A quieter pill (another ring's, in a ring view) that has no clear place nearby
   * waits instead.
   * A place is clear only when it also keeps 12 px from the screen's edges, stands in no column with another pill
   * (a pill of another ring never within one and a half pill heights above or below it, one of its own ring never
   * touching), and its leader crosses no other district's stage, no printed name and no other pill.
   * Where its leader ends: on its pin where the pin shows; where the district stands large on screen (a ring's view,
   * a reader's zoom), on whatever point of its own ground or face is nearest -- a little inside their rim -- so the
   * leader reaches the district's edge instead of running across it to the middle; and where another district's
   * tall part stands in front of the pin (the sunflower's face before the market), on a part of its own ground that
   * shows -- never into the object in front.  Nothing of it shows: no pill.
   * Leaders stay short (80 css px on a desk, 64 on a phone).  Where no clear place is that near, a district that
   * stands wider than the pill carries it on its own ground, clear of every other district, name and pill; else it
   * may lean over the air above another stage or a flow's course; else the pill waits until the reader turns or
   * zooms to where it has room.
   */
  _mapPill(n, E, it, w, h, fr, top, placed, keepout, keep, occ = [], mobile = false) {
    const a = it.at(), pin = it.ring.pin ? it.ring.pin() : a;
    if (!a || !pin) return null;
    let r = Math.hypot(pin.x, pin.z);
    let th = Math.atan2(pin.z, pin.x);
    if (r < 6) { const pz = E.getPose ? E.getPose().az : 0; th = pz; r = 6; }   // the very middle: toward the reader
    // its own ring (a pill near the coast may lean a little over the water or the shore)
    let [r0, r1] = it.ring.r || [0, 100];
    r0 = Math.min(r0 - 3, r - 2); r1 = Math.max(r1 + 5, r + 2);
    // (beyond its own ring: into the next ring's open ground or water, never past the disc's rim)
    const w0 = Math.max(0, r0 - 24), w1 = Math.min(98, r1 + 24);
    const own = it.ring.id;
    if (!CANDS.length) {
      const DT = [0, 4, -4, 8, -8, 13, -13, 19, -19, 26, -26];
      for (const dr of [0, 3, 6, 9, 12, 16, 20, 25, 30, 36, -3, -6, -9, -13]) for (const dt of DT) CANDS.push([dr, dt]);
      for (const dr of [0, 4, 8, 12, 16, 20, 25, 30, 36, 42, 48, -4, -8, -12, -16, -20, -25, -30]) for (const dt of DT) CANDS_W.push([dr, dt]);
    }
    const NC = CANDS.length;
    const pp = E.project(pin, this._q);
    const px = pp ? pp.x : 0, py = pp ? pp.y : 0;
    // (what stands in front of what: the pin's distance from the camera against each other district's tall part)
    const cm = E.camera.matrixWorld.elements;
    const pd = Math.hypot(pin.x - cm[12], pin.y - cm[13], pin.z - cm[14]);
    const hidAt = (x, y) => { for (const o of occ) if (o.id !== own && o.d < pd && (x - o.cx) ** 2 + (y - o.cy) ** 2 < 0.9 * o.r * o.r) return true; return false; };
    // where its leader may end (screen points, flat: x, y, x, y ...)
    const T = this._T || (this._T = []);
    T.length = 0;
    const pinOk = !!pp && !hidAt(px, py);
    if (pinOk) T.push(px, py);
    let ownR = 0;
    // (a district with a face -- the sunflower's head -- is named on its face; others on their ground)
    const hasFace = keepout.some((k) => k.id === own && k.face);
    for (const k of keepout) {
      if (k.id !== own || !(hasFace ? k.face : k.gnd)) continue;
      const rx = k.rx ?? k.r, ry = k.ry ?? k.r;
      ownR = Math.max(ownR, Math.min(rx, ry * 1.6));
      if (pinOk && Math.max(rx, ry) < 40) continue;
      for (let i = 0; i < 16; i++) {
        const t = (i / 16) * Math.PI * 2, x = k.cx + Math.cos(t) * rx * 0.8, y = k.cy + Math.sin(t) * ry * 0.8;
        if (!hidAt(x, y)) T.push(x, y);
      }
    }
    if (!T.length) { n.ci = null; return null; }
    const LEAD = mobile ? 64 : 80;
    const zone = it.ring.zone || own, EDGE = 12;
    // (only what lies within reach of a short leader can matter: a place further off is never taken)
    let tx0 = Infinity, ty0 = Infinity, tx1 = -Infinity, ty1 = -Infinity;
    for (let j = 0; j < T.length; j += 2) { tx0 = Math.min(tx0, T[j]); tx1 = Math.max(tx1, T[j]); ty0 = Math.min(ty0, T[j + 1]); ty1 = Math.max(ty1, T[j + 1]); }
    const RX0 = tx0 - LEAD - w - 8, RX1 = tx1 + LEAD + w + 8, RY0 = ty0 - LEAD - h - 8, RY1 = ty1 + LEAD + h + 8;
    const kbox = (k) => (k.rx != null ? [k.cx - k.rx - 6, k.cy - k.ry - 6, k.cx + k.rx + 6, k.cy + k.ry + 6] : k.r != null ? [k.cx - k.r, k.cy - k.r, k.cx + k.r, k.cy + k.r] : [k.x0, k.y0, k.x1, k.y1]);
    const ko = keepout.filter((k) => { const b = kbox(k); return b[2] > RX0 && b[0] < RX1 && b[3] > RY0 && b[1] < RY1; });
    // (a point inside a keep-out: an ellipse, a disc or a box)
    const inK = (x, y, k) => (k.rx != null ? ((x - k.cx) / Math.max(k.rx, 1)) ** 2 + ((y - k.cy) / Math.max(k.ry, 1)) ** 2 < 1
      : k.r != null ? (x - k.cx) ** 2 + (y - k.cy) ** 2 < k.r * k.r : x > k.x0 && x < k.x1 && y > k.y0 && y < k.y1);
    const test = (i) => {
      const wide = i >= NC, [dr, dt] = wide ? CANDS_W[i - NC] : CANDS[i];
      const lo = wide ? w0 : r0, hi = wide ? w1 : r1;
      const rr = Math.min(hi - 1, Math.max(lo + 1, r + dr));
      if (dr && Math.abs(rr - (r + dr)) > 0.5) return null;          // that step leaves the ring (or the wider band)
      const ang = th + dt / Math.max(rr, 8);
      _w.set(Math.cos(ang) * rr, a.y, Math.sin(ang) * rr);
      const q = E.project(_w, this._r);
      if (!q || q.z >= 1) return null;
      const box = { x0: q.x - w / 2, y0: q.y - h / 2, x1: q.x + w / 2, y1: q.y + h / 2, ring: zone };
      if (box.x0 < fr.x + EDGE || box.x1 > fr.x + fr.w - EDGE || box.y0 < top + 8 || box.y1 > fr.y + fr.h - 8) return null;
      if (hits(box, placed, 4)) return null;
      // its leader: to the nearest point it may end on
      let dl = Infinity, tx = px, ty = py, ex = 0, ey = 0;
      for (let j = 0; j < T.length; j += 2) {
        const x = Math.max(box.x0, Math.min(T[j], box.x1)), y = Math.max(box.y0, Math.min(T[j + 1], box.y1));
        const dd = Math.hypot(x - T[j], y - T[j + 1]);
        if (dd < dl) { dl = dd; tx = T[j]; ty = T[j + 1]; ex = x; ey = y; }
      }
      if (dl > LEAD) return { box, cover: 9, mine: 9, mg: 9, hard: 9, soft: 9, d: dl, dl, score: 99 };
      // what it would cover: a stage (its own as much as any other: a name never sits on what it names), a printed
      // name or the sunflower's face most.  Kept apart: its own district's (mine); another district's ground or face,
      // a printed name, another pill too near (hard: never); the air over another district's stage and the flows'
      // courses (soft: only where nothing clear is near)
      let mine = 0, hard = 0, soft = 0, mg = 0;
      for (const k of ko) {
        const c = cover(box, k);
        if (!c) continue;
        if (k.id === own) { mine += c * (k.w ?? 1); if (k.gnd || k.face) mg = Math.max(mg, c); }
        // (a district's ground is drawn smaller than its footprint's ellipse: a pill may lean over the outer half of
        // another's footprint, never further in -- nor over the town square's paving at all)
        else if (!k.id || k.face || (k.gnd && (c > 1.5 || k.id === 'square'))) hard += c * (k.w ?? 1);
        else soft += c * (k.w ?? 1);
      }
      for (const k of keep) soft += 0.25 * cover(box, k);
      // (no column of pills: another ring's pill never within one and a half pill heights above or below, its own
      // ring's never within half a height -- the map's names belong to their places, they are not a list)
      for (const o of placed) {
        if (!o.ring || box.x0 >= o.x1 + 6 || box.x1 <= o.x0 - 6) continue;
        const gap = Math.max(o.y0 - box.y1, box.y0 - o.y1);
        if (gap < (o.ring !== zone ? 1.5 * h : 0.6 * h)) hard += o.ring !== zone ? 1.2 : 0.6;
      }
      let d = dl;
      // (a place already on something it may never cover need not have its leader traced)
      if (hard > 1e-3) return { box, cover: mine + hard + soft, mine, mg, hard, soft, d, dl, tx, ty, ex, ey, score: mine + hard + soft + d / 120 + (wide ? 0.05 : 0) };
      if (dl > 6) {
        // never across another district's ground, a printed name or another pill; over its own district as little
        // as it can be (a pill on the near side of its stage)
        let xh = 0, xs = 0, overOwn = 0;
        for (let s = 1; s <= 9; s++) {
          const t = s / 10, x = ex + (tx - ex) * t, y = ey + (ty - ey) * t;
          let m = false, oh = false, os = false;
          for (const k of ko) { if (!inK(x, y, k)) continue; if (k.id === own) m = true; else if (!k.id || k.gnd || k.face) oh = true; else os = true; }
          if (!m && oh) xh++; else if (!m && os) xs++;
          if (m) overOwn++;
          if (!oh) for (const o of placed) if (x > o.x0 && x < o.x1 && y > o.y0 && y < o.y1) { xh++; break; }
        }
        if (xh) hard += 0.8 + 0.2 * xh;
        if (xs) soft += 0.4 + 0.1 * xs;
        d += 0.06 * d * overOwn;
      }
      // (and not lined up with a pill already placed close above or below it: pills squared off along one edge read as
      // a list; a staggered place nearby counts as a little nearer)
      for (const o of placed) if (o.ring && Math.abs(box.x0 - o.x0) < 16 && Math.max(o.y0 - box.y1, box.y0 - o.y1) < 3 * h) d += 36;
      return { box, cover: mine + hard + soft, mine, mg, hard, soft, d, dl, tx, ty, ex, ey, score: mine + hard + soft + d / 120 + (wide ? 0.05 : 0) };
    };
    let best = null, bi = -1, on = null, oi = -1, near = null, ni = -1, any = null, ai = -1;
    // (where it may sit on its own district: one that stands wider than the pill on screen, so the pill leaves most
    // of it seen)
    const onOwn = ownR > 0.55 * w;
    // its own ring first; only where that has no clear place near enough, the band beyond it
    const scan = (i0, i1) => {
      for (let i = i0; i < i1; i++) {
        const t = test(i);
        if (!t || t.dl > LEAD) continue;
        if (t.cover < 1e-3) { if (!best || t.d < best.d - 0.5) { best = t; bi = i; } }
        else if (t.hard < 1e-3) {
          if (onOwn && t.soft < 1e-3 && (!on || t.d < on.d)) { on = t; oi = i; }
          if (t.mine < 1e-3 && (!near || t.score < near.score)) { near = t; ni = i; }
          // (or leaning over the outer part of its own stage: a label touching what it names)
          if ((onOwn || t.mg <= 1.5) && (!any || t.score < any.score)) { any = t; ai = i; }
        }
      }
    };
    scan(0, NC);
    if (!best) scan(NC, NC + CANDS_W.length);
    // keep the last place while it is clear and near enough, unless a much nearer one has stayed clear a while
    if (n.ci != null && n.ci !== bi) {
      const prev = test(n.ci);
      if (prev && prev.cover < 1e-3 && prev.dl <= LEAD && (!best || prev.d - best.d < 24 || (n.better = (n.better || 0) + 1) < 24)) { best = prev; bi = n.ci; }
      else n.better = 0;
    } else n.better = 0;
    // nowhere clear near enough: on its own district where that stands large enough; else where it covers only the
    // air over another stage or a flow's course a little; else it waits (a quieter pill always waits)
    if (!best && !it.dim && on) { best = on; bi = oi; }
    if (!best && !it.dim && near) { best = near; bi = ni; }
    if (!best && !it.dim && any) { best = any; bi = ai; }
    // (such a place too is kept while it stays as good, so the pill does not hop as the map turns)
    if (best && best.cover >= 1e-3 && n.ci != null && n.ci !== bi) {
      const prev = test(n.ci);
      if (prev && prev.hard < 1e-3 && prev.dl <= LEAD && prev.score <= best.score + 0.3) { best = prev; bi = n.ci; }
    }
    if (best && it.dim && best.d > 40) best = null;
    if (!best) { n.ci = null; return null; }
    n.ci = bi; n.cost = best.cover;
    const b = best.box;
    placed.push(b);
    n.el.style.transform = `translate(${b.x0.toFixed(1)}px, ${b.y0.toFixed(1)}px)`;
    // its one-line title (shown on hover, desks): under the pill or over it, centred on it or flush with either end --
    // where it covers the least of the stages, the printed names and the pills placed, and stays on the screen
    const sub = it.sub && n.el.querySelector('.sub');
    if (sub) {
      if (!n.subW) { n.subW = sub.offsetWidth; n.subH = sub.offsetHeight; }
      const cx = (b.x0 + b.x1) / 2, sw = n.subW, sh = n.subH;
      const cost = (s) => keepout.reduce((t, k) => t + cover(s, k), 0) + (s.y0 < top || s.y1 > fr.y + fr.h || s.x0 < fr.x || s.x1 > fr.x + fr.w ? 9 : 0) + (hits(s, placed, 2) ? 3 : 0);
      let pick = null, pc = Infinity;
      for (const [v, hz, pref] of SUB_AT) {
        const y0 = v === 'up' ? b.y0 - 6 - sh : b.y1 + 6, x0 = hz === 'c' ? cx - sw / 2 : hz === 'l' ? b.x0 : b.x1 - sw;
        const c = cost({ x0, y0, x1: x0 + sw, y1: y0 + sh }) + pref;
        if (c < pc - 1e-3) { pc = c; pick = [v, hz]; }
      }
      n.el.classList.toggle('sub-up', pick[0] === 'up');
      n.el.classList.toggle('sub-l', pick[1] === 'l');
      n.el.classList.toggle('sub-r', pick[1] === 'r');
    }
    if (!pp) return { lead: null };
    return { lead: best.dl > 14 ? [best.ex, best.ey, best.tx, best.ty] : null };
  }

  /** a hotspot: a 44 px target on its object (inside the part's own outline when the module gives one), clear of
   *  every word and dot already placed by 2 px */
  _hot(n, E, it, p, fr, top, placed) {
    const el = n.el;
    const cands = [[p.x, p.y]];
    const sb = it.hit && screenBox(E, it.hit, this._r);
    if (sb) {
      // the part as drawn: its proxy's projected box, less the proxy's padding
      const iw = (sb.x1 - sb.x0) * 0.22, ih = (sb.y1 - sb.y0) * 0.22;
      const qx = Math.min(Math.max(p.x, sb.x0 + iw), sb.x1 - iw), qy = Math.min(Math.max(p.y, sb.y0 + ih), sb.y1 - ih);
      const cx = (sb.x0 + sb.x1) / 2, cy = (sb.y0 + sb.y1) / 2;
      cands[0] = [qx, qy];
      cands.push([cx, cy], [(qx + cx) / 2, (qy + cy) / 2], [cx, sb.y0 + ih], [cx, sb.y1 - ih], [sb.x0 + iw, cy], [sb.x1 - iw, cy]);
    }
    for (const [x, y] of cands) {
      const box = { x0: x - 22, y0: y - 22, x1: x + 22, y1: y + 22 };
      if (box.x0 < fr.x || box.x1 > fr.x + fr.w || box.y0 < top || box.y1 > fr.y + fr.h || hits(box, placed, 2)) continue;
      el.style.transform = `translate(${box.x0.toFixed(1)}px, ${box.y0.toFixed(1)}px)`;
      placed.push(box);
      const wEl = it.word && el.querySelector('.w');
      if (wEl) {
        if (!n.ww) n.ww = wEl.offsetWidth || 0;
        const right = { x0: box.x1 - 8, y0: y - 11, x1: box.x1 - 8 + n.ww, y1: y + 11 };
        const left = { x0: box.x0 + 8 - n.ww, y0: y - 11, x1: box.x0 + 8, y1: y + 11 };
        const fits = (b) => b.x0 >= fr.x + 2 && b.x1 <= fr.x + fr.w - 2 && !hits(b, placed, 2);
        const side = fits(right) ? 'r' : fits(left) ? 'l' : '';
        el.classList.toggle('w-left', side === 'l');
        el.classList.toggle('no-w', !side);
        if (side) placed.push(side === 'r' ? right : left);
      }
      return true;
    }
    return false;
  }

  // words on an object scale with it: 12-18 px from its projected size (up to 22 on a wide screen where the surface
  // has room), hidden below 12 px.  The surface is measured as the reader sees it: across along the camera's right,
  // up along the camera's up (a card turned to the camera is not foreshortened by the camera's elevation)
  _decal(n, E, pts, p, mobile) {
    const it = n.item;
    const unit = it.unit ?? 0.8;
    const a = pts[0];
    const m = E.camera.matrixWorld.elements;     // columns: right (0,1,2), up (4,5,6)
    const qu = E.project(_w.set(a.x + m[4] * unit, a.y + m[5] * unit, a.z + m[6] * unit), this._q);
    const px = qu ? Math.hypot(qu.x - p.x, qu.y - p.y) : 0;
    if (px < 10) return false;
    const cap = !mobile && it.size ? 22 : 18;
    let fs = Math.max(12, Math.min(18, px));
    // a surface to fit (size: [w, h] in world units): the words shrink to stay inside it, and hide below 12 px
    // rather than spill over its edges
    if (it.size) {
      const qr = E.project(_w.set(a.x + m[0] * unit, a.y + m[1] * unit, a.z + m[2] * unit), this._r);
      const perW = (qr ? Math.hypot(qr.x - p.x, qr.y - p.y) : px) / unit, perH = px / unit;
      const lines = it.rows || [it.text || ''];
      const em = (s) => [...String(s)].reduce((t, c) => t + (c.charCodeAt(0) < 0x2e80 ? 0.6 : 1), 0);
      const widest = Math.max(1, ...lines.map(em));
      const fitW = (it.size[0] * perW - 14) / widest;
      const fitH = (it.size[1] * perH) / lines.length / 1.32;
      fs = Math.min(cap, px, fitW, fitH);
      if (fs < 12) return false;
      fs = Math.round(fs * 2) / 2;
      n.fitH = (it.size[1] * perH) / lines.length;
    }
    if (n.fs !== fs) { n.el.style.fontSize = `${fs}px`; n.fs = fs; n.w = n.el.offsetWidth; n.h = n.el.offsetHeight; }
    if (it.rows && pts.length > 1) {
      // a card: one anchor per row; the block is laid out from the first row, rows follow the card's own spacing
      const ys = pts.map((v) => E.project(v, { x: 0, y: 0, z: 0 })?.y ?? p.y);
      const gap = Math.max(fs * 1.25, it.size ? Math.min(n.fitH || 0, Math.abs(ys[1] - ys[0]) || n.fitH || 0) : Math.abs(ys[1] - ys[0]));
      if (Math.abs((n.gap || 0) - gap) > 0.5) { n.el.style.setProperty('--gap', `${gap.toFixed(1)}px`); n.gap = gap; n.h = n.el.offsetHeight; }
      n.el.style.transform = `translate(${(p.x - 6).toFixed(1)}px, ${(p.y - gap / 2).toFixed(1)}px)`;
      n.box = { x0: p.x - 6, y0: p.y - gap / 2, x1: p.x - 6 + n.w, y1: p.y - gap / 2 + n.h };
    } else {
      n.el.style.transform = `translate(${(p.x - n.w / 2).toFixed(1)}px, ${(p.y - n.h / 2).toFixed(1)}px)`;
      n.box = { x0: p.x - n.w / 2, y0: p.y - n.h / 2, x1: p.x + n.w / 2, y1: p.y + n.h / 2 };
    }
    return true;
  }

  clear() { this.set([]); }
}

// what waits while the place it belongs to is not drawn yet (f.hold: a deep link during the opening)
const HELD = { hot: 1, label: 1, decal: 1, arrow: 1, flow: 1 };
const PRI = { tag: 9.5, chip: 9, decal: 8.5, label: 8, hot: 6, pill: 5, zone: 5, flow: 4, arrow: 3, letter: 1 };
const hits = (b, list, pad = 4) => list.some((o) => b.x0 < o.x1 + pad && b.x1 > o.x0 - pad && b.y0 < o.y1 + pad && b.y1 > o.y0 - pad);
// how much of a keep-out a box covers (0 = clear): a box's share of the overlap, or a disc's depth of reach
function cover(b, k) {
  if (k.rx != null) {
    // an ellipse (a stage's footprint as seen): the box's nearest point to its middle, in the ellipse's own measure
    const x = Math.max(b.x0, Math.min(k.cx, b.x1)), y = Math.max(b.y0, Math.min(k.cy, b.y1));
    // (with a few px of air round it: a pill beside a stage never touches its rim)
    const d = Math.hypot((x - k.cx) / (Math.max(k.rx, 1) + 6), (y - k.cy) / (Math.max(k.ry, 1) + 6));
    return d < 1 ? 2 - d : 0;
  }
  if (k.r != null) {
    const x = Math.max(b.x0, Math.min(k.cx, b.x1)), y = Math.max(b.y0, Math.min(k.cy, b.y1));
    const d = Math.hypot(x - k.cx, y - k.cy);
    return d < k.r ? 1 + (k.r - d) / k.r : 0;
  }
  const ox = Math.min(b.x1, k.x1) - Math.max(b.x0, k.x0), oy = Math.min(b.y1, k.y1) - Math.max(b.y0, k.y0);
  return ox > 0 && oy > 0 ? 1 + (ox * oy) / Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0)) : 0;
}
// map pills' trial places: [outward step, step along the ring] (world units); CANDS_W also beyond its own ring (the
// open water or ground of the next ring, with a leader back to the pin), where its own ring has no clear place
const CANDS = [], CANDS_W = [];
// a map pill's hover line: [under or over it, centred or flush left or right, a small preference]
const SUB_AT = [['dn', 'c', 0], ['up', 'c', 0.02], ['dn', 'l', 0.04], ['dn', 'r', 0.04], ['up', 'l', 0.06], ['up', 'r', 0.06]];
// scratch points (E.project copies its argument into a THREE.Vector3, which reads x, y, z: plain objects will do)
const pt = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
const _w = pt(), _c8 = pt();
// a mesh's world box projected to the screen (CSS px), from its geometry's own box; null when it is behind the camera
function screenBox(E, mesh, out) {
  const g = mesh.geometry;
  if (!g) return null;
  if (!g.boundingBox) g.computeBoundingBox();
  const b = g.boundingBox, m = mesh.matrixWorld.elements;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const x = i & 1 ? b.max.x : b.min.x, y = i & 2 ? b.max.y : b.min.y, z = i & 4 ? b.max.z : b.min.z;
    const wx = m[0] * x + m[4] * y + m[8] * z + m[12], wy = m[1] * x + m[5] * y + m[9] * z + m[13], wz = m[2] * x + m[6] * y + m[10] * z + m[14];
    const q = E.project(_c8.set(wx, wy, wz), out);
    if (!q) return null;
    x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
  }
  return { x0, y0, x1, y1 };
}
