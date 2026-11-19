import { SupabaseNotifPrefsGateway, prefsToJson } from './notifPrefsGateway';
import { DEFAULT_NOTIF_PREFS } from './notifPrefs';

// T-342 · review F-03.
function fakeClient(row: unknown, error: { message: string } | null = null) {
  const calls: unknown[][] = [];
  const client = {
    from: (table: string) => ({
      select: (cols: string) => ({
        eq: (col: string, val: unknown) => ({
          maybeSingle: async () => {
            calls.push(['select', table, cols, col, val]);
            return { data: row, error };
          },
        }),
      }),
      upsert: async (value: unknown, opts: unknown) => {
        calls.push(['upsert', table, value, opts]);
        return { error };
      },
    }),
  };
  return { client: client as never, calls };
}

describe('notification choices on the profile', () => {
  it('stores only what differs from today’s behaviour', () => {
    expect(prefsToJson(DEFAULT_NOTIF_PREFS)).toEqual({});
    expect(prefsToJson({ frequency: 'weekly', window: 'evening', groups: ['bird'] })).toEqual({
      frequency: 'weekly',
      window: 'evening',
      groups: ['bird'],
    });
  });

  it('reads the user’s own row, and reads a missing row as today’s behaviour', async () => {
    const { client, calls } = fakeClient({ notif_prefs: { frequency: 'weekly' } });
    expect((await new SupabaseNotifPrefsGateway(client, async () => 'u1').load()).frequency).toBe('weekly');
    expect(calls[0]).toEqual(['select', 'profiles', 'notif_prefs', 'user_id', 'u1']);
    expect(await new SupabaseNotifPrefsGateway(fakeClient(null).client, async () => 'u1').load()).toEqual(DEFAULT_NOTIF_PREFS);
  });

  it('writes the user’s own row, and says why a read or write failed', async () => {
    const { client, calls } = fakeClient(null);
    await new SupabaseNotifPrefsGateway(client, async () => 'u1').save({ ...DEFAULT_NOTIF_PREFS, window: 'morning' });
    expect(calls[0]).toEqual(['upsert', 'profiles', { user_id: 'u1', notif_prefs: { window: 'morning' } }, { onConflict: 'user_id' }]);
    const failing = new SupabaseNotifPrefsGateway(fakeClient(null, { message: 'boom' }).client, async () => 'u1');
    await expect(failing.load()).rejects.toThrow(/read failed: boom/);
    await expect(failing.save(DEFAULT_NOTIF_PREFS)).rejects.toThrow(/write failed: boom/);
  });
});
