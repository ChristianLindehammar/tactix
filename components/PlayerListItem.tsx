import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PlayerType, PlayerPosition } from '@/types/models';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { positionColors } from '@/constants/positionColors';
import { useTeam } from '@/contexts/TeamContext'; // Import useTeam

interface PlayerListItemProps {
  player: PlayerType;
  onPress: (player: PlayerType) => void;
  onDragEnd: (player: PlayerType, y: number) => void;
  isOnCourt: boolean;
}

export function PlayerListItem({ player, onPress, onDragEnd, isOnCourt }:PlayerListItemProps) {
  const { setPlayerType } = useTeam(); // Renamed method from setPlayerPosition to setPlayerType
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      translateY.value = 0;
    })
    .onUpdate((event) => {
      'worklet';
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      'worklet';
      runOnJS(onDragEnd)(player, event.absoluteY);
      translateY.value = withTiming(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const positions = Object.values(PlayerPosition)

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[
        styles.container,
        animatedStyle,
        { backgroundColor: positionColors[player.position] },
      ]}>
        <Text>{player.name}</Text>
        <SegmentedControl
          values={positions}
          selectedIndex={positions.indexOf(player.position)}
          onChange={(event) => {
            const selectedPosition = positions[event.nativeEvent.selectedSegmentIndex];
            setPlayerType(player.id, selectedPosition); // Updated method name
          }}
          style={styles.segmentedControl}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  onCourt: {
    backgroundColor: '#e3f2fd',
  },
  onBench: {
    backgroundColor: '#f5f5f5',
  },
  status: {
    fontSize: 12,
    color: '#666',
  },
  segmentedControl: {
    marginTop: 8,
  },
});
