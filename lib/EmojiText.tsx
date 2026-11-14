import React from 'react';
import { Platform } from 'react-native';
import { emojiImageSize, fontSizeOf, replaceEmojiChildren, shouldUseEmojiImages } from './emojiFallback';

/**
 * ANDROID'DE `Text` YERİNE GEÇEN SARMALAYICI (metro.config.js: Android paketinde `react-native/Libraries/Text/Text` bu dosyaya yönlenir;
 * bu dosyanın kendisi özgün `Text`i yine aynı yoldan alır, Metro onu yönlendirmez). Android API < 35'te `Text` çocuklarındaki yeni
 * emojiler (Emoji 12+) Noto resmiyle satır içi değişir; sebep ve ayrıntı: lib/emojiFallback.ts.
 *
 * Neden Metro yönlendirmesi: çalışma zamanında `Libraries/Text/Text` modülünün dışa aktarımını değiştirmek (ilk deneme, 0d8b6bc) cihazda
 * etki etmedi. Derleme zamanı yönlendirmesi belirleyicidir: `react-native`in `Text` getter'ı, `Animated.Text` ve RN'in kendi bileşenleri dahil
 * HER `Text` kullanımı bu bileşenden geçer.
 *
 * Hata olursa uygulamayı düşürmez: dönüştürme başarısızsa özgün `Text` çizilir.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const OriginalText = require('react-native/Libraries/Text/Text').default;

const ACTIVE = shouldUseEmojiImages(Platform.OS, Platform.Version);
let announced = false;

function EmojiAwareText(props: Record<string, unknown>) {
    if (ACTIVE) {
        try {
            const children = props.children as React.ReactNode;
            if (typeof children === 'string' || Array.isArray(children)) {
                const next = replaceEmojiChildren(children, emojiImageSize(fontSizeOf(props.style), props.allowFontScaling !== false));
                if (next) {
                    if (!announced) { announced = true; console.log('[emojiFallback] yeni emoji yedek resimle çiziliyor (Android API ' + String(Platform.Version) + ')'); }
                    return React.createElement(OriginalText, props, ...next);
                }
            }
        } catch {
            // dönüştürme başarısızsa özgün Text'e düş
        }
    }
    return React.createElement(OriginalText, props);
}
EmojiAwareText.displayName = 'Text';
Object.keys(OriginalText).forEach((k) => {
    if (!(k in EmojiAwareText)) (EmojiAwareText as unknown as Record<string, unknown>)[k] = OriginalText[k];
});

export default EmojiAwareText;
