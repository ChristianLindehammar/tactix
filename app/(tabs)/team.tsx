import { StyleSheet, View, Button, TextInput, FlatList, TouchableOpacity, Text } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function TeamScreen() {
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [courtPlayers, setCourtPlayers] = useState([]);
  const [benchPlayers, setBenchPlayers] = useState([]);

  const addPlayer = () => {
    if (newPlayerName.trim() !== '') {
      setPlayers([...players, { id: Date.now().toString(), name: newPlayerName }]);
      setNewPlayerName('');
    }
  };

  const movePlayerToCourt = (playerId) => {
    setBenchPlayers((prevBenchPlayers) => prevBenchPlayers.filter((id) => id !== playerId));
    setCourtPlayers((prevCourtPlayers) => [...prevCourtPlayers, playerId]);
  };

  const movePlayerToBench = (playerId) => {
    setCourtPlayers((prevCourtPlayers) => prevCourtPlayers.filter((id) => id !== playerId));
    setBenchPlayers((prevBenchPlayers) => [...prevBenchPlayers, playerId]);
  };

  return (
    <ThemedView>
      <ThemedView style={styles.addPlayerContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter player name"
          value={newPlayerName}
          onChangeText={setNewPlayerName}
        />
        <Button title="Add Player" onPress={addPlayer} />
      </ThemedView>
      <ThemedView style={styles.sectionContainer}>
        <ThemedText type="subtitle">On the Court</ThemedText>
        <FlatList
          data={courtPlayers.map((id) => players.find((player) => player.id === id))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => movePlayerToBench(item.id)} style={styles.playerItem}>
              <Text style={styles.player}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </ThemedView>
      <ThemedView style={styles.sectionContainer}>
        <ThemedText type="subtitle">On the Bench</ThemedText>
        <FlatList
          data={benchPlayers.map((id) => players.find((player) => player.id === id))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => movePlayerToCourt(item.id)} style={styles.playerItem}>
              <Text style={styles.player}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  },
});
