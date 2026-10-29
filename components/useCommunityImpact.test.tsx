import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { CommunityImpactSource } from '../lib/communityImpact';
import { useCommunityImpact } from './useCommunityImpact';

// Driven through a host component rather than renderHook, as elsewhere in this repo.

const row = { season: '2026-autumn', helpers: 12, pledges: 30, give: 18, protect: 12 };

function Host({ source }: { source: CommunityImpactSource | null }) {
  const impact = useCommunityImpact(source);
  return <Text testID="impact">{impact ? `${impact.helpers}/${impact.pledges}` : 'none'}</Text>;
}

describe('useCommunityImpact', () => {
  it('loads the totals from the source', async () => {
    await render(<Host source={{ fetch: jest.fn().mockResolvedValue(row) }} />);
    await waitFor(() => expect(screen.getByTestId('impact')).toHaveTextContent('12/30'));
  });

  it('stays empty when there is no source (no backend configured)', async () => {
    await render(<Host source={null} />);
    expect(screen.getByTestId('impact')).toHaveTextContent('none');
  });

  it('stays empty when the read fails', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('offline'));
    await render(<Host source={{ fetch }} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByTestId('impact')).toHaveTextContent('none');
  });
});
