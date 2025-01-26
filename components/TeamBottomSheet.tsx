import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import ActionSheet, { SheetManager } from 'react-native-actions-sheet';
import { useTeam } from '@/contexts/TeamContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/useThemeColor';
import * as DocumentPicker from 'expo-document-picker';
import { ThemedText } from './ThemedText';
import { CustomInputDialog } from './CustomInputDialog';

const TeamBottomSheet = () => {
  const { teams, createTeam, selectTeam, removeTeam, team, renameTeam, exportTeam, importTeamFromFile } = useTeam();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSelectTeam, setShowSelectTeam] = useState(false);
  const [showRemoveTeam, setShowRemoveTeam] = useState(false);
  const [showRenameTeam, setShowRenameTeam] = useState(false);

  // Update theme color handling
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'borderColor');

  const handleCreateTeamConfirm = (teamName: string) => {
    if (teamName.trim()) {
      createTeam(teamName.trim());
      setShowCreateTeam(false);
      SheetManager.hide('team-bottom-sheet');
    }
  };

  const handleSelectTeam = (teamId: string) => {
    selectTeam(teamId);
    setShowSelectTeam(false);
    SheetManager.hide('team-bottom-sheet');
  };

  const handleRemoveTeam = (teamId: string) => {
    removeTeam(teamId);
    setShowRemoveTeam(false);
    SheetManager.hide('team-bottom-sheet');
  };

  const handleRenameTeam = (newName: string) => {
    if (team && newName.trim()) {
      renameTeam(team.id, newName.trim());
      setShowRenameTeam(false);
      SheetManager.hide('team-bottom-sheet');
    }
  };

  const handleExportTeam = async () => {
    if (!team) return;
    await exportTeam(team.id);
    SheetManager.hide('team-bottom-sheet');
  };

  const handleImportTeam = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      console.log('Importing team from file:', result);
      
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        if (!file.name.endsWith('.tactix')) {
          Alert.alert('Invalid File', 'Please select a .tactix file');
          return;
        }
        await importTeamFromFile(file.uri);
        SheetManager.hide('team-bottom-sheet');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import team file');
      console.error('Import team error:', error);
    }
  };

  const handleClose = () => {
    setShowCreateTeam(false);
    setShowSelectTeam(false);
    setShowRemoveTeam(false);
    setShowRenameTeam(false);
  };

  const mainMenuItems: { icon: keyof typeof MaterialIcons.glyphMap; title: string; onPress: () => void; visible?: boolean }[] = [
    {
      icon: 'group-add',
      title: 'Create Team',
      onPress: () => setShowCreateTeam(true),
      visible: true, // Always visible
    },
    {
      icon: 'groups-3',
      title: 'Select Team',
      onPress: () => setShowSelectTeam(true),
      visible: teams.length > 0,
    },
    {
      icon: 'edit',
      title: 'Rename Team',
      onPress: () => {
        if (team) {
          setShowRenameTeam(true);
        }
      },
      visible: !!team,
    },
    {
      icon: 'group-remove',
      title: 'Remove Team',
      onPress: () => setShowRemoveTeam(true),
      visible: teams.length > 0,
    },
    {
      icon: 'share',
      title: 'Share Team',
      onPress: handleExportTeam,
      visible: !!team,
    },
    {
      icon: 'file-upload',
      title: 'Import Team',
      onPress: handleImportTeam,
      visible: true, // Always visible
    },
  ];

  return (
    <ActionSheet
      id="team-bottom-sheet"
      onClose={handleClose}
      containerStyle={[styles.bottomSheetContainer, { backgroundColor }]}
      indicatorStyle={{ backgroundColor: borderColor }}>
      <View style={[styles.content, { backgroundColor }]}>
        {!showSelectTeam && !showRemoveTeam && (
          <>
            {mainMenuItems.filter(item => item.visible).map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                <MaterialIcons size={24} name={item.icon} color={tintColor} style={styles.menuIcon} />
                <ThemedText style={[styles.menuText, { color: textColor }]}>{item.title}</ThemedText>
              </TouchableOpacity>
            ))}
          </>
        )}

        <CustomInputDialog
          visible={showCreateTeam}
          title="Create New Team"
          onCancel={() => setShowCreateTeam(false)}
          onSubmit={handleCreateTeamConfirm}
        />

        <CustomInputDialog
          visible={showRenameTeam}
          title="Rename Team"
          onCancel={() => setShowRenameTeam(false)}
          onSubmit={handleRenameTeam}
          initialValue={team?.name}
        />

        {showSelectTeam && (
          <>
            {teams.map((item) => (
              <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => handleSelectTeam(item.id)}>
                <MaterialIcons size={24} name='groups-3' color={tintColor} style={styles.menuIcon} />
                <ThemedText style={[styles.menuText, { color: textColor }]}>{item.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </>
        )}

        {showRemoveTeam && (
          <>
            {teams.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  Alert.alert('Remove Team', `Are you sure you want to remove "${item.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'OK', onPress: () => handleRemoveTeam(item.id) },
                  ]);
                }}>
                <MaterialIcons size={24} name='group-remove' color={tintColor} style={styles.menuIcon} />
                <ThemedText style={[styles.menuText, { color: textColor }]}>{item.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    </ActionSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetContainer: {
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  draggableIcon: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  icon: {
    marginRight: 16,
    width: 24,
    height: 24,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '400',
  },
  menuIcon: {
    marginRight: 16,
  },
  formContainer: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#3A4045',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TeamBottomSheet;
