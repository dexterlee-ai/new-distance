// The full text: the printed pages themselves, turned one spread at a time, with zoom.
import { ARTICLES } from './articles.js';
import { SECTION_NAMES, SECTION_COLORS, FIRST_PAGE, LAST_PAGE } from './data.js';

const RATIO = 1043 / 1389; // one printed page, width / height
const src = (p) => (p === 0 ? 'print/cover.webp' : `print/p${String(p).padStart(3, '0')}.webp`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const articleAt = (p) => ARTICLES.find((a) => p >= a.pages[0] && p <= a.pages[1]) || null;

export function createReader(root, { onClose, onPlay, sceneFor, sound }) {
  let open = false, single = false, unit = 0, units = [], zoom = 1, tx = 0, ty = 0, base = { w: 0, h: 0 }, flipping = false;
  root.innerHTML = `
    <div class="rbar">
      <button class="back">← 回立體書</button>
      <button class="toc">目錄</button>
      <div class="where"><b></b><small></small></div>
      <span class="pg"></span>
      <button class="zo" aria-label="縮小">−</button><button class="zi" aria-label="放大">＋</button>
    </div>
    <div class="rmain">
      <nav class="rtoc" aria-label="文章目錄"></nav>
      <div class="rstage">
        <div class="spread"><img class="pgL" alt=""><img class="pgR" alt=""><div class="gut"></div></div>
        <button class="rnav pv" aria-label="上一頁"><span class="ico" data-i="left"></span></button>
        <button class="rnav nx" aria-label="下一頁"><span class="ico" data-i="right"></span></button>
      </div>
    </div>
    <div class="rfoot"><span class="pos"></span><input type="range" min="0" value="0" step="1" aria-label="翻到第幾頁"><button class="play"></button></div>`;
  const q = (s) => root.querySelector(s), stageEl = q('.rstage'), spread = q('.spread'), L = q('.pgL'), R = q('.pgR'), range = q('input[type=range]');

  const toc = q('.rtoc'); let html = '';
  for (const ch of ['intro', 'people', 'model', 'ai']) {
    html += `<h4 style="--c:${SECTION_COLORS[ch]}">${SECTION_NAMES[ch]}</h4>`;
    for (const a of ARTICLES.filter((x) => x.ch === ch)) html += `<button data-n="${a.n}"><em>${String(a.n).padStart(2, '0')}</em>${esc(a.title)}<small>${esc(a.authors.map((x) => x.zh || x.en).join('、'))}｜p.${a.pages[0]}–${a.pages[1]}</small></button>`;
  }
  toc.innerHTML = html;

  function layout() {
    single = stageEl.clientWidth < 760;
    units = [[0]]; if (single) for (let p = FIRST_PAGE; p <= LAST_PAGE; p++) units.push([p]); else for (let p = FIRST_PAGE; p <= LAST_PAGE; p += 2) units.push([p, p + 1]);
    range.max = units.length - 1;
    const sw = stageEl.clientWidth * .94, sh = stageEl.clientHeight * .95, n = single ? 1 : 2;
    const h = Math.min(sh, sw / (n * RATIO)); base = { w: h * RATIO * n, h };
    spread.style.height = h + 'px'; spread.classList.toggle('single', single);
  }
  const unitOf = (p) => (p <= 0 ? 0 : single ? clamp(p - FIRST_PAGE + 1, 1, units.length - 1) : clamp(1 + Math.floor((p - FIRST_PAGE) / 2), 1, units.length - 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function apply() {
    const sw = stageEl.clientWidth, sh = stageEl.clientHeight, w = (units[unit].length === 1 ? base.w / (single ? 1 : 2) : base.w) * zoom, h = base.h * zoom;
    const mx = Math.max(0, (w - sw) / 2 + 30), my = Math.max(0, (h - sh) / 2 + 30); tx = clamp(tx, -mx, mx); ty = clamp(ty, -my, my);
    spread.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`; spread.style.transformOrigin = '50% 50%'; stageEl.classList.toggle('zoomed', zoom > 1.01);
  }
  function paint() {
    const u = units[unit]; L.src = src(u[0]); L.alt = u[0] ? `原刊第 ${u[0]} 頁` : '封面';
    if (u[1]) { R.hidden = false; R.src = src(u[1]); R.alt = `原刊第 ${u[1]} 頁`; } else R.hidden = true;
    for (const d of [-1, 1]) { const v = units[unit + d]; if (v) v.forEach((p) => { new Image().src = src(p); }); }
    const art = articleAt(u[0]) || articleAt(u[1] || -1);
    q('.where b').textContent = art ? `第 ${art.n} 篇｜${art.title}${art.sub ? '：' + art.sub : ''}` : u[0] === 0 ? '決策智慧 2026｜Agentic 時代：重塑品牌與人的真實距離' : '決策智慧 2026';
    q('.where small').textContent = art ? art.authors.map((x) => `${x.zh || x.en}（${x.role}）`).join('、') : 'dentsu Taiwan 出版';
    q('.pg').textContent = u[0] === 0 ? '封面' : `p.${u[0]}${u[1] ? '–' + u[1] : ''} / ${LAST_PAGE}`; q('.pos').textContent = u[0] === 0 ? 'COVER' : `P.${u[0]}`;
    range.value = unit; q('.pv').disabled = unit === 0; q('.nx').disabled = unit === units.length - 1;
    toc.querySelectorAll('button').forEach((b) => b.classList.toggle('on', art && Number(b.dataset.n) === art.n));
    const sc = art && sceneFor(art.n), pb = q('.play'); pb.hidden = !sc; if (sc) { pb.textContent = `玩這一篇的立體頁：${sc.short} →`; pb.dataset.scene = sc.id; }
  }
  function go(to, animate = true) {
    to = clamp(to, 0, units.length - 1); if (to === unit || flipping) return;
    const from = unit, fwd = to > from; zoom = 1; tx = ty = 0; apply();
    const canFlip = animate && !single && units[from].length === 2 && units[to].length === 2 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    sound?.('turn');
    if (!canFlip) { unit = to; paint(); return; }
    flipping = true; const f = document.createElement('div'); f.className = 'flipper ' + (fwd ? 'fwd' : 'rev');
    f.innerHTML = fwd ? `<img src="${src(units[from][1])}" alt=""><img class="bk" src="${src(units[to][0])}" alt="">` : `<img src="${src(units[from][0])}" alt=""><img class="bk" src="${src(units[to][1])}" alt="">`;
    if (fwd) R.src = src(units[to][1]); else L.src = src(units[to][0]);
    spread.appendChild(f); f.addEventListener('animationend', () => { unit = to; paint(); f.remove(); flipping = false; }, { once: true });
  }

  // zoom and pan
  function zoomAt(z, cx, cy) { const r = stageEl.getBoundingClientRect(), px = cx - r.left - r.width / 2, py = cy - r.top - r.height / 2, k = z / zoom; tx = px - (px - tx) * k; ty = py - (py - ty) * k; zoom = z; if (zoom <= 1.01) { zoom = 1; tx = ty = 0; } apply(); }
  let drag = null;
  stageEl.addEventListener('pointerdown', (e) => { if (e.target.closest('.rnav')) return; drag = { x: e.clientX, y: e.clientY, tx, ty, moved: false }; stageEl.setPointerCapture(e.pointerId); });
  stageEl.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 6) drag.moved = true; if (zoom > 1.01 && drag.moved) { tx = drag.tx + dx; ty = drag.ty + dy; stageEl.classList.add('drag'); apply(); } });
  stageEl.addEventListener('pointerup', (e) => {
    const d = drag; drag = null; stageEl.classList.remove('drag'); if (!d || e.target.closest('.rnav')) return;
    if (!d.moved) zoomAt(zoom > 1.01 ? 1 : 2.4, e.clientX, e.clientY);
    else if (zoom <= 1.01 && Math.abs(e.clientX - d.x) > 60 && Math.abs(e.clientY - d.y) < 80) go(unit + (e.clientX < d.x ? 1 : -1));
  });
  stageEl.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(clamp(zoom * (e.deltaY > 0 ? .88 : 1.14), 1, 4.5), e.clientX, e.clientY); }, { passive: false });
  q('.zi').onclick = () => { const r = stageEl.getBoundingClientRect(); zoomAt(clamp(zoom * 1.4, 1, 4.5), r.left + r.width / 2, r.top + r.height / 2); };
  q('.zo').onclick = () => { const r = stageEl.getBoundingClientRect(); zoomAt(clamp(zoom / 1.4, 1, 4.5), r.left + r.width / 2, r.top + r.height / 2); };
  q('.pv').onclick = () => go(unit - 1); q('.nx').onclick = () => go(unit + 1);
  range.oninput = () => go(Number(range.value), false);
  q('.back').onclick = () => api.close(); q('.toc').onclick = () => root.classList.toggle('toc');
  q('.play').onclick = (e) => { const id = e.currentTarget.dataset.scene; api.close(); onPlay(id); };
  toc.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; root.classList.remove('toc'); go(unitOf(ARTICLES.find((a) => a.n === Number(b.dataset.n)).pages[0]), false); };
  addEventListener('keydown', (e) => { if (!open) return; if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(unit + 1); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(unit - 1); } else if (e.key === 'Escape') api.close(); });
  new ResizeObserver(() => { if (!open) return; const p = units[unit]?.[0] ?? 0; layout(); unit = unitOf(p); zoom = 1; tx = ty = 0; apply(); paint(); }).observe(stageEl);

  const api = {
    get isOpen() { return open; },
    /** open at a printed page (0 = cover) */
    open(page = 0) { open = true; root.hidden = false; layout(); unit = unitOf(page); zoom = 1; tx = ty = 0; apply(); paint(); q('.back').focus(); },
    close() { if (!open) return; open = false; root.hidden = true; root.classList.remove('toc'); onClose?.(); },
    page() { return units[unit]?.[0] ?? 0; },
  };
  return api;
}
