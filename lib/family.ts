import type { TranslationKey } from './i18n';

// Family households, app side (T-103). The rules live in the database (T-102): the 5-person cap,
// the code check, and the Full Game a member derives from the owner's purchase. This module only
// calls those functions, reads `my_household()`, and maps each refusal to a message.

/** Owner + members. Pinned to the database's cap by pipeline/tests/test_households_sql.py. */
export const FAMILY_MAX_PEOPLE = 5;

export interface HouseholdMember {
  id: string;
  joinedAt: string;
}

export interface Household {
  role: 'owner' | 'member';
  /** Owner included. */
  people: number;
  /** False once the owner's Family purchase has ended (refund): nobody can join. */
  active: boolean;
  /** Owner only: a member never sees the code. */
  inviteCode: string | null;
  /** Owner only. */
  members: HouseholdMember[];
}

export function parseHousehold(raw: unknown): Household | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.role !== 'owner' && r.role !== 'member') return null;
  if (typeof r.people !== 'number' || typeof r.active !== 'boolean') return null;
  const members = Array.isArray(r.members)
    ? r.members
        .map((m) => m as { id?: unknown; joined_at?: unknown })
        .filter((m) => typeof m.id === 'string' && typeof m.joined_at === 'string')
        .map((m) => ({ id: m.id as string, joinedAt: m.joined_at as string }))
    : [];
  return {
    role: r.role,
    people: r.people,
    active: r.active,
    inviteCode: typeof r.invite_code === 'string' ? r.invite_code : null,
    members,
  };
}

// The database draws codes from this alphabet (no 0/O, no 1/I), 8 characters.
const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

/** A typed code, cleaned up; null if it cannot be one, so we never ask the server for a typo. */
export function normalizeInviteCode(typed: string): string | null {
  const code = typed.toUpperCase().replace(/[\s-]/g, '');
  return CODE.test(code) ? code : null;
}

const ERROR_KEYS: [string, TranslationKey][] = [
  ['household_full', 'family.error.full'],
  ['household_not_found', 'family.error.notFound'],
  ['already_in_household', 'family.error.already'],
  ['household_inactive', 'family.error.inactive'],
  ['family_required', 'family.error.inactive'],
];

export function familyErrorKey(error: unknown): TranslationKey {
  const message = error instanceof Error ? error.message : String(error);
  return ERROR_KEYS.find(([marker]) => message.includes(marker))?.[1] ?? 'family.error.generic';
}

export interface FamilyGateway {
  mine(): Promise<Household | null>;
  create(): Promise<string>;
  join(code: string): Promise<void>;
  leave(): Promise<void>;
  remove(memberId: string): Promise<void>;
}

/** The slice of the supabase-js client this needs, so tests can fake it. */
export interface FamilyRpcClient {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export class SupabaseFamilyGateway implements FamilyGateway {
  constructor(private readonly client: FamilyRpcClient) {}

  private async call(fn: string, args?: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
  }

  async mine() {
    return parseHousehold(await this.call('my_household'));
  }

  async create() {
    const code = await this.call('create_household');
    if (typeof code !== 'string') throw new Error('create_household returned no code');
    return code;
  }

  async join(code: string) {
    await this.call('join_household', { code });
  }

  async leave() {
    await this.call('leave_household');
  }

  async remove(memberId: string) {
    await this.call('remove_household_member', { member: memberId });
  }
}
