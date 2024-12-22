import React, { useRef } from 'react';
import { StyleSheet, View, Button, TextInput, Text } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { LAYOUT } from '@/constants/layout';
import { NestableDraggableFlatList, NestableScrollContainer } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerListItem } from '@/components/PlayerListItem';
import { PlayerSeparator } from '@/components/PlayerSeparator';
import { PlayerType } from '@/types/models';

export default function TeamScreen() {
  const { team, addPlayer, movePlayerToCourt, movePlayerToBench , updatePlayerIndex} = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const benchHeaderRef = useRef<View>(null);

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

    ...team.startingPlayers.sort((a, b) => a.index - b.index).map(p => ({ ...p, type: 'player' })),
    { id: 'bench-header', type: 'header', title: 'Bench Players' },
    ...team.benchPlayers.sort((a, b) => a.index - b.index).map(p => ({ ...p, type: 'player' })),
  ];

  const renderItem = ({ item, drag, isActive }: any) => {
    if (item.type === 'header') {
      return (
        <View ref={item.title === 'Bench Players' ? benchHeaderRef : undefined}>
          <ThemedText style={styles.headerText}>
            {item.title}
          </ThemedText>
        </View>
      );
    }

    return (
      <PlayerListItem
        key={item.id}
        player={item}
        onPress={() => {}}
        drag={drag}
        isActive={isActive}
        isOnCourt={team.startingPlayers.some(p => p.id === item.id)}
      />
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ThemedView style={[styles.container, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
            <ThemedView style={styles.addPlayerContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter player name"
                value={newPlayerName}
                onChangeText={setNewPlayerName}
              />
              <Button title="Add Player" onPress={handleAddPlayer} />
            </ThemedView>
            <ThemedText style={styles.headerText}>
              Starting Players
            </ThemedText>
            <NestableScrollContainer>
              <NestableDraggableFlatList
                data={listData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                onDragEnd={handlePlayersChange}
              />
            </NestableScrollContainer>
          </ThemedView>
        </SafeAreaView>
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
});
