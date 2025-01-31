import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface TooltipModalProps {
  visible: boolean;
  onClose: () => void;
  message: string;
}

export const TooltipModal: React.FC<TooltipModalProps> = ({
  visible,
  onClose,
  message,
}) => {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.tooltipOverlay} onPress={onClose}>
        <View style={[styles.tooltip, { backgroundColor }]}>
          <ThemedText style={styles.tooltipText}>{message}</ThemedText>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    padding: 16,
    borderRadius: 8,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    textAlign: 'center',
    fontSize: 16,
  },
});
