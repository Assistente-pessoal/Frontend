import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { settings } = useAppSettings();
  const colors = getAppPalette(settings);
  const entrance = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useFocusEffect(useCallback(() => {
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: settings.animationsEnabled ? 300 : 0,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, settings.animationsEnabled]));

  useEffect(() => {
    if (!settings.animationsEnabled || keyboardVisible) {
      breathe.setValue(1);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 0.76, duration: 2400, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: 2400, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [breathe, keyboardVisible, settings.animationsEnabled]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingHorizontal: width < 360 ? 16 : width < 600 ? 20 : 32 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.intro, keyboardVisible && styles.introTyping, { opacity: Animated.multiply(entrance, breathe), transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Text style={[styles.heading, keyboardVisible && styles.headingTyping, { color: colors.text }]}>O que vamos lembrar?</Text>
          {!keyboardVisible && <Text style={[styles.description, { color: colors.muted }]}>Escreva ou fale naturalmente. O Synapse organiza seu lembrete.</Text>}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, width: '100%', minWidth: 0, overflow: 'hidden' },
  scroll: { flex: 1, width: '100%', minWidth: 0 },
  content: { flexGrow: 1, width: '100%', minWidth: 0, paddingTop: 16, paddingBottom: 16, justifyContent: 'center' },
  intro: { alignSelf: 'center', width: '100%', maxWidth: 480, gap: 12, alignItems: 'center', paddingBottom: 30 },
  introTyping: { paddingBottom: 4, gap: 4 },
  headingTyping: { fontSize: 19, lineHeight: 27 },
  heading: { fontSize: 26, lineHeight: 35, letterSpacing: -0.5, fontWeight: '800', textAlign: 'center', maxWidth: '100%' },
  description: { fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 310 },
});
