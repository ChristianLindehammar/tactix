import * as React from 'react';
import { Alert, Modal } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LineupBar } from '../team/LineupBar';
import { PlayerSheet } from '../team/PlayerSheet';
import { RosterList } from '../team/RosterList';
import { ViewSwitch } from '../team/ViewSwitch';
import { TeamContext } from '@/context/TeamContext';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-router/js-tabs', () => ({ useBottomTabBarHeight: () => 0 }));
jest.mock('@/context/SportContext', () => ({ useSport: () => ({ selectedSport: 'basketball' }) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const player = (id: string, name: string, position: string) => ({ id, name, position, courtPosition: { x: 0.5, y: 0.5 } });

const makeTeam = () => ({
    id: 'a',
    name: 'F12 Basket',
    sport: 'basketball',
    startingPlayers: [player('maja', 'Maja', 'Center')],
    benchPlayers: [{ ...player('leo', 'Leo', 'PointGuard'), courtPosition: undefined }],
    configurations: [
      { id: 'zon', name: 'Zon', playerPositions: {} },
      { id: 'press', name: 'Press', playerPositions: {} },
    ],
    selectedConfigurationId: 'zon',
});

const renderWithTeam = (ui: React.ReactElement, overrides: object = {}) => {
  const team = makeTeam();
  const value = {
    team,
    teams: [team],
    selectConfiguration: jest.fn(),
    createConfiguration: jest.fn(),
    renameConfiguration: jest.fn(),
    deleteConfiguration: jest.fn(),
    setPlayerType: jest.fn(),
    movePlayerToBench: jest.fn(),
    movePlayerToCourt: jest.fn(),
    renamePlayer: jest.fn(),
    deletePlayer: jest.fn(),
    ...overrides,
  };
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <TeamContext.Provider value={value as any}>{ui}</TeamContext.Provider>
    </SafeAreaProvider>,
  );
  return value;
};

afterEach(() => jest.restoreAllMocks());

const confirmAlert = async (alert: jest.SpyInstance) => {
  const confirm = alert.mock.lastCall[2]!.find((button: { style?: string }) => button.style === 'destructive')!;
  await act(async () => confirm.onPress!());
};

describe('LineupBar', () => {
  it('marks the open line-up and switches to the one tapped', () => {
    const { selectConfiguration } = renderWithTeam(<LineupBar />);

    expect(screen.getByRole('button', { name: 'Zon', selected: true })).toBeTruthy();
    fireEvent.press(screen.getByText('Press'));

    expect(selectConfiguration).toHaveBeenCalledWith('press');
  });

  it('creates a line-up from the name typed in the sheet', () => {
    const { createConfiguration } = renderWithTeam(<LineupBar />);

    fireEvent.press(screen.getByLabelText('New line-up'));
    expect(screen.getByText('Starts as a copy of Zon.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Line-up name'), ' Box ');
    fireEvent.press(screen.getByText('Create'));

    expect(createConfiguration).toHaveBeenCalledWith('Box');
  });

  it('renames the open line-up from its menu', () => {
    const { renameConfiguration } = renderWithTeam(<LineupBar />);

    fireEvent.press(screen.getByLabelText('Line-up options for Zon'));
    fireEvent.press(screen.getByText('Rename line-up'));
    fireEvent.changeText(screen.getByLabelText('Line-up name'), 'Zone');
    fireEvent.press(screen.getByText('Save'));

    expect(renameConfiguration).toHaveBeenCalledWith('zon', 'Zone');
  });

  it('deletes the open line-up after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { deleteConfiguration } = renderWithTeam(<LineupBar />);

    fireEvent.press(screen.getByLabelText('Line-up options for Zon'));
    fireEvent.press(screen.getByText('Delete line-up'));
    await confirmAlert(alert);

    expect(deleteConfiguration).toHaveBeenCalledWith('zon');
  });
});

describe('PlayerSheet', () => {
  const renderSheet = (playerId: string, overrides: object = {}) =>
    renderWithTeam(<PlayerSheet playerId={playerId} visible onClose={() => {}} />, overrides);

  it('changes the position of a player', () => {
    const { setPlayerType } = renderSheet('maja');

    expect(screen.getByText('On court in Zon')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'C', selected: true })).toBeTruthy();
    fireEvent.press(screen.getByText('PF'));

    expect(setPlayerType).toHaveBeenCalledWith('maja', 'PowerForward');
  });

  it('moves a court player to the bench and a bench player onto the court', () => {
    const { movePlayerToBench, movePlayerToCourt } = renderSheet('maja');
    fireEvent.press(screen.getByText('Move to bench'));
    expect(movePlayerToBench).toHaveBeenCalledWith('maja');

    screen.unmount();
    const bench = renderSheet('leo');
    expect(screen.getByText('On the bench in Zon')).toBeTruthy();
    fireEvent.press(screen.getByText('Put on court'));
    // Maja stands on the centre spot, so Leo goes right next to her
    expect(bench.movePlayerToCourt).toHaveBeenCalledWith('leo', { x: 0.38, y: 0.38 });
    expect(movePlayerToCourt).not.toHaveBeenCalled();
  });

  it('shows a position the sport no longer has as its first one', () => {
    renderSheet('maja', { team: { ...makeTeam(), startingPlayers: [player('maja', 'Maja', 'Guard')] } });

    expect(screen.getByRole('radio', { name: 'PG', selected: true })).toBeTruthy();
  });

  it('renames a player', () => {
    const { renamePlayer } = renderSheet('maja');

    fireEvent.press(screen.getByText('Rename Player'));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Maja L');
    fireEvent.press(screen.getByText('Save'));

    expect(renamePlayer).toHaveBeenCalledWith('maja', 'Maja L');
  });

  it('removes a player from the team after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { deletePlayer } = renderSheet('maja');

    fireEvent.press(screen.getByText('Remove from team'));
    await confirmAlert(alert);

    expect(deletePlayer).toHaveBeenCalledWith('maja');
  });

  it('shows nothing for a player who is gone', () => {
    renderSheet('nobody');

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
  });
});

describe('RosterList', () => {
  it('lists court and bench players and opens the one tapped', () => {
    const onPlayerPress = jest.fn();
    renderWithTeam(<RosterList onPlayerPress={onPlayerPress} />);

    expect(screen.getByText('On court · 1')).toBeTruthy();
    expect(screen.getByText('Bench · 1')).toBeTruthy();
    fireEvent.press(screen.getByText('Leo'));

    expect(onPlayerPress).toHaveBeenCalledWith('leo');
  });
});

describe('ViewSwitch', () => {
  it('switches between the court and the players', () => {
    const onChange = jest.fn();
    renderWithTeam(<ViewSwitch view="court" playerCount={2} onChange={onChange} />);

    expect(screen.getByRole('tab', { name: /Court/, selected: true })).toBeTruthy();
    fireEvent.press(screen.getByText('Players · 2'));

    expect(onChange).toHaveBeenCalledWith('players');
  });
});
