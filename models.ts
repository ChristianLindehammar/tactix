export interface Team {
  id: string;
  name: string;
  startingPlayers: Player[];
  benchPlayers: Player[];
  createdBy: string;
  sharedWith: string[];
  lastEdited: number;
  editedBy: string;
}

export interface Player {
  id: string;
  name: string;
  position?: Position;
}

export interface Position {
  x: number;
  y: number;
}

export interface PlayerPosition {
  id: string;
  position: Position;
}
