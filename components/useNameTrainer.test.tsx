import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { NameTrainerStore, TrainerState } from '../lib/nameTrainer';
import { useNameTrainer } from './useNameTrainer';

// T-351 · review F-06.
function store(initial: TrainerState = {}): NameTrainerStore & { saved: TrainerState[] } {
  const saved: TrainerState[] = [];
  return { saved, load: async () => initial, save: async (s) => void saved.push(s) };
}

describe('useNameTrainer', () => {
  it('loads the schedule, records an answer and saves it', async () => {
    const s = store({ owl: { due: '2026-11-02', reviews: 1 } });
    const { result } = await renderHook(() => useNameTrainer(s));
    await waitFor(() => expect(result.current.state.owl).toBeDefined());
    await act(async () => result.current.record('owl', 'learning', '2026-11-02'));
    expect(result.current.state.owl).toEqual({ due: '2026-11-05', reviews: 2 });
    expect(s.saved.at(-1)).toEqual(result.current.state);
    await act(async () => result.current.reset());
    expect(result.current.state).toEqual({});
  });
});
