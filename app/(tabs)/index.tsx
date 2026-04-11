import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';

import { ActivityIndicator, Alert, Dimensions, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DragProvider, useDrag } from '@/context/DragContext';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { debugTranslations } from '@/utils/debugTranslations';

import { BenchPanel } from '@/components/BenchPanel';
import { CourtConfigurationSelector } from '@/components/CourtConfigurationSelector';
import { GenericCourt } from '@/components/GenericCourt';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LayoutRectangle } from 'react-native';
import { Player } from '@/components/Player';
import { SportSelector } from '@/components/SportSelector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TooltipModal } from '@/components/TooltipModal';
import { sportsConfig } from '@/constants/sports';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSport } from '@/context/SportContext';
import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';

const PANEL_HEIGHT_COLLAPSED = 35;
const CONFIGURATION_SELECTOR_HEIGHT = 40;

export default function HomeScreen() {
  return (
    <DragProvider>
      <HomeScreenContent />
    </DragProvider>
  );
}

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { team, updatePlayerPosition, importTeamFromFile } = useTeam();
  const { selectedSport } = useSport();
  const { t } = useTranslation();
  const { draggedItem, dragPosition, isDragging } = useDrag();

  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [courtLayout, setCourtLayout] = useState<LayoutRectangle | null>(null);
  const [courtContainerSize, setCourtContainerSize] = useState({ width: 0, height: 0 });
  const [showConfigurationTooltip, setShowConfigurationTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | undefined>();
  const configurationSelectorRef = useRef<View>(null);
  
  const pathname = usePathname();
  
  const isFileUrl = pathname && (pathname.startsWith('file:') || pathname.startsWith('content:'));
  
  // Debug translations on mount
  useEffect(() => {
    if (__DEV__) {
      debugTranslations();
    }
  }, []);
  
  useEffect(() => {
    if (isFileUrl) {
      setIsProcessingFile(true);
    }
  }, [isFileUrl]);

  useEffect(() => {
    const handleOpenURL = async ({ url }: { url: string }) => {
      try {
        if (!url || (!url.startsWith('file://') && !url.startsWith('content://'))) {
          return;
        }

        setIsProcessingFile(true);

        if (pathname !== '/') {
          router.replace('/');
        }

        console.log('Handling URL:', url);
        let fileUri = url;
        let isTempFile = false;

        // For content:// URIs (common on Android from file managers, email, cloud storage),
        // copy to a temp file since we can't read content URIs directly with FileSystem.
        if (Platform.OS === 'android' && url.startsWith('content://')) {
          const tempFile = `${FileSystem.cacheDirectory}temp_import.coachmate`;
          await FileSystem.copyAsync({
            from: url,
            to: tempFile
          });
          fileUri = tempFile;
          isTempFile = true;
        }

        // For file:// URIs, verify the extension. For content:// URIs (copied to temp),
        // we skip this check since the original URI doesn't contain the extension.
        // The JSON validation in importTeamFromFile will catch invalid files.
        if (!isTempFile && !fileUri.toLowerCase().endsWith('.coachmate')) {
          throw new Error('invalidFile');
        }

        const importedTeam = await importTeamFromFile(fileUri);

        if (isTempFile) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }

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
      } catch (error: unknown) {
        console.error('Error handling file:', error);
        const errorMessage = error instanceof Error ? error.message : '';
        const translationKey = [
          'fileReadError', 'fileParseError', 'invalidTeamFormat',
          'missingTeamName', 'missingStartingPlayers',
          'missingBenchPlayers', 'missingTeamSport',
        ].includes(errorMessage) ? errorMessage : 'failedToImportTeamFile';
        Alert.alert(
          t('error'),
          t(translationKey),
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

  // Show tooltip for CourtConfigurationSelector
  useEffect(() => {
    const checkAndShowTooltip = async () => {
      try {
        const hasSeenConfigTooltip = await AsyncStorage.getItem('configurationTooltipShown');
        if (hasSeenConfigTooltip === 'true') {
          return;
        }

        if (team && selectedSport && configurationSelectorRef.current) {
          setTimeout(() => {
            if (configurationSelectorRef.current) {
              configurationSelectorRef.current.measure((_x, _y, width, height, pageX, pageY) => {
                setTooltipPosition({
                  x: pageX + width / 2,
                  y: pageY + height + 10,
                });
                setShowConfigurationTooltip(true);
              });
            }
          }, 1000); // Small delay to ensure layout is complete
        }
      } catch (error) {
        console.error('Error checking configuration tooltip status:', error);
      }
    };

    checkAndShowTooltip();
  }, [team, selectedSport]);

  const handleConfigurationTooltipClose = async () => {
    setShowConfigurationTooltip(false);
    
    // Mark tooltip as shown so it doesn't appear again
    try {
      await AsyncStorage.setItem('configurationTooltipShown', 'true');
    } catch (error) {
      console.error('Error saving tooltip shown status:', error);
    }
  };

  const ghostPlayerStyle = useAnimatedStyle(() => {
    if (!dragPosition) {
      return {
        position: 'absolute',
        left: -1000,
        top: -1000,
        opacity: 0,
      };
    }

    const markerSize = 40;
    return {
      position: 'absolute',
      left: dragPosition.x - markerSize / 2,
      top: dragPosition.y - markerSize / 2,
      opacity: 0.9,
      zIndex: 999,
    };
  });

  const onCourtLayout = (event: any) => {
    const layout = event.nativeEvent.layout;
    // For BenchPanel drop detection, we provide the layout of the court container.
    setCourtLayout(layout);
    // For sizing the court itself, we don't subtract padding anymore as it is removed.
    setCourtContainerSize({
      width: layout.width,
      height: layout.height,
    });
  };

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

  // On iOS the tab bar is position:absolute (overlays content), so subtract it.
  // On Android the tab bar is in normal flow, content area already excludes it.
  const tabBarOffset = Platform.OS === 'ios' ? tabBarHeight : 0;
  // Get exact dimensions from the container layout, defaulting to window dimensions
  const availableWidth = courtContainerSize.width > 0 ? courtContainerSize.width : Dimensions.get('window').width;
  const availableHeight = courtContainerSize.height > 0 ? courtContainerSize.height : Dimensions.get('window').height - insets.top - 10 - CONFIGURATION_SELECTOR_HEIGHT - PANEL_HEIGHT_COLLAPSED - tabBarOffset;
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={{ height: insets.top }} />

        <View ref={configurationSelectorRef} collapsable={false}>
          <CourtConfigurationSelector />
        </View>

        <TooltipModal
          visible={showConfigurationTooltip}
          onClose={handleConfigurationTooltipClose}
          message={t('configurationTooltipMessage') || 'Switch between different team configurations. Long press to rename or delete.'}
          position={tooltipPosition}
        />

        <View
          style={styles.courtContainer}
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

        <View style={{ height: PANEL_HEIGHT_COLLAPSED + tabBarOffset }} />

        <BenchPanel courtLayout={courtLayout} tabBarHeight={tabBarHeight} />

        {isDragging && draggedItem && dragPosition && (
          <>
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
    height: 150,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});
