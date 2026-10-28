import {
  FCM_SCOPE,
  GOOGLE_TOKEN_URL,
  fcmSendUrl,
  jwtClaims,
  parseServiceAccount,
  pemToDer,
  signJwt,
  tokenRequestBody,
  type ServiceAccount,
} from './fcmAuth';

// Jest's environment exposes WebCrypto, as Deno does — the same API the Edge Function signs with.
const subtle = globalThis.crypto.subtle;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64url = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function testAccount(): Promise<{ account: ServiceAccount; publicKey: CryptoKey }> {
  const pair = (await subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const der = new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey));
  const b64 = toBase64(der).replace(/(.{64})/g, '$1\n');
  return {
    account: {
      project_id: 'nearby-nearlife',
      client_email: 'sender@nearby-nearlife.iam.gserviceaccount.com',
      private_key: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`,
    },
    publicKey: pair.publicKey,
  };
}

const decode = (part: string) => JSON.parse(new TextDecoder().decode(fromBase64url(part)));

describe('parseServiceAccount', () => {
  it('accepts the downloaded service-account JSON', () => {
    const raw = JSON.stringify({ project_id: 'p', client_email: 'e', private_key: 'k', type: 'service_account' });
    expect(parseServiceAccount(raw)).toMatchObject({ project_id: 'p', client_email: 'e', private_key: 'k' });
  });

  it('names the problem when the secret is missing, malformed or incomplete', () => {
    expect(() => parseServiceAccount(undefined)).toThrow('FCM_SERVICE_ACCOUNT is not set');
    expect(() => parseServiceAccount('{not json')).toThrow('not valid JSON');
    expect(() => parseServiceAccount(JSON.stringify({ project_id: 'p', client_email: 'e' }))).toThrow(
      '"private_key"',
    );
  });
});

describe('jwtClaims', () => {
  it('asks for the messaging scope at the Google token endpoint, valid one hour', () => {
    const claims = jwtClaims({ project_id: 'p', client_email: 'me@x', private_key: 'k' }, 1000);
    expect(claims).toEqual({ iss: 'me@x', scope: FCM_SCOPE, aud: GOOGLE_TOKEN_URL, iat: 1000, exp: 4600 });
  });
});

describe('signJwt', () => {
  it('produces an RS256 JWT that verifies against the account public key', async () => {
    const { account, publicKey } = await testAccount();
    const jwt = await signJwt(account, 1_700_000_000, subtle);
    const [header, payload, signature] = jwt.split('.');

    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decode(payload)).toMatchObject({ iss: account.client_email, iat: 1_700_000_000 });
    expect(jwt).not.toMatch(/[+/=]/); // base64url, unpadded

    const sig = fromBase64url(signature);
    const ok = await subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      sig,
      new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(ok).toBe(true);
  });

  it('accepts a key whose newlines arrive escaped, as they do when JSON is pasted as one line', async () => {
    const { account } = await testAccount();
    const escaped = { ...account, private_key: account.private_key.replace(/\n/g, '\\n') };
    expect(pemToDer(escaped.private_key)).toEqual(pemToDer(account.private_key));
    await expect(signJwt(escaped, 0, subtle)).resolves.toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });
});

describe('request helpers', () => {
  it('builds the jwt-bearer form body and the per-project send URL', () => {
    const body = new URLSearchParams(tokenRequestBody('a.b.c'));
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    expect(body.get('assertion')).toBe('a.b.c');
    expect(fcmSendUrl('nearby-nearlife')).toBe(
      'https://fcm.googleapis.com/v1/projects/nearby-nearlife/messages:send',
    );
  });
});
