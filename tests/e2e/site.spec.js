// The whole page in a real browser: it loads clean, the name is never off the
// screen while the press hands it to the masthead (and never clipped after),
// the pen is the only cursor, the profile reads as a feature, the tiles turn
// over from anywhere but a link, the stamp sheet says plainly what happened
// to your stamp, the things to find tick off, and reduced motion leaves
// everything readable. The gratitude API and Turnstile are stubbed, so
// nothing here touches Cloudflare.
import { test, expect } from '@playwright/test';

const STAMPS = ['coffee', 'the sea', 'rain', 'friends'].map((word, i) => ({ word, x: 0.2 + i * 0.18, y: 0.3 + (i % 2) * 0.3 }));

async function open(page, { fresh = false, post } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('**/api/gratitude', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({ json: { open: true, stamps: STAMPS } })
      : r.fulfill(post || { json: { word: 'naps', printed: true } })
  );
  await page.route('**/turnstile/v0/api.js*', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: 'window.turnstile={render:(el,o)=>{setTimeout(()=>o.callback("tok"),30);return "w"},reset(){}}' })
  );
  // the projects' own sites are never visited from here
  await page.route(/https:\/\/(?!localhost)[^/]*tgoyal\.me\/.*/, (r) => r.abort());
  if (!fresh) await page.addInitScript(() => sessionStorage.setItem('press-loaded', '1'));
  await page.goto('/');
  await page.waitForTimeout(1500);
  return errors;
}
const scrollTo = (page, sel, off = -120) =>
  page.evaluate(
    ([s, o]) => {
      const y = document.querySelector(s).getBoundingClientRect().top + scrollY + o;
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
    },
    [sel, off]
  );

test('loads clean: no errors, no sideways scroll, every section present', async ({ page }) => {
  const errors = await open(page, { fresh: true });
  await page.waitForTimeout(3500); // the loader runs its course
  for (const s of ['hero', 'about', 'skills', 'projects', 'experience', 'writing', 'contact']) {
    await expect(page.locator(`[data-section="${s}"]`)).toHaveCount(1);
  }
  // nothing wider than the page (with the scrollbar's room kept, it can be a little narrower)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await expect(page.locator('.mast-deck')).toBeVisible();
  await expect(page.locator('.loader-edition')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the press: a scroll during the opening skips ahead, and the page waits for the name to land', async ({ page }) => {
  const errors = await open(page, { fresh: true });
  await page.mouse.move(700, 400);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 600);
  await expect(page.locator('.press-loader')).toHaveCount(0, { timeout: 6000 });
  expect(await page.evaluate(() => scrollY)).toBeLessThan(5);
  await expect(page.locator('.mast-plate')).toBeVisible();
  // and once it's home, the page scrolls as normal
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 500);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300);
  expect(errors).toEqual([]);
});

test('projects: each tile is dog-eared at the top right; Claubi switches off and on like an old monitor', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.tile--lead', -80);
  const lead = page.locator('.tile--lead');
  const [t, ear] = await Promise.all([lead.boundingBox(), lead.locator('.tile-ear').boundingBox()]);
  expect(Math.abs(ear.x + ear.width - (t.x + t.width))).toBeLessThan(4);
  expect(Math.abs(ear.y - t.y)).toBeLessThan(4);
  await expect(page.locator('.tile-peek')).toHaveCount(0);
  const claubi = page.locator('.tile[data-name="Claubi"]');
  await scrollTo(page, '.tile[data-name="Claubi"]', -200);
  await claubi.click({ position: { x: 60, y: 60 } });
  await expect(claubi.locator('.tile-crt')).toBeAttached();
  await expect(claubi.locator('.tile-scale')).toHaveCount(0);
  await expect(claubi.locator('.tile-crt')).toHaveCount(0, { timeout: 3000 });
  await expect(claubi).toHaveClass(/is-back/);
  await expect(claubi.locator('.tile-flip:focus')).toHaveCount(0);
});

