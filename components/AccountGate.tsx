import * as React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { AccountPanel } from '@/components/AccountPanel';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { AuthSession } from '@/services/authSession';
import type { SignInProvider } from '@/services/signInProviders';

interface AccountGateProps {
  session: AuthSession;
  providers: SignInProvider[];
  /** Picks up last launch's session, so a signed-in coach isn't shown the prompt while it loads. */
  restore: () => Promise<void>;
  children: React.ReactNode;
  /** Defaults to the exercise wording. */
  title?: string;
  intro?: string;
}

/** Exercises and shared teams are stored with an account, so a coach signs in before using them. */
export function AccountGate({ session, providers, restore, children, title, intro }: AccountGateProps) {
  const { t } = useTranslation();
  const state = React.useSyncExternalStore(session.subscribe, session.getState);
  const background = useThemeColor({}, 'background') as string;
  const [restored, setRestored] = React.useState(false);

  React.useEffect(() => {
    let current = true;
    void restore().finally(() => current && setRestored(true));
    return () => void (current = false);
  }, [restore]);

  if (state.status === 'signedIn') return <>{children}</>;
  if (!restored) return <ActivityIndicator style={styles.spinner} />;

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText type="title" style={styles.title}>{title ?? t('accountGateTitle')}</ThemedText>
      <AccountPanel session={session} providers={providers} intro={intro ?? t('accountGateBody')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  title: { paddingHorizontal: 16 },
  spinner: { flex: 1 },
});
