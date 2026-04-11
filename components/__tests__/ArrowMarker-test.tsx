import { createArrowMarker, getMarkerIcon } from '@/types/tacticsMarker';
import { snapEndpoint } from '@/utils/snapEndpoint';

describe('ArrowMarker data model', () => {
  it('creates a solid arrow with start and end positions', () => {
    const arrow = createArrowMarker('arrow-solid', 0.2, 0.3, 0.5, 0.6);

    expect(arrow.type).toBe('arrow-solid');
    expect(arrow.x).toBe(0.2);
    expect(arrow.y).toBe(0.3);
    expect(arrow.endX).toBe(0.5);
    expect(arrow.endY).toBe(0.6);
  });

  it('creates a dashed arrow', () => {
    const arrow = createArrowMarker('arrow-dashed', 0.1, 0.1, 0.9, 0.9);

    expect(arrow.type).toBe('arrow-dashed');
  });

  it('returns arrow-forward icon for arrow types', () => {
    expect(getMarkerIcon('arrow-solid', 'football')).toBe('arrow-forward');
    expect(getMarkerIcon('arrow-dashed', 'football')).toBe('arrow-forward');
  });
});

describe('snapEndpoint', () => {
  it('snaps to horizontal when angle is close to 0°', () => {
    // Moving point is almost directly to the right (tiny y offset)
    const result = snapEndpoint(0, 0, 1, 0.05);
    expect(result.y).toBeCloseTo(0, 1);
    expect(result.x).toBeGreaterThan(0);
  });

  it('snaps to vertical when angle is close to 90°', () => {
    // Moving point is almost directly downward (tiny x offset)
    const result = snapEndpoint(0, 0, 0.05, 1);
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.y).toBeGreaterThan(0);
  });

  it('snaps to 45° diagonal', () => {
    // Moving point is almost at 45° (slightly off)
    const result = snapEndpoint(0, 0, 1, 1.08);
    expect(result.x).toBeCloseTo(result.y, 1);
  });

  it('does not snap when angle is far from any snap angle', () => {
    // ~30° — not close to 0° or 45°
    const result = snapEndpoint(0, 0, 1, 0.577);
    expect(result.x).toBeCloseTo(1, 5);
    expect(result.y).toBeCloseTo(0.577, 5);
  });

  it('preserves arrow length when snapping', () => {
    const result = snapEndpoint(0, 0, 1, 0.05);
    const originalLength = Math.sqrt(1 + 0.05 * 0.05);
    const snappedLength = Math.sqrt(result.x * result.x + result.y * result.y);
    expect(snappedLength).toBeCloseTo(originalLength, 3);
  });
});
