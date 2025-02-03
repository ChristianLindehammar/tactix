import { StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSport } from '@/context/SportContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { sportsConfig, Sport } from '@/constants/sports';

export function SportSelector() {
  const { selectedSport, setSelectedSport } = useSport();
  const textColor = useThemeColor({}, 'text') as string;
  const { t } = useTranslation();

  return (
    <Picker 
      selectedValue={selectedSport} 
      onValueChange={(itemValue) => setSelectedSport(itemValue)} 
      style={[styles.picker, { color: textColor }]}
    >
      {(Object.keys(sportsConfig) as Sport[]).map((sport) => (
        <Picker.Item key={sport} label={t(sport)} value={sport} />
      ))}
    </Picker>
  );
}

const styles = StyleSheet.create({
  picker: {
    marginTop: 8,
    marginBottom: 16,
    maxWidth: 300,
    alignSelf: 'flex-start',
    width: '100%',
  },
});
