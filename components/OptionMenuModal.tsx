import React from 'react';
import { View, Modal, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

interface OptionMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  position: { top: number; left: number };
}

export const OptionMenuModal: React.FC<OptionMenuModalProps> = ({ visible, onClose, onRename, onDelete, position }) => {
  const themeColor = useThemeColor({}, 'menuBackground');
  const menuBackground = typeof themeColor === 'string' ? themeColor : themeColor?.background;
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { top: position.top - 30, left: position.left - 200 }]}>
          <View style={[styles.menuBox, { backgroundColor: menuBackground as string }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onRename();
                onClose();
              }}>
              <ThemedText style={styles.menuItemText}>{t('rename')}</ThemedText>
            </TouchableOpacity>
            <View style={styles.menuItemBorder} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onDelete();
                onClose();
              }}>
              <ThemedText style={styles.menuItemText}>{t('delete')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBox: {
    padding: 0,
    borderRadius: 8,
    width: 200, // Adjust width as needed
  },
  menuItem: {
    padding: 15,
  },
  menuItemBorder: {
    height: 1,
    backgroundColor: '#ccc',
  },
  menuItemText: {
    fontSize: 16,
  },
});
