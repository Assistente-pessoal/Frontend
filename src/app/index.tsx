import { useCallback, useRef } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingHorizontal: width < 360 ? 16 : width < 600 ? 20 : 32 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.intro, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <View style={[styles.symbol, { backgroundColor: colors.accentContainer }]} accessible={false}>
            <Text style={[styles.symbolText, { color: colors.onAccentContainer }]}>✦</Text>
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>O que vamos lembrar?</Text>
          <Text style={[styles.description, { color: colors.muted }]}>Escreva ou fale naturalmente. O Synapse organiza seu lembrete.</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, width: '100%', minWidth: 0, overflow: 'hidden' },
  scroll: { flex: 1, width: '100%', minWidth: 0 },
  content: { flexGrow: 1, width: '100%', minWidth: 0, paddingTop: 94, paddingBottom: 16, justifyContent: 'center' },
  intro: { alignSelf: 'center', width: '100%', maxWidth: 480, gap: 12, alignItems: 'center', paddingBottom: 30 },
  symbol: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  symbolText: { fontSize: 28, fontWeight: '800' },
  heading: { fontSize: 26, lineHeight: 35, letterSpacing: -0.5, fontWeight: '800', textAlign: 'center', maxWidth: '100%' },
  description: { fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 310 },
});
