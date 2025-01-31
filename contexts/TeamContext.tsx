import React, { createContext, useState, PropsWithChildren, useContext, useEffect } from 'react';
import { Team, PlayerType, Position, PlayerPosition } from '@/types/models';
import { LAYOUT } from '@/constants/layout';
import { getItem, setItem } from '../app/utils/AsyncStorage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSport } from '@/context/SportContext';
import { Platform, Alert } from 'react-native';

const FILE_EXTENSION = '.coachmate';
const FILE_MIME_TYPE = 'application/coachmate';

interface TeamContextProps {
  team?: Team;
  teams: Team[];
  updatePlayerPosition: (playerId: string, position: { x: number; y: number }) => void;
  addPlayer: (name: string) => void;
  setPlayerType: (playerId: string, position: PlayerPosition) => void;
  createTeam: (name: string) => void;
  selectTeam: (teamId: string) => void;
  removeTeam: (teamId: string) => void;
  renameTeam: (teamId: string, newName: string) => void;
  renamePlayer: (playerId: string, newName: string) => void;
  deletePlayer: (playerId: string) => void;
  exportTeam: (teamId: string) => void;
  importTeam: (importedTeam: Team) => void;
  importTeamFromFile: (fileUri: string) => Promise<void>;
  setPlayers: (courtPlayers: PlayerType[], benchPlayers: PlayerType[]) => void;
}

export const TeamContext = createContext<TeamContextProps | undefined>(undefined);

const TEAMS_STORAGE_KEY = 'teams';
const SELECTED_TEAM_KEY = 'selectedTeamId';