test('the press: a clean first paint, and the name on screen in every frame of the hand-off', async ({ page }) => {
  // every frame from the first: is the name showing, either the loader's copy or the masthead's own?
  await page.addInitScript(() => {
    window.__frames = [];
    const look = () => {
      const plate = document.querySelector('.loader-plate');
      const paper = document.querySelector('.loader-paper');
      const html = document.documentElement;
      if (plate || window.__frames.length) {
        const cs = plate && getComputedStyle(plate);
        const inked = !!cs && cs.clipPath !== 'none' && !/100%/.test(cs.clipPath);
        const copy = !!plate && inked && Number(cs.opacity) > 0.5;
        const paperUp = !!paper && Number(getComputedStyle(paper).opacity) > 0.05;
        const real = !html.classList.contains('np-handoff') && !paperUp;
        window.__frames.push({ t: performance.now(), clip: cs?.clipPath || null, inked, copy, real, gone: !plate });
      }
      if (window.__frames.length < 600) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  const errors = await open(page, { fresh: true });
  await page.waitForTimeout(5000);
  const frames = await page.evaluate(() => window.__frames);
  expect(frames.length).toBeGreaterThan(30);
  // the very first paint is a blank sheet: the plate is hidden until the roller inks it
  expect(frames[0].clip).toMatch(/100%/);
  // once the name is inked, it never leaves the screen — not for a single frame
  const from = frames.findIndex((f) => f.inked);
  expect(from).toBeGreaterThanOrEqual(0);
  const bare = frames.slice(from).filter((f) => !f.copy && !f.real);
  expect(bare).toEqual([]);
  expect(frames.at(-1).gone).toBe(true);
  expect(errors).toEqual([]);
});

test('the nameplate: nothing ever clips its letters, even as they lift on the way down', async ({ page }) => {
  await open(page);
  for (const y of [0, 160, 360]) {
    await page.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true }), y);
    await page.waitForTimeout(600);
    const clipped = await page.evaluate(() => {
      const out = [];
      for (let el = document.querySelector('.mast-plate .np-sort:last-child'); el && el !== document.body; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (cs.clipPath !== 'none') out.push(`${el.className}: ${cs.clipPath}`);
        if (!/visible/.test(cs.overflow)) out.push(`${el.className}: overflow ${cs.overflow}`);
      }
      const L = document.querySelector('.mast-plate .np-sort:last-child').getBoundingClientRect();
      if (L.right > innerWidth) out.push('past the edge');
      return out;
    });
    expect(clipped, `at ${y}px`).toEqual([]);
  }
});

test('the pen is the only cursor, from the first paint, over links and inputs too', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit headless reports pointer: none');
  const errors = await open(page);
  expect(await page.evaluate(() => document.documentElement.classList.contains('cursor-hidden'))).toBe(true);
  await page.mouse.move(400, 400);
  for (const sel of ['a', 'button', 'input', '.tile', '.tile-flip', '.grateful-sheet', '.rh-settings-btn']) {
    const cursor = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).cursor, sel);
    expect(cursor, sel).toMatch(/none|url\(/);
  }
  // clicking never brings the OS cursor back
  await page.mouse.click(700, 500);
  expect(await page.evaluate(() => document.documentElement.classList.contains('cursor-hidden'))).toBe(true);
  expect(errors).toEqual([]);
});

test('profile: one paragraph with type, Dime and the Sudoku linked, a box of numbers and the Weekend Edition', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.about-grid');
  await page.waitForTimeout(1600); // the figures count up once
  const about = page.locator('.about');
  await expect(about.locator('.about-standfirst')).toContainText('I’m Tejal');
  await expect(about.locator('.about-body')).toHaveCount(0);
  await expect(about.locator('a.about-link')).toHaveCount(3);
  const sudoku = about.locator('a.about-link').last();
  await expect(sudoku).toHaveAttribute('href', 'https://sudoku.tgoyal.me');
  await expect(sudoku).toHaveAttribute('target', '_blank');
  await expect(sudoku).toHaveCSS('text-decoration-line', 'underline');
  await expect(about.locator('.about-num-fig')).toContainText(['8.82', '167', '5', 'months']);
  // the plan's own mark says whose it is
  await expect(about.locator('.about-num-mark')).toHaveCount(1);
  await expect(about.locator('.about-pq, .about-dial, .about-margin')).toHaveCount(0);
  await expect(about.locator('.weekend-desk')).toHaveCount(4);
  await expect(about).not.toContainText(/2002|published paper|Victoria|winter on a security desk/);
});

