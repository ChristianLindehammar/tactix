import React from 'react';
import Svg, { Path, Ellipse } from 'react-native-svg';

interface ConeSvgProps {
  size?: number;
  color?: string;
}

/**
 * A flat disc/saucer training cone SVG, like the ones used in sports drills.
 * Inspired by the classic orange disc cone shape.
 */
export const ConeSvg: React.FC<ConeSvgProps> = ({ size = 32, color = '#FF6D00' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* Cone body - tapered from narrow top to wide base */}
      <Path
        d="M32 8 L48 42 L16 42 Z"
        fill={color}
        stroke="#E65100"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Highlight stripe across cone */}
      <Path
        d="M24 30 L40 30 L42 34 L22 34 Z"
        fill="#FFB74D"
        opacity={0.6}
      />
      {/* Base ellipse - the flat disc bottom */}
      <Ellipse
        cx={32}
        cy={44}
        rx={18}
        ry={6}
        fill={color}
        stroke="#E65100"
        strokeWidth={1.5}
      />
      {/* Top tip highlight */}
      <Path
        d="M30 12 L32 8 L34 12 Z"
        fill="#FFB74D"
        opacity={0.5}
      />
    </Svg>
  );
};

export default ConeSvg;
