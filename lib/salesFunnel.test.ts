import { InMemoryTracker } from './analytics';
import { TrackingPurchaseGateway, salesFunnel } from './salesFunnel';
import type { PurchaseGateway } from './purchases';

function gateway(outcome: 'purchased' | 'cancelled' | Error): PurchaseGateway {
  return {
    available: () => true,
    products: jest.fn().mockResolvedValue([]),
    purchase: outcome instanceof Error ? jest.fn().mockRejectedValue(outcome) : jest.fn().mockResolvedValue(outcome),
    restore: jest.fn().mockResolvedValue(undefined),
  };
}

describe('TrackingPurchaseGateway (T-087)', () => {
  it('records a completed purchase as started then completed, with the product', async () => {
    const t = new InMemoryTracker();
    await expect(new TrackingPurchaseGateway(gateway('purchased'), t).purchase('full_game')).resolves.toBe('purchased');
    expect(t.events).toEqual([
      { event: 'purchase_started', props: { sku: 'full_game' } },
      { event: 'purchase_completed', props: { sku: 'full_game' } },
    ]);
  });

  it('records a user backing out as cancelled', async () => {
    const t = new InMemoryTracker();
    await new TrackingPurchaseGateway(gateway('cancelled'), t).purchase('family');
    expect(t.ofType('purchase_cancelled')).toEqual([{ event: 'purchase_cancelled', props: { sku: 'family' } }]);
  });

  it('records a failure and still passes the error on', async () => {
    const t = new InMemoryTracker();
    await expect(new TrackingPurchaseGateway(gateway(new Error('billing')), t).purchase('region_swe_13')).rejects.toThrow('billing');
    expect(t.ofType('purchase_failed')).toEqual([{ event: 'purchase_failed', props: { sku: 'region_swe_13' } }]);
  });

  it('passes everything else straight through', async () => {
    const inner = gateway('purchased');
    const gw = new TrackingPurchaseGateway(inner, new InMemoryTracker());
    expect(gw.available()).toBe(true);
    await gw.restore();
    expect(inner.restore).toHaveBeenCalled();
  });
});

describe('salesFunnel', () => {
  it('counts each step of the taste funnel and the conversion between them', () => {
    const t = new InMemoryTracker();
    for (let i = 0; i < 10; i++) t.track('paywall_shown', {});
    for (let i = 0; i < 4; i++) t.track('store_opened', { source: 'paywall' });
    t.track('store_opened', { source: 'settings' }); // not from the sheet: not this funnel
    for (let i = 0; i < 3; i++) t.track('purchase_started', { sku: 'full_game' });
    for (let i = 0; i < 2; i++) t.track('purchase_completed', { sku: 'full_game' });
    t.track('purchase_completed', { sku: 'region_swe_13' }); // a county pack is a separate funnel
    expect(salesFunnel(t.events)).toEqual({
      outOfCatches: 10,
      storeOpened: 4,
      purchaseStarted: 3,
      fullGameBought: 2,
      conversion: 0.2,
    });
  });

  it('reports zero conversion, not NaN, before anyone runs out of catches', () => {
    expect(salesFunnel([]).conversion).toBe(0);
  });
});