test('projects: a tile turns over from anywhere on it, in a wave of scales, and back', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.cf-front .tile:nth-child(2)');
  const tile = page.locator('.tile').nth(1);
  await expect(tile.locator('.tile-why')).toContainText('$16 sandwich');
  await expect(tile).toHaveCSS('user-select', 'none');
  // somewhere on the story itself, not the button
  const box = await tile.boundingBox();
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.35);
  await expect(tile).toHaveClass(/is-back/);
  await expect(tile.locator('.tile-scale').first()).toBeAttached();
  await page.waitForTimeout(1400);
  // the scales are gone once it's turned, and the full file is up; a click leaves focus be
  await expect(tile.locator('.tile-morph, .tile-clip')).toHaveCount(0);
  await expect(tile.locator('.tile-back')).toHaveClass(/is-up/);
  await expect(tile.locator('.tile-back .tile-long')).toBeVisible();
  await expect(tile.locator('.tile-back .tile-flip')).not.toBeFocused();
  // from the keyboard, back to the front, and focus follows to the front's button
  await tile.locator('.tile-back .tile-flip').focus();
  await page.keyboard.press('Enter');
  await expect(tile.locator('.tile-front .tile-flip')).toBeFocused();
  await expect(tile).not.toHaveClass(/is-back/);
  await page.waitForTimeout(1400);
  await expect(tile.locator('.tile-front')).toHaveClass(/is-up/);
});

test('projects: a link on a tile opens the project and leaves the tile as it is', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.cf-front .tile:nth-child(2)');
  const tile = page.locator('.tile').nth(1);
  const [popup] = await Promise.all([page.waitForEvent('popup'), tile.locator('.tile-front .story-link').first().click()]);
  expect(popup.url()).toContain('dime.tgoyal.me');
  await popup.close();
  await expect(tile).not.toHaveClass(/is-back/);
  await expect(page.locator('.tile-morph')).toHaveCount(0);
});

test('projects: stamps say LIVE, or one word for what a thing is', async ({ page }) => {
  await open(page);
  const labels = await page.locator('.projects .press-stamp').allTextContents();
  expect(labels.length).toBeGreaterThan(8);
  expect(labels.map((l) => l.trim())).not.toContain('REPO');
  for (const l of labels) expect(l.trim()).toMatch(/^[A-Z]+$/);
  await expect(page.locator('.tile', { hasText: 'Claubi' }).locator('.press-stamp')).toHaveText('OFFLINE');
});

test('things to find tick themselves off', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.about-grid', 300);
  await page.waitForTimeout(400);
  // a click on bare paper makes a wave
  await page.mouse.click(1380, 600);
  await page.getByRole('button', { name: 'Page settings' }).click();
  await expect(page.locator('.rh-finds li.is-found')).toContainText(['Make a wave on the paper']);
  // and picking another pen counts as changing the cursor (pens are offered to a mouse only)
  const picks = page.locator('.rh-pen-pick');
  if (await picks.count()) {
    await picks.nth(2).click();
    await expect(page.locator('.rh-finds li.is-found')).toHaveCount(2);
    await expect(page.locator('.rh-finds li.is-found')).toContainText(['Swap your pen']);
  }
});

test('page settings over the cube: clicks stay with the settings', async ({ page }) => {
  await open(page);
  await page.waitForTimeout(1500); // the cube arrives after the first paint
  await page.getByRole('button', { name: 'Page settings' }).click();
  const panel = page.locator('.rh-panel');
  await expect(panel).toBeVisible();
  // a bare spot of the panel that has the cube's slot under it
  const spot = await page.evaluate(() => {
    const p = document.querySelector('.rh-panel').getBoundingClientRect();
    const c = document.querySelector('[data-cube-home="hero"]').getBoundingClientRect();
    for (let y = Math.max(p.top, c.top) + 4; y < Math.min(p.bottom, c.bottom) - 4; y += 6)
      for (let x = Math.max(p.left, c.left) + 4; x < Math.min(p.right, c.right) - 4; x += 6) {
        const el = document.elementFromPoint(x, y);
        if (el && el.closest('.rh-panel') && !el.closest('button, input, label, a')) return { x, y };
      }
    return null;
  });
  test.skip(!spot, 'the panel does not sit over the cube at this size');
  await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(700);
  const finds = await page.evaluate(() => localStorage.getItem('press-finds') || '');
  expect(finds).not.toContain('twist');
  await expect(panel).toBeVisible();
});

