#!/usr/bin/env python3
"""
Builds the page's own copies of its web fonts: src/fonts/*.woff2 and the
@font-face rules in src/styles/fonts.css, fonts-first.css and fonts-late.css
(generated, so edit this, not those).

Each face starts from the Latin file Google Fonts serves for it (pinned by
version below, so a rebuild gives the same bytes) and is cut down to what the
page uses:

  - the variable axes are pinned or narrowed to the range the CSS reaches
    (Newsreader is only ever set at 400, so its weight axis goes entirely);
  - the text faces keep Latin-1 and the usual typographic punctuation, since
    the blog sync and visitors' stamps put words on the page nobody wrote here;
  - Anton and Caveat only ever set copy written in src/, so they keep ASCII
    plus whatever else src/ uses (tests/unit/fonts.test.js says when that
    needs a rebuild).

It also writes a stand-in for every face: a local system font scaled
(size-adjust) to the same width over real copy from the page, with the web
font's ascent and descent, so nothing re-wraps or moves when the real face
swaps in. Each stand-in covers only what its web face draws, so characters the
web face lacks still fall through to the stack in tokens.css as before.

The stand-ins are in fonts.css, part of the main stylesheet, so the first
frame is set in them. The faces the first screen sets (the loader and the
masthead: Anton, Newsreader, JetBrains Mono, and Fraunces cut down to the
nameplate's letters) are in fonts-first.css, declared once that frame has
painted, so they never hold it up or take bandwidth from the script that
draws it; the loader waits for them (src/life/fonts.js). The rest (Fraunces
for the heads further down, the pen, the italics) are in fonts-late.css,
declared once the page has loaded too.

Needs fonttools and brotli, and macOS (the stand-ins are measured on its
system fonts):
  python3 -m venv /tmp/fontvenv && /tmp/fontvenv/bin/pip install fonttools brotli
  /tmp/fontvenv/bin/python scripts/fonts/build.py
"""

import html
import io
import re
import sys
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTCollection, TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'scripts/fonts/.cache'
OUT = ROOT / 'src/fonts'
CSS = ROOT / 'src/styles/fonts.css'
CSS_FIRST = ROOT / 'src/styles/fonts-first.css'
CSS_LATE = ROOT / 'src/styles/fonts-late.css'
GS = 'https://fonts.gstatic.com/s/'
SYS = '/System/Library/Fonts/'


def cps(spec):
    """'U+0020-007E, U+00A0' -> set of code points"""
    out = set()
    for part in spec.replace(' ', '').split(','):
        a, _, b = part[2:].partition('-')
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out


# what Google Fonts puts in its "latin" and "latin-ext" files
LATIN = cps('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, '
            'U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD')
LATIN_EXT = cps('U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, '
                'U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, '
                'U+A720-A7FF') - LATIN

ASCII = cps('U+0020-007E, U+00A0')
# Latin-1 and the punctuation a typed or synced sentence reaches for
TEXT = ASCII | cps('U+00A1-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2009-200A, U+2010-2011, U+2013-2014, '
                   'U+2018-201A, U+201C-201E, U+2020-2022, U+2026, U+2030, U+2032-2033, U+2039-203A, U+2044, '
                   'U+20AC, U+2122, U+2191, U+2193, U+2212')


def used_in_src():
    """every character the copy in src/ and index.html can put on the page"""
    seen = set()
    files = [ROOT / 'index.html', *(p for p in (ROOT / 'src').rglob('*') if p.suffix in ('.js', '.jsx'))]
    for p in files:
        t = p.read_text(encoding='utf-8')
        t = re.sub(r'\\u\{?([0-9a-fA-F]{4,5})\}?', lambda m: chr(int(m.group(1), 16)), t)
        seen.update(map(ord, html.unescape(t)))
    return seen & LATIN


AUTHORED = ASCII | used_in_src()
# the masthead's nameplate and the loader's copy of it (Hero.jsx, Loader.jsx)
NAMEPLATE = set(map(ord, 'TEJAL GOYAL'))

