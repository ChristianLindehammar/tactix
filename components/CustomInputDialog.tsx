import React, { useState } from 'react';
import { Modal, View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';

interface CustomInputDialogProps {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
  initialValue?: string;
}

export const CustomInputDialog: React.FC<CustomInputDialogProps> = ({
  visible,
  title,
  onCancel,
  onSubmit,
  initialValue = ''
}) => {
  const [value, setValue] = useState(initialValue);
  const textColor = useThemeColor({}, 'text');

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ThemedView style={styles.dialog}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: textColor }]}
            value={value}
            onChangeText={setValue}
            autoFocus
            placeholderTextColor={textColor}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onCancel}>
              <ThemedText>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: Colors.light.tint }]} 
              onPress={() => value.trim() && onSubmit(value.trim())}
            >
              <ThemedText style={{ color: '#fff' }}>OK</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
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
    alignItems: 'center',
  },
});
