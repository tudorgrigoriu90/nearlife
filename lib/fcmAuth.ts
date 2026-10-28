// FCM HTTP v1 authentication (T-201). FCM accepts only a short-lived OAuth access token, minted by
// signing a JWT with the Firebase service account's private key and exchanging it at Google's
// token endpoint. Done by hand with WebCrypto rather than a Google client library: the Edge
// runtime has WebCrypto built in, and a ~60-line signer beats pulling a Node-oriented auth SDK
// into Deno. `subtle` is a parameter so the signer runs under Jest with Node's WebCrypto.

export const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** The fields we use from the service-account JSON stored in the `FCM_SERVICE_ACCOUNT` secret. */
export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export function parseServiceAccount(raw: string | undefined): ServiceAccount {
  if (!raw) throw new Error('FCM_SERVICE_ACCOUNT is not set');
  let parsed: Partial<ServiceAccount>;
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  } catch {
    throw new Error('FCM_SERVICE_ACCOUNT is not valid JSON — paste the whole downloaded file');
  }
  for (const field of ['project_id', 'client_email', 'private_key'] as const) {
    if (typeof parsed[field] !== 'string' || parsed[field] === '') {
      throw new Error(`FCM_SERVICE_ACCOUNT is missing "${field}"`);
    }
  }
  return parsed as ServiceAccount;
}

/** One hour is the maximum Google accepts. */
export function jwtClaims(account: ServiceAccount, nowSec: number) {
  return {
    iss: account.client_email,
    scope: FCM_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  };
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function utf8(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

/** PEM "-----BEGIN PRIVATE KEY-----" body → PKCS#8 DER bytes. */
export function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) der[i] = binary.charCodeAt(i);
  return der;
}

/** RS256-signed assertion for the jwt-bearer grant. */
export async function signJwt(
  account: ServiceAccount,
  nowSec: number,
  subtle: SubtleCrypto,
): Promise<string> {
  const header = base64url(utf8(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64url(utf8(JSON.stringify(jwtClaims(account, nowSec))));
  const key = await subtle.importKey(
    'pkcs8',
    pemToDer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(`${header}.${payload}`));
  return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
}

/** Form body for the token exchange. */
export function tokenRequestBody(assertion: string): string {
  return new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }).toString();
}

export function fcmSendUrl(projectId: string): string {
  return `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
}
