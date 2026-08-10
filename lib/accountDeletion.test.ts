import { deleteAccount, type DeletionGateway } from './accountDeletion';

// A controllable fake gateway — records calls and lets each step succeed or throw.
function fakeGateway(overrides: Partial<DeletionGateway> = {}) {
  const calls = { erase: 0, signOut: 0 };
  const gateway: DeletionGateway = {
    currentUserId: async () => 'user-1',
    eraseAccount: async () => {
      calls.erase += 1;
    },
    signOutLocal: async () => {
      calls.signOut += 1;
    },
    ...overrides,
  };
  return { gateway, calls };
}

describe('deleteAccount', () => {
  it('erases then signs out on success', async () => {
    const { gateway, calls } = fakeGateway();
    const result = await deleteAccount(gateway);
    expect(result).toEqual({ ok: true });
    expect(calls.erase).toBe(1);
    expect(calls.signOut).toBe(1);
  });

  it('refuses when not signed in — and never calls erase', async () => {
    let erased = 0;
    const { gateway } = fakeGateway({
      currentUserId: async () => null,
      eraseAccount: async () => {
        erased += 1;
      },
    });
    expect(await deleteAccount(gateway)).toEqual({ ok: false, reason: 'not-signed-in' });
    expect(erased).toBe(0);
  });

  it('reports delete-failed (retryable) when the server erase throws', async () => {
    let signedOut = 0;
    const { gateway } = fakeGateway({
      eraseAccount: async () => {
        throw new Error('function not deployed');
      },
      signOutLocal: async () => {
        signedOut += 1;
      },
    });
    expect(await deleteAccount(gateway)).toEqual({ ok: false, reason: 'delete-failed' });
    expect(signedOut).toBe(0); // session left intact so the user can retry
  });

  it('still succeeds if local sign-out fails after a successful erase', async () => {
    const { gateway, calls } = fakeGateway({
      signOutLocal: async () => {
        throw new Error('network');
      },
    });
    expect(await deleteAccount(gateway)).toEqual({ ok: true });
    expect(calls.erase).toBe(1);
  });
});
