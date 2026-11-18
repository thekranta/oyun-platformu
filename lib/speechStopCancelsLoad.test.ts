import * as fs from 'fs';
import * as path from 'path';

/**
 * 2026-11-18 denetimi (W5): stopSpeech() yükleme sırasındaki klibi iptal etmiyordu — createAsync / web indirme dönüşü yalnız
 * ttsRequestId'ye bakıyordu, stopSpeech onu artırmadığı için oyundan çıktıktan sonra yüklemesi biten 'Aferin' menüde çalıyordu.
 * Ayrıca canlı TTS yolunda (getSession + fetch) süre sınırı yoktu: ağ takılınca await speak() hiç çözülmüyordu.
 *
 * Kural: durdurulan çağrı klibi BAŞLATMAZ ama sözü 8 sn üst zaman aşımına kadar açık kalır (anında çözülürse
 * `await speak(a); speak(b)` zincirinde b menüde çalar); YENİ bir speak() tarafından ezilen çağrı eskisi gibi hemen çözülür.
 */

const mockCreateAsync = jest.fn();
const mockGetSession = jest.fn();

jest.mock('expo-av', () => ({ Audio: { Sound: { createAsync: (...a: unknown[]) => mockCreateAsync(...a) } } }));
jest.mock('expo-av/build/AV', () => ({ getNativeSourceFromSource: () => undefined }));
jest.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/', writeAsStringAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));
jest.mock('../lib/ttsAssets', () => ({ TTS: { aferin: 1, dogru: 2 } }));
jest.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: () => mockGetSession() } } }));
jest.mock('../lib/apiBase', () => ({ apiUrl: (p: string) => p }));
jest.mock('../services/webClipCache', () => ({
    markClipInUse: jest.fn(), pendingClip: () => undefined, preloadClipUris: jest.fn(), readyClipUrl: () => undefined,
}));

type Sound = { unloadAsync: jest.Mock; stopAsync: jest.Mock; setOnPlaybackStatusUpdate: jest.Mock };
const fakeSound = (): Sound => ({
    unloadAsync: jest.fn(() => Promise.resolve()),
    stopAsync: jest.fn(() => Promise.resolve()),
    setOnPlaybackStatusUpdate: jest.fn(),
});
// createAsync'i dışarıdan bitirilebilir yapar (yükleme ne zaman biteceğini test seçer).
const deferredLoad = () => {
    let resolve!: (v: { sound: Sound; status: { isLoaded: boolean; durationMillis: number } }) => void;
    const promise = new Promise<{ sound: Sound; status: { isLoaded: boolean; durationMillis: number } }>((r) => { resolve = r; });
    return { promise, resolve };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const svc = require('../services/speechService') as typeof import('../services/speechService');

const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'services', 'speechService.ts'), 'utf8');
const body = (startMarker: string, endMarker: string) => {
    const s = SRC.indexOf(startMarker);
    expect(s).toBeGreaterThan(0);
    return SRC.slice(s, SRC.indexOf(endMarker, s));
};

beforeEach(() => {
    jest.useFakeTimers();
    mockCreateAsync.mockReset();
    mockGetSession.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => { });
});
afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe('stopSpeech yükleme sırasındaki klibi iptal eder (native)', () => {
    it('stopSpeech sonrası yüklemesi biten klip çalmaz; söz anında DEĞİL 8 sn üst sınırda çözülür', async () => {
        const load = deferredLoad();
        mockCreateAsync.mockReturnValueOnce(load.promise);
        let resolved = false;
        const p = svc.speak('Aferin').then(() => { resolved = true; });
        await jest.advanceTimersByTimeAsync(100);
        expect(mockCreateAsync).toHaveBeenCalledTimes(1);

        svc.stopSpeech();   // ör. oyundan menüye çıkış
        const late = fakeSound();
        load.resolve({ sound: late, status: { isLoaded: true, durationMillis: 1500 } });
        await jest.advanceTimersByTimeAsync(500);

        // geç gelen ses boşaltıldı, çalan ses olarak izlenmedi (çalan olsaydı stopSpeech onu stopAsync ile durdururdu)
        expect(late.unloadAsync).toHaveBeenCalled();
        expect(late.setOnPlaybackStatusUpdate).not.toHaveBeenCalled();
        svc.stopSpeech();
        expect(late.stopAsync).not.toHaveBeenCalled();
        // sıradaki konuşma sızmasın: söz hemen çözülmez
        expect(resolved).toBe(false);

        await jest.advanceTimersByTimeAsync(8000);
        await p;
        expect(resolved).toBe(true);
    });

    it('yeni speak() tarafından EZİLEN çağrı eskisi gibi hemen çözülür (davranış değişmedi)', async () => {
        const first = deferredLoad();
        const second = deferredLoad();
        mockCreateAsync.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        let firstDone = false;
        svc.speak('Aferin').then(() => { firstDone = true; });
        await jest.advanceTimersByTimeAsync(50);
        svc.speak('Doğru');
        await jest.advanceTimersByTimeAsync(50);

        const stale = fakeSound();
        first.resolve({ sound: stale, status: { isLoaded: true, durationMillis: 1000 } });
        await jest.advanceTimersByTimeAsync(10);
        expect(stale.unloadAsync).toHaveBeenCalled();
        expect(firstDone).toBe(true);
        second.resolve({ sound: fakeSound(), status: { isLoaded: true, durationMillis: 1000 } });
        await jest.advanceTimersByTimeAsync(10000);
    });
});

