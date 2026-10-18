// Personal route: role × industry × focus → the articles that matter most to this reader,
// grouped into district stops and ordered as a journey inward — shore → agent sea → heartland → the people core.
// Every route ends at the core: whatever you came for, the book's answer starts with understanding people.

/**
 * Contract (ui.js relies on it):
 * - planRoute(W, profile) → Stop[]: the first stop is always on the 'shore' ring, every ring is crossed
 *   (shore → sea → heart) and the last stop is always 'core'.
 * - reasons(W, n, profile) → string[] of plain text; never empty for an article on the route, core stop included.
 * - decodeProfile(str, W) → Profile; an id that is not in W.profile.roles / industries / focus becomes null.
 * - encodeProfile(profile) → 'role.industry.focus', '-' for a missing answer.
 * Data: world.json articles[n].cases is [{ t: '<case name>', ind: ['<industry id>', ...] }]. A plain string
 * (older builds) carries no industry and is never cited as an industry's case.
 *
 * @typedef {{ role: ?string, industry: ?string, focus: ?string }} Profile
 * @typedef {{ id: string, articles: number[], score: number }} Stop
 */

export const RING_ORDER = { shore: 0, sea: 1, heart: 2, core: 3 };
export const ANGLE = { judge: 200, under: 232, foundry: 288, oracle: 330, gates: 75, trust: 300, memory: 25, market: 120, core: 0 };
// the district that answers each focus — ui.js previews it while the reader chooses, so the route must visit it
export const FOCUS_HOME = { trust: 'trust', memory: 'memory', choice: 'oracle', cx: 'gates', judgment: 'judge', production: 'foundry', insight: 'core' };

// tag 3 = the article is about it, 2 = it matters here, 1 = mentioned. Convex, so a generalist with many 2s
// cannot outrank the article that is really about the reader's role or focus.
const LEVEL = [0, 0.4, 1.4, 3];
const RINGS = ['shore', 'sea', 'heart'];

// own properties only: profile ids come from the URL, and 'constructor' must not reach Object.prototype
const own = (o, k) => (o && k != null && Object.hasOwn(o, k) ? o[k] : undefined);
const tag = (o, k) => { const v = own(o, k); return Number.isInteger(v) ? Math.max(0, Math.min(3, v)) : 0; };
const tagged = (a, ind) => Array.isArray(a.industries) && a.industries.includes(ind);

/** names of the article's cases that come from industry `ind` (plain-string cases have no industry) */
function casesFor(a, ind) {
  return (Array.isArray(a.cases) ? a.cases : [])
    .filter((c) => c && typeof c.t === 'string' && Array.isArray(c.ind) && c.ind.includes(ind))
    .map((c) => c.t);
}
const inIndustry = (a, ind) => tagged(a, ind) || casesFor(a, ind).length > 0;

/**
 * A copy of p that keeps only ids found in W.profile; anything else becomes null.
 * @param {object} W world.json
 * @param {object} p
 * @returns {Profile}
 */
export function cleanProfile(W, p) {
  const ok = (list, x) => (typeof x === 'string' && (W?.profile?.[list] || []).some((o) => o.id === x) ? x : null);
  return { role: ok('roles', p?.role), industry: ok('industries', p?.industry), focus: ok('focus', p?.focus) };
}

/**
 * How well article a answers profile p (expects ids already checked against W.profile).
 * @param {object} a world.json article
 * @param {Profile} p
 * @returns {number}
 */
export function scoreArticle(a, p) {
  let s = 0;
  if (p.role) s += 2.2 * LEVEL[tag(a.roles, p.role)];
  if (p.focus) s += 2.6 * LEVEL[tag(a.focus, p.focus)];
  if (p.industry && p.industry !== 'all') {
    if (inIndustry(a, p.industry)) s += 2.4;
    else if (tagged(a, 'all')) s += 0.5;
  } else if (tagged(a, 'all')) s += 0.8;
  return s;
}

/**
 * The reader's route: up to `size` articles off the core (one more when that is what it takes to cross
 * every ring), grouped by district, outer rings first, then the core stop with both core articles.
 * @param {object} W world.json
 * @param {object} profile
 * @param {{ size?: number }} [opts]
 * @returns {Stop[]}
 */
