import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';

import { ThemedText } from '@/components/ThemedText';
import { sportsConfig } from '@/constants/sports';
import { useSport } from '@/context/SportContext';
import { useTeam } from '@/context/TeamContext';
import { getValidPosition } from '@/context/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { PlayerType } from '@/types/models';
import { usePositionLabel } from './usePositionLabel';
import { useTeamUiColors } from './useTeamUiColors';

/** Every player in the team, split by where the open line-up has them. Tapping one opens their options. */
export function RosterList({ onPlayerPress }: { onPlayerPress: (playerId: string) => void }) {
  const { team } = useTeam();
  const { selectedSport } = useSport();
  const { t } = useTranslation();
  const colors = useTeamUiColors();
  const positionLabel = usePositionLabel();
  const tabBarHeight = useBottomTabBarHeight();
  const { positionColors = {} } = sportsConfig[selectedSport ?? 'soccer'];

  const onCourt = team?.startingPlayers ?? [];
  const bench = team?.benchPlayers ?? [];

  const section = (title: string, players: PlayerType[]) => players.length > 0 && (
    <>
      <ThemedText style={[styles.sectionTitle, { color: colors.muted }]}>{title}</ThemedText>
      {players.map(player => (
        <TouchableOpacity
          key={player.id}
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => onPlayerPress(player.id)}
          accessibilityRole="button"
        >
          <View style={[styles.badge, { backgroundColor: positionColors[getValidPosition(player.position, selectedSport ?? 'soccer')] ?? colors.chip }]}>
            <ThemedText style={styles.badgeText} numberOfLines={1}>{positionLabel(player.position)}</ThemedText>
          </View>
          <ThemedText style={styles.name} numberOfLines={1}>{player.name}</ThemedText>
          <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
        </TouchableOpacity>
      ))}
    </>
  );

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: (Platform.OS === 'ios' ? tabBarHeight : 0) + 24 }]}>
      {section(t('onCourtCount', { count: onCourt.length }), onCourt)}
      {section(t('benchCount', { count: bench.length }), bench)}
      <ThemedText style={[styles.note, { color: colors.muted }]}>{t('lineupFollowsHint')}</ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15191C',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    paddingTop: 14,
  },
});
