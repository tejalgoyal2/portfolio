// The page's own font subsets (scripts/fonts/build.py) against the copy in
// src/: Anton and Caveat only carry the characters written there, so a new
// one in the copy means running the build again, or it would be drawn in a
// stand-in face. (What the font itself never had, the build notes in the
// stylesheet.) The nameplate's face only carries the letters of the name.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = join(import.meta.dirname, '../..');
const css = ['fonts.css', 'fonts-first.css', 'fonts-late.css'].map((f) => readFileSync(join(ROOT, 'src/styles', f), 'utf8')).join('\n');
const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => {
  const get = (p) => body.match(new RegExp(`${p}:\\s*([^;]+);`))?.[1].trim();
  const lacks = body.match(/not in the face at all: ([^*]+)\*/)?.[1];
  return { family: get('font-family').replace(/"/g, ''), src: get('src'), range: get('unicode-range'), lacks: lacks ? points(lacks) : new Set() };
});

function points(spec) {
  return new Set(
    spec.split(',').flatMap((part) => {
      const [a, b = a] = part.trim().slice(2).split('-').map((h) => parseInt(h, 16));
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    }),
  );
}

// Google Fonts' "latin" file: what the faces were cut from (anything else
// was never drawn in them)
const LATIN = points(
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, ' +
    'U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', middot: '·', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', times: '×' };

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : ['.js', '.jsx'].includes(extname(e.name)) ? [join(dir, e.name)] : [],
  );
}

function copyChars() {
  const seen = new Set();
  for (const f of [join(ROOT, 'index.html'), ...files(join(ROOT, 'src'))]) {
    const text = readFileSync(f, 'utf8')
      .replace(/\\u\{?([0-9a-fA-F]{4,5})\}?/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
      .replace(/&([a-z]+);/gi, (m, name) => {
        if (!(name in ENTITIES)) throw new Error(`${f}: add ${m} to ENTITIES in this test`);
        return ENTITIES[name];
      });
    for (const ch of text) if (LATIN.has(ch.codePointAt(0))) seen.add(ch.codePointAt(0));
  }
  return seen;
}

describe('fonts', () => {
  it('every face the stylesheet names is in src/fonts', () => {
    const files = faces.filter((f) => f.src.startsWith('url(')).map((f) => f.src.match(/\.\.\/fonts\/([\w-]+\.woff2)/)[1]);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(existsSync(join(ROOT, 'src/fonts', f)), f).toBe(true);
  });

  it('Anton and Caveat carry every character the copy uses (else: python3 scripts/fonts/build.py)', () => {
    const used = copyChars();
    for (const family of ['Anton', 'Caveat']) {
      const face = faces.find((f) => f.family === family && f.src.startsWith('url('));
      const has = points(face.range);
      const missing = [...used].filter((c) => c >= 0x20 && !has.has(c) && !face.lacks.has(c)).map((c) => `U+${c.toString(16).toUpperCase()} ${String.fromCodePoint(c)}`);
      expect(missing, family).toEqual([]);
    }
  });

  it('the nameplate face has every letter of the name, in the masthead and the loader', () => {
    const face = faces.find((f) => f.family === 'Fraunces Nameplate');
    const has = points(face.range);
    const hero = readFileSync(join(ROOT, 'src/sections/Hero.jsx'), 'utf8').match(/<Nameplate text="([^"]+)"/)[1];
    const loader = readFileSync(join(ROOT, 'src/press/Loader.jsx'), 'utf8');
    const copies = [hero, loader.match(/className="loader-ghost"[^>]*>([^<]+)</)[1], loader.match(/\[\.\.\.'([^']+)'\]/)[1]];
    for (const name of copies) {
      expect([...name].filter((c) => !has.has(c.codePointAt(0))), name).toEqual([]);
    }
  });

  it('each stand-in covers exactly what its face draws', () => {
    for (const f of faces.filter((f) => f.src.startsWith('local('))) {
      const web = faces.filter((w) => w.src.startsWith('url(') && f.family.startsWith(w.family + ' '));
      expect(web.map((w) => w.range), f.family).toContain(f.range);
    }
  });
});
