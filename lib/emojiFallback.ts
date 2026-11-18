import React from 'react';
import { Image, PixelRatio, StyleSheet } from 'react-native';
import { EMOJI_IMAGES } from './emojiFallbackAssets';

/**
 * Eski Android'de yeni emoji sorunu (2026-11-14, BlueStacks Android 9 taraması):
 * Cihazın emoji yazı tipi bir emoji'yi bilmiyorsa (Emoji 12 → Android 10, 13 → 11/12, 14 → 12L/13, 15 → 14) o emoji KUTU (□) ya da
 * YARIM kesik çıkar: Dünya Yapıları'nda "Kulübe" 🛖, Dünya Yiyecekleri'nde Waffle 🧇, Temizlik Zamanı'nda diş fırçası 🪥, Hangi Çalgı
 * Çaldı'da marakas 🪇 … (48 farklı emoji, ~40 dosya). Çocuk cevabı göremediği için oyun oynanamaz hale gelir.
 *
 * ÇÖZÜM: Android API < 35 cihazlarda, bu emojiler `Text` içinde Noto Emoji resmiyle (assets/emoji, 128 px WebP) satır içi değiştirilir.
 * `Text` bileşeni Android paketinde tek yerden değiştirilir (metro.config.js → lib/EmojiText.tsx) → oyun dosyalarına dokunmak gerekmez. Yeni bir yeni-emoji
 * eklenirse lib/emojiFallback.test.ts kaynakları tarar ve yedek resim eksikse testi düşürür.
 */

/** Android 15 (API 35) ve üstü: sistem yazı tipi bu emojilerin hepsini çizer. */
export const EMOJI_FALLBACK_BELOW_API = 35;

export function shouldUseEmojiImages(os: string, version: string | number): boolean {
    return os === 'android' && Number(version) < EMOJI_FALLBACK_BELOW_API;
}

/** Emojinin anahtarı: kod noktaları (FE0F hariç) onaltılık, '_' ile birleşik (assets/emoji dosya adı). */
export function emojiKey(emoji: string): string {
    return Array.from(emoji).map((c) => c.codePointAt(0)!.toString(16)).filter((h) => h !== 'fe0f').join('_');
}

// Yalnız resmi olan emojilerden düzenli ifade: uzun diziler önce (ZWJ), her kod noktasından sonra isteğe bağlı FE0F.
const ALTERNATIVES = Object.keys(EMOJI_IMAGES)
    .sort((a, b) => b.length - a.length)
    .map((key) => key.split('_').map((hex) => `\\u{${hex}}\\uFE0F?`).join(''));
const EMOJI_RE = new RegExp(ALTERNATIVES.join('|'), 'gu');
// Hızlı ön süzgeç: tüm yedek emojiler U+1F000 ve üstünde.
const QUICK_RE = /[\u{1F000}-\u{1FAFF}]/u;

export type EmojiPart = string | { key: string; text: string };

/** Metni düz yazı parçaları ile yedek resmi olan emoji parçalarına böler. Emoji yoksa null. */
export function splitEmojiParts(text: string): EmojiPart[] | null {
    if (!QUICK_RE.test(text)) return null;
    const parts: EmojiPart[] = [];
    let last = 0;
    let found = false;
    EMOJI_RE.lastIndex = 0;
    for (let m = EMOJI_RE.exec(text); m; m = EMOJI_RE.exec(text)) {
        found = true;
        if (m.index > last) parts.push(text.slice(last, m.index));
        parts.push({ key: emojiKey(m[0]), text: m[0] });
        last = m.index + m[0].length;
        if (m[0].length === 0) EMOJI_RE.lastIndex++;
    }
    if (!found) return null;
    if (last < text.length) parts.push(text.slice(last));
    return parts;
}

/**
 * Android'de her `Text`e verilen varsayılan yazı büyütme sınırı (RN `maxFontSizeMultiplier`). Sistem yazı tipi "en büyük"
 * olan ebeveynlerde (ölçek 1,5-2) sabit boyutlu kartlar (AgirHafif kart 140 / emoji 84 gibi ~70 oyun), ToyRoom başlığı ve
 * kaydırmasız kartlar taşıyordu; 1,3 hâlâ okunur büyütme sağlar ama düzeni bozmaz. Metni yine de büyütmek isteyen bir Text
 * kendi `maxFontSizeMultiplier`ını verir (0 = sınırsız); `allowFontScaling={false}` olana dokunulmaz.
 */
