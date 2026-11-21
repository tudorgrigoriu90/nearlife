import { renderHook, waitFor } from '@testing-library/react-native';
import { useSecondaryNames } from './useSecondaryNames';

// T-387: the lookalikes' names in the second language, read per species (at most three).
describe('useSecondaryNames', () => {
  const content = (commonName?: string) => ({ speciesId: 'x', fact: 'f', whenAndHow: 'w', give: 'g', protect: 'p', commonName });

  it('reads each name in the second language, skipping species without one', async () => {
    const get = jest.fn(async (id: string) => (id === 'a' ? content('Inăriță') : id === 'b' ? content() : null));
    const repo = { getContentInLocale: get };
    const ids = ['a', 'b', 'c'];
    const { result } = await renderHook(() => useSecondaryNames(repo, ids, 'ro'));
    await waitFor(() => expect(result.current).toEqual({ a: 'Inăriță' }));
    expect(get).toHaveBeenCalledWith('a', 'ro');
  });

  it('reads nothing without a second language, and survives a failed read', async () => {
    const get = jest.fn(async () => {
      throw new Error('offline');
    });
    const repo = { getContentInLocale: get };
    const ids = ['a'];
    const { result } = await renderHook(() => useSecondaryNames(repo, ids, null));
    expect(result.current).toEqual({});
    expect(get).not.toHaveBeenCalled();
    const failing = await renderHook(() => useSecondaryNames(repo, ids, 'ro'));
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(failing.result.current).toEqual({});
  });
});
