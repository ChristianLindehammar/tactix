import * as React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import ExerciseEditorScreen from '@/app/(tabs)/exercises/edit';
import { getCurrentUserId } from '@/services/currentUser';
import { exerciseRepository } from '@/services/exerciseRepository';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { renderExerciseScreen } from '@/test-utils/renderExerciseScreen';

const mockBack = jest.fn();
const mockDispatch = jest.fn();
let mockParams: { id?: string } = {};
let mockPreventRemove: { enabled: boolean; callback: (event: { data: { action: unknown } }) => void };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useNavigation: () => ({ dispatch: mockDispatch }),
  Stack: { Screen: () => null },
}));
// The navigator is the boundary: leaving the screen is its job, deciding whether to warn is ours
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (enabled: boolean, callback: typeof mockPreventRemove.callback) => {
    mockPreventRemove = { enabled, callback };
  },
}));

const pressSave = async () => {
  fireEvent.press(await screen.findByText('Save'));
  await act(async () => {});
};

describe('exercise editor', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockBack.mockClear();
    mockDispatch.mockClear();
    mockParams = {};
    jest.restoreAllMocks();
  });

  describe('creating an exercise', () => {
    it('stops a title at the length the server accepts', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      expect(await screen.findByLabelText('Title')).toHaveProp('maxLength', 200);
    });

    it('saves what was entered for the selected sport and goes back', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');
      fireEvent.changeText(screen.getByLabelText('Duration (minutes)'), '15');
      fireEvent.changeText(screen.getByLabelText('Min players'), '6');
      fireEvent.press(screen.getByTestId('difficulty-5'));
      fireEvent.press(screen.getByTestId('focus-defence'));
      fireEvent.press(screen.getByTestId('focus-transition'));
      fireEvent.press(screen.getByTestId('phase-game'));
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

    it('shares a new exercise in the library, warning against players\' names', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');
      expect(screen.getByLabelText('Share in the library')).toHaveProp('value', true);
      expect(screen.getByText(/Don't write players' names/)).toBeTruthy();
      await pressSave();

      const [saved] = await exerciseRepository.list();
      expect(saved.visibility).toBe('public');
    });

    it('keeps an exercise private when sharing is switched off', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');
      fireEvent(screen.getByLabelText('Share in the library'), 'valueChange', false);
      await pressSave();

      const [saved] = await exerciseRepository.list();
      expect(saved.visibility).toBe('private');
    });

    it('removes a focus tag when it is pressed again', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');
      fireEvent.press(screen.getByTestId('focus-defence'));
      fireEvent.press(screen.getByTestId('focus-defence'));
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

    it('offers drill markers, tool hints and labels in the diagram editor', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.press(await screen.findByText('Edit diagram'));
      fireEvent.press(screen.getByLabelText('Pass'));

      expect(screen.getByLabelText('Coach')).toBeTruthy();
      expect(screen.getByLabelText('Goal')).toBeTruthy();
      expect(screen.getByText('Pass: tap the court to place it')).toBeTruthy();
    });

    it('opens the diagram editor and closes it again', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);

      fireEvent.press(await screen.findByText('Edit diagram'));
      expect(screen.getByLabelText('Cone')).toBeTruthy();

      fireEvent.press(screen.getByTestId('close-diagram'));
      expect(screen.queryByLabelText('Cone')).toBeNull();
    });
  });

  describe('editing an exercise', () => {
    const buildExisting = async () =>
      buildExercise({
        id: 'existing',
        ownerId: await getCurrentUserId(),
        sport: 'hockey',
        title: 'Original',
        durationMinutes: 20,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    let existing: Awaited<ReturnType<typeof buildExisting>>;

    beforeEach(async () => {
      existing = await buildExisting();
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

    it("refuses to open someone else's exercise", async () => {
      await exerciseRepository.save(
        buildExercise({ id: 'theirs', ownerId: 'someone-else', title: 'Their drill' }),
      );
      mockParams = { id: 'theirs' };

      renderExerciseScreen(<ExerciseEditorScreen />);

      expect(await screen.findByText('Only the owner can edit this exercise.')).toBeTruthy();
      expect(screen.queryByText('Save')).toBeNull();
    });

    it('says so when the exercise no longer exists', async () => {
      mockParams = { id: 'missing' };

      renderExerciseScreen(<ExerciseEditorScreen />);

      await waitFor(() => expect(screen.getByText('This exercise no longer exists.')).toBeTruthy());
    });

    describe('steps', () => {
      const openDiagram = async () => {
        renderExerciseScreen(<ExerciseEditorScreen />);
        fireEvent.press(await screen.findByText('Edit diagram'));
      };

      it('adds a step that starts from the markers of the current one', async () => {
        await openDiagram();

        fireEvent.press(screen.getByLabelText('Add step'));
        fireEvent.press(screen.getByTestId('close-diagram'));
        await pressSave();

        const [saved] = await exerciseRepository.list();
        expect(saved.frames).toHaveLength(2);
        expect(saved.frames[1].markers).toEqual(existing.frames[0].markers);
        expect(saved.frames[1].id).not.toBe(existing.frames[0].id);
      });

      it('keeps a separate note for each step', async () => {
        await openDiagram();

        fireEvent.changeText(screen.getByLabelText('Step note'), 'Pass wide');
        fireEvent.press(screen.getByLabelText('Add step'));
        expect(screen.getByLabelText('Step note').props.value).toBe('');
        fireEvent.changeText(screen.getByLabelText('Step note'), 'Cross');
        fireEvent.press(within(screen.getByTestId('diagram-editor')).getByLabelText('Step 1'));
        expect(screen.getByLabelText('Step note').props.value).toBe('Pass wide');
        fireEvent.press(screen.getByTestId('close-diagram'));
        await pressSave();

        const [saved] = await exerciseRepository.list();
        expect(saved.frames.map(frame => frame.note)).toEqual(['Pass wide', 'Cross']);
      });

      it('shows the previous step faintly behind a later one', async () => {
        const hidden = { includeHiddenElements: true };
        await openDiagram();
        expect(screen.queryByTestId('step-guide', hidden)).toBeNull();

        fireEvent.press(screen.getByLabelText('Add step'));

        expect(screen.getByTestId('step-guide', hidden)).toBeTruthy();
      });

      it('deletes the shown step after asking, but never the only one', async () => {
        const alert = jest.spyOn(Alert, 'alert');
        await openDiagram();
        expect(screen.queryByLabelText('Delete step')).toBeNull();

        fireEvent.press(screen.getByLabelText('Add step'));
        fireEvent.changeText(screen.getByLabelText('Step note'), 'Doomed');
        fireEvent.press(screen.getByLabelText('Delete step'));
        act(() => alert.mock.lastCall?.[2]?.find(button => button.text === 'Delete')?.onPress?.());

        expect(screen.queryByLabelText('Step 2')).toBeNull();
        expect(screen.getByLabelText('Step note').props.value).toBe('');
        fireEvent.press(screen.getByTestId('close-diagram'));
        await pressSave();
        const [saved] = await exerciseRepository.list();
        expect(saved.frames).toEqual(existing.frames);
      });
    });
  });

  describe('leaving with unsaved changes', () => {
    const editTitle = async () =>
      fireEvent.changeText(await screen.findByLabelText('Title'), 'Breakout');

    it('lets you leave freely when nothing has changed', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);
      await screen.findByLabelText('Title');

      expect(mockPreventRemove.enabled).toBe(false);
    });

    it('asks first once something has changed', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);
      await editTitle();

      expect(mockPreventRemove.enabled).toBe(true);
    });

    it('does not count loading a saved exercise as a change', async () => {
      await exerciseRepository.save(
        buildExercise({ id: 'mine', ownerId: await getCurrentUserId(), title: 'Mine' }),
      );
      mockParams = { id: 'mine' };

      renderExerciseScreen(<ExerciseEditorScreen />);
      await screen.findByLabelText('Title');

      expect(mockPreventRemove.enabled).toBe(false);
    });

    it('leaves only when you choose to discard', async () => {
      const alert = jest.spyOn(Alert, 'alert');
      renderExerciseScreen(<ExerciseEditorScreen />);
      await editTitle();
      const action = { type: 'GO_BACK' };

      mockPreventRemove.callback({ data: { action } });
      const buttons = alert.mock.lastCall?.[2];
      buttons?.find(button => button.text === 'Keep editing')?.onPress?.();
      expect(mockDispatch).not.toHaveBeenCalled();

      buttons?.find(button => button.text === 'Discard')?.onPress?.();
      expect(mockDispatch).toHaveBeenCalledWith(action);
    });

    it('leaves without asking after a successful save', async () => {
      const alert = jest.spyOn(Alert, 'alert');
      renderExerciseScreen(<ExerciseEditorScreen />);
      await editTitle();
      const action = { type: 'GO_BACK' };

      await pressSave();
      expect(mockBack).toHaveBeenCalledTimes(1);

      // Navigation reports the exit to the still-armed warning, which must let it through
      mockPreventRemove.callback({ data: { action } });

      expect(alert).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(action);
    });

    it('keeps the warning armed while leaving, since changing it mid-exit crashes Android', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);
      await editTitle();

      await pressSave();

      expect(mockPreventRemove.enabled).toBe(true);
    });

    it('still asks after a failed save', async () => {
      renderExerciseScreen(<ExerciseEditorScreen />);
      await editTitle();
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

      await pressSave();
      const alert = jest.spyOn(Alert, 'alert');

      mockPreventRemove.callback({ data: { action: { type: 'GO_BACK' } } });

      expect(alert).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
