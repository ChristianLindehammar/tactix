/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0097B2';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    bottomSheet: {
      background: '#FFFFFF',
      text: '#000000',
      icon: '#666666',
      input: '#F0F0F0',
      dragHandle: '#CCCCCC',
    },
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    bottomSheet: {
      background: '#2A2F33',
      text: '#FFFFFF',
      icon: '#9BA0A5',
      input: '#3A4045',
      dragHandle: '#9BA0A5',
    },
  },
};
