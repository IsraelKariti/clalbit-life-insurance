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
  // The <a class="table-item-absolute"> has no href — Angular handles the click.
  // getByRole('link') won't match it (ARIA "link" role requires href), so use
  // a class selector. Also watch for new-page popup as a fallback download path.

  console.log('Clicking download button...');

  const downloadEvent = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
  const newPageEvent = page.context().waitForEvent('page', { timeout: 20_000 }).catch(() => null);

  await page.locator('a.table-item-absolute').first().click();

  // Stage 09: capture state right after click for debugging
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/data/screenshot-09-after-download-click.png', fullPage: true });
  console.log('Screenshot saved: /data/screenshot-09-after-download-click.png');
  writeFileSync('/data/dom-09-after-download-click.html', await page.content(), 'utf-8');
  console.log('DOM saved: /data/dom-09-after-download-click.html');

  const download = await downloadEvent;
  const newPage = await newPageEvent;

  if (download) {
    const ext = download.suggestedFilename().split('.').pop() || 'pdf';
    const downloadPath = `/data/report-download.${ext}`;
    await download.saveAs(downloadPath);
    console.log(`Report saved: ${downloadPath}`);
  } else if (newPage) {
    const url = newPage.url();
    console.log(`Download opened new page/popup: ${url}`);
    await newPage.waitForLoadState('networkidle').catch(() => {});
    await newPage.screenshot({ path: '/data/screenshot-10-download-page.png', fullPage: true });
    writeFileSync('/data/dom-10-download-page.html', await newPage.content(), 'utf-8');
    console.log('Screenshot and DOM of new page saved');
    await newPage.close();
  } else {
    console.error('Download did not complete — no download event and no new page opened. Check screenshot-09.');
  }
}
