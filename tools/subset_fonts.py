"""Subset the self-hosted fonts to the characters the world edition actually uses.

Usage: python tools/subset_fonts.py <FONT_SRC_DIR>
  FONT_SRC_DIR holds the OFL sources: NotoSansTC[wght].ttf, Montserrat[wght].ttf, IBMPlexMono-Regular.ttf, IBMPlexMono-Medium.ttf
Writes world/assets/fonts/*.woff2 (+ OFL.txt) and tools/world_curation/font_fallback.json (the characters the site
uses that Noto Sans TC itself does not have, so the browser draws them with a system font; the build reads it).

Run it whenever text or UI copy changes. It reads the curation inputs as well as the built data, so it can run
before tools/build_world.py: the build refuses to write when a character it would write, or a UI string uses,
is missing from NotoSansTC-sub.woff2 and is not a recorded fallback character.

The character collection below is shared with tools/build_world.py (import subset_fonts), so the subset and the
build check can never disagree about what "used" means:
- world/index.html: every character (its markup is ASCII; the copy is the rest), plus what its entities stand for;
- world/assets/js/*.js: the string literals only ('…', "…", `…` with ${} nesting), plus what HTML entities in them
  stand for; comments and regex bodies are not drawn. A file the tokenizer cannot finish cleanly falls back to all
  of its characters;
- world/assets/css/*.css: quoted strings with their escapes decoded (content: '›' or '\\203A' and the like);
- world/data/*.json and world/data/a/*.json: every character;
- the inputs those are built from: tools/world_curation/*.json, site/data/index.json, site/data/a/*.json.
"""
import glob, html, json, os, re, sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(TOOLS, '..'))
WORLD = os.path.join(REPO, 'world')
FONTS = os.path.join(WORLD, 'assets', 'fonts')
NOTO_SUB = os.path.join(FONTS, 'NotoSansTC-sub.woff2')
FALLBACK = os.path.join(TOOLS, 'world_curation', 'font_fallback.json')
# always keep printable ASCII, common punctuation and digits in both widths
EXTRA = ''.join(chr(c) for c in range(0x20, 0x7F)) + '，。、；：？！「」『』（）《》〈〉…—–·・％＋－＝０１２３４５６７８９｜／→←↑↓×'

JS_KEYWORDS_BEFORE_REGEX = {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw',
                            'instanceof', 'yield', 'await'}


def _unescape(s):
    """decode the escapes of a JS string body well enough to know which characters it draws"""
    def rep(m):
        e = m.group(1)
        if e.startswith('u{'):
            return chr(int(e[2:-1], 16))
        if e[0] in 'ux':
            return chr(int(e[1:], 16))
        return {'n': '\n', 't': '\t', 'r': '\r', 'b': '', 'f': '', 'v': '', '0': ''}.get(e, e)
    return re.sub(r'\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\n|.)', rep, s)


