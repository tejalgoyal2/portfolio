// The gratitude sheet's word rules (lib/gratitude.js): what may be stamped,
// what waits for a look, and the request checks.
import { describe, it, expect } from 'vitest';
import { clean, listFlags, skeleton, same, readCapped, isJson, hostAllowed } from '../../lib/gratitude.js';

describe('clean: a word or two of letters, any language', () => {
  it('takes ordinary words, accents and other scripts', () => {
    expect(clean('Coffee')).toBe('coffee');
    expect(clean('  the   sea ')).toBe('the sea');
    expect(clean('café')).toBe('café');
    expect(clean('हैं')).toBe('हैं'); // हैं
  });
  it('refuses blanks, invisible characters and stacked marks', () => {
    const bad = [
      'ㅤ', // Hangul filler: a blank stamp
      'okㅤ',
      'ﾠ', // halfwidth Hangul filler
      'aᅟ', // Hangul choseong filler
      'fri͏ends', // combining grapheme joiner: a look-alike copy
      'hi️', // variation selector
      'a᠋b', // Mongolian free variation selector
      'a឴b', // Khmer inherent vowel
      'ź̂̃̄', // a tower of marks
      'a b c',
      '',
      42,
    ];
    for (const w of bad) expect(clean(w), JSON.stringify(w)).toBeNull();
  });
});

describe('listFlags: swearing waits for a look, however it is dressed up', () => {
  it('sees through accents and look-alike letters', () => {
    // fúck, fuсk (Cyrillic с), shιt (Greek ι)
    for (const w of ['fúck', 'fuсk', 'shιt', 'wanker', 'asshole']) expect(listFlags(clean(w) || w), w).toBe(true);
    expect(skeleton('fuсk')).toBe('fuck');
  });
  it('holds a word that mixes Latin with Cyrillic or Greek', () => {
    expect(listFlags('friеnds')).toBe(true); // Cyrillic е
  });
  it('lets ordinary words through', () => {
    const fine = ['coffee', 'the sea', 'friends', 'café', 'любовь', 'ευχαριστώ'];
    for (const w of fine) expect(listFlags(w), w).toBe(false);
  });
});

describe('request checks', () => {
  it('compares the admin secret exactly', async () => {
    const secret = 'a-long-enough-admin-secret-123';
    expect(await same(secret, secret)).toBe(true);
    expect(await same(secret + 'x', secret)).toBe(false);
    expect(await same('', secret)).toBe(false);
  });
  it('wants the JSON media type itself', () => {
    const req = (ct) => new Request('https://tgoyal.me/api/gratitude', { method: 'POST', headers: { 'content-type': ct } });
    expect(isJson(req('application/json'))).toBe(true);
    expect(isJson(req('application/json; charset=utf-8'))).toBe(true);
    expect(isJson(req('text/plain;application/json'))).toBe(false);
  });
  it('stops reading a body past the cap, chunked or not', async () => {
    const big = new ReadableStream({
      start(c) {
        for (let i = 0; i < 8; i++) c.enqueue(new Uint8Array(1024));
        c.close();
      },
    });
    expect(await readCapped(new Request('https://x/', { method: 'POST', body: big, duplex: 'half' }), 4096)).toBeNull();
    expect(await readCapped(new Request('https://x/', { method: 'POST', body: '{"word":"tea"}' }), 4096)).toBe('{"word":"tea"}');
  });
  it('takes stamps from the live site only', () => {
    expect(hostAllowed('tgoyal.me')).toBe(true);
    expect(hostAllowed('www.tgoyal.me')).toBe(true);
    expect(hostAllowed('revamp-2.portfolio-7en.pages.dev')).toBe(false);
    expect(hostAllowed('evil.com')).toBe(false);
  });
});
