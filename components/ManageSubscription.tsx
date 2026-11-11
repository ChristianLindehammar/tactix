import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { createPlanService } from '@/services/planService';

interface ManageSubscriptionProps {
  plans: ReturnType<typeof createPlanService>;
}

/** Lets a paying coach cancel or switch plans without hunting through the phone's settings. */
export function ManageSubscription({ plans }: ManageSubscriptionProps) {
  const { t } = useTranslation();
  const state = React.useSyncExternalStore(plans.subscribe, plans.getState);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    void plans.refresh();
  }, [plans]);

  if (!plans.canSell || state.status !== 'active') return null;

  const manage = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await plans.manage();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.hint}>{t('planManageHint')}</ThemedText>
      <ThemedButton disabled={busy} onPress={manage}>{t('planManage')}</ThemedButton>
      {failed ? (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {t('planErrorManage')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Lines up with the account panel above it
  container: { gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  hint: { opacity: 0.7 },
  error: { color: '#c0392b' },
});
