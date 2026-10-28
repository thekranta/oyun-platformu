import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import '@/lib/reanimatedInit';

import { SoundProvider } from '@/components/SoundContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hideBootSplash } from '@/lib/bootSplash';
import { initI18n } from '@/lib/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  // Web: ilk gerçek ekran çizilince açılış perdesini (public/index.html) kaldır; hazır olana kadar perde görünür kalır.
  useEffect(() => {
    if (i18nReady) hideBootSplash();
  }, [i18nReady]);

  if (!i18nReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SoundProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="veli-dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="teacher-dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="kurum" options={{ headerShown: false }} />
          <Stack.Screen name="owner-dashboard" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </SoundProvider>
    </ThemeProvider>
  );
}
