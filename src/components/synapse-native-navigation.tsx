/**
 * Native navigation shell. The drawer uses a native Modal so its touch targets
 * remain interactive above Expo Router's screens (including Android release builds).
 * Edge swipes are captured on the main shell, not a transparent view covering it.
 */
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import {
  Animated, Keyboard, Modal, PanResponder, Pressable, ScrollView,
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
  { href: '/explore', label: 'Como usar', icon: '?' },
  { href: '/settings', label: 'Configurações', icon: '⚙' },
];

export function SynapseNativeNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { settings } = useAppSettings();
  const colors = getAppPalette(settings);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(360, Math.max(240, width - 44));

  const closeDrawer = useCallback(() => setOpen(false), []);
  const openDrawer = useCallback(() => {
    Keyboard.dismiss();
    setVisible(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const animation = settings.animationsEnabled
      ? Animated.spring(progress, {
          toValue: open ? 1 : 0,
          stiffness: 240,
          damping: 28,
          mass: 0.9,
          useNativeDriver: true,
        })
      : Animated.timing(progress, { toValue: open ? 1 : 0, duration: 0, useNativeDriver: true });
    animation.start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
    return () => animation.stop();
  }, [open, progress, settings.animationsEnabled, visible]);

  // Support either direction from the appropriate screen edge. In particular,
  // a leftward swipe starting at the right edge also opens the drawer.
  const openGesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_event, g) => {
      if (open || visible || Math.abs(g.dx) < 18 || Math.abs(g.dx) < Math.abs(g.dy) * 1.3) return false;
      return (g.x0 <= 36 && g.dx > 0) || (g.x0 >= width - 36 && g.dx < 0);
    },
    onPanResponderRelease: (_event, g) => {
      if ((g.x0 <= 36 && g.dx >= 48) || (g.x0 >= width - 36 && g.dx <= -48)) openDrawer();
    },
    onPanResponderTerminationRequest: () => true,
  }), [open, openDrawer, visible, width]);

  const closeGesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_event, g) =>
      g.dx < -22 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
    onPanResponderRelease: (_event, g) => {
      if (g.dx < -55) closeDrawer();
    },
    onPanResponderTerminationRequest: () => true,
  }), [closeDrawer]);

  const navigate = useCallback((href: Destination['href']) => {
    closeDrawer();
    if (pathname !== href) router.replace(href);
  }, [closeDrawer, pathname]);

  const newReminder = useCallback(() => {
    closeDrawer();
    router.replace({ pathname: '/', params: { focusComposer: String(Date.now()) } } as never);
  }, [closeDrawer]);

  const onReminders = pathname === '/reminders';
  const shortcut: Destination['href'] = onReminders ? '/' : '/reminders';
  const compact = width < 360;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} {...openGesture.panHandlers}>
      <View style={[styles.header, {
        paddingTop: insets.top,
        paddingHorizontal: compact ? 10 : 16,
        backgroundColor: colors.background,
      }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir menu"
          accessibilityHint="Abre a navegação e as configurações"
          accessibilityState={{ expanded: open }}
          hitSlop={6}
          onPress={openDrawer}
          android_ripple={{ color: colors.accentContainer }}
          style={[styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.bars}>
            {[0, 1, 2].map((line) => (
              <View key={line} style={[styles.bar, { backgroundColor: colors.accent }]} />
            ))}
          </View>
        </Pressable>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.appName, compact && styles.appNameCompact, { color: colors.text }]}>Synapse</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onReminders ? 'Voltar ao início' : 'Abrir lembretes'}
          onPress={() => navigate(shortcut)}
          android_ripple={{ color: colors.accentContainer }}
          style={[styles.shortcut, compact && styles.shortcutCompact, {
            backgroundColor: colors.accentContainer,
            borderColor: colors.outline,
          }]}>
          <Text numberOfLines={1} style={[styles.shortcutText, { color: colors.onAccentContainer }]}>
            {onReminders ? (compact ? '⌂' : '⌂  Início') : (compact ? '▤' : '▤  Lembretes')}
          </Text>
        </Pressable>
      </View>
      <View style={styles.body}>{children}</View>

      <Modal
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDrawer}>
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.scrim, { opacity: progress }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar menu"
              style={StyleSheet.absoluteFillObject}
              onPress={closeDrawer}
            />
          </Animated.View>
          <Animated.View
            {...closeGesture.panHandlers}
            style={[styles.drawer, {
              width: drawerWidth,
              backgroundColor: colors.surface,
              paddingTop: Math.max(insets.top + 12, 24),
              paddingBottom: Math.max(insets.bottom + 10, 16),
              transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth - 16, 0] }) }],
            }]}>
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.drawerTitleRow}>
                <View style={styles.drawerTitleCopy}>
                  <Text numberOfLines={1} style={[styles.drawerName, { color: colors.text }]}>Synapse</Text>
                  <Text numberOfLines={1} style={[styles.drawerSubtitle, { color: colors.muted }]}>LEMBRETES INTELIGENTES</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar menu"
                  onPress={closeDrawer}
                  style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.closeGlyph, { color: colors.text }]}>×</Text>
                </Pressable>
              </View>
              <Text style={[styles.sectionHeading, { color: colors.muted }]}>MENU PRINCIPAL</Text>
              {destinations.map((item) => {
                const active = pathname === item.href;
                return (
                  <Pressable
                    key={item.href}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => navigate(item.href)}
                    android_ripple={{ color: colors.accentContainer }}
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
              <Pressable
                accessibilityRole="button"
                onPress={newReminder}
                android_ripple={{ color: colors.accentContainer }}
                style={[styles.newReminder, { backgroundColor: colors.accent }]}>
                <Text style={[styles.newReminderPlus, { color: colors.onAccent }]}>＋</Text>
                <View style={styles.newReminderCopy}>
                  <Text style={[styles.newReminderText, { color: colors.onAccent }]}>Novo lembrete</Text>
                  <Text numberOfLines={2} style={[styles.newReminderHint, { color: colors.onAccent }]}>Escreva ou dite uma ideia</Text>
                </View>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', minWidth: 0, minHeight: 0 },
  body: { flex: 1, width: '100%', minHeight: 0, minWidth: 0 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0, paddingBottom: 7 },
  menuButton: { width: 48, height: 48, flexShrink: 0, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bars: { height: 17, width: 19, justifyContent: 'space-between' },
  bar: { height: 2.2, width: '100%', borderRadius: 2 },
  appName: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '800', lineHeight: 25 },
  appNameCompact: { fontSize: 15 },
  shortcut: { height: 44, flexShrink: 0, minWidth: 92, paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  shortcutCompact: { minWidth: 48, paddingHorizontal: 9 },
  shortcutText: { fontSize: 12, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-start' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.56)' },
  drawer: { height: '100%', borderTopRightRadius: 28, borderBottomRightRadius: 28, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, elevation: 24, overflow: 'hidden' },
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
