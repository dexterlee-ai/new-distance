"""Build the 3D world edition's data from the shared publication data + the world curation layer.

Usage:  python tools/build_world.py          (then, when it asks for it: python tools/subset_fonts.py <font dir>)
Inputs:  site/data/index.json, site/data/a/NN.json      (verbatim publication data, shared with the other edition)
         site/assets/img/fig/*.webp                     (figures cropped from the printed PDF)
         tools/world_curation/districts.json            (zones, map, interface strings, districts, profile vocabulary;
                                                         the redesigned districts carry the v2 copy: beats, labels,
                                                         decals, taps, lever, terms, quote, note — hand-written)
         tools/world_curation/concepts_A.json / _B.json (per-article concept extraction, quotes verified verbatim)
         tools/world_curation/notes_fix.json            (footnote order and numbers as printed, for the articles whose
                                                         shared data has them duplicated, missing or out of order; and
                                                         the few printed markers whose correct source is certain)
         world/assets/fonts/NotoSansTC-sub.woff2        (read only: its cmap must cover every character drawn)
         tools/world_curation/font_fallback.json        (written by subset_fonts.py: characters Noto Sans TC lacks)
         world/index.html, world/assets/js/*.js, world/assets/css/*.css   (read only: the interface strings)
Outputs: world/data/index.json, world/data/a/NN.json, world/assets/img/fig/*.webp, world/data/world.json
         Nothing is written unless every check passes; each file is written to a temporary name and then renamed.

The script stops when any of these checks fails:
- every quote used by the world (district quotes and per-article concept quotes) appears verbatim in its article;
- every 「…」 of 8 characters or more in the curation prose (link reasons, concept texts, district lines and steps)
  appears verbatim in one of the articles it speaks about;
- every footnote marker in an article (aside and list blocks included) has exactly one note with that number,
  and note numbers are unique;
- every case industry, article industry and profile tag uses the profile vocabulary;
- zones, map and interface strings: every district sits in exactly one zone, in reading order, with a pill and a panel
  line whose article numbers are the district's; the map sentence and intro lines are captions (≤ 18 字);
- v2 copy (the districts that have "beats"; design_system.md §6.1, §9.1, §11.2 and pilot CONTRACTS §5), counted as
  every character except spaces (a Latin letter, digit or punctuation mark counts 1):
  caption ≤ 18 (beats, lever question and outcomes), title ≤ 15, label ≤ 8, decal ≤ 8, card row ≤ 10, idea ≤ 40,
  tap line ≤ 18, 1–3 book terms with a gloss ≤ 40, ≤ 6 decals shown in any one beat and at the end state (a decal
  may list the beats it shows in, "beats", plus "rest"; without a list it counts in every beat and at the end; a
  decal of one lever option, "lever", counts with the others), ≤ 3 labels per beat and at the end state, the reading
  layer (idea, terms, glosses, quote, note) ≤ 220;
  every beat, label, tap, lever outcome and term names source blocks that exist in the cited article; every beat's
  micro-cite names one of its source articles and the page of one of those blocks; the quote is verbatim in the block
  it names, on the page it names; every 「…」 run (any length) is verbatim in the district's articles; every number in
  in-scene copy carries its unit (a currency sign before a price is its unit; a decal marked "ordinal" may carry a
  one-digit position mark such as a gate's or a source's number, and still names its source block); no English
  framework term inside the 3D (labels, decals: only AI and Agent);
  illustrative words (illus) need a 示意 note; beat numbers are in range; lever default and keys are consistent;
  a decal with a number names its source block; one decal per part and one label per part and beat;
- banned words (之塔 之橋 之地 之岸 之層 之核, 「代理」 on its own, 世界, 動態, 遲疑, 它如何運作, 畫面怎麼看, 「畫面：」)
  anywhere in v2 copy, pills, panel lines, zone names, the map and the interface strings, and in the rest of the
  curation that reaches the screen (every district's title, line and steps; the opening page's name, question and
  note; ring names, verbs and descriptions; profile labels) — verbatim article titles and verbatim quotes (the quote,
  and 「…」 runs found in the articles) are exempt;
- fonts: every character the build would write (world/data/*.json, world/data/a/*.json) and every character of the
  interface strings (index.html, JS string literals, CSS strings) is in NotoSansTC-sub.woff2's cmap, unless
  font_fallback.json records that Noto Sans TC itself does not have it — an exemption for verbatim book text and
  (with a printed note) the interface files; copy written for the world (v2 copy, pills, panel lines, zone names,
  the map, ui strings) gets none.
Beat numbers are 1-based in districts.json (as in the specs) and 0-based in world.json (labels, taps, decal beats,
lever.fromBeat).
"""
import copy, json, os, re, shutil, sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SITE, WORLD, CUR = (os.path.join(ROOT, p) for p in ('site', 'world', os.path.join('tools', 'world_curation')))
FULLWIDTH_DIGITS = str.maketrans('０１２３４５６７８９', '0123456789')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import subset_fonts  # noqa: E402  (the shared definition of which characters the site draws)


