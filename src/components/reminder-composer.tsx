import { useEffect, useRef, useState } from 'react';
import { useGlobalSearchParams } from 'expo-router';
import { useReminderSession } from '@/context/reminder-session';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { createVoxReminder, VoxApiHttpError } from '@/services/vox-api';
import { scheduleLocalReminder } from '@/services/vox-notifications';

const palette = {
  ink: '#212421',
  muted: '#747A72',
  line: '#E6E8E2',
  surface: '#FFFFFF',
  canvas: '#F7F8F5',
  green: '#245B46',
  greenSoft: '#E7F0EB',
  sage: '#B9D2C4',
  lime: '#DCEFB9',
  peach: '#F8E5D8',
  red: '#B8494F',
};

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
      return 'O serviço de voz não oferece Português (Brasil) neste aparelho. Atualize o serviço de reconhecimento do Google e habilite o idioma Português (Brasil), ou digite seu lembrete.';
    case 'service-not-allowed':
      return Platform.OS === 'android'
        ? 'O serviço de voz do Android não respondeu. Ative o app Google (Android 12 ou anterior) ou Speech Recognition & Synthesis (Android 13+), e selecione-o nas configurações de voz.'
        : 'O serviço de reconhecimento de voz está desativado ou indisponível. Verifique as configurações de voz do aparelho, ou digite seu lembrete.';
    case 'busy':
      return 'O serviço de voz está ocupado. Aguarde um instante e tente novamente.';
    default:
      return message
        ? `Não foi possível transcrever a fala: ${message}`
        : 'Não foi possível transcrever a fala. Você pode editar o texto ou digitar o lembrete.';
  }
}

function getRecognitionUnavailableMessage() {
  if (Platform.OS === 'android') {
    let services: string[] = [];
    try {
      services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
    } catch {
      services = [];
    }

    if (services.length === 0) {
      return 'Este aparelho não disponibilizou um serviço de reconhecimento de voz. Em Android 12 ou anterior, instale/ative o app Google; em Android 13 ou superior, instale/ative “Speech Recognition & Synthesis” do Google. Depois, selecione esse serviço nas configurações de voz do aparelho.';
    }

    return 'O serviço de reconhecimento encontrado no aparelho não está ativo como serviço padrão. Nas configurações do Android, selecione o reconhecimento de voz do Google e confirme que o idioma Português (Brasil) está disponível. Você também pode digitar o lembrete.';
  }

  return 'O reconhecimento de voz não está disponível neste aparelho ou navegador. Ative Siri e Ditado no iPhone, ou utilize a digitação para criar o lembrete.';
}

type FeedbackNoticeProps = {
  tone: 'error' | 'info';
  title?: string;
  message: string;
  isDark?: boolean;
};

