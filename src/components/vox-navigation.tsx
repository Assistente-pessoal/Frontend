import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import { Animated, PanResponder, Pressable, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/app-text';
import { useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';

const MenuCloseContext = createContext<() => void>(() => undefined);

export function VoxMenuTabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const closeMenu = useContext(MenuCloseContext);
  const originalOnPress = props.onPress;
  const isHome = children === 'Início';
  const isSettings = children === 'Configurações';
  const isReminders = children === 'Lembretes';
  const { settings } = useAppSettings();
  const palette = getAppPalette(settings);
  const colors = { muted: palette.muted, green: palette.accent, soft: palette.accentContainer, ripple: palette.accentContainer };
  const icon = isHome ? '⌂' : isSettings ? '⚙' : isReminders ? '▤' : '✦';

  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      android_ripple={{ color: colors.ripple, borderless: false }}
      onPress={(event) => {
        originalOnPress?.(event);
        closeMenu();
      }}
      style={({ pressed }) => [styles.navItem, isFocused && { backgroundColor: colors.soft }, pressed && styles.pressed]}>
      <View style={[styles.navItemIcon, isFocused && { backgroundColor: palette.accentContainer }]}>
        <Text style={[styles.navItemIconText, { color: isFocused ? colors.green : colors.muted }]}>{icon}</Text>
      </View>
      <Text style={[styles.navItemText, { color: isFocused ? colors.green : colors.muted }, isFocused && styles.navItemTextActive]}>{children}</Text>
      {isFocused ? <View style={[styles.navItemCheck, { backgroundColor: palette.accentContainer }]}><Text style={[styles.navItemCheckText, { color: colors.green }]}>✓</Text></View> : null}
    </Pressable>
  );
}

