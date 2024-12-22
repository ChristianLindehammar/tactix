import React, { createContext, useState, PropsWithChildren, useContext } from 'react';
import { Team, PlayerType, Position, PlayerPosition } from '@/types/models';
import { LAYOUT } from '@/constants/layout';

interface TeamContextProps {
  team: Team;
  updatePlayerPosition: (playerId: string, position: { x: number; y: number }) => void;
  addPlayer: (name: string) => void;
  setPlayerType: (playerId: string, position: PlayerPosition) => void; // Renamed method
  movePlayerToCourt: (playerId: string) => void;
  movePlayerToBench: (playerId: string) => void;
  updatePlayerIndex: (playerId: string, newIndex: number, isCourt: boolean) => void;  // Add this line
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
    sport: 'floorball',
  });

  const updatePlayerPosition = (playerId: string, position: { x: number; y: number }) => {
    setTeam(currentTeam => ({
      ...currentTeam,
      startingPlayers: currentTeam.startingPlayers.map(player =>
        player.id === playerId ? { ...player, courtPosition: position } : player
      ),
      benchPlayers: currentTeam.benchPlayers.map(player =>
        player.id === playerId ? { ...player, courtPosition: position } : player
      )
    }));
  };

  const findFreePosition = (): Position => {
    const playerSize = LAYOUT.PLAYER.SIZE;
    const padding = 10;
    const spacing = playerSize + padding;

    const isPositionTaken = (pos: Position): boolean => {
      return [...team.startingPlayers, ...team.benchPlayers].some(
        player => player.courtPosition && 
                  Math.abs(player.courtPosition.x - pos.x) < playerSize && 
                  Math.abs(player.courtPosition.y - pos.y) < playerSize
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
      courtPosition: position, // Assign to courtPosition
      position: PlayerPosition.Forward,
      index: team.benchPlayers.length,  // Add index based on current length
    };
    
    setTeam(currentTeam => ({
      ...currentTeam,
      benchPlayers: [...currentTeam.benchPlayers, newPlayer],
    }));
  };

  const setPlayerType = (playerId: string, position: PlayerPosition) => { // Renamed method
    setTeam(currentTeam => ({
      ...currentTeam,
      startingPlayers: currentTeam.startingPlayers.map(player =>
        player.id === playerId ? { ...player, position } : player
      ),
      benchPlayers: currentTeam.benchPlayers.map(player =>
        player.id === playerId ? { ...player, position } : player
      ),
    }));
  };

  const updatePlayerIndex = (playerId: string, newIndex: number, isCourt: boolean) => {
    setTeam(currentTeam => {
      const players = isCourt ? currentTeam.startingPlayers : currentTeam.benchPlayers;
      const player = players.find(p => p.id === playerId);
      if (!player) return currentTeam;

      const updatedPlayers = players
        .map(p => {
          if (p.id === playerId) return { ...p, index: newIndex };
          if (p.index >= newIndex) return { ...p, index: p.index + 1 };
          return p;
        })
        .sort((a, b) => a.index - b.index);

      return {
        ...currentTeam,
        startingPlayers: isCourt ? updatedPlayers : currentTeam.startingPlayers,
        benchPlayers: isCourt ? currentTeam.benchPlayers : updatedPlayers,
      };
    });
  };

  const movePlayerToCourt = (playerId: string) => {
    setTeam(currentTeam => {
      const player = currentTeam.benchPlayers.find(p => p.id === playerId);
      if (!player) return currentTeam;
      
      // Update indices for remaining bench players
      const updatedBenchPlayers = currentTeam.benchPlayers
        .filter(p => p.id !== playerId)
        .map((p, idx) => ({ ...p, index: idx }));

      // Add player to court with new index
      const playerWithNewIndex = { ...player, index: currentTeam.startingPlayers.length };

      return {
        ...currentTeam,
        benchPlayers: updatedBenchPlayers,
        startingPlayers: [...currentTeam.startingPlayers, playerWithNewIndex]
          .sort((a, b) => a.index - b.index),
      };
    });
  };

  const movePlayerToBench = (playerId: string) => {
    setTeam(currentTeam => {
      const player = currentTeam.startingPlayers.find(p => p.id === playerId);
      if (!player) return currentTeam;

      // Update indices for remaining court players
      const updatedStartingPlayers = currentTeam.startingPlayers
        .filter(p => p.id !== playerId)
        .map((p, idx) => ({ ...p, index: idx }));

      // Add player to bench with new index
      const playerWithNewIndex = { ...player, index: currentTeam.benchPlayers.length };

      return {
        ...currentTeam,
        startingPlayers: updatedStartingPlayers,
        benchPlayers: [...currentTeam.benchPlayers, playerWithNewIndex]
          .sort((a, b) => a.index - b.index),
      };
    });
  };

  return (
    <TeamContext.Provider value={{ 
      team, 
      updatePlayerPosition, 
      addPlayer, 
      setPlayerType,  
      movePlayerToCourt, 
      movePlayerToBench,
      updatePlayerIndex,  
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