def load(p):
    return json.load(open(p, encoding='utf-8'))


errors = []


def fail(msg):
    """record a failed check; the build stops after all checks have run"""
    errors.append(msg)


def walk(blocks):
    """every block of a flow, parents first, including aside kids and list items"""
    for b in blocks:
        yield b
        yield from walk(b.get('kids') or [])
        yield from walk(b.get('items') or [])


def block_text(b):
    """the block's own text; footnote markers are left out so a quote can run across them"""
    if 'runs' in b:
        return ''.join(r.get('t', '') for r in b['runs'] if not r.get('fn'))
    return b.get('text', '') or ''


# ---- read the shared publication data (nothing under world/ is written until every check has passed)
index = load(os.path.join(SITE, 'data', 'index.json'))
arts = {n: load(os.path.join(SITE, 'data', 'a', f'{n:02d}.json')) for n in range(1, 23)}
cur = load(os.path.join(CUR, 'districts.json'))
concepts = {c['n']: c for c in load(os.path.join(CUR, 'concepts_A.json')) + load(os.path.join(CUR, 'concepts_B.json'))}
notes_fix = {int(k): v for k, v in load(os.path.join(CUR, 'notes_fix.json')).items() if not k.startswith('_')}

# ---- footnotes: printed order and numbers, then one note per marker
NOTE_LABEL = re.compile(r'註解\s*([0-9０-９]+(?:\s*[、,，]\s*[0-9０-９]+)*)[\t ]*')


def fix_notes(n, art):
    src = art.get('notes') or []
    fix = notes_fix.get(n)
    if fix:
        out, used = [], set()
        for e in fix['notes']:
            i = e['src']
            if not 0 <= i < len(src) or i in used:
                fail(f'notes_fix: article {n} uses source note {i} twice or out of range')
                continue
            if e['has'] not in src[i]['t']:
                fail(f'notes_fix: article {n} source note {i} does not contain {e["has"]!r}')
            used.add(i)
            out.append({'n': e['n'], 't': src[i]['t']})
        if len(used) != len(src):
            fail(f'notes_fix: article {n} drops source notes {sorted(set(range(len(src))) - used)}')
        src = out
    for m in (fix or {}).get('markers', []):
        # a printed marker whose source is certain from the content: renumbered, the printed number kept as 'printed'
        hits = []
        for b in walk(art['flow']):
            if b.get('id') != m['block']:
                continue
            rs = b.get('runs') or []
            for i, r in enumerate(rs):
                before = ''.join(x.get('t', '') for x in rs[:i] if not x.get('fn'))
                if r.get('fn') and str(r.get('n')) == str(m['printed']) and before.endswith(m['after']):
                    hits.append(r)
        if len(hits) != 1:
            fail(f'notes_fix: article {n} marker {m["printed"]} after {m["after"]!r} in {m["block"]} found {len(hits)} times')
            continue
        hits[0].update(n=str(m['n']), t=str(m['n']), printed=str(m['printed']))
        fixed_markers.append((n, m['printed'], m['n']))
    notes = []
    for x in src:
        nt = {'n': x['n'], 't': x['t'].replace('&amp;', '&')}
        m = NOTE_LABEL.match(nt['t'])
        if m:  # the printed 「註解N」 label is authoritative: it must name n; the text keeps only the source
            nums = [int(d.translate(FULLWIDTH_DIGITS)) for d in re.split(r'\s*[、,，]\s*', m.group(1))]
            if nt['n'] not in nums:
                fail(f'article {n}: note printed as 註解{m.group(1)} is numbered {nt["n"]}')
            nt['t'] = nt['t'][m.end():]
            if nums != [nt['n']]:
                nt['label'] = '、'.join(map(str, nums))
        notes.append(nt)
    ns = [x['n'] for x in notes]
    if any(type(k) is not int for k in ns):
        fail(f'article {n}: note without a number: {ns}')
    dup = sorted({k for k in ns if ns.count(k) > 1})
    if dup:
        fail(f'article {n}: note numbers used twice: {dup}')
    have = {str(k) for k in ns}
    markers = 0
    for b in walk(art['flow']):
        for r in b.get('runs') or []:
            if r.get('fn'):
                markers += 1
                if str(r.get('n')) not in have:
                    fail(f'article {n}: footnote marker {r.get("n")} in block {b.get("id")} has no note (notes {ns})')
    art['notes'] = notes
    return markers


fixed_markers = []
markers = sum(fix_notes(n, arts[n]) for n in range(1, 23))

# ---- verbatim checks
TEXTS = {n: [t for b in walk(a['flow']) for t in (block_text(b), b.get('title') or '', b.get('source') or '') if t]
         for n, a in arts.items()}
BLOCKS = {n: {b['id']: b for b in walk(a['flow']) if b.get('id')} for n, a in arts.items()}
TITLES = sorted({a['title'] for a in index['articles'] if a.get('title')}, key=len, reverse=True)


