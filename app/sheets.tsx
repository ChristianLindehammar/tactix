import { registerSheet } from 'react-native-actions-sheet';
import TeamBottomSheet from '@/components/TeamBottomSheet';

registerSheet('team-bottom-sheet', TeamBottomSheet);

declare module 'react-native-actions-sheet' {
  interface Sheets {
    'team-bottom-sheet': SheetDefinition;
  }
}

export {};
