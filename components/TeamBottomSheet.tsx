import React, { forwardRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useTeam } from '@/contexts/TeamContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/useThemeColor';

type TeamBottomSheetProps = {
  onClose: () => void;
};

const TeamBottomSheet = forwardRef<typeof RBSheet, TeamBottomSheetProps>((props, ref) => {
  const { teams, createTeam, selectTeam, removeTeam } = useTeam();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSelectTeam, setShowSelectTeam] = useState(false);
  const [showRemoveTeam, setShowRemoveTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Fix the theme color hook calls
  const bottomSheetColors = useThemeColor({}, 'bottomSheet');
  const backgroundColor = typeof bottomSheetColors === 'string' ? bottomSheetColors : bottomSheetColors.background;
  const textColor = typeof bottomSheetColors === 'string' ? bottomSheetColors : bottomSheetColors.text;
  const iconColor = typeof bottomSheetColors === 'string' ? bottomSheetColors : bottomSheetColors.icon;
  const inputColor = typeof bottomSheetColors === 'string' ? bottomSheetColors : bottomSheetColors.input;
  const dragHandleColor = typeof bottomSheetColors === 'string' ? bottomSheetColors : bottomSheetColors.dragHandle;

  const handleCreateTeamConfirm = () => {
    createTeam(newTeamName.trim());
    setNewTeamName('');
    setShowCreateTeam(false);
    (ref as any)?.current?.close();
  };

  const handleSelectTeam = (teamId: string) => {
    selectTeam(teamId);
    setShowSelectTeam(false);
    (ref as any)?.current?.close();
  };

  const handleRemoveTeam = (teamId: string) => {
    removeTeam(teamId);
    setShowRemoveTeam(false);
    (ref as any)?.current?.close();
  };

  const handleClose = () => {
    setShowCreateTeam(false);
    setShowSelectTeam(false);
    setShowRemoveTeam(false);
    props.onClose();
  };

  const mainMenuItems: { icon: keyof typeof MaterialIcons.glyphMap; title: string; onPress: () => void }[] = [
    {
      icon: 'group-add',
      title: 'Create Team',
      onPress: () => setShowCreateTeam(true),
    },
    {
      icon: 'groups-3',
      title: 'Select Existing Team',
      onPress: () => setShowSelectTeam(true),
    },
    {
      icon: 'group-remove',
      title: 'Remove Existing Team',
      onPress: () => setShowRemoveTeam(true),
    },
  ];

  return (
    <RBSheet
      ref={ref}
      height={250}
      openDuration={250}
      closeOnDragDown={true}
      closeOnPressMask={true}
      customStyles={{
        container: [styles.bottomSheetContainer, { backgroundColor }],
        draggableIcon: [styles.draggableIcon, { backgroundColor: dragHandleColor }],
      }}
      onClose={handleClose}>
      <View style={styles.content}>
        {!showCreateTeam && !showSelectTeam && !showRemoveTeam && (
          <>
            {mainMenuItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                <MaterialIcons size={24} name={item.icon} color={iconColor} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: textColor }]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {showCreateTeam && (
          <View style={styles.formContainer}>
            <TextInput 
              placeholder='New Team Name' 
              placeholderTextColor={iconColor}
              value={newTeamName} 
              onChangeText={setNewTeamName} 
              style={[styles.input, { backgroundColor: inputColor, color: textColor }]} 
            />
            <TouchableOpacity style={[styles.button, newTeamName.trim() === '' && styles.buttonDisabled]} onPress={handleCreateTeamConfirm} disabled={newTeamName.trim() === ''}>
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}

        {showSelectTeam && (
          <>
            {teams.map((item) => (
              <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => handleSelectTeam(item.id)}>
                <MaterialIcons size={24} name='groups-3' color={iconColor} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: textColor as string }]}>{item.name}</Text>
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
                <MaterialIcons size={24} name='group-remove' color={iconColor as string} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: textColor as string }]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    </RBSheet>
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TeamBottomSheet;
