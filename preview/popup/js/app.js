// The page furniture around the book: title, captions, buttons, map, outcome card, reader. It drives the stage and the scenes.
import { createStage } from './stage.js';
import { buildScene } from './kit.js';
import { ARTICLES } from './articles.js';
import { LANDS, ORDER } from './data.js';
import { createReader } from './reader.js';
import { makeSound } from './sound.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const art = (n) => ARTICLES.find((a) => a.n === n);
const names = (a) => a.authors.map((x) => x.zh || x.en).join('、');
const STORE = 'dw-popup-v1';
const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } })();
const stamps = new Set(Array.isArray(saved.stamps) ? saved.stamps : []);
const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ stamps: [...stamps], sound: sound.on })); } catch { /* private mode */ } };
const params = new URLSearchParams(location.search);

const sound = makeSound(); sound.on = saved.sound !== false;
const appEl = $('#app'), stage = createStage($('#world'));
let hintText = '';
let toastTimer = 0, cardAt = null, cardGo = null, prev = 0, focusX = null, dockLater = null;
let defs = [], kits = [], cur = 0, busy = false, hoverId = null, bubbleAt = null, bubbleTimer = 0, hintAt = null, opened = false;

function placeholder(o, i) {
  return { id: o.id, land: o.land, title: '這一頁還在摺。', kicker: '', sources: [], takeaway: '', short: '建造中',
    ground(G) { G.wash('#efe2bf').text('這一頁還在摺', 0, 0, { size: .5, col: '#bfa97a' }); }, build() {} , plate: 'PLATE ' + String(i).padStart(2, '0') };
}
async function loadDefs() {
  const out = await Promise.all(ORDER.map(async (o, i) => { try { const m = await import(`./scenes/${o.id}.js`); return { ...o, ...m.default }; } catch (e) { console.warn('scene missing', o.id, e); return placeholder(o, i); } }));
  out.forEach((d, i) => { d.no = i; d.folio ||= `${LANDS[d.land].en} · ${LANDS[d.land].name}`; d.plate ||= i ? 'PLATE ' + String(i).padStart(2, '0') : 'FOLD-OUT MAP'; });
  return out;
}
const app = {
  refresh(S) { if (S.index === cur) renderDock(S); },
  bubble(pos, text, { cite = '', dur = 4.2, who = '' } = {}) {
    const b = $('#bubble'); b.innerHTML = (who ? `<b>${esc(who)}</b>` : '') + esc(text) + (cite ? `<cite>${esc(cite)}</cite>` : ''); b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    bubbleAt = pos.clone(); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { b.hidden = true; bubbleAt = null; }, dur * 1000 + text.length * 45);
  },
  hint(fn, text = '') { hintAt = fn; hintText = fn ? text : ''; const h = $('#hint'); h.hidden = !fn; h.querySelector('span').textContent = text; h.classList.toggle('worded', Boolean(text)); },
  focus(x) { focusX = x; },
  sound(n) { sound.play(n); },
  toast(text, dur = 1.8) { const t = $('#toast'); t.textContent = text; t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, dur * 1000); },
  /** a small paper card standing over a point of the picture; null hides it. data = {kicker, title, note, button}; go() runs when its button is pressed */
  card(pos, data, goFn) {
    const c = $('#card'); if (!pos) { c.hidden = true; cardAt = null; cardGo = null; return; }
    c.innerHTML = `<b>${esc(data.kicker || '')}</b><p>${esc(data.title || '')}</p>${data.note ? `<small>${esc(data.note)}</small>` : ''}${data.button ? `<button>${esc(data.button)}</button>` : ''}`;
    c.hidden = false; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; cardAt = pos.clone(); cardGo = goFn || null;
  },
  /** the spread the reader was on before this one */
  from() { return prev; },
  nudge(id) { const b = $('#actions').querySelector(`[data-act="${id}"]`); if (!b) return; b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); sound.play('soft'); },
  accent(land) { return LANDS[land].color; },
  hoverId() { return hoverId; },
  complete(S) {
    const d = S.def, first = !stamps.has(d.id); stamps.add(d.id); save(); renderDots(); sound.play('stamp'); setTimeout(() => sound.play('done'), 260);
    stage.burst(new stage.T.Vector3(0, 2.6, 0), { n: first ? 70 : 34, speed: 4.2, up: 5.2, life: 2.2, colors: [LANDS[d.land].color, '#fff3d6', '#e8b84e', '#cf5a3e'] });
    setTimeout(() => { if (cur === S.index) renderOutcome(S); }, 1700);
    announce(`這一頁讀懂了：${d.takeaway || d.title}`);
  },
  go(id) { const i = typeof id === 'number' ? id : defs.findIndex((d) => d.id === id); if (i >= 0) go(i); },
  stamps, defs: () => defs,
  read(n) { openReader(n ? art(n).pages[0] : 0); },
};

