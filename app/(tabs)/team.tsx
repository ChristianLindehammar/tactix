import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { LAYOUT } from '@/constants/layout';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DragHintOverlay } from '@/components/DragHintOverlay';

type RootStackParamList = {
  'modal/teamModal': undefined;
};

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerListItem } from '@/components/PlayerListItem';
import { PlayerType } from '@/types/models';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedButton } from '@/components/ThemedButton';
import ReorderableList, { ReorderableListReorderEvent, reorderItems } from 'react-native-reorderable-list';
import { TooltipModal } from '@/components/TooltipModal';
import { useTranslation } from '@/hooks/useTranslation';

export default function TeamScreen() {
  const { team, teams, addPlayer, setPlayers, findFreePosition } = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const benchHeaderRef = useRef<View>(null);
  const textColor = useThemeColor({}, 'text') as string;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [showDragHint, setShowDragHint] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | undefined>();
  const textInputRef = useRef<TextInput>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (teams.length > 0 && team && team.startingPlayers.length === 0 && team.benchPlayers.length === 0) {
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.measure((x, y, width, height, pageX, pageY) => {
            setTooltipPosition({
              x: pageX + width / 2,
              y: pageY + height + 10,
            });
          });
        }
        setShowTooltip(true);
      }, 1000); // Small delay to ensure layout is complete

      const timer = setTimeout(() => setShowTooltip(false), 5000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [teams, team]);

  useEffect(() => {
    const checkAndShowDragHint = async () => {
      if (team?.startingPlayers.length === 2 || team?.benchPlayers.length === 2) {
        const hasShownHint = await AsyncStorage.getItem('dragHintShown');
        if (!hasShownHint) {
          setShowDragHint(true);
        }
      }
    };
    checkAndShowDragHint();
  }, [team?.startingPlayers.length, team?.benchPlayers.length]);

  const handleDragHintFinish = useCallback(async () => {
    setShowDragHint(false);
    await AsyncStorage.setItem('dragHintShown', 'true');
  }, []);

  const listData = useMemo(
    () => [
      ...(team?.startingPlayers || []).map((p) => ({ ...p, type: 'player' })),
      { id: 'bench-header', type: 'header', title: t('benchPlayers') },
      ...(team?.benchPlayers || []).map((p) => ({ ...p, type: 'player' })),
    ],
    [team?.startingPlayers, team?.benchPlayers]
  );

  const handleAddPlayer = () => {
    if (newPlayerName.trim() !== '') {
      addPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    // Calculate the new visual order directly from the event
    const newData = reorderItems(listData, from, to);

    // Find the separator index in the new order
    const benchHeaderIndex = newData.findIndex((item: any) => item.id === 'bench-header');

    // Extract players based on their position relative to the separator in the new order
    const newCourtPlayers = newData
      .slice(0, benchHeaderIndex)
      .filter((item): item is PlayerType & { type: string } => item.type === 'player')
      .map(player => ({
          ...player,
          // Ensure court players have a position; assign if missing
          courtPosition: player.courtPosition && player.courtPosition.x >= 0 ? player.courtPosition : findFreePosition() 
      }));

    const newBenchPlayers = newData
      .slice(benchHeaderIndex + 1)
      .filter((item): item is PlayerType & { type: string } => item.type === 'player')
      // Ensure players moved to bench lose their specific court position
      .map(player => ({
          ...player,
          courtPosition: undefined // Clear court position for bench players
      }));

    // Update the context with the complete new lists
    setPlayers(newCourtPlayers, newBenchPlayers);
  };

  const renderItem = useCallback(
    ({ item }: any) => {
      if (item.type === 'header') {
        return (
          <View ref={item.title ===  t('benchPlayers') ? benchHeaderRef : undefined}>
            <ThemedText style={styles.headerText}>{item.title}</ThemedText>
          </View>
        );
      }

      return <PlayerListItem key={item.id} player={item} isOnCourt={team?.startingPlayers.some((p) => p.id === item.id) ?? false} />;
    },
    [benchHeaderRef, team?.startingPlayers]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          {teams.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <ThemedText>{t('noTeamsExist')}</ThemedText>
              <ThemedButton onPress={() => navigation.navigate('modal/teamModal')}>{t('createTeam')}</ThemedButton>
            </View>
          ) : (
            <ThemedView style={[styles.container, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
              <DragHintOverlay visible={showDragHint} onFinish={handleDragHintFinish} />
              <ThemedText style={styles.teamName}>{team?.name}</ThemedText>

              <TooltipModal visible={showTooltip} onClose={() => setShowTooltip(false)} message={t('startByAddingPlayers')} position={tooltipPosition} />

              <ThemedView style={styles.addPlayerContainer}>
                <TextInput ref={textInputRef} style={[styles.input, { color: textColor }]} placeholder={t('enterPlayerName')} value={newPlayerName} onChangeText={setNewPlayerName} />
                <ThemedButton onPress={handleAddPlayer} disabled={newPlayerName.trim() === ''}>
                  {t('addPlayer')}
                </ThemedButton>
              </ThemedView>

              <ReorderableList
                ListHeaderComponent={<ThemedText style={styles.headerText}>
                  {t('startingPlayers')}
                </ThemedText>}
                ListFooterComponent={<View style={styles.listFooter} />}
                data={listData} 
                onReorder={handleReorder}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                shouldUpdateActiveItem
              />
            </ThemedView>
          )}
        </SafeAreaView>
        <Pressable style={styles.fab} onPress={() => navigation.navigate('modal/teamModal')}>
          <Ionicons name='people-outline' size={28} color='white' />
        </Pressable>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listFooter: {
    paddingBottom: 80,
  },
  addPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 8,
    marginRight: 8,
  },
  playerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  player: {
    fontSize: 16,
  },
  sectionContainer: {
    margin: 16,
    flex: 1,
  },
  headerText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 16,
  },
  teamName: {
    textAlign: 'center',
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'android' ? 30 : 100,
    backgroundColor: '#0097B2',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});
