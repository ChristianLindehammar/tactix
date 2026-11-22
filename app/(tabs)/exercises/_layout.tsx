import { Stack } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

import { AccountGate } from '@/components/AccountGate';
import { PlanGate } from '@/components/PlanGate';
import { Colors } from '@/constants/Colors';
import { useSport } from '@/context/SportContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { authSession } from '@/services/account';
import { getCurrentUserId } from '@/services/currentUser';
import { deleteOwnExercises, exportOwnExercises } from '@/services/exerciseData';
import { exerciseRepository, restoreAccount } from '@/services/exerciseRepository';
import { plans } from '@/services/plans';
import { signInProvidersFor } from '@/services/signInProviders';

const providers = signInProvidersFor(Platform.OS);

const exportExercises = async () => exportOwnExercises(exerciseRepository, await getCurrentUserId());
const deleteExercises = async () => deleteOwnExercises(exerciseRepository, await getCurrentUserId());

export default function ExercisesLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { selectedSport } = useSport();
  const tabBarHeight = useBottomTabBarHeight();

  // What's included and the price come before sign-in, so a coach sees what they'd get first
  return (
    <PlanGate
      plans={plans}
      session={authSession}
      providers={providers}
      restoreSession={restoreAccount}
      sport={selectedSport}
      onExport={exportExercises}
      onDeleteAll={deleteExercises}
      bottomInset={Platform.OS === 'ios' ? tabBarHeight : 0}
    >
      <AccountGate session={authSession} providers={providers} restore={restoreAccount}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.tint,
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen name="index" options={{ title: t('exercises'), headerShown: false }} />
          <Stack.Screen name="[id]" options={{ title: '' }} />
          <Stack.Screen name="edit" options={{ title: t('editExercise') }} />
        </Stack>
      </AccountGate>
    </PlanGate>
  );
}
