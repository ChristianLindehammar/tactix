import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Alert, View } from 'react-native';
import { PlayerType, usePlayerPositionTranslation } from '@/types/models';
import { positionColors } from '@/constants/positionColors';
import { useTeam } from '@/contexts/TeamContext';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useTheme } from '@react-navigation/native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSport } from '@/context/SportContext';
import { OptionMenuModal } from './OptionMenuModal';
import { CustomInputDialog } from './CustomInputDialog';
import { Ionicons } from '@expo/vector-icons';
import { useReorderableDrag } from 'react-native-reorderable-list';
import { useTranslation } from '@/hooks/useTranslation';
import { sportsConfig } from '@/constants/sports';

interface PlayerListItemProps {
  player: PlayerType;
  isOnCourt: boolean;
}

export const PlayerListItem = React.memo(
  ({ player }: PlayerListItemProps) => {
    const { setPlayerType, deletePlayer, renamePlayer } = useTeam();
    const { selectedSport } = useSport();
    const { positions } = sportsConfig[selectedSport ?? 'soccer'];
    const textColor = useThemeColor({}, 'text') as string;
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [renameDialogVisible, setRenameDialogVisible] = useState(false);
    const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
    const drag = useReorderableDrag();
    const { t } = useTranslation();

    const { translatePosition } = usePlayerPositionTranslation();

    const translatedPositions = useMemo(() => 
      positions.map(pos => translatePosition(pos)),
      [translatePosition, positions]
    );

    const handleRename = (newName: string) => {
      if (newName.trim()) {
        renamePlayer(player.id, newName.trim());
      }
      setRenameDialogVisible(false);
    };

    const handleDelete = () => {
      Alert.alert(
        t('deletePlayer'),
        t('deletePlayerConfirm', { playerName: player.name })
        , [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deletePlayer(player.id),
        },
      ]);
    };

    const handleOptionsPress = (event: any) => {
      const { pageX, pageY } = event.nativeEvent;
      setModalPosition({ top: pageY, left: pageX });
      setModalVisible(true);
    };

    return (
      <TouchableOpacity onLongPress={drag} style={[styles.container, { backgroundColor: positionColors[player.position] }]}>
        <View style={styles.headerRow}>
          <Text>{player.name}</Text>
          <TouchableOpacity onPress={handleOptionsPress}>
            <Ionicons name='ellipsis-horizontal' size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <OptionMenuModal visible={modalVisible} onClose={() => setModalVisible(false)} onRename={() => setRenameDialogVisible(true)} onDelete={handleDelete} position={modalPosition} />

        <CustomInputDialog visible={renameDialogVisible} title={t('renamePlayer')} onCancel={() => setRenameDialogVisible(false)} onSubmit={handleRename} initialValue={player.name} />

        <SegmentedControl
          values={translatedPositions}
          selectedIndex={positions.indexOf(player.position) ?? 0}
          onChange={(event) => {
            const selectedIndex = event.nativeEvent.selectedSegmentIndex;
            const selectedPosition = positions[selectedIndex];
            setPlayerType(player.id, selectedPosition);
          }}
          style={[styles.segmentedControl, { backgroundColor: colors.card }]}
        />
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.player.id === nextProps.player.id &&
      prevProps.player.name === nextProps.player.name &&
      prevProps.player.position === nextProps.player.position
    );
  }
);
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
