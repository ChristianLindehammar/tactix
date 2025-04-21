import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, PanResponder, Animated, Dimensions, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useSport } from '@/context/SportContext';
import { sportsConfig } from '@/constants/sports';
import { LAYOUT } from '@/constants/layout';
import { GenericCourt } from '@/components/GenericCourt';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DraggableMarker } from '@/components/DraggableMarker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

function getMarkerIcon(type, selectedSport) {
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

  // Responsive court sizing
  const insets = { top: 0, bottom: 0 };
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
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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

  // Add marker at tap location
  const handleCourtPress = (event: any) => {
    if (!addingType || addingType === 'menu') return;
    const { locationX, locationY } = event.nativeEvent;
    
    const centeredX = locationX / finalDimensions.width;
    const centeredY = locationY / finalDimensions.height;
    
    if (centeredX >= 0 && centeredX <= 1 && centeredY >= 0 && centeredY <= 1) {
      setMarkers(markers => [
        ...markers,
        {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          type: addingType,
          x: centeredX,
          y: centeredY,
        },
      ]);
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

  if (!selectedSport || !Svg) {
    return (
      <ThemedView style={styles.centerContent}>
        <View style={styles.noSportContainer}>
          <GenericCourt availableHeight={300} availableWidth={300} CourtSvg={() => null} aspectRatio={1} playerPositions={[]} />
        </View>
      </ThemedView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* Marker selection rows at the top */}
        <View style={styles.markerSelectionContainer}>
          <View style={styles.markerRow}>
            <Text style={styles.markerRowLabel}>Players</Text>
            <TouchableOpacity style={styles.markerTypeButton} onPress={() => setAddingType('player')}>
              <MaterialIcons name="person" size={28} color="#1976D2" />
              <Text style={{ color: '#1976D2', marginLeft: 8 }}>Player</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.markerRow}>
            <Text style={styles.markerRowLabel}>Opponents</Text>
            <TouchableOpacity style={styles.markerTypeButton} onPress={() => setAddingType('opponent')}>
              <MaterialIcons name="person" size={28} color="#D32F2F" />
              <Text style={{ color: '#D32F2F', marginLeft: 8 }}>Opponent</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.courtContainerOuter}>
          <View 
            style={{
              width: finalDimensions.width, 
              height: finalDimensions.height,
              position: 'relative',
            }} 
            ref={courtRef}
            onTouchStart={addingType && addingType !== 'menu' ? handleCourtPress : undefined}
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
                }}
                zIndex={draggingId === marker.id ? 3 : 2}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onLongPress={() => {
                    Alert.alert('Delete Marker', 'Remove this marker?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => setMarkers(markers => markers.filter(m => m.id !== marker.id)) },
                    ]);
                  }}
                  onPressIn={e => {
                    setAddingType(null);
                    setDraggingId(marker.id);
                  }}
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
                    name={getMarkerIcon(marker.type, selectedSport)}
                    size={marker.type === 'ball' ? 24 : 28}
                    color={marker.type === 'ball' ? '#FFA000' : '#fff'}
                  />
                </TouchableOpacity>
              </DraggableMarker>
            ))}
          </View>
        </View>
        
        {markers.length > 1 && (
          <TouchableOpacity style={styles.clearButton} onPress={() => {
            Alert.alert('Clear All', 'Remove all markers?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'OK', onPress: () => setMarkers(markers => markers.filter(m => m.type === 'ball')) },
            ]);
          }}>
            <MaterialIcons name="delete-sweep" size={24} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 8 }}>Clear All</Text>
          </TouchableOpacity>
        )}
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
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 30,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  markerRowLabel: {
    fontWeight: 'bold',
    marginRight: 12,
    fontSize: 16,
    color: '#333',
    width: 90,
  },
  markerTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4fa',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 12,
  },
  clearButton: {
    position: 'absolute',
    left: 24,
    bottom: LAYOUT.TAB_BAR_HEIGHT + 24,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 24,
    zIndex: 10,
  },
});
