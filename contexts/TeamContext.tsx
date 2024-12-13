import React, { createContext, useState, PropsWithChildren, useContext } from 'react';
import { Team, PlayerType, Position } from '@/types/models';
import { LAYOUT } from '@/constants/layout';

interface TeamContextProps {
  team: Team;
  updatePlayerPosition: (playerId: string, position: { x: number; y: number }) => void;
  addPlayer: (name: string) => void;  // New method
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

  const findFreePosition = (): Position => {
    const playerSize = LAYOUT.PLAYER.SIZE;
    const padding = 10;
    const spacing = playerSize + padding;

    const isPositionTaken = (pos: Position): boolean => {
      return [...team.startingPlayers, ...team.benchPlayers].some(
        player => Math.abs(player.position.x - pos.x) < playerSize && 
                 Math.abs(player.position.y - pos.y) < playerSize
      );
    };

    // Calculate maximum columns that fit within court width
    const maxColumns = Math.floor((LAYOUT.FLOORBALL_COURT.WIDTH - padding * 2) / spacing);
    
    // Start from top-left with some padding
    let column = 0;
    let row = 0;
    
    // Try to find a free position using grid-based placement
    while (row * spacing + playerSize + padding < LAYOUT.FLOORBALL_COURT.HEIGHT) {
      while (column < maxColumns) {
        const x = padding + column * spacing;
        const y = padding + row * spacing;
        const pos = { x, y };
        
        if (!isPositionTaken(pos)) {
          return pos;
        }
        column++;
      }
      column = 0;
      row++;
    }

    // Fallback: return position within safe bounds
    const safeWidth = LAYOUT.FLOORBALL_COURT.WIDTH - playerSize - padding * 2;
    const safeHeight = LAYOUT.FLOORBALL_COURT.HEIGHT - playerSize - padding * 2;
    return {
      x: padding + Math.random() * safeWidth,
      y: padding + Math.random() * safeHeight
    };
  };

  const addPlayer = (name: string) => {
    const position = findFreePosition();
    const newPlayer: PlayerType = {
      id: Date.now().toString(),
      name: name,
      position
    };
    
    setTeam(currentTeam => ({
      ...currentTeam,
      benchPlayers: [...currentTeam.benchPlayers, newPlayer],
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
      addPlayer,  // Replace addBenchPlayer with addPlayer
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
