import React from 'react';
import { SvgProps } from 'react-native-svg';
import { useSport } from '@/context/SportContext';
import FloorballBallSvg from './ui/FloorballBallSvg';
import BandyBallSvg from './ui/BandyBallSvg';
import HockeyBallSvg from './ui/HockeyBallSvg';
import BasketballBallSvg from './ui/BasketballBallSvg';

interface SportBallProps extends SvgProps {
  sport?: string;  // Optional override for the current sport
  size?: number;   // Optional size override
}

export const SportBall: React.FC<SportBallProps> = ({ sport, size, ...props }) => {
  // Use sport from context if not explicitly provided
  const { selectedSport } = useSport();
  const activeSport = sport || selectedSport || 'soccer';

  // Define common props for all ball icons
  const ballProps: SvgProps = {
    width: size || 24,
    height: size || 24,
    ...props
  };

  // Render the appropriate ball based on sport
  switch (activeSport) {
    case 'floorball':
      return <FloorballBallSvg {...ballProps} />;
    case 'bandy':
      return <BandyBallSvg {...ballProps} />;
    case 'hockey':
      return <HockeyBallSvg {...ballProps} />;
    case 'basketball':
      return <BasketballBallSvg {...ballProps} />;
    // Add cases for other sports if needed
    default:
      // Default to FloorballBall or you could add a default ball icon
      return <FloorballBallSvg {...ballProps} />;
  }
};

export default SportBall;