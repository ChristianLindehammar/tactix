import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

/** Colours shared by the team sheets, the team header and the team switcher. */
export function useTeamUiColors() {
  const scheme = useColorScheme() ?? 'light';
  if (scheme === 'dark') {
    return {
      sheet: Colors.dark.bottomSheet.background,
      text: Colors.dark.text,
      muted: '#A7B0B6',
      accent: '#6FD3E6',
      accentSoft: 'rgba(111, 211, 230, 0.14)',
      primary: Colors.light.tint,
      onPrimary: '#FFFFFF',
      destructive: '#FF8A80',
      destructiveSoft: 'rgba(255, 138, 128, 0.14)',
      border: Colors.dark.borderColor,
      handle: Colors.dark.bottomSheet.dragHandle,
      input: Colors.dark.bottomSheet.input,
      chip: 'rgba(255, 255, 255, 0.08)',
    };
  }
  return {
    sheet: Colors.light.bottomSheet.background,
    text: Colors.light.text,
    muted: '#56626A',
    accent: '#007A91',
    accentSoft: '#E6F2F5',
    primary: Colors.light.tint,
    onPrimary: '#FFFFFF',
    destructive: '#B42318',
    destructiveSoft: '#FDECEA',
    border: Colors.light.borderColor,
    handle: Colors.light.bottomSheet.dragHandle,
    input: '#F3F5F6',
    chip: '#EEF3F5',
  };
}
