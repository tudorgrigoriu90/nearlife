import { useCallback, useEffect, useState } from 'react';
import { answer, type NameTrainerStore, type TrainerState } from '../lib/nameTrainer';

/** The name trainer's schedule in the app (T-351): loaded once, saved on every answer, cleared on deletion. */
export function useNameTrainer(store: NameTrainerStore): {
  state: TrainerState;
  record: (speciesId: string, result: 'knew' | 'learning', today: string) => void;
  reset: () => void;
} {
  const [state, setState] = useState<TrainerState>({});
  useEffect(() => {
    let live = true;
    void store.load().then((loaded) => live && setState(loaded));
    return () => {
      live = false;
    };
  }, [store]);
  const record = useCallback(
    (speciesId: string, result: 'knew' | 'learning', today: string) => {
      setState((current) => {
        const next = answer(current, speciesId, result, today);
        void store.save(next);
        return next;
      });
    },
    [store],
  );
  const reset = useCallback(() => setState({}), []);
  return { state, record, reset };
}
