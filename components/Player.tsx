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
  const translateX = useSharedValue(courtPosition.x * containerSize.width);
  const translateY = useSharedValue(courtPosition.y * containerSize.height);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = courtPosition.x * containerSize.width;
    translateY.value = courtPosition.y * containerSize.height;
  }, [containerSize.width, containerSize.height, courtPosition.x, courtPosition.y]);

  const { selectedSport } = useSport();
  const { positions, positionColors = {} } = sportsConfig[selectedSport ?? 'soccer'];
  const safePosition = positions.includes(position) ? position : positions[0];

  const MARKER_SIZE = 60;
  const halfMarker = MARKER_SIZE / 2;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = offsetX.value + event.translationX;
      translateY.value = offsetY.value + event.translationY;
    })
    .onEnd(() => {
      const newX = translateX.value / containerSize.width;
      const newY = translateY.value / containerSize.height;
      runOnJS(onDragEnd)({ x: newX, y: newY });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - halfMarker },
      { translateY: translateY.value - halfMarker },
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
