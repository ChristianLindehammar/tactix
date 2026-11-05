import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { ExerciseRepository } from '@/services/exerciseRepository';

const ownExercises = async (repository: ExerciseRepository, userId: string) =>
  (await repository.list()).filter(exercise => exercise.ownerId === userId);

/** Removes this coach's exercises, and not ones another coach left read-only on this device. */
export async function deleteOwnExercises(repository: ExerciseRepository, userId: string) {
  for (const exercise of await ownExercises(repository, userId)) await repository.remove(exercise.id);
}

/** Hands this coach's exercises to the share sheet as a file. */
export async function exportOwnExercises(repository: ExerciseRepository, userId: string) {
  const uri = `${FileSystem.cacheDirectory}coachmate-exercises.json`;
  const exercises = await ownExercises(repository, userId);
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(exercises, null, 2));
  try {
    await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json' });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
