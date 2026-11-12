import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { ThemedText } from '@/components/ThemedText';
import type { Sport } from '@/constants/sports';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { ExerciseFrame } from '@/types/exercise';
import { TacticsMarker } from '@/types/tacticsMarker';
import { sportKey } from '@/utils/sportWording';

export type ArrowKind = 'run' | 'dribble' | 'pass';

const ORDER: ArrowKind[] = ['run', 'dribble', 'pass'];

const LABEL_KEYS: Record<ArrowKind, string> = {
  run: 'arrowLegend.run',
  dribble: 'arrowLegend.dribble',
  pass: 'arrowLegend.pass',
};

/** A solid arrow with several waves is a dribble; one curve is still a run. */
const kindOf = (marker: TacticsMarker): ArrowKind | null => {
  if (marker.type === 'arrow-dashed') return 'pass';
  if (marker.type !== 'arrow-solid') return null;
  return (marker.waves ?? 0) > 1 ? 'dribble' : 'run';
};

/** The kinds of arrow drawn in any of the steps, each once. */
export function arrowKindsIn(steps: TacticsMarker[][]): ArrowKind[] {
  const found = new Set(steps.flat().map(kindOf));
  return ORDER.filter(kind => found.has(kind));
}

const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 12;
const MID = SAMPLE_HEIGHT / 2;
const LINE_END = SAMPLE_WIDTH - 7;

const samplePath = (kind: ArrowKind) =>
  kind === 'dribble'
    ? `M 1 ${MID} Q 5 ${MID - 5} 9 ${MID} T 17 ${MID} T ${LINE_END} ${MID}`
    : `M 1 ${MID} L ${LINE_END} ${MID}`;

const Sample = ({ kind, color }: { kind: ArrowKind; color: string }) => (
  <Svg width={SAMPLE_WIDTH} height={SAMPLE_HEIGHT}>
    <Path
      d={samplePath(kind)}
      stroke={color}
      strokeWidth={2}
      fill="none"
      strokeDasharray={kind === 'pass' ? '4,3' : undefined}
    />
    <Polygon
      points={`${SAMPLE_WIDTH - 1},${MID} ${LINE_END - 1},${MID - 4} ${LINE_END - 1},${MID + 4}`}
      fill={color}
    />
  </Svg>
);

/** Explains the arrows an exercise uses, under its diagram. Nothing when it has none. */
export const ArrowLegend = ({ frames, sport }: { frames: ExerciseFrame[]; sport?: Sport }) => {
  const { t } = useTranslation();
  const color = useThemeColor({}, 'text') as string;
  const kinds = arrowKindsIn(frames.map(frame => frame.markers));
  if (kinds.length === 0) return null;

  return (
    <View style={styles.row} accessibilityRole="summary">
      {kinds.map(kind => (
        <View key={kind} style={styles.item}>
          <Sample kind={kind} color={color} />
          <ThemedText style={styles.label}>{t(sportKey(LABEL_KEYS[kind], sport))}</ThemedText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
  },
});
