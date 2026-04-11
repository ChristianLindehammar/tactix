import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, PanResponder, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useSport } from '@/context/SportContext';
import { sportsConfig } from '@/constants/sports';
import { GenericCourt } from '@/components/GenericCourt';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { DraggableMarker } from '@/components/DraggableMarker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { TooltipModal } from '@/components/TooltipModal';
import { DragHintOverlay } from '@/components/DragHintOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import our custom ball SVGs
import FloorballBallSvg from '@/components/ui/FloorballBallSvg';
import HockeyBallSvg from '@/components/ui/HockeyBallSvg';
import BandyBallSvg from '@/components/ui/BandyBallSvg';
import { SportBall } from '@/components/SportBall';
import { ArrowMarker } from '@/components/ArrowMarker';
import { ConeSvg } from '@/components/ui/ConeSvg';
import { TacticsMarker, TacticsMarkerType, createTacticsMarker, createArrowMarker, getMarkerIcon } from '@/types/tacticsMarker';

function getMarkerTypes(arrowColor: string): { type: TacticsMarkerType; color: string; icon: string }[] {
  return [
    { type: 'player', color: '#1976D2', icon: 'person' },
    { type: 'opponent', color: '#D32F2F', icon: 'person' },
    { type: 'cone', color: '#FF6D00', icon: 'change-history' },
    { type: 'arrow-solid', color: arrowColor, icon: 'arrow-forward' },
    { type: 'arrow-dashed', color: arrowColor, icon: 'arrow-forward' },
  ];
}

