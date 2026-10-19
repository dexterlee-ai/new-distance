// Everything in HTML that is pinned to the 3D scene: pills, zone lettering, labels with short leaders,
// words on objects (decals), tappable hotspots and one edge arrow.  The UI says what should be shown; this
// layer places it every frame and enforces the budgets: labels touch their objects (a leader of at most
// 48 px on a phone, 72 px on desktop) or are not shown, nothing sits under the strip or the top bar, and at
// most 12 positioned nodes are on screen.
const $ = (s, r = document) => r.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';

export class Overlay {
  constructor(root, { esc }) {
    this.root = root;
    this.esc = esc;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'ov-leaders');
    this.svg.setAttribute('aria-hidden', 'true');
    root.appendChild(this.svg);
    this.nodes = new Map();     // key → { el, kind, item, line?, dot? }
    this.items = [];
    this._p = { x: 0, y: 0, z: 0 };
    this._q = { x: 0, y: 0, z: 0 };
  }

  /**
   * @param {Array} items  { key, kind: 'pill'|'zone'|'letter'|'label'|'decal'|'hot'|'arrow'|'chip', text, at: () => Vector3|null,
   *                         onTap?, aria?, sub?, cls?, unit? (decals: world height of the text), rows? (decal rows: at() returns Vector3[]),
   *                         pri? (higher stays when over budget), dim? }
   */
  set(items) {
    this.items = items;
    const keep = new Set(items.map((i) => i.key));
    for (const [k, n] of this.nodes) if (!keep.has(k)) { n.el.remove(); n.line?.remove(); n.dot?.remove(); this.nodes.delete(k); }
    for (const it of items) {
      let n = this.nodes.get(it.key);
      if (!n || n.kind !== it.kind || n.text !== it.text || n.rowsKey !== (it.rows || []).join('|')) {
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
    if (tap) { el.type = 'button'; el.addEventListener('click', (e) => { e.stopPropagation(); it.onTap?.(e); }); }
    el.className = `ov ov-${it.kind}${it.cls ? ` ${it.cls}` : ''}`;
    const e = this.esc;
    if (it.kind === 'hot') el.innerHTML = '<span class="ring" aria-hidden="true"></span>';
    else if (it.kind === 'decal' && it.rows) {
      el.innerHTML = it.rows.map((r, i) => {
        const t = it.rowTaps?.[i];
        return t ? `<button type="button" class="row is-tap${t.on ? ' is-on' : ''}" data-part="${e(t.part)}" aria-label="${e(r.replace(/^[□■]\s*/, ''))}：${e(t.line)}">${e(r)}</button>` : `<span class="row">${e(r)}</span>`;
      }).join('');
      if (it.rowTaps?.some(Boolean)) el.addEventListener('click', (ev) => { const b = ev.target.closest('[data-part]'); if (b) { ev.stopPropagation(); it.onRow?.(b.dataset.part); } });
    }
    else if (it.kind === 'pill' || it.kind === 'zone' || it.kind === 'chip') el.innerHTML = `<span class="t">${e(it.text)}</span>${tap && it.kind !== 'chip' ? '<span class="chev" aria-hidden="true">›</span>' : ''}${it.sub ? `<span class="sub">${e(it.sub)}</span>` : ''}`;
    else if (it.kind === 'arrow') el.innerHTML = `<svg class="dir" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M2.5 8h10M8.8 4.2 12.6 8l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="t">${e(it.text)}</span>`;
    else el.textContent = it.text;
    if (it.aria) el.setAttribute('aria-label', it.aria);
    else if (it.kind === 'hot') el.setAttribute('aria-label', it.text);
    if (!tap && !it.rowTaps?.some(Boolean)) el.setAttribute('aria-hidden', 'true');
    this.root.appendChild(el);
    const n = { el, kind: it.kind, text: it.text, rowsKey: (it.rows || []).join('|'), w: 0, h: 0 };
    if (it.kind === 'label') {
      n.line = document.createElementNS(NS, 'line');
      n.dot = document.createElementNS(NS, 'circle');
      n.dot.setAttribute('r', '2.2');
      this.svg.append(n.line, n.dot);
    }
    return n;
  }

  /** measure again on the next frame (fonts, resize) */
  remeasure() { for (const n of this.nodes.values()) n.w = n.h = 0; }

  /**
   * @param {Engine} E
   * @param {object} f  { free: {x,y,w,h} (the world's free rect), top: px under the top bar, mobile, subject: {x0,y0,x1,y1}|null }
   */
  frame(E, f) {
    const mobile = f.mobile;
    const maxLead = mobile ? 48 : 72;
    const placed = [];   // screen boxes already taken this frame (for labels and pills)
    let count = 0, nb = 0;
    const nbMax = mobile ? 3 : 6;   // neighbours' pills in a district
    const order = [...this.nodes.values()].sort((a, b) => (b.item.pri ?? PRI[b.kind]) - (a.item.pri ?? PRI[a.kind]));
    const fr = f.free;
    const inFree = (x, y, m = 0) => x >= fr.x + m && x <= fr.x + fr.w - m && y >= fr.y + m && y <= fr.y + fr.h - m;
    for (const n of order) {
      const it = n.item;
      const el = n.el;
      let show = false;
      if (!n.w) { n.w = el.offsetWidth; n.h = el.offsetHeight; }
      const w = n.w, h = n.h;
      if (it.kind === 'arrow') {
        // pinned to the edge of the free rect in the direction of an off-screen subject (not while reading:
        // the half sheet covers the picture on purpose)
        const a = !f.reading && it.at && it.at();
        const p = a && E.project(a, this._p);
        if (p && !inFree(p.x, p.y)) {
          const cx = fr.x + fr.w / 2, cy = fr.y + fr.h / 2;
          const dx = p.x - cx, dy = p.y - cy;
          const s = Math.min((fr.w / 2 - w / 2 - 10) / Math.max(1e-3, Math.abs(dx)), (fr.h / 2 - h / 2 - 10) / Math.max(1e-3, Math.abs(dy)));
          const x = cx + dx * s, y = cy + dy * s;
          el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px)`;
          $('.dir', el).style.transform = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
          placed.push({ x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 });
          show = true;
        }
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
          if (it.kind === 'label') show = this._label(n, p, w, h, fr, maxLead, placed, f.subject);
          else if (it.kind === 'decal') {
            show = this._decal(n, E, pts, p);
            if (show && n.box) placed.push(n.box);
          } else if (it.kind === 'hot') {
            // a 44 px target, wholly inside the visible world, clear of every word and dot already placed
            const box = { x0: p.x - 22, y0: p.y - 22, x1: p.x + 22, y1: p.y + 22 };
            if (box.x0 >= fr.x && box.x1 <= fr.x + fr.w && box.y0 >= fr.y && box.y1 <= fr.y + fr.h && !hits(box, placed, 0)) {
              el.style.transform = `translate(${box.x0.toFixed(1)}px, ${box.y0.toFixed(1)}px)`;
              placed.push(box);
              show = true;
            }
          } else {
            // pills sit on their place (no leader); near an edge they are slid inward rather than lost; a pill that
            // would overlap one already placed waits
            const cx = Math.min(Math.max(p.x, fr.x + w / 2 + 4), fr.x + fr.w - w / 2 - 4);
            const box = { x0: cx - w / 2, y0: p.y - h / 2, x1: cx + w / 2, y1: p.y + h / 2 };
            const sub = f.subject;
            const overSubject = it.kind === 'pill' && it.dim && sub && box.x1 > sub.x0 && box.x0 < sub.x1 && box.y1 > sub.y0 && box.y0 < sub.y1;
            if (!overSubject && box.y0 >= fr.y && box.y1 <= fr.y + fr.h && box.x0 >= fr.x && box.x1 <= fr.x + fr.w && (it.kind === 'letter' || !hits(box, placed))) {
              el.style.transform = `translate(${box.x0.toFixed(1)}px, ${box.y0.toFixed(1)}px)`;
              if (it.kind !== 'letter') placed.push(box);
              show = true;
            }
          }
        }
      }
      if (show && it.kind !== 'letter' && count >= 12) show = false;
      if (show && it.dim && it.kind === 'pill') { if (nb >= nbMax) show = false; else nb++; }
      if (show && it.kind !== 'letter') count++;
      el.classList.toggle('off', !show);
      if (el.tagName === 'BUTTON') el.tabIndex = show ? 0 : -1;
      if (n.line) { const d = show ? '' : 'none'; n.line.style.display = d; n.dot.style.display = d; }
    }
  }

  // a label on the free side nearest its object, its leader ending on a dot on the object
  _label(n, p, w, h, fr, maxLead, placed, subject) {
    const cands = [[0, -1], [1, -0.6], [-1, -0.6], [1, 0.4], [-1, 0.4], [0, 1]];
    const lead = 26;
    for (const [sx, sy] of cands) {
      const cx = p.x + sx * (w / 2 + lead * 0.7), cy = p.y + sy * (h / 2 + lead);
      const box = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
      if (box.x0 < fr.x + 4 || box.x1 > fr.x + fr.w - 4 || box.y0 < fr.y + 4 || box.y1 > fr.y + fr.h - 4) continue;
      if (hits(box, placed)) continue;
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

  // words on an object scale with it: 12–18 px from its projected size, hidden below 12 px
  _decal(n, E, pts, p) {
    const it = n.item;
    const unit = it.unit ?? 0.8;
    const a = pts[0];
    const q = E.project(_up(a, unit), this._q);
    const px = q ? Math.abs(q.y - p.y) : 0;
    if (px < 10) return false;
    const fs = Math.max(12, Math.min(18, px));
    if (n.fs !== fs) { n.el.style.fontSize = `${fs}px`; n.fs = fs; n.w = n.el.offsetWidth; n.h = n.el.offsetHeight; }
    if (it.rows && pts.length > 1) {
      // a card: one anchor per row; the block is laid out from the first row, rows follow the card's own spacing
      const ys = pts.map((v) => E.project(v, { x: 0, y: 0, z: 0 })?.y ?? p.y);
      const gap = Math.max(fs * 1.25, Math.abs(ys[1] - ys[0]));
      if (Math.abs((n.gap || 0) - gap) > 0.5) { n.el.style.setProperty('--gap', `${gap.toFixed(1)}px`); n.gap = gap; }
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

const PRI = { arrow: 9, chip: 9, decal: 8.5, label: 8, hot: 6, pill: 5, zone: 5, letter: 1 };
const hits = (b, list, pad = 4) => list.some((o) => b.x0 < o.x1 + pad && b.x1 > o.x0 - pad && b.y0 < o.y1 + pad && b.y1 > o.y0 - pad);
// a point `d` above v, without allocating: the decal's own height in world units
function _up(v, d) {
  if (!_up.v) _up.v = v.clone();
  return _up.v.set(v.x, v.y + d, v.z);
}
