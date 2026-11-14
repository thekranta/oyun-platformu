import React from 'react';
import { Platform } from 'react-native';
import { fontSizeOf, emojiImageSize, replaceEmojiChildren, shouldUseEmojiImages } from './emojiFallback';

/**
 * `Text`'i tek yerden yamalar: Android API < 35'te çocuklardaki yeni emojiler yedek resimle değişir (bkz. lib/emojiFallback.ts).
 * React Native 0.81'de `Text` düz bir işlev bileşenidir ve `react-native` içindeki `Text` getter'ı her kullanımda
 * `Libraries/Text/Text` modülünün `default` dışa aktarımını okur; bu yüzden o dışa aktarımı değiştirmek tüm uygulamayı kapsar.
 * Hata olursa asla uygulamayı düşürmez (yama uygulanmaz, emojiler eskisi gibi çizilir). Yineleme güvenli (bir kez yamalanır).
 */
export function installEmojiFallback(os: string = Platform.OS, version: string | number = Platform.Version): boolean {
    if (!shouldUseEmojiImages(os, version)) return false;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('react-native/Libraries/Text/Text');
        const Original = mod.default;
        if (!Original || Original.__emojiFallback) return false;

        const PatchedText = (props: Record<string, unknown>) => {
            try {
                const children = props.children as React.ReactNode;
                if (typeof children === 'string' || Array.isArray(children)) {
                    const next = replaceEmojiChildren(children, emojiImageSize(fontSizeOf(props.style), props.allowFontScaling !== false));
                    if (next) return React.createElement(Original, props, ...next);
                }
            } catch {
                // dönüştürme başarısızsa özgün Text'e düş
            }
            return React.createElement(Original, props);
        };
        PatchedText.displayName = 'Text';
        (PatchedText as unknown as { __emojiFallback: boolean }).__emojiFallback = true;
        Object.keys(Original).forEach((k) => {
            if (!(k in PatchedText)) (PatchedText as unknown as Record<string, unknown>)[k] = Original[k];
        });
        mod.default = PatchedText;
        return true;
    } catch {
        return false;
    }
}

installEmojiFallback();