export default function TacticsScreen() {
  const { selectedSport } = useSport();
  const { Svg, aspectRatio, arrowColor: sportArrowColor } = selectedSport ? sportsConfig[selectedSport] : { Svg: undefined, aspectRatio: 1, arrowColor: undefined };
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { t } = useTranslation();
  
  // Use theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const buttonBgColor = useThemeColor({}, 'secondaryBackground');
  const textColor = useThemeColor({}, 'text') as string;
  const arrowColor = sportArrowColor ?? textColor;
  const markerTypes = getMarkerTypes(textColor);

  // Measure the actual court container to size the court precisely
  const [courtContainerSize, setCourtContainerSize] = useState({ width: 0, height: 0 });

  const availableHeight = courtContainerSize.height;
  const availableWidth = courtContainerSize.width;
  const screenRatio = availableWidth > 0 && availableHeight > 0 ? availableWidth / availableHeight : 1;
  const finalDimensions =
    availableWidth > 0 && availableHeight > 0
      ? screenRatio > aspectRatio
        ? { width: availableHeight * aspectRatio, height: availableHeight }
        : { width: availableWidth, height: availableWidth / aspectRatio }
      : { width: 0, height: 0 };

  const [markers, setMarkers] = useState<TacticsMarker[]>([]);
  const [addingType, setAddingType] = useState<TacticsMarkerType | null | 'menu'>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const courtRef = useRef<View>(null);
  
  // Tooltip system
  const [showAddTooltip, setShowAddTooltip] = useState(false);
  const [showMoveTooltip, setShowMoveTooltip] = useState(false);
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | undefined>();
  const [showDragHint, setShowDragHint] = useState(false);
  const playerBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

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

  // Check if we should show tooltips to a new user
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        const hasSeenTacticsTooltips = await AsyncStorage.getItem('tacticsTooltipsShown');
        
        if (hasSeenTacticsTooltips !== 'true' && selectedSport) {
          setTimeout(() => {
            if (playerBtnRef.current) {
                playerBtnRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number): void => {
                setTooltipPosition({
                  x: pageX + width / 2,
                  y: pageY + height + 10,
                });
                setShowAddTooltip(true);
                });
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking first time user status:', error);
      }
    };
    
    checkFirstTimeUser();
  }, [selectedSport]);

  // Handle closing tooltips and showing the next one in sequence
  const handleAddTooltipClose = async () => {
    setShowAddTooltip(false);
    
    // Wait for a moment before showing the next tooltip
    setTimeout(() => {
      if (markers.length > 0) {
        const firstMarker = markers.find(m => m.type === 'player') || markers[0];
        if (firstMarker) {
          const coords = getAbsoluteCoords(firstMarker.x, firstMarker.y);
          setTooltipPosition({
            x: coords.x + 20,
            y: coords.y + 20,
          });
          setShowMoveTooltip(true);
        }
      }
    }, 500);
  };

  const handleMoveTooltipClose = () => {
    setShowMoveTooltip(false);
    
    // Wait for a moment before showing the next tooltip
    setTimeout(() => {
      if (markers.length > 0) {
        const playerMarker = markers.find(m => m.type === 'player');
        if (playerMarker) {
          const coords = getAbsoluteCoords(playerMarker.x, playerMarker.y);
          setTooltipPosition({
            x: coords.x + 20,
            y: coords.y + 20,
          });
          setShowDeleteTooltip(true);
        }
      }
    }, 500);
  };

  const handleDeleteTooltipClose = async () => {
    setShowDeleteTooltip(false);
    
    // Mark tooltips as shown so they don't appear again
    try {
      await AsyncStorage.setItem('tacticsTooltipsShown', 'true');
      
      // After tooltips are done, show the drag hint if we have enough markers
      if (markers.length >= 2) {
        checkAndShowDragHint();
      }
    } catch (error) {
      console.error('Error saving tooltip shown status:', error);
    }
  };

  // Check if we should show the drag hint demonstration
  const checkAndShowDragHint = async () => {
    try {
      const hasShownTacticsDragHint = await AsyncStorage.getItem('tacticsDragHintShown');
      if (!hasShownTacticsDragHint && markers.length >= 2) {
        setShowDragHint(true);
      }
    } catch (error) {
      console.error('Error checking drag hint status:', error);
    }
  };

  // Handle when the drag hint demo is finished
  const handleDragHintFinish = async () => {
    setShowDragHint(false);
    try {
      await AsyncStorage.setItem('tacticsDragHintShown', 'true');
    } catch (error) {
      console.error('Error saving drag hint status:', error);
    }
  };

  // Add marker at tap location with improved touch handling
  const handleCourtPress = (event: any) => {
    // Reset isDragging when user taps the court (not a marker)
    
    if (!addingType || addingType === 'menu') return;
    
    // Always get fresh tap coordinates directly from the event
    const { locationX, locationY } = event.nativeEvent;
    
    const centeredX = locationX / finalDimensions.width;
    const centeredY = locationY / finalDimensions.height;
    
    if (centeredX >= 0 && centeredX <= 1 && centeredY >= 0 && centeredY <= 1) {
      let newMarker: TacticsMarker;
      if (addingType === 'arrow-solid' || addingType === 'arrow-dashed') {
        // Place arrow with a default length pointing downward
        const endY = Math.min(centeredY + 0.15, 1);
        newMarker = createArrowMarker(addingType, centeredX, centeredY, centeredX, endY);
      } else {
        newMarker = createTacticsMarker(addingType, centeredX, centeredY);
      }

      setMarkers(currentMarkers => [...currentMarkers, newMarker]);

      // Arrows are typically placed one at a time, deselect after placement
      if (addingType === 'arrow-solid' || addingType === 'arrow-dashed') {
        setAddingType(null);
      }

      // Check if we should show the move tooltip after adding a marker
      if (showAddTooltip) {
        handleAddTooltipClose();
      }
    }
  };

  // Ensure ball marker is always present in the center
  React.useEffect(() => {
    if (!markers.some(m => m.type === 'ball')) {
      setMarkers((prev) => [...prev, createTacticsMarker('ball', 0.5, 0.5)]);
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
    setAddingType(null);
    setDraggingId(id);
    
    // If showing move tooltip, close it after the user has tried dragging
    if (showMoveTooltip) {
      handleMoveTooltipClose();
    }
  };


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
        <View
          style={[
            styles.markerSelectionContainer,
            { paddingTop: Math.max(insets.top, 8), backgroundColor: backgroundColor as string }
          ]}
        >
          <View style={styles.controlsContainer}>
            {/* Left side - Add marker buttons */}
            <View style={styles.addButtonsContainer}>
              {markerTypes.map((mt, index) => (
                <TouchableOpacity
                  key={mt.type}
                  ref={index === 0 ? playerBtnRef : undefined}
                  style={[
                    styles.markerTypeButton,
                    { backgroundColor: buttonBgColor as string },
                    addingType === mt.type && styles.activeButton,
                  ]}
                  onPress={() => setAddingType(current => current === mt.type ? null : mt.type)}
                  accessibilityLabel={mt.type}
                >
                  <MaterialIcons
                    name={addingType === mt.type ? 'close' : 'add'}
                    size={16}
                    color={mt.color}
                  />
                  {mt.type === 'cone' ? (
                    <ConeSvg size={20} />
                  ) : (
                    <MaterialIcons
                      name={mt.icon as any}
                      size={20}
                      color={mt.color}
                      style={mt.type === 'arrow-dashed' ? { opacity: 0.5 } : undefined}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Right side - Clear All button - more compact */}
            {markers.length > 1 && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={() => {
                  Alert.alert(t('clearAll'), t('removeAllMarkers'), [
                    { text: t('cancel'), style: 'cancel' },
                    { 
                      text: t('ok'), 
                      onPress: () => {
                        // Keep the ball marker but reset its position to center
                        setMarkers(markers => markers
                          .filter(m => m.type === 'ball')
                          .map(m => ({ ...m, x: 0.5, y: 0.5 }))
                        );
                      }
                    },
                  ]);
                }}
                accessibilityLabel={t('clearAll')}
              >
                <MaterialIcons name="delete-sweep" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View
          style={[styles.courtContainerOuter, { paddingBottom: Platform.OS === 'ios' ? tabBarHeight : 0 }]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            // Subtract iOS tab bar padding from measured height since it's included in the layout
            const effectiveHeight = Platform.OS === 'ios' ? height - tabBarHeight : height;
            setCourtContainerSize({ width, height: effectiveHeight });
          }}
        >
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
            
            {/* Render arrow markers */}
            {markers
              .filter(m => m.type === 'arrow-solid' || m.type === 'arrow-dashed')
              .map(marker => (
                <ArrowMarker
                  key={marker.id}
                  id={marker.id}
                  x={marker.x}
                  y={marker.y}
                  endX={marker.endX ?? marker.x}
                  endY={marker.endY ?? marker.y + 0.15}
                  dashed={marker.type === 'arrow-dashed'}
                  containerSize={finalDimensions}
                  color={arrowColor}
                  onDragEnd={(id, newX, newY, newEndX, newEndY) => {
                    setMarkers(prev => prev.map(m =>
                      m.id === id ? { ...m, x: newX, y: newY, endX: newEndX, endY: newEndY } : m
                    ));
                  }}
                  onLongPress={() => {
                    Alert.alert(
                      t('delete'),
                      t('deleteMarkerConfirm'),
                      [
                        { text: t('cancel'), style: 'cancel' },
                        {
                          text: t('delete'),
                          style: 'destructive',
                          onPress: () => setMarkers(prev => prev.filter(m => m.id !== marker.id)),
                        },
                      ]
                    );
                  }}
                />
              ))}

            {/* Render point markers (player, opponent, ball, cone) */}
            {markers
              .filter(m => m.type !== 'arrow-solid' && m.type !== 'arrow-dashed')
              .map(marker => (
              <DraggableMarker
                key={marker.id}
                id={marker.id}
                x={marker.x}
                y={marker.y}
                containerSize={finalDimensions}
                onDragEnd={(id, newX, newY) => {
                  setMarkers(markers => markers.map(m => m.id === id ? { ...m, x: newX, y: newY } : m));
                  setDraggingId(null);
                }}
                onDragStart={handleDragStart}
                onLongPress={() => {
                  // Don't allow deleting the ball marker
                  if (marker.type === 'ball') return;

                  Alert.alert(
                    t('delete'),
                    t('deleteMarkerConfirm'),
                    [
                      { text: t('cancel'), style: 'cancel' },
                      {
                        text: t('delete'),
                        style: 'destructive',
                        onPress: () => {
                          setMarkers(markers => markers.filter(m => m.id !== marker.id));
                          if (draggingId === marker.id) {
                            setDraggingId(null);
                          }
                          if (showDeleteTooltip) {
                            handleDeleteTooltipClose();
                          }
                        }
                      },
                    ]
                  );
                }}
                zIndex={draggingId === marker.id ? 3 : 2}
              >
                {marker.type === 'ball' ? (
                  <View style={{
                    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
                    borderRadius: 20, backgroundColor: '#fff', borderWidth: 2, borderColor: '#FFA000',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5,
                  }}>
                    <View style={{ width: 24, height: 24 }}>
                      <SportBall sport={selectedSport} size={24} color="#FFA000" />
                    </View>
                  </View>
                ) : marker.type === 'cone' ? (
                  <View style={{
                    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <ConeSvg size={32} />
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: marker.type === 'player' ? '#1976D2' : '#D32F2F',
                      justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
                    }}
                  >
                    <MaterialIcons name="person" size={28} color="#fff" />
                  </TouchableOpacity>
                )}
              </DraggableMarker>
            ))}
          </View>
        </View>
        
        {/* Tooltips */}
        <TooltipModal
          visible={showAddTooltip}
          onClose={handleAddTooltipClose}
          message={t('tacticsAddTooltip') || "Tap the player or opponent button, then tap the court to add a marker"}
          position={tooltipPosition}
        />
        
        <TooltipModal
          visible={showMoveTooltip}
          onClose={handleMoveTooltipClose}
          message={t('tacticsMoveTooltip') || "Drag markers to reposition them on the court"}
          position={tooltipPosition}
        />
        
        <TooltipModal
          visible={showDeleteTooltip}
          onClose={handleDeleteTooltipClose}
          message={t('tacticsDeleteTooltip') || "Long press on a marker to delete it"}
          position={tooltipPosition}
        />
        
        {/* Drag hint overlay */}
        <DragHintOverlay 
          visible={showDragHint} 
          onFinish={handleDragHintFinish} 
        />
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
    paddingBottom: 4,
    zIndex: 30,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  markerTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1.5,  // Slightly thinner border
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
    padding: 6,
    borderRadius: 16,
    width: 34,
    height: 34,
    zIndex: 10,
  },
});
