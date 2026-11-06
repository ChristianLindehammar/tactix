import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CourtConfigurationSelector } from '../CourtConfigurationSelector';
import { TeamContext } from '@/context/TeamContext';

const configurations = [
  { id: 'a', name: 'Attack' },
  { id: 'b', name: 'Defence' },
];

const renderSelector = (selectedConfigurationId: string) => {
  const team = {
    configurations,
    selectedConfigurationId,
  };
  const value = {
    team,
    switchToPreviousConfiguration: jest.fn(),
    switchToNextConfiguration: jest.fn(),
    createConfiguration: jest.fn(),
    renameConfiguration: jest.fn(),
    deleteConfiguration: jest.fn(),
  };
  render(
    <TeamContext.Provider value={value as any}>
      <CourtConfigurationSelector />
    </TeamContext.Provider>,
  );
  return value;
};

describe('CourtConfigurationSelector', () => {
  it('shows the screen title and the active configuration', () => {
    renderSelector('a');

    expect(screen.getByText('Playing field')).toBeTruthy();
    expect(screen.getByText('Attack')).toBeTruthy();
  });

  it('offers a new configuration from the header even when not on the last one', () => {
    const { createConfiguration } = renderSelector('a');

    fireEvent.press(screen.getByLabelText('Create Configuration'));
    fireEvent.changeText(screen.getByDisplayValue(''), 'Press');
    fireEvent.press(screen.getByText('OK'));

    expect(createConfiguration).toHaveBeenCalledWith('Press');
  });
});
