import { fireEvent, render, screen } from '@testing-library/react-native';
import { createTranslator } from '../lib/i18n';
import type { ContentReport, ReportOutcome } from '../lib/contentReports';
import ReportMistakeSheet from './ReportMistakeSheet';

// T-293 · review I-32: a short form — what is wrong, an optional comment — then a plain answer.

const tr = createTranslator('en');

function setup(outcome: ReportOutcome = 'sent') {
  const sent: Omit<ContentReport, 'locale' | 'speciesId'>[] = [];
  const onClose = jest.fn();
  const onSend = jest.fn(async (kind: ContentReport['kind'], comment: string) => {
    sent.push({ kind, comment });
    return outcome;
  });
  return { sent, onClose, onSend };
}

describe('ReportMistakeSheet', () => {
  it('names the species and offers the five kinds of mistake', async () => {
    const s = setup();
    await render(<ReportMistakeSheet speciesName="Moose" onSend={s.onSend} onClose={s.onClose} />);
    expect(screen.getByText(tr('report.title', { name: 'Moose' }))).toBeTruthy();
    for (const kind of ['name', 'photo', 'text', 'season', 'other']) {
      expect(screen.getByText(tr(`report.kind.${kind}` as 'report.kind.name'))).toBeTruthy();
    }
  });

  it('cannot be sent until a kind is chosen', async () => {
    const s = setup();
    await render(<ReportMistakeSheet speciesName="Moose" onSend={s.onSend} onClose={s.onClose} />);
    await fireEvent.press(screen.getByText(tr('report.send')));
    expect(s.onSend).not.toHaveBeenCalled();
  });

  it('sends the chosen kind and comment, then thanks the user', async () => {
    const s = setup('sent');
    await render(<ReportMistakeSheet speciesName="Moose" onSend={s.onSend} onClose={s.onClose} />);
    await fireEvent.press(screen.getByText(tr('report.kind.photo')));
    await fireEvent.changeText(screen.getByPlaceholderText(tr('report.comment')), 'That is a hare.');
    await fireEvent.press(screen.getByText(tr('report.send')));
    expect(s.sent).toEqual([{ kind: 'photo', comment: 'That is a hare.' }]);
    expect(screen.getByText(tr('report.sent'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('report.close')));
    expect(s.onClose).toHaveBeenCalled();
  });

  it('says when the daily limit is reached', async () => {
    const s = setup('too-many');
    await render(<ReportMistakeSheet speciesName="Moose" onSend={s.onSend} onClose={s.onClose} />);
    await fireEvent.press(screen.getByText(tr('report.kind.name')));
    await fireEvent.press(screen.getByText(tr('report.send')));
    expect(screen.getByText(tr('report.tooMany'))).toBeTruthy();
  });

  it('keeps the form after a failure so it can be sent again', async () => {
    const s = setup('failed');
    await render(<ReportMistakeSheet speciesName="Moose" onSend={s.onSend} onClose={s.onClose} />);
    await fireEvent.press(screen.getByText(tr('report.kind.text')));
    await fireEvent.press(screen.getByText(tr('report.send')));
    expect(screen.getByText(tr('report.failed'))).toBeTruthy();
    expect(screen.getByText(tr('report.send'))).toBeTruthy();
  });

  it('can be closed without sending', async () => {
    const s = setup();
    await render(<ReportMistakeSheet speciesName="Moose" onSend={s.onSend} onClose={s.onClose} />);
    await fireEvent.press(screen.getByText(tr('report.cancel')));
    expect(s.onClose).toHaveBeenCalled();
    expect(s.onSend).not.toHaveBeenCalled();
  });
});
