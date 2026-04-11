export type TacticsMarkerType = 'player' | 'opponent' | 'ball' | 'cone' | 'arrow-solid' | 'arrow-dashed';

export interface TacticsMarker {
  id: string;
  type: TacticsMarkerType;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
}

let nextId = 0;

export function createTacticsMarker(type: TacticsMarkerType, x: number, y: number): TacticsMarker {
  nextId += 1;
  return {
    id: `marker-${nextId}`,
    type,
    x,
    y,
  };
}

export function createArrowMarker(
  type: 'arrow-solid' | 'arrow-dashed',
  x: number,
  y: number,
  endX: number,
  endY: number,
): TacticsMarker {
  nextId += 1;
  return {
    id: `marker-${nextId}`,
    type,
    x,
    y,
    endX,
    endY,
  };
}

export function getMarkerIcon(type: TacticsMarkerType, selectedSport: string | null | undefined): string {
  if (type === 'cone') return 'change-history';
  if (type === 'arrow-solid' || type === 'arrow-dashed') return 'arrow-forward';
  if (type === 'ball') {
    switch (selectedSport) {
      case 'floorball': return 'sports-hockey';
      case 'bandy': return 'sports-hockey';
      case 'hockey': return 'sports-hockey';
      case 'basketball': return 'sports-basketball';
      default: return 'sports-soccer';
    }
  }
  return 'person';
}
