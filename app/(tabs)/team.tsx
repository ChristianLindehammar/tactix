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
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
} from 'react-native-reorderable-list';
import { TooltipModal } from '@/components/TooltipModal';

export default function TeamScreen() {
  const { team, teams, addPlayer, setPlayers } = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const benchHeaderRef = useRef<View>(null);
  const textColor  = useThemeColor({}, 'text') as string
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [showDragHint, setShowDragHint] = useState(true);

  useEffect(() => {
    if (teams.length > 0 && team && team.startingPlayers.length === 0 && team.benchPlayers.length === 0) {
      setShowTooltip(true);
      const timer = setTimeout(() => setShowTooltip(false), 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
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

  const listData = useMemo(() => [
    ...(team?.startingPlayers || []).map((p) => ({ ...p, type: 'player' })),
    { id: 'bench-header', type: 'header', title: 'Bench Players' },
    ...(team?.benchPlayers || []).map((p) => ({ ...p, type: 'player' })),
  ], [team?.startingPlayers, team?.benchPlayers]);

  const handleAddPlayer = () => {
    if (newPlayerName.trim() !== '') {
      addPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    const newData = reorderItems(listData, from, to);
    const benchHeaderIndex = newData.findIndex((item: any) => item.id === 'bench-header');
    const courtPlayers = newData
      .slice(0, benchHeaderIndex)
      .filter((item): item is (PlayerType & { type: string }) => item.type === 'player')
      .map((p) => ({ ...p }));
    const benchPlayers = newData
      .slice(benchHeaderIndex + 1)
      .filter((item): item is (PlayerType & { type: string }) => item.type === 'player')
      .map((p) => ({ ...p }));
    setPlayers(courtPlayers, benchPlayers);
  };

  const renderItem = useCallback(({ item }: any) => {

    if (item.type === 'header') {
      return (
        <View ref={item.title === 'Bench Players' ? benchHeaderRef : undefined}>
          <ThemedText style={styles.headerText}>{item.title}</ThemedText>
        </View>
      );
    }

    return <PlayerListItem 
      key={item.id} 
      player={item} 
      isOnCourt={team?.startingPlayers.some((p) => p.id === item.id) ?? false} 
    />;
}, [benchHeaderRef, team?.startingPlayers]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
              {teams.length === 0 ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <ThemedText>No teams exist. Please create a team first.</ThemedText>
                              <ThemedButton onPress={() => navigation.navigate('modal/teamModal')}>
                                Create Team
                              </ThemedButton>
                  </View>
              ) : (
                <ThemedView style={[styles.container, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
                  <DragHintOverlay 
                    visible={showDragHint} 
                    onFinish={handleDragHintFinish}
                  />
                  <ThemedText style={styles.teamName}>{team?.name}</ThemedText>
                  
                  <TooltipModal
                    visible={showTooltip}
                    onClose={() => setShowTooltip(false)}
                    message="Start by adding players to your team using the input field above"
                  />

                  <ThemedView style={styles.addPlayerContainer}>
                    <TextInput style={[styles.input, {color: textColor}]} placeholder='Enter player name' value={newPlayerName} onChangeText={setNewPlayerName} />
                    <ThemedButton onPress={handleAddPlayer} disabled={newPlayerName.trim() === ''}>
                      Add Player
                    </ThemedButton>
                  </ThemedView>

                  <ReorderableList
                    ListHeaderComponent={<ThemedText style={styles.headerText}>Starting Players</ThemedText>}
                    data={listData}  // Use listData directly instead of playerData
                    onReorder={handleReorder}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    shouldUpdateActiveItem
                  />
                </ThemedView>
              )}
            </SafeAreaView>
          <Pressable style={styles.fab} onPress={() => navigation.navigate('modal/teamModal')}>
            <Ionicons name="people-outline" size={28} color="white" />
          </Pressable>
          </ThemedView>
    </GestureHandlerRootView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
