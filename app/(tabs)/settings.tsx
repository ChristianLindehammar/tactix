import { StyleSheet, TouchableOpacity, Linking } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import { SportSelector } from '@/components/SportSelector';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const announcementBgColor = useThemeColor({}, 'announcement.background');
  const announcementBorderColor = useThemeColor({}, 'announcement.border');
  const announcementIconColor = useThemeColor({}, 'announcement.icon');
  
  // Use your actual landing page URL here
  const landingPageUrl = 'https://lindehammar-konsult.se/coachmate-testing';
  
  const handleOpenTestingPage = () => {
    Linking.openURL(landingPageUrl);
  };

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={<IconSymbol size={310} color='#808080' name='gear' style={styles.headerImage} />}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title'>{t('settings')}</ThemedText>
      </ThemedView>
      
      {/* Android tester announcement */}
      <TouchableOpacity onPress={handleOpenTestingPage} activeOpacity={0.8}>
        <ThemedView style={[styles.announcementContainer, { backgroundColor: announcementBgColor, borderColor: announcementBorderColor }]}>
          <IconSymbol name="smartphone" size={24} style={[styles.announcementIcon, { color: announcementIconColor }]} />
          <ThemedView style={styles.announcementTextContainer}>
            <ThemedText style={styles.announcementTitle}>Android Testers Needed!</ThemedText>
            <ThemedText style={styles.announcementBody}>
              We're looking for users to help test our Android version. Tap here to join our testing program and provide feedback.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
      
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
  // Fixed announcement styles without inline theme colors
  announcementContainer: {
    flexDirection: 'row',
    padding: 16,
    marginVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  announcementIcon: {
    // Color will be applied dynamically
  },
  announcementTextContainer: {
    flex: 1,
  },
  announcementTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  announcementBody: {
    fontSize: 14,
  },
});