function ensure(i) { if (!kits[i]) kits[i] = buildScene(defs[i], i, stage, app); return kits[i]; }
function announce(t) { $('#announce').textContent = t; }

// ---------------------------------------------------------------- furniture
function renderChapter(i) {
  const d = defs[i], land = LANDS[d.land], ch = $('#chapter'); appEl.dataset.land = d.land;
  ch.classList.add('swap');
  setTimeout(() => {
    $('#eyebrow').textContent = i === 0 ? `${land.en} · ${land.name}` : `${land.en} · ${land.name} · 第 ${i}／${defs.length - 1} 頁`;
    $('#heading').textContent = d.title; $('#heading').classList.toggle('long', [...d.title].length > 9);
    ch.classList.remove('swap');
  }, 260);
  $('#counter').textContent = i === 0 ? 'MAP' : String(i).padStart(2, '0') + ' / ' + String(defs.length - 1).padStart(2, '0');
  $('#btnPrev').disabled = i === 0; $('#btnNext').disabled = i === defs.length - 1;
  document.title = (i ? d.short || d.title : '地圖') + '｜決策智慧 立體書';
  renderDots();
}
function renderDots() {
  const el = $('#dots'); let h = '', prev = null;
  defs.forEach((d, i) => { if (prev && prev !== d.land) h += '<span class="gap"></span>'; prev = d.land;
    h += `<button class="${i === 0 ? 'map ' : ''}${i === cur ? 'on ' : ''}${stamps.has(d.id) ? 'done' : ''}" style="--c:${LANDS[d.land].color}" data-i="${i}" aria-label="${i ? '第 ' + i + ' 頁：' + esc(d.short || d.title) : '地圖'}" title="${i ? esc(d.short || d.title) : '地圖'}"><i></i></button>`; });
  el.innerHTML = h;
}
let lastCaption = '';
function renderDock(S) {
  const v = S.view(), cap = v.label === '先看' ? '' : (v.caption || ''), t = $('#capText');
  $('#dock').classList.toggle('silent', !cap);
  if (cap !== lastCaption) { lastCaption = cap; t.textContent = cap; t.classList.remove('flip'); void t.offsetWidth; t.classList.add('flip'); }
  const key = JSON.stringify(v.buttons || []), box = $('#actions');
  // a button that is being held must not be swapped out from under the finger: redraw once it is let go
  if (box.dataset.key !== key && box.querySelector('.held')) { dockLater = S; return; }
  if (box.dataset.key !== key) { box.dataset.key = key; box.innerHTML = (v.buttons || []).map((b) => `<button data-act="${esc(b.id)}" class="${b.primary ? 'primary' : b.quiet ? 'quiet' : ''}" ${b.hold ? 'data-hold="1"' : ''} ${b.disabled ? 'disabled' : ''}>${esc(b.label)}</button>`).join(''); }
}
function renderOutcome(S) {
  const d = S.def, o = $('#outcome'), q = d.quote, qa = q && art(q.n), next = defs[S.index + 1];
  o.innerHTML = `<button class="x" aria-label="收起">×</button>
    <div class="stamp"><span>讀懂了<small>${esc(LANDS[d.land].en)} ${String(S.index).padStart(2, '0')}</small></span></div>
    ${d.diary ? `<p class="asked">${esc(d.title)}</p>` : ''}<h3>${d.diary ? '小智的日記' : '這一頁在說'}</h3><p class="take">${d.diary ? '今天學到：' + esc(d.diary) : esc(d.takeaway || d.title)}</p>
    ${d.diary && d.takeaway ? `<p class="say">${esc(d.takeaway)}</p>` : ''}
    ${q ? `<blockquote>${esc(q.t)}</blockquote><cite>第 ${qa.n} 篇〈${esc(qa.title)}〉${esc(names(qa))}，p.${q.page}</cite>` : ''}
    <h3>翻開原文</h3><div class="reads">${(d.sources || []).map((s) => { const a = art(s.n); return `<button data-read="${a.n}"><em>第 ${a.n} 篇</em><span>${esc(a.title)}<small>${esc(names(a))}</small></span><u>p.${a.pages[0]} →</u></button>`; }).join('')}</div>
    <div class="row"><button class="again">再玩一次</button>${next ? `<button class="next">下一頁 →</button>` : `<button class="next" data-map="1">回地圖</button>`}</div>`;
  o.hidden = false;
}
function hideOutcome() { $('#outcome').hidden = true; }

