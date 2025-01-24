import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Alert, View, Button } from 'react-native';
import { PlayerType, PlayerPosition } from '@/types/models';
import { positionColors } from '@/constants/positionColors';
import { useTeam } from '@/contexts/TeamContext';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { ScaleDecorator } from "react-native-draggable-flatlist";
import { useTheme } from '@react-navigation/native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSport } from '@/context/SportContext';
import { OptionMenuModal } from './OptionMenuModal';
import { CustomInputDialog } from './CustomInputDialog';
import { Ionicons } from '@expo/vector-icons';

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
  const { setPlayerType, deletePlayer, renamePlayer } = useTeam();
  const { selectedSport } = useSport();
  const positions = Object.values(PlayerPosition);
  const displayPositions = positions.map(pos =>
    pos === PlayerPosition.Midfielder && selectedSport === 'floorball'
      ? 'Center'
      : pos
  );
  const textColor = useThemeColor({}, 'text') as string;
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [renameDialogVisible, setRenameDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

  const handleRename = (newName: string) => {
    if (newName.trim()) {
      renamePlayer(player.id, newName.trim());
    }
    setRenameDialogVisible(false);
  };

  const handleDelete = () => {
    deletePlayer(player.id);
    setDeleteDialogVisible(false);
  };

  const handleOptionsPress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setModalPosition({ top: pageY, left: pageX });
    setModalVisible(true);
  };

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
        <View style={styles.headerRow}>
          <Text >{player.name}</Text>
          <TouchableOpacity onPress={handleOptionsPress}>
          <Ionicons name="ellipsis-horizontal" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <OptionMenuModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onRename={() => setRenameDialogVisible(true)}
          onDelete={() => setDeleteDialogVisible(true)}
          position={modalPosition}
        />

        <CustomInputDialog
          visible={renameDialogVisible}
          title="Rename Player"
          onCancel={() => setRenameDialogVisible(false)}
          onSubmit={handleRename}
          initialValue={player.name}
        />

        <CustomInputDialog
          visible={deleteDialogVisible}
          title={`Delete ${player.name}?`}
          onCancel={() => setDeleteDialogVisible(false)}
          onSubmit={handleDelete}
        />

        <SegmentedControl
          values={displayPositions}
          selectedIndex={positions.indexOf(player.position)}
          onChange={(event) => {
            const selectedDisplayPosition = displayPositions[event.nativeEvent.selectedSegmentIndex];
            const selectedPosition = selectedDisplayPosition === 'Center'
              ? PlayerPosition.Midfielder
              : selectedDisplayPosition;
            setPlayerType(player.id, selectedPosition);
          }}
          style={[styles.segmentedControl, { backgroundColor: colors.card }]}
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
    maxWidth: 500,
    alignSelf: 'flex-start',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuContainer: {
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuOption: {
    padding: 12,
  },
  deleteOption: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
