import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, PanResponder, Animated, Dimensions, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useSport } from '@/context/SportContext';
import { sportsConfig } from '@/constants/sports';
import { LAYOUT } from '@/constants/layout';
import { GenericCourt } from '@/components/GenericCourt';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DraggableMarker } from '@/components/DraggableMarker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

// Marker type
interface Marker {
  id: string;
  type: 'player' | 'opponent' | 'ball';
  x: number; // relative (0-1)
  y: number; // relative (0-1)
}

const MARKER_TYPES = [
  { type: 'player', color: '#1976D2', icon: 'person' },
  { type: 'opponent', color: '#D32F2F', icon: 'person' },
  { type: 'ball', color: '#FFA000', icon: 'sports-soccer' },
];

interface MarkerIconProps {
  type: 'player' | 'opponent' | 'ball';
  selectedSport: string | null | undefined;
}

function getMarkerIcon(type: MarkerIconProps['type'], selectedSport: MarkerIconProps['selectedSport']): string {
  if (type === 'ball') {
    switch (selectedSport) {
      case 'floorball': return 'sports-hockey';
      case 'bandy': return 'sports-hockey';
      case 'hockey': return 'sports-hockey';
      case 'basketball': return 'sports-basketball';
      default: return 'sports-soccer';
    }
  }
  return 'person';
}

