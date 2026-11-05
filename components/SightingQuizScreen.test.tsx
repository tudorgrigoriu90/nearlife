import { fireEvent, render, screen } from '@testing-library/react-native';
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import SightingQuizScreen from './SightingQuizScreen';
import { createTranslator } from '../lib/i18n';
import type { QuizAttempts } from '../lib/sightingQuiz';
import type { CollectionRecord } from '../lib/collection';
import type { Species } from '../lib/species/types';

const tr = createTranslator('sv');
const photo = (id: string) => ({
  speciesId: id,
  url: `https://x/${id}.jpg`,
  sourceUrl: 's',
  license: 'CC-BY' as const,
  author: 'a',
  isPrimary: true,
});
const sp = (id: string, sci: string, en: string, sv: string): Species =>
  ({
    id,
    scientificName: sci,
    commonName: en,
    category: 'mammal',
    rarity: 'common',
    activeMonths: [5],
    names: { sv },
    photo: photo(id),
  }) as Species;
const moose = sp('moose', 'Alces alces', 'Moose', 'Älg');
const pool = [
  moose,
  sp('roe', 'Capreolus capreolus', 'Roe Deer', 'Rådjur'),
  sp('red', 'Cervus elaphus', 'Red Deer', 'Kronhjort'),
  sp('fallow', 'Dama dama', 'Fallow Deer', 'Dovhjort'),
];
const spottedMoose: CollectionRecord = {
  speciesId: 'moose',
  spottedAt: '2026-05-01T00:00:00Z',
  caughtAt: null,
  helpedAt: null,
  helpedKind: null,
  primeBonus: false,
};

function setup(over: { records?: CollectionRecord[]; attempts?: QuizAttempts } = {}) {
  const saved: QuizAttempts[] = [];
  const props = {
    locale: 'sv' as const,
    pool,
    records: over.records ?? [],
    month: 5 as const,
    today: '2026-11-05',
    attemptStore: {
      load: async () => over.attempts ?? {},
      save: async (a: QuizAttempts) => void saved.push(a),
    },
    onSpotted: jest.fn(),
    onDone: jest.fn(),
  };
  return { props, saved };
}

async function name(text: string) {
  await fireEvent.changeText(screen.getByPlaceholderText(tr('quiz.placeholder')), text);
  await fireEvent.press(screen.getByText(tr('quiz.next')));
}

// T-242: the "I saw…" screens on top of the T-241 logic.
describe('SightingQuizScreen', () => {
  it('asks for the exact name when nothing is called that', async () => {
    const { props } = setup();
    await render(<SightingQuizScreen {...props} />);
    await name('fågel');
    expect(screen.getByText(tr('quiz.noMatch', { name: 'fågel' }))).toBeTruthy();
  });

  it('shows four photos without names, and a right pick spots the species', async () => {
    const { props, saved } = setup();
    await render(<SightingQuizScreen {...props} />);
    await name('älg');
    expect(screen.getByText(tr('quiz.question'))).toBeTruthy();
    expect(screen.getAllByTestId(/^quiz-option-/)).toHaveLength(4);
    expect(screen.queryByText('Rådjur')).toBeNull(); // the choices carry no names
    await fireEvent.press(screen.getByTestId('quiz-option-moose'));
    expect(await screen.findByText(tr('quiz.added', { name: 'Älg' }))).toBeTruthy();
    expect(props.onSpotted).toHaveBeenCalledWith('moose');
    expect(saved.at(-1)).toEqual({ moose: '2026-11-05' });
  });

  it('praises a right pick for a species already in the almanac', async () => {
    const { props } = setup({ records: [spottedMoose] });
    await render(<SightingQuizScreen {...props} />);
    await name('Älg');
    await fireEvent.press(screen.getByTestId('quiz-option-moose'));
    expect(await screen.findByText(tr('quiz.praise.mammal'))).toBeTruthy();
    expect(props.onSpotted).not.toHaveBeenCalled();
  });

  it('shows the right photo after a wrong pick and spots nothing', async () => {
    const { props } = setup();
    await render(<SightingQuizScreen {...props} />);
    await name('älg');
    await fireEvent.press(screen.getByTestId('quiz-option-roe'));
    expect(await screen.findByText(tr('quiz.wrong', { name: 'Älg' }))).toBeTruthy();
    expect(screen.getByTestId('quiz-answer-photo')).toBeTruthy();
    expect(props.onSpotted).not.toHaveBeenCalled();
  });

  it('allows one try per species per day', async () => {
    const { props } = setup({ attempts: { moose: '2026-11-05' } });
    await render(<SightingQuizScreen {...props} />);
    await name('älg');
    expect(screen.getByText(tr('quiz.tomorrow', { name: 'Älg' }))).toBeTruthy();
    expect(screen.queryByText(tr('quiz.question'))).toBeNull();
  });

  it('closes with Done', async () => {
    const { props } = setup();
    await render(<SightingQuizScreen {...props} />);
    await fireEvent.press(screen.getByText(tr('settings.done')));
    expect(props.onDone).toHaveBeenCalled();
  });
});
