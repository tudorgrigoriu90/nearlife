import { fireEvent, render, screen } from '@testing-library/react-native';
import MoveHomeScreen from './MoveHomeScreen';
import { createTranslator } from '../lib/i18n';

// T-349 · review F-09.
const tr = createTranslator('en');
const KRONOBERG = { id: 'SWE.9_1', name: 'Kronoberg' };
const STOCKHOLM = { id: 'SWE.1_1', name: 'Stockholm' };

describe('MoveHomeScreen', () => {
  it('confirms the new county and moves', async () => {
    const onConfirm = jest.fn(async () => ({ ok: true as const }));
    await render(
      <MoveHomeScreen locale="en" current={KRONOBERG} check={async () => ({ kind: 'move', region: STOCKHOLM })} onConfirm={onConfirm} onDone={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByText(tr('move.cta', { county: 'Stockholm' })));
    expect(onConfirm).toHaveBeenCalledWith(STOCKHOLM);
    expect(await screen.findByText(tr('move.done', { county: 'Stockholm' }))).toBeTruthy();
  });

  it('says when the next move is possible after the server refuses', async () => {
    await render(
      <MoveHomeScreen
        locale="en"
        current={KRONOBERG}
        check={async () => ({ kind: 'move', region: STOCKHOLM })}
        onConfirm={async () => ({ ok: false, nextDate: '2027-11-19' })}
        onDone={jest.fn()}
      />,
    );
    await fireEvent.press(await screen.findByText(tr('move.cta', { county: 'Stockholm' })));
    expect(await screen.findByText(tr('move.refused', { date: '2027-11-19' }))).toBeTruthy();
  });

  it('offers no move when the phone is still at home', async () => {
    await render(<MoveHomeScreen locale="en" current={KRONOBERG} check={async () => ({ kind: 'same', region: KRONOBERG })} onConfirm={jest.fn()} onDone={jest.fn()} />);
    expect(await screen.findByText(tr('move.same', { county: 'Kronoberg' }))).toBeTruthy();
    expect(screen.queryByText(tr('move.cta', { county: 'Kronoberg' }))).toBeNull();
  });
});
