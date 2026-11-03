import { randomUUID } from 'expo-crypto';

export const TACTICS_MARKER_TYPES = [
  'player',
  'opponent',
  'ball',
  'cone',
  'arrow-solid',
  'arrow-dashed',
  'coach',
  'goal',
] as const;

export type TacticsMarkerType = (typeof TACTICS_MARKER_TYPES)[number];

export interface TacticsMarker {
  id: string;
  type: TacticsMarkerType;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  /** Short text shown on a player or opponent, such as a shirt number. */
  label?: string;
}

export function createTacticsMarker(type: TacticsMarkerType, x: number, y: number): TacticsMarker {
  return {
    id: randomUUID(),
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
  return {
    id: randomUUID(),
    type,
    x,
    y,
    endX,
    endY,
  };
}

const COURT_CENTER_X = 0.5;
const COURT_CENTER_Y = 0.5;

const isBall = (marker: TacticsMarker) => marker.type === 'ball';

const createCenteredBall = () => createTacticsMarker('ball', COURT_CENTER_X, COURT_CENTER_Y);

export function canDeleteMarker(markers: TacticsMarker[], id: string): boolean {
  const marker = markers.find(m => m.id === id);
  if (!marker || !isBall(marker)) return true;
  return markers.filter(isBall).length > 1;
}

export function ensureAtLeastOneBall(markers: TacticsMarker[]): TacticsMarker[] {
  if (markers.some(isBall)) return markers;
  return [...markers, createCenteredBall()];
}

export function clearAllMarkers(): TacticsMarker[] {
  return [createCenteredBall()];
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
