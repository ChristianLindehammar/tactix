import { Sport } from '@/constants/sports';
import { Exercise, ExerciseDifficulty, ExercisePhase, FocusTag } from '@/types/exercise';

export interface ExerciseFilter {
  sport?: Sport;
  focus?: FocusTag[];
  difficulties?: ExerciseDifficulty[];
  phase?: ExercisePhase;
  playerCount?: number;
  search?: string;
}

const fitsPlayerCount = ({ minPlayers, maxPlayers }: Exercise, count: number) =>
  (minPlayers === null || count >= minPlayers) && (maxPlayers === null || count <= maxPlayers);

const containsText = (exercise: Exercise, text: string) =>
  [exercise.title, exercise.description, ...exercise.customTags].some(field =>
    field.toLocaleLowerCase().includes(text),
  );

export function filterExercises(exercises: Exercise[], filter: ExerciseFilter): Exercise[] {
  const { sport, focus, difficulties, phase, playerCount } = filter;
  const search = filter.search?.trim().toLocaleLowerCase();

  return exercises
    .filter(
      exercise =>
        (!sport || exercise.sport === sport) &&
        (!focus?.length || exercise.focus.some(tag => focus.includes(tag))) &&
        (!difficulties?.length || difficulties.includes(exercise.difficulty)) &&
        (!phase || exercise.phase === phase) &&
        (playerCount === undefined || fitsPlayerCount(exercise, playerCount)) &&
        (!search || containsText(exercise, search)),
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
