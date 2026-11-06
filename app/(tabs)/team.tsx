import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlayerListItem } from '@/components/PlayerListItem';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AddPlayersSheet } from '@/components/team/AddPlayersSheet';
import { TeamActionsSheet } from '@/components/team/TeamActionsSheet';
import { TeamSwitcherButton } from '@/components/team/TeamSwitcherButton';
import { TeamSwitcherSheet } from '@/components/team/TeamSwitcherSheet';
import { useTeamUiColors } from '@/components/team/useTeamUiColors';
import { useTeam } from '@/context/TeamContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { PlayerType } from '@/types/models';

type Sheet = 'none' | 'switch' | 'actions' | 'add';

export default function TeamScreen() {
  const { team, teams } = useTeam();
  const [sheet, setSheet] = useState<Sheet>('none');
  const tint = useThemeColor({}, 'tint') as string;
  const colors = useTeamUiColors();
  const tabBarHeight = useBottomTabBarHeight();
  const { t } = useTranslation();
  const closeSheet = () => setSheet('none');

  const onCourt = team?.startingPlayers ?? [];
  const bench = team?.benchPlayers ?? [];
  const playerCount = onCourt.length + bench.length;

  const section = (title: string, players: PlayerType[]) => players.length > 0 && (
    <>
      <ThemedText style={[styles.sectionTitle, { color: colors.muted }]}>{title}</ThemedText>
      {players.map(player => (
        <PlayerListItem key={player.id} player={player} isOnCourt={false} />
      ))}
    </>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {!team ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyText}>{teams.length === 0 ? t('noTeamsExist') : t('pickATeam')}</ThemedText>
            <ThemedButton onPress={() => setSheet('switch')}>{teams.length === 0 ? t('addATeam') : t('yourTeams')}</ThemedButton>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <TeamSwitcherButton variant="title" onPress={() => setSheet('switch')} />
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.moreButton, { backgroundColor: colors.chip }]}
                    onPress={() => setSheet('actions')}
                    accessibilityRole="button"
                    accessibilityLabel={t('teamOptions')}
                    hitSlop={4}
                  >
                    <MaterialIcons name="more-horiz" size={24} color={colors.text} />
                  </Pressable>
                  <Pressable onPress={() => setSheet('add')} accessibilityRole="button" accessibilityLabel={t('addPlayers')} hitSlop={8}>
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

            {playerCount === 0 ? (
              <View style={styles.empty}>
                <ThemedText style={styles.emptyText}>{t('noPlayersYet')}</ThemedText>
                <ThemedButton onPress={() => setSheet('add')}>{t('addPlayers')}</ThemedButton>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: (Platform.OS === 'ios' ? tabBarHeight : 0) + 24 }}>
                {section(t('onCourtCount', { count: onCourt.length }), onCourt)}
                {section(t('benchCount', { count: bench.length }), bench)}
              </ScrollView>
            )}
          </>
        )}
      </SafeAreaView>

      <TeamSwitcherSheet visible={sheet === 'switch'} onClose={closeSheet} />
      <TeamActionsSheet visible={sheet === 'actions'} onClose={closeSheet} />
      <AddPlayersSheet visible={sheet === 'add'} onClose={closeSheet} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
  },
});
