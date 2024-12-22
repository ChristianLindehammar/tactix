import React, { forwardRef, useState } from 'react';
import { View, Button, TextInput, Alert } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useTeam } from '@/contexts/TeamContext';

type TeamBottomSheetProps = {
  onClose: () => void;
};

const TeamBottomSheet = forwardRef<typeof RBSheet, TeamBottomSheetProps>((props, ref) => {
  const { teams, createTeam, selectTeam, removeTeam } = useTeam();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSelectTeam, setShowSelectTeam] = useState(false);
  const [showRemoveTeam, setShowRemoveTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

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

  return (
    <RBSheet ref={ref} height={200} openDuration={250} onClose={handleClose}>
      <View style={{ padding: 20 }}>
        {(!showCreateTeam && !showSelectTeam && !showRemoveTeam) && (
          <>
            <Button title="Create Team" onPress={() => setShowCreateTeam(true)} />
            <Button title="Select Existing Team" onPress={() => setShowSelectTeam(true)} />
            <Button title="Remove Existing Team" onPress={() => setShowRemoveTeam(true)} />
          </>
        )}
        {showCreateTeam && (
          <>
            <TextInput
              placeholder="New Team Name"
              value={newTeamName}
              onChangeText={setNewTeamName}
              style={{ borderColor: '#ccc', borderWidth: 1, marginBottom: 10, padding: 8 }}
            />
            <Button title="Confirm" onPress={handleCreateTeamConfirm} />
          </>
        )}
        {showSelectTeam && (
          <>
            {teams.map((item) => (
              <Button
                key={item.id}
                title={item.name}
                onPress={() => handleSelectTeam(item.id)}
              />
            ))}
          </>
        )}
        {showRemoveTeam && (
          <>
            {teams.map((item) => (
              <Button
                key={item.id}
                title={`Remove ${item.name}`}
                onPress={() => {
                  Alert.alert(
                    'Remove Team',
                    `Are you sure you want to remove "${item.name}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'OK', onPress: () => handleRemoveTeam(item.id) },
                    ]
                  );
                }}
              />
            ))}
          </>
        )}
      </View>
    </RBSheet>
  );
});

export default TeamBottomSheet;
