import { randomUUID } from 'expo-crypto';

import { Sport } from '@/constants/sports';
import {
  Exercise,
  EXERCISE_SCHEMA_VERSION,
  ExerciseDifficulty,
  ExercisePhase,
  ExerciseVisibility,
  FocusTag,
} from '@/types/exercise';
import { TacticsMarker } from '@/types/tacticsMarker';

/** One step of the diagram. A blank note is left out when saved. */
export interface DraftStep {
  id: string;
  note: string;
  markers: TacticsMarker[];
}

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
  visibility: ExerciseVisibility;
  steps: DraftStep[];
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
  visibility: 'public',
  steps: [{ id: randomUUID(), note: '', markers: [] }],
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
  visibility: exercise.visibility,
  steps: exercise.frames.map(frame => ({
    id: frame.id,
    note: frame.note ?? '',
    markers: frame.markers,
  })),
});

/** A new step after `index`: the same markers in the same places, minus the arrows that moved them. */
export function addStep(steps: DraftStep[], index: number): DraftStep[] {
  const added: DraftStep = {
    id: randomUUID(),
    note: '',
    markers: steps[index].markers.filter(
      marker => marker.type !== 'arrow-solid' && marker.type !== 'arrow-dashed',
    ),
  };
  return [...steps.slice(0, index + 1), added, ...steps.slice(index + 1)];
}

/** An exercise always keeps at least one step. */
export const removeStep = (steps: DraftStep[], index: number): DraftStep[] =>
  steps.length > 1 ? steps.filter((_, i) => i !== index) : steps;

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
      frames: draft.steps.map(({ id, note, markers }) =>
        note.trim() ? { id, note, markers } : { id, markers },
      ),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      visibility: draft.visibility,
    },
  };
}
