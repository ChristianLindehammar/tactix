import React, { createContext, useState, PropsWithChildren, useContext, useEffect } from 'react';
import { Team, PlayerType, Position } from '@/types/models';
import { getItem, setItem } from '../app/utils/AsyncStorage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSport } from '@/context/SportContext';
import { Platform, Alert } from 'react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { sportsConfig } from '@/constants/sports';

const FILE_EXTENSION = '.coachmate';
const FILE_MIME_TYPE = 'application/coachmate';

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
  movePlayerToCourt: (playerId: string) => void;
  findFreePosition: () => Position;
}

export const TeamContext = createContext<TeamContextProps | undefined>(undefined);

const TEAMS_STORAGE_KEY = 'teams';
const SELECTED_TEAM_KEY = 'selectedTeamId';

const getValidPosition = (position: string, sport: string): string => {
  // Make sure the sport exists in sportsConfig, fallback to 'soccer' if not
  const safeSport = sport in sportsConfig ? sport : 'soccer';
  const availablePositions = sportsConfig[safeSport as keyof typeof sportsConfig].positions;
  return availablePositions.includes(position) ? position : availablePositions[0];
};

export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { selectedSport, setSelectedSport } = useSport();
  const { t } = useTranslation();

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedTeams = await getItem(TEAMS_STORAGE_KEY);
        const storedSelectedId = await getItem(SELECTED_TEAM_KEY);
        
        if (storedTeams) {
          setTeams(storedTeams);
            if (storedSelectedId && storedTeams.some((t: Team) => t.id === storedSelectedId)) {
            setSelectedTeamId(storedSelectedId as string);
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
    const spacing = 0.1;
    const padding = 0.05;

    const isPositionTaken = (pos: Position): boolean => {
      if (!selectedTeam) return false;
      return [...selectedTeam.startingPlayers, ...selectedTeam.benchPlayers].some(p => {
        if (!p.courtPosition) return false;
        const dx = p.courtPosition.x - pos.x;
        const dy = p.courtPosition.y - pos.y;
        // Check if positions are too close
        return Math.sqrt(dx * dx + dy * dy) < spacing / 2;
      });
    };

    const maxRows = Math.floor((1 - padding * 2) / spacing);

    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < maxRows; col++) {
        const x = padding + col * spacing;
        const y = padding + row * spacing;
        const candidate = { x, y };

        if (!isPositionTaken(candidate)) {
          return candidate;
        }
      }
    }

    // Fallback if grid is full
    return { x: 0.5, y: 0.5 };
  };

  const addPlayer = (name: string) => {
    const position = findFreePosition();
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
        // Process players that need positions assigned (marked with null courtPosition)
        const processedCourtPlayers = courtPlayers.map(player => {
          // If player has no position or invalid position, find a free one
          if (!player.courtPosition || 
              player.courtPosition.x < 0 || player.courtPosition.x > 1 || 
              player.courtPosition.y < 0 || player.courtPosition.y > 1) {
            return {
              ...player,
              courtPosition: findFreePosition()
            };
          }
          return player;
        });
        
        // Also validate bench players' positions in case they're loaded with errors
        const processedBenchPlayers = benchPlayers.map(player => {
          if (player.courtPosition &&
             (player.courtPosition.x < 0 || player.courtPosition.x > 1 || 
              player.courtPosition.y < 0 || player.courtPosition.y > 1)) {
            return {
              ...player,
              courtPosition: { x: 0.5, y: 0.5 }  // Standard reset for bench players
            };
          }
          return player;
        });
        
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
          t('exportTeam'),
          t('howToExportTeam'),
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
          Alert.alert(t('error'), t('sharingNotAvailable'));
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
      Alert.alert(t('error'), t('failedToExportTeam'));
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

  const importTeamFromFile = async (fileUri: string): Promise<Team> => {
    try {
      const contents = await FileSystem.readAsStringAsync(fileUri);
      const parsed: Team = JSON.parse(contents);
      await importTeam(parsed);
      return parsed;
    } catch (err) {
      console.error('Error importing team file:', err);
      throw new Error('Failed to import team file');
    }
  };

  // Move player from court to bench
  const movePlayerToBench = (playerId: string) => {
    updateTeamInTeams(currentTeam => {
      // Find the player in starting players
      const playerToMove = currentTeam.startingPlayers.find(p => p.id === playerId);
      
      // If player not found on court, do nothing
      if (!playerToMove) return currentTeam;
      
      // Remove player from starting players and add to bench, clearing court position
      return {
        ...currentTeam,
        startingPlayers: currentTeam.startingPlayers.filter(p => p.id !== playerId),
        // Add player to bench and set courtPosition to undefined
        benchPlayers: [...currentTeam.benchPlayers, { ...playerToMove, courtPosition: undefined }] 
      };
    });
  };

  // Move player from bench to court
  const movePlayerToCourt = (playerId: string) => {
    updateTeamInTeams(currentTeam => {
      // Find the player on the bench
      const playerToMove = currentTeam.benchPlayers.find(p => p.id === playerId);
      
      // If player not found on bench, do nothing
      if (!playerToMove) return currentTeam;

      // Find a free position for the player moving to court
      const newPosition = findFreePosition(); 
      
      // Remove player from bench and add to starting players with the new position
      return {
        ...currentTeam,
        benchPlayers: currentTeam.benchPlayers.filter(p => p.id !== playerId),
        // Add player to court with an assigned courtPosition
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
      importTeamFromFile,
      setPlayers,
      movePlayerToBench,
      movePlayerToCourt,
      findFreePosition,
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
