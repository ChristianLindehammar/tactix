import { StyleSheet, View, Dimensions, Pressable, Platform, Alert, ActivityIndicator } from 'react-native';
import { router, usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { useSport } from '@/context/SportContext';
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated'; // Import Animated

import { ThemedView } from '@/components/ThemedView';
import { GenericCourt } from '@/components/GenericCourt';
import { LAYOUT } from '@/constants/layout';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import { SportSelector } from '@/components/SportSelector';
import { sportsConfig } from '@/constants/sports';
import { BenchPanel } from '@/components/BenchPanel'; // Import the new component
import { DragProvider, useDrag } from '@/contexts/DragContext'; // Import DragProvider and useDrag
import { Player } from '@/components/Player'; // Import Player for the ghost element
import { LayoutRectangle } from 'react-native';

// Import the panel height constant directly since it's needed for layout calculation
const PANEL_HEIGHT_COLLAPSED = 35; // Must match the value in BenchPanel.tsx

// Export the wrapped component
export default function HomeScreen() {
  return (
    <DragProvider>
      <HomeScreenContent />
    </DragProvider>
  );
}

// Main component content moved here
function HomeScreenContent() {
  // IMPORTANT: All hooks must be called at the top level, 
  // in the same order, on every render
  
  // Context hooks
  const insets = useSafeAreaInsets();
  const { team, updatePlayerPosition, importTeamFromFile } = useTeam();
  const { selectedSport } = useSport();
  const { t } = useTranslation();
  const { draggedItem, dragPosition, isDragging } = useDrag();

  // State hooks - must be called unconditionally
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [courtLayout, setCourtLayout] = useState<LayoutRectangle | null>(null);
  
  // Router hooks
  const pathname = usePathname();
  const segments = useSegments();
  
  // Check if the current URL is a file URL that needs handling
  const isFileUrl = pathname && (pathname.startsWith('file:') || pathname.startsWith('content:'));
  
  // Effects
  useEffect(() => {
    if (isFileUrl) {
      setIsProcessingFile(true);
    }
  }, [isFileUrl]);

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
  }, [pathname, t, router, importTeamFromFile, setIsProcessingFile]);

  // Ghost player style based on drag position - define this unconditionally
  const ghostPlayerStyle = useAnimatedStyle(() => {
    if (!dragPosition) {
      return {
        position: 'absolute',
        left: -1000, // Off-screen when not dragging
        top: -1000,
        opacity: 0,
      };
    }

    const markerSize = 40; // Size of the marker
    return {
      position: 'absolute',
      left: dragPosition.x - markerSize / 2, // Center horizontally
      top: dragPosition.y - markerSize / 2, // Center vertically
      opacity: 0.9,
      zIndex: 999,
    };
  });

  // Handle layout of the court container - define this function unconditionally
  const onCourtLayout = (event: any) => {
    const layout = event.nativeEvent.layout;
    setCourtLayout(layout);
  };

  // Early returns for different states
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

  // Calculate dimensions
  const availableHeight = Dimensions.get('window').height - insets.top - insets.bottom - LAYOUT.TAB_BAR_HEIGHT - PANEL_HEIGHT_COLLAPSED;
  const availableWidth = Dimensions.get('window').width;
  const { Svg, aspectRatio } = sportsConfig[selectedSport];
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

  // Main render
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={{ height: insets.top + 10 }} />
        
        {/* Court container with better centering */}
        <View 
          style={[
            styles.courtContainer,
            {
              paddingBottom: PANEL_HEIGHT_COLLAPSED + 60, // Increased padding to prevent court from hiding behind bench panel
            }
          ]} 
          onLayout={onCourtLayout}
        >
          <GenericCourt
            availableHeight={finalDimensions.height}
            availableWidth={finalDimensions.width}
            playerPositions={team?.startingPlayers ?? []}
            onDragEnd={updatePlayerPosition}
            CourtSvg={Svg}
            aspectRatio={aspectRatio}
          />
        </View>
        
        {/* Reserve minimal space for the BenchPanel */}
        <View style={{ height: PANEL_HEIGHT_COLLAPSED }} />
        
        {/* BenchPanel will position itself absolutely */}
        <BenchPanel courtLayout={courtLayout} />

        {/* Render the ghost Player when dragging from bench */}
        {isDragging && draggedItem && dragPosition && (
          <>
            {/* Only show ghost for bench players - check if the player is from the bench */}
            {team?.benchPlayers.some(p => p.id === draggedItem.player.id) && (
              <Animated.View style={ghostPlayerStyle} pointerEvents="none">
                <Player
                  id={draggedItem.player.id + '-ghost'}
                  name={draggedItem.player.name}
                  position={draggedItem.player.position}
                  displayMode="court"
                  ghostMode={true}
                  isOnCourt={false}
                  courtPosition={{ x: 0, y: 0 }}
                  containerSize={{ width: 0, height: 0 }}
                />
              </Animated.View>
            )}
          </>
        )}
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
