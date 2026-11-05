export interface Point {
  x: number;
  y: number;
}

export interface ArrowCurve {
  /** Sideways reach of each hump, as a fraction of the court width. Signed for the side. */
  bend: number;
  /** Number of humps between the arrow's ends, alternating sides. */
  waves: number;
}

/** A point along the arrow in pixels, where t runs from 0 at the start to 1 at the end. */
export function pointOnCurve(
  start: Point,
  end: Point,
  curve: ArrowCurve | undefined,
  courtWidth: number,
  t: number,
): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const offset =
    curve && length > 0 ? curve.bend * courtWidth * Math.sin(Math.PI * curve.waves * t) : 0;
  return {
    x: start.x + dx * t - (length > 0 ? (dy / length) * offset : 0),
    y: start.y + dy * t + (length > 0 ? (dx / length) * offset : 0),
  };
}

export const MAX_WAVES = 8;
// Narrower humps are hard to read and to drag between
const MIN_HUMP_LENGTH = 28;
export const MAX_BEND = 0.5;
const BEND_STEPS_PER_COURT_WIDTH = 50;
const STRAIGHT_BEND = 0.03;

// Peaks crowd toward the start as waves are added, and closer snap points can't be aimed for
const MIN_SNAP_SPACING = 5;

function roomForWaves(length: number): number {
  let waves = 1;
  while (
    waves < MAX_WAVES &&
    length / (waves + 1) >= MIN_HUMP_LENGTH &&
    length / (2 * waves * (waves + 1)) >= MIN_SNAP_SPACING
  ) {
    waves += 1;
  }
  return waves;
}

/** Where to draw the curve's drag handle: the peak of the first hump. */
export function curveHandlePosition(
  start: Point,
  end: Point,
  curve: ArrowCurve | undefined,
  courtWidth: number,
): Point {
  return pointOnCurve(start, end, curve, courtWidth, 1 / (2 * (curve?.waves ?? 1)));
}

/** The snapped curve for a handle dragged to this point, or undefined for a straight arrow. */
export function curveFromHandle(
  start: Point,
  end: Point,
  handle: Point,
  courtWidth: number,
): ArrowCurve | undefined {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return undefined;

  const offsetX = handle.x - start.x;
  const offsetY = handle.y - start.y;
  const sideways = (dx * offsetY - dy * offsetX) / length;
  const rawBend = sideways / courtWidth;
  if (Math.abs(rawBend) < STRAIGHT_BEND) return undefined;

  const clamped = Math.max(-MAX_BEND, Math.min(MAX_BEND, rawBend));
  const bend = Math.round(clamped * BEND_STEPS_PER_COURT_WIDTH) / BEND_STEPS_PER_COURT_WIDTH;

  // The first peak of n waves is 1/(2n) along the arrow, so this picks the nearest n
  const along = (dx * offsetX + dy * offsetY) / (length * length);
  const maxWaves = roomForWaves(length);
  const waves = along <= 0 ? maxWaves : Math.min(maxWaves, Math.max(1, Math.round(1 / (2 * along))));

  return { bend, waves };
}

/** The handle's snap position for each wave count the arrow has room for. */
export function waveSnapPoints(
  start: Point,
  end: Point,
  bend: number,
  courtWidth: number,
): Point[] {
  const count = roomForWaves(Math.hypot(end.x - start.x, end.y - start.y));
  return Array.from({ length: count }, (_, index) =>
    curveHandlePosition(start, end, { bend, waves: index + 1 }, courtWidth),
  );
}

const POINTS_PER_WAVE = 16;
const roundPixel = (value: number) => Math.round(value * 100) / 100;

/** SVG path data for the arrow's line, in pixels. */
export function curvePath(
  start: Point,
  end: Point,
  curve: ArrowCurve | undefined,
  courtWidth: number,
): string {
  const segments = curve ? curve.waves * POINTS_PER_WAVE : 1;
  return Array.from({ length: segments + 1 }, (_, index) => {
    const point = pointOnCurve(start, end, curve, courtWidth, index / segments);
    return `${index === 0 ? 'M' : 'L'}${roundPixel(point.x)},${roundPixel(point.y)}`;
  }).join(' ');
}

/** The direction the line is travelling as it reaches the arrow's end, in radians. */
export function arrivalAngle(
  start: Point,
  end: Point,
  curve: ArrowCurve | undefined,
  courtWidth: number,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!curve || length === 0) return Math.atan2(dy, dx);

  // The derivative of the sideways offset at the end of the arrow
  const slope = curve.bend * courtWidth * Math.PI * curve.waves * Math.cos(Math.PI * curve.waves);
  return Math.atan2(dy + (dx / length) * slope, dx - (dy / length) * slope);
}
