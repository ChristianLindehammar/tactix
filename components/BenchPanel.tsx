import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, NativeSyntheticEvent, NativeScrollEvent, Animated, Platform, LayoutRectangle } from 'react-native';
import { useTeam } from '@/contexts/TeamContext';
import { Player } from './Player'; 
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { LAYOUT } from '@/constants/layout';
import { useThemeColor } from '@/hooks/useThemeColor'; 
import { useTranslation } from '@/hooks/useTranslation';
import { useDrag } from '@/contexts/DragContext';
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
  
  const dotColor = useThemeColor({}, 'primary') as string || '#4169E1';
  
  const maxScroll = Math.max(0, contentWidth - containerWidth);
  
  const dotAnimations = Array(6).fill(0).map((_, index) => {
    if (index === 0) {
      return scrollX.interpolate({
        inputRange: [0, maxScroll * 0.2],
        outputRange: [2.5, 1],
        extrapolate: 'clamp',
      });
    }
    
    if (index === 5) {
      return scrollX.interpolate({
        inputRange: [maxScroll * 0.8, maxScroll],
        outputRange: [1, 2.5],
        extrapolate: 'clamp',
      });
    }
    
    return scrollX.interpolate({
      inputRange: [
        Math.max(0, (index - 1) * maxScroll / 5),
        index * maxScroll / 5,
        Math.min(maxScroll, (index + 1) * maxScroll / 5)
      ],
      outputRange: [1, 2.5, 1],
      extrapolate: 'clamp',
    });
  });
  
  return (
    <View style={styles.indicatorContainer}>
      <View style={styles.dotsContainer}>
        {dotAnimations.map((animation, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.dot, 
              { 
                backgroundColor: dotColor,
                transform: [{ scaleX: animation }] 
              }
            ]} 
          />
        ))}
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
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
});
