/* global __dirname */
const { chromium } = require('playwright');
const { PIN, LEAF, VEIN } = require('./mark.js');
const COPY = {
  en: { tag: 'The wildlife and plants active in your county, season by season.', sub: 'Over 8,000 Swedish species · No ads' },
  sv: { tag: 'Djur och växter som är aktiva i ditt län, säsong för säsong.', sub: 'Över 8 000 svenska arter · Ingen reklam' },
};
const mark = `<svg viewBox="270 200 484 640" width="150" height="198"><defs><linearGradient id="lf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fae5a"/><stop offset="1" stop-color="#2f7d4f"/></linearGradient></defs><path d="${PIN}" fill="#f4f8f2"/><path d="${LEAF}" fill="url(#lf)"/><path d="${VEIN}" stroke="#eaf4ea" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.85"/></svg>`;
const hills = `<svg viewBox="0 0 1024 500" width="1024" height="500" style="position:absolute;inset:0" preserveAspectRatio="none">
  <circle cx="860" cy="150" r="70" fill="#f4f8f2" opacity="0.14"/>
  <circle cx="860" cy="150" r="44" fill="#f4f8f2" opacity="0.18"/>
  <path d="M0 360 C180 300 320 330 480 350 S800 300 1024 330 V500 H0z" fill="#2b6b3e" opacity="0.55"/>
  <path d="M0 410 C200 370 380 400 560 405 S860 370 1024 390 V500 H0z" fill="#1f4f2e" opacity="0.8"/>
  <g fill="#1a4426">${[...Array(9)].map((_, i) => { const x = 640 + i * 42, h = 70 + (i * 37) % 50; return `<path d="M${x} ${465 - h} l-17 ${h + 10} h34z"/>`; }).join('')}</g>
  <path d="M0 455 C220 430 420 450 620 452 S900 430 1024 440 V500 H0z" fill="#16381f"/>
</svg>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  for (const [lang, c] of Object.entries(COPY)) {
    await p.setContent(`<html><body style="margin:0"><div style="position:relative;width:1024px;height:500px;overflow:hidden;background:linear-gradient(160deg,#3a8a4f,#1c3a28);font-family:'Inter','Segoe UI',Roboto,system-ui,sans-serif">
      ${hills}
      <div style="position:absolute;left:72px;top:92px;display:flex;align-items:center;gap:36px">
        <div style="filter:drop-shadow(0 10px 18px rgba(11,31,18,.35))">${mark}</div>
        <div style="color:#f4f8f2;max-width:520px">
          <div style="font-size:84px;font-weight:800;letter-spacing:-2px;line-height:1">Nearby</div>
          <div style="font-size:28px;line-height:1.3;margin-top:16px;opacity:.95">${c.tag}</div>
          <div style="font-size:19px;margin-top:18px;color:#cfe8d2">${c.sub}</div>
        </div></div></div></body></html>`);
    await p.screenshot({ path: require('path').join(__dirname, '..', '..', 'docs', 'launch', 'store-assets', `feature-graphic-${lang}.png`) });
  }
  await b.close();
})();
