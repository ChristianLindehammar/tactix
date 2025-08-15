import { useEffect, useRef } from 'react';
import { Team } from '@/types/models';
import { Sport } from '@/constants/sports';
import { selectTeamForSport, updateSportTeamSelection } from '../utils';

interface UseTeamSelectionProps {
  teams: Team[];
  selectedSport: string;
  selectedTeamId: string;
  sportTeamSelections: Partial<Record<Sport, string>>;
  isLoading: boolean;
  setSelectedTeamId: (id: string) => void;
  setSportTeamSelections: (selections: Partial<Record<Sport, string>>) => void;
}

export const useTeamSelection = ({
  teams,
  selectedSport,
  selectedTeamId,
  sportTeamSelections,
  isLoading,
  setSelectedTeamId,
  setSportTeamSelections
}: UseTeamSelectionProps) => {
  const previousSportRef = useRef<string | undefined>(undefined);
  const hasInitializedRef = useRef(false);
  const lastUpdateRef = useRef<{ sport: string; teamId: string } | null>(null);

  // Handle sport changes
  useEffect(() => {
    if (isLoading || !selectedSport) return;

    const sportChanged = previousSportRef.current !== selectedSport;
    previousSportRef.current = selectedSport;

    if (sportChanged && hasInitializedRef.current) {
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

    hasInitializedRef.current = true;
  }, [selectedSport, teams, isLoading, setSelectedTeamId]);

  // Update sport-team mapping when team selection changes
  useEffect(() => {
    if (selectedTeamId && selectedSport && !isLoading && hasInitializedRef.current) {
      const teamExists = teams.some(team => team.id === selectedTeamId && team.sport === selectedSport);
      if (teamExists) {
        // Check if we already updated this combination to prevent loops
        const updateKey = `${selectedSport}-${selectedTeamId}`;
        const lastUpdate = lastUpdateRef.current;
        
        if (!lastUpdate || `${lastUpdate.sport}-${lastUpdate.teamId}` !== updateKey) {
          lastUpdateRef.current = { sport: selectedSport, teamId: selectedTeamId };
          setSportTeamSelections(
            updateSportTeamSelection(sportTeamSelections, selectedSport, selectedTeamId)
          );
        }
      }
    }
  }, [selectedTeamId, selectedSport, teams, isLoading, setSportTeamSelections]);
};
