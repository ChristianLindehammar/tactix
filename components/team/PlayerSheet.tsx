import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { sportsConfig } from '@/constants/sports';
import { useSport } from '@/context/SportContext';
import { useTeam } from '@/context/TeamContext';
import { findFreePositionNearCentre, getValidPosition } from '@/context/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { BottomSheet } from './BottomSheet';
import { NameForm } from './NameForm';
import { SheetRow } from './SheetRow';
import { useAfterClose } from './useAfterClose';
import { useTeamUiColors } from './useTeamUiColors';
import { usePositionLabel } from './usePositionLabel';

interface PlayerSheetProps {
  playerId: string | null;
  visible: boolean;
  onClose: () => void;
}

/** What a coach can change about one player: position, court or bench in this line-up, name, or remove them. */
export function PlayerSheet({ playerId, visible, onClose }: PlayerSheetProps) {
  const { team, setPlayerType, movePlayerToBench, movePlayerToCourt, renamePlayer, deletePlayer } = useTeam();
  const { selectedSport } = useSport();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  const positionLabel = usePositionLabel();
  const [renaming, setRenaming] = useState(false);
  const resetView = useCallback(() => setRenaming(false), []);
  const { handleDismissed } = useAfterClose(onClose, resetView);

  const onCourt = team?.startingPlayers.find(p => p.id === playerId);
  const player = onCourt ?? team?.benchPlayers.find(p => p.id === playerId);
  if (!team || !player) return null;

  const { positions, positionColors = {} } = sportsConfig[selectedSport ?? 'soccer'];
  const current = getValidPosition(player.position, selectedSport ?? 'soccer');
  const lineup = team.configurations?.find(c => c.id === team.selectedConfigurationId)?.name ?? '';

  const handleRename = (name: string) => {
    renamePlayer(player.id, name);
    onClose();
  };

  const toggleCourt = () => {
    if (onCourt) movePlayerToBench(player.id);
    else movePlayerToCourt(player.id, findFreePositionNearCentre(team.startingPlayers));
    onClose();
  };

  const confirmRemove = () => {
    Alert.alert(t('removeFromTeam'), t('deletePlayerConfirm', { playerName: player.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('removeFromTeam'),
        style: 'destructive',
        onPress: () => {
          onClose();
          deletePlayer(player.id);
        },
      },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={handleDismissed}
      title={renaming ? t('renamePlayer') : player.name}
      subtitle={renaming ? undefined : t(onCourt ? 'onCourtIn' : 'onBenchIn', { lineup })}
    >
      {renaming ? (
        <NameForm label={t('playerName')} submitLabel={t('save')} initialValue={player.name} onSubmit={handleRename} onCancel={() => setRenaming(false)} />
      ) : (
        <View>
          <ThemedText style={[styles.section, { color: colors.muted }]}>{t('position')}</ThemedText>
          <View style={styles.positions} accessibilityRole="radiogroup" accessibilityLabel={t('position')}>
            {positions.map(position => {
              const selected = position === current;
              return (
                <Pressable
                  key={position}
                  onPress={() => setPlayerType(player.id, position)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.position,
                    { borderColor: selected ? colors.text : colors.border, backgroundColor: selected ? positionColors[position] ?? colors.accentSoft : 'transparent' },
                  ]}
                >
                  <ThemedText style={[styles.positionText, selected && styles.positionSelected, selected && { color: '#15191C' }]}>
                    {positionLabel(position)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <SheetRow icon="swap-vert" title={t(onCourt ? 'moveToBench' : 'putOnCourt')} onPress={toggleCourt} />
          <SheetRow icon="edit" title={t('renamePlayer')} onPress={() => setRenaming(true)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SheetRow
            icon="delete-outline"
            title={t('removeFromTeam')}
            hint={t('removeFromTeamHint', { playerName: player.name })}
            destructive
            onPress={confirmRemove}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  positions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  position: {
    minHeight: 40,
    minWidth: 48,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 14,
  },
  positionSelected: {
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
});
