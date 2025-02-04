import { Platform } from 'react-native';

export const LAYOUT = {
  UNIVERSAL_COURT_WIDTH: 1000,  // Universal width for the court
  UNIVERSAL_COURT_HEIGHT: 2000, // Universal height for the court
  FLOORBALL_COURT: {
    CENTER_X: 500,  // Center X coordinate of the court in universal system
    CENTER_Y: 1000, // Center Y coordinate of the court in universal system
    WIDTH: 1000,    // Total width of the court in universal system
    HEIGHT: 2000    // Total height of the court in universal system
  },
  PLAYER: {
    SIZE: 40,       // Player marker size
  },
  PLAYER_SPACING: {
    OFFSET: 40,
    MAX_TRIES: 5
  },
  TAB_BAR_HEIGHT: Platform.OS === 'ios' ? 80 : 30,
  COURT_PADDING: Platform.OS === 'ios' ? 40 : 70
};
