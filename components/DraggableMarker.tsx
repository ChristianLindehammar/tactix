import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface DraggableMarkerProps {
  id: string;
  x: number; // relative (0-1)
  y: number; // relative (0-1)
  containerSize: { width: number; height: number };
  onDragEnd: (id: string, x: number, y: number) => void;
  children: React.ReactNode;
  zIndex?: number;
}

export const DraggableMarker: React.FC<DraggableMarkerProps> = ({
  id,
  x,
  y,
  containerSize,
  onDragEnd,
  children,
  zIndex = 2,
}) => {
  const MARKER_SIZE = 40;
  const halfMarker = MARKER_SIZE / 2;
  const translateX = useSharedValue(x * containerSize.width);
  const translateY = useSharedValue(y * containerSize.height);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    translateX.value = x * containerSize.width;
    translateY.value = y * containerSize.height;
  }, [x, y, containerSize.width, containerSize.height]);

  const panGesture = Gesture.Pan()
    .hitSlop({ top: 10, bottom: 10, left: 10, right: 10 })
    .onStart(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
      scale.value = withSpring(1.1);
    })
    .onUpdate((event) => {
      translateX.value = offsetX.value + event.translationX;
      translateY.value = offsetY.value + event.translationY;
    })
    .onEnd(() => {
      const newX = translateX.value / containerSize.width;
      const newY = translateY.value / containerSize.height;
      runOnJS(onDragEnd)(id, newX, newY);
      scale.value = withSpring(1);
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - halfMarker },
      { translateY: translateY.value - halfMarker },
      { scale: scale.value },
    ],
    zIndex,
    position: 'absolute',
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[animatedStyle, styles.marker]}>{children}</Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
