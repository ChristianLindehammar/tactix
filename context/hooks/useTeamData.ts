import { useState, useEffect } from 'react';
import { Team } from '@/types/models';
import { Sport } from '@/constants/sports';
import { loadTeamData, saveTeamData, StorageData, selectTeamForSport, updateSportTeamSelection } from '../utils';

export const useTeamData = (selectedSport: string) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [sportTeamSelections, setSportTeamSelections] = useState<Partial<Record<Sport, string>>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadTeamData();
        setTeams(data.teams);
        setSportTeamSelections(data.sportTeamSelections);
        
        // Select appropriate team for current sport
        const teamId = selectTeamForSport(
          data.teams,
          selectedSport,
          data.sportTeamSelections,
          data.selectedTeamId
        );
        setSelectedTeamId(teamId);
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedSport]);

  // Save data when state changes
  useEffect(() => {
    if (!isLoading) {
      saveTeamData({ teams });
    }
  }, [teams, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveTeamData({ selectedTeamId });
    }
  }, [selectedTeamId, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveTeamData({ sportTeamSelections });
    }
  }, [sportTeamSelections, isLoading]);

  // Update sport-team selection when team changes
  useEffect(() => {
    if (selectedTeamId && selectedSport && !isLoading) {
      const teamExists = teams.some(team => team.id === selectedTeamId && team.sport === selectedSport);
      if (teamExists) {
        setSportTeamSelections(prev => 
          updateSportTeamSelection(prev, selectedSport, selectedTeamId)
        );
      }
    }
  }, [selectedTeamId, selectedSport, teams, isLoading]);

  // Handle sport changes
  useEffect(() => {
    if (!isLoading && selectedSport) {
      const newTeamId = selectTeamForSport(
        teams,
        selectedSport,
        sportTeamSelections,
        selectedTeamId
      );
      
      if (newTeamId !== selectedTeamId) {
        setSelectedTeamId(newTeamId);
      }
    }
  }, [selectedSport, teams, isLoading]);

  const filteredTeams = teams.filter(team => team.sport === selectedSport);
  const selectedTeam = filteredTeams.find(t => t.id === selectedTeamId);

  return {
    teams,
    setTeams,
    selectedTeamId,
    setSelectedTeamId,
    sportTeamSelections,
    setSportTeamSelections,
    isLoading,
    filteredTeams,
    selectedTeam
  };
};
