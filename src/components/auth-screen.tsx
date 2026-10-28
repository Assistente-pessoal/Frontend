import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { getAppPalette } from '@/constants/app-palette';
import { useAppSettings } from '@/context/app-settings';
import { useAuthSession } from '@/context/auth-session';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { width } = useWindowDimensions();
  const { settings } = useAppSettings();
  const colors = getAppPalette(settings);
  const { signIn, signUp, startupMessage } = useAuthSession();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === 'register';
  const compact = width < 380;

  function passwordBytes(value: string): number {
    return Array.from(value).reduce((sum, char) => {
      const point = char.codePointAt(0) ?? 0;
      return sum + (point <= 0x7F ? 1 : point <= 0x7FF ? 2 : point <= 0xFFFF ? 3 : 4);
    }, 0);
  }

  function switchMode(next: Mode) {
    if (busy) return;
    setMode(next);
    setPassword('');
    setConfirm('');
    setError(null);
  }

  async function submit() {
    if (busy) return;
    setError(null);
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) { setError('Informe um e-mail válido.'); return; }
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: compact ? 16 : 22 }]}>
          <View style={[styles.hero, { maxWidth: 440 }]}>
            <View style={[styles.brandIcon, { backgroundColor: colors.accentContainer }]}>
              <Text style={[styles.brandGlyph, { color: colors.onAccentContainer }]}>✦</Text>
            </View>
            <Text style={[styles.brand, { color: colors.accent }]}>SYNAPSE</Text>
            <Text style={[styles.title, { color: colors.text }]}>{isRegister ? 'Crie sua conta' : 'Que bom ter você aqui'}</Text>
            <Text style={[styles.description, { color: colors.muted }]}>
              {isRegister ? 'Organize suas ideias em um espaço só seu.' : 'Entre para continuar criando e organizando seus lembretes.'}
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <View style={[styles.switchRow, { backgroundColor: colors.surfaceVariant }]}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: !isRegister }} onPress={() => switchMode('login')}
                style={[styles.switchButton, !isRegister && { backgroundColor: colors.accentContainer }]}>
                <Text style={[styles.switchText, { color: !isRegister ? colors.onAccentContainer : colors.muted }]}>Entrar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: isRegister }} onPress={() => switchMode('register')}
                style={[styles.switchButton, isRegister && { backgroundColor: colors.accentContainer }]}>
                <Text style={[styles.switchText, { color: isRegister ? colors.onAccentContainer : colors.muted }]}>Criar conta</Text>
              </Pressable>
            </View>

            {isRegister && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Nome</Text>
                <TextInput accessibilityLabel="Nome completo" autoCapitalize="words" autoComplete="name" textContentType="name"
                  value={name} onChangeText={setName} editable={!busy} maxLength={100} placeholder="Como podemos chamar você?"
                  placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.outline }]}/>
              </View>
            )}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>E-mail</Text>
              <TextInput accessibilityLabel="E-mail" autoCapitalize="none" autoCorrect={false} autoComplete="email"
                textContentType="emailAddress" keyboardType="email-address" maxLength={254} editable={!busy} value={email}
                onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.outline }]}/>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Senha</Text>
              <View style={[styles.passwordRow, { backgroundColor: colors.background, borderColor: colors.outline }]}>
                <TextInput accessibilityLabel="Senha" autoCapitalize="none" autoCorrect={false}
                  autoComplete={isRegister ? 'new-password' : 'current-password'} secureTextEntry={!showPassword}
                  value={password} onChangeText={setPassword} editable={!busy} placeholder={isRegister ? 'Mínimo de 10 caracteres' : 'Sua senha'}
                  placeholderTextColor={colors.muted} style={[styles.passwordInput, { color: colors.text }]}/>
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onPress={() => setShowPassword((current) => !current)} style={styles.showButton}>
                  <Text style={[styles.showText, { color: colors.accent }]}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                </Pressable>
              </View>
            </View>
            {isRegister && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Confirmar senha</Text>
                <TextInput accessibilityLabel="Confirmar senha" autoCapitalize="none" autoCorrect={false} secureTextEntry={!showPassword}
                  value={confirm} onChangeText={setConfirm} editable={!busy} placeholder="Digite a senha novamente"
                  placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.outline }]}/>
              </View>
            )}
            {error || startupMessage ? (
              <Text accessibilityRole="alert" style={[styles.feedback, { color: error ? '#CC545B' : colors.muted }]}>
                {error || startupMessage}
              </Text>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel={isRegister ? 'Criar conta e entrar' : 'Entrar na conta'}
              accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void submit()}
              style={[styles.submit, { backgroundColor: colors.accent }, busy && { opacity: 0.6 }]}>
              {busy ? <ActivityIndicator color={colors.onAccent} /> :
                <Text style={[styles.submitText, { color: colors.onAccent }]}>{isRegister ? 'Criar conta' : 'Entrar'}  →</Text>}
            </Pressable>
            <Text style={[styles.helper, { color: colors.muted }]}>Seus lembretes ficam associados à sua conta. Use uma conexão segura para entrar.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, width: '100%' }, flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 35, gap: 24 },
  hero: { width: '100%', alignItems: 'center', gap: 9 },
  brandIcon: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  brandGlyph: { fontSize: 28, fontWeight: '800' },
  brand: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 27, lineHeight: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.8 },
  description: { fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 350 },
  formCard: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 28, padding: 20, gap: 16 },
  switchRow: { borderRadius: 18, padding: 4, flexDirection: 'row', gap: 4 },
  switchButton: { flex: 1, minHeight: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 15 },
  switchText: { fontSize: 13, fontWeight: '800' },
  field: { gap: 8 }, fieldLabel: { fontSize: 12, fontWeight: '700' },
  input: { minHeight: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, fontSize: 14 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16 },
  passwordInput: { flex: 1, minHeight: 54, paddingLeft: 15, fontSize: 14, minWidth: 0 },
  showButton: { paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' },
  showText: { fontSize: 12, fontWeight: '800' },
  feedback: { fontSize: 12, lineHeight: 19 },
  submit: { minHeight: 55, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 14, fontWeight: '800' },
  helper: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
