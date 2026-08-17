import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseDeletionGateway } from './accountDeletion';
import { SupabaseAuthGateway } from './accountLinking';

// The supabase-js adapters for account deletion (T-093) and email linking (T-133) were the only
// untested layer in either flow: the domain logic above them is covered against fake gateways, but
// nothing checked that these actually call the right endpoint or turn a Supabase error into a
// thrown one. That gap matters more here than elsewhere — a swallowed failure in `eraseAccount`
// means telling a user their account is gone when it is not (invariant #6, consent & deletion).

function fakeClient(over: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const client = {
    calls,
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => {
        calls.push('signOut');
      },
      updateUser: async (attrs: { email: string }) => {
        calls.push(`updateUser:${attrs.email}`);
        return { error: null };
      },
      ...(over.auth ?? {}),
    },
    functions: {
      invoke: async (name: string) => {
        calls.push(`invoke:${name}`);
        return { error: null };
      },
      ...(over.functions ?? {}),
    },
  };
  return client;
}

describe('SupabaseDeletionGateway', () => {
  it('returns the signed-in user id', async () => {
    const client = fakeClient({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } });
    const gw = new SupabaseDeletionGateway(client as unknown as SupabaseClient);
    expect(await gw.currentUserId()).toBe('u1');
  });

  it('returns null when nobody is signed in', async () => {
    const gw = new SupabaseDeletionGateway(fakeClient() as unknown as SupabaseClient);
    expect(await gw.currentUserId()).toBeNull();
  });

  it('erases through the delete-account Edge Function', async () => {
    const client = fakeClient();
    await new SupabaseDeletionGateway(client as unknown as SupabaseClient).eraseAccount();
    expect(client.calls).toContain('invoke:delete-account');
  });

  it('throws when erasure fails rather than reporting success', async () => {
    // The whole point: a user told "your account is deleted" when it was not is the worst
    // possible outcome for invariant #6.
    const client = fakeClient({
      functions: { invoke: async () => ({ error: { message: 'boom' } }) },
    });
    const gw = new SupabaseDeletionGateway(client as unknown as SupabaseClient);
    await expect(gw.eraseAccount()).rejects.toThrow(/account deletion failed: boom/);
  });

  it('signs out locally', async () => {
    const client = fakeClient();
    await new SupabaseDeletionGateway(client as unknown as SupabaseClient).signOutLocal();
    expect(client.calls).toContain('signOut');
  });
});

describe('SupabaseAuthGateway', () => {
  it('maps a signed-in anonymous user', async () => {
    const client = fakeClient({
      auth: {
        getUser: async () => ({
          data: { user: { id: 'u2', email: null, is_anonymous: true } },
        }),
      },
    });
    const gw = new SupabaseAuthGateway(client as unknown as SupabaseClient);
    expect(await gw.currentIdentity()).toEqual({ userId: 'u2', email: null, isAnonymous: true });
  });

  it('defaults isAnonymous to false when Supabase omits it', async () => {
    const client = fakeClient({
      auth: { getUser: async () => ({ data: { user: { id: 'u3' } } }) },
    });
    const gw = new SupabaseAuthGateway(client as unknown as SupabaseClient);
    expect(await gw.currentIdentity()).toEqual({ userId: 'u3', email: null, isAnonymous: false });
  });

  it('returns null identity when signed out', async () => {
    const gw = new SupabaseAuthGateway(fakeClient() as unknown as SupabaseClient);
    expect(await gw.currentIdentity()).toBeNull();
  });

  it('sends the email through updateUser', async () => {
    const client = fakeClient();
    await new SupabaseAuthGateway(client as unknown as SupabaseClient).updateEmail('a@b.se');
    expect(client.calls).toContain('updateUser:a@b.se');
  });

  it('throws when linking fails, so the UI cannot claim a link that did not happen', async () => {
    const client = fakeClient({
      auth: { updateUser: async () => ({ error: { message: 'taken' } }) },
    });
    const gw = new SupabaseAuthGateway(client as unknown as SupabaseClient);
    await expect(gw.updateEmail('a@b.se')).rejects.toThrow(/email link failed: taken/);
  });
});
