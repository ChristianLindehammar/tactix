import {
  CONFIGURATION_ID_SUFFIX,
  DEFAULT_CONFIGURATION_NAME,
  DEFAULT_COURT_POSITION,
  DEFAULT_POSITION_TYPE,
  DEFAULT_SPORT,
  DEFAULT_USER_ID,
  MAX_POSITION_VALUE,
  MIN_POSITION_VALUE,
} from '../constants/teamDefaults';
import { CourtConfiguration, PlayerType, Position, Team } from '@/types/models';

import { Sport } from '@/constants/sports';

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
export const createNewTeam = (name: string, timestamp: number, sport: Sport = DEFAULT_SPORT): Team => ({
  id: timestamp.toString(),
  name: name.trim(),
  startingPlayers: [],
  benchPlayers: [],
  createdBy: DEFAULT_USER_ID,
  sharedWith: [],
  lastEdited: timestamp,
  editedBy: DEFAULT_USER_ID,
  sport,
  configurations: [createDefaultConfiguration(timestamp)],
  selectedConfigurationId: `${timestamp}-config`,
});

/**
 * Creates a new player with default values
 */
export const createNewPlayer = (name: string, timestamp: number): PlayerType => ({
  id: `${timestamp}-${Math.random().toString(36).slice(2, 9)}`,
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

/**
 * Generates a unique ID for configurations using timestamp and random string
 */
export const generateConfigurationId = (): string => {
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2, 9);
};

/**
 * Extracts current player positions from a team's players
 */
export const extractPlayerPositions = (players: PlayerType[]): Record<string, Position> => {
  const positions: Record<string, Position> = {};
  players.forEach(player => {
    if (player.courtPosition) {
      positions[player.id] = { ...player.courtPosition };
    }
  });
  return positions;
};

/**
 * Creates a new configuration with given name and player positions
 */
export const createNewConfiguration = (name: string, playerPositions: Record<string, Position> = {}): CourtConfiguration => ({
  id: generateConfigurationId(),
  name,
  playerPositions,
});
