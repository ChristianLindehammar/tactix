import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { BottomSheet } from './BottomSheet';
import { NameForm } from './NameForm';
import { SheetRow } from './SheetRow';
import { useAfterClose } from './useAfterClose';
import { useTeamUiColors } from './useTeamUiColors';

type Sheet = 'none' | 'new' | 'actions';

/** The team's line-ups as chips, with a chip for a new one and a menu for the open one. */
export function LineupBar() {
  const { team, selectConfiguration, createConfiguration } = useTeam();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  const [sheet, setSheet] = useState<Sheet>('none');
  const close = useCallback(() => setSheet('none'), []);

  const lineups = team?.configurations ?? [];
  const active = lineups.find(c => c.id === team?.selectedConfigurationId);
  if (!team || !active) return null;

  const handleCreate = (name: string) => {
    createConfiguration(name);
    close();
  };

  return (
    <View style={styles.bar}>
      <ThemedText style={[styles.label, { color: colors.muted }]}>{t('lineup')}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.scroll}>
        {lineups.map(lineup => {
          const selected = lineup.id === active.id;
          return (
            <Pressable
              key={lineup.id}
              onPress={() => selectConfiguration(lineup.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                selected
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { borderColor: colors.border },
              ]}
            >
              <ThemedText style={[styles.chipText, selected && { color: colors.onPrimary, fontWeight: '600' }]} numberOfLines={1}>
                {lineup.name}
              </ThemedText>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setSheet('new')}
          accessibilityRole="button"
          accessibilityLabel={t('newLineup')}
          style={[styles.chip, styles.newChip, { borderColor: colors.muted }]}
        >
          <MaterialIcons name="add" size={16} color={colors.accent} />
          <ThemedText style={[styles.chipText, { color: colors.accent, fontWeight: '600' }]}>{t('newLineupShort')}</ThemedText>
        </Pressable>
      </ScrollView>
      <Pressable
        onPress={() => setSheet('actions')}
        accessibilityRole="button"
        accessibilityLabel={t('lineupOptions', { name: active.name })}
        hitSlop={6}
        style={[styles.more, { backgroundColor: colors.chip }]}
      >
        <MaterialIcons name="more-horiz" size={20} color={colors.text} />
      </Pressable>

      <BottomSheet visible={sheet === 'new'} onClose={close} title={t('newLineup')} subtitle={t('newLineupHint', { name: active.name })}>
        <NameForm label={t('lineupName')} submitLabel={t('create')} onSubmit={handleCreate} onCancel={close} />
      </BottomSheet>
      <LineupActionsSheet visible={sheet === 'actions'} onClose={close} />
    </View>
  );
}

function LineupActionsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { team, renameConfiguration, deleteConfiguration } = useTeam();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  const [renaming, setRenaming] = useState(false);
  const resetView = useCallback(() => setRenaming(false), []);
  const { handleDismissed } = useAfterClose(onClose, resetView);

  const lineups = team?.configurations ?? [];
  const active = lineups.find(c => c.id === team?.selectedConfigurationId);
  if (!team || !active) return null;

  const handleRename = (name: string) => {
    renameConfiguration(active.id, name);
    onClose();
  };

  const confirmDelete = () => {
    Alert.alert(t('deleteLineup'), t('deleteLineupConfirm', { name: active.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          onClose();
          deleteConfiguration(active.id);
        },
      },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={handleDismissed}
      title={renaming ? t('renameLineup') : t('lineupTitle', { name: active.name })}
      subtitle={renaming ? undefined : t('lineupSummary', { onCourt: team.startingPlayers.length, bench: team.benchPlayers.length })}
    >
      {renaming ? (
        <NameForm label={t('lineupName')} submitLabel={t('save')} initialValue={active.name} onSubmit={handleRename} onCancel={() => setRenaming(false)} />
      ) : (
        <View>
          <SheetRow icon="edit" title={t('renameLineup')} onPress={() => setRenaming(true)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {lineups.length > 1 ? (
            <SheetRow icon="delete-outline" title={t('deleteLineup')} hint={t('deleteLineupHint')} destructive onPress={confirmDelete} />
          ) : (
            <ThemedText style={[styles.note, { color: colors.muted }]}>{t('lastLineupHint')}</ThemedText>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  chips: {
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChip: {
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 10,
    borderStyle: 'dashed',
  },
  chipText: {
    fontSize: 14,
    lineHeight: 18,
    maxWidth: 160,
  },
  more: {
    width: 36,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  note: {
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
});
