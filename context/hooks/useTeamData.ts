import { loadTeamData, saveTeamData, selectTeamForSport, updateSportTeamSelection } from '../utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Sport } from '@/constants/sports';
import { Team } from '@/types/models';
import { useDebouncedPersistence } from './useDebouncedPersistence';
import { useErrorHandler } from './useErrorHandler';

export const useTeamData = (selectedSport: string) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [sportTeamSelections, setSportTeamSelections] = useState<Partial<Record<Sport, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const { error, handleError } = useErrorHandler();

  // Memoized persistence function to prevent unnecessary re-creates
  const persistData = useCallback(async (data: {
    teams: Team[];
    selectedTeamId: string;
    sportTeamSelections: Partial<Record<Sport, string>>;
  }) => {
    try {
      await saveTeamData(data);
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError]);

  // Debounced persistence
  useDebouncedPersistence(
    { teams, selectedTeamId, sportTeamSelections },
    persistData,
    300,
    !isLoading
  );

  // Load initial data with error handling
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadTeamData();

        // Merge stored teams with any in-memory teams that may have been created
        // before hydration completes (e.g. during tests or very fast user actions).
        setTeams(prevTeams => {
          const storedTeams = data.teams || [];

          if (prevTeams.length === 0) {
            return storedTeams;
          }

          if (storedTeams.length === 0) {
            return prevTeams;
          }

          const existingIds = new Set(prevTeams.map(team => team.id));
          const merged = [...prevTeams];

          for (const team of storedTeams) {
            if (!existingIds.has(team.id)) {
              merged.push(team);
            }
          }

          return merged;
        });

        // Merge sport-team selections, giving precedence to any mappings that
        // were already set in memory.
        setSportTeamSelections(prevSelections => ({
          ...(data.sportTeamSelections || {}),
          ...prevSelections,
        }));

        // Only apply stored selection if nothing has selected a team yet.
        const teamIdFromStorage = selectTeamForSport(
          data.teams,
          selectedSport,
          data.sportTeamSelections,
          data.selectedTeamId
        );

        setSelectedTeamId(prevSelectedId => prevSelectedId || teamIdFromStorage);
      } catch (error) {
        handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedSport, handleError]);

  // Update sport-team mapping when team selection changes (simplified)
  useEffect(() => {
    if (!isLoading && selectedTeamId && selectedSport) {
      const teamExists = teams.some(team => team.id === selectedTeamId && team.sport === selectedSport);
      if (teamExists) {
        const currentMapping = sportTeamSelections[selectedSport as Sport];
        // Only update if the mapping is actually different
        if (currentMapping !== selectedTeamId) {
          setSportTeamSelections(prev => {
            // Double-check we're not setting the same value
            if (prev[selectedSport as Sport] !== selectedTeamId) {
              return updateSportTeamSelection(prev, selectedSport, selectedTeamId);
            }
            return prev;
          });
        }
      }
    }
  }, [selectedTeamId, selectedSport, teams, isLoading]); // Removed sportTeamSelections from deps

  // Handle sport changes (simplified)
  useEffect(() => {
    if (!isLoading && selectedSport && teams.length > 0) {
      const teamsForSport = teams.filter(team => team.sport === selectedSport);
      
      if (teamsForSport.length > 0) {
        // Check if current selection is valid for this sport
        const currentTeamValid = teamsForSport.some(team => team.id === selectedTeamId);
        
        if (!currentTeamValid) {
          // Try to use stored preference for this sport
          const preferredTeamId = sportTeamSelections[selectedSport as Sport];
          const preferredTeamExists = preferredTeamId && teamsForSport.some(team => team.id === preferredTeamId);
          
          const newTeamId = preferredTeamExists ? preferredTeamId! : teamsForSport[0].id;
          
          // Only update if different to prevent loops
          if (newTeamId !== selectedTeamId) {
            setSelectedTeamId(newTeamId);
          }
        }
      } else {
        // No teams for this sport - only clear if currently has a value
        if (selectedTeamId !== '') {
          setSelectedTeamId('');
        }
      }
    }
  }, [selectedSport, teams, isLoading, sportTeamSelections]); // Removed selectedTeamId from deps to prevent loops

  // Memoized computed values for better performance
  const filteredTeams = useMemo(() => 
    teams.filter(team => team.sport === selectedSport), 
    [teams, selectedSport]
  );
  
  const selectedTeam = useMemo(() => 
    filteredTeams.find(t => t.id === selectedTeamId), 
    [filteredTeams, selectedTeamId]
  );

  return {
    teams,
    setTeams,
    selectedTeamId,
    setSelectedTeamId,
    sportTeamSelections,
    setSportTeamSelections,
    isLoading,
    filteredTeams,
    selectedTeam,
    error
  };
};
