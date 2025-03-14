/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: string
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Handle nested properties with dot notation
    if (colorName.includes('.')) {
      const [parent, child] = colorName.split('.');
      const parentValue = Colors[theme][parent as keyof typeof Colors[typeof theme]];
      return (parentValue as Record<string, string>)[child];
    }
    // Original case for top-level properties
    return Colors[theme][colorName as keyof typeof Colors[typeof theme]];
  }
}
