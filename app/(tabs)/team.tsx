import { StyleSheet, View, Button, TextInput, FlatList } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { LAYOUT } from '@/constants/layout';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerListItem } from '@/components/PlayerListItem';
import { PlayerSeparator } from '@/components/PlayerSeparator';
import { PlayerType } from '@/types/models';

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const { team, addBenchPlayer, movePlayerToCourt, movePlayerToBench } = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const separatorRef = useRef<View>(null);
  const [separatorY, setSeparatorY] = useState<number>(0);

  const addPlayer = () => {
    if (newPlayerName.trim() !== '') {
      addBenchPlayer({ id: Date.now().toString(), name: newPlayerName, position: { x: 0, y: 0 }});
      setNewPlayerName('');
    }
  };

  const onSeparatorLayout = useCallback(() => {
    if (separatorRef.current) {
      separatorRef.current.measureInWindow((x, y, width, height) => {
        setSeparatorY(y);
      });
    }
  }, []);

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
            <Button title="Add Player" onPress={addPlayer} />
          </ThemedView>
          
          <FlatList
            data={[]}
            ListHeaderComponent={
              <>
                <ThemedText style={styles.headerText}>Court Players</ThemedText>
                {team.startingPlayers.map(player => (
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
                  onLayout={onSeparatorLayout}
                />
                <ThemedText style={styles.headerText}>Bench Players</ThemedText>
                {team.benchPlayers.map(player => (
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
