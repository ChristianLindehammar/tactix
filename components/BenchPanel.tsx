import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
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
import { LayoutRectangle } from 'react-native';

// Panel heights
const PANEL_HEIGHT_COLLAPSED = 35;
const PANEL_HEIGHT_EXPANDED = 130;

interface BenchPanelProps {
  courtLayout: LayoutRectangle | null;
}

export const BenchPanel: React.FC<BenchPanelProps> = ({ courtLayout }) => {
  const { team, movePlayerToCourt, updatePlayerPosition, movePlayerToBench } = useTeam();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { t } = useTranslation();
  const { startDrag, isDragging, lastDrop, clearLastDrop, draggedItem, endDrag } = useDrag();
  const { selectedSport } = useSport();
  const prevDraggingRef = useRef(isDragging);
  const panelRef = useRef<View>(null);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'menuBackground') as string;
  const borderColor = useThemeColor({}, 'border') as string;
  const textColor = useThemeColor({}, 'text') as string;
  const iconColor = useThemeColor({}, 'icon') as string;

  const benchPlayers = team?.benchPlayers ?? [];

  // Auto-expand panel when dragging court players
  useEffect(() => {
    if (isDragging && !prevDraggingRef.current) {
      const isCourtPlayer = team?.startingPlayers.some(p => p.id === draggedItem?.player.id);
      if (isCourtPlayer) {
        setIsExpanded(true);
      }
    }
    
    prevDraggingRef.current = isDragging;
  }, [isDragging, draggedItem, team?.startingPlayers]);

  // Handle dropping court players onto bench
  useEffect(() => {
    if (lastDrop && lastDrop.droppedPlayer && lastDrop.finalPosition) {
      const isCourtPlayer = team?.startingPlayers.some(p => p.id === lastDrop.droppedPlayer?.id);
      
      if (panelRef.current && isCourtPlayer) {
        panelRef.current.measureInWindow((x, y, width, height) => {
          const dropPos = lastDrop.finalPosition!;
          if (
            dropPos.x >= x && dropPos.x <= x + width &&
            dropPos.y >= y && dropPos.y <= y + height
          ) {
            movePlayerToBench(lastDrop.droppedPlayer!.id);
          }
        });
      }
      clearLastDrop();
    }
  }, [lastDrop, team?.startingPlayers]);

  // Start drag for bench player
  const handlePlayerDragStart = (player: PlayerType, initialPosition: { x: number; y: number }) => {
    startDrag(player, initialPosition);
  };

  // Handle bench player dropped on court
  const handlePlayerDragEnd = () => {
    const { finalPosition } = endDrag();
    
    if (draggedItem && draggedItem.player && finalPosition && courtLayout) {
      const { x: courtX, y: courtY, width: courtWidth, height: courtHeight } = courtLayout;
      
      if (
        finalPosition.x >= courtX && finalPosition.x <= courtX + courtWidth &&
        finalPosition.y >= courtY && finalPosition.y <= courtY + courtHeight
      ) {
        // Calculate relative position within the court
        const relativeX = (finalPosition.x - courtX) / courtWidth;
        const relativeY = (finalPosition.y - courtY) / courtHeight;
        const clampedX = Math.max(0, Math.min(1, relativeX));
        const clampedY = Math.max(0, Math.min(1, relativeY));
        
        // Move player to court then update position
        movePlayerToCourt(draggedItem.player.id);
        setTimeout(() => {
          updatePlayerPosition(draggedItem.player.id, { x: clampedX, y: clampedY });
        }, 0);
      }
    }
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
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.scrollViewContent}
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
  scrollViewContent: {
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    paddingBottom: 10,
    minHeight: PANEL_HEIGHT_EXPANDED - PANEL_HEIGHT_COLLAPSED,
  },
  playerWrapper: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingTop: 5,
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
});
