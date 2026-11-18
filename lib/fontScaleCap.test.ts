/**
 * Yazı büyütme sınırı + durum çubuğu + büyük yazıda taşmayan kartlar (denetim W6).
 *
 * Sorun: Android'de sistem yazı tipi büyük olan ebeveynlerde (ölçek 1,5-2) ToyRoom başlığı oyuncakların arkasına giriyor, sabit boyutlu
 * kartlarda (AgirHafif kart 140 / emoji 84 gibi ~70 oyun) emoji taşıyor, kaydırmasız ebeveyn kapısı / onay kartı ekrandan uzuyordu.
 *
 * Düzeltmeler ve bu dosyadaki korumalar:
 *  1. lib/EmojiText.tsx (Android'de her `Text`): maxFontSizeMultiplier verilmemişse varsayılan 1,3 — emoji yedeğinin `ACTIVE` kapısının
 *     DIŞINDA (API 35+ dahil tüm Android). Davranış testi: gerçek EmojiAwareText çağrılır.
 *  2. app/_layout.tsx: StatusBar style="dark" (uygulama her zaman açık temalı; "auto" koyu telefonda simgeleri görünmez yapıyordu).
 *  3. components/ParentGateHost.tsx ve components/InAppConfirm.tsx: kart maxHeight %100 + ScrollView, düğmeler kaydırma dışında.
 *
 * KAPSAM DIŞI (bilinçli): iOS (Dynamic Type) ve web özgün `Text`i kullanır — Metro yönlendirmesi yalnız android. RN 0.81 + React 19'da
 * `Text.defaultProps` fonksiyon bileşenlerinde çalışmaz; iOS için ayrı yol iOS ilk derlemesinden önce gerekir.
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
// @ts-expect-error @types/react-test-renderer kurulu değil (hooks/useStoryPreload.test.tsx ile aynı); kullanılan arayüz aşağıda.
import renderer, { act } from 'react-test-renderer';
import { DEFAULT_MAX_FONT_SIZE_MULTIPLIER, effectiveFontScale, emojiImageSize, withFontScaleCap } from './emojiFallback';
import { GATE_MAX_WRONG, GATE_OPTION_COUNT, requestParentGate } from './parentGate';

// Özgün (yerel) Text'in yerine geçen düz bileşen: çocuklarını çizer; EmojiText'in ona ne verdiğini props'tan okuruz.
jest.mock('react-native/Libraries/Text/Text', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactInMock = require('react');
    function MockNativeText(props: Record<string, unknown>) {
        return ReactInMock.createElement('Text', props);
    }
    return { __esModule: true, default: MockNativeText };
});
// Çeviri: anahtarı (ve varsa değişkenleri) döndür; soru etiketinden a, b okunur.
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k) }),
}));

const ROOT = path.resolve(__dirname, '..');
const oku = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('yazı büyütme sınırı: saf yardımcılar (lib/emojiFallback.ts)', () => {
    it('varsayılan sınır 1,3', () => {
        expect(DEFAULT_MAX_FONT_SIZE_MULTIPLIER).toBe(1.3);
    });

    it('sınır verilmemişse ekler; verilmişse (0 = sınırsız dahil) ya da yazı büyümüyorsa dokunmaz', () => {
        expect(withFontScaleCap({ children: 'a' })).toEqual({ children: 'a', maxFontSizeMultiplier: 1.3 });
        expect(withFontScaleCap({ maxFontSizeMultiplier: undefined })).toEqual({ maxFontSizeMultiplier: 1.3 });
        expect(withFontScaleCap({ maxFontSizeMultiplier: null })).toEqual({ maxFontSizeMultiplier: 1.3 });

        const kendi = { maxFontSizeMultiplier: 2 };
        expect(withFontScaleCap(kendi)).toBe(kendi);
        const sinirsiz = { maxFontSizeMultiplier: 0 };
        expect(withFontScaleCap(sinirsiz)).toBe(sinirsiz);
        expect(withFontScaleCap(sinirsiz).maxFontSizeMultiplier).toBe(0);

        const buyumez = { allowFontScaling: false };
        expect(withFontScaleCap(buyumez)).toBe(buyumez);
        expect('maxFontSizeMultiplier' in withFontScaleCap(buyumez)).toBe(false);
    });

    it('gelen nesneyi değiştirmez (dondurulmuş props güvenli) ve gerekmedikçe kopya ayırmaz', () => {
        const donuk = Object.freeze({ children: 'a', style: { fontSize: 20 } });
        const sonuc = withFontScaleCap(donuk);
        expect(sonuc).not.toBe(donuk);
        expect(sonuc.style).toBe(donuk.style);
        expect('maxFontSizeMultiplier' in donuk).toBe(false);
    });

    it('effectiveFontScale: ölçek sınırı aşamaz; sınır yok / 0 / geçersizse sistem ölçeği', () => {
        expect(effectiveFontScale(1.5, 1.3)).toBe(1.3);
        expect(effectiveFontScale(1.1, 1.3)).toBe(1.1);
        expect(effectiveFontScale(2, 1)).toBe(1);
        expect(effectiveFontScale(1.5, 0)).toBe(1.5);
        expect(effectiveFontScale(1.5, undefined)).toBe(1.5);
        expect(effectiveFontScale(1.5, 'x')).toBe(1.5);
    });

    it('emojiImageSize: yazı ölçeği kapalıyken ve sınırsız çağrıda eski değerler korunur; sınır varsa kırpılır', () => {
        // Eski sözleşme (lib/emojiFallback.test.ts ile aynı): ölçek kapalı → fontSize × 1,15.
        expect(emojiImageSize(40, false)).toBe(46);
        expect(emojiImageSize(90, false)).toBe(103);
        expect(emojiImageSize(40, false, 1.3)).toBe(46);

        const { PixelRatio } = jest.requireActual('react-native');
        const spy = jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.5);
        try {
            expect(emojiImageSize(40, true)).toBe(69);          // 40 × 1,5 × 1,15 (sınırsız: eski davranış)
            expect(emojiImageSize(40, true, 1.3)).toBe(60);     // 40 × 1,3 × 1,15 = 59,8 → yazıyla aynı ölçekte
            expect(emojiImageSize(40, true, 2)).toBe(69);       // sistem ölçeği sınırın altında → kırpma yok
            expect(emojiImageSize(40, true, 0)).toBe(69);       // 0 = sınırsız
        } finally {
            spy.mockRestore();
        }
    });
});

/** EmojiText.tsx'i yalıtılmış yükler. active: emoji yedeği kapısı (Android API < 35) elle açılır/kapanır. */
function yukle(active: boolean, sistemOlcegi = 1.5) {
    let sonuc!: { EmojiAwareText: (p: Record<string, unknown>) => React.ReactElement<Record<string, unknown>>; Yerel: unknown };
    // Ölçek hem dış hem yalıtılmış react-native örneğinde ayarlanır: `requireActual` hangi kayıt defterinden yüklenirse yüklensin etkili olsun.
    jest.spyOn(jest.requireActual('react-native').PixelRatio, 'getFontScale').mockReturnValue(sistemOlcegi);
    jest.isolateModules(() => {
        jest.doMock('./emojiFallback', () => ({ ...jest.requireActual('./emojiFallback'), shouldUseEmojiImages: () => active }));
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PixelRatio } = require('react-native');
        jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(sistemOlcegi);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const EmojiAwareText = require('./EmojiText').default;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Yerel = require('react-native/Libraries/Text/Text').default;
        sonuc = { EmojiAwareText, Yerel };
    });
    jest.dontMock('./emojiFallback');
    return sonuc;
}

