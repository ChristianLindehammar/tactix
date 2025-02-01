import * as React from "react"
import Svg, { SvgProps, Path, Mask } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={549}
    height={840}
    viewBox='0 0 549 840'
    fill="none"
    {...props}
  >
       <Path
      fill="#fff"
      stroke="red"
      strokeWidth={5}
      d="M7.5 820.5v-801h534v801z"
    />
    <Path stroke="red" strokeWidth={5} d="m10.005 418.5 529 1" />
    <Path
      stroke="red"
      strokeDasharray="10 10"
      strokeWidth={5}
      d="M8 64.5h124M8 778.5h124M415 778.5h124M415 64.5h124"
    />
    <Path
      stroke="red"
      strokeWidth={5}
      d="M287.5 2.5v17h-27v-17zM421.479 19.5A147.499 147.499 0 0 1 274 164.5a147.498 147.498 0 0 1-147.479-145h294.958Z"
    />
    <Path
      stroke="red"
      strokeWidth={5}
      d="M206 190.5c23.472 0 42.5-19.028 42.5-42.5s-19.028-42.5-42.5-42.5-42.5 19.028-42.5 42.5 19.028 42.5 42.5 42.5ZM343 190.5c23.472 0 42.5-19.028 42.5-42.5s-19.028-42.5-42.5-42.5-42.5 19.028-42.5 42.5 19.028 42.5 42.5 42.5Z"
    />
    <Path
      fill="red"
      d="M206 153a5 5 0 1 0-.001-10.001A5 5 0 0 0 206 153ZM343 153a5 5 0 1 0-.001-10.001A5 5 0 0 0 343 153ZM274 128a5 5 0 1 0-.001-10.001A5 5 0 0 0 274 128Z"
    />
    <Path
      stroke="red"
      strokeWidth={5}
      d="M287.5 837.5v-17h-27v17zM378.298 718.702A147.499 147.499 0 0 1 421.479 820.5H126.521a147.499 147.499 0 0 1 251.777-101.798Z"
    />
    <Path
      stroke="red"
      strokeWidth={5}
      d="M206 649.5c23.472 0 42.5 19.028 42.5 42.5s-19.028 42.5-42.5 42.5-42.5-19.028-42.5-42.5 19.028-42.5 42.5-42.5ZM343 649.5c23.472 0 42.5 19.028 42.5 42.5s-19.028 42.5-42.5 42.5-42.5-19.028-42.5-42.5 19.028-42.5 42.5-42.5Z"
    />
    <Path
      fill="red"
      d="M206 687a5 5 0 1 1-.001 10.001A5 5 0 0 1 206 687ZM343 687a5 5 0 1 1-.001 10.001A5 5 0 0 1 343 687ZM274 712a5 5 0 1 1-.001 10.001A5 5 0 0 1 274 712Z"
    />
    <Path
      stroke="red"
      strokeWidth={5}
      d="M274 377.5c23.472 0 42.5 19.028 42.5 42.5s-19.028 42.5-42.5 42.5-42.5-19.028-42.5-42.5 19.028-42.5 42.5-42.5Z"
    />
    <Path fill="red" d="M274 414a5 5 0 1 1-.001 10.001A5 5 0 0 1 274 414Z" />
    <Mask
      id="a"
      width={20}
      height={20}
      x={5}
      y={17}
      fill="#000"
      maskUnits="userSpaceOnUse"
    >
      <Path fill="#fff" d="M5 17h20v20H5z" />
      <Path d="M20 22a10 10 0 0 1-10 10V22h10Z" />
    </Mask>
    <Path
      stroke="red"
      strokeWidth={10}
      d="M20 22a10 10 0 0 1-10 10V22h10Z"
      mask="url(#a)"
    />
    <Mask
      id="b"
      width={20}
      height={20}
      x={524}
      y={17}
      fill="#000"
      maskUnits="userSpaceOnUse"
    >
      <Path fill="#fff" d="M524 17h20v20h-20z" />
      <Path d="M529 22a10.01 10.01 0 0 0 2.929 7.071A10.007 10.007 0 0 0 539 32V22h-10Z" />
    </Mask>
    <Path
      stroke="red"
      strokeWidth={10}
      d="M529 22a10.01 10.01 0 0 0 2.929 7.071A10.007 10.007 0 0 0 539 32V22h-10Z"
      mask="url(#b)"
    />
    <Mask
      id="c"
      width={20}
      height={20}
      x={5}
      y={803}
      fill="#000"
      maskUnits="userSpaceOnUse"
    >
      <Path fill="#fff" d="M5 803h20v20H5z" />
      <Path d="M20 818a10.002 10.002 0 0 0-10-10v10h10Z" />
    </Mask>
    <Path
      stroke="red"
      strokeWidth={10}
      d="M20 818a10.002 10.002 0 0 0-10-10v10h10Z"
      mask="url(#c)"
    />
    <Mask
      id="d"
      width={20}
      height={20}
      x={524}
      y={803}
      fill="#000"
      maskUnits="userSpaceOnUse"
    >
      <Path fill="#fff" d="M524 803h20v20h-20z" />
      <Path d="M529 818a10.01 10.01 0 0 1 2.929-7.071A10.008 10.008 0 0 1 539 808v10h-10Z" />
    </Mask>
    <Path
      stroke="red"
      strokeWidth={10}
      d="M529 818a10.01 10.01 0 0 1 2.929-7.071A10.008 10.008 0 0 1 539 808v10h-10Z"
      mask="url(#d)"
    />
  </Svg>
)
const BandySvg = memo(SvgComponent)
export default BandySvg
