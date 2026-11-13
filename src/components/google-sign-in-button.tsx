import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { StyleSheet } from 'react-native';

import { useAppSettings } from '@/context/app-settings';

type Props = {
  onPress(): void;
  disabled?: boolean;
};

export function GoogleSignInButton({ onPress, disabled }: Props) {
  const { resolvedTheme } = useAppSettings();
  return (
    <GoogleSigninButton
      size={GoogleSigninButton.Size.Wide}
      color={resolvedTheme === 'dark' ? 'dark' : 'light'}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel="Continuar com o Google"
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', maxWidth: 312, alignSelf: 'center' },
});
