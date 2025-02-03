import { useTranslation } from '@/hooks/useTranslation';
import { Sport } from '@/constants/sports';

export interface Team {
  id: string;
  name: string;
  startingPlayers: PlayerType[];
  benchPlayers: PlayerType[];
  createdBy: string;
  sharedWith: string[];
  lastEdited: number;
  editedBy: string;
  sport: Sport
}


export const usePlayerPositionTranslation = () => {
  const { t } = useTranslation();
  
  const translatePosition = (position: string): string => {
    return t(`playerPositions.${position}`);
  };

  return { translatePosition };
};

export interface PlayerType {
  id: string;
  name: string;
  position: string; // changed from PlayerPosition
  courtPosition?: Position; 
}

export interface Position {
  x: number;
  y: number;
}
