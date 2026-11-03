import { randomUUID } from 'expo-crypto';

import { Sport } from '@/constants/sports';
import {
  Exercise,
  EXERCISE_SCHEMA_VERSION,
  ExerciseDifficulty,
  ExercisePhase,
  FocusTag,
} from '@/types/exercise';
import { TacticsMarker } from '@/types/tacticsMarker';

/** What the editor holds: free-text fields stay as typed until saved. */
export interface ExerciseDraft {
  title: string;
  description: string;
  coachingPoints: string;
  customTags: string;
  durationMinutes: string;
  minPlayers: string;
  maxPlayers: string;
  difficulty: ExerciseDifficulty;
  focus: FocusTag[];
  phase: ExercisePhase;
  markers: TacticsMarker[];
}

export type DraftError = 'required' | 'invalidNumber' | 'belowMinimum';
export type DraftErrors = Partial<
  Record<'title' | 'durationMinutes' | 'minPlayers' | 'maxPlayers', DraftError>
>;

export type DraftResult =
  | { ok: true; exercise: Exercise }
  | { ok: false; errors: DraftErrors };

export interface DraftContext {
  sport: Sport;
  locale: string;
  now: string;
  ownerId: string;
}

export const createDraft = (): ExerciseDraft => ({
  title: '',
  description: '',
  coachingPoints: '',
  customTags: '',
  durationMinutes: '',
  minPlayers: '',
  maxPlayers: '',
  difficulty: 3,
  focus: [],
  phase: 'main',
  markers: [],
});

const numberText = (value: number | null) => (value === null ? '' : String(value));

export const draftFromExercise = (exercise: Exercise): ExerciseDraft => ({
  title: exercise.title,
  description: exercise.description,
  coachingPoints: exercise.coachingPoints.join('\n'),
  customTags: exercise.customTags.join(', '),
  durationMinutes: numberText(exercise.durationMinutes),
  minPlayers: numberText(exercise.minPlayers),
  maxPlayers: numberText(exercise.maxPlayers),
  difficulty: exercise.difficulty,
  focus: exercise.focus,
  phase: exercise.phase,
  markers: exercise.frames[0].markers,
});

export const isDraftChanged = (baseline: ExerciseDraft, draft: ExerciseDraft) =>
  JSON.stringify(baseline) !== JSON.stringify(draft);

const splitList = (text: string, separator: string) =>
  text
    .split(separator)
    .map(item => item.trim())
    .filter(Boolean);

/** Blank means unset; undefined means the text is not a positive whole number. */
const parseCount = (text: string): number | null | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return /^[1-9]\d*$/.test(trimmed) ? Number(trimmed) : undefined;
};

export function draftToExercise(
  draft: ExerciseDraft,
  { sport, locale, now, ownerId }: DraftContext,
  existing?: Exercise,
): DraftResult {
  const title = draft.title.trim();
  const durationMinutes = parseCount(draft.durationMinutes);
  const minPlayers = parseCount(draft.minPlayers);
  const maxPlayers = parseCount(draft.maxPlayers);

  const errors: DraftErrors = {};
  if (!title) errors.title = 'required';
  if (durationMinutes === undefined) errors.durationMinutes = 'invalidNumber';
  if (minPlayers === undefined) errors.minPlayers = 'invalidNumber';
  if (maxPlayers === undefined) errors.maxPlayers = 'invalidNumber';
  else if (maxPlayers !== null && minPlayers && minPlayers > maxPlayers) {
    errors.maxPlayers = 'belowMinimum';
  }

  if (
    Object.keys(errors).length > 0 ||
    durationMinutes === undefined ||
    minPlayers === undefined ||
    maxPlayers === undefined
  ) {
    return { ok: false, errors };
  }

  const [firstFrame, ...otherFrames] = existing?.frames ?? [{ id: randomUUID(), markers: [] }];

  return {
    ok: true,
    exercise: {
      schemaVersion: EXERCISE_SCHEMA_VERSION,
      id: existing?.id ?? randomUUID(),
      ownerId: existing ? existing.ownerId : ownerId,
      clonedFromId: existing?.clonedFromId ?? null,
      sport: existing?.sport ?? sport,
      locale: existing?.locale ?? locale,
      title,
      description: draft.description,
      coachingPoints: splitList(draft.coachingPoints, '\n'),
      customTags: [...new Set(splitList(draft.customTags, ','))],
      difficulty: draft.difficulty,
      focus: draft.focus,
      phase: draft.phase,
      durationMinutes,
      minPlayers,
      maxPlayers,
      frames: [{ ...firstFrame, markers: draft.markers }, ...otherFrames],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    },
  };
}
