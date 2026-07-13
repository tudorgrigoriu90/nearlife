import {
  isValidEmail,
  linkEmail,
  normalizeEmail,
  type AuthGateway,
  type AuthIdentity,
} from './accountLinking';

describe('normalizeEmail / isValidEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('accepts a well-formed address and rejects obvious typos', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('  A@B.CO ')).toBe(true);
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('two @spaces.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

function gatewayFor(identity: AuthIdentity | null, updateEmail = jest.fn(async () => {})): AuthGateway {
  return { currentIdentity: async () => identity, updateEmail };
}

const anon: AuthIdentity = { userId: 'u1', email: null, isAnonymous: true };
const linked: AuthIdentity = { userId: 'u1', email: 'me@example.com', isAnonymous: false };

describe('linkEmail', () => {
  it('links a valid email to an anonymous user (normalized)', async () => {
    const updateEmail = jest.fn(async () => {});
    const result = await linkEmail(gatewayFor(anon, updateEmail), '  Me@Example.COM ');
    expect(result).toEqual({ ok: true, email: 'me@example.com' });
    expect(updateEmail).toHaveBeenCalledWith('me@example.com');
  });

  it('rejects an invalid email before any gateway call', async () => {
    const updateEmail = jest.fn(async () => {});
    const result = await linkEmail(gatewayFor(anon, updateEmail), 'nope');
    expect(result).toEqual({ ok: false, reason: 'invalid-email' });
    expect(updateEmail).not.toHaveBeenCalled();
  });

  it('reports not-signed-in when there is no identity', async () => {
    expect(await linkEmail(gatewayFor(null), 'me@example.com')).toEqual({
      ok: false,
      reason: 'not-signed-in',
    });
  });

  it('refuses to overwrite an already-linked email', async () => {
    const updateEmail = jest.fn(async () => {});
    const result = await linkEmail(gatewayFor(linked, updateEmail), 'other@example.com');
    expect(result).toEqual({ ok: false, reason: 'already-linked' });
    expect(updateEmail).not.toHaveBeenCalled();
  });

  it('maps a gateway failure to a retryable link-failed', async () => {
    const updateEmail = jest.fn(async () => {
      throw new Error('network');
    });
    expect(await linkEmail(gatewayFor(anon, updateEmail), 'me@example.com')).toEqual({
      ok: false,
      reason: 'link-failed',
    });
  });
});
