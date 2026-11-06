import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';

import { ActivityIndicator, Alert, Dimensions, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { DragProvider, useDrag } from '@/context/DragContext';
import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { debugTranslations } from '@/utils/debugTranslations';

import { BenchPanel, PANEL_HEIGHT_COLLAPSED, PANEL_HEIGHT_EXPANDED } from '@/components/BenchPanel';
import { GenericCourt } from '@/components/GenericCourt';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { Player } from '@/components/Player';
import { SportSelector } from '@/components/SportSelector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { AddPlayersSheet } from '@/components/team/AddPlayersSheet';
import { LineupBar } from '@/components/team/LineupBar';
import { PlayerSheet } from '@/components/team/PlayerSheet';
import { RosterList } from '@/components/team/RosterList';
import { TeamActionsSheet } from '@/components/team/TeamActionsSheet';
import { TeamHeader } from '@/components/team/TeamHeader';
import { TeamSwitcherSheet } from '@/components/team/TeamSwitcherSheet';
import { TeamView, ViewSwitch } from '@/components/team/ViewSwitch';
import { sportsConfig } from '@/constants/sports';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSport } from '@/context/SportContext';
import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { PlayerType } from '@/types/models';
import { DropAction } from '@/utils/resolveDrop';

// Team header (74), the court / players switch (48) and the line-up chips (48), until the court is measured
const HEADER_HEIGHT = 170;

type Sheet = 'none' | 'switch' | 'actions' | 'add' | 'player';

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
  const { team, teams, importTeamFromFile } = useTeam();
  const { selectedSport } = useSport();
  const { t } = useTranslation();
  const { activeDrag, dragX, dragY, overBench, courtRef } = useDrag();

  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [benchExpanded, setBenchExpanded] = useState(false);
  const [courtContainerSize, setCourtContainerSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<TeamView>('court');
  const [sheet, setSheet] = useState<Sheet>('none');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const closeSheet = () => setSheet('none');
  const openPlayer = (id: string) => {
    setPlayerId(id);
    setSheet('player');
  };
  
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

  const sheets = (
    <>
      <TeamSwitcherSheet visible={sheet === 'switch'} onClose={closeSheet} />
      <TeamActionsSheet visible={sheet === 'actions'} onClose={closeSheet} />
      <AddPlayersSheet visible={sheet === 'add'} onClose={closeSheet} />
      <PlayerSheet playerId={playerId} visible={sheet === 'player'} onClose={closeSheet} />
    </>
  );

  if (!team) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <View style={styles.empty}>
          <ThemedText style={styles.emptyText}>{teams.length === 0 ? t('noTeamsExist') : t('pickATeam')}</ThemedText>
          <ThemedButton onPress={() => setSheet('switch')}>{teams.length === 0 ? t('addATeam') : t('yourTeams')}</ThemedButton>
        </View>
        {sheets}
      </ThemedView>
    );
  }

  const playerCount = team.startingPlayers.length + team.benchPlayers.length;

  // On iOS the tab bar is position:absolute (overlays content), so subtract it.
  // On Android the tab bar is in normal flow, content area already excludes it.
  const tabBarOffset = Platform.OS === 'ios' ? tabBarHeight : 0;
  // Get exact dimensions from the container layout, defaulting to window dimensions
  const availableWidth = courtContainerSize.width > 0 ? courtContainerSize.width : Dimensions.get('window').width;
  const benchHeight = benchExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COLLAPSED;
  const availableHeight = courtContainerSize.height > 0 ? courtContainerSize.height : Dimensions.get('window').height - insets.top - 10 - HEADER_HEIGHT - benchHeight - tabBarOffset;
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

        <TeamHeader
          onSwitchTeam={() => setSheet('switch')}
          onTeamOptions={() => setSheet('actions')}
          onAddPlayers={() => setSheet('add')}
        />

        {playerCount === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyText}>{t('noPlayersYet')}</ThemedText>
            <ThemedButton onPress={() => setSheet('add')}>{t('addPlayers')}</ThemedButton>
          </View>
        ) : (
          <>
            <ViewSwitch view={view} playerCount={playerCount} onChange={setView} />
            <LineupBar />

            {view === 'players' ? (
              <RosterList onPlayerPress={openPlayer} />
            ) : (
              <>
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
                      playerPositions={team.startingPlayers}
                      CourtSvg={Svg}
                      aspectRatio={aspectRatio}
                      onPlayerPress={openPlayer}
                    />
                  </View>
                </View>

                {/* Keeps the court clear of the bench, so no player ends up hidden under it */}
                <View style={{ height: benchHeight + tabBarOffset }} />

                <BenchPanel
                  expanded={benchExpanded}
                  onToggle={() => setBenchExpanded(current => !current)}
                  tabBarHeight={tabBarHeight}
                  onPlayerPress={openPlayer}
                />
              </>
            )}
          </>
        )}

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

        {sheets}
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
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
