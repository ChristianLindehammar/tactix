import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

const SELECTED_COLOR = '#0097B2';

export const FilterChip = ({ label, selected, onPress, testID }: FilterChipProps) => {
  const background = useThemeColor({}, 'menuBackground') as string;
  const border = useThemeColor({}, 'borderColor') as string;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { backgroundColor: selected ? SELECTED_COLOR : background, borderColor: selected ? SELECTED_COLOR : border },
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
