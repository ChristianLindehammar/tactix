import React, { createContext, useContext, PropsWithChildren, useState, useCallback } from 'react';
import { Team, PlayerType, Position, CourtConfiguration } from '@/types/models';
import {
  DEFAULT_COURT_POSITION,
  POSITION_SPACING,
  POSITION_PADDING,
  MIN_CONFIGURATIONS,
} from './constants/teamDefaults';
import { useTeamManagement } from './hooks/useTeamManagement';
import { usePlayerManagement } from './hooks/usePlayerManagement';
import { TeamContextProps, TeamContextError } from './types/teamContext';
import {
  createNewConfiguration,
  extractPlayerPositions,
} from './utils/teamFactories';
import { exportTeamToFile, importTeamFromFile as importTeamFromFileUtil } from './utils';
import { useSport } from '@/context/SportContext';



// Create the context
const TeamContext = createContext<TeamContextProps | undefined>(undefined);



// Custom hook to use the context
export const useTeam = (): TeamContextProps => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
};

// Provider component - implementing minimal functionality to pass tests
export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // State management
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [error, setError] = useState<TeamContextError | null>(null);

  // Sport context for updating sport when importing teams
  const { setSelectedSport } = useSport();

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



  /**
   * Finds a free position on the court that doesn't collide with existing players.
   * Uses a grid-based approach to systematically search for available positions.
   * @returns A position object with x and y coordinates (0-1 range)
   */
  const findFreePosition = useCallback((): Position => {
    if (!selectedTeam) return DEFAULT_COURT_POSITION;

    const allPlayers = [...selectedTeam.startingPlayers, ...selectedTeam.benchPlayers];

    // Check if a position is too close to any existing player
    const isPositionTaken = (pos: Position): boolean => {
      return allPlayers.some(p => {
        if (!p.courtPosition) return false;
        const dx = p.courtPosition.x - pos.x;
        const dy = p.courtPosition.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < POSITION_SPACING / 2;
      });
    };

    // Calculate how many positions fit in each dimension
    const maxRows = Math.floor((1 - POSITION_PADDING * 2) / POSITION_SPACING);

    // Search grid for first available position
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

  /**
   * Exports a team to a file.
   * @param teamId - The ID of the team to export
   */
  const exportTeam = useCallback(async (teamId: string) => {
    const teamToExport = teams.find(t => t.id === teamId);
    if (!teamToExport) return;

    await exportTeamToFile(teamToExport, (key: string) => key);
  }, [teams]);

  /**
   * Imports a team, ensuring it has configurations and a unique name.
   * Also updates the selected sport if the imported team uses a different sport.
   * @param importedTeam - The team data to import
   */
  const importTeam = useCallback(async (importedTeam: Team) => {
    if (!importedTeam.name) return;

    // Update sport if different from default
    if (importedTeam.sport && importedTeam.sport !== 'soccer') {
      setSelectedSport(importedTeam.sport);
    }

    // Ensure team has configurations (migrate legacy teams)
    let teamToImport = importedTeam;
    if (!teamToImport.configurations || teamToImport.configurations.length === 0) {
      const playerPositions: Record<string, Position> = {};
      [...teamToImport.startingPlayers, ...teamToImport.benchPlayers].forEach(player => {
        if (player.courtPosition) {
          playerPositions[player.id] = player.courtPosition;
        }
      });

      const defaultConfig: CourtConfiguration = {
        id: Date.now().toString() + '-config',
        name: 'Standard',
        playerPositions,
      };

      teamToImport = {
        ...teamToImport,
        configurations: [defaultConfig],
        selectedConfigurationId: defaultConfig.id,
      };
    }

    // Make name unique
    let finalName = teamToImport.name;
    let counter = 1;
    while (teams.some(t => t.name === finalName)) {
      finalName = `${teamToImport.name} (${counter++})`;
    }

    const now = Date.now().toString();
    const newTeam = { ...teamToImport, id: now, name: finalName };

    setTeams(prev => [...prev, newTeam]);
    setSelectedTeamId(now);
  }, [teams, setTeams, setSelectedTeamId, setSelectedSport]);

  const importTeamFromFile = useCallback(async (fileUri: string): Promise<Team> => {
    const parsed = await importTeamFromFileUtil(fileUri);
    await importTeam(parsed);
    return parsed;
  }, [importTeam]);

  /**
   * Creates a new configuration based on current player positions.
   * The new configuration becomes the active configuration.
   * @param name - Name for the new configuration
   */
  const createConfiguration = useCallback((name: string) => {
    if (!selectedTeam) return;

    // Extract current player positions from starting players only
    const currentPlayerPositions = extractPlayerPositions(selectedTeam.startingPlayers);

    // Create new configuration with current player positions
    const newConfig = createNewConfiguration(name, currentPlayerPositions);

    // Add configuration to team and set as selected
    updateTeam(team => ({
      ...team,
      configurations: [...(team.configurations || []), newConfig],
      selectedConfigurationId: newConfig.id,
    }));
  }, [selectedTeam, updateTeam]);

  /**
   * Switches to a different configuration, updating player positions accordingly.
   * Players in the configuration are moved to starting, others to bench.
   * @param configId - ID of the configuration to select
   */
  const selectConfiguration = useCallback((configId: string) => {
    updateTeam(team => {
      const config = team.configurations?.find(c => c.id === configId);
      if (!config) return team;

      // Get all players
      const allPlayers = [...team.startingPlayers, ...team.benchPlayers];

      // Split players based on configuration
      const updatedStartingPlayers: PlayerType[] = [];
      const updatedBenchPlayers: PlayerType[] = [];

      allPlayers.forEach(player => {
        const positionInConfig = config.playerPositions[player.id];
        if (positionInConfig) {
          updatedStartingPlayers.push({
            ...player,
            courtPosition: positionInConfig,
          });
        } else {
          updatedBenchPlayers.push({
            ...player,
            courtPosition: undefined,
          });
        }
      });

      return {
        ...team,
        selectedConfigurationId: configId,
        startingPlayers: updatedStartingPlayers,
        benchPlayers: updatedBenchPlayers,
      };
    });
  }, [updateTeam]);

  const renameConfiguration = useCallback((configId: string, newName: string) => {
    if (!newName.trim()) return;

    updateTeam(team => ({
      ...team,
      configurations: team.configurations?.map(config =>
        config.id === configId ? { ...config, name: newName.trim() } : config
      ),
    }));
  }, [updateTeam]);

  /**
   * Deletes a configuration from the team.
   * Prevents deletion of the last remaining configuration.
   * Auto-selects the first remaining configuration if deleting the currently selected one.
   * @param configId - ID of the configuration to delete
   */
  const deleteConfiguration = useCallback((configId: string) => {
    updateTeam(team => {
      // Don't allow deleting the last configuration
      if (!team.configurations || team.configurations.length <= MIN_CONFIGURATIONS) {
        return team;
      }

      const updatedConfigs = team.configurations.filter(c => c.id !== configId);

      // Safety check: ensure we have at least one configuration remaining
      if (updatedConfigs.length < MIN_CONFIGURATIONS) {
        return team;
      }

      // If deleting the currently selected config, auto-select the first remaining one
      const newSelectedId = team.selectedConfigurationId === configId
        ? updatedConfigs[0].id
        : team.selectedConfigurationId;

      return {
        ...team,
        configurations: updatedConfigs,
        selectedConfigurationId: newSelectedId,
      };
    });
  }, [updateTeam]);

  const getActiveConfiguration = useCallback((): CourtConfiguration | undefined => {
    if (!selectedTeam) return undefined;
    return selectedTeam.configurations?.find(c => c.id === selectedTeam.selectedConfigurationId);
  }, [selectedTeam]);

  /**
   * Helper function to switch to a configuration by offset.
   * @param offset - Number of positions to move (positive for next, negative for previous)
   */
  const switchConfigurationByOffset = useCallback((offset: number) => {
    if (!selectedTeam || !selectedTeam.configurations) return;

    const configs = selectedTeam.configurations;
    const currentIndex = configs.findIndex(c => c.id === selectedTeam.selectedConfigurationId);
    const newIndex = (currentIndex + offset + configs.length) % configs.length;

    selectConfiguration(configs[newIndex].id);
  }, [selectedTeam, selectConfiguration]);

  /**
   * Switches to the next configuration in the list.
   * Wraps around to the first configuration if currently on the last one.
   */
  const switchToNextConfiguration = useCallback(() => {
    switchConfigurationByOffset(1);
  }, [switchConfigurationByOffset]);

  /**
   * Switches to the previous configuration in the list.
   * Wraps around to the last configuration if currently on the first one.
   */
  const switchToPreviousConfiguration = useCallback(() => {
    switchConfigurationByOffset(-1);
  }, [switchConfigurationByOffset]);

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
