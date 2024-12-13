import React from 'react';
import { View, StyleSheet } from 'react-native';
import FloorballSvg from './ui/FloorballSvg';
import { Player } from './Player';

interface Player {
  id: string;
  name: string;
  position: { x: number; y: number };
}

interface Props {
  availableHeight: number;
  playerPositions: Player[];
  onDragEnd: (playerId: string, position: { x: number; y: number }) => void;
}

export const FloorballCourt = ({ availableHeight, playerPositions, onDragEnd }: Props) => {
  const height = availableHeight;
  const width = (height * 484) / 908;

  return (
    <View style={styles.container}>
      <FloorballSvg width={width} height={height} />
      {playerPositions.map((player) => (
        <Player
          key={player.id}
          id={player.id}
          name={player.name}
          position={player.position}
          onDragEnd={onDragEnd}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
