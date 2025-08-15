import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { Team } from '@/types/models';

const FILE_EXTENSION = '.coachmate';
const FILE_MIME_TYPE = 'application/coachmate';

export const sanitizeFileName = (name: string): string => {
  return name
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .slice(0, 50);
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
            text: 'Save to Files',
            onPress: async () => {
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              
              if (permissions.granted) {
                const tempUri = `${FileSystem.cacheDirectory}${sanitizedName}${FILE_EXTENSION}`;
                await FileSystem.writeAsStringAsync(tempUri, fileContent);
                
                const base64 = await FileSystem.readAsStringAsync(tempUri, { 
                  encoding: FileSystem.EncodingType.Base64 
                });

                await FileSystem.StorageAccessFramework.createFileAsync(
                  permissions.directoryUri, 
                  `${sanitizedName}${FILE_EXTENSION}`, 
                  FILE_MIME_TYPE
                ).then(async (uri) => {
                  await FileSystem.writeAsStringAsync(uri, base64, { 
                    encoding: FileSystem.EncodingType.Base64 
                  });
                });

                await FileSystem.deleteAsync(tempUri, { idempotent: true });
              }
            }
          },
          {
            text: 'Share',
            onPress: async () => {
              const tempUri = `${FileSystem.cacheDirectory}${sanitizedName}${FILE_EXTENSION}`;
              await FileSystem.writeAsStringAsync(tempUri, fileContent);
              await Sharing.shareAsync(tempUri, {
                mimeType: FILE_MIME_TYPE,
                dialogTitle: `Share ${team.name}`,
                UTI: 'public.data'
              });
              await FileSystem.deleteAsync(tempUri, { idempotent: true });
            }
          },
          {
            text: 'Cancel',
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
        dialogTitle: `Share ${team.name}`,
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
  try {
    const contents = await FileSystem.readAsStringAsync(fileUri);
    const parsed: Team = JSON.parse(contents);
    return parsed;
  } catch (err) {
    console.error('Error importing team file:', err);
    throw new Error('Failed to import team file');
  }
};
