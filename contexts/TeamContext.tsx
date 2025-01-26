import React, { createContext, useState, PropsWithChildren, useContext, useEffect } from 'react';
import { Team, PlayerType, Position, PlayerPosition } from '@/types/models';
import { LAYOUT } from '@/constants/layout';
import { getItem, setItem } from '../app/utils/AsyncStorage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSport } from '@/context/SportContext';
import { Platform, Alert } from 'react-native';

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
  renameTeam: (teamId: string, newName: string) => void; // Add this
  renamePlayer: (playerId: string, newName: string) => void; // Add this
  deletePlayer: (playerId: string) => void; // Add this
  exportTeam: (teamId: string) => void; // Add this
  importTeam: (importedTeam: Team) => void; // Add this
  importTeamFromFile: (fileUri: string) => Promise<void>; // Add this
}

export const TeamContext = createContext<TeamContextProps | undefined>(undefined);

const TEAMS_STORAGE_KEY = 'teams';
const SELECTED_TEAM_KEY = 'selectedTeamId';

export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { selectedSport } = useSport();

  // Load initial data
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

  // Save teams whenever they change
  useEffect(() => {
    if (!isLoading) {
      setItem(TEAMS_STORAGE_KEY, teams);
    }
  }, [teams, isLoading]);

  // Save selected team whenever it changes
  useEffect(() => {
    if (!isLoading) {
      setItem(SELECTED_TEAM_KEY, selectedTeamId);
    }
  }, [selectedTeamId, isLoading]);

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
      .replace(/[^a-z0-9]/gi, '_') // Replace any non-alphanumeric characters with underscore
      .toLowerCase()
      .slice(0, 50); // Limit length to 50 characters
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
                  // First write to cache
                  const tempUri = `${FileSystem.cacheDirectory}${sanitizedName}.json`;
                  await FileSystem.writeAsStringAsync(tempUri, fileContent);
                  
                  // Read as base64
                  const base64 = await FileSystem.readAsStringAsync(tempUri, { 
                    encoding: FileSystem.EncodingType.Base64 
                  });
  
                  // Save to user selected directory
                  await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri, 
                    sanitizedName, 
                    'application/json'
                  ).then(async (uri) => {
                    await FileSystem.writeAsStringAsync(uri, base64, { 
                      encoding: FileSystem.EncodingType.Base64 
                    });
                  });
  
                  // Clean up temp file
                  await FileSystem.deleteAsync(tempUri, { idempotent: true });
                }
              }
            },
            {
              text: 'Share',
              onPress: async () => {
                const tempUri = `${FileSystem.cacheDirectory}${sanitizedName}.json`;
                await FileSystem.writeAsStringAsync(tempUri, fileContent);
                await Sharing.shareAsync(tempUri, {
                  mimeType: 'text/plain',
                  dialogTitle: `Share ${teamToExport.name}`,
                  UTI: 'public.plain-text'
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
        // iOS implementation remains unchanged
        const fileUri = `${FileSystem.cacheDirectory}${sanitizedName}.tactix`;
        await FileSystem.writeAsStringAsync(fileUri, fileContent);
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          alert('Sharing is not available on this device');
          return;
        }
        
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: `Share ${teamToExport.name}`,
          UTI: 'public.plain-text'
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
    let finalName = importedTeam.name;
    let counter = 1;
    while (teams.some(t => t.name === finalName)) {
      finalName = `${importedTeam.name} (${counter++})`;
    }
    const now = Date.now().toString();
    const newTeam = { ...importedTeam, id: now, name: finalName };
    setTeams(prev => [...prev, newTeam]);

    // log all teams ids
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
    return null; // or return a loading spinner
  }

  return (
    <TeamContext.Provider value={{ 
      team: selectedTeam, 
      teams: filteredTeams,
      updatePlayerPosition, 
      addPlayer, 
      setPlayerType,  
      movePlayerToCourt, 
      movePlayerToBench,
      updatePlayerIndex,  
      createTeam,
      selectTeam,
      removeTeam,
      renameTeam,
      renamePlayer,
      deletePlayer,
      exportTeam,
      importTeam,
      importTeamFromFile,
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
