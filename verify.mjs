import { writeFileSync } from 'fs';

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Types text one character at a time with a random delay between keystrokes
// to keep Angular change detection happy and avoid bot-detection throttling.
async function typeHuman(page, locator, text) {
  await locator.click();
  for (const char of String(text)) {
    await page.keyboard.type(char);
    await page.waitForTimeout(rand(80, 150));
  }
}

// Receives the Playwright page that doLogin() left open on the OTP screen,
// types the OTP, submits, and saves screenshots + DOM snapshots.
export async function doVerify(page, otp) {
  // ── Fill OTP ────────────────────────────────────────────────────────────────
  // Clalbit's OTP input selector — check dom-03-otp-screen.html if this fails.
  // Common patterns: formcontrolname="otp" / formcontrolname="code" / id*="otp"
  const OTP_SELECTOR = [
    'input[formcontrolname="otp"]',
    'input[formcontrolname="code"]',
    'input[formcontrolname="verificationCode"]',
    'input[id*="otp" i]',
    'input[id*="code" i]',
    'input[name*="otp" i]',
    'input[placeholder*="קוד"]',  // "code" in Hebrew
  ].join(', ');

  console.log('Waiting for OTP input...');
  await page.waitForSelector(OTP_SELECTOR, { state: 'visible', timeout: 30_000 });

  console.log(`Entering OTP: ${otp}`);
  await typeHuman(page, page.locator(OTP_SELECTOR).first(), otp);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(rand(300, 500));

  // ── Stage 04: OTP filled ─────────────────────────────────────────────────────

  await page.screenshot({ path: '/app/screenshot-04-otp-filled.png', fullPage: true });
  console.log('Screenshot saved: /app/screenshot-04-otp-filled.png');
  writeFileSync('/app/dom-04-otp-filled.html', await page.content(), 'utf-8');
  console.log('DOM saved: /app/dom-04-otp-filled.html');

  // ── Submit OTP ───────────────────────────────────────────────────────────────

  const OTP_SUBMIT_SELECTOR = [
    'button[type="submit"]',
    'button.submit-btn',
    'button.btn-submit',
    'button.login-btn',
    'button[class*="submit" i]',
    'button[class*="confirm" i]',
  ].join(', ');

  // Wait for the submit button to become enabled after OTP validation
  console.log('Waiting for OTP submit button to become enabled...');
  try {
    await page.waitForFunction(
      selector => {
        const btn = document.querySelector(selector);
        return btn && !btn.disabled;
      },
      OTP_SUBMIT_SELECTOR,
      { timeout: 10_000 }
    );
  } catch {
    console.warn('OTP submit button did not become enabled within 10 s — the OTP may be wrong or expired.');
  }

  console.log('Clicking OTP submit...');
  await page.locator(OTP_SUBMIT_SELECTOR).first().click();
  await page.waitForTimeout(3000);

  // ── Stage 05: authenticated ──────────────────────────────────────────────────

  await page.screenshot({ path: '/app/screenshot-05-authenticated.png', fullPage: true });
  console.log('Screenshot saved: /app/screenshot-05-authenticated.png');
  writeFileSync('/app/dom-05-authenticated.html', await page.content(), 'utf-8');
  console.log('DOM saved: /app/dom-05-authenticated.html');
}