def find_quote(n, text):
    """return (block id, page) of the block containing text verbatim"""
    for b in walk(arts[n]['flow']):
        if text in block_text(b):
            return b.get('id'), b.get('pg')
    fail(f'quote not found verbatim in article {n}: {text}')
    return None, None


def corner_quotes(s):
    """every 「…」 span in s, nested ones included"""
    out, stack = [], []
    for i, ch in enumerate(s):
        if ch == '「':
            stack.append(i)
        elif ch == '」' and stack:
            out.append(s[stack.pop() + 1:i])
    return out


def verbatim_in(q, ns):
    return any(q in t for k in ns for t in TEXTS[k])


quoted = 0


def check_quoted(where, s, ns, min_len=8):
    global quoted
    for q in corner_quotes(s or ''):
        if len(q) < min_len:
            continue
        quoted += 1
        if not verbatim_in(q, ns):
            fail(f'{where}: 「{q}」 is not verbatim in article {" or ".join(map(str, ns))}')


# ---- vocabulary checks
VOCAB = {k: {x['id'] for x in cur['profile'][k]} for k in ('roles', 'industries', 'focus')}
CASE_IND = VOCAB['industries'] - {'all'}  # 'all' means "any industry"; a case always comes from a real one


def check_tags(n, c):
    for k in ('roles', 'focus'):
        bad = {t: v for t, v in c[k].items() if t not in VOCAB[k] or v not in (0, 1, 2, 3)}
        if bad or set(c[k]) != VOCAB[k]:
            fail(f'article {n}: {k} must tag every id of the profile with 0–3 (bad: {bad})')
    bad = [i for i in c['industries'] if i not in VOCAB['industries']]
    if bad:
        fail(f'article {n}: unknown industries {bad}')
    for case in c['cases']:
        if not (isinstance(case, dict) and isinstance(case.get('t'), str) and case['t'] and isinstance(case.get('ind'), list)):
            fail(f'article {n}: a case must be {{"t": name, "ind": [industry ids]}}: {case!r}')
            continue
        bad = [i for i in case['ind'] if i not in CASE_IND]
        if bad or len(set(case['ind'])) != len(case['ind']):
            fail(f'article {n}: case {case["t"]!r} has bad industry ids {case["ind"]}')
    for link in c['links']:
        if link['to'] not in arts or link['to'] == n:
            fail(f'article {n}: link to {link["to"]}')


# ---- v2 copy: budgets, sources, units, banned words (design_system.md §6.1, §8.3, §9.1, §11.2; CONTRACTS §5)
def zi(s):
    """the system's count: every character except spaces"""
    return sum(1 for c in s if not c.isspace())


BUDGET = {'cap': 30, 'title': 20, 'label': 8, 'decal': 8, 'row': 10, 'idea': 40, 'tap': 30, 'gloss': 40}
IN_SCENE = {'cap', 'title', 'label', 'decal', 'row', 'tap'}   # numbers here must carry their unit
IN_3D = {'label', 'decal', 'row'}                              # no English framework terms here
LATIN_OK_3D = {'AI', 'Agent'}
BANNED = [(re.compile(p), name) for p, name in (
    (r'之[塔橋地岸層核]', '之塔／之橋／之地／之岸／之層／之核'), (r'(?<![取替])代理(?!商)', '「代理」 on its own'),
    (r'世界', '世界'), (r'動態', '動態'), (r'遲疑', '遲疑'), (r'它如何運作', '它如何運作'),
    (r'畫面怎麼看', '畫面怎麼看'), (r'畫面：', '「畫面：」'))]
NUM = re.compile(r'\d[\d,]*(?:\.\d+)?')
UNITS = set('%％篇位歲個份倍年月日次人款張步秒分頁項家天時萬億元種層圈道名國成折點週站句字號段杯塊題')
NUM_JOIN = set('至到～~–-、／/')
SRC_GROUP = re.compile(r'^(\d{1,2})\s+(b\d+(?:\s*,\s*b\d+)*)$')
CITE = re.compile(r'^第 (\d{1,2}) 篇 p\.(\d+)$')
PANEL_ARTS = re.compile(r'第 ([\d、]+) 篇$')
PLACEHOLDER = re.compile(r'\{\w+\}')


def parse_src(where, s):
    """'12 b19, b20; 02 b23' → [(12, 'b19', page), …]; every block must exist in its article"""
    refs = []
    if not isinstance(s, str) or not s.strip():
        fail(f'{where}: no source block id')
        return refs
    for g in s.split(';'):
        m = SRC_GROUP.match(g.strip())
        if not m:
            fail(f'{where}: source {s!r} is not of the form "NN bX, bY; NN bZ"')
            continue
        n = int(m.group(1))
        if n not in arts:
            fail(f'{where}: source {s!r} names article {n}, which does not exist')
            continue
        for bid in re.split(r'\s*,\s*', m.group(2)):
            b = BLOCKS[n].get(bid)
            if b is None:
                fail(f'{where}: block {bid} does not exist in article {n}')
            else:
                refs.append((n, bid, b.get('pg')))
    return refs


