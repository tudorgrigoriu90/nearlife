import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import FamilyScreen from './FamilyScreen';
import { createTranslator } from '../lib/i18n';
import type { FamilyGateway, Household } from '../lib/family';

const tr = createTranslator('en');

function gateway(over: Partial<FamilyGateway> = {}, household: Household | null = null): FamilyGateway {
  return {
    mine: jest.fn().mockResolvedValue(household),
    create: jest.fn().mockResolvedValue('ABCD2345'),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
}

const owner: Household = {
  role: 'owner',
  since: '2026-10-28T09:00:00Z',
  people: 2,
  active: true,
  inviteCode: 'ABCD2345',
  members: [{ id: 'm1', joinedAt: '2026-10-29T10:00:00Z' }],
};

describe('FamilyScreen', () => {
  it('offers join-with-code to someone in no family', async () => {
    const gw = gateway();
    const onChanged = jest.fn();
    await render(<FamilyScreen locale="en" gateway={gw} ownsFamily={false} onChanged={onChanged} />);
    await waitFor(() => expect(screen.getByText(tr('family.join.label'))).toBeTruthy());
    await fireEvent.changeText(screen.getByPlaceholderText(tr('family.join.placeholder')), 'abcd 2345');
    await fireEvent.press(screen.getByText(tr('family.join.cta')));
    await waitFor(() => expect(gw.join).toHaveBeenCalledWith('ABCD2345'));
    // Joining unlocks the Full Game, so the app must re-read what the user owns.
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('rejects a mistyped code without calling the server', async () => {
    const gw = gateway();
    await render(<FamilyScreen locale="en" gateway={gw} ownsFamily={false} />);
    await waitFor(() => expect(screen.getByText(tr('family.join.label'))).toBeTruthy());
    await fireEvent.changeText(screen.getByPlaceholderText(tr('family.join.placeholder')), 'abc');
    await fireEvent.press(screen.getByText(tr('family.join.cta')));
    expect(screen.getByText(tr('family.join.invalid'))).toBeTruthy();
    expect(gw.join).not.toHaveBeenCalled();
  });

  it('explains a full family in plain words', async () => {
    const gw = gateway({ join: jest.fn().mockRejectedValue(new Error('household_full')) });
    await render(<FamilyScreen locale="en" gateway={gw} ownsFamily={false} />);
    await waitFor(() => expect(screen.getByText(tr('family.join.label'))).toBeTruthy());
    await fireEvent.changeText(screen.getByPlaceholderText(tr('family.join.placeholder')), 'ABCD2345');
    await fireEvent.press(screen.getByText(tr('family.join.cta')));
    await waitFor(() => expect(screen.getByText(tr('family.error.full', { max: 5 }))).toBeTruthy());
  });

  it('lets a Family buyer start their family and shows the code', async () => {
    const gw = gateway();
    (gw.mine as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(owner);
    await render(<FamilyScreen locale="en" gateway={gw} ownsFamily />);
    await waitFor(() => expect(screen.getByText(tr('family.create.cta'))).toBeTruthy());
    await fireEvent.press(screen.getByText(tr('family.create.cta')));
    await waitFor(() => expect(screen.getByText('ABCD 2345')).toBeTruthy());
  });

  it('lets the owner share the code and remove a member', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const gw = gateway({}, owner);
    await render(<FamilyScreen locale="en" gateway={gw} ownsFamily />);
    await waitFor(() => expect(screen.getByText(tr('family.owner.people', { people: 2, max: 5 }))).toBeTruthy());
    await fireEvent.press(screen.getByText(tr('family.owner.share')));
    expect(share).toHaveBeenCalledWith({ message: tr('family.owner.shareMessage', { code: 'ABCD 2345' }) });
    await fireEvent.press(screen.getByText(tr('family.owner.remove')));
    await waitFor(() => expect(gw.remove).toHaveBeenCalledWith('m1'));
  });

  it('shows a member their status and lets them leave', async () => {
    const onChanged = jest.fn();
    const gw = gateway({}, { role: 'member', since: null, people: 3, active: true, inviteCode: null, members: [] });
    await render(<FamilyScreen locale="en" gateway={gw} ownsFamily={false} onChanged={onChanged} />);
    await waitFor(() =>
      expect(screen.getByText(tr('family.member.status', { people: 3, max: 5 }))).toBeTruthy(),
    );
    expect(screen.queryByText('ABCD 2345')).toBeNull();
    await fireEvent.press(screen.getByText(tr('family.member.leave')));
    await waitFor(() => expect(gw.leave).toHaveBeenCalled());
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('says so plainly when the family purchase has ended', async () => {
    const gw = gateway({}, { role: 'member', since: null, people: 2, active: false, inviteCode: null, members: [] });
    await render(<FamilyScreen locale="en" gateway={gw} ownsFamily={false} />);
    await waitFor(() => expect(screen.getByText(tr('family.inactive'))).toBeTruthy());
  });
});
