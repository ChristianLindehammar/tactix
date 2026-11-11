import { isInside, resolveDrop } from '../resolveDrop';

const court = { x: 20, y: 100, width: 300, height: 500 };
const bench = { x: 0, y: 650, width: 340, height: 130 };

describe('resolveDrop', () => {
  describe('from the bench', () => {
    it('puts the player on the court where the finger is released', () => {
      expect(resolveDrop({ source: 'bench', point: { x: 170, y: 350 }, court, bench })).toEqual({
        type: 'toCourt',
        position: { x: 0.5, y: 0.5 },
      });
    });

    it('leaves the player on the bench when released on the bench', () => {
      expect(resolveDrop({ source: 'bench', point: { x: 170, y: 700 }, court, bench })).toEqual({ type: 'none' });
    });

    it('leaves the player on the bench when released outside the court', () => {
      expect(resolveDrop({ source: 'bench', point: { x: 5, y: 350 }, court, bench })).toEqual({ type: 'none' });
    });

    it('does nothing before the court has been measured', () => {
      expect(resolveDrop({ source: 'bench', point: { x: 170, y: 350 }, court: null, bench })).toEqual({ type: 'none' });
    });
  });

  describe('from the court', () => {
    it('benches the player when released over the bench', () => {
      expect(
        resolveDrop({ source: 'court', point: { x: 170, y: 700 }, court, bench, courtPosition: { x: 0.5, y: 1.2 } }),
      ).toEqual({ type: 'toBench' });
    });

    it('moves the player to where it was dragged on the court', () => {
      expect(
        resolveDrop({ source: 'court', point: { x: 170, y: 350 }, court, bench, courtPosition: { x: 0.25, y: 0.75 } }),
      ).toEqual({ type: 'reposition', position: { x: 0.25, y: 0.75 } });
    });

    it('keeps the player on the court edge when dragged off the court but not onto the bench', () => {
      expect(
        resolveDrop({ source: 'court', point: { x: 170, y: 40 }, court, bench, courtPosition: { x: 1.3, y: -0.2 } }),
      ).toEqual({ type: 'reposition', position: { x: 1, y: 0 } });
    });
  });
});

describe('isInside', () => {
  it('includes the edges of the rectangle', () => {
    expect(isInside(court, 20, 100)).toBe(true);
    expect(isInside(court, 320, 600)).toBe(true);
  });

  it('is false outside the rectangle or without one', () => {
    expect(isInside(court, 19, 100)).toBe(false);
    expect(isInside(null, 50, 200)).toBe(false);
  });
});
