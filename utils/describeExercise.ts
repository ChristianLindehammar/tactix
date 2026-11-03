import { Exercise } from '@/types/exercise';

type Translate = (key: string, options?: object) => string;

const playerRange = ({ minPlayers, maxPlayers }: Exercise) => {
  if (minPlayers !== null && maxPlayers !== null) {
    return minPlayers === maxPlayers ? `${minPlayers}` : `${minPlayers}–${maxPlayers}`;
  }
  if (minPlayers !== null) return `${minPlayers}+`;
  if (maxPlayers !== null) return `1–${maxPlayers}`;
  return null;
};

/** One line summing up an exercise, such as "Advanced · Game · 15 min · 6–12 players". */
export function describeExercise(exercise: Exercise, t: Translate): string {
  const range = playerRange(exercise);
  return [
    t(`difficultyLevels.${exercise.difficulty}`),
    t(`exercisePhases.${exercise.phase}`),
    exercise.durationMinutes !== null && t('minutesShort', { count: exercise.durationMinutes }),
    range && t('playerRange', { range }),
  ]
    .filter(Boolean)
    .join(' · ');
}
