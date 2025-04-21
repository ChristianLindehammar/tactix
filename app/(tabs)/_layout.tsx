import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          android: {
            height: 70,
            paddingTop: 10,
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('playGround'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="sportscourt.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: t('team'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.3.fill" color={color} />,
        }}/>
      <Tabs.Screen
        name="tactics"
        options={{
          title: t('tactics'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="lightbulb" color={color} />, // Use a lightbulb or similar icon for tactics
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gear" color={color} />,
        }}
      />
    </Tabs>
  );
}
