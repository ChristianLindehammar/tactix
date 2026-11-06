import { randomUUID } from 'expo-crypto';

import { Exercise } from '@/types/exercise';

interface CloneOptions {
  ownerId: string;
  now: string;
  title: string;
}

/** A new exercise you own, copied from any exercise. Ratings stay with the original. It starts
 * private, as a copy is usually adapted for your own team and would crowd the shared library. */
export function cloneExercise(source: Exercise, { ownerId, now, title }: CloneOptions): Exercise {
  return {
    ...source,
    id: randomUUID(),
    ownerId,
    clonedFromId: source.id,
    title,
    coachingPoints: [...source.coachingPoints],
    customTags: [...source.customTags],
    focus: [...source.focus],
    frames: source.frames.map(frame => ({
      ...frame,
      markers: frame.markers.map(marker => ({ ...marker })),
    })),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    visibility: 'private',
  };
}
