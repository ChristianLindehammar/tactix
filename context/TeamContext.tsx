import React, { createContext, PropsWithChildren, useContext } from 'react';
import { Team, PlayerType, Position } from '@/types/models';
import { useSport } from '@/context/SportContext';
import { useTranslation } from '@/hooks/useTranslation';
import { sportsConfig } from '@/constants/sports';
import { useTeamData } from './hooks/useTeamData';
import { findFreePosition, getValidPosition, validatePlayerPosition, exportTeamToFile, importTeamFromFile } from './utils';

interface TeamContextProps {
  team?: Team;
  teams: Team[];
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
}

export const TeamContext = createContext<TeamContextProps | undefined>(undefined);

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
    selectedTeam
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
    const newTeam = { ...importedTeam, id: now, name: finalName };
    setTeams(prev => [...prev, newTeam]);
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

  if (isLoading) {
    return null;
  }

  return (
    <TeamContext.Provider value={{ 
      team: selectedTeam, 
      teams: filteredTeams,
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
