import React, { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
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
  onDragStart?: (id: string) => void;
  onLongPress?: () => void;
  /** A tool is selected, so taps around the marker should reach the court. */
  placing?: boolean;
  /**
   * What a tap on the marker does. On iOS a press held a moment starts a drag, which takes the touch
   * from the marker's own button, so a drag that ends where it started counts as the tap instead.
   * Android still delivers the press to the button, so there the button alone handles it.
   */
  onPress?: () => void;
}

// How far a drag may wander and still count as a tap
const TAP_SLOP = 8;
const DRAG_TAKES_THE_PRESS = Platform.OS === 'ios';

export const DraggableMarker: React.FC<DraggableMarkerProps> = ({
  id,
  x,
  y,
  containerSize,
  onDragEnd,
  children,
  zIndex = 2,
  onDragStart,
  onLongPress,
  placing = false,
  onPress,
}) => {
  const MARKER_SIZE = 40;
  const halfMarker = MARKER_SIZE / 2;
  const translateX = useSharedValue(x * containerSize.width);
  const translateY = useSharedValue(y * containerSize.height);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Update position when props change
  useEffect(() => {
    translateX.value = x * containerSize.width;
    translateY.value = y * containerSize.height;
  }, [x, y, containerSize.width, containerSize.height]);

  // Long press gesture for deletion
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (onLongPress) {
        runOnJS(onLongPress)();
      }
    });

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .withTestId(`marker-drag-${id}`)
    .hitSlop(placing ? 0 : 20)
    // Add a slight delay to allow long press to be detected first
    .activateAfterLongPress(Platform.OS === 'android' ? 150 : 50)
    .onBegin(() => {
      // Immediately notify parent that drag has started
      if (onDragStart) {
        runOnJS(onDragStart)(id);
      }
    })
    .onStart(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
      scale.value = withSpring(1.1);
    })
    .onUpdate((event) => {
      translateX.value = offsetX.value + event.translationX;
      translateY.value = offsetY.value + event.translationY;
    })
    .onEnd(event => {
      if (DRAG_TAKES_THE_PRESS && onPress && Math.hypot(event.translationX, event.translationY) < TAP_SLOP) {
        // Back where it was, so the tap doesn't nudge the marker
        translateX.value = offsetX.value;
        translateY.value = offsetY.value;
        runOnJS(onDragEnd)(id, x, y);
        runOnJS(onPress)();
        scale.value = withSpring(1);
        return;
      }
      const newX = translateX.value / containerSize.width;
      const newY = translateY.value / containerSize.height;
      runOnJS(onDragEnd)(id, newX, newY);
      scale.value = withSpring(1);
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
    });

  // Combine gestures, with long press having priority
  const combinedGestures = Gesture.Exclusive(
    longPressGesture,
    panGesture
  );

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
    <GestureDetector gesture={combinedGestures}>
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
