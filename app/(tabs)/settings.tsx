import { StyleSheet, TouchableOpacity, Linking, Share } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import { SportSelector } from '@/components/SportSelector';
import { useThemeColor } from '@/hooks/useThemeColor';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const bgColorValue = useThemeColor({}, 'announcement.background');
  const borderColorValue = useThemeColor({}, 'announcement.border');
  const iconColorValue = useThemeColor({}, 'announcement.icon');
  const background = useThemeColor({}, 'background');
  
  // Ensure we have string color values
  const announcementBgColor = typeof bgColorValue === 'string' ? bgColorValue : '#FFFFFF';
  const announcementBorderColor = typeof borderColorValue === 'string' ? borderColorValue : '#DDDDDD';
  const announcementIconColor = typeof iconColorValue === 'string' ? iconColorValue : '#000000';
  
  // Use your actual landing page URL here
  const landingPageUrl = 'https://lindehammar-konsult.se/coachmate-testing';
  
  const handleOpenTestingPage = () => {
    Linking.openURL(landingPageUrl);
  };

  // New share handler
  const handleShareTestingPage = async () => {
    try {
      await Share.share({
        message: `${t('checkOutAndroidTestingProgram')}: ${landingPageUrl}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={<IconSymbol size={310} color='#808080' name='gear' style={styles.headerImage} />}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title'>{t('settings')}</ThemedText>
      </ThemedView>
      
      {/* Combined Android tester announcement with link and share */}
      <ThemedView style={[styles.announcementContainer, { backgroundColor: announcementBgColor, borderColor: announcementBorderColor, flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={handleOpenTestingPage} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconSymbol name="smartphone" size={24} color={announcementIconColor} />
          <ThemedView style={styles.announcementTextContainer}>
            <ThemedText style={styles.announcementTitle}>{t('androidTestersNeeded')}</ThemedText>
            <ThemedText style={styles.announcementBody}>
              {t('androidTestingProgramDescription')}
            </ThemedText>
          </ThemedView>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleShareTestingPage} 
          style={styles.shareButton}>
         <MaterialIcons size={24} name="share" color={announcementIconColor}  />
        </TouchableOpacity>
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
  // Fixed announcement styles without inline theme colors
  announcementContainer: {
    flexDirection: 'row',
    padding: 8,
    marginVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  announcementTextContainer: {
    flex: 1,
  },
  announcementTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    margin: 8,
  },
  announcementBody: {
    fontSize: 14,
    margin: 8,
  },
  shareButton: {
    padding: 10,
    borderRadius: 20,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,           // Adding a border to make the button more visible
    borderColor: 'rgba(0,0,0,0.1)', // Light border for definition
  },
});
