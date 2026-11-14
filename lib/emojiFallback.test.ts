import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { EMOJI_IMAGES } from './emojiFallbackAssets';
import { emojiImageSize, emojiKey, replaceEmojiChildren, shouldUseEmojiImages, splitEmojiParts } from './emojiFallback';
import { NEW_EMOJI_SEQUENCES, NEW_EMOJI_SINGLE } from './emojiNewCodepoints';

const ROOT = path.resolve(__dirname, '..');

describe('shouldUseEmojiImages', () => {
    it('yalnız Android API < 35', () => {
        expect(shouldUseEmojiImages('android', 28)).toBe(true);
        expect(shouldUseEmojiImages('android', '30')).toBe(true);
        expect(shouldUseEmojiImages('android', 34)).toBe(true);
        expect(shouldUseEmojiImages('android', 35)).toBe(false);
        expect(shouldUseEmojiImages('ios', 17)).toBe(false);
        expect(shouldUseEmojiImages('web', 0)).toBe(false);
    });
});

describe('emojiKey / splitEmojiParts', () => {
    it('anahtar: FE0F atılır, ZWJ dizisi korunur', () => {
        expect(emojiKey('🪥')).toBe('1faa5');
        expect(emojiKey('🐻‍❄️')).toBe('1f43b_200d_2744');
        expect(emojiKey('🐻‍❄')).toBe('1f43b_200d_2744');
    });

    it('düz yazıda ve eski emojilerde null (dokunulmaz)', () => {
        expect(splitEmojiParts('Merhaba dünya 123')).toBeNull();
        expect(splitEmojiParts('🍎 elma 🐶')).toBeNull();
        expect(splitEmojiParts('')).toBeNull();
    });

    it('yeni emoji yazının içinde bölünür', () => {
        expect(splitEmojiParts('🪥')).toEqual([{ key: '1faa5', text: '🪥' }]);
        expect(splitEmojiParts('Dişini 🪥 fırçala!')).toEqual(['Dişini ', { key: '1faa5', text: '🪥' }, ' fırçala!']);
        expect(splitEmojiParts('🧇🛖')).toEqual([{ key: '1f9c7', text: '🧇' }, { key: '1f6d6', text: '🛖' }]);
    });

    it('ZWJ dizileri (FE0F olsun olmasın) tek parça', () => {
        expect(splitEmojiParts('a 🐻‍❄️ b')).toEqual(['a ', { key: '1f43b_200d_2744', text: '🐻‍❄️' }, ' b']);
        expect(splitEmojiParts('🐻‍❄')).toEqual([{ key: '1f43b_200d_2744', text: '🐻‍❄' }]);
        expect(splitEmojiParts('😮‍💨')).toEqual([{ key: '1f62e_200d_1f4a8', text: '😮‍💨' }]);
    });

    it('her yedek resim gerçekten var ve boş değil', () => {
        for (const key of Object.keys(EMOJI_IMAGES)) {
            const file = path.join(ROOT, 'assets', 'emoji', `${key}.webp`);
            expect(fs.existsSync(file)).toBe(true);
            expect(fs.statSync(file).size).toBeGreaterThan(500);
        }
    });
});

describe('replaceEmojiChildren', () => {
    it('emoji yoksa null', () => {
        expect(replaceEmojiChildren('Merhaba', 20)).toBeNull();
        expect(replaceEmojiChildren(['a', 'b', 3], 20)).toBeNull();
    });

    it('tek yazı: Image + yazı parçaları; boyut verilen kenar', () => {
        const out = replaceEmojiChildren('🪥 fırça', 30)!;
        expect(out).toHaveLength(2);
        const el = out[0] as React.ReactElement<{ style: { width: number; height: number } }>;
        expect(React.isValidElement(el)).toBe(true);
        expect(el.props.style).toEqual({ width: 30, height: 30 });
        expect(out[1]).toBe(' fırça');
    });

    it('dizi çocuk: öğeler korunur, emojili yazı yerinde açılır, düz dizi döner', () => {
        const child = React.createElement('b', { key: 'x' });
        const out = replaceEmojiChildren(['Önce ', '🧇', child, ' sonra'], 20)!;
        expect(out[0]).toBe('Önce ');
        expect(React.isValidElement(out[1])).toBe(true);
        expect(out[2]).toBe(child);
        expect(out[3]).toBe(' sonra');
        expect(out).toHaveLength(4);
    });

    it('emojiImageSize: yazı boyutu × 1,15 (yazı ölçeği 1)', () => {
        expect(emojiImageSize(40, false)).toBe(46);
        expect(emojiImageSize(90, false)).toBe(103);   // 90 × 1,15 = 103,49… → 103
    });
});

