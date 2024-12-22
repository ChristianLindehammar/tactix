export interface Team {
  id: string;
  name: string;
  startingPlayers: PlayerType[];
  benchPlayers: PlayerType[];
  createdBy: string;
  sharedWith: string[];
  lastEdited: number;
  editedBy: string;
  sport: 'floorball' | 'football';
}

export enum PlayerPosition {
  Goalkeeper = 'Goalkeeper',
  Defense = 'Defense',
  Midfielder = 'Midfielder',
  Forward = 'Forward',
}

export interface PlayerType {
  id: string;
  name: string;
  position: PlayerPosition;
  courtPosition?: Position; 
  index: number;  // Add this line
}

export interface Position {
  x: number;
  y: number;
}
