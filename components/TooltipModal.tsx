import React from 'react';
import { Modal, Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface TooltipModalProps {
  visible: boolean;
  onClose: () => void;
  message: string;
  position?: {
    x: number;
    y: number;
  };
}

export const TooltipModal: React.FC<TooltipModalProps> = ({
  visible,
  onClose,
  message,
  position,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const screenWidth = Dimensions.get('window').width;

  const tooltipPosition = position ? {
    position: 'absolute' as const,
    top: position.y,
    left: Math.max(20, Math.min(position.x - 150, screenWidth - 320)),
  } : {
    alignSelf: 'center',
    marginTop: '50%',
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.tooltipOverlay} onPress={onClose}>
        <View style={[styles.tooltipContainer, tooltipPosition]}>
          <View style={[styles.arrow, { borderBottomColor: backgroundColor }]} />
          <View style={[styles.tooltip, { backgroundColor }]}>
            <ThemedText style={styles.tooltipText}>{message}</ThemedText>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tooltipContainer: {
    width: 300,
  },
  tooltip: {
    padding: 16,
    borderRadius: 3,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginTop: -1, 
  },
  tooltipText: {
    textAlign: 'center',
    fontSize: 16,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginLeft: 20,
  },
});