describe('EmojiAwareText: varsayılan maxFontSizeMultiplier=1,3 (davranış)', () => {
    // EmojiText ilk yedek kullanımında bir kez console.log yazar; testte gürültü olmasın.
    beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
    afterEach(() => jest.restoreAllMocks());

    it('emoji yedeği KAPALIYKEN (Android API 35+) de sınır uygulanır; özgün Text çizilir', () => {
        const { EmojiAwareText, Yerel } = yukle(false);
        const el = EmojiAwareText({ children: 'Merhaba', style: { fontSize: 20 } });
        expect(el.type).toBe(Yerel);
        expect(el.props.maxFontSizeMultiplier).toBe(1.3);
        expect(el.props.children).toBe('Merhaba');
        expect(el.props.style).toEqual({ fontSize: 20 });
    });

    it('emoji yedeği AÇIKKEN de sınır uygulanır ve yedek resim sınırlı ölçekle boyutlanır (sistem 1,5 → 1,3)', () => {
        const { EmojiAwareText, Yerel } = yukle(true, 1.5);
        const el = EmojiAwareText({ children: '🪥 fırça', style: { fontSize: 40 } });
        expect(el.type).toBe(Yerel);
        expect(el.props.maxFontSizeMultiplier).toBe(1.3);
        const [resim, yazi] = el.props.children as [React.ReactElement<{ style: { width: number; height: number } }>, string];
        expect(yazi).toBe(' fırça');
        expect(resim.props.style).toEqual({ width: 60, height: 60 });   // sınırsız olsaydı 69
    });

    it('açıkça verilen sınıra saygı: 2 → resim 1,5 ölçekle; 0 (sınırsız) olduğu gibi kalır', () => {
        const { EmojiAwareText } = yukle(true, 1.5);
        const iki = EmojiAwareText({ children: '🪥', style: { fontSize: 40 }, maxFontSizeMultiplier: 2 });
        expect(iki.props.maxFontSizeMultiplier).toBe(2);
        // Tek çocuk → createElement tek öğe verir (dizi değil); ikisine de dayanıklı oku.
        const cocuklar = ([] as unknown[]).concat(iki.props.children) as React.ReactElement<{ style: { width: number } }>[];
        expect(cocuklar[0].props.style.width).toBe(69);

        const sifir = EmojiAwareText({ children: 'a', maxFontSizeMultiplier: 0 });
        expect(sifir.props.maxFontSizeMultiplier).toBe(0);
    });

    it('allowFontScaling={false} olana sınır eklenmez', () => {
        const { EmojiAwareText } = yukle(false);
        const el = EmojiAwareText({ children: 'a', allowFontScaling: false });
        expect('maxFontSizeMultiplier' in el.props).toBe(false);
    });

    it('dondurulmuş props\'ta düşmez, ref (React 19\'da sıradan prop) kopyada korunur', () => {
        const { EmojiAwareText } = yukle(false);
        const ref = { current: null };
        const props = Object.freeze({ children: 'a', ref });
        const el = EmojiAwareText(props);
        expect(el.props.maxFontSizeMultiplier).toBe(1.3);
        expect((el.props as { ref?: unknown }).ref).toBe(ref);
        expect('maxFontSizeMultiplier' in props).toBe(false);
    });
});

