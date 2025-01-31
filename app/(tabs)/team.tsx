import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View, TextInput, Text, Pressable, Platform } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { LAYOUT } from '@/constants/layout';
import { NestableDraggableFlatList, NestableScrollContainer } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { MenuProvider } from 'react-native-popup-menu';
import { useNavigation, NavigationProp } from '@react-navigation/native';

type RootStackParamList = {
  'modal/teamModal': undefined;
};

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerListItem } from '@/components/PlayerListItem';
import { PlayerType } from '@/types/models';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedButton } from '@/components/ThemedButton';

export default function TeamScreen() {
  const { team, teams, addPlayer, setPlayers } = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const benchHeaderRef = useRef<View>(null);
  const textColor  = useThemeColor({}, 'text') as string
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleAddPlayer = () => {
    if (newPlayerName.trim() !== '') {
      addPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  const handlePlayersChange = ({ data }: any) => {
    const benchHeaderIndex = data.findIndex((item: any) => item.id === 'bench-header');
    const courtPlayers = data
      .slice(0, benchHeaderIndex)
      .filter((item: any) => item.type === 'player')
      .map((p: PlayerType) => ({ ...p }));
    const benchPlayers = data
      .slice(benchHeaderIndex + 1)
      .filter((item: any) => item.type === 'player')
      .map((p: PlayerType) => ({ ...p }));
    setPlayers(courtPlayers, benchPlayers);
  };

  const listData = useMemo(() => [
    ...(team?.startingPlayers || []).map((p) => ({ ...p, type: 'player' })),
    { id: 'bench-header', type: 'header', title: 'Bench Players' },
    ...(team?.benchPlayers || []).map((p) => ({ ...p, type: 'player' })),
  ], [team?.startingPlayers, team?.benchPlayers]);

  const renderItem = useCallback(({ item, drag, isActive }: any) => {
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
      onPress={() => {}} 
      drag={drag} 
      isActive={isActive} 
      isOnCourt={team?.startingPlayers.some((p) => p.id === item.id) ?? false} 
    />;
}, [benchHeaderRef, team?.startingPlayers]);

  const keyExtractor = React.useCallback((item: any, index: number) => `${item.id}-${index}`, []);

  return (
    <MenuProvider>
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
                <ThemedText style={styles.teamName}>{team?.name}</ThemedText>
                <ThemedView style={styles.addPlayerContainer}>
                  <TextInput style={[styles.input, {color: textColor}]} placeholder='Enter player name' value={newPlayerName} onChangeText={setNewPlayerName} />
                  <ThemedButton onPress={handleAddPlayer} disabled={newPlayerName.trim() === ''}>
                    Add Player
                  </ThemedButton>
                </ThemedView>

                <NestableScrollContainer>
                  <NestableDraggableFlatList
                    ListHeaderComponent={<ThemedText style={styles.headerText}>Starting Players</ThemedText>}
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    onDragEnd={handlePlayersChange}
                  />
                </NestableScrollContainer>
              </ThemedView>
            )}
          </SafeAreaView>
        </ThemedView>
        <Pressable style={styles.fab} onPress={() => navigation.navigate('modal/teamModal')}>
          <Ionicons name="people-outline" size={28} color="white" />
        </Pressable>
      </GestureHandlerRootView>
    </MenuProvider>
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
