import * as React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';

import ExerciseDetailScreen from '@/app/(tabs)/exercises/[id]';
import { getCurrentUserId } from '@/services/currentUser';
import { ratingRepository } from '@/services/exerciseRatings';
import { exerciseRepository } from '@/services/exerciseRepository';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { renderExerciseScreen } from '@/test-utils/renderExerciseScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockId = 'exercise-1';

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: mockBack }),
    useLocalSearchParams: () => ({ id: mockId }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    Stack: { Screen: () => null },
  };
});

describe('exercise detail', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockPush.mockClear();
    mockBack.mockClear();
    mockId = 'exercise-1';
    jest.restoreAllMocks();
    await exerciseRepository.save(
      buildExercise({
        ownerId: await getCurrentUserId(),
        sport: 'soccer',
        title: 'Triangle passing',
        description: 'Pass and follow',
        coachingPoints: ['Head up', 'Quick feet'],
        customTags: ['u12'],
        difficulty: 2,
        phase: 'warmup',
        durationMinutes: 10,
        minPlayers: 6,
        maxPlayers: 12,
        focus: ['passing'],
      }),
    );
  });

  it('shows everything about the exercise', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);

    expect(await screen.findByText('Triangle passing')).toBeTruthy();
    expect(screen.getByText('Easy · Warm-up · 10 min · 6–12 players')).toBeTruthy();
    expect(screen.getByText('Pass and follow')).toBeTruthy();
    expect(screen.getByText('Passing')).toBeTruthy();
    expect(screen.getByText('• Head up')).toBeTruthy();
    expect(screen.getByText('• Quick feet')).toBeTruthy();
    expect(screen.getByText('u12')).toBeTruthy();
  });

  it('shows the diagram read-only', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);
    await screen.findByText('Triangle passing');

    expect(screen.queryByLabelText('Cone')).toBeNull();
    expect(screen.getByTestId('tactics-board-court').props.pointerEvents).toBe('none');
  });

  it('opens the editor for this exercise', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);

    fireEvent.press(await screen.findByText('Edit'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/exercises/edit',
      params: { id: 'exercise-1' },
    });
  });

  const answerDeletePrompt = async (answer: string) => {
    const alert = jest.spyOn(Alert, 'alert');
    fireEvent.press(await screen.findByText('Delete'));
    expect(alert.mock.lastCall?.[1]).toBe('Delete this exercise?');
    await act(async () => {
      alert.mock.lastCall?.[2]?.find(button => button.text === answer)?.onPress?.();
    });
  };

  it('deletes after confirmation and goes back', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);

    await answerDeletePrompt('Delete');

    expect(await exerciseRepository.list()).toEqual([]);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the exercise when the deletion is cancelled', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);

    await answerDeletePrompt('Cancel');

    expect(await exerciseRepository.list()).toHaveLength(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('says so when the deletion fails, and stays on the exercise', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);
    await screen.findByText('Triangle passing');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

    await answerDeletePrompt('Delete');

    expect(screen.getByText('Could not delete the exercise.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  describe("someone else's exercise", () => {
    beforeEach(async () => {
      mockId = 'theirs';
      await exerciseRepository.save(
        buildExercise({ id: 'theirs', ownerId: 'someone-else', sport: 'soccer', title: 'Their drill' }),
      );
    });

    it('offers neither Edit nor Delete', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);
      await screen.findByText('Their drill');

      expect(screen.queryByText('Edit')).toBeNull();
      expect(screen.queryByText('Delete')).toBeNull();
    });

    it('can be cloned into an exercise you own and edit', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Clone'));
      await act(async () => {});

      const copy = (await exerciseRepository.list()).find(e => e.clonedFromId === 'theirs');
      expect(copy).toMatchObject({
        ownerId: await getCurrentUserId(),
        title: 'Their drill (copy)',
      });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/exercises/edit',
        params: { id: copy!.id },
      });
    });

    it('can be rated without changing the exercise', async () => {
      const before = await exerciseRepository.get('theirs');
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByTestId('rate-3'));
      await act(async () => {});

      expect(await ratingRepository.getMine('theirs')).toBe(3);
      expect(await exerciseRepository.get('theirs')).toEqual(before);
    });
  });

  it('also lets you clone your own exercise', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);

    fireEvent.press(await screen.findByText('Clone'));
    await act(async () => {});

    expect(await exerciseRepository.list()).toHaveLength(2);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('says so when cloning fails, and stays on the exercise', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);
    await screen.findByText('Triangle passing');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

    fireEvent.press(screen.getByText('Clone'));
    await act(async () => {});

    expect(screen.getByText('Could not clone the exercise.')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  describe('rating', () => {
    const selectedStars = () =>
      [1, 2, 3, 4, 5].filter(
        stars => screen.getByTestId(`rate-${stars}`).props.accessibilityState.selected,
      );

    it('shows the rating you gave before', async () => {
      await ratingRepository.setMine('exercise-1', 2);

      renderExerciseScreen(<ExerciseDetailScreen />);
      await screen.findByText('Triangle passing');
      await act(async () => {});

      expect(selectedStars()).toEqual([1, 2]);
    });

    it('saves a new rating', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByTestId('rate-4'));
      await act(async () => {});

      expect(selectedStars()).toEqual([1, 2, 3, 4]);
      expect(await ratingRepository.getMine('exercise-1')).toBe(4);
    });

    it('clears the rating when the same star is pressed again', async () => {
      await ratingRepository.setMine('exercise-1', 4);
      renderExerciseScreen(<ExerciseDetailScreen />);
      await screen.findByText('Triangle passing');
      await act(async () => {});

      fireEvent.press(screen.getByTestId('rate-4'));
      await act(async () => {});

      expect(selectedStars()).toEqual([]);
      expect(await ratingRepository.getMine('exercise-1')).toBeNull();
    });

    it('says so when the rating cannot be saved, and keeps the old one', async () => {
      await ratingRepository.setMine('exercise-1', 2);
      renderExerciseScreen(<ExerciseDetailScreen />);
      await screen.findByText('Triangle passing');
      await act(async () => {});
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

      fireEvent.press(screen.getByTestId('rate-5'));
      await act(async () => {});

      expect(screen.getByText('Could not save your rating.')).toBeTruthy();
      expect(selectedStars()).toEqual([1, 2]);
    });
  });

  it('says so when the exercise no longer exists', async () => {
    mockId = 'missing';

    renderExerciseScreen(<ExerciseDetailScreen />);

    expect(await screen.findByText('This exercise no longer exists.')).toBeTruthy();
  });
});
