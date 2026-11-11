import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

import { Team } from '@/types/models';

const KNOWN_IMPORT_ERRORS = [
  'fileReadError',
  'fileParseError',
  'invalidTeamFormat',
  'missingTeamName',
  'missingStartingPlayers',
  'missingBenchPlayers',
  'missingTeamSport',
];

/** Lets the coach pick a .coachmate file and adds the team in it, explaining any problem in an alert. */
export async function pickTeamFile(
  importTeamFromFile: (fileUri: string) => Promise<Team>,
  t: (key: string, options?: object) => string,
): Promise<void> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/octet-stream', 'application/json', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const file = result.canceled ? undefined : result.assets?.[0];
    if (!file) return;
    if (!file.name.endsWith('.coachmate')) {
      Alert.alert(t('invalidFile'), t('selectCoachmateFile'));
      return;
    }
    await importTeamFromFile(file.uri);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    Alert.alert(t('error'), t(KNOWN_IMPORT_ERRORS.includes(message) ? message : 'failedToImportTeamFile'));
    console.error('Import team error:', error);
  }
}
