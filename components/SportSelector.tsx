import { Sport, sportsConfig } from '@/constants/sports';
import { StyleSheet, View } from 'react-native';

import { SportListItem } from '@/components/SportListItem';
import { useSport } from '@/context/SportContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export function SportSelector() {
  const { selectedSport, setSelectedSport } = useSport();
  const menuBackground = useThemeColor({}, 'menuBackground');
  const cardBorderColor = useThemeColor({}, 'borderColor');
  const { t } = useTranslation();

  const sports = Object.keys(sportsConfig) as Sport[];

  const handleSportSelect = (sport: Sport) => {
    setSelectedSport(sport);
  };

  return (
    <View style={[styles.card, {
      backgroundColor: menuBackground as string,
      borderColor: cardBorderColor as string,
    }]}>
      {sports.map((sport, index) => (
        <SportListItem
          key={sport}
          sport={sport}
          label={t(sport)}
          isSelected={selectedSport === sport}
          isLast={index === sports.length - 1}
          onPress={handleSportSelect}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    // iOS-style subtle border
    borderWidth: 1,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Android elevation
    elevation: 2,
  },
});
