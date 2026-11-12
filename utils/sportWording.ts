import type { Sport } from '@/constants/sports';

const SKATING: Record<string, string> = {
  'markerNames.arrow-solid': 'markerNames.skate',
  'arrowLegend.run': 'arrowLegend.skate',
};

const PUCK: Record<string, string> = {
  'markerNames.ball': 'markerNames.puck',
  'arrowLegend.dribble': 'arrowLegend.puckCarry',
  'focusTags.ballControl': 'focusTags.puckControl',
};

// Ice sports skate rather than run, and hockey plays with a puck
const WORDING: Partial<Record<Sport, Record<string, string>>> = {
  hockey: { ...SKATING, ...PUCK },
  bandy: SKATING,
};

/** The translation key with this sport's own word, such as "Puck" for the ball in hockey. */
export function sportKey(key: string, sport: Sport | null | undefined): string {
  return (sport && WORDING[sport]?.[key]) || key;
}
