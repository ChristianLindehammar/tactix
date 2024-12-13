import React, { forwardRef } from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';



export const PlayerSeparator = forwardRef<View>((props, ref) => {
  return (
    <View
      ref={ref}
      {...props}
      style={[
        styles.container,
      ]}
    >
      <View style={styles.line} />
      <ThemedText style={styles.text}>Court / Bench Separator</ThemedText>
      <View style={styles.line} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  line: {
    height: 1,
    backgroundColor: '#ccc',
    width: '100%',
    marginVertical: 8,
  },
  text: {
    fontSize: 12,
    color: '#666',
  },
});
