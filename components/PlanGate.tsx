import * as React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { createPlanService, PlanError } from '@/services/planService';

interface PlanGateProps {
  plans: ReturnType<typeof createPlanService>;
  onExport: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  children: React.ReactNode;
}

export function PlanGate({ plans, onExport, onDeleteAll, children }: PlanGateProps) {
  const { t } = useTranslation();
  const state = React.useSyncExternalStore(plans.subscribe, plans.getState);
  const background = useThemeColor({}, 'background') as string;
  const [price, setPrice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [checking, setChecking] = React.useState(true);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const check = React.useCallback(async () => {
    setChecking(true);
    await plans.refresh();
    setChecking(false);
    setPrice(await plans.getPrice().catch(() => null));
  }, [plans]);

  React.useEffect(() => {
    void check();
  }, [check]);

  const attempt = async (action: () => Promise<void>, failureKey: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(t(failure instanceof PlanError ? 'planErrorSignInFirst' : failureKey));
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'active') return <>{children}</>;
  if (checking && state.status === 'unknown') return <ActivityIndicator style={styles.spinner} />;
  if (state.status === 'unknown') {
    return (
      <View style={[styles.container, { backgroundColor: background }]}>
        <ThemedText accessibilityRole="alert">{t('planErrorCheck')}</ThemedText>
        <ThemedButton onPress={check}>{t('planTryAgain')}</ThemedButton>
      </View>
    );
  }

  const lapsed = state.status === 'lapsed';

  const restore = async () => {
    await plans.restore();
    if (plans.getState().status === 'none') setError(t('planNothingToRestore'));
  };

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
    >
      <ThemedText type="title">{t(lapsed ? 'planEndedTitle' : 'planTitle')}</ThemedText>
      <ThemedText>{t(lapsed ? 'planEndedBody' : 'planBenefits')}</ThemedText>
      {price && !lapsed ? <ThemedText type="defaultSemiBold">{t('planTrialPrice', { price })}</ThemedText> : null}
      {error ? (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      {busy ? <ActivityIndicator /> : null}
      <ThemedButton disabled={!price || busy} onPress={() => attempt(plans.purchase, 'planErrorPurchase')}>
        {t(lapsed ? 'planRenew' : 'planStartTrial')}
      </ThemedButton>
      <ThemedButton disabled={busy} onPress={() => attempt(restore, 'planErrorRestore')}>
        {t('planRestore')}
      </ThemedButton>
      {lapsed ? (
        <>
          <ThemedButton disabled={busy} onPress={() => attempt(onExport, 'planErrorExport')}>
            {t('planExport')}
          </ThemedButton>
          {confirmingDelete ? (
            <>
              <ThemedText>{t('planDeleteAllConfirm')}</ThemedText>
              <ThemedButton
                style={styles.destructive}
                disabled={busy}
                onPress={() => attempt(onDeleteAll, 'planErrorDelete')}
              >
                {t('planDeleteAllYes')}
              </ThemedButton>
              <ThemedButton disabled={busy} onPress={() => setConfirmingDelete(false)}>
                {t('cancel')}
              </ThemedButton>
            </>
          ) : (
            <ThemedButton disabled={busy} onPress={() => setConfirmingDelete(true)}>
              {t('planDeleteAll')}
            </ThemedButton>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 16, padding: 24, justifyContent: 'center' },
  spinner: { flex: 1 },
  error: { color: '#c0392b' },
  destructive: { backgroundColor: '#c0392b' },
});
