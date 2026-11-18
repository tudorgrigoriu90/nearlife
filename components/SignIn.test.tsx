import { fireEvent, render, screen } from '@testing-library/react-native';
import SignIn from './SignIn';
import { createTranslator } from '../lib/i18n';
import type { SignInGateway } from '../lib/accountSignIn';

const tr = createTranslator('en');

function gateway(verify: SignInGateway['verifyCode']): SignInGateway {
  return { sendCode: jest.fn(async () => undefined), verifyCode: jest.fn(verify) };
}

// T-271 · review B-07.
describe('SignIn', () => {
  it('sends a code, then signs in with it', async () => {
    const onSignedIn = jest.fn();
    const gw = gateway(async () => 'user-7');
    await render(<SignIn gateway={gw} onSignedIn={onSignedIn} onCancel={() => {}} />);
    await fireEvent.changeText(screen.getByPlaceholderText(tr('link.placeholder')), 'a@b.se');
    await fireEvent.press(screen.getByText(tr('signin.send')));
    expect(await screen.findByText(tr('signin.codeSent', { email: 'a@b.se' }))).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(tr('signin.codePlaceholder')), '123456');
    await fireEvent.press(screen.getByRole('button', { name: tr('signin.verify') }));
    expect(onSignedIn).toHaveBeenCalledWith('user-7');
  });

  it('a wrong code shows a message and does not sign in', async () => {
    const onSignedIn = jest.fn();
    const gw = gateway(async () => {
      throw new Error('expired');
    });
    await render(<SignIn gateway={gw} onSignedIn={onSignedIn} onCancel={() => {}} />);
    await fireEvent.changeText(screen.getByPlaceholderText(tr('link.placeholder')), 'a@b.se');
    await fireEvent.press(screen.getByText(tr('signin.send')));
    await fireEvent.changeText(
      await screen.findByPlaceholderText(tr('signin.codePlaceholder')),
      '123456',
    );
    await fireEvent.press(screen.getByRole('button', { name: tr('signin.verify') }));
    expect(await screen.findByText(tr('signin.error.code'))).toBeTruthy();
    expect(onSignedIn).not.toHaveBeenCalled();
  });
});
