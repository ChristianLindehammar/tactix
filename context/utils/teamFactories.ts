import { Team, PlayerType, Position, CourtConfiguration } from '@/types/models';
import {
  DEFAULT_SPORT,
  DEFAULT_POSITION_TYPE,
  DEFAULT_USER_ID,
  DEFAULT_CONFIGURATION_NAME,
  DEFAULT_COURT_POSITION,
  MIN_POSITION_VALUE,
  MAX_POSITION_VALUE,
} from '../constants/teamDefaults';

/**
 * Creates a default configuration for a team
 */
export const createDefaultConfiguration = (timestamp: number): CourtConfiguration => ({
  id: `${timestamp}-config`,
  name: DEFAULT_CONFIGURATION_NAME,
  playerPositions: {},
});

/**
 * Creates a new team with default values
 */
export const createNewTeam = (name: string, timestamp: number): Team => ({
  id: timestamp.toString(),
  name: name.trim(),
  startingPlayers: [],
  benchPlayers: [],
  createdBy: DEFAULT_USER_ID,
  sharedWith: [],
  lastEdited: timestamp,
  editedBy: DEFAULT_USER_ID,
  sport: DEFAULT_SPORT,
  configurations: [createDefaultConfiguration(timestamp)],
  selectedConfigurationId: `${timestamp}-config`,
});

/**
 * Creates a new player with default values
 */
export const createNewPlayer = (name: string, timestamp: number): PlayerType => ({
  id: timestamp.toString(),
  name: name.trim(),
  courtPosition: DEFAULT_COURT_POSITION,
  position: DEFAULT_POSITION_TYPE,
});

/**
 * Validates and clamps position coordinates to valid bounds
 */
export const validatePosition = (position: Position): Position => ({
  x: Math.max(MIN_POSITION_VALUE, Math.min(MAX_POSITION_VALUE, position.x)),
  y: Math.max(MIN_POSITION_VALUE, Math.min(MAX_POSITION_VALUE, position.y)),
});
