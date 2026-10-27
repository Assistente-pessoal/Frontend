import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { View } from 'react-native';
import { usePathname } from 'expo-router';
import { ReminderComposer } from '@/components/reminder-composer';
import { VoxMenuList, VoxMenuTabButton } from '@/components/vox-navigation';

export default function AppTabs() {
  const pathname = usePathname();
  const showComposer = pathname === '/' || pathname === '/reminders';

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
      <Tabs>
        <TabSlot style={{ flex: 1, width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden' }} />
        {showComposer ? <ReminderComposer /> : null}
        <TabList asChild>
          <VoxMenuList>
            <TabTrigger name="home" href="/" asChild>
              <VoxMenuTabButton>Início</VoxMenuTabButton>
            </TabTrigger>
            <TabTrigger name="reminders" href="/reminders" asChild>
              <VoxMenuTabButton>Lembretes</VoxMenuTabButton>
            </TabTrigger>
            <TabTrigger name="explore" href="/explore" asChild>
              <VoxMenuTabButton>Como usar</VoxMenuTabButton>
            </TabTrigger>
            <TabTrigger name="settings" href="/settings" asChild>
              <VoxMenuTabButton>Configurações</VoxMenuTabButton>
            </TabTrigger>
          </VoxMenuList>
        </TabList>
      </Tabs>
    </View>
  );
}
