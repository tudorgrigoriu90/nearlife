import { render } from '@testing-library/react-native';
import SpotMap, { loadMapLibre } from './SpotMap';

describe('SpotMap (T-067)', () => {
  it('renders nothing on a build without the native map, so the catch screen still works', async () => {
    expect(loadMapLibre()).toBeNull();
    const { toJSON } = await render(
      <SpotMap user={null} spots={[]} targetId={null} onPick={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });
});
