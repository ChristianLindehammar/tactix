import React, { forwardRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import ActionSheet, { SheetManager } from 'react-native-actions-sheet';
import { useTeam } from '@/contexts/TeamContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/useThemeColor';
import * as DocumentPicker from 'expo-document-picker';
import { ThemedText } from './ThemedText';

const TeamBottomSheet = forwardRef<typeof ActionSheet>((props, ref) => {
  const { teams, createTeam, selectTeam, removeTeam, team, renameTeam, exportTeam, importTeamFromFile } = useTeam();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSelectTeam, setShowSelectTeam] = useState(false);
  const [showRemoveTeam, setShowRemoveTeam] = useState(false);
  const [showRenameTeam, setShowRenameTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Update theme color handling
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'borderColor');

  const handleCreateTeamConfirm = () => {
    createTeam(newTeamName.trim());
    setNewTeamName('');
    setShowCreateTeam(false);
    (ref as any)?.current?.hide();
  };

  const handleSelectTeam = (teamId: string) => {
    selectTeam(teamId);
    setShowSelectTeam(false);
    (ref as any)?.current?.hide();
  };

  const handleRemoveTeam = (teamId: string) => {
    removeTeam(teamId);
    setShowRemoveTeam(false);
    (ref as any)?.current?.hide();
  };

  const handleRenameTeam = () => {
    if (team && newTeamName.trim()) {
      renameTeam(team.id, newTeamName.trim());
      setNewTeamName('');
      setShowRenameTeam(false);
      (ref as any)?.current?.hide();
    }
  };

  const handleExportTeam = async () => {
    if (!team) return;
    await exportTeam(team.id);
    (ref as any)?.current?.hide();
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
        (ref as any)?.current?.hide();
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
          setNewTeamName(team.name);
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
      ref={ref}
      id="team-bottom-sheet"
      onClose={handleClose}
      containerStyle={[styles.bottomSheetContainer, { backgroundColor }]}
      indicatorStyle={{ backgroundColor: borderColor }}>
      <View style={[styles.content, { backgroundColor }]}>
        {!showCreateTeam && !showSelectTeam && !showRemoveTeam && !showRenameTeam && (
          <>
            {mainMenuItems.filter(item => item.visible).map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                <MaterialIcons size={24} name={item.icon} color={tintColor} style={styles.menuIcon} />
                <ThemedText style={[styles.menuText, { color: textColor }]}>{item.title}</ThemedText>
              </TouchableOpacity>
            ))}
          </>
        )}

        {showCreateTeam && (
          <View style={styles.formContainer}>
            <TextInput 
              placeholder='New Team Name' 
              placeholderTextColor={textColor}
              value={newTeamName} 
              onChangeText={setNewTeamName} 
              style={[styles.input, { 
                borderColor, 
                color: textColor,
                backgroundColor: backgroundColor 
              }]} 
            />
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: tintColor }, newTeamName.trim() === '' && styles.buttonDisabled]} 
              onPress={handleCreateTeamConfirm} 
              disabled={newTeamName.trim() === ''}>
              <ThemedText style={styles.buttonText}>Confirm</ThemedText>
            </TouchableOpacity>
          </View>
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

        {showRenameTeam && (
          <View style={styles.formContainer}>
            <TextInput 
              placeholder='New Team Name' 
              placeholderTextColor={textColor}
              value={newTeamName} 
              onChangeText={setNewTeamName} 
              style={[styles.input, { 
                borderColor, 
                color: textColor,
                backgroundColor: backgroundColor 
              }]} 
            />
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: tintColor }, newTeamName.trim() === '' && styles.buttonDisabled]} 
              onPress={handleRenameTeam} 
              disabled={newTeamName.trim() === ''}
            >
              <ThemedText style={styles.buttonText}>Rename</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ActionSheet>
  );
});

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
