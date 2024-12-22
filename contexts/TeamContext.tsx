import React, { createContext, useState, PropsWithChildren, useContext } from 'react';
import { Team, PlayerType, Position, PlayerPosition } from '@/types/models';
import { LAYOUT } from '@/constants/layout';

interface TeamContextProps {
  team?: Team; // Make optional
  teams: Team[];                // Expose all teams
  updatePlayerPosition: (playerId: string, position: { x: number; y: number }) => void;
  addPlayer: (name: string) => void;
  setPlayerType: (playerId: string, position: PlayerPosition) => void; // Renamed method
  movePlayerToCourt: (playerId: string) => void;
  movePlayerToBench: (playerId: string) => void;
  updatePlayerIndex: (playerId: string, newIndex: number, isCourt: boolean) => void;  // Add this line
  createTeam: (name: string) => void; // Add this
  selectTeam: (teamId: string) => void;
  removeTeam: (teamId: string) => void; // Add this
}

export const TeamContext = createContext<TeamContextProps | undefined>(undefined);

export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([
    {
      id: '1',
      name: 'My Team',
      startingPlayers: [],
      benchPlayers: [],
      createdBy: 'user1',
      sharedWith: [],
      lastEdited: Date.now(),
      editedBy: 'user1',
      sport: 'floorball',
    },
  ]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('1');

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const updateTeamInTeams = (updater: (team: Team) => Team) => {
    setTeams((prevTeams) => {
      return prevTeams.map((team) =>
        team.id === selectedTeamId ? updater(team) : team
      );
    });
  };

  const updatePlayerPosition = (playerId: string, position: { x: number; y: number }) => {
    updateTeamInTeams(currentTeam => ({
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

    // Use ratios for position calculations
    const isPositionTaken = (pos: Position): boolean => {
      if (!selectedTeam) return false;
      return [...selectedTeam.startingPlayers, ...selectedTeam.benchPlayers].some(
        player => player.courtPosition && 
                  Math.abs(player.courtPosition.x - pos.x) < (playerSize / LAYOUT.FLOORBALL_COURT.WIDTH) && 
                  Math.abs(player.courtPosition.y - pos.y) < (playerSize / LAYOUT.FLOORBALL_COURT.HEIGHT)
      );
    };

    // Calculate positions as ratios of original dimensions
    const maxColumns = Math.floor(LAYOUT.FLOORBALL_COURT.WIDTH / spacing);
    
    let column = 0;
    let row = 0;
    
    while (row * spacing < LAYOUT.FLOORBALL_COURT.HEIGHT) {
      while (column < maxColumns) {
        const x = (padding + column * spacing) / LAYOUT.FLOORBALL_COURT.WIDTH;
        const y = (padding + row * spacing) / LAYOUT.FLOORBALL_COURT.HEIGHT;
        const pos = { x, y };
        
        if (!isPositionTaken(pos)) {
          return pos;
        }
        column++;
      }
      column = 0;
      row++;
    }

    // Fallback: return ratio-based position
    return {
      x: (padding + Math.random() * (LAYOUT.FLOORBALL_COURT.WIDTH - playerSize - padding * 2)) / LAYOUT.FLOORBALL_COURT.WIDTH,
      y: (padding + Math.random() * (LAYOUT.FLOORBALL_COURT.HEIGHT - playerSize - padding * 2)) / LAYOUT.FLOORBALL_COURT.HEIGHT
    };
  };

  const addPlayer = (name: string) => {
    const position = findFreePosition();
    const newPlayer: PlayerType = {
      id: Date.now().toString(),
      name: name,
      courtPosition: position, // Assign to courtPosition
      position: PlayerPosition.Forward,
      index: selectedTeam?.benchPlayers.length || 0,  // Add index based on current length
    };
    
    updateTeamInTeams(currentTeam => ({
      ...currentTeam,
      benchPlayers: [...currentTeam.benchPlayers, newPlayer],
    }));
  };

  const setPlayerType = (playerId: string, position: PlayerPosition) => { // Renamed method
    updateTeamInTeams(currentTeam => ({
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
    updateTeamInTeams(currentTeam => {
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
    updateTeamInTeams(currentTeam => {
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
    updateTeamInTeams(currentTeam => {
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

  const createTeam = (name: string) => {
    const now = Date.now();
    const newTeam: Team = {
      id: now.toString(),
      name,
      startingPlayers: [],
      benchPlayers: [],
      createdBy: 'user1',
      sharedWith: [],
      lastEdited: now,
      editedBy: 'user1',
      sport: 'floorball',
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
        if (updated.length === 0) {
          setSelectedTeamId('');
        } else {
          setSelectedTeamId(updated[0].id);
        }
      }
      return updated;
    });
  };

  return (
    <TeamContext.Provider value={{ 
      team: selectedTeam, 
      teams,
      updatePlayerPosition, 
      addPlayer, 
      setPlayerType,  
      movePlayerToCourt, 
      movePlayerToBench,
      updatePlayerIndex,  
      createTeam,
      selectTeam,
      removeTeam,
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
