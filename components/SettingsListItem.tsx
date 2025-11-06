import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

interface SettingsListItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  route?: string;
  onPress?: () => void;
}

export function SettingsListItem({ icon, title, route, onPress }: SettingsListItemProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'icon');

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (route) {
      router.push(route as any);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
        <View style={[styles.iconContainer, { backgroundColor: tintColor }]}>
          <MaterialIcons name={icon} size={24} color={backgroundColor as string} />
        </View>
        <ThemedText style={[styles.title, { color: textColor }]}>{title}</ThemedText>
        <MaterialIcons name="chevron-right" size={24} color={textColor as string} style={styles.chevron} />
      </ThemedView>
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
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

