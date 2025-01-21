import * as React from "react"
import Svg, { SvgProps, Rect, Mask, Path, Circle } from "react-native-svg"
import { memo } from "react"
const SvgComponent = (props: SvgProps) => (
  <Svg
    width={427}
    height={846}
    viewBox='0 0 427 846'
    fill="none"
    {...props}
  >
    <Rect
      width={841}
      height={422}
      x={2.5}
      y={843.5}
      fill="#fff"
      stroke="#1D458D"
      strokeWidth={5}
      rx={81.5}
      transform="rotate(-90 2.5 843.5)"
    />
    <Mask id="a" fill="#fff">
      <Path d="M242 782.5a28.504 28.504 0 0 0-8.347-20.153 28.504 28.504 0 0 0-40.306 0A28.504 28.504 0 0 0 185 782.5h57Z" />
    </Mask>
    <Path
      fill="#4588E0"
      stroke="#D4484E"
      strokeWidth={2}
      d="M242 782.5a28.504 28.504 0 0 0-8.347-20.153 28.504 28.504 0 0 0-40.306 0A28.504 28.504 0 0 0 185 782.5h57Z"
      mask="url(#a)"
    />
    <Mask id="b" fill="#fff">
      <Path d="M242 57.5A28.503 28.503 0 0 1 213.5 86 28.5 28.5 0 0 1 185 57.5h57Z" />
    </Mask>
    <Path
      fill="#4588E0"
      stroke="#D4484E"
      strokeWidth={2}
      d="M242 57.5A28.503 28.503 0 0 1 213.5 86 28.5 28.5 0 0 1 185 57.5h57Z"
      mask="url(#b)"
    />
    <Path stroke="#D4484E" strokeWidth={2} d="M9 58h409M7 782h413" />
    <Path stroke="#D4484E" strokeWidth={4} d="M5 421h417" />
    <Path stroke="#4588E0" strokeWidth={4} d="M5 537h417M5 305h417" />
    <Circle cx={214} cy={422} r={6} fill="#4588E0" />
    <Circle cx={214.5} cy={422.5} r={63.5} stroke="#D4484E" strokeWidth={2} />
    <Circle cx={306.5} cy={698.5} r={63.5} stroke="#D4484E" strokeWidth={2} />
    <Circle cx={306.5} cy={143.5} r={63.5} stroke="#D4484E" strokeWidth={2} />
    <Circle cx={120.5} cy={143.5} r={63.5} stroke="#D4484E" strokeWidth={2} />
    <Circle cx={120.5} cy={698.5} r={63.5} stroke="#D4484E" strokeWidth={2} />
    <Circle cx={120} cy={699} r={6} fill="#D4484E" />
    <Path
      stroke="#D4484E"
      strokeWidth={2}
      d="M122.5 675v14h9M117 675v14h-9M122.5 723v-14h9M117 723v-14h-9"
    />
    <Circle cx={307} cy={699} r={6} fill="#D4484E" />
    <Path
      stroke="#D4484E"
      strokeWidth={2}
      d="M309.5 675v14h9M304 675v14h-9M309.5 723v-14h9M304 723v-14h-9"
    />
    <Circle cx={120} cy={144} r={6} fill="#D4484E" />
    <Path
      stroke="#D4484E"
      strokeWidth={2}
      d="M122.5 120v14h9M117 120v14h-9M122.5 168v-14h9M117 168v-14h-9"
    />
    <Circle cx={307} cy={144} r={6} fill="#D4484E" />
    <Path
      stroke="#D4484E"
      strokeWidth={2}
      d="M309.5 120v14h9M304 120v14h-9M309.5 168v-14h9M304 168v-14h-9M49 153h9M49 133h9M183 153h9M183 133h9M235 153h9M235 133h9M369 153h9M369 133h9"
    />
    <Circle cx={122} cy={514} r={5} fill="#D4484E" />
    <Circle cx={305} cy={514} r={5} fill="#D4484E" />
    <Circle cx={122} cy={329} r={5} fill="#D4484E" />
    <Circle cx={305} cy={329} r={5} fill="#D4484E" />
    <Path
      stroke="#D4484E"
      strokeWidth={2}
      d="M49 708h9M49 688h9M183 708h9M183 688h9M369 708h9M369 688h9M235 708h9M235 688h9"
    />
  </Svg>
)
const HockeySvg = memo(SvgComponent)
export default HockeySvg
