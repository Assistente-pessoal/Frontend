import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { Colors, Spacing } from '@/constants/theme';
import { checkVoxApiHealth, createVoxReminder, VOX_API_BASE_URL, type VoxInterpretation } from '@/services/vox-api';
import { scheduleLocalReminder } from '@/services/vox-notifications';

function getSpeechErrorMessage(code: string, message?: string) {
  switch (code) {
    case 'not-allowed':
      return 'O acesso ao microfone foi negado. Ative a permissão de microfone nas configurações do aplicativo.';
    case 'network':
    case 'network-timeout':
      return 'Parece que você está offline ou a conexão de voz falhou. Verifique a internet ou digite seu lembrete.';
    case 'no-speech':
    case 'speech-timeout':
      return 'Não detectei fala. Toque no microfone e tente novamente, ou digite seu lembrete.';
    case 'language-not-supported':
      return 'O pacote de voz em português não está disponível localmente. Conecte-se à internet e baixe/ative o idioma português no reconhecimento de voz do aparelho, ou digite seu lembrete.';
    case 'service-not-allowed':
      return 'O serviço de reconhecimento de voz está desativado ou indisponível. Verifique as configurações de voz do aparelho, ou digite seu lembrete.';
    case 'busy':
      return 'O serviço de voz está ocupado. Aguarde um instante e tente novamente.';
    default:
      return message
        ? `Não foi possível transcrever a fala: ${message}`
        : 'Não foi possível transcrever a fala. Você pode editar o texto ou digitar o lembrete.';
  }
}

