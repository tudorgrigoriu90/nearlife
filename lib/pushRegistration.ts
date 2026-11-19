import type { SupabaseClient } from '@supabase/supabase-js';

// Push device registration (T-201). Keeps the server's `push_devices` rows in step with the
// user's notification consent: a row exists exactly while consent is on, because the sender
// treats a registered device as the opt-in (migration 20261028000001). The native token call and
// the Supabase writes sit behind small seams so the rule is tested without a phone or a network.

export type Platform = 'android' | 'ios';

/** What `Notifications.getDevicePushTokenAsync` returns: an FCM token on Android, APNs on iOS. */
export interface DeviceToken {
  type: string;
  data: string;
}

export interface PushRegistrationGateway {
  upsertDevice(userId: string, device: { token: string; platform: Platform; locale: string }): Promise<void>;
  /** Removes every device of the user — consent withdrawal must not depend on a token lookup. */
  deleteDevices(userId: string): Promise<void>;
  setHomeRegion(userId: string, region: string): Promise<void>;
}

export interface SyncInput {
  /** The user's notification consent (Settings / onboarding opt-in). */
  wanted: boolean;
  userId: string;
  locale: string;
  homeRegion: string | null;
  getToken: () => Promise<DeviceToken | null>;
  gateway: PushRegistrationGateway;
  /**
   * Whether this install has registered a device (T-300 · review B-37). Without it, consent off
   * deletes every launch, even for a user who never turned notifications on.
   */
  registered?: { get(): Promise<boolean>; set(value: boolean): Promise<void> };
}

export type SyncOutcome = 'registered' | 'unregistered' | 'unavailable';

function asPlatform(type: string): Platform | null {
  return type === 'android' || type === 'ios' ? type : null;
}

export async function syncPushRegistration(input: SyncInput): Promise<SyncOutcome> {
  const { wanted, userId, gateway } = input;
  if (!wanted) {
    if (input.registered && !(await input.registered.get())) return 'unregistered';
    await gateway.deleteDevices(userId);
    await input.registered?.set(false);
    return 'unregistered';
  }
  const token = await input.getToken();
  const platform = token === null ? null : asPlatform(token.type);
  if (token === null || platform === null || token.data === '') return 'unavailable';
  // The region goes first: a device row without one is skipped by the sender as 'no-region'.
  if (input.homeRegion !== null) await gateway.setHomeRegion(userId, input.homeRegion);
  await gateway.upsertDevice(userId, { token: token.data, platform, locale: input.locale });
  await input.registered?.set(true);
  return 'registered';
}

export class SupabasePushGateway implements PushRegistrationGateway {
  constructor(private readonly client: SupabaseClient) {}

  async upsertDevice(userId: string, device: { token: string; platform: Platform; locale: string }) {
    const { error } = await this.client.from('push_devices').upsert(
      {
        user_id: userId,
        token: device.token,
        platform: device.platform,
        locale: device.locale,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );
    if (error) throw new Error(`push device save failed: ${error.message}`);
  }

  async deleteDevices(userId: string) {
    const { error } = await this.client.from('push_devices').delete().eq('user_id', userId);
    if (error) throw new Error(`push device delete failed: ${error.message}`);
  }

  async setHomeRegion(userId: string, region: string) {
    const { error } = await this.client
      .from('profiles')
      .upsert({ user_id: userId, home_region: region }, { onConflict: 'user_id' });
    if (error) throw new Error(`home region save failed: ${error.message}`);
  }
}

/** The registered flag on the phone (T-300); erased with the account under the `nearby.` prefix. */
export const PUSH_REGISTERED_KEY = 'nearby.push.registered';

export function asyncStorageRegisteredFlag(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}): { get(): Promise<boolean>; set(value: boolean): Promise<void> } {
  return {
    // Unreadable storage counts as registered: an extra delete is safe, a missed one is not.
    get: () => storage.getItem(PUSH_REGISTERED_KEY).then((v) => v !== 'false' && v !== null, () => true),
    set: (value) => storage.setItem(PUSH_REGISTERED_KEY, String(value)).catch(() => undefined),
  };
}
