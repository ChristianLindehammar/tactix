import { filterExercises } from '../filterExercises';
import { buildExercise } from '@/test-utils/exerciseFixture';

const ids = (exercises: { id: string }[]) => exercises.map(e => e.id);

describe('filterExercises', () => {
  it('returns everything for an empty filter, most recently edited first', () => {
    const older = buildExercise({ id: 'older', updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = buildExercise({ id: 'newer', updatedAt: '2026-06-01T00:00:00.000Z' });

    expect(ids(filterExercises([older, newer], {}))).toEqual(['newer', 'older']);
  });

  it('keeps only the chosen sport', () => {
    const floorball = buildExercise({ id: 'floorball', sport: 'floorball' });
    const hockey = buildExercise({ id: 'hockey', sport: 'hockey' });

    expect(ids(filterExercises([floorball, hockey], { sport: 'hockey' }))).toEqual(['hockey']);
  });

  it('matches any of the chosen focus tags', () => {
    const passing = buildExercise({ id: 'passing', focus: ['passing'] });
    const defence = buildExercise({ id: 'defence', focus: ['defence', 'transition'] });
    const shooting = buildExercise({ id: 'shooting', focus: ['shooting'] });

    const result = filterExercises([passing, defence, shooting], { focus: ['passing', 'defence'] });

    expect(ids(result).sort()).toEqual(['defence', 'passing']);
  });

  it('matches any of the chosen difficulties', () => {
    const easy = buildExercise({ id: 'easy', difficulty: 1 });
    const middle = buildExercise({ id: 'middle', difficulty: 3 });
    const hard = buildExercise({ id: 'hard', difficulty: 5 });

    const result = filterExercises([easy, middle, hard], { difficulties: [1, 5] });

    expect(ids(result).sort()).toEqual(['easy', 'hard']);
  });

  it('keeps only the chosen phase', () => {
    const warmup = buildExercise({ id: 'warmup', phase: 'warmup' });
    const game = buildExercise({ id: 'game', phase: 'game' });

    expect(ids(filterExercises([warmup, game], { phase: 'game' }))).toEqual(['game']);
  });

  describe('player count', () => {
    const ranged = buildExercise({ id: 'ranged', minPlayers: 6, maxPlayers: 10 });
    const noMax = buildExercise({ id: 'noMax', minPlayers: 8, maxPlayers: null });
    const noLimit = buildExercise({ id: 'noLimit', minPlayers: null, maxPlayers: null });
    const all = [ranged, noMax, noLimit];

    it.each([
      [6, ['noLimit', 'ranged']],
      [10, ['noLimit', 'noMax', 'ranged']],
      [11, ['noLimit', 'noMax']],
      [4, ['noLimit']],
    ])('with %i players keeps exercises whose range fits', (playerCount, expected) => {
      expect(ids(filterExercises(all, { playerCount })).sort()).toEqual(expected);
    });
  });

  describe('text search', () => {
    const exercise = buildExercise({
      title: 'Snabba Passningar',
      description: 'Övning med två bollar',
      customTags: ['U12'],
    });

    it.each([
      ['title, in any case', 'passningar'],
      ['description, with Swedish letters', 'ÖVNING'],
      ['custom tags', 'u12'],
      ['surrounding spaces ignored', '  bollar  '],
    ])('finds text in %s', (_where, search) => {
      expect(filterExercises([exercise], { search })).toHaveLength(1);
    });

    it('finds nothing for text that is not there', () => {
      expect(filterExercises([exercise], { search: 'skott' })).toEqual([]);
    });

    it('treats a blank search as no search', () => {
      expect(filterExercises([exercise], { search: '   ' })).toHaveLength(1);
    });
  });

  describe('minimum rating', () => {
    it('keeps exercises rated at least the minimum and hides unrated ones', () => {
      const great = buildExercise({ id: 'great' });
      const exact = buildExercise({ id: 'exact' });
      const poor = buildExercise({ id: 'poor' });
      const unrated = buildExercise({ id: 'unrated' });

      const result = filterExercises([great, exact, poor, unrated], {
        minRating: 4,
        ratings: { great: 5, exact: 4, poor: 3 },
      });

      expect(ids(result).sort()).toEqual(['exact', 'great']);
    });
  });

  describe('sorting', () => {
    it('puts the easiest first and the latest edit first within a level', () => {
      const elite = buildExercise({ id: 'elite', difficulty: 5, updatedAt: '2026-09-01T00:00:00.000Z' });
      const olderEasy = buildExercise({ id: 'olderEasy', difficulty: 1, updatedAt: '2026-01-01T00:00:00.000Z' });
      const newerEasy = buildExercise({ id: 'newerEasy', difficulty: 1, updatedAt: '2026-06-01T00:00:00.000Z' });

      const result = filterExercises([elite, olderEasy, newerEasy], { sort: 'difficulty' });

      expect(ids(result)).toEqual(['newerEasy', 'olderEasy', 'elite']);
    });

    it('sorts titles by the rules of the language', () => {
      const exercises = ['Öppen yta', 'Zon', 'Ärlig', 'anfall'].map(title =>
        buildExercise({ id: title, title }),
      );

      const result = filterExercises(exercises, { sort: 'title', locale: 'sv' });

      expect(ids(result)).toEqual(['anfall', 'Zon', 'Ärlig', 'Öppen yta']);
    });

    it('puts the highest rated first, unrated last, and the latest edit first within a tie', () => {
      const unrated = buildExercise({ id: 'unrated', updatedAt: '2026-09-01T00:00:00.000Z' });
      const low = buildExercise({ id: 'low', updatedAt: '2026-08-01T00:00:00.000Z' });
      const olderTop = buildExercise({ id: 'olderTop', updatedAt: '2026-01-01T00:00:00.000Z' });
      const newerTop = buildExercise({ id: 'newerTop', updatedAt: '2026-06-01T00:00:00.000Z' });

      const result = filterExercises([unrated, low, olderTop, newerTop], {
        sort: 'rating',
        ratings: { low: 2, olderTop: 5, newerTop: 5 },
      });

      expect(ids(result)).toEqual(['newerTop', 'olderTop', 'low', 'unrated']);
    });
  });

  it('applies every filter together', () => {
    const match = buildExercise({ id: 'match', sport: 'hockey', difficulty: 3 });
    const wrongSport = buildExercise({ id: 'wrongSport', sport: 'bandy', difficulty: 3 });
    const wrongDifficulty = buildExercise({ id: 'wrongDifficulty', sport: 'hockey', difficulty: 1 });

    const result = filterExercises([match, wrongSport, wrongDifficulty], {
      sport: 'hockey',
      difficulties: [3],
    });

    expect(ids(result)).toEqual(['match']);
  });
});
