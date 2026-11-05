import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

interface StepTabsProps {
  count: number;
  selected: number;
  onSelect: (index: number) => void;
  /** Shows a button that adds a step after the selected one. */
  onAdd?: () => void;
  /** Shows a button that deletes the selected step, while there is more than one. */
  onDelete?: () => void;
}

const SELECTED_COLOR = '#0097B2';
const DELETE_COLOR = '#D32F2F';

/** Numbered tabs for the steps of an exercise diagram. */
export const StepTabs = ({ count, selected, onSelect, onAdd, onDelete }: StepTabsProps) => {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'menuBackground') as string;
  const border = useThemeColor({}, 'borderColor') as string;
  const textColor = useThemeColor({}, 'text') as string;

  return (
    <View style={styles.row}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.scroll}
      >
        {Array.from({ length: count }, (_, index) => (
          <Pressable
            key={index}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityLabel={t('stepNumber', { number: index + 1 })}
            accessibilityState={{ selected: index === selected }}
            style={[
              styles.tab,
              index === selected
                ? { backgroundColor: SELECTED_COLOR, borderColor: SELECTED_COLOR }
                : { backgroundColor: background, borderColor: border },
            ]}
          >
            <ThemedText style={[styles.number, index === selected && styles.selectedNumber]}>
              {index + 1}
            </ThemedText>
          </Pressable>
        ))}
        {onAdd && (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={t('addStep')}
            style={[styles.tab, { borderColor: border, borderStyle: 'dashed' }]}
          >
            <MaterialIcons name="add" size={20} color={textColor} />
          </Pressable>
        )}
      </ScrollView>
      {onDelete && count > 1 && (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t('deleteStep')}
          hitSlop={8}
          style={styles.delete}
        >
          <MaterialIcons name="delete-outline" size={24} color={DELETE_COLOR} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  tabs: {
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedNumber: {
    color: '#fff',
  },
  delete: {
    marginLeft: 'auto',
    padding: 4,
  },
});
