import { RevenueCatPurchaseGateway, WITHHELD_PURCHASES, type RevenueCatModule } from './purchases';

function fakeModule(over: Partial<RevenueCatModule> = {}): RevenueCatModule & { configure: jest.Mock } {
  return {
    configure: jest.fn(),
    logIn: jest.fn().mockResolvedValue({}),
    getProducts: jest.fn().mockResolvedValue([
      { identifier: 'family', priceString: '99,00 kr' },
      { identifier: 'full_game', priceString: '49,00 kr' },
      { identifier: 'unrelated', priceString: '1 kr' },
    ]),
    purchaseStoreProduct: jest.fn().mockResolvedValue({}),
    restorePurchases: jest.fn().mockResolvedValue({}),
    PRODUCT_CATEGORY: { NON_SUBSCRIPTION: 'NON_SUBSCRIPTION' },
    ...over,
  } as RevenueCatModule & { configure: jest.Mock };
}

const USER = '0e08dc15-1111-4222-8333-444455556666';

describe('RevenueCatPurchaseGateway', () => {
  it('is unavailable without the native module or a key, and never throws for it', async () => {
    expect(new RevenueCatPurchaseGateway(null, 'goog_x', async () => USER).available()).toBe(false);
    expect(new RevenueCatPurchaseGateway(fakeModule(), '', async () => USER).available()).toBe(false);
    await expect(new RevenueCatPurchaseGateway(null, 'goog_x', async () => USER).products()).resolves.toEqual([]);
  });

  it('configures once, with the Supabase user id, so webhook events name the account', async () => {
    const mod = fakeModule();
    const gw = new RevenueCatPurchaseGateway(mod, 'goog_x', async () => USER);
    await gw.products();
    await gw.products();
    expect(mod.configure).toHaveBeenCalledTimes(1);
    expect(mod.configure).toHaveBeenCalledWith({ apiKey: 'goog_x', appUserID: USER });
  });

  it('lists our one-time products in display order, with the store’s own localized price', async () => {
    const gw = new RevenueCatPurchaseGateway(fakeModule(), 'goog_x', async () => USER);
    await expect(gw.products()).resolves.toEqual([
      { sku: 'full_game', priceString: '49,00 kr' },
      { sku: 'family', priceString: '99,00 kr' },
    ]);
  });

  it('buys a product', async () => {
    const mod = fakeModule();
    const gw = new RevenueCatPurchaseGateway(mod, 'goog_x', async () => USER);
    await expect(gw.purchase('family')).resolves.toBe('purchased');
    expect(mod.purchaseStoreProduct).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'family' }));
  });

  it('treats the user backing out as a choice, not an error', async () => {
    const mod = fakeModule({
      purchaseStoreProduct: jest.fn().mockRejectedValue(Object.assign(new Error('cancelled'), { userCancelled: true })),
    });
    const gw = new RevenueCatPurchaseGateway(mod, 'goog_x', async () => USER);
    await expect(gw.purchase('full_game')).resolves.toBe('cancelled');
  });

  it('passes a real failure on', async () => {
    const mod = fakeModule({ purchaseStoreProduct: jest.fn().mockRejectedValue(new Error('billing unavailable')) });
    const gw = new RevenueCatPurchaseGateway(mod, 'goog_x', async () => USER);
    await expect(gw.purchase('full_game')).rejects.toThrow('billing unavailable');
  });

  it('refuses to buy a product the store did not return', async () => {
    const mod = fakeModule({ getProducts: jest.fn().mockResolvedValue([]) });
    const gw = new RevenueCatPurchaseGateway(mod, 'goog_x', async () => USER);
    await expect(gw.purchase('family')).rejects.toThrow('not available');
  });

  it('restores purchases', async () => {
    const mod = fakeModule();
    await new RevenueCatPurchaseGateway(mod, 'goog_x', async () => USER).restore();
    expect(mod.restorePurchases).toHaveBeenCalled();
  });
});

describe('county packs (T-105)', () => {
  it('lists the requested products in the requested order', async () => {
    const mod = fakeModule({
      getProducts: jest.fn().mockResolvedValue([
        { identifier: 'region_swe_9', priceString: '29,00 kr' },
        { identifier: 'all_regions', priceString: '99,00 kr' },
      ]),
    });
    const gw = new RevenueCatPurchaseGateway(mod, 'goog_x', async () => USER);
    await expect(gw.products(['all_regions', 'region_swe_9', 'region_swe_1'])).resolves.toEqual([
      { sku: 'all_regions', priceString: '99,00 kr' },
      { sku: 'region_swe_9', priceString: '29,00 kr' },
    ]);
    expect(mod.getProducts).toHaveBeenCalledWith(['all_regions', 'region_swe_9', 'region_swe_1'], 'NON_SUBSCRIPTION');
  });
});


// T-271 · review B-21: the SDK kept the first account's id for the life of the process, so a
// purchase after account deletion or sign-in named an account that no longer exists.
describe('RevenueCat follows the current account', () => {
  const OTHER = '5e6763d4-aaaa-4bbb-8ccc-ddddeeeeffff';

  it('logs in with the new id when the account changed before a purchase or restore', async () => {
    const mod = fakeModule();
    let current = USER;
    const gw = new RevenueCatPurchaseGateway(mod, 'goog_x', async () => current);
    await gw.products();
    current = OTHER;
    await gw.purchase('full_game');
    expect(mod.logIn).toHaveBeenCalledWith(OTHER);
    await gw.restore();
    expect(mod.logIn).toHaveBeenCalledTimes(1); // already on the new id
    expect(mod.configure).toHaveBeenCalledTimes(1);
  });

  it('does not log in while the account is unchanged', async () => {
    const mod = fakeModule();
    const gw = new RevenueCatPurchaseGateway(mod, 'goog_x', async () => USER);
    await gw.purchase('full_game');
    await gw.restore();
    expect(mod.logIn).not.toHaveBeenCalled();
  });
});

// T-281 · review B-53: the under-13 path. Screens that sell hide their buy buttons when the gateway
// is unavailable; this one also refuses if something calls it anyway.
describe('WITHHELD_PURCHASES', () => {
  it('is unavailable, lists nothing, and refuses to buy or restore', async () => {
    expect(WITHHELD_PURCHASES.available()).toBe(false);
    await expect(WITHHELD_PURCHASES.products()).resolves.toEqual([]);
    await expect(WITHHELD_PURCHASES.purchase('full_game')).rejects.toThrow('withheld');
    await expect(WITHHELD_PURCHASES.restore()).rejects.toThrow('withheld');
  });
});
