import * as React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { ProviderSignInButton } from '@/components/ProviderSignInButton';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthError, AuthErrorCode, AuthSession } from '@/services/authSession';
import type { SignInProvider } from '@/services/signInProviders';

const ERROR_KEYS: Record<AuthErrorCode, string> = {
  invalidEmail: 'accountErrorInvalidEmail',
  invalidCode: 'accountErrorInvalidCode',
  invalidProviderToken: 'accountErrorProvider',
  rateLimited: 'accountErrorRateLimited',
  offline: 'accountErrorOffline',
  unavailable: 'accountErrorUnavailable',
};

interface AccountPanelProps {
  session: AuthSession;
  providers: SignInProvider[];
  /** Replaces the general explanation shown while signed out. */
  intro?: string;
}

export function AccountPanel({ session, providers, intro }: AccountPanelProps) {
  const { t, getCurrentLocale } = useTranslation();
  const state = React.useSyncExternalStore(session.subscribe, session.getState);
  const textColor = useThemeColor({}, 'text') as string;
  const border = useThemeColor({}, 'borderColor') as string;

  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const attempt = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      const key = failure instanceof AuthError ? ERROR_KEYS[failure.code] : 'accountErrorUnavailable';
      setError(t(key));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setEmail('');
    setCode('');
    setCodeSent(false);
    setConfirmingDelete(false);
  };

  const inputStyle = [styles.input, { borderColor: border, color: textColor }];
  const feedback = (
    <>
      {error ? (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      {busy ? <ActivityIndicator style={styles.spinner} /> : null}
    </>
  );

  if (state.status === 'signedIn') {
    return (
      <View style={styles.container}>
        <ThemedText type="defaultSemiBold">{t('accountSignedInAs')}</ThemedText>
        <ThemedText>{state.email ?? t('accountNoEmail')}</ThemedText>
        <ThemedText style={styles.hint}>{t('accountUploadHint')}</ThemedText>
        <ThemedButton
          disabled={busy}
          onPress={() => attempt(async () => {
            await session.signOut();
            reset();
          })}
        >{t('accountSignOut')}</ThemedButton>
        {confirmingDelete ? (
          <View style={[styles.confirm, { borderColor: border }]}>
            <ThemedText type="defaultSemiBold">{t('accountDeleteTitle')}</ThemedText>
            <ThemedText>{t('accountDeleteExplanation')}</ThemedText>
            <ThemedButton
              style={styles.destructive}
              disabled={busy}
              onPress={() => attempt(async () => {
                await session.deleteAccount();
                reset();
              })}
            >{t('accountDeleteConfirm')}</ThemedButton>
            <ThemedButton disabled={busy} onPress={() => setConfirmingDelete(false)}>{t('cancel')}</ThemedButton>
          </View>
        ) : (
          <ThemedButton disabled={busy} onPress={() => setConfirmingDelete(true)}>{t('accountDelete')}</ThemedButton>
        )}
        {feedback}
      </View>
    );
  }

  if (codeSent) {
    return (
      <View style={styles.container}>
        <ThemedText>{t('accountCodeSentTo', { email: email.trim() })}</ThemedText>
        <TextInput
          accessibilityLabel={t('accountCode')}
          placeholder={t('accountCode')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          style={inputStyle}
        />
        <ThemedButton
          disabled={busy || code.trim().length === 0}
          onPress={() => attempt(async () => {
            await session.verifyEmailCode(email, code);
            reset();
          })}
        >{t('accountVerifyCode')}</ThemedButton>
        <ThemedButton
          disabled={busy}
          onPress={() => {
            setCode('');
            setError(null);
            setCodeSent(false);
          }}
        >{t('accountUseAnotherEmail')}</ThemedButton>
        {feedback}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText>{intro ?? t('accountExplanation')}</ThemedText>
      {providers.map(provider => (
        <ProviderSignInButton
          key={provider.id}
          id={provider.id}
          disabled={busy}
          onPress={() => attempt(async () => {
            const token = await provider.signIn();
            if (!token) return;
            await session.signInWithProvider(provider.id, token.idToken, token.nonce);
            reset();
          })}
        />
      ))}
      <TextInput
        accessibilityLabel={t('accountEmail')}
        placeholder={t('accountEmail')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        style={inputStyle}
      />
      <ThemedButton
        disabled={busy || email.trim().length === 0}
        onPress={() => attempt(async () => {
          await session.requestEmailCode(email, getCurrentLocale());
          setCodeSent(true);
        })}
      >{t('accountSendCode')}</ThemedButton>
      {feedback}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  hint: { opacity: 0.7 },
  error: { color: '#D32F2F' },
  spinner: { marginTop: 4 },
  destructive: { backgroundColor: '#D32F2F' },
  confirm: { gap: 12, padding: 12, borderWidth: 1, borderRadius: 8 },
});
