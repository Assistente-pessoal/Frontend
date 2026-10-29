/**
 * Native-only layout. The navigation bar is an actual flex row, not an overlay
 * inside the headless Tabs navigator; the drawer is a separate layer.
 * This keeps both actions visible in Android release APKs.
 */
import { Stack, usePathname } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { ReminderComposer } from '@/components/reminder-composer';
import { SynapseNativeNavigation } from '@/components/synapse-native-navigation';

export default function AppTabs() {
  const pathname = usePathname();
  const showComposer = pathname === '/' || pathname === '/reminders';
  const keyboardBehavior = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 35)
    ? 'padding' as const
    : undefined;

  return (
    <SynapseNativeNavigation>
      <KeyboardAvoidingView behavior={keyboardBehavior} style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="reminders" />
            <Stack.Screen name="explore" />
            <Stack.Screen name="settings" />
          </Stack>
        </View>
        {showComposer ? <ReminderComposer /> : null}
      </KeyboardAvoidingView>
    </SynapseNativeNavigation>
  );
}
