import * as React from "react"
import Svg, { SvgProps, Circle } from "react-native-svg"
import { memo } from "react"

const SvgComponent = (props: SvgProps) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <Circle cx={12} cy={12} r={10} fill="#000" />
  </Svg>
)

const HockeyBallSvg = memo(SvgComponent)
export default HockeyBallSvg