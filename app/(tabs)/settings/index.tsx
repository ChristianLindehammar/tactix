import { ScrollView, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsListItem } from '@/components/SettingsListItem';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'background');
  const menuBackground = useThemeColor({}, 'menuBackground');
  const cardBorderColor = useThemeColor({}, 'borderColor');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background as string }} edges={['top']}>
      <ScrollView style={{ flex: 1, backgroundColor: background as string }}>
        <ThemedView style={styles.container}>
          {/* Header */}
          <ThemedView style={styles.headerContainer}>
            <IconSymbol size={80} color='#808080' name='gear' />
            <ThemedText type='title' style={styles.title}>{t('settings')}</ThemedText>
          </ThemedView>
          
          {/* Settings List - Grouped Card */}
          <View style={[styles.settingsCard, { 
            backgroundColor: menuBackground as string,
            borderColor: cardBorderColor as string,
          }]}>
            <SettingsListItem
              icon="sports-soccer"
              title={t('sportSelection')}
              route="/settings/sport"
              isFirst={true}
            />
            <SettingsListItem
              icon="info"
              title={t('aboutApp')}
              route="/settings/about"
              isLast={true}
            />
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  title: {
    marginTop: 16,
  },

  settingsCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    // iOS-style subtle border
    borderWidth: 1,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Android elevation
    elevation: 2,
  },
});

