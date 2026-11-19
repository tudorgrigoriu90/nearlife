import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRecognitionGateway, syncRecognitions, type RecognitionGateway } from './recognitionSync';

// T-299 · review B-31: recognitions are kept with the account, so they survive a reinstall.

function gateway(server: string[], failAdd = false): RecognitionGateway & { server: Set<string> } {
  const set = new Set(server);
  return {
    server: set,
    list: jest.fn(async () => [...set]),
    add: jest.fn(async (ids: string[]) => {
      if (failAdd) throw new Error('offline');
      ids.forEach((id) => set.add(id));
    }),
  };
}

describe('syncRecognitions', () => {
  it('returns the union and uploads only what the server lacks', async () => {
    const gw = gateway(['a', 'b']);
    const all = await syncRecognitions(new Set(['b', 'c']), gw);
    expect([...all].sort()).toEqual(['a', 'b', 'c']);
    expect(gw.add).toHaveBeenCalledWith(['c']);
  });

  it('a reinstall gets the server set back', async () => {
    expect([...(await syncRecognitions(new Set(), gateway(['a'])))]).toEqual(['a']);
  });

  it('nothing to upload: no write', async () => {
    const gw = gateway(['a']);
    await syncRecognitions(new Set(['a']), gw);
    expect(gw.add).not.toHaveBeenCalled();
  });

  it('a failed upload still returns the union; the next sync retries', async () => {
    const gw = gateway(['a'], true);
    expect([...(await syncRecognitions(new Set(['c']), gw))].sort()).toEqual(['a', 'c']);
  });
});

describe('SupabaseRecognitionGateway', () => {
  it('lists the own rows (RLS) and adds without duplicates', async () => {
    const upsert = jest.fn(async () => ({ error: null }));
    const select = jest.fn(async () => ({ data: [{ species_id: 'a' }], error: null }));
    const client = { from: jest.fn(() => ({ select, upsert })) } as unknown as SupabaseClient;
    const gw = new SupabaseRecognitionGateway(client);
    expect(await gw.list()).toEqual(['a']);
    await gw.add(['b', 'c']);
    expect(client.from).toHaveBeenCalledWith('recognitions');
    expect(upsert).toHaveBeenCalledWith([{ species_id: 'b' }, { species_id: 'c' }], {
      onConflict: 'user_id,species_id',
      ignoreDuplicates: true,
    });
  });

  it('errors carry the reason', async () => {
    const client = {
      from: () => ({
        select: async () => ({ data: null, error: { message: 'jwt expired' } }),
        upsert: async () => ({ error: { message: 'fk' } }),
      }),
    } as unknown as SupabaseClient;
    const gw = new SupabaseRecognitionGateway(client);
    await expect(gw.list()).rejects.toThrow('jwt expired');
    await expect(gw.add(['x'])).rejects.toThrow('fk');
  });
});
