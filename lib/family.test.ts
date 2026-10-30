import {
  FAMILY_MAX_PEOPLE,
  SupabaseFamilyGateway,
  familyErrorKey,
  normalizeInviteCode,
  parseHousehold,
} from './family';

describe('parseHousehold', () => {
  it('reads an owner view, with code and members', () => {
    expect(
      parseHousehold({
        role: 'owner',
        since: '2026-10-28T09:00:00Z',
        people: 2,
        active: true,
        invite_code: 'ABCD2345',
        members: [{ id: 'm1', joined_at: '2026-10-29T10:00:00Z' }],
      }),
    ).toEqual({
      role: 'owner',
      since: '2026-10-28T09:00:00Z',
      people: 2,
      active: true,
      inviteCode: 'ABCD2345',
      members: [{ id: 'm1', joinedAt: '2026-10-29T10:00:00Z' }],
    });
  });

  it('reads a member view, which never carries the code', () => {
    expect(parseHousehold({ role: 'member', people: 3, active: true, invite_code: null, members: null })).toEqual({
      role: 'member',
      since: null,
      people: 3,
      active: true,
      inviteCode: null,
      members: [],
    });
  });

  it('is null when the user is in no household, or the row is malformed', () => {
    expect(parseHousehold(null)).toBeNull();
    expect(parseHousehold({ role: 'admin', people: 1, active: true })).toBeNull();
    expect(parseHousehold({ role: 'member', people: 'three', active: true })).toBeNull();
  });
});

describe('normalizeInviteCode', () => {
  it('accepts what people actually type: spaces, dashes, lower case', () => {
    expect(normalizeInviteCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(normalizeInviteCode('abcd 2345')).toBe('ABCD2345');
  });

  it('rejects anything that cannot be a code, before asking the server', () => {
    expect(normalizeInviteCode('ABC')).toBeNull();
    expect(normalizeInviteCode('ABCD234O')).toBeNull(); // O is not in the alphabet
    expect(normalizeInviteCode('ABCD23451')).toBeNull();
  });
});

describe('familyErrorKey', () => {
  it('maps each server refusal to its own message', () => {
    expect(familyErrorKey(new Error('household_full'))).toBe('family.error.full');
    expect(familyErrorKey(new Error('household_not_found'))).toBe('family.error.notFound');
    expect(familyErrorKey(new Error('already_in_household'))).toBe('family.error.already');
    expect(familyErrorKey(new Error('household_inactive'))).toBe('family.error.inactive');
  });

  it('falls back to a generic message for anything else (offline, …)', () => {
    expect(familyErrorKey(new Error('fetch failed'))).toBe('family.error.generic');
  });
});

describe('SupabaseFamilyGateway', () => {
  it('calls the household functions by name', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const gw = new SupabaseFamilyGateway({ rpc });
    await gw.join('ABCD2345');
    await gw.leave();
    await gw.remove('m1');
    expect(rpc.mock.calls).toEqual([
      ['join_household', { code: 'ABCD2345' }],
      ['leave_household', undefined],
      ['remove_household_member', { member: 'm1' }],
    ]);
  });

  it('returns the code from create_household', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'ABCD2345', error: null });
    await expect(new SupabaseFamilyGateway({ rpc }).create()).resolves.toBe('ABCD2345');
  });

  it('surfaces the server marker on a refusal', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'household_full' } });
    await expect(new SupabaseFamilyGateway({ rpc }).join('ABCD2345')).rejects.toThrow('household_full');
  });

  it('caps a household at 5 people, matching the database', () => {
    expect(FAMILY_MAX_PEOPLE).toBe(5);
  });
});
