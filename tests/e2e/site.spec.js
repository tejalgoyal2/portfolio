// The whole page in a real browser: it loads clean, every section is there,
// the pen is the only cursor, the try-its and the profile dial work, the stamp
// sheet takes a stamp you can see, and reduced motion leaves everything
// readable. The gratitude API and Turnstile are stubbed, so nothing here
// touches Cloudflare.
import { test, expect } from '@playwright/test';

const STAMPS = ['coffee', 'the sea', 'rain', 'friends'].map((word, i) => ({ word, x: 0.2 + i * 0.18, y: 0.3 + (i % 2) * 0.3 }));

async function open(page, { fresh = false } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('**/api/gratitude', (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { open: true, stamps: STAMPS } }) : r.fulfill({ json: { word: 'naps', printed: true } })
  );
  await page.route('**/turnstile/v0/api.js*', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: 'window.turnstile={render:(el,o)=>{setTimeout(()=>o.callback("tok"),30);return "w"},reset(){}}' })
  );
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await expect(page.locator('.mast-deck')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the pen is the only cursor, from the first paint, over links and inputs too', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit headless reports pointer: none');
  const errors = await open(page);
  expect(await page.evaluate(() => document.documentElement.classList.contains('cursor-hidden'))).toBe(true);
  await page.mouse.move(400, 400);
  for (const sel of ['a', 'button', 'input', '.tile', '.grateful-sheet', '.rh-settings-btn']) {
    const cursor = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).cursor, sel);
    expect(cursor, sel).toMatch(/none|url\(/);
  }
  // clicking never brings the OS cursor back
  await page.mouse.click(700, 500);
  expect(await page.evaluate(() => document.documentElement.classList.contains('cursor-hidden'))).toBe(true);
  expect(errors).toEqual([]);
});

test('profile: one calm story, no birth year, no city', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.about-grid');
  await expect(page.locator('.about-story, .about-dial')).toHaveCount(0);
  await expect(page.locator('.about-col--story .about-p')).toHaveCount(2);
  const rail = page.locator('.about-col--rail');
  await expect(rail).toContainText('Claude Pro since');
  await expect(rail).not.toContainText(/2002|published paper|Victoria/);
  await expect(page.locator('.about-margin li')).toHaveCount(7);
});

test('projects: tiles turn over to the full file and back', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.cf-front');
  const tile = page.locator('.tile').first();
  await expect(tile.locator('.tile-why')).toContainText('mechanical keyboard');
  await tile.getByRole('button', { name: /Turn it over/ }).click();
  await expect(tile).toHaveClass(/is-flipped/);
  await page.waitForTimeout(1100);
  await expect(tile.locator('.tile-back .tile-long')).toBeVisible();
  await expect(tile.locator('.tile-back .tile-flip')).toBeFocused();
  await tile.getByRole('button', { name: /Turn it back/ }).click();
  await expect(tile).not.toHaveClass(/is-flipped/);
  await expect(page.locator('.story-link').first()).toHaveCSS('border-top-style', 'solid');
});

test('things to find tick themselves off', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.about-grid', 300);
  await page.waitForTimeout(400);
  // a click on bare paper makes a wave
  await page.mouse.click(1380, 600);
  await page.getByRole('button', { name: 'Page settings' }).click();
  await expect(page.locator('.rh-finds li.is-found')).toContainText(['Make a wave on the paper']);
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
});

test('experience: just the line, no nib, no end mark', async ({ page }) => {
  await open(page);
  await expect(page.locator('.led-nib, .led-end')).toHaveCount(0);
  await expect(page.locator('.led-ink path')).toHaveCount(1);
});

test('reduced motion: everything readable, nothing hidden', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = await open(page, { fresh: true });
  await page.waitForTimeout(1500);
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('main h2, main h3, main p, main li')]
      .filter((el) => el.offsetParent && el.textContent.trim() && !el.closest('[aria-hidden="true"], .story-file, .led-more'))
      .filter((el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.05) return true;
        return false;
      })
      .map((el) => el.className || el.tagName)
  );
  expect(hidden).toEqual([]);
  expect(errors).toEqual([]);
  await ctx.close();
});
