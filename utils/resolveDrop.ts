import { Position } from '@/types/models';

/** A rectangle in window coordinates, as measureInWindow reports it */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DropSource = 'court' | 'bench';

export type DropAction =
  | { type: 'toCourt'; position: Position }
  | { type: 'toBench' }
  | { type: 'reposition'; position: Position }
  | { type: 'none' };

interface DropInput {
  source: DropSource;
  /** Where the finger was released, in window coordinates */
  point: Position;
  court: Rect | null;
  bench: Rect | null;
  /** Where a court player's marker ended up, relative to the court (0–1, may overshoot) */
  courtPosition?: Position;
}

export const isInside = (rect: Rect | null, x: number, y: number): boolean => {
  'worklet';
  return !!rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Decides what releasing a dragged player does. The bench wins, as it is drawn above the court. */
export function resolveDrop({ source, point, court, bench, courtPosition }: DropInput): DropAction {
  const overBench = isInside(bench, point.x, point.y);

  if (source === 'court') {
    if (overBench) return { type: 'toBench' };
    if (!courtPosition) return { type: 'none' };
    return { type: 'reposition', position: { x: clamp(courtPosition.x), y: clamp(courtPosition.y) } };
  }

  if (overBench || !court || !isInside(court, point.x, point.y)) return { type: 'none' };
  return {
    type: 'toCourt',
    position: {
      x: clamp((point.x - court.x) / court.width),
      y: clamp((point.y - court.y) / court.height),
    },
  };
}
