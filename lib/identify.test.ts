import { openIdentifier, SEEK_MARKET_URL, SEEK_WEB_URL } from './identify';

describe('openIdentifier (T-223)', () => {
  it('opens Seek by iNaturalist in the Play Store app', async () => {
    const open = jest.fn().mockResolvedValue(undefined);
    await expect(openIdentifier(open)).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith(SEEK_MARKET_URL);
  });

  it('falls back to the web listing when there is no Play Store app', async () => {
    const open = jest.fn().mockRejectedValueOnce(new Error('no handler')).mockResolvedValueOnce(undefined);
    await expect(openIdentifier(open)).resolves.toBe(true);
    expect(open).toHaveBeenLastCalledWith(SEEK_WEB_URL);
  });

  it('never throws, even if nothing can open a link', async () => {
    const open = jest.fn().mockRejectedValue(new Error('none'));
    await expect(openIdentifier(open)).resolves.toBe(false);
  });

  it('points at the official Seek package only', () => {
    expect(SEEK_MARKET_URL).toBe('market://details?id=org.inaturalist.seek');
    expect(SEEK_WEB_URL).toBe('https://play.google.com/store/apps/details?id=org.inaturalist.seek');
  });
});
