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
  for (const sel of ['a', 'button', 'input', '.story-try', '.grateful-sheet']) {
    const cursor = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).cursor, sel);
    expect(cursor, sel).toMatch(/none|url\(/);
  }
  // clicking never brings the OS cursor back
  await page.mouse.click(700, 500);
  expect(await page.evaluate(() => document.documentElement.classList.contains('cursor-hidden'))).toBe(true);
  expect(errors).toEqual([]);
});

test('profile: the dial re-sets the story', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.about-grid');
  const story = page.locator('.about-story');
  await expect(story.locator('.about-p')).toHaveCount(2);
  await page.getByRole('radio', { name: '5 sec' }).click();
  await expect(story.locator('.about-p')).toHaveCount(1);
  await page.getByRole('radio', { name: '2 min' }).click();
  expect(await story.locator('.about-p').count()).toBeGreaterThan(4);
  await expect(page.locator('.about-col--rail')).not.toContainText(/published paper|Victoria/);
});

test('projects: every try-it works', async ({ page }) => {
  await open(page);
  await scrollTo(page, '.cf-front');
  await page.locator('.try-type').click();
  await page.keyboard.type('hello');
  await expect(page.locator('.try-type-g')).toHaveCount(5);
  await page.locator('.try-dime-say').first().click();
  await expect(page.locator('.try-dime-row')).toHaveCount(1);
  await page.locator('.try-chain-step button').nth(1).click();
  await expect(page.locator('.try-chain-step.is-gone')).toHaveCount(2);
  await page.locator('.try-permit-no').click();
  await expect(page.locator('.try-permit-line:not(.is-quiet)')).toHaveCount(1);
  await expect(page.locator('.story-link').first()).toHaveCSS('border-top-style', 'solid');
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

test('experience: the nib rides above the dots', async ({ page }) => {
  await open(page);
  const z = await page.evaluate(() => getComputedStyle(document.querySelector('.led-nib')).zIndex);
  expect(Number(z)).toBeGreaterThan(0);
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
