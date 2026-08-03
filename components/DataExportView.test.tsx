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