def js_strings(src):
    """(text of every string literal in src, one per line, parsed cleanly?) — a small JS tokenizer: comments, regex
    literals, '…' and "…" strings, template literals with nested ${ … } expressions"""
    out, i, n = [], 0, len(src)
    stack = []      # one entry per open template: brace depth of the ${ } expression we are in
    prev = ''       # last significant token, to tell a regex literal from a division
    while i < n:
        c = src[i]
        if c in ' \t\r\n\f\v\ufeff':
            i += 1
            continue
        if src.startswith('//', i):
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            if j < 0:
                return '\n'.join(out), False
            i = j + 2
            continue
        if c in '\'"':
            j, buf = i + 1, []
            while j < n and src[j] != c:
                if src[j] == '\\':
                    buf.append(src[j:j + 2])
                    j += 2
                    continue
                if src[j] == '\n':
                    return '\n'.join(out), False
                buf.append(src[j])
                j += 1
            if j >= n:
                return '\n'.join(out), False
            out.append(_unescape(''.join(buf)))
            i, prev = j + 1, 'str'
            continue
        if c == '`' or (c == '}' and stack and stack[-1] == 0):
            # start a template, or come back into one after its ${ … } expression
            if c == '}':
                stack.pop()
            j, buf = i + 1, []
            while j < n:
                if src[j] == '\\':
                    buf.append(src[j:j + 2])
                    j += 2
                    continue
                if src[j] == '`':
                    break
                if src.startswith('${', j):
                    break
                buf.append(src[j])
                j += 1
            if j >= n:
                return '\n'.join(out), False
            out.append(_unescape(''.join(buf)))
            if src[j] == '`':
                i, prev = j + 1, 'str'
            else:
                stack.append(0)
                i, prev = j + 2, '('
            continue
        if c == '/':
            if prev in ('', 'kw') or (len(prev) == 1 and prev in '(,=:[!&|?{};+-*%<>~^'):
                # a regex literal: skip it (its body is a pattern, not drawn text)
                j, cls = i + 1, False
                while j < n:
                    ch = src[j]
                    if ch == '\\':
                        j += 2
                        continue
                    if ch == '\n':
                        return '\n'.join(out), False
                    if ch == '[':
                        cls = True
                    elif ch == ']':
                        cls = False
                    elif ch == '/' and not cls:
                        break
                    j += 1
                if j >= n:
                    return '\n'.join(out), False
                j += 1
                while j < n and (src[j].isalnum() or src[j] == '_'):
                    j += 1
                i, prev = j, 'str'
                continue
            i, prev = i + 1, '/'
            continue
        if c.isalnum() or c in '_$' or ord(c) > 127:
            j = i
            while j < n and (src[j].isalnum() or src[j] in '_$.' or ord(src[j]) > 127):
                j += 1
            word = src[i:j]
            prev = 'kw' if word in JS_KEYWORDS_BEFORE_REGEX else 'id'
            i = j
            continue
        if c == '{':
            if stack:
                stack[-1] += 1
        elif c == '}':
            if stack:
                stack[-1] -= 1
        prev = ')' if c in ')]' else c
        if c in ')]':
            prev = 'id'  # a value ends here: a following / is a division
        i += 1
    return '\n'.join(out), not stack


def _css_unescape(s):
    r"""a CSS string body with its escapes decoded: \203A (one to six hex digits, then one optional space) and \x"""
    def rep(m):
        if m.group(1):
            c = int(m.group(1), 16)
            return chr(c) if 0 < c <= 0x10FFFF and not 0xD800 <= c <= 0xDFFF else ''
        return m.group(2)
    return re.sub(r'\\([0-9a-fA-F]{1,6})[ \t\n]?|\\(.)', rep, s, flags=re.S)