def strip_exempt(s, ns, quote_text=None):
    """s without what is exempt from the banned-word check: verbatim 「…」 runs, verbatim article titles, the quote"""
    if quote_text and s == quote_text:
        return ''
    for q in sorted(corner_quotes(s), key=len, reverse=True):
        if q and verbatim_in(q, ns):
            s = s.replace(f'「{q}」', '')
    for t in TITLES:
        s = s.replace(t, '')
    return s


def check_banned(where, s, ns=(), quote_text=None):
    rest = strip_exempt(s, ns, quote_text)
    for rx, name in BANNED:
        m = rx.search(rest)
        if m:
            fail(f'{where}: banned word {name} in {s!r}')


CURRENCY = ('NT$', '$', '＄')


def check_units(where, s, ordinal=False):
    for m in NUM.finditer(s):
        if s[max(0, m.start() - 2):m.start()] == 'p.':
            continue  # a page number
        if s[:m.start()].endswith(CURRENCY):
            continue  # a price: the currency sign in front is its unit
        if ordinal and re.fullmatch(r'[1-9]', m.group()):
            continue  # a position mark on an object (gate 1, 來源 2), not a quantity
        if re.search(r'(?:相關係數|滿分)\s*(?:達|為|是)?\s*$', s[:m.start()]):
            continue  # a correlation coefficient (相關係數 0.89) and its full mark (滿分 1) have no unit
        rest = s[m.end():].lstrip()
        if rest[:1] in ('多', '餘', '幾'):
            rest = rest[1:]
        if rest[:1] and rest[0] in UNITS:
            continue
        if rest[:1] and rest[0] in NUM_JOIN and re.match(r'\s*\d', rest[1:]):
            continue  # 40 至 44 歲: the unit comes after the second number
        fail(f'{where}: the number {m.group()} in {s!r} has no unit')


CURATED = []  # (where, text) of copy written for the world, not quoted from the book: it may not need a system font


def check_copy(where, kind, s, ns, quote_text=None, ordinal=False):
    """one string of v2 copy: budget, 「…」 verbatim (any length), banned words, units, 3D Latin"""
    if not isinstance(s, str) or not s.strip():
        fail(f'{where}: empty {kind}')
        return
    if kind != 'quote':
        CURATED.append((where, s, ns))
    if kind in BUDGET and zi(s) > BUDGET[kind]:
        fail(f'{where}: {kind} {s!r} is {zi(s)} 字, over {BUDGET[kind]}')
    if kind != 'quote':
        check_quoted(where, s, ns, min_len=1)
    check_banned(where, s, ns, quote_text)
    if kind in IN_SCENE:
        check_units(where, s, ordinal)
    if kind in IN_3D:
        latin = set(re.findall(r'[A-Za-z]{2,}', s)) - LATIN_OK_3D
        if latin:
            fail(f'{where}: English inside the 3D ({", ".join(sorted(latin))}) in {s!r}')


