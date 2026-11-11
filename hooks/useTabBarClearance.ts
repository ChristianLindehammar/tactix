import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

/** Space to leave under scrolling content, as the iOS tab bar floats over the screen. */
export function useTabBarClearance() {
  const tabBarHeight = useBottomTabBarHeight();
  return Platform.OS === 'ios' ? tabBarHeight : 0;
}
