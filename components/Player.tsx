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
import { useTeam } from '@/contexts/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useDrag } from '@/contexts/DragContext';

interface PlayerProps {
  id: string;
  name: string;
  position: string;
  courtPosition?: Position | null;
  onDragEnd?: ((position: Position) => void) | (() => void);
  containerSize?: { width: number; height: number };
  isSelected?: boolean;
  isOnCourt?: boolean;
  onPress?: (id: string) => void;
  displayMode?: 'court' | 'bench';
  onDragStart?: (initialPosition: { x: number; y: number }) => void;
  ghostMode?: boolean;
}

export function Player({ 
  id, 
  name, 
  position, 
  courtPosition, 
  onDragEnd,
  containerSize = { width: 0, height: 0 },
  isSelected = false,
  isOnCourt = true, 
  onPress,
  displayMode = 'court',
  onDragStart,
  ghostMode = false,
}: PlayerProps) {
  const MARKER_SIZE = displayMode === 'bench' ? 35 : 40;
  const halfMarker = MARKER_SIZE / 2;
  
  // Use default position if not provided
  const initialX = courtPosition ? courtPosition.x * containerSize.width : 0;
  const initialY = courtPosition ? courtPosition.y * containerSize.height : 0;

  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const [isActive, setIsActive] = useState(false);
  const { movePlayerToBench } = useTeam();
  const { t } = useTranslation();
  const [isLongPress, setIsLongPress] = useState(false);
  const { startDrag, updateDragPosition, endDrag } = useDrag();

  // PlayerType object for drag context
  const playerData = { id, name, position, courtPosition };

  // Update position when props change for court players
  React.useEffect(() => {
    if (isOnCourt && courtPosition) {
      translateX.value = courtPosition.x * containerSize.width;
      translateY.value = courtPosition.y * containerSize.height;
    }
  }, [isOnCourt, containerSize.width, containerSize.height, courtPosition?.x, courtPosition?.y]);

  // Handle selection/activation visual state
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

  // Handle drag end for court and bench players
  const handleCourtDragEnd = (position: Position) => {
    if (onDragEnd) {
      (onDragEnd as (position: Position) => void)(position);
    }
  };

  const handleBenchDragEnd = () => {
    if (onDragEnd) {
      (onDragEnd as () => void)();
    }
  };

  const handleTap = () => {
    if (onPress) {
      onPress(id);
    }
  };

  // Gesture handlers
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

  const panGesture = Gesture.Pan()
    .hitSlop({ top: -10, bottom: -10, left: -10, right: -10 })
    .onStart((event) => {
      if (isOnCourt) {
        offsetX.value = translateX.value;
        offsetY.value = translateY.value;
        runOnJS(setIsActive)(true);
        
        // Track court players for court-to-bench drag
        runOnJS(startDrag)(playerData, { x: event.absoluteX, y: event.absoluteY });
      } else if (onDragStart) {
        // Track bench players for bench-to-court drag
        runOnJS(startDrag)(playerData, { x: event.absoluteX, y: event.absoluteY });
        runOnJS(onDragStart)({ x: event.absoluteX, y: event.absoluteY });
      }
    })
    .onUpdate((event) => {
      if (isOnCourt) {
        translateX.value = offsetX.value + event.translationX;
        translateY.value = offsetY.value + event.translationY;
        // Update global position for court-to-bench detection
        runOnJS(updateDragPosition)({ x: event.absoluteX, y: event.absoluteY });
      } else {
        // Update global position for bench-to-court drag
        runOnJS(updateDragPosition)({ x: event.absoluteX, y: event.absoluteY });
      }
    })
    .onEnd((event) => {
      if (isOnCourt) {
        // Signal drag end to context for court players
        runOnJS(endDrag)();
        
        const newX = translateX.value / containerSize.width;
        const newY = translateY.value / containerSize.height;
        const clampedX = Math.max(0, Math.min(1, newX));
        const clampedY = Math.max(0, Math.min(1, newY));
        
        if (onDragEnd) {
          const position = { x: clampedX, y: clampedY };
          runOnJS(setIsActive)(false);
          runOnJS(handleCourtDragEnd)(position);
        } else {
          runOnJS(setIsActive)(false);
        }
      } else {
        // Signal drag end to context for bench players
        runOnJS(endDrag)();
        if (onDragEnd) {
          runOnJS(handleBenchDragEnd)();
        }
      }
    })
    .onFinalize(() => {
      if (isOnCourt) {
        runOnJS(setIsActive)(false);
      }
    });
    
  // Combine gestures based on player type
  const combinedGesture = isOnCourt 
    ? Gesture.Exclusive(longPressGesture, panGesture, tapGesture)
    : Gesture.Exclusive(panGesture, tapGesture);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: ghostMode ? 0.7 : 1,
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
