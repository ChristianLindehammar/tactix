import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import ExerciseLibraryScreen from '@/app/(tabs)/exercises/index';
import { getCurrentUserId } from '@/services/currentUser';
import { ratingRepository } from '@/services/exerciseRatings';
import { exerciseRepository } from '@/services/exerciseRepository';
import { library, LibraryError } from '@/services/library';
import { buildExercise } from '@/test-utils/exerciseFixture';
import { renderExerciseScreen } from '@/test-utils/renderExerciseScreen';

const mockPush = jest.fn();
// Coming back to the screen runs its focus effects again, as the navigator does
const mockFocusEffects = new Set<() => void>();
const refocus = () => mockFocusEffects.forEach(effect => effect());

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (effect: () => void) => {
      mockFocusEffects.add(effect);
      useEffect(effect, [effect]);
    },
  };
});
jest.mock('expo-router/js-tabs', () => ({ useBottomTabBarHeight: () => 0 }));
// The server is the boundary: the library service's own tests cover the requests
jest.mock('@/services/library', () => ({
  ...jest.requireActual('@/services/library'),
  library: { list: jest.fn() },
}));
const mockList = library.list as jest.Mock;

const saved = async (overrides: Parameters<typeof buildExercise>[0]) =>
  exerciseRepository.save(
    buildExercise({ ownerId: await getCurrentUserId(), sport: 'soccer', ...overrides }),
  );

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
    expect(screen.getByText('Defence')).toBeTruthy();
  });

  it('shows your rating on rated exercises only', async () => {
    await saved({ id: 'rated', title: 'Rated drill' });
    await saved({ id: 'unrated', title: 'Unrated drill' });
    await ratingRepository.setMine('rated', 4);

    renderExerciseScreen(<ExerciseLibraryScreen />);
    await screen.findByText('Rated drill');

    expect(screen.getAllByText('★ 4')).toHaveLength(1);
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

      fireEvent.press(screen.getByTestId('toggle-filters'));
      fireEvent.press(screen.getByTestId('filter-focus-defence'));

      expect(screen.getByText('Defending drill')).toBeTruthy();
      expect(screen.queryByText('Passing drill')).toBeNull();
    });

    it('narrows the list by difficulty', async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');

      fireEvent.press(screen.getByTestId('toggle-filters'));
      fireEvent.press(screen.getByTestId('filter-difficulty-1'));

      expect(screen.getByText('Passing drill')).toBeTruthy();
      expect(screen.queryByText('Defending drill')).toBeNull();
    });

    it('narrows the list by phase', async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');

      fireEvent.press(screen.getByTestId('toggle-filters'));
      fireEvent.press(screen.getByTestId('filter-phase-cooldown'));

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

    it('narrows the list to a minimum rating, and clears it with the other filters', async () => {
      await saved({ id: 'a', title: 'Top drill' });
      await saved({ id: 'b', title: 'Weak drill' });
      await saved({ id: 'c', title: 'Unrated drill' });
      await ratingRepository.setMine('a', 5);
      await ratingRepository.setMine('b', 2);

      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Top drill');

      fireEvent.press(screen.getByTestId('toggle-filters'));
      fireEvent.press(screen.getByTestId('filter-rating-4'));

      expect(screen.getByText('Top drill')).toBeTruthy();
      expect(screen.queryByText('Weak drill')).toBeNull();
      expect(screen.queryByText('Unrated drill')).toBeNull();

      fireEvent.press(screen.getByText('Clear filters'));

      expect(screen.getByText('Weak drill')).toBeTruthy();
      expect(screen.getByText('Unrated drill')).toBeTruthy();
    });

    it('brings everything back when filters are cleared', async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');
      fireEvent.press(screen.getByTestId('toggle-filters'));
      fireEvent.press(screen.getByTestId('filter-focus-defence'));

      fireEvent.press(screen.getByText('Clear filters'));

      expect(screen.getByText('Passing drill')).toBeTruthy();
      expect(screen.getByText('Defending drill')).toBeTruthy();
    });
  });

  describe('filter panel', () => {
    it('keeps the filters out of the way until they are asked for', async () => {
      await saved({ title: 'Passing drill' });

      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');
      expect(screen.queryByTestId('filter-focus-passing')).toBeNull();

      fireEvent.press(screen.getByTestId('toggle-filters'));
      expect(screen.getByTestId('filter-focus-passing')).toBeTruthy();

      fireEvent.press(screen.getByTestId('toggle-filters'));
      expect(screen.queryByTestId('filter-focus-passing')).toBeNull();
    });

    it('keeps filters working and counted while the panel is closed', async () => {
      await saved({ id: 'a', title: 'Passing drill', focus: ['passing'], difficulty: 1 });
      await saved({ id: 'b', title: 'Defending drill', focus: ['defence'], difficulty: 1 });

      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');
      expect(screen.getByText('Filters')).toBeTruthy();

      fireEvent.press(screen.getByTestId('toggle-filters'));
      fireEvent.press(screen.getByTestId('filter-focus-passing'));
      fireEvent.press(screen.getByTestId('filter-difficulty-1'));
      fireEvent.press(screen.getByTestId('toggle-filters'));

      expect(screen.getByText('Filters (2)')).toBeTruthy();
      expect(screen.queryByText('Defending drill')).toBeNull();

      fireEvent.press(screen.getByText('Clear filters'));

      expect(screen.getByText('Filters')).toBeTruthy();
      expect(screen.getByText('Defending drill')).toBeTruthy();
    });

    it('stays out of the way of sorting, which is always available', async () => {
      await saved({ title: 'Passing drill' });

      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Passing drill');

      expect(screen.getByTestId('sort-rating')).toBeTruthy();
    });
  });

  describe('sorting', () => {
    const titlesInOrder = () =>
      screen.getAllByText(/ drill$/).map(element => element.props.children);

    it('reorders the list when a sort option is pressed, and back again', async () => {
      await saved({ id: 'a', title: 'Older top drill', updatedAt: '2026-01-01T00:00:00.000Z' });
      await saved({ id: 'b', title: 'Newer unrated drill', updatedAt: '2026-06-01T00:00:00.000Z' });
      await ratingRepository.setMine('a', 5);

      renderExerciseScreen(<ExerciseLibraryScreen />);
      await screen.findByText('Older top drill');
      expect(titlesInOrder()).toEqual(['Newer unrated drill', 'Older top drill']);

      fireEvent.press(screen.getByTestId('sort-rating'));
      expect(titlesInOrder()).toEqual(['Older top drill', 'Newer unrated drill']);

      fireEvent.press(screen.getByTestId('sort-updated'));
      expect(titlesInOrder()).toEqual(['Newer unrated drill', 'Older top drill']);
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

  it('announces exercises and clear filters as buttons', async () => {
    await saved({ title: 'Open me' });
    renderExerciseScreen(<ExerciseLibraryScreen />);
    await screen.findByText('Open me');

    expect(screen.getByRole('button', { name: /Open me/ })).toBeTruthy();

    fireEvent.press(screen.getByTestId('toggle-filters'));
    fireEvent.press(screen.getByTestId('filter-focus-defence'));

    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeTruthy();
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

  describe('the shared library', () => {
    const entry = (overrides: Parameters<typeof buildExercise>[0], authorName: string | null = 'Coach Anna') => ({
      exercise: buildExercise({ ownerId: 'anna', sport: 'soccer', ...overrides }),
      authorName,
    });

    beforeEach(() => {
      mockList.mockReset();
      mockList.mockResolvedValue({ entries: [entry({ id: 'shared', title: 'Rondo' })], total: 1 });
    });

    const openLibrary = async () => {
      renderExerciseScreen(<ExerciseLibraryScreen />);
      fireEvent.press(await screen.findByTestId('source-library'));
    };

    it('shows every coach\'s public exercises for the selected sport, with their author', async () => {
      await openLibrary();

      expect(await screen.findByText('Rondo')).toBeTruthy();
      expect(screen.getByText('By Coach Anna')).toBeTruthy();
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ sport: 'soccer' }));
    });

    it('asks for exercises in the language the app is shown in', async () => {
      await openLibrary();

      await waitFor(() =>
        expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ language: 'en' })),
      );
    });

    it('leaves out the author line when they chose no name', async () => {
      mockList.mockResolvedValue({ entries: [entry({ title: 'Rondo' }, null)], total: 1 });

      await openLibrary();

      await screen.findByText('Rondo');
      expect(screen.queryByText(/^By /)).toBeNull();
    });

    it('asks the server again when a filter changes', async () => {
      await openLibrary();
      await screen.findByText('Rondo');

      fireEvent.press(screen.getByTestId('toggle-filters'));
      fireEvent.press(screen.getByTestId('filter-focus-defence'));

      await waitFor(() =>
        expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ focus: ['defence'] })),
      );
    });

    it('offers no rating filter or sort, as ratings are not shared yet', async () => {
      await openLibrary();
      await screen.findByText('Rondo');
      fireEvent.press(screen.getByTestId('toggle-filters'));

      expect(screen.queryByTestId('filter-rating-4')).toBeNull();
      expect(screen.queryByTestId('sort-rating')).toBeNull();
    });

    it('opens an exercise from the library', async () => {
      await openLibrary();

      fireEvent.press(await screen.findByText('Rondo'));

      expect(mockPush).toHaveBeenCalledWith('/exercises/shared');
    });

    it('loads more when there are more than one page', async () => {
      mockList
        .mockResolvedValueOnce({ entries: [entry({ id: 'one', title: 'First' })], total: 2 })
        .mockResolvedValueOnce({ entries: [entry({ id: 'two', title: 'Second' })], total: 2 });
      await openLibrary();
      await screen.findByText('First');

      fireEvent.press(screen.getByText('Show more'));

      expect(await screen.findByText('Second')).toBeTruthy();
      expect(screen.getByText('First')).toBeTruthy();
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 1 }));
      expect(screen.queryByText('Show more')).toBeNull();
    });

    it('says when the library cannot be reached, and tries again', async () => {
      mockList.mockRejectedValueOnce(new LibraryError('offline'));
      await openLibrary();

      fireEvent.press(await screen.findByText('Try again'));

      expect(await screen.findByText('Rondo')).toBeTruthy();
    });

    it('asks the server again when you come back, so a reported exercise is gone', async () => {
      await openLibrary();
      await screen.findByText('Rondo');
      mockList.mockResolvedValue({ entries: [], total: 0 });

      await act(async () => refocus());

      expect(await screen.findByText('No shared exercises for this sport yet.')).toBeTruthy();
      expect(screen.queryByText('Rondo')).toBeNull();
    });

    it('goes back to your own exercises', async () => {
      await saved({ title: 'My drill' });
      await openLibrary();
      await screen.findByText('Rondo');

      fireEvent.press(screen.getByTestId('source-mine'));

      expect(await screen.findByText('My drill')).toBeTruthy();
      expect(screen.queryByText('Rondo')).toBeNull();
    });
  });
});
