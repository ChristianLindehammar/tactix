import { StyleSheet, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { FloorballCourt } from '@/components/FloorballCourt';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const availableHeight = Dimensions.get('window').height - insets.top - 80; // subtract tab bar height

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.content}>
        <View style={[styles.courtContainer, { paddingBottom: insets.bottom + 20 }]}>
          <FloorballCourt availableHeight={availableHeight} />
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  courtContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
