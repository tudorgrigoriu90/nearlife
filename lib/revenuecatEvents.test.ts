import {
  planEntitlementChanges,
  regionEntitlement,
  regionProductId,
  revenueCatErasure,
  secretMatches,
} from './revenuecatEvents';

const USER = '0e08dc15-1111-4222-8333-444455556666';
const OTHER = '5e6763d4-aaaa-4bbb-8ccc-ddddeeeeffff';

function event(over: Record<string, unknown>) {
  return {
    api_version: '1.0',
    event: {
      id: 'evt-1',
      type: 'NON_RENEWING_PURCHASE',
      app_user_id: USER,
      entitlement_ids: ['full_game'],
      product_id: 'full_game',
      event_timestamp_ms: 1_800_000_000_000,
      environment: 'PRODUCTION',
      ...over,
    },
  };
}

describe('planEntitlementChanges', () => {
  it('grants the entitlement on a one-time purchase', () => {
    expect(planEntitlementChanges(event({}))).toEqual({
      kind: 'apply',
      changes: [
        {
          userId: USER,
          entitlement: 'full_game',
          active: true,
          atMs: 1_800_000_000_000,
          productId: 'full_game',
          eventId: 'evt-1',
        },
      ],
    });
  });

  it('grants on INITIAL_PURCHASE too', () => {
    const plan = planEntitlementChanges(event({ type: 'INITIAL_PURCHASE' }));
    expect(plan.kind === 'apply' && plan.changes[0].active).toBe(true);
  });

  it('revokes on a refund (CANCELLATION of a one-time product) and on EXPIRATION', () => {
    for (const type of ['CANCELLATION', 'EXPIRATION']) {
      const plan = planEntitlementChanges(event({ type }));
      expect(plan.kind === 'apply' && plan.changes.map((c) => c.active)).toEqual([false]);
    }
  });

  // T-267 · review B-02: RevenueCat's TRANSFER carries only the common fields and the two id
  // lists — no entitlement_ids, product_id or app_user_id.
  it('moves every entitlement on a TRANSFER, which names no entitlement or product', () => {
    const body = {
      api_version: '1.0',
      event: {
        type: 'TRANSFER',
        id: 'evt-t',
        event_timestamp_ms: 1_800_000_000_000,
        app_id: 'app1',
        transferred_from: [OTHER, '$RCAnonymousID:abc'],
        transferred_to: [USER],
        store: 'PLAY_STORE',
        environment: 'PRODUCTION',
      },
    };
    expect(planEntitlementChanges(body)).toEqual({
      kind: 'transfer',
      from: [OTHER],
      to: [USER],
      atMs: 1_800_000_000_000,
      eventId: 'evt-t',
    });
  });

  it('ignores a TRANSFER with no Supabase account on either side', () => {
    const plan = planEntitlementChanges(
      event({ type: 'TRANSFER', transferred_from: ['$RCAnonymousID:a'], transferred_to: [USER] }),
    );
    expect(plan.kind).toBe('ignore');
  });

  it('keeps every known entitlement of a purchase and drops unknown ones', () => {
    const plan = planEntitlementChanges(
      event({
        entitlement_ids: ['family', 'all_regions', regionEntitlement('SWE.9_1'), 'admin'],
        product_id: 'family',
      }),
    );
    expect(plan.kind === 'apply' && plan.changes.map((c) => c.entitlement)).toEqual([
      'family',
      'all_regions',
      'region_SWE_9_1',
    ]);
  });

  it('ignores an anonymous RevenueCat id: entitlements belong to Supabase users only', () => {
    expect(planEntitlementChanges(event({ app_user_id: '$RCAnonymousID:abc' })).kind).toBe(
      'ignore',
    );
  });

  it('ignores event types that do not change access', () => {
    for (const type of ['TEST', 'BILLING_ISSUE', 'SUBSCRIBER_ALIAS', 'SOMETHING_NEW']) {
      expect(planEntitlementChanges(event({ type })).kind).toBe('ignore');
    }
  });

  it('ignores a malformed body rather than guessing', () => {
    expect(planEntitlementChanges(null).kind).toBe('ignore');
    expect(planEntitlementChanges({}).kind).toBe('ignore');
    expect(planEntitlementChanges(event({ event_timestamp_ms: 'soon' })).kind).toBe('ignore');
    expect(planEntitlementChanges(event({ entitlement_ids: 'full_game' })).kind).toBe('ignore');
    expect(planEntitlementChanges(event({ id: undefined })).kind).toBe('ignore');
  });

  it('ignores a purchase with no known entitlement', () => {
    expect(planEntitlementChanges(event({ entitlement_ids: [], product_id: 'mystery' })).kind).toBe(
      'ignore',
    );
  });
});

