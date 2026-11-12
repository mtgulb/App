import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/theme/colors';
import { t as tr } from '@/i18n';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.tint,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        tabBarLabelStyle: { fontWeight: '600' },
        sceneStyle: { backgroundColor: t.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tr('nav.recipes'),
          tabBarIcon: ({ color }) => <SymbolView name="fork.knife" tintColor={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: tr('nav.plan'),
          tabBarIcon: ({ color }) => <SymbolView name="calendar" tintColor={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: tr('nav.shopping'),
          tabBarIcon: ({ color }) => <SymbolView name="cart" tintColor={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="fridge"
        options={{
          title: tr('nav.fridge'),
          tabBarIcon: ({ color }) => <SymbolView name="refrigerator" tintColor={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="suggest"
        options={{
          title: tr('nav.suggest'),
          tabBarIcon: ({ color }) => <SymbolView name="lightbulb" tintColor={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
