import * as React from "react"
import Svg, { SvgProps, Circle, Path } from "react-native-svg"
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
    <Circle cx={12} cy={12} r={10} fill="#EC7430" />
    <Path
      stroke="#000"
      strokeWidth={1}
      fill="none"
      d="M12 2C12 7.52 12 16.48 12 22"
    />
    <Path
      stroke="#000"
      strokeWidth={1}
      fill="none"
      d="M2 12H22"
    />
    <Path
      stroke="#000"
      strokeWidth={1}
      fill="none"
      d="M3.93 5.5C6.92 7.49 17.08 7.49 20.07 5.5"
    />
    <Path
      stroke="#000"
      strokeWidth={1}
      fill="none"
      d="M3.93 18.5C6.92 16.51 17.08 16.51 20.07 18.5"
    />
  </Svg>
)

const BasketballBallSvg = memo(SvgComponent)
export default BasketballBallSvg