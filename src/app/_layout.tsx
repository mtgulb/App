import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme/colors';

export default function RootLayout() {
  const t = useTheme();
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
          options={{ title: 'Ny oppskrift', presentation: 'modal' }}
        />
        <Stack.Screen name="recipe/[id]" options={{ title: 'Oppskrift' }} />
        <Stack.Screen
          name="recipe/edit"
          options={{ title: 'Rediger oppskrift', presentation: 'modal' }}
        />
        <Stack.Screen
          name="recipe/plan"
          options={{ title: 'Planlegg middag', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
