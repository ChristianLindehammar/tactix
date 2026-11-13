import * as React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import ExerciseDetailScreen from '@/app/(tabs)/exercises/[id]';
import { getCurrentUserId } from '@/services/currentUser';
import { ratingRepository } from '@/services/exerciseRatings';
import { exerciseRepository } from '@/services/exerciseRepository';
import { library, LibraryError } from '@/services/library';
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

// The server is the boundary: the library service's own tests cover the requests
jest.mock('@/services/library', () => ({
  ...jest.requireActual('@/services/library'),
  library: { get: jest.fn(), report: jest.fn(), block: jest.fn(), getFavorite: jest.fn(), setFavorite: jest.fn() },
}));
const mockLibrary = library as jest.Mocked<typeof library>;

describe('exercise detail', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockPush.mockClear();
    mockBack.mockClear();
    mockId = 'exercise-1';
    jest.restoreAllMocks();
    mockLibrary.get.mockReset().mockResolvedValue(null);
    mockLibrary.report.mockReset().mockResolvedValue(undefined);
    mockLibrary.block.mockReset().mockResolvedValue(undefined);
    mockLibrary.getFavorite.mockReset().mockResolvedValue(null);
    mockLibrary.setFavorite.mockReset();
    await exerciseRepository.save(
      buildExercise({
        ownerId: await getCurrentUserId(),
        sport: 'soccer',
        title: 'Triangle passing',
        description: 'Pass and follow',
        coachingPoints: [
          { id: 'point-1', text: 'Head up' },
          { id: 'point-2', text: 'Quick feet' },
        ],
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

  describe('steps', () => {
    beforeEach(async () => {
      await exerciseRepository.save(
        buildExercise({
          id: 'steps',
          sport: 'soccer',
          frames: [
            { id: 'one', note: 'Set up', markers: [{ id: 'c', type: 'cone', x: 0.5, y: 0.5 }] },
            { id: 'two', note: 'Go', markers: [{ id: 'p', type: 'player', x: 0.5, y: 0.5 }] },
          ],
        }),
      );
      mockId = 'steps';
    });

    it('shows the first step and its note to begin with', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      expect(await screen.findByText('Set up')).toBeTruthy();
      expect(screen.getByLabelText('Step 1').props.accessibilityState.selected).toBe(true);
      expect(screen.queryByLabelText('Player')).toBeNull();
    });

    it('switches to another step and its note', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByLabelText('Step 2'));

      expect(screen.getByText('Go')).toBeTruthy();
      expect(screen.queryByText('Set up')).toBeNull();
      expect(screen.getByLabelText('Player')).toBeTruthy();
    });

    it('opens the diagram full screen on the selected step, and steps there carry back', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);
      fireEvent.press(await screen.findByLabelText('Step 2'));

      fireEvent.press(screen.getByLabelText('Show diagram full screen'));
      const fullScreen = within(screen.getByTestId('diagram-full-screen'));
      expect(fullScreen.getByText('Go')).toBeTruthy();
      expect(fullScreen.getByLabelText('Step 2').props.accessibilityState.selected).toBe(true);

      fireEvent.press(fullScreen.getByLabelText('Step 1'));
      expect(fullScreen.getByText('Set up')).toBeTruthy();

      fireEvent.press(fullScreen.getByLabelText('Close'));
      expect(screen.queryByTestId('diagram-full-screen')).toBeNull();
      expect(screen.getByLabelText('Step 1').props.accessibilityState.selected).toBe(true);
    });
  });

  it('shows no step tabs when there is only one step', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);
    await screen.findByText('Triangle passing');

    expect(screen.queryByLabelText('Step 1')).toBeNull();
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

    it('can be cloned into an exercise you own, edited on top of the copy so saving lands on it', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Clone'));
      await act(async () => {});

      const copy = (await exerciseRepository.list()).find(e => e.clonedFromId === 'theirs');
      expect(copy).toMatchObject({
        ownerId: await getCurrentUserId(),
        title: 'Their drill (copy)',
      });
      expect(mockPush.mock.calls).toEqual([
        [`/exercises/${copy!.id}`],
        [{ pathname: '/exercises/edit', params: { id: copy!.id } }],
      ]);
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
    expect(mockPush).toHaveBeenCalledTimes(2);
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

  describe('an exercise from the library', () => {
    beforeEach(() => {
      mockId = 'shared';
      mockLibrary.get.mockResolvedValue(
        buildExercise({ id: 'shared', ownerId: 'anna', sport: 'soccer', title: 'Rondo' }),
      );
    });

    const answerPrompt = async (button: string, answer: string) => {
      const alert = jest.spyOn(Alert, 'alert');
      fireEvent.press(await screen.findByText(button));
      await act(async () => {
        alert.mock.lastCall?.[2]?.find(option => option.text === answer)?.onPress?.();
      });
      return alert;
    };

    it('is fetched from the library when it is not on this device', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      expect(await screen.findByText('Rondo')).toBeTruthy();
      expect(mockLibrary.get).toHaveBeenCalledWith('shared');
      expect(screen.queryByText('Edit')).toBeNull();
    });

    it('can be copied into your own exercises, starting private', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Clone'));
      await act(async () => {});

      const copy = (await exerciseRepository.list()).find(e => e.clonedFromId === 'shared');
      expect(copy?.visibility).toBe('private');
    });

    it('can be reported after confirming, which takes you back', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      const alert = await answerPrompt('Report', 'Report');

      expect(alert.mock.lastCall?.[0]).toBe('Report this exercise?');
      expect(mockLibrary.report).toHaveBeenCalledWith('shared');
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('is not reported when you cancel', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      await answerPrompt('Report', 'Cancel');

      expect(mockLibrary.report).not.toHaveBeenCalled();
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('says so when the report cannot be sent, and stays', async () => {
      mockLibrary.report.mockRejectedValue(new LibraryError('offline'));
      renderExerciseScreen(<ExerciseDetailScreen />);

      await answerPrompt('Report', 'Report');

      expect(screen.getByText('Could not send the report. Please try again.')).toBeTruthy();
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('lets you block its author after confirming', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      const alert = await answerPrompt('Block this coach', 'Block');

      expect(alert.mock.lastCall?.[0]).toBe('Block this coach?');
      expect(mockLibrary.block).toHaveBeenCalledWith('anna');
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('says so when the library cannot be reached', async () => {
      mockLibrary.get.mockRejectedValue(new LibraryError('offline'));

      renderExerciseScreen(<ExerciseDetailScreen />);

      expect(await screen.findByText('Could not load the exercise. Check your connection and try again.')).toBeTruthy();
    });
  });

  it('offers Report and Block on another coach\'s shared exercise that is also on this device', async () => {
    // A second coach used this phone, and signing out keeps their exercises here
    mockId = 'theirs';
    await exerciseRepository.save(
      buildExercise({ id: 'theirs', ownerId: 'other-account', sport: 'soccer', title: 'Their drill', visibility: 'public' }),
    );
    renderExerciseScreen(<ExerciseDetailScreen />);
    await screen.findByText('Their drill');

    expect(screen.getByText('Report')).toBeTruthy();
    expect(screen.getByText('Block this coach')).toBeTruthy();
  });

  it('offers no Report on another coach\'s private exercise, as the server only knows it by link', async () => {
    mockId = 'theirs';
    await exerciseRepository.save(
      buildExercise({ id: 'theirs', ownerId: 'other-account', sport: 'soccer', title: 'Their drill', visibility: 'private' }),
    );
    renderExerciseScreen(<ExerciseDetailScreen />);
    await screen.findByText('Their drill');

    expect(screen.queryByText('Report')).toBeNull();
  });

  it('offers no Report or Block on your own exercise', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);
    await screen.findByText('Triangle passing');

    expect(screen.queryByText('Report')).toBeNull();
    expect(screen.queryByText('Block this coach')).toBeNull();
  });

  describe('a copy', () => {
    beforeEach(async () => {
      await exerciseRepository.save(
        buildExercise({ id: 'copy', ownerId: await getCurrentUserId(), title: 'Rondo (copy)', clonedFromId: 'original' }),
      );
      mockId = 'copy';
    });

    it('links to the exercise it was copied from on this device', async () => {
      await exerciseRepository.save(buildExercise({ id: 'original', title: 'Rondo' }));
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Rondo'));

      expect(screen.getByText('Copied from')).toBeTruthy();
      expect(mockPush).toHaveBeenCalledWith('/exercises/original');
    });

    it('links to the original on the server when it is not on this device', async () => {
      mockLibrary.get.mockResolvedValue(buildExercise({ id: 'original', ownerId: 'anna', title: 'Rondo' }));
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Rondo'));

      expect(mockLibrary.get).toHaveBeenCalledWith('original');
      expect(mockPush).toHaveBeenCalledWith('/exercises/original');
    });

    it('says so, without a link, when the original has been removed', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('An exercise that no longer exists'));

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('still links to the original when it cannot be looked up', async () => {
      mockLibrary.get.mockRejectedValue(new LibraryError('offline'));
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Open the original'));

      expect(mockPush).toHaveBeenCalledWith('/exercises/original');
    });

    it('shows the copy itself even when the original cannot be looked up', async () => {
      mockLibrary.get.mockRejectedValue(new LibraryError('offline'));
      renderExerciseScreen(<ExerciseDetailScreen />);

      expect(await screen.findByText('Rondo (copy)')).toBeTruthy();
    });
  });

  it('shows no origin for an exercise that is not a copy', async () => {
    renderExerciseScreen(<ExerciseDetailScreen />);
    await screen.findByText('Triangle passing');

    expect(screen.queryByText('Copied from')).toBeNull();
    expect(mockLibrary.get).not.toHaveBeenCalled();
  });

  describe('favourites', () => {
    beforeEach(() => {
      mockId = 'shared';
      mockLibrary.get.mockResolvedValue(
        buildExercise({ id: 'shared', ownerId: 'anna', sport: 'soccer', title: 'Rondo' }),
      );
      mockLibrary.getFavorite.mockResolvedValue({ favoriteCount: 4, favorited: false });
    });

    it('shows how many coaches saved it', async () => {
      renderExerciseScreen(<ExerciseDetailScreen />);

      expect(await screen.findByText('Saved by 4 coaches')).toBeTruthy();
      expect(mockLibrary.getFavorite).toHaveBeenCalledWith('shared');
    });

    it('saves it as a favourite, showing the new count', async () => {
      mockLibrary.setFavorite.mockResolvedValue({ favoriteCount: 5, favorited: true });
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Add to favourites'));

      expect(await screen.findByText('Remove from favourites')).toBeTruthy();
      expect(screen.getByText('Saved by 5 coaches')).toBeTruthy();
      expect(mockLibrary.setFavorite).toHaveBeenCalledWith('shared', true);
    });

    it('removes it from your favourites', async () => {
      mockLibrary.getFavorite.mockResolvedValue({ favoriteCount: 1, favorited: true });
      mockLibrary.setFavorite.mockResolvedValue({ favoriteCount: 0, favorited: false });
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Remove from favourites'));

      expect(await screen.findByText('Add to favourites')).toBeTruthy();
      expect(mockLibrary.setFavorite).toHaveBeenCalledWith('shared', false);
      expect(screen.queryByText(/^Saved by/)).toBeNull();
    });

    it('says so when it cannot be saved, and keeps how it was', async () => {
      mockLibrary.setFavorite.mockRejectedValue(new LibraryError('offline'));
      renderExerciseScreen(<ExerciseDetailScreen />);

      fireEvent.press(await screen.findByText('Add to favourites'));

      expect(await screen.findByText('Could not update your favourites.')).toBeTruthy();
      expect(screen.getByText('Add to favourites')).toBeTruthy();
      expect(screen.getByText('Saved by 4 coaches')).toBeTruthy();
    });

    it('offers nothing when the server cannot say, and still shows the exercise', async () => {
      mockLibrary.getFavorite.mockRejectedValue(new LibraryError('signedOut'));
      renderExerciseScreen(<ExerciseDetailScreen />);

      expect(await screen.findByText('Rondo')).toBeTruthy();
      expect(screen.queryByTestId('toggle-favorite')).toBeNull();
    });

    it('lets the author see the count of their own exercise, but not save it', async () => {
      mockId = 'exercise-1';
      mockLibrary.getFavorite.mockResolvedValue({ favoriteCount: 1, favorited: false });
      renderExerciseScreen(<ExerciseDetailScreen />);

      expect(await screen.findByText('Saved by 1 coach')).toBeTruthy();
      expect(screen.queryByTestId('toggle-favorite')).toBeNull();
    });
  });
});
