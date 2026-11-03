import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
import { filterExercises } from '@/utils/filterExercises';

const toggled = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter(existing => existing !== item) : [...list, item];

export default function ExerciseLibraryScreen() {
  const { selectedSport } = useSport();
  const router = useRouter();
  const { t } = useTranslation();
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const parsedPlayerCount = /^\d+$/.test(playerCount.trim()) ? Number(playerCount) : undefined;
  const hasFilters =
    search.trim() !== '' ||
    parsedPlayerCount !== undefined ||
    focus.length > 0 ||
    difficulties.length > 0 ||
    phase !== undefined;

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
  });

  const clearFilters = () => {
    setSearch('');
    setPlayerCount('');
    setFocus([]);
    setDifficulties([]);
    setPhase(undefined);
  };

  const inputStyle = [styles.input, { borderColor: border, color: textColor }];

  const renderBody = () => {
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
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: 16 + (Platform.OS === 'ios' ? tabBarHeight : 0),
        }}
        ListEmptyComponent={
          <ThemedText style={styles.messageText}>{t('noMatchingExercises')}</ThemedText>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/exercises/${item.id}`)}
            style={[styles.card, { backgroundColor: cardBackground, borderColor: border }]}
          >
            <View style={styles.cardTitle}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitleText}>
                {item.title}
              </ThemedText>
              {ratings[item.id] && <ThemedText>{`★ ${ratings[item.id]}`}</ThemedText>}
            </View>
            <ThemedText style={styles.cardDetail}>{describeExercise(item, t)}</ThemedText>
            {item.focus.length > 0 && (
              <ThemedText style={styles.cardDetail}>
                {item.focus.map(tag => t(`focusTags.${tag}`)).join(', ')}
              </ThemedText>
            )}
          </Pressable>
        )}
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
            label={t(`focusTags.${tag}`)}
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

      {hasFilters && (
        <Pressable onPress={clearFilters} style={styles.clearFilters} hitSlop={8}>
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
