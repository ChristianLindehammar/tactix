import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Polygon, Circle } from 'react-native-svg';
import { snapEndpoint } from '@/utils/snapEndpoint';

interface ArrowMarkerProps {
  id: string;
  x: number;
  y: number;
  endX: number;
  endY: number;
  dashed: boolean;
  containerSize: { width: number; height: number };
  color?: string;
  onDragEnd: (id: string, x: number, y: number, endX: number, endY: number) => void;
  onLongPress?: () => void;
  zIndex?: number;
}

const ARROW_HEAD_SIZE = 14;
const HANDLE_HIT_SIZE = 48;

export const ArrowMarker: React.FC<ArrowMarkerProps> = ({
  id,
  x,
  y,
  endX,
  endY,
  dashed,
  containerSize,
  color = '#FFFFFF',
  onDragEnd,
  onLongPress,
  zIndex = 1,
}) => {
  // Use state for positions so SVG re-renders on every frame
  const [pos, setPos] = useState({ sx: x, sy: y, ex: endX, ey: endY });

  // Sync when props change from parent
  const propsKey = `${x},${y},${endX},${endY}`;
  const [lastPropsKey, setLastPropsKey] = useState(propsKey);
  if (propsKey !== lastPropsKey) {
    setPos({ sx: x, sy: y, ex: endX, ey: endY });
    setLastPropsKey(propsKey);
  }

  // Convert relative to pixels
  const sx = pos.sx * containerSize.width;
  const sy = pos.sy * containerSize.height;
  const ex = pos.ex * containerSize.width;
  const ey = pos.ey * containerSize.height;

  // Arrow head triangle
  const dx = ex - sx;
  const dy = ey - sy;
  const angle = Math.atan2(dy, dx);
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
    <View style={[StyleSheet.absoluteFill, { zIndex }]} pointerEvents="box-none">
      {/* SVG arrow line + head + visible handle dots */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Line
          x1={sx} y1={sy} x2={ex} y2={ey}
          stroke={color} strokeWidth={3}
          strokeDasharray={dashed ? '8,6' : undefined}
        />
        <Polygon points={headPoints} fill={color} />
        {/* Visible tail dot */}
        <Circle cx={sx} cy={sy} r={6} fill={color} opacity={0.6} />
        {/* Visible head dot */}
        <Circle cx={ex} cy={ey} r={6} fill={color} opacity={0.6} />
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
  );
};
