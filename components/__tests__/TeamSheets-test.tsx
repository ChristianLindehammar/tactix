import * as React from 'react';
import { Alert, Modal } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddPlayersSheet } from '../team/AddPlayersSheet';
import { TeamActionsSheet } from '../team/TeamActionsSheet';
import { TeamSwitcherSheet } from '../team/TeamSwitcherSheet';
import { TeamContext } from '@/context/TeamContext';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const player = (id: string, name: string) => ({ id, name, position: 'PG', courtPosition: { x: 0, y: 0 } });

const makeTeam = (id: string, name: string, extra: object = {}) => ({
  id,
  name,
  sport: 'basketball',
  startingPlayers: [player(`${id}-1`, 'Maja')],
  benchPlayers: [player(`${id}-2`, 'Leo')],
  ...extra,
});

const renderSheet = (Sheet: React.ComponentType<{ visible: boolean; onClose: () => void }>, overrides: object = {}) => {
  const teams = [makeTeam('a', 'F12 Basket', { shared: { id: 's1', role: 'editor' } }), makeTeam('b', 'P14 Basket')];
  const value = {
    team: teams[0],
    teams,
    selectTeam: jest.fn(),
    createTeam: jest.fn(),
    importTeamFromFile: jest.fn(),
    renameTeam: jest.fn(),
    exportTeam: jest.fn(),
    removeTeam: jest.fn(),
    stopSharing: jest.fn().mockResolvedValue(undefined),
    leaveTeam: jest.fn().mockResolvedValue(undefined),
    addPlayers: jest.fn(),
    ...overrides,
  };
  const Harness = () => {
    const [open, setOpen] = React.useState(true);
    return (
      <SafeAreaProvider initialMetrics={metrics}>
        <TeamContext.Provider value={value as any}>
          <Sheet visible={open} onClose={() => setOpen(false)} />
        </TeamContext.Provider>
      </SafeAreaProvider>
    );
  };
  render(<Harness />);
  return value;
};

/** iOS tells the sheet it is gone through the modal's onDismiss. */
const finishClosing = () => act(() => screen.UNSAFE_getByType(Modal).props.onDismiss());

describe('TeamSwitcherSheet', () => {
  it('marks the open team and switches to the one picked', () => {
    const { selectTeam } = renderSheet(TeamSwitcherSheet);

    expect(screen.getByRole('button', { name: /F12 Basket/, selected: true })).toBeTruthy();
    expect(screen.getByText('2 players · Shared with other coaches')).toBeTruthy();
    fireEvent.press(screen.getByText('P14 Basket'));

    expect(selectTeam).toHaveBeenCalledWith('b');
    expect(screen.queryByText('P14 Basket')).toBeNull();
  });

  it('creates a team from the name typed in the sheet', () => {
    const { createTeam } = renderSheet(TeamSwitcherSheet);

    fireEvent.press(screen.getByText('New team'));
    fireEvent.changeText(screen.getByLabelText('Team name'), '  U13  ');
    fireEvent.press(screen.getByText('Create Team'));

    expect(createTeam).toHaveBeenCalledWith('U13');
  });

  it('opens Join a team only once the sheet has closed', () => {
    renderSheet(TeamSwitcherSheet);

    fireEvent.press(screen.getByText('Join with a code'));
    expect(router.push).not.toHaveBeenCalled();
    finishClosing();

    expect(router.push).toHaveBeenCalledWith('/join');
  });
});

describe('TeamActionsSheet', () => {
  it('sends a copy once the sheet has closed', () => {
    const { exportTeam } = renderSheet(TeamActionsSheet);

    fireEvent.press(screen.getByText('Send a copy'));
    finishClosing();

    expect(exportTeam).toHaveBeenCalledWith('a');
  });

  it('leaves a shared team before removing it from the device', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { leaveTeam, removeTeam } = renderSheet(TeamActionsSheet);

    expect(screen.getByText('You leave the team. The other coaches keep working on it.')).toBeTruthy();
    fireEvent.press(screen.getByText('Remove Team'));
    const confirm = alert.mock.calls[0][2]!.find(button => button.style === 'destructive')!;
    await act(async () => confirm.onPress!());

    expect(leaveTeam).toHaveBeenCalledWith('a');
    expect(removeTeam).toHaveBeenCalledWith('a');
  });

  it('keeps a shared team when leaving it fails', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { removeTeam } = renderSheet(TeamActionsSheet, { leaveTeam: jest.fn().mockRejectedValue(new Error('offline')) });

    fireEvent.press(screen.getByText('Remove Team'));
    const confirm = alert.mock.calls[0][2]!.find(button => button.style === 'destructive')!;
    await act(async () => confirm.onPress!());

    expect(removeTeam).not.toHaveBeenCalled();
  });

  it('renames the open team', () => {
    const { renameTeam } = renderSheet(TeamActionsSheet);

    fireEvent.press(screen.getByText('Rename Team'));
    fireEvent.changeText(screen.getByLabelText('Team name'), 'F13 Basket');
    fireEvent.press(screen.getByText('Save'));

    expect(renameTeam).toHaveBeenCalledWith('a', 'F13 Basket');
  });
});

describe('AddPlayersSheet', () => {
  it('stays open after adding one player, ready for the next', () => {
    const { addPlayers } = renderSheet(AddPlayersSheet);

    fireEvent.changeText(screen.getByLabelText('Name'), 'Alva');
    fireEvent.press(screen.getByText('Add Player'));

    expect(addPlayers).toHaveBeenCalledWith([{ name: 'Alva', number: undefined }]);
    expect(screen.getByLabelText('Name').props.value).toBe('');
    expect(screen.getByText('Added Alva. Add the next one, or close.')).toBeTruthy();
  });

  it('adds every player in a pasted list and closes', () => {
    const { addPlayers } = renderSheet(AddPlayersSheet);

    fireEvent.press(screen.getByText('Paste a list'));
    fireEvent.changeText(screen.getByLabelText('One player per line'), '7 Alva\nNoah');
    fireEvent.press(screen.getByText('Add 2 players'));

    expect(addPlayers).toHaveBeenCalledWith([
      { name: 'Alva', number: 7 },
      { name: 'Noah', number: undefined },
    ]);
    expect(screen.queryByText('Paste a list')).toBeNull();
  });
});