export const DEFAULT_MAX_FONT_SIZE_MULTIPLIER = 1.3;

/**
 * `Text` özelliklerine varsayılan büyütme sınırını ekler. Gelen nesneye DOKUNMAZ (dondurulmuş olabilir): gerekiyorsa kopya döner,
 * gerekmiyorsa aynı nesneyi (sıcak yol: gereksiz ayırma yok). `ref` React 19'da sıradan özellik olduğu için yayılımla korunur.
 */
export function withFontScaleCap<P extends Record<string, unknown>>(props: P): P {
    if (props.allowFontScaling === false) return props;           // büyümeyen yazıya sınır gerekmez
    if (props.maxFontSizeMultiplier != null) return props;        // açıkça verilmiş (0 = sınırsız dahil) → saygı göster
    return { ...props, maxFontSizeMultiplier: DEFAULT_MAX_FONT_SIZE_MULTIPLIER };
}

/**
 * Yazıya fiilen uygulanan sistem yazı ölçeği: RN anlamıyla `maxFontSizeMultiplier >= 1` ise ölçek bu değeri aşamaz; verilmemiş,
 * 0 (sınırsız) ya da geçersizse sistem ölçeği olduğu gibi kalır.
 */
export function effectiveFontScale(systemScale: number, maxFontSizeMultiplier?: unknown): number {
    return typeof maxFontSizeMultiplier === 'number' && maxFontSizeMultiplier >= 1
        ? Math.min(systemScale, maxFontSizeMultiplier)
        : systemScale;
}

/**
 * Satır içi emoji resminin kenarı: yazı boyutu × 1,15 (Noto emoji ~1,17 em genişliğinde çizilir).
 * `maxFontScale`: yazının büyütme sınırı; resim yazıdan büyük çıkmasın diye sistem ölçeği bu sınırla kırpılır (yazı 1,3'te
 * kalırken sistem ölçeği 1,5 ise sınırsız çarpmak emojiyi olması gerekenden yaklaşık %15 büyük çizerdi).
 */
export function emojiImageSize(fontSize: number, allowFontScaling = true, maxFontScale?: number): number {
    const scaled = fontSize * (allowFontScaling ? effectiveFontScale(PixelRatio.getFontScale(), maxFontScale) : 1);
    return Math.round(scaled * 1.15);
}

/**
 * `Text` çocuklarındaki yazıları dönüştürür; React öğeleri olduğu gibi kalır (içteki `Text`ler kendi çizimlerinde yamalanır).
 * Değişen bir şey yoksa null döner. Dönen dizi düzdür (çocuklar `createElement(..., ...dizi)` ile verilir: anahtar uyarısı olmaz).
 */
export function replaceEmojiChildren(children: React.ReactNode, size: number): React.ReactNode[] | null {
    const items: React.ReactNode[] = Array.isArray(children) ? children : [children];
    const out: React.ReactNode[] = [];
    let changed = false;
    items.forEach((child, i) => {
        if (typeof child === 'string') {
            const parts = splitEmojiParts(child);
            if (parts) {
                changed = true;
                parts.forEach((p, j) => {
                    if (typeof p === 'string') out.push(p);
                    else out.push(React.createElement(Image, { key: `emoji-${i}-${j}`, source: EMOJI_IMAGES[p.key], style: { width: size, height: size } }));
                });
                return;
            }
        } else if (Array.isArray(child)) {
            const inner = replaceEmojiChildren(child, size);
            if (inner) { changed = true; out.push(...inner); return; }
        }
        out.push(child);
    });
    return changed ? out : null;
}

export function fontSizeOf(style: unknown): number {
    const flat = StyleSheet.flatten(style as never) as { fontSize?: number } | undefined;
    return typeof flat?.fontSize === 'number' ? flat.fontSize : 14;
}
