import { ScrollView, StyleSheet } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { SportSelector } from '@/components/SportSelector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function SportSelectionScreen() {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'background');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background as string }} edges={['bottom']}>
      <ScrollView style={{ flex: 1, backgroundColor: background as string }}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.section}>
            <ThemedText style={styles.description}>
              {t('selectCurrentSport')}
            </ThemedText>
            <SportSelector />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    paddingHorizontal: 16,
  },
});

