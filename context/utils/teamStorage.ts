import { Team } from '@/types/models';
import { Sport } from '@/constants/sports';
import { getItem, setItem } from '../../app/utils/AsyncStorage';

export const TEAMS_STORAGE_KEY = 'teams';
export const SELECTED_TEAM_KEY = 'selectedTeamId';
export const SPORT_TEAM_SELECTIONS_KEY = 'sportTeamSelections';

export interface StorageData {
  teams: Team[];
  selectedTeamId: string;
  sportTeamSelections: Partial<Record<Sport, string>>;
}

export const loadTeamData = async (): Promise<StorageData> => {
  try {
    const [teams, selectedTeamId, sportTeamSelections] = await Promise.all([
      getItem(TEAMS_STORAGE_KEY),
      getItem(SELECTED_TEAM_KEY),
      getItem(SPORT_TEAM_SELECTIONS_KEY)
    ]);

    return {
      teams: teams || [],
      selectedTeamId: selectedTeamId || '',
      sportTeamSelections: sportTeamSelections || {}
    };
  } catch (error) {
    console.error('Error loading team data:', error);
    return {
      teams: [],
      selectedTeamId: '',
      sportTeamSelections: {}
    };
  }
};

export const saveTeamData = async (data: Partial<StorageData>) => {
  try {
    const promises = [];
    
    if (data.teams !== undefined) {
      promises.push(setItem(TEAMS_STORAGE_KEY, data.teams));
    }
    
    if (data.selectedTeamId !== undefined) {
      promises.push(setItem(SELECTED_TEAM_KEY, data.selectedTeamId));
    }
    
    if (data.sportTeamSelections !== undefined) {
      promises.push(setItem(SPORT_TEAM_SELECTIONS_KEY, data.sportTeamSelections));
    }
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error saving team data:', error);
  }
};
