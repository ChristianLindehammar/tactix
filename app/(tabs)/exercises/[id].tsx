import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TacticsBoard } from '@/components/TacticsBoard';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { exerciseRepository } from '@/services/exerciseRepository';
import { Exercise } from '@/types/exercise';
import { describeExercise } from '@/utils/describeExercise';

const noop = () => {};

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, 'background') as string;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'failed'>('loading');
  const [deleteFailed, setDeleteFailed] = useState(false);

  // Reloads on return from the editor, so edits show straight away
  useFocusEffect(
    useCallback(() => {
      let active = true;
      exerciseRepository
        .get(id)
        .then(found => {
          if (!active) return;
          setExercise(found);
          setStatus(found ? 'ready' : 'notFound');
        })
        .catch(() => {
          if (active) setStatus('failed');
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
          setDeleteFailed(false);
          try {
            await exerciseRepository.remove(id);
            router.back();
          } catch {
            setDeleteFailed(true);
          }
        },
      },
    ]);

  if (status !== 'ready' || !exercise) {
    return (
      <ThemedView style={styles.message}>
        <Stack.Screen options={{ title: '' }} />
        {status === 'notFound' && <ThemedText>{t('exerciseNotFound')}</ThemedText>}
        {status === 'failed' && <ThemedText>{t('exerciseLoadFailed')}</ThemedText>}
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
    >
      <Stack.Screen options={{ title: '' }} />

      <ThemedText type="title">{exercise.title}</ThemedText>
      <ThemedText style={styles.summary}>{describeExercise(exercise, t)}</ThemedText>

      <View style={styles.diagram}>
        <TacticsBoard
          sport={exercise.sport}
          value={exercise.frames[0].markers}
          onChange={noop}
          readOnly
          requireBall={false}
        />
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

      {deleteFailed && <ThemedText style={styles.error}>{t('exerciseDeleteFailed')}</ThemedText>}

      <ThemedButton
        onPress={() => router.push({ pathname: '/exercises/edit', params: { id: exercise.id } })}
      >
        {t('edit')}
      </ThemedButton>
      <ThemedButton onPress={confirmDelete} style={styles.deleteButton}>
        {t('delete')}
      </ThemedButton>
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
