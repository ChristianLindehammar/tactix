import React from 'react';
import { View, StyleSheet } from 'react-native';
import FloorballSvg from './ui/FloorballSvg';

interface Props {
  availableHeight: number;
}

export const FloorballCourt = ({ availableHeight }: Props) => {
  const height = availableHeight;
  const width = (height * 484) / 908;

  return (
    <View style={styles.container}>
      <FloorballSvg width={width} height={height} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});