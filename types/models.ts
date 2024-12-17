export interface Team {
  id: string;
  name: string;
  startingPlayers: PlayerType[];
  benchPlayers: PlayerType[];
  createdBy: string;
  sharedWith: string[];
  lastEdited: number;
  editedBy: string;
}

export enum PlayerPosition {
  forward = 'Forward',
  center = 'Center',
  back = 'Back',
}

export interface PlayerType {
  id: string;
  name: string;
  position: PlayerPosition;
  courtPosition?: Position;  // renamed from 'position' to 'courtPosition'
}

export interface Position {
  x: number;
  y: number;
}
