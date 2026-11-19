import { render, screen } from '@testing-library/react-native';
import ImpactScreen from './ImpactScreen';
import { createTranslator } from '../lib/i18n';
import type { CollectionRecord } from '../lib/collection';

const tr = createTranslator('en');

function rec(id: string, over: Partial<CollectionRecord> = {}): CollectionRecord {
  return { speciesId: id, spottedAt: 't', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false, ...over };
}

describe('ImpactScreen', () => {
  it('shows the empty state (and the honest community note) with no pledges', async () => {
    await render(<ImpactScreen locale="en" records={[rec('swift')]} />);
    expect(screen.getByText(tr('impact.empty'))).toBeTruthy();
    // Never a fabricated community figure — just the honest "coming later" note (invariant #1).
    expect(screen.getByText(tr('impact.community'))).toBeTruthy();
  });

  it('counts real pledges (species helped, give, protect)', async () => {
    const records = [
      rec('swift', { helpedAt: '2026-10-20T10:00:00Z', helpedKind: 'give' }),
      rec('robin', { helpedAt: '2026-10-21T10:00:00Z', helpedKind: 'protect' }),
    ];
    await render(<ImpactScreen locale="en" records={records} seasonKey="2026-autumn" />);
    // 2 distinct species helped, 1 give + 1 protect.
    expect(screen.getByText(tr('impact.helpedSpecies'))).toBeTruthy();
    expect(screen.getByText(tr('impact.give'))).toBeTruthy();
    expect(screen.getByText(tr('impact.protect'))).toBeTruthy();
    // The counts render: "2" species helped and "2" different actions (T-319), "1" give, "1" protect.
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getAllByText('1')).toHaveLength(2);
    // Empty state is gone.
    expect(screen.queryByText(tr('impact.empty'))).toBeNull();
  });

  it('shows real community totals when enough people are helping (T-081)', async () => {
    const community = { season: '2026-autumn', helpers: 12, pledges: 30, give: 18, protect: 12 };
    await render(<ImpactScreen locale="en" records={[]} community={community} />);
    expect(
      screen.getByText(tr('impact.communityTotals', { helpers: 12, pledges: 30, give: 18, protect: 12 }), {
        exact: false,
      }),
    ).toBeTruthy();
    expect(screen.queryByText(tr('impact.community'))).toBeNull();
  });

  it('keeps the honest note when totals are too small to show', async () => {
    const community = { season: '2026-autumn', helpers: 1, pledges: 1, give: 1, protect: 0 };
    await render(<ImpactScreen locale="en" records={[]} community={community} />);
    expect(screen.getByText(tr('impact.community'))).toBeTruthy();
  });

  it('counts only this season\'s pledges, as its subtitle says (T-216)', async () => {
    const records = [
      rec('swift', { helpedAt: '2026-06-10T10:00:00Z', helpedKind: 'give' }),
      rec('robin', { helpedAt: '2026-10-20T10:00:00Z', helpedKind: 'protect' }),
    ];
    await render(<ImpactScreen locale="en" records={records} seasonKey="2026-autumn" />);
    // 1 species helped, 0 give, 1 protect, 1 action: the summer pledge is last season's.
    expect(screen.getAllByText('1')).toHaveLength(3);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('shows the empty state when every pledge was in an earlier season', async () => {
    const records = [rec('swift', { helpedAt: '2026-06-10T10:00:00Z', helpedKind: 'give' })];
    await render(<ImpactScreen locale="en" records={records} seasonKey="2026-autumn" />);
    expect(screen.getByText(tr('impact.empty'))).toBeTruthy();
  });
});

// T-319 · review B-67: ten pledges of the same group action are one action, not ten.
describe('ImpactScreen distinct actions', () => {
  it('counts a group action once however many species it was pledged on', async () => {
    const records = ['gbif:1', 'gbif:2', 'gbif:3'].map((id) =>
      rec(id, { helpedAt: '2026-10-20T10:00:00Z', helpedKind: 'give' }),
    );
    await render(
      <ImpactScreen locale="en" records={records} seasonKey="2026-autumn" groupOf={() => 'bird'} />,
    );
    expect(screen.getByText(tr('impact.actions'))).toBeTruthy();
    expect(screen.getByTestId('impact-actions').props.children).toBe(1);
  });
});
