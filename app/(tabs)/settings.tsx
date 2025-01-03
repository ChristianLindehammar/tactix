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
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Settings</ThemedText>
      </ThemedView>
      <ThemedText>
      This app helps sports coaches prepare their teams for matches and training sessions. It provides tools and features to organize training plans, manage team tactics, and develop game strategies effectively.
        
        </ThemedText>
      <Collapsible title="General settings">
        <ThemedText>Select current sport</ThemedText>
        <Picker
          selectedValue={selectedSport}
          onValueChange={(itemValue) => setSelectedSport(itemValue)}
          style={styles.picker}>
          <Picker.Item label="Floorball" value="floorball" />
          <Picker.Item label="Football" value="football" />
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
  },
});
