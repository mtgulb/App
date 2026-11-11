import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme/colors';

export default function RootLayout() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerLargeTitle: true,
          headerTransparent: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.tint,
          headerTitleStyle: { color: theme.text },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Hjem' }} />
        <Stack.Screen name="about" options={{ title: 'Om appen', headerLargeTitle: false }} />
      </Stack>
    </>
  );
}