describe('kaynak korumaları: sınır ACTIVE kapısının dışında, durum çubuğu koyu', () => {
    it('EmojiText: sınır `if (ACTIVE)` ÖNCESİNDE hesaplanır ve iki dönüş yolunda da sınırlı props kullanılır', () => {
        const src = oku('lib/EmojiText.tsx');
        const sinir = src.indexOf('withFontScaleCap(props)');
        const kapi = src.indexOf('if (ACTIVE)');
        expect(sinir).toBeGreaterThan(-1);
        expect(kapi).toBeGreaterThan(sinir);
        expect(src.match(/createElement\(OriginalText, capped/g)).toHaveLength(2);
        expect(src).not.toMatch(/createElement\(OriginalText, props/);
        expect(src).toMatch(/shouldUseEmojiImages\(Platform\.OS, Platform\.Version\)/);   // emoji yedeği kapısı değişmedi
        expect(oku('lib/emojiFallback.ts')).toContain('export const DEFAULT_MAX_FONT_SIZE_MULTIPLIER = 1.3;');
    });

    it('kök yerleşim: StatusBar style="dark" ("auto" değil)', () => {
        const src = oku('app/_layout.tsx');
        expect(src).toContain('<StatusBar style="dark" />');
        expect(src).not.toMatch(/StatusBar style="auto"/);
    });

    it('iki kartta da: maxHeight %100 + ScrollView + kaydırma dışında düğmeler + modal erişilebilirlik', () => {
        for (const dosya of ['components/ParentGateHost.tsx', 'components/InAppConfirm.tsx']) {
            const src = oku(dosya);
            expect(src).toMatch(/import \{[^}]*\bScrollView\b[^}]*\} from 'react-native'/);
            expect(src).toContain('<ScrollView');
            expect(src).toContain("maxHeight: '100%'");
            expect(src).toContain('keyboardShouldPersistTaps="handled"');
            expect(src).toContain('accessibilityViewIsModal');
        }
        expect(oku('components/InAppConfirm.tsx')).toContain('accessibilityRole="alert"');
    });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Kartların davranışı: kaydırma eklense de akış bozulmadı (düğmeler kaydırma alanının DIŞINDA, yanlış cevap, bekleme, vazgeç).

interface Dugum {
    type: unknown;
    props: Record<string, unknown>;
    children: Array<Dugum | string>;
    parent: Dugum | null;
    findAll: (p: (n: Dugum) => boolean) => Dugum[];
    findAllByType: (t: unknown) => Dugum[];
}

/** Bir düğümün altındaki tüm düz yazı. */
function yazi(n: Dugum | string): string {
    return typeof n === 'string' ? n : n.children.map(yazi).join('');
}
function atasiMi(n: Dugum, aranan: Dugum): boolean {
    for (let p: Dugum | null = n.parent; p; p = p.parent) if (p === aranan) return true;
    return false;
}

describe('InAppConfirm: kaydırılabilir ileti, sabit düğmeler, akış korunur', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ScrollView, TouchableOpacity } = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const InAppConfirm = require('../components/InAppConfirm').default;

    function ciz(state: object | null, onClose: () => void) {
        let agac!: { root: Dugum; unmount: () => void };
        act(() => { agac = renderer.create(React.createElement(InAppConfirm, { state, onClose })); });
        return agac;
    }

    it('başlık+ileti ScrollView içinde, onay/vazgeç düğmeleri dışında; basınca onClose sonra onConfirm', () => {
        const sira: string[] = [];
        const onClose = jest.fn(() => { sira.push('close'); });
        const onConfirm = jest.fn(() => { sira.push('confirm'); });
        const agac = ciz({ title: 'Silinsin mi?', message: 'Bu işlem geri alınamaz.', confirmLabel: 'Sil', cancelLabel: 'Vazgeç', destructive: true, onConfirm }, onClose);
        try {
            const scroll = agac.root.findAllByType(ScrollView)[0];
            expect(scroll).toBeDefined();
            expect(yazi(scroll)).toContain('Silinsin mi?');
            expect(yazi(scroll)).toContain('Bu işlem geri alınamaz.');
            expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');

            const dugmeler = agac.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
            const vazgec = dugmeler.find((n) => yazi(n) === 'Vazgeç')!;
            const onay = dugmeler.find((n) => yazi(n) === 'Sil')!;
            expect(vazgec && onay).toBeTruthy();
            expect(atasiMi(vazgec, scroll)).toBe(false);
            expect(atasiMi(onay, scroll)).toBe(false);

            act(() => { (onay.props.onPress as () => void)(); });
            expect(sira).toEqual(['close', 'confirm']);
            act(() => { (vazgec.props.onPress as () => void)(); });
            expect(onClose).toHaveBeenCalledTimes(2);
            expect(onConfirm).toHaveBeenCalledTimes(1);

            // Arka plan dokunuşu (kapatma) ScrollView'ın dışında kalan ayrı katman: hâlâ var ve onClose'a bağlı.
            const arkaPlan = agac.root.findAllByType(TouchableOpacity).find((n) => !atasiMi(n, scroll) && n.props.onPress === onClose);
            expect(arkaPlan).toBeDefined();
        } finally {
            act(() => { agac.unmount(); });
        }
    });

    it('state yokken kart çizilmez', () => {
        const agac = ciz(null, jest.fn());
        try {
            expect(agac.root.findAllByType(ScrollView)).toHaveLength(0);
        } finally {
            act(() => { agac.unmount(); });
        }
    });
});

