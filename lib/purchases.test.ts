import { RevenueCatPurchaseGateway, type RevenueCatModule } from './purchases';

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
