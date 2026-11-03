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

  describe('marker choices', () => {
    it('keeps the tactics toolbar to its original six markers by default', async () => {
      await renderBoard();

      ['player', 'opponent', 'ball', 'cone', 'arrow-solid', 'arrow-dashed'].forEach(type =>
        expect(screen.getByLabelText(type)).toBeTruthy(),
      );
      expect(screen.queryByLabelText('coach')).toBeNull();
      expect(screen.queryByLabelText('goal')).toBeNull();
    });

    it.each([['coach'], ['goal']] as const)('can place a %s when allowed', async type => {
      const { onChange } = await renderBoard({ allowedMarkerTypes: [type] });

      fireEvent.press(screen.getByLabelText(type));
      tapCourt(100, 100);

      expect(onChange.mock.lastCall?.[0].at(-1)?.type).toBe(type);
    });
  });

  describe('tool hints', () => {
    it.each([
      ['arrow-solid', 'Run: tap the court to place it'],
      ['arrow-dashed', 'Pass: tap the court to place it'],
      ['coach', 'Coach: tap the court to place it'],
    ])('names the selected %s', async (type, hint) => {
      await renderBoard({
        showToolHints: true,
        allowedMarkerTypes: ['arrow-solid', 'arrow-dashed', 'coach'],
      });

      fireEvent.press(screen.getByLabelText(type));

      expect(screen.getByText(hint)).toBeTruthy();
    });

    it('shows no hint until a tool is selected', async () => {
      await renderBoard({ showToolHints: true });

      expect(screen.queryByText(/tap the court/)).toBeNull();
    });

    it('stays off unless asked for, so the tactics screen is unchanged', async () => {
      await renderBoard();

      fireEvent.press(screen.getByLabelText('arrow-solid'));

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
