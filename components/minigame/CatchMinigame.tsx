import { type ComponentType } from 'react';
import { type SpeciesCategory } from '../../lib/species/types';
import { type MinigameProps } from './types';
import TimingRingMinigame from './TimingRingMinigame';
import FishReelMinigame from './FishReelMinigame';
import TraceMinigame from './TraceMinigame';
import StealthMinigame from './StealthMinigame';
import FrameMinigame from './FrameMinigame';

// Per-category catch-minigame dispatcher (T-069 · GDD §4). The catch flow hands us the species'
// category and one identical set of callbacks; we pick the matching mechanic. Species within a
// category reskin the same game (a kingfisher and a swift both "time the dive"). Fungus shares the
// plant "spot & frame" game. Keeping the mapping here (not in App.tsx) means the flow never learns
// the category→mechanic table, and a new category is a one-line change.

const BY_CATEGORY: Record<SpeciesCategory, ComponentType<MinigameProps>> = {
  bird: TimingRingMinigame,
  fish: FishReelMinigame,
  insect: TraceMinigame,
  mammal: StealthMinigame,
  plant: FrameMinigame,
  fungus: FrameMinigame,
};

export default function CatchMinigame({
  category,
  ...props
}: MinigameProps & { category: SpeciesCategory }) {
  const Game = BY_CATEGORY[category];
  return <Game {...props} />;
}