export function VoxMenuList({ children, ...props }: TabListProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isRemindersPage = pathname === '/reminders';
  const progress = useRef(new Animated.Value(0)).current;
  const closeMenu = useCallback(() => setOpen(false), []);
  const { settings } = useAppSettings();
  const palette = getAppPalette(settings);
  const colors = {
    ink: palette.text, muted: palette.muted, line: palette.outline, surface: palette.surface,
    green: palette.accent, onGreen: palette.onAccent, soft: palette.accentContainer,
    lime: palette.accentContainer, footer: palette.surfaceVariant, footerText: palette.muted, ripple: palette.accentContainer,
  };

  useEffect(() => {
    const animation = settings.animationsEnabled
      ? Animated.spring(progress, {
          toValue: open ? 1 : 0,
          damping: 25,
          stiffness: 260,
          mass: 0.85,
          useNativeDriver: Platform.OS !== 'web',
        })
      : Animated.timing(progress, { toValue: open ? 1 : 0, duration: 0, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [open, progress, settings.animationsEnabled]);

  const edgeSwipeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      !open && gesture.x0 <= 30 && gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
    onPanResponderRelease: (_event, gesture) => {
      if (!open && gesture.dx > 48) setOpen(true);
    },
  }), [open]);

  const drawerSwipeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      open && gesture.dx < -12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
    onPanResponderRelease: (_event, gesture) => {
      if (open && gesture.dx < -52) closeMenu();
    },
  }), [open, closeMenu]);

  const openNewReminder = () => {
    closeMenu();
    router.push({ pathname: '/', params: { focusComposer: String(Date.now()) } } as never);
  };


  return (
    <View {...props} pointerEvents="box-none" style={styles.navigationLayer}>
      {!open ? <View {...edgeSwipeResponder.panHandlers} pointerEvents="auto" style={styles.edgeSwipeTarget} /> : null}

      {!open ? (
        <View pointerEvents="box-none" style={[styles.topBar, { top: insets.top + 6, paddingHorizontal: width < 360 ? 10 : 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menu"
            accessibilityState={{ expanded: false }}
            android_ripple={{ color: colors.ripple, borderless: true }}
            onPress={() => setOpen(true)}
            style={({ pressed }) => [styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.line }, pressed && styles.menuButtonPressed]}>
            <View style={styles.menuIcon}>
              <View style={[styles.menuLine, { backgroundColor: colors.green }]} />
              <View style={[styles.menuLine, { backgroundColor: colors.green }]} />
              <View style={[styles.menuLine, { backgroundColor: colors.green }]} />
            </View>
          </Pressable>
          <View style={styles.menuBrand}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.menuBrandName, width < 360 && styles.menuBrandNameCompact, { color: colors.ink }]}>Synapse</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRemindersPage ? 'Ir para início' : 'Abrir lembretes'}
            android_ripple={{ color: colors.ripple }}
            onPress={() => router.navigate(isRemindersPage ? '/' : '/reminders')}
            style={({ pressed }) => [styles.remindersShortcut, { backgroundColor: colors.soft, borderColor: colors.line }, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={[styles.remindersShortcutText, { color: colors.ink }]}>{isRemindersPage ? '⌂  Início' : '▤  Lembretes'}</Text>
          </Pressable>
        </View>
      ) : null}

      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.backdrop, { opacity: progress }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" style={StyleSheet.absoluteFill} onPress={closeMenu} />
      </Animated.View>

      <Animated.View
        {...drawerSwipeResponder.panHandlers}
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          styles.drawer,
          { backgroundColor: colors.surface, paddingTop: Math.max(22, insets.top + 12), opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-390, 0] }) }] },
        ]}>
        <ScrollView contentContainerStyle={styles.drawerScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.drawerHeader}>
          <View style={styles.brandCopy}>
            <Text numberOfLines={1} style={[styles.brandName, { color: colors.ink }]}>Synapse</Text>
            <Text numberOfLines={1} style={[styles.brandSubtitle, { color: colors.muted }]}>LEMBRETES INTELIGENTES</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" android_ripple={{ color: colors.ripple, borderless: true }} onPress={closeMenu} style={[styles.closeButton, { backgroundColor: colors.soft }]}>
            <Text style={[styles.closeButtonText, { color: colors.muted }]}>×</Text>
          </Pressable>
        </View>

        <Text style={[styles.menuCaption, { color: colors.muted }]}>MENU PRINCIPAL</Text>
        <MenuCloseContext.Provider value={closeMenu}>
          <View style={styles.navItems}>{children}</View>
        </MenuCloseContext.Provider>

        <View style={[styles.drawerDivider, { backgroundColor: colors.line }]} />
        <Pressable accessibilityRole="button" android_ripple={{ color: colors.ripple }} onPress={openNewReminder} style={({ pressed }) => [styles.newReminderAction, { backgroundColor: colors.green }, pressed && styles.pressed]}>
          <View style={styles.newReminderIcon}><Text style={[styles.newReminderPlus, { color: colors.onGreen }]}>＋</Text></View>
          <View style={styles.newReminderCopy}>
            <Text style={[styles.newReminderTitle, { color: colors.onGreen }]}>Novo lembrete</Text>
            <Text style={[styles.newReminderSubtitle, { color: colors.onGreen, opacity: 0.82 }]}>Escreva ou dite uma nova ideia</Text>
          </View>
          <Text style={[styles.newReminderArrow, { color: colors.onGreen }]}>→</Text>
        </Pressable>

        <View style={[styles.drawerFooter, { backgroundColor: colors.footer }]}>
          <View style={[styles.footerSparkle, { backgroundColor: palette.accentContainer }]}><Text style={[styles.footerSparkleText, { color: palette.onAccentContainer }]}>✦</Text></View>
          <Text style={[styles.footerTitle, { color: colors.green }]}>Sua rotina, mais leve.</Text>
          <Text style={[styles.footerCopy, { color: colors.footerText }]}>Guarde suas ideias e deixe o Synapse ajudar a lembrar do que importa.</Text>
        </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationLayer: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100 },
  edgeSwipeTarget: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 24, zIndex: 99 },
  topBar: { position: 'absolute', left: 0, right: 0, zIndex: 102, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, minWidth: 0, width: '100%', overflow: 'hidden' },
  menuButton: { flexShrink: 0, width: 48, height: 48, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#253E31', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  menuButtonPressed: { transform: [{ scale: 0.96 }] },
  menuIcon: { width: 20, height: 18, justifyContent: 'space-between' },
  menuLine: { width: 20, height: 2.2, borderRadius: 2 },
  menuBrand: { flex: 1, height: 48, minWidth: 0, justifyContent: 'center', overflow: 'hidden' },
  menuBrandName: { fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.5, maxWidth: '100%', flexShrink: 1 },
  menuBrandNameCompact: { fontSize: 15, letterSpacing: -0.6 },
  menuBrandSubtitle: { fontSize: 8, lineHeight: 10, fontWeight: '800', letterSpacing: 1.05 },
  remindersShortcut: { flexShrink: 0, height: 46, minWidth: 94, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  remindersShortcutText: { fontSize: 12, fontWeight: '800' },
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: 'rgba(24, 39, 31, 0.42)' },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 101, width: '88%', maxWidth: 380, paddingTop: Platform.OS === 'android' ? 46 : 28, paddingHorizontal: 20, paddingBottom: 24, borderTopRightRadius: 30, borderBottomRightRadius: 30, shadowColor: '#17281F', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 8, height: 0 }, elevation: 18, overflow: 'hidden' },
  drawerScrollContent: { flexGrow: 1, minWidth: 0, paddingBottom: 8 },
  drawerHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25 },
  brandCopy: { flex: 1, minWidth: 0, gap: 2 },
  brandName: { fontSize: 22, lineHeight: 26, fontWeight: '900', letterSpacing: -0.7 },
  brandSubtitle: { fontSize: 8, fontWeight: '800', letterSpacing: 1.15 },
  closeButton: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  closeButtonText: { fontSize: 27, lineHeight: 30, fontWeight: '400' },
  menuCaption: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12, paddingHorizontal: 4 },
  navItems: { gap: 8 },
  navItem: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, borderRadius: 19, overflow: 'hidden' },
  navItemIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  navItemIconText: { fontSize: 21, lineHeight: 25, fontWeight: '700' },
  navItemText: { fontSize: 14, fontWeight: '600', flex: 1 },
  navItemTextActive: { fontWeight: '800' },
  navItemCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navItemCheckText: { fontSize: 12, fontWeight: '900' },
  drawerDivider: { height: 1, marginVertical: 18 },
  newReminderAction: { minHeight: 70, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 12, overflow: 'hidden' },
  newReminderIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  newReminderPlus: { color: '#FFFFFF', fontSize: 25, lineHeight: 29, fontWeight: '400' },
  newReminderCopy: { flex: 1, gap: 3 },
  newReminderTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  newReminderSubtitle: { color: '#D9E9DE', fontSize: 10 },
  newReminderArrow: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  drawerFooter: { marginTop: 'auto', borderRadius: 22, padding: 16, gap: 7 },
  footerSparkle: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footerSparkleText: { fontSize: 17 },
  footerTitle: { fontSize: 13, fontWeight: '800' },
  footerCopy: { fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.76 },
});
