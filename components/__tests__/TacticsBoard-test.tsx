import * as React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DraggableMarker } from '../DraggableMarker';
import { TacticsBoard } from '../TacticsBoard';
import { SportProvider } from '@/context/SportContext';
import {
  createArrowMarker,
  createTacticsMarker,
  TACTICS_MARKER_TYPES,
  TacticsMarker,
} from '@/types/tacticsMarker';

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

    fireEvent.press(screen.getByLabelText('Cone'));
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

    expect(screen.getByLabelText('Cone')).toBeTruthy();
    expect(screen.getByLabelText('Ball')).toBeTruthy();
    expect(screen.queryByLabelText('Player')).toBeNull();
    expect(screen.queryByLabelText('Run')).toBeNull();
  });

  describe('placing a marker next to another', () => {
    const renderMarker = (placing: boolean) =>
      render(
        <DraggableMarker
          id={ball.id}
          x={0.5}
          y={0.5}
          containerSize={COURT}
          onDragEnd={jest.fn()}
          placing={placing}
        >
          <></>
        </DraggableMarker>,
      );
    const touchArea = () => getByGestureTestId(`marker-drag-${ball.id}`).config.hitSlop;

    it('gives a marker a generous touch area for dragging', () => {
      renderMarker(false);

      expect(touchArea()).toBe(20);
    });

    it('leaves the space around a marker free while placing', () => {
      renderMarker(true);

      expect(touchArea()).toBe(0);
    });

    it('tells markers when a tool is selected, and when it is put away', async () => {
      await renderBoard();
      const placing = () => screen.UNSAFE_getByType(DraggableMarker).props.placing;
      expect(placing()).toBe(false);

      fireEvent.press(screen.getByLabelText('Cone'));
      expect(placing()).toBe(true);

      fireEvent.press(screen.getByLabelText('Cone'));
      expect(placing()).toBe(false);
    });
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

  describe('screen readers', () => {
    it('announces each tool as a button with its translated name', async () => {
      await renderBoard({ allowedMarkerTypes: ['cone', 'arrow-solid'] });

      expect(screen.getByRole('button', { name: 'Cone' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy();
    });

    it('announces which tool is selected', async () => {
      await renderBoard();
      expect(screen.queryByRole('button', { name: 'Cone', selected: true })).toBeNull();

      fireEvent.press(screen.getByRole('button', { name: 'Cone' }));

      expect(screen.getByRole('button', { name: 'Cone', selected: true })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Ball', selected: true })).toBeNull();
    });

    it('announces clear all as a button', async () => {
      await renderBoard({ value: [ball, createTacticsMarker('cone', 0.2, 0.2)] });

      expect(screen.getByRole('button', { name: 'Clear All' })).toBeTruthy();
    });
  });

  describe('marker choices', () => {
    it('keeps the tactics toolbar to its original six markers by default', async () => {
      await renderBoard();

      ['Player', 'Opponent', 'Ball', 'Cone', 'Run', 'Pass'].forEach(name =>
        expect(screen.getByLabelText(name)).toBeTruthy(),
      );
      expect(screen.queryByLabelText('Goal')).toBeNull();
    });

    it.each([
      ['goal', 'Goal'],
      ['coach', 'Coach'],
    ] as const)('can place a %s when allowed', async (type, name) => {
      const { onChange } = await renderBoard({ allowedMarkerTypes: [type] });

      fireEvent.press(screen.getByLabelText(name));
      tapCourt(100, 100);

      expect(onChange.mock.lastCall?.[0].at(-1)?.type).toBe(type);
    });

    it('offers a coach marker with every marker allowed', async () => {
      await renderBoard({ allowedMarkerTypes: [...TACTICS_MARKER_TYPES] });

      expect(screen.getByLabelText('Coach')).toBeTruthy();
    });

    it('shows a coach marker with its label', async () => {
      await renderBoard({ value: [{ ...createTacticsMarker('coach', 0.5, 0.5), label: 'L' }], readOnly: true });

      expect(screen.getByText('L')).toBeTruthy();
    });
  });

  describe('curving arrows', () => {
    const arrow = createArrowMarker('arrow-solid', 0.2, 0.2, 0.8, 0.8);
    const handle = `arrow-curve-handle-${arrow.id}`;

    it('offers a curve handle on each arrow when turned on', async () => {
      await renderBoard({ value: [arrow], enableCurves: true });

      expect(screen.getByTestId(handle)).toBeTruthy();
    });

    it('stays off unless asked for', async () => {
      await renderBoard({ value: [arrow] });

      expect(screen.queryByTestId(handle)).toBeNull();
    });

    it('has no handle on a read-only diagram', async () => {
      await renderBoard({ value: [arrow], enableCurves: true, readOnly: true });

      expect(screen.queryByTestId(handle)).toBeNull();
    });

    it('moves the handle out of the way while placing a marker', async () => {
      await renderBoard({
        value: [arrow],
        enableCurves: true,
        allowedMarkerTypes: ['cone'],
      });

      fireEvent.press(screen.getByLabelText('Cone'));

      expect(screen.queryByTestId(handle)).toBeNull();
    });

    it('has no handle on an arrow too short to grab its ends around it', async () => {
      const short = createArrowMarker('arrow-solid', 0.5, 0.5, 0.52, 0.5);

      await renderBoard({ value: [short], enableCurves: true });

      expect(screen.queryByTestId(`arrow-curve-handle-${short.id}`)).toBeNull();
    });

    it('explains the handle once there is an arrow to curve', async () => {
      await renderBoard({ value: [arrow], enableCurves: true, showToolHints: true });

      expect(screen.getByText("Drag an arrow's middle dot to curve it")).toBeTruthy();
    });

    it('does not explain the handle without an arrow', async () => {
      await renderBoard({ enableCurves: true, showToolHints: true });

      expect(screen.queryByText("Drag an arrow's middle dot to curve it")).toBeNull();
    });
  });

  describe('tool hints', () => {
    it.each([
      ['arrow-solid', 'Run: tap the court to place it'],
      ['arrow-dashed', 'Pass: tap the court to place it'],
      ['goal', 'Goal: tap the court to place it'],
    ])('names the selected %s', async (_type, hint) => {
      await renderBoard({
        showToolHints: true,
        allowedMarkerTypes: ['arrow-solid', 'arrow-dashed', 'goal'],
      });

      fireEvent.press(screen.getByLabelText(hint.split(':')[0]));

      expect(screen.getByText(hint)).toBeTruthy();
    });

    it('shows no hint until a tool is selected', async () => {
      await renderBoard({ showToolHints: true });

      expect(screen.queryByText(/tap the court/)).toBeNull();
    });

    it('stays off unless asked for, so the tactics screen is unchanged', async () => {
      await renderBoard();

      fireEvent.press(screen.getByLabelText('Run'));

      expect(screen.queryByText(/tap the court/)).toBeNull();
    });
  });

  describe('player labels', () => {
    const player = createTacticsMarker('player', 0.3, 0.3);
    const labelPlayer = async (text: string) => {
      fireEvent.press(screen.getByTestId(`marker-${player.id}`));
      fireEvent.changeText(await screen.findByLabelText('Label (up to 3 characters)'), text);
      fireEvent.press(screen.getByText('OK'));
    };

    it('saves a label on the pressed player', async () => {
      const { onChange } = await renderBoard({ value: [ball, player], enableLabels: true });

      await labelPlayer('10');

      const next = onChange.mock.lastCall?.[0];
      expect(next?.find(m => m.id === player.id)?.label).toBe('10');
      expect(next?.find(m => m.id === ball.id)?.label).toBeUndefined();
    });

    it('keeps a label to three characters, without surrounding spaces', async () => {
      const { onChange } = await renderBoard({ value: [ball, player], enableLabels: true });

      await labelPlayer('  ABCDE ');

      expect(onChange.mock.lastCall?.[0].find(m => m.id === player.id)?.label).toBe('ABC');
    });

    it('does not autocorrect a label while it is typed', async () => {
      await renderBoard({ value: [ball, player], enableLabels: true });

      fireEvent.press(screen.getByTestId(`marker-${player.id}`));

      expect(await screen.findByLabelText('Label (up to 3 characters)')).toHaveProp(
        'autoCorrect',
        false,
      );
    });

    it('stops typing at the three characters the dialog promises', async () => {
      await renderBoard({ value: [ball, player], enableLabels: true });

      fireEvent.press(screen.getByTestId(`marker-${player.id}`));

      expect(await screen.findByLabelText('Label (up to 3 characters)')).toHaveProp('maxLength', 3);
    });

    it('announces a player as a button only when pressing it does something', async () => {
      const seven = { ...player, label: '7' };
      const { unmount } = render(
        <SafeAreaProvider initialMetrics={SAFE_AREA}>
          <SportProvider>
            <TacticsBoard sport="soccer" value={[ball, seven]} onChange={jest.fn()} enableLabels />
          </SportProvider>
        </SafeAreaProvider>,
      );
      expect(await screen.findByRole('button', { name: '7' })).toBeTruthy();
      unmount();

      await renderBoard({ value: [ball, seven] });
      expect(screen.queryByRole('button', { name: '7' })).toBeNull();
    });

    it('announces the dialog actions as buttons', async () => {
      await renderBoard({ value: [ball, player], enableLabels: true });

      fireEvent.press(screen.getByTestId(`marker-${player.id}`));

      expect(await screen.findByRole('button', { name: 'OK' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    });

    it('removes the label when it is emptied', async () => {
      const labelled = { ...player, label: '7' };
      const { onChange } = await renderBoard({ value: [ball, labelled], enableLabels: true });

      await labelPlayer('  ');

      const updated = onChange.mock.lastCall?.[0].find(m => m.id === player.id);
      expect(updated && 'label' in updated).toBe(false);
    });

    it('shows the label on the marker', async () => {
      await renderBoard({ value: [ball, { ...player, label: '7' }] });

      expect(screen.getByText('7')).toBeTruthy();
    });

    it('does nothing on press unless labels are enabled', async () => {
      await renderBoard({ value: [ball, player] });

      fireEvent.press(screen.getByTestId(`marker-${player.id}`));

      expect(screen.queryByLabelText('Label (up to 3 characters)')).toBeNull();
    });
  });

  describe('previous step guide', () => {
    const player = createTacticsMarker('player', 0.2, 0.8);
    const run = createArrowMarker('arrow-solid', 0.2, 0.8, 0.2, 0.3);

    it('draws the previous step out of reach behind the markers', async () => {
      await renderBoard({ value: [ball, player], guideMarkers: [player, run] });

      // Hidden from screen readers, which would otherwise announce every marker twice
      const hidden = { includeHiddenElements: true };
      const guide = screen.getByTestId('step-guide', hidden);
      expect(guide.props.pointerEvents).toBe('none');
      expect(guide.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(screen.getByTestId(`guide-marker-${player.id}`, hidden)).toBeTruthy();
      expect(screen.getByTestId(`guide-marker-${run.id}`, hidden)).toBeTruthy();
    });

    it('leaves the current markers as the only ones to label', async () => {
      await renderBoard({ value: [ball, player], guideMarkers: [player], enableLabels: true });

      expect(screen.getAllByTestId(`marker-${player.id}`)).toHaveLength(1);
    });

    it('draws nothing without a previous step', async () => {
      await renderBoard();

      expect(screen.queryByTestId('step-guide', { includeHiddenElements: true })).toBeNull();
    });
  });

  describe('read-only mode', () => {
    it('hides the toolbar', async () => {
      await renderBoard({ readOnly: true });

      expect(screen.queryByLabelText('Player')).toBeNull();
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
