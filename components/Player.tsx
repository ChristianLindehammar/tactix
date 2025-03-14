import { Position } from '@/types/models';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { useSport } from '@/context/SportContext';
import { sportsConfig } from '@/constants/sports';
import { useThemeColor } from '@/hooks/useThemeColor';

interface PlayerProps {
  id: string;
  name: string;
  position: string;
  courtPosition: Position;
  onDragEnd: (position: Position) => void;
  containerSize: { width: number; height: number };
  isSelected?: boolean;
}

export function Player({ 
  id, 
  name, 
  position, 
  courtPosition, 
  onDragEnd, 
  containerSize,
  isSelected = false 
}: PlayerProps) {
  const MARKER_SIZE = 40;
  const halfMarker = MARKER_SIZE / 2;
  
  const translateX = useSharedValue(courtPosition.x * containerSize.width);
  const translateY = useSharedValue(courtPosition.y * containerSize.height);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    translateX.value = courtPosition.x * containerSize.width;
    translateY.value = courtPosition.y * containerSize.height;
  }, [containerSize.width, containerSize.height, courtPosition.x, courtPosition.y]);

  React.useEffect(() => {
    zIndex.value = isSelected || isActive ? 10 : 1;
    scale.value = withSpring(isSelected || isActive ? 1.1 : 1);
  }, [isSelected, isActive, zIndex, scale]);

  const { selectedSport } = useSport();
  const { positions, positionColors = {} } = sportsConfig[selectedSport ?? 'soccer'];
  const safePosition = positions.includes(position) ? position : positions[0];

  const panGesture = Gesture.Pan()
    .hitSlop({ top: 10, bottom: 10, left: 10, right: 10 })
    .onStart(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
      runOnJS(setIsActive)(true);
    })
    .onUpdate((event) => {
      translateX.value = offsetX.value + event.translationX;
      translateY.value = offsetY.value + event.translationY;
    })
    .onEnd(() => {
      const newX = translateX.value / containerSize.width;
      const newY = translateY.value / containerSize.height;
      runOnJS(onDragEnd)({ x: newX, y: newY });
      runOnJS(setIsActive)(false);
    })
    .onFinalize(() => {
      runOnJS(setIsActive)(false);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - halfMarker },
      { translateY: translateY.value - halfMarker },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  const nameBoxBackgroundColor = useThemeColor({}, 'background');
  const nameBoxBorderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[animatedStyle, styles.playerContainer]}>
        <View 
          style={[
            styles.playerMarker, 
            { 
              backgroundColor: positionColors[safePosition] || 'white',
              borderWidth: isActive ? 3 : 2, // Make border thicker when active
            }
          ]} 
        />
        <View style={[
          styles.nameBox, 
          { 
            backgroundColor: typeof nameBoxBackgroundColor === 'string' ? nameBoxBackgroundColor : 'white',
            borderColor: typeof nameBoxBorderColor === 'string' ? nameBoxBorderColor : 'black'
          }
        ]}>
          <Text 
            numberOfLines={2} 
            ellipsizeMode="tail" 
            style={[styles.playerName, { color: typeof textColor === 'string' ? textColor : '#000' }]}
          >
            {name}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  playerMarker: {
    width: 40, 
    height: 40,
    borderRadius: 20, 
    borderWidth: 2,
    borderColor: 'black',
  },
  nameBox: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
    maxWidth: 70,
    alignSelf: 'center',
    marginTop: 2,
  },
  playerName: {
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
    flexWrap: 'wrap', 
  },
  playerContainer: {
    alignItems: 'center',
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
