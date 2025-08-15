import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Player } from './Player';
import { PlayerType } from '@/types/models';
import { useTeam } from '@/context/TeamContext';

interface Props {
  availableHeight: number;
  availableWidth: number;
  playerPositions: PlayerType[];
  onDragEnd: (playerId: string, position: { x: number; y: number }) => void;
  CourtSvg: React.ComponentType<{ width: number; height: number, stroke?: string }>;
  aspectRatio: number; // width/height ratio of the court
}

// Helper function to validate player position
const isValidPosition = (position: { x: number; y: number } | null | undefined): boolean => {
  if (!position) return false;
  
  // Add small epsilon to handle potential floating-point precision issues
  const epsilon = 0.0001;
  return position.x >= -epsilon && 
         position.x <= 1 + epsilon && 
         position.y >= -epsilon && 
         position.y <= 1 + epsilon;
};

export const GenericCourt = ({ availableHeight, availableWidth, playerPositions, onDragEnd, CourtSvg, aspectRatio }: Props) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const { updatePlayerPosition } = useTeam();
  
  // Fix invalid positions only on initial render or when new players are added
  useEffect(() => {
    let hasInvalidPositions = false;
    
    playerPositions.forEach(player => {
      // Skip players that are currently being dragged
      if (player.id === selectedPlayerId) return;
      
      // Only fix positions that are clearly invalid (null, undefined, or far outside bounds)
      const pos = player.courtPosition;
      if (!pos || pos.x < -0.1 || pos.x > 1.1 || pos.y < -0.1 || pos.y > 1.1) {
        hasInvalidPositions = true;
        // Use default position until TeamContext can properly assign a free position
        const defaultPosition = { x: 0.5, y: 0.5 };
        updatePlayerPosition(player.id, defaultPosition);
      }
    });
    
    // Log if we fixed any positions for debugging
    if (hasInvalidPositions) {
      console.log('Fixed invalid player positions');
    }
  }, [playerPositions.length]); // Only run when the number of players changes

  // Filter players with valid positions for rendering
  const validatedPlayers = playerPositions.filter(player => isValidPosition(player.courtPosition));
  
  const handleDragEnd = (playerId: string, pos: { x: number; y: number }) => {
    // Ensure position is within bounds before updating
    const clampedPos = {
      x: Math.max(0, Math.min(1, pos.x)),
      y: Math.max(0, Math.min(1, pos.y))
    };
    
    setSelectedPlayerId(null);
    onDragEnd(playerId, clampedPos);
  };

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <View style={[styles.container, { width: availableWidth, height: availableHeight }]}>
        <CourtSvg width={availableWidth} height={availableHeight} />
        <View style={StyleSheet.absoluteFill}>
          {validatedPlayers.map((player) => {
            return (
              <Player
                key={player.id}
                id={player.id}
                name={player.name}
                position={player.position}
                courtPosition={player.courtPosition!}
                onDragEnd={(pos) => handleDragEnd(player.id, pos)}
                containerSize={{ width: availableWidth, height: availableHeight }}
                isSelected={player.id === selectedPlayerId}
              />
            );
          })}
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  player: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: 'red',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerName: {
    color: 'white',
    fontWeight: 'bold',
  },
});