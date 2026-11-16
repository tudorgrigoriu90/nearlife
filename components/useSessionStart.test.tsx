import { act, render } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';
import { DEFAULT_CONSENT, type ConsentState } from '../lib/consent';
import { SESSION_GAP_MS, useSessionStart } from './useSessionStart';

// T-270 · review B-06: session_start is the base of day-7 return and every retention dashboard.

let onChange: ((state: string) => void) | null = null;
beforeEach(() => {
  onChange = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, handler) => {
    onChange = handler as (state: string) => void;
    return { remove: () => (onChange = null) } as never;
  });
});

const granted: ConsentState = { ...DEFAULT_CONSENT, analytics: true };

function Host(props: {
  track: jest.Mock;
  consent: ConsentState;
  loaded: boolean;
  now: () => number;
}) {
  useSessionStart(props.track, props.consent, props.loaded, props.now);
  return <Text>host</Text>;
}

describe('useSessionStart', () => {
  it('sends one session_start once stored consent has loaded and allows analytics', async () => {
    const track = jest.fn();
    const now = () => 0;
    const view = await render(
      <Host track={track} consent={DEFAULT_CONSENT} loaded={false} now={now} />,
    );
    expect(track).not.toHaveBeenCalled();
    await view.rerender(<Host track={track} consent={granted} loaded now={now} />);
    await view.rerender(<Host track={track} consent={granted} loaded now={now} />);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('session_start', {});
  });

  it('sends nothing without analytics consent', async () => {
    const track = jest.fn();
    await render(<Host track={track} consent={DEFAULT_CONSENT} loaded now={() => 0} />);
    await act(async () => onChange?.('active'));
    expect(track).not.toHaveBeenCalled();
  });

  it('a return to the foreground starts a new session only after the gap', async () => {
    const track = jest.fn();
    let t = 0;
    await render(<Host track={track} consent={granted} loaded now={() => t} />);
    t = 5 * 60_000;
    await act(async () => onChange?.('active'));
    expect(track).toHaveBeenCalledTimes(1);
    t = 5 * 60_000 + SESSION_GAP_MS + 60_000; // 31 minutes later
    await act(async () => onChange?.('active'));
    expect(track).toHaveBeenCalledTimes(2);
  });
});
