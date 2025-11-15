import { Team, PlayerType, Position, CourtConfiguration } from '@/types/models';

/**
 * Error type for team context operations
 */
export interface TeamContextError {
  message: string;
  code?: string;
  timestamp: number;
}

/**
 * Function type for updating a team
 */
export type TeamUpdater = (team: Team) => Team;

/**
 * Position coordinates with validation
 */
export interface ValidatedPosition extends Position {
  x: number; // 0-1 range
  y: number; // 0-1 range
}

/**
 * Team management operations interface
 */
export interface TeamManagementOperations {
  createTeam: (name: string) => void;
  selectTeam: (teamId: string) => void;
  removeTeam: (teamId: string) => void;
  renameTeam: (teamId: string, newName: string) => void;
}

/**
 * Player management operations interface
 */
export interface PlayerManagementOperations {
  addPlayer: (name: string) => void;
  renamePlayer: (playerId: string, newName: string) => void;
  deletePlayer: (playerId: string) => void;
  updatePlayerPosition: (playerId: string, position: Position) => void;
  setPlayerType: (playerId: string, position: string) => void;
  movePlayerToBench: (playerId: string) => void;
  movePlayerToCourt: (playerId: string, targetPosition?: Position) => void;
  setPlayers: (courtPlayers: PlayerType[], benchPlayers: PlayerType[]) => void;
}

/**
 * Configuration management operations interface
 */
export interface ConfigurationManagementOperations {
  createConfiguration: (name: string) => void;
  selectConfiguration: (configId: string) => void;
  renameConfiguration: (configId: string, newName: string) => void;
  deleteConfiguration: (configId: string) => void;
  getActiveConfiguration: () => CourtConfiguration | undefined;
  switchToNextConfiguration: () => void;
  switchToPreviousConfiguration: () => void;
}

/**
 * Import/Export operations interface
 */
export interface ImportExportOperations {
  exportTeam: (teamId: string) => void;
  importTeam: (importedTeam: Team) => void;
  importTeamFromFile: (fileUri: string) => Promise<Team>;
}

/**
 * Utility operations interface
 */
export interface UtilityOperations {
  findFreePosition: () => Position;
}

/**
 * Complete TeamContext interface combining all operations
 */
export interface TeamContextProps extends 
  TeamManagementOperations,
  PlayerManagementOperations,
  ConfigurationManagementOperations,
  ImportExportOperations,
  UtilityOperations {
  // State
  team?: Team;
  teams: Team[];
  error?: TeamContextError | null;
}
