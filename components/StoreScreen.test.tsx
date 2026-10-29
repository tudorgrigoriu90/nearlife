import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import StoreScreen from './StoreScreen';
import { createTranslator } from '../lib/i18n';
import { NO_ENTITLEMENTS, resolveEntitlements } from '../lib/entitlement';
import type { PurchaseGateway } from '../lib/purchases';

const tr = createTranslator('en');

function gateway(over: Partial<PurchaseGateway> = {}): PurchaseGateway {
  return {
    available: () => true,
    products: jest.fn().mockResolvedValue([
      { sku: 'full_game', priceString: '49,00 kr' },
      { sku: 'family', priceString: '99,00 kr' },
    ]),
    purchase: jest.fn().mockResolvedValue('purchased'),
    restore: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
}

describe('StoreScreen', () => {
  it('shows both products with the store’s own prices, and the reassurances', async () => {
    await render(<StoreScreen locale="en" gateway={gateway()} entitlements={NO_ENTITLEMENTS} />);
    await waitFor(() => expect(screen.getByText('49,00 kr')).toBeTruthy());
    expect(screen.getByText('99,00 kr')).toBeTruthy();
    expect(screen.getByText(tr('paywall.freeMission'))).toBeTruthy();
    expect(screen.getByText(tr('paywall.noAds'))).toBeTruthy();
  });

  it('buys, then asks the app to re-read what the user owns', async () => {
    const gw = gateway();
    const onPurchased = jest.fn();
    await render(<StoreScreen locale="en" gateway={gw} entitlements={NO_ENTITLEMENTS} onPurchased={onPurchased} />);
    await waitFor(() => expect(screen.getByText('49,00 kr')).toBeTruthy());
    await fireEvent.press(screen.getAllByText(tr('store.buy'))[0]);
    await waitFor(() => expect(gw.purchase).toHaveBeenCalledWith('full_game'));
    await waitFor(() => expect(onPurchased).toHaveBeenCalled());
  });

  it('says nothing when the user backs out of the store dialog', async () => {
    const gw = gateway({ purchase: jest.fn().mockResolvedValue('cancelled') });
    const onPurchased = jest.fn();
    await render(<StoreScreen locale="en" gateway={gw} entitlements={NO_ENTITLEMENTS} onPurchased={onPurchased} />);
    await waitFor(() => expect(screen.getByText('49,00 kr')).toBeTruthy());
    await fireEvent.press(screen.getAllByText(tr('store.buy'))[0]);
    await waitFor(() => expect(gw.purchase).toHaveBeenCalled());
    expect(onPurchased).not.toHaveBeenCalled();
    expect(screen.queryByText(tr('store.error'))).toBeNull();
  });

  it('shows owned products as unlocked, with no buy button', async () => {
    await render(<StoreScreen locale="en" gateway={gateway()} entitlements={resolveEntitlements(['family'])} />);
    await waitFor(() => expect(screen.getAllByText(tr('store.owned'))).toHaveLength(2));
    expect(screen.queryByText(tr('store.buy'))).toBeNull();
  });

  it('restores purchases', async () => {
    const gw = gateway();
    await render(<StoreScreen locale="en" gateway={gw} entitlements={NO_ENTITLEMENTS} />);
    await fireEvent.press(screen.getByText(tr('store.restore')));
    await waitFor(() => expect(gw.restore).toHaveBeenCalled());
  });

  it('explains plainly when this build cannot buy', async () => {
    await render(<StoreScreen locale="en" gateway={gateway({ available: () => false })} entitlements={NO_ENTITLEMENTS} />);
    expect(screen.getByText(tr('store.unavailable'))).toBeTruthy();
    expect(screen.queryByText(tr('store.buy'))).toBeNull();
  });
});
