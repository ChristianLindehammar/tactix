import * as React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SportProvider } from '@/context/SportContext';

const SAFE_AREA = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Renders a screen inside the real providers it has in the app. The default sport is soccer. */
export const renderExerciseScreen = (screen: React.ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <SportProvider>{screen}</SportProvider>
    </SafeAreaProvider>,
  );
