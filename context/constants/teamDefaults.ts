import { Position } from '@/types/models';

// Default values for team creation
export const DEFAULT_SPORT = 'soccer';
export const DEFAULT_POSITION_TYPE = 'midfielder';
export const DEFAULT_USER_ID = 'user1';
export const DEFAULT_CONFIGURATION_NAME = 'Standard';
export const DEFAULT_COURT_POSITION: Position = { x: 0.5, y: 0.5 };
export const CONFIGURATION_ID_SUFFIX = '-config';

// Position finding constants
export const POSITION_SPACING = 0.1;
export const POSITION_PADDING = 0.05;

// Validation constants
export const MIN_POSITION_VALUE = 0;
export const MAX_POSITION_VALUE = 1;

// Configuration constraints
export const MIN_CONFIGURATIONS = 1;
