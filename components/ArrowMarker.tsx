import React, { useRef, useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Polygon, Circle } from 'react-native-svg';
import {
  arrivalAngle,
  ArrowCurve,
  curveFromHandle,
  curveHandlePosition,
  curvePath,
  waveSnapPoints,
} from '@/utils/arrowCurve';
import { snapEndpoint } from '@/utils/snapEndpoint';

interface ArrowMarkerProps {
  id: string;
  x: number;
  y: number;
  endX: number;
  endY: number;
  dashed: boolean;
  curve?: ArrowCurve;
  /** Shows the middle dot that curves the arrow. */
  curveEditable?: boolean;
  containerSize: { width: number; height: number };
  color?: string;
  onDragEnd: (id: string, x: number, y: number, endX: number, endY: number) => void;
  onCurveEnd?: (id: string, curve: ArrowCurve | undefined) => void;
  onCurvingChange?: (curving: boolean) => void;
  onLongPress?: () => void;
  zIndex?: number;
}

const ARROW_HEAD_SIZE = 14;
const HANDLE_HIT_SIZE = 48;
const CURVE_HANDLE_HIT_SIZE = 40;
const CURVE_HANDLE_Z_INDEX = 4;
// On a shorter arrow the middle dot would cover the handles at both ends
const MIN_CURVABLE_LENGTH = 56;

