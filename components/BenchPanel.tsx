import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, NativeSyntheticEvent, NativeScrollEvent, Animated, Platform, LayoutRectangle } from 'react-native';
import { useTeam } from '@/context/TeamContext';
import { Player } from './Player'; 
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { LAYOUT } from '@/constants/layout';
import { useThemeColor } from '@/hooks/useThemeColor'; 
import { useTranslation } from '@/hooks/useTranslation';
import { useDrag } from '@/context/DragContext';
import { useSport } from '@/context/SportContext';
import { PlayerType } from '@/types/models';

const PANEL_HEIGHT_COLLAPSED = 35;
const PANEL_HEIGHT_EXPANDED = 130;

const ScrollIndicator = ({ scrollX, contentWidth, containerWidth }: { 
  scrollX: Animated.Value, 
  contentWidth: number,
  containerWidth: number
}) => {
  if (contentWidth <= containerWidth) return null;
  
  const primaryColor = useThemeColor({}, 'primary') as string || '#4169E1';
  const inactiveColor = useThemeColor({}, 'icon') as string || '#888888';
  
  const maxScroll = Math.max(0, contentWidth - containerWidth);
  const numberOfDots = 5;
  
  return (
    <View style={styles.indicatorContainer}>
      {/* Background line */}
      <View style={[styles.indicatorLine, { backgroundColor: inactiveColor }]} />
      
      {/* Dots */}
      <View style={styles.dotsContainer}>
        {Array(numberOfDots).fill(0).map((_, index) => {
          const inputRange = [
            (index - 1) * maxScroll / (numberOfDots - 1),
            index * maxScroll / (numberOfDots - 1),
            (index + 1) * maxScroll / (numberOfDots - 1)
          ].map(val => Math.max(0, Math.min(maxScroll, val)));
          
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1.4, 0.6],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          
          return (
            <Animated.View 
              key={index}
              style={[
                styles.indicatorDot,
                { 
                  backgroundColor: primaryColor,
                  transform: [{ scale }],
                  opacity,
                }
              ]} 
            />
          );
        })}
      </View>
    </View>
  );
};

interface BenchPanelProps {
  courtLayout: LayoutRectangle | null;
}

