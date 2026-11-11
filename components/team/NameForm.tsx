import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useTeamUiColors } from './useTeamUiColors';

interface NameFormProps {
  label: string;
  submitLabel: string;
  initialValue?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

/** A name field shown inside a sheet, so no second dialog has to open on top of it. */
export function NameForm({ label, submitLabel, initialValue = '', onSubmit, onCancel }: NameFormProps) {
  const [name, setName] = useState(initialValue);
  const colors = useTeamUiColors();
  const { t } = useTranslation();
  const trimmed = name.trim();

  const submit = () => {
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <View style={styles.form}>
      <ThemedText style={[styles.label, { color: colors.muted }]}>{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        returnKeyType="done"
        autoFocus
        selectTextOnFocus
        style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
      />
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.secondary} onPress={onCancel} accessibilityRole="button">
          <ThemedText style={{ color: colors.accent, fontWeight: '600' }}>{t('cancel')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.primary, opacity: trimmed ? 1 : 0.4 }]}
          onPress={submit}
          disabled={!trimmed}
          accessibilityRole="button"
          accessibilityState={{ disabled: !trimmed }}
        >
          <ThemedText style={[styles.primaryText, { color: colors.onPrimary }]}>{submitLabel}</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  secondary: {
    height: 46,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  primary: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
