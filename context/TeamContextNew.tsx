import React, { createContext, useContext, PropsWithChildren, useState, useCallback } from 'react';
import { Team, PlayerType, Position, CourtConfiguration } from '@/types/models';
import {
  DEFAULT_COURT_POSITION,
  POSITION_SPACING,
  POSITION_PADDING,
} from './constants/teamDefaults';
import { useTeamManagement } from './hooks/useTeamManagement';
import { usePlayerManagement } from './hooks/usePlayerManagement';
import { TeamContextProps, TeamContextError } from './types/teamContext';



// Create the context
const TeamContext = createContext<TeamContextProps | undefined>(undefined);



// Custom hook to use the context
export const useTeam = (): TeamContextProps => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

// Provider component - implementing minimal functionality to pass tests
export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // State management
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [error, setError] = useState<TeamContextError | null>(null);

  // Get currently selected team
  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  // Use extracted hooks for team and player management
  const {
    createTeam,
    selectTeam,
    removeTeam,
    renameTeam,
    updateTeam,
  } = useTeamManagement({ teams, setTeams, selectedTeamId, setSelectedTeamId });

  const {
    addPlayer,
    renamePlayer,
    deletePlayer,
    movePlayerToBench,
    movePlayerToCourt,
    updatePlayerPosition,
    setPlayerType,
    setPlayers,
  } = usePlayerManagement({ selectedTeam, updateTeam });



  const findFreePosition = useCallback((): Position => {
    if (!selectedTeam) return DEFAULT_COURT_POSITION;

    const allPlayers = [...selectedTeam.startingPlayers, ...selectedTeam.benchPlayers];

    const isPositionTaken = (pos: Position): boolean => {
      return allPlayers.some(p => {
        if (!p.courtPosition) return false;
        const dx = p.courtPosition.x - pos.x;
        const dy = p.courtPosition.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) < POSITION_SPACING / 2;
      });
    };

    const maxRows = Math.floor((1 - POSITION_PADDING * 2) / POSITION_SPACING);

    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < maxRows; col++) {
        const x = POSITION_PADDING + col * POSITION_SPACING;
        const y = POSITION_PADDING + row * POSITION_SPACING;
        const candidate = { x, y };

        if (!isPositionTaken(candidate)) {
          return candidate;
        }
      }
    }

    // Fallback if grid is full
    return DEFAULT_COURT_POSITION;
  }, [selectedTeam]);

  // Import/Export functionality (stub implementations for now)
  const exportTeam = useCallback((teamId: string) => {
    // TODO: Implement export functionality
    console.log('Export team:', teamId);
  }, []);

  const importTeam = useCallback((importedTeam: Team) => {
    // TODO: Implement import functionality
    console.log('Import team:', importedTeam.name);
  }, []);

  const importTeamFromFile = useCallback(async (fileUri: string): Promise<Team> => {
    // TODO: Implement file import functionality
    throw new Error('Import from file not implemented yet');
  }, []);

  // Configuration management (stub implementations for now)
  const createConfiguration = useCallback((name: string) => {
    // TODO: Implement configuration creation
    console.log('Create configuration:', name);
  }, []);

  const selectConfiguration = useCallback((configId: string) => {
    // TODO: Implement configuration selection
    console.log('Select configuration:', configId);
  }, []);

  const renameConfiguration = useCallback((configId: string, newName: string) => {
    // TODO: Implement configuration renaming
    console.log('Rename configuration:', configId, newName);
  }, []);

  const deleteConfiguration = useCallback((configId: string) => {
    // TODO: Implement configuration deletion
    console.log('Delete configuration:', configId);
  }, []);

  const getActiveConfiguration = useCallback((): CourtConfiguration | undefined => {
    return selectedTeam?.configurations?.[0];
  }, [selectedTeam]);

  const switchToNextConfiguration = useCallback(() => {
    // TODO: Implement configuration switching
    console.log('Switch to next configuration');
  }, []);

  const switchToPreviousConfiguration = useCallback(() => {
    // TODO: Implement configuration switching
    console.log('Switch to previous configuration');
  }, []);

  // Build context value with organized sections
  const contextValue: TeamContextProps = {
    // State
    team: selectedTeam,
    teams,
    error,

    // Team management operations
    createTeam,
    selectTeam,
    removeTeam,
    renameTeam,

    // Player management operations
    addPlayer,
    renamePlayer,
    deletePlayer,
    updatePlayerPosition,
    setPlayerType,
    movePlayerToBench,
    movePlayerToCourt,
    setPlayers,

    // Utility operations
    findFreePosition,

    // Import/Export operations
    exportTeam,
    importTeam,
    importTeamFromFile,

    // Configuration management operations
    createConfiguration,
    selectConfiguration,
    renameConfiguration,
    deleteConfiguration,
    getActiveConfiguration,
    switchToNextConfiguration,
    switchToPreviousConfiguration,
  };

  return (
    <TeamContext.Provider value={contextValue}>
      {children}
    </TeamContext.Provider>
  );
};
