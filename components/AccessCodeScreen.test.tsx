import { fireEvent, render, screen } from '@testing-library/react-native';
import AccessCodeScreen from './AccessCodeScreen';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

async function submit(code: string) {
  await fireEvent.changeText(screen.getByPlaceholderText(tr('access.placeholder')), code);
  await fireEvent.press(screen.getByText(tr('access.cta')));
}

// T-237: the screen Google Play reviewers use to unlock the paid content with their code.
describe('AccessCodeScreen', () => {
  it('unlocks, tells the reviewer, and refreshes what the account owns', async () => {
    const onUnlocked = jest.fn();
    await render(<AccessCodeScreen gateway={{ redeem: async () => true }} onUnlocked={onUnlocked} onDone={jest.fn()} />);
    await submit('NEARBY-ABCD-EFGH-JKMN');
    expect(await screen.findByText(tr('access.unlocked'))).toBeTruthy();
    expect(onUnlocked).toHaveBeenCalledTimes(1);
  });

  it('says so when the code is not accepted, and unlocks nothing', async () => {
    const onUnlocked = jest.fn();
    await render(<AccessCodeScreen gateway={{ redeem: async () => false }} onUnlocked={onUnlocked} onDone={jest.fn()} />);
    await submit('WRONG');
    expect(await screen.findByText(tr('access.invalid'))).toBeTruthy();
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('offers a retry when the server cannot be reached', async () => {
    const redeem = async () => {
      throw new Error('offline');
    };
    await render(<AccessCodeScreen gateway={{ redeem }} onUnlocked={jest.fn()} onDone={jest.fn()} />);
    await submit('CODE');
    expect(await screen.findByText(tr('access.failed'))).toBeTruthy();
  });

  it('closes with Done', async () => {
    const onDone = jest.fn();
    await render(<AccessCodeScreen gateway={{ redeem: async () => true }} onUnlocked={jest.fn()} onDone={onDone} />);
    await fireEvent.press(screen.getByText(tr('settings.done')));
    expect(onDone).toHaveBeenCalled();
  });
});
