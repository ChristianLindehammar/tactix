import { StyleSheet, TouchableOpacity, View } from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Sport, sportsConfig } from '@/constants/sports';

interface SportListItemProps {
  sport: Sport;
  label: string;
  isSelected: boolean;
  isLast?: boolean;
  onPress: (sport: Sport) => void;
}

export function SportListItem({ sport, label, isSelected, isLast, onPress }: SportListItemProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const separatorColor = useThemeColor({}, 'borderColor');

  const SportIcon = sportsConfig[sport].Svg;

  return (
    <TouchableOpacity 
      onPress={() => onPress(sport)} 
      activeOpacity={0.7} 
      style={{ backgroundColor: 'transparent' }}
    >
      <View style={[
        styles.container,
        !isLast && { 
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: separatorColor as string 
        }
      ]}>
        <View style={styles.iconContainer}>
          <SportIcon width={28} height={28} />
        </View>
        <ThemedText style={styles.title}>{label}</ThemedText>
        {isSelected && (
          <MaterialIcons 
            name="check-circle" 
            size={24} 
            color={tintColor as string} 
            style={styles.checkmark} 
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  checkmark: {
    marginLeft: 8,
  },
});

