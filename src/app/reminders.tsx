import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';
import { useReminderSession } from '@/context/reminder-session';
import { VOX_API_BASE_URL } from '@/services/vox-api';

function formatDateTime(date: string | null, time: string | null) {
  if (!date || !time) return 'Data ou horário não identificados';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} às ${time}`;
}

export default function RemindersScreen() {
  const { width } = useWindowDimensions();
  const { settings } = useAppSettings();
  const colors = getAppPalette(settings);
  const { lastSaved, apiChecking, apiStatus, apiStatusMessage, checkConnection } = useReminderSession();
  const entrance = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    entrance.setValue(0);
    const animation = Animated.spring(entrance, {
      toValue: 1,
      damping: 22,
      stiffness: 200,
      mass: 0.85,
      useNativeDriver: Platform.OS !== 'web',
    });
    if (settings.animationsEnabled) animation.start();
    else entrance.setValue(1);
    return () => animation.stop();
  }, [entrance, settings.animationsEnabled]));
  const isWide = width >= 720;
  const isCompact = width < 380;
  const statusColor = apiStatus === 'online' ? '#2E9871' : apiStatus === 'offline' ? '#C6535D' : colors.muted;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingHorizontal: isCompact ? 16 : width < 600 ? 20 : isWide ? 36 : 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.animatedContent, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>SYNAPSE · ORGANIZAÇÃO</Text>
          <Text style={[styles.title, { color: colors.text }]}>Seus lembretes</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Consulte o resultado mais recente e acompanhe a conexão com a Agenda API.</Text>
        </View>

        <View style={[styles.dashboard, isWide && styles.dashboardWide]}>
          <View style={[styles.card, styles.savedCard, isWide && styles.wideCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}>
                <Text style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>✓</Text>
              </View>
              <View style={styles.cardHeading}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Último lembrete salvo</Text>
                <Text style={[styles.cardCaption, { color: colors.muted }]}>Resultado mais recente desta sessão</Text>
              </View>
            </View>
            {lastSaved ? (
              <View style={styles.savedDetails}>
                <Text style={[styles.reminderTitle, { color: colors.text }]}>{lastSaved.title}</Text>
                <Text style={[styles.reminderMeta, { color: colors.accent }]}>{formatDateTime(lastSaved.date, lastSaved.time)}</Text>
                <Text style={[styles.reminderOriginal, { color: colors.muted }]}>{lastSaved.text}</Text>
                <View style={styles.chips}>
                  <View style={[styles.chip, { backgroundColor: colors.accentContainer }]}><Text style={[styles.chipText, { color: colors.onAccentContainer }]}>{lastSaved.domain}</Text></View>
                  <View style={[styles.chip, { backgroundColor: colors.surfaceVariant }]}><Text style={[styles.chipText, { color: colors.text }]}>Prioridade {lastSaved.priority}</Text></View>
                </View>
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Seu próximo lembrete aparece aqui</Text>
                <Text style={[styles.emptyDescription, { color: colors.muted }]}>Após enviar uma mensagem pelo campo abaixo, os dados interpretados pela API aparecerão aqui.</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Criar novo lembrete"
                  android_ripple={{ color: colors.accentContainer }}
                  onPress={() => router.navigate({ pathname: '/reminders', params: { focusComposer: String(Date.now()) } } as never)}
                  style={[styles.inlineButton, { backgroundColor: colors.accentContainer }]}>
                  <Text style={[styles.inlineButtonText, { color: colors.onAccentContainer }]}>+ Criar lembrete</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={[styles.card, isWide && styles.wideCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBubble, { backgroundColor: colors.accentContainer }]}>
                <Text style={[styles.iconGlyph, { color: colors.onAccentContainer }]}>↗</Text>
              </View>
              <View style={styles.cardHeading}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Conexão com a API</Text>
                <Text style={[styles.cardCaption, { color: colors.muted }]}>Verificação automática de disponibilidade</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>
            <Text accessibilityLiveRegion="polite" style={[styles.statusMessage, { color: colors.muted }]}>{apiStatusMessage}</Text>
            <Text selectable style={[styles.endpoint, { color: colors.muted }]} numberOfLines={3}>{VOX_API_BASE_URL}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Testar conexão com a Agenda API"
              disabled={apiChecking}
              android_ripple={{ color: colors.accentContainer }}
              onPress={() => void checkConnection()}
              style={[styles.checkButton, { backgroundColor: colors.accentContainer }, apiChecking && styles.disabled]}>
              {apiChecking ? <ActivityIndicator size="small" color={colors.onAccentContainer} /> : <Text style={[styles.checkButtonText, { color: colors.onAccentContainer }]}>Testar conexão</Text>}
            </Pressable>
          </View>
        </View>

        <View style={[styles.tipCard, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.tipTitle, { color: colors.accent }]}>Uma dica para começar</Text>
          <Text style={[styles.tipText, { color: colors.text }]}>Experimente: “Me lembre de ligar para a Ana amanhã às 10h”. Revise o texto e envie — o Synapse interpreta a data e o horário.</Text>
        </View>
        <Text style={[styles.footer, { color: colors.muted }]}>Este painel apresenta o último lembrete desta sessão. Uma lista histórica depende de uma rota de consulta de lembretes no backend.</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' },
  scroll: { flex: 1, width: '100%', minWidth: 0 },
  content: { flexGrow: 1, width: '100%', maxWidth: 1000, alignSelf: 'center', paddingTop: 92, paddingBottom: 22, gap: 18 },
  animatedContent: { width: '100%', minWidth: 0, gap: 18 },
  heading: { gap: 7, marginBottom: 3 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 30, lineHeight: 38, letterSpacing: -0.8, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 21, maxWidth: 540 },
  dashboard: { gap: 14 },
  dashboardWide: { flexDirection: 'row', alignItems: 'flex-start' },
  card: { minWidth: 0, borderWidth: 1, borderRadius: 26, padding: 18, gap: 15 },
  savedCard: { minHeight: 210 },
  wideCard: { flex: 1, minWidth: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  iconBubble: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconGlyph: { fontSize: 19, fontWeight: '800' },
  cardHeading: { flex: 1, minWidth: 0, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardCaption: { fontSize: 11, lineHeight: 15 },
  savedDetails: { gap: 8, paddingVertical: 4 },
  reminderTitle: { fontSize: 18, fontWeight: '800' },
  reminderMeta: { fontSize: 12, fontWeight: '700' },
  reminderOriginal: { fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
  chipText: { fontSize: 11, fontWeight: '700' },
  emptyState: { borderRadius: 20, padding: 16, gap: 9 },
  emptyTitle: { fontSize: 13, fontWeight: '800' },
  emptyDescription: { fontSize: 12, lineHeight: 19 },
  inlineButton: { alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 17, marginTop: 8 },
  inlineButtonText: { fontSize: 12, fontWeight: '800' },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  statusMessage: { fontSize: 12, lineHeight: 19 },
  endpoint: { fontSize: 11, lineHeight: 17 },
  checkButton: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', alignItems: 'center', borderRadius: 17, paddingHorizontal: 18 },
  checkButtonText: { fontSize: 12, fontWeight: '800' },
  tipCard: { borderRadius: 22, padding: 18, gap: 9 },
  tipTitle: { fontSize: 13, fontWeight: '800' },
  tipText: { fontSize: 12, lineHeight: 19 },
  footer: { fontSize: 11, lineHeight: 17, paddingHorizontal: 4 },
  disabled: { opacity: 0.6 },
});
