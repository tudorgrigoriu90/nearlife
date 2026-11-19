// Public legal pages (T-095, T-228), published on nytta-ai.se from docs/legal by
// pipeline/legal_site.py. These are the URLs given to Google Play; keep them stable. The
// account-deletion page (nearby/delete-account/) is listed there only: the app deletes in Settings.
export const PRIVACY_POLICY_URL = 'https://nytta-ai.se/nearby/privacy/';

// Where to report an invasive species (T-336 · review F-01): the national reporting page of the
// Swedish EPA, the Swedish Agency for Marine and Water Management and SLU, which forwards to
// Artportalen's form for wanted invasive species. The Director confirms it (T-339).
export const INVASIVE_REPORT_URL = 'https://www.invasivaarter.nu/';

// Report a sighting to Artportalen (T-354 · review F-15), Sweden's species observation system,
// run by SLU. Its front page, with nothing in the link: the app passes no species, place or
// account, so reporting is the user's own act on Artportalen's site, under its own account.
export const ARTPORTALEN_URL = 'https://www.artportalen.se/';
