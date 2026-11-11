import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTeamData } from '@/context/hooks/useTeamData';
import { Team } from '@/types/models';

const buildTeam = (id: string, sport: Team['sport']): Team => ({
  id,
  name: id,
  sport,
  startingPlayers: [],
  benchPlayers: [],
  createdBy: '',
  sharedWith: [],
  lastEdited: 0,
  editedBy: '',
});

describe('useTeamData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('teams', JSON.stringify([buildTeam('soccer-team', 'soccer')]));
  });

  it('keeps a team added just before switching to its sport', async () => {
    const { result, rerender } = renderHook(({ sport }) => useTeamData(sport), { initialProps: { sport: 'soccer' } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Like joining a shared floorball team: added, selected and switched to before anything is saved
    act(() => {
      result.current.setTeams(previous => [...previous, buildTeam('joined', 'floorball')]);
      result.current.setSelectedTeamId('joined');
    });
    rerender({ sport: 'floorball' });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(result.current.teams.map(team => team.id)).toEqual(['soccer-team', 'joined']);
    expect(result.current.selectedTeam?.id).toBe('joined');
  });

  it('picks the team last used in a sport when switching to it', async () => {
    await AsyncStorage.setItem('teams', JSON.stringify([
      buildTeam('soccer-team', 'soccer'),
      buildTeam('floorball-1', 'floorball'),
      buildTeam('floorball-2', 'floorball'),
    ]));
    await AsyncStorage.setItem('sportTeamSelections', JSON.stringify({ floorball: 'floorball-2' }));

    const { result, rerender } = renderHook(({ sport }) => useTeamData(sport), { initialProps: { sport: 'soccer' } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ sport: 'floorball' });

    await waitFor(() => expect(result.current.selectedTeam?.id).toBe('floorball-2'));
  });
});
