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
      stroke="#fff"
      strokeWidth={5}
      rx={37.5}
      transform="rotate(-90 2.505 905.5)"
    />
    <Path
      stroke="#fff"
      strokeWidth={5}
      d="M406 841.5h23M417.5 830v23M55 66.5h23M66.5 55v23M55 841.5h23M66.5 830v23M406 66.5h23M417.5 55v23M5 453h474.009M175.5 859.5v-120h133v120z"
    />
    <Path
      stroke="#fff"
      strokeWidth={5}
      d="M210.5 822.5v-45h63v45zM263.5 822v22M224.5 822v22M175.5 48.5v120h133v-120z"
    />
    <Path
      stroke="#fff"
      strokeWidth={5}
      d="M210.5 85.5v45h63v-45zM263.5 86V64M224.5 86V64"
    />
    <Path
      fill="#fff"
      d="M242 444a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9Z"
    />
    <Path stroke="#fff" strokeWidth={5} d="M420.5 442v23M68.5 441v23" />
  </Svg>
)
const FloorballSvg = memo(SvgComponent)
export default FloorballSvg
