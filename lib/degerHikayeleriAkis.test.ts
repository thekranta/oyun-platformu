import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
// @ts-expect-error @types/react-test-renderer kurulu değil (hooks/useStoryPreload.test.tsx ile aynı yol); aşağıdaki kullanım yeterli.
import renderer, { act } from 'react-test-renderer';

/**
 * Değer hikâyeleri (Adalet, Aile Sepeti, Küçük Kalpler) akış korumaları — denetim 2026-11-18 (W4):
 *  (1) Seçim ekranı küçük telefonda kırpılıyordu: sabit 250 dp kart, dikeyde 2 × (250 + 40) = 580 dp sütun,
 *      360x640'ta alan ≈ 448 dp (overflow:'hidden'). Şimdi kart kenarı alana göre hesaplanır + ScrollView yedeği.
 *  (2) Adalet / Aile Sepeti final sahnesi hiç oynamıyordu: onGameEnd final düğüme girer girmez çağrılıyor,
 *      ana ekran hemen sonuç ekranına geçiyordu. Şimdi onGameEnd final anlatımı bittikten (ya da güvenlik
 *      süresinden) sonra TEK KEZ; finalde çıkılırsa kayıt kaybolmaz; çıkıştan sonra geç çağrı yok; onExit
 *      ayrıca çağrılmaz (sonuç <-> menü sıçraması).
 *  (3) Çift dokunuş: aynı karede iki dokunuş yola iki seçim yazıyordu → ref kilidi.
 */

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---------- Bileşen bağımlılık taklitleri (davranış testleri için) ----------
type MockSound = {
    src: any;
    cb: ((s: any) => void) | null;
    stopAsync: jest.Mock;
    unloadAsync: jest.Mock;
    setVolumeAsync: jest.Mock;
    setOnPlaybackStatusUpdate: (cb: (s: any) => void) => void;
};
const mockSounds: MockSound[] = [];

