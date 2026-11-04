import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/app-text';
import { getAppPalette } from '@/constants/app-palette';
import { useAppSettings } from '@/context/app-settings';
import { useAuthSession } from '@/context/auth-session';

type Mode = 'login' | 'register';
type Field = 'name' | 'email' | 'password' | 'confirm' | null;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function passwordBytes(value: string): number {
  return Array.from(value).reduce((sum, char) => {
    const code = char.codePointAt(0) ?? 0;
    return sum + (code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4);
  }, 0);
}

export function AuthScreen() {
  const { width } = useWindowDimensions();
  const { settings, animationsEnabled: motionEnabled } = useAppSettings();
  const palette = getAppPalette(settings);
  const { signIn, signUp, startupMessage } = useAuthSession();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<Field>(null);
  const switching = useRef(false);
  const [introOpacity] = useState(() => new Animated.Value(0));
  const [introY] = useState(() => new Animated.Value(18));
  const [logoScale] = useState(() => new Animated.Value(1));
  const [modeOpacity] = useState(() => new Animated.Value(1));
  const [modeY] = useState(() => new Animated.Value(0));
  const [buttonScale] = useState(() => new Animated.Value(1));
  const isRegister = mode === 'register';
  // Entrada suave da tela; nenhuma animação quando o usuário optou por reduzir movimentos.
  useEffect(() => {
    introOpacity.stopAnimation();
    introY.stopAnimation();
    if (!motionEnabled) {
      introOpacity.setValue(1);
      introY.setValue(0);
      return;
    }
    introOpacity.setValue(0);
    introY.setValue(18);
    Animated.parallel([
      Animated.timing(introOpacity, { toValue: 1, duration: 360, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(introY, { toValue: 0, damping: 17, stiffness: 145, mass: 1, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
    return () => { introOpacity.stopAnimation(); introY.stopAnimation(); };
  }, [motionEnabled, introOpacity, introY]);

  // Movimento de marca discreto e interrompido ao sair da tela.
  useEffect(() => {
    if (!motionEnabled) { logoScale.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(logoScale, { toValue: 1.035, duration: 1850, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(logoScale, { toValue: 1, duration: 1850, useNativeDriver: USE_NATIVE_DRIVER }),
    ]));
    animation.start();
    return () => { animation.stop(); logoScale.setValue(1); };
  }, [motionEnabled, logoScale]);

  useEffect(() => {
    if (!motionEnabled) {
      modeOpacity.stopAnimation();
      modeY.stopAnimation();
      buttonScale.stopAnimation();
      modeOpacity.setValue(1);
      modeY.setValue(0);
      buttonScale.setValue(1);
      switching.current = false;
    }
    return () => { modeOpacity.stopAnimation(); modeY.stopAnimation(); buttonScale.stopAnimation(); };
  }, [motionEnabled, modeOpacity, modeY, buttonScale]);

  function changeMode(next: Mode) {
    if (busy || switching.current || next === mode) return;
    const apply = () => {
      setMode(next);
      setPassword('');
      setConfirm('');
      setError(null);
      setFocused(null);
      setShowPassword(false);
    };
    if (!motionEnabled) { apply(); return; }
    switching.current = true;
    Animated.parallel([
      Animated.timing(modeOpacity, { toValue: 0, duration: 110, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(modeY, { toValue: -5, duration: 110, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(({ finished }) => {
      if (!finished) { switching.current = false; return; }
      apply();
      modeY.setValue(10);
      Animated.parallel([
        Animated.timing(modeOpacity, { toValue: 1, duration: 230, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(modeY, { toValue: 0, duration: 230, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start(() => { switching.current = false; });
    });
  }

  function pressFeedback(pressed: boolean) {
    if (!motionEnabled) return;
    Animated.spring(buttonScale, {
      toValue: pressed ? 0.975 : 1,
      stiffness: 350,
      damping: 23,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }

  async function submit() {
    if (busy || switching.current) return;
    setError(null);
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address) || address.length > 254) {
      setError('Informe um e-mail válido.'); return;
    }
    if (isRegister && (name.trim().length < 2 || name.trim().length > 100)) {
      setError('O nome precisa ter entre 2 e 100 caracteres.'); return;
    }
    if (isRegister && (password.length < 10 || passwordBytes(password) > 72)) {
      setError('A senha precisa ter pelo menos 10 caracteres e no máximo 72 bytes.'); return;
    }
    if (!password) { setError('Informe sua senha.'); return; }
    if (isRegister && password !== confirm) { setError('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      if (isRegister) await signUp(name, address, password);
      else await signIn(address, password);
      setPassword('');
      setConfirm('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível continuar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const textInputStyle = (field: Exclude<Field, null>) => [
    styles.input,
    { color: palette.text, backgroundColor: palette.background, borderColor: focused === field ? palette.accent : palette.outline },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: width < 380 ? 16 : 22 }]}>
          <Animated.View style={[styles.content, { opacity: introOpacity, transform: [{ translateY: introY }] }]}>
            <View style={styles.hero}>
              <Animated.View style={[styles.brandIcon, { transform: [{ scale: logoScale }] }]}>
                <Image source={require('../../assets/images/synapse-mark.png')} contentFit="contain" style={styles.brandImage} accessibilityLabel="Logo Synapse" />
              </Animated.View>
              <AppText style={[styles.brand, { color: palette.accent }]}>SYNAPSE</AppText>
              <AppText style={[styles.title, { color: palette.text }]}>{isRegister ? 'Seu espaço começa aqui' : 'Que bom ter você aqui'}</AppText>
              <AppText style={[styles.description, { color: palette.muted }]}>
                {isRegister ? 'Crie sua conta e deixe seus lembretes organizados.' : 'Entre para continuar criando e organizando seus lembretes.'}
              </AppText>
            </View>

            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
              <View style={[styles.switchRow, { backgroundColor: palette.surfaceVariant }]} accessibilityRole="tablist">
                <Pressable
                  accessibilityRole="tab" accessibilityState={{ selected: !isRegister }} disabled={busy}
                  onPress={() => changeMode('login')}
                  style={[styles.switchButton, !isRegister && { backgroundColor: palette.accentContainer }]}>
                  <AppText style={[styles.switchText, { color: !isRegister ? palette.onAccentContainer : palette.muted }]}>Entrar</AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="tab" accessibilityState={{ selected: isRegister }} disabled={busy}
                  onPress={() => changeMode('register')}
                  style={[styles.switchButton, isRegister && { backgroundColor: palette.accentContainer }]}>
                  <AppText style={[styles.switchText, { color: isRegister ? palette.onAccentContainer : palette.muted }]}>Criar conta</AppText>
                </Pressable>
              </View>

              <Animated.View style={[styles.form, { opacity: modeOpacity, transform: [{ translateY: modeY }] }]}>
                {isRegister && (
                  <View style={styles.field}>
                    <AppText style={[styles.fieldLabel, { color: palette.text }]}>Nome</AppText>
                    <TextInput accessibilityLabel="Nome completo" autoCapitalize="words" autoComplete="name" textContentType="name"
                      value={name} onChangeText={setName} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                      editable={!busy} maxLength={100} placeholder="Como podemos chamar você?"
                      placeholderTextColor={palette.muted} style={textInputStyle('name')} />
                  </View>
                )}
                <View style={styles.field}>
                  <AppText style={[styles.fieldLabel, { color: palette.text }]}>E-mail</AppText>
                  <TextInput accessibilityLabel="E-mail" autoCapitalize="none" autoCorrect={false}
                    autoComplete="email" textContentType="emailAddress" keyboardType="email-address"
                    maxLength={254} editable={!busy} value={email}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor={palette.muted}
                    style={textInputStyle('email')} />
                </View>
                <View style={styles.field}>
                  <AppText style={[styles.fieldLabel, { color: palette.text }]}>Senha</AppText>
                  <View style={[styles.passwordRow, { backgroundColor: palette.background, borderColor: focused === 'password' ? palette.accent : palette.outline }]}>
                    <TextInput accessibilityLabel="Senha" autoCapitalize="none" autoCorrect={false}
                      autoComplete={isRegister ? 'new-password' : 'current-password'} secureTextEntry={!showPassword}
                      value={password} onChangeText={setPassword} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                      editable={!busy} placeholder={isRegister ? 'Mínimo de 10 caracteres' : 'Sua senha'}
                      placeholderTextColor={palette.muted} style={[styles.passwordInput, { color: palette.text }]}
                      onSubmitEditing={() => { if (!isRegister) void submit(); }} />
                    <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      accessibilityState={{ disabled: busy }} disabled={busy} hitSlop={8}
                      onPress={() => setShowPassword((current) => !current)} style={styles.showButton}>
                      <AppText style={[styles.showText, { color: palette.accent }]}>{showPassword ? 'Ocultar' : 'Mostrar'}</AppText>
                    </Pressable>
                  </View>
                </View>
                {isRegister && (
                  <View style={styles.field}>
                    <AppText style={[styles.fieldLabel, { color: palette.text }]}>Confirmar senha</AppText>
                    <TextInput accessibilityLabel="Confirmar senha" autoCapitalize="none" autoCorrect={false}
                      autoComplete="new-password" secureTextEntry={!showPassword}
                      value={confirm} onChangeText={setConfirm} onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)}
                      editable={!busy} placeholder="Digite a senha novamente"
                      placeholderTextColor={palette.muted} style={textInputStyle('confirm')} />
                  </View>
                )}

                {(error || startupMessage) && (
                  <View style={[styles.feedbackBox, { backgroundColor: palette.surfaceVariant }]}>
                    <AppText accessibilityRole="alert" style={[styles.feedback, { color: error ? '#D4555E' : palette.muted }]}>
                      {error || startupMessage}
                    </AppText>
                  </View>
                )}

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <Pressable
                    accessibilityRole="button" accessibilityLabel={isRegister ? 'Criar conta e entrar' : 'Entrar na conta'}
                    accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => { void submit(); }}
                    onPressIn={() => pressFeedback(true)} onPressOut={() => pressFeedback(false)}
                    style={[styles.submit, { backgroundColor: palette.accent }, busy && styles.disabled]}>
                    {busy ? <ActivityIndicator color={palette.onAccent} /> : (
                      <AppText style={[styles.submitText, { color: palette.onAccent }]}>
                        {isRegister ? 'Criar conta' : 'Entrar'}   →
                      </AppText>
                    )}
                  </Pressable>
                </Animated.View>
              </Animated.View>
              <AppText style={[styles.helper, { color: palette.muted }]}>Seus lembretes ficam associados à sua conta.</AppText>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: '100%' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 26 },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 22 },
  hero: { alignItems: 'center', gap: 9 },
  brandIcon: { width: 72, height: 72, borderRadius: 23, overflow: 'hidden', backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center' },
  brandImage: { width: 72, height: 72 },
  brand: { fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
  title: { fontSize: 26, lineHeight: 33, fontWeight: '900', textAlign: 'center', letterSpacing: -0.6 },
  description: { fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 340 },
  card: { width: '100%', borderWidth: 1, borderRadius: 27, padding: 18, gap: 17 },
  switchRow: { flexDirection: 'row', borderRadius: 17, padding: 4, gap: 4 },
  switchButton: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  switchText: { fontSize: 12, fontWeight: '800' },
  form: { gap: 15 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, fontSize: 14 },
  passwordRow: { minHeight: 48, flexDirection: 'row', borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  passwordInput: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
  showButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14 },
  showText: { fontSize: 12, fontWeight: '800' },
  submit: { minHeight: 49, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  submitText: { fontSize: 14, fontWeight: '900' },
  feedbackBox: { padding: 11, borderRadius: 12 },
  feedback: { fontSize: 11, lineHeight: 17 },
  helper: { fontSize: 10, lineHeight: 16, textAlign: 'center' },
  disabled: { opacity: 0.65 },
});
