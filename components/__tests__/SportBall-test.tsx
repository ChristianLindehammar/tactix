import * as React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Circle } from 'react-native-svg';

import { SportBall } from '../SportBall';
import { SportProvider } from '@/context/SportContext';

describe('SportBall', () => {
  it('outlines the black puck so it shows on a dark toolbar', async () => {
    const { UNSAFE_getByType } = render(
      <SportProvider>
        <SportBall sport="hockey" />
      </SportProvider>,
    );

    const puck = (await waitFor(() => UNSAFE_getByType(Circle))).props;
    expect(puck.fill).toBe('#000');
    expect(puck.stroke).toBe('#9BA1A6');
  });
});
