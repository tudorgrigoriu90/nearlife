import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import CountiesScreen from './CountiesScreen';
import { createTranslator } from '../lib/i18n';
import { NO_ENTITLEMENTS, resolveEntitlements } from '../lib/entitlement';
import type { PurchaseGateway } from '../lib/purchases';

const tr = createTranslator('en');
const HOME = 'SWE.9_1';

function gateway(over: Partial<PurchaseGateway> = {}): PurchaseGateway {
  return {
    available: () => true,
    products: jest.fn(async (skus?: string[]) =>
      (skus ?? []).map((sku) => ({ sku, priceString: sku === 'all_regions' ? '99,00 kr' : '29,00 kr' })),
    ),
    purchase: jest.fn().mockResolvedValue('purchased'),
    restore: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
}

describe('CountiesScreen (T-105)', () => {
  it('lists the home county first and every other county with its pack price', async () => {
    await render(
      <CountiesScreen locale="en" homeId={HOME} entitlements={NO_ENTITLEMENTS} gateway={gateway()} onView={jest.fn()} />,
    );
    await waitFor(() => expect(screen.getAllByText('29,00 kr')).toHaveLength(20));
    expect(screen.getByText(tr('counties.home'))).toBeTruthy();
    expect(screen.getByText('99,00 kr')).toBeTruthy(); // all of Sweden
  });

  it('opens any county to look at, even a locked one', async () => {
    const onView = jest.fn();
    await render(
      <CountiesScreen locale="en" homeId={HOME} entitlements={NO_ENTITLEMENTS} gateway={gateway()} onView={onView} />,
    );
    await fireEvent.press(screen.getByText('Skåne'));
    expect(onView).toHaveBeenCalledWith({ id: 'SWE.13_1', name: 'Skåne' });
  });

  it('buys a county pack by its product id, then re-reads what the user owns', async () => {
    const gw = gateway();
    const onPurchased = jest.fn();
    await render(
      <CountiesScreen
        locale="en"
        homeId={HOME}
        entitlements={NO_ENTITLEMENTS}
        gateway={gw}
        onView={jest.fn()}
        onPurchased={onPurchased}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('29,00 kr')).toHaveLength(20));
    await fireEvent.press(screen.getByLabelText(tr('counties.buyCounty', { county: 'Skåne' })));
    await waitFor(() => expect(gw.purchase).toHaveBeenCalledWith('region_swe_13'));
    await waitFor(() => expect(onPurchased).toHaveBeenCalled());
  });

  it('shows owned counties as open, without a price', async () => {
    await render(
      <CountiesScreen
        locale="en"
        homeId={HOME}
        entitlements={resolveEntitlements(['region_SWE_13_1'])}
        gateway={gateway()}
        onView={jest.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('29,00 kr')).toHaveLength(19));
    expect(screen.getByText(tr('counties.open'))).toBeTruthy();
  });

  it('with the all-Sweden pass every county is open and nothing is for sale', async () => {
    const gw = gateway();
    await render(
      <CountiesScreen
        locale="en"
        homeId={HOME}
        entitlements={resolveEntitlements(['all_regions'])}
        gateway={gw}
        onView={jest.fn()}
      />,
    );
    expect(screen.getAllByText(tr('counties.open'))).toHaveLength(20);
    expect(screen.queryByText('29,00 kr')).toBeNull();
  });

  it('says a pack opens places, not catches, unless the Full Game already makes that moot', async () => {
    // Director decision 2026-10-30 (option B): packs and the Full Game stay separate products, so the
    // pack screen must not let anyone think All of Sweden also lifts the free-catch limit.
    const view = await render(
      <CountiesScreen locale="en" homeId={HOME} entitlements={NO_ENTITLEMENTS} gateway={gateway()} onView={jest.fn()} />,
    );
    expect(screen.getByText(tr('counties.catchesNote'))).toBeTruthy();
    await view.rerender(
      <CountiesScreen
        locale="en"
        homeId={HOME}
        entitlements={resolveEntitlements(['full_game'])}
        gateway={gateway()}
        onView={jest.fn()}
      />,
    );
    expect(screen.queryByText(tr('counties.catchesNote'))).toBeNull();
  });
});
