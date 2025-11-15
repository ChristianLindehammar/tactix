import { CourtConfiguration, PlayerType, Team } from '@/types/models';
import { TeamProvider, useTeam } from '../TeamContextNew';
import { act, render, renderHook } from '@testing-library/react-native';

import React from 'react';

// Mock dependencies
jest.mock('@/context/SportContext', () => ({
  useSport: () => ({
    selectedSport: 'soccer',
    setSelectedSport: jest.fn(),
  }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../hooks/useTeamData', () => ({
  useTeamData: () => ({
    teams: [],
    setTeams: jest.fn(),
    selectedTeamId: '',
    setSelectedTeamId: jest.fn(),
    isLoading: false,
    filteredTeams: [],
    selectedTeam: undefined,
    error: null,
  }),
}));

// Test helpers
const createTestTeam = (result: any, teamName = 'Test Team') => {
  act(() => {
    result.current.createTeam(teamName);
  });
  return result.current.teams[0]?.id;
};

const selectTestTeam = (result: any, teamId: string) => {
  act(() => {
    result.current.selectTeam(teamId);
  });
};

const addTestPlayer = (result: any, playerName = 'Test Player') => {
  act(() => {
    result.current.addPlayer(playerName);
  });
  return result.current.team?.benchPlayers[0]?.id;
};

describe('TeamContext', () => {
  const renderWithProvider = (children: React.ReactNode) => {
    return render(<TeamProvider>{children}</TeamProvider>);
  };

  const renderHookWithProvider = <T,>(hook: () => T) => {
    return renderHook(hook, {
      wrapper: ({ children }) => <TeamProvider>{children}</TeamProvider>,
    });
  };

  describe('Provider Setup', () => {

    it('should provide context with all required methods and properties', () => {
      const TestComponent = () => {
        const context = useTeam();

        // This test will fail if any required property/method is missing
        expect(context.teams).toBeDefined();
        expect(context.team).toBeUndefined(); // team should be undefined when no team is selected
        expect(context.error).toBeDefined();
        expect(typeof context.createTeam).toBe('function');
        expect(typeof context.selectTeam).toBe('function');
        expect(typeof context.removeTeam).toBe('function');
        expect(typeof context.renameTeam).toBe('function');
        expect(typeof context.addPlayer).toBe('function');
        expect(typeof context.renamePlayer).toBe('function');
        expect(typeof context.deletePlayer).toBe('function');
        expect(typeof context.updatePlayerPosition).toBe('function');
        expect(typeof context.setPlayerType).toBe('function');
        expect(typeof context.movePlayerToBench).toBe('function');
        expect(typeof context.movePlayerToCourt).toBe('function');
        expect(typeof context.setPlayers).toBe('function');
        expect(typeof context.findFreePosition).toBe('function');
        expect(typeof context.exportTeam).toBe('function');
        expect(typeof context.importTeam).toBe('function');
        expect(typeof context.importTeamFromFile).toBe('function');
        expect(typeof context.createConfiguration).toBe('function');
        expect(typeof context.selectConfiguration).toBe('function');
        expect(typeof context.renameConfiguration).toBe('function');
        expect(typeof context.deleteConfiguration).toBe('function');
        expect(typeof context.getActiveConfiguration).toBe('function');
        expect(typeof context.switchToNextConfiguration).toBe('function');
        expect(typeof context.switchToPreviousConfiguration).toBe('function');

        return null;
      };

      renderWithProvider(<TestComponent />);
    });

    it('should throw error when useTeam is used outside provider', () => {
      const TestComponent = () => {
        useTeam();
        return null;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Team Management', () => {
    it('should create a new team', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      // This test will fail initially - that's the point of TDD
      expect(result.current.teams).toHaveLength(1);
      expect(result.current.teams[0].name).toBe('Test Team');
    });

    it('should select a team', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;
      
      act(() => {
        result.current.selectTeam(teamId);
      });

      expect(result.current.team?.id).toBe(teamId);
    });

    it('should rename a team', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Original Name');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.renameTeam(teamId, 'New Name');
      });

      expect(result.current.teams[0].name).toBe('New Name');
    });

    it('should remove a team', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Team to Remove');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.removeTeam(teamId);
      });

      expect(result.current.teams).toHaveLength(0);
    });
  });

  describe('Player Management', () => {
    it('should add a player to the team', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result);
      selectTestTeam(result, teamId);
      addTestPlayer(result, 'John Doe');

      expect(result.current.team?.benchPlayers).toHaveLength(1);
      expect(result.current.team?.benchPlayers[0].name).toBe('John Doe');
    });

    it('should rename a player', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
      });

      act(() => {
        result.current.addPlayer('Original Name');
      });

      const playerId = result.current.team?.benchPlayers[0]?.id;

      act(() => {
        result.current.renamePlayer(playerId!, 'New Name');
      });

      expect(result.current.team?.benchPlayers[0].name).toBe('New Name');
    });

    it('should delete a player', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
      });

      act(() => {
        result.current.addPlayer('Player to Delete');
      });

      const playerId = result.current.team?.benchPlayers[0]?.id;

      act(() => {
        result.current.deletePlayer(playerId!);
      });

      expect(result.current.team?.benchPlayers).toHaveLength(0);
    });

    it('should move player from bench to court', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
      });

      act(() => {
        result.current.addPlayer('Bench Player');
      });

      const playerId = result.current.team?.benchPlayers[0]?.id;

      act(() => {
        result.current.movePlayerToCourt(playerId!);
      });

      expect(result.current.team?.startingPlayers).toHaveLength(1);
      expect(result.current.team?.benchPlayers).toHaveLength(0);
    });

    it('should move player from court to bench', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
      });

      act(() => {
        result.current.addPlayer('Court Player');
      });

      const playerId = result.current.team?.benchPlayers[0]?.id;

      act(() => {
        result.current.movePlayerToCourt(playerId!);
      });

      const courtPlayerId = result.current.team?.startingPlayers[0]?.id;

      act(() => {
        result.current.movePlayerToBench(courtPlayerId!);
      });

      expect(result.current.team?.startingPlayers).toHaveLength(0);
      expect(result.current.team?.benchPlayers).toHaveLength(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle adding player when no team is selected', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.addPlayer('Player Without Team');
      });

      // Should not crash and should not add player
      expect(result.current.teams).toHaveLength(0);
    });

    it('should handle renaming non-existent player gracefully', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
      });

      act(() => {
        result.current.renamePlayer('non-existent-id', 'New Name');
      });

      // Should not crash
      expect(result.current.team?.benchPlayers).toHaveLength(0);
      expect(result.current.team?.startingPlayers).toHaveLength(0);
    });

    it('should handle moving non-existent player gracefully', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
      });

      act(() => {
        result.current.movePlayerToCourt('non-existent-id');
        result.current.movePlayerToBench('non-existent-id');
      });

      // Should not crash
      expect(result.current.team?.benchPlayers).toHaveLength(0);
      expect(result.current.team?.startingPlayers).toHaveLength(0);
    });

    it('should handle team operations with empty team list', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.selectTeam('non-existent-id');
        result.current.removeTeam('non-existent-id');
        result.current.renameTeam('non-existent-id', 'New Name');
      });

      // Should not crash
      expect(result.current.teams).toHaveLength(0);
      expect(result.current.team).toBeUndefined();
    });
  });

  describe('Player Position Management', () => {
    it('should update player position', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result);
      selectTestTeam(result, teamId);
      const playerId = addTestPlayer(result);

      const newPosition = { x: 0.8, y: 0.3 };

      act(() => {
        result.current.updatePlayerPosition(playerId!, newPosition);
      });

      expect(result.current.team?.benchPlayers[0].courtPosition).toEqual(newPosition);
    });

    it('should set player type', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
        result.current.addPlayer('Test Player');
      });

      const playerId = result.current.team?.benchPlayers[0]?.id;

      act(() => {
        result.current.setPlayerType(playerId!, 'goalkeeper');
      });

      expect(result.current.team?.benchPlayers[0].position).toBe('goalkeeper');
    });

    it('should validate position bounds when updating player position', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
        result.current.addPlayer('Test Player');
      });

      const playerId = result.current.team?.benchPlayers[0]?.id;

      // Test position clamping
      act(() => {
        result.current.updatePlayerPosition(playerId!, { x: -0.5, y: 1.5 });
      });

      expect(result.current.team?.benchPlayers[0].courtPosition).toEqual({ x: 0, y: 1 });
    });

    it('should find free position correctly', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
      });

      const freePosition = result.current.findFreePosition();

      expect(freePosition.x).toBeGreaterThanOrEqual(0);
      expect(freePosition.x).toBeLessThanOrEqual(1);
      expect(freePosition.y).toBeGreaterThanOrEqual(0);
      expect(freePosition.y).toBeLessThanOrEqual(1);
    });
  });

  describe('Input Validation', () => {
    it('should handle empty team names gracefully', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('');
        result.current.createTeam('   ');
      });

      expect(result.current.teams).toHaveLength(0);
    });

    it('should handle empty player names gracefully', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('Test Team');
      });

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
        result.current.addPlayer('');
        result.current.addPlayer('   ');
      });

      expect(result.current.team?.benchPlayers).toHaveLength(0);
    });

    it('should trim whitespace from names', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createTeam('  Test Team  ');
      });

      expect(result.current.teams[0].name).toBe('Test Team');

      const teamId = result.current.teams[0]?.id;

      act(() => {
        result.current.selectTeam(teamId);
        result.current.addPlayer('  John Doe  ');
      });

      expect(result.current.team?.benchPlayers[0].name).toBe('John Doe');
    });
  });
});
