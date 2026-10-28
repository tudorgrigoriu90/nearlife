import { DEFAULT_ACTION, speciesIdFromResponse } from './notificationTap';

// A direct-FCM notification (T-201) carries the species id in the FCM `data` map. Depending on
// platform and app state, expo-notifications surfaces it under `content.data` or only under the
// raw `trigger.remoteMessage.data`; both must open the card.
function response(opts: { contentData?: unknown; remoteData?: unknown; action?: string }) {
  return {
    actionIdentifier: opts.action ?? DEFAULT_ACTION,
    notification: {
      request: {
        content: { data: opts.contentData },
        trigger: { type: 'push', remoteMessage: { data: opts.remoteData } },
      },
    },
  };
}

describe('speciesIdFromResponse', () => {
  it('reads the species id from the notification data', () => {
    expect(speciesIdFromResponse(response({ contentData: { speciesId: 'european-robin' } }))).toBe('european-robin');
  });

  it('falls back to the raw FCM data map', () => {
    expect(speciesIdFromResponse(response({ remoteData: { speciesId: 'gbif:2490266' } }))).toBe('gbif:2490266');
  });

  it('ignores anything that is not a plain tap, or carries no usable id', () => {
    expect(speciesIdFromResponse(response({ contentData: { speciesId: 'x' }, action: 'dismiss' }))).toBeNull();
    expect(speciesIdFromResponse(response({ contentData: { speciesId: '' } }))).toBeNull();
    expect(speciesIdFromResponse(response({ contentData: { speciesId: 42 } }))).toBeNull();
    expect(speciesIdFromResponse(response({}))).toBeNull();
    expect(speciesIdFromResponse(null)).toBeNull();
    expect(speciesIdFromResponse({ actionIdentifier: DEFAULT_ACTION } as never)).toBeNull();
  });
});
