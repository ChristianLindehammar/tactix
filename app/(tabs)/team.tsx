import { StyleSheet, Platform, View, Button, TextInput, FlatList, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Player } from '@/types/player';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { usePlayers } from '@/contexts/PlayerContext';

export default function TabTwoScreen() {
  const insets = useSafeAreaInsets();
  const { players, selectedPlayers, setPlayers, setSelectedPlayers } = usePlayers();
  const [newPlayerName, setNewPlayerName] = useState('');

  const addPlayer = () => {
    if (newPlayerName.trim() !== '') {
      setPlayers([...players, { id: Date.now().toString(), name: newPlayerName }]);
      setNewPlayerName('');
    }
  };

  const selectPlayer = (playerId: string) => {
    setSelectedPlayers(
      selectedPlayers.includes(playerId)
        ? selectedPlayers.filter((id) => id !== playerId)
        : [...selectedPlayers, playerId]
    );
  };

  const ListHeader = () => (
    <>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explore</ThemedText>
      </ThemedView>

      <ThemedView style={styles.addPlayerContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter player name"
          value={newPlayerName}
          onChangeText={setNewPlayerName}
        />
        <Button title="Add Player" onPress={addPlayer} />
      </ThemedView>
    </>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[
        styles.content, 
        { 
          paddingTop: insets.top,
          paddingBottom: LAYOUT.TAB_BAR_HEIGHT 
        }
      ]}>
        <FlatList
          style={styles.list}
          data={players}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => selectPlayer(item.id)} style={styles.playerItem}>
              <Text style={selectedPlayers.includes(item.id) ? styles.selectedPlayer : styles.player}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
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
  selectedPlayer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'blue',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: Platform.select({ light: '#D0D0D0', dark: '#353636' }),
  },
  list: {
    flex: 1,
  },
});