export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { selectedSport, setSelectedSport } = useSport();

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedTeams = await getItem(TEAMS_STORAGE_KEY);
        const storedSelectedId = await getItem(SELECTED_TEAM_KEY);
        
        if (storedTeams) {
          setTeams(storedTeams);
          if (storedSelectedId && storedTeams.some(t => t.id === storedSelectedId)) {
            setSelectedTeamId(storedSelectedId);
          } else if (storedTeams.length > 0) {
            setSelectedTeamId(storedTeams[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setItem(TEAMS_STORAGE_KEY, teams);
    }
  }, [teams, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setItem(SELECTED_TEAM_KEY, selectedTeamId);
    }
  }, [selectedTeamId, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      const teamsInSport = teams.filter(team => team.sport === selectedSport);
      if (teamsInSport.length > 0) {
        if (!teamsInSport.some(team => team.id === selectedTeamId)) {
          setSelectedTeamId(teamsInSport[0].id);
        }
      } else {
        setSelectedTeamId('');
      }
    }
  }, [selectedSport, teams, isLoading]);

  const filteredTeams = teams.filter(team => team.sport === selectedSport);
  const selectedTeam = filteredTeams.find(t => t.id === selectedTeamId);

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

    const isPositionTaken = (pos: Position): boolean => {
      if (!selectedTeam) return false;
      return [...selectedTeam.startingPlayers, ...selectedTeam.benchPlayers].some(
        player => player.courtPosition && 
                  Math.abs(player.courtPosition.x - pos.x) < (playerSize / LAYOUT.FLOORBALL_COURT.WIDTH) && 
                  Math.abs(player.courtPosition.y - pos.y) < (playerSize / LAYOUT.FLOORBALL_COURT.HEIGHT)
      );
    };

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
      courtPosition: position,
      position: PlayerPosition.Forward,
    };
    
    updateTeamInTeams(currentTeam => ({
      ...currentTeam,
      benchPlayers: [...currentTeam.benchPlayers, newPlayer],
    }));
  };

  const setPlayerType = (playerId: string, position: PlayerPosition) => {
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

  const setPlayers = (courtPlayers: PlayerType[], benchPlayers: PlayerType[]) => {
    setTeams(prevTeams => prevTeams.map(team => {
      if (team.id === selectedTeamId) {
        return {
          ...team,
          startingPlayers: courtPlayers,
          benchPlayers: benchPlayers,
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
      sport: selectedSport,
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

  const renameTeam = (teamId: string, newName: string) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, name: newName, lastEdited: Date.now() }
        : team
    ));
  };

  const renamePlayer = (playerId: string, newName: string) => {
    setTeams(prevTeams => 
      prevTeams.map(t => {
        if (t.id === selectedTeamId) {
          return {
            ...t,
            startingPlayers: t.startingPlayers.map(p => 
              p.id === playerId ? { ...p, name: newName } : p
            ),
            benchPlayers: t.benchPlayers.map(p => 
              p.id === playerId ? { ...p, name: newName } : p
            ),
          };
        }
        return t;
      })
    );
  };

  const deletePlayer = (playerId: string) => {
    setTeams(prevTeams => 
      prevTeams.map(t => {
        if (t.id === selectedTeamId) {
          return {
            ...t,
            startingPlayers: t.startingPlayers.filter(p => p.id !== playerId),
            benchPlayers: t.benchPlayers.filter(p => p.id !== playerId),
          };
        }
        return t;
      })
    );
  };

  const sanitizeFileName = (name: string): string => {
    return name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 50);
  };

  const exportTeam = async (teamId: string) => {
    try {
      const teamToExport = teams.find(t => t.id === teamId);
      if (!teamToExport) return;
  
      const sanitizedName = sanitizeFileName(teamToExport.name);
      const fileContent = JSON.stringify(teamToExport, null, 2);
  
      if (Platform.OS === "android") {
        Alert.alert(
          'Export Team',
          'How would you like to export the team?',
          [
            {
              text: 'Save to Files',
              onPress: async () => {
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                
                if (permissions.granted) {
                  const tempUri = `${FileSystem.cacheDirectory}${sanitizedName}${FILE_EXTENSION}`;
                  await FileSystem.writeAsStringAsync(tempUri, fileContent);
                  
                  const base64 = await FileSystem.readAsStringAsync(tempUri, { 
                    encoding: FileSystem.EncodingType.Base64 
                  });
  
                  await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri, 
                    `${sanitizedName}${FILE_EXTENSION}`, 
                    FILE_MIME_TYPE
                  ).then(async (uri) => {
                    await FileSystem.writeAsStringAsync(uri, base64, { 
                      encoding: FileSystem.EncodingType.Base64 
                    });
                  });
  
                  await FileSystem.deleteAsync(tempUri, { idempotent: true });
                }
              }
            },
            {
              text: 'Share',
              onPress: async () => {
                const tempUri = `${FileSystem.cacheDirectory}${sanitizedName}${FILE_EXTENSION}`;
                await FileSystem.writeAsStringAsync(tempUri, fileContent);
                await Sharing.shareAsync(tempUri, {
                  mimeType: FILE_MIME_TYPE,
                  dialogTitle: `Share ${teamToExport.name}`,
                  UTI: 'public.data'
                });
                await FileSystem.deleteAsync(tempUri, { idempotent: true });
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${sanitizedName}${FILE_EXTENSION}`;
        await FileSystem.writeAsStringAsync(fileUri, fileContent);
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          alert('Sharing is not available on this device');
          return;
        }
        
        await Sharing.shareAsync(fileUri, {
          mimeType: FILE_MIME_TYPE,
          dialogTitle: `Share ${teamToExport.name}`,
          UTI: 'public.data'  
        });
        
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
    } catch (error) {
      console.error('Error exporting team:', error);
      alert('Failed to export team');
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

    console.log('All teams:', teams.map(t => t.id));
    setSelectedTeamId(now);
  };

  const importTeamFromFile = async (fileUri: string) => {
    try {
      const contents = await FileSystem.readAsStringAsync(fileUri);
      const parsed: Team = JSON.parse(contents);
      await importTeam(parsed);
    } catch (err) {
      console.error('Error importing team file:', err);
    }
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
      importTeamFromFile,
      setPlayers,
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
