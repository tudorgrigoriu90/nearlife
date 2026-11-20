import { useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type TranslationKey } from '../../lib/i18n';
import { type Species, type SpeciesCategory } from '../../lib/species/types';
import { groupOf } from '../../lib/species/group';
import { commonNameFor } from '../../lib/species/localized';
import { catchSeed } from '../../lib/minigame/frame';
import { CATEGORY_EMOJI } from '../speciesVisual';
import { type MinigameProps } from './types';
import TimingRingMinigame from './TimingRingMinigame';
import FishReelMinigame from './FishReelMinigame';
import TraceMinigame from './TraceMinigame';
import StealthMinigame from './StealthMinigame';
import FrameMinigame from './FrameMinigame';
import { E2E_BUILD } from '../../lib/e2e';

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
  species,
  e2eWin = E2E_BUILD,
  ...props
}: MinigameProps & {
  category: SpeciesCategory;
  /** End-to-end builds only (T-367): a button that wins the game outright, for scripted flows. */
  e2eWin?: boolean;
  /** The species being caught (T-321 · review B-61): named, and its glyph is the game's creature. */
  species?: Species;
}) {
  const [started, setStarted] = useState(false);
  // A retry is a fresh round of the same game, already started (T-311 · review B-45): a miss costs
  // nothing, so it is replayed here rather than through the catch-spot screen and a new fix.
  const [round, setRound] = useState(0);
  const Game = BY_CATEGORY[category];
  const glyph = species ? CATEGORY_EMOJI[groupOf(species)] : undefined;
  const seed = species ? catchSeed(species.id, new Date().toISOString().slice(0, 10)) + round : undefined;
  if (started) {
    const game = (
      <Game
        key={round}
        glyph={glyph}
        seed={seed}
        {...props}
        onRetry={() => setRound((n) => n + 1)}
      />
    );
    if (!e2eWin) return game;
    return (
      <View style={styles.e2eWrap}>
        {game}
        <Pressable
          testID="e2e-win"
          style={styles.e2eWin}
          onPress={() => props.onComplete({ success: true, score: 1 })}
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Win (test build)</Text>
        </Pressable>
      </View>
    );
  }
  const tr = createTranslator(props.locale ?? 'en');
  return (
    <View style={styles.container}>
      {species ? (
        <Text style={styles.species}>
          {glyph} {commonNameFor(species, props.locale ?? 'en')}
        </Text>
      ) : null}
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
  species: { fontSize: 20, fontWeight: '700', color: '#dbe7dc', marginBottom: 16, textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#0e1f14', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  instruction: { fontSize: 18, lineHeight: 26, color: '#dbe7dc', textAlign: 'center', marginBottom: 40 },
  start: { paddingVertical: 22, paddingHorizontal: 56, borderRadius: 20, backgroundColor: '#3a7d44' },
  startText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  cancel: { position: 'absolute', bottom: 56 },
  cancelText: { fontSize: 14, color: '#7fa588' },
  e2eWrap: { flex: 1 },
  e2eWin: { position: 'absolute', top: 40, right: 16, padding: 12, backgroundColor: '#1c3a28' },
});
