import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTranslation } from '@/hooks/useTranslation';
import { Collapsible } from '@/components/Collapsible';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function AboutScreen() {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'background');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background as string }} edges={['bottom']}>
      <ScrollView style={{ flex: 1, backgroundColor: background as string }}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.section}>
            <ThemedText style={styles.description}>
              {t('aboutTheApp')}
            </ThemedText>
            <ThemedText style={styles.copyright}>
              {t('copyright')}
            </ThemedText>
          </ThemedView>

          <Collapsible title={t('thirdPartyLibs')}>
            <ThemedText style={styles.librariesTitle}>
              {t('thirdPartyLibraries')}:
            </ThemedText>
            <ThemedView style={styles.librariesList}>
              <ThemedText style={styles.libraryItem}>• @expo/vector-icons - MIT License</ThemedText>
              <ThemedText style={styles.libraryItem}>• async-storage - MIT License</ThemedText>
              <ThemedText style={styles.libraryItem}>• @react-native-picker - MIT License</ThemedText>
              <ThemedText style={styles.libraryItem}>• @react-navigation - MIT License</ThemedText>
              <ThemedText style={styles.libraryItem}>• expo and related packages - MIT License</ThemedText>
              <ThemedText style={styles.libraryItem}>• react & react-native - MIT License</ThemedText>
              <ThemedText style={styles.libraryItem}>• react-native-reorderable-list - MIT License</ThemedText>
              <ThemedText style={styles.libraryItem}>• react-native-reanimated - MIT License</ThemedText>
              <ThemedText style={styles.libraryItem}>• react-native-svg - MIT License</ThemedText>
            </ThemedView>
          </Collapsible>
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
  copyright: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.7,
  },
  librariesTitle: {
    marginBottom: 8,
  },
  librariesList: {
    paddingLeft: 16,
  },
  libraryItem: {
    marginBottom: 4,
  },
});