export function planRoute(W, profile, { size = 5 } = {}) {
  const p = cleanProfile(W, profile);
  const districtsById = Object.fromEntries(W.districts.map((d) => [d.id, d]));
  const ringOf = (a) => own(districtsById, a.district)?.ring;
  // equal scores: the stronger focus tag, then the stronger role tag, and only then the article number
  const scored = Object.values(W.articles).map((a) => ({ a, s: scoreArticle(a, p) })).sort((x, y) =>
    y.s - x.s || tag(y.a.focus, p.focus) - tag(x.a.focus, p.focus) || tag(y.a.roles, p.role) - tag(x.a.roles, p.role) || x.a.n - y.a.n);
  scored.forEach((o, i) => { o.rank = i; });
  const pool = scored.filter(({ a }) => a.district !== 'core' && RINGS.includes(ringOf(a)));
  const chosen = [];
  const perDistrict = {};
  const has = (n) => chosen.some((c) => c.n === n);
  const free = ({ a }) => !has(a.n) && (perDistrict[a.district] || 0) < 2;
  const take = ({ a, s, rank }) => { chosen.push({ n: a.n, s, rank }); perDistrict[a.district] = (perDistrict[a.district] || 0) + 1; };

  // 1) promises, in priority order, each kept by the best-scoring article that keeps it:
  //    the focus's own district · an article about the reader's role · a case from the reader's industry
  //    (an article tagged with it when no case is) · a stop on every ring, so the route starts from the shore
  const home = own(FOCUS_HOME, p.focus);
  const ind = p.industry && p.industry !== 'all' ? p.industry : null;
  const needs = [
    home && home !== 'core' ? [(a) => a.district === home] : null,
    p.role ? [(a) => tag(a.roles, p.role) >= 3] : null,
    ind ? [(a) => casesFor(a, ind).length > 0, (a) => tagged(a, ind)] : null,
    ...RINGS.map((r) => [(a) => ringOf(a) === r]),
  ].filter(Boolean);
  for (const alts of needs) {
    if (chosen.length >= size) break;
    const need = alts.find((q) => pool.some(({ a }) => q(a)));
    if (!need || chosen.some((c) => need(W.articles[c.n]))) continue;
    const o = pool.find((x) => free(x) && need(x.a));
    if (o) take(o);
  }
  // 2) the remaining places by score, at most two articles per district
  for (const o of pool) { if (chosen.length >= size) break; if (free(o)) take(o); }
  // 3) a ring still missing gets its best article as an extra stop — no pick is dropped to make room
  for (const r of RINGS) {
    if (chosen.some((c) => ringOf(W.articles[c.n]) === r)) continue;
    const o = pool.find((x) => !has(x.a.n) && ringOf(x.a) === r);
    if (o) take(o);
  }
  chosen.sort((x, y) => x.rank - y.rank);

  // the core stop: the better-matching of People Model (12) and its framing essay (2), plus the other as an extra
  const coreArts = scored.filter(({ a }) => a.district === 'core');
  const stops = {};
  for (const c of chosen) {
    const d = W.articles[c.n].district;
    (stops[d] ||= { id: d, articles: [], score: 0 }).articles.push(c.n);
    stops[d].score += c.s;
  }
  const list = Object.values(stops);
  // order: outer rings first; within a ring follow the shortest way round from the previous stop
  const ordered = [];
  for (const ring of RINGS) {
    const inRing = list.filter((s) => districtsById[s.id].ring === ring);
    while (inRing.length) {
      const prev = ordered.length ? ANGLE[ordered[ordered.length - 1].id] : ANGLE[inRing[0].id];
      inRing.sort((x, y) => angGap(prev, ANGLE[x.id]) - angGap(prev, ANGLE[y.id]));
      ordered.push(inRing.shift());
    }
  }
  ordered.push({ id: 'core', articles: coreArts.map(({ a }) => a.n), score: coreArts[0]?.s || 0 });
  return ordered;
}

const angGap = (a, b) => Math.abs(((b - a + 540) % 360) - 180);

/**
 * Why article n is on this reader's route — only reasons that are true for the article. Industry cases are
 * cited only when they come from the reader's industry (at most two); otherwise the industry stands alone.
 * @param {object} W world.json
 * @param {number} n article number
 * @param {object} profile
 * @returns {string[]}
 */
export function reasons(W, n, profile) {
  const a = own(W.articles, n);
  if (!a) return [];
  const p = cleanProfile(W, profile);
  const lab = (list, id) => (W.profile[list].find((x) => x.id === id) || {}).label;
  const out = [];
  if (p.role && tag(a.roles, p.role) >= 2) out.push(lab('roles', p.role));
  if (p.focus && tag(a.focus, p.focus) >= 2) out.push(lab('focus', p.focus));
  if (p.industry && p.industry !== 'all' && inIndustry(a, p.industry)) {
    const cases = casesFor(a, p.industry).slice(0, 2);
    out.push(lab('industries', p.industry) + (cases.length ? `（案例：${cases.join('／')}）` : ''));
  }
  if (!out.length) {
    const d = W.districts.find((x) => x.id === a.district);
    const ring = d && W.rings.find((r) => r.id === d.ring);
    if (a.district === 'core') out.push(`每條路線的終點：${ring?.name || '人之核'}`);
    else out.push(ring ? `路線必經：${ring.name}（${ring.verbs}）` : '路線必經的一站');
  }
  return out;
}

/** @param {Profile} p @returns {string} */
export function encodeProfile(p) { return [p.role || '-', p.industry || '-', p.focus || '-'].join('.'); }

/**
 * Parse 'role.industry.focus' from a URL. With W, ids outside W.profile become null; without it (legacy
 * callers) only lowercase id-shaped values that are not Object.prototype keys survive.
 * @param {string} s
 * @param {object} [W] world.json
 * @returns {Profile}
 */
export function decodeProfile(s, W) {
  const [role, industry, focus] = (typeof s === 'string' ? s : '').split('.');
  const v = (x) => (x && x !== '-' ? x : null);
  const raw = { role: v(role), industry: v(industry), focus: v(focus) };
  if (W) return cleanProfile(W, raw);
  const idish = (x) => (x && /^[a-z]{1,24}$/.test(x) && !(x in {}) ? x : null);
  return { role: idish(raw.role), industry: idish(raw.industry), focus: idish(raw.focus) };
}
