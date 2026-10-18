"""Subset the self-hosted fonts to the characters the world edition actually uses.

Usage: python tools/subset_fonts.py <FONT_SRC_DIR>
  FONT_SRC_DIR holds the OFL sources: NotoSansTC[wght].ttf, Montserrat[wght].ttf, IBMPlexMono-Regular.ttf, IBMPlexMono-Medium.ttf
Writes world/assets/fonts/*.woff2 (+ OFL.txt).  Re-run whenever text or UI copy changes.
"""
import glob, json, os, shutil, sys
from fontTools import subset

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'world'))
SRC = sys.argv[1]
OUT = os.path.join(ROOT, 'assets', 'fonts')
os.makedirs(OUT, exist_ok=True)

chars = set()
files = [os.path.join(ROOT, 'index.html'), *glob.glob(os.path.join(ROOT, 'assets', 'js', '*.js')),
         os.path.join(ROOT, 'data', 'world.json'), os.path.join(ROOT, 'data', 'index.json'),
         *glob.glob(os.path.join(ROOT, 'data', 'a', '*.json'))]
for f in files:
    chars.update(open(f, encoding='utf-8').read())
# always keep printable ASCII, common punctuation and digits in both widths
chars.update(chr(c) for c in range(0x20, 0x7F))
chars.update('，。、；：？！「」『』（）《》〈〉…—–·・％＋－＝０１２３４５６７８９｜／→←↑↓×')
text = ''.join(sorted(c for c in chars if c.isprintable()))
print('characters:', len(text))


def make(src, out, keep_text):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.drop_tables += ['DSIG']
    font = subset.load_font(os.path.join(SRC, src), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=keep_text)
    sub.subset(font)
    subset.save_font(font, os.path.join(OUT, out), opts)
    print(out, os.path.getsize(os.path.join(OUT, out)) // 1024, 'KB')


make('NotoSansTC[wght].ttf', 'NotoSansTC-sub.woff2', text)
latin = ''.join(c for c in text if ord(c) < 0x3000)
make('Montserrat[wght].ttf', 'Montserrat-sub.woff2', latin)
make('IBMPlexMono-Regular.ttf', 'IBMPlexMono-Regular-sub.woff2', latin)
make('IBMPlexMono-Medium.ttf', 'IBMPlexMono-Medium-sub.woff2', latin)
shutil.copy(os.path.join(SRC, 'OFL.txt'), os.path.join(OUT, 'OFL.txt'))
