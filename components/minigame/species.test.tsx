import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import type { Species } from '../../lib/species/types';
import CatchMinigame from './CatchMinigame';
import FrameMinigame from './FrameMinigame';

// T-321 · review B-61: the catch shows the species being caught, and the plant game's subject
// moves between species and days.

const tr = createTranslator('en');
const frog: Species = {
  id: 'gbif:2426661',
  scientificName: 'Rana temporaria',
  commonName: 'Common frog',
  category: 'mammal', // amphibians use the mammal game
  group: 'amphibian',
  rarity: 'common',
  activeMonths: [5],
};

describe('a catch shows its species', () => {
  it('names the species and shows its glyph, before and during the game', async () => {
    await render(<CatchMinigame category="mammal" species={frog} onComplete={() => {}} />);
    expect(screen.getByText(/Common frog/)).toBeTruthy();
    expect(screen.getAllByText(/🐸/).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByText(tr('minigame.tapToStart')));
    expect(screen.getAllByText(/🐸/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/🦊/)).toBeNull();
  });
});

describe('the plant game layout', () => {
  async function subjectAt(seed: number) {
    const view = await render(<FrameMinigame glyph="🌼" seed={seed} onComplete={() => {}} />);
    const style = StyleSheet.flatten(screen.getByText('🌼').props.style);
    await view.unmount();
    return `${style.left},${style.top}`;
  }

  it('two seeds can place the subject differently', async () => {
    const places = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) places.add(await subjectAt(seed));
    expect(places.size).toBeGreaterThan(1);
  });
});
