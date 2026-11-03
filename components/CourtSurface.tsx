import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CourtSurfaceProps {
  width: number;
  height: number;
  CourtSvg: React.ComponentType<{ width: number; height: number; stroke?: string }>;
  children?: React.ReactNode;
}

export const CourtSurface = ({ width, height, CourtSvg, children }: CourtSurfaceProps) => (
  <View style={[styles.container, { width, height }]}>
    <CourtSvg width={width} height={height} />
    <View style={StyleSheet.absoluteFill}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
