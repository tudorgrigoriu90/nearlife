import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { Species } from '../lib/species/types';
import type { SpeciesRepository } from '../lib/speciesRepository';
import { useAlmanacCatalogue, type AlmanacCatalogue } from './useAlmanacCatalogue';

const sp = (id: string) => ({ id, commonName: id }) as Species;

function repo(overrides: Partial<SpeciesRepository> = {}): SpeciesRepository {
  return {
    listSpecies: async () => [],
    getContent: async () => null,
    getContentInLocale: async () => null,
    regionPresence: async () => [],
    regionCatalogue: jest.fn(async () => [sp('a'), sp('b')]),
    describeSpecies: jest.fn(async (ids: string[]) =>
      ids.map((id) => ({ species: sp(id), commonName: id, detail: null })),
    ),
    ...overrides,
  };
}

let latest: AlmanacCatalogue | null = null;
const record = (value: AlmanacCatalogue) => {
  latest = value;
};

function Host(props: { repo: SpeciesRepository; regionId: string | null; collected?: string[] }) {
  record(useAlmanacCatalogue(props.repo, props.regionId, 'sv', new Set(props.collected ?? [])));
  return <Text>host</Text>;
}

beforeEach(() => {
  latest = null;
});

describe('useAlmanacCatalogue', () => {
  it('is loading until the county list arrives, then lists it', async () => {
    await render(<Host repo={repo()} regionId="SWE.13_1" />);
    await waitFor(() => expect(latest?.loading).toBe(false));
    expect(latest?.species.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('appends collected species outside the county without re-reading the county list', async () => {
    const r = repo();
    const view = await render(<Host repo={r} regionId="SWE.13_1" collected={['a']} />);
    await waitFor(() => expect(latest?.loading).toBe(false));
    await view.rerender(<Host repo={r} regionId="SWE.13_1" collected={['a', 'moose']} />);
    await waitFor(() => expect(latest?.species.map((s) => s.id)).toEqual(['a', 'b', 'moose']));
    expect(r.regionCatalogue).toHaveBeenCalledTimes(1);
  });

  it('shows an empty Almanac instead of spinning forever when the read fails', async () => {
    await render(
      <Host repo={repo({ regionCatalogue: async () => Promise.reject(new Error('offline')) })} regionId="SWE.13_1" />,
    );
    await waitFor(() => expect(latest).toEqual({ species: [], loading: false }));
  });

  it('keeps the county list when the extras lookup fails', async () => {
    await render(
      <Host
        repo={repo({ describeSpecies: async () => Promise.reject(new Error('x')) })}
        regionId="SWE.13_1"
        collected={['moose']}
      />,
    );
    await waitFor(() => expect(latest?.species.map((s) => s.id)).toEqual(['a', 'b']));
  });
});
