import { CourtConfiguration, PlayerType, Position, Team } from '@/types/models';
import React, { PropsWithChildren, createContext, useContext } from 'react';
import { exportTeamToFile, findFreePosition, getValidPosition, importTeamFromFile, validatePlayerPosition } from './utils';

import { sportsConfig } from '@/constants/sports';
import { useSport } from '@/context/SportContext';
import { useTeamData } from './hooks/useTeamData';
import { useTranslation } from '@/hooks/useTranslation';

interface TeamContextProps {
  team?: Team;
  teams: Team[];
  error?: { message: string; code?: string; timestamp: number } | null;
  updatePlayerPosition: (playerId: string, position: { x: number; y: number }) => void;
  addPlayer: (name: string) => void;
  setPlayerType: (playerId: string, position: string) => void;
  createTeam: (name: string) => void;
  selectTeam: (teamId: string) => void;
  removeTeam: (teamId: string) => void;
  renameTeam: (teamId: string, newName: string) => void;
  renamePlayer: (playerId: string, newName: string) => void;
  deletePlayer: (playerId: string) => void;
  exportTeam: (teamId: string) => void;
  importTeam: (importedTeam: Team) => void;
  importTeamFromFile: (fileUri: string) => Promise<Team>;
  setPlayers: (courtPlayers: PlayerType[], benchPlayers: PlayerType[]) => void;
  movePlayerToBench: (playerId: string) => void;
  movePlayerToCourt: (playerId: string, targetPosition?: Position) => void;
  findFreePosition: () => Position;
  // Configuration management
  createConfiguration: (name: string) => void;
  selectConfiguration: (configId: string) => void;
  renameConfiguration: (configId: string, newName: string) => void;
  deleteConfiguration: (configId: string) => void;
  getActiveConfiguration: () => CourtConfiguration | undefined;
  switchToNextConfiguration: () => void;
  switchToPreviousConfiguration: () => void;
}

export const TeamContext = createContext<TeamContextProps | undefined>(undefined);

// Helper function to ensure team has configurations (migration from old format)
const ensureTeamHasConfigurations = (team: Team): Team => {
  if (!team.configurations || team.configurations.length === 0) {
    // Migrate from old format: create a default configuration with current player positions
    const playerPositions: Record<string, Position> = {};

    [...team.startingPlayers, ...team.benchPlayers].forEach(player => {
      if (player.courtPosition) {
        playerPositions[player.id] = player.courtPosition;
      }
    });

    const defaultConfig: CourtConfiguration = {
      id: Date.now().toString(),
      name: 'Standard',
      playerPositions,
    };

    return {
      ...team,
      configurations: [defaultConfig],
      selectedConfigurationId: defaultConfig.id,
    };
  }

  // Ensure selectedConfigurationId is valid
  if (!team.selectedConfigurationId || !team.configurations.find(c => c.id === team.selectedConfigurationId)) {
    return {
      ...team,
      selectedConfigurationId: team.configurations[0].id,
    };
  }

  return team;
};

