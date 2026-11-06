import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CourtConfigurationSelector } from '../CourtConfigurationSelector';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TeamContext } from '@/context/TeamContext';

const configurations = [
  { id: 'a', name: 'Attack' },
  { id: 'b', name: 'Defence' },
];

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderSelector = (selectedConfigurationId: string) => {
  const team = {
    name: 'F12 Basket',
    startingPlayers: [],
    benchPlayers: [],
    configurations,
    selectedConfigurationId,
  };
  const value = {
    team,
    teams: [team],
    switchToPreviousConfiguration: jest.fn(),
    switchToNextConfiguration: jest.fn(),
    createConfiguration: jest.fn(),
    renameConfiguration: jest.fn(),
    deleteConfiguration: jest.fn(),
  };
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <TeamContext.Provider value={value as any}>
        <CourtConfigurationSelector />
      </TeamContext.Provider>
    </SafeAreaProvider>,
  );
  return value;
};

describe('CourtConfigurationSelector', () => {
  it('shows the screen title and the active configuration', () => {
    renderSelector('a');

    expect(screen.getByText('Playing field')).toBeTruthy();
    expect(screen.getByText('Attack')).toBeTruthy();
  });

  it('shows the open team, which opens the team switcher', () => {
    renderSelector('a');

    fireEvent.press(screen.getByLabelText('Switch team, current team F12 Basket'));

    expect(screen.getByText('Your teams')).toBeTruthy();
  });

  it('offers a new configuration from the header even when not on the last one', () => {
    const { createConfiguration } = renderSelector('a');

    fireEvent.press(screen.getByLabelText('Create Configuration'));
    fireEvent.changeText(screen.getByDisplayValue(''), 'Press');
    fireEvent.press(screen.getByText('OK'));

    expect(createConfiguration).toHaveBeenCalledWith('Press');
  });
});
