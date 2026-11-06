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
    onRecognized: jest.fn(),
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
    expect(props.onRecognized).toHaveBeenCalledWith('moose');
    expect(saved.at(-1)).toEqual({ moose: '2026-11-05' });
  });

  it('praises a right pick for a species already in the almanac', async () => {
    const { props } = setup({ records: [spottedMoose] });
    await render(<SightingQuizScreen {...props} />);
    await name('Älg');
    await fireEvent.press(screen.getByTestId('quiz-option-moose'));
    expect(await screen.findByText(tr('quiz.praise.mammal'))).toBeTruthy();
    expect(props.onSpotted).not.toHaveBeenCalled();
    expect(props.onRecognized).toHaveBeenCalledWith('moose'); // praise counts towards the badges
  });

  it('shows the right photo after a wrong pick and spots nothing', async () => {
    const { props } = setup();
    await render(<SightingQuizScreen {...props} />);
    await name('älg');
    await fireEvent.press(screen.getByTestId('quiz-option-roe'));
    expect(await screen.findByText(tr('quiz.wrong', { name: 'Älg' }))).toBeTruthy();
    expect(screen.getByTestId('quiz-answer-photo')).toBeTruthy();
    expect(props.onSpotted).not.toHaveBeenCalled();
    expect(props.onRecognized).not.toHaveBeenCalled();
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

// T-247: guess the bird by its song.
describe('SightingQuizScreen song quiz', () => {
  const asBird = (s: Species): Species => ({ ...s, category: 'bird' });
  const birds = [
    asBird(sp('tit', 'Parus major', 'Great Tit', 'Talgoxe')),
    asBird(sp('blue', 'Cyanistes caeruleus', 'Blue Tit', 'Blåmes')),
    asBird(sp('robin', 'Erithacus rubecula', 'Robin', 'Rödhake')),
    asBird(sp('finch', 'Fringilla coelebs', 'Chaffinch', 'Bofink')),
  ];
  const soundSource = (withSound: string[]) => ({
    withSound: jest.fn(
      async (ids: string[]) => new Set(ids.filter((id) => withSound.includes(id))),
    ),
    soundFor: jest.fn(async (id: string) => ({
      speciesId: id,
      url: `https://x/${id}.m4a`,
      license: 'CC-BY' as const,
      author: 'E. A.',
      sourceUrl: `https://www.inaturalist.org/observations/${id}`,
    })),
  });
  const songEntry = `🐦 ${tr('quiz.songEntry')}`;

  async function playRound(source: ReturnType<typeof soundSource>) {
    const { props } = setup();
    await render(
      <SightingQuizScreen {...props} pool={[...pool, ...birds]} soundSource={source} fullGame />,
    );
    await fireEvent.press(await screen.findByText(songEntry));
    expect(await screen.findByText(tr('quiz.songQuestion'))).toBeTruthy();
    const target = source.soundFor.mock.calls[0][0];
    return { props, target };
  }

  it('is offered only when the county has birds with recordings', async () => {
    const { props } = setup();
    await render(
      <SightingQuizScreen
        {...props}
        pool={[...pool, ...birds]}
        soundSource={soundSource([])}
        fullGame
      />,
    );
    await screen.findByText(tr('quiz.next'));
    expect(screen.queryByText(songEntry)).toBeNull();
  });

  it('plays a bird and shows four bird photos; a right pick is recognised, not spotted', async () => {
    const source = soundSource(['tit', 'blue', 'robin', 'finch']);
    const { props, target } = await playRound(source);
    const options = screen.getAllByTestId(/^quiz-option-/).map((o) => o.props.testID);
    expect(options.sort()).toEqual([
      'quiz-option-blue',
      'quiz-option-finch',
      'quiz-option-robin',
      'quiz-option-tit',
    ]);
    expect(screen.getByText(`🐦 ${tr('card.song')}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`quiz-option-${target}`));
    const bird = birds.find((b) => b.id === target)!;
    expect(screen.getByText(tr('quiz.songRight', { name: bird.names!.sv! }))).toBeTruthy();
    expect(props.onRecognized).toHaveBeenCalledWith(target);
    expect(props.onSpotted).not.toHaveBeenCalled();
  });

  it('a wrong pick names the bird, and the next round plays another', async () => {
    const source = soundSource(['tit', 'blue', 'robin', 'finch']);
    const { props, target } = await playRound(source);
    const wrong = birds.find((b) => b.id !== target)!;
    await fireEvent.press(screen.getByTestId(`quiz-option-${wrong.id}`));
    const bird = birds.find((b) => b.id === target)!;
    expect(screen.getByText(tr('quiz.songWrong', { name: bird.names!.sv! }))).toBeTruthy();
    expect(props.onRecognized).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(`🐦 ${tr('quiz.songNext')}`));
    expect(await screen.findByText(tr('quiz.songQuestion'))).toBeTruthy();
    expect(source.soundFor.mock.calls[1][0]).not.toBe(target);
  });

  it('is not offered without the Full Game (T-249)', async () => {
    const { props } = setup();
    const source = soundSource(['tit', 'blue', 'robin', 'finch']);
    await render(<SightingQuizScreen {...props} pool={[...pool, ...birds]} soundSource={source} />);
    await screen.findByText(tr('quiz.next'));
    expect(screen.queryByText(songEntry)).toBeNull();
    expect(source.withSound).not.toHaveBeenCalled();
  });
});
