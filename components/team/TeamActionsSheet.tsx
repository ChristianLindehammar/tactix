import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { BottomSheet } from './BottomSheet';
import { NameForm } from './NameForm';
import { SheetRow } from './SheetRow';
import { useAfterClose } from './useAfterClose';
import { useTeamUiColors } from './useTeamUiColors';

interface TeamActionsSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Everything a coach can do with the team that is open: rename, share it live, send a copy or remove it. */
export function TeamActionsSheet({ visible, onClose }: TeamActionsSheetProps) {
  const { team, renameTeam, exportTeam, removeTeam, stopSharing, leaveTeam } = useTeam();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  const [renaming, setRenaming] = useState(false);
  const resetView = useCallback(() => setRenaming(false), []);
  const { closeThen, handleDismissed } = useAfterClose(onClose, resetView);

  if (!team) return null;

  const count = team.startingPlayers.length + team.benchPlayers.length;
  const role = team.shared?.role;

  const handleRename = (name: string) => {
    renameTeam(team.id, name);
    onClose();
  };

  const remove = async () => {
    if (role) {
      // Otherwise the team would come back at the next sign-in, and other coaches would wait for it
      try {
        await (role === 'owner' ? stopSharing(team.id) : leaveTeam(team.id));
      } catch {
        Alert.alert(t('error'), t('sharingActionFailed'));
        return;
      }
    }
    onClose();
    removeTeam(team.id);
  };

  const confirmRemove = () => {
    const message = !role
      ? t('teamRemoveConfirm', { teamName: team.name })
      : t(role === 'owner' ? 'removeSharedTeamOwnerConfirm' : 'removeSharedTeamEditorConfirm', { teamName: team.name });
    Alert.alert(t('removeTeam'), message, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('removeTeam'), style: 'destructive', onPress: () => void remove() },
    ]);
  };

  const removeHint = !role ? t('removeTeamHint') : t(role === 'owner' ? 'removeSharedTeamOwnerHint' : 'removeSharedTeamEditorHint');

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={handleDismissed}
      title={renaming ? t('renameTeam') : team.name}
      subtitle={renaming ? undefined : `${t(team.sport)} · ${t('teamPlayerCount', { count })}`}
    >
      {renaming ? (
        <NameForm label={t('teamName')} submitLabel={t('save')} initialValue={team.name} onSubmit={handleRename} onCancel={() => setRenaming(false)} />
      ) : (
        <View>
          <SheetRow icon="edit" title={t('renameTeam')} onPress={() => setRenaming(true)} />
          <SheetRow
            icon="groups"
            title={t('coachTogether')}
            hint={t('coachTogetherHint')}
            onPress={() => closeThen(() => router.push('/share-team'))}
          />
          <SheetRow icon="ios-share" title={t('sendCopy')} hint={t('sendCopyHint')} onPress={() => closeThen(() => void exportTeam(team.id))} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SheetRow icon="delete-outline" title={t('removeTeam')} hint={removeHint} destructive onPress={confirmRemove} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
});
