/* global __dirname */
// T-226: Google Play phone screenshots, taken from the real app (Play requires they show the app as
// it is). The app's web build is walked through onboarding in Kronoberg, then each screen is shot
// at 1080x1920 (9:16). It runs in the Store screenshots workflow, because the live catalogue and
// species photos are only reachable from CI.
//
//   node scripts/store-assets/screenshots.js <base-url> <out-dir> [en|sv ...]
//
// Button labels come from the app's own strings (lib/i18n/index.ts), so a copy change can't break
// the walk silently. A screen that fails is reported and skipped; the run fails only if no
// screenshot was taken.
const { readFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const I18N = readFileSync(join(__dirname, '..', '..', 'lib', 'i18n', 'index.ts'), 'utf8');
const SV_START = I18N.indexOf('const sv: Catalog');

/** The string for `key` in `locale`, read from the en or sv catalogue in lib/i18n/index.ts. */
function label(key, locale, vars = {}) {
  const body = locale === 'sv' ? I18N.slice(SV_START) : I18N.slice(0, SV_START);
  const m = body.match(new RegExp(`'${key.replace(/\./g, '\\.')}':\\s*'([^']*)'`));
  if (!m) throw new Error(`no ${locale} string for ${key}`);
  return m[1].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Every string the walk taps; the test checks each exists in both languages.
const LABEL_KEYS = [
  'onboarding.welcome.cta', 'onboarding.age.cta', 'onboarding.location.cta', 'onboarding.hometown.cta',
  'onboarding.notif.cta', 'onboarding.firstSpotted.cta', 'card.back', 'nav.settings', 'settings.done',
  'settings.counties', 'dual.toggle', 'interests.title', 'almanac.title', 'calendar.entry',
];

// Växjö: resolves to Kronoberg, the content-voice benchmark county.
const HOME = { latitude: 56.879, longitude: 14.806 };
const COUNTY = 'Kronoberg';
// The species the walk opens (T-398): a resident bird for the protection line, a swan for the card
// in two languages; both are on Kronoberg's This Week list all year. Arabic is the largest
// immigrant language in Sweden, so it is the second language shown.
const SPECIES = { sv: { bird: 'Talgoxe', swan: 'Sångsvan' }, en: { bird: 'Great Tit', swan: 'Whooper Swan' } };
const SECOND_LANGUAGE = 'العربية';

async function tap(page, text) {
  // Exact first; some labels carry an icon in the same text node ("⚙ Settings").
  const exact = page.getByText(text, { exact: true });
  await ((await exact.count()) ? exact : page.getByText(text)).first().click();
  await page.waitForTimeout(1200);
}

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  // Every photo loaded, or the shot has empty cards (the This Week strips did).
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function run(baseUrl, outDir, locale) {
  const L = (key, vars) => label(key, locale, vars);
  const names = SPECIES[locale];
  // Required here, not at the top: CI installs Playwright only in the screenshot job.
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  // 1:2, the tallest phone shot Play takes: a card's title and its text fit together.
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 720 },
    deviceScaleFactor: 3,
    geolocation: HOME,
    permissions: ['geolocation', 'notifications'],
    locale: locale === 'sv' ? 'sv-SE' : 'en-GB',
    timezoneId: 'Europe/Stockholm',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${locale}] page error: ${e.message}`));
  const taken = [];
  const shot = async (name, steps) => {
    try {
      await steps();
      await settle(page);
      const path = join(outDir, `${locale}-${name}.png`);
      await page.screenshot({ path });
      taken.push(path);
      console.log(`[${locale}] ${name}`);
    } catch (e) {
      console.log(`[${locale}] ${name} skipped: ${e.message.split('\n')[0]}`);
      console.log((await page.innerText('body').catch(() => '')).slice(0, 400));
    }
  };
  const back = async () => {
    await page.getByText(L('card.back')).first().click();
    await page.waitForTimeout(1200);
  };
  const home = async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
  };

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await tap(page, L('onboarding.welcome.cta'));
  await page.locator('input').first().fill('1990');
  await tap(page, L('onboarding.age.cta'));
  await tap(page, L('onboarding.location.cta'));
  await tap(page, L('onboarding.hometown.cta', { region: COUNTY }));
  await tap(page, L('onboarding.notif.cta'));
  await tap(page, L('onboarding.firstSpotted.cta'));
  // The county catalogue (several pages) carries the protection level a card shows; let it land.
  await page.waitForTimeout(8000);

  await shot('01-this-week', async () => {});
  await shot('02-protected', async () => {
    await tap(page, names.bird);
    await page.getByText(locale === 'sv' ? /Fridlyst/ : /Protected/).first().waitFor({ timeout: 20000 });
  });
  await back();
  await shot('04-show-me', async () => {
    await tap(page, L('nav.settings'));
    await page.locator('div').filter({ has: page.getByText(L('dual.toggle'), { exact: true }) }).getByRole('switch').last().click();
    await page.waitForTimeout(1200);
    await tap(page, SECOND_LANGUAGE);
    await page.getByText(L('interests.title'), { exact: true }).scrollIntoViewIfNeeded();
  });
  await page.getByText(L('settings.done'), { exact: true }).locator('visible=true').first().click({ force: true });
  await page.waitForTimeout(2000);
  await shot('03-two-languages', async () => {
    await tap(page, names.swan);
    await page.waitForTimeout(4000);
    // Down to the facts, the title still on screen: Swedish and Arabic one under the other.
    await page.mouse.move(180, 400);
    await page.mouse.wheel(0, 210);
    await page.waitForTimeout(1000);
  });
  await home();
  await shot('05-calendar', async () => {
    await tap(page, L('almanac.title'));
    await tap(page, L('calendar.entry'));
  });
  await home();
  await shot('06-counties', async () => {
    await tap(page, L('nav.settings'));
    await tap(page, L('settings.counties'));
  });
  await browser.close();
  return taken;
}

async function main() {
  const [baseUrl, outDir, ...locales] = process.argv.slice(2);
  mkdirSync(outDir, { recursive: true });
  let total = 0;
  for (const locale of locales.length ? locales : ['sv', 'en']) total += (await run(baseUrl, outDir, locale)).length;
  console.log(`${total} screenshots in ${outDir}`);
  if (total === 0) process.exit(1);
}

module.exports = { label, LABEL_KEYS };
if (require.main === module) main();
