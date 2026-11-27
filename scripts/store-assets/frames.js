/* global __dirname */
// Store screenshots with a caption (T-398): each raw shot from screenshots.js, framed on the
// feature graphic's green with one Swedish line above it, at 1080x1920. Play allows captions on
// screenshots as long as the app is shown as it is; the shots themselves are untouched.
//
//   node scripts/store-assets/frames.js <raw-shots-dir> [sv]
//
// Writes docs/launch/store-assets/screenshots/<lang>/<n>-<name>.png. Captions follow the app's
// honest-copy rule: "active in your county this season", never "here right now".
const { readFileSync, readdirSync, mkdirSync } = require('fs');
const { join } = require('path');

const CAPTIONS = {
  sv: {
    '01-this-week': 'Se vad som är aktivt i ditt län den här säsongen',
    '02-protected': 'Fridlysta arter – och hur du skyddar dem',
    '03-two-languages': 'Artkort på svenska och på ditt eget språk',
    '04-show-me': 'Visa bara det du gillar: fåglar, fiskar, växter …',
    '05-calendar': 'Naturens kalender, månad för månad',
    '06-counties': 'Utforska alla 21 län',
  },
};

const W = 1080;
const H = 1920;
const SHOT_W = 760; // the raw shots are 1:2, so 760 x 1520 under a two-line caption

function page(caption, png) {
  return `<html><body style="margin:0">
  <div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;
    background:linear-gradient(165deg,#3a8a4f 0%,#24573a 55%,#1c3a28 100%);
    font-family:'Inter','Segoe UI',Roboto,system-ui,sans-serif">
    <div style="position:absolute;left:90px;right:90px;top:96px;height:200px;display:flex;align-items:center;
      justify-content:center;text-align:center;color:#f4f8f2;font-size:62px;font-weight:800;line-height:1.15;
      letter-spacing:-1px">${caption}</div>
    <img src="data:image/png;base64,${png.toString('base64')}" style="position:absolute;left:${(W - SHOT_W) / 2}px;
      top:${H - SHOT_W * 2 - 40}px;width:${SHOT_W}px;height:${SHOT_W * 2}px;border-radius:44px;
      box-shadow:0 24px 60px rgba(8,26,14,.45);border:6px solid rgba(244,248,242,.9)">
  </div></body></html>`;
}

async function main() {
  const [rawDir, ...langs] = process.argv.slice(2);
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: W, height: H } });
  for (const lang of langs.length ? langs : ['sv']) {
    const out = join(__dirname, '..', '..', 'docs', 'launch', 'store-assets', 'screenshots', lang);
    mkdirSync(out, { recursive: true });
    const raw = readdirSync(rawDir).filter((f) => f.startsWith(`${lang}-`) && f.endsWith('.png'));
    for (const [name, caption] of Object.entries(CAPTIONS[lang])) {
      const file = raw.find((f) => f === `${lang}-${name}.png`);
      if (!file) {
        console.log(`${lang} ${name}: no raw shot, skipped`);
        continue;
      }
      await tab.setContent(page(caption, readFileSync(join(rawDir, file))));
      await tab.screenshot({ path: join(out, `${name}.png`) });
      console.log(`${lang} ${name}`);
    }
  }
  await browser.close();
}

module.exports = { CAPTIONS };
if (require.main === module) main();
