import { useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type TranslationKey } from '../../lib/i18n';
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

const INSTRUCTION: Record<SpeciesCategory, TranslationKey> = {
  bird: 'minigame.bird.instruction',
  fish: 'minigame.fish.instruction',
  insect: 'minigame.insect.instruction',
  mammal: 'minigame.mammal.instruction',
  plant: 'minigame.plant.instruction',
  fungus: 'minigame.plant.instruction',
};

// Every game starts with "Tap to start" (T-277 · review B-60): the game, and its clock, only mount
// after the tap, so reading the instruction never costs time or input.
export default function CatchMinigame({
  category,
  ...props
}: MinigameProps & { category: SpeciesCategory }) {
  const [started, setStarted] = useState(false);
  const Game = BY_CATEGORY[category];
  if (started) return <Game {...props} />;
  const tr = createTranslator(props.locale ?? 'en');
  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>{tr(INSTRUCTION[category])}</Text>
      <Pressable style={styles.start} onPress={() => setStarted(true)} accessibilityRole="button">
        <Text style={styles.startText}>{tr('minigame.tapToStart')}</Text>
      </Pressable>
      {props.onCancel ? (
        <Pressable onPress={props.onCancel} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>{tr('minigame.cancel')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1f14', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  instruction: { fontSize: 18, lineHeight: 26, color: '#dbe7dc', textAlign: 'center', marginBottom: 40 },
  start: { paddingVertical: 22, paddingHorizontal: 56, borderRadius: 20, backgroundColor: '#3a7d44' },
  startText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  cancel: { position: 'absolute', bottom: 56 },
  cancelText: { fontSize: 14, color: '#7fa588' },
});
