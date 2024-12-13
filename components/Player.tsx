import React from 'react';
import { View, StyleSheet, PanResponder, Text } from 'react-native';

interface PlayerProps {
  id: string;
  name: string;
  position: { x: number; y: number };
  onDragEnd: (playerId: string, position: { x: number; y: number }) => void;
}

export const Player = ({ id, name, position, onDragEnd }: PlayerProps) => {
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const { moveX, moveY } = gestureState;
      onDragEnd(id, { x: moveX, y: moveY });
    },
  });

  return (
    <View
      style={[styles.player, { left: position.x, top: position.y }]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.playerName}>{name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
