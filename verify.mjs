import { writeFileSync } from 'fs';

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Types text one character at a time with a random delay between keystrokes.
// Angular Material inputs don't respond to .fill() for validation purposes.
async function typeHuman(page, locator, text) {
  await locator.click();
  for (const char of String(text)) {
    await page.keyboard.type(char);
    await page.waitForTimeout(rand(80, 150));
  }
}

// Receives the Playwright page that doLogin() left open on the OTP screen,
// types the 6-digit OTP, submits, and saves screenshots + DOM snapshots.
export async function doVerify(page, otp) {
  // ── Fill OTP ────────────────────────────────────────────────────────────────
  // formcontrolname="otp", maxlength=6, inputmode=numeric, autocomplete=one-time-code

  console.log('Waiting for OTP input...');
  await page.waitForSelector('input[formcontrolname="otp"]', { state: 'visible', timeout: 30_000 });

  console.log(`Entering OTP: ${otp}`);
  await typeHuman(page, page.locator('input[formcontrolname="otp"]'), otp);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(rand(300, 500));

  // ── Stage 04: OTP filled ─────────────────────────────────────────────────────

  await page.screenshot({ path: '/data/screenshot-04-otp-filled.png', fullPage: true });
  console.log('Screenshot saved: /data/screenshot-04-otp-filled.png');
  writeFileSync('/data/dom-04-otp-filled.html', await page.content(), 'utf-8');
  console.log('DOM saved: /data/dom-04-otp-filled.html');

  // ── Submit OTP ───────────────────────────────────────────────────────────────
  // Button class is "main-button wave-btn" — the wave-btn class is unique to
  // this button and avoids matching the site header's search button[type="submit"]

  console.log('Waiting for OTP submit button to become enabled...');
  try {
    await page.waitForSelector('button.wave-btn:not([disabled])', { timeout: 10_000 });
  } catch {
    console.warn('OTP submit button did not become enabled within 10 s.');
  }

  console.log('Clicking OTP submit (כניסה לחשבון)...');
  await page.click('button.wave-btn');
  await page.waitForTimeout(3000);

  // ── Stage 05: authenticated ──────────────────────────────────────────────────

  await page.screenshot({ path: '/data/screenshot-05-authenticated.png', fullPage: true });
  console.log('Screenshot saved: /data/screenshot-05-authenticated.png');
  writeFileSync('/data/dom-05-authenticated.html', await page.content(), 'utf-8');
  console.log('DOM saved: /data/dom-05-authenticated.html');
}
