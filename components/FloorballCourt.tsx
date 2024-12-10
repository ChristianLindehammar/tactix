import React from 'react';
import { View, StyleSheet } from 'react-native';
import FloorballSvg from './ui/FloorballSvg';

interface Props {
  availableHeight: number;
}

export const FloorballCourt = ({ availableHeight }: Props) => {
  const width = (availableHeight * 908) / 484; // maintain aspect ratio

  return (
    <View style={styles.container}>
      <FloorballSvg height={availableHeight} width={width} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },

});