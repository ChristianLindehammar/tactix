import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import ExerciseLibraryScreen from '@/app/(tabs)/exercises/index';
import { exerciseRepository } from '@/services/exerciseRepository';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { renderExerciseScreen } from '@/test-utils/renderExerciseScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('expo-router/js-tabs', () => ({ useBottomTabBarHeight: () => 0 }));

const saved = (overrides: Parameters<typeof buildExercise>[0]) =>
  exerciseRepository.save(buildExercise({ sport: 'soccer', ...overrides }));

describe('exercise library', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockPush.mockClear();
    jest.restoreAllMocks();
  });

  it('invites you to create an exercise when there are none', async () => {
    renderExerciseScreen(<ExerciseLibraryScreen />);

    expect(await screen.findByText('No exercises yet')).toBeTruthy();
  });

  it('lists the exercises for the selected sport only', async () => {
    await saved({ id: 'a', title: 'Soccer drill' });
    await saved({ id: 'b', title: 'Hockey drill', sport: 'hockey' });

    renderExerciseScreen(<ExerciseLibraryScreen />);

    expect(await screen.findByText('Soccer drill')).toBeTruthy();
    expect(screen.queryByText('Hockey drill')).toBeNull();
  });

  it('shows what each exercise is at a glance', async () => {
    await saved({
      difficulty: 4,
      focus: ['defence'],
      phase: 'game',
      durationMinutes: 15,
      minPlayers: 6,
      maxPlayers: 12,
    });

    renderExerciseScreen(<ExerciseLibraryScreen />);

    expect(await screen.findByText('Advanced · Game · 15 min · 6–12 players')).toBeTruthy();
    expect(screen.getAllByText('Defence').length).toBeGreaterThan(1);
  });

  it('does not show deleted exercises', async () => {
    await saved({ title: 'Gone' });
    await exerciseRepository.remove('exercise-1');

    renderExerciseScreen(<ExerciseLibraryScreen />);

    expect(await screen.findByText('No exercises yet')).toBeTruthy();
    expect(screen.queryByText('Gone')).toBeNull();
  });

  describe('finding exercises', () => {
    beforeEach(async () => {
      await saved({ id: 'a', title: 'Passing drill', focus: ['passing'], difficulty: 1 });
      await saved({ id: 'b', title: 'Defending drill', focus: ['defence'], difficulty: 5 });
    });

    it('narrows the list by focus tag', async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');

      fireEvent.press(screen.getByLabelText('filter-focus-defence'));

      expect(screen.getByText('Defending drill')).toBeTruthy();
      expect(screen.queryByText('Passing drill')).toBeNull();
    });

    it('narrows the list by difficulty', async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');

      fireEvent.press(screen.getByLabelText('filter-difficulty-1'));

      expect(screen.getByText('Passing drill')).toBeTruthy();
      expect(screen.queryByText('Defending drill')).toBeNull();
    });

    it('narrows the list by phase', async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');

      fireEvent.press(screen.getByLabelText('filter-phase-cooldown'));

      expect(screen.getByText('No exercises match your filters.')).toBeTruthy();
    });

    it('narrows the list by search text', async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');

      fireEvent.changeText(screen.getByPlaceholderText('Search exercises'), 'defending');

      expect(screen.getByText('Defending drill')).toBeTruthy();
      expect(screen.queryByText('Passing drill')).toBeNull();
    });

    it('narrows the list by number of players', async () => {
      await saved({ id: 'c', title: 'Big game', minPlayers: 20, maxPlayers: 30 });
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Big game');

      fireEvent.changeText(screen.getByLabelText('Number of players'), '25');

      expect(screen.getByText('Big game')).toBeTruthy();
      expect(screen.queryByText('Passing drill')).toBeNull();
    });

    it('brings everything back when filters are cleared', async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');
      fireEvent.press(screen.getByLabelText('filter-focus-defence'));

      fireEvent.press(screen.getByText('Clear filters'));

      expect(screen.getByText('Passing drill')).toBeTruthy();
      expect(screen.getByText('Defending drill')).toBeTruthy();
    });
  });

  it('shows a load failure instead of an empty library, and can retry', async () => {
    await saved({ title: 'Safe drill' });
    jest.spyOn(AsyncStorage, 'getAllKeys').mockRejectedValueOnce(new Error('disk error'));

    renderExerciseScreen(<ExerciseLibraryScreen />);

    expect(await screen.findByText('Could not load your exercises.')).toBeTruthy();
    expect(screen.queryByText('No exercises yet')).toBeNull();

    fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByText('Safe drill')).toBeTruthy();
  });

  it('opens an exercise when it is pressed', async () => {
    await saved({ id: 'abc', title: 'Open me' });
    renderExerciseScreen(<ExerciseLibraryScreen />);

    fireEvent.press(await screen.findByText('Open me'));

    expect(mockPush).toHaveBeenCalledWith('/exercises/abc');
  });

  it('starts a new exercise from the add button', async () => {
    renderExerciseScreen(<ExerciseLibraryScreen />);
    await waitFor(() => screen.getByText('No exercises yet'));

    fireEvent.press(screen.getByLabelText('New exercise'));

    expect(mockPush).toHaveBeenCalledWith('/exercises/edit');
  });
});
