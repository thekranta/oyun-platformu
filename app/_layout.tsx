import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import '@/lib/reanimatedInit';

import ParentGateHost from '@/components/ParentGateHost';
import { SoundProvider } from '@/components/SoundContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { hideBootSplash } from '@/lib/bootSplash';
import { initI18n } from '@/lib/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Android 15+ (hedef API 35/36) uygulamayı kenardan kenara çizer: durum çubuğu ve gezinme çubuğu içeriğin ÜSTÜNE biner
 * (Android 16'da kapatılamaz). Kök çerçeve bu çubukların altında kalan alanı boş bırakır; eski Android'de (kenardan kenara
 * kapalı) inset 0'dır ve hiçbir şey değişmez. Kendi SafeAreaView'ını kullanan ekranlar çift boşluk bırakmaz (kendi çerçevesine göre ölçer).
 */
function AndroidInsetFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android') return <>{children}</>;
  return <View style={{ flex: 1, backgroundColor: '#FAF2E4', paddingTop: insets.top, paddingBottom: insets.bottom }}>{children}</View>;
}

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
        <AndroidInsetFrame>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="veli-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="teacher-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="kurum" options={{ headerShown: false }} />
            <Stack.Screen name="owner-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="paket-satin-al" options={{ headerShown: false }} />
            <Stack.Screen name="ai-izni" options={{ headerShown: false }} />
            <Stack.Screen name="gizlilik-ayarlari" options={{ headerShown: false }} />
            <Stack.Screen name="hesap-sil" options={{ headerShown: false }} />
          </Stack>
        </AndroidInsetFrame>
        <StatusBar style="auto" />
        <ParentGateHost />
      </SoundProvider>
    </ThemeProvider>
  );
}
