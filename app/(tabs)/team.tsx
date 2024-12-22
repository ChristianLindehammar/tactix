import React, { useRef } from 'react';
import { StyleSheet, View, Button, TextInput, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { LAYOUT } from '@/constants/layout';
import { NestableDraggableFlatList, NestableScrollContainer } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RBSheet from 'react-native-raw-bottom-sheet';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerListItem } from '@/components/PlayerListItem';
import { PlayerType } from '@/types/models';

export default function TeamScreen() {
  const { team, teams, addPlayer, movePlayerToCourt, movePlayerToBench , updatePlayerIndex, createTeam, selectTeam } = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSelectTeam, setShowSelectTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const benchHeaderRef = useRef<View>(null);
  const bottomSheetRef = useRef<typeof RBSheet>(null);

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
      <TouchableOpacity
        style={{ position: 'absolute', right: 16, bottom: 100 }}
        onPress={() => bottomSheetRef.current?.open()}
      >
        <Text style={{ fontSize: 32 }}>+</Text>
      </TouchableOpacity>
      <RBSheet ref={bottomSheetRef} height={200} openDuration={250}>
        <View style={{ padding: 20 }}>
          {(!showCreateTeam && !showSelectTeam) && (
            <>
              <Button title="Create Team" onPress={() => setShowCreateTeam(true)} />
              <Button title="Select Existing Team" onPress={() => setShowSelectTeam(true)} />
            </>
          )}
          {showCreateTeam && (
            <>
              <TextInput
                placeholder="New Team Name"
                value={newTeamName}
                onChangeText={setNewTeamName}
                style={{ borderColor: '#ccc', borderWidth: 1, marginBottom: 10, padding: 8 }}
              />
              <Button
                title="Confirm"
                onPress={() => {
                  createTeam(newTeamName.trim());
                  setNewTeamName('');
                  setShowCreateTeam(false);
                  bottomSheetRef.current?.close();
                }}
              />
            </>
          )}
          {showSelectTeam && (
            <>
              {teams.map((item) => (
                <Button
                  key={item.id}
                  title={item.name}
                  onPress={() => {
                    selectTeam(item.id);
                    setShowSelectTeam(false);
                    bottomSheetRef.current?.close();
                  }}
                />
              ))}
            </>
          )}
        </View>
      </RBSheet>
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
