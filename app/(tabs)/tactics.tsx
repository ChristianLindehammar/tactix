import React, { useCallback, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useSport } from '@/context/SportContext';
import { GenericCourt } from '@/components/GenericCourt';
import { useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { useTranslation } from '@/hooks/useTranslation';
import { TooltipModal } from '@/components/TooltipModal';
import { DragHintOverlay } from '@/components/DragHintOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CourtSize, TacticsBoard } from '@/components/TacticsBoard';
import { TacticsMarker } from '@/types/tacticsMarker';

export default function TacticsScreen() {
  const { selectedSport } = useSport();
  const tabBarHeight = useBottomTabBarHeight();
  const { t } = useTranslation();

  const [courtSize, setCourtSize] = useState<CourtSize>({ width: 0, height: 0 });
  const [markers, setMarkers] = useState<TacticsMarker[]>([]);

  // Tooltip system
  const [showAddTooltip, setShowAddTooltip] = useState(false);
  const [showMoveTooltip, setShowMoveTooltip] = useState(false);
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | undefined>();
  const [showDragHint, setShowDragHint] = useState(false);
  const playerBtnRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);

  // Convert relative to absolute coordinates
  const getAbsoluteCoords = (relX: number, relY: number) => {
    return {
      x: relX * courtSize.width,
      y: relY * courtSize.height,
    };
  };

  // Tabs stay mounted, so wait until this one is open before showing tooltips to a new user
  const isFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const checkFirstTimeUser = async () => {
        try {
          const hasSeenTacticsTooltips = await AsyncStorage.getItem('tacticsTooltipsShown');

          if (isFocused.current && hasSeenTacticsTooltips !== 'true' && selectedSport) {
            timer = setTimeout(() => {
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
      return () => {
        isFocused.current = false;
        clearTimeout(timer);
      };
    }, [selectedSport]),
  );

  // Handle closing tooltips and showing the next one in sequence
  const handleAddTooltipClose = async () => {
    setShowAddTooltip(false);
    
    // Wait for a moment before showing the next tooltip
    setTimeout(() => {
      if (isFocused.current && markers.length > 0) {
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
      if (isFocused.current && markers.length > 0) {
        // Any marker will do, so the sequence finishes with no player on the board
        const marker = markers.find(m => m.type === 'player') || markers[0];
        if (marker) {
          const coords = getAbsoluteCoords(marker.x, marker.y);
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

  if (!selectedSport) {
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
    <ThemedView style={styles.container}>
      <TacticsBoard
        sport={selectedSport}
        value={markers}
        onChange={setMarkers}
        bottomInset={Platform.OS === 'ios' ? tabBarHeight : 0}
        firstToolRef={playerBtnRef}
        onCourtSizeChange={setCourtSize}
        onMarkerAdded={() => {
          // Check if we should show the move tooltip after adding a marker
          if (showAddTooltip) handleAddTooltipClose();
        }}
        onMarkerDragStart={() => {
          // If showing move tooltip, close it after the user has tried dragging
          if (showMoveTooltip) handleMoveTooltipClose();
        }}
        onMarkerDeleted={() => {
          if (showDeleteTooltip) handleDeleteTooltipClose();
        }}
      />

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
});
