import { Tabs } from 'expo-router';
import { ArrowLeftRight, House, MessageSquareText, Settings } from 'lucide-react-native';

import { colors } from '@/theme/colors';

const tab = (title: string, Icon: typeof House) => ({
  title,
  tabBarIcon: ({ color, size }: { color: unknown; size: number }) => <Icon color={color as string} size={size} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenText,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
      }}>
      <Tabs.Screen name="index" options={tab('Accueil', House)} />
      <Tabs.Screen name="sms" options={tab('SMS', MessageSquareText)} />
      <Tabs.Screen name="transactions" options={tab('Transactions', ArrowLeftRight)} />
      <Tabs.Screen name="settings" options={tab('Réglages', Settings)} />
    </Tabs>
  );
}
