import { redeemAccessCode, SupabaseAccessCodeGateway } from './reviewerAccess';

// T-237: the app half of reviewer access. The server decides (redeem_reviewer_code); the app only
// sends the code and reports the answer, so nothing in the app can unlock anything on its own.
describe('redeemAccessCode', () => {
  it('reports an unlock when the server accepts the code', async () => {
    const redeem = jest.fn(async () => true);
    await expect(redeemAccessCode({ redeem }, ' nearby-abcd-efgh-jkmn ')).resolves.toBe('unlocked');
    expect(redeem).toHaveBeenCalledWith('nearby-abcd-efgh-jkmn');
  });

  it('reports a refused code', async () => {
    await expect(redeemAccessCode({ redeem: async () => false }, 'WRONG')).resolves.toBe('invalid');
  });

  it('does not call the server for an empty code', async () => {
    const redeem = jest.fn(async () => true);
    await expect(redeemAccessCode({ redeem }, '   ')).resolves.toBe('empty');
    expect(redeem).not.toHaveBeenCalled();
  });

  it('turns a network or server error into a retryable failure', async () => {
    const redeem = async () => {
      throw new Error('offline');
    };
    await expect(redeemAccessCode({ redeem }, 'CODE')).resolves.toBe('failed');
  });
});

describe('SupabaseAccessCodeGateway', () => {
  it('calls the redeem function with the code', async () => {
    const rpc = jest.fn(async () => ({ data: true, error: null }));
    await expect(new SupabaseAccessCodeGateway({ rpc }).redeem('CODE')).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('redeem_reviewer_code', { p_code: 'CODE' });
  });

  it('throws on a server error so the screen can offer a retry', async () => {
    const rpc = jest.fn(async () => ({ data: null, error: { message: 'boom' } }));
    await expect(new SupabaseAccessCodeGateway({ rpc }).redeem('CODE')).rejects.toThrow('boom');
  });
});
