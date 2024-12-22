import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { PlayerType, PlayerPosition } from '@/types/models';
import { positionColors } from '@/constants/positionColors';
import { useTeam } from '@/contexts/TeamContext';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { ScaleDecorator } from "react-native-draggable-flatlist";

interface PlayerListItemProps {
  player: PlayerType;
  onPress: () => void;
  isOnCourt: boolean;
  drag?: () => void;
  isActive?: boolean;
}

export const PlayerListItem: React.FC<PlayerListItemProps> = ({
  player,
  onPress,
  isOnCourt,
  drag,
  isActive
}) => {
  const { setPlayerType } = useTeam();
  const positions = Object.values(PlayerPosition);

  return (
    <ScaleDecorator>
      <TouchableOpacity 
        onLongPress={drag}
        disabled={isActive}
        style={[
          styles.container,
          { backgroundColor: isActive ? '#e0e0e0' : positionColors[player.position] }
        ]}
      >
        <Text>{player.name}</Text>
        <SegmentedControl
          values={positions}
          selectedIndex={positions.indexOf(player.position)}
          onChange={(event) => {
            const selectedPosition = positions[event.nativeEvent.selectedSegmentIndex];
            setPlayerType(player.id, selectedPosition);
          }}
          style={styles.segmentedControl}
        />
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  onCourt: {
    backgroundColor: '#e3f2fd',
  },
  onBench: {
    backgroundColor: '#f5f5f5',
  },
  status: {
    fontSize: 12,
    color: '#666',
  },
  segmentedControl: {
    marginTop: 8,
  },
});
