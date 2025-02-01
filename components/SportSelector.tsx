import { StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSport } from '@/context/SportContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export function SportSelector() {
  const { selectedSport, setSelectedSport } = useSport();
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  return (
    <Picker 
      selectedValue={selectedSport} 
      onValueChange={(itemValue) => setSelectedSport(itemValue)} 
      style={[styles.picker, { color: textColor }]}
    >
      <Picker.Item label={t('floorball')} value='floorball' />
      <Picker.Item label={t('soccer')} value='football' />
      <Picker.Item label={t('hockey')} value='hockey' />
      <Picker.Item label={t('bandy')} value='bandy' />
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
