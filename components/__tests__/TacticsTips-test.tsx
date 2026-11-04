import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';

import TacticsScreen from '@/app/(tabs)/tactics';
import { renderExerciseScreen } from '@/test-utils/renderExerciseScreen';

const ADD_TIP = 'Tap the player or opponent button, then tap the court to add a marker';
const MOVE_TIP = 'Drag markers to reposition them on the court';
const DELETE_TIP = 'Long press on a marker to delete it';

let mockFocused = true;

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(() => (mockFocused ? effect() : undefined), [effect, mockFocused]),
  };
});
jest.mock('expo-router/js-tabs', () => ({ useBottomTabBarHeight: () => 0 }));

// Jest has no native layout to measure, and the tips only need a board holding one ball
jest.mock('@/components/TacticsBoard', () => {
  const { useEffect } = require('react');
  return {
    TacticsBoard: ({ firstToolRef, onChange }: any) => {
      useEffect(() => {
        firstToolRef.current = { measure: (done: any) => done(0, 0, 10, 10, 0, 0) };
        onChange([{ id: 'ball', type: 'ball', x: 0.5, y: 0.5 }]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    },
  };
});

const wait = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

// The sport loads from storage before the screen's own timers begin
const openScreen = async () => {
  const view = renderExerciseScreen(<TacticsScreen />);
  await wait(0);
  return view;
};

describe('tactics first-run tips', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    mockFocused = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts when the tactics tab is open', async () => {
    await openScreen();
    await wait(1000);

    expect(screen.getByText(ADD_TIP)).toBeTruthy();
  });

  it('does not appear over other screens while the tab is in the background', async () => {
    mockFocused = false;
    await openScreen();
    await wait(2000);

    expect(screen.queryByText(ADD_TIP)).toBeNull();
  });

  it('does not appear if you leave the tab before it starts', async () => {
    let refresh = () => {};
    const Tab = () => {
      const [, setTick] = React.useState(0);
      refresh = () => setTick(tick => tick + 1);
      return <TacticsScreen />;
    };
    renderExerciseScreen(<Tab />);
    await wait(100);

    mockFocused = false;
    act(() => refresh());
    await wait(2000);

    expect(screen.queryByText(ADD_TIP)).toBeNull();
  });

  it('finishes even with no player on the board, and does not come back', async () => {
    const { unmount } = await openScreen();
    await wait(1000);

    fireEvent.press(screen.getByText(ADD_TIP));
    await wait(500);
    fireEvent.press(screen.getByText(MOVE_TIP));
    await wait(500);
    fireEvent.press(screen.getByText(DELETE_TIP));
    await wait(0);
    unmount();

    await openScreen();
    await wait(2000);

    expect(screen.queryByText(ADD_TIP)).toBeNull();
  });
});
