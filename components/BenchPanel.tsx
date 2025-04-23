import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTeam } from '@/contexts/TeamContext';
import { Player } from './Player'; // Import the actual Player component
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { LAYOUT } from '@/constants/layout';
import { useThemeColor } from '@/hooks/useThemeColor'; // Import theme hook
import { useTranslation } from '@/hooks/useTranslation';

const PANEL_HEIGHT_COLLAPSED = 60;
const PANEL_HEIGHT_EXPANDED = 130; // Adjusted height for Player component

export const BenchPanel = () => {
  const { team, movePlayerToCourt } = useTeam();
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'menuBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  const benchPlayers = team?.benchPlayers ?? [];

  const handlePlayerPress = (playerId: string) => {
    // Move player to court when tapped on the bench
    movePlayerToCourt(playerId); 
    // Optionally collapse the panel after moving a player
    // setIsExpanded(false); 
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
                  onPress={handlePlayerPress} // Handle tap
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
