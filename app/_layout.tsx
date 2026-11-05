import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TeamProvider } from '@/context/TeamContext';
import { SportProvider } from '@/context/SportContext';
import { AppState, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { syncExercises } from '@/services/exerciseRepository';

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    void syncExercises();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void syncExercises();
    });
    return () => subscription.remove();
  }, []);

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
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="modal/teamModal" 
                  options={{ 
                    presentation: 'transparentModal',
                    animation: 'fade',  // This will fade the background
                    headerShown: false, // Remove the header
                    cardStyle: { 
                      backgroundColor: 'transparent',
                    },
                  }} 
                />
                <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </SafeAreaProvider>
        </TeamProvider>
      </SportProvider>
    </View>
  );
}
