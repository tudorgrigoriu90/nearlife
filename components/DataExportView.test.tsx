import { fireEvent, render, screen } from '@testing-library/react-native';
import DataExportView from './DataExportView';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

describe('DataExportView', () => {
  it('renders the export bundle as readable JSON (GDPR access, invariant #6)', async () => {
    await render(<DataExportView json={'{"hello":"world"}'} onDone={() => {}} />);
    expect(screen.getByText(tr('export.title'))).toBeTruthy();
    expect(screen.getByText(/"hello": ?"world"|\{"hello":"world"\}/)).toBeTruthy();
  });

  it('calls onDone when Done is pressed', async () => {
    const onDone = jest.fn();
    await render(<DataExportView json="{}" onDone={onDone} />);
    fireEvent.press(screen.getByText(tr('settings.done')));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

// T-280 · review I-20: the export can leave the phone as a file the user keeps.
describe('DataExportView sharing', () => {
  it('shares the export', async () => {
    const { Share } = jest.requireActual('react-native');
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await render(<DataExportView json='{"format":"nearby.export.v3"}' locale="en" onDone={() => {}} />);
    await fireEvent.press(screen.getByText(tr('export.share')));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ message: '{"format":"nearby.export.v3"}' }),
    );
  });
});
