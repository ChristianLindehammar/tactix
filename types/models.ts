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

export interface PlayerType {
  id: string;
  name: string;
  position: { x: number; y: number };
}

export interface Position {
  x: number;
  y: number;
}

export interface PlayerPosition {
  id: string;
  position: Position;
}
