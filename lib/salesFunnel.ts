import type { Tracker, TrackedEvent } from './analytics';
import type { PurchaseGateway, PurchaseOutcome, Sku, StoreProduct } from './purchases';

// The sales funnel (T-087 · ECONOMY "the single most important number"): of the people who use up
// their 3 free catches, how many open the Store, start a purchase, and buy the catch unlock? It is
// measured, never pushed. The out-of-catches sheet stays the only sales signal (ECONOMY), and these
// events are anonymous and sent only with analytics consent (ConsentGatedTracker, T-088).

/**
 * Wraps the purchase gateway so every purchase screen (Store, Counties) reports the same steps:
 * started, then completed, cancelled or failed. Errors still reach the caller.
 */
export class TrackingPurchaseGateway implements PurchaseGateway {
  constructor(
    private readonly inner: PurchaseGateway,
    private readonly tracker: Tracker,
  ) {}

  available(): boolean {
    return this.inner.available();
  }

  products(skus?: Sku[]): Promise<StoreProduct[]> {
    return this.inner.products(skus);
  }

  async purchase(sku: Sku): Promise<PurchaseOutcome> {
    this.tracker.track('purchase_started', { sku });
    try {
      const outcome = await this.inner.purchase(sku);
      this.tracker.track(outcome === 'purchased' ? 'purchase_completed' : 'purchase_cancelled', { sku });
      return outcome;
    } catch (e) {
      this.tracker.track('purchase_failed', { sku });
      throw e;
    }
  }

  restore(): Promise<void> {
    return this.inner.restore();
  }
}

/** The products that lift the free-catch limit: what someone out of catches is offered. */
const CATCH_UNLOCKS = new Set(['full_game', 'family']);

export interface SalesFunnel {
  outOfCatches: number;
  storeOpened: number;
  purchaseStarted: number;
  /** Full Game or Family bought: both lift the limit. */
  fullGameBought: number;
  /** fullGameBought / outOfCatches; 0 when nobody has run out yet. */
  conversion: number;
}

/**
 * Step counts for the taste funnel, from raw events (for the T-037 dashboard and local checks;
 * PostHog computes the same funnel per person). Store visits from elsewhere and county packs are
 * other journeys and are left out.
 */
export function salesFunnel(events: TrackedEvent[]): SalesFunnel {
  let outOfCatches = 0;
  let storeOpened = 0;
  let purchaseStarted = 0;
  let fullGameBought = 0;
  for (const e of events) {
    if (e.event === 'paywall_shown') outOfCatches += 1;
    else if (e.event === 'store_opened' && (e.props as { source: string }).source === 'paywall') storeOpened += 1;
    else if (e.event === 'purchase_started' && CATCH_UNLOCKS.has((e.props as { sku: string }).sku)) purchaseStarted += 1;
    else if (e.event === 'purchase_completed' && CATCH_UNLOCKS.has((e.props as { sku: string }).sku)) fullGameBought += 1;
  }
  return {
    outOfCatches,
    storeOpened,
    purchaseStarted,
    fullGameBought,
    conversion: outOfCatches === 0 ? 0 : fullGameBought / outOfCatches,
  };
}