def check_v2(d):
    """the redesigned district d (it has "beats"): every check of CONTRACTS §5 and design_system.md §11.2"""
    did = d['id']
    q = d.get('quote') or {}
    ns = sorted(set(d['articles']) | ({q['n']} if q.get('n') in arts else set()))
    qt = q.get('text')
    for k in ('title', 'idea', 'beats', 'labels', 'decals', 'taps', 'terms', 'quote', 'note'):
        if k not in d:
            fail(f'district {did}: v2 field {k!r} is missing')
    check_copy(f'district {did} title', 'title', d.get('title'), ns, qt)
    check_copy(f'district {did} idea', 'idea', d.get('idea'), ns, qt)
    nb = len(d.get('beats') or [])
    if not 4 <= nb <= 6:
        fail(f'district {did}: {nb} beats (the system asks for 4–6)')

    def beat_ok(where, b):
        if type(b) is not int or not 1 <= b <= nb:
            fail(f'{where}: beat {b!r} is not 1…{nb}')

    for i, b in enumerate(d.get('beats') or []):
        w = f'district {did} beat {i + 1}'
        check_copy(w, 'cap', b.get('cap'), ns, qt)
        refs = parse_src(w, b.get('src'))
        m = CITE.match(b.get('cite') or '')
        if not m:
            fail(f'{w}: micro-cite {b.get("cite")!r} is not "第 N 篇 p.P"')
        elif not any(n == int(m.group(1)) and str(pg) == m.group(2) for n, _, pg in refs):
            fail(f'{w}: micro-cite {b["cite"]!r} is not the article and page of one of its sources '
                 f'({", ".join(f"{n} {bid} p.{pg}" for n, bid, pg in refs)})')
    per_beat, at_rest, label_keys = {}, 0, set()
    for i, L in enumerate(d.get('labels') or []):
        w = f'district {did} label {L.get("part")!r}'
        check_copy(w, 'label', L.get('text'), ns, qt)
        parse_src(w, L.get('src'))
        beat_ok(w, L.get('beat'))
        if (L.get('part'), L.get('beat')) in label_keys:
            fail(f'{w}: two labels on one part in beat {L.get("beat")}')
        label_keys.add((L.get('part'), L.get('beat')))
        per_beat[L.get('beat')] = per_beat.get(L.get('beat'), 0) + 1
        at_rest += bool(L.get('rest'))
    for b, k in sorted(per_beat.items(), key=lambda x: str(x[0])):
        if k > 3:
            fail(f'district {did}: {k} labels in beat {b} (at most 3)')
    if at_rest > 3:
        fail(f'district {did}: {at_rest} labels stay at the end state (at most 3)')
    decals = d.get('decals') or []
    lever_keys = [o.get('k') for o in ((d.get('lever') or {}).get('options') or [])]
    illus, decal_parts, shown = False, set(), {}
    for D in decals:
        w = f'district {did} decal {D.get("part")!r}'
        if not D.get('part'):
            fail(f'{w}: no part')
        elif D['part'] in decal_parts:
            fail(f'{w}: two decals on one part (the overlay keys words on objects by part)')
        decal_parts.add(D.get('part'))
        if ('text' in D) == ('rows' in D):
            fail(f'{w}: a decal has either "text" or "rows"')
        if 'rows' in D and not (isinstance(D['rows'], list) and D['rows']):
            fail(f'{w}: "rows" must be a non-empty list')
        for k in ('illus', 'typed', 'rest', 'ordinal'):
            if k in D and not isinstance(D[k], bool):
                fail(f'{w}: "{k}" must be true or false')
        if 'lever' in D and D['lever'] not in lever_keys:
            fail(f'{w}: lever option {D["lever"]!r} is not one of {lever_keys}')
        # when it is on screen: the beats it lists (and the end state with "rest"), or always
        bs = D.get('beats')
        if bs is None:
            if 'rest' in D:
                fail(f'{w}: "rest" goes with "beats" (a decal without "beats" shows in every beat and at the end)')
            when = [*range(1, nb + 1), 'rest']
        else:
            if not (isinstance(bs, list) and bs and len(set(map(str, bs))) == len(bs)):
                fail(f'{w}: "beats" must be a non-empty list of distinct beat numbers')
                bs = bs if isinstance(bs, list) else []
            for b in bs:
                beat_ok(f'{w} beats', b)
            when = [b for b in bs if type(b) is int] + (['rest'] if D.get('rest') else [])
        # a decal tied to one 換你試試 option is on screen only in that option's version of the beats
        for br in ([D['lever']] if D.get('lever') else (lever_keys or [None])):
            for b in when:
                shown.setdefault((br, b), []).append(D.get('part'))
        ordinal = bool(D.get('ordinal'))
        if 'text' in D:
            check_copy(w, 'decal', D['text'], ns, qt, ordinal)
        for r in D.get('rows') or []:
            check_copy(w, 'row', r, ns, qt, ordinal)
        words = [D['text']] if isinstance(D.get('text'), str) else [r for r in D.get('rows') or [] if isinstance(r, str)]
        if 'src' in D or any(NUM.search(x) for x in words):
            parse_src(w, D.get('src'))  # a number on an object needs its source block id (§11.2)
        illus = illus or bool(D.get('illus'))
    for (br, b), ps in sorted(shown.items(), key=lambda x: str(x[0])):
        if len(ps) > 6:
            fail(f'district {did}: {len(ps)} decals {"at the end state" if b == "rest" else f"in beat {b}"}'
                 f'{f" (option {br})" if br else ""} (at most 6 on screen): {", ".join(map(str, ps))}')
    if illus and '示意' not in (d.get('note') or ''):
        fail(f'district {did}: illustrative decals (illus) need a 示意 note')
    seen = set()
    for t in d.get('taps') or []:
        w = f'district {did} tap {t.get("part")!r}'
        if t.get('part') in seen:
            fail(f'{w}: a part answers with one line only')
        seen.add(t.get('part'))
        check_copy(w, 'tap', t.get('line'), ns, qt)
        parse_src(w, t.get('src'))
        beat_ok(w, t.get('beat'))
    L = d.get('lever')
    if L:
        w = f'district {did} lever'
        check_copy(w, 'cap', L.get('ask'), ns, qt)
        beat_ok(w, L.get('fromBeat'))
        for k in ('name', 'act', 'pickLabel'):
            if k in L:
                check_copy(f'{w} {k}', 'button', L[k], ns, qt)
        if L.get('kind') == 'pick':
            # the reader picks one of the shortlisted cards and stamps it; no outcome differs by card
            if type(L.get('pick')) is not int or L['pick'] < 2:
                fail(f'{w}: a pick lever needs "pick" ≥ 2 (the shortlist size)')
            check_copy(f'{w} outcome', 'cap', L.get('cap'), ns, qt)
            parse_src(f'{w} outcome', L.get('src'))
            if L.get('options'):
                fail(f'{w}: a pick lever has no options')
        else:
            opts = L.get('options') or []
            keys = [o.get('k') for o in opts]
            if len(opts) < 2 or len(set(keys)) != len(keys):
                fail(f'{w}: needs two or more options with distinct keys (got {keys})')
            if L.get('def') not in keys:
                fail(f'{w}: default {L.get("def")!r} is not one of {keys}')
            for o in opts:
                ow = f'{w} option {o.get("k")!r}'
                check_copy(ow, 'button', o.get('label'), ns, qt)
                check_copy(ow, 'cap', o.get('cap'), ns, qt)
                parse_src(ow, o.get('src'))
    terms = d.get('terms') or []
    if not 1 <= len(terms) <= 3:
        fail(f'district {did}: {len(terms)} book terms (1–3)')
    for t in terms:
        w = f'district {did} term {t.get("term")!r}'
        check_copy(w, 'term', t.get('term'), ns, qt)
        check_copy(w, 'gloss', t.get('gloss'), ns, qt)
        parse_src(w, t.get('src'))
    # the quote: verbatim in the block it names, on the page it names
    b = BLOCKS.get(q.get('n'), {}).get(q.get('id'))
    if not qt or b is None:
        fail(f'district {did}: quote needs text, n and an existing block id (got {q})')
    else:
        if qt not in block_text(b):
            fail(f'district {did}: quote is not verbatim in article {q["n"]} block {q["id"]}: {qt}')
        if q.get('page') != b.get('pg'):
            fail(f'district {did}: quote page {q.get("page")} but block {q["id"]} is on p.{b.get("pg")}')
        check_copy(f'district {did} quote', 'quote', qt, ns, qt)
    check_copy(f'district {did} note', 'note', d.get('note'), ns, qt)
    for c in d.get('cards') or []:
        w = f'district {did} card line {c.get("n")}'
        if c.get('n') not in d['articles']:
            fail(f'{w}: article {c.get("n")} is not one of the district\'s')
        check_copy(w, 'card', c.get('line'), ns, qt)
        parse_src(w, c.get('src'))
    layer = zi(d.get('idea') or '') + sum(zi(t.get('term') or '') + zi(t.get('gloss') or '') for t in terms) + \
        zi(qt or '') + zi(d.get('note') or '')
    if layer > 220:
        fail(f'district {did}: reading layer is {layer} 字 (idea, terms, glosses, quote, note; at most 220)')
    return layer