/** Koruma: kaynakta Emoji 12+ bir emoji varsa yedek resmi OLMALI; yoksa eski Android'de kutu çıkar. */
describe('yeni emoji yedek resim kapsamı', () => {
    function sourceFiles(dir: string): string[] {
        const out: string[] = [];
        for (const name of fs.readdirSync(path.join(ROOT, dir))) {
            const rel = `${dir}/${name}`;
            if (fs.statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
            else if (/\.(ts|tsx|json)$/.test(name) && !/\.test\./.test(name) && !/^emoji(FallbackAssets|NewCodepoints)\.ts$/.test(name)) out.push(rel);
        }
        return out;
    }
    const NEW_SINGLE = new Set(NEW_EMOJI_SINGLE);

    it('kaynaktaki her Emoji 12+ için assets/emoji yedeği var', () => {
        const missing: string[] = [];
        for (const file of ['components', 'constants', 'lib', 'services', 'app', 'hooks', 'locales'].flatMap(sourceFiles)) {
            const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
            for (const seq of NEW_EMOJI_SEQUENCES) {
                const text = seq.split('_').map((h) => String.fromCodePoint(parseInt(h, 16))).join('');
                if (src.includes(text) && !EMOJI_IMAGES[seq]) missing.push(`${file}: ${text} (${seq})`);
            }
            for (const ch of src) {
                const cp = ch.codePointAt(0)!;
                if (NEW_SINGLE.has(cp) && !EMOJI_IMAGES[cp.toString(16)]) missing.push(`${file}: ${ch} (${cp.toString(16)})`);
            }
        }
        // Eksik varsa: yedek resmi ekleyin (assets/emoji/README.md) — yoksa eski Android'de bu emoji kutu/yarım çıkar.
        expect([...new Set(missing)]).toEqual([]);
    });
});

/** Metro yönlendirmesi: Android paketinde `Text` → lib/EmojiText.tsx (ilk deneme olan çalışma zamanı yaması cihazda etki etmemişti). */
describe('Android Text yönlendirmesi (metro.config.js)', () => {
    const metro = fs.readFileSync(path.join(ROOT, 'metro.config.js'), 'utf8');

    it('yalnız android için Libraries/Text/Text → lib/EmojiText.tsx; kendi içindeki özgün Text yönlenmez', () => {
        expect(metro).toMatch(/platform === 'android'/);
        expect(metro).toContain('Libraries[\\\\/]Text[\\\\/]Text\\.js$');
        expect(metro).toMatch(/path\.resolve\(__dirname, 'lib', 'EmojiText\.tsx'\)/);
        expect(metro).toMatch(/context\.originModulePath !== EMOJI_TEXT/);
    });

    it('sarmalayıcı özgün Text\'i alır, varsayılan dışa aktarır ve yalnız API < 35\'te çalışır', () => {
        const src = fs.readFileSync(path.join(ROOT, 'lib', 'EmojiText.tsx'), 'utf8');
        expect(src).toMatch(/require\('react-native\/Libraries\/Text\/Text'\)\.default/);
        expect(src).toMatch(/export default EmojiAwareText/);
        expect(src).toMatch(/shouldUseEmojiImages\(Platform\.OS, Platform\.Version\)/);
    });
});
