import React, { useState, useMemo } from 'react';
import { Modal, View, TextInput, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { parseBulkPlayerInput, ParsedPlayer } from '@/context/utils/parseBulkPlayerInput';

interface ImportPlayersDialogProps {
  visible: boolean;
  onCancel: () => void;
  onImport: (players: ParsedPlayer[]) => void;
}

export const ImportPlayersDialog: React.FC<ImportPlayersDialogProps> = ({
  visible,
  onCancel,
  onImport,
}) => {
  const [text, setText] = useState('');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  const parsed = useMemo(() => parseBulkPlayerInput(text), [text]);

  const handleImport = () => {
    if (parsed.length > 0) {
      onImport(parsed);
      setText('');
    }
  };

  const handleCancel = () => {
    setText('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" hardwareAccelerated={Platform.OS === 'android'}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <ThemedView style={styles.dialog}>
              <ThemedText style={styles.title}>{t('importPlayers')}</ThemedText>
              <TextInput
                style={[styles.input, { color: String(textColor), borderColor: String(textColor) }]}
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={8}
                placeholder={t('importPlayersPlaceholder')}
                placeholderTextColor={typeof textColor === 'string' ? textColor + '80' : undefined}
                autoFocus
                textAlignVertical="top"
              />
              <ThemedText style={styles.preview}>
                {text.trim().length > 0
                  ? parsed.length > 0
                    ? t('importPlayersPreview', { count: parsed.length })
                    : t('importPlayersEmpty')
                  : ''}
              </ThemedText>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={handleCancel}>
                  <ThemedText>{t('cancel')}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: parsed.length > 0 ? Colors.light.tint : '#ccc' }]}
                  onPress={handleImport}
                  disabled={parsed.length === 0}
                >
                  <ThemedText style={{ color: '#fff' }}>{t('import')}</ThemedText>
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
    width: '85%',
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
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    minHeight: 150,
    fontSize: 14,
  },
  preview: {
    fontSize: 13,
    marginBottom: 12,
    opacity: 0.7,
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
    alignItems: 'center',
  },
});