def to_world(d):
    """the district as world.json carries it: beats 0-based, the quote under both names"""
    o = copy.deepcopy(d)
    if 'beats' in o:
        # a beat that is not a number has already failed its check; leave it be, so every error gets reported
        for x in [*(o.get('labels') or []), *(o.get('taps') or [])]:
            if type(x.get('beat')) is int:
                x['beat'] -= 1
        for x in o.get('decals') or []:
            if isinstance(x.get('beats'), list):
                x['beats'] = [b - 1 if type(b) is int else b for b in x['beats']]
        if o.get('lever') and type(o['lever'].get('fromBeat')) is int:
            o['lever']['fromBeat'] -= 1
        if 'text' in (o.get('quote') or {}):
            o['quote']['t'] = o['quote']['text']  # the legacy panel reads quote.t
    return o


# ---- zones, map and interface strings
zones = cur.get('zones') or []
ZONE_IDS = [z.get('id') for z in zones]
DIST_IDS = [d['id'] for d in cur['districts']]
if ZONE_IDS != ['brand', 'ai', 'consumer']:
    fail(f'zones must be brand, ai, consumer in that order (got {ZONE_IDS})')
listed = [i for z in zones for i in z.get('districts', [])]
if sorted(listed) != sorted(DIST_IDS) or len(set(listed)) != len(listed):
    fail(f'zones must list every district exactly once (listed {listed}, districts {DIST_IDS})')
elif listed != DIST_IDS:
    fail(f'the districts array must follow the reading order of the zones: {listed} (got {DIST_IDS})')
for z in zones:
    check_banned(f'zone {z.get("id")} name', z.get('name') or '')
    CURATED.append((f'zone {z.get("id")} name', z.get('name') or '', ()))
    for i in z.get('districts', []):
        d = next((x for x in cur['districts'] if x['id'] == i), None)
        if d and d.get('zone') != z.get('id'):
            fail(f'district {i}: zone {d.get("zone")!r} but zone {z.get("id")!r} lists it')
pills = {}
for d in cur['districts']:
    w = f'district {d["id"]}'
    if d.get('zone') not in ZONE_IDS:
        fail(f'{w}: zone {d.get("zone")!r} is not one of {ZONE_IDS}')
    if not d.get('pill'):
        fail(f'{w}: no pill')
    elif d['pill'] in pills:
        fail(f'{w}: pill {d["pill"]!r} is also {pills[d["pill"]]}\'s')
    pills[d.get('pill')] = d['id']
    check_banned(f'{w} pill', d.get('pill') or '')
    CURATED += [(f'{w} pill', d.get('pill') or '', ()), (f'{w} panel', d.get('panel') or '', d['articles'])]
    m = PANEL_ARTS.search(d.get('panel') or '')
    if not m:
        fail(f'{w}: panel line {d.get("panel")!r} does not end with 「第 N、M 篇」')
    else:
        nums = [int(x) for x in m.group(1).split('、')]
        if sorted(nums) != sorted(d['articles']) or ('beats' in d and nums != d['articles']):
            fail(f'{w}: panel line names articles {nums}, the district has {d["articles"]}')
    check_banned(f'{w} panel', d.get('panel') or '', d['articles'])
    for r in d.get('related') or []:
        if r not in DIST_IDS or r == d['id']:
            fail(f'{w}: related district {r!r}')
