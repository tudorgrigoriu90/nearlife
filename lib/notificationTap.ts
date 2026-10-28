// Notification tap → species (T-031). The server puts the species id in the FCM `data` map
// (lib/pushDispatch.ts `buildFcmMessage`); a tap must open that species' card. Pure, so the parsing
// of a loosely-typed native payload is tested without a device.

/** expo-notifications' identifier for a plain tap on the notification body. */
export const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

interface TapLike {
  actionIdentifier?: string;
  notification?: {
    request?: {
      content?: { data?: unknown };
      /** A union of trigger shapes natively; only Android push triggers carry `remoteMessage`. */
      trigger?: unknown;
    };
  };
}

function idIn(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const id = (data as Record<string, unknown>).speciesId;
  return typeof id === 'string' && id !== '' ? id : null;
}

/** The species a tapped notification is about, or null for any other interaction or payload. */
export function speciesIdFromResponse(response: TapLike | null | undefined): string | null {
  if (!response || response.actionIdentifier !== DEFAULT_ACTION) return null;
  const request = response.notification?.request;
  const trigger = request?.trigger as { remoteMessage?: { data?: unknown } } | null | undefined;
  return idIn(request?.content?.data) ?? idIn(trigger?.remoteMessage?.data);
}
