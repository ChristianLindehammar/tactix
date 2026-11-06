import { findFreePositionNearCentre } from '../playerUtils';

const at = (id: string, x: number, y: number) => ({ id, name: id, position: 'Center', courtPosition: { x, y } });

describe('findFreePositionNearCentre', () => {
  it('uses the centre spot when it is free', () => {
    expect(findFreePositionNearCentre([at('a', 0.1, 0.1)])).toEqual({ x: 0.5, y: 0.5 });
  });

  it('moves out from the centre past players already standing there', () => {
    const spot = findFreePositionNearCentre([at('a', 0.5, 0.5)]);

    expect(Math.hypot(spot.x - 0.5, spot.y - 0.5)).toBeGreaterThan(0.1);
    expect(Math.hypot(spot.x - 0.5, spot.y - 0.5)).toBeLessThan(0.2);
  });
});
