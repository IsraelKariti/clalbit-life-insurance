import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Types text one character at a time with a random delay between keystrokes.
// Direct .fill() does not fire the events Angular listens to for validation.
async function typeHuman(page, locator, text) {
  await locator.click();
  for (const char of String(text)) {
    await page.keyboard.type(char);
    await page.waitForTimeout(rand(80, 150));
  }
}

// Selector lists in priority order.
// Check dom-01-page-loaded.html if a waitForSelector call times out — the actual
// attribute names will be visible there and you can update these lists.

// Israeli national ID input (9-digit number)
const ID_SELECTORS = [
  'input[formcontrolname="idNumber"]',
  'input[formcontrolname="id"]',
  'input[formcontrolname="identityNumber"]',
  'input[formcontrolname="teudat"]',
  'input[ng-model*="id" i]',
  'input[ng-model*="teudat" i]',
  'input[placeholder*="תעודת"]',  // תעודת
  'input[placeholder*="ת.ז"]',                     // ת.ז
  'input[id*="id" i]:not([id*="submit"])',
  'input[name*="id" i]:not([name*="submit"])',
].join(', ');

// Mobile phone number (full number — e.g. 0501234567)
const PHONE_SELECTORS = [
  'input[formcontrolname="phoneNumber"]',
  'input[formcontrolname="phone"]',
  'input[formcontrolname="mobile"]',
  'input[formcontrolname="cellPhone"]',
  'input[ng-model*="phone" i]',
  'input[ng-model*="mobile" i]',
  'input[type="tel"]',
  'input[placeholder*="טלפון"]',  // טלפון
  'input[placeholder*="נייד"]',         // נייד
  'input[name*="phone" i]',
].join(', ');

// Submit / send-OTP button
const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button.submit-btn',
  'button.btn-submit',
  'button.login-btn',
  'button[class*="submit" i]',
  'button[class*="send" i]',
  'button[class*="login" i]',
].join(', ');

// Opens Chrome, navigates to the Clalbit login page, fills in the ID and phone
// number, and submits the first form. Returns the Playwright page object so
// that server.mjs can pass it to doVerify() for the OTP step.
export async function doLogin(idNumber, phoneNumber) {
  // ── Launch browser ──────────────────────────────────────────────────────────

  console.log('Launching Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',  // use system-installed Chrome, not Playwright's bundled Chromium
    headless: false,    // keep window visible for screenshots
  });

  const context = await browser.newContext({
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  });

  // Remove the navigator.webdriver flag that Playwright sets by default —
  // some sites detect it and block automated browsers
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
  });

  const page = await context.newPage();

  // ── Navigate ────────────────────────────────────────────────────────────────

  console.log('Navigating to Clalbit login page...');
  // waitUntil: 'networkidle' lets Angular finish bootstrapping and rendering the form
  await page.goto('https://www.clalbit.co.il/login', { waitUntil: 'networkidle', timeout: 30_000 });
  console.log('Page loaded (network idle).');

  // Extra buffer for any deferred Angular rendering after network settles
  await page.waitForTimeout(2000);

  // ── Stage 01: page loaded — empty form ─────────────────────────────────────
  // Inspect dom-01-page-loaded.html to find the correct input selectors if the
  // waitForSelector calls below time out.

  await page.screenshot({ path: '/app/screenshot-01-page-loaded.png', fullPage: true });
  console.log('Screenshot saved: /app/screenshot-01-page-loaded.png');
  writeFileSync('/app/dom-01-page-loaded.html', await page.content(), 'utf-8');
  console.log('DOM saved: /app/dom-01-page-loaded.html');

  // ── Fill ID number ──────────────────────────────────────────────────────────

  console.log('Waiting for ID input...');
  await page.waitForSelector(ID_SELECTORS, { state: 'visible', timeout: 15_000 });

  console.log(`Entering ID: ${idNumber}`);
  await typeHuman(page, page.locator(ID_SELECTORS).first(), idNumber);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(rand(250, 450));

  // ── Fill phone number ───────────────────────────────────────────────────────

  console.log('Waiting for phone input...');
  await page.waitForSelector(PHONE_SELECTORS, { state: 'visible', timeout: 10_000 });

  console.log(`Entering phone: ${phoneNumber}`);
  await typeHuman(page, page.locator(PHONE_SELECTORS).first(), phoneNumber);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(rand(350, 600));

  // ── Stage 02: credentials filled — ID + phone entered ──────────────────────

  await page.screenshot({ path: '/app/screenshot-02-credentials-filled.png', fullPage: true });
  console.log('Screenshot saved: /app/screenshot-02-credentials-filled.png');
  writeFileSync('/app/dom-02-credentials-filled.html', await page.content(), 'utf-8');
  console.log('DOM saved: /app/dom-02-credentials-filled.html');

  // ── Wait for submit button to enable ────────────────────────────────────────
  // Angular validates both fields before enabling the submit button

  console.log('Waiting for submit button to become enabled...');
  try {
    await page.waitForFunction(
      selector => {
        const btn = document.querySelector(selector);
        return btn && !btn.disabled;
      },
      SUBMIT_SELECTORS,
      { timeout: 15_000 }
    );
  } catch {
    console.warn('Submit button did not become enabled within 15 s — trying to click anyway.');
  }

  // ── Click submit ────────────────────────────────────────────────────────────

  console.log('Clicking submit...');
  await page.locator(SUBMIT_SELECTORS).first().click();
  await page.waitForTimeout(3000);

  // ── Stage 03: OTP screen ────────────────────────────────────────────────────

  await page.screenshot({ path: '/app/screenshot-03-otp-screen.png', fullPage: true });
  console.log('Screenshot saved: /app/screenshot-03-otp-screen.png');
  writeFileSync('/app/dom-03-otp-screen.html', await page.content(), 'utf-8');
  console.log('DOM saved: /app/dom-03-otp-screen.html');

  return page;
}
