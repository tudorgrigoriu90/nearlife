import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Coordinates } from './hometown';
import { ANDROID_CHANNEL_ID } from './pushDispatch';
import type { DeviceToken } from './pushRegistration';

// Thin native permission adapter (T-022, extended in T-024). This is the only onboarding piece
// that touches the OS, so it is kept minimal and free of app logic — the flow it feeds is the
// unit-tested state machine in lib/onboarding.ts. We request while-in-use (foreground) location
// only; background location is never requested (PRIVACY §1).

export type PermissionOutcome = 'granted' | 'denied';

/** Fire the OS while-in-use location dialog (after our own pre-prompt explainer, T-022). */
export async function requestLocationPermission(): Promise<PermissionOutcome> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

/**
 * One location fix for hometown resolution (T-090), or null if none can be had. Balanced accuracy
 * (~100 m) is plenty for "which county" and far quicker and kinder to the battery than High. The
 * caller resolves it to a county immediately and drops it (lib/hometownStore.ts `deriveHometown`).
 */
export async function getLocationFixOnce(): Promise<Coordinates | null> {
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: coords.latitude, longitude: coords.longitude };
  } catch {
    return null;
  }
}

/** Fire the OS notification dialog (after our own pre-prompt explainer, T-024). */
export async function requestNotificationPermission(): Promise<PermissionOutcome> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

/**
 * The raw FCM (Android) / APNs (iOS) device token for direct FCM sends (T-201), or null where
 * there is none — web, a simulator, or a build without google-services.json. Creates the Android
 * channel first: Android 8+ files a notification under a channel, and the server addresses
 * `ANDROID_CHANNEL_ID`, so the channel must exist before the first message arrives.
 */
export async function getDevicePushToken(): Promise<DeviceToken | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Nearby',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const token = await Notifications.getDevicePushTokenAsync();
    return { type: token.type, data: typeof token.data === 'string' ? token.data : '' };
  } catch {
    return null;
  }
}

/** FCM rotates tokens occasionally; re-register when it does. Returns the unsubscribe. */
export function onPushTokenChange(listener: () => void): () => void {
  const subscription = Notifications.addPushTokenListener(listener);
  return () => subscription.remove();
}
