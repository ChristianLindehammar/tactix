import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Alert, Platform } from 'react-native';

import { Team } from '@/types/models';

const FILE_EXTENSION = '.coachmate';
const FILE_MIME_TYPE = 'application/octet-stream';

export const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .slice(0, 50);
};

/**
 * Validates that the parsed JSON has the required Team structure.
 * Throws a descriptive error if validation fails.
 */
export const validateTeamData = (data: unknown): Team => {
  if (!data || typeof data !== 'object') {
    throw new Error('invalidTeamFormat');
  }

  const obj = data as Record<string, unknown>;

  if (!obj.name || typeof obj.name !== 'string') {
    throw new Error('missingTeamName');
  }

  if (!Array.isArray(obj.startingPlayers)) {
    throw new Error('missingStartingPlayers');
  }

  if (!Array.isArray(obj.benchPlayers)) {
    throw new Error('missingBenchPlayers');
  }

  if (!obj.sport || typeof obj.sport !== 'string') {
    throw new Error('missingTeamSport');
  }

  return data as Team;
};

export const exportTeamToFile = async (team: Team, t: (key: string) => string) => {
  try {
    const sanitizedName = sanitizeFileName(team.name);
    const fileContent = JSON.stringify(team, null, 2);

    if (Platform.OS === "android") {
      Alert.alert(
        t('exportTeam'),
        t('howToExportTeam'),
        [
          {
            text: t('saveToFiles'),
            onPress: async () => {
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

              if (permissions.granted) {
                const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                  permissions.directoryUri,
                  `${sanitizedName}${FILE_EXTENSION}`,
                  FILE_MIME_TYPE
                );
                await FileSystem.writeAsStringAsync(uri, fileContent, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
              }
            }
          },
          {
            text: t('share'),
            onPress: async () => {
              const tempUri = `${FileSystem.cacheDirectory}${sanitizedName}${FILE_EXTENSION}`;
              await FileSystem.writeAsStringAsync(tempUri, fileContent);
              await Sharing.shareAsync(tempUri, {
                mimeType: FILE_MIME_TYPE,
                dialogTitle: t('shareTeam'),
                UTI: 'public.data'
              });
              await FileSystem.deleteAsync(tempUri, { idempotent: true });
            }
          },
          {
            text: t('cancel'),
            style: 'cancel'
          }
        ]
      );
    } else {
      const fileUri = `${FileSystem.cacheDirectory}${sanitizedName}${FILE_EXTENSION}`;
      await FileSystem.writeAsStringAsync(fileUri, fileContent);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t('error'), t('sharingNotAvailable'));
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: FILE_MIME_TYPE,
        dialogTitle: t('shareTeam'),
        UTI: 'public.data'
      });

      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (error) {
    console.error('Error exporting team:', error);
    Alert.alert(t('error'), t('failedToExportTeam'));
  }
};

export const importTeamFromFile = async (fileUri: string): Promise<Team> => {
  let contents: string;
  try {
    contents = await FileSystem.readAsStringAsync(fileUri);
  } catch (err) {
    console.error('Error reading team file:', err);
    throw new Error('fileReadError');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    console.error('Error parsing team file:', err);
    throw new Error('fileParseError');
  }

  return validateTeamData(parsed);
};
