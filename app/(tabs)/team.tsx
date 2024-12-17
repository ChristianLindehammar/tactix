import React from 'react';
import { StyleSheet, View, Button, TextInput, FlatList } from 'react-native';
import { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { LAYOUT } from '@/constants/layout';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerListItem } from '@/components/PlayerListItem';
import { PlayerSeparator } from '@/components/PlayerSeparator';
import { PlayerType } from '@/types/models';

export default function TeamScreen() {
  const { team, addPlayer, movePlayerToCourt, movePlayerToBench , updatePlayerIndex} = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const separatorRef = useRef<View>(null);

  const handleAddPlayer = () => {
    if (newPlayerName.trim() !== '') {
      addPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };


  const handlePlayerDragEnd = (player: PlayerType, yPosition: number) => {
    // Measure separator position again on drag end to ensure accuracy
    separatorRef.current?.measureInWindow((x, y) => {


      const isAboveSeparator = yPosition < y;
      const currentlyOnCourt = team.startingPlayers.some((p) => p.id === player.id);

      if (isAboveSeparator && !currentlyOnCourt) {
        console.log('Moving player to court');
        movePlayerToCourt(player.id);
      } else if (!isAboveSeparator && currentlyOnCourt) {
        console.log('Moving player to bench');
        movePlayerToBench(player.id);
      }
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          
          <FlatList
            data={[]}
            ListHeaderComponent={
              <>
                <ThemedText style={styles.headerText}>Court Players</ThemedText>
                {team.startingPlayers
                  .sort((a, b) => a.index - b.index)
                  .map(player => (
                    <PlayerListItem
                      key={player.id}
                      player={player}
                      onPress={() => {}}
                      onDragEnd={handlePlayerDragEnd}
                      isOnCourt={true}
                    />
                  ))}
                <PlayerSeparator 
                  ref={separatorRef}
                />
                <ThemedText style={styles.headerText}>Bench Players</ThemedText>
                {team.benchPlayers
                  .sort((a, b) => a.index - b.index)
                  .map(player => (
                    <PlayerListItem
                      key={player.id}
                      player={player}
                      onPress={() => {}}
                      onDragEnd={handlePlayerDragEnd}
                      isOnCourt={false}
                    />
                  ))}
              </>
            }
            renderItem={() => null}
          />
        </ThemedView>
      </SafeAreaView>
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
