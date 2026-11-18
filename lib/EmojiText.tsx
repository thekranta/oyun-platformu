import React from 'react';
import { Platform } from 'react-native';
import { emojiImageSize, fontSizeOf, replaceEmojiChildren, shouldUseEmojiImages, withFontScaleCap } from './emojiFallback';

/**
 * ANDROID'DE `Text` YERİNE GEÇEN SARMALAYICI (metro.config.js: Android paketinde `react-native/Libraries/Text/Text` bu dosyaya yönlenir;
 * bu dosyanın kendisi özgün `Text`i yine aynı yoldan alır, Metro onu yönlendirmez). Android API < 35'te `Text` çocuklarındaki yeni
 * emojiler (Emoji 12+) Noto resmiyle satır içi değişir; sebep ve ayrıntı: lib/emojiFallback.ts.
 *
 * Neden Metro yönlendirmesi: çalışma zamanında `Libraries/Text/Text` modülünün dışa aktarımını değiştirmek (ilk deneme, 0d8b6bc) cihazda
 * etki etmedi. Derleme zamanı yönlendirmesi belirleyicidir: `react-native`in `Text` getter'ı, `Animated.Text` ve RN'in kendi bileşenleri dahil
 * HER `Text` kullanımı bu bileşenden geçer.
 *
 * İKİ AYRI İŞ (ikisi de bu tek noktadan):
 *  1. Yazı büyütme sınırı: `maxFontSizeMultiplier` verilmemiş her `Text`e varsayılan 1,3 (lib/emojiFallback.ts → DEFAULT_MAX_FONT_SIZE_MULTIPLIER).
 *     Bu, `ACTIVE` kapısının DIŞINDA ve TÜM Android cihazlarda geçerlidir (API 35+ dahil): sistem yazı tipi büyük olan ebeveynlerde
 *     sabit boyutlu kartlar taşmasın. iOS ve web özgün `Text`i kullandığı için bu yoldan geçmez (sınırları ayrıdır).
 *  2. Emoji yedek resmi: yalnız `ACTIVE` (Android API < 35) iken.
 *
 * Hata olursa uygulamayı düşürmez: dönüştürme başarısızsa özgün `Text` çizilir.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const OriginalText = require('react-native/Libraries/Text/Text').default;

const ACTIVE = shouldUseEmojiImages(Platform.OS, Platform.Version);
let announced = false;

function EmojiAwareText(props: Record<string, unknown>) {
    // Sınır ACTIVE'den bağımsız: gelen props nesnesi değişmez, gerekirse kopya (maxFontSizeMultiplier eklenmiş) döner.
    const capped = withFontScaleCap(props);
    if (ACTIVE) {
        try {
            const children = capped.children as React.ReactNode;
            if (typeof children === 'string' || Array.isArray(children)) {
                // Resim boyutu, yazıya fiilen uygulanan (sınırlı) ölçekle hesaplanır; yoksa emoji çevresindeki yazıdan büyük çıkar.
                const next = replaceEmojiChildren(children, emojiImageSize(fontSizeOf(capped.style), capped.allowFontScaling !== false, capped.maxFontSizeMultiplier as number | undefined));
                if (next) {
                    if (!announced) { announced = true; console.log('[emojiFallback] yeni emoji yedek resimle çiziliyor (Android API ' + String(Platform.Version) + ')'); }
                    return React.createElement(OriginalText, capped, ...next);
                }
            }
        } catch {
            // dönüştürme başarısızsa özgün Text'e düş
        }
    }
    return React.createElement(OriginalText, capped);
}
EmojiAwareText.displayName = 'Text';
Object.keys(OriginalText).forEach((k) => {
    if (!(k in EmojiAwareText)) (EmojiAwareText as unknown as Record<string, unknown>)[k] = OriginalText[k];
});

export default EmojiAwareText;