const sparks = Array.from({ length: 10 }, () => { const i = document.createElement('i'); i.className = 'spark'; i.hidden = true; $('#app').appendChild(i); return i; });
let sparkOn = false;
stage.afterFrame(() => {
  const pts = sparkOn && opened && !busy && !stage.turning && !reader.isOpen && kits[cur] && !defs[cur].calm ? kits[cur]._sparks() : [];
  sparks.forEach((el, i) => { const p = pts[i]; if (!p) { el.hidden = true; return; } const s = stage.project(p); el.hidden = false; el.style.transform = `translate(${s.x}px, ${s.y}px)`; el.style.animationDelay = (i * -.37) + 's'; });
  if (cardAt) { const p = stage.project(cardAt), c = $('#card'); c.style.left = Math.max(170, Math.min(innerWidth - 170, p.x)) + 'px'; c.style.top = Math.max(190, p.y - 10) + 'px'; c.style.visibility = stage.turning ? 'hidden' : 'visible'; }
  if (bubbleAt) { const p = stage.project(bubbleAt), b = $('#bubble'); b.style.left = Math.max(150, Math.min(innerWidth - 150, p.x)) + 'px'; b.style.top = Math.max(130, p.y - 14) + 'px'; }
  stage.view.focusTo = stage.turning ? 0 : focusX != null ? Math.max(-3, Math.min(3, focusX)) : hintAt ? Math.max(-2.7, Math.min(2.7, hintAt().x)) : stage.view.focusTo;
  if (hintAt) { const p = stage.project(hintAt()), h = $('#hint'); h.style.transform = `translate(${p.x}px, ${p.y}px)`; h.style.visibility = stage.turning ? 'hidden' : 'visible'; }
});
stage.pickables = () => (opened && kits[cur] && !busy ? kits[cur].props : []);
stage.onTap = (hit) => { $('#tip').hidden = true; if (!hit) { $('#bubble').hidden = true; bubbleAt = null; return; } sound.play('tap'); kits[cur]._tap(hit); };
stage.onPage = (dir) => { if (opened) go(cur + dir); };
// a page picked up by hand: the scene pauses while the leaf is in the air, and resumes if the page is put back
stage.onGrab = (dir) => { const i = cur + dir; if (!opened || busy || reader.isOpen || i < 0 || i >= defs.length) return -1; ensure(i); busy = true; kits[cur]._pause(true); hideOutcome(); $('#bubble').hidden = true; bubbleAt = null; $('#tip').hidden = true; sound.play('turn'); return i; };
stage.onDrop = (done, i) => {
  busy = false;
  if (!done) { kits[cur]._pause(false); app.refresh(kits[cur]); return; }
  kits[cur]._leave(); clearDock(); prev = cur; cur = i; renderChapter(i); sound.play('rise'); history.replaceState(null, '', '#/' + (i ? i : 'map')); kits[i]._enter(); announce(defs[i].title);
};
function clearDock() { $('#toast').hidden = true; app.card(null); $('#actions').innerHTML = ''; $('#actions').dataset.key = ''; $('#capText').textContent = ''; lastCaption = ''; $('#dock').classList.add('silent'); }
let tipTimer = 0;
stage.onHover = (hit, ev) => { hoverId = hit ? hit.id : null; const tip = $('#tip'); clearTimeout(tipTimer); if (hit && hit.label && ev && hit.label !== hintText && !ev.buttons) { tip.textContent = hit.label; tip.hidden = false; tip.style.left = ev.clientX + 'px'; tip.style.top = ev.clientY + 'px'; tipTimer = setTimeout(() => { tip.hidden = true; }, 2600); } else tip.hidden = true; };

