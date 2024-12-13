import { StyleSheet, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeam, TeamProvider } from '@/contexts/TeamContext';

import { ThemedView } from '@/components/ThemedView';
import { FloorballCourt } from '@/components/FloorballCourt';
import { LAYOUT } from '@/constants/layout';
import { Team } from '@/types/models';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { team, updatePlayerPosition } = useTeam();

  const availableHeight = Dimensions.get('window').height 
    - insets.top 
    - LAYOUT.TAB_BAR_HEIGHT;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.courtContainer, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
        <FloorballCourt 
          availableHeight={availableHeight} 
          playerPositions={team.startingPlayers} 
          onDragEnd={updatePlayerPosition} 
        />
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
