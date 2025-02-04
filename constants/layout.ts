import { Platform } from 'react-native';

export const LAYOUT = {
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