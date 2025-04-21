import { StyleSheet, View, Dimensions, Pressable, Platform, Alert, ActivityIndicator } from 'react-native';
import { router, usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { useSport } from '@/context/SportContext';
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedView } from '@/components/ThemedView';
import { GenericCourt } from '@/components/GenericCourt';
import { LAYOUT } from '@/constants/layout';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import { SportSelector } from '@/components/SportSelector';
import { sportsConfig } from '@/constants/sports';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { team, updatePlayerPosition, importTeamFromFile } = useTeam();
  const { selectedSport } = useSport();
  const { t } = useTranslation();
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const pathname = usePathname();
  const segments = useSegments();

  // Check if the current URL is a file URL that needs handling
  const isFileUrl = pathname && (pathname.startsWith('file:') || pathname.startsWith('content:'));
  
  // Set processing flag on initial render if we detect file URL
  useEffect(() => {
    if (isFileUrl) {
      setIsProcessingFile(true);
    }
  }, []);

  useEffect(() => {
    const handleOpenURL = async ({ url }: { url: string }) => {
      try {
        // Skip navigation URLs - only process file:// or content:// URLs
        if (!url || (!url.startsWith('file://') && !url.startsWith('content://'))) {
          return;
        }
        
        // Set processing state to prevent component updates during file handling
        setIsProcessingFile(true);
        
        // Redirect immediately to home to prevent "not found" page from showing
        if (pathname !== '/') {
          router.replace('/');
        }
        
        console.log('Handling URL:', url);
        let fileUri = url;

        // Handle content:// URIs on Android
        if (Platform.OS === 'android' && url.startsWith('content://')) {
          const tempFile = `${FileSystem.cacheDirectory}temp.coachmate`;
          await FileSystem.copyAsync({
            from: url,
            to: tempFile
          });
          fileUri = tempFile;
        }

        // Validate file extension
        if (!fileUri.toLowerCase().endsWith('.coachmate')) {
          throw new Error('Invalid file type. Only .coachmate files are supported.');
        }

        const importedTeam = await importTeamFromFile(fileUri);

        // Clean up temp file if created
        if (fileUri !== url) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }

        // Show success alert with team name
        Alert.alert(
          t('success'),
          t('teamImportSuccessful', { teamName: importedTeam.name }),
          [{ 
            text: t('ok'), 
            onPress: () => {
              setIsProcessingFile(false);
              router.replace('/team');
            }
          }]
        );
      } catch (error) {
        console.error('Error handling file:', error);
        Alert.alert(
          t('error'), 
          t('failedToImportTeamFile'),
          [{ 
            text: t('ok'), 
            onPress: () => {
              setIsProcessingFile(false);
              router.replace('/');
            }
          }]
        );
      }
    };

    // Handle both cold and warm starts
    const checkInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && (initialUrl.startsWith('file://') || initialUrl.startsWith('content://'))) {
        await handleOpenURL({ url: initialUrl });
      }
    };
    checkInitialURL();

    const subscription = Linking.addEventListener('url', handleOpenURL);
    return () => subscription.remove();
  }, [pathname]);

  // Show loading state during file processing or when viewing a file URL directly
  if (isProcessingFile || isFileUrl) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </ThemedView>
    );
  }

  if (!selectedSport) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <View style={styles.sportSelectorContainer}>
          <ThemedText style={styles.titleText}>
            {t('welcomeToCoachMate')}</ThemedText>
          <ThemedText style={styles.subtitleText}>
            {t('selectPreferredSport')}</ThemedText>
          <SportSelector />
        </View>
      </ThemedView>
    );
  }

  if (!team) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <Pressable style={styles.noTeamContainer} onPress={() => router.push('/team')}>
          <ThemedText style={styles.noTeamText}>
            {t('createTeamPrompt')}
            </ThemedText>
          <IconSymbol name='arrow.right.circle.fill' size={42} color='gray' style={styles.arrow} />
        </Pressable>
      </ThemedView>
    );
  }

  const availableHeight = Dimensions.get('window').height - insets.top - insets.bottom - LAYOUT.TAB_BAR_HEIGHT;

  const availableWidth = Dimensions.get('window').width;


  const { Svg, aspectRatio } = sportsConfig[selectedSport];

  // Calculate dimensions to fill the screen while maintaining aspect ratio
  const screenRatio = availableWidth / availableHeight;

  const finalDimensions =
    screenRatio > aspectRatio
      ? {
          width: availableHeight * aspectRatio,
          height: availableHeight,
        }
      : {
          width: availableWidth,
          height: availableWidth / aspectRatio,
        };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={[styles.courtContainer, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
          <GenericCourt
            availableHeight={finalDimensions.height}
            availableWidth={finalDimensions.width}
            playerPositions={team?.startingPlayers ?? []}
            onDragEnd={updatePlayerPosition}
            CourtSvg={Svg}
            aspectRatio={aspectRatio}
          />
        </View>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTeamContainer: {
    alignItems: 'center',
    padding: 16,
  },
  noTeamText: {
    textAlign: 'center',
    marginRight: 8,
  },
  arrow: {
    opacity: 0.7,
  },
  courtContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.COURT_PADDING,
  },
  sportSelectorContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  picker: {
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
    height: 150, // Add fixed height for better vertical centering
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});
