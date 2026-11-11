import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useTeamUiColors } from './useTeamUiColors';

/** Shows the open team as the screen heading and opens the team switcher. */
export function TeamSwitcherButton({ onPress }: { onPress: () => void }) {
  const { team } = useTeam();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  if (!team) return null;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('switchTeam', { teamName: team.name })}
    >
      <ThemedText numberOfLines={1} style={styles.text}>
        {team.name}
      </ThemedText>
      <MaterialIcons name="keyboard-arrow-down" size={28} color={colors.accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minHeight: 44,
  },
  text: {
    flexShrink: 1,
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
  },
});
