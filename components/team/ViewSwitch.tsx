import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useTeamUiColors } from './useTeamUiColors';

export type TeamView = 'court' | 'players';

interface ViewSwitchProps {
  view: TeamView;
  playerCount: number;
  onChange: (view: TeamView) => void;
}

/** Flips the Team tab between the court and the list of players. */
export function ViewSwitch({ view, playerCount, onChange }: ViewSwitchProps) {
  const { t } = useTranslation();
  const colors = useTeamUiColors();

  const option = (value: TeamView, icon: 'sports' | 'people', label: string) => {
    const selected = view === value;
    return (
      <Pressable
        onPress={() => onChange(value)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        style={[styles.option, selected && [styles.selected, { backgroundColor: colors.sheet }]]}
      >
        <MaterialIcons name={icon} size={16} color={colors.text} />
        <ThemedText style={[styles.label, selected && styles.selectedLabel]}>{label}</ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.switch, { backgroundColor: colors.chip }]} accessibilityRole="tablist">
      {option('court', 'sports', t('court'))}
      {option('players', 'people', t('playersCount', { count: playerCount }))}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 3,
    gap: 2,
    borderRadius: 10,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 8,
  },
  selected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 14,
  },
  selectedLabel: {
    fontWeight: '600',
  },
});
