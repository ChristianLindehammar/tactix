import { Platform, Dimensions } from 'react-native';

// Detect if device is an iPad based on screen dimensions and platform
const isIpad = Platform.OS === 'ios' && Math.min(Dimensions.get('window').width, Dimensions.get('window').height) >= 768;

export const LAYOUT = {
  PLAYER: {
    SIZE: 40,       // Player marker size
  },
  PLAYER_SPACING: {
    OFFSET: 40,
    MAX_TRIES: 5
  },
  TAB_BAR_HEIGHT: Platform.OS === 'ios' 
    ? (isIpad ? 65 : 80) 
    : 30,
  COURT_PADDING: Platform.OS === 'ios' ? 40 : 70
};