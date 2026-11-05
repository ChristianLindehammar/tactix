import { Stack } from 'expo-router';

import { PlanGate } from '@/components/PlanGate';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { getCurrentUserId } from '@/services/currentUser';
import { deleteOwnExercises, exportOwnExercises } from '@/services/exerciseData';
import { exerciseRepository } from '@/services/exerciseRepository';
import { plans } from '@/services/plans';

const exportExercises = async () => exportOwnExercises(exerciseRepository, await getCurrentUserId());
const deleteExercises = async () => deleteOwnExercises(exerciseRepository, await getCurrentUserId());

export default function ExercisesLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
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
  );
}
