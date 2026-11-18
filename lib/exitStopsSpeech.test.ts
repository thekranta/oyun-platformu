import * as fs from 'fs';
import * as path from 'path';

/**
 * 2026-11-18 denetimi (W5): oyundan ODAYA çıkarken (çıkış düğmesi, Android geri tuşu, hata sınırının 'Menüye Dön'ü) çalan
 * yönerge/'Aferin' menüde okunmaya devam ediyordu (~41 oyunun unmount'unda stopSpeech yok). Ana ekran çıkış geçişinde
 * konuşmayı merkezi olarak keser. AMA oyun bitişi (onGameEnd -> oyunuBitir -> sonuç ekranı) konuşmayı KESMEZ:
 * bitiş tebriği sonuç ekranında sürmeli (bkz. lib/bitisTebrigiKurali.test.ts, memory/ongameend-oyunu-bitirir.md).
 * CountdownOverlay de söküldükten sonra geç onComplete() ile oyunun ilk sorusunu okutmamalı.
 */
const INDEX = fs.readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', 'index.tsx'), 'utf8');
const OVERLAY = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'CountdownOverlay.tsx'), 'utf8');

const block = (src: string, start: string, end: string) => {
    const s = src.indexOf(start);
    expect(s).toBeGreaterThan(0);
    const e = src.indexOf(end, s);
    expect(e).toBeGreaterThan(s);
    return src.slice(s, e);
};

describe('oyundan menüye çıkış konuşmayı keser', () => {
    it('stopSpeech içe aktarılır ve oyundanCik önce konuşmayı keser, sonra odaya döner', () => {
        expect(INDEX).toMatch(/import \{ stopSpeech \} from '\.\.\/\.\.\/services\/speechService';/);
        expect(INDEX).toMatch(/const oyundanCik = \(\) => \{\s*stopSpeech\(\);\s*setAsama\('menu'\);\s*\};/);
    });

    it('oyun çıkışı ve hata sınırı oyundanCik kullanır (doğrudan setAsama(menu) yok)', () => {
        expect(INDEX).toMatch(/onExit: oyundanCik,/);
        expect(INDEX).toMatch(/<GameErrorBoundary key=\{asama\} gameName=\{asama\} onExit=\{oyundanCik\}>/);
        expect(INDEX).not.toMatch(/onExit: \(\) => setAsama\('menu'\)/);
        expect(INDEX).not.toMatch(/onExit=\{\(\) => setAsama\('menu'\)\}/);
    });

    it('Android geri tuşu odaya dönmeden önce konuşmayı keser', () => {
        const handler = block(INDEX, "BackHandler.addEventListener('hardwareBackPress'", '});');
        expect(handler).toMatch(/stopSpeech\(\);[^\n]*\r?\n\s*setAsama\('menu'\);\s*return true;/);
    });

    it('oyunuBitir (onGameEnd -> sonuç) konuşmayı KESMEZ: bitiş tebriği sürer', () => {
        const bitir = block(INDEX, 'const oyunuBitir = (', 'const sifirlaOturum');
        expect(bitir).toMatch(/setAsama\('sonuc'\);/);
        expect(bitir).not.toMatch(/stopSpeech/);
        expect(INDEX).toMatch(/onGameEnd: oyunuBitir,/);
    });
});

// Aynı iş emrinin (W5) küçük maddesi: giriş/şifre sıfırlama e-postası ana ekranda normalleştirilir (iki giriş formu da buradan geçer).
describe('giriş e-postası normalleştirilir', () => {
    it('handleLogin ve handleForgot trim().toLowerCase() uygular', () => {
        expect(INDEX).toMatch(/girisYap\(mail\.trim\(\)\.toLowerCase\(\), pass\)/);
        expect(INDEX).toMatch(/sifremiUnuttum\(mail\.trim\(\)\.toLowerCase\(\)\)/);
    });
});

describe('CountdownOverlay söküm koruması', () => {
    it('söküldükten sonra tryFinish/onComplete tetiklenmez', () => {
        expect(OVERLAY).toMatch(/const mountedRef = useRef\(true\);/);
        const tryFinish = block(OVERLAY, 'const tryFinish = () => {', '    };');
        expect(tryFinish).toMatch(/if \(!mountedRef\.current \|\| finishedRef\.current/);
        expect(tryFinish).toMatch(/start\(\(\) => \{\s*if \(!mountedRef\.current\) return;\s*setIsVisible\(false\);\s*onComplete\(\);/);
        expect(OVERLAY).toMatch(/return \(\) => \{\s*mountedRef\.current = false;/);
    });

    it('unmount yalnız BİTMEDEN sökülünce konuşmayı keser (normal bitişte oyunun ilk cümlesi kesilmez)', () => {
        expect(OVERLAY).toMatch(/if \(!finishedRef\.current\) stopSpeech\(\);/);
        // koşulsuz stopSpeech çağrısı yok
        const calls = OVERLAY.split(/\r?\n/).filter((l) => /stopSpeech\(\)/.test(l) && !/^\s*\/\//.test(l));
        expect(calls).toEqual([expect.stringMatching(/if \(!finishedRef\.current\) stopSpeech\(\);/)]);
    });
});
