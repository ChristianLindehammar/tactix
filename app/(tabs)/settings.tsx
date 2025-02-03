import { StyleSheet } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import { SportSelector } from '@/components/SportSelector';

export default function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={<IconSymbol size={310} color='#808080' name='gear' style={styles.headerImage} />}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title'>{t('settings')}</ThemedText>
      </ThemedView>
      <Collapsible title={t('aboutApp')}>
        <ThemedText style={{ marginBottom: 8 }}>{t('aboutTheApp')}</ThemedText>
        <ThemedText style={{ marginBottom: 16 }}>{t('copyright')}</ThemedText>

        <Collapsible title={t('thirdPartyLibs')}>
          <ThemedText style={{ marginBottom: 8 }}>{t('thirdPartyLibraries')}:</ThemedText>
          <ThemedView style={{ paddingLeft: 16 }}>
            <ThemedText>• @expo/vector-icons - MIT License</ThemedText>
            <ThemedText>• async-storage - MIT License</ThemedText>
            <ThemedText>• @react-native-picker - MIT License</ThemedText>
            <ThemedText>• @react-navigation - MIT License</ThemedText>
            <ThemedText>• expo and related packages - MIT License</ThemedText>
            <ThemedText>• react & react-native - MIT License</ThemedText>
            <ThemedText>• react-native-reorderable-list - MIT License</ThemedText>
            <ThemedText>• react-native-reanimated - MIT License</ThemedText>
            <ThemedText>• react-native-svg - MIT License</ThemedText>
          </ThemedView>
        </Collapsible>
      </Collapsible>

      <Collapsible title={t('generalSettings')} defaultOpen={true}>
        <ThemedText>{t('selectCurrentSport')}</ThemedText>
        <SportSelector />
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
