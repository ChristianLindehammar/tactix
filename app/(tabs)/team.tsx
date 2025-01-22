import React, { useRef } from 'react';
import { StyleSheet, View, Button, TextInput, Text, Pressable, Platform } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { LAYOUT } from '@/constants/layout';
import { NestableDraggableFlatList, NestableScrollContainer } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SheetManager } from 'react-native-actions-sheet';
import TeamBottomSheet from '@/components/TeamBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { MenuProvider } from 'react-native-popup-menu';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerListItem } from '@/components/PlayerListItem';
import { PlayerType } from '@/types/models';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function TeamScreen() {
  const { team, teams, addPlayer, movePlayerToCourt, movePlayerToBench, updatePlayerIndex } = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const benchHeaderRef = useRef<View>(null);
  const bottomSheetRef = useRef<typeof RBSheet>(null);
  const tintColor  = useThemeColor({}, 'tint') as string
  const textColor  = useThemeColor({}, 'text') as string


  const handleAddPlayer = () => {
    if (newPlayerName.trim() !== '') {
      addPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  const handlePlayersChange = ({ data, from, to }: any) => {
    const movedPlayer = data[to];
    if (movedPlayer.type !== 'player') return;

    benchHeaderRef.current?.measureInWindow((x, benchY) => {
      // Find the indices of headers in the data array
      const benchHeaderIndex = data.findIndex((item: any) => item.id === 'bench-header');

      // If dropped before bench header index, it's court. If after, it's bench
      if (to < benchHeaderIndex) {
        console.log('Move to court');
        movePlayerToCourt(movedPlayer.id);
      } else {
        console.log('Move to bench');
        movePlayerToBench(movedPlayer.id);
      }

      // Update indices after moving
      const players = data.filter((item: any) => item.type === 'player');
      players.forEach((player: PlayerType, index: number) => {
        updatePlayerIndex(player.id, index, !!player.courtPosition);
      });
    });
  };

  // Combine data into a single array with headers
  const listData = [
    ...(team?.startingPlayers || []).sort((a, b) => a.index - b.index).map((p) => ({ ...p, type: 'player' })),
    { id: 'bench-header', type: 'header', title: 'Bench Players' },
    ...(team?.benchPlayers || []).sort((a, b) => a.index - b.index).map((p) => ({ ...p, type: 'player' })),
  ];

  const renderItem = ({ item, drag, isActive }: any) => {
    if (item.type === 'header') {
      return (
        <View ref={item.title === 'Bench Players' ? benchHeaderRef : undefined}>
          <ThemedText style={styles.headerText}>{item.title}</ThemedText>
        </View>
      );
    }

    return <PlayerListItem key={item.id} player={item} onPress={() => {}} drag={drag} isActive={isActive} isOnCourt={team?.startingPlayers.some((p) => p.id === item.id) ?? false} />;
  };

  return (
    <MenuProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            {teams.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>No teams exist. Please create a team first.</Text>
                <Button
                  title='Create Team'
                  onPress={() => {
                    bottomSheetRef.current?.open();
                  }}
                />
              </View>
            ) : (
              <ThemedView style={[styles.container, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
                <ThemedText style={styles.teamName}>{team?.name}</ThemedText>
                <ThemedView style={styles.addPlayerContainer}>
                  <TextInput style={[styles.input, {color: textColor}]} placeholder='Enter player name' value={newPlayerName} onChangeText={setNewPlayerName} />
                  <Button title='Add Player' onPress={handleAddPlayer} disabled={newPlayerName.trim() === ''} color={tintColor}/>
                </ThemedView>

                <NestableScrollContainer>
                  <NestableDraggableFlatList
                    ListHeaderComponent={<ThemedText style={styles.headerText}>Starting Players</ThemedText>}
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    onDragEnd={handlePlayersChange}
                  />
                </NestableScrollContainer>
              </ThemedView>
            )}
          </SafeAreaView>
        </ThemedView>
        <Pressable style={styles.fab} onPress={() => SheetManager.show('team-bottom-sheet')}>
        <Ionicons name="people-outline" size={28} color="white" />
        </Pressable>
        <TeamBottomSheet ref={bottomSheetRef} onClose={() => {}} />
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
});
