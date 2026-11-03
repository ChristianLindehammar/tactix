import * as React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TacticsBoard } from '../TacticsBoard';
import { SportProvider } from '@/context/SportContext';
import { createTacticsMarker, TacticsMarker } from '@/types/tacticsMarker';

// A soccer court is 549:800, so this container fits a court of about 200 x 291.45
const COURT = { width: 200, height: 400 };
const SAFE_AREA = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const layOutCourt = async () =>
  fireEvent(await screen.findByTestId('tactics-board-layout'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, ...COURT } },
  });

const tapCourt = (locationX: number, locationY: number) =>
  fireEvent(screen.getByTestId('tactics-board-court'), 'touchStart', {
    nativeEvent: { locationX, locationY },
  });

const ball = createTacticsMarker('ball', 0.5, 0.5);

const renderBoard = async (
  props: Partial<React.ComponentProps<typeof TacticsBoard>> = {},
) => {
  const onChange = jest.fn<void, [TacticsMarker[]]>();
  render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <SportProvider>
        <TacticsBoard sport="soccer" value={[ball]} onChange={onChange} {...props} />
      </SportProvider>
    </SafeAreaProvider>,
  );
  await layOutCourt();
  return { onChange };
};

describe('TacticsBoard', () => {
  it('adds the chosen marker where the court is tapped', async () => {
    const { onChange } = await renderBoard();

    fireEvent.press(screen.getByLabelText('cone'));
    tapCourt(100, 218.59);

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(2);
    expect(next[1].type).toBe('cone');
    expect(next[1].x).toBeCloseTo(0.5);
    expect(next[1].y).toBeCloseTo(0.75);
  });

  it('offers only the allowed marker types in the toolbar', async () => {
    await renderBoard({ allowedMarkerTypes: ['cone', 'ball'] });

    expect(screen.getByLabelText('cone')).toBeTruthy();
    expect(screen.getByLabelText('ball')).toBeTruthy();
    expect(screen.queryByLabelText('player')).toBeNull();
    expect(screen.queryByLabelText('arrow-solid')).toBeNull();
  });

  describe('ball rule', () => {
    const cone = createTacticsMarker('cone', 0.2, 0.2);

    it('adds a ball to a board without one by default', async () => {
      const { onChange } = await renderBoard({ value: [cone] });

      expect(onChange.mock.lastCall?.[0].map(m => m.type)).toEqual(['cone', 'ball']);
    });

    it('leaves a ball-free board alone when a ball is not required', async () => {
      const { onChange } = await renderBoard({ value: [cone], requireBall: false });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('clears down to an empty board when a ball is not required', async () => {
      const alert = jest.spyOn(Alert, 'alert');
      const { onChange } = await renderBoard({ value: [cone], requireBall: false });

      fireEvent.press(screen.getByLabelText('Clear All'));
      alert.mock.lastCall?.[2]?.find(button => button.text === 'OK')?.onPress?.();

      expect(onChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe('read-only mode', () => {
    it('hides the toolbar', async () => {
      await renderBoard({ readOnly: true });

      expect(screen.queryByLabelText('player')).toBeNull();
    });

    it('never changes the markers, even without a ball', async () => {
      const cone = createTacticsMarker('cone', 0.2, 0.2);
      const { onChange } = await renderBoard({ readOnly: true, value: [cone] });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('blocks touches on the markers', async () => {
      await renderBoard({ readOnly: true });

      expect(screen.getByTestId('tactics-board-court').props.pointerEvents).toBe('none');
    });
  });
});
