import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';

interface PlayerProps {
  id: string;
  name: string;
  position: { x: number; y: number };
  onDragEnd: (position: { x: number; y: number }) => void;
  containerSize: { width: number; height: number };
}

export function Player({ id, name, position, onDragEnd, containerSize }: PlayerProps) {
  const translateX = useSharedValue(position.x);
  const translateY = useSharedValue(position.y);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.max(0, Math.min(event.absoluteX, containerSize.width - 40));
      translateY.value = Math.max(0, Math.min(event.absoluteY, containerSize.height - 40));
    })
    .onEnd(() => {
      runOnJS(onDragEnd)({ x: translateX.value, y: translateY.value });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.player, animatedStyle]}>
        <Text style={styles.playerName}>{name[0]}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  player: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
