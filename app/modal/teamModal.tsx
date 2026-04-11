import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTeam } from '@/context/TeamContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/useThemeColor';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { CustomInputDialog } from '@/components/CustomInputDialog';
import { ImportPlayersDialog } from '@/components/ImportPlayersDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { ParsedPlayer } from '@/context/utils/parseBulkPlayerInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TeamModal() {
  const navigation = useNavigation();
  const { teams, createTeam, selectTeam, removeTeam, team, renameTeam, exportTeam, importTeamFromFile, addPlayers } = useTeam();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showSelectTeam, setShowSelectTeam] = useState(false);
  const [showRemoveTeam, setShowRemoveTeam] = useState(false);
  const [showRenameTeam, setShowRenameTeam] = useState(false);
  const [showImportPlayers, setShowImportPlayers] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  

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
        type: ['application/octet-stream', 'application/json', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        if (!file.name.endsWith('.coachmate')) {
          Alert.alert(t('invalidFile'), t('selectCoachmateFile'));
          return;
        }
        await importTeamFromFile(file.uri);
        navigation.goBack();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      const translationKey = [
        'fileReadError',
        'fileParseError',
        'invalidTeamFormat',
        'missingTeamName',
        'missingStartingPlayers',
        'missingBenchPlayers',
        'missingTeamSport',
      ].includes(errorMessage)
        ? errorMessage
        : 'failedToImportTeamFile';
      Alert.alert(t('error'), t(translationKey));
      console.error('Import team error:', error);
    }
  };

  const handleImportPlayers = (parsed: ParsedPlayer[]) => {
    addPlayers(parsed);
    setShowImportPlayers(false);
    navigation.goBack();
  };

  const handleClose = () => {
    setShowCreateTeam(false);
    setShowSelectTeam(false);
    setShowRemoveTeam(false);
    setShowRenameTeam(false);
    setShowImportPlayers(false);
    navigation.goBack();
  };

  const mainMenuItems = [
    {
      icon: 'group-add',
      title: t('createTeam'),
      onPress: () => setShowCreateTeam(true),
      visible: true,
    },
    {
      icon: 'groups-3',
      title: t('selectTeam'),
      onPress: () => setShowSelectTeam(true),
      visible: teams.length > 0,
    },
    {
      icon: 'edit',
      title: t('renameTeam'),
      onPress: () => team && setShowRenameTeam(true),
      visible: !!team,
    },
    {
      icon: 'group-remove',
      title: t('removeTeam'),
      onPress: () => setShowRemoveTeam(true),
      visible: teams.length > 0,
    },
    {
      icon: 'share',
      title: t('shareTeam'),
      onPress: handleExportTeam,
      visible: !!team,
    },
    {
      icon: 'file-upload',
      title: t('importTeam'),
      onPress: handleImportTeam,
      visible: true,
    },
    {
      icon: 'people',
      title: t('importPlayers'),
      onPress: () => setShowImportPlayers(true),
      visible: !!team,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
      <View style={[styles.sheetContainer, { backgroundColor, paddingBottom: 16 + insets.bottom }]}>
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
                  Alert.alert(t('removeTeam'), t('teamRemoveConfirm', { teamName: item.name }), [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('ok'), onPress: () => handleRemoveTeam(item.id) },
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
          title={t('createNewTeam')}
          onCancel={() => setShowCreateTeam(false)}
          onSubmit={handleCreateTeamConfirm}
        />

        <CustomInputDialog
          visible={showRenameTeam}
          title={t('renameTeam')}
          onCancel={() => setShowRenameTeam(false)}
          onSubmit={handleRenameTeam}
          initialValue={team?.name}
        />

        <ImportPlayersDialog
          visible={showImportPlayers}
          onCancel={() => setShowImportPlayers(false)}
          onImport={handleImportPlayers}
        />
      </View>
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
  sheetContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
});