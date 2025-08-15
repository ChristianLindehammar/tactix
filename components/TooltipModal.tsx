import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View, Dimensions, Platform } from 'react-native';
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
  autoCloseTimeout?: number;
}

export const TooltipModal: React.FC<TooltipModalProps> = ({
  visible,
  onClose,
  message,
  position,
  autoCloseTimeout = 3000,
}) => {
  const backgroundColor = useThemeColor({}, 'background') as string;
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Auto-close tooltip after timeout
    useEffect(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (visible) {
        timer = setTimeout(() => {
          onClose();
        }, autoCloseTimeout);
      }
      return () => {
        if (timer) clearTimeout(timer);
      };
    }, [visible, onClose, autoCloseTimeout]);
  const tooltipPosition = position ? {
    position: 'absolute' as const,
    top: position.y,
    left: Math.max(20, Math.min(position.x - 150, screenWidth - 320)),
  } : {
    alignSelf: 'center' as const,
    marginTop: screenHeight * 0.5,
  };

  // Android requires explicit handling of touch events
  const handlePress = () => {
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      hardwareAccelerated={Platform.OS === 'android'} // Improve performance on Android
    >
      <Pressable 
        style={styles.tooltipOverlay} 
        onPress={handlePress}
        android_disableSound={true} // Disable sound feedback on Android
      >
        <View 
          style={[styles.tooltipContainer, tooltipPosition]}
          // Prevent press events from propagating through this view on Android
          pointerEvents={Platform.OS === 'android' ? 'box-none' : 'auto'}
        >
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