jest.mock('expo-av', () => ({
    Audio: {
        Sound: {
            createAsync: jest.fn(async (src: any) => {
                const s: any = {
                    src,
                    cb: null,
                    stopAsync: jest.fn(async () => { }),
                    unloadAsync: jest.fn(async () => { }),
                    setVolumeAsync: jest.fn(async () => { }),
                    setOnPlaybackStatusUpdate(cb: (st: any) => void) { s.cb = cb; },
                };
                mockSounds.push(s);
                return { sound: s };
            }),
        },
    },
}));
jest.mock('./assetMap', () => ({ asset: (p: string) => p }));
jest.mock('../services/storyPreload', () => ({ playableAudioSource: (s: any) => s }));
jest.mock('../hooks/useStoryPreload', () => ({ useStoryPreload: () => { } }));
jest.mock('@react-native-community/slider', () => () => null);
jest.mock('react-native-confetti-cannon', () => () => null);
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../components/DynamicBackground', () => {
    const R = require('react');
    const { Text: T, View: V } = require('react-native');
    return ({ children, onExit }: any) => R.createElement(V, null, R.createElement(T, { onPress: onExit, testID: 'cikis' }, 'x'), children);
});
jest.mock('../components/GameExitButton', () => {
    const R = require('react');
    const { Text: T } = require('react-native');
    return ({ onPress }: any) => R.createElement(T, { onPress, testID: 'cikis' }, 'x');
});
jest.mock('react-native-svg', () => {
    const C = () => null;
    return { __esModule: true, default: C, Circle: C, Defs: C, Ellipse: C, G: C, Line: C, LinearGradient: C, Path: C, Rect: C, Stop: C };
});
const mockSpeak = jest.fn((_t: string, _o?: any) => Promise.resolve());
jest.mock('../services/speechService', () => ({
    speak: (t: string, o?: any) => mockSpeak(t, o),
    stopSpeech: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdaletHikayesi = require('../components/AdaletHikayesi');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AileSepetiMacerasi = require('../components/AileSepetiMacerasi');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SevgiHikayesi = require('../components/SevgiHikayesi').default;

const flush = async () => {
    await act(async () => {
        for (let i = 0; i < 20; i++) await Promise.resolve();
    });
};
const finishSound = async (s: MockSound | undefined) => {
    await act(async () => { s?.cb?.({ isLoaded: true, didJustFinish: true }); });
    await flush();
};
const lastSound = () => mockSounds[mockSounds.length - 1];

// react-test-renderer yardımcıları (@testing-library/react-native 14 bu kurulumda 'test-renderer' createRoot istiyor).
type R = { root: any; unmount: () => void };
const render = (el: React.ReactElement): R => {
    let t: any;
    act(() => { t = renderer.create(el); });
    return { root: t.root, unmount: () => act(() => { t.unmount(); }) };
};
const dugmeler = (r: R): any[] => r.root.findAllByType(TouchableOpacity);
const yazisi = (n: any) => n.findAllByType(Text).map((x: any) => [].concat(x.props.children).join('')).join(' ');
const yaziylaDugme = (r: R, yazi: string) => {
    const d = dugmeler(r).find((n) => yazisi(n).includes(yazi));
    if (!d) throw new Error(`düğme yok: ${yazi}`);
    return d;
};
const cikis = (r: R) => r.root.findByProps({ testID: 'cikis' });

// ---------- (1) Seçim kartı boyutu: saf mantık ----------
describe('secimKartBoyutu: iki kart seçim alanına sığar', () => {
    const cases: [string, any][] = [['AdaletHikayesi', AdaletHikayesi], ['AileSepetiMacerasi', AileSepetiMacerasi]];
    it.each(cases)('%s: 360x640 (alan ≈ 332x448) ve 411x686 (alan ≈ 381x494) dikeyde kırpılmaz', (_ad, mod) => {
        const f = mod.secimKartBoyutu as (w: number, h: number, max: number, dikey: boolean) => number;
        expect(f(332, 448, 250, true)).toBe(184); // (448 − 80) / 2
        expect(f(381, 494, 250, true)).toBe(207); // (494 − 80) / 2
        for (const [w, h] of [[332, 448], [381, 494], [300, 400], [342, 520]]) {
            const k = f(w, h, 250, true);
            expect(2 * (k + 40)).toBeLessThanOrEqual(h); // sütun yüksekliği alana sığar
            expect(k + 40).toBeLessThanOrEqual(w);
        }
    });
    it.each(cases)('%s: yatayda satır sığar; geniş alanda üst sınır korunur; ölçülmemiş alan → üst sınır', (_ad, mod) => {
        const f = mod.secimKartBoyutu as (w: number, h: number, max: number, dikey: boolean) => number;
        const k = f(608, 240, 250, false); // 640x360 yatay telefon
        expect(2 * (k + 40)).toBeLessThanOrEqual(608);
        expect(k + 40).toBeLessThanOrEqual(240);
        expect(f(950, 900, 350, false)).toBe(350);
        expect(f(0, 0, 250, true)).toBe(250);
        expect(f(200, 150, 250, true)).toBe(100); // alt sınır; taşanı ScrollView kaydırır
    });
});

describe('seçim ekranı kaynakta: hesaplı boyut + ScrollView yedeği', () => {
    it.each(['AdaletHikayesi', 'AileSepetiMacerasi'])('%s', (ad) => {
        const src = read(`components/${ad}.tsx`);
        expect(src).not.toMatch(/width: isMobile \? 250 : 350/);
        expect(src).toMatch(/width: kartBoyutu,\s*\n\s*height: kartBoyutu,/);
        expect(src).toContain("contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}");
        expect(src).toMatch(/style=\{styles\.overlayContainer\}\s*\n\s*onLayout=/);
        expect(src).toMatch(/import \{[^}]*\bScrollView\b[^}]*\} from 'react-native';/);
    });
    it('SevgiHikayesi: kartlar tek satıra sığar (genişlik pencereye göre), ScrollView yedeği', () => {
        const src = read('components/SevgiHikayesi.tsx');
        expect(src).toContain('Math.min(200, Math.floor((Math.min(winW * 0.92, 520) - 16) / 2))');
        expect(src).toContain('style={[styles.choiceBtn, { width: choiceW }]}');
        expect(src).toContain("<ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>");
        // 360 dp: iki kart + 16 aralık ≤ alt alan genişliği (331 dp)
        const w = (winW: number) => Math.min(200, Math.floor((Math.min(winW * 0.92, 520) - 16) / 2));
        for (const winW of [320, 360, 411, 1024]) expect(2 * w(winW) + 16).toBeLessThanOrEqual(Math.min(winW * 0.92, 520));
    });
});

// ---------- (2)+(3) Adalet / Aile Sepeti akışı: davranış ----------
const hikayeler: [string, any, string][] = [
    ['AdaletHikayesi', AdaletHikayesi.default, 'adalet-hikayesi'],
    ['AileSepetiMacerasi', AileSepetiMacerasi.default, 'aile-sepeti'],
];

// Finale kadar ilerle: her seçim ekranında İKİ seçeneğe aynı karede dokun (çift dokunuş), ilk seçenek kazanmalı.
async function finaleKadar(r: R, onGameEnd: jest.Mock) {
    for (let adim = 0; adim < 20; adim++) {
        await flush();
        const son = lastSound();
        if (son && String(son.src).includes('final_narr')) return son;
        expect(onGameEnd).not.toHaveBeenCalled(); // finalden önce kayıt yok
        const btns = dugmeler(r);
        if (btns.length) {
            act(() => {
                btns[0].props.onPress();
                btns[btns.length - 1].props.onPress();
            });
            continue;
        }
        await finishSound(son);
    }
    throw new Error('final sahnesine ulaşılamadı');
}

describe.each(hikayeler)('%s akışı', (_ad, Bilesen, oyunAdi) => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockSounds.length = 0;
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    it('final anlatımı OYNAR; onGameEnd anlatım bitip konfetiden sonra tek kez; onExit çağrılmaz; çift dokunuş yola tek seçim yazar', async () => {
        const onGameEnd = jest.fn();
        const onExit = jest.fn();
        const r = render(React.createElement(Bilesen, { onExit, onGameEnd }));
        const finalSes = await finaleKadar(r, onGameEnd);
        // Final düğüme girildi, anlatım çalıyor: henüz sonuç ekranına atılmamalı.
        await act(async () => { jest.advanceTimersByTime(10000); });
        expect(onGameEnd).not.toHaveBeenCalled();
        await finishSound(finalSes);
        await act(async () => { jest.advanceTimersByTime(2599); });
        expect(onGameEnd).not.toHaveBeenCalled();
        await act(async () => { jest.advanceTimersByTime(1); });
        expect(onGameEnd).toHaveBeenCalledTimes(1);
        const [ad, , hamle, hata, , extra] = onGameEnd.mock.calls[0];
        expect(ad).toBe(oyunAdi);
        expect(hamle).toBe(3); // intro + 2 seçim (çift dokunuşla şişmez)
        expect(hata).toBe(0);
        expect(JSON.parse(extra.cizimVerisi).secilen_yol).toBe('intro -> scene_a -> end_a1');
        // Güvenlik zamanlayıcısı ve eski onExit zinciri ikinci bir çağrı üretmez.
        await act(async () => { jest.advanceTimersByTime(60000); });
        expect(onGameEnd).toHaveBeenCalledTimes(1);
        expect(onExit).not.toHaveBeenCalled();
        r.unmount();
    });

    it('final sesi bitiş olayı vermezse güvenlik süresinde (30 sn) yine tam bir kez kaydedilir', async () => {
        const onGameEnd = jest.fn();
        const r = render(React.createElement(Bilesen, { onExit: jest.fn(), onGameEnd }));
        await finaleKadar(r, onGameEnd);
        await act(async () => { jest.advanceTimersByTime(29999); });
        expect(onGameEnd).not.toHaveBeenCalled();
        await act(async () => { jest.advanceTimersByTime(1); });
        expect(onGameEnd).toHaveBeenCalledTimes(1);
        await act(async () => { jest.advanceTimersByTime(60000); });
        expect(onGameEnd).toHaveBeenCalledTimes(1);
        r.unmount();
    });

    it('finalde çıkılırsa sonuç tam bir kez kaydedilir; çıkıştan sonra geç onGameEnd / onExit yok', async () => {
        const onGameEnd = jest.fn();
        const onExit = jest.fn();
        const r = render(React.createElement(Bilesen, { onExit, onGameEnd }));
        const finalSes = await finaleKadar(r, onGameEnd);
        act(() => { cikis(r).props.onPress(); });
        expect(onGameEnd).toHaveBeenCalledTimes(1);
        expect(JSON.parse(onGameEnd.mock.calls[0][5].cizimVerisi).secilen_yol).toBe('intro -> scene_a -> end_a1');
        r.unmount(); // ana ekran sonuç ekranına geçti
        await finishSound(finalSes); // geç gelen bitiş olayı
        await act(async () => { jest.advanceTimersByTime(60000); });
        expect(onGameEnd).toHaveBeenCalledTimes(1);
        expect(onExit).not.toHaveBeenCalled();
    });

    it('finalden önce çıkış: yalnız menüye döner, kayıt yok', async () => {
        const onGameEnd = jest.fn();
        const onExit = jest.fn();
        const r = render(React.createElement(Bilesen, { onExit, onGameEnd }));
        await flush();
        act(() => { cikis(r).props.onPress(); });
        expect(onExit).toHaveBeenCalledTimes(1);
        r.unmount();
        await act(async () => { jest.advanceTimersByTime(60000); });
        expect(onGameEnd).not.toHaveBeenCalled();
    });

    it('çıkıştan sonra yüklenmesi biten ses sahipsiz kalıp çalmaz (hemen unload edilir)', async () => {
        const r = render(React.createElement(Bilesen, { onExit: jest.fn(), onGameEnd: jest.fn() }));
        r.unmount(); // ilk anlatım createAsync'i hâlâ sürüyor
        await flush();
        expect(mockSounds.length).toBeLessThanOrEqual(1);
        for (const s of mockSounds) expect(s.unloadAsync).toHaveBeenCalled();
    });
});

