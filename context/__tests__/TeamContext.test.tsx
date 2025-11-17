/**
 * Comprehensive Test Suite for TeamContext
 *
 * This test suite follows TDD principles - tests are written first to define
 * the expected behavior of the refactored TeamContext implementation.
 *
 * Many of these tests will FAIL initially - that's intentional!
 * They define the expected behavior that the refactored implementation should satisfy.
 */

import { CourtConfiguration, PlayerType, Team } from '@/types/models';
import { TeamProvider, useTeam } from '../TeamContext';
import { act, render, renderHook } from '@testing-library/react-native';
import { exportTeamToFile, importTeamFromFile } from '../utils';

import React from 'react';

// Mock dependencies
const mockSetSelectedSport = jest.fn();

jest.mock('@/context/SportContext', () => ({
  useSport: () => ({
    selectedSport: 'soccer',
    setSelectedSport: mockSetSelectedSport,
  }),
}));

// AsyncStorage mock to avoid native module errors in Jest
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock file-related utilities while keeping position/validation logic from the real module
jest.mock('../utils', () => {
  const actual = jest.requireActual('../utils');
  return {
    __esModule: true,
    ...actual,
    exportTeamToFile: jest.fn().mockResolvedValue(undefined),
    importTeamFromFile: jest.fn().mockResolvedValue({
      id: 'imported-id',
      name: 'Imported Team',
      startingPlayers: [],
      benchPlayers: [],
      createdBy: 'user1',
      sharedWith: [],
      lastEdited: Date.now(),
      editedBy: 'user1',
      sport: 'soccer',
      configurations: [{
        id: 'config-1',
        name: 'Standard',
        playerPositions: {},
      }],
      selectedConfigurationId: 'config-1',
    }),
  };
});

// Test helper functions
const createTestTeam = (result: any, teamName = 'Test Team') => {
  act(() => {
    result.current.createTeam(teamName);
  });
  return result.current.teams.find((team: any) => team.name === teamName)?.id;
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
  const benchPlayers = result.current.team?.benchPlayers || [];
  return benchPlayers[benchPlayers.length - 1]?.id;
};

const createTestConfiguration = (result: any, configName = 'Test Config') => {
  act(() => {
    result.current.createConfiguration(configName);
  });
  return result.current.team?.configurations?.find((c: any) => c.name === configName)?.id;
};

