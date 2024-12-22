import * as React from "react";
import Svg, { Path, Line, Rect } from "react-native-svg";

interface FootballSvgProps {
  width: number;
  height: number;
}

export const FootballSvg = ({ width, height }: FootballSvgProps) => (
  <Svg width={width} height={height} viewBox="0 0 680 1050">
    <Rect
      x="0"
      y="0"
      width="680"
      height="1050"
      fill="#4CAF50"
      stroke="white"
      strokeWidth="4"
    />
    {/* Field outline */}
    <Line x1="340" y1="0" x2="340" y2="1050" stroke="white" strokeWidth="4" />
    <Path
      d="M 340 525 A 91.5 91.5 0 1 0 340 524.9"
      fill="none"
      stroke="white"
      strokeWidth="4"
    />
    {/* Penalty areas */}
    <Rect x="195" y="0" width="290" height="165" stroke="white" strokeWidth="4" fill="none" />
    <Rect x="195" y="885" width="290" height="165" stroke="white" strokeWidth="4" fill="none" />
    {/* Goal areas */}
    <Rect x="265" y="0" width="150" height="55" stroke="white" strokeWidth="4" fill="none" />
    <Rect x="265" y="995" width="150" height="55" stroke="white" strokeWidth="4" fill="none" />
  </Svg>
);

export default FootballSvg;