# What the CSS in src/styles reaches: the nameplate rests at opsz 144 and
# inks down to 28, at wght 860–900 (Nameplate.jsx); the rest of Fraunces
# upright at 600–900 and its italic at 400 (the stamp box's placeholder) to
# 900, both at every optical size from small heads to 144 (its opsz masters
# sit at 9 and 144, so a narrower range saves nothing and moving the default
# costs bytes). Newsreader only ever at 400 and no larger than 1.45rem
# (opsz 24); JetBrains Mono 400–700; Caveat 400–700; Anton has no axes.
FRAUNCES = 'fraunces/v38/6NU78FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0KxC9TeP2Xz5c.woff2'
FACES = [
    # file, family, style, weight (CSS), source, axis limits, characters, late
    ('anton', 'Anton', 'normal', '400', 'anton/v27/1Ptgg87LROyAm3Kz-C8CSKlv.woff2', None, AUTHORED, False),
    ('newsreader', 'Newsreader', 'normal', '400', 'newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2',
     {'wght': 400, 'opsz': (6, 24)}, TEXT, False),
    # the only Fraunces on the first screen is the name: its nine letters,
    # in its own family, so the full face can wait with the others
    ('fraunces-nameplate', 'Fraunces Nameplate', 'normal', '860 900', FRAUNCES,
     {'wght': (860, 900), 'opsz': (28, 144)}, NAMEPLATE, False),
    ('jetbrains-mono', 'JetBrains Mono', 'normal', '400 700',
     'jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-4.woff2',
     {'wght': (400, 700)}, TEXT, False),
    ('newsreader-italic', 'Newsreader', 'italic', '400', 'newsreader/v26/cY9CfjOCX1hbuyalUrK439vCjohCBJWxZA.woff2',
     {'wght': 400, 'opsz': (6, 24)}, TEXT, True),
    ('fraunces-italic', 'Fraunces', 'italic', '400 900',
     'fraunces/v38/6NU58FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnbB-gzTK0K1ChjeveQ7ZXk8g.woff2',
     {'wght': (400, 900)}, TEXT, True),
    # visitors' stamps are any word in any Latin script: the rest of the
    # alphabet comes in only if one of them needs it
    ('fraunces-italic-ext', 'Fraunces', 'italic', '400 900',
     'fraunces/v38/6NU58FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnbB-gzTK0K1ChjdPeQ7ZXk8kD6.woff2',
     {'wght': (400, 900)}, LATIN_EXT, True),
    ('fraunces', 'Fraunces', 'normal', '600 900', FRAUNCES, {'wght': (600, 900)}, TEXT, True),
    ('caveat', 'Caveat', 'normal', '400 700', 'caveat/v23/Wnz6HAc5bAfYB2Q7ZjYYiAzcPA.woff2', None, AUTHORED, True),
]

# the masthead's own copy: the type a phone shows before the faces arrive
DECK = ("I'm Tejal — a software engineer who turns new ideas into products: AI agents, data pipelines, "
        "and things that are fun to use. Right now I'm teaching AI agents to talk to real systems.")
HEADLINE = 'BUILDING SOFTWARE THAT FEELS OBVIOUS'

# stand-ins: (family, style, weight, web face + where on its axes to measure,
#             [(name, local() names, system font file, index in a .ttc, axis location)], sample)
NOTO = 'notoserif/v33/'
FALLBACKS = [
    ('Newsreader', 'normal', '400', ('newsreader', {'opsz': 20}), [
        ('Fallback', ['Georgia'], SYS + 'Supplemental/Georgia.ttf', None, None),
        # Android has no Georgia
        ('Fallback Noto', ['Noto Serif', 'NotoSerif'],
         NOTO + 'ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J4wsL2JAlAhZqFCTx8cKpKrCzi0i.woff2', None, {'wght': 400, 'wdth': 100}),
    ], DECK),
    ('Newsreader', 'italic', '400', ('newsreader-italic', {'opsz': 18}), [
        ('Fallback', ['Georgia Italic', 'Georgia-Italic'], SYS + 'Supplemental/Georgia Italic.ttf', None, None),
        ('Fallback Noto', ['Noto Serif Italic', 'NotoSerif-Italic'],
         NOTO + 'ga6saw1J5X9T9RW6j9bNfFIMZhhWnFTyNZIQD1-_FXP0RgnaOg9MYBNLg_cIrqvgyjUjHaA.woff2', None, {'wght': 400, 'wdth': 100}),
    ], DECK),
    ('Anton', 'normal', '400', ('anton', None), [
        ('Fallback', ['Impact'], SYS + 'Supplemental/Impact.ttf', None, None),
        # iOS has no Impact
        ('Fallback DIN', ['DIN Condensed Bold', 'DINCondensed-Bold'], SYS + 'Supplemental/DIN Condensed Bold.ttf', None, None),
    ], HEADLINE),
    ('Fraunces', 'normal', '600 900', ('fraunces', {'wght': 900, 'opsz': 48}), [
        ('Fallback', ['Georgia Bold', 'Georgia-Bold'], SYS + 'Supplemental/Georgia Bold.ttf', None, None),
    ], DECK),
    ('Fraunces', 'italic', '400 900', ('fraunces-italic', {'wght': 700, 'opsz': 24}), [
        ('Fallback', ['Georgia Bold Italic', 'Georgia-BoldItalic'], SYS + 'Supplemental/Georgia Bold Italic.ttf', None, None),
    ], DECK),
    ('JetBrains Mono', 'normal', '400 500', ('jetbrains-mono', {'wght': 400}), [
        ('Fallback', ['Menlo Regular', 'Menlo-Regular'], SYS + 'Menlo.ttc', 0, None),
    ], DECK),
    ('JetBrains Mono', 'normal', '600 700', ('jetbrains-mono', {'wght': 700}), [
        ('Fallback', ['Menlo Bold', 'Menlo-Bold'], SYS + 'Menlo.ttc', 1, None),
    ], DECK),
    ('Caveat', 'normal', '400 500', ('caveat', {'wght': 400}), [
        ('Fallback', ['Marker Felt Thin', 'MarkerFelt-Thin'], SYS + 'MarkerFelt.ttc', 0, None),
    ], DECK),
    ('Caveat', 'normal', '600 700', ('caveat', {'wght': 700}), [
        ('Fallback', ['Marker Felt Wide', 'MarkerFelt-Wide'], SYS + 'MarkerFelt.ttc', 1, None),
    ], DECK),
]


