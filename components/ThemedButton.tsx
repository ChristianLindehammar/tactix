import React, { FC, PropsWithChildren } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';

interface ThemedButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const ThemedButton: FC<PropsWithChildren<ThemedButtonProps>> = ({
  onPress,
  disabled,
  style,
  children,
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'borderColor');
  const isDarkTheme = tintColor === '#fff'; // quick check or use some theme logic
  const buttonBg = disabled
    ? (isDarkTheme ? Colors.dark.buttonDisabled : Colors.light.buttonDisabled)
    : (isDarkTheme ? Colors.dark.buttonEnabled : Colors.light.buttonEnabled);
  const textStyleColor = disabled ? '#aaa' : '#fff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: buttonBg },
        style,
      ]}
    >
      <ThemedText style={[styles.buttonText, { color: textStyleColor }]}>
        {children}
      </ThemedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});