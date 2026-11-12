import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initCloud } from '@/lib/cloud/sync';
import { initReminders } from '@/lib/notifications';
import { useTheme } from '@/theme/colors';
import { t as tr } from '@/i18n';

export default function RootLayout() {
  const t = useTheme();
  // Starter familiedeling hvis den er satt opp. Gjør ingenting ellers.
  useEffect(() => {
    initCloud();
    initReminders();
  }, []);
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: t.background },
          headerTintColor: t.tint,
          headerTitleStyle: { color: t.text },
          contentStyle: { backgroundColor: t.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="recipe/new"
          options={{ title: tr('nav.newRecipe'), presentation: 'modal' }}
        />
        <Stack.Screen name="about" options={{ title: tr('nav.about') }} />
        <Stack.Screen name="recipe/[id]" options={{ title: tr('nav.recipe') }} />
        <Stack.Screen
          name="recipe/edit"
          options={{ title: tr('nav.editRecipe'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="recipe/plan"
          options={{ title: tr('nav.planDinner'), presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
