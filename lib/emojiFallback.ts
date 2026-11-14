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

/** Satır içi emoji resminin kenarı: yazı boyutu × 1,15 (Noto emoji ~1,17 em genişliğinde çizilir). */
export function emojiImageSize(fontSize: number, allowFontScaling = true): number {
    const scaled = fontSize * (allowFontScaling ? PixelRatio.getFontScale() : 1);
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
