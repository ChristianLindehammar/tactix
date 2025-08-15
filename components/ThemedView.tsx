import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const background = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  const backgroundColor = typeof background === 'string' ? background : background.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
