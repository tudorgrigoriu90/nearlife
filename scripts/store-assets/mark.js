// T-097: the Nearby mark, a map pin holding a leaf, in the app's greens (components use #2f7d4f,
// #3a7d44, #1c3a28 and #f4f8f2). Regenerate every icon with `node scripts/store-assets/render.js`
// and the feature graphics with `node scripts/store-assets/feature.js` (needs Playwright).
// Coordinates are in a 1024 box; the pin is centred at (512, 512) and ~600 tall.
const PIN = 'M512 212c-128 0-232 102-232 230 0 160 196 352 216 372a22 22 0 0 0 32 0c20-20 216-212 216-372 0-128-104-230-232-230z';
const LEAF = 'M512 300c-70 40-110 110-104 180 4 52 38 92 92 104v66a12 12 0 0 0 24 0v-66c54-12 88-52 92-104 6-70-34-140-104-180z';
const VEIN = 'M512 330v268 M512 420l-46-34 M512 470l50-38 M512 520l-56-38';
function full({ bg = true, mono = false, scale = 1 } = {}) {
  const t = `translate(512 512) scale(${scale}) translate(-512 -512)`;
  const defs = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#3a8a4f"/><stop offset="1" stop-color="#1c3a28"/></linearGradient>
    <linearGradient id="lf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fae5a"/><stop offset="1" stop-color="#2f7d4f"/></linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0b1f12" flood-opacity="0.35"/></filter></defs>`;
  // Themed (monochrome) icon: Android tints the opaque pixels, so the leaf is cut out of the pin.
  if (mono) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <mask id="m"><rect width="1024" height="1024" fill="#fff"/><path d="${LEAF}" transform="${t}" fill="#000"/></mask>
    <path d="${PIN}" transform="${t}" fill="#fff" mask="url(#m)"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}
    ${bg ? '<rect width="1024" height="1024" fill="url(#bg)"/>' : ''}
    <g transform="${t}"><path d="${PIN}" fill="#f4f8f2" filter="url(#sh)"/><path d="${LEAF}" fill="url(#lf)"/>
    <path d="${VEIN}" stroke="#eaf4ea" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.85"/></g></svg>`;
}
const BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#3a8a4f"/><stop offset="1" stop-color="#1c3a28"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/></svg>`;
module.exports = { full, BG, PIN, LEAF, VEIN };