test('stamp sheet: stamps are visible, and yours lands where you click', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.grateful', -200);
  await page.waitForTimeout(800);
  const first = page.locator('.gstamp').first();
  await expect(first).toBeVisible();
  const box = await first.boundingBox();
  expect(box.width).toBeGreaterThan(20);
  expect(Number(await first.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.5);
  await page.locator('.grateful-input').fill('naps');
  const sheet = await page.locator('.grateful-sheet').boundingBox();
  await page.mouse.click(sheet.x + sheet.width * 0.7, sheet.y + sheet.height * 0.5);
  const mine = page.locator('.gstamp.is-mine');
  await expect(mine).toBeVisible();
  const at = await mine.boundingBox();
  expect(Math.abs(at.x + at.width / 2 - (sheet.x + sheet.width * 0.7))).toBeLessThan(40);
  await expect(page.locator('.grateful-how')).toContainText('Stamped');
  // and there's room for two more today
  await expect(page.locator('.grateful-how')).toContainText('Two more today');
  await expect(page.locator('.grateful-input')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('press-letter-day'))).toMatch(/:1$/);
});

test('stamp sheet: three a day, then it says so and takes no more', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('press-letter-day', `${new Date().toISOString().slice(0, 10)}:2`));
  await open(page);
  await scrollTo(page, '.grateful', -200);
  await page.waitForTimeout(600);
  await expect(page.locator('.grateful-how')).toContainText('One more today');
  await page.locator('.grateful-input').fill('naps');
  await page.locator('.grateful-input').press('Enter');
  await expect(page.locator('.grateful-how')).toContainText('Stamped');
  await expect(page.locator('.grateful-input')).toHaveCount(0);
});

test('stamp sheet: when the network has stamped today, it says so', async ({ page }) => {
  await open(page, { post: { status: 429, json: { error: 'enough today' } } });
  await scrollTo(page, '.grateful', -200);
  await page.waitForTimeout(600);
  await page.locator('.grateful-input').fill('naps');
  await page.locator('.grateful-input').press('Enter');
  await expect(page.locator('.grateful-how')).toContainText('Someone on your network used up today’s three');
  await expect(page.locator('.gstamp.is-mine')).toHaveCount(0);
});

test('stamp sheet: every stamp is inked dark or red enough to read on the paper', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.grateful', -200);
  await page.waitForTimeout(800);
  // each face's ink, through a canvas, so oklch and rgb read the same
  const light = await page.locator('.gstamp-face').evaluateAll((faces) => {
    const ctx = document.createElement('canvas').getContext('2d');
    return faces
      .map((f) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = getComputedStyle(f).color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return { word: f.textContent, lum: 0.2126 * r + 0.7152 * g + 0.0722 * b };
      })
      .filter((x) => x.lum > 170);
  });
  expect(light).toEqual([]);
});

test('the car: pointing at it winks the lights, shows the note and counts as found', async ({ page }) => {
  const errors = await open(page);
  await scrollTo(page, '.contact-road', -500);
  await expect(page.locator('.car-canvas.is-ready')).toHaveCount(1, { timeout: 15000 });
  await page.waitForTimeout(2500); // it drives in
  await page.locator('.car-hit').hover({ force: true });
  await expect(page.locator('.car-note')).toHaveClass(/is-on/);
  expect(await page.evaluate(() => localStorage.getItem('press-finds') || '')).toContain('car');
  expect(errors).toEqual([]);
});

