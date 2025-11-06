import BandySvg from '@/components/ui/BandySvg';
import BasketballSvg from '@/components/ui/BasketballSvg';
import FloorballSvg from '@/components/ui/FloorballSvg';
import FootballSvg from '@/components/ui/FootballSvg';
import HockeySvg from '@/components/ui/HockeySvg';

export type Sport = 'floorball' | 'soccer' | 'hockey' | 'bandy' | 'basketball';

interface SportConfig {
  Svg: React.FC<any>;
  aspectRatio: number;
  positions: string[];
  positionColors?: Record<string, string>;
}

export type SportsConfiguration = {
  [key in Sport]: SportConfig;
};

export const sportsConfig: SportsConfiguration = {
  floorball: {
    Svg: FloorballSvg,
    aspectRatio: 484 / 908,
    positions: ['Goalkeeper', 'Defender', 'Center', 'Forward'],
    positionColors: {
      Goalkeeper: '#5eaec3',  // Soft teal (base color)
      Defender: '#8b9dc3',    // Muted periwinkle blue
      Center: '#c3a08b',      // Warm terracotta
      Forward: '#88b894',     // Sage green
    },
  },
  soccer: {
    Svg: FootballSvg,
    aspectRatio: 549 / 800,
    positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    positionColors: {
      Goalkeeper: '#5eaec3',  // Soft teal (base color)
      Defender: '#8b9dc3',    // Muted periwinkle blue
      Midfielder: '#c3a08b',  // Warm terracotta
      Forward: '#88b894',     // Sage green
    },
  },
  hockey: {
    Svg: HockeySvg,
    aspectRatio: 427 / 846,
    positions: ['Goalkeeper', 'Defender', 'Center', 'Forward'],
    positionColors: {
      Goalkeeper: '#5eaec3',  // Soft teal (base color)
      Defender: '#8b9dc3',    // Muted periwinkle blue
      Center: '#c3a08b',      // Warm terracotta
      Forward: '#88b894',     // Sage green
    },
  },
  bandy: {
    Svg: BandySvg, 
    aspectRatio: 549 / 840,
    positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    positionColors: {
      Goalkeeper: '#5eaec3',  // Soft teal (base color)
      Defender: '#8b9dc3',    // Muted periwinkle blue
      Midfielder: '#c3a08b',  // Warm terracotta
      Forward: '#88b894',     // Sage green
    },
  },
  basketball: {
    Svg: BasketballSvg, 
    aspectRatio: 429 / 803,
    positions: ['PointGuard', 'ShootingGuard', 'SmallForward', 'PowerForward', 'Center'],
    positionColors: {
      PointGuard: '#5eaec3',      // Soft teal (base color)
      ShootingGuard: '#8b9dc3',   // Muted periwinkle blue
      SmallForward: '#c3a08b',    // Warm terracotta
      PowerForward: '#88b894',    // Sage green
      Center: '#b89dab',          // Dusty mauve
    },
  },
};