describe('ParentGateHost: kaydırılabilir kart, sabit Vazgeç, yanlış cevap + bekleme akışı korunur', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ScrollView } = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ParentGateHost = require('../components/ParentGateHost').default;

    function ciz() {
        let agac!: { root: Dugum; unmount: () => void };
        act(() => { agac = renderer.create(React.createElement(ParentGateHost)); });
        return agac;
    }
    function dugmeler(root: Dugum) {
        return root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    }
    /** Ekrandaki soruyu etiketinden okur ({a,b}) → doğru cevap. */
    function dogruCevap(root: Dugum): number {
        const soru = root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && (n.props.accessibilityLabel as string).startsWith('parentGate.questionLabel'))[0];
        const { a, b } = JSON.parse((soru.props.accessibilityLabel as string).replace('parentGate.questionLabel', '')) as { a: number; b: number };
        return a * b;
    }
    function secenekler(root: Dugum) {
        return dugmeler(root).filter((n) => /^\d+$/.test(yazi(n)));
    }

    it('seçenekler ScrollView içinde, Vazgeç dışında; Vazgeç false, doğru cevap true döndürür', async () => {
        const agac = ciz();
        try {
            let sonuc: boolean | undefined;
            act(() => { requestParentGate().then((v) => { sonuc = v; }); });
            const scroll = agac.root.findAllByType(ScrollView)[0];
            expect(scroll).toBeDefined();
            expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
            expect(yazi(scroll)).toContain('parentGate.title');

            const ops = secenekler(agac.root);
            expect(ops).toHaveLength(GATE_OPTION_COUNT);
            ops.forEach((o) => expect(atasiMi(o, scroll)).toBe(true));
            const vazgec = dugmeler(agac.root).find((n) => yazi(n) === 'parentGate.cancel')!;
            expect(vazgec).toBeDefined();
            expect(atasiMi(vazgec, scroll)).toBe(false);

            const dogru = ops.find((o) => yazi(o) === String(dogruCevap(agac.root)))!;
            await act(async () => { (dogru.props.onPress as () => void)(); });
            expect(sonuc).toBe(true);

            let ikinci: boolean | undefined;
            act(() => { requestParentGate().then((v) => { ikinci = v; }); });
            const vazgec2 = dugmeler(agac.root).find((n) => yazi(n) === 'parentGate.cancel')!;
            await act(async () => { (vazgec2.props.onPress as () => void)(); });
            expect(ikinci).toBe(false);
        } finally {
            act(() => { agac.unmount(); });
        }
    });

    it('yanlış cevap uyarı gösterir; arka arkaya hata sayısı sınıra varınca seçenekler kilitlenir (bekleme)', async () => {
        const agac = ciz();
        try {
            let sonuc: boolean | undefined;
            act(() => { requestParentGate().then((v) => { sonuc = v; }); });

            for (let i = 0; i < GATE_MAX_WRONG; i++) {
                const yanlis = secenekler(agac.root).find((o) => yazi(o) !== String(dogruCevap(agac.root)))!;
                act(() => { (yanlis.props.onPress as () => void)(); });
            }
            const kilitli = secenekler(agac.root);
            expect(kilitli).toHaveLength(GATE_OPTION_COUNT);
            kilitli.forEach((o) => expect(o.props.disabled).toBe(true));
            expect(yazi(agac.root as unknown as Dugum)).toContain('parentGate.locked');

            // Kilitliyken doğru cevaba basmak kapıyı AÇMAZ.
            const dogru = kilitli.find((o) => yazi(o) === String(dogruCevap(agac.root)));
            if (dogru) await act(async () => { (dogru.props.onPress as () => void)(); });
            expect(sonuc).toBeUndefined();
        } finally {
            act(() => { agac.unmount(); });
        }
    });
});
