import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Player } from './Player';
import { PlayerType } from '@/types/models';
import { LAYOUT } from '@/constants/layout';

interface Props {
  availableHeight: number;
  availableWidth: number;
  playerPositions: PlayerType[];
  onDragEnd: (playerId: string, position: { x: number; y: number }) => void;
  CourtSvg: React.ComponentType<{ width: number; height: number, stroke?: string }>;
  aspectRatio: number; // width/height ratio of the court
}

export const GenericCourt = ({ availableHeight, availableWidth, playerPositions, onDragEnd, CourtSvg, aspectRatio }: Props) => {
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
                onDragEnd={(pos) => {
                  const universalX = pos.x / availableWidth * LAYOUT.UNIVERSAL_COURT_WIDTH;
                  const universalY = pos.y / availableHeight * LAYOUT.UNIVERSAL_COURT_HEIGHT;
                  onDragEnd(player.id, { x: universalX, y: universalY });
                }}
                containerSize={{ width: availableWidth, height: availableHeight }}
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
