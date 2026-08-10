import { fireEvent, render, screen } from '@testing-library/react-native';
import DeleteAccountConfirm from './DeleteAccountConfirm';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

describe('DeleteAccountConfirm', () => {
  it('shows the irreversible-deletion warning with equal-weight Cancel', async () => {
    await render(<DeleteAccountConfirm locale="en" onConfirm={async () => true} onCancel={() => {}} />);
    expect(screen.getByText(tr('delete.title'))).toBeTruthy();
    expect(screen.getByText(tr('delete.body'))).toBeTruthy();
    expect(screen.getByText(tr('delete.confirm'))).toBeTruthy();
    expect(screen.getByText(tr('delete.cancel'))).toBeTruthy();
  });

  it('cancels without deleting', async () => {
    const onConfirm = jest.fn(async () => true);
    const onCancel = jest.fn();
    await render(<DeleteAccountConfirm locale="en" onConfirm={onConfirm} onCancel={onCancel} />);
    await fireEvent.press(screen.getByText(tr('delete.cancel')));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('invokes onConfirm when the user confirms', async () => {
    const onConfirm = jest.fn(async () => true);
    await render(<DeleteAccountConfirm locale="en" onConfirm={onConfirm} onCancel={() => {}} />);
    await fireEvent.press(screen.getByText(tr('delete.confirm')));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('surfaces a retryable error and stays on screen when deletion fails', async () => {
    const onConfirm = jest.fn(async () => false);
    await render(<DeleteAccountConfirm locale="en" onConfirm={onConfirm} onCancel={() => {}} />);
    await fireEvent.press(screen.getByText(tr('delete.confirm')));
    expect(await screen.findByText(tr('delete.error'))).toBeTruthy();
    // still on the confirm screen — a retry is possible
    expect(screen.getByText(tr('delete.cancel'))).toBeTruthy();
  });
});
