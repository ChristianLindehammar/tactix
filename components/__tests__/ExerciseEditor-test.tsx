import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import ExerciseEditorScreen from '@/app/(tabs)/exercises/edit';
import { exerciseRepository } from '@/services/exerciseRepository';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { renderExerciseScreen } from '@/test-utils/renderExerciseScreen';

const mockBack = jest.fn();
let mockParams: { id?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

const pressSave = async () => {
  fireEvent.press(await screen.findByText('Save'));
  await act(async () => {});
};

describe('exercise editor', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockBack.mockClear();
    mockParams = {};
    jest.restoreAllMocks();
  });

  describe('creating an exercise', () => {
    it('saves what was entered for the selected sport and goes back', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');
      fireEvent.changeText(screen.getByLabelText('Duration (minutes)'), '15');
      fireEvent.changeText(screen.getByLabelText('Min players'), '6');
      fireEvent.press(screen.getByLabelText('difficulty-5'));
      fireEvent.press(screen.getByLabelText('focus-defence'));
      fireEvent.press(screen.getByLabelText('focus-transition'));
      fireEvent.press(screen.getByLabelText('phase-game'));
      await pressSave();

      const [saved] = await exerciseRepository.list();
      expect(saved).toMatchObject({
        sport: 'soccer',
        title: 'Breakout',
        durationMinutes: 15,
        minPlayers: 6,
        maxPlayers: null,
        difficulty: 5,
        focus: ['defence', 'transition'],
        phase: 'game',
      });
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('removes a focus tag when it is pressed again', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');
      fireEvent.press(screen.getByLabelText('focus-defence'));
      fireEvent.press(screen.getByLabelText('focus-defence'));
      await pressSave();

      const [saved] = await exerciseRepository.list();
      expect(saved.focus).toEqual([]);
    });

    it('explains what is wrong and saves nothing when a field is invalid', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.changeText(await screen.findByLabelText('Min players'), '12');
      fireEvent.changeText(screen.getByLabelText('Max players'), '6');
      await pressSave();

      expect(screen.getByText('Enter a title')).toBeTruthy();
      expect(screen.getByText('Must not be below the minimum')).toBeTruthy();
      expect(await exerciseRepository.list()).toEqual([]);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('saves only once when Save is pressed twice quickly', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);
      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');

      fireEvent.press(screen.getByText('Save'));
      fireEvent.press(screen.getByText('Save'));
      await act(async () => {});

      expect(await exerciseRepository.list()).toHaveLength(1);
    });

    it('stays on the form and says so when the save fails', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);
      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

      await pressSave();

      expect(
        screen.getByText('Could not save the exercise. Your changes have not been stored.'),
      ).toBeTruthy();
      expect(screen.getByLabelText('Title').props.value).toBe('Breakout');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('starts a diagram with no forced ball, since some drills have none', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);
      fireEvent.changeText(await screen.findByLabelText('Title'), 'Fitness run');

      await pressSave();

      const [saved] = await exerciseRepository.list();
      expect(saved.frames[0].markers).toEqual([]);
    });

    it('opens the diagram editor and closes it again', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.press(await screen.findByText('Edit diagram'));
      expect(screen.getByLabelText('cone')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('close-diagram'));
      expect(screen.queryByLabelText('cone')).toBeNull();
    });
  });

  describe('editing an exercise', () => {
    const existing = buildExercise({
      id: 'existing',
      sport: 'hockey',
      title: 'Original',
      durationMinutes: 20,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    beforeEach(async () => {
      await exerciseRepository.save(existing);
      mockParams = { id: 'existing' };
    });

    it('shows the saved values', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      expect((await screen.findByLabelText('Title')).props.value).toBe('Original');
      expect(screen.getByLabelText('Duration (minutes)').props.value).toBe('20');
    });

    it('updates the same exercise and keeps its sport and creation date', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.changeText(await screen.findByLabelText('Title'), 'Renamed');
      await pressSave();

      const all = await exerciseRepository.list();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({
        id: 'existing',
        title: 'Renamed',
        sport: 'hockey',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(Date.parse(all[0].updatedAt)).toBeGreaterThan(Date.parse(existing.updatedAt));
    });

    it('says so when the exercise no longer exists', async () => {
      mockParams = { id: 'missing' };

      renderExerciseScreen(<ExerciseEditorScreen />);

      await waitFor(() => expect(screen.getByText('This exercise no longer exists.')).toBeTruthy());
    });
  });
});
