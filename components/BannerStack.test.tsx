import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import BannerStack, { STATUS_BAR_GAP } from './BannerStack';

// T-318 · review B-38: two banners together share one status-bar gap.

describe('BannerStack', () => {
  it('clears the status bar once for the whole stack', async () => {
    await render(
      <BannerStack>
        {[<Text key="a">offline</Text>, <Text key="b">viewing Skåne</Text>]}
      </BannerStack>,
    );
    const stack = screen.getByTestId('banner-stack');
    expect(StyleSheet.flatten(stack.props.style).paddingTop).toBe(STATUS_BAR_GAP);
    expect(screen.getByText('offline')).toBeTruthy();
    expect(screen.getByText('viewing Skåne')).toBeTruthy();
  });

  it('takes no space when no banner shows', async () => {
    await render(<BannerStack>{[null, false]}</BannerStack>);
    expect(screen.queryByTestId('banner-stack')).toBeNull();
  });
});
