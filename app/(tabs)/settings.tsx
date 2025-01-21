import { StyleSheet, Image, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSport } from '@/context/SportContext';

import { Collapsible } from '@/components/Collapsible';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function TabTwoScreen() {
  const { selectedSport, setSelectedSport } = useSport();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
      <IconSymbol
        size={310}
        color="#808080"
        name="gearshape"
        style={styles.headerImage}
      />
      }>
      <ThemedView style={styles.titleContainer}>
      <ThemedText type="title">Settings</ThemedText>
      </ThemedView>
      <Collapsible title="About the app">
      <ThemedText>A tool for sports coaches to plan team training, manage tactics, and develop game strategies.</ThemedText>

      </Collapsible>

      <Collapsible title="General settings" defaultOpen={true}>
      <ThemedText>Select current sport</ThemedText>
      <Picker
        selectedValue={selectedSport}
        onValueChange={(itemValue) => setSelectedSport(itemValue)}
        style={styles.picker}>
        <Picker.Item label="Floorball" value="floorball" />
        <Picker.Item label="Football" value="football" />
        <Picker.Item label="Hockey" value="hockey" />
      </Picker>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  picker: {
    marginTop: 8,
    marginBottom: 16,
    maxWidth: 300,
    alignSelf: 'flex-start',
    width: '100%',
  },
});