function FeedbackNotice({ tone, title, message, isDark = false }: FeedbackNoticeProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const { settings } = useAppSettings();
  const isError = tone === 'error';

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: settings.animationsEnabled ? 280 : 0,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [entrance, settings.animationsEnabled]);

  return (
    <Animated.View
      accessibilityRole={isError ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        isError ? (isDark ? styles.noticeErrorDark : styles.noticeError) : (isDark ? styles.noticeInfoDark : styles.noticeInfo),
        {
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [-9, 0] }) },
            { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
          ],
        },
      ]}>
      <View style={[styles.noticeIcon, isError ? styles.noticeIconError : styles.noticeIconInfo, isDark && (isError ? styles.noticeIconErrorDark : styles.noticeIconInfoDark)]}>
        <Text style={[styles.noticeIconText, isError ? styles.noticeIconTextError : styles.noticeIconTextInfo]}>
          {isError ? '!' : '✓'}
        </Text>
      </View>
      <View style={styles.noticeCopy}>
        {title ? <Text style={[styles.noticeTitle, isError ? styles.noticeTitleError : styles.noticeTitleInfo, isDark && (isError ? styles.noticeTitleErrorDark : styles.noticeTitleInfoDark)]}>{title}</Text> : null}
        <Text style={[styles.noticeMessage, isError ? styles.noticeMessageError : styles.noticeMessageInfo, isDark && (isError ? styles.noticeMessageErrorDark : styles.noticeMessageInfoDark)]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

export function ReminderComposer() {
  const { width, height } = useWindowDimensions();
  const { settings, resolvedTheme } = useAppSettings();
  const isDark = resolvedTheme === 'dark';
  const appColors = getAppPalette(settings);
  const isWideLayout = width >= 1100;
  const isTabletLayout = width >= 600 && width < 1100;
  const isCompactLayout = width < 380;
  const isMobileWeb = Platform.OS === 'web' && width < 768;
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  // The composer is part of the screen layout (not absolutely positioned).
  // Cap its height on short devices and let the notice area scroll internally.
  const maxComposerHeight = keyboardVisible
    ? Math.max(132, Math.min(200, Math.round(height * 0.34)))
    : Math.max(180, Math.min(420, Math.round(height * 0.58)));
  const maxNoticeHeight = keyboardVisible ? 38 : Math.max(48, Math.min(128, Math.round(height * 0.17)));
  const inputRef = useRef<TextInput>(null);
  const { focusComposer: focusComposerParam } = useGlobalSearchParams<{ focusComposer?: string }>();

  const [transcript, setTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const { setLastSaved, reportApiResult } = useReminderSession();

  const entrance = useRef(new Animated.Value(0)).current;
  const micPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: settings.animationsEnabled ? 520 : 0,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, settings.animationsEnabled]);

  useEffect(() => {
    if (recognizing && settings.animationsEnabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.09, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(micPulse, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    micPulse.setValue(1);
    return undefined;
  }, [recognizing, micPulse, settings.animationsEnabled]);

  useEffect(() => {
    if (!focusComposerParam) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusComposerParam]);

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

  async function handleToggleRecording() {
    setErrorMessage('');
    setInfoMessage('');

    if (recognizing) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setErrorMessage(
        getRecognitionUnavailableMessage(),
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
      let androidServicePackage: string | undefined;
      if (Platform.OS === 'android') {
        try {
          const availableServices = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
          const defaultService = ExpoSpeechRecognitionModule.getDefaultRecognitionService()?.packageName;
          const androidApiLevel = Number(Platform.Version);
          const preferredService = androidApiLevel >= 33
            ? 'com.google.android.tts'
            : 'com.google.android.googlequicksearchbox';
          const fallbackService = preferredService === 'com.google.android.tts'
            ? 'com.google.android.googlequicksearchbox'
            : 'com.google.android.tts';

          // Respect the user's Android default when present. If Android returns
          // no default, prefer the Google recognition package appropriate to
          // the API level (Google app on Android 12-, Speech Recognition &
          // Synthesis on Android 13+).
          androidServicePackage = defaultService && availableServices.includes(defaultService)
            ? defaultService
            : availableServices.find((service) => service === preferredService)
              || availableServices.find((service) => service === fallbackService);
        } catch {
          androidServicePackage = undefined;
        }
      }

      const startOptions = {
        lang: 'pt-BR',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        // Android uses the system's standard recognition service. This is essential
        // for Android 12 and older, which do not support on-device recognition.
        ...(Platform.OS === 'android' ? { androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'free_form' as const }, ...(androidServicePackage ? { androidRecognitionServicePackage: androidServicePackage } : {}) } : {}),
        // iOS only uses local recognition when the device explicitly supports it.
        ...(Platform.OS === 'ios'
          ? { requiresOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition() }
          : {}),
        addsPunctuation: Platform.OS === 'ios' && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
      };
      ExpoSpeechRecognitionModule.start(startOptions);
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
      reportApiResult('online', 'Agenda API conectada e respondendo.');
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
      reportApiResult(error instanceof VoxApiHttpError ? 'online' : 'offline', error instanceof Error ? error.message : 'Falha ao acessar a Agenda API.');
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


  const themeStyles = {
    composerPanel: { backgroundColor: appColors.surface, borderColor: appColors.outline },
  };
  const inputFontFamily = settings.fontFamily === 'serif'
    ? Platform.select({ web: 'Georgia', ios: 'Georgia', default: 'serif' })
    : settings.fontFamily === 'rounded'
      ? Platform.select({ web: 'Trebuchet MS', ios: 'Avenir Next', android: 'sans-serif-rounded', default: 'sans-serif' })
      : undefined;

  // Mounted once by AppTabs while navigating between Home and Reminders.
  // Draft, recording state and feedback stay intact across both screens.
  return (
    <SafeAreaView
      edges={keyboardVisible ? ['left', 'right'] : ['bottom', 'left', 'right']}
      style={{ backgroundColor: appColors.background, width: '100%', minWidth: 0 }}>
      <View>
          <Animated.View style={[styles.composerDock, isMobileWeb && styles.composerDockMobileWeb, (isTabletLayout || isWideLayout) && styles.composerDockWide, height < 650 && styles.composerDockShort, keyboardVisible && styles.composerDockKeyboard, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
            <View style={styles.composerPanelShadow}>
            <View style={[styles.composerPanel, themeStyles.composerPanel, { maxHeight: maxComposerHeight }]}>
              {errorMessage || infoMessage ? (
                <ScrollView
                  style={[styles.noticeViewport, { maxHeight: maxNoticeHeight }]}
                  contentContainerStyle={styles.noticeList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}>
                  {errorMessage ? (
                    <FeedbackNotice key={`error-${errorMessage}`} tone="error" title="Não foi possível concluir" message={errorMessage} isDark={isDark} />
                  ) : null}
                  {infoMessage ? (
                    <FeedbackNotice key={`info-${infoMessage}`} tone="info" message={infoMessage} isDark={isDark} />
                  ) : null}
                </ScrollView>
              ) : null}

              <View style={styles.composerTopline}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.composerLabel, { color: appColors.text }]}>{recognizing ? 'O Synapse está ouvindo…' : 'Mensagem para o Synapse'}</Text>
                <Text numberOfLines={1} style={[styles.characterCount, { color: appColors.muted }]}>{transcript.length}/2000</Text>
              </View>

              <TextInput
                ref={inputRef}
                selectionColor={appColors.accent}
                accessibilityLabel="Texto do lembrete"
                multiline
                allowFontScaling
                maxLength={2000}
                onChangeText={(value) => {
                  setTranscript(value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Escreva seu lembrete ou toque no microfone…"
                placeholderTextColor={settings.highContrast ? (isDark ? '#EAEAEA' : '#333333') : '#929A91'}
                returnKeyType="default"
                scrollEnabled
                style={[styles.composerInput, { fontSize: 13 * settings.fontScale, lineHeight: 19 * settings.fontScale, color: appColors.text, ...(inputFontFamily ? { fontFamily: inputFontFamily } : {}) }]}
                textAlignVertical="top"
                value={transcript}
              />

              <View style={styles.composerBottomRow}>
                <View style={styles.composerBottomLeft}>
                  <Pressable
                    accessibilityRole="button"
                    android_ripple={{ color: appColors.accentContainer }}
                    disabled={submitting || (!transcript && !recognizing)}
                    onPress={() => {
                      setTranscript('');
                      setErrorMessage('');
                      setInfoMessage('');
                    }}
                    style={({ pressed }) => [styles.clearButton, pressed && styles.pressed, (submitting || (!transcript && !recognizing)) && styles.disabled]}>
                    <Text style={[styles.clearButtonText, { color: appColors.muted }]}>×</Text>
                    <Text style={[styles.clearButtonLabel, { color: appColors.muted }]}>Limpar</Text>
                  </Pressable>
                </View>

                <View style={styles.composerActionsRight}>
                  <Animated.View style={{ transform: [{ scale: micPulse }] }}>
                    <Pressable
                      accessibilityRole="button"
                      android_ripple={{ color: appColors.accentContainer, borderless: true }}
                      accessibilityLabel={recognizing ? 'Parar transcrição' : 'Começar transcrição por voz'}
                      onPress={handleToggleRecording}
                      style={({ pressed }) => [styles.composerMicButton, { backgroundColor: appColors.accentContainer, borderColor: appColors.accentBorder }, recognizing && styles.composerMicButtonRecording, pressed && styles.pressed]}>
                      {recognizing ? (
                        <View style={[styles.stopSquare, { backgroundColor: appColors.accent }]} />
                      ) : (
                        <View style={styles.microphoneIcon}>
                          <View style={[styles.microphoneHead, { borderColor: appColors.onAccentContainer }]} />
                          <View style={[styles.microphoneCurve, { borderColor: appColors.onAccentContainer }]} />
                          <View style={[styles.microphoneStem, { backgroundColor: appColors.onAccentContainer }]} />
                          <View style={[styles.microphoneBase, { backgroundColor: appColors.onAccentContainer }]} />
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                  <Pressable
                    accessibilityRole="button"
                    android_ripple={{ color: appColors.accentContainer, borderless: true }}
                    accessibilityLabel="Salvar lembrete"
                    disabled={submitting || !transcript.trim()}
                    onPress={handleSaveReminder}
                    style={({ pressed }) => [styles.composerSendButton, { backgroundColor: appColors.accent }, pressed && styles.pressed, (submitting || !transcript.trim()) && styles.disabled]}>
                    {submitting ? <ActivityIndicator size="small" color={appColors.onAccent} /> : <Text style={[styles.composerSendGlyph, { color: appColors.onAccent }]}>↑</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
            </View>
            {isCompactLayout && !keyboardVisible ? <Text style={[styles.dockCaption, { color: appColors.muted }]}>Toque no microfone para falar ou escreva sua mensagem</Text> : null}
          </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, width: '100%', maxWidth: '100%', backgroundColor: palette.canvas, overflow: 'hidden' },
  keyboardAvoiding: { flex: 1, width: '100%', minWidth: 0, maxWidth: '100%' },
  screen: { flex: 1, width: '100%', maxWidth: '100%', alignSelf: 'stretch', position: 'relative', minHeight: 0, minWidth: 0, overflow: 'hidden' },
  mainScroll: { flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: '100%', alignSelf: 'stretch', paddingTop: 0, paddingBottom: 24 },
  homeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 25 },
  homeHero: { width: '100%', maxWidth: 390, alignItems: 'center', gap: 10, paddingHorizontal: 4, paddingTop: 24 },
  homeSymbol: { width: 64, height: 64, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  homeSymbolText: { fontSize: 30, fontWeight: '800' },
  homeHeadline: { fontSize: 26, lineHeight: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  homeDescription: { fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  container: { width: '100%', maxWidth: 1180, minWidth: 0, alignSelf: 'center', paddingBottom: 26 },
  composerDock: { position: 'relative', width: '100%', flexShrink: 0, zIndex: 15, alignItems: 'center', paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8 },
  composerDockMobileWeb: { paddingHorizontal: 10 },
  composerDockWide: { paddingHorizontal: 28, paddingBottom: 12 },
  composerDockShort: { paddingTop: 4, paddingBottom: 4 },
  composerDockKeyboard: { paddingTop: 2, paddingBottom: 2 },
  composerPanelShadow: { width: '100%', maxWidth: 860, minWidth: 0, borderRadius: 28, shadowColor: '#000000', shadowOpacity: 0.13, shadowRadius: 22, shadowOffset: { width: 0, height: 7 }, elevation: 9 },
  composerPanel: { width: '100%', minWidth: 0, minHeight: 0, borderRadius: 28, borderWidth: 1, borderColor: '#DDE5DE', backgroundColor: palette.surface, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 10, overflow: 'hidden' },
  noticeViewport: { flexShrink: 1, minHeight: 0, marginBottom: 5 },
  noticeList: { gap: 0, paddingBottom: 1 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 13, marginBottom: 8, borderWidth: 1 },
  noticeError: { backgroundColor: '#FCEAEA', borderColor: '#F5D8D9' },
  noticeInfo: { backgroundColor: '#E8F3EB', borderColor: '#D5E8DA' },
  noticeErrorDark: { backgroundColor: '#45292B', borderColor: '#684044' },
  noticeInfoDark: { backgroundColor: '#181818', borderColor: '#373737' },
  noticeIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  noticeIconError: { backgroundColor: '#F4D0D2' },
  noticeIconInfo: { backgroundColor: '#D2E8D8' },
  noticeIconErrorDark: { backgroundColor: '#61373B' },
  noticeIconInfoDark: { backgroundColor: '#303030' },
  noticeIconText: { fontSize: 11, fontWeight: '900' },
  noticeIconTextError: { color: palette.red },
  noticeIconTextInfo: { color: palette.green },
  noticeCopy: { flex: 1, minWidth: 0, gap: 2 },
  noticeTitle: { fontSize: 10, fontWeight: '800' },
  noticeTitleError: { color: palette.red },
  noticeTitleInfo: { color: palette.green },
  noticeTitleErrorDark: { color: '#F0BFC2' },
  noticeTitleInfoDark: { color: '#E7E7E7' },
  noticeMessage: { fontSize: 10, lineHeight: 15 },
  noticeMessageError: { color: '#6F3438' },
  noticeMessageInfo: { color: '#315D43' },
  noticeMessageErrorDark: { color: '#E8C8CA' },
  noticeMessageInfoDark: { color: '#D2D2D2' },
  composerTopline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  composerLabel: { flex: 1, minWidth: 0, color: palette.ink, fontSize: 12, fontWeight: '800' },
  characterCount: { flexShrink: 0, color: '#92988F', fontSize: 10, fontWeight: '600' },
  composerInput: { minHeight: 38, maxHeight: 88, paddingHorizontal: 1, paddingVertical: 7, color: palette.ink, fontSize: 13, lineHeight: 19, outlineStyle: 'none' as any, flexShrink: 1 },
  composerBottomRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 1, minWidth: 0 },
  composerBottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  clearButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, justifyContent: 'center', borderRadius: 16 },
  clearButtonText: { color: palette.muted, fontSize: 19, lineHeight: 22, fontWeight: '400' },
  clearButtonLabel: { color: palette.muted, fontSize: 9, fontWeight: '700' },
  composerPrivacy: { color: '#92988F', fontSize: 9 },
  composerActionsRight: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  composerMicButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D2E4B7' },
  composerMicButtonRecording: { backgroundColor: '#F8DCD8', borderColor: '#E8C1BA' },
  composerSendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' },
  composerSendGlyph: { color: '#FFFFFF', fontSize: 24, lineHeight: 27, fontWeight: '700', marginTop: -3 },
  stopSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: palette.green },
  microphoneIcon: { width: 22, height: 25, position: 'relative' },
  microphoneHead: { position: 'absolute', top: 0, left: 7, width: 8, height: 14, borderRadius: 6, borderWidth: 2, borderColor: palette.green },
  microphoneCurve: { position: 'absolute', left: 3, top: 7, width: 16, height: 12, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: palette.green, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  microphoneStem: { position: 'absolute', left: 10, top: 18, width: 2, height: 5, backgroundColor: palette.green },
  microphoneBase: { position: 'absolute', left: 6, bottom: 0, width: 10, height: 2, borderRadius: 1, backgroundColor: palette.green },
  dockCaption: { color: palette.muted, fontSize: 8, textAlign: 'center', marginTop: 5 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.45 },
});
