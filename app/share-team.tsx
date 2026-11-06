import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { AccountGate } from '@/components/AccountGate';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { useTeam } from '@/context/TeamContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { authSession } from '@/services/account';
import { restoreAccount } from '@/services/exerciseRepository';
import { signInProvidersFor } from '@/services/signInProviders';
import { formatInviteCode, TeamMember, teamSharing } from '@/services/teamSharing';

const providers = signInProvidersFor(Platform.OS);
const MEMBERS_REFRESH_MS = 15_000;

export default function ShareTeamScreen() {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'background') as string;

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <AccountGate
        session={authSession}
        providers={providers}
        restore={restoreAccount}
        title={t('shareTeamGateTitle')}
        intro={t('shareTeamGateBody')}
      >
        <ShareTeam />
      </AccountGate>
    </View>
  );
}

function ShareTeam() {
  const { team, shareTeam, stopSharing, leaveTeam } = useTeam();
  const { t } = useTranslation();
  const border = useThemeColor({}, 'borderColor') as string;
  const tint = useThemeColor({}, 'tint') as string;

  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [membersFailed, setMembersFailed] = useState(false);

  const sharedId = team?.shared?.id;
  const isOwner = team?.shared?.role === 'owner';

  const loadMembers = useCallback(async () => {
    if (!sharedId) return;
    try {
      setMembers(await teamSharing.members(sharedId));
      setMembersFailed(false);
    } catch {
      setMembersFailed(true);
    }
  }, [sharedId]);

  // Coaches join from their own phones, so keep the list fresh while it's showing
  useFocusEffect(
    useCallback(() => {
      void loadMembers();
      const timer = setInterval(() => void loadMembers(), MEMBERS_REFRESH_MS);
      return () => clearInterval(timer);
    }, [loadMembers]),
  );

  if (!team) return null;

  const run = async (action: () => Promise<void>, failure = 'sharingActionFailed') => {
    setBusy(true);
    try {
      await action();
    } catch {
      Alert.alert(t('error'), t(failure));
    } finally {
      setBusy(false);
    }
  };

  const invite = () =>
    run(async () => {
      const created = await teamSharing.createInvite(sharedId!);
      await Share.share({
        message: t('inviteMessage', { teamName: team.name, link: created.link, code: formatInviteCode(created.code) }),
      });
    }, 'inviteFailed');

  const confirm = (title: string, message: string, yes: string, action: () => Promise<void>) =>
    Alert.alert(title, message, [
      { text: t('cancel'), style: 'cancel' },
      { text: yes, style: 'destructive', onPress: () => void run(action) },
    ]);

  const nameOf = (member: TeamMember) => member.displayName ?? t('unnamedCoach');
  const me = members?.find(member => member.isYou);

  if (!sharedId) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{team.name}</ThemedText>
        <ThemedText>{t('coachTogetherIntro', { teamName: team.name })}</ThemedText>
        <ThemedButton disabled={busy} onPress={() => run(() => shareTeam(team.id), 'startSharingFailed')}>
          {t('startSharing')}
        </ThemedButton>
        {busy && <ActivityIndicator />}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="subtitle">{team.name}</ThemedText>
      <ThemedText>{t(isOwner ? 'coachTogetherOwner' : 'coachTogetherEditor')}</ThemedText>

      {isOwner && (
        <ThemedButton disabled={busy} onPress={invite}>
          {t('inviteCoach')}
        </ThemedButton>
      )}

      <ThemedText type="defaultSemiBold" style={styles.heading}>{t('coaches')}</ThemedText>
      {membersFailed && <ThemedText>{t('membersLoadFailed')}</ThemedText>}
      {members === null && !membersFailed && <ActivityIndicator />}
      {members?.map(member => (
        <View key={member.userId} style={[styles.member, { borderColor: border }]}>
          <View style={styles.memberText}>
            <ThemedText type="defaultSemiBold">
              {member.isYou ? t('memberYou', { name: nameOf(member) }) : nameOf(member)}
            </ThemedText>
            <ThemedText style={styles.role}>{t(member.role === 'owner' ? 'ownerRole' : 'editorRole')}</ThemedText>
          </View>
          {isOwner && member.role !== 'owner' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('removeCoachLabel', { name: nameOf(member) })}
              hitSlop={8}
              disabled={busy}
              onPress={() =>
                confirm(t('removeCoach'), t('removeCoachConfirm', { name: nameOf(member), teamName: team.name }), t('removeCoach'),
                  async () => {
                    await teamSharing.removeMember(sharedId, member.userId);
                    await loadMembers();
                  })
              }
            >
              <ThemedText type="link">{t('removeCoach')}</ThemedText>
            </Pressable>
          )}
        </View>
      ))}
      {me && me.displayName === null && <ThemedText style={styles.hint}>{t('setDisplayNameHint')}</ThemedText>}

      <View style={styles.footer}>
        {isOwner ? (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await teamSharing.revokeInvites(sharedId);
                  Alert.alert(t('stopInviteLinks'), t('stopInviteLinksDone'));
                })
              }
            >
              <ThemedText style={{ color: tint }}>{t('stopInviteLinks')}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() =>
                confirm(t('stopSharing'), t('stopSharingConfirm', { teamName: team.name }), t('stopSharing'), async () => {
                  await stopSharing(team.id);
                  router.back();
                })
              }
            >
              <ThemedText style={styles.destructive}>{t('stopSharing')}</ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() =>
              confirm(t('leaveTeam'), t('leaveTeamConfirm', { teamName: team.name }), t('leaveTeam'), async () => {
                await leaveTeam(team.id);
                router.back();
              })
            }
          >
            <ThemedText style={styles.destructive}>{t('leaveTeam')}</ThemedText>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  heading: { marginTop: 12 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberText: { flex: 1 },
  role: { fontSize: 14, opacity: 0.7 },
  hint: { fontSize: 14, opacity: 0.75 },
  footer: { marginTop: 24, gap: 20 },
  destructive: { color: '#d32f2f' },
});
