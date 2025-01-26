import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTeam } from '@/contexts/TeamContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/useThemeColor';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { CustomInputDialog } from '@/components/CustomInputDialog';

export default function TeamModal() {
  const navigation = useNavigation();
  const { teams, createTeam, selectTeam, removeTeam, team, renameTeam, exportTeam, importTeamFromFile } = useTeam();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSelectTeam, setShowSelectTeam] = useState(false);
  const [showRemoveTeam, setShowRemoveTeam] = useState(false);
  const [showRenameTeam, setShowRenameTeam] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'borderColor');

  const handleCreateTeamConfirm = (teamName: string) => {
    if (teamName.trim()) {
      createTeam(teamName.trim());
      setShowCreateTeam(false);
      navigation.goBack();
    }
  };

  const handleSelectTeam = (teamId: string) => {
    selectTeam(teamId);
    setShowSelectTeam(false);
    navigation.goBack();
  };

  const handleRemoveTeam = (teamId: string) => {
    removeTeam(teamId);
    setShowRemoveTeam(false);
    navigation.goBack();
  };

  const handleRenameTeam = (newName: string) => {
    if (team && newName.trim()) {
      renameTeam(team.id, newName.trim());
      setShowRenameTeam(false);
      navigation.goBack();
    }
  };

  const handleExportTeam = async () => {
    if (!team) return;
    await exportTeam(team.id);
    navigation.goBack();
  };

  const handleImportTeam = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        if (!file.name.endsWith('.tactix')) {
          Alert.alert('Invalid File', 'Please select a .tactix file');
          return;
        }
        await importTeamFromFile(file.uri);
        navigation.goBack();
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
    navigation.goBack();
  };

  const mainMenuItems = [
    {
      icon: 'group-add',
      title: 'Create Team',
      onPress: () => setShowCreateTeam(true),
      visible: true,
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
      onPress: () => team && setShowRenameTeam(true),
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
      visible: true,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {!showSelectTeam && !showRemoveTeam && (
        <>
          {mainMenuItems
            .filter(item => item.visible)
            .map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                <MaterialIcons size={24} name={item.icon} color={tintColor} style={styles.menuIcon} />
                <ThemedText style={[styles.menuText, { color: textColor }]}>{item.title}</ThemedText>
              </TouchableOpacity>
            ))}
        </>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
  },
});