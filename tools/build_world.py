"""Build the 3D world edition's data from the shared publication data + the world curation layer.

Usage:  python tools/build_world.py
Inputs:  site/data/index.json, site/data/a/NN.json      (verbatim publication data, shared with the other edition)
         site/assets/img/fig/*.webp                     (figures cropped from the printed PDF)
         tools/world_curation/districts.json            (world, rings, districts, profile vocabulary — hand-written)
         tools/world_curation/concepts_A.json / _B.json (per-article concept extraction, quotes verified verbatim)
         tools/world_curation/notes_fix.json            (footnote order and numbers as printed, for the articles whose
                                                         shared data has them duplicated, missing or out of order; and
                                                         the few printed markers whose correct source is certain)
Outputs: world/data/index.json, world/data/a/NN.json, world/assets/img/fig/*.webp, world/data/world.json
The script stops when any of these checks fails:
- every quote used by the world (district quotes and per-article concept quotes) appears verbatim in its article;
- every 「…」 of 8 characters or more in the curation prose (link reasons, concept texts, district lines and steps)
  appears verbatim in one of the articles it speaks about;
- every footnote marker in an article (aside and list blocks included) has exactly one note with that number,
  and note numbers are unique;
- every case industry, article industry and profile tag uses the profile vocabulary.
"""
import json, os, re, shutil, sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SITE, WORLD, CUR = (os.path.join(ROOT, p) for p in ('site', 'world', os.path.join('tools', 'world_curation')))
FULLWIDTH_DIGITS = str.maketrans('０１２３４５６７８９', '0123456789')


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


quoted = 0


def check_quoted(where, s, ns):
    global quoted
    for q in corner_quotes(s or ''):
        if len(q) < 8:
            continue
        quoted += 1
        if not any(q in t for k in ns for t in TEXTS[k]):
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


district_of = {}
for d in cur['districts']:
    qid, page = find_quote(d['quote']['n'], d['quote']['t'])
    d['quote'].update(id=qid, page=page)
    about = sorted(set(d['articles']) | {d['quote']['n']})
    for s in [d['title'], d['line'], *d['steps']]:
        check_quoted(f'district {d["id"]}', s, about)
    for n in d['articles']:
        if n in district_of:
            fail(f'article {n} placed in two districts')
        district_of[n] = d['id']
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

if errors:
    for e in errors:
        print(e)
    raise SystemExit(f'build_world: {len(errors)} check(s) failed; world.json not written')
# ---- all checks passed: write the world edition's copy of the data, and only the figures its articles use
os.makedirs(os.path.join(WORLD, 'data', 'a'), exist_ok=True)
FIG = os.path.join(WORLD, 'assets', 'img', 'fig')
os.makedirs(FIG, exist_ok=True)
shutil.copy(os.path.join(SITE, 'data', 'index.json'), os.path.join(WORLD, 'data', 'index.json'))
for n, art in arts.items():
    json.dump(art, open(os.path.join(WORLD, 'data', 'a', f'{n:02d}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
figs = {b['src'] for a in arts.values() for b in walk(a['flow']) if b.get('t') == 'fig' and b.get('src')}
for f in figs:
    shutil.copy(os.path.join(SITE, 'assets', 'img', 'fig', f), os.path.join(FIG, f))
for f in os.listdir(FIG):
    if f not in figs:
        os.remove(os.path.join(FIG, f))
out = {'world': cur['world'], 'rings': cur['rings'], 'districts': cur['districts'], 'profile': cur['profile'], 'articles': articles}
json.dump(out, open(os.path.join(WORLD, 'data', 'world.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'world.json: {len(cur["districts"])} districts, {len(articles)} articles; quotes verified, '
      f'{quoted} 「」 spans verbatim, {markers} footnote markers matched, notes fixed in {sorted(notes_fix)}, '
      f'markers corrected: {", ".join(f"{n}:{a}→{b}" for n, a, b in fixed_markers) or "none"}, {len(figs)} figures')
