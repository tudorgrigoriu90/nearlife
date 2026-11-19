import { DEFAULT_NOTIF_PREFS, parseNotifPrefs, type NotifPrefs } from './notifPrefs';
import type { Json } from './database.types';
import type { AppClient } from './supabase';

// The user's notification choices on their profile (T-342 · review F-03). RLS and the column
// grants limit this to their own row and to this column (migration 0046).

/** Only what differs from today's behaviour, so an untouched profile stays '{}'. */
export function prefsToJson(prefs: NotifPrefs): { [key: string]: Json } {
  return {
    ...(prefs.frequency !== DEFAULT_NOTIF_PREFS.frequency ? { frequency: prefs.frequency } : {}),
    ...(prefs.window !== null ? { window: prefs.window } : {}),
    ...(prefs.groups !== null ? { groups: prefs.groups } : {}),
  };
}

export class SupabaseNotifPrefsGateway {
  constructor(
    private readonly client: AppClient,
    private readonly ensureUser: () => Promise<string>,
  ) {}

  async load(): Promise<NotifPrefs> {
    const userId = await this.ensureUser();
    const { data, error } = await this.client.from('profiles').select('notif_prefs').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(`notification choices read failed: ${error.message}`);
    return parseNotifPrefs(data?.notif_prefs);
  }

  async save(prefs: NotifPrefs): Promise<void> {
    const userId = await this.ensureUser();
    const { error } = await this.client
      .from('profiles')
      .upsert({ user_id: userId, notif_prefs: prefsToJson(prefs) }, { onConflict: 'user_id' });
    if (error) throw new Error(`notification choices write failed: ${error.message}`);
  }
}
