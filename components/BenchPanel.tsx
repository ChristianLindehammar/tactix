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
import { PlayerType, Position } from '@/types/models';
import { LayoutRectangle } from 'react-native';

// Use a single consistent height for all sports
const PANEL_HEIGHT_COLLAPSED = 35; // Reduced from 40 to 35 for all sports
const PANEL_HEIGHT_EXPANDED = 130; // Kept the same for expanded mode

interface BenchPanelProps {
  courtLayout: LayoutRectangle | null;
}

export const BenchPanel: React.FC<BenchPanelProps> = ({ courtLayout }) => {
  const { team, movePlayerToCourt, updatePlayerPosition, movePlayerToBench } = useTeam();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { t } = useTranslation();
  const { startDrag, isDragging, lastDrop, clearLastDrop, draggedItem, endDrag } = useDrag(); // Get drag state from context
  const { selectedSport } = useSport();
  const prevDraggingRef = useRef(isDragging);
  const panelRef = useRef<View>(null);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'menuBackground') as string;
  const borderColor = useThemeColor({}, 'border') as string;
  const textColor = useThemeColor({}, 'text') as string;
  const iconColor = useThemeColor({}, 'icon') as string;

  const benchPlayers = team?.benchPlayers ?? [];

  // Called by Player component when drag starts
  const handlePlayerDragStart = (player: PlayerType, initialPosition: { x: number; y: number }) => {
    startDrag(player, initialPosition);
  };

  // Called by Player component when drag ends
  const handlePlayerDragEnd = () => {
    console.log("Bench player drag ended");
    
    // Check if this is a bench player being dropped onto the court
    const { finalPosition } = endDrag();
    
    if (draggedItem && draggedItem.player && finalPosition && courtLayout) {
      // Check if dropped within court bounds
      const { x: courtX, y: courtY, width: courtWidth, height: courtHeight } = courtLayout;
      
      console.log('Checking bench-to-court drop', { 
        finalPosition, 
        court: { x: courtX, y: courtY, width: courtWidth, height: courtHeight } 
      });
      
      if (
        finalPosition.x >= courtX && finalPosition.x <= courtX + courtWidth &&
        finalPosition.y >= courtY && finalPosition.y <= courtY + courtHeight
      ) {
        // Calculate relative position within the court (0 to 1)
        const relativeX = (finalPosition.x - courtX) / courtWidth;
        const relativeY = (finalPosition.y - courtY) / courtHeight;
        const clampedX = Math.max(0, Math.min(1, relativeX));
        const clampedY = Math.max(0, Math.min(1, relativeY));
        
        console.log('Bench player dropped on court:', { clampedX, clampedY });
        
        // Move player to court
        movePlayerToCourt(draggedItem.player.id);
        
        // Then immediately update to the dropped position
        setTimeout(() => {
          updatePlayerPosition(draggedItem.player.id, { x: clampedX, y: clampedY });
        }, 0);
      }
    }
  };

  // Add effect to auto-expand the panel when dragging starts
  useEffect(() => {
    // When dragging starts and we have a court player being dragged
    if (isDragging && !prevDraggingRef.current) {
      const isCourtPlayer = team?.startingPlayers.some(p => p.id === draggedItem?.player.id);
      if (isCourtPlayer) {
        // Expand the panel to make it easier to drop onto
        console.log('Auto-expanding bench panel for court player drag');
        setIsExpanded(true);
      }
    }
    
    prevDraggingRef.current = isDragging;
  }, [isDragging, draggedItem, team?.startingPlayers]);

  // Separate effect specifically for drop detection
  useEffect(() => {
    console.log('BenchPanel drag state:', { 
      wasDragging: prevDraggingRef.current, 
      isDragging, 
      lastDrop: lastDrop ? `Player ${lastDrop.droppedPlayer?.id}` : 'none'
    });
    
    // When dragging stops and we have lastDrop data
    if (lastDrop && lastDrop.droppedPlayer && lastDrop.finalPosition) {
      console.log('Processing potential drop onto bench:', lastDrop.droppedPlayer.id);
      
      // Check if the player is from the court (not already on bench)
      const isCourtPlayer = team?.startingPlayers.some(p => p.id === lastDrop.droppedPlayer?.id);
      
      console.log('Drop detected, court player?', isCourtPlayer);
      
      // Only proceed if we have the panel ref and drop position data
      if (panelRef.current && isCourtPlayer) {
        // Measure current panel bounds
        panelRef.current.measureInWindow((x, y, width, height) => {
          console.log('Panel bounds:', { x, y, width, height });
          console.log('Drop position:', lastDrop.finalPosition);
          
          // Check if the drop is within the panel bounds
          const dropPos = lastDrop.finalPosition!;
          if (
            dropPos.x >= x && dropPos.x <= x + width &&
            dropPos.y >= y && dropPos.y <= y + height
          ) {
            console.log('Drop inside bench panel - moving player to bench:', lastDrop.droppedPlayer!.id);
            movePlayerToBench(lastDrop.droppedPlayer!.id);
          } else {
            console.log('Drop outside bench panel bounds');
          }
        });
      }
      // Clear the last drop data after processing
      clearLastDrop();
    }
  }, [lastDrop, team?.startingPlayers]);

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
    bottom: LAYOUT.TAB_BAR_HEIGHT, // Position above the tab bar
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingVertical: 2, // Reduced from 5 to 2 for less vertical space
    overflow: 'hidden', 
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center horizontally
    width: '100%', // Ensure full width to center content
    paddingBottom: 2,
    paddingTop: 2,
  },
  panelTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 14, // Slightly smaller font for compact display
    textAlign: 'center', // Center text
  },
  scrollViewContent: {
    paddingHorizontal: 10,
    alignItems: 'flex-start', // Align items to the top
    paddingBottom: 10, // Add padding at the bottom
    minHeight: PANEL_HEIGHT_EXPANDED - PANEL_HEIGHT_COLLAPSED, // Ensure it takes space
  },
  playerWrapper: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingTop: 5, // Add some top padding for spacing
    // No fixed width/height, let Player component dictate size
  },
  noPlayersContainer: {
    flex: 1, // Take full width if no players
    justifyContent: 'center',
    alignItems: 'center',
    height: PANEL_HEIGHT_EXPANDED - PANEL_HEIGHT_COLLAPSED - 10, // Adjust height
  },
  noPlayersText: {
    fontStyle: 'italic',
  },
});
