/* global __dirname */
const { chromium } = require('playwright');
const { full, BG } = require('./mark.js');
async function svg(page, markup, size, out, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out, omitBackground: !!transparent });
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const root = require('path').join(__dirname, '..', '..');
  const out = require('path').join(root, 'assets');
  const store = require('path').join(root, 'docs', 'launch', 'store-assets');
  await svg(p, full(), 1024, `${out}/icon.png`);
  await svg(p, full(), 512, `${store}/play-icon-512.png`);
  // Adaptive icon: only the centre 66% is guaranteed visible, so the mark shrinks to fit it.
  await svg(p, full({ bg: false, scale: 0.62 }), 1024, `${out}/android-icon-foreground.png`, true);
  await svg(p, BG, 1024, `${out}/android-icon-background.png`);
  await svg(p, full({ mono: true, scale: 0.62 }), 1024, `${out}/android-icon-monochrome.png`, true);
  await svg(p, full({ bg: false, scale: 0.9 }), 1024, `${out}/splash-icon.png`, true);
  await svg(p, full(), 48, `${out}/favicon.png`);
  await b.close();
})();
