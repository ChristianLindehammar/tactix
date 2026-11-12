import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ArrowLegend, arrowKindsIn } from '../ArrowLegend';
import { TacticsMarker } from '@/types/tacticsMarker';

const run: TacticsMarker = { id: 'r', type: 'arrow-solid', x: 0, y: 0, endX: 1, endY: 1 };
const curvedRun: TacticsMarker = { ...run, id: 'c', bend: 0.05, waves: 1 };
const dribble: TacticsMarker = { ...run, id: 'd', bend: 0.03, waves: 3 };
const pass: TacticsMarker = { id: 'p', type: 'arrow-dashed', x: 0, y: 0, endX: 1, endY: 1 };
const player: TacticsMarker = { id: 'a', type: 'player', x: 0.5, y: 0.5 };

describe('arrowKindsIn', () => {
  it('finds each kind of arrow once, in a fixed order', () => {
    expect(arrowKindsIn([[pass, dribble], [run, pass]])).toEqual(['run', 'dribble', 'pass']);
  });

  it('counts a single curve as a run and several waves as a dribble', () => {
    expect(arrowKindsIn([[curvedRun]])).toEqual(['run']);
    expect(arrowKindsIn([[dribble]])).toEqual(['dribble']);
  });

  it('finds nothing without arrows', () => {
    expect(arrowKindsIn([[player], []])).toEqual([]);
  });
});

describe('ArrowLegend', () => {
  it('names the arrows the exercise uses', () => {
    render(<ArrowLegend frames={[{ id: 'f', markers: [player, dribble] }, { id: 'g', markers: [pass] }]} />);

    expect(screen.getByText('Dribble')).toBeTruthy();
    expect(screen.getByText('Pass or shot')).toBeTruthy();
    expect(screen.queryByText('Run')).toBeNull();
  });

  it('shows nothing when no step has an arrow', () => {
    const { toJSON } = render(<ArrowLegend frames={[{ id: 'f', markers: [player] }]} />);

    expect(toJSON()).toBeNull();
  });
});
