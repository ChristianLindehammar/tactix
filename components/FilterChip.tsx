import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export const FilterChip = ({ label, selected, onPress, accessibilityLabel }: FilterChipProps) => {
  const tint = useThemeColor({ light: '#0097B2', dark: '#444D51' }, 'tint') as string;
  const background = useThemeColor({}, 'menuBackground') as string;
  const border = useThemeColor({}, 'borderColor') as string;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { backgroundColor: selected ? tint : background, borderColor: selected ? tint : border },
      ]}
    >
      <ThemedText style={[styles.label, selected && styles.selectedLabel]}>{label}</ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectedLabel: {
    color: '#fff',
  },
});