export const ArrowMarker: React.FC<ArrowMarkerProps> = ({
  id,
  x,
  y,
  endX,
  endY,
  dashed,
  curve,
  curveEditable = false,
  containerSize,
  color = '#FFFFFF',
  onDragEnd,
  onCurveEnd,
  onCurvingChange,
  onLongPress,
  zIndex = 1,
}) => {
  // Use state for positions so SVG re-renders on every frame
  const [pos, setPos] = useState({ sx: x, sy: y, ex: endX, ey: endY });

  const [liveCurve, setLiveCurve] = useState(curve);
  const [curving, setCurving] = useState(false);
  // The gesture's end can run before the state from its last update has rendered
  const draggedCurve = useRef(curve);
  const curveTouch = useRef({ x: 0, y: 0 });

  // Sync when props change from parent
  const propsKey = `${x},${y},${endX},${endY},${curve?.bend},${curve?.waves}`;
  const [lastPropsKey, setLastPropsKey] = useState(propsKey);
  if (propsKey !== lastPropsKey) {
    setPos({ sx: x, sy: y, ex: endX, ey: endY });
    setLiveCurve(curve);
    setLastPropsKey(propsKey);
  }

  // Convert relative to pixels
  const sx = pos.sx * containerSize.width;
  const sy = pos.sy * containerSize.height;
  const ex = pos.ex * containerSize.width;
  const ey = pos.ey * containerSize.height;

  const start = { x: sx, y: sy };
  const end = { x: ex, y: ey };
  const courtWidth = containerSize.width;

  // Arrow head triangle
  const angle = arrivalAngle(start, end, liveCurve, courtWidth);
  const headPoints = [
    `${ex},${ey}`,
    `${ex - ARROW_HEAD_SIZE * Math.cos(angle - Math.PI / 6)},${ey - ARROW_HEAD_SIZE * Math.sin(angle - Math.PI / 6)}`,
    `${ex - ARROW_HEAD_SIZE * Math.cos(angle + Math.PI / 6)},${ey - ARROW_HEAD_SIZE * Math.sin(angle + Math.PI / 6)}`,
  ].join(' ');

  const updateTail = useCallback((translationX: number, translationY: number) => {
    const rawX = x + translationX / containerSize.width;
    const rawY = y + translationY / containerSize.height;
    // Snap tail relative to the fixed head
    setPos(p => {
      const snapped = snapEndpoint(p.ex, p.ey, rawX, rawY);
      return { ...p, sx: snapped.x, sy: snapped.y };
    });
  }, [x, y, containerSize.width, containerSize.height]);

  const updateHead = useCallback((translationX: number, translationY: number) => {
    const rawX = endX + translationX / containerSize.width;
    const rawY = endY + translationY / containerSize.height;
    // Snap head relative to the fixed tail
    setPos(p => {
      const snapped = snapEndpoint(p.sx, p.sy, rawX, rawY);
      return { ...p, ex: snapped.x, ey: snapped.y };
    });
  }, [endX, endY, containerSize.width, containerSize.height]);

  const commitDrag = useCallback(() => {
    onDragEnd(id, pos.sx, pos.sy, pos.ex, pos.ey);
  }, [id, pos, onDragEnd]);

  const handle = curveHandlePosition(start, end, liveCurve, courtWidth);
  const curvable = curveEditable && Math.hypot(ex - sx, ey - sy) >= MIN_CURVABLE_LENGTH;

  const committedHandle = curveHandlePosition(
    { x: x * containerSize.width, y: y * containerSize.height },
    { x: endX * containerSize.width, y: endY * containerSize.height },
    curve,
    courtWidth,
  );

  const noteCurveTouch = (absoluteX: number, absoluteY: number) => {
    curveTouch.current = { x: absoluteX, y: absoluteY };
  };

  const beginCurve = () => {
    draggedCurve.current = liveCurve;
    setCurving(true);
    onCurvingChange?.(true);
  };

  const updateCurve = (absoluteX: number, absoluteY: number) => {
    // From the touch down, as the gesture's own translation only starts once it activates
    const next = curveFromHandle(
      start,
      end,
      {
        x: committedHandle.x + absoluteX - curveTouch.current.x,
        y: committedHandle.y + absoluteY - curveTouch.current.y,
      },
      courtWidth,
    );
    if (next?.waves !== draggedCurve.current?.waves) void Haptics.selectionAsync();
    draggedCurve.current = next;
    setLiveCurve(next);
  };

  const commitCurve = () => onCurveEnd?.(id, draggedCurve.current);

  const finishCurve = () => {
    setCurving(false);
    onCurvingChange?.(false);
  };

  const curvePan = Gesture.Pan()
    .minDistance(5)
    .onBegin((e) => { runOnJS(noteCurveTouch)(e.absoluteX, e.absoluteY); })
    .onStart(() => { runOnJS(beginCurve)(); })
    .onUpdate((e) => { runOnJS(updateCurve)(e.absoluteX, e.absoluteY); })
    .onEnd(() => { runOnJS(commitCurve)(); })
    .onFinalize(() => { runOnJS(finishCurve)(); });

  const curveLongPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => { if (onLongPress) runOnJS(onLongPress)(); });

  const curveGesture = Gesture.Race(curvePan, curveLongPress);

  // --- Tail gesture: drag start point ---
  const tailPan = Gesture.Pan()
    .minDistance(5)
    .onUpdate((e) => { runOnJS(updateTail)(e.translationX, e.translationY); })
    .onEnd(() => { runOnJS(commitDrag)(); });

  const tailLongPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => { if (onLongPress) runOnJS(onLongPress)(); });

  const tailGesture = Gesture.Race(tailPan, tailLongPress);

  // --- Head gesture: drag end point ---
  const headPan = Gesture.Pan()
    .minDistance(5)
    .onUpdate((e) => { runOnJS(updateHead)(e.translationX, e.translationY); })
    .onEnd(() => { runOnJS(commitDrag)(); });

  const headLongPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => { if (onLongPress) runOnJS(onLongPress)(); });

  const headGesture = Gesture.Race(headPan, headLongPress);

  return (
    <>
    <View style={[StyleSheet.absoluteFill, { zIndex }]} pointerEvents="box-none">
      {/* SVG arrow line + head + visible handle dots */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          d={curvePath(start, end, liveCurve, courtWidth)}
          fill="none"
          stroke={color} strokeWidth={3}
          strokeDasharray={dashed ? '8,6' : undefined}
        />
        <Polygon points={headPoints} fill={color} />
        {/* Visible tail dot */}
        <Circle cx={sx} cy={sy} r={6} fill={color} opacity={0.6} />
        {/* Visible head dot */}
        <Circle cx={ex} cy={ey} r={6} fill={color} opacity={0.6} />
        {/* Where the middle dot snaps for each number of waves */}
        {curving && waveSnapPoints(start, end, liveCurve?.bend ?? 0, courtWidth).map(point => (
          <Circle
            key={`${point.x},${point.y}`}
            cx={point.x} cy={point.y} r={4}
            fill={color} opacity={0.45}
          />
        ))}
      </Svg>

      {/* Tail drag handle (invisible, larger hit area) */}
      <GestureDetector gesture={tailGesture}>
        <View style={{
          position: 'absolute',
          left: sx - HANDLE_HIT_SIZE / 2,
          top: sy - HANDLE_HIT_SIZE / 2,
          width: HANDLE_HIT_SIZE,
          height: HANDLE_HIT_SIZE,
        }} />
      </GestureDetector>

      {/* Head drag handle (invisible, larger hit area) */}
      <GestureDetector gesture={headGesture}>
        <View style={{
          position: 'absolute',
          left: ex - HANDLE_HIT_SIZE / 2,
          top: ey - HANDLE_HIT_SIZE / 2,
          width: HANDLE_HIT_SIZE,
          height: HANDLE_HIT_SIZE,
        }} />
      </GestureDetector>
    </View>

    {/* Above the markers, as a line through a row of cones puts this dot right under one */}
    {curvable && (
      <View style={[StyleSheet.absoluteFill, { zIndex: CURVE_HANDLE_Z_INDEX }]} pointerEvents="box-none">
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Circle cx={handle.x} cy={handle.y} r={7} fill="#FFFFFF" stroke={color} strokeWidth={2} />
        </Svg>
        <GestureDetector gesture={curveGesture}>
          <View
            testID={`arrow-curve-handle-${id}`}
            style={{
              position: 'absolute',
              left: handle.x - CURVE_HANDLE_HIT_SIZE / 2,
              top: handle.y - CURVE_HANDLE_HIT_SIZE / 2,
              width: CURVE_HANDLE_HIT_SIZE,
              height: CURVE_HANDLE_HIT_SIZE,
            }}
          />
        </GestureDetector>
      </View>
    )}
    </>
  );
};
