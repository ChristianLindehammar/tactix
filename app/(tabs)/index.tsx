import { StyleSheet, View, Dimensions, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeam } from '@/contexts/TeamContext';
import { useSport } from '@/context/SportContext';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Picker } from '@react-native-picker/picker';
import { useThemeColor } from '@/hooks/useThemeColor';
import * as FileSystem from 'expo-file-system';

import { ThemedView } from '@/components/ThemedView';
import { GenericCourt } from '@/components/GenericCourt';
import FloorballSvg from '@/components/ui/FloorballSvg';
import FootballSvg from '@/components/ui/FootballSvg';
import { LAYOUT } from '@/constants/layout';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import HockeySvg from '@/components/ui/HockeySvg';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { team, updatePlayerPosition, importTeamFromFile } = useTeam();
  const { selectedSport, setSelectedSport } = useSport();
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    const handleOpenURL = async ({ url }: { url: string }) => {
      try {
        console.log('Handling URL:', url);
        let fileUri = url;

        // Handle content:// URIs on Android
        if (Platform.OS === 'android' && url.startsWith('content://')) {
          const tempFile = `${FileSystem.cacheDirectory}temp.tactix`;
          await FileSystem.copyAsync({
            from: url,
            to: tempFile
          });
          fileUri = tempFile;
        }

        // Validate file extension
        if (!fileUri.toLowerCase().endsWith('.tactix')) {
          throw new Error('Invalid file type. Only .tactix files are supported.');
        }

        await importTeamFromFile(fileUri);

        // Clean up temp file if created
        if (fileUri !== url) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
      } catch (error) {
        console.error('Error handling file:', error);
        Alert.alert('Error', 'Failed to import team file');
      }
    };

    // Handle both cold and warm starts
    const checkInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleOpenURL({ url: initialUrl });
      }
    };
    checkInitialURL();

    const subscription = Linking.addEventListener('url', handleOpenURL);
    return () => subscription.remove();
  }, []);

  if (!selectedSport) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <View style={styles.sportSelectorContainer}>
          <ThemedText style={styles.titleText}>Welcome to Tactix!</ThemedText>
          <ThemedText style={styles.subtitleText}>First, select your preferred sport:</ThemedText>
          <Picker
            selectedValue={selectedSport || "football"}
            onValueChange={(itemValue) => setSelectedSport(itemValue)}
            style={[styles.picker, { color: textColor }]}>
            {/* Remove the null option since iOS doesn't handle it well */}
            <Picker.Item label="Floorball" value="floorball" />
            <Picker.Item label="Football" value="football" />
            <Picker.Item label="Hockey" value="hockey" />
          </Picker>
        </View>
      </ThemedView>
    );
  }

  if (!team) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <Pressable style={styles.noTeamContainer} onPress={() => router.push('/team')}>
          <ThemedText style={styles.noTeamText}>Now, let's create your team!</ThemedText>
          <IconSymbol name='arrow.right.circle.fill' size={42} color='gray' style={styles.arrow} />
        </Pressable>
      </ThemedView>
    );
  }

  const availableHeight = Dimensions.get('window').height - insets.top - insets.bottom - LAYOUT.TAB_BAR_HEIGHT;

  const availableWidth = Dimensions.get('window').width;

  const courtConfig = {
    floorball: {
      Svg: FloorballSvg,
      aspectRatio: 484 / 908,
    },
    football: {
      Svg: FootballSvg,
      aspectRatio: 549 / 800,
    },
    hockey: {
      Svg: HockeySvg,
      aspectRatio: 427 / 846,
    },
  };

  const { Svg, aspectRatio } = courtConfig[selectedSport];

  // Calculate dimensions to fill the screen while maintaining aspect ratio
  const screenRatio = availableWidth / availableHeight;

  const finalDimensions =
    screenRatio > aspectRatio
      ? {
          width: availableHeight * aspectRatio,
          height: availableHeight,
        }
      : {
          width: availableWidth,
          height: availableWidth / aspectRatio,
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
  sportSelectorContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  picker: {
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
    height: 150, // Add fixed height for better vertical centering
  },
});
