import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';

import { ActivityIndicator, Alert, Dimensions, LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DragProvider, useDrag } from '@/context/DragContext';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { debugTranslations } from '@/utils/debugTranslations';

import { BenchPanel, PANEL_HEIGHT_COLLAPSED, PANEL_HEIGHT_EXPANDED } from '@/components/BenchPanel';
import { CourtConfigurationSelector } from '@/components/CourtConfigurationSelector';
import { GenericCourt } from '@/components/GenericCourt';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBottomTabBarHeight } from "expo-router/js-tabs";
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
import { PlayerType } from '@/types/models';
import { DropAction } from '@/utils/resolveDrop';

// Title header (52), the team switcher (38) and the configuration switcher (36)
const CONFIGURATION_SELECTOR_HEIGHT = 126;

export default function HomeScreen() {
  const { movePlayerToCourt, movePlayerToBench, updatePlayerPosition } = useTeam();

  const handleDrop = (player: PlayerType, action: DropAction) => {
    switch (action.type) {
      case 'toCourt':
        movePlayerToCourt(player.id, action.position);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'toBench':
        movePlayerToBench(player.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'reposition':
        updatePlayerPosition(player.id, action.position);
        break;
    }
  };

  return (
    <DragProvider onDrop={handleDrop}>
      <HomeScreenContent />
    </DragProvider>
  );
}

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { team, importTeamFromFile } = useTeam();
  const { selectedSport } = useSport();
  const { t } = useTranslation();
  const { activeDrag, dragX, dragY, overBench, courtRef } = useDrag();

  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [benchExpanded, setBenchExpanded] = useState(false);
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

  const ghostSource = activeDrag?.source;
  const ghostPlayerStyle = useAnimatedStyle(() => {
    const markerSize = 40;
    // A court player only needs the ghost over the bench, which is drawn above the court
    const visible = ghostSource === 'bench' || (ghostSource === 'court' && overBench.value);
    return {
      position: 'absolute',
      left: dragX.value - markerSize / 2,
      top: dragY.value - markerSize / 2,
      opacity: visible ? 0.9 : 0,
      zIndex: 999,
    };
  });

  const onCourtLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCourtContainerSize({ width, height });
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
  const benchHeight = benchExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COLLAPSED;
  const availableHeight = courtContainerSize.height > 0 ? courtContainerSize.height : Dimensions.get('window').height - insets.top - 10 - CONFIGURATION_SELECTOR_HEIGHT - benchHeight - tabBarOffset;
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
          <View
            ref={courtRef}
            collapsable={false}
            style={{ width: finalDimensions.width, height: finalDimensions.height }}
          >
            <GenericCourt
              availableHeight={finalDimensions.height}
              availableWidth={finalDimensions.width}
              playerPositions={team?.startingPlayers ?? []}
              CourtSvg={Svg}
              aspectRatio={aspectRatio}
            />
          </View>
        </View>

        {/* Keeps the court clear of the bench, so no player ends up hidden under it */}
        <View style={{ height: benchHeight + tabBarOffset }} />

        <BenchPanel
          expanded={benchExpanded}
          onToggle={() => setBenchExpanded(current => !current)}
          tabBarHeight={tabBarHeight}
        />

        {activeDrag && (
          <Animated.View style={ghostPlayerStyle} pointerEvents="none">
            <Player
              id={activeDrag.player.id + '-ghost'}
              name={activeDrag.player.name}
              position={activeDrag.player.position}
              displayMode="court"
              ghostMode={true}
              isOnCourt={false}
            />
          </Animated.View>
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
    // Lets the container shrink below the court's last size when the bench opens, so it can be measured again
    minHeight: 0,
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