describe('TeamContext - Comprehensive Test Suite', () => {
  const renderHookWithProvider = <T,>(hook: () => T) => {
    return renderHook(hook, {
      wrapper: ({ children }) => <TeamProvider>{children}</TeamProvider>,
    });
  };

  // ============================================================================
  // 1. PROVIDER SETUP & CONTEXT ACCESS
  // ============================================================================
  describe('1. Provider Setup & Context Access', () => {
    it('should provide context with all required methods and properties', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      // Verify all properties exist
      expect(result.current.teams).toBeDefined();
      expect(result.current.team).toBeUndefined();
      expect(result.current.error).toBeDefined();

      // Verify all team management methods exist
      expect(typeof result.current.createTeam).toBe('function');
      expect(typeof result.current.selectTeam).toBe('function');
      expect(typeof result.current.removeTeam).toBe('function');
      expect(typeof result.current.renameTeam).toBe('function');

      // Verify all player management methods exist
      expect(typeof result.current.addPlayer).toBe('function');
      expect(typeof result.current.renamePlayer).toBe('function');
      expect(typeof result.current.deletePlayer).toBe('function');
      expect(typeof result.current.updatePlayerPosition).toBe('function');
      expect(typeof result.current.setPlayerType).toBe('function');
      expect(typeof result.current.movePlayerToBench).toBe('function');
      expect(typeof result.current.movePlayerToCourt).toBe('function');
      expect(typeof result.current.setPlayers).toBe('function');

      // Verify position management methods exist
      expect(typeof result.current.findFreePosition).toBe('function');

      // Verify import/export methods exist
      expect(typeof result.current.exportTeam).toBe('function');
      expect(typeof result.current.importTeam).toBe('function');
      expect(typeof result.current.importTeamFromFile).toBe('function');

      // Verify configuration management methods exist
      expect(typeof result.current.createConfiguration).toBe('function');
      expect(typeof result.current.selectConfiguration).toBe('function');
      expect(typeof result.current.renameConfiguration).toBe('function');
      expect(typeof result.current.deleteConfiguration).toBe('function');
      expect(typeof result.current.getActiveConfiguration).toBe('function');
      expect(typeof result.current.switchToNextConfiguration).toBe('function');
      expect(typeof result.current.switchToPreviousConfiguration).toBe('function');
    });

    it('should throw error when useTeam is used outside provider', () => {
      const TestComponent = () => {
        useTeam();
        return null;
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTeam must be used within TeamProvider');

      consoleSpy.mockRestore();
    });

    it('should initialize with empty teams array', () => {
      const { result } = renderHookWithProvider(() => useTeam());
      expect(result.current.teams).toEqual([]);
    });

    it('should initialize with no selected team', () => {
      const { result } = renderHookWithProvider(() => useTeam());
      expect(result.current.team).toBeUndefined();
    });

    it('should initialize with no error', () => {
      const { result } = renderHookWithProvider(() => useTeam());
      expect(result.current.error).toBeNull();
    });
  });

  // ============================================================================
  // 2. TEAM MANAGEMENT (CRUD OPERATIONS)
  // ============================================================================
  describe('2. Team Management', () => {
    describe('createTeam', () => {
      it('should create a new team with valid name', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.createTeam('Test Team');
        });

        expect(result.current.teams).toHaveLength(1);
        expect(result.current.teams[0].name).toBe('Test Team');
        expect(result.current.teams[0].id).toBeDefined();
        expect(result.current.teams[0].sport).toBe('soccer');
        expect(result.current.teams[0].startingPlayers).toEqual([]);
        expect(result.current.teams[0].benchPlayers).toEqual([]);
      });

      it('should create team with default configuration', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.createTeam('Test Team');
        });

        const team = result.current.teams[0];
        expect(team.configurations).toBeDefined();
        expect(team.configurations).toHaveLength(1);
        expect(team.configurations![0].name).toBe('Standard');
        expect(team.selectedConfigurationId).toBe(team.configurations![0].id);
      });

      it('should auto-select newly created team', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.createTeam('Test Team');
        });

        expect(result.current.team).toBeDefined();
        expect(result.current.team?.name).toBe('Test Team');
      });

      it('should NOT create team with empty name', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.createTeam('');
        });

        expect(result.current.teams).toHaveLength(0);
      });

      it('should NOT create team with whitespace-only name', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.createTeam('   ');
        });

        expect(result.current.teams).toHaveLength(0);
      });

      it('should trim whitespace from team name', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.createTeam('  Test Team  ');
        });

        expect(result.current.teams[0].name).toBe('Test Team');
      });

      it('should create multiple teams', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.createTeam('Team 1');
          result.current.createTeam('Team 2');
          result.current.createTeam('Team 3');
        });

        expect(result.current.teams).toHaveLength(3);
        expect(result.current.teams.map(t => t.name)).toEqual(['Team 1', 'Team 2', 'Team 3']);
      });

      it('should allow duplicate team names', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.createTeam('Same Name');
          result.current.createTeam('Same Name');
        });

        expect(result.current.teams).toHaveLength(2);
        expect(result.current.teams[0].name).toBe('Same Name');
        expect(result.current.teams[1].name).toBe('Same Name');
        expect(result.current.teams[0].id).not.toBe(result.current.teams[1].id);
      });

      it('should set lastEdited timestamp on creation', () => {
        const { result } = renderHookWithProvider(() => useTeam());
        const beforeTime = Date.now();

        act(() => {
          result.current.createTeam('Test Team');
        });

        const afterTime = Date.now();
        const team = result.current.teams[0];
        expect(team.lastEdited).toBeGreaterThanOrEqual(beforeTime);
        expect(team.lastEdited).toBeLessThanOrEqual(afterTime);
      });
    });

    describe('selectTeam', () => {
      it('should select an existing team by id', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');

        act(() => {
          result.current.selectTeam(teamId!);
        });

        expect(result.current.team).toBeDefined();
        expect(result.current.team?.id).toBe(teamId);
        expect(result.current.team?.name).toBe('Test Team');
      });

      it('should switch selection between multiple teams', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId1 = createTestTeam(result, 'Team 1');
        const teamId2 = createTestTeam(result, 'Team 2');

        act(() => {
          result.current.selectTeam(teamId1!);
        });
        expect(result.current.team?.name).toBe('Team 1');

        act(() => {
          result.current.selectTeam(teamId2!);
        });
        expect(result.current.team?.name).toBe('Team 2');
      });

      it('should handle selecting non-existent team gracefully (no crash, no selection)', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        createTestTeam(result, 'Team 1');

        act(() => {
          result.current.selectTeam('non-existent-id');
        });

        expect(result.current.team).toBeUndefined();
        expect(result.current.error).toBeNull();
      });
    });

    describe('renameTeam', () => {
      it('should rename an existing team', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Original Name');

        act(() => {
          result.current.renameTeam(teamId!, 'New Name');
        });

        expect(result.current.teams[0].name).toBe('New Name');
      });

      it('should update lastEdited timestamp when team is renamed', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Original Name');
        const originalLastEdited = result.current.teams[0].lastEdited;

        act(() => {
          result.current.renameTeam(teamId!, 'Renamed Team');
        });

        const updatedTeam = result.current.teams[0];
        expect(updatedTeam.lastEdited).toBeGreaterThanOrEqual(originalLastEdited);
        expect(updatedTeam.name).toBe('Renamed Team');
      });

      it('should trim whitespace from new team name', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Original');

        act(() => {
          result.current.renameTeam(teamId!, '  New Name  ');
        });

        expect(result.current.teams[0].name).toBe('New Name');
      });

      it('should NOT rename team to empty or whitespace-only name', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Original');

        act(() => {
          result.current.renameTeam(teamId!, '');
          result.current.renameTeam(teamId!, '   ');
        });

        expect(result.current.teams[0].name).toBe('Original');
      });

      it('should handle renaming non-existent team gracefully (no crash, no change)', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        createTestTeam(result, 'Test Team');

        act(() => {
          result.current.renameTeam('non-existent-id', 'New Name');
        });

        expect(result.current.teams).toHaveLength(1);
        expect(result.current.teams[0].name).toBe('Test Team');
      });
    });

    describe('removeTeam', () => {
      it('should remove an existing team', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Team to Remove');

        act(() => {
          result.current.removeTeam(teamId!);
        });

        expect(result.current.teams).toHaveLength(0);
        expect(result.current.team).toBeUndefined();
      });

      it('should auto-select another team when removing currently selected team and others remain', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId1 = createTestTeam(result, 'Team 1');
        const teamId2 = createTestTeam(result, 'Team 2');

        act(() => {
          result.current.selectTeam(teamId1!);
        });
        expect(result.current.team?.id).toBe(teamId1);

        act(() => {
          result.current.removeTeam(teamId1!);
        });

        expect(result.current.teams).toHaveLength(1);
        expect(result.current.team?.id).toBe(teamId2);
      });

      it('should clear selection when removing the last remaining team', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Only Team');
        act(() => {
          result.current.selectTeam(teamId!);
        });
        expect(result.current.team).toBeDefined();

        act(() => {
          result.current.removeTeam(teamId!);
        });

        expect(result.current.teams).toHaveLength(0);
        expect(result.current.team).toBeUndefined();
      });

      it('should handle removing non-existent team gracefully (no crash, no change)', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        createTestTeam(result, 'Team 1');
        createTestTeam(result, 'Team 2');

        act(() => {
          result.current.removeTeam('non-existent-id');
        });

        expect(result.current.teams).toHaveLength(2);
      });
    });
  });
  // ============================================================================
  // 3. PLAYER MANAGEMENT (CRUD OPERATIONS)
  // ============================================================================
  describe('3. Player Management', () => {
    describe('addPlayer', () => {
      it('should add a player to the bench of the selected team', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);

        act(() => {
          result.current.addPlayer('John Doe');
        });

        expect(result.current.team?.benchPlayers).toHaveLength(1);
        expect(result.current.team?.benchPlayers[0].name).toBe('John Doe');
        expect(result.current.team?.benchPlayers[0].id).toBeDefined();
      });

      it('should NOT add player when no team is selected', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        act(() => {
          result.current.addPlayer('Player Without Team');
        });

        expect(result.current.teams).toHaveLength(0);
        expect(result.current.team).toBeUndefined();
      });

      it('should trim whitespace and reject empty or whitespace-only player names', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);

        act(() => {
          result.current.addPlayer('');
          result.current.addPlayer('   ');
          result.current.addPlayer('  John Doe  ');
        });

        expect(result.current.team?.benchPlayers).toHaveLength(1);
        expect(result.current.team?.benchPlayers[0].name).toBe('John Doe');
      });
    });

    describe('renamePlayer', () => {
      it('should rename a bench player', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        const playerId = addTestPlayer(result, 'Original Name');

        act(() => {
          result.current.renamePlayer(playerId!, 'New Name');
        });

        expect(result.current.team?.benchPlayers[0].name).toBe('New Name');
      });

      it('should rename a starting player', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        const playerId = addTestPlayer(result, 'Original Name');

        act(() => {
          result.current.movePlayerToCourt(playerId!);
          result.current.renamePlayer(playerId!, 'New Name');
        });

        expect(result.current.team?.startingPlayers[0].name).toBe('New Name');
      });

      it('should ignore rename when new name is empty or whitespace-only', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        const playerId = addTestPlayer(result, 'Original');

        act(() => {
          result.current.renamePlayer(playerId!, '');
          result.current.renamePlayer(playerId!, '   ');
        });

        expect(result.current.team?.benchPlayers[0].name).toBe('Original');
      });

      it('should handle renaming non-existent player gracefully (no crash, no change)', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        addTestPlayer(result, 'Player 1');

        act(() => {
          result.current.renamePlayer('non-existent-id', 'New Name');
        });

        expect(result.current.team?.benchPlayers).toHaveLength(1);
        expect(result.current.team?.benchPlayers[0].name).toBe('Player 1');
      });
    });

    describe('deletePlayer', () => {
      it('should delete a bench player', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        const playerId = addTestPlayer(result, 'To Delete');

        act(() => {
          result.current.deletePlayer(playerId!);
        });

        expect(result.current.team?.benchPlayers).toHaveLength(0);
      });

      it('should delete a starting player and remove them from configurations', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        const playerId = addTestPlayer(result, 'To Delete');

        act(() => {
          result.current.movePlayerToCourt(playerId!);
        });

        const activeConfigBefore = result.current.getActiveConfiguration();
        expect(activeConfigBefore?.playerPositions[playerId!]).toBeDefined();

        act(() => {
          result.current.deletePlayer(playerId!);
        });

        const activeConfigAfter = result.current.getActiveConfiguration();
        expect(activeConfigAfter?.playerPositions[playerId!]).toBeUndefined();
        expect(result.current.team?.startingPlayers.find(p => p.id === playerId)).toBeUndefined();
      });

      it('should handle deleting non-existent player gracefully (no crash, no change)', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        addTestPlayer(result, 'Player 1');

        act(() => {
          result.current.deletePlayer('non-existent-id');
        });

        expect(result.current.team?.benchPlayers).toHaveLength(1);
      });
    });
  });

  // ============================================================================
  // 4. POSITION MANAGEMENT (updates, validation, collision detection)
  // ============================================================================
  describe('4. Position Management', () => {
    describe('movePlayerToCourt', () => {
      it('moves player from bench to starting and assigns court position in active configuration', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        const playerId = addTestPlayer(result, 'Court Player');

        const teamBefore = result.current.team!;
        expect(teamBefore.benchPlayers.some(p => p.id === playerId)).toBe(true);
        expect(teamBefore.startingPlayers.some(p => p.id === playerId)).toBe(false);

        act(() => {
          result.current.movePlayerToCourt(playerId!);
        });

        const teamAfter = result.current.team!;
        expect(teamAfter.benchPlayers.some(p => p.id === playerId)).toBe(false);
        expect(teamAfter.startingPlayers.some(p => p.id === playerId)).toBe(true);

        const activeConfig = result.current.getActiveConfiguration();
        const configPos = activeConfig?.playerPositions[playerId!];
        const playerOnCourt = teamAfter.startingPlayers.find(p => p.id === playerId);

        expect(configPos).toBeDefined();
        expect(playerOnCourt?.courtPosition).toBeDefined();
        expect(playerOnCourt?.courtPosition).toEqual(configPos);
        expect(configPos!.x).toBeGreaterThanOrEqual(0);
        expect(configPos!.x).toBeLessThanOrEqual(1);
        expect(configPos!.y).toBeGreaterThanOrEqual(0);
        expect(configPos!.y).toBeLessThanOrEqual(1);
      });

      it('uses provided targetPosition when specified', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        const playerId = addTestPlayer(result, 'Court Player');

        const customPosition = { x: 0.2, y: 0.8 };

        act(() => {
          result.current.movePlayerToCourt(playerId!, customPosition);
        });

        const teamAfter = result.current.team!;
        const activeConfig = result.current.getActiveConfiguration();
        const configPos = activeConfig?.playerPositions[playerId!];
        const playerOnCourt = teamAfter.startingPlayers.find(p => p.id === playerId);

        expect(configPos).toEqual(customPosition);
        expect(playerOnCourt?.courtPosition).toEqual(customPosition);
      });

      it('does nothing when moving non-existent player id to court', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        addTestPlayer(result, 'Existing Player');

        const teamBefore = result.current.team!;

        act(() => {
          result.current.movePlayerToCourt('non-existent-id');
        });

        const teamAfter = result.current.team!;
        expect(teamAfter.benchPlayers).toEqual(teamBefore.benchPlayers);
        expect(teamAfter.startingPlayers).toEqual(teamBefore.startingPlayers);
      });
    });

    describe('movePlayerToBench', () => {
      it('moves player from court back to bench and removes configuration position', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        const playerId = addTestPlayer(result, 'Bench Player');

        act(() => {
          result.current.movePlayerToCourt(playerId!);
        });

        const teamAfterCourt = result.current.team!;
        const activeConfigBefore = result.current.getActiveConfiguration();
        expect(teamAfterCourt.startingPlayers.some(p => p.id === playerId)).toBe(true);
        expect(activeConfigBefore?.playerPositions[playerId!]).toBeDefined();

        act(() => {
          result.current.movePlayerToBench(playerId!);
        });

        const teamAfterBench = result.current.team!;
        const activeConfigAfter = result.current.getActiveConfiguration();

        expect(teamAfterBench.startingPlayers.some(p => p.id === playerId)).toBe(false);
        expect(teamAfterBench.benchPlayers.some(p => p.id === playerId)).toBe(true);
        expect(activeConfigAfter?.playerPositions[playerId!]).toBeUndefined();

        const playerOnBench = teamAfterBench.benchPlayers.find(p => p.id === playerId);
        expect(playerOnBench?.courtPosition).toBeUndefined();
      });

      it('does nothing when moving non-existent player id to bench', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);
        addTestPlayer(result, 'Existing Player');

        const teamBefore = result.current.team!;

        act(() => {
          result.current.movePlayerToBench('non-existent-id');
        });

        const teamAfter = result.current.team!;
        expect(teamAfter.benchPlayers).toEqual(teamBefore.benchPlayers);
        expect(teamAfter.startingPlayers).toEqual(teamBefore.startingPlayers);
      });
    });

    describe('findFreePosition', () => {
      it('returns a position within normalized court bounds', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);

        const position = result.current.findFreePosition();

        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.x).toBeLessThanOrEqual(1);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeLessThanOrEqual(1);
      });

      it('assigns distinct court positions for multiple players to avoid collisions', () => {
        const { result } = renderHookWithProvider(() => useTeam());

        const teamId = createTestTeam(result, 'Test Team');
        selectTestTeam(result, teamId!);

        const playerId1 = addTestPlayer(result, 'Player 1');
        const playerId2 = addTestPlayer(result, 'Player 2');
        const playerId3 = addTestPlayer(result, 'Player 3');

        act(() => {
          result.current.movePlayerToCourt(playerId1!);
          result.current.movePlayerToCourt(playerId2!);
          result.current.movePlayerToCourt(playerId3!);
        });

        const team = result.current.team!;
        const positions = team.startingPlayers.map(p => p.courtPosition!).filter(Boolean);

        // Ensure positions are not identical (basic collision avoidance)
        const uniquePositions = new Set(positions.map(pos => `${pos.x.toFixed(3)}-${pos.y.toFixed(3)}`));
        expect(uniquePositions.size).toBe(positions.length);
      });
    });

	    describe('updatePlayerPosition', () => {
	      it('updates player position in both active configuration and on the player object', () => {
	        const { result } = renderHookWithProvider(() => useTeam());

	        const teamId = createTestTeam(result, 'Test Team');
	        selectTestTeam(result, teamId!);
	        const playerId = addTestPlayer(result, 'Movable Player');

	        act(() => {
	          result.current.movePlayerToCourt(playerId!);
	        });

	        const newPosition = { x: 0.3, y: 0.7 };

	        act(() => {
	          result.current.updatePlayerPosition(playerId!, newPosition);
	        });

	        const team = result.current.team!;
	        const playerOnCourt = team.startingPlayers.find(p => p.id === playerId)!;
	        const activeConfig = result.current.getActiveConfiguration()!;

	        expect(playerOnCourt.courtPosition).toEqual(newPosition);
	        expect(activeConfig.playerPositions[playerId!]).toEqual(newPosition);
	      });

	      it('does nothing when updating position for non-existent player id', () => {
	        const { result } = renderHookWithProvider(() => useTeam());

	        const teamId = createTestTeam(result, 'Test Team');
	        selectTestTeam(result, teamId!);
	        const playerId = addTestPlayer(result, 'Existing Player');

	        act(() => {
	          result.current.movePlayerToCourt(playerId!);
	        });

	        const teamBefore = result.current.team!;
	        const configBefore = result.current.getActiveConfiguration();

	        act(() => {
	          result.current.updatePlayerPosition('non-existent-id', { x: 0.9, y: 0.1 });
	        });

	        const teamAfter = result.current.team!;
	        const configAfter = result.current.getActiveConfiguration();

	        expect(teamAfter.startingPlayers).toEqual(teamBefore.startingPlayers);
	        expect(teamAfter.benchPlayers).toEqual(teamBefore.benchPlayers);
	        expect(configAfter).toEqual(configBefore);
	      });

	      it('normalizes out-of-bounds positions before storing them', () => {
	        const { result } = renderHookWithProvider(() => useTeam());

	        const teamId = createTestTeam(result, 'Test Team');
	        selectTestTeam(result, teamId!);
	        const playerId = addTestPlayer(result, 'Out Of Bounds Player');

	        act(() => {
	          result.current.movePlayerToCourt(playerId!);
	        });

	        const invalidPosition = { x: 5, y: -3 };

	        act(() => {
	          result.current.updatePlayerPosition(playerId!, invalidPosition);
	        });

	        const team = result.current.team!;
	        const playerOnCourt = team.startingPlayers.find(p => p.id === playerId)!;
	        const activeConfig = result.current.getActiveConfiguration()!;
	        const stored = activeConfig.playerPositions[playerId!];

	        const assertInBounds = (pos: { x: number; y: number }) => {
	          expect(pos.x).toBeGreaterThanOrEqual(0);
	          expect(pos.x).toBeLessThanOrEqual(1);
	          expect(pos.y).toBeGreaterThanOrEqual(0);
	          expect(pos.y).toBeLessThanOrEqual(1);
	        };

	        assertInBounds(playerOnCourt.courtPosition!);
	        assertInBounds(stored);
	      });
	    });

	    describe('setPlayerType', () => {
	      it('updates player role for both bench and starting players', () => {
	        const { result } = renderHookWithProvider(() => useTeam());

	        const teamId = createTestTeam(result, 'Test Team');
	        selectTestTeam(result, teamId!);
	        const playerId = addTestPlayer(result, 'Role Player');

	        act(() => {
	          result.current.setPlayerType(playerId!, 'Defender');
	        });

	        expect(result.current.team?.benchPlayers[0].position).toBe('Defender');

	        act(() => {
	          result.current.movePlayerToCourt(playerId!);
	          result.current.setPlayerType(playerId!, 'Midfielder');
	        });

	        const startingPlayer = result.current.team?.startingPlayers.find(p => p.id === playerId);
	        expect(startingPlayer?.position).toBe('Midfielder');
	      });

	      it('falls back to a valid default role when given an invalid one', () => {
	        const { result } = renderHookWithProvider(() => useTeam());

	        const teamId = createTestTeam(result, 'Test Team');
	        selectTestTeam(result, teamId!);
	        const playerId = addTestPlayer(result, 'Role Player');

	        act(() => {
	          result.current.setPlayerType(playerId!, 'NotARealPosition');
	        });

	        const updatedPlayer = result.current.team?.benchPlayers[0];
	        expect(updatedPlayer?.position).toBeDefined();
	        expect(updatedPlayer?.position).not.toBe('NotARealPosition');
	      });

	      it('ignores empty or whitespace-only role strings and keeps existing role', () => {
	        const { result } = renderHookWithProvider(() => useTeam());

	        const teamId = createTestTeam(result, 'Test Team');
	        selectTestTeam(result, teamId!);
	        const playerId = addTestPlayer(result, 'Role Player');

	        act(() => {
	          result.current.setPlayerType(playerId!, 'Defender');
	        });

	        const roleBefore = result.current.team?.benchPlayers[0].position;

	        act(() => {
	          result.current.setPlayerType(playerId!, '');
	          result.current.setPlayerType(playerId!, '   ');
	        });

	        const roleAfter = result.current.team?.benchPlayers[0].position;
	        expect(roleAfter).toBe(roleBefore);
	      });
	    });

	    describe('setPlayers', () => {
	      it('replaces starting and bench players for the selected team and normalizes court positions', () => {
	        const { result } = renderHookWithProvider(() => useTeam());

	        const teamId = createTestTeam(result, 'Test Team');
	        selectTestTeam(result, teamId!);

	        const courtPlayers: PlayerType[] = [
	          { id: 'p1', name: 'Court 1', position: 'Forward', courtPosition: { x: 2, y: 2 } },
	          { id: 'p2', name: 'Court 2', position: 'Defender', courtPosition: { x: 0.5, y: 0.5 } },
	        ];

	        const benchPlayers: PlayerType[] = [
	          { id: 'p3', name: 'Bench 1', position: 'Goalkeeper', courtPosition: { x: -1, y: -1 } },
	        ];

	        act(() => {
	          result.current.setPlayers(courtPlayers, benchPlayers);
	        });

	        const team = result.current.team!;

	        expect(team.startingPlayers.map(p => p.id)).toEqual(['p1', 'p2']);
	        expect(team.benchPlayers.map(p => p.id)).toEqual(['p3']);

	        team.startingPlayers.forEach(player => {
	          expect(player.courtPosition).toBeDefined();
	          expect(player.courtPosition!.x).toBeGreaterThanOrEqual(0);
	          expect(player.courtPosition!.x).toBeLessThanOrEqual(1);
	          expect(player.courtPosition!.y).toBeGreaterThanOrEqual(0);
	          expect(player.courtPosition!.y).toBeLessThanOrEqual(1);
	        });

	        team.benchPlayers.forEach(player => {
	          if (player.courtPosition) {
	            expect(player.courtPosition.x).toBeGreaterThanOrEqual(0);
	            expect(player.courtPosition.x).toBeLessThanOrEqual(1);
	            expect(player.courtPosition.y).toBeGreaterThanOrEqual(0);
	            expect(player.courtPosition.y).toBeLessThanOrEqual(1);
	          }
	        });
	      });

	      it('does nothing when setPlayers is called with no selected team', () => {
	        const { result } = renderHookWithProvider(() => useTeam());

	        const courtPlayers: PlayerType[] = [
	          { id: 'p1', name: 'Court 1', position: 'Forward', courtPosition: { x: 0.5, y: 0.5 } },
	        ];
	        const benchPlayers: PlayerType[] = [];

	        act(() => {
	          result.current.setPlayers(courtPlayers, benchPlayers);
	        });

	        expect(result.current.teams).toHaveLength(0);
	        expect(result.current.team).toBeUndefined();
	      });
	    });


  });

  // ============================================================================
  // 5. CONFIGURATION MANAGEMENT (create, select, rename, delete, switch)
  // ============================================================================
  describe('5. Configuration Management', () => {
    it('createConfiguration adds a new configuration for the selected team and selects it', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      const initialConfigs = result.current.team?.configurations || [];
      const initialCount = initialConfigs.length;
      const initialActiveId = result.current.team?.selectedConfigurationId;

      act(() => {
        result.current.createConfiguration('New Formation');
      });

      const team = result.current.team!;
      expect(team.configurations?.length).toBe(initialCount + 1);

      const newConfig = team.configurations?.find(c => c.name === 'New Formation');
      expect(newConfig).toBeDefined();
      expect(team.selectedConfigurationId).toBe(newConfig!.id);
      expect(team.configurations?.some(c => c.id === initialActiveId)).toBe(true);
    });

    it('createConfiguration copies current court positions of on-court players', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      const playerId1 = addTestPlayer(result, 'Player 1');
      const playerId2 = addTestPlayer(result, 'Player 2');

      act(() => {
        result.current.movePlayerToCourt(playerId1!, { x: 0.3, y: 0.4 });
        result.current.movePlayerToCourt(playerId2!, { x: 0.7, y: 0.8 });
      });

      act(() => {
        result.current.createConfiguration('Formation with Players');
      });

      const team = result.current.team!;
      const newConfig = team.configurations?.find(c => c.name === 'Formation with Players');
      expect(newConfig).toBeDefined();

      team.startingPlayers.forEach(player => {
        expect(newConfig!.playerPositions[player.id]).toEqual(player.courtPosition);
      });
    });

    it('does nothing when createConfiguration is called with no selected team', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      act(() => {
        result.current.createConfiguration('Should Not Work');
      });

      expect(result.current.teams).toHaveLength(0);
      expect(result.current.team).toBeUndefined();
    });

    it('getActiveConfiguration returns the currently selected configuration or undefined', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      expect(result.current.getActiveConfiguration()).toBeUndefined();

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      const activeConfig = result.current.getActiveConfiguration();
      expect(activeConfig).toBeDefined();
      expect(activeConfig?.name).toBe('Standard');
    });

    it('selectConfiguration applies configuration playerPositions to starting and bench players', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      const playerId1 = addTestPlayer(result, 'Player 1');
      const playerId2 = addTestPlayer(result, 'Player 2');

      act(() => {
        result.current.movePlayerToCourt(playerId1!);
      });

      act(() => {
        result.current.createConfiguration('Only Player 1 on court');
      });

      const teamAfterConfig = result.current.team!;
      const standardConfigId = teamAfterConfig.configurations![0].id;
      const onlyP1ConfigId = teamAfterConfig.configurations!.find(c => c.name === 'Only Player 1 on court')!.id;

      act(() => {
        result.current.selectConfiguration(standardConfigId);
      });

      // After selecting standard config, player 1 should be on court, player 2 on bench
      expect(result.current.team!.startingPlayers).toHaveLength(1);
      expect(result.current.team!.benchPlayers).toHaveLength(1);
      expect(result.current.team!.startingPlayers[0].id).toBe(playerId1);
      expect(result.current.team!.benchPlayers[0].id).toBe(playerId2);

      act(() => {
        result.current.movePlayerToCourt(playerId1!);
      });

      // Player 1 already on court, so nothing should change
      expect(result.current.team!.startingPlayers).toHaveLength(1);
      expect(result.current.team!.benchPlayers).toHaveLength(1);

      act(() => {
        result.current.movePlayerToCourt(playerId2!);
      });

      expect(result.current.team!.startingPlayers).toHaveLength(2);

      act(() => {
        result.current.selectConfiguration(onlyP1ConfigId);
      });

      const team = result.current.team!;
      const startingIds = team.startingPlayers.map(p => p.id);
      const benchIds = team.benchPlayers.map(p => p.id);

      expect(startingIds).toContain(playerId1);
      expect(startingIds).not.toContain(playerId2);
      expect(benchIds).toContain(playerId2);
    });

    it('renameConfiguration trims the new name and ignores empty names', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      const config = result.current.team!.configurations![0];

      act(() => {
        result.current.renameConfiguration(config.id, '  Renamed Config  ');
      });

      expect(result.current.team!.configurations![0].name).toBe('Renamed Config');

      act(() => {
        result.current.renameConfiguration(config.id, '   ');
      });

      expect(result.current.team!.configurations![0].name).toBe('Renamed Config');
    });

    it('deleteConfiguration removes a configuration but never removes the last remaining one and switching cycles through configs', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      act(() => {
        result.current.createConfiguration('Second');
        result.current.createConfiguration('Third');
      });

      const team = result.current.team!;
      const configIds = team.configurations!.map(c => c.id);

      act(() => {
        result.current.switchToNextConfiguration();
      });
      const afterNext = result.current.getActiveConfiguration()!;

      act(() => {
        result.current.switchToPreviousConfiguration();
      });
      const afterPrev = result.current.getActiveConfiguration()!;

      expect(configIds).toContain(afterNext.id);
      expect(configIds).toContain(afterPrev.id);

      act(() => {
        result.current.deleteConfiguration(configIds[1]);
        result.current.deleteConfiguration(configIds[2] || configIds[0]);
      });

      const remainingTeam = result.current.team!;
      expect(remainingTeam.configurations!.length).toBeGreaterThanOrEqual(1);
    });

    it('deleteConfiguration should auto-select first remaining config when deleting the currently selected one', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      // Create additional configurations
      act(() => {
        result.current.createConfiguration('Config 2');
        result.current.createConfiguration('Config 3');
      });

      const team = result.current.team!;
      const standardConfigId = team.configurations![0].id;
      const config2Id = team.configurations![1].id;
      const config3Id = team.configurations![2].id;

      // Config 3 should be currently selected (last created)
      expect(team.selectedConfigurationId).toBe(config3Id);

      // Delete the currently selected configuration (Config 3)
      act(() => {
        result.current.deleteConfiguration(config3Id);
      });

      const updatedTeam = result.current.team!;

      // Should have 2 configurations remaining
      expect(updatedTeam.configurations).toHaveLength(2);

      // Should auto-select the first remaining configuration
      expect(updatedTeam.selectedConfigurationId).toBe(standardConfigId);

      // Deleted configuration should not be in the list
      expect(updatedTeam.configurations!.find(c => c.id === config3Id)).toBeUndefined();
    });

    it('deleteConfiguration should NOT delete the last remaining configuration', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      const team = result.current.team!;
      const standardConfigId = team.configurations![0].id;

      // Should have exactly 1 configuration (Standard)
      expect(team.configurations).toHaveLength(1);

      // Try to delete the only configuration
      act(() => {
        result.current.deleteConfiguration(standardConfigId);
      });

      const updatedTeam = result.current.team!;

      // Should still have 1 configuration (deletion prevented)
      expect(updatedTeam.configurations).toHaveLength(1);

      // The configuration should still be there
      expect(updatedTeam.configurations![0].id).toBe(standardConfigId);

      // Should still be selected
      expect(updatedTeam.selectedConfigurationId).toBe(standardConfigId);
    });

    it('deleteConfiguration should keep current selection when deleting a non-selected configuration', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      // Create additional configurations
      act(() => {
        result.current.createConfiguration('Config 2');
        result.current.createConfiguration('Config 3');
      });

      const team = result.current.team!;
      const standardConfigId = team.configurations![0].id;
      const config2Id = team.configurations![1].id;
      const config3Id = team.configurations![2].id;

      // Config 3 is currently selected, switch to Config 2
      act(() => {
        result.current.selectConfiguration(config2Id);
      });

      expect(result.current.team!.selectedConfigurationId).toBe(config2Id);

      // Delete Config 3 (not currently selected)
      act(() => {
        result.current.deleteConfiguration(config3Id);
      });

      const updatedTeam = result.current.team!;

      // Should have 2 configurations remaining
      expect(updatedTeam.configurations).toHaveLength(2);

      // Should still have Config 2 selected (unchanged)
      expect(updatedTeam.selectedConfigurationId).toBe(config2Id);

      // Config 3 should be gone
      expect(updatedTeam.configurations!.find(c => c.id === config3Id)).toBeUndefined();
    });

    it('deleteConfiguration should handle deleting non-existent configuration gracefully', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      const team = result.current.team!;
      const standardConfigId = team.configurations![0].id;

      // Try to delete a non-existent configuration
      act(() => {
        result.current.deleteConfiguration('non-existent-id');
      });

      const updatedTeam = result.current.team!;

      // Should still have 1 configuration
      expect(updatedTeam.configurations).toHaveLength(1);

      // Standard config should still be there and selected
      expect(updatedTeam.configurations![0].id).toBe(standardConfigId);
      expect(updatedTeam.selectedConfigurationId).toBe(standardConfigId);
    });

    it('switchToNextConfiguration should cycle to next configuration and wrap around', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      // Create additional configurations
      act(() => {
        result.current.createConfiguration('Config 2');
        result.current.createConfiguration('Config 3');
      });

      const team = result.current.team!;
      const config1Id = team.configurations![0].id;
      const config2Id = team.configurations![1].id;
      const config3Id = team.configurations![2].id;

      // Currently on Config 3 (last created)
      expect(team.selectedConfigurationId).toBe(config3Id);

      // Switch to next (should wrap to Config 1)
      act(() => {
        result.current.switchToNextConfiguration();
      });

      expect(result.current.team!.selectedConfigurationId).toBe(config1Id);

      // Switch to next again (should go to Config 2)
      act(() => {
        result.current.switchToNextConfiguration();
      });

      expect(result.current.team!.selectedConfigurationId).toBe(config2Id);

      // Switch to next again (should go to Config 3)
      act(() => {
        result.current.switchToNextConfiguration();
      });

      expect(result.current.team!.selectedConfigurationId).toBe(config3Id);
    });

    it('switchToPreviousConfiguration should cycle to previous configuration and wrap around', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Test Team');
      selectTestTeam(result, teamId!);

      // Create additional configurations
      act(() => {
        result.current.createConfiguration('Config 2');
        result.current.createConfiguration('Config 3');
      });

      const team = result.current.team!;
      const config1Id = team.configurations![0].id;
      const config2Id = team.configurations![1].id;
      const config3Id = team.configurations![2].id;

      // Currently on Config 3 (last created)
      expect(team.selectedConfigurationId).toBe(config3Id);

      // Switch to previous (should go to Config 2)
      act(() => {
        result.current.switchToPreviousConfiguration();
      });

      expect(result.current.team!.selectedConfigurationId).toBe(config2Id);

      // Switch to previous again (should go to Config 1)
      act(() => {
        result.current.switchToPreviousConfiguration();
      });

      expect(result.current.team!.selectedConfigurationId).toBe(config1Id);

      // Switch to previous again (should wrap to Config 3)
      act(() => {
        result.current.switchToPreviousConfiguration();
      });

      expect(result.current.team!.selectedConfigurationId).toBe(config3Id);
    });

    it('switchToNextConfiguration should do nothing when no team is selected', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      // No team selected
      expect(result.current.team).toBeUndefined();

      // Should not crash
      act(() => {
        result.current.switchToNextConfiguration();
      });

      // Still no team
      expect(result.current.team).toBeUndefined();
    });

    it('switchToPreviousConfiguration should do nothing when no team is selected', () => {
      const { result } = renderHookWithProvider(() => useTeam());

      // No team selected
      expect(result.current.team).toBeUndefined();

      // Should not crash
      act(() => {
        result.current.switchToPreviousConfiguration();
      });

      // Still no team
      expect(result.current.team).toBeUndefined();
    });
  });

  // ============================================================================
  // 6. IMPORT/EXPORT OPERATIONS & MIGRATION
  // ============================================================================
  describe('6. Import/Export Operations & Migration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('exportTeam delegates to exportTeamToFile with the correct team data and translation function', async () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const teamId = createTestTeam(result, 'Exportable Team');

      await act(async () => {
        await result.current.exportTeam(teamId!);
      });

      expect(exportTeamToFile).toHaveBeenCalledTimes(1);
      const [exportedTeam, tFn] = (exportTeamToFile as jest.Mock).mock.calls[0];

      expect(exportedTeam.name).toBe('Exportable Team');
      expect(typeof tFn).toBe('function');
    });

    it('exportTeam does nothing when given a non-existent team id', async () => {
      const { result } = renderHookWithProvider(() => useTeam());

      await act(async () => {
        await result.current.exportTeam('non-existent-id');
      });

      expect(exportTeamToFile).not.toHaveBeenCalled();
    });

    it('importTeam ensures the imported team has configurations, unique name and becomes selected', async () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const importedTeam: Team = {
        id: 'legacy-id',
        name: 'Imported Team',
        startingPlayers: [],
        benchPlayers: [],
        createdBy: 'user1',
        sharedWith: [],
        lastEdited: 123,
        editedBy: 'user1',
        sport: 'soccer',
      };

      await act(async () => {
        await result.current.importTeam(importedTeam);
      });

      const imported = result.current.teams.find(t => t.name.startsWith('Imported Team'));
      expect(imported).toBeDefined();
      expect(imported?.configurations?.length).toBeGreaterThan(0);
      expect(imported?.configurations?.[0].name).toBe('Standard');
      expect(result.current.team?.id).toBe(imported?.id);
    });

    it('importTeamFromFile reads from file and forwards the parsed team', async () => {
      const { result } = renderHookWithProvider(() => useTeam());
      const fileUri = 'file:///team.json';

      let parsed: Team | undefined;
      await act(async () => {
        parsed = await result.current.importTeamFromFile(fileUri);
      });

      expect(importTeamFromFile).toHaveBeenCalledWith(fileUri);
      expect(parsed?.name).toBe('Imported Team');
    });

    it('importTeam migrates legacy teams without configurations using default Standard configuration', async () => {
      const { result } = renderHookWithProvider(() => useTeam());

      const legacyTeam: Team = {
        id: 'legacy-id',
        name: 'Legacy Team',
        startingPlayers: [{ id: 'p1', name: 'P1', position: 'Forward', courtPosition: { x: 0.4, y: 0.6 } }],
        benchPlayers: [],
        createdBy: 'user1',
        sharedWith: [],
        lastEdited: 0,
        editedBy: 'user1',
        sport: 'soccer',
      };

      await act(async () => {
        await result.current.importTeam(legacyTeam);
      });

      const imported = result.current.teams.find(t => t.name.startsWith('Legacy Team'));
      expect(imported).toBeDefined();
      expect(imported?.configurations?.length).toBeGreaterThan(0);

      const activeConfig = imported?.configurations?.find(c => c.id === imported.selectedConfigurationId);
      expect(activeConfig).toBeDefined();
      expect(activeConfig?.name).toBe('Standard');

      expect(activeConfig?.playerPositions['p1']).toEqual({ x: 0.4, y: 0.6 });
    });


    it('importTeam ensures imported team name is made unique when a team with the same name already exists', async () => {
      const { result } = renderHookWithProvider(() => useTeam());

      // Existing team with name "Imported Team"
      createTestTeam(result, 'Imported Team');

      const importedTeam: Team = {
        id: 'legacy-id-2',
        name: 'Imported Team',
        startingPlayers: [],
        benchPlayers: [],
        createdBy: 'user1',
        sharedWith: [],
        lastEdited: 0,
        editedBy: 'user1',
        sport: 'soccer',
      };

      await act(async () => {
        await result.current.importTeam(importedTeam);
      });

      const names = result.current.teams.map(t => t.name);
      const importedNames = names.filter(n => n.startsWith('Imported Team'));

      expect(importedNames.length).toBe(2);
      expect(names).toContain('Imported Team');
      expect(names).toContain('Imported Team (1)');
    });

    it('importTeam updates selected sport when imported team sport differs from current sport', async () => {
      const { result } = renderHookWithProvider(() => useTeam());
      mockSetSelectedSport.mockClear();

      const importedTeam: Team = {
        id: 'legacy-id-3',
        name: 'Basketball Team',
        startingPlayers: [],
        benchPlayers: [],
        createdBy: 'user1',
        sharedWith: [],
        lastEdited: 0,
        editedBy: 'user1',
        sport: 'basketball',
      };

      await act(async () => {
        await result.current.importTeam(importedTeam);
      });

      expect(mockSetSelectedSport).toHaveBeenCalledWith('basketball');
    });
  });

});



