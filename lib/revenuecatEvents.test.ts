import { planEntitlementChanges, regionEntitlement, secretMatches } from './revenuecatEvents';

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

  it('moves entitlements on a TRANSFER: revoked from the old account, granted to the new', () => {
    const plan = planEntitlementChanges(
      event({ type: 'TRANSFER', app_user_id: undefined, transferred_from: [OTHER], transferred_to: [USER] }),
    );
    expect(plan.kind === 'apply' && plan.changes.map((c) => [c.userId, c.active])).toEqual([
      [OTHER, false],
      [USER, true],
    ]);
  });

  it('keeps every known entitlement of a purchase and drops unknown ones', () => {
    const plan = planEntitlementChanges(
      event({ entitlement_ids: ['family', 'all_regions', regionEntitlement('SWE.9_1'), 'admin'] }),
    );
    expect(plan.kind === 'apply' && plan.changes.map((c) => c.entitlement)).toEqual([
      'family',
      'all_regions',
      'region_SWE_9_1',
    ]);
  });

  it('ignores an anonymous RevenueCat id: entitlements belong to Supabase users only', () => {
    expect(planEntitlementChanges(event({ app_user_id: '$RCAnonymousID:abc' })).kind).toBe('ignore');
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
    expect(planEntitlementChanges(event({ entitlement_ids: [] })).kind).toBe('ignore');
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
