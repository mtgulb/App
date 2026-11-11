import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/theme/colors';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.tint,
        headerStyle: { backgroundColor: t.background },
        headerTitleStyle: { color: t.text },
        tabBarStyle: { backgroundColor: t.card },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Oppskrifter',
          tabBarIcon: ({ color }) => <SymbolView name="book" tintColor={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Middagsplan',
          tabBarIcon: ({ color }) => <SymbolView name="calendar" tintColor={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
