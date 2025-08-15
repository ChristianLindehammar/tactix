import { Team } from '@/types/models';
import { Sport } from '@/constants/sports';

export const selectTeamForSport = (
  teams: Team[],
  selectedSport: string,
  sportTeamSelections: Partial<Record<Sport, string>>,
  fallbackTeamId?: string
): string => {
  const teamsInSport = teams.filter(team => team.sport === selectedSport);
  
  if (teamsInSport.length === 0) {
    return '';
  }

  // Check if we have a stored preference for this sport
  const preferredTeamId = sportTeamSelections[selectedSport as Sport];
  if (preferredTeamId && teamsInSport.some(team => team.id === preferredTeamId)) {
    return preferredTeamId;
  }

  // Check if the fallback team is valid for this sport
  if (fallbackTeamId && teamsInSport.some(team => team.id === fallbackTeamId)) {
    return fallbackTeamId;
  }

  // Return the first team for this sport
  return teamsInSport[0].id;
};

export const updateSportTeamSelection = (
  currentSelections: Partial<Record<Sport, string>>,
  sport: string,
  teamId: string
): Partial<Record<Sport, string>> => {
  return {
    ...currentSelections,
    [sport]: teamId
  };
};
