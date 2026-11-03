import React, { useState } from 'react';
import { Modal, View, TextInput, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';

interface CustomInputDialogProps {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
  initialValue?: string;
  /** Lets the user submit an empty value, such as to clear something. */
  allowEmpty?: boolean;
  maxLength?: number;
}

export const CustomInputDialog: React.FC<CustomInputDialogProps> = ({
  visible,
  title,
  onCancel,
  onSubmit,
  initialValue = '',
  allowEmpty = false,
  maxLength,
}) => {
  const [value, setValue] = useState(initialValue);
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <ThemedView style={styles.dialog}>
              <ThemedText style={styles.title}>{title}</ThemedText>
              <TextInput
                style={[styles.input, { color: String(textColor), borderColor: String(textColor) }]}
                accessibilityLabel={title}
                maxLength={maxLength}
                value={value}
                onChangeText={setValue}
                autoFocus
                placeholderTextColor={typeof textColor === 'string' ? textColor : undefined}
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={onCancel}>
                  <ThemedText>
                   { t('cancel')}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: Colors.light.tint }]}
                  onPress={() => (allowEmpty || value.trim()) && onSubmit(value.trim())}
                >
                  <ThemedText style={{ color: '#fff' }}>
                    { t('ok')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '80%',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    padding: 8,
    borderRadius: 4,
    minWidth: 64,
    alignItems: 'center'
  },
});
