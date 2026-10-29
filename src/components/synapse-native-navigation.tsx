/**
 * Android/iOS navigation shell: the always-visible header participates in the
 * normal flex layout. Only the gesture target and drawer use an overlay.
 * The navigator stays mounted while the drawer opens, preserving composer state.
 */
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import {
  Animated, Keyboard, PanResponder, Pressable, ScrollView,
  StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';

type Destination = { href: '/' | '/reminders' | '/explore' | '/settings'; label: string; icon: string };
const destinations: Destination[] = [
  { href: '/', label: 'Início', icon: '⌂' },
  { href: '/reminders', label: 'Lembretes', icon: '▤' },
  { href: '/explore', label: 'Como usar', icon: '✦' },
  { href: '/settings', label: 'Configurações', icon: '⚙' },
];

export function SynapseNativeNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { settings } = useAppSettings();
  const colors = getAppPalette(settings);
  const [open, setOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(360, Math.max(180, width - 40));
  const close = useCallback(() => setOpen(false), []);
  const openDrawer = useCallback(() => { Keyboard.dismiss(); setDrawerMounted(true); setOpen(true); }, []);

  useEffect(() => {
    const animation = settings.animationsEnabled
      ? Animated.spring(progress, {
          toValue: open ? 1 : 0, damping: 26, stiffness: 260, mass: 0.9, useNativeDriver: true,
        })
      : Animated.timing(progress, { toValue: open ? 1 : 0, duration: 0, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished && !open) setDrawerMounted(false); });
    return () => animation.stop();
  }, [open, progress, settings.animationsEnabled]);

  // A visible, narrow edge target receives gestures without blocking the page.
  const edgeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
    onPanResponderRelease: (_event, gesture) => { if (gesture.dx > 46) openDrawer(); },
    onPanResponderTerminationRequest: () => true,
  }), [openDrawer]);

  const closeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      gesture.dx < -18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
    onPanResponderRelease: (_event, gesture) => { if (gesture.dx < -55) close(); },
    onPanResponderTerminationRequest: () => true,
  }), [close]);

  const navigate = useCallback((href: Destination['href']) => {
    close();
    if (pathname !== href) router.replace(href);
  }, [close, pathname]);

  const newReminder = () => {
    close();
    router.replace({ pathname: '/', params: { focusComposer: String(Date.now()) } } as never);
  };

  const onReminders = pathname === '/reminders';
  const shortcut: Destination['href'] = onReminders ? '/' : '/reminders';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, paddingHorizontal: width < 360 ? 10 : 16, backgroundColor: colors.background }]}>

          <Pressable
            accessibilityRole="button" accessibilityLabel="Abrir menu" accessibilityHint="Abre a navegação e as configurações"
            accessibilityState={{ expanded: false }}
            onPress={openDrawer}
            android_ripple={{ color: colors.accentContainer }}
            style={[styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <View style={styles.bars}>
              {[0, 1, 2].map((line) => <View key={line} style={[styles.bar, { backgroundColor: colors.accent }]} />)}
            </View>
          </Pressable>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.appName, { color: colors.text }, width < 340 && styles.appNameCompact]}>Synapse</Text>
          <Pressable
            accessibilityRole="button" accessibilityLabel={onReminders ? 'Voltar ao início' : 'Abrir lembretes'}
            onPress={() => navigate(shortcut)}
            android_ripple={{ color: colors.accentContainer }}
            style={[styles.shortcut, { backgroundColor: colors.accentContainer, borderColor: colors.outline }, width < 330 && styles.shortcutCompact]}>
            <Text numberOfLines={1} style={[styles.shortcutText, { color: colors.onAccentContainer }]}>
              {onReminders ? (width < 330 ? '⌂' : '⌂  Início') : (width < 330 ? '▤' : '▤  Lembretes')}
            </Text>
          </Pressable>
      </View>
      <View style={styles.body}>{children}</View>
      <View pointerEvents="box-none" style={styles.overlay}>
        {!open && <View {...edgeResponder.panHandlers} style={[styles.edgeTarget, { top: insets.top + 60 }]} />}

      {drawerMounted && (
        <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.scrim, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Fechar menu" />
        </Animated.View>
      )}
      {drawerMounted && (
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          {...closeResponder.panHandlers}
          style={[
            styles.drawer,
            {
              width: drawerWidth, backgroundColor: colors.surface,
              paddingTop: Math.max(16, insets.top + 12),
              paddingBottom: Math.max(16, insets.bottom + 12),
              transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth - 12, 0] }) }],
            },
          ]}>
          <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.drawerTitleRow}>
              <View style={styles.drawerTitleCopy}>
                <Text numberOfLines={1} style={[styles.drawerName, { color: colors.text }]}>Synapse</Text>
                <Text numberOfLines={1} style={[styles.drawerSubtitle, { color: colors.muted }]}>LEMBRETES INTELIGENTES</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" onPress={close} style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.closeGlyph, { color: colors.text }]}>×</Text>
              </Pressable>
            </View>
            <Text style={[styles.sectionHeading, { color: colors.muted }]}>MENU PRINCIPAL</Text>
            {destinations.map((item) => {
              const active = pathname === item.href;
              return (
                <Pressable key={item.href} accessibilityRole="button" accessibilityState={{ selected: active }}
                  onPress={() => navigate(item.href)} android_ripple={{ color: colors.accentContainer }}
                  style={[styles.destination, active && { backgroundColor: colors.accentContainer }]}>
                  <View style={[styles.destinationIcon, { backgroundColor: active ? colors.surfaceVariant : colors.background }]}>
                    <Text style={[styles.destinationGlyph, { color: active ? colors.accent : colors.muted }]}>{item.icon}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.destinationText, { color: active ? colors.onAccentContainer : colors.text }]}>{item.label}</Text>
                  {active && <Text style={{ color: colors.accent, fontWeight: '800' }}>✓</Text>}
                </Pressable>
              );
            })}
            <View style={[styles.divider, { backgroundColor: colors.outline }]} />
            <Pressable accessibilityRole="button" onPress={newReminder} android_ripple={{ color: colors.accentContainer }}
              style={[styles.newReminder, { backgroundColor: colors.accent }]}>
              <Text style={[styles.newReminderPlus, { color: colors.onAccent }]}>＋</Text>
              <View style={styles.newReminderCopy}>
                <Text style={[styles.newReminderText, { color: colors.onAccent }]}>Novo lembrete</Text>
                <Text numberOfLines={2} style={[styles.newReminderHint, { color: colors.onAccent }]}>Escreva ou dite uma ideia</Text>
              </View>
            </Pressable>
          </ScrollView>
        </Animated.View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', minWidth: 0, minHeight: 0 },
  body: { flex: 1, width: '100%', minHeight: 0, minWidth: 0 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 200, elevation: 200 },
  edgeTarget: { position: 'absolute', left: 0, bottom: 0, width: 28, zIndex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0, paddingBottom: 7 },
  menuButton: { width: 46, height: 46, flexShrink: 0, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bars: { height: 17, width: 19, justifyContent: 'space-between' },
  bar: { height: 2.2, width: '100%', borderRadius: 2 },
  appName: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '800', lineHeight: 25 },
  appNameCompact: { fontSize: 15 },
  shortcut: { height: 44, flexShrink: 0, minWidth: 92, paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shortcutCompact: { minWidth: 48, paddingHorizontal: 9 },
  shortcutText: { fontSize: 12, fontWeight: '800' },
  scrim: { ...StyleSheet.absoluteFillObject, zIndex: 8, backgroundColor: 'rgba(0,0,0,0.48)' },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 9, borderTopRightRadius: 28, borderBottomRightRadius: 28, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, elevation: 24, overflow: 'hidden' },
  drawerScroll: { flex: 1, minWidth: 0 },
  drawerContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 12 },
  drawerTitleRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  drawerTitleCopy: { flex: 1, minWidth: 0, gap: 3 },
  drawerName: { fontWeight: '800', fontSize: 21, lineHeight: 27 },
  drawerSubtitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  closeButton: { height: 48, width: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { fontSize: 27, lineHeight: 30 },
  sectionHeading: { fontSize: 11, fontWeight: '800', letterSpacing: 1.0, marginBottom: 12, marginLeft: 8 },
  destination: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, borderRadius: 18, marginBottom: 5 },
  destinationIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  destinationGlyph: { fontSize: 19, fontWeight: '700' },
  destinationText: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 18 },
  newReminder: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, minHeight: 70, borderRadius: 20 },
  newReminderPlus: { fontSize: 25, lineHeight: 28 },
  newReminderCopy: { flex: 1, minWidth: 0, gap: 3 },
  newReminderText: { fontWeight: '800', fontSize: 15 },
  newReminderHint: { fontSize: 11 },
});
