// T-097: the Nearby mark, a children's-book blue tit (blåmes) on a branch inside a location pin,
// in the app's greens. Ink outlines with watercolour-style paint set slightly off the lines. One
// source for every size: `node scripts/store-assets/render.js` (icons) and
// `node scripts/store-assets/feature.js` (feature graphics); both need Playwright.
const PIN = 'M512 212c-128 0-232 102-232 230 0 160 196 352 216 372a22 22 0 0 0 32 0c20-20 216-212 216-372 0-128-104-230-232-230z';
const INK = '#26301f';
const DEFS = `<linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#3a8a4f"/><stop offset="1" stop-color="#1c3a28"/></linearGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0b1f12" flood-opacity="0.35"/></filter>
<filter id="wob" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="11"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter>
<filter id="wc" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="5" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="10" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="9" result="m"/>
  <feColorMatrix in="m" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -0.45 1.15" result="mask"/>
  <feComposite in="d" in2="mask" operator="in"/></filter>
<clipPath id="pinclip"><path d="${PIN}"/></clipPath>`;

// Shapes (paint offset a little from the ink, like a picture book)
const S = {
  branch: 'M320 604 C390 592 470 586 560 576 C620 569 670 562 720 556 L722 574 C670 582 620 590 560 596 C470 606 390 612 322 622 Z',
  twig: 'M640 566 C652 540 668 522 688 512',
  leaf1: 'M670 516 C670 486 694 462 722 458 C724 488 702 512 670 516 Z',
  leaf2: 'M380 596 C360 620 360 650 376 668 C394 648 398 620 380 596 Z',
  tail: 'M400 520 C360 520 330 500 312 470 C346 470 352 488 344 470 C372 480 396 490 418 500 Z',
  body: 'M420 560 C380 530 382 450 430 410 C470 376 540 370 590 396 C636 420 652 470 640 512 C628 552 590 580 540 584 C495 588 452 582 420 560 Z',
  belly: 'M470 560 C470 520 500 480 560 470 C610 464 640 488 636 520 C628 556 590 580 540 584 C510 586 486 578 470 560 Z',
  wing: 'M420 470 C450 446 500 450 524 480 C540 504 530 540 500 556 C470 570 430 560 412 536 C398 516 402 486 420 470 Z',
  cap: 'M470 400 C500 372 560 368 596 392 C580 404 548 408 520 410 C500 412 482 410 470 400 Z',
  cheek: 'M520 420 C560 410 610 420 628 450 C630 476 600 486 566 482 C536 478 516 460 520 420 Z',
  stripe: 'M518 446 C540 440 560 440 574 442',
};
const EYE = `<circle cx="594" cy="442" r="19" fill="${INK}"/><circle cx="601" cy="435" r="7" fill="#fff"/><circle cx="588" cy="450" r="3" fill="#fff"/>`;
const BEAK = `<path d="M634 446 L670 452 L636 460 Z M636 462 L664 464 L636 470 Z" fill="#f2a33a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
const paint = (d, c, dx = 0, dy = 0) => `<path d="${d}" fill="${c}" transform="translate(${dx} ${dy})" filter="url(#wc)"/>`;
const ink = (d, w = 8) => `<path d="${d}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`;
const ART = `
  ${paint(S.tail, '#3d7fd6', 4, 3)}${ink(S.tail)}
  ${paint(S.branch, '#9a6a3c', 3, 4)}${ink(S.branch)}
  ${paint(S.body, '#7fb24a', 5, 4)}
  ${paint(S.belly, '#f6d23c', 4, 3)}
  ${paint(S.wing, '#4a8fe0', 4, 4)}${ink('M430 500 C452 492 476 496 492 510 M428 524 C450 518 474 520 488 532', 5)}
  ${paint(S.cap, '#2f6fd0', 3, 3)}
  ${paint(S.cheek, '#ffffff', 2, 2)}
  ${ink(S.body)}${ink(S.wing, 7)}${ink(S.cap, 6)}${ink(S.stripe, 9)}
  ${ink('M500 584 l-6 22 M530 586 l2 20', 6)}
  ${EYE}${BEAK}
  <circle cx="606" cy="478" r="12" fill="#ff8f8f" opacity="0.55"/>
  ${ink(S.twig, 6)}${paint(S.leaf1, '#8ccf55', 3, 3)}${ink(S.leaf1, 6)}
`;
// The bird sits in the pin's round head; this places it there at a given overall scale.
const PLACE = 'translate(506 446) scale(1.0) translate(-520 -490)';
// Themed (monochrome) icon: Android tints the opaque pixels, so the bird and branch are cut out
// of the pin as one simple silhouette (watercolour detail would turn to noise).
const SILHOUETTE =
  [S.tail, S.body, S.branch, S.leaf1, 'M630 444 L676 456 L630 470 Z'].map((d) => `<path d="${d}" fill="#000"/>`).join('') +
  // The eye stays solid so the head reads as a head.
  '<circle cx="594" cy="442" r="20" fill="#fff"/>';

/** The pin with the bird, no background, in the 1024 box. */
function mark() {
  return `<path d="${PIN}" fill="#f4f8f2" filter="url(#sh)"/>
  <g clip-path="url(#pinclip)"><g filter="url(#wob)" transform="${PLACE}">${ART}</g></g>`;
}

function full({ bg = true, mono = false, scale = 1 } = {}) {
  const t = `translate(512 512) scale(${scale}) translate(-512 -512)`;
  if (mono) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <mask id="m"><rect width="1024" height="1024" fill="#fff"/><g transform="${t}"><g transform="${PLACE}">${SILHOUETTE}</g></g></mask>
    <path d="${PIN}" transform="${t}" fill="#fff" mask="url(#m)"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs>${DEFS}</defs>
  ${bg ? '<rect width="1024" height="1024" fill="url(#bg)"/>' : ''}<g transform="${t}">${mark()}</g></svg>`;
}

const BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#3a8a4f"/><stop offset="1" stop-color="#1c3a28"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/></svg>`;

module.exports = { full, BG, PIN, DEFS, mark };
