import { useCallback } from 'react';
import { Team, PlayerType, Position } from '@/types/models';
import { createNewPlayer, validatePosition } from '../utils/teamFactories';
import { getValidPosition } from '../utils/playerUtils';

type TeamUpdater = (team: Team) => Team;

interface UsePlayerManagementProps {
  selectedTeam?: Team;
  updateTeam: (updater: TeamUpdater) => void;
}

export const usePlayerManagement = ({ selectedTeam, updateTeam }: UsePlayerManagementProps) => {
  const addPlayer = useCallback((name: string) => {
    if (!selectedTeam || !name.trim()) return;

    const newPlayer = createNewPlayer(name, Date.now());

    updateTeam(team => ({
      ...team,
      benchPlayers: [...team.benchPlayers, newPlayer],
    }));
  }, [selectedTeam, updateTeam]);

  const renamePlayer = useCallback((playerId: string, newName: string) => {
    if (!newName.trim()) return;

    updateTeam(team => ({
      ...team,
      startingPlayers: team.startingPlayers.map(p =>
        p.id === playerId ? { ...p, name: newName.trim() } : p
      ),
      benchPlayers: team.benchPlayers.map(p =>
        p.id === playerId ? { ...p, name: newName.trim() } : p
      ),
    }));
  }, [updateTeam]);

  const deletePlayer = useCallback((playerId: string) => {
    updateTeam(team => {
      // Remove player from configurations
      const updatedConfigurations = team.configurations?.map(config => {
        const { [playerId]: removed, ...remainingPositions } = config.playerPositions;
        return { ...config, playerPositions: remainingPositions };
      });

      return {
        ...team,
        startingPlayers: team.startingPlayers.filter(p => p.id !== playerId),
        benchPlayers: team.benchPlayers.filter(p => p.id !== playerId),
        configurations: updatedConfigurations,
      };
    });
  }, [updateTeam]);

  const movePlayerToBench = useCallback((playerId: string) => {
    updateTeam(team => {
      const playerIndex = team.startingPlayers.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return team;

      const player = team.startingPlayers[playerIndex];

      // Remove player position from active configuration
      const activeConfigId = team.selectedConfigurationId;
      const updatedConfigurations = team.configurations?.map(config => {
        if (config.id === activeConfigId) {
          const { [playerId]: removed, ...remainingPositions } = config.playerPositions;
          return { ...config, playerPositions: remainingPositions };
        }
        return config;
      });

      return {
        ...team,
        startingPlayers: team.startingPlayers.filter(p => p.id !== playerId),
        benchPlayers: [...team.benchPlayers, { ...player, courtPosition: undefined }],
        configurations: updatedConfigurations,
      };
    });
  }, [updateTeam]);

  const movePlayerToCourt = useCallback((playerId: string, targetPosition?: Position) => {
    updateTeam(team => {
      const playerIndex = team.benchPlayers.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return team;

      const player = team.benchPlayers[playerIndex];

      // Use provided position or find a free one
      let position: Position;
      if (targetPosition) {
        position = targetPosition;
      } else {
        // Find a free position by checking existing positions
        const existingPositions = team.startingPlayers
          .map(p => p.courtPosition)
          .filter((pos): pos is Position => pos !== undefined);

        // Simple collision avoidance: offset by number of existing players
        const offset = existingPositions.length * 0.1;
        position = { x: 0.05 + offset, y: 0.05 + offset };
      }

      const updatedPlayer = { ...player, courtPosition: position };

      // Update active configuration
      const activeConfigId = team.selectedConfigurationId;
      const updatedConfigurations = team.configurations?.map(config =>
        config.id === activeConfigId
          ? { ...config, playerPositions: { ...config.playerPositions, [playerId]: position } }
          : config
      );

      return {
        ...team,
        benchPlayers: team.benchPlayers.filter(p => p.id !== playerId),
        startingPlayers: [...team.startingPlayers, updatedPlayer],
        configurations: updatedConfigurations,
      };
    });
  }, [updateTeam]);

  const updatePlayerPosition = useCallback((playerId: string, position: { x: number; y: number }) => {
    const validPosition = validatePosition(position);

    updateTeam(team => {
      // Only update if player exists
      const playerExists = team.startingPlayers.some(p => p.id === playerId) ||
                          team.benchPlayers.some(p => p.id === playerId);
      if (!playerExists) return team;

      // Update active configuration
      const activeConfigId = team.selectedConfigurationId;
      const updatedConfigurations = team.configurations?.map(config =>
        config.id === activeConfigId
          ? { ...config, playerPositions: { ...config.playerPositions, [playerId]: validPosition } }
          : config
      );

      return {
        ...team,
        startingPlayers: team.startingPlayers.map(p =>
          p.id === playerId ? { ...p, courtPosition: validPosition } : p
        ),
        benchPlayers: team.benchPlayers.map(p =>
          p.id === playerId ? { ...p, courtPosition: validPosition } : p
        ),
        configurations: updatedConfigurations,
      };
    });
  }, [updateTeam]);

  const setPlayerType = useCallback((playerId: string, position: string) => {
    if (!position.trim()) return;

    updateTeam(team => {
      // Validate position against sport's available positions
      const validPosition = getValidPosition(position, team.sport);

      return {
        ...team,
        startingPlayers: team.startingPlayers.map(p =>
          p.id === playerId ? { ...p, position: validPosition } : p
        ),
        benchPlayers: team.benchPlayers.map(p =>
          p.id === playerId ? { ...p, position: validPosition } : p
        ),
      };
    });
  }, [updateTeam]);

  const setPlayers = useCallback((courtPlayers: PlayerType[], benchPlayers: PlayerType[]) => {
    updateTeam(team => {
      // Normalize court positions for all players
      const normalizedCourtPlayers = courtPlayers.map(p => ({
        ...p,
        courtPosition: p.courtPosition ? validatePosition(p.courtPosition) : undefined,
      }));

      const normalizedBenchPlayers = benchPlayers.map(p => ({
        ...p,
        courtPosition: p.courtPosition ? validatePosition(p.courtPosition) : undefined,
      }));

      return {
        ...team,
        startingPlayers: normalizedCourtPlayers,
        benchPlayers: normalizedBenchPlayers,
      };
    });
  }, [updateTeam]);

  return {
    addPlayer,
    renamePlayer,
    deletePlayer,
    movePlayerToBench,
    movePlayerToCourt,
    updatePlayerPosition,
    setPlayerType,
    setPlayers,
  };
};
