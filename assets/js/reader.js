// Full-text reader: renders an article's verbatim blocks (data/a/NN.json) as an editorial page,
// with its place in the world on the side: district, concept, the line it is built on, and where to go next.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const CH = { people: 'People', model: 'Model', ai: 'AI', intro: 'Prologue' };

const cache = new Map();
export async function loadArticle(n) {
  const id = String(n).padStart(2, '0');
  // a failed fetch is not kept: the next attempt goes back to the network
  if (!cache.has(id)) {
    cache.set(id, fetch(`data/a/${id}.json`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch((e) => { cache.delete(id); throw e; }));
  }
  return cache.get(id);
}

// ctx.refs collects the footnote numbers used in the text, so each gets one anchor to come back to
function runs(rs, ctx) {
  return (rs || []).map((r) => {
    if (r.fn) {
      const n = String(r.n ?? '');
      const first = ctx && !ctx.refs.has(n);
      if (first) ctx.refs.add(n);
      return `<sup><a href="#note-${esc(n)}" data-note="${esc(n)}"${first ? ` id="ref-${esc(n)}"` : ''} aria-label="註解 ${esc(n)}">${esc(n)}</a></sup>`;
    }
    const t = esc(r.t);
    return r.b ? `<strong>${t}</strong>` : t;
  }).join('');
}

function block(b, ctx, depth = 0) {
  const hl = ctx.hl && b.id === ctx.hl ? ' class="hl" id="core-line"' : '';
  switch (b.t) {
    case 'p': return `<p data-b="${esc(b.id)}"${hl}>${runs(b.runs, ctx)}</p>`;
    case 'h2': return `<h2>${esc(b.text)}</h2>`;
    case 'h3': return `<h3>${esc(b.text)}</h3>`;
    case 'quote': return `<p class="pull"${hl}>${esc(b.text)}</p>`;
    case 'cap': return `<p class="tagline">${esc(b.text)}</p>`;
    case 'tag': {
      // bylines inside the flow repeat the header; keep only other tags
      if (depth === 0 && ctx.authorNames.some((nm) => nm && b.text.includes(nm))) return '';
      return `<p class="tagline">${esc(b.text)}</p>`;
    }
    case 'ul': return `<ul>${b.items.map((li) => `<li>${runs(li.runs, ctx)}</li>`).join('')}</ul>`;
    case 'fig': {
      const src = `assets/img/fig/${encodeURIComponent(b.src)}`;
      return `<figure><img src="${src}" width="${b.w}" height="${b.h}" loading="lazy" decoding="async" alt="${esc(b.title || '文章圖表')}">
        <figcaption>${esc(b.title)}${b.source ? `<span class="src">資料來源：${esc(b.source)}</span>` : ''}</figcaption></figure>`;
    }
    case 'aside': return `<div class="aside">${b.title ? `<h4>${esc(b.title)}</h4>` : ''}${(b.kids || []).map((k) => block(k, ctx, depth + 1)).join('')}</div>`;
    case 'li': return `<p>${runs(b.runs, ctx)}</p>`;
    default: return b.runs ? `<p>${runs(b.runs, ctx)}</p>` : (b.text ? `<p>${esc(b.text)}</p>` : '');
  }
}

// notes: the source sometimes keeps the original "註解N" label, markdown "label](url)" links,
// several URLs run together and HTML-escaped ampersands
const NOTE_LABEL = /^\s*註解\s*([0-9]+)(?:\s*[、,，]\s*[0-9]+)*\s*/;
const URL_RE = /https?:\/\/[^\s<>"'）」]+?(?=https?:\/\/|[\s<>"'）」]|$)/g;
function linkify(t) {
  let out = '', last = 0;
  for (const m of t.matchAll(URL_RE)) {
    let u = m[0];
    // punctuation right after a URL belongs to the sentence
    const trail = (u.match(/[.,;:。，、；：)\]]+$/) || [''])[0];
    if (trail) u = u.slice(0, -trail.length);
    out += `${esc(t.slice(last, m.index))}<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>${esc(trail)}`;
    last = m.index + m[0].length;
  }
  return out + esc(t.slice(last));
}

function noteItem(nt, i, ctx) {
  const raw = String(nt.t || '').replace(/&amp;/g, '&');
  const lab = raw.match(NOTE_LABEL);
  const num = nt.n != null && nt.n !== '' ? String(nt.n) : lab ? lab[1] : String(i + 1);
  let id = `note-${num}`;
  if (ctx.ids.has(id)) id = `${id}-${i + 1}`;
  ctx.ids.add(id);
  const t = raw.replace(NOTE_LABEL, '')
    .replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '$1 $2')
    .replace(/\]\((https?:\/\/[^)\s]+)\)/g, ' $1');
  const back = ctx.refs.has(num) && id === `note-${num}`
    ? ` <a class="nb" href="#ref-${esc(num)}" data-ref="${esc(num)}" aria-label="回到內文的註解標記 ${esc(num)}">回到內文</a>` : '';
  return `<li id="${esc(id)}"><b class="nn">${esc(nt.label || num)}</b><span class="nt">${linkify(t)}${back}</span></li>`;
}

