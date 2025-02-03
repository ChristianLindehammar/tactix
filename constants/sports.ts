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
      Goalkeeper: '#5eaec3',
      Defender: '#a7d0dc',
      Center: '#8b8b8b',
      Forward: '#9aadb3',
    },
  },
  soccer: {
    Svg: FootballSvg,
    aspectRatio: 549 / 800,
    positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    positionColors: {
      Goalkeeper: '#5eaec3',
      Defender: '#a7d0dc',
      Midfielder: '#8b8b8b',
      Forward: '#9aadb3',
    },
  },
  hockey: {
    Svg: HockeySvg,
    aspectRatio: 427 / 846,
    positions: ['Goalkeeper', 'Defender', 'Center', 'Forward'],
    positionColors: {
      Goalkeeper: '#5eaec3',
      Defender: '#a7d0dc',
      Center: '#8b8b8b',
      Forward: '#9aadb3',
    },
  },
  bandy: {
    Svg: BandySvg, 
    aspectRatio: 549 / 840,
    positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    positionColors: {
      Goalkeeper: '#5eaec3',
      Defender: '#a7d0dc',
      Midfielder: '#8b8b8b',
      Forward: '#9aadb3',
    },
  },
  basketball: {
    Svg: BasketballSvg, 
    aspectRatio: 429 / 803,
    positions: ['PointGuard', 'ShootingGuard', 'SmallForward', 'PowerForward', 'Center'],
    positionColors: {
      PointGuard: '#5eaec3',
      ShootingGuard: '#a7d0dc',
      SmallForward: '#8b8b8b',
      PowerForward: '#9aadb3',
      Center: '#b5c9c1',
    },
  },
};