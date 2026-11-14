import React from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Kaydırmasız TEK EKRAN oyunların içeriği küçük/kısa telefonda (360x640 dp) ekrandan taşıyordu (2026-11-14, BlueStacks küçük ekran taraması):
 * `container: { flex: 1, justifyContent: 'center' }` içerik uzayınca ÜST ve ALTTAN birlikte kesiliyor, kaydırma olmadığı için ızgaranın alt
 * satırlarındaki seçeneklere hiç dokunulamıyordu (Dünya Bayrakları, Dünya Selamları, Dünya Yapıları/Yiyecekleri, Bayrak Boya).
 *
 * Bu sarmalayıcı eski `container` stilini içerik kabına taşır: `flex: 1` → `flexGrow: 1`. İçerik ekrandan KISAysa eskisi gibi ortalanır
 * (görünüm değişmez), UZUNsa üstten başlayıp kayar. Yalnız DOKUNMA oyunlarında kullanın: sürükle-bırak oyunlarında dikey kaydırma
 * Android'de sürüklemeyi bozar (bunlar için lib/fitLayout.ts: useFitScale/fitRow).
 */
export default function ScrollIfNeeded({ children, contentStyle }: { children: React.ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { flex: _flex, ...rest } = (StyleSheet.flatten(contentStyle) ?? {}) as ViewStyle;
    return (
        <ScrollView
            style={{ flex: 1, alignSelf: 'stretch' }}
            contentContainerStyle={[rest, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            overScrollMode="never"
            bounces={false}
        >
            {children}
        </ScrollView>
    );
}
