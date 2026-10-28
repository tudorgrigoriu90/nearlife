import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { PushRegistrationGateway } from '../lib/pushRegistration';
import {
  usePushRegistration,
  type PushRegistrationDeps,
  type PushRegistrationInput,
} from './usePushRegistration';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function setup(enabled = true) {
  const calls: string[] = [];
  let tokenListener: (() => void) | null = null;
  const unsubscribe = jest.fn();
  const gateway: PushRegistrationGateway = {
    upsertDevice: async (_u, d) => void calls.push(`upsert:${d.locale}`),
    deleteDevices: async () => void calls.push('delete'),
    setHomeRegion: async (_u, r) => void calls.push(`region:${r}`),
  };
  const deps: PushRegistrationDeps = {
    enabled: () => enabled,
    ensureUser: async () => 'u1',
    gateway: () => gateway,
    getToken: async () => ({ type: 'android', data: 'tok' }),
    onTokenChange: (listener) => {
      tokenListener = listener;
      return unsubscribe;
    },
  };
  function Host(props: PushRegistrationInput) {
    usePushRegistration(props, deps);
    return <Text>host</Text>;
  }
  return { calls, deps, Host, unsubscribe, fireTokenChange: () => tokenListener?.() };
}

const base: PushRegistrationInput = { ready: true, wanted: true, locale: 'sv', homeRegion: 'SWE.9_1' };

describe('usePushRegistration', () => {
  it('does nothing until onboarding is done and stored consent has loaded', async () => {
    const { calls, Host } = setup();
    await render(<Host {...base} ready={false} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toEqual([]);
  });

  it('does nothing without a Supabase config', async () => {
    const { calls, Host } = setup(false);
    await render(<Host {...base} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toEqual([]);
  });

  it('registers when consent is on, and again when FCM rotates the token', async () => {
    const { calls, Host, fireTokenChange } = setup();
    await render(<Host {...base} />);
    await waitFor(() => expect(calls).toEqual(['region:SWE.9_1', 'upsert:sv']));
    fireTokenChange();
    await waitFor(() => expect(calls).toHaveLength(4));
  });

  it('withdraws after the register finishes, never before, when consent is turned off', async () => {
    const { calls, Host, unsubscribe } = setup();
    const view = await render(<Host {...base} />);
    await view.rerender(<Host {...base} wanted={false} />);
    await waitFor(() => expect(calls).toEqual(['region:SWE.9_1', 'upsert:sv', 'delete']));
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('logs a failed sync instead of crashing the app', async () => {
    const { Host, deps } = setup();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    deps.ensureUser = async () => {
      throw new Error('offline');
    };
    await render(<Host {...base} />);
    await waitFor(() => expect(warn).toHaveBeenCalledWith('push registration failed', expect.any(Error)));
    warn.mockRestore();
  });
});
