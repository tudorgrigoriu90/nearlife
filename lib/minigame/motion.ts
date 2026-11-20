// Motion for the minigames (T-366 · review I-06). A game whose moving part follows a fixed path in
// time (the fish's drift, the insect's flight) hands the path to the native driver as an
// interpolation over elapsed time, so it moves without React re-rendering each frame. The game
// logic still samples the same function on its own tick, so what is drawn and what is scored agree.

/** `fn` sampled every `stepMs` from 0 to `durationMs`, as an Animated interpolation's ranges. */
export function sampledPath(
  fn: (ms: number) => number,
  durationMs: number,
  stepMs: number,
): { inputRange: number[]; outputRange: number[] } {
  const inputRange: number[] = [];
  for (let ms = 0; ms < durationMs; ms += stepMs) inputRange.push(ms);
  inputRange.push(durationMs);
  return { inputRange, outputRange: inputRange.map(fn) };
}
