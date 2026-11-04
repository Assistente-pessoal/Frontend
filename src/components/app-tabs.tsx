/**
 * Native layout: the composer participates in flex layout and never overlays
 * the keyboard. Window measurements are only used when Android has not
 * resized its root view (edge-to-edge / alternative keyboards).
 */
import { Stack, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions, Keyboard, KeyboardAvoidingView, Platform, View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { ReminderComposer } from '@/components/reminder-composer';
import { SynapseNativeNavigation } from '@/components/synapse-native-navigation';

export default function AppTabs() {
  const pathname = usePathname();
  const showComposer = pathname === '/' || pathname === '/reminders';
  const rootRef = useRef<View>(null);
  const keyboardTop = useRef<number | null>(null);
  const measurementVersion = useRef(0);
  const pendingFrame = useRef<number | null>(null);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);

  const measureOverlap = useCallback(() => {
    const screenY = keyboardTop.current;
    if (Platform.OS !== 'android' || screenY === null) return;
    const version = ++measurementVersion.current;
    rootRef.current?.measureInWindow((_x, y, _width, height) => {
      // Native measurements can arrive after the keyboard has hidden or moved.
      // Discard stale callbacks instead of treating a null coordinate as zero.
      if (measurementVersion.current !== version || keyboardTop.current !== screenY) return;
      const overlap = Math.max(0, y + height - screenY);
      // The view may already have resized above the IME. Only compensate
      // for the actual overlap, never for the full keyboard height twice.
      setKeyboardOverlap((previous) => Math.abs(previous - overlap) > 1 ? overlap : previous);
    });
  }, []);

  const scheduleMeasurement = useCallback(() => {
    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      measureOverlap();
    });
  }, [measureOverlap]);

  const resetMeasurement = useCallback(() => {
    keyboardTop.current = null;
    measurementVersion.current++;
    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = null;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const updatePosition = (screenY: number) => {
      measurementVersion.current++;
      keyboardTop.current = screenY;
      scheduleMeasurement();
    };
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      updatePosition(event.endCoordinates.screenY);
    });
    const frameChanged = Keyboard.addListener('keyboardDidChangeFrame', (event) => {
      updatePosition(event.endCoordinates.screenY);
    });
    const dimensionsChanged = Dimensions.addEventListener('change', () => {
      if (keyboardTop.current === null) return;
      const metrics = Keyboard.metrics();
      if (metrics) updatePosition(metrics.screenY);
      else scheduleMeasurement();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      resetMeasurement();
      setKeyboardOverlap(0);
    });
    return () => {
      shown.remove(); frameChanged.remove(); hidden.remove(); dimensionsChanged.remove();
      resetMeasurement();
    };
  }, [resetMeasurement, scheduleMeasurement]);

  const onLayout = useCallback((_event: LayoutChangeEvent) => {
    if (keyboardTop.current !== null) scheduleMeasurement();
  }, [scheduleMeasurement]);

  return (
    <SynapseNativeNavigation>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <View
          ref={rootRef}
          collapsable={false}
          onLayout={onLayout}
          style={{ flex: 1, minHeight: 0, paddingBottom: keyboardOverlap, width: '100%' }}>
          <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="reminders" />
              <Stack.Screen name="explore" />
              <Stack.Screen name="settings" />
            </Stack>
          </View>
          {showComposer ? <ReminderComposer /> : null}
        </View>
      </KeyboardAvoidingView>
    </SynapseNativeNavigation>
  );
}
