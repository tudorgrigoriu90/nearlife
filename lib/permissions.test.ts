import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  getDevicePushToken,
  getLocationFixOnce,
  onPushTokenChange,
  requestNotificationPermission,
} from './permissions';
import { ANDROID_CHANNEL_ID } from './pushDispatch';

const mocked = Notifications as jest.Mocked<typeof Notifications>;

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
const mockedLocation = Location as jest.Mocked<typeof Location>;

describe('getLocationFixOnce', () => {
  it('returns just the coordinates, at balanced accuracy', async () => {
    mockedLocation.getCurrentPositionAsync.mockResolvedValueOnce({
      coords: { latitude: 56.879, longitude: 14.806, altitude: 160, accuracy: 30 },
      timestamp: 1,
    } as never);
    await expect(getLocationFixOnce()).resolves.toEqual({ latitude: 56.879, longitude: 14.806 });
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('returns null when no fix can be had (GPS off, timeout)', async () => {
    mockedLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('unavailable'));
    await expect(getLocationFixOnce()).resolves.toBeNull();
  });
});

describe('getDevicePushToken', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  it('creates the channel the server addresses before taking the Android token', async () => {
    Platform.OS = 'android';
    await expect(getDevicePushToken()).resolves.toEqual({ type: 'android', data: 'test-fcm-token' });
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      ANDROID_CHANNEL_ID,
      expect.objectContaining({ name: 'Nearby' }),
    );
  });

  it('creates no channel off Android', async () => {
    Platform.OS = 'ios';
    await getDevicePushToken();
    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('returns null instead of throwing when the platform has no token (no Firebase config, web)', async () => {
    mocked.getDevicePushTokenAsync.mockRejectedValueOnce(new Error('no google-services.json'));
    await expect(getDevicePushToken()).resolves.toBeNull();
  });

  it('treats a non-string token payload as unusable', async () => {
    mocked.getDevicePushTokenAsync.mockResolvedValueOnce({ type: 'web', data: {} } as never);
    await expect(getDevicePushToken()).resolves.toEqual({ type: 'web', data: '' });
  });
});

describe('onPushTokenChange', () => {
  it('subscribes and hands back an unsubscribe', () => {
    const remove = jest.fn();
    mocked.addPushTokenListener.mockReturnValueOnce({ remove } as never);
    const unsubscribe = onPushTokenChange(() => {});
    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });
});

describe('requestNotificationPermission', () => {
  it('maps the OS answer to granted/denied', async () => {
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    mocked.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as never);
    await expect(requestNotificationPermission()).resolves.toBe('denied');
  });
});
