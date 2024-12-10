import { StyleSheet, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { FloorballCourt } from '@/components/FloorballCourt';
import { LAYOUT } from '@/constants/layout';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  const availableHeight = Dimensions.get('window').height 
    - insets.top 
    - LAYOUT.TAB_BAR_HEIGHT;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.courtContainer, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
        <FloorballCourt availableHeight={availableHeight} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  courtContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.COURT_PADDING,
  },
});
