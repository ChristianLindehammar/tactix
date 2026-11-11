import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';
import { useTeamUiColors } from './useTeamUiColors';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called once the sheet is gone, so a file picker or share sheet can open over the app instead of over the sheet. */
  onDismissed?: () => void;
  title?: string;
  subtitle?: string;
}

export function BottomSheet({ visible, onClose, onDismissed, title, subtitle, children }: PropsWithChildren<BottomSheetProps>) {
  const insets = useSafeAreaInsets();
  const colors = useTeamUiColors();
  const { t } = useTranslation();
  const wasVisible = useRef(visible);

  // Only iOS reports when a modal has finished closing
  useEffect(() => {
    if (Platform.OS !== 'ios' && wasVisible.current && !visible) {
      onDismissed?.();
    }
    wasVisible.current = visible;
  }, [visible, onDismissed]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={Platform.OS === 'ios' ? onDismissed : undefined}
      hardwareAccelerated={Platform.OS === 'android'}
    >
      {/* A modal gets its own window, which Android does not resize for the keyboard either */}
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} />
        <View style={[styles.sheet, { backgroundColor: colors.sheet, paddingBottom: 16 + insets.bottom }]}>
          <View style={[styles.handle, { backgroundColor: colors.handle }]} />
          {title ? (
            <View style={styles.header}>
              <ThemedText style={styles.title} numberOfLines={1}>{title}</ThemedText>
              {subtitle ? <ThemedText style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</ThemedText> : null}
            </View>
          ) : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 20, 25, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 16,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
});