// ---------------------------------------------------------------- moving through the book
async function go(i, { instant = false } = {}) {
  if (busy || i === cur || i < 0 || i >= defs.length) return; busy = true;
  ensure(i); kits[cur]?._leave(); hideOutcome(); $('#bubble').hidden = true; bubbleAt = null; $('#tip').hidden = true;
  clearDock();
  const from = cur; prev = cur; cur = i; renderChapter(i); sound.play('turn'); setTimeout(() => sound.play('rise'), 1150);
  if (instant || stage.still.matches) { stage.show(i); stage.setLift(stage.spreads[i], 1); } else await stage.turnTo(i);
  busy = false; history.replaceState(null, '', '#/' + (i ? i : 'map')); kits[i]._enter(); announce(defs[i].title); sparkOn = false; setTimeout(() => { sparkOn = true; }, 2600);
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300)); idle(() => { for (const k of [i + 1, i - 1]) if (defs[k] && !kits[k] && !busy) { ensure(k); break; } });
  return from;
}

const reader = createReader($('#reader'), {
  sound: (n) => sound.play(n),
  sceneFor: (n) => { const d = defs.find((x) => x.no > 0 && x.sources?.some((s) => s.n === n)); return d ? { id: d.id, short: d.short || d.title } : null; },
  onPlay: (id) => setTimeout(() => app.go(id), 500),
  onClose: async () => { stage.pause(false); $('#app').style.visibility = ''; await Promise.all([stage.flatten(0, .7), stage.rise(1.1)]); },
});
async function openReader(page) {
  if (reader.isOpen) return; if (!opened) { opened = true; $('#cover').classList.add('gone'); }
  $('#bubble').hidden = true; bubbleAt = null; sound.play('whoosh');
  await Promise.all([stage.fold(.5), stage.flatten(1, .6)]);
  reader.open(page); stage.pause(true);
}

