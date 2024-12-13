import React from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { PlayerPosition, Position } from '@/types/player';

type PlayerProps = PlayerPosition & {
  onDragEnd: (playerId: string, position: Position) => void;
};

export const Player = ({ id, position, onDragEnd }: PlayerProps) => {
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
    />
  );
};

const styles = StyleSheet.create({
  player: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: 'red',
    borderRadius: 10,
  },
});
