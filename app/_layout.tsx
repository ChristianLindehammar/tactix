import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TeamProvider } from '@/contexts/TeamContext';
import { SportProvider } from '@/context/SportContext';
import { SheetProvider } from 'react-native-actions-sheet';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Error hiding splash screen:', e);
      }
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SportProvider>
        <TeamProvider>
          <SafeAreaProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <SheetProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </SheetProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </TeamProvider>
      </SportProvider>
    </View>
  );
}
