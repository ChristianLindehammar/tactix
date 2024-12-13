import React from 'react';
import { View, StyleSheet, PanResponder, Text } from 'react-native';
import FloorballSvg from './ui/FloorballSvg';

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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const { moveX, moveY } = gestureState;
      const playerId = evt.target.dataset.playerId;
      if (playerId) {
        onDragEnd(playerId, { x: moveX, y: moveY });
      }
    },
  });

  return (
    <View style={styles.container}>
      <FloorballSvg width={width} height={height} />
      {playerPositions.map((player) => (
        <View
          key={player.id}
          style={[styles.player, { left: player.position.x, top: player.position.y }]}
          {...panResponder.panHandlers}
          data-player-id={player.id}
        >
          <Text style={styles.playerName}>{player.name}</Text>
        </View>
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
