import { StyleSheet, View, Dimensions, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { useSport } from '@/context/SportContext';

import { ThemedView } from '@/components/ThemedView';
import { GenericCourt } from '@/components/GenericCourt';
import FloorballSvg from '@/components/ui/FloorballSvg';
import FootballSvg from '@/components/ui/FootballSvg';
import { LAYOUT } from '@/constants/layout';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { team, updatePlayerPosition } = useTeam();
  const { selectedSport } = useSport();

  if (!team) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <Pressable 
          style={styles.noTeamContainer} 
          onPress={() => router.push('/team')}
        >
          <ThemedText style={styles.noTeamText}>
            No team selected. Please create or select one.
          </ThemedText>
          <IconSymbol 
            name="arrow.right.circle.fill" 
            size={42} 
            color="gray" 
            style={styles.arrow}
          />
        </Pressable>
      </ThemedView>
    );
  }

  const availableHeight = Dimensions.get('window').height 
    - insets.top 
    - LAYOUT.TAB_BAR_HEIGHT;

    const availableWidth = Dimensions.get('window').width;

  const courtConfig = {
    floorball: {
      Svg: FloorballSvg,
      aspectRatio: 484/908,
    },
    football: {
      Svg: FootballSvg,
      aspectRatio: 549/800,
    }
  };

  const { Svg, aspectRatio } = courtConfig[selectedSport];

  // Calculate dimensions to fill the screen while maintaining aspect ratio
  const screenRatio = availableWidth / availableHeight;
  
  const finalDimensions = screenRatio > aspectRatio
    ? { 
        width: availableHeight * aspectRatio, 
        height: availableHeight 
      }
    : { 
        width: availableWidth, 
        height: availableWidth / aspectRatio 
      };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.courtContainer, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
        <GenericCourt 
          availableHeight={finalDimensions.height}
          availableWidth={finalDimensions.width}
          playerPositions={team?.startingPlayers ?? []}
          onDragEnd={updatePlayerPosition}
          CourtSvg={Svg}
          aspectRatio={aspectRatio}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTeamContainer: {
    alignItems: 'center',
    // alight the text and icon in the center
    padding: 16,
  },
  noTeamText: {
    textAlign: 'center',
    marginRight: 8,
  },
  arrow: {
    opacity: 0.7,
  },
  courtContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.COURT_PADDING,
  },
});