describe('Adalet / Aile Sepeti kaynakta', () => {
    it.each(['AdaletHikayesi', 'AileSepetiMacerasi'])('%s: kayıt yalnız finishStory içinde, ref bayraklarıyla; seçim kilidi', (ad) => {
        const src = read(`components/${ad}.tsx`);
        const efekt = src.slice(src.indexOf('choiceLockRef.current = false; // yeni düğüm'), src.indexOf('}, [currentNodeId]);'));
        expect(efekt).not.toContain('logGameResult');
        expect(efekt).toContain('setTimeout(finishStory, FINAL_GUVENLIK_MS)');
        expect(src.match(/logGameResult\(\)/g)).toHaveLength(1);
        expect(src).toMatch(/if \(endedRef\.current \|\| !mountedRef\.current\) return;\s*\n\s*endedRef\.current = true;\s*\n\s*if \(onGameEnd\) logGameResult\(\);\s*\n\s*else onExit\(\);/);
        expect(src).not.toMatch(/setTimeout\(onExit/);
        expect(src).not.toMatch(/\[isLogging, setIsLogging\]/);
        expect(src).toContain('<DynamicBackground onExit={handleExit}>');
        expect(src).toMatch(/const handleOptionSelect = \(opt: StoryOption\) => \{\s*\n\s*if \(choiceLockRef\.current\) return;/);
        expect(src).toMatch(/const gen = \+\+playGenRef\.current;\s*\n\s*await stopAudio\(\);/);
    });
});

// ---------- Küçük Kalpler (Sevgi) ----------
describe('SevgiHikayesi: çift dokunuş kilidi', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockSpeak.mockClear();
    });
    afterEach(() => jest.useRealTimers());

    it('her seçimde iki seçeneğe aynı karede dokunmak yola tek temsil yazar', async () => {
        const onGameEnd = jest.fn();
        const r = render(React.createElement(SevgiHikayesi, { onExit: jest.fn(), onGameEnd }));
        act(() => { yaziylaDugme(r, 'Hikayeyi Dinle').props.onPress(); });
        await flush(); // intro anlatımı
        await act(async () => { jest.advanceTimersByTime(500); });
        await flush(); // q1
        act(() => {
            yaziylaDugme(r, 'Yanına oturup sarıl').props.onPress();
            yaziylaDugme(r, 'Güldürecek bir şey yap').props.onPress();
        });
        await flush(); // scene2
        await act(async () => { jest.advanceTimersByTime(500); });
        await flush(); // q2
        act(() => {
            yaziylaDugme(r, 'En sevdiği çileği ver').props.onPress();
            yaziylaDugme(r, 'Elinden tut, birlikte ara').props.onPress();
        });
        await flush(); // ending
        await act(async () => { jest.advanceTimersByTime(2600); });
        expect(onGameEnd).toHaveBeenCalledTimes(1);
        expect(onGameEnd.mock.calls[0][2]).toBe(2);
        expect(JSON.parse(onGameEnd.mock.calls[0][5].cizimVerisi).temsiller).toEqual(['duygusal-teselli', 'paylasma']);
        r.unmount();
    });

    it('kaynakta: handleChoice ref kilidiyle başlar, kilit düğüm efektinde açılır', () => {
        const src = read('components/SevgiHikayesi.tsx');
        expect(src).toMatch(/const handleChoice = \(opt: StoryOption\) => \{\s*\n\s*if \(choiceLockRef\.current\) return;/);
        expect(src).toMatch(/let active = true;\s*\n\s*choiceLockRef\.current = false;/);
    });
});

