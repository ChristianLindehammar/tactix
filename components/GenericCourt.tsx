import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Player } from './Player';
import { PlayerType } from '@/types/models';

interface Props {
  availableHeight: number;
  availableWidth: number;
  playerPositions: PlayerType[];
  onDragEnd: (playerId: string, position: { x: number; y: number }) => void;
  CourtSvg: React.ComponentType<{ width: number; height: number, stroke?: string }>;
  aspectRatio: number; // width/height ratio of the court
}

export const GenericCourt = ({ availableHeight, availableWidth, playerPositions, onDragEnd, CourtSvg, aspectRatio }: Props) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  const handleDragEnd = (playerId: string, pos: { x: number; y: number }) => {
    setSelectedPlayerId(null);
    onDragEnd(playerId, pos);
  };

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <View style={[styles.container, { width: availableWidth, height: availableHeight }]}>
        <CourtSvg width={availableWidth} height={availableHeight} />
        <View style={StyleSheet.absoluteFill}>
          {playerPositions.map((player) => {
            // Only render players that have a valid courtPosition
            if (!player.courtPosition) return null;
            
            return (
              <Player
                key={player.id}
                id={player.id}
                name={player.name}
                position={player.position}
                courtPosition={player.courtPosition}
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