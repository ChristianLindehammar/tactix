import { createTacticsMarker, createArrowMarker, TacticsMarkerType, getMarkerIcon } from '../tacticsMarker';

describe('createTacticsMarker', () => {
  it('creates a cone marker with the given position', () => {
    const marker = createTacticsMarker('cone' as TacticsMarkerType, 0.5, 0.7);

    expect(marker.type).toBe('cone');
    expect(marker.x).toBe(0.5);
    expect(marker.y).toBe(0.7);
    expect(marker.id).toBeDefined();
    expect(typeof marker.id).toBe('string');
    expect(marker.id.length).toBeGreaterThan(0);
  });

  it('creates unique IDs for each marker', () => {
    const m1 = createTacticsMarker('player', 0.1, 0.2);
    const m2 = createTacticsMarker('opponent', 0.3, 0.4);
    const m3 = createTacticsMarker('ball', 0.5, 0.5);
    const m4 = createTacticsMarker('cone', 0.6, 0.7);

    const ids = [m1.id, m2.id, m3.id, m4.id];
    expect(new Set(ids).size).toBe(4);
  });
});

describe('createArrowMarker', () => {
  it('creates a solid arrow marker with start and end positions', () => {
    const arrow = createArrowMarker('arrow-solid', 0.2, 0.3, 0.6, 0.7);

    expect(arrow.type).toBe('arrow-solid');
    expect(arrow.x).toBe(0.2);
    expect(arrow.y).toBe(0.3);
    expect(arrow.endX).toBe(0.6);
    expect(arrow.endY).toBe(0.7);
    expect(arrow.id).toBeDefined();
  });

  it('creates a dashed arrow marker', () => {
    const arrow = createArrowMarker('arrow-dashed', 0.1, 0.1, 0.9, 0.9);

    expect(arrow.type).toBe('arrow-dashed');
    expect(arrow.endX).toBe(0.9);
    expect(arrow.endY).toBe(0.9);
  });
});

describe('getMarkerIcon', () => {
  it('returns change-history for cone type', () => {
    expect(getMarkerIcon('cone', 'football')).toBe('change-history');
  });

  it('returns person for player and opponent types', () => {
    expect(getMarkerIcon('player', 'football')).toBe('person');
    expect(getMarkerIcon('opponent', 'football')).toBe('person');
  });

  it('returns sport-specific icon for ball type', () => {
    expect(getMarkerIcon('ball', 'football')).toBe('sports-soccer');
    expect(getMarkerIcon('ball', 'basketball')).toBe('sports-basketball');
    expect(getMarkerIcon('ball', 'floorball')).toBe('sports-hockey');
  });

  it('returns arrow-forward for arrow types', () => {
    expect(getMarkerIcon('arrow-solid', 'football')).toBe('arrow-forward');
    expect(getMarkerIcon('arrow-dashed', 'football')).toBe('arrow-forward');
  });
});