function formatDateTime(date: string | null, time: string | null) {
  if (!date || !time) return 'Data ou horário não identificados';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} às ${time}`;
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = windowWidth >= 880;
  const isCompactLayout = windowWidth < 380;
  const [transcript, setTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [lastSaved, setLastSaved] = useState<VoxInterpretation | null>(null);
  const [apiChecking, setApiChecking] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [apiStatusMessage, setApiStatusMessage] = useState('Conexão ainda não verificada');

  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true);
    setErrorMessage('');
    setInfoMessage('Estou ouvindo. Fale seu lembrete naturalmente.');
  });

  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false);
    setInfoMessage((current) =>
      current.startsWith('Estou ouvindo') ? 'Transcrição finalizada. Revise o texto antes de salvar.' : current,
    );
  });

  useSpeechRecognitionEvent('result', (event) => {
    const resultText = event.results.map((result) => result.transcript).join(' ').trim();
    if (resultText) setTranscript(resultText);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setRecognizing(false);
    setErrorMessage(getSpeechErrorMessage(event.error, event.message));
    setInfoMessage('Você também pode digitar ou corrigir a transcrição manualmente.');
  });

  async function handleCheckApi() {
    setApiChecking(true);
    setApiStatusMessage('Verificando conexão com a agenda-api…');
    try {
      await checkVoxApiHealth();
      setApiStatus('online');
      setApiStatusMessage('Agenda API conectada.');
    } catch (error) {
      setApiStatus('offline');
      setApiStatusMessage(error instanceof Error ? error.message : 'Não foi possível conectar à agenda-api.');
    } finally {
      setApiChecking(false);
    }
  }

  async function handleToggleRecording() {
    setErrorMessage('');
    setInfoMessage('');

    if (recognizing) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setErrorMessage(
        'O reconhecimento de voz não está disponível. Confira o serviço de voz do aparelho ou digite seu lembrete.',
      );
      return;
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(
          'A permissão de microfone foi negada. Ative-a nas configurações do aplicativo para usar a transcrição por voz.',
        );
        return;
      }

      setTranscript('');
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        // Mobile transcribes on-device to avoid sending audio to a third-party service.
        // Android needs the Portuguese offline language model installed.
        requiresOnDeviceRecognition: Platform.OS !== 'web',
        maxAlternatives: 1,
      });
    } catch (error) {
      setRecognizing(false);
      setErrorMessage(
        error instanceof Error
          ? `Não foi possível iniciar o microfone: ${error.message}`
          : 'Não foi possível iniciar o microfone. Digite o lembrete manualmente.',
      );
    }
  }

  async function handleSaveReminder() {
    const text = transcript.trim();
    if (!text) {
      setErrorMessage('Fale ou digite o que você precisa lembrar antes de salvar.');
      return;
    }
    if (text.length > 2000) {
      setErrorMessage('O lembrete deve ter no máximo 2.000 caracteres.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setInfoMessage('Enviando o texto para a agenda-api interpretar…');

    try {
      const reminder = await createVoxReminder(text);
      setApiStatus('online');
      setApiStatusMessage('Agenda API conectada.');
      setLastSaved(reminder);

      try {
        const notificationResult = await scheduleLocalReminder(reminder);
        switch (notificationResult) {
          case 'scheduled':
            setInfoMessage('Lembrete salvo e notificação local agendada no dispositivo.');
            break;
          case 'missing-date':
            setInfoMessage(
              'Lembrete salvo. Não identifiquei data e horário suficientes para agendar a notificação; revise a frase e tente novamente se necessário.',
            );
            break;
          case 'past-date':
            setInfoMessage(
              'Lembrete salvo, mas a data e o horário identificados já passaram. Edite a frase para agendar uma notificação futura.',
            );
            break;
          case 'permission-denied':
            setInfoMessage(
              'Lembrete salvo, mas as notificações estão bloqueadas. Ative-as nas configurações para receber o aviso no horário.',
            );
            break;
          case 'unsupported-platform':
            setInfoMessage(
              'Lembrete salvo. O navegador permite testar o envio à API, mas notificações locais devem ser testadas no aplicativo Android ou iOS.',
            );
            break;
        }
      } catch (notificationError) {
        setInfoMessage(
          notificationError instanceof Error
            ? `Lembrete salvo, mas não consegui agendar a notificação: ${notificationError.message}`
            : 'Lembrete salvo, mas não consegui agendar a notificação local.',
        );
      }
    } catch (error) {
      setApiStatus('offline');
      setApiStatusMessage(error instanceof Error ? error.message : 'Falha ao acessar a agenda-api.');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível conectar à agenda-api. Confira a conexão e tente novamente.',
      );
      setInfoMessage('O texto continua no campo para você corrigir ou tentar enviar novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: isCompactLayout ? 14 : isWideLayout ? 32 : 20,
              paddingBottom: isWideLayout ? 112 : 124,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.container, { maxWidth: isWideLayout ? 1120 : 700 }]}>
            <View style={styles.header}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>V</Text>
              </View>
              <View style={styles.brandTextBlock}>
                <Text style={[styles.brandName, { color: colors.text }]}>VOX</Text>
                <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>LEMBRETES POR VOZ</Text>
              </View>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: recognizing ? '#E25B55' : '#35A878' }]} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {recognizing ? 'Ouvindo' : 'Pronto'}
                </Text>
              </View>
            </View>

            <View style={styles.apiStatusRow}>
              <View style={styles.apiStatusTextRow}>
                <View
                  style={[
                    styles.apiStatusDot,
                    {
                      backgroundColor:
                        apiStatus === 'online' ? '#35A878' : apiStatus === 'offline' ? '#D15B62' : '#A0A3AD',
                    },
                  ]}
                />
                <View style={styles.apiStatusCopy}>
                  <Text style={[styles.apiStatusTitle, { color: colors.text }]}>Agenda API</Text>
                  <Text style={[styles.apiStatusSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {apiStatusMessage}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={apiChecking}
                onPress={handleCheckApi}
                style={({ pressed }) => [styles.apiCheckButton, pressed && styles.pressed, apiChecking && styles.saveButtonDisabled]}
              >
                {apiChecking ? <ActivityIndicator size="small" color="#635BDB" /> : null}
                <Text style={styles.apiCheckButtonText}>{apiChecking ? 'Testando…' : 'Testar conexão'}</Text>
              </Pressable>
            </View>

            <Text style={[styles.apiAddress, { color: colors.textSecondary }]}>Endereço configurado: {VOX_API_BASE_URL}</Text>

            <View style={styles.hero}>
              <Text style={[styles.eyebrow, { color: '#635BDB' }]}>SUA AGENDA, SEM ESFORÇO</Text>
              <Text style={[styles.title, isCompactLayout && styles.titleCompact, isWideLayout && styles.titleWide, { color: colors.text }]}>Tire seus lembretes da cabeça.</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Fale como você falaria com alguém. Depois, revise o texto e salve seu lembrete.
              </Text>
            </View>

            <View style={[styles.workspace, isWideLayout && styles.workspaceWide]}>
            <View style={[styles.voiceCard, isWideLayout && styles.workspaceCard, isCompactLayout && styles.compactCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.voiceCardHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Criar por voz</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Toque para começar a transcrição
                  </Text>
                </View>
                <View style={styles.micIconCircle}>
                  <Text style={styles.micIcon}>🎙</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={recognizing ? 'Parar transcrição' : 'Começar transcrição por voz'}
                onPress={handleToggleRecording}
                style={({ pressed }) => [
                  styles.recordButton,
                  recognizing && styles.recordButtonActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.recordButtonIcon}>{recognizing ? '■' : '●'}</Text>
                <Text style={styles.recordButtonText}>
                  {recognizing ? 'Parar de ouvir' : 'Começar a falar'}
                </Text>
              </Pressable>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Exemplo: “Me lembre de entregar o trabalho amanhã às 18 horas.”
              </Text>
            </View>

            <View style={[styles.editorCard, isWideLayout && styles.workspaceCard, isCompactLayout && styles.compactCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.editorHeading}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Revise seu lembrete</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Você pode corrigir qualquer palavra
                  </Text>
                </View>
                <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
                  {transcript.length}/2000
                </Text>
              </View>
              <TextInput
                accessibilityLabel="Texto do lembrete"
                value={transcript}
                onChangeText={(value) => {
                  setTranscript(value);
                  setErrorMessage('');
                }}
                placeholder="O que você precisa lembrar?"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={2000}
                textAlignVertical="top"
                style={[
                  styles.textInput,
                  { color: colors.text, borderColor: colors.backgroundSelected },
                ]}
              />
              <View style={[styles.actionsRow, isCompactLayout && styles.actionsRowCompact]}>
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting || (!transcript && !errorMessage && !infoMessage)}
                  onPress={() => {
                    setTranscript('');
                    setErrorMessage('');
                    setInfoMessage('');
                    setLastSaved(null);
                  }}
                  style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                  <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Limpar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting || recognizing || !transcript.trim()}
                  onPress={handleSaveReminder}
                  style={({ pressed }) => [
                    styles.saveButton,
                    (submitting || recognizing || !transcript.trim()) && styles.saveButtonDisabled,
                    pressed && styles.pressed,
                  ]}>
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : null}
                  <Text style={styles.saveButtonText}>
                    {submitting ? 'Salvando…' : 'Salvar lembrete'}
                  </Text>
                  {!submitting ? <Text style={styles.saveArrow}>→</Text> : null}
                </Pressable>
              </View>
            </View>
            </View>

            {Boolean(errorMessage) && (
              <View accessibilityRole="alert" style={[styles.errorBox, scheme === 'dark' && styles.errorBoxDark]}>
                <Text style={[styles.feedbackTitle, scheme === 'dark' && styles.feedbackTitleDark]}>Não foi possível concluir</Text>
                <Text style={[styles.feedbackText, scheme === 'dark' && styles.feedbackTextDark]}>{errorMessage}</Text>
              </View>
            )}

            {Boolean(infoMessage) && !errorMessage && (
              <View style={[styles.infoBox, scheme === 'dark' && styles.infoBoxDark]}>
                <Text style={[styles.feedbackText, scheme === 'dark' && styles.feedbackTextDark]}>{infoMessage}</Text>
              </View>
            )}

            {lastSaved && (
              <View style={[styles.savedCard, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.savedTopRow}>
                  <View style={styles.savedIcon}>
                    <Text style={styles.savedIconText}>✓</Text>
                  </View>
                  <View style={styles.savedHeaderText}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Lembrete interpretado</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                      {lastSaved.message || 'A agenda-api recebeu seu lembrete.'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.savedTitle, { color: colors.text }]}>{lastSaved.title}</Text>
                <Text style={[styles.savedMeta, { color: colors.textSecondary }]}>
                  {formatDateTime(lastSaved.date, lastSaved.time)}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaBadgeText}>{lastSaved.domain || 'pessoal'}</Text>
                  </View>
                  <View style={[styles.metaBadge, styles.priorityBadge]}>
                    <Text style={styles.priorityBadgeText}>Prioridade: {lastSaved.priority || 'média'}</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
              Apenas o texto revisado é enviado à API. O áudio não é enviado ao backend.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardAvoiding: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 16, paddingBottom: 124 },
  container: { width: '100%', maxWidth: 700, alignSelf: 'center', gap: Spacing.three },
  workspace: { gap: Spacing.three },
  workspaceWide: { flexDirection: 'row', alignItems: 'stretch' },
  workspaceCard: { flex: 1, minWidth: 0 },
  compactCard: { padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.two, gap: 10 },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#635BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  brandTextBlock: { gap: 1 },
  brandName: { fontSize: 19, fontWeight: '800', letterSpacing: 1.2 },
  brandSubtitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1.15 },
  statusPill: {
    marginLeft: 'auto',
    borderRadius: 30,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  apiStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingVertical: 4 },
  apiStatusTextRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 190 },
  apiStatusDot: { width: 9, height: 9, borderRadius: 5 },
  apiStatusCopy: { flex: 1, minWidth: 0 },
  apiStatusTitle: { fontSize: 12, fontWeight: '800' },
  apiStatusSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  apiCheckButton: { minHeight: 38, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: '#D7D4FA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  apiCheckButtonText: { color: '#635BDB', fontSize: 12, fontWeight: '800' },
  apiAddress: { fontSize: 10, lineHeight: 15, marginTop: -8 },
  hero: { paddingTop: Spacing.three, paddingBottom: Spacing.two, gap: 10, maxWidth: 760 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 34, lineHeight: 41, fontWeight: '800', letterSpacing: -0.8 },
  titleCompact: { fontSize: 28, lineHeight: 34 },
  titleWide: { fontSize: 46, lineHeight: 53, maxWidth: 780 },
  description: { fontSize: 15, lineHeight: 23, maxWidth: 520 },
  voiceCard: { borderRadius: 24, padding: Spacing.three, gap: Spacing.three },
  voiceCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  micIconCircle: {
    height: 44,
    width: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,91,219,0.12)',
  },
  micIcon: { fontSize: 21 },
  recordButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#635BDB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  recordButtonActive: { backgroundColor: '#C94D56' },
  recordButtonIcon: { color: '#FFFFFF', fontSize: 13 },
  recordButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  helperText: { fontSize: 12, lineHeight: 18 },
  editorCard: { borderRadius: 24, padding: Spacing.three, gap: Spacing.three },
  editorHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  characterCount: { fontSize: 11 },
  textInput: {
    minHeight: 122,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 22,
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  actionsRowCompact: { flexDirection: 'column-reverse', alignItems: 'stretch' },
  clearButton: { paddingVertical: 12, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    minHeight: 48,
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#26234B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  saveArrow: { color: '#FFFFFF', fontSize: 18 },
  pressed: { opacity: 0.8 },
  errorBox: { padding: 14, borderRadius: 14, backgroundColor: '#FCE8E8', gap: 5 },
  errorBoxDark: { backgroundColor: '#3A2529' },
  infoBox: { padding: 14, borderRadius: 14, backgroundColor: '#E8F5EF' },
  infoBoxDark: { backgroundColor: '#20372F' },
  feedbackTitle: { color: '#8F262D', fontWeight: '800', fontSize: 13 },
  feedbackTitleDark: { color: '#FFC4C8' },
  feedbackText: { color: '#344054', fontSize: 13, lineHeight: 19 },
  feedbackTextDark: { color: '#E5E7EB' },
  savedCard: { borderRadius: 22, padding: Spacing.three, gap: 11 },
  savedTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#D8F3E6', alignItems: 'center', justifyContent: 'center' },
  savedIconText: { color: '#157347', fontSize: 18, fontWeight: '800' },
  savedHeaderText: { flex: 1 },
  savedTitle: { fontSize: 17, fontWeight: '800', lineHeight: 23, marginTop: 2 },
  savedMeta: { fontSize: 13 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  metaBadge: { backgroundColor: 'rgba(99,91,219,0.13)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 30 },
  metaBadgeText: { color: '#5148C6', fontSize: 11, fontWeight: '700' },
  priorityBadge: { backgroundColor: 'rgba(233,160,55,0.2)' },
  priorityBadgeText: { color: '#875910', fontSize: 11, fontWeight: '700' },
  privacyNote: { fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: 6, paddingTop: 2 },
});
