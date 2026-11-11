import React from 'react';
import Svg, { Line, Path } from 'react-native-svg';

interface GoalSvgProps {
  size?: number;
  color?: string;
}

export const GoalSvg = ({ size = 32, color = '#FFFFFF' }: GoalSvgProps) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Path d="M3 25 V8 H29 V25" stroke={color} strokeWidth={3} fill="none" />
    {[10, 16, 22].map(x => (
      <Line key={x} x1={x} y1={8} x2={x} y2={25} stroke={color} strokeWidth={1} opacity={0.6} />
    ))}
    {[14, 20].map(y => (
      <Line key={y} x1={3} y1={y} x2={29} y2={y} stroke={color} strokeWidth={1} opacity={0.6} />
    ))}
  </Svg>
);
