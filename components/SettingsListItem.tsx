import { StyleSheet, TouchableOpacity, View } from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';

interface SettingsListItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  route?: string;
  onPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function SettingsListItem({ icon, title, route, onPress, isFirst, isLast }: SettingsListItemProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'borderColor');

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (route) {
      router.push(route as any);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <View style={[
        styles.container,
        { borderBottomColor: borderColor as string },
        isLast && styles.lastItem
      ]}>
        <View style={[styles.iconContainer, { backgroundColor: tintColor as string }]}>
          <MaterialIcons name={icon} size={24} color={backgroundColor as string} />
        </View>
        <ThemedText style={[styles.title, { color: textColor }]}>{title}</ThemedText>
        <MaterialIcons name="chevron-right" size={24} color={textColor as string} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  chevron: {
    opacity: 0.3,
  },
});

