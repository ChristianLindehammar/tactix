import React, { createContext, useState, PropsWithChildren, useContext } from 'react';
import { Team, PlayerType } from '@/types/models';

interface TeamContextProps {
  team: Team;
  updatePlayerPosition: (playerId: string, position: { x: number; y: number }) => void;
  addBenchPlayer: (player: PlayerType) => void;
  movePlayerToCourt: (playerId: string) => void;
  movePlayerToBench: (playerId: string) => void;
}

export const TeamContext = createContext<TeamContextProps | undefined>(undefined);

export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [team, setTeam] = useState<Team>({
    id: '1',
    name: 'My Team',
    startingPlayers: [],
    benchPlayers: [],
    createdBy: 'user1',
    sharedWith: [],
    lastEdited: Date.now(),
    editedBy: 'user1',
  });

  const updatePlayerPosition = (playerId: string, position: { x: number; y: number }) => {
    setTeam(currentTeam => ({
      ...currentTeam,
      startingPlayers: currentTeam.startingPlayers.map(player =>
        player.id === playerId ? { ...player, position } : player
      ),
      benchPlayers: currentTeam.benchPlayers.map(player =>
        player.id === playerId ? { ...player, position } : player
      )
    }));
  };

  const addBenchPlayer = (player: PlayerType) => {
    setTeam(currentTeam => ({
      ...currentTeam,
      benchPlayers: [...currentTeam.benchPlayers, player],
    }));
  };

  const movePlayerToCourt = (playerId: string) => {
    setTeam(currentTeam => {
      const player = currentTeam.benchPlayers.find(p => p.id === playerId);
      if (!player) return currentTeam;
      return {
        ...currentTeam,
        benchPlayers: currentTeam.benchPlayers.filter(p => p.id !== playerId),
        startingPlayers: [...currentTeam.startingPlayers, player],
      };
    });
  };

  const movePlayerToBench = (playerId: string) => {
    setTeam(currentTeam => {
      const player = currentTeam.startingPlayers.find(p => p.id === playerId)
      

      if (!player) return currentTeam;

      return {
        ...currentTeam,
        startingPlayers: currentTeam.startingPlayers.filter(p => p.id !== playerId),
        benchPlayers: [...currentTeam.benchPlayers, player],
      };
    });
  };

  return (
    <TeamContext.Provider value={{ 
      team, 
      updatePlayerPosition, 
      addBenchPlayer, 
      movePlayerToCourt, 
      movePlayerToBench 
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
