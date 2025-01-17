import * as React from "react";
import { memo } from 'react';
import Svg, { SvgProps, Path, Mask } from "react-native-svg"


export const SvgComponent = (props: SvgProps)  => (
  <Svg
  width={549}
  height={816}
  viewBox='0 0 549 816'
  fill="none"
  {...props}
>
  <Path
    fill="#4DAF50"
    stroke="#fff"
    strokeWidth={5}
    d="M7.5 808.5V7.5h534v801z"
  />
  <Path
    stroke="#fff"
    strokeWidth={5}
    d="m10.005 406.5 529 1M124.5 7.5v122h298V7.5z"
  />
  <Path
    stroke="#fff"
    strokeWidth={5}
    d="M206.5 7.5v41h134v-41zM422.5 808.5v-122h-298v122z"
  />
  <Path
    stroke="#fff"
    strokeWidth={5}
    d="M340.5 808.5v-41h-134v41zM274.5 338.5c37.555 0 68 30.445 68 68s-30.445 68-68 68-68-30.445-68-68 30.445-68 68-68Z"
  />
  <Path fill="#fff" d="M274 402a5 5 0 1 1-.001 10.001A5 5 0 0 1 274 402Z" />
  <Mask
    id="a"
    width={20}
    height={20}
    x={5}
    y={5}
    fill="#000"
    maskUnits="userSpaceOnUse"
  >
    <Path fill="#fff" d="M5 5h20v20H5z" />
    <Path d="M20 10a10 10 0 0 1-10 10V10h10Z" />
  </Mask>
  <Path
    stroke="#fff"
    strokeWidth={10}
    d="M20 10a10 10 0 0 1-10 10V10h10Z"
    mask="url(#a)"
  />
  <Mask
    id="b"
    width={20}
    height={20}
    x={524}
    y={5}
    fill="#000"
    maskUnits="userSpaceOnUse"
  >
    <Path fill="#fff" d="M524 5h20v20h-20z" />
    <Path d="M529 10a10.01 10.01 0 0 0 2.929 7.071A10.007 10.007 0 0 0 539 20V10h-10Z" />
  </Mask>
  <Path
    stroke="#fff"
    strokeWidth={10}
    d="M529 10a10.01 10.01 0 0 0 2.929 7.071A10.007 10.007 0 0 0 539 20V10h-10Z"
    mask="url(#b)"
  />
  <Mask
    id="c"
    width={20}
    height={20}
    x={5}
    y={791}
    fill="#000"
    maskUnits="userSpaceOnUse"
  >
    <Path fill="#fff" d="M5 791h20v20H5z" />
    <Path d="M20 806a10.002 10.002 0 0 0-10-10v10h10Z" />
  </Mask>
  <Path
    stroke="#fff"
    strokeWidth={10}
    d="M20 806a10.002 10.002 0 0 0-10-10v10h10Z"
    mask="url(#c)"
  />
  <Mask
    id="d"
    width={20}
    height={20}
    x={524}
    y={791}
    fill="#000"
    maskUnits="userSpaceOnUse"
  >
    <Path fill="#fff" d="M524 791h20v20h-20z" />
    <Path d="M529 806a10.01 10.01 0 0 1 2.929-7.071A10.008 10.008 0 0 1 539 796v10h-10Z" />
  </Mask>
  <Path
    stroke="#fff"
    strokeWidth={10}
    d="M529 806a10.01 10.01 0 0 1 2.929-7.071A10.008 10.008 0 0 1 539 796v10h-10Z"
    mask="url(#d)"
  />
</Svg>
);

const FootballSvg = memo(SvgComponent)
export default FootballSvg