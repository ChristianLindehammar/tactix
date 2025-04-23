import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTeam } from '@/contexts/TeamContext';
import { Player } from './Player'; // Import the actual Player component
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { LAYOUT } from '@/constants/layout';
import { useThemeColor } from '@/hooks/useThemeColor'; // Import theme hook
import { useTranslation } from '@/hooks/useTranslation';
import { useDrag } from '@/contexts/DragContext';
import { LayoutRectangle } from 'react-native';

const PANEL_HEIGHT_COLLAPSED = 60;
const PANEL_HEIGHT_EXPANDED = 130; // Adjusted height for Player component

interface BenchPanelProps {
  courtLayout: LayoutRectangle | null;
}

export const BenchPanel: React.FC<BenchPanelProps> = ({ courtLayout }) => {
  const { team, movePlayerToCourt, updatePlayerPosition } = useTeam();
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();
  const { startDrag, endDrag } = useDrag(); // Get drag functions from context

  // Theme colors
  const backgroundColor = useThemeColor({}, 'menuBackground') as string;
  const borderColor = useThemeColor({}, 'border') as string;
  const textColor = useThemeColor({}, 'text') as string;
  const iconColor = useThemeColor({}, 'icon') as string;

  const benchPlayers = team?.benchPlayers ?? [];

  // Called by Player component when drag starts
  const handlePlayerDragStart = (player: PlayerType, initialPosition: { x: number; y: number }) => {
    startDrag(player, initialPosition);
    // Optionally collapse the panel when drag starts
    // setIsExpanded(false);
  };

  // Called by Player component when drag ends
  const handlePlayerDragEnd = () => {
    const { droppedPlayer, finalPosition } = endDrag();

    if (droppedPlayer && finalPosition && courtLayout) {
      // Check if dropped within court bounds
      const courtX = courtLayout.x;
      const courtY = courtLayout.y;
      const courtWidth = courtLayout.width;
      const courtHeight = courtLayout.height;

      if (
        finalPosition.x >= courtX &&
        finalPosition.x <= courtX + courtWidth &&
        finalPosition.y >= courtY &&
        finalPosition.y <= courtY + courtHeight
      ) {
        // Calculate relative position within the court (0 to 1)
        const relativeX = (finalPosition.x - courtX) / courtWidth;
        const relativeY = (finalPosition.y - courtY) / courtHeight;
        const clampedX = Math.max(0, Math.min(1, relativeX));
        const clampedY = Math.max(0, Math.min(1, relativeY));

        // Move player to court first (this assigns a default position)
        movePlayerToCourt(droppedPlayer.id);
        
        // Then immediately update to the dropped position
        // Use setTimeout to ensure the state update from movePlayerToCourt has likely processed
        setTimeout(() => {
            updatePlayerPosition(droppedPlayer.id, { x: clampedX, y: clampedY });
        }, 0);

      }
    }
  };

  return (
    <View 
      style={[
        styles.panelContainer, 
        { 
          height: isExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COLLAPSED,
          backgroundColor: backgroundColor,
          borderTopColor: borderColor,
        }
      ]}
    >
      <Pressable onPress={() => setIsExpanded(!isExpanded)} style={styles.toggleButton}>
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
                  // courtPosition={null} // Not needed for bench display logic now
                  // onDragEnd={() => {}} // Not needed for bench
                  // containerSize={{ width: 0, height: 0 }} // Not needed for bench
                  isOnCourt={false} // Explicitly false
                  displayMode="bench" // Use bench display mode
                  // Remove onPress={handlePlayerPress}
                  // Add drag handlers
                  onDragStart={(initialPosition) => handlePlayerDragStart(player, initialPosition)}
                  onDragEnd={handlePlayerDragEnd}
                  // Pass courtLayout for potential internal checks (optional)
                  // courtLayout={courtLayout} 
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
    paddingVertical: 5,
    overflow: 'hidden', 
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 5,
    paddingTop: 5, // Add padding top for balance
  },
  panelTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
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