describe('canlı TTS yolu süre sınırlı', () => {
    it('getSession takılırsa speak() ~10 sn içinde sessizce çözülür (seçenekler kilitlenmez)', async () => {
        mockGetSession.mockReturnValue(new Promise(() => { }));   // ağ/oturum hiç dönmüyor
        let resolved = false;
        svc.speak('Bu cümlenin hazır klibi yok').then(() => { resolved = true; });
        await jest.advanceTimersByTimeAsync(5000);
        expect(resolved).toBe(false);
        await jest.advanceTimersByTimeAsync(5500);
        expect(resolved).toBe(true);
        expect(mockCreateAsync).not.toHaveBeenCalled();
    });

    it('getSession + fetch + yanıt gövdesi tek withTimeout içinde', () => {
        const live = body('const net = await withTimeout((async () => {', 'LIVE_TTS_TIMEOUT_MS);');
        expect(live).toMatch(/supabase\.auth\.getSession\(\)/);
        expect(live).toMatch(/fetch\(apiUrl\('\/api\/tts'\)/);
        expect(live).toMatch(/response\.json\(\)/);
        expect(SRC).toMatch(/import \{ withTimeout \} from '\.\.\/lib\/withTimeout';/);
    });
});

describe('kaynak korumaları', () => {
    it('stopSpeech ttsRequestId ve stopEpoch artırır, klibi kullanımdan düşürür, 8 sn yeniden kurmayı korur', () => {
        const stop = body('export function stopSpeech(): void {', '\n}\n');
        expect(stop).toMatch(/ttsRequestId\+\+;/);
        expect(stop).toMatch(/stopEpoch\+\+;/);
        expect(stop).toMatch(/markClipInUse\(undefined\)/);
        expect(stop).toMatch(/webPending\?\.rearm\(8000\)/);
        expect(stop).toMatch(/resetSpeech\(\)/);
    });

    it('web yolu: durdurulan çağrı bekler (holdAfterStop), ezilen çağrı hemen döner', () => {
        const web = body('async function playBundledWeb(src: number)', 'const audio = getWebAudio();');
        expect((web.match(/if \(myEpoch !== stopEpoch\) \{ await holdAfterStop\(\); return; \}/g) ?? []).length).toBe(2);
        expect(web).toMatch(/if \(!uri \|\| myId !== ttsRequestId\) return;/);
        expect(web).toMatch(/if \(myId !== ttsRequestId\) return;/);
    });

    it('canlı yol: üretim sonrası durdurulduysa çalmaz; native/web oynatmada üst süre var', () => {
        const inner = body('async function speakInner(', 'export async function speakThenWait');
        expect(inner).toMatch(/const result = await generateSpeech\(text, options\);\s*\r?\n[\s\S]{0,400}if \(myEpoch !== stopEpoch\) \{\s*await holdAfterStop\(\);/);
        expect(inner).toMatch(/withTimeout\(loading, LIVE_LOAD_TIMEOUT_MS\)/);
        expect(inner).toMatch(/LIVE_PLAY_FALLBACK_MS/);
    });
});
