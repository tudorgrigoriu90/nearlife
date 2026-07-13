import { PostHogTracker, type PostHogClientLike } from './posthogTracker';

function fakeClient(): PostHogClientLike & { calls: [string, unknown][] } {
  const calls: [string, unknown][] = [];
  return {
    calls,
    capture(event, properties) {
      calls.push([event, properties]);
    },
  };
}

describe('PostHogTracker', () => {
  it('translates a typed track call into client.capture', () => {
    const client = fakeClient();
    const tracker = new PostHogTracker(client);
    tracker.track('species_spotted', { speciesId: 'robin', source: 'this_week' });
    expect(client.calls).toEqual([
      ['species_spotted', { speciesId: 'robin', source: 'this_week' }],
    ]);
  });

  it('passes an empty-props event through unchanged', () => {
    const client = fakeClient();
    new PostHogTracker(client).track('session_start', {});
    expect(client.calls).toEqual([['session_start', {}]]);
  });
});
