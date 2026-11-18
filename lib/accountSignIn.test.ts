import { requestSignInCode, verifySignInCode, type SignInGateway } from './accountSignIn';

// T-271 · review B-07: a linked email is how a collection survives a reinstall or a new phone.

function gateway(over: Partial<SignInGateway> = {}): SignInGateway & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    sendCode: jest.fn(async (email: string) => {
      sent.push(email);
    }),
    verifyCode: jest.fn(async () => 'restored-user-id'),
    ...over,
  };
}

describe('requestSignInCode', () => {
  it('sends a code to a valid, normalised email', async () => {
    const gw = gateway();
    await expect(requestSignInCode(gw, '  Ana@Example.SE ')).resolves.toEqual({
      ok: true,
      email: 'ana@example.se',
    });
    expect(gw.sent).toEqual(['ana@example.se']);
  });

  it('refuses an invalid email without a network call', async () => {
    const gw = gateway();
    await expect(requestSignInCode(gw, 'not-an-email')).resolves.toEqual({
      ok: false,
      reason: 'invalid-email',
    });
    expect(gw.sent).toEqual([]);
  });

  it('reports a failed send (e.g. no account with that email)', async () => {
    const gw = gateway({ sendCode: jest.fn().mockRejectedValue(new Error('Signups not allowed')) });
    await expect(requestSignInCode(gw, 'a@b.se')).resolves.toEqual({
      ok: false,
      reason: 'send-failed',
    });
  });
});

describe('verifySignInCode', () => {
  it('signs in with the six-digit code and returns the account id', async () => {
    const gw = gateway();
    await expect(verifySignInCode(gw, 'a@b.se', ' 123 456 ')).resolves.toEqual({
      ok: true,
      userId: 'restored-user-id',
    });
    expect(gw.verifyCode).toHaveBeenCalledWith('a@b.se', '123456');
  });

  it('a malformed code is refused before asking the server', async () => {
    const gw = gateway();
    await expect(verifySignInCode(gw, 'a@b.se', '12ab')).resolves.toEqual({
      ok: false,
      reason: 'invalid-code',
    });
    expect(gw.verifyCode).not.toHaveBeenCalled();
  });

  it('a wrong or expired code is reported and changes nothing', async () => {
    const gw = gateway({ verifyCode: jest.fn().mockRejectedValue(new Error('Token has expired')) });
    await expect(verifySignInCode(gw, 'a@b.se', '123456')).resolves.toEqual({
      ok: false,
      reason: 'wrong-code',
    });
  });
});
