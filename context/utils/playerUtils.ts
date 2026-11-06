import { PlayerType, Position } from '@/types/models';
import { sportsConfig } from '@/constants/sports';

export const getValidPosition = (position: string, sport: string): string => {
  const safeSport = sport in sportsConfig ? sport : 'soccer';
  const availablePositions = sportsConfig[safeSport as keyof typeof sportsConfig].positions;
  return availablePositions.includes(position) ? position : availablePositions[0];
};

export const findFreePosition = (existingPlayers: PlayerType[]): Position => {
  const spacing = 0.1;
  const padding = 0.05;

  const isPositionTaken = (pos: Position): boolean => {
    return existingPlayers.some(p => {
      if (!p.courtPosition) return false;
      const dx = p.courtPosition.x - pos.x;
      const dy = p.courtPosition.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) < spacing / 2;
    });
  };

  const maxRows = Math.floor((1 - padding * 2) / spacing);

  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col < maxRows; col++) {
      const x = padding + col * spacing;
      const y = padding + row * spacing;
      const candidate = { x, y };

      if (!isPositionTaken(candidate)) {
        return candidate;
      }
    }
  }

  // Fallback if grid is full
  return { x: 0.5, y: 0.5 };
};

/** The free spot closest to the centre circle, for a player put on the court without being dragged there. */
export const findFreePositionNearCentre = (courtPlayers: PlayerType[]): Position => {
  const spacing = 0.12;
  const isFree = (pos: Position) =>
    courtPlayers.every(p => !p.courtPosition || Math.hypot(p.courtPosition.x - pos.x, p.courtPosition.y - pos.y) >= spacing * 0.9);

  for (let ring = 0; ring <= 3; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const candidate = { x: 0.5 + dx * spacing, y: 0.5 + dy * spacing };
        if (isFree(candidate)) return candidate;
      }
    }
  }
  return { x: 0.5, y: 0.5 };
};

export const validatePlayerPosition = (position?: Position): Position | undefined => {
  if (!position) return undefined;
  
  if (position.x < 0 || position.x > 1 || position.y < 0 || position.y > 1) {
    return { x: 0.5, y: 0.5 };
  }
  
  return position;
};
