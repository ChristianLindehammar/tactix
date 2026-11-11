import * as React from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { createPlanService, PlanError, PlanPeriod, PlanPrices } from '@/services/planService';

interface PlanGateProps {
  plans: ReturnType<typeof createPlanService>;
  onExport: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  children: React.ReactNode;
}

// Apple requires both on the screen that sells the subscription. Apple's standard EULA
// only covers App Store purchases, so Google Play buyers get our own terms.
export function legalLinksFor(os: string) {
  const terms =
    os === 'ios'
      ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
      : 'https://lindehammar-konsult.se/terms-of-use.html';
  return [
    { labelKey: 'planTermsOfUse', url: terms },
    { labelKey: 'planPrivacyPolicy', url: 'https://lindehammar-konsult.se/privacy-policy.html' },
  ];
}
const LEGAL_LINKS = legalLinksFor(Platform.OS);
const NO_PRICES: PlanPrices = { annual: null, monthly: null };
const PERIODS: { period: PlanPeriod; labelKey: string }[] = [
  { period: 'annual', labelKey: 'planPerYear' },
  { period: 'monthly', labelKey: 'planPerMonth' },
];

export function PlanGate({ plans, onExport, onDeleteAll, children }: PlanGateProps) {
  const { t } = useTranslation();
  const state = React.useSyncExternalStore(plans.subscribe, plans.getState);
  const background = useThemeColor({}, 'background') as string;
  const border = useThemeColor({}, 'text') as string;
  const [prices, setPrices] = React.useState<PlanPrices>(NO_PRICES);
  const [picked, setPicked] = React.useState<PlanPeriod>('annual');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [checking, setChecking] = React.useState(true);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const check = React.useCallback(async () => {
    setChecking(true);
    await plans.refresh();
    setChecking(false);
    setPrices(await plans.getPrices().catch(() => NO_PRICES));
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
  if (!plans.canSell) {
    return (
      <View style={[styles.container, { backgroundColor: background }]}>
        <ThemedText type="title">{t('planTitle')}</ThemedText>
        <ThemedText>{t('planBenefits')}</ThemedText>
        <ThemedText type="defaultSemiBold">{t('planUnavailable')}</ThemedText>
      </View>
    );
  }
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
  // The store may offer only one of them
  const chosen: PlanPeriod = prices[picked] ? picked : picked === 'annual' ? 'monthly' : 'annual';
  const price = prices[chosen];

  const restore = async () => {
    await plans.restore();
    if (plans.getState().status === 'none') setError(t('planNothingToRestore'));
  };

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.container}>
      <ThemedText type="title">{t(lapsed ? 'planEndedTitle' : 'planTitle')}</ThemedText>
      <ThemedText>{t(lapsed ? 'planEndedBody' : 'planBenefits')}</ThemedText>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {PERIODS.map(({ period, labelKey }) => {
          const optionPrice = prices[period];
          if (!optionPrice) return null;
          const selected = period === chosen;
          return (
            <Pressable
              key={period}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              disabled={busy}
              onPress={() => setPicked(period)}
              style={[styles.option, { borderColor: border }, selected && styles.selected]}
            >
              <ThemedText type={selected ? 'defaultSemiBold' : 'default'}>
                {t(labelKey, { price: optionPrice })}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {price && !lapsed ? (
        <ThemedText type="defaultSemiBold">
          {t(chosen === 'annual' ? 'planTrialYear' : 'planTrialMonth', {
            price,
          })}
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      {busy ? <ActivityIndicator /> : null}
      <ThemedButton
        disabled={!price || busy}
        onPress={() => attempt(() => plans.purchase(chosen), 'planErrorPurchase')}
      >
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
      <View style={styles.legal}>
        {LEGAL_LINKS.map(({ labelKey, url }) => (
          <Pressable key={labelKey} accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
            <ThemedText type="link">{t(labelKey)}</ThemedText>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 16, padding: 24, justifyContent: 'center' },
  spinner: { flex: 1 },
  options: { gap: 8 },
  legal: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 },
  option: { borderWidth: 1, borderRadius: 8, padding: 16 },
  selected: { borderWidth: 3, padding: 14 },
  error: { color: '#c0392b' },
  destructive: { backgroundColor: '#c0392b' },
});
