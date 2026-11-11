import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Team } from '@/types/models';
import { BottomSheet } from './BottomSheet';
import { NameForm } from './NameForm';
import { SheetRow } from './SheetRow';
import { pickTeamFile } from './pickTeamFile';
import { useAfterClose } from './useAfterClose';
import { useTeamUiColors } from './useTeamUiColors';

interface TeamSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

/** Lists the coach's teams for the current sport and every way to add another one. */
export function TeamSwitcherSheet({ visible, onClose }: TeamSwitcherSheetProps) {
  const { team, teams, selectTeam, createTeam, importTeamFromFile } = useTeam();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  const [creating, setCreating] = useState(false);
  const resetView = useCallback(() => setCreating(false), []);
  const { closeThen, handleDismissed } = useAfterClose(onClose, resetView);

  const describe = (candidate: Team) => {
    const count = candidate.startingPlayers.length + candidate.benchPlayers.length;
    const where = candidate.shared ? t('sharedWithCoaches') : t('onlyOnThisDevice');
    return `${t('teamPlayerCount', { count })} · ${where}`;
  };

  const handlePick = (teamId: string) => {
    selectTeam(teamId);
    onClose();
  };

  const handleCreate = (name: string) => {
    createTeam(name);
    onClose();
  };

  const sport = team?.sport ?? teams[0]?.sport;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onDismissed={handleDismissed}
      title={creating ? t('newTeam') : t('yourTeams')}
      subtitle={!creating && sport ? t(sport) : undefined}
    >
      {creating ? (
        <NameForm label={t('teamName')} submitLabel={t('createTeam')} onSubmit={handleCreate} onCancel={() => setCreating(false)} />
      ) : (
        <ScrollView bounces={false}>
          {teams.map(candidate => {
            const current = candidate.id === team?.id;
            return (
              <TouchableOpacity
                key={candidate.id}
                style={[styles.team, current && { backgroundColor: colors.accentSoft }]}
                onPress={() => handlePick(candidate.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
              >
                <View style={[styles.badge, { backgroundColor: current ? colors.primary : colors.chip }]}>
                  <ThemedText style={[styles.badgeText, { color: current ? colors.onPrimary : colors.text }]}>
                    {initials(candidate.name)}
                  </ThemedText>
                </View>
                <View style={styles.teamText}>
                  <ThemedText style={styles.teamName} numberOfLines={1}>{candidate.name}</ThemedText>
                  <ThemedText style={[styles.teamDetail, { color: colors.muted }]} numberOfLines={1}>{describe(candidate)}</ThemedText>
                </View>
                {current ? (
                  <MaterialIcons name="check" size={24} color={colors.accent} />
                ) : null}
              </TouchableOpacity>
            );
          })}

          {teams.length > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          <ThemedText style={[styles.section, { color: colors.muted }]}>{t('addATeam')}</ThemedText>
          <SheetRow icon="add" title={t('newTeam')} hint={t('newTeamHint')} onPress={() => setCreating(true)} />
          <SheetRow icon="vpn-key" title={t('joinWithCode')} hint={t('joinWithCodeHint')} onPress={() => closeThen(() => router.push('/join'))} />
          <SheetRow
            icon="file-open"
            title={t('openTeamFile')}
            hint={t('openTeamFileHint')}
            onPress={() => closeThen(() => void pickTeamFile(importTeamFromFile, t))}
          />
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 60,
    borderRadius: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  teamText: {
    flex: 1,
    gap: 2,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
  },
  teamDetail: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  section: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