describe('regionEntitlement', () => {
  it('maps a GADM county id to an identifier RevenueCat accepts', () => {
    expect(regionEntitlement('SWE.9_1')).toBe('region_SWE_9_1');
    expect(regionEntitlement('SWE.12_1')).toBe('region_SWE_12_1');
  });
});

describe('secretMatches', () => {
  it('accepts only the exact bearer secret', () => {
    expect(secretMatches('Bearer s3cret', 's3cret')).toBe(true);
    expect(secretMatches('Bearer s3cres', 's3cret')).toBe(false);
    expect(secretMatches('s3cret', 's3cret')).toBe(false);
    expect(secretMatches('Bearer s3cret-longer', 's3cret')).toBe(false);
    expect(secretMatches(null, 's3cret')).toBe(false);
  });

  it('fails closed when no secret is configured', () => {
    expect(secretMatches('Bearer ', '')).toBe(false);
    expect(secretMatches('Bearer anything', undefined)).toBe(false);
  });
});

describe('region packs are recognised by product id (T-105)', () => {
  // 21 county products would otherwise need 21 matching RevenueCat entitlements set up by hand.
  it('maps a county product to its region entitlement even with no RevenueCat entitlement', () => {
    const plan = planEntitlementChanges(event({ entitlement_ids: [], product_id: 'region_swe_9' }));
    expect(plan.kind === 'apply' && plan.changes.map((c) => c.entitlement)).toEqual([
      'region_SWE_9_1',
    ]);
  });

  it('maps the all-Sweden product', () => {
    const plan = planEntitlementChanges(event({ entitlement_ids: [], product_id: 'all_regions' }));
    expect(plan.kind === 'apply' && plan.changes.map((c) => c.entitlement)).toEqual([
      'all_regions',
    ]);
  });

  it('does not double a grant named both ways', () => {
    const plan = planEntitlementChanges(
      event({ entitlement_ids: ['full_game'], product_id: 'full_game' }),
    );
    expect(plan.kind === 'apply' && plan.changes.map((c) => c.entitlement)).toEqual(['full_game']);
  });

  // T-267 · review B-03: RevenueCat sends entitlement_ids null for a product with no entitlement.
  it('grants a county pack and All of Sweden when entitlement_ids is null or absent', () => {
    for (const ids of [{ entitlement_ids: null }, { entitlement_ids: undefined }]) {
      const county = planEntitlementChanges(event({ ...ids, product_id: 'region_swe_9' }));
      expect(county.kind === 'apply' && county.changes.map((c) => c.entitlement)).toEqual([
        'region_SWE_9_1',
      ]);
      const all = planEntitlementChanges(event({ ...ids, product_id: 'all_regions' }));
      expect(all.kind === 'apply' && all.changes.map((c) => c.entitlement)).toEqual([
        'all_regions',
      ]);
    }
  });

  it('ignores an unknown product with no known entitlement', () => {
    expect(planEntitlementChanges(event({ entitlement_ids: [], product_id: 'mystery' })).kind).toBe(
      'ignore',
    );
    expect(
      planEntitlementChanges(event({ entitlement_ids: null, product_id: 'mystery' })).kind,
    ).toBe('ignore');
  });
});

describe('regionProductId', () => {
  it('names the Play product for a county', () => {
    expect(regionProductId('SWE.9_1')).toBe('region_swe_9');
    expect(regionProductId('SWE.21_1')).toBe('region_swe_21');
  });
});

// T-280 · review B-52: deleting an account also deletes its RevenueCat customer when it never
// bought anything; with purchases, Google and RevenueCat keep the records (privacy policy).
describe('revenueCatErasure', () => {
  it('names the customer to delete when there were no purchases and a key is set', () => {
    expect(revenueCatErasure(USER, false, 'sk_x')).toEqual({
      url: `https://api.revenuecat.com/v1/subscribers/${USER}`,
      headers: { Authorization: 'Bearer sk_x' },
    });
  });

  it('keeps a customer who bought something, and does nothing without a key', () => {
    expect(revenueCatErasure(USER, true, 'sk_x')).toBeNull();
    expect(revenueCatErasure(USER, false, undefined)).toBeNull();
  });
});

// T-282 · review B-54: a licence tester's free sandbox purchase only counts while the server is
// set to accept sandbox events (until launch).
describe('sandbox events', () => {
  it('are applied when accepted', () => {
    expect(planEntitlementChanges(event({ environment: 'SANDBOX' }), { acceptSandbox: true }).kind).toBe(
      'apply',
    );
  });

  it('are ignored otherwise; production events always count', () => {
    expect(planEntitlementChanges(event({ environment: 'SANDBOX' }), { acceptSandbox: false })).toEqual({
      kind: 'ignore',
      reason: 'sandbox event',
    });
    expect(planEntitlementChanges(event({}), { acceptSandbox: false }).kind).toBe('apply');
  });
});
