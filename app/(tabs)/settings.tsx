import { StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSport } from '@/context/SportContext';
import { useThemeColor } from '@/hooks/useThemeColor';

import { Collapsible } from '@/components/Collapsible';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsScreen() {
  const { selectedSport, setSelectedSport } = useSport();
  const textColor = useThemeColor({}, 'text');
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
        <Picker selectedValue={selectedSport} onValueChange={(itemValue) => setSelectedSport(itemValue)} style={[styles.picker, { color: textColor }]}>
          <Picker.Item label={t('floorball')} value='floorball' />
          <Picker.Item label={t('soccer')} value='football' />
          <Picker.Item label={t('hockey')} value='hockey' />
        </Picker>
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
  picker: {
    marginTop: 8,
    marginBottom: 16,
    maxWidth: 300,
    alignSelf: 'flex-start',
    width: '100%',
  },
});
