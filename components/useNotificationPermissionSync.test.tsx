import { render } from '@testing-library/react-native';
import { act } from 'react';
import { AppState, Text } from 'react-native';
import { useNotificationPermissionSync } from './useNotificationPermissionSync';

// T-300 · review B-33: notifications turned off in system settings turn the app's consent off.

let appStateListener: ((s: string) => void) | null = null;
beforeEach(() => {
  appStateListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, listener) => {
    appStateListener = listener as (s: string) => void;
    return { remove: () => (appStateListener = null) } as never;
  });
});

function Host(props: { enabled: boolean; consentOn: boolean; check: () => Promise<string>; onRevoked: () => void }) {
  useNotificationPermissionSync({
    enabled: props.enabled,
    consentOn: props.consentOn,
    check: props.check as never,
    onRevoked: props.onRevoked,
  });
  return <Text>host</Text>;
}

describe('useNotificationPermissionSync', () => {
  it('turns consent off at launch when the OS permission is gone', async () => {
    const onRevoked = jest.fn();
    await render(<Host enabled consentOn check={async () => 'denied'} onRevoked={onRevoked} />);
    await act(async () => {});
    expect(onRevoked).toHaveBeenCalledTimes(1);
  });

  it('leaves consent alone while the permission is granted or unreadable', async () => {
    const onRevoked = jest.fn();
    await render(<Host enabled consentOn check={async () => 'granted'} onRevoked={onRevoked} />);
    await render(<Host enabled consentOn check={async () => 'unknown'} onRevoked={onRevoked} />);
    await act(async () => {});
    expect(onRevoked).not.toHaveBeenCalled();
  });

  it('checks again each time the app comes back to the foreground', async () => {
    const onRevoked = jest.fn();
    let status = 'granted';
    await render(<Host enabled consentOn check={async () => status} onRevoked={onRevoked} />);
    await act(async () => {});
    status = 'denied';
    await act(async () => appStateListener?.('background'));
    expect(onRevoked).not.toHaveBeenCalled();
    await act(async () => appStateListener?.('active'));
    expect(onRevoked).toHaveBeenCalledTimes(1);
  });

  it('does not ask while consent is off or before the app is ready', async () => {
    const check = jest.fn(async () => 'denied');
    await render(<Host enabled consentOn={false} check={check} onRevoked={jest.fn()} />);
    await render(<Host enabled={false} consentOn check={check} onRevoked={jest.fn()} />);
    await act(async () => {});
    expect(check).not.toHaveBeenCalled();
  });
});
