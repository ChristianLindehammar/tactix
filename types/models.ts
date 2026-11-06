import { Sport } from '@/constants/sports';
import { useTranslation } from '@/hooks/useTranslation';

export interface CourtConfiguration {
  id: string;
  name: string;
  playerPositions: Record<string, Position>; // Maps player ID to their position in this configuration
}

export interface Team {
  id: string;
  name: string;
  startingPlayers: PlayerType[];
  benchPlayers: PlayerType[];
  createdBy: string;
  sharedWith: string[];
  lastEdited: number;
  editedBy: string;
  sport: Sport;
  // New fields for multi-configuration support
  configurations?: CourtConfiguration[];
  selectedConfigurationId?: string;
  /** Set while coaches share this team through the server. */
  shared?: SharedTeamLink;
}

export interface SharedTeamLink {
  /** The team's id on the server, which differs from the local id. */
  id: string;
  role: 'owner' | 'editor';
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
  position: string;
  courtPosition?: Position; 
}

export interface Position {
  x: number;
  y: number;
}
