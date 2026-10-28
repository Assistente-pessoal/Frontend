import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { usePathname } from 'expo-router';
import { ReminderComposer } from '@/components/reminder-composer';
import { SynapseNativeNavigation } from '@/components/synapse-native-navigation';

export default function AppTabs() {
  const pathname = usePathname();
  const showComposer = pathname === '/' || pathname === '/reminders';
  // Android 15+ with edge-to-edge does not reliably shrink the view for the IME.
  // Android 7–14 still use the native adjustResize configured in app.json.
  const keyboardBehavior = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 35)
    ? 'padding' as const
    : undefined;

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 0 }}>
      <KeyboardAvoidingView behavior={keyboardBehavior} style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <Tabs>
          <TabSlot style={{ flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden' }} />
          {showComposer ? <ReminderComposer /> : null}
          {/* Routes live here. The actual navigation is a root-level overlay,
              not a child of this hidden TabList. */}
          <TabList style={{ display: 'none' }}>
            <TabTrigger name="home" href="/" />
            <TabTrigger name="reminders" href="/reminders" />
            <TabTrigger name="explore" href="/explore" />
            <TabTrigger name="settings" href="/settings" />
          </TabList>
        </Tabs>
      </KeyboardAvoidingView>
      <SynapseNativeNavigation />
    </View>
  );
}
