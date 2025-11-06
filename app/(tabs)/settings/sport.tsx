import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTranslation } from '@/hooks/useTranslation';
import { SportSelector } from '@/components/SportSelector';
import { useThemeColor } from '@/hooks/useThemeColor';

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
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
});