export const BenchPanel: React.FC<BenchPanelProps> = ({ courtLayout }) => {
  const { team, movePlayerToCourt, movePlayerToBench } = useTeam();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { t } = useTranslation();
  const { startDrag, isDragging, lastDrop, clearLastDrop, draggedItem, endDrag, dragPosition } = useDrag();
  const prevDraggingRef = useRef(isDragging);
  const panelRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [panelLayout, setPanelLayout] = useState<{x: number, y: number, width: number, height: number} | null>(null);

  const backgroundColor = useThemeColor({}, 'menuBackground') as string;
  const borderColor = useThemeColor({}, 'border') as string;
  const textColor = useThemeColor({}, 'text') as string;
  const iconColor = useThemeColor({}, 'icon') as string;

  const benchPlayers = team?.benchPlayers ?? [];

  // Track panel position for more reliable drop detection
  const measurePanel = useCallback(() => {
    if (panelRef.current) {
      panelRef.current.measureInWindow((x, y, width, height) => {
        setPanelLayout({ x, y, width, height });
      });
    }
  }, []);

  // Re-measure panel when it's expanded/collapsed
  useEffect(() => {
    measurePanel();
  }, [isExpanded, measurePanel]);

  // Check for drop events
  useEffect(() => {
    if (lastDrop && lastDrop.droppedPlayer && lastDrop.finalPosition) {
      const isCourtPlayer = team?.startingPlayers.some(p => p.id === lastDrop.droppedPlayer?.id);
      
      if (panelLayout && isCourtPlayer) {
        const dropPos = lastDrop.finalPosition;
        
        // Add extra padding for touch target on Android
        const padding = Platform.OS === 'android' ? 20 : 0;
        
        if (
          dropPos.x >= panelLayout.x - padding && 
          dropPos.x <= panelLayout.x + panelLayout.width + padding &&
          dropPos.y >= panelLayout.y - padding && 
          dropPos.y <= panelLayout.y + panelLayout.height + padding
        ) {
          movePlayerToBench(lastDrop.droppedPlayer.id);
        }
      }
      clearLastDrop();
    }
  }, [lastDrop, team?.startingPlayers, panelLayout, movePlayerToBench, clearLastDrop]);

  // Track drag state changes and re-measure panel when needed
  useEffect(() => {
    if (isDragging && !prevDraggingRef.current) {
      // Drag just started, measure panel
      measurePanel();
    }
    prevDraggingRef.current = isDragging;
  }, [isDragging, measurePanel]);

  const handlePlayerDragStart = (player: PlayerType, initialPosition: { x: number; y: number }) => {
    startDrag(player, initialPosition);
  };

  const handlePlayerDragEnd = () => {
    const { finalPosition } = endDrag();
    
    if (draggedItem && draggedItem.player && finalPosition && courtLayout) {
      const { x: courtX, y: courtY, width: courtWidth, height: courtHeight } = courtLayout;
      
      if (
        finalPosition.x >= courtX && finalPosition.x <= courtX + courtWidth &&
        finalPosition.y >= courtY && finalPosition.y <= courtY + courtHeight
      ) {
        const relativeX = (finalPosition.x - courtX) / courtWidth;
        const relativeY = (finalPosition.y - courtY) / courtHeight;
        const clampedX = Math.max(0, Math.min(1, relativeX));
        const clampedY = Math.max(0, Math.min(1, relativeY));
        
        movePlayerToCourt(draggedItem.player.id, { x: clampedX, y: clampedY });
      }
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.setValue(offsetX);
  };

  return (
    <View 
      ref={panelRef}
      style={[
        styles.panelContainer, 
        { 
          height: isExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COLLAPSED,
          backgroundColor: backgroundColor,
          borderTopColor: borderColor,
        }
      ]}
    >
      <Pressable 
        onPress={() => setIsExpanded(!isExpanded)} 
        style={styles.toggleButton}
      >
        <IconSymbol name={isExpanded ? 'chevron.down' : 'chevron.up'} size={20} color={iconColor} />
        <ThemedText style={[styles.panelTitle, { color: textColor }]}>
           {t('bench')} ({benchPlayers.length})
        </ThemedText>
      </Pressable>
      
      {isExpanded && (
        <View style={styles.expandedContentContainer}>
          <View 
            style={styles.scrollContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            <ScrollView 
              ref={scrollViewRef}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollViewContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={(width) => setContentWidth(width)}
            >
              {benchPlayers.length > 0 ? (
                benchPlayers.map((player) => (
                  <View key={player.id} style={styles.playerWrapper}>
                    <Player
                      id={player.id}
                      name={player.name}
                      position={player.position}
                      isOnCourt={false}
                      displayMode="bench"
                      onDragStart={(initialPosition) => handlePlayerDragStart(player, initialPosition)}
                      onDragEnd={handlePlayerDragEnd}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.noPlayersContainer}>
                  <ThemedText style={[styles.noPlayersText, { color: iconColor }]}>
                    {t('noPlayersOnBench')}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
          
          {benchPlayers.length > 3 && contentWidth > containerWidth && (
            <ScrollIndicator 
              scrollX={scrollX} 
              contentWidth={contentWidth} 
              containerWidth={containerWidth} 
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panelContainer: {
    position: 'absolute',
    bottom: LAYOUT.TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingBottom: 2,
    paddingTop: 2,
  },
  panelTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  playersContainer: {
    flex: 1,
    padding: 10,
  },
  playersWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  playerWrapper: {
    alignItems: 'center',
    marginHorizontal: 6,
    marginBottom: 10,
  },
  noPlayersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: PANEL_HEIGHT_EXPANDED - PANEL_HEIGHT_COLLAPSED - 10,
  },
  noPlayersText: {
    fontStyle: 'italic',
  },
  expandedContentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    minHeight: PANEL_HEIGHT_EXPANDED - PANEL_HEIGHT_COLLAPSED - 20,
  },
  indicatorContainer: {
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -5,
    position: 'relative',
  },
  indicatorLine: {
    position: 'absolute',
    height: 1,
    width: 50,
    opacity: 0.4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 50,
    zIndex: 1,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
