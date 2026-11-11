import React, { ComponentProps, ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/ThemedText';
import { useTeamUiColors } from './useTeamUiColors';

interface SheetRowProps {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  hint?: string;
  trailing?: ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

export function SheetRow({ icon, title, hint, trailing, destructive, onPress }: SheetRowProps) {
  const colors = useTeamUiColors();
  const foreground = destructive ? colors.destructive : colors.accent;
  const tile = destructive ? colors.destructiveSoft : colors.accentSoft;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityHint={hint}>
      <View style={[styles.tile, { backgroundColor: tile }]}>
        <MaterialIcons name={icon} size={22} color={foreground} />
      </View>
      <View style={styles.text}>
        <ThemedText style={[styles.title, destructive && { color: colors.destructive }]}>{title}</ThemedText>
        {hint ? <ThemedText style={[styles.hint, { color: colors.muted }]}>{hint}</ThemedText> : null}
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
