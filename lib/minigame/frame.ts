// Plant/fungus minigame scoring — "spot & frame" (T-073 core · GDD §4). Find it in the scene and
// frame it well — no photo required. The player places a framing reticle; accuracy falls off with
// distance from the subject's centre, normalised by a generous target radius. Land it if accuracy
// clears the threshold. Render-free core (spatial analogue of the timing grade, T-114).

export interface FrameConfig {
  /** Normalised accuracy (0–1) needed to land it. */
  successThreshold: number;
}

export const DEFAULT_FRAME: FrameConfig = { successThreshold: 0.5 };

export interface FrameResult {
  /** 1 at dead-centre, 0 at/beyond the target radius. */
  accuracy: number;
  success: boolean;
}

/**
 * Grade a framing. `distanceFromCenter` is how far the reticle centre landed from the subject,
 * `targetRadius` the forgiving radius that counts as "on it". Accuracy is linear to the edge.
 */
export function evaluateFrame(
  distanceFromCenter: number,
  targetRadius: number,
  config: FrameConfig = DEFAULT_FRAME,
): FrameResult {
  const clamped = Math.max(0, Math.min(distanceFromCenter, targetRadius));
  const accuracy = targetRadius > 0 ? 1 - clamped / targetRadius : 0;
  return { accuracy, success: accuracy >= config.successThreshold };
}

// Species- and day-dependent layout (T-321 · review B-61): the subject was always in the same place.

export interface FramePoint {
  x: number;
  y: number;
}

/** Nine places on a 3 × 3 grid, inset from the edges, as fractions of the stage. */
const SLOTS: [number, number][] = [0.22, 0.5, 0.76].flatMap((y) =>
  [0.22, 0.5, 0.76].map((x): [number, number] => [x, y]),
);

/** A small deterministic generator (mulberry32): the same seed always gives the same layout. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The subject and three decoys on four different slots, chosen by `seed`. */
export function frameLayout(seed: number, stage: number): { subject: FramePoint; decoys: FramePoint[] } {
  const next = rng(seed);
  const slots = [...SLOTS];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const [subject, ...decoys] = slots.slice(0, 4).map(([x, y]) => ({ x: x * stage, y: y * stage }));
  return { subject, decoys };
}

/** A seed from the species and the day, so one catch differs from the next (FNV-1a). */
export function catchSeed(speciesId: string, day: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${speciesId}|${day}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
