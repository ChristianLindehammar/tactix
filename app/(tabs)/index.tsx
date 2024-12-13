import { StyleSheet, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { usePlayers } from '@/contexts/PlayerContext';

import { ThemedView } from '@/components/ThemedView';
import { FloorballCourt } from '@/components/FloorballCourt';
import { LAYOUT } from '@/constants/layout';
import { PlayerPosition, Position } from '@/types/player';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);
  const { players, selectedPlayers } = usePlayers();

  const availableHeight = Dimensions.get('window').height 
    - insets.top 
    - LAYOUT.TAB_BAR_HEIGHT;

  // Initialize positions for newly selected players
  useEffect(() => {
    const newPositions = selectedPlayers
      .filter(id => !playerPositions.some(pos => pos.id === id))
      .map(id => ({
        id,
        position: { x: 50, y: 50 } // Default starting position
      }));

    if (newPositions.length > 0) {
      setPlayerPositions([...playerPositions, ...newPositions]);
    }

    // Remove unselected players
    setPlayerPositions(prev => 
      prev.filter(pos => selectedPlayers.includes(pos.id))
    );
  }, [selectedPlayers]);

  const handleDragEnd = (playerId: string, position: Position) => {
    setPlayerPositions((prevPositions: PlayerPosition[]) =>
      prevPositions.map((player: PlayerPosition) =>
        player.id === playerId ? { ...player, position } : player
      )
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.courtContainer, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
        <FloorballCourt availableHeight={availableHeight} playerPositions={playerPositions} onDragEnd={handleDragEnd} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  courtContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.COURT_PADDING,
  },
});
