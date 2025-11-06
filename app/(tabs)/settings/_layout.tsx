import { Stack } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function SettingsLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
        headerTintColor: Colors[colorScheme ?? 'light'].tint,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: t('settings'),
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="sport" 
        options={{ 
          title: t('sportSelection'),
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="about" 
        options={{ 
          title: t('aboutApp'),
          headerShown: true,
        }} 
      />
    </Stack>
  );
}

