import { Sport } from '@/constants/sports';
import { Exercise, ExerciseDifficulty, ExercisePhase, FocusTag, RatingStars } from '@/types/exercise';

export const EXERCISE_SORTS = ['updated', 'rating', 'title', 'difficulty'] as const;
export type ExerciseSort = (typeof EXERCISE_SORTS)[number];

export interface ExerciseFilter {
  sport?: Sport;
  focus?: FocusTag[];
  difficulties?: ExerciseDifficulty[];
  phase?: ExercisePhase;
  playerCount?: number;
  search?: string;
  minRating?: RatingStars;
  ratings?: Record<string, RatingStars>;
  sort?: ExerciseSort;
  /** Sets the alphabet used to sort titles. */
  locale?: string;
}

const fitsPlayerCount = ({ minPlayers, maxPlayers }: Exercise, count: number) =>
  (minPlayers === null || count >= minPlayers) && (maxPlayers === null || count <= maxPlayers);

const containsText = (exercise: Exercise, text: string) =>
  [exercise.title, exercise.description, ...exercise.customTags].some(field =>
    field.toLocaleLowerCase().includes(text),
  );

export function filterExercises(exercises: Exercise[], filter: ExerciseFilter): Exercise[] {
  const { sport, focus, difficulties, phase, playerCount, minRating, ratings } = filter;
  const search = filter.search?.trim().toLocaleLowerCase();

  return exercises
    .filter(
      exercise =>
        (!sport || exercise.sport === sport) &&
        (!focus?.length || exercise.focus.some(tag => focus.includes(tag))) &&
        (!difficulties?.length || difficulties.includes(exercise.difficulty)) &&
        (!phase || exercise.phase === phase) &&
        (playerCount === undefined || fitsPlayerCount(exercise, playerCount)) &&
        (!search || containsText(exercise, search)) &&
        (!minRating || (ratings?.[exercise.id] ?? 0) >= minRating),
    )
    .sort((a, b) => {
      const latestFirst = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      if (filter.sort === 'rating') {
        return (ratings?.[b.id] ?? 0) - (ratings?.[a.id] ?? 0) || latestFirst;
      }
      if (filter.sort === 'title') {
        return a.title.localeCompare(b.title, filter.locale) || latestFirst;
      }
      if (filter.sort === 'difficulty') {
        return a.difficulty - b.difficulty || latestFirst;
      }
      return latestFirst;
    });
}
