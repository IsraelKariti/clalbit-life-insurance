import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Types text one character at a time with a random delay between keystrokes.
// Angular Material inputs don't respond to .fill() for validation purposes —
// character-by-character typing fires the input events the form control needs.
async function typeHuman(page, locator, text) {
  await locator.click();
  for (const char of String(text)) {
    await page.keyboard.type(char);
    await page.waitForTimeout(rand(80, 150));
  }
}

// Opens Chrome, navigates to the Clalbit login page, fills in the ID (ת.ז/ח.פ)
// and mobile phone number, and submits the form. Returns the Playwright page
// so server.mjs can pass it to doVerify() for the OTP step.
export async function doLogin(idNumber, phoneNumber) {
  // ── Launch browser ──────────────────────────────────────────────────────────

  console.log('Launching Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',  // use system-installed Chrome, not Playwright's bundled Chromium
    headless: false,
  });

  const context = await browser.newContext({
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  });

  // Remove the navigator.webdriver flag to avoid bot detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
  });

  const page = await context.newPage();

  // ── Navigate ────────────────────────────────────────────────────────────────

  console.log('Navigating to Clalbit login page...');
  // networkidle lets Angular 13 finish bootstrapping and rendering the form
  await page.goto('https://www.clalbit.co.il/login', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2000);

  // ── Stage 01: page loaded — empty form ─────────────────────────────────────

  await page.screenshot({ path: '/app/screenshot-01-page-loaded.png', fullPage: true });
  console.log('Screenshot saved: /app/screenshot-01-page-loaded.png');
  writeFileSync('/app/dom-01-page-loaded.html', await page.content(), 'utf-8');
  console.log('DOM saved: /app/dom-01-page-loaded.html');

  // ── Fill ID number (ת.ז/ח.פ) ────────────────────────────────────────────────

  console.log('Waiting for ID input...');
  await page.waitForSelector('input[formcontrolname="tz"]', { state: 'visible', timeout: 15_000 });

  console.log(`Entering ID: ${idNumber}`);
  await typeHuman(page, page.locator('input[formcontrolname="tz"]'), idNumber);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(rand(250, 450));

  // ── Fill mobile phone number ─────────────────────────────────────────────────
  // Single field — full 10-digit number (e.g. 0501234567), no prefix dropdown

  console.log('Waiting for phone input...');
  await page.waitForSelector('input[formcontrolname="mobile"]', { state: 'visible', timeout: 10_000 });

  console.log(`Entering phone: ${phoneNumber}`);
  await typeHuman(page, page.locator('input[formcontrolname="mobile"]'), phoneNumber);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(rand(350, 600));

  // ── Stage 02: credentials filled ────────────────────────────────────────────

  await page.screenshot({ path: '/app/screenshot-02-credentials-filled.png', fullPage: true });
  console.log('Screenshot saved: /app/screenshot-02-credentials-filled.png');
  writeFileSync('/app/dom-02-credentials-filled.html', await page.content(), 'utf-8');
  console.log('DOM saved: /app/dom-02-credentials-filled.html');

  // ── Click submit (שליחה) ────────────────────────────────────────────────────
  // The terms checkbox is pre-checked in the DOM; SMS send-type is selected by
  // default. No extra interaction needed before clicking submit.

  console.log('Clicking submit...');
  await page.click('button.main-button');
  await page.waitForTimeout(3000);

  // ── Stage 03: OTP screen ────────────────────────────────────────────────────

  await page.screenshot({ path: '/app/screenshot-03-otp-screen.png', fullPage: true });
  console.log('Screenshot saved: /app/screenshot-03-otp-screen.png');
  writeFileSync('/app/dom-03-otp-screen.html', await page.content(), 'utf-8');
  console.log('DOM saved: /app/dom-03-otp-screen.html');

  return page;
}
