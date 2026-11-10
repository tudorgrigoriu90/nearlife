import { supabaseProbe } from './connectivity';

const config = { url: 'https://x.supabase.co', publishableKey: 'sb_publishable_abc' };

// T-252: is the server reachable? Any answer from it counts; only no answer is offline.
describe('supabaseProbe', () => {
  it('asks the auth health endpoint with the publishable key', async () => {
    const fetchFn = jest.fn(async () => ({ status: 200 }) as Response);
    expect(await supabaseProbe(config, fetchFn)()).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://x.supabase.co/auth/v1/health',
      expect.objectContaining({ headers: { apikey: 'sb_publishable_abc' } }),
    );
  });

  it('is online on any HTTP answer, even an error status', async () => {
    expect(await supabaseProbe(config, async () => ({ status: 503 }) as Response)()).toBe(true);
  });

  it('is offline when the request fails', async () => {
    const failing = async (): Promise<Response> => {
      throw new TypeError('Network request failed');
    };
    expect(await supabaseProbe(config, failing)()).toBe(false);
  });

  it('is offline when no answer comes in time', async () => {
    jest.useFakeTimers();
    const hanging = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const result = supabaseProbe(config, hanging, 5000)();
    jest.advanceTimersByTime(5000);
    expect(await result).toBe(false);
    jest.useRealTimers();
  });
});
