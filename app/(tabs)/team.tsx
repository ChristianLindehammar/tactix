import { StyleSheet, View, Button, TextInput, FlatList } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Team, Player } from '@/types/models';
import { LAYOUT } from '@/constants/layout';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlayerListItem } from '@/components/PlayerListItem';
import { PlayerSeparator } from '@/components/PlayerSeparator';

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const [team, setTeam] = useState<Team>({
    id: '1',
    name: 'My Team',
    startingPlayers: [],
    benchPlayers: [],
    createdBy: 'user1',
    sharedWith: [],
    lastEdited: Date.now(),
    editedBy: 'user1',
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const separatorRef = useRef<View>(null);
  const [separatorY, setSeparatorY] = useState<number>(0);

  const addPlayer = () => {
    if (newPlayerName.trim() !== '') {
      const newPlayer: Player = { id: Date.now().toString(), name: newPlayerName, position: { x: 0, y: 0 } };
      setTeam((prevTeam) => ({
        ...prevTeam,
        benchPlayers: [...prevTeam.benchPlayers, newPlayer],
      }));
      setNewPlayerName('');
    }
  };

  const movePlayerToCourt = (playerId) => {
    setTeam((prevTeam) => {
      const player = prevTeam.benchPlayers.find((p) => p.id === playerId);
      if (player) {
        return {
          ...prevTeam,
          benchPlayers: prevTeam.benchPlayers.filter((p) => p.id !== playerId),
          startingPlayers: [...prevTeam.startingPlayers, player],
        };
      }
      return prevTeam;
    });
  };

  const movePlayerToBench = (playerId) => {
    setTeam((prevTeam) => {
      const player = prevTeam.startingPlayers.find((p) => p.id === playerId);
      if (player) {
        return {
          ...prevTeam,
          startingPlayers: prevTeam.startingPlayers.filter((p) => p.id !== playerId),
          benchPlayers: [...prevTeam.benchPlayers, player],
        };
      }
      return prevTeam;
    });
  };

  const onSeparatorLayout = useCallback(() => {
    if (separatorRef.current) {
      separatorRef.current.measureInWindow((x, y, width, height) => {
        console.log('Separator position updated:', y);
        setSeparatorY(y);
      });
    }
  }, []);

  const handlePlayerDragEnd = (player: Player, yPosition: number) => {
    // Measure separator position again on drag end to ensure accuracy
    separatorRef.current?.measureInWindow((x, y) => {
      console.log('Current positions:', {
        playerY: yPosition,
        separatorY: y
      });
      
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
