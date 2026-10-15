import { Inter_400Regular, Inter_500Medium, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { initDb } from '@/db/database';
import { C, F } from '@/theme';

SplashScreen.preventAutoHideAsync();
initDb();

const navTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, primary: C.primary, border: C.border } };

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold, SpaceGrotesk_700Bold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.text, headerTitleStyle: { fontFamily: F.bold }, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="rutina/[id]" options={{ title: 'Editar rutina' }} />
        <Stack.Screen name="biblioteca" options={{ title: 'Biblioteca de ejercicios', presentation: 'modal' }} />
        <Stack.Screen name="entrenamiento" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </ThemeProvider>
  );
}
