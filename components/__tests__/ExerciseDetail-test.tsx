import * as React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';

import ExerciseDetailScreen from '@/app/(tabs)/exercises/[id]';
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

    expect(screen.queryByLabelText('cone')).toBeNull();
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

  it('says so when the exercise no longer exists', async () => {
    mockId = 'missing';

    renderExerciseScreen(<ExerciseDetailScreen />);

    expect(await screen.findByText('This exercise no longer exists.')).toBeTruthy();
  });
});
