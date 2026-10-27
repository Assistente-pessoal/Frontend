import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';

const tips = [
  {
    number: '01',
    title: 'Fale naturalmente',
    description: 'Diga o que você precisa fazer e, quando souber, inclua o dia e o horário. Ex.: “Me lembre de estudar para a prova amanhã às 19h”.',
  },
  {
    number: '02',
    title: 'Revise antes de salvar',
    description: 'A transcrição aparece em um campo editável. Corrija nomes, datas ou palavras que o reconhecimento não entendeu.',
  },
  {
    number: '03',
    title: 'Confirme a conexão',
    description: 'O texto é enviado para a agenda-api, que consulta o serviço de interpretação e armazena o lembrete no MongoDB.',
  },
  {
    number: '04',
    title: 'Permita notificações',
    description: 'Quando data e horário futuros forem identificados, o app tenta agendar uma notificação local. Permita notificações nas configurações do aparelho.',
  },
];

export default function HelpScreen() {
  const { width } = useWindowDimensions();
  const { settings } = useAppSettings();
  const isWideLayout = width >= 900;
  const palette = getAppPalette(settings);
  const colors = {
    background: palette.background,
    surface: palette.surface,
    border: palette.outline,
    text: palette.text,
    muted: palette.muted,
    green: palette.accent,
    note: palette.accentSoft,
    accentContainer: palette.accentContainer,
    onAccentContainer: palette.onAccentContainer,
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: 76, paddingHorizontal: width < 360 ? 16 : width < 600 ? 20 : isWideLayout ? 42 : 28 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.kicker, { color: colors.green }]}>GUIA RÁPIDO</Text>
        <Text style={[styles.title, { color: colors.text }]}>Como usar o Synapse</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Quatro passos para transformar uma frase em um lembrete organizado.</Text>

        <View style={[styles.steps, isWideLayout && styles.stepsWide]}>
          {tips.map((tip) => (
            <View key={tip.number} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isWideLayout && styles.cardWide]}>
              <View style={[styles.numberCircle, { backgroundColor: colors.accentContainer }]}>
                <Text style={[styles.numberText, { color: colors.green }]}>{tip.number}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{tip.title}</Text>
                <Text style={[styles.cardDescription, { color: colors.muted }]}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.noteCard, { backgroundColor: colors.note }]}>
          <Text style={[styles.noteTitle, { color: colors.green }]}>Sobre o reconhecimento de voz</Text>
          <Text style={[styles.note, { color: colors.muted }]}>
            O Synapse utiliza o serviço de reconhecimento configurado no aparelho. Em Android 12 ou anterior, o Google app precisa estar instalado e ativo; em Android 13 ou superior, utilize Speech Recognition & Synthesis. O idioma Português (Brasil) precisa estar disponível no serviço. Se o reconhecimento não estiver disponível, você ainda pode digitar o lembrete.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' },
  scroll: { flex: 1, width: '100%', maxWidth: '100%' },
  container: { flexGrow: 1, width: '100%', maxWidth: 1180, minWidth: 0, alignSelf: 'center', paddingBottom: 44, gap: 11 },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 32, lineHeight: 39, fontWeight: '900', letterSpacing: -0.9 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 18, maxWidth: 580 },
  steps: { gap: 12 },
  stepsWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  card: { borderRadius: 24, padding: 19, flexDirection: 'row', gap: 14, borderWidth: 1, minWidth: 0 },
  cardWide: { width: '48%', minWidth: 260, flexGrow: 1 },
  numberCircle: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 12, fontWeight: '900' },
  cardContent: { flex: 1, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardDescription: { fontSize: 12, lineHeight: 19 },
  noteCard: { marginTop: 14, borderRadius: 24, padding: 18, gap: 7 },
  noteTitle: { fontSize: 12, fontWeight: '800' },
  note: { fontSize: 11, lineHeight: 18 },
});
