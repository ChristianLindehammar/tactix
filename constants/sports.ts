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
}

export type SportsConfiguration = {
  [key in Sport]: SportConfig;
};

export const sportsConfig: SportsConfiguration = {
  floorball: {
    Svg: FloorballSvg,
    aspectRatio: 484 / 908,
    positions: ['Goalkeeper', 'Defender', 'Center', 'Forward'],
  },
  soccer: {
    Svg: FootballSvg,
    aspectRatio: 549 / 800,
    positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
  },
  hockey: {
    Svg: HockeySvg,
    aspectRatio: 427 / 846,
    positions: ['Goalkeeper', 'Defender', 'Center', 'Forward'],
  },
  bandy: {
    Svg: BandySvg, 
    aspectRatio: 549 / 840,
    positions: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
  },
  basketball: {
    Svg: BasketballSvg, 
    aspectRatio: 429 / 803,
    positions: ['PointGuard', 'ShootingGuard', 'SmallForward', 'PowerForward', 'Center'],
  },
};