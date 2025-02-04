import { Position } from '@/types/models';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useSport } from '@/context/SportContext';
import { sportsConfig } from '@/constants/sports';
import { LAYOUT } from '@/constants/layout';

interface PlayerProps {
  id: string;
  name: string;
  position: string;
  courtPosition: Position;
  onDragEnd: (position: Position) => void;
  containerSize: { width: number; height: number };
}

export function Player({ id, name, position, courtPosition, onDragEnd, containerSize }: PlayerProps) {
  // Calculate scale factors
  const scaleX = containerSize.width / LAYOUT.FLOORBALL_COURT.WIDTH;
  const scaleY = containerSize.height / LAYOUT.FLOORBALL_COURT.HEIGHT;

  // Initialize with scaled values
  const translateX = useSharedValue(courtPosition.x * LAYOUT.FLOORBALL_COURT.WIDTH * scaleX);
  const translateY = useSharedValue(courtPosition.y * LAYOUT.FLOORBALL_COURT.HEIGHT * scaleY);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  // Update when container size or position changes
  React.useEffect(() => {
    translateX.value = courtPosition.x * LAYOUT.FLOORBALL_COURT.WIDTH * scaleX;
    translateY.value = courtPosition.y * LAYOUT.FLOORBALL_COURT.HEIGHT * scaleY;
  }, [containerSize.width, containerSize.height, courtPosition.x, courtPosition.y]);

  const { selectedSport } = useSport();
  const { positions, positionColors = {} } = sportsConfig[selectedSport ?? 'soccer'];
  const safePosition = positions.includes(position) ? position : positions[0];

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      offsetX.value = translateX.value - event.absoluteX;
      offsetY.value = translateY.value - event.absoluteY;
    })
    .onUpdate((event) => {
      translateX.value = event.absoluteX + offsetX.value;
      translateY.value = event.absoluteY + offsetY.value;
    })
    .onEnd(() => {
      // Convert back to ratio based on original dimensions
      const newX = translateX.value / (LAYOUT.FLOORBALL_COURT.WIDTH * scaleX);
      const newY = translateY.value / (LAYOUT.FLOORBALL_COURT.HEIGHT * scaleY);
      runOnJS(onDragEnd)({ x: newX, y: newY });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    backgroundColor: positionColors[safePosition] || 'white',
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.player, animatedStyle]}>
        <Text 
          numberOfLines={2} 
          ellipsizeMode="tail" 
          style={styles.playerName}
        >
          {name}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  player: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'black',
    padding: 4,
  },
  playerName: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    width: '90%',
  },
});
