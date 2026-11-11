import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { AccountGate } from '@/components/AccountGate';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { useTeam } from '@/context/TeamContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { authSession } from '@/services/account';
import { restoreAccount } from '@/services/exerciseRepository';
import { signInProvidersFor } from '@/services/signInProviders';
import { formatInviteCode, InvitePreview, inviteCodeFrom, teamSharing, TeamSharingError } from '@/services/teamSharing';

const providers = signInProvidersFor(Platform.OS);

/** Joins a shared team, from an invite link or a code typed in. */
export function JoinTeam({ initialCode }: { initialCode?: string }) {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'background') as string;

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <AccountGate
        session={authSession}
        providers={providers}
        restore={restoreAccount}
        title={t('shareTeamGateTitle')}
        intro={t('joinTeamGateBody')}
      >
        <JoinTeamForm initialCode={initialCode} />
      </AccountGate>
    </View>
  );
}

function JoinTeamForm({ initialCode }: { initialCode?: string }) {
  const { t } = useTranslation();
  const { joinTeam, teams, selectTeam } = useTeam();
  const textColor = useThemeColor({}, 'text') as string;
  const border = useThemeColor({}, 'borderColor') as string;

  const [code, setCode] = useState(initialCode ? formatInviteCode(inviteCodeFrom(initialCode)) : '');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explain = useCallback(
    (failure: unknown) =>
      setError(t(failure instanceof TeamSharingError && failure.code === 'inviteNotFound' ? 'inviteNotFound' : 'joinTeamFailed')),
    [t],
  );

  const find = useCallback(async (value: string) => {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(await teamSharing.previewInvite(value));
    } catch (failure) {
      explain(failure);
    } finally {
      setBusy(false);
    }
  }, [explain]);

  // A link already carries the code, so go straight to what it leads to
  useEffect(() => {
    if (initialCode) void find(initialCode);
  }, [initialCode, find]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await joinTeam(code);
      router.dismissAll();
      router.replace('/');
    } catch (failure) {
      explain(failure);
      setBusy(false);
    }
  };

  const openExisting = () => {
    const existing = teams.find(team => team.shared?.id === preview?.teamId);
    if (existing) selectTeam(existing.id);
    router.dismissAll();
    router.replace('/');
  };

  const sportName = preview?.sport ? t(preview.sport) : null;
  const hasCode = inviteCodeFrom(code).length >= 10;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ThemedText>{t('joinTeamIntro')}</ThemedText>
      <TextInput
        value={code}
        onChangeText={value => {
          setCode(value);
          setPreview(null);
        }}
        placeholder={t('inviteCode')}
        placeholderTextColor="#888"
        accessibilityLabel={t('inviteCode')}
        autoCapitalize="characters"
        autoCorrect={false}
        style={[styles.input, { color: textColor, borderColor: border }]}
      />
      {!preview && (
        <ThemedButton disabled={busy || !hasCode} onPress={() => find(code)}>
          {t('findTeam')}
        </ThemedButton>
      )}
      {busy && <ActivityIndicator />}
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      {preview && (
        <View style={[styles.preview, { borderColor: border }]}>
          <ThemedText type="subtitle">{preview.name ?? t('unnamedTeam')}</ThemedText>
          {sportName && <ThemedText>{sportName}</ThemedText>}
          {preview.ownerName && <ThemedText>{t('invitedBy', { name: preview.ownerName })}</ThemedText>}
          <ThemedText>{t('teamCoaches', { count: preview.memberCount })}</ThemedText>
          {preview.role ? (
            <>
              <ThemedText>{t('alreadyInTeam')}</ThemedText>
              <ThemedButton onPress={openExisting}>{t('openTeam')}</ThemedButton>
            </>
          ) : (
            <ThemedButton disabled={busy} onPress={join}>
              {t('joinThisTeam')}
            </ThemedButton>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    letterSpacing: 1,
  },
  preview: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8, marginTop: 8 },
  error: { color: '#d32f2f' },
});
