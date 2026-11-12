import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/FilterChip';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { useSport } from '@/context/SportContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { ratingRepository } from '@/services/exerciseRatings';
import { exerciseRepository } from '@/services/exerciseRepository';
import { library, LibraryEntry, LibrarySort } from '@/services/library';
import {
  Exercise,
  EXERCISE_DIFFICULTIES,
  EXERCISE_PHASES,
  ExerciseDifficulty,
  ExercisePhase,
  FOCUS_TAGS,
  FocusTag,
  RatingStars,
} from '@/types/exercise';
import { describeExercise } from '@/utils/describeExercise';
import { sportKey } from '@/utils/sportWording';
import { EXERCISE_SORTS, ExerciseSort, filterExercises } from '@/utils/filterExercises';

const toggled = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter(existing => existing !== item) : [...list, item];

const MIN_RATING_OPTIONS: RatingStars[] = [3, 4, 5];
// Waits for typing to pause before asking the server
const LIBRARY_QUERY_DELAY_MS = 300;

type Source = 'mine' | 'library';
const SOURCES: Source[] = ['mine', 'library'];

interface LibraryState {
  status: 'loading' | 'ready' | 'failed';
  entries: LibraryEntry[];
  total: number;
}

export default function ExerciseLibraryScreen() {
  const { selectedSport } = useSport();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();

  const background = useThemeColor({}, 'background') as string;
  const cardBackground = useThemeColor({}, 'menuBackground') as string;
  const border = useThemeColor({}, 'borderColor') as string;
  const textColor = useThemeColor({}, 'text') as string;
  const tint = useThemeColor({}, 'tint') as string;

  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, RatingStars>>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [playerCount, setPlayerCount] = useState('');
  const [focus, setFocus] = useState<FocusTag[]>([]);
  const [difficulties, setDifficulties] = useState<ExerciseDifficulty[]>([]);
  const [phase, setPhase] = useState<ExercisePhase | undefined>();
  const [minRating, setMinRating] = useState<RatingStars | undefined>();
  const [sort, setSort] = useState<ExerciseSort>('updated');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [source, setSource] = useState<Source>('mine');
  const [shared, setShared] = useState<LibraryState>({ status: 'loading', entries: [], total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const latestQuery = useRef(0);

  const load = useCallback(async () => {
    try {
      const [loaded, myRatings] = await Promise.all([
        exerciseRepository.list(),
        ratingRepository.listMine(),
      ]);
      setExercises(loaded);
      setRatings(myRatings);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);


  const parsedPlayerCount = /^\d+$/.test(playerCount.trim()) ? Number(playerCount) : undefined;
  const hasFilters =
    search.trim() !== '' ||
    parsedPlayerCount !== undefined ||
    focus.length > 0 ||
    difficulties.length > 0 ||
    phase !== undefined ||
    minRating !== undefined;

  const forSport = useMemo(
    () => filterExercises(exercises ?? [], { sport: selectedSport ?? undefined }),
    [exercises, selectedSport],
  );
  const visible = filterExercises(forSport, {
    search,
    playerCount: parsedPlayerCount,
    focus,
    difficulties,
    phase,
    minRating,
    ratings,
    sort,
    locale,
  });

  const inLibrary = source === 'library';
  // Ratings are only on this device so far, so the server can't filter or sort by them
  const sorts = inLibrary ? EXERCISE_SORTS.filter(option => option !== 'rating') : EXERCISE_SORTS;
  const librarySort: LibrarySort = sort === 'rating' ? 'updated' : sort;
  const libraryFilter = useMemo(
    () => ({
      sport: selectedSport ?? undefined,
      focus,
      difficulties,
      phase,
      playerCount: parsedPlayerCount,
      search,
      sort: librarySort,
      // One language at a time, so a drill published in two languages isn't listed twice
      language: locale,
    }),
    [selectedSport, focus, difficulties, phase, parsedPlayerCount, search, librarySort, locale],
  );

  const loadLibrary = useCallback(async () => {
    const query = ++latestQuery.current;
    setShared(current => ({ ...current, status: 'loading' }));
    try {
      const page = await library.list(libraryFilter);
      if (query === latestQuery.current) setShared({ status: 'ready', ...page });
    } catch {
      if (query === latestQuery.current) setShared(current => ({ ...current, status: 'failed' }));
    }
  }, [libraryFilter]);

  useEffect(() => {
    if (!inLibrary) return;
    const timer = setTimeout(loadLibrary, LIBRARY_QUERY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [inLibrary, loadLibrary]);

  // Read on focus without making it rerun on every filter change, which the effect above handles
  const reloadLibraryOnFocus = useRef<(() => void) | null>(null);
  reloadLibraryOnFocus.current = inLibrary ? loadLibrary : null;

  // Coming back from an exercise picks up edits, deletions and reports
  useFocusEffect(
    useCallback(() => {
      load();
      reloadLibraryOnFocus.current?.();
    }, [load]),
  );

  const loadMore = async () => {
    const query = latestQuery.current;
    setLoadingMore(true);
    try {
      const page = await library.list({ ...libraryFilter, offset: shared.entries.length });
      if (query === latestQuery.current) {
        setShared(current => ({ ...current, entries: [...current.entries, ...page.entries], total: page.total }));
      }
    } catch {
      // The button stays, so the coach can try again
    } finally {
      setLoadingMore(false);
    }
  };

  const activeFilterCount =
    focus.length + difficulties.length + (phase ? 1 : 0) + (minRating && !inLibrary ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setPlayerCount('');
    setFocus([]);
    setDifficulties([]);
    setPhase(undefined);
    setMinRating(undefined);
  };

  const inputStyle = [styles.input, { borderColor: border, color: textColor }];

  const renderCard = (item: Exercise, authorName?: string | null) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/exercises/${item.id}`)}
      style={[styles.card, { backgroundColor: cardBackground, borderColor: border }]}
    >
      <View style={styles.cardTitle}>
        <ThemedText type="defaultSemiBold" style={styles.cardTitleText}>
          {item.title}
        </ThemedText>
        {ratings[item.id] && <ThemedText>{`★ ${ratings[item.id]}`}</ThemedText>}
      </View>
      {authorName ? (
        <ThemedText style={styles.cardDetail}>{t('byAuthor', { name: authorName })}</ThemedText>
      ) : null}
      <ThemedText style={styles.cardDetail}>{describeExercise(item, t)}</ThemedText>
      {item.focus.length > 0 && (
        <ThemedText style={styles.cardDetail}>
          {item.focus.map(tag => t(sportKey(`focusTags.${tag}`, item.sport))).join(', ')}
        </ThemedText>
      )}
    </Pressable>
  );

  const listPadding = {
    padding: 16,
    gap: 12,
    paddingBottom: 16 + (Platform.OS === 'ios' ? tabBarHeight : 0),
  };

  const renderLibrary = () => {
    if (shared.status === 'failed' && shared.entries.length === 0) {
      return (
        <View style={styles.message}>
          <ThemedText style={styles.messageText}>{t('libraryLoadFailed')}</ThemedText>
          <ThemedButton onPress={loadLibrary}>{t('tryAgain')}</ThemedButton>
        </View>
      );
    }
    if (shared.status === 'loading' && shared.entries.length === 0) {
      return <ActivityIndicator style={styles.message} />;
    }
    return (
      <FlatList
        data={shared.entries}
        keyExtractor={entry => entry.exercise.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={listPadding}
        ListEmptyComponent={
          <ThemedText style={styles.messageText}>
            {t(hasFilters ? 'noMatchingExercises' : 'libraryEmpty')}
          </ThemedText>
        }
        ListFooterComponent={
          shared.entries.length < shared.total ? (
            <ThemedButton disabled={loadingMore} onPress={loadMore}>
              {t('showMore')}
            </ThemedButton>
          ) : null
        }
        renderItem={({ item }) => renderCard(item.exercise, item.authorName)}
      />
    );
  };

  const renderBody = () => {
    if (inLibrary) return renderLibrary();
    if (loadFailed) {
      return (
        <View style={styles.message}>
          <ThemedText style={styles.messageText}>{t('exerciseLoadFailed')}</ThemedText>
          <ThemedButton onPress={load}>{t('tryAgain')}</ThemedButton>
        </View>
      );
    }
    if (exercises === null) return null;
    if (forSport.length === 0) {
      return (
        <View style={styles.message}>
          <ThemedText type="subtitle" style={styles.messageText}>
            {t('noExercises')}
          </ThemedText>
          <ThemedText style={styles.messageText}>{t('noExercisesHint')}</ThemedText>
        </View>
      );
    }
    return (
      <FlatList
        data={visible}
        keyExtractor={exercise => exercise.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={listPadding}
        ListEmptyComponent={
          <ThemedText style={styles.messageText}>{t('noMatchingExercises')}</ThemedText>
        }
        renderItem={({ item }) => renderCard(item)}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title">{t('exercises')}</ThemedText>
        <Pressable
          onPress={() => router.push('/exercises/edit')}
          accessibilityRole="button"
          accessibilityLabel={t('newExercise')}
          hitSlop={8}
        >
          <MaterialIcons name="add-circle" size={36} color={tint} />
        </Pressable>
      </View>

      <View style={styles.sourceRow}>
        {SOURCES.map(option => (
          <FilterChip
            key={option}
            label={t(option === 'mine' ? 'myExercises' : 'exerciseLibrary')}
            testID={`source-${option}`}
            selected={source === option}
            onPress={() => setSource(option)}
          />
        ))}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={[inputStyle, styles.searchInput]}
          placeholder={t('searchExercises')}
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        <TextInput
          style={[inputStyle, styles.playerInput]}
          placeholder={t('players')}
          accessibilityLabel={t('playerCountFilter')}
          placeholderTextColor="#888"
          keyboardType="number-pad"
          value={playerCount}
          onChangeText={setPlayerCount}
        />
      </View>

      <View style={styles.controlRow}>
        <FilterChip
          label={activeFilterCount > 0 ? t('filtersWithCount', { count: activeFilterCount }) : t('filters')}
          testID="toggle-filters"
          selected={filtersOpen}
          onPress={() => setFiltersOpen(current => !current)}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroll}
          contentContainerStyle={styles.sortChips}
          keyboardShouldPersistTaps="handled"
        >
          {sorts.map(option => (
            <FilterChip
              key={option}
              label={t(`exerciseSorts.${option}`)}
              testID={`sort-${option}`}
              selected={sort === option}
              onPress={() => setSort(option)}
            />
          ))}
        </ScrollView>
      </View>

      {filtersOpen && (
        <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {FOCUS_TAGS.map(tag => (
            <FilterChip
              key={tag}
              label={t(sportKey(`focusTags.${tag}`, selectedSport))}
              testID={`filter-focus-${tag}`}
              selected={focus.includes(tag)}
              onPress={() => setFocus(current => toggled(current, tag))}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {EXERCISE_DIFFICULTIES.map(level => (
            <FilterChip
              key={level}
              label={t(`difficultyLevels.${level}`)}
              testID={`filter-difficulty-${level}`}
              selected={difficulties.includes(level)}
              onPress={() => setDifficulties(current => toggled(current, level))}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {EXERCISE_PHASES.map(option => (
            <FilterChip
              key={option}
              label={t(`exercisePhases.${option}`)}
              testID={`filter-phase-${option}`}
              selected={phase === option}
              onPress={() => setPhase(current => (current === option ? undefined : option))}
            />
          ))}
        </ScrollView>

        {!inLibrary && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {MIN_RATING_OPTIONS.map(stars => (
            <FilterChip
              key={stars}
              label={t('minRatingOption', { stars })}
              testID={`filter-rating-${stars}`}
              selected={minRating === stars}
              onPress={() => setMinRating(current => (current === stars ? undefined : stars))}
            />
          ))}
        </ScrollView>
        )}
        </>
      )}

      {hasFilters && (
        <Pressable
          accessibilityRole="button"
          onPress={clearFilters}
          style={styles.clearFilters}
          hitSlop={8}
        >
          <ThemedText type="link">{t('clearFilters')}</ThemedText>
        </Pressable>
      )}

      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  searchInput: {
    flex: 2,
  },
  playerInput: {
    flex: 1,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chipRow: {
    gap: 8,
    paddingHorizontal: 16,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    marginBottom: 8,
  },
  sortScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sortChips: {
    gap: 8,
    paddingRight: 16,
  },
  clearFilters: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  body: {
    flex: 1,
  },
  message: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  messageText: {
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleText: {
    flex: 1,
  },
  cardDetail: {
    fontSize: 14,
    opacity: 0.75,
  },
});
