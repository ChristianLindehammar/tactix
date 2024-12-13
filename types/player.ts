export interface Player {
  id: string;
  name: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface PlayerPosition {
  id: string;
  position: Position;
}
