import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, useColorScheme } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTranslation } from '@/hooks/useTranslation';
import type { SignInProvider } from '@/services/signInProviders';

// Google's published "G" logo. Its branding rules don't allow a one-colour version.
const GoogleLogo = () => (
  <Svg width={18} height={18} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

const COLORS = {
  apple: { light: { background: '#000', text: '#fff', border: '#000' }, dark: { background: '#fff', text: '#000', border: '#fff' } },
  google: { light: { background: '#fff', text: '#1F1F1F', border: '#747775' }, dark: { background: '#131314', text: '#E3E3E3', border: '#8E918F' } },
};

interface Props {
  id: SignInProvider['id'];
  disabled: boolean;
  onPress: () => void;
}

export function ProviderSignInButton({ id, disabled, onPress }: Props) {
  const { t } = useTranslation();
  const colors = COLORS[id][useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.background, borderColor: colors.border }, disabled && styles.disabled]}
    >
      {id === 'apple' ? <Ionicons name="logo-apple" size={20} color={colors.text} /> : <GoogleLogo />}
      <Text style={[styles.label, { color: colors.text }]}>
        {t(id === 'apple' ? 'accountContinueWithApple' : 'accountContinueWithGoogle')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  disabled: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '600' },
});
