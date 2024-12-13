import { StyleSheet, View, Button, TextInput, FlatList, TouchableOpacity, Text } from 'react-native';
import { useState } from 'react';
import { Team, Player } from '@/models';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function TeamScreen() {
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

  const addPlayer = () => {
    if (newPlayerName.trim() !== '') {
      const newPlayer: Player = { id: Date.now().toString(), name: newPlayerName };
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
          data={team.startingPlayers}
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
          data={team.benchPlayers}
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
