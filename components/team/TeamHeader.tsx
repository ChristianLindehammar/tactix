import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { useTeam } from '@/context/TeamContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { TeamSwitcherButton } from './TeamSwitcherButton';
import { useTeamUiColors } from './useTeamUiColors';

interface TeamHeaderProps {
  onSwitchTeam: () => void;
  onTeamOptions: () => void;
  onAddPlayers: () => void;
}

/** The open team's name, which switches team, with its menu, the add players button and who it is shared with. */
export function TeamHeader({ onSwitchTeam, onTeamOptions, onAddPlayers }: TeamHeaderProps) {
  const { team } = useTeam();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  const tint = useThemeColor({}, 'tint') as string;
  if (!team) return null;

  const playerCount = team.startingPlayers.length + team.benchPlayers.length;

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <TeamSwitcherButton onPress={onSwitchTeam} />
        <View style={styles.actions}>
          <Pressable
            style={[styles.moreButton, { backgroundColor: colors.chip }]}
            onPress={onTeamOptions}
            accessibilityRole="button"
            accessibilityLabel={t('teamOptions')}
            hitSlop={4}
          >
            <MaterialIcons name="more-horiz" size={24} color={colors.text} />
          </Pressable>
          <Pressable onPress={onAddPlayers} accessibilityRole="button" accessibilityLabel={t('addPlayers')} hitSlop={8}>
            <MaterialIcons name="add-circle" size={36} color={tint} />
          </Pressable>
        </View>
      </View>
      <View style={styles.subtitle}>
        {team.shared ? <Ionicons name="people" size={15} color={colors.accent} /> : null}
        <ThemedText style={[styles.subtitleText, { color: colors.muted }]}>
          {`${t('teamPlayerCount', { count: playerCount })} · ${team.shared ? t('sharedWithCoaches') : t('onlyOnThisDevice')}`}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subtitleText: {
    fontSize: 13,
  },
});