// ---------------------------------------------------------------- wiring
$('#actions').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || busy || b.dataset.hold) return; sound.play('tap'); kits[cur].run(b.dataset.act); });
// a button marked hold: true is pressed and held: the scene gets run(id, 'down') and then run(id, 'up')
$('#actions').addEventListener('pointerdown', (e) => { const b = e.target.closest('button[data-hold]'); if (!b || busy) return; b.setPointerCapture(e.pointerId); b.classList.add('held'); sound.play('tap'); kits[cur].run(b.dataset.act, 'down'); });
const dockFlush = () => { if (dockLater) { const S = dockLater; dockLater = null; app.refresh(S); } };
for (const ev of ['pointerup', 'pointercancel']) $('#actions').addEventListener(ev, (e) => { const b = e.target.closest('button[data-hold]'); if (!b || !b.classList.contains('held')) return; b.classList.remove('held'); kits[cur].run(b.dataset.act, 'up'); dockFlush(); });
$('#actions').addEventListener('keydown', (e) => { const b = e.target.closest('button[data-hold]'); if (b && (e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); b.classList.add('held'); kits[cur].run(b.dataset.act, 'down'); } });
$('#actions').addEventListener('keyup', (e) => { const b = e.target.closest('button[data-hold]'); if (b && b.classList.contains('held')) { b.classList.remove('held'); kits[cur].run(b.dataset.act, 'up'); dockFlush(); } });
$('#outcome').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.classList.contains('x')) hideOutcome(); else if (b.dataset.read) openReader(art(Number(b.dataset.read)).pages[0]);
  else if (b.classList.contains('again')) { hideOutcome(); kits[cur]._enter(); } else if (b.dataset.map) go(0); else if (b.classList.contains('next')) go(cur + 1);
});
$('#card').addEventListener('click', (e) => { if (e.target.closest('button') && cardGo && !busy) { sound.play('tap'); cardGo(); } });
$('#world').addEventListener('pointerdown', () => { $('#tip').hidden = true; });
$('#dots').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(Number(b.dataset.i)); });
$('#btnPrev').onclick = () => go(cur - 1); $('#btnNext').onclick = () => go(cur + 1);
$('#btnMap').onclick = $('#btnHome').onclick = () => go(0);
$('#btnView').onclick = () => stage.resetView();
$('#btnRead').onclick = () => { const s = defs[cur].sources?.[0]; openReader(s ? art(s.n).pages[0] : 0); };
const sb = $('#btnSound'); sb.setAttribute('aria-pressed', sound.on); sb.onclick = () => { sound.on = !sound.on; sb.setAttribute('aria-pressed', sound.on); save(); sound.play('pop'); };
addEventListener('keydown', (e) => {
  if (reader.isOpen || !opened || e.target.closest?.('input,textarea')) return;
  if (e.key === 'Enter' && !e.target.closest?.('button,a')) { const b = $('#card:not([hidden]) button') || $('#actions button.primary:not(:disabled)'); if (b) { e.preventDefault(); b.click(); } return; }
  if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1); else if (e.key === 'm' || e.key === 'M') go(0); else if (e.key === 'r' || e.key === 'R') stage.resetView();
});

async function open(startAt = 0) {
  if (opened) return; opened = true; $('#cover').classList.add('gone'); sound.play('rise');
  if (startAt > 0) { ensure(startAt); cur = startAt; stage.show(startAt); renderChapter(startAt); }
  await Promise.all([stage.flatten(0, 1.5), stage.rise(1.7)]); kits[cur]._enter(); setTimeout(() => { sparkOn = true; }, 2600);
}

(async function boot() {
  defs = await loadDefs();
  try { await Promise.all([document.fonts.load('700 32px "DW Sans"', '決策'), document.fonts.load('900 32px "DW Serif"', '決策'), document.fonts.load('500 16px "IBM Plex Mono"', 'PLATE')]); } catch { /* system fonts will do */ }
  ensure(0); stage.show(0); stage.view.flat = 1; renderChapter(0);
  $('#loading').textContent = '抓著書頁可以翻頁　·　拖桌面轉動視角';
  const m = location.hash.match(/^#\/(\d+)/), want = Number(params.get('s') ?? (m ? m[1] : 0)) || 0;
  $('#btnOpen').onclick = () => open(0); $('#btnOpenRead').onclick = () => openReader(0);
  if (params.has('still')) document.documentElement.classList.add('still');
  if (params.has('s') || m) { $('#cover').style.display = 'none'; open(Math.min(want, defs.length - 1)); }
  window.__popup = { app, stage, kits, defs, go, ensure, reader, state: () => ({ cur, busy, opened, turning: stage.turning, view: kits[cur]?.view(), found: kits[cur] ? [...kits[cur].found] : [] }) };
})();
