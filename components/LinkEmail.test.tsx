import { fireEvent, render, screen } from '@testing-library/react-native';
import LinkEmail from './LinkEmail';
import type { AuthGateway, AuthIdentity } from '../lib/accountLinking';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');
const placeholder = tr('link.placeholder');
const ctaLabel = tr('link.cta');

function fakeGateway(identity: AuthIdentity | null = { userId: 'u1', email: null, isAnonymous: true }) {
  const calls: string[] = [];
  const gateway: AuthGateway = {
    currentIdentity: async () => identity,
    updateEmail: async (email: string) => {
      calls.push(email);
    },
  };
  return { gateway, calls };
}

describe('LinkEmail', () => {
  it('shows the link form for an anonymous (email-less) account', async () => {
    const { gateway } = fakeGateway();
    await render(<LinkEmail locale="en" gateway={gateway} onDone={() => {}} />);
    expect(screen.getByText(tr('link.title'))).toBeTruthy();
    expect(await screen.findByPlaceholderText(placeholder)).toBeTruthy();
  });

  it('rejects an invalid email without calling the gateway', async () => {
    const { gateway, calls } = fakeGateway();
    await render(<LinkEmail locale="en" gateway={gateway} onDone={() => {}} />);
    await fireEvent.changeText(await screen.findByPlaceholderText(placeholder), 'not-an-email');
    await fireEvent.press(screen.getByText(ctaLabel));
    expect(await screen.findByText(tr('link.error.invalid'))).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('links a valid email and confirms a confirmation was sent', async () => {
    const { gateway, calls } = fakeGateway();
    await render(<LinkEmail locale="en" gateway={gateway} onDone={() => {}} />);
    await fireEvent.changeText(await screen.findByPlaceholderText(placeholder), 'Me@Example.com');
    await fireEvent.press(screen.getByText(ctaLabel));
    // Normalized (trim + lowercase) before the gateway call.
    expect(calls).toEqual(['me@example.com']);
    expect(await screen.findByText(tr('link.sent', { email: 'me@example.com' }))).toBeTruthy();
  });

  it('shows the already-linked state when the account has a confirmed email', async () => {
    const { gateway } = fakeGateway({ userId: 'u1', email: 'saved@example.com', isAnonymous: false });
    await render(<LinkEmail locale="en" gateway={gateway} onDone={() => {}} />);
    expect(await screen.findByText(tr('link.current', { email: 'saved@example.com' }))).toBeTruthy();
    // No input offered once linked.
    expect(screen.queryByPlaceholderText(placeholder)).toBeNull();
  });

  it('closes via Done', async () => {
    const onDone = jest.fn();
    const { gateway } = fakeGateway();
    await render(<LinkEmail locale="en" gateway={gateway} onDone={onDone} />);
    await fireEvent.press(screen.getByText(tr('settings.done')));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