test('writing: the plane flies the posts in once, lets go, and they crawl on', async ({ page }) => {
  const errors = await open(page);
  await scrollTo(page, '.opdesk-strip-wrap', -300);
  await expect(page.locator('.tow.is-on')).toHaveCount(1, { timeout: 5000 });
  // off the left edge, and the first clipping is on the spread
  await expect(page.locator('.tow.is-on')).toHaveCount(0, { timeout: 8000 });
  const x = await page.locator('.opdesk-card').first().evaluate((c) => c.getBoundingClientRect().left);
  expect(x).toBeLessThan(await page.evaluate(() => innerWidth));
  expect(await page.evaluate(() => sessionStorage.getItem('press-towed'))).toBe('1');
  // picked up straight after, it moves with the pointer, never a whole set of posts along
  const card = page.locator('.opdesk-card').first();
  const wrap = await page.locator('.opdesk-strip-wrap').boundingBox();
  const before = await card.evaluate((c) => c.getBoundingClientRect().left);
  const y = wrap.y + wrap.height / 2;
  await page.mouse.move(wrap.x + 700, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(wrap.x + 700 - i * 16, y);
  const during = await card.evaluate((c) => c.getBoundingClientRect().left);
  await page.mouse.up();
  expect(Math.abs(during - (before - 160))).toBeLessThan(40);
  expect(errors).toEqual([]);
});

test('nameplate: back from the bottom, every letter keeps the width it was set at', async ({ page }) => {
  await open(page);
  const widths = () => page.locator('.np-sort').evaluateAll((els) => els.map((e) => e.style.width));
  const before = await widths();
  await page.evaluate(() => (window.__lenis ? window.__lenis.scrollTo(document.documentElement.scrollHeight, { immediate: true }) : scrollTo(0, 1e6)));
  await page.waitForTimeout(600);
  await page.setViewportSize({ width: page.viewportSize().width, height: page.viewportSize().height - 1 });
  await page.waitForTimeout(600);
  await page.evaluate(() => (window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0)));
  await page.waitForTimeout(600);
  expect(await widths()).toEqual(before);
});

test('in brief: the projects sit in three columns, all in view of the section', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.briefs', -100);
  await page.waitForTimeout(800);
  const lefts = await page.locator('.brief').evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().left)))]);
  expect(lefts.length).toBe(3);
});

test('phone: things to find only lists what a phone can do', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await open(page);
  await page.getByRole('button', { name: 'Page settings' }).click();
  const items = page.locator('.rh-finds li');
  await expect(items).not.toContainText(['Swap your pen']);
  const labels = await items.allTextContents();
  expect(labels.join('|')).not.toMatch(/Swap your pen|Spin the whole cube|Catch the bug/);
  await expect(page.locator('.rh-finds legend')).toContainText(`/ ${labels.length}`);
  await ctx.close();
});

test('contact: the resume sits where the stamp was and opens over the page', async ({ page }) => {
  await open(page);
  await expect(page.locator('.postage')).toHaveCount(0);
  await expect(page.locator('.contact-line')).toHaveCount(3);
  await scrollTo(page, '.contact', 0);
  await page.waitForTimeout(600);
  await page.locator('a.resume').click();
  const win = page.locator('.resume-window');
  await expect(win).toHaveAttribute('open', '');
  await expect(win.locator('iframe')).toHaveAttribute('src', /\/resume\.pdf/);
  await page.keyboard.press('Escape');
  await expect(win).not.toHaveAttribute('open', '');
  await expect(win.locator('iframe')).toHaveCount(0);
});

test('contact: the closing line is mine, and the colophon has no ©', async ({ page }) => {
  await open(page);
  await expect(page.locator('.contact-sub')).toContainText('talk F1');
  await expect(page.locator('.contact-colophon')).toContainText('broken by me (and Claude)');
  await expect(page.locator('.contact-colophon')).not.toContainText('©');
});

test('experience: just the line, no nib, no end mark', async ({ page }) => {
  await open(page);
  await expect(page.locator('.led-nib, .led-end')).toHaveCount(0);
  await expect(page.locator('.led-ink path')).toHaveCount(1);
});

test('phone width: no sideways scroll, and the tiles still turn', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = await open(page);
  // nothing wider than the page (with the scrollbar's room kept, it can be a little narrower)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await scrollTo(page, '.cf-front .tile:nth-child(3)');
  const tile = page.locator('.tile').nth(2);
  await tile.locator('.tile-name').tap();
  await expect(tile).toHaveClass(/is-back/);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('reduced motion: everything readable, nothing hidden, tiles swap at once', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = await open(page, { fresh: true });
  await page.waitForTimeout(1500);
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('main h2, main h3, main p, main li')]
      .filter((el) => el.offsetParent && el.textContent.trim() && !el.closest('[aria-hidden="true"], .story-file, .led-more, .tile-face:not(.is-up)'))
      .filter((el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.05) return true;
        return false;
      })
      .map((el) => el.className || el.tagName)
  );
  expect(hidden).toEqual([]);
  const tile = page.locator('.tile').nth(1);
  await tile.locator('.tile-front .tile-flip').click();
  await expect(tile.locator('.tile-back')).toHaveClass(/is-up/);
  await expect(tile.locator('.tile-scale')).toHaveCount(0);
  expect(errors).toEqual([]);
  await ctx.close();
});
