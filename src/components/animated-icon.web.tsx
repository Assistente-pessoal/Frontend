/** Lightweight splash using Synapse branding; no Expo template artwork. */
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useAppSettings } from '@/context/app-settings';

export function AnimatedSplashOverlay() {
  const { settings } = useAppSettings();
  const [visible, setVisible] = useState(true);
  const started = useRef(false);
  const fade = useRef(new Animated.Value(1)).current;

  const reveal = useCallback(() => {
    if (started.current) return;
    started.current = true;
    void SplashScreen.hideAsync().finally(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: settings.animationsEnabled ? 320 : 0,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setVisible(false));
    });
  }, [fade, settings.animationsEnabled]);

  if (!visible) return null;
  return (
    <Animated.View pointerEvents="none" onLayout={reveal} style={[styles.splashOverlay, { opacity: fade }]}>
      <Image style={styles.splashLogo} contentFit="contain" source={require('@/assets/images/synapse-mark.png')} />
    </Animated.View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Image style={styles.iconImage} contentFit="contain" source={require('@/assets/images/synapse-mark.png')} />
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  splashLogo: { width: 160, height: 160, borderRadius: 32 },
  iconContainer: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  iconImage: { width: 120, height: 120, borderRadius: 24 },
});
