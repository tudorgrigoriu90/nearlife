// Store purchases through RevenueCat (T-083/T-084). Only the BUY side lives here: the app never
// decides what is owned from this. A completed purchase reaches RevenueCat, its webhook grants the
// entitlement on the server (T-217), and the app re-reads what the user owns (lib/entitlement.ts).
//
// The SDK is configured with the Supabase user id as its app user id, so every webhook event names
// the right account, including after a reinstall once the email is linked (T-133).
//
// The native module only exists in a build made after this dependency was added. Older dev builds
// (and Jest) load the JS without it, so the module is required lazily and its absence just means
// "purchases unavailable": the Store hides its buy buttons and nothing else changes.

/** A Play Console product id: `full_game`, `family`, `all_regions` or a county pack `region_swe_<n>`. */
export type Sku = string;

/** The Store's products, in display order. County packs are sold from the Counties screen (T-105). */
export const SKUS: Sku[] = ['full_game', 'family'];

export interface StoreProduct {
  sku: Sku;
  /** The store's own localized price, e.g. "49,00 kr". Never computed in the app. */
  priceString: string;
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

export interface PurchaseGateway {
  available(): boolean;
  /** The given products (default: the Store's), in that order, skipping any the store lacks. */
  products(skus?: Sku[]): Promise<StoreProduct[]>;
  purchase(sku: Sku): Promise<PurchaseOutcome>;
  restore(): Promise<void>;
}

interface RcProduct {
  identifier: string;
  priceString: string;
}

/** The slice of react-native-purchases this needs, so tests can fake it. */
export interface RevenueCatModule {
  configure(config: { apiKey: string; appUserID: string }): void;
  logIn(appUserID: string): Promise<unknown>;
  getProducts(ids: string[], type?: string): Promise<RcProduct[]>;
  purchaseStoreProduct(product: RcProduct): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
  PRODUCT_CATEGORY: { NON_SUBSCRIPTION: string };
}

/** The real SDK, or null when this build has no native module for it. */
export function loadRevenueCat(): RevenueCatModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as { default?: RevenueCatModule };
    const Purchases = mod.default ?? null;
    // Without the native side the JS still loads but every call fails; probe for it here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NativeModules } = require('react-native') as { NativeModules: Record<string, unknown> };
    return Purchases && NativeModules.RNPurchases ? Purchases : null;
  } catch {
    return null;
  }
}

export class RevenueCatPurchaseGateway implements PurchaseGateway {
  private configured: Promise<void> | null = null;

  constructor(
    private readonly rc: RevenueCatModule | null,
    private readonly apiKey: string,
    private readonly ensureUser: () => Promise<string>,
  ) {}

  available(): boolean {
    return this.rc !== null && this.apiKey !== '';
  }

  private ready(): Promise<RevenueCatModule> {
    const rc = this.rc;
    if (!rc || !this.apiKey) return Promise.reject(new Error('purchases are not available in this build'));
    this.configured ??= this.ensureUser().then((appUserID) => {
      rc.configure({ apiKey: this.apiKey, appUserID });
    });
    // A failed configure (offline at sign-in) must not stick: the next attempt retries.
    return this.configured.then(
      () => rc,
      (e: unknown) => {
        this.configured = null;
        throw e;
      },
    );
  }

  private async storeProducts(skus: Sku[]): Promise<RcProduct[]> {
    const rc = await this.ready();
    return rc.getProducts(skus, rc.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
  }

  async products(skus: Sku[] = SKUS): Promise<StoreProduct[]> {
    if (!this.available()) return [];
    const found = await this.storeProducts(skus);
    return skus.flatMap((sku) => {
      const p = found.find((x) => x.identifier === sku);
      return p ? [{ sku, priceString: p.priceString }] : [];
    });
  }

  async purchase(sku: Sku): Promise<PurchaseOutcome> {
    const product = (await this.storeProducts([sku])).find((p) => p.identifier === sku);
    if (!product) throw new Error(`${sku} is not available in the store`);
    try {
      await (await this.ready()).purchaseStoreProduct(product);
      return 'purchased';
    } catch (e) {
      if ((e as { userCancelled?: boolean | null }).userCancelled) return 'cancelled';
      throw e;
    }
  }

  async restore(): Promise<void> {
    await (await this.ready()).restorePurchases();
  }
}

/** EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: the public `goog_` SDK key, safe to ship in the app. */
export function revenueCatKey(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
}