mp = cur.get('map') or {}
check_copy('map sentence', 'cap', mp.get('sentence'), [])
if len(mp.get('intro') or []) != 3:
    fail('map intro needs three lines')
for i, s in enumerate(mp.get('intro') or []):
    check_copy(f'map intro {i + 1}', 'cap', s, [])
for f in mp.get('flows') or []:
    check_copy(f'map flow {f.get("id")}', 'label', f.get('name'), [])
for k, v in (cur.get('ui') or {}).items():
    if not isinstance(v, str) or not v.strip():
        fail(f'ui.{k}: empty')
        continue
    check_banned(f'ui.{k}', PLACEHOLDER.sub('', v))
    CURATED.append((f'ui.{k}', v, ()))
    if v.strip() == '重點':
        fail(f'ui.{k}: 重點 is not a section name')
# the rest of what the curation puts on screen (design_system.md §8.3 bans these words anywhere on screen): the
# opening page, the route's reasons (ring names and verbs), the route questions (profile labels)
for k in ('name', 'en', 'question', 'note'):
    check_banned(f'world.{k}', (cur.get('world') or {}).get(k) or '')
for r in cur.get('rings') or []:
    for k in ('name', 'verbs', 'desc'):
        check_banned(f'ring {r.get("id")} {k}', r.get(k) or '')
for k, vs in (cur.get('profile') or {}).items():
    for x in vs:
        check_banned(f'profile {k} {x.get("id")}', x.get('label') or '')

district_of = {}
layers = {}
for d in cur['districts']:
    qt = d['quote'].get('t') or d['quote'].get('text')
    qid, page = find_quote(d['quote']['n'], qt)
    if 'beats' in d:
        layers[d['id']] = check_v2(d)
    else:
        d['quote'].update(id=qid, page=page)
    about = sorted(set(d['articles']) | {d['quote']['n']})
    for s in [d['title'], d.get('line', ''), *d.get('steps', [])]:
        check_quoted(f'district {d["id"]}', s, about)
        # a district not yet rebuilt shows its title on the map and its line and steps in its reading layer
        check_banned(f'district {d["id"]} title, line or step', s, about)
    for n in d['articles']:
        if d.get('shares'):
            continue  # its articles live in the district it shares them with (checked below)
        if n in district_of:
            fail(f'article {n} placed in two districts')
        district_of[n] = d['id']
for d in cur['districts']:
    if d.get('shares'):
        if d['shares'] not in DIST_IDS or d['shares'] == d['id']:
            fail(f'district {d["id"]}: shares {d["shares"]!r}, not another district')
        for n in d['articles']:
            if district_of.get(n) != d['shares']:
                fail(f'district {d["id"]}: article {n} is shared with {d["shares"]!r}, but it lives in {district_of.get(n)!r}')
missing = [n for n in range(1, 23) if n not in district_of]
if missing:
    fail(f'articles without a district: {missing}')

articles = {}
for n in range(1, 23):
    c = concepts[n]
    check_tags(n, c)
    qid, page = find_quote(n, c['quote']['t'])
    if page != c['quote'].get('page'):
        print(f'note: article {n} quote page {c["quote"].get("page")} → {page}')
    for k in ('core', 'coreLong', 'before', 'after'):
        check_quoted(f'article {n} {k}', c[k], [n])
    if c.get('keyNumber'):
        check_quoted(f'article {n} keyNumber', c['keyNumber']['label'], [n])
    for link in c['links']:
        check_quoted(f'article {n} → {link["to"]}', link['why'], [n, link['to']])
    meta = next(a for a in index['articles'] if a['n'] == n)
    articles[n] = {
        'n': n, 'district': district_of[n], 'ch': meta['ch'],
        'coreName': c['coreName'], 'core': c['core'], 'coreLong': c['coreLong'],
        'before': c['before'], 'after': c['after'],
        'roles': c['roles'], 'focus': c['focus'], 'industries': c['industries'],
        'cases': [{'t': x['t'], 'ind': x['ind']} for x in c['cases'] if isinstance(x, dict) and 'ind' in x],
        'links': c['links'], 'quote': {'t': c['quote']['t'], 'id': qid, 'page': page},
        'keyNumber': c.get('keyNumber'), 'keyTerms': c.get('keyTerms', []),
    }

# ---- everything the build would write, as the exact text it would write
dumps = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))  # noqa: E731
out = {'world': cur['world'], 'zones': cur['zones'], 'map': cur['map'], 'ui': cur['ui'], 'rings': cur['rings'],
       'districts': [to_world(d) for d in cur['districts']], 'profile': cur['profile'], 'articles': articles}
