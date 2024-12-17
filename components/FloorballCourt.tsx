import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FloorballSvg from './ui/FloorballSvg';
import { Player } from './Player';
import { PlayerType } from '@/types/models';

interface Props {
  availableHeight: number;
  playerPositions: PlayerType[];
  onDragEnd: (playerId: string, position: { x: number; y: number }) => void;
}

export const FloorballCourt = ({ availableHeight, playerPositions, onDragEnd }: Props) => {
  const height = availableHeight;
  console.log(playerPositions);
  const width = (height * 484) / 908;

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <View style={[styles.container, { width, height }]}>
        <FloorballSvg width={width} height={height} />
        <View style={StyleSheet.absoluteFill}>
          {playerPositions
            .map((player) => (
              <Player
                key={player.id}
                id={player.id}
                name={player.name}
                position={player.position}
                courtPosition={player.courtPosition ?? { x: 0, y: 0 }}
                onDragEnd={(pos) => onDragEnd(player.id, pos)}
                containerSize={{ width, height }}
              />
          ))}
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  player: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: 'red',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerName: {
    color: 'white',
    fontWeight: 'bold',
  },
});
