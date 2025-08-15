import { useState, useCallback, useMemo } from 'react';
import { Team } from '@/types/models';
import { Sport } from '@/constants/sports';

interface TeamState {
  teams: Team[];
  selectedTeamId: string;
  sportTeamSelections: Partial<Record<Sport, string>>;
}

export const useTeamState = (initialState: TeamState, selectedSport: string) => {
  const [state, setState] = useState<TeamState>(initialState);

  const updateTeams = useCallback((teams: Team[]) => {
    setState(prev => ({ ...prev, teams }));
  }, []);

  const updateSelectedTeamId = useCallback((selectedTeamId: string) => {
    setState(prev => ({ ...prev, selectedTeamId }));
  }, []);

  const updateSportTeamSelections = useCallback((sportTeamSelections: Partial<Record<Sport, string>>) => {
    setState(prev => ({ ...prev, sportTeamSelections }));
  }, []);

  const updateSportSelection = useCallback((sport: string, teamId: string) => {
    setState(prev => ({
      ...prev,
      sportTeamSelections: {
        ...prev.sportTeamSelections,
        [sport]: teamId
      }
    }));
  }, []);

  // Computed values
  const filteredTeams = useMemo(() => 
    state.teams.filter(team => team.sport === selectedSport), 
    [state.teams, selectedSport]
  );

  const selectedTeam = useMemo(() => 
    filteredTeams.find(t => t.id === state.selectedTeamId), 
    [filteredTeams, state.selectedTeamId]
  );

  return {
    ...state,
    updateTeams,
    updateSelectedTeamId,
    updateSportTeamSelections,
    updateSportSelection,
    filteredTeams,
    selectedTeam,
    setState
  };
};