def css_strings(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return ''.join(_css_unescape(m.group(2)) for m in re.finditer(r'(["\'])((?:\\.|(?!\1).)*)\1', src))


ENTITY = re.compile(r'&(?:#[0-9]+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);')


def _entities(s):
    """the characters that the HTML character references in s (&rsaquo; &#8250; &#x203A;) stand for"""
    return ''.join(html.unescape(m.group(0)) for m in ENTITY.finditer(s))


def _read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def ui_texts(world=WORLD):
    """{path: text the page draws from it} for index.html, the scripts and the stylesheets, plus the scripts the
    tokenizer could not finish (their full text is used instead)"""
    texts, rough = {}, []
    p = os.path.join(world, 'index.html')
    if os.path.exists(p):
        h = _read(p)
        texts[p] = h + _entities(h)  # &rsaquo; or &#8250; draws a character the raw text does not contain
    for p in sorted(glob.glob(os.path.join(world, 'assets', 'js', '*.js'))):
        s = _read(p)
        lit, ok = js_strings(s)
        if not ok:
            rough.append(os.path.relpath(p, REPO))
            lit = s
        texts[p] = lit + _entities(lit)  # strings that become innerHTML may carry entities
    for p in sorted(glob.glob(os.path.join(world, 'assets', 'css', '*.css'))):
        texts[p] = css_strings(_read(p))
    return texts, rough


def data_texts(world=WORLD):
    return {p: _read(p) for p in sorted(glob.glob(os.path.join(world, 'data', '*.json')) +
                                        glob.glob(os.path.join(world, 'data', 'a', '*.json')))}


# designer notes in the concept files that build_world.py never exports (if it ever does, its font check says so)
NOT_DRAWN_KEYS = {'motifs', 'mechanism'}


def source_texts():
    out = {}
    for p in sorted(glob.glob(os.path.join(TOOLS, 'world_curation', '*.json')) +
                    [os.path.join(REPO, 'site', 'data', 'index.json')] +
                    glob.glob(os.path.join(REPO, 'site', 'data', 'a', '*.json'))):
        if os.path.basename(p) == os.path.basename(FALLBACK):
            continue
        t = _read(p)
        if os.path.basename(p).startswith('concepts_'):
            t = json.dumps([{k: v for k, v in c.items() if k not in NOT_DRAWN_KEYS} for c in json.loads(t)],
                           ensure_ascii=False)
        out[p] = t
    return out


def drawn(text):
    """the characters of text that need a glyph"""
    return {c for c in text if c.isprintable() and not c.isspace()}


def read_cmap(path):
    from fontTools.ttLib import TTFont
    f = TTFont(path)
    try:
        return set(f.getBestCmap())
    finally:
        f.close()


def read_fallback():
    try:
        with open(FALLBACK, encoding='utf-8') as f:
            return set(json.load(f).get('chars', ''))
    except FileNotFoundError:
        return set()


def main(src_dir):
    from fontTools import subset
    os.makedirs(FONTS, exist_ok=True)
    ui, rough = ui_texts()
    for r in rough:
        print('note: could not tokenize', r, '- using all of its characters')
    data = {**data_texts(), **source_texts()}
    chars = set(EXTRA)
    for t in (*ui.values(), *data.values()):
        chars.update(c for c in t if c.isprintable())
    text = ''.join(sorted(chars))
    print('characters:', len(text))

    noto_src = os.path.join(src_dir, 'NotoSansTC[wght].ttf')
    have = read_cmap(noto_src)
    lack = sorted(c for c in chars if not c.isspace() and ord(c) not in have)
    where = {}
    for p, t in (*ui.items(), *data.items()):
        for c in set(t) & set(lack):
            where.setdefault(c, set()).add(os.path.relpath(p, REPO).replace(os.sep, '/'))
    with open(FALLBACK, 'w', encoding='utf-8') as f:
        json.dump({'_': 'written by tools/subset_fonts.py: characters the world edition uses that Noto Sans TC does '
                        'not have; the browser draws them with a system font. tools/build_world.py accepts these and '
                        'fails on any other character missing from NotoSansTC-sub.woff2.',
                   'chars': ''.join(lack),
                   'where': {c: sorted(v) for c, v in sorted(where.items())}}, f, ensure_ascii=False, indent=1)
    print(f'not in Noto Sans TC ({len(lack)}, system fallback):', ''.join(lack))

    def make(src, out, keep_text):
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        opts.drop_tables += ['DSIG']
        font = subset.load_font(os.path.join(src_dir, src), opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=keep_text)
        sub.subset(font)
        tmp = os.path.join(FONTS, out + '.tmp')
        subset.save_font(font, tmp, opts)
        os.replace(tmp, os.path.join(FONTS, out))
        print(out, os.path.getsize(os.path.join(FONTS, out)) // 1024, 'KB')

    make('NotoSansTC[wght].ttf', 'NotoSansTC-sub.woff2', text)
    latin = ''.join(c for c in text if ord(c) < 0x3000)
    make('Montserrat[wght].ttf', 'Montserrat-sub.woff2', latin)
    make('IBMPlexMono-Regular.ttf', 'IBMPlexMono-Regular-sub.woff2', latin)
    make('IBMPlexMono-Medium.ttf', 'IBMPlexMono-Medium-sub.woff2', latin)
    with open(os.path.join(src_dir, 'OFL.txt'), 'rb') as a, open(os.path.join(FONTS, 'OFL.txt'), 'wb') as b:
        b.write(a.read())
    missing = sorted(c for c in drawn(text) if ord(c) not in read_cmap(NOTO_SUB) and c not in lack)
    if missing:
        raise SystemExit(f'subset_fonts: {len(missing)} characters did not make it into the subset: {"".join(missing)}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__.split('\n\n')[1])
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1])
