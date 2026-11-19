import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { easyModeOn, type EasyChoice, type EasyModeStore } from '../lib/easyModeStore';

/** The system's reduced-motion setting, kept current while the app runs (T-330). */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => live && setReduce(on))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** Easy catching (T-331): the stored choice, or the system's reduced motion until there is one. */
export function useEasyMode(store: EasyModeStore): { easy: boolean; setEasy: (on: boolean) => void } {
  const reduceMotion = useReducedMotion();
  const [choice, setChoice] = useState<EasyChoice>(null);
  useEffect(() => {
    let live = true;
    void store.load().then((c) => live && setChoice(c));
    return () => {
      live = false;
    };
  }, [store]);
  const setEasy = useCallback(
    (on: boolean) => {
      setChoice(on);
      void store.save(on);
    },
    [store],
  );
  return { easy: easyModeOn(choice, reduceMotion), setEasy };
}
