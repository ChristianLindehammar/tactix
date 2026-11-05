import {
  arrivalAngle,
  curveFromHandle,
  curveHandlePosition,
  curvePath,
  pointOnCurve,
  waveSnapPoints,
} from '@/utils/arrowCurve';

const COURT_WIDTH = 400;
const START = { x: 0, y: 0 };
const END = { x: 200, y: 0 };

describe('pointOnCurve', () => {
  it('peaks halfway along a single curve, offset by the bend', () => {
    const point = pointOnCurve(START, END, { bend: 0.1, waves: 1 }, COURT_WIDTH, 0.5);

    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(40);
  });

  it('swings to alternating sides with evenly spaced peaks', () => {
    const curve = { bend: 0.1, waves: 2 };

    expect(pointOnCurve(START, END, curve, COURT_WIDTH, 0.25).y).toBeCloseTo(40);
    expect(pointOnCurve(START, END, curve, COURT_WIDTH, 0.5).y).toBeCloseTo(0);
    expect(pointOnCurve(START, END, curve, COURT_WIDTH, 0.75).y).toBeCloseTo(-40);
  });

  it('still starts and ends on the arrow ends', () => {
    const curve = { bend: 0.1, waves: 3 };

    expect(pointOnCurve(START, END, curve, COURT_WIDTH, 0).y).toBeCloseTo(0);
    const last = pointOnCurve(START, END, curve, COURT_WIDTH, 1);
    expect(last.x).toBeCloseTo(200);
    expect(last.y).toBeCloseTo(0);
  });

  it('bends sideways relative to the direction of a vertical arrow', () => {
    const point = pointOnCurve(START, { x: 0, y: 100 }, { bend: 0.1, waves: 1 }, COURT_WIDTH, 0.5);

    expect(point.x).toBeCloseTo(-40);
    expect(point.y).toBeCloseTo(50);
  });

  it('follows the straight line when there is no curve', () => {
    const point = pointOnCurve(START, END, undefined, COURT_WIDTH, 0.5);

    expect(point.x).toBeCloseTo(100);
    expect(point.y).toBeCloseTo(0);
  });

  it('stays on the start point for an arrow with no length', () => {
    const point = pointOnCurve(START, START, { bend: 0.1, waves: 1 }, COURT_WIDTH, 0.5);

    expect(point).toEqual({ x: 0, y: 0 });
  });
});

describe('curveHandlePosition', () => {
  it('sits in the middle of a straight arrow', () => {
    expect(curveHandlePosition(START, END, undefined, COURT_WIDTH)).toEqual({ x: 100, y: 0 });
  });

  it('sits on the peak of the first hump', () => {
    const position = curveHandlePosition(START, END, { bend: 0.1, waves: 4 }, COURT_WIDTH);

    expect(position.x).toBeCloseTo(25);
    expect(position.y).toBeCloseTo(40);
  });
});

describe('curveFromHandle', () => {
  const dragTo = (x: number, y: number, end = END) =>
    curveFromHandle(START, end, { x, y }, COURT_WIDTH);

  it('makes a single curve when dragged sideways from the middle', () => {
    expect(dragTo(100, 40)).toEqual({ bend: 0.1, waves: 1 });
  });

  it('bends to the other side when dragged across the line', () => {
    expect(dragTo(100, -40)).toEqual({ bend: -0.1, waves: 1 });
  });

  it('adds waves as the handle moves toward the start', () => {
    expect(dragTo(50, 40)?.waves).toBe(2);
    expect(dragTo(33, 40)?.waves).toBe(3);
    expect(dragTo(25, 40)?.waves).toBe(4);
  });

  it('changes wave count halfway between two snap positions', () => {
    // One curve peaks at x = 100 and two at x = 50; 1/(2 * 1.5) of the length separates them
    expect(dragTo(70, 40)?.waves).toBe(1);
    expect(dragTo(64, 40)?.waves).toBe(2);
  });

  it('stays a single curve when dragged past the middle', () => {
    expect(dragTo(180, 40)?.waves).toBe(1);
  });

  it('fits no more waves than the arrow has room for', () => {
    // A 60 px arrow has room for two humps of at least 28 px
    expect(dragTo(1, 40, { x: 60, y: 0 })?.waves).toBe(2);
  });

  it('stops adding waves when their snap positions get too close to aim for', () => {
    // On 200 px the fifth wave's peak is 5 px from the fourth's, the sixth's only 3.3 px from the fifth's
    expect(dragTo(-50, 40)?.waves).toBe(5);
  });

  it('never exceeds the wave limit on a very long arrow', () => {
    expect(dragTo(1, 40, { x: 1000, y: 0 })?.waves).toBe(8);
  });

  it('snaps the bend to even steps so curves match each other', () => {
    expect(dragTo(100, 41)?.bend).toBe(0.1);
    expect(dragTo(100, 45)?.bend).toBe(0.12);
  });

  it('snaps back to straight close to the line', () => {
    expect(dragTo(100, 11)).toBeUndefined();
    expect(dragTo(100, -11)).toBeUndefined();
    expect(dragTo(100, 13)).toEqual({ bend: 0.04, waves: 1 });
  });

  it('limits how far an arrow can bend', () => {
    expect(dragTo(100, 900)?.bend).toBe(0.5);
  });

  it('leaves an arrow with no length straight', () => {
    expect(curveFromHandle(START, START, { x: 50, y: 50 }, COURT_WIDTH)).toBeUndefined();
  });
});

describe('waveSnapPoints', () => {
  it('marks where the handle snaps for each wave count, at the current bend', () => {
    const points = waveSnapPoints(START, { x: 112, y: 0 }, 0.1, COURT_WIDTH);

    expect(points).toHaveLength(3);
    expect(points[0].x).toBeCloseTo(56);
    expect(points[1].x).toBeCloseTo(28);
    expect(points[2].x).toBeCloseTo(18.667);
    points.forEach(point => expect(point.y).toBeCloseTo(40));
  });
});

describe('curvePath', () => {
  it('draws a straight arrow as one line', () => {
    expect(curvePath(START, END, undefined, COURT_WIDTH)).toBe('M0,0 L200,0');
  });

  it('draws a curve from end to end, with more points for more waves', () => {
    const points = (waves: number) =>
      curvePath(START, END, { bend: 0.1, waves }, COURT_WIDTH).split(' ');

    expect(points(1)[0]).toBe('M0,0');
    expect(points(1).at(-1)).toBe('L200,0');
    expect(points(3).length).toBeGreaterThan(points(1).length * 2);
  });
});

describe('arrivalAngle', () => {
  it('follows the line on a straight arrow', () => {
    expect(arrivalAngle(START, END, undefined, COURT_WIDTH)).toBeCloseTo(0);
    expect(arrivalAngle(START, { x: 0, y: 100 }, undefined, COURT_WIDTH)).toBeCloseTo(Math.PI / 2);
  });

  it('follows the curve where it meets the end', () => {
    // Slope at the end of one hump: 40 * pi / 200, coming back toward the line
    expect(arrivalAngle(START, END, { bend: 0.1, waves: 1 }, COURT_WIDTH)).toBeCloseTo(-0.561, 2);
  });

  it('alternates with the number of waves', () => {
    expect(arrivalAngle(START, END, { bend: 0.1, waves: 2 }, COURT_WIDTH)).toBeCloseTo(0.8986, 2);
  });
});
