import React from 'react';
import { SvgProps } from 'react-native-svg';
import { useSport } from '@/context/SportContext';
import FloorballBallSvg from './ui/FloorballBallSvg';
import BandyBallSvg from './ui/BandyBallSvg';
import HockeyBallSvg from './ui/HockeyBallSvg';
import BasketballBallSvg from './ui/BasketballBallSvg';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface SportBallProps extends SvgProps {
  sport?: string;  // Optional override for the current sport
  size?: number;   // Optional size override
  color?: string;  // Optional color override for Material Icons
}

export const SportBall: React.FC<SportBallProps> = ({ sport, size, color, ...props }) => {
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
    case 'soccer':
      return (
        <MaterialIcons
          name="sports-soccer"
          size={size || 24}
          color={color || '#FFA000'}
        />
      );
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
      // Default to soccer ball
      return (
        <MaterialIcons
          name="sports-soccer"
          size={size || 24}
          color={color || '#FFA000'}
        />
      );
  }
};

export default SportBall;