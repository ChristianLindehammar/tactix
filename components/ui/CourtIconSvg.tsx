import * as React from 'react';
import Svg, { SvgProps, Path } from 'react-native-svg';
import { memo } from 'react';
const SvgComponent = (props: SvgProps) => (
  <Svg viewBox='0 0 56 56' {...props}>
    <Path d='M7.219 36.822c.985 0 1.548-.563 1.548-1.548V23.531c0-.985-.563-1.548-1.548-1.548H0v14.84Zm13.814-7.44c0 3.218 2.292 5.972 5.288 6.696V22.747a6.744 6.744 0 0 0-5.288 6.636Zm8.525 6.696c3.016-.724 5.248-3.478 5.288-6.696.02-3.217-2.252-5.911-5.288-6.635Zm19.223-14.095c-.985 0-1.548.563-1.548 1.548v11.743c0 .985.563 1.548 1.548 1.548H56v-14.84ZM56 40.06h-7.28c-2.975 0-4.724-1.75-4.724-4.726V23.471c0-2.976 1.749-4.726 4.725-4.726H56v-2.07c0-4.143-2.111-6.234-6.314-6.234H29.558v9.27c4.705.764 8.184 4.765 8.244 9.692.06 4.966-3.519 8.968-8.244 9.732v9.25h20.128c4.203 0 6.314-2.092 6.314-6.234Zm-56 0v2.09c0 4.143 2.131 6.234 6.314 6.234H26.32v-9.25c-4.705-.743-8.244-4.745-8.244-9.731 0-4.947 3.539-9.009 8.244-9.732v-9.23H6.314C2.13 10.441 0 12.512 0 16.674v2.072h7.279c2.976 0 4.725 1.749 4.725 4.725v11.863c0 2.976-1.75 4.726-4.725 4.726Z' />
  </Svg>
);
const CourtIconSvg = memo(SvgComponent);
export default CourtIconSvg;
