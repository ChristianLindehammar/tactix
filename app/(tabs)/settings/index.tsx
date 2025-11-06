import { StyleSheet, TouchableOpacity, Linking, Share, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColor } from '@/hooks/useThemeColor';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SettingsListItem } from '@/components/SettingsListItem';

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

  // Share handler
  const handleShareTestingPage = async () => {
    try {
      await Share.share({
        message: `${t('checkOutBetaTestingProgram')}: ${landingPageUrl}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView style={{ flex: 1 }}>
        <ThemedView style={styles.container}>
          {/* Header */}
          <ThemedView style={styles.headerContainer}>
            <IconSymbol size={80} color='#808080' name='gear' />
            <ThemedText type='title' style={styles.title}>{t('settings')}</ThemedText>
          </ThemedView>
          
          {/* Beta tester announcement with link and share */}
          <ThemedView style={[styles.announcementContainer, { 
            backgroundColor: announcementBgColor, 
            borderColor: announcementBorderColor 
          }]}>
            <TouchableOpacity 
              onPress={handleOpenTestingPage} 
              style={styles.announcementTouchable}
            >
              <IconSymbol name="smartphone" size={24} color={announcementIconColor} />
              <ThemedView style={styles.announcementTextContainer}>
                <ThemedText style={styles.announcementTitle}>
                  {t('betaTestersNeeded')}
                </ThemedText>
                <ThemedText style={styles.announcementBody}>
                  {t('betaTestingProgramDescription')}
                </ThemedText>
              </ThemedView>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleShareTestingPage} 
              style={styles.shareButton}
            >
              <MaterialIcons size={24} name="share" color={announcementIconColor} />
            </TouchableOpacity>
          </ThemedView>

          {/* Settings List */}
          <ThemedView style={styles.settingsList}>
            <SettingsListItem
              icon="sports"
              title={t('sportSelection')}
              route="/settings/sport"
            />
            <SettingsListItem
              icon="info"
              title={t('aboutApp')}
              route="/settings/about"
            />
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
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  title: {
    marginTop: 16,
  },
  announcementContainer: {
    flexDirection: 'row',
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  announcementTouchable: {
    flex: 1,
    flexDirection: 'row',
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  settingsList: {
    marginTop: 8,
  },
});

