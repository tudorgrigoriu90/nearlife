import { render, screen } from '@testing-library/react-native';
import AppRoot from './AppRoot';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('./App', () => {
  const { Text: T } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <T>app</T> };
});

// T-229: Android 15+ draws apps edge to edge, so without insets the bottom buttons sit under the
// system navigation bar (and on iOS under the home indicator). Every screen renders inside App, so
// one safe area at the root keeps all of them clear.
describe('AppRoot', () => {
  it('renders the app inside a safe area that clears the bottom and side system bars', async () => {
    await render(<AppRoot />);
    const app = screen.getByText('app');
    let node = app.parent;
    let edges: unknown;
    while (node && edges === undefined) {
      edges = node.props.edges;
      node = node.parent;
    }
    // The library normalises the edges list to a per-edge mode.
    expect(edges).toEqual({ bottom: 'additive', left: 'additive', right: 'additive', top: 'off' });
  });
});
