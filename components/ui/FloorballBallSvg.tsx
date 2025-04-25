import * as React from "react"
import Svg, { SvgProps, Circle } from "react-native-svg"
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
    <Circle cx={12} cy={12} r={10} fill="#FFFFFF" stroke="#000" strokeWidth={0.75} />
    <Circle cx={16.5} cy={12} r={1.8} fill="#000" />
    <Circle cx={12} cy={12} r={1.8} fill="#000" />
    <Circle cx={7.5} cy={12} r={1.8} fill="#000" />
    <Circle cx={12} cy={16.5} r={1.8} fill="#000" />
    <Circle cx={12} cy={7.5} r={1.8} fill="#000" />
    <Circle cx={16.5} cy={7.5} r={1.8} fill="#000" />
    <Circle cx={7.5} cy={7.5} r={1.8} fill="#000" />
    <Circle cx={7.5} cy={16.5} r={1.8} fill="#000" />
    <Circle cx={16.5} cy={16.5} r={1.8} fill="#000" />
  </Svg>
)

const FloorballBallSvg = memo(SvgComponent)
export default FloorballBallSvg