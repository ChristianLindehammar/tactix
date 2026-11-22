import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as React from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountPanel } from '@/components/AccountPanel';
import { ExerciseDiagram } from '@/components/ExerciseDiagram';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { atLeast, LIBRARY_COUNTS, LIBRARY_SPORTS, LIBRARY_TOTAL, sampleExercise } from '@/constants/libraryHighlights';
import type { Sport } from '@/constants/sports';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { AuthSession } from '@/services/authSession';
import { createPlanService, PlanError } from '@/services/planService';
import type { SignInProvider } from '@/services/signInProviders';
import { describeExercise } from '@/utils/describeExercise';

interface PlanGateProps {
  plans: ReturnType<typeof createPlanService>;
  session: AuthSession;
  providers: SignInProvider[];
  /** Picks up last launch's session, so a coach who already paid isn't shown the sales page while it loads. */
  restoreSession: () => Promise<void>;
  /** The coach's sport leads the page, and its sample is the one shown. */
  sport: Sport | null;
  onExport: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  /** How much of the bottom a see-through tab bar covers, so the buy button stays above it. */
  bottomInset?: number;
  children: React.ReactNode;
}

// Apple requires both on the screen that sells. Apple's standard EULA only covers App Store
// purchases, so Google Play buyers get our own terms.
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
const BENEFIT_KEYS = ['planBenefitDiagrams', 'planBenefitFilter', 'planBenefitOwn', 'planBenefitSync'];

function Sample({ sport }: { sport: Sport }) {
  const { t, locale } = useTranslation();
  const card = useThemeColor({}, 'menuBackground') as string;
  const border = useThemeColor({}, 'borderColor') as string;
  const [step, setStep] = React.useState(0);
  const exercise = React.useMemo(() => sampleExercise(sport, locale), [sport, locale]);
  const [firstParagraph] = exercise.description.split('\n\n');

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <ThemedText type="subtitle">{t('planSampleHeading')}</ThemedText>
      <ThemedText type="defaultSemiBold">{exercise.title}</ThemedText>
      <ThemedText style={styles.muted}>{describeExercise(exercise, t)}</ThemedText>
      <ExerciseDiagram sport={exercise.sport} steps={exercise.frames} selected={step} onSelect={setStep} />
      <ThemedText>{firstParagraph}</ThemedText>
    </View>
  );
}

export function PlanGate({
  plans,
  session,
  providers,
  restoreSession,
  sport,
  onExport,
  onDeleteAll,
  bottomInset = 0,
  children,
}: PlanGateProps) {
  const { t } = useTranslation();
  const state = React.useSyncExternalStore(plans.subscribe, plans.getState);
  const auth = React.useSyncExternalStore(session.subscribe, session.getState);
  const background = useThemeColor({}, 'background') as string;
  const border = useThemeColor({}, 'borderColor') as string;
  const tint = useThemeColor({}, 'tint') as string;
  const [price, setPrice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [wantsSignIn, setWantsSignIn] = React.useState(false);

  const check = React.useCallback(async () => {
    setChecking(true);
    await restoreSession();
    await plans.refresh();
    setChecking(false);
    setPrice(await plans.getPrice().catch(() => null));
  }, [plans, restoreSession]);

  React.useEffect(() => {
    void check();
  }, [check]);

  const signedIn = auth.status === 'signedIn';

  const attempt = async (action: () => Promise<void>, failureKey: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      // A purchase that belongs to an account comes back by signing in to it
      if (failure instanceof PlanError) setWantsSignIn(true);
      else setError(t(failureKey));
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'active') return <>{children}</>;
  if (checking && state.status === 'unknown') return <ActivityIndicator style={styles.spinner} />;
  if (state.status === 'unknown') {
    return (
      <View style={[styles.centered, { backgroundColor: background }]}>
        <ThemedText accessibilityRole="alert">{t('planErrorCheck')}</ThemedText>
        <ThemedButton onPress={check}>{t('planTryAgain')}</ThemedButton>
      </View>
    );
  }

  // The purchase belongs to an account, so it follows the coach to every phone
  if (wantsSignIn && !signedIn) {
    return (
      <ScrollView
        style={{ backgroundColor: background }}
        contentContainerStyle={styles.signIn}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={styles.inset}>{t('planSignInTitle')}</ThemedText>
        <AccountPanel session={session} providers={providers} intro={t('planSignInBody')} />
        <ThemedButton style={styles.inset} onPress={() => setWantsSignIn(false)}>{t('planBack')}</ThemedButton>
      </ScrollView>
    );
  }

  const lapsed = state.status === 'lapsed';
  const lead = sport && LIBRARY_COUNTS[sport] ? sport : null;
  const restore = async () => {
    await plans.restore();
    if (plans.getState().status === 'none') setError(t('planNothingToRestore'));
  };
  const buy = () => {
    if (!signedIn) return setWantsSignIn(true);
    void attempt(() => plans.purchase(), 'planErrorPurchase');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">{t(lapsed ? 'planEndedTitle' : 'planTitle')}</ThemedText>
        {lapsed ? <ThemedText>{t('planEndedBody')}</ThemedText> : null}

        <View style={styles.headline}>
          <ThemedText style={[styles.count, { color: tint }]}>
            {`${atLeast(lead ? LIBRARY_COUNTS[lead] : LIBRARY_TOTAL)}+`}
          </ThemedText>
          <ThemedText type="defaultSemiBold">
            {lead ? t('planCountForSport', { sport: t(lead).toLowerCase() }) : t('planCountAllSports')}
          </ThemedText>
        </View>

        <View style={styles.benefits}>
          {BENEFIT_KEYS.map(key => (
            <View key={key} style={styles.benefit}>
              <MaterialIcons name="check-circle" size={22} color={tint} />
              <ThemedText style={styles.benefitText}>{t(key)}</ThemedText>
            </View>
          ))}
        </View>

        <Sample sport={lead ?? LIBRARY_SPORTS[0]} />

        <View style={styles.sports}>
          <ThemedText type="defaultSemiBold">{t('planAllSports')}</ThemedText>
          {LIBRARY_SPORTS.map(each => (
            <View key={each} style={[styles.sportRow, { borderColor: border }]}>
              <ThemedText>{t(each)}</ThemedText>
              <ThemedText type="defaultSemiBold">{`${atLeast(LIBRARY_COUNTS[each])}+`}</ThemedText>
            </View>
          ))}
        </View>

        {plans.canSell ? (
          <>
            <ThemedButton disabled={busy} onPress={() => attempt(restore, 'planErrorRestore')}>
              {t('planRestore')}
            </ThemedButton>
            {signedIn ? null : (
              <Pressable accessibilityRole="button" onPress={() => setWantsSignIn(true)} style={styles.centeredText}>
                <ThemedText type="link">{t('planAlreadyBought')}</ThemedText>
              </Pressable>
            )}
          </>
        ) : null}

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

      {/* Stays in view however far the coach scrolls */}
      <View style={[styles.footer, { borderColor: border, paddingBottom: 16 + bottomInset }]}>
        {plans.canSell ? (
          <>
            {error ? (
              <ThemedText accessibilityRole="alert" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
            <ThemedText style={[styles.muted, styles.centeredText]}>{t('planOneTime')}</ThemedText>
            {busy ? <ActivityIndicator /> : null}
            <ThemedButton disabled={!price || busy} onPress={buy}>
              {price ? t('planBuy', { price }) : t('planBuyNoPrice')}
            </ThemedButton>
          </>
        ) : (
          <ThemedText type="defaultSemiBold">{t('planUnavailable')}</ThemedText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 20, padding: 24, paddingBottom: 32 },
  centered: { flexGrow: 1, gap: 16, padding: 24, justifyContent: 'center' },
  signIn: { flexGrow: 1, justifyContent: 'center', gap: 16, paddingVertical: 24 },
  inset: { marginHorizontal: 16 },
  spinner: { flex: 1 },
  headline: { gap: 4 },
  count: { fontSize: 48, lineHeight: 56, fontWeight: '800' },
  benefits: { gap: 12 },
  benefit: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  benefitText: { flex: 1 },
  card: { gap: 8, padding: 16, borderRadius: 12, borderWidth: 1 },
  sports: { gap: 4 },
  sportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  muted: { opacity: 0.7 },
  centeredText: { alignSelf: 'center', textAlign: 'center' },
  legal: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 },
  footer: { gap: 8, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1 },
  error: { color: '#c0392b' },
  destructive: { backgroundColor: '#c0392b' },
});