outputs = {os.path.join(WORLD, 'data', 'world.json'): dumps(out),
           os.path.join(WORLD, 'data', 'index.json'): open(os.path.join(SITE, 'data', 'index.json'), encoding='utf-8').read()}
for n, art in arts.items():
    outputs[os.path.join(WORLD, 'data', 'a', f'{n:02d}.json')] = dumps(art)
FIG = os.path.join(WORLD, 'assets', 'img', 'fig')
figs = {b['src'] for a in arts.values() for b in walk(a['flow']) if b.get('t') == 'fig' and b.get('src')}
for f in figs:
    if not os.path.exists(os.path.join(SITE, 'assets', 'img', 'fig', f)):
        fail(f'figure {f} is used but missing from site/assets/img/fig')

# ---- fonts: every character drawn must be in the Noto Sans TC subset (or be one Noto Sans TC does not have)
try:
    cmap = subset_fonts.read_cmap(subset_fonts.NOTO_SUB)
except Exception as e:  # noqa: BLE001
    cmap = set()
    fail(f'cannot read the font subset {os.path.relpath(subset_fonts.NOTO_SUB, ROOT)}: {e}')
fallback = subset_fonts.read_fallback()
ui_texts, rough = subset_fonts.ui_texts(WORLD)
for r in rough:
    print(f'note: could not tokenize {r}; all of its characters are checked')
texts = {**{p: t for p, t in subset_fonts.data_texts(WORLD).items() if p not in outputs}, **outputs, **ui_texts}
need, used_fallback, ui_fallback = {}, set(), {}
for p, t in texts.items():
    for c in subset_fonts.drawn(t):
        if ord(c) in cmap:
            continue
        rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
        if c in fallback:
            used_fallback.add(c)
            if p in ui_texts:
                ui_fallback.setdefault(rel, set()).add(c)
        else:
            need.setdefault(c, set()).add(rel)
for where, s, ns in CURATED:  # the fallback is for verbatim book text; copy written for the world has no excuse
    lack = sorted({c for c in subset_fonts.drawn(strip_exempt(s, ns)) if ord(c) not in cmap})
    if lack:
        fail(f'{where}: {"".join(lack)} in {s!r} is not in NotoSansTC-sub.woff2'
             + (' (Noto Sans TC does not have it: use another character)' if set(lack) <= fallback else ''))
if ui_fallback:  # book text must stay verbatim; an interface string could use a character the font has
    print('note: interface strings use characters Noto Sans TC does not have (a system font draws them): '
          + '; '.join(f'{p}: {"".join(sorted(cs))}' for p, cs in sorted(ui_fallback.items())))
if need:
    by_file = {}
    for c, ps in need.items():
        for p in ps:
            by_file.setdefault(p, []).append(c)
    fail(f'{len(need)} character(s) are not in world/assets/fonts/NotoSansTC-sub.woff2: '
         + '; '.join(f'{p}: {"".join(sorted(cs))}' for p, cs in sorted(by_file.items()))
         + ' — run python tools/subset_fonts.py <font source dir> and build again')

if errors:
    for e in errors:
        print(e)
    raise SystemExit(f'build_world: {len(errors)} check(s) failed; nothing written')

# ---- all checks passed: write the world edition's copy of the data, and only the figures its articles use
os.makedirs(os.path.join(WORLD, 'data', 'a'), exist_ok=True)
os.makedirs(FIG, exist_ok=True)


def write(path, text):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    os.replace(tmp, path)


for p, t in outputs.items():
    if p.endswith('world.json'):
        continue
    write(p, t)
for f in figs:
    tmp = os.path.join(FIG, f + '.tmp')
    shutil.copy(os.path.join(SITE, 'assets', 'img', 'fig', f), tmp)
    os.replace(tmp, os.path.join(FIG, f))
for f in os.listdir(FIG):
    if f not in figs:
        os.remove(os.path.join(FIG, f))
write(os.path.join(WORLD, 'data', 'world.json'), outputs[os.path.join(WORLD, 'data', 'world.json')])
v2 = [d['id'] for d in cur['districts'] if 'beats' in d]
print(f'world.json: {len(cur["districts"])} districts ({len(v2)} v2: '
      f'{", ".join(f"{i} {len(next(d for d in cur["districts"] if d["id"] == i)["beats"])} beats, layer {layers[i]} 字" for i in v2)}), '
      f'{len(zones)} zones, {len(articles)} articles; quotes verified, '
      f'{quoted} 「」 spans verbatim, {markers} footnote markers matched, notes fixed in {sorted(notes_fix)}, '
      f'markers corrected: {", ".join(f"{n}:{a}→{b}" for n, a, b in fixed_markers) or "none"}, {len(figs)} figures; '
      f'font subset covers the {len(set().union(*map(subset_fonts.drawn, texts.values())))} characters drawn by '
      f'{len(texts)} files'
      f'{f" (system fallback for {len(used_fallback)}: " + "".join(sorted(used_fallback)) + ")" if used_fallback else ""}')
