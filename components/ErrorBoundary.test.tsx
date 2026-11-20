import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { createTranslator } from '../lib/i18n';
import ErrorBoundary from './ErrorBoundary';

// T-323 · review I-02: a render error shows a way back instead of a blank screen, and is reported.

const tr = createTranslator('en');
let shouldThrow = true;
function Flaky() {
  const [n] = useState(0);
  if (shouldThrow) throw new Error('boom');
  return <Text>app {n}</Text>;
}

beforeEach(() => {
  shouldThrow = true;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => (console.error as jest.Mock).mockRestore());

describe('ErrorBoundary', () => {
  it('shows the fallback and reports the error', async () => {
    const report = jest.fn();
    await render(
      <ErrorBoundary locale="en" report={report}>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByText(tr('error.title'))).toBeTruthy();
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    // T-367: also to the device log, readable without crash-reporting consent.
    expect(console.error).toHaveBeenCalledWith('[ErrorBoundary]', 'boom', expect.any(String), expect.any(String));
  });

  it('"Back to start" mounts the app again', async () => {
    await render(
      <ErrorBoundary locale="en" report={() => {}}>
        <Flaky />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    await fireEvent.press(screen.getByText(tr('error.restart')));
    expect(screen.getByText('app 0')).toBeTruthy();
  });
});
