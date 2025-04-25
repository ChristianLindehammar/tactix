import * as React from "react"
import Svg, { SvgProps, Circle, G } from "react-native-svg"
import { memo } from "react"

const SvgComponent = (props: SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    {/* Main ball outline */}
    <Circle cx={12} cy={12} r={10} fill="#FFFFFF" stroke="#000" strokeWidth={1} />
    
    {/* Center pattern of holes */}
    <Circle cx={12} cy={12} r={2.2} fill="#000" />
    
    {/* Surrounding holes in a circular pattern */}
    <G>
      <Circle cx={12} cy={6.8} r={1.8} fill="#000" />
      <Circle cx={17.2} cy={12} r={1.8} fill="#000" />
      <Circle cx={12} cy={17.2} r={1.8} fill="#000" />
      <Circle cx={6.8} cy={12} r={1.8} fill="#000" />
    </G>
    
    {/* Corner holes */}
    <G>
      <Circle cx={8} cy={8} r={1.5} fill="#000" />
      <Circle cx={16} cy={8} r={1.5} fill="#000" />
      <Circle cx={16} cy={16} r={1.5} fill="#000" />
      <Circle cx={8} cy={16} r={1.5} fill="#000" />
    </G>
  </Svg>
)

const FloorballBallSvg = memo(SvgComponent)
export default FloorballBallSvg