import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text as NativeText, useWindowDimensions, View } from 'react-native';
import { useState } from 'react';
import { useAuthSession } from '@/context/auth-session';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/app-text';
import { useAppSettings, type AppFontFamily, type AppTheme } from '@/context/app-settings';
import { AccentOptions, getAppPalette } from '@/constants/app-palette';

const fontChoices: { value: AppFontFamily; label: string; sample: string }[] = [
  { value: 'system', label: 'Do sistema', sample: 'Aa' },
  { value: 'serif', label: 'Serifada', sample: 'Aa' },
  { value: 'rounded', label: 'Arredondada', sample: 'Aa' },
];

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const colors = getAppPalette(settings);
  const { user, signOut } = useAuthSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function doSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível confirmar o encerramento da sessão.';
      setSignOutError(message);
      if (Platform.OS !== 'web') Alert.alert('Aviso sobre o logout', message);
    } finally {
      setSigningOut(false);
    }
  }

  function confirmSignOut() {
    if (Platform.OS === 'web') { void doSignOut(); return; }
    Alert.alert('Sair do Synapse?', 'Seus lembretes permanecerão na conta. As notificações locais agendadas neste aparelho serão canceladas.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => { void doSignOut(); } },
    ]);
  }

  const compact = width < 430;
  const wide = width >= 720;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 20, paddingHorizontal: compact ? 16 : wide ? 32 : 22 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" android_ripple={{ color: colors.accentContainer, borderless: true }} onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <AppText style={[styles.backGlyph, { color: colors.accent }]}>‹</AppText>
          </Pressable>
          <View style={styles.headerCopy}>
            <AppText style={[styles.kicker, { color: colors.accent }]}>SYNAPSE</AppText>
            <AppText style={[styles.title, { color: colors.text }]}>Configurações</AppText>
            <AppText style={[styles.subtitle, { color: colors.muted }]}>Personalize as cores, a leitura e o comportamento do aplicativo.</AppText>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}><AppText style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>◈</AppText></View>
            <View style={styles.cardHeaderCopy}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Cor de destaque</AppText>
              <AppText style={[styles.cardDescription, { color: colors.muted }]}>Muda botões e elementos selecionados, sem alterar o tema claro ou escuro.</AppText>
            </View>
          </View>
          <View style={styles.accentGrid}>
            {AccentOptions.map((option) => {
              const selected = settings.accent === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Cor de destaque ${option.label}`}
                  accessibilityState={{ selected }}
                  onPress={() => updateSettings({ accent: option.value })}
                  android_ripple={{ color: colors.accentContainer }}
                  style={[styles.accentChoice, { backgroundColor: selected ? colors.surfaceVariant : colors.surface, borderColor: selected ? colors.accent : colors.outline }]}>
                  <View style={styles.swatches}>
                    {option.swatches.map((swatch, index) => <View key={`${option.value}-${index}`} style={[styles.swatch, { backgroundColor: swatch }]} />)}
                  </View>
                  <View style={styles.accentLabelRow}>
                    <AppText style={[styles.accentLabel, { color: colors.text }]}>{option.label}</AppText>
                    {selected ? <AppText style={[styles.selectedMark, { color: colors.accent }]}>✓</AppText> : null}
                  </View>
                  <AppText style={[styles.accentDescription, { color: colors.muted }]}>{option.description}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}><AppText style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>A</AppText></View>
            <View style={styles.cardHeaderCopy}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Tamanho da fonte</AppText>
              <AppText style={[styles.cardDescription, { color: colors.muted }]}>Ajuste a leitura sem substituir a escala de texto do Android.</AppText>
            </View>
            <AppText style={[styles.valueLabel, { color: colors.accent }]}>{Math.round(settings.fontScale * 100)}%</AppText>
          </View>
          <View style={styles.fontControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Diminuir fonte" android_ripple={{ color: colors.accentContainer }} disabled={settings.fontScale <= 0.85} onPress={() => updateSettings({ fontScale: Math.max(0.85, Math.round((settings.fontScale - 0.05) * 100) / 100) })} style={[styles.fontButton, { backgroundColor: colors.accentContainer, borderColor: colors.outline }, settings.fontScale <= 0.85 && styles.disabled]}>
              <AppText style={[styles.fontButtonLabel, { color: colors.onAccentContainer }]}>A−</AppText>
            </Pressable>
            <View style={[styles.scaleTrack, { backgroundColor: colors.surfaceVariant }]}>
              <View style={[styles.scaleFill, { width: `${((settings.fontScale - 0.85) / 0.65) * 100}%`, backgroundColor: colors.accent }]} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Aumentar fonte" android_ripple={{ color: colors.accentContainer }} disabled={settings.fontScale >= 1.5} onPress={() => updateSettings({ fontScale: Math.min(1.5, Math.round((settings.fontScale + 0.05) * 100) / 100) })} style={[styles.fontButton, { backgroundColor: colors.accentContainer, borderColor: colors.outline }, settings.fontScale >= 1.5 && styles.disabled]}>
              <AppText style={[styles.fontButtonLabel, { color: colors.onAccentContainer }]}>A+</AppText>
            </Pressable>
          </View>
          <View style={styles.previewLine}>
            <AppText style={[styles.previewText, { color: colors.text }]}>Assim fica o texto no Synapse.</AppText>
            <AppText style={[styles.previewHint, { color: colors.muted }]}>Prévia</AppText>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}><AppText style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>◐</AppText></View>
            <View style={styles.cardHeaderCopy}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Tema do aplicativo</AppText>
              <AppText style={[styles.cardDescription, { color: colors.muted }]}>Siga o tema do dispositivo por padrão ou escolha manualmente. A cor de destaque é independente.</AppText>
            </View>
          </View>
          <View style={[styles.segmented, { backgroundColor: colors.surfaceVariant }]}>
            {(['system', 'light', 'dark'] as AppTheme[]).map((theme) => {
              const selected = settings.theme === theme;
              return (
                <Pressable key={theme} accessibilityRole="button" accessibilityState={{ selected }} android_ripple={{ color: colors.accentContainer }} onPress={() => updateSettings({ theme })} style={[styles.segment, selected && { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1 }]}>
                  <AppText style={[styles.segmentText, { color: selected ? colors.accent : colors.muted }]}>{theme === 'system' ? '◐ Sistema' : theme === 'light' ? '☀ Claro' : '☾ OLED'}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}><AppText style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>T</AppText></View>
            <View style={styles.cardHeaderCopy}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Fonte do aplicativo</AppText>
              <AppText style={[styles.cardDescription, { color: colors.muted }]}>Por padrão, o Synapse acompanha a fonte definida no sistema.</AppText>
            </View>
          </View>
          <View style={styles.fontChoices}>
            {fontChoices.map((font) => {
              const selected = settings.fontFamily === font.value;
              return (
                <Pressable key={font.value} accessibilityRole="button" accessibilityState={{ selected }} android_ripple={{ color: colors.accentContainer }} onPress={() => updateSettings({ fontFamily: font.value })} style={[styles.fontChoice, { borderColor: selected ? colors.accent : colors.outline, backgroundColor: selected ? colors.accentContainer : colors.surface }]}>
                  <NativeText
                    allowFontScaling
                    style={[
                      styles.fontSample,
                      { color: colors.text, fontSize: 23 * settings.fontScale },
                      font.value === 'serif' ? { fontFamily: Platform.select({ android: 'serif', ios: 'Georgia', web: 'Georgia, "Times New Roman", serif', default: 'serif' }) } : undefined,
                      font.value === 'rounded' ? { fontFamily: Platform.select({ android: 'sans-serif-rounded', ios: 'Avenir Next', web: 'Trebuchet MS, Arial, sans-serif', default: 'sans-serif-rounded' }) } : undefined,
                    ]}>
                    {font.sample}
                  </NativeText>
                  <AppText style={[styles.fontChoiceLabel, { color: selected ? colors.onAccentContainer : colors.muted }]}>{font.label}</AppText>
                  {selected ? <AppText style={[styles.selectedMark, { color: colors.accent }]}>✓</AppText> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.settingRow}>
            <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}><AppText style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>◐</AppText></View>
            <View style={styles.cardHeaderCopy}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Texto em alto contraste</AppText>
              <AppText style={[styles.cardDescription, { color: colors.muted }]}>Aumenta o contraste dos textos para facilitar a leitura.</AppText>
            </View>
            <Switch
              value={settings.highContrast}
              onValueChange={(highContrast) => updateSettings({ highContrast })}
              trackColor={{ false: colors.outline, true: colors.accent }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Ativar texto em alto contraste"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.settingRow}>
            <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}><AppText style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>◌</AppText></View>
            <View style={styles.cardHeaderCopy}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Animações</AppText>
              <AppText style={[styles.cardDescription, { color: colors.muted }]}>Ative ou desative movimentos e transições.</AppText>
            </View>
            <Switch
              value={settings.animationsEnabled}
              onValueChange={(animationsEnabled) => updateSettings({ animationsEnabled })}
              trackColor={{ false: colors.outline, true: colors.accent }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Ativar animações"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}>
              <AppText style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>♙</AppText>
            </View>
            <View style={styles.cardHeaderCopy}>
              <AppText style={[styles.cardTitle, { color: colors.text }]}>Sua conta</AppText>
              <AppText style={[styles.cardDescription, { color: colors.muted }]}>{user?.name || 'Usuário'}</AppText>
              <AppText selectable style={[styles.cardDescription, { color: colors.muted }]}>{user?.email || ''}</AppText>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Sair da conta" disabled={signingOut}
            onPress={confirmSignOut} style={[styles.resetButton, { borderColor: colors.outline }, signingOut && styles.disabled]}>
            <AppText style={[styles.resetText, { color: colors.text }]}>{signingOut ? 'Saindo…' : 'Sair da conta'}</AppText>
          </Pressable>
          {signOutError && <AppText accessibilityRole="alert" style={[styles.cardDescription, { color: '#CC545B' }]}>{signOutError}</AppText>}
        </View>

        <Pressable accessibilityRole="button" android_ripple={{ color: colors.accentContainer }} onPress={resetSettings} style={[styles.resetButton, { borderColor: colors.outline }]}>
          <AppText style={[styles.resetText, { color: colors.muted }]}>Restaurar configurações padrão</AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' },
  scroll: { flex: 1, width: '100%', maxWidth: '100%' },
  content: { width: '100%', maxWidth: 900, minWidth: 0, alignSelf: 'center', paddingBottom: 42, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  backButton: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  backGlyph: { fontSize: 30, lineHeight: 34, marginTop: -3 },
  headerCopy: { flex: 1, gap: 4, minWidth: 0 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 12, lineHeight: 18, maxWidth: 590 },
  card: { borderWidth: 1, borderRadius: 24, padding: 17, gap: 15, minWidth: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, minWidth: 0 },
  iconBubble: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconGlyph: { fontSize: 17, fontWeight: '900' },
  cardHeaderCopy: { flex: 1, gap: 3, minWidth: 0 },
  cardTitle: { fontSize: 13, fontWeight: '900' },
  cardDescription: { fontSize: 10, lineHeight: 15 },
  accentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  accentChoice: { flexGrow: 1, flexBasis: '30%', minWidth: 124, borderWidth: 1.5, borderRadius: 18, padding: 10, gap: 7, overflow: 'hidden' },
  swatches: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 22, height: 22, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  accentLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  accentLabel: { fontSize: 12, fontWeight: '900' },
  accentDescription: { fontSize: 9, lineHeight: 13 },
  selectedMark: { fontSize: 12, fontWeight: '900' },
  valueLabel: { fontSize: 12, fontWeight: '900' },
  fontControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fontButton: { width: 48, height: 48, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fontButtonLabel: { fontSize: 15, fontWeight: '900' },
  scaleTrack: { flex: 1, height: 7, borderRadius: 5, overflow: 'hidden' },
  scaleFill: { height: '100%', borderRadius: 5 },
  previewLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  previewText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  previewHint: { fontSize: 9 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 16, gap: 4 },
  segment: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  segmentText: { fontSize: 11, fontWeight: '800' },
  fontChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  fontChoice: { flex: 1, minWidth: 92, minHeight: 86, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 5, position: 'relative', overflow: 'hidden' },
  fontSample: { fontSize: 23, fontWeight: '800' },
  fontChoiceLabel: { fontSize: 9, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minWidth: 0 },
  resetButton: { minHeight: 48, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2, overflow: 'hidden' },
  resetText: { fontSize: 10, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
