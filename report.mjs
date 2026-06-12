import { writeFileSync } from 'fs';

// Receives the authenticated Playwright page (already on /portfolio/ after doVerify),
// navigates to the reports section, selects the abbreviated annual report type,
// searches, and downloads the result.
export async function doReport(page) {
  // ── Click "דוחות" in the top nav ────────────────────────────────────────────

  console.log('Clicking דוחות nav link...');
  await page.click('a[href*="personalreports"]');
  await page.waitForURL('**/personalreports/**', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // ── Stage 06: reports page loaded ───────────────────────────────────────────

  await page.screenshot({ path: '/data/screenshot-06-reports-page.png', fullPage: true });
  console.log('Screenshot saved: /data/screenshot-06-reports-page.png');
  writeFileSync('/data/dom-06-reports-page.html', await page.content(), 'utf-8');
  console.log('DOM saved: /data/dom-06-reports-page.html');

  // ── Select report type (סוג דוח) — last option: דו"ח שנתי מקוצר ────────────
  // The dropdown is likely an Angular Material mat-select or a native <select>.
  // Check dom-06-reports-page.html if this step fails.

  console.log('Opening report type dropdown...');

  const matSelect = page.locator('mat-select').first();
  const nativeSelect = page.locator('select').first();

  const isMatSelect = await matSelect.count() > 0;

  if (isMatSelect) {
    // Angular Material select — click to open panel, then pick last option
    await matSelect.click();
    await page.waitForSelector('mat-option', { state: 'visible', timeout: 5_000 });
    await page.locator('mat-option').last().click();
  } else {
    // Native select — use selectOption with the last option's value
    const lastValue = await nativeSelect.locator('option').last().getAttribute('value');
    await nativeSelect.selectOption(lastValue);
  }

  await page.waitForTimeout(500);

  // ── Stage 07: report type selected ──────────────────────────────────────────

  await page.screenshot({ path: '/data/screenshot-07-type-selected.png', fullPage: true });
  console.log('Screenshot saved: /data/screenshot-07-type-selected.png');
  writeFileSync('/data/dom-07-type-selected.html', await page.content(), 'utf-8');
  console.log('DOM saved: /data/dom-07-type-selected.html');

  // ── Click "לחיפוש דוח" ───────────────────────────────────────────────────────

  console.log('Clicking לחיפוש דוח...');
  await page.getByText('לחיפוש דוח').click();

  // Wait for results table to appear
  await page.waitForSelector('table', { state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(1000);

  // ── Stage 08: results found ──────────────────────────────────────────────────

  await page.screenshot({ path: '/data/screenshot-08-results-found.png', fullPage: true });
  console.log('Screenshot saved: /data/screenshot-08-results-found.png');
  writeFileSync('/data/dom-08-results-found.html', await page.content(), 'utf-8');
  console.log('DOM saved: /data/dom-08-results-found.html');

  // ── Click download button (↓) and save file ──────────────────────────────────

  console.log('Clicking download button...');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.locator('table tbody tr').first().getByRole('link').click(),
  ]);

  const downloadPath = '/data/report-download.' + (download.suggestedFilename().split('.').pop() || 'pdf');
  await download.saveAs(downloadPath);
  console.log(`Report downloaded: ${downloadPath}`);
}
