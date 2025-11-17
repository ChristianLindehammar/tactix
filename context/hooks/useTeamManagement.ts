import { useCallback, useRef } from 'react';
import { Team } from '@/types/models';
import { createNewTeam } from '../utils/teamFactories';

interface UseTeamManagementProps {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  selectedTeamId: string;
  setSelectedTeamId: React.Dispatch<React.SetStateAction<string>>;
}

export const useTeamManagement = ({
  teams,
  setTeams,
  selectedTeamId,
  setSelectedTeamId,
}: UseTeamManagementProps) => {
  const idCounterRef = useRef(0);

  const createTeam = useCallback((name: string) => {
    if (!name.trim()) return; // Validate input

    const now = Date.now() + idCounterRef.current++;
    const newTeam = createNewTeam(name, now);

    setTeams(prev => [...prev, newTeam]);
    setSelectedTeamId(newTeam.id);
  }, [setTeams, setSelectedTeamId]);

  const selectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
  }, [setSelectedTeamId]);

  const removeTeam = useCallback((teamId: string) => {
    setTeams(prev => {
      const updated = prev.filter(team => team.id !== teamId);
      return updated;
    });

    // Auto-select another team if we're removing the selected one
    if (selectedTeamId === teamId) {
      setSelectedTeamId(prevId => {
        // Use functional update to get the latest teams
        const currentTeams = teams.filter(t => t.id !== teamId);
        return currentTeams.length > 0 ? currentTeams[0].id : '';
      });
    }
  }, [teams, selectedTeamId, setTeams, setSelectedTeamId]);

  const renameTeam = useCallback((teamId: string, newName: string) => {
    if (!newName.trim()) return; // Validate input

    setTeams(prev => prev.map(team =>
      team.id === teamId ? { ...team, name: newName.trim() } : team
    ));
  }, [setTeams]);

  const updateTeam = useCallback((updater: (team: Team) => Team) => {
    if (!selectedTeamId) return;

    setTeams(prev => prev.map(team =>
      team.id === selectedTeamId ? updater(team) : team
    ));
  }, [selectedTeamId, setTeams]);

  return {
    createTeam,
    selectTeam,
    removeTeam,
    renameTeam,
    updateTeam,
  };
};
