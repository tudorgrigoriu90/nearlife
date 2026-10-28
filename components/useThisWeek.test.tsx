import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { SpeciesRepository } from '../lib/speciesRepository';
import type { LiveThisWeek } from '../lib/thisWeekLive';
import { useThisWeek } from './useThisWeek';

function repo(overrides: Partial<SpeciesRepository> = {}): SpeciesRepository {
  return {
    listSpecies: async () => [],
    getContent: async () => null,
    getContentInLocale: async () => null,
    regionPresence: jest.fn(async (regionId: string) =>
      regionId === 'SWE.13_1' ? [{ speciesId: 'pike', activeMonths: [6], occurrences: 9 }] : [],
    ),
    describeSpecies: async (ids) =>
      ids.map((id) => ({ species: { id } as never, commonName: `name:${id}`, detail: null })),
    ...overrides,
  };
}

let latest: LiveThisWeek | null = null;
const record = (value: LiveThisWeek | null) => {
  latest = value;
};

function Host(props: {
  repo: SpeciesRepository;
  regionId: string | null;
  spotted?: string[];
  onValue?: (value: LiveThisWeek | null) => void;
}) {
  const { onValue = record } = props;
  onValue(useThisWeek(props.repo, props.regionId, 6, new Set(props.spotted ?? []), 'sv'));
  return <Text>host</Text>;
}

beforeEach(() => {
  latest = null;
});

describe('useThisWeek', () => {
  it('loads the county list once there is a hometown', async () => {
    await render(<Host repo={repo()} regionId="SWE.13_1" />);
    await waitFor(() => expect(latest?.items.map((i) => i.commonName)).toEqual(['name:pike']));
    expect(latest?.total).toBe(1);
  });

  it('stays null without a hometown, so the screen keeps its preview list', async () => {
    const r = repo();
    await render(<Host repo={r} regionId={null} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(latest).toBeNull();
    expect(r.regionPresence).not.toHaveBeenCalled();
  });

  it('re-flags NEW when the collection changes, without reloading presence', async () => {
    const r = repo();
    const view = await render(<Host repo={r} regionId="SWE.13_1" />);
    await waitFor(() => expect(latest?.items[0]?.isNew).toBe(true));
    await view.rerender(<Host repo={r} regionId="SWE.13_1" spotted={['pike']} />);
    await waitFor(() => expect(latest?.items[0]?.isNew).toBe(false));
    expect(r.regionPresence).toHaveBeenCalledTimes(1);
  });

  it('logs and keeps the preview when presence cannot load', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <Host
        repo={repo({ regionPresence: async () => Promise.reject(new Error('offline')) })}
        regionId="SWE.13_1"
      />,
    );
    await waitFor(() => expect(warn).toHaveBeenCalledWith('this week presence failed', expect.any(Error)));
    expect(latest).toBeNull();
    warn.mockRestore();
  });

  it('logs a failed describe instead of crashing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <Host repo={repo({ describeSpecies: async () => Promise.reject(new Error('x')) })} regionId="SWE.13_1" />,
    );
    await waitFor(() => expect(warn).toHaveBeenCalledWith('this week describe failed', expect.any(Error)));
    warn.mockRestore();
  });
});
