import { Position } from '@/types/models';
import React, { useState } from 'react';
import { StyleSheet, Text, View, Alert, Vibration } from 'react-native';
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
import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useDrag } from '@/context/DragContext';
import { isInside } from '@/utils/resolveDrop';

interface PlayerProps {
  id: string;
  name: string;
  position: string;
  courtPosition?: Position | null;
  containerSize?: { width: number; height: number };
  isSelected?: boolean;
  isOnCourt?: boolean;
  onPress?: (id: string) => void;
  displayMode?: 'court' | 'bench';
  ghostMode?: boolean;
}

export function Player({
  id,
  name,
  position,
  courtPosition,
  containerSize = { width: 0, height: 0 },
  isSelected = false,
  isOnCourt = true,
  onPress,
  displayMode = 'court',
  ghostMode = false,
}: PlayerProps) {
  const MARKER_SIZE = displayMode === 'bench' ? 35 : 40;
  const halfMarker = MARKER_SIZE / 2;

  const initialX = courtPosition ? courtPosition.x * containerSize.width : 0;
  const initialY = courtPosition ? courtPosition.y * containerSize.height : 0;

  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const dragging = useSharedValue(false);
  const [isActive, setIsActive] = useState(false);
  const { movePlayerToBench } = useTeam();
  const { t } = useTranslation();
  const [isLongPress, setIsLongPress] = useState(false);
  const { startDrag, endDrag, cancelDrag, dragX, dragY, benchRect, overBench } = useDrag();

  const playerData = { id, name, position, courtPosition: courtPosition ?? undefined };

  // Follow position changes, such as after a drop or switching configuration
  React.useEffect(() => {
    if (isOnCourt && courtPosition) {
      translateX.value = courtPosition.x * containerSize.width;
      translateY.value = courtPosition.y * containerSize.height;
    }
  }, [isOnCourt, containerSize.width, containerSize.height, courtPosition?.x, courtPosition?.y]);

  React.useEffect(() => {
    zIndex.value = isSelected || isActive ? 10 : 1;
    scale.value = withSpring(isOnCourt && (isSelected || isActive) ? 1.1 : 1);
  }, [isSelected, isActive, zIndex, scale, isOnCourt]);

  // Sport-specific styling
  const { selectedSport } = useSport();
  const { positions, positionColors = {} } = sportsConfig[selectedSport ?? 'soccer'];
  const safePosition = positions.includes(position) ? position : positions[0];

  // Long press to move from court to bench
  const handleLongPress = () => {
    if (!isOnCourt) return;

    Vibration.vibrate(100);
    Alert.alert(
      t('movePlayerToBench') || 'Move to Bench',
      t('movePlayerToBenchConfirm', { playerName: name }) || `Move ${name} to the bench?`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { text: t('move') || 'Move', onPress: () => movePlayerToBench(id) }
      ]
    );
  };

  const handleTap = () => {
    if (onPress) {
      onPress(id);
    }
  };

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleTap)();
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(800)
    .onStart(() => {
      runOnJS(setIsLongPress)(true);
      runOnJS(handleLongPress)();
    })
    .onFinalize(() => {
      runOnJS(setIsLongPress)(false);
    });

  const courtPan = Gesture.Pan()
    .onStart((event) => {
      dragging.value = true;
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
      dragX.value = event.absoluteX;
      dragY.value = event.absoluteY;
      runOnJS(setIsActive)(true);
      runOnJS(startDrag)(playerData, 'court');
    })
    .onUpdate((event) => {
      translateX.value = offsetX.value + event.translationX;
      translateY.value = offsetY.value + event.translationY;
      dragX.value = event.absoluteX;
      dragY.value = event.absoluteY;
      overBench.value = isInside(benchRect.value, event.absoluteX, event.absoluteY);
    })
    .onFinalize((_event, success) => {
      if (!dragging.value) return;
      dragging.value = false;
      runOnJS(setIsActive)(false);
      if (success) {
        // The last tracked point, so the drop matches what the bench highlight showed
        runOnJS(endDrag)(
          { x: dragX.value, y: dragY.value },
          { x: translateX.value / containerSize.width, y: translateY.value / containerSize.height },
        );
      } else {
        runOnJS(cancelDrag)();
      }
    });

  // Moving mostly sideways scrolls the bench, moving up picks the player up
  const benchPan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onStart((event) => {
      dragging.value = true;
      dragX.value = event.absoluteX;
      dragY.value = event.absoluteY;
      runOnJS(startDrag)(playerData, 'bench');
    })
    .onUpdate((event) => {
      dragX.value = event.absoluteX;
      dragY.value = event.absoluteY;
    })
    .onFinalize((_event, success) => {
      if (!dragging.value) return;
      dragging.value = false;
      if (success) {
        runOnJS(endDrag)({ x: dragX.value, y: dragY.value });
      } else {
        runOnJS(cancelDrag)();
      }
    });

  // Combine gestures based on player type
  const combinedGesture = isOnCourt
    ? Gesture.Exclusive(longPressGesture, courtPan, tapGesture)
    : Gesture.Exclusive(benchPan, tapGesture);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    // Over the bench a court player is drawn as the ghost instead, which sits above the bench
    opacity: ghostMode ? 0.7 : dragging.value && isOnCourt && overBench.value ? 0 : 1,
    transform: [
      { translateX: isOnCourt ? translateX.value - halfMarker : 0 }, 
      { translateY: isOnCourt ? translateY.value - halfMarker : 0 },
      { scale: scale.value },
    ],
    position: isOnCourt ? 'absolute' as const : 'relative' as const, 
    zIndex: zIndex.value,
  }));

  const combinedStyles = [
    animatedStyle, 
    styles.playerContainer,
    ghostMode ? styles.ghostPlayer : undefined
  ];

  // Theme colors
  const nameBoxBackgroundColor = useThemeColor({}, 'background');
  const nameBoxBorderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const markerBorderColor = useThemeColor({}, 'text');

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View style={combinedStyles}>
        <View 
          style={[
            styles.playerMarker, 
            { 
              width: MARKER_SIZE,
              height: MARKER_SIZE,
              borderRadius: MARKER_SIZE / 2,
              backgroundColor: positionColors[safePosition] || 'white',
              borderColor: typeof markerBorderColor === 'string' ? markerBorderColor : 'black',
              borderWidth: isActive || isLongPress ? 3 : 2,
            }
          ]} 
        />
        {displayMode === 'court' && (
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
        )}
        {displayMode === 'bench' && (
           <Text 
              numberOfLines={1} 
              ellipsizeMode="tail" 
              style={[styles.benchPlayerName, { color: typeof textColor === 'string' ? textColor : '#000' }]}
           >
              {name}
           </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  playerMarker: {
    borderWidth: 2,
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
  benchPlayerName: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 50,
  },
  playerContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ghostPlayer: {
    opacity: 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
});