export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { selectedSport, setSelectedSport } = useSport();
  const { t } = useTranslation();
  
  const {
    teams,
    setTeams,
    selectedTeamId,
    setSelectedTeamId,
    isLoading,
    filteredTeams,
    selectedTeam,
    error
  } = useTeamData(selectedSport || 'soccer');

  const updateTeamInTeams = (updater: (team: Team) => Team) => {
    setTeams((prevTeams) => {
      return prevTeams.map((team) =>
        team.id === selectedTeamId ? updater(team) : team
      );
    });
  };

  const getCurrentPlayers = (): PlayerType[] => {
    if (!selectedTeam) return [];
    return [...selectedTeam.startingPlayers, ...selectedTeam.benchPlayers];
  };

  const updatePlayerPosition = (playerId: string, position: { x: number; y: number }) => {
    updateTeamInTeams(currentTeam => {
      const teamWithConfigs = ensureTeamHasConfigurations(currentTeam);
      const activeConfigId = teamWithConfigs.selectedConfigurationId!;

      // Update position in the active configuration
      const updatedConfigurations = teamWithConfigs.configurations!.map(config =>
        config.id === activeConfigId
          ? { ...config, playerPositions: { ...config.playerPositions, [playerId]: position } }
          : config
      );

      // Also update the player's courtPosition for backward compatibility
      return {
        ...teamWithConfigs,
        configurations: updatedConfigurations,
        startingPlayers: teamWithConfigs.startingPlayers.map(player =>
          player.id === playerId ? { ...player, courtPosition: position } : player
        ),
        benchPlayers: teamWithConfigs.benchPlayers.map(player =>
          player.id === playerId ? { ...player, courtPosition: position } : player
        )
      };
    });
  };

  const findFreePositionForTeam = (): Position => {
    return findFreePosition(getCurrentPlayers());
  };

  const addPlayer = (name: string) => {
    const position = findFreePositionForTeam();
    const defaultPosition = sportsConfig[selectedSport || 'soccer'].positions[0];
    
    const newPlayer: PlayerType = {
      id: Date.now().toString(),
      name: name,
      courtPosition: position,
      position: defaultPosition,
    };
    
    updateTeamInTeams(currentTeam => ({
      ...currentTeam,
      benchPlayers: [...currentTeam.benchPlayers, newPlayer],
    }));
  };

  const setPlayerType = (playerId: string, position: string) => {
    updateTeamInTeams(currentTeam => ({
      ...currentTeam,
      startingPlayers: currentTeam.startingPlayers.map(player =>
        player.id === playerId ? { ...player, position: getValidPosition(position, currentTeam.sport) } : player
      ),
      benchPlayers: currentTeam.benchPlayers.map(player =>
        player.id === playerId ? { ...player, position: getValidPosition(position, currentTeam.sport) } : player
      ),
    }));
  };

  const setPlayers = (courtPlayers: PlayerType[], benchPlayers: PlayerType[]) => {
    setTeams(prevTeams => prevTeams.map(team => {
      if (team.id === selectedTeamId) {
        const processedCourtPlayers = courtPlayers.map(player => ({
          ...player,
          courtPosition: validatePlayerPosition(player.courtPosition) || findFreePositionForTeam()
        }));
        
        const processedBenchPlayers = benchPlayers.map(player => ({
          ...player,
          courtPosition: validatePlayerPosition(player.courtPosition)
        }));
        
        return {
          ...team,
          startingPlayers: processedCourtPlayers,
          benchPlayers: processedBenchPlayers,
        };
      }
      return team;
    }));
  };

  const createTeam = (name: string) => {
    const now = Date.now();
    const defaultConfig: CourtConfiguration = {
      id: now.toString() + '-config',
      name: 'Standard',
      playerPositions: {},
    };

    const newTeam: Team = {
      id: now.toString(),
      name,
      startingPlayers: [],
      benchPlayers: [],
      createdBy: 'user1',
      sharedWith: [],
      lastEdited: now,
      editedBy: 'user1',
      sport: selectedSport || 'soccer',
      configurations: [defaultConfig],
      selectedConfigurationId: defaultConfig.id,
    };
    setTeams(prev => [...prev, newTeam]);
    setSelectedTeamId(newTeam.id);
  };

  const selectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const removeTeam = (teamId: string) => {
    setTeams(prev => {
      const updated = prev.filter(t => t.id !== teamId);
      if (teamId === selectedTeamId) {
        const teamsInSport = updated.filter(t => t.sport === selectedSport);
        setSelectedTeamId(teamsInSport.length > 0 ? teamsInSport[0].id : '');
      }
      return updated;
    });
  };

  const renameTeam = (teamId: string, newName: string) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, name: newName, lastEdited: Date.now() }
        : team
    ));
  };

  const renamePlayer = (playerId: string, newName: string) => {
    updateTeamInTeams(team => ({
      ...team,
      startingPlayers: team.startingPlayers.map(p => 
        p.id === playerId ? { ...p, name: newName } : p
      ),
      benchPlayers: team.benchPlayers.map(p => 
        p.id === playerId ? { ...p, name: newName } : p
      ),
    }));
  };

  const deletePlayer = (playerId: string) => {
    updateTeamInTeams(team => ({
      ...team,
      startingPlayers: team.startingPlayers.filter(p => p.id !== playerId),
      benchPlayers: team.benchPlayers.filter(p => p.id !== playerId),
    }));
  };

  const exportTeam = async (teamId: string) => {
    const teamToExport = teams.find(t => t.id === teamId);
    if (teamToExport) {
      await exportTeamToFile(teamToExport, t);
    }
  };

  const importTeam = async (importedTeam: Team) => {
    if (!importedTeam.name) return;

    if (importedTeam.sport && importedTeam.sport !== selectedSport) {
      setSelectedSport(importedTeam.sport);
    }

    let finalName = importedTeam.name;
    let counter = 1;
    while (teams.some(t => t.name === finalName)) {
      finalName = `${importedTeam.name} (${counter++})`;
    }

    const now = Date.now().toString();
    // Ensure the imported team has configurations (migration from old format)
    const migratedTeam = ensureTeamHasConfigurations({ ...importedTeam, id: now, name: finalName });
    setTeams(prev => [...prev, migratedTeam]);
    setSelectedTeamId(now);
  };

  const importTeamFromFileHandler = async (fileUri: string): Promise<Team> => {
    const parsed = await importTeamFromFile(fileUri);
    await importTeam(parsed);
    return parsed;
  };

  const movePlayerToBench = (playerId: string) => {
    updateTeamInTeams(currentTeam => {
      const playerToMove = currentTeam.startingPlayers.find(p => p.id === playerId);
      if (!playerToMove) return currentTeam;
      
      return {
        ...currentTeam,
        startingPlayers: currentTeam.startingPlayers.filter(p => p.id !== playerId),
        benchPlayers: [...currentTeam.benchPlayers, { ...playerToMove, courtPosition: undefined }]
      };
    });
  };

  const movePlayerToCourt = (playerId: string, targetPosition?: Position) => {
    updateTeamInTeams(currentTeam => {
      const playerToMove = currentTeam.benchPlayers.find(p => p.id === playerId);
      if (!playerToMove) return currentTeam;

      const newPosition = targetPosition || findFreePositionForTeam();

      return {
        ...currentTeam,
        benchPlayers: currentTeam.benchPlayers.filter(p => p.id !== playerId),
        startingPlayers: [...currentTeam.startingPlayers, { ...playerToMove, courtPosition: newPosition }]
      };
    });
  };

  // Configuration management functions
  const createConfiguration = (name: string) => {
    console.log('[TeamContext] createConfiguration called with name:', name);
    updateTeamInTeams(currentTeam => {
      const teamWithConfigs = ensureTeamHasConfigurations(currentTeam);
      console.log('[TeamContext] Before create - configs:', teamWithConfigs.configurations?.map(c => ({ id: c.id, name: c.name })));
      console.log('[TeamContext] Before create - selectedConfigurationId:', teamWithConfigs.selectedConfigurationId);

      const newConfig: CourtConfiguration = {
        id: Date.now().toString(),
        name,
        playerPositions: {}, // Start with empty positions
      };

      const updatedTeam = {
        ...teamWithConfigs,
        configurations: [...teamWithConfigs.configurations!, newConfig],
        selectedConfigurationId: newConfig.id,
      };

      console.log('[TeamContext] After create - configs:', updatedTeam.configurations.map(c => ({ id: c.id, name: c.name })));
      console.log('[TeamContext] After create - selectedConfigurationId:', updatedTeam.selectedConfigurationId);

      return updatedTeam;
    });
  };

  const selectConfiguration = (configId: string) => {
    console.log('[TeamContext] selectConfiguration called with configId:', configId);
    updateTeamInTeams(currentTeam => {
      const teamWithConfigs = ensureTeamHasConfigurations(currentTeam);
      console.log('[TeamContext] selectConfiguration - before:', {
        selectedConfigurationId: teamWithConfigs.selectedConfigurationId,
        requestedConfigId: configId,
      });

      const config = teamWithConfigs.configurations!.find(c => c.id === configId);

      if (!config) {
        console.log('[TeamContext] selectConfiguration - config not found!');
        return teamWithConfigs;
      }

      // Update player positions from the selected configuration
      const updatedStartingPlayers = teamWithConfigs.startingPlayers.map(player => ({
        ...player,
        courtPosition: config.playerPositions[player.id] || player.courtPosition,
      }));

      const updatedBenchPlayers = teamWithConfigs.benchPlayers.map(player => ({
        ...player,
        courtPosition: config.playerPositions[player.id] || player.courtPosition,
      }));

      const updatedTeam = {
        ...teamWithConfigs,
        selectedConfigurationId: configId,
        startingPlayers: updatedStartingPlayers,
        benchPlayers: updatedBenchPlayers,
      };

      console.log('[TeamContext] selectConfiguration - after:', {
        selectedConfigurationId: updatedTeam.selectedConfigurationId,
      });

      return updatedTeam;
    });
  };

  const renameConfiguration = (configId: string, newName: string) => {
    updateTeamInTeams(currentTeam => {
      const teamWithConfigs = ensureTeamHasConfigurations(currentTeam);

      return {
        ...teamWithConfigs,
        configurations: teamWithConfigs.configurations!.map(config =>
          config.id === configId ? { ...config, name: newName } : config
        ),
      };
    });
  };

  const deleteConfiguration = (configId: string) => {
    console.log('[TeamContext] deleteConfiguration called with configId:', configId);
    updateTeamInTeams(currentTeam => {
      const teamWithConfigs = ensureTeamHasConfigurations(currentTeam);
      console.log('[TeamContext] deleteConfiguration - current config count:', teamWithConfigs.configurations!.length);

      // Don't allow deleting the last configuration
      if (teamWithConfigs.configurations!.length <= 1) {
        console.log('[TeamContext] deleteConfiguration - prevented: cannot delete last configuration');
        return teamWithConfigs;
      }

      const updatedConfigs = teamWithConfigs.configurations!.filter(c => c.id !== configId);

      // Safety check: ensure we have at least one configuration remaining
      if (updatedConfigs.length === 0) {
        console.log('[TeamContext] deleteConfiguration - prevented: would result in zero configurations');
        return teamWithConfigs;
      }

      const newSelectedId = teamWithConfigs.selectedConfigurationId === configId
        ? updatedConfigs[0].id
        : teamWithConfigs.selectedConfigurationId;

      console.log('[TeamContext] deleteConfiguration - success:', {
        deletedConfigId: configId,
        remainingCount: updatedConfigs.length,
        newSelectedId,
      });

      return {
        ...teamWithConfigs,
        configurations: updatedConfigs,
        selectedConfigurationId: newSelectedId,
      };
    });
  };

  const getActiveConfiguration = (): CourtConfiguration | undefined => {
    if (!selectedTeam) return undefined;
    const teamWithConfigs = ensureTeamHasConfigurations(selectedTeam);
    return teamWithConfigs.configurations!.find(c => c.id === teamWithConfigs.selectedConfigurationId);
  };

  const switchToNextConfiguration = () => {
    console.log('[TeamContext] switchToNextConfiguration called');
    if (!selectedTeam) {
      console.log('[TeamContext] No selectedTeam, returning');
      return;
    }
    const teamWithConfigs = ensureTeamHasConfigurations(selectedTeam);
    const configs = teamWithConfigs.configurations!;
    const currentIndex = configs.findIndex(c => c.id === teamWithConfigs.selectedConfigurationId);
    const nextIndex = (currentIndex + 1) % configs.length;

    console.log('[TeamContext] switchToNextConfiguration:', {
      currentIndex,
      nextIndex,
      configCount: configs.length,
      currentConfigId: teamWithConfigs.selectedConfigurationId,
      nextConfigId: configs[nextIndex].id,
      allConfigs: configs.map(c => ({ id: c.id, name: c.name })),
    });

    selectConfiguration(configs[nextIndex].id);
  };

  const switchToPreviousConfiguration = () => {
    console.log('[TeamContext] switchToPreviousConfiguration called');
    if (!selectedTeam) {
      console.log('[TeamContext] No selectedTeam, returning');
      return;
    }
    const teamWithConfigs = ensureTeamHasConfigurations(selectedTeam);
    const configs = teamWithConfigs.configurations!;
    const currentIndex = configs.findIndex(c => c.id === teamWithConfigs.selectedConfigurationId);
    const prevIndex = (currentIndex - 1 + configs.length) % configs.length;

    console.log('[TeamContext] switchToPreviousConfiguration:', {
      currentIndex,
      prevIndex,
      configCount: configs.length,
      currentConfigId: teamWithConfigs.selectedConfigurationId,
      prevConfigId: configs[prevIndex].id,
      allConfigs: configs.map(c => ({ id: c.id, name: c.name })),
    });

    selectConfiguration(configs[prevIndex].id);
  };

  if (isLoading) {
    return null;
  }

  return (
    <TeamContext.Provider value={{
      team: selectedTeam ? ensureTeamHasConfigurations(selectedTeam) : undefined,
      teams: filteredTeams,
      error,
      updatePlayerPosition,
      addPlayer,
      setPlayerType,
      createTeam,
      selectTeam,
      removeTeam,
      renameTeam,
      renamePlayer,
      deletePlayer,
      exportTeam,
      importTeam,
      importTeamFromFile: importTeamFromFileHandler,
      setPlayers,
      movePlayerToBench,
      movePlayerToCourt,
      findFreePosition: findFreePositionForTeam,
      createConfiguration,
      selectConfiguration,
      renameConfiguration,
      deleteConfiguration,
      getActiveConfiguration,
      switchToNextConfiguration,
      switchToPreviousConfiguration,
    }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within TeamProvider');
  return context;
};