/**
 * @returns html string for the reader sheet
 * ctx: { meta (index article), concept (world article), district, ring, route: {next}, related: [{n,title,why}],
 *        stop: {i, name} when the article is a stop on the reader's route, back: label of the top-left button,
 *        see: label of the side link into the district }
 */
export function renderReader(a, ctx) {
  const m = ctx.meta;
  const authorNames = m.authors.flatMap((x) => [x.zh, x.en]).filter(Boolean);
  const c = ctx.concept;
  const rc = { hl: c.quote.id, authorNames, refs: new Set(), ids: new Set() };
  const body = a.flow.map((b) => block(b, rc)).join('');
  const ed = a.editor;
  const edHtml = ed ? `<section class="ed" aria-labelledby="ed-h">
      <h2 class="ed-h" id="ed-h">編輯部導讀</h2>
      ${(ed.intro || []).map((p) => `<p>${esc(p)}</p>`).join('')}
      ${ed.points?.length ? `<details><summary>三個重點</summary>${ed.points.map((p) => `<div class="pt"><b>${esc(p.title)}</b><p>${esc(p.body)}</p></div>`).join('')}</details>` : ''}
    </section>` : '';
  const heads = a.flow.filter((b) => b.t === 'h2').slice(0, 9);
  const toc = heads.length ? `<nav class="box" aria-labelledby="toc-h"><h2 class="box-h" id="toc-h">段落</h2><ol>${heads.map((h, i) => `<li><a href="#" data-h="${i}">${esc(h.text.replace(/\n/g, ' '))}</a></li>`).join('')}</ol></nav>` : '';
  const pages = m.pages ? `p.${m.pages[0]}–${m.pages[1]}` : '';
  const notes = a.notes?.length ? `<section class="notes" aria-labelledby="notes-h"><h2 class="sec-h" id="notes-h">註解</h2><ol class="notes-l">${a.notes.map((nt, i) => noteItem(nt, i, rc)).join('')}</ol></section>` : '';
  const home = ctx.stop ? `回到路線第 ${ctx.stop.i + 1} 站：${esc(ctx.stop.name)}` : `回到「${esc(ctx.district.name)}」`;
  return `
  <div class="sheet-top">
    <button type="button" class="back" data-act="back">← ${esc(ctx.back || '回到世界')}</button>
    <div class="where">No.${esc(m.id)} · ${esc(ctx.district.name)} · ${esc(ctx.ring.name)}</div>
    <div>${ctx.route.next ? `<button type="button" class="btn-text" data-read="${ctx.route.next.n}">下一篇 →</button>` : ''}</div>
    <div class="progress" id="read-progress"></div>
  </div>
  <article class="rd">
    <div class="rd-main">
      <header>
        <div class="kick"><span class="chtag ch-${esc(m.ch)}">${esc(CH[m.ch] || m.ch)}</span>No.${esc(m.id)}${m.kicker ? ` · ${esc(m.kicker)}` : ''}</div>
        <h1 id="rd-h">${esc(m.title)}</h1>
        ${m.sub ? `<p class="subt">${esc(m.sub)}</p>` : ''}
        <div class="authors">${m.authors.map((x) => `<div><b>${esc(x.zh || x.en)}</b>${x.zh && x.en ? `<span>${esc(x.en)}｜</span>` : ''}<span>${esc(x.role)}</span></div>`).join('')}</div>
        <div class="facts">${pages} · 約 ${esc(m.minutes)} 分鐘 · ${esc(m.chars.toLocaleString())} 字</div>
      </header>
      ${edHtml}
      <div class="body">${body}</div>
      ${notes}
      <nav class="endnav" aria-label="接下來">
        <p class="fine">全文依原刊收錄；圖表取自原刊版面。</p>
        ${ctx.route.next ? `<button type="button" class="btn btn-ink" data-read="${ctx.route.next.n}">下一篇：${esc(ctx.route.next.title)} <span class="arr">→</span></button>` : ''}
        <button type="button" class="btn btn-line" data-act="show-district">${home}</button>
      </nav>
    </div>
    <aside aria-label="這篇在世界裡的位置">
      <div class="box">
        <h2 class="box-h">在世界裡</h2>
        <p><b>${esc(ctx.ring.name)}</b>｜與人的距離 ${esc(ctx.ring.dist)}<br>${esc(ctx.district.name)}：${esc(ctx.district.title)}</p>
        <p class="core">${esc(c.coreName)}——${esc(c.core)}</p>
        <p><button type="button" data-act="jump-core">跳到這個概念的原句</button></p>
        <p><button type="button" data-act="show-district">${ctx.stop ? home : esc(ctx.see || '在世界中看它運作')}</button></p>
      </div>
      ${toc}
      ${ctx.related.length ? `<div class="box"><h2 class="box-h">相連的文章</h2>${ctx.related.map((r) => `<p><button type="button" data-read="${r.n}">${esc(r.title)}</button><br>${esc(r.why)}</p>`).join('')}</div>` : ''}
    </aside>
  </article>`;
}
