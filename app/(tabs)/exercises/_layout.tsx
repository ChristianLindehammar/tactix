import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { AccountGate } from '@/components/AccountGate';
import { PlanGate } from '@/components/PlanGate';
import { Colors } from '@/constants/Colors';
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

  return (
    <AccountGate session={authSession} providers={providers} restore={restoreAccount}>
      <PlanGate plans={plans} onExport={exportExercises} onDeleteAll={deleteExercises}>
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
      </PlanGate>
    </AccountGate>
  );
}
