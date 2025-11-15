import { useCallback } from 'react';
import { Team, PlayerType, Position } from '@/types/models';
import { createNewPlayer, validatePosition } from '../utils/teamFactories';

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
    updateTeam(team => ({
      ...team,
      startingPlayers: team.startingPlayers.filter(p => p.id !== playerId),
      benchPlayers: team.benchPlayers.filter(p => p.id !== playerId),
    }));
  }, [updateTeam]);

  const movePlayerToBench = useCallback((playerId: string) => {
    updateTeam(team => {
      const playerIndex = team.startingPlayers.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return team;

      const player = team.startingPlayers[playerIndex];
      return {
        ...team,
        startingPlayers: team.startingPlayers.filter(p => p.id !== playerId),
        benchPlayers: [...team.benchPlayers, player],
      };
    });
  }, [updateTeam]);

  const movePlayerToCourt = useCallback((playerId: string, targetPosition?: Position) => {
    updateTeam(team => {
      const playerIndex = team.benchPlayers.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return team;

      const player = team.benchPlayers[playerIndex];
      const updatedPlayer = targetPosition
        ? { ...player, courtPosition: targetPosition }
        : player;

      return {
        ...team,
        benchPlayers: team.benchPlayers.filter(p => p.id !== playerId),
        startingPlayers: [...team.startingPlayers, updatedPlayer],
      };
    });
  }, [updateTeam]);

  const updatePlayerPosition = useCallback((playerId: string, position: { x: number; y: number }) => {
    const validPosition = validatePosition(position);

    updateTeam(team => ({
      ...team,
      startingPlayers: team.startingPlayers.map(p =>
        p.id === playerId ? { ...p, courtPosition: validPosition } : p
      ),
      benchPlayers: team.benchPlayers.map(p =>
        p.id === playerId ? { ...p, courtPosition: validPosition } : p
      ),
    }));
  }, [updateTeam]);

  const setPlayerType = useCallback((playerId: string, position: string) => {
    if (!position.trim()) return;

    updateTeam(team => ({
      ...team,
      startingPlayers: team.startingPlayers.map(p =>
        p.id === playerId ? { ...p, position: position.trim() } : p
      ),
      benchPlayers: team.benchPlayers.map(p =>
        p.id === playerId ? { ...p, position: position.trim() } : p
      ),
    }));
  }, [updateTeam]);

  const setPlayers = useCallback((courtPlayers: PlayerType[], benchPlayers: PlayerType[]) => {
    updateTeam(team => ({
      ...team,
      startingPlayers: courtPlayers,
      benchPlayers: benchPlayers,
    }));
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
