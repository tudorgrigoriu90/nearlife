// "Identify with iNaturalist" (T-223). Until our own on-phone identification ships (T-222, v2),
// the app hands the user to Seek by iNaturalist: free, no account needed, works offline, and made
// for families. We open its Play Store listing, which shows "Open" when Seek is already
// installed. Android cannot launch another app by package name through a plain link, and nothing
// here needs the package-visibility permission that checking for it would.
//
// Nothing is sent to iNaturalist by us: no photo, no location, no account id.

export const SEEK_MARKET_URL = 'market://details?id=org.inaturalist.seek';
export const SEEK_WEB_URL = 'https://play.google.com/store/apps/details?id=org.inaturalist.seek';

/** Open Seek's listing: the Play Store app, else the web listing. False if neither opens. */
export async function openIdentifier(open: (url: string) => Promise<unknown>): Promise<boolean> {
  for (const url of [SEEK_MARKET_URL, SEEK_WEB_URL]) {
    try {
      await open(url);
      return true;
    } catch {
      // No Play Store app (an emulator, a de-Googled phone): try the next.
    }
  }
  return false;
}