export default function TacticsScreen() {
  const { selectedSport } = useSport();
  const { Svg, aspectRatio } = selectedSport ? sportsConfig[selectedSport] : { Svg: undefined, aspectRatio: 1 };
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  // Use theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  const tintColor = useThemeColor({}, 'tint');
  const buttonBgColor = useThemeColor({}, 'secondaryBackground');

  // Responsive court sizing
  const availableHeight = Dimensions.get('window').height - insets.top - insets.bottom - LAYOUT.TAB_BAR_HEIGHT;
  const availableWidth = Dimensions.get('window').width;
  const screenRatio = availableWidth / availableHeight;
  const finalDimensions =
    screenRatio > aspectRatio
      ? { width: availableHeight * aspectRatio, height: availableHeight }
      : { width: availableWidth, height: availableWidth / aspectRatio };

  const [markers, setMarkers] = useState<Marker[]>([]);
  const [addingType, setAddingType] = useState<Marker['type'] | null | 'menu'>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastAddedMarkerId, setLastAddedMarkerId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const courtRef = useRef<View>(null);

  // Convert absolute to relative coordinates
  const getRelativeCoords = (absX: number, absY: number) => {
    return {
      x: absX / finalDimensions.width,
      y: absY / finalDimensions.height,
    };
  };
  
  // Convert relative to absolute coordinates
  const getAbsoluteCoords = (relX: number, relY: number) => {
    return {
      x: relX * finalDimensions.width,
      y: relY * finalDimensions.height,
    };
  };

  // Add marker at tap location with improved touch handling
  const handleCourtPress = (event: any) => {
    // Reset isDragging when user taps the court (not a marker)
    setIsDragging(false);
    
    if (!addingType || addingType === 'menu') return;
    
    // Always get fresh tap coordinates directly from the event
    const { locationX, locationY } = event.nativeEvent;
    
    const centeredX = locationX / finalDimensions.width;
    const centeredY = locationY / finalDimensions.height;
    
    if (centeredX >= 0 && centeredX <= 1 && centeredY >= 0 && centeredY <= 1) {
      // Create a new marker at the tap location
      const newMarker = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        type: addingType,
        x: centeredX,
        y: centeredY,
      };
      
      setMarkers(currentMarkers => [...currentMarkers, newMarker]);
    }
  };

  // Ensure ball marker is always present in the center
  React.useEffect(() => {
    if (!markers.some(m => m.type === 'ball')) {
      setMarkers((prev) => [
        ...prev,
        {
          id: 'ball',
          type: 'ball',
          x: 0.5,
          y: 0.5,
        },
      ]);
    }
  }, [markers]);

  // PanResponder for drag-and-drop
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => {
        if (draggingId) {
          setDragOffset({ x: gestureState.x0 - dragPos.x, y: gestureState.y0 - dragPos.y });
        }
      },
      onPanResponderMove: (e, gestureState) => {
        if (draggingId) {
          setDragPos({ x: gestureState.moveX - dragOffset.x, y: gestureState.moveY - dragOffset.y });
        }
      },
      onPanResponderRelease: () => {
        if (draggingId) {
          setMarkers(markers => markers.map(m => m.id === draggingId ? { ...m, x: dragPos.x / finalDimensions.width, y: dragPos.y / finalDimensions.height } : m));
          setDraggingId(null);
        }
      },
    })
  ).current;

  // Handler for when a marker starts being dragged
  const handleDragStart = (id: string) => {
    setIsDragging(true);
    setAddingType(null);
    setDraggingId(id);
  };
  
  // Add an effect to reset isDragging if no marker is being dragged
  useEffect(() => {
    if (!draggingId) {
      setIsDragging(false);
    }
  }, [draggingId]);

  if (!selectedSport || !Svg) {
    return (
      <ThemedView style={styles.centerContent}>
        <View style={styles.noSportContainer}>
          <GenericCourt 
            availableHeight={300} 
            availableWidth={300} 
            CourtSvg={() => null} 
            aspectRatio={1} 
            playerPositions={[]}
            onDragEnd={() => {}} 
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* Marker selection rows at the top with safe area insets */}
        <View style={[
          styles.markerSelectionContainer, 
          { paddingTop: Math.max(insets.top, 24), backgroundColor: backgroundColor as string }
        ]}>
          <View style={styles.controlsContainer}>
            {/* Left side - Add Player/Opponent buttons - more compact */}
            <View style={styles.addButtonsContainer}>
              <TouchableOpacity 
                style={[
                  styles.markerTypeButton, 
                  { backgroundColor: buttonBgColor as string },
                  addingType === 'player' && styles.activeButton
                ]} 
                onPress={() => {
                  // Toggle button state - if already adding this type, turn it off
                  setAddingType(current => current === 'player' ? null : 'player');
                }}
                accessibilityLabel={t('player')}
              >
                <MaterialIcons 
                  name={addingType === 'player' ? 'close' : 'add'} 
                  size={20} 
                  color="#1976D2" 
                />
                <MaterialIcons 
                  name="person" 
                  size={24} 
                  color="#1976D2" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.markerTypeButton, 
                  { backgroundColor: buttonBgColor as string },
                  addingType === 'opponent' && styles.activeButton
                ]} 
                onPress={() => {
                  // Toggle button state - if already adding this type, turn it off
                  setAddingType(current => current === 'opponent' ? null : 'opponent');
                }}
                accessibilityLabel={t('opponent')}
              >
                <MaterialIcons 
                  name={addingType === 'opponent' ? 'close' : 'add'} 
                  size={20} 
                  color="#D32F2F" 
                />
                <MaterialIcons 
                  name="person" 
                  size={24} 
                  color="#D32F2F" 
                />
              </TouchableOpacity>
            </View>
            
            {/* Right side - Clear All button - more compact */}
            {markers.length > 1 && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={() => {
                  Alert.alert(t('clearAll'), t('removeAllMarkers'), [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('ok'), onPress: () => setMarkers(markers => markers.filter(m => m.type === 'ball')) },
                  ]);
                }}
                accessibilityLabel={t('clearAll')}
              >
                <MaterialIcons name="delete-sweep" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={[styles.courtContainerOuter, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
          <View 
            style={{
              width: finalDimensions.width, 
              height: finalDimensions.height,
              position: 'relative',
            }} 
            ref={courtRef}
            onTouchStart={addingType && addingType !== 'menu' ? handleCourtPress : undefined}
            pointerEvents="box-none" // This allows touch events to pass through to children when they're not handled here
          >
            {Svg && (
              <GenericCourt
                availableHeight={finalDimensions.height}
                availableWidth={finalDimensions.width}
                playerPositions={[]}
                onDragEnd={() => {}}
                CourtSvg={Svg}
                aspectRatio={aspectRatio}
              />
            )}
            
            {markers.map(marker => (
              <DraggableMarker
                key={marker.id}
                id={marker.id}
                x={marker.x}
                y={marker.y}
                containerSize={finalDimensions}
                onDragEnd={(id, newX, newY) => {
                  setMarkers(markers => markers.map(m => m.id === id ? { ...m, x: newX, y: newY } : m));
                  setDraggingId(null);
                  // Allow adding markers again after drag is complete
                  setTimeout(() => {
                    setIsDragging(false);
                  }, 100);
                }}
                onDragStart={handleDragStart}
                onLongPress={() => {
                  // Don't allow deleting the ball marker
                  if (marker.type === 'ball') return;
                  
                  // Show delete confirmation
                  Alert.alert(
                    t('delete'), 
                    t('removeAllMarkers').replace('all', ''), 
                    [
                      { text: t('cancel'), style: 'cancel' },
                      { 
                        text: t('delete'), 
                        style: 'destructive', 
                        onPress: () => {
                          setMarkers(markers => markers.filter(m => m.id !== marker.id));
                          // Cancel dragging mode if active
                          if (draggingId === marker.id) {
                            setDraggingId(null);
                          }
                        }
                      },
                    ]
                  );
                }}
                zIndex={draggingId === marker.id ? 3 : 2}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: marker.type === 'player' ? '#1976D2' : marker.type === 'opponent' ? '#D32F2F' : 'white',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: marker.type === 'ball' ? '#FFA000' : '#fff',
                    ...(marker.type === 'ball' ? {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                      elevation: 5,
                    } : {}),
                  }}
                >
                  <MaterialIcons
                    name={getMarkerIcon(marker.type, selectedSport) as any}
                    size={marker.type === 'ball' ? 24 : 28}
                    color={marker.type === 'ball' ? '#FFA000' : '#fff'}
                  />
                </TouchableOpacity>
              </DraggableMarker>
            ))}
          </View>
        </View>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  courtContainerOuter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  courtContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSportContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerSelectionContainer: {
    paddingBottom: 8,
    zIndex: 30,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  markerTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,  // Always have a border of 2px
    borderColor: 'transparent', // Transparent by default
  },
  activeButton: {
    borderColor: '#4CAF50', // Only change the border color when active
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  clearButton: {
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    zIndex: 10,
  },
});
