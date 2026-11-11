import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTeam } from '@/context/TeamContext';
import { parseBulkPlayerInput } from '@/context/utils/parseBulkPlayerInput';
import { useTranslation } from '@/hooks/useTranslation';
import { BottomSheet } from './BottomSheet';
import { useTeamUiColors } from './useTeamUiColors';

interface AddPlayersSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'one' | 'list';

/** Adds players one at a time, or many at once from a pasted list. */
export function AddPlayersSheet({ visible, onClose }: AddPlayersSheetProps) {
  const { team, addPlayers } = useTeam();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  const [mode, setMode] = useState<Mode>('one');
  const [name, setName] = useState('');
  const [list, setList] = useState('');
  const [lastAdded, setLastAdded] = useState('');

  const parsed = useMemo(() => parseBulkPlayerInput(list), [list]);
  const trimmedName = name.trim();

  const reset = useCallback(() => {
    setMode('one');
    setName('');
    setList('');
    setLastAdded('');
  }, []);

  const addOne = () => {
    if (!trimmedName) return;
    addPlayers([{ name: trimmedName, number: undefined }]);
    setLastAdded(trimmedName);
    // Stays open, so the next name can follow straight away
    setName('');
  };

  const addList = () => {
    if (parsed.length === 0) return;
    addPlayers(parsed);
    onClose();
  };

  const canSubmit = mode === 'one' ? !!trimmedName : parsed.length > 0;
  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }];

  const segment = (value: Mode, label: string) => {
    const active = mode === value;
    return (
      <TouchableOpacity
        style={[styles.segment, active && { backgroundColor: colors.sheet, ...styles.segmentActive }]}
        onPress={() => setMode(value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <ThemedText style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={reset}
      title={t('addPlayersTo', { teamName: team?.name ?? '' })}
    >
      <View style={styles.body}>
        <View style={[styles.segments, { backgroundColor: colors.chip }]} accessibilityRole="tablist">
          {segment('one', t('onePlayer'))}
          {segment('list', t('pasteList'))}
        </View>

        {mode === 'one' ? (
          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: colors.muted }]}>{t('playerName')}</ThemedText>
            <TextInput
              accessibilityLabel={t('playerName')}
              value={name}
              onChangeText={setName}
              onSubmitEditing={addOne}
              submitBehavior="submit"
              returnKeyType="next"
              autoFocus
              style={inputStyle}
            />
            <ThemedText style={[styles.hint, { color: colors.muted }]}>
              {lastAdded ? t('playerAdded', { playerName: lastAdded }) : t('addPlayerKeepsOpen')}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: colors.muted }]}>{t('onePlayerPerLine')}</ThemedText>
            <TextInput
              accessibilityLabel={t('onePlayerPerLine')}
              value={list}
              onChangeText={setList}
              multiline
              autoFocus
              textAlignVertical="top"
              placeholder={t('pasteListPlaceholder')}
              placeholderTextColor={colors.muted}
              style={[inputStyle, styles.multiline]}
            />
            <ThemedText style={[styles.hint, { color: colors.muted }]}>
              {list.trim() && parsed.length === 0 ? t('importPlayersEmpty') : t('pasteListHint')}
            </ThemedText>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.4 }]}
          onPress={mode === 'one' ? addOne : addList}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
        >
          <ThemedText style={[styles.primaryText, { color: colors.onPrimary }]}>
            {mode === 'one' ? t('addPlayer') : t('addPlayersCount', { count: parsed.length })}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  segments: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    gap: 2,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
  },
  segmentTextActive: {
    fontWeight: '600',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  multiline: {
    height: 150,
    paddingTop: 10,
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  primary: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
