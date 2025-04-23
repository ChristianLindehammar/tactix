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
import { useDrag } from '@/contexts/DragContext'; // Import useDrag

interface PlayerProps {
  id: string;
  name: string;
  position: string;
  courtPosition?: Position | null; // Make optional for bench players initially
  onDragEnd?: ((position: Position) => void) | (() => void); // Updated to handle both signatures
  containerSize?: { width: number; height: number }; // Optional for bench
  isSelected?: boolean;
  isOnCourt?: boolean; // Flag to differentiate court vs bench rendering/behavior
  onPress?: (id: string) => void; // Add onPress for bench interaction
  displayMode?: 'court' | 'bench'; // Explicit display mode
  onDragStart?: (initialPosition: { x: number; y: number }) => void; // Add drag handlers from BenchPanel
  ghostMode?: boolean; // Add prop for ghost mode (when following finger)
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
  const MARKER_SIZE = displayMode === 'bench' ? 35 : 40; // Smaller marker for bench
  const halfMarker = MARKER_SIZE / 2;
  
  // Use default position (0,0) if not provided (e.g., for bench)
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
  const { updateDragPosition, draggedItem, isDragging } = useDrag(); // Get update function and drag context values

  // Update position only if it's a court player and props change
  React.useEffect(() => {
    if (isOnCourt && courtPosition) {
      translateX.value = courtPosition.x * containerSize.width;
      translateY.value = courtPosition.y * containerSize.height;
    }
  }, [isOnCourt, containerSize.width, containerSize.height, courtPosition?.x, courtPosition?.y]);

  React.useEffect(() => {
    zIndex.value = isSelected || isActive ? 10 : 1;
    // Don't scale up bench players on interaction
    scale.value = withSpring(isOnCourt && (isSelected || isActive) ? 1.1 : 1); 
  }, [isSelected, isActive, zIndex, scale, isOnCourt]);

  const { selectedSport } = useSport();
  const { positions, positionColors = {} } = sportsConfig[selectedSport ?? 'soccer'];
  const safePosition = positions.includes(position) ? position : positions[0];

  const handleLongPress = () => {
    if (!isOnCourt) return; // Only allow bench removal for players on court
    
    Vibration.vibrate(100); // Short vibration for feedback
    
    Alert.alert(
      t('movePlayerToBench') || 'Move to Bench',
      t('movePlayerToBenchConfirm', { playerName: name }) || `Move ${name} to the bench?`,
      [
        {
          text: t('cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('move') || 'Move',
          onPress: () => movePlayerToBench(id)
        }
      ]
    );
  };

  // Helper functions to safely handle drag end events
  const handleCourtDragEnd = (position: Position) => {
    if (onDragEnd) {
      // We know onDragEnd for court players accepts a position parameter
      (onDragEnd as (position: Position) => void)(position);
    }
  };

  const handleBenchDragEnd = () => {
    if (onDragEnd) {
      // We know onDragEnd for bench players doesn't need a parameter
      (onDragEnd as () => void)();
    }
  };

  const handleTap = () => {
    if (onPress) {
      onPress(id);
    }
  };

  // Define all gesture handlers first
  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleTap)();
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(800) // Trigger after 800ms
    .onStart(() => {
      runOnJS(setIsLongPress)(true);
      runOnJS(handleLongPress)();
    })
    .onFinalize(() => {
      runOnJS(setIsLongPress)(false);
    });

  const panGesture = Gesture.Pan()
    .hitSlop({ top: -10, bottom: -10, left: -10, right: -10 }) // Adjust hitSlop if needed
    .onStart((event) => {
      if (isOnCourt) {
        offsetX.value = translateX.value;
        offsetY.value = translateY.value;
        runOnJS(setIsActive)(true);
      } else if (onDragStart) {
        // Use absolute coordinates for starting bench drag
        runOnJS(onDragStart)({ x: event.absoluteX, y: event.absoluteY });
      }
    })
    .onUpdate((event) => {
      if (isOnCourt) {
        translateX.value = offsetX.value + event.translationX;
        translateY.value = offsetY.value + event.translationY;
      } else {
        // Update global drag position using absolute coordinates
        runOnJS(updateDragPosition)({ x: event.absoluteX, y: event.absoluteY });
      }
    })
    .onEnd((event) => {
      if (isOnCourt) {
        // Calculate the new position as a proportion of the container
        const newX = translateX.value / containerSize.width;
        const newY = translateY.value / containerSize.height;
        
        // Ensure the position is clamped within valid bounds
        const clampedX = Math.max(0, Math.min(1, newX));
        const clampedY = Math.max(0, Math.min(1, newY));
        
        // For court players: use a simpler approach that doesn't require casting
        if (onDragEnd) {
          const position = { x: clampedX, y: clampedY };
          runOnJS(setIsActive)(false);
          // Call onDragEnd directly without intermediate function
          runOnJS(handleCourtDragEnd)(position);
        } else {
          runOnJS(setIsActive)(false);
        }
      } else {
        // For bench players: just call onDragEnd with no parameters
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
    
  // Create combined gesture with proper typing
  const combinedGesture = isOnCourt 
    ? Gesture.Exclusive(longPressGesture, panGesture, tapGesture)
    : Gesture.Exclusive(panGesture, tapGesture);

  // Define the animated style
  const animatedStyle = useAnimatedStyle(() => {
    // Check if this specific player is being dragged from the bench
    const isBeingDraggedFromBench = !isOnCourt && isDragging && draggedItem?.player.id === id;
    
    return {
      opacity: isBeingDraggedFromBench ? 0 : 1, // Hide original when dragged
      transform: [
        // Center the marker based on its own size if not on court
        { translateX: isOnCourt ? translateX.value - halfMarker : 0 }, 
        { translateY: isOnCourt ? translateY.value - halfMarker : 0 },
        { scale: scale.value },
      ],
      // Use absolute positioning only for court players
      position: isOnCourt ? 'absolute' as const : 'relative' as const, 
      zIndex: zIndex.value,
    };
  });

  // Apply ghost styling when in ghost mode
  const combinedStyles = [
    animatedStyle, 
    styles.playerContainer,
    ghostMode ? styles.ghostPlayer : undefined
  ];

  const nameBoxBackgroundColor = useThemeColor({}, 'background');
  const nameBoxBorderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const markerBorderColor = useThemeColor({}, 'text'); // Use text color for border for contrast

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
              borderWidth: isActive || isLongPress ? 3 : 2, // Make border thicker when active
            }
          ]} 
        />
        {/* Only show name box for court players or if explicitly set */}
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
         {/* Optionally show name below bench player */}
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
    // Size set dynamically
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
    maxWidth: 50, // Limit width for bench names
  },
  playerContainer: {
    alignItems: 'center',
    // position: 'absolute', // Applied conditionally in animatedStyle
    backgroundColor: 'transparent',
  },
  ghostPlayer: {
    opacity: 0.7, // Slightly transparent
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
});
