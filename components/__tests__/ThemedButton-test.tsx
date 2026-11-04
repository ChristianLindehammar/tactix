import * as React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ThemedButton } from '../ThemedButton';

describe('ThemedButton', () => {
  it('is announced as a button, named by its text', () => {
    render(<ThemedButton>Save</ThemedButton>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('is announced as disabled when it is', () => {
    render(<ThemedButton disabled>Save</ThemedButton>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