// ---------- Konuşulan cümleler / klip adları değişmedi ----------
describe('konuşulan cümleler ve klip adları korunur', () => {
    const sesler = (ad: string) => [...read(`components/${ad}.tsx`).matchAll(/asset\('(\/sounds\/[^']*)'\)/g)].map((m) => m[1]);
    it('AdaletHikayesi klipleri', () => {
        const k = '/sounds/stories/adalet_hikayesi/s02_';
        expect(sesler('AdaletHikayesi')).toEqual(
            ['giris_narr', 'giris_narr_2', 'giris_q', 'yola_narr', 'yola_q', 'yolb_narr', 'yolb_q', 'sonuca1_narr', 'sonuca2_narr', 'sonucb1_narr', 'sonucb2_narr', 'final_narr'].map((s) => `${k}${s}.mp3`),
        );
    });
    it('AileSepetiMacerasi klipleri', () => {
        const k = '/sounds/stories/aile_sepeti_macerasi/s02_';
        expect(sesler('AileSepetiMacerasi')).toEqual(
            ['giris_narr', 'giris_q', 'yolA_narr', 'yolA_q', 'yolB_narr', 'yolB_q', 'sonucA1_narr', 'sonucA2_narr', 'sonucB1_narr', 'sonucB2_narr', 'final_narr'].map((s) => `${k}${s}.mp3`),
        );
    });
    it('SevgiHikayesi anlatım metinleri (canlı TTS) birebir aynı', () => {
        const src = read('components/SevgiHikayesi.tsx');
        const anlatimlar = [...src.matchAll(/narration:\s*\n?\s*'([^']*)'/g)].map((m) => m[1]);
        expect(anlatimlar).toHaveLength(5);
        expect(crypto.createHash('sha256').update(anlatimlar.join('|')).digest('hex')).toBe('c96bed8f1ee2ee37c9965ae835f293cc24924994267fb034334c3dd3bbc48744');
    });
});

