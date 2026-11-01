// Reviewer access codes, app side (T-237). Google Play reviewers cannot buy anything, so the
// Director gives them a code in the Play Console "App access" form. The server checks it
// (redeem_reviewer_code) and grants the Full Game and All of Sweden to that account through the
// purchase path; the app only sends the code and reports the answer.

export type AccessCodeResult = 'unlocked' | 'invalid' | 'empty' | 'failed';

export interface AccessCodeGateway {
  /** true when the server accepted the code (or this account already redeemed it). */
  redeem(code: string): Promise<boolean>;
}

export async function redeemAccessCode(gateway: AccessCodeGateway, raw: string): Promise<AccessCodeResult> {
  const code = raw.trim();
  if (code === '') return 'empty';
  try {
    return (await gateway.redeem(code)) ? 'unlocked' : 'invalid';
  } catch {
    return 'failed';
  }
}

interface RpcClient {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export class SupabaseAccessCodeGateway implements AccessCodeGateway {
  constructor(private readonly client: RpcClient) {}

  async redeem(code: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('redeem_reviewer_code', { p_code: code });
    if (error) throw new Error(error.message);
    return data === true;
  }
}