def fetch(path):
    dest = CACHE / path.replace('/', '_')
    if not dest.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(GS + path) as r:
            dest.write_bytes(r.read())
    return TTFont(dest, lazy=False)


def build(name, src, limits, chars):
    font = fetch(src)
    opts = subset.Options()
    opts.layout_features = ['*']  # kerning, ligatures, Caveat's alternates: all kept
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=chars & set(font.getBestCmap()))
    sub.subset(font)
    if limits:
        font = instancer.instantiateVariableFont(font, limits, updateFontNames=False)
    font.flavor = 'woff2'
    font.recalcTimestamp = False  # same input, same bytes
    OUT.mkdir(exist_ok=True)
    font.save(OUT / f'{name}.woff2')
    return font


def ranges(points):
    points = sorted(points)
    out, start = [], points[0]
    for a, b in zip(points, points[1:] + [None]):
        if b != a + 1:
            out.append(f'U+{start:04X}' + (f'-{a:04X}' if a != start else ''))
            start = b
    return ', '.join(out)


def width(font, text):
    cmap, hmtx = font.getBestCmap(), font['hmtx']
    return sum(hmtx[cmap[ord(c)]][0] for c in text if ord(c) in cmap) / font['head'].unitsPerEm


def pct(x):
    return f'{x * 100:.2f}%'


def main():
    built, lines, first_lines, late_lines = {}, [], [], []
    for name, family, style, weight, src, limits, chars, late in FACES:
        font = build(name, src, limits, chars)
        covered = set(font.getBestCmap())
        built[name] = (src, covered, family, style)
        size = (OUT / f'{name}.woff2').stat().st_size
        print(f'{name:22} {size / 1024:6.1f} KB  {len(covered)} characters')
        # what the copy asks for that the face never had (drawn from the stack instead, as before)
        lacks = sorted(c for c in chars - covered if c >= 0x20 and not 0x7f <= c <= 0x9f) if chars is AUTHORED else []
        note = f'  /* not in the face at all: {ranges(lacks)} */\n' if lacks else ''
        (late_lines if late else first_lines).append(
            f'@font-face {{\n{note}  font-family: "{family}";\n  src: url("../fonts/{name}.woff2") format("woff2");\n'
            f'  font-style: {style};\n  font-weight: {weight};\n  font-display: swap;\n'
            f'  unicode-range: {ranges(covered)};\n}}'
        )

    for family, style, weight, (web, at), stands, sample in FALLBACKS:
        src, covered, _, _ = built[web]
        ref = fetch(src)  # the whole face, at the place on its axes the page sets it
        if at:
            ref = instancer.instantiateVariableFont(ref, at)
        upm = ref['head'].unitsPerEm
        os2 = ref['OS/2']
        for suffix, local_names, path, index, loc in stands:
            if path.startswith(SYS):
                sys_font = TTCollection(path).fonts[index] if index is not None else TTFont(path)
            else:
                sys_font = fetch(path)
                if loc and 'fvar' in sys_font:
                    sys_font = instancer.instantiateVariableFont(sys_font, loc)
            adjust = width(ref, sample) / width(sys_font, sample)
            srcs = ', '.join(f'local("{n}")' for n in local_names)
            lines.append(
                f'@font-face {{\n  font-family: "{family} {suffix}";\n  src: {srcs};\n'
                f'  font-style: {style};\n  font-weight: {weight};\n  size-adjust: {pct(adjust)};\n'
                f'  ascent-override: {pct(os2.sTypoAscender / upm / adjust)};\n'
                f'  descent-override: {pct(-os2.sTypoDescender / upm / adjust)};\n'
                f'  line-gap-override: {pct(os2.sTypoLineGap / upm / adjust)};\n'
                f'  unicode-range: {ranges(covered)};\n}}'
            )

    head = '/* Generated by scripts/fonts/build.py: change that and run it, don\'t edit this.\n'
    CSS.write_text(head + ' * System fonts sized to stand in for each face until it arrives: the first frame is set\n'
                   ' * in these. The faces are in fonts-first.css and fonts-late.css. */\n\n' + '\n'.join(lines) + '\n')
    CSS_FIRST.write_text(head + ' * The faces the first screen sets, declared once its first frame has painted\n'
                         ' * (src/life/fonts.js). */\n\n' + '\n'.join(first_lines) + '\n')
    CSS_LATE.write_text(head + ' * The faces nothing on the first screen sets, declared once the page has loaded\n'
                        ' * too (src/life/fonts.js). */\n\n' + '\n'.join(late_lines) + '\n')
    print('wrote', ', '.join(str(p.relative_to(ROOT)) for p in (CSS, CSS_FIRST, CSS_LATE)))


if __name__ == '__main__':
    sys.exit(main())
