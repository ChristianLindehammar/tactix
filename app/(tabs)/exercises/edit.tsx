import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/FilterChip';
import { TacticsBoard } from '@/components/TacticsBoard';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSport } from '@/context/SportContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { exerciseRepository } from '@/services/exerciseRepository';
import { Exercise, EXERCISE_DIFFICULTIES, EXERCISE_PHASES, FOCUS_TAGS } from '@/types/exercise';
import {
  createDraft,
  draftFromExercise,
  DraftErrors,
  draftToExercise,
  ExerciseDraft,
} from '@/utils/exerciseDraft';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

const Field = ({ label, hint, error, containerStyle, ...input }: FieldProps) => {
  const border = useThemeColor({}, 'borderColor') as string;
  const textColor = useThemeColor({}, 'text') as string;

  return (
    <View style={[styles.field, containerStyle]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {hint && <ThemedText style={styles.hint}>{hint}</ThemedText>}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#888"
        style={[
          styles.input,
          { borderColor: error ? '#D32F2F' : border, color: textColor },
          input.multiline && styles.multiline,
        ]}
        {...input}
      />
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </View>
  );
};

export default function ExerciseEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedSport } = useSport();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, 'background') as string;

  const [existing, setExisting] = useState<Exercise | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound'>(id ? 'loading' : 'ready');
  const [draft, setDraft] = useState<ExerciseDraft>(createDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    exerciseRepository
      .get(id)
      .then(found => {
        if (!active) return;
        if (!found) {
          setStatus('notFound');
          return;
        }
        setExisting(found);
        setDraft(draftFromExercise(found));
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('notFound');
      });
    return () => {
      active = false;
    };
  }, [id]);

  const sport = existing?.sport ?? selectedSport;
  const update = (change: Partial<ExerciseDraft>) => setDraft(current => ({ ...current, ...change }));

  const save = async () => {
    if (saving.current || !sport) return;

    const result = draftToExercise(
      draft,
      { sport, locale, now: new Date().toISOString() },
      existing ?? undefined,
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    saving.current = true;
    setErrors({});
    setSaveFailed(false);
    try {
      await exerciseRepository.save(result.exercise);
      router.back();
    } catch {
      setSaveFailed(true);
    } finally {
      saving.current = false;
    }
  };

  const errorText = (field: keyof DraftErrors) =>
    errors[field] && t(`draftErrors.${errors[field]}`);

  const title = t(id ? 'editExercise' : 'newExercise');

  if (status !== 'ready' || !sport) {
    return (
      <ThemedView style={styles.message}>
        <Stack.Screen options={{ title }} />
        {status === 'notFound' && <ThemedText>{t('exerciseNotFound')}</ThemedText>}
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title }} />
      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 96 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label={t('exerciseTitle')}
          value={draft.title}
          onChangeText={value => update({ title: value })}
          error={errorText('title')}
        />

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('diagram')}</ThemedText>
          <View style={styles.preview}>
            <TacticsBoard
              sport={sport}
              value={draft.markers}
              onChange={markers => update({ markers })}
              readOnly
              requireBall={false}
            />
          </View>
          <ThemedButton onPress={() => setDiagramOpen(true)}>{t('editDiagram')}</ThemedButton>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('difficulty')}</ThemedText>
          <View style={styles.chips}>
            {EXERCISE_DIFFICULTIES.map(level => (
              <FilterChip
                key={level}
                label={t(`difficultyLevels.${level}`)}
                accessibilityLabel={`difficulty-${level}`}
                selected={draft.difficulty === level}
                onPress={() => update({ difficulty: level })}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('trainingFocus')}</ThemedText>
          <View style={styles.chips}>
            {FOCUS_TAGS.map(tag => (
              <FilterChip
                key={tag}
                label={t(`focusTags.${tag}`)}
                accessibilityLabel={`focus-${tag}`}
                selected={draft.focus.includes(tag)}
                onPress={() =>
                  update({
                    focus: draft.focus.includes(tag)
                      ? draft.focus.filter(existingTag => existingTag !== tag)
                      : [...draft.focus, tag],
                  })
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('phase')}</ThemedText>
          <View style={styles.chips}>
            {EXERCISE_PHASES.map(phase => (
              <FilterChip
                key={phase}
                label={t(`exercisePhases.${phase}`)}
                accessibilityLabel={`phase-${phase}`}
                selected={draft.phase === phase}
                onPress={() => update({ phase })}
              />
            ))}
          </View>
        </View>

        <Field
          label={t('durationMinutes')}
          keyboardType="number-pad"
          value={draft.durationMinutes}
          onChangeText={value => update({ durationMinutes: value })}
          error={errorText('durationMinutes')}
        />

        <View style={styles.row}>
          <Field
            containerStyle={styles.rowField}
            label={t('minPlayers')}
            keyboardType="number-pad"
            value={draft.minPlayers}
            onChangeText={value => update({ minPlayers: value })}
            error={errorText('minPlayers')}
          />
          <Field
            containerStyle={styles.rowField}
            label={t('maxPlayers')}
            keyboardType="number-pad"
            value={draft.maxPlayers}
            onChangeText={value => update({ maxPlayers: value })}
            error={errorText('maxPlayers')}
          />
        </View>

        <Field
          label={t('exerciseDescription')}
          multiline
          value={draft.description}
          onChangeText={value => update({ description: value })}
        />

        <Field
          label={t('coachingPoints')}
          hint={t('coachingPointsHint')}
          multiline
          value={draft.coachingPoints}
          onChangeText={value => update({ coachingPoints: value })}
        />

        <Field
          label={t('customTags')}
          hint={t('customTagsHint')}
          autoCapitalize="none"
          value={draft.customTags}
          onChangeText={value => update({ customTags: value })}
        />

        {saveFailed && <ThemedText style={styles.error}>{t('exerciseSaveFailed')}</ThemedText>}

        <ThemedButton onPress={save}>{t('save')}</ThemedButton>
      </ScrollView>

      <Modal visible={diagramOpen} animationType="slide" onRequestClose={() => setDiagramOpen(false)}>
        <ThemedView style={styles.container}>
          <TacticsBoard
            sport={sport}
            value={draft.markers}
            onChange={markers => update({ markers })}
            requireBall={false}
          />
          <Pressable
            onPress={() => setDiagramOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="close-diagram"
            style={[styles.closeDiagram, { paddingBottom: insets.bottom + 12 }]}
          >
            <ThemedText type="link">{t('ok')}</ThemedText>
          </Pressable>
        </ThemedView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  hint: {
    fontSize: 14,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: '#D32F2F',
    fontSize: 14,
  },
  preview: {
    height: 260,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowField: {
    flex: 1,
  },
  closeDiagram: {
    alignItems: 'center',
    paddingTop: 12,
  },
});
