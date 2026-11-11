import * as React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemedText } from '../ThemedText';

it(`renders correctly`, () => {
  render(<ThemedText>Snapshot test!</ThemedText>);

  expect(screen.getByText('Snapshot test!')).toBeTruthy();
});

it('leaves room in a title for the dots and rings on Ö, Ä and Å', () => {
  render(<ThemedText type="title">Övningar</ThemedText>);

  const { fontSize, lineHeight } = StyleSheet.flatten(screen.getByText('Övningar').props.style);

  expect(lineHeight).toBeGreaterThanOrEqual(fontSize * 1.2);
});
