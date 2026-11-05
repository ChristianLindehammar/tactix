import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/FilterChip';
import { StepTabs } from '@/components/StepTabs';
import { TacticsBoard } from '@/components/TacticsBoard';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSport } from '@/context/SportContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { getCurrentUserId } from '@/services/currentUser';
import { exerciseRepository } from '@/services/exerciseRepository';
import {
  Exercise,
  EXERCISE_DIFFICULTIES,
  EXERCISE_PHASES,
  FOCUS_TAGS,
  MAX_TITLE_LENGTH,
} from '@/types/exercise';
import { TACTICS_MARKER_TYPES } from '@/types/tacticsMarker';
import {
  addStep,
  createDraft,
  draftFromExercise,
  DraftErrors,
  draftToExercise,
  ExerciseDraft,
  DraftStep,
  isDraftChanged,
  removeStep,
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

const StepNote = ({ value, onChangeText }: { value: string; onChangeText: (note: string) => void }) => {
  const { t } = useTranslation();
  const border = useThemeColor({}, 'borderColor') as string;
  const textColor = useThemeColor({}, 'text') as string;

  return (
    <TextInput
      accessibilityLabel={t('stepNote')}
      placeholder={t('stepNotePlaceholder')}
      placeholderTextColor="#888"
      value={value}
      onChangeText={onChangeText}
      style={[styles.input, { borderColor: border, color: textColor }]}
    />
  );
};

export default function ExerciseEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedSport } = useSport();
  const router = useRouter();
  const navigation = useNavigation();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, 'background') as string;

  const [existing, setExisting] = useState<Exercise | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'notOwned'>(
    id ? 'loading' : 'ready',
  );
  const [draft, setDraft] = useState<ExerciseDraft>(createDraft);
  const [baseline, setBaseline] = useState<ExerciseDraft>(draft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [selectedStep, setStepIndex] = useState(0);
  const saving = useRef(false);
  const saved = useRef(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([exerciseRepository.get(id), getCurrentUserId()])
      .then(([found, me]) => {
        if (!active) return;
        if (!found) {
          setStatus('notFound');
          return;
        }
        if (found.ownerId !== me) {
          setStatus('notOwned');
          return;
        }
        const loaded = draftFromExercise(found);
        setExisting(found);
        setDraft(loaded);
        setBaseline(loaded);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('notFound');
      });
    return () => {
      active = false;
    };
  }, [id]);

  // The warning stays armed on our own exit and lets it through. Turning it off first would
  // update the native header while the screen is popped, which crashes on Android.
  usePreventRemove(isDraftChanged(baseline, draft), ({ data }) => {
    if (saved.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert(t('unsavedChangesTitle'), t('unsavedChangesMessage'), [
      { text: t('keepEditing'), style: 'cancel' },
      { text: t('discard'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const sport = existing?.sport ?? selectedSport;
  const update = (change: Partial<ExerciseDraft>) => setDraft(current => ({ ...current, ...change }));

  // Never past the last step, even if the draft is replaced by a shorter one
  const stepIndex = Math.min(selectedStep, draft.steps.length - 1);
  const step = draft.steps[stepIndex];
  const updateStep = (change: Partial<DraftStep>) =>
    setDraft(current => ({
      ...current,
      steps: current.steps.map((existingStep, index) =>
        index === stepIndex ? { ...existingStep, ...change } : existingStep,
      ),
    }));

  const addStepAfterCurrent = () => {
    setDraft(current => ({ ...current, steps: addStep(current.steps, stepIndex) }));
    setStepIndex(stepIndex + 1);
  };

  const deleteCurrentStep = () =>
    Alert.alert(t('deleteStep'), t('deleteStepConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          setDraft(current => ({ ...current, steps: removeStep(current.steps, stepIndex) }));
          setStepIndex(Math.max(stepIndex - 1, 0));
        },
      },
    ]);

  const save = async () => {
    if (saving.current || !sport) return;
    saving.current = true;
    setSaveFailed(false);

    try {
      const result = draftToExercise(
        draft,
        { sport, locale, now: new Date().toISOString(), ownerId: await getCurrentUserId() },
        existing ?? undefined,
      );
      if (!result.ok) {
        setErrors(result.errors);
        saving.current = false;
        return;
      }

      setErrors({});
      await exerciseRepository.save(result.exercise);
      saved.current = true;
      router.back();
    } catch {
      setSaveFailed(true);
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
        {status === 'notOwned' && <ThemedText>{t('exerciseNotEditable')}</ThemedText>}
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
          maxLength={MAX_TITLE_LENGTH}
          onChangeText={value => update({ title: value })}
          error={errorText('title')}
        />

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('diagram')}</ThemedText>
          {draft.steps.length > 1 && (
            <StepTabs count={draft.steps.length} selected={stepIndex} onSelect={setStepIndex} />
          )}
          <View style={styles.preview}>
            <TacticsBoard
              sport={sport}
              value={step.markers}
              onChange={markers => updateStep({ markers })}
              readOnly
              requireBall={false}
            />
          </View>
          {step.note.trim() !== '' && <ThemedText>{step.note}</ThemedText>}
          <ThemedButton onPress={() => setDiagramOpen(true)}>{t('editDiagram')}</ThemedButton>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('difficulty')}</ThemedText>
          <View style={styles.chips}>
            {EXERCISE_DIFFICULTIES.map(level => (
              <FilterChip
                key={level}
                label={t(`difficultyLevels.${level}`)}
                testID={`difficulty-${level}`}
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
                testID={`focus-${tag}`}
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
                testID={`phase-${phase}`}
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
        <KeyboardAvoidingView
          testID="diagram-editor"
          style={[styles.container, { backgroundColor: background }]}
          // A modal on Android doesn't resize for the keyboard, which would cover the step note
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TacticsBoard
            key={step.id}
            sport={sport}
            value={step.markers}
            onChange={markers => updateStep({ markers })}
            guideMarkers={stepIndex > 0 ? draft.steps[stepIndex - 1].markers : undefined}
            requireBall={false}
            allowedMarkerTypes={[...TACTICS_MARKER_TYPES]}
            showToolHints
            enableLabels
            enableCurves
          />
          <View style={styles.stepControls}>
            <StepTabs
              count={draft.steps.length}
              selected={stepIndex}
              onSelect={setStepIndex}
              onAdd={addStepAfterCurrent}
              onDelete={deleteCurrentStep}
            />
            <StepNote value={step.note} onChangeText={note => updateStep({ note })} />
          </View>
          <Pressable
            onPress={() => setDiagramOpen(false)}
            accessibilityRole="button"
            testID="close-diagram"
            style={[styles.closeDiagram, { paddingBottom: insets.bottom + 12 }]}
          >
            <ThemedText type="link">{t('ok')}</ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
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
  stepControls: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  closeDiagram: {
    alignItems: 'center',
    paddingTop: 12,
  },
});
