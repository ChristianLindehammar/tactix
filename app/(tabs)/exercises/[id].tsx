import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StepTabs } from '@/components/StepTabs';
import { TacticsBoard } from '@/components/TacticsBoard';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { StarRating } from '@/components/StarRating';
import { getCurrentUserId } from '@/services/currentUser';
import { ratingRepository } from '@/services/exerciseRatings';
import { exerciseRepository } from '@/services/exerciseRepository';
import { library } from '@/services/library';
import { Exercise, RatingStars } from '@/types/exercise';
import { cloneExercise } from '@/utils/cloneExercise';
import { describeExercise } from '@/utils/describeExercise';

const noop = () => {};

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

  // Reloads on return from the editor, so edits show straight away
  useFocusEffect(
    useCallback(() => {
      let active = true;
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

  // The exercise may have reloaded with fewer steps
  const step = exercise.frames[stepIndex] ?? exercise.frames[0];

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
    >
      <Stack.Screen options={{ title: '' }} />

      <ThemedText type="title">{exercise.title}</ThemedText>
      <ThemedText style={styles.summary}>{describeExercise(exercise, t)}</ThemedText>

      {exercise.frames.length > 1 && (
        <StepTabs count={exercise.frames.length} selected={stepIndex} onSelect={setStepIndex} />
      )}
      <View style={styles.diagram}>
        <TacticsBoard
          sport={exercise.sport}
          value={step.markers}
          onChange={noop}
          readOnly
          requireBall={false}
        />
      </View>
      {step.note ? <ThemedText>{step.note}</ThemedText> : null}

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">{t('yourRating')}</ThemedText>
        <StarRating value={rating} onChange={rate} />
      </View>

      {exercise.focus.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('trainingFocus')}</ThemedText>
          <ThemedText>{exercise.focus.map(tag => t(`focusTags.${tag}`)).join(', ')}</ThemedText>
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
          {exercise.coachingPoints.map((point, index) => (
            <ThemedText key={index}>{`• ${point}`}</ThemedText>
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

const styles = StyleSheet.create({
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
  diagram: {
    height: 360,
  },
  section: {
    gap: 4,
  },
  error: {
    color: '#D32F2F',
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
});
