import * as React from "react"
import Svg, { SvgProps, Rect, Path } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={484}
    height={908}
    viewBox='0 0 484 908'
    fill="none"
    {...props}
  >
    <Rect
      width={903}
      height={479}
      x={2.505}
      y={905.5}
      fill="#0097B2"
      rx={37.5}
      transform="rotate(-90 2.505 905.5)"
    />
    <Path
      stroke="#fff"
      strokeWidth={5}
      d="M430 841.5h23M441.5 830v23M31 66.5h23M42.5 55v23M31 841.5h23M42.5 830v23M430 66.5h23M441.5 55v23M5 453h474.009M183.5 48.5v92h118v-92z"
    />
    <Path
      stroke="#fff"
      strokeWidth={5}
      d="M214.5 67.918v20.427h56V67.918zM223.5 67.418V58M262.5 67.418V58M183.5 859.5v-92h118v92z"
    />
    <Path
      stroke="#fff"
      strokeWidth={5}
      d="M214.5 840.083v-20.427h56v20.427zM223.5 840.583V850M262.5 840.583V850"
    />
    <Path
      fill="#fff"
      d="M242 444a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9Z"
    />
    <Path stroke="#fff" strokeWidth={5} d="M441.5 442v23M42.5 442v23" />
  </Svg>
)
const FloorballSvg = memo(SvgComponent)
export default FloorballSvg
