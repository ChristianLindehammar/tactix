import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Alert, View } from 'react-native';
import { PlayerType, PlayerPosition } from '@/types/models';
import { positionColors } from '@/constants/positionColors';
import { useTeam } from '@/contexts/TeamContext';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { ScaleDecorator } from "react-native-draggable-flatlist";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSport } from '@/context/SportContext';

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


  const handleRename = () => {
    Alert.prompt(
      "Rename Player",
      "Enter new name:",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "OK",
          onPress: (newName) => {
            if (newName?.trim()) {
              renamePlayer(player.id, newName.trim());
            }
          }
        }
      ],
      "plain-text",
      player.name
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Player",
      `Are you sure you want to delete ${player.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => deletePlayer(player.id),
          style: "destructive"
        }
      ]
    );
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
          <Menu>
            <MenuTrigger>
              <Ionicons name="ellipsis-horizontal" size={24} color={textColor} />
            </MenuTrigger>
            <MenuOptions customStyles={{
              optionsContainer: [
                styles.menuContainer,
                { 
                  backgroundColor: colors.card,
                }
              ],
              optionWrapper: styles.menuOption,
            }}>
              <MenuOption 
                onSelect={handleRename} 
                text="Rename" 
                customStyles={{
                  optionText: { color: textColor }
                }}
              />
              <MenuOption 
                onSelect={handleDelete} 
                text="Delete" 
                customStyles={{
                  optionWrapper: styles.deleteOption,
                  optionText: { color: 'red' }
                }} 
              />
            </MenuOptions>
          </Menu>
        </View>
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
          style={styles.segmentedControl, { backgroundColor: colors.card }}
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
