import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useTeamUiColors } from './useTeamUiColors';

interface TeamSwitcherButtonProps {
  onPress: () => void;
  /** `title` is the large heading on the Team tab, `compact` the line under the Playing field heading. */
  variant: 'title' | 'compact';
}

/** Shows the open team and opens the team switcher. */
export function TeamSwitcherButton({ onPress, variant }: TeamSwitcherButtonProps) {
  const { team } = useTeam();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  if (!team) return null;

  const compact = variant === 'compact';
  return (
    <TouchableOpacity
      style={[styles.button, compact ? styles.compact : styles.title]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('switchTeam', { teamName: team.name })}
      hitSlop={compact ? { top: 6, bottom: 6 } : undefined}
    >
      {compact && team.shared ? <Ionicons name="people" size={15} color={colors.accent} /> : null}
      <ThemedText
        numberOfLines={1}
        style={compact ? [styles.compactText, { color: colors.accent }] : styles.titleText}
      >
        {team.name}
      </ThemedText>
      <MaterialIcons name="keyboard-arrow-down" size={compact ? 20 : 28} color={colors.accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flexShrink: 1,
    minHeight: 44,
  },
  compact: {
    alignSelf: 'flex-start',
    minHeight: 32,
  },
  titleText: {
    flexShrink: 1,
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
  },
  compactText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
