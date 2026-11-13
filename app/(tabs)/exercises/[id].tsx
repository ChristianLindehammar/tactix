import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLegend } from '@/components/ArrowLegend';
import { ExerciseDiagram } from '@/components/ExerciseDiagram';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { StarRating } from '@/components/StarRating';
import { getCurrentUserId } from '@/services/currentUser';
import { ratingRepository } from '@/services/exerciseRatings';
import { exerciseRepository } from '@/services/exerciseRepository';
import { FavoriteState, library } from '@/services/library';
import { Exercise, RatingStars } from '@/types/exercise';
import { cloneExercise } from '@/utils/cloneExercise';
import { describeExercise } from '@/utils/describeExercise';
import { sportKey } from '@/utils/sportWording';

/** Where a copy came from: its title, gone (deleted or hidden), or unknown when it couldn't be looked up. */
type Origin = { id: string } & ({ state: 'found'; title: string } | { state: 'gone' } | { state: 'unknown' });

// This device first, then the server, like the exercise itself. Never throws, as the copy matters more.
const findOrigin = async (id: string): Promise<Origin> => {
  try {
    const original = (await exerciseRepository.get(id)) ?? (await library.get(id));
    return original ? { id, state: 'found', title: original.title } : { id, state: 'gone' };
  } catch {
    return { id, state: 'unknown' };
  }
};

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, 'background') as string;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'failed' | 'libraryFailed'>(
    'loading',
  );
  const [fromLibrary, setFromLibrary] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState<RatingStars | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [origin, setOrigin] = useState<Origin | null>(null);
  // Null when the server can't say: signed out, offline, or an exercise only on this device
  const [favorite, setFavorite] = useState<FavoriteState | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  // Reloads on return from the editor, so edits show straight away
  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Apart from the exercise, which shows without it
      library.getFavorite(id).then(
        state => {
          if (active) setFavorite(state);
        },
        () => {
          if (active) setFavorite(null);
        },
      );
      // This device first, then the shared library, which is also where share links lead
      let localFailed = false;
      const found = exerciseRepository.get(id).then(
        async local =>
          local ? { exercise: local, fromLibrary: false } : { exercise: await library.get(id), fromLibrary: true },
        error => {
          localFailed = true;
          throw error;
        },
      );
      Promise.all([found, getCurrentUserId(), ratingRepository.getMine(id)])
        .then(([{ exercise: found, fromLibrary: shared }, me, myRating]) => {
          if (!active) return;
          setExercise(found);
          setFromLibrary(shared);
          setUserId(me);
          setRating(myRating);
          setStatus(found ? 'ready' : 'notFound');
          const originId = found?.clonedFromId;
          if (!originId) {
            setOrigin(null);
            return;
          }
          findOrigin(originId).then(result => {
            if (active) setOrigin(result);
          });
        })
        .catch(() => {
          if (active) setStatus(localFailed ? 'failed' : 'libraryFailed');
        });
      return () => {
        active = false;
      };
    }, [id]),
  );

  const confirmDelete = () =>
    Alert.alert(t('delete'), t('deleteExerciseConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          setFailure(null);
          try {
            await exerciseRepository.remove(id);
            router.back();
          } catch {
            setFailure(t('exerciseDeleteFailed'));
          }
        },
      },
    ]);

  const confirmThen = (title: string, message: string, confirm: string, action: () => Promise<void>, failed: string) =>
    Alert.alert(title, message, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: confirm,
        style: 'destructive',
        onPress: async () => {
          setFailure(null);
          try {
            await action();
            router.back();
          } catch {
            setFailure(t(failed));
          }
        },
      },
    ]);

  const confirmReport = () =>
    confirmThen(t('reportExerciseTitle'), t('reportExerciseMessage'), t('report'), () => library.report(id), 'reportFailed');

  const confirmBlock = (authorId: string) =>
    confirmThen(t('blockCoachTitle'), t('blockCoachMessage'), t('block'), () => library.block(authorId), 'blockFailed');

  const rate = async (stars: RatingStars | null) => {
    setFailure(null);
    try {
      await ratingRepository.setMine(id, stars);
      setRating(stars);
    } catch {
      setFailure(t('ratingSaveFailed'));
    }
  };

  const toggleFavorite = async () => {
    if (!favorite || favoriteBusy) return;
    setFailure(null);
    setFavoriteBusy(true);
    try {
      setFavorite(await library.setFavorite(id, !favorite.favorited));
    } catch {
      setFailure(t('favoriteSaveFailed'));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const clone = async () => {
    if (!exercise || !userId) return;
    setFailure(null);
    try {
      const copy = cloneExercise(exercise, {
        ownerId: userId,
        now: new Date().toISOString(),
        title: t('cloneTitle', { title: exercise.title }),
      });
      await exerciseRepository.save(copy);
      // The editor opens on top of the copy, so saving or leaving lands on the copy, which links back here
      router.push(`/exercises/${copy.id}`);
      router.push({ pathname: '/exercises/edit', params: { id: copy.id } });
    } catch {
      setFailure(t('exerciseCloneFailed'));
    }
  };

  if (status !== 'ready' || !exercise) {
    return (
      <ThemedView style={styles.message}>
        <Stack.Screen options={{ title: '' }} />
        {status === 'notFound' && <ThemedText>{t('exerciseNotFound')}</ThemedText>}
        {status === 'failed' && <ThemedText>{t('exerciseLoadFailed')}</ThemedText>}
        {status === 'libraryFailed' && <ThemedText>{t('libraryExerciseLoadFailed')}</ThemedText>}
      </ThemedView>
    );
  }

  const mine = exercise.ownerId === userId;
  // Editing and deleting work on this device's copy, which a library exercise doesn't have
  const editable = mine && !fromLibrary;
  const authorId = exercise.ownerId;
  // Anything the server can show another coach can be reported: a shared exercise, even when this
  // device holds a copy because its author once used it, or one opened from the server by link
  const reportable = !mine && (fromLibrary || exercise.visibility === 'public');

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
    >
      <Stack.Screen options={{ title: '' }} />

      <ThemedText type="title">{exercise.title}</ThemedText>
      <ThemedText style={styles.summary}>{describeExercise(exercise, t)}</ThemedText>

      <ExerciseDiagram
        sport={exercise.sport}
        steps={exercise.frames}
        selected={stepIndex}
        onSelect={setStepIndex}
      />
      <ArrowLegend frames={exercise.frames} sport={exercise.sport} />

      {favorite && !mine && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: favorite.favorited, disabled: favoriteBusy }}
          disabled={favoriteBusy}
          onPress={toggleFavorite}
          style={styles.favoriteButton}
          testID="toggle-favorite"
          hitSlop={8}
        >
          <MaterialIcons
            name={favorite.favorited ? 'favorite' : 'favorite-border'}
            size={28}
            color={FAVORITE_COLOR}
          />
          <ThemedText>{t(favorite.favorited ? 'removeFavorite' : 'addFavorite')}</ThemedText>
        </Pressable>
      )}
      {favorite && favorite.favoriteCount > 0 && (
        <ThemedText style={styles.summary}>{t('favoriteCount', { count: favorite.favoriteCount })}</ThemedText>
      )}

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">{t('yourRating')}</ThemedText>
        <StarRating value={rating} onChange={rate} />
      </View>

      {origin && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('copiedFrom')}</ThemedText>
          {origin.state === 'gone' ? (
            <ThemedText>{t('copiedFromGone')}</ThemedText>
          ) : (
            <ThemedText
              type="link"
              accessibilityRole="link"
              style={styles.link}
              onPress={() => router.push(`/exercises/${origin.id}`)}
            >
              {origin.state === 'found' ? origin.title : t('openOriginal')}
            </ThemedText>
          )}
        </View>
      )}

      {exercise.focus.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('trainingFocus')}</ThemedText>
          <ThemedText>{exercise.focus.map(tag => t(sportKey(`focusTags.${tag}`, exercise.sport))).join(', ')}</ThemedText>
        </View>
      )}

      {exercise.description !== '' && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('exerciseDescription')}</ThemedText>
          <ThemedText>{exercise.description}</ThemedText>
        </View>
      )}

      {exercise.coachingPoints.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('coachingPoints')}</ThemedText>
          {exercise.coachingPoints.map(point => (
            <ThemedText key={point.id}>{`• ${point.text}`}</ThemedText>
          ))}
        </View>
      )}

      {exercise.customTags.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('customTags')}</ThemedText>
          <ThemedText>{exercise.customTags.join(', ')}</ThemedText>
        </View>
      )}

      {failure && <ThemedText style={styles.error}>{failure}</ThemedText>}

      {editable && (
        <ThemedButton
          onPress={() => router.push({ pathname: '/exercises/edit', params: { id: exercise.id } })}
        >
          {t('edit')}
        </ThemedButton>
      )}
      <ThemedButton onPress={clone}>{t('clone')}</ThemedButton>
      {editable && (
        <ThemedButton onPress={confirmDelete} style={styles.deleteButton}>
          {t('delete')}
        </ThemedButton>
      )}
      {reportable && (
        <>
          <ThemedButton onPress={confirmReport}>{t('report')}</ThemedButton>
          {authorId && <ThemedButton onPress={() => confirmBlock(authorId)}>{t('blockCoach')}</ThemedButton>}
        </>
      )}
    </ScrollView>
  );
}

const FAVORITE_COLOR = '#E53935';

const styles = StyleSheet.create({
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summary: {
    opacity: 0.75,
  },
  section: {
    gap: 4,
  },
  link: {
    // Only the title opens the original, not the whole row
    alignSelf: 'flex-start',
  },
  error: {
    color: '#D32F2F',
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
});
