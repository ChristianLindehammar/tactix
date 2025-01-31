import { useTranslation } from '@/hooks/useTranslation';

export type Sport = 'floorball' | 'football' | 'hockey';


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

export enum PlayerPosition {
  Goalkeeper = 'Goalkeeper',
  Defender = 'Defender',
  Center = 'Center',
  Midfielder = 'Midfielder',
  Forward = 'Forward',
}

export const usePlayerPositionTranslation = () => {
  const { t } = useTranslation();
  
  const translatePosition = (position: PlayerPosition): string => {
    return t(`playerPositions.${position}`);
  };

  return { translatePosition };
};

export interface PlayerType {
  id: string;
  name: string;
  position: PlayerPosition;
  courtPosition?: Position; 
}

export interface Position {
  x: number;
  y: number;
}
