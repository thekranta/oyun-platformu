/**
 * Web ses kilidi testi: iPhone (Safari / iOS Chrome) kuralı taklit edilir —
 * bir HTMLAudioElement'in play()'i yalnız kullanıcı dokunuşu içinde başlarsa "kilidi açılır";
 * kilidi açılmamış öğede dokunuşsuz play() NotAllowedError ile reddedilir.
 * Hata: expo-av her klip için YENİ öğe açtığından ilk klip çalıyor, sonrakiler (zamanlayıcıyla otomatik
 * ilerleyen Minik Müze anlatımı) reddedilip sessizce atlanıyordu.
 */
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-av', () => ({
    Audio: {
        Sound: {
            createAsync: jest.fn(async (src: number) => ({
                sound: { unloadAsync: jest.fn(async () => { }) },
                status: { isLoaded: true, uri: 'http://app/clip-' + src + '.mp3' },
            })),
        },
    },
}));
jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('../lib/apiBase', () => ({ apiUrl: (p: string) => p }));
jest.mock('../lib/ttsAssets', () => ({ TTS: { bir: 1, iki: 2, uc: 3 } }));

type Listener = (e?: unknown) => void;

class FakeAudio {
    static instances: FakeAudio[] = [];
    static gesture = false;
    src = '';
    preload = '';
    duration = 3;
    paused = true;
    unlocked = false;
    playLog: string[] = [];
    private listeners = new Map<string, Listener[]>();
    constructor() { FakeAudio.instances.push(this); }
    setAttribute() { /* playsinline */ }
    addEventListener(t: string, fn: Listener) { this.listeners.set(t, [...(this.listeners.get(t) || []), fn]); }
    removeEventListener(t: string, fn: Listener) { this.listeners.set(t, (this.listeners.get(t) || []).filter((f) => f !== fn)); }
    emit(t: string) { (this.listeners.get(t) || []).slice().forEach((f) => f()); }
    play(): Promise<void> {
        if (!this.unlocked && !FakeAudio.gesture) {
            const err = new Error('blocked');
            err.name = 'NotAllowedError';
            return Promise.reject(err);
        }
        this.unlocked = true;
        this.paused = false;
        this.playLog.push(this.src);
        return Promise.resolve();
    }
    pause() { this.paused = true; }
    /** Klip bitti (gerçek öğede 'ended'). */
    finish() { this.paused = true; this.emit('ended'); }
}

const docListeners = new Map<string, Listener[]>();
const fakeDocument = {
    addEventListener: (t: string, fn: Listener) => docListeners.set(t, [...(docListeners.get(t) || []), fn]),
    removeEventListener: (t: string, fn: Listener) => docListeners.set(t, (docListeners.get(t) || []).filter((f) => f !== fn)),
};
/** Kullanıcı dokunuşu: dinleyiciler dokunuş (gesture) içinde çalışır. */
function tap() {
    FakeAudio.gesture = true;
    try { (docListeners.get('pointerdown') || []).slice().forEach((f) => f()); } finally { FakeAudio.gesture = false; }
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

function loadService() {
    let svc!: typeof import('./speechService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.isolateModules(() => { svc = require('./speechService'); });
    return svc;
}

beforeEach(() => {
    jest.useFakeTimers();
    FakeAudio.instances = [];
    FakeAudio.gesture = false;
    docListeners.clear();
    (global as unknown as { document: unknown }).document = fakeDocument;
    (global as unknown as { Audio: unknown }).Audio = FakeAudio;
});

afterEach(() => {
    jest.useRealTimers();
    delete (global as unknown as { document?: unknown }).document;
    delete (global as unknown as { Audio?: unknown }).Audio;
});

describe('web ses kilidi (iPhone otomatik oynatma kuralı)', () => {
    it('ilk dokunuşta öğenin kilidi açılır; sonraki klipler dokunuşsuz da aynı öğeden çalar', async () => {
        const svc = loadService();
        tap();                                   // uygulamadaki ilk dokunuş (ör. giriş/menü)
        await flush();
        expect(FakeAudio.instances).toHaveLength(1);
        expect(FakeAudio.instances[0].unlocked).toBe(true);

        // Dokunuş YOK (zamanlayıcıyla ilerleyen anlatım): 3 klip art arda
        for (const text of ['bir', 'iki', 'uc']) {
            const done = svc.speak(text);
            await flush();
            FakeAudio.instances[0].finish();
            await done;
        }
        expect(FakeAudio.instances).toHaveLength(1);                       // tek paylaşılan öğe
        const played = FakeAudio.instances[0].playLog.filter((s) => s.includes('clip-'));
        expect(played).toEqual(['http://app/clip-1.mp3', 'http://app/clip-2.mp3', 'http://app/clip-3.mp3']);
        expect(svc.consumeAudioBlocked()).toBe(false);
    });

    it('dokunuş hiç olmadıysa ses engellenir: engel bayrağı yükselir ve çağrı takılmadan çözülür', async () => {
        const svc = loadService();
        const done = svc.speak('bir');
        await flush();
        await done;                                                        // takılmaz
        expect(svc.consumeAudioBlocked()).toBe(true);
        expect(svc.consumeAudioBlocked()).toBe(false);                     // bayrak tüketilir
        // Sonra kullanıcı dokunur ve tekrar dener: artık çalar
        tap();
        await flush();
        const again = svc.speak('bir');
        await flush();
        FakeAudio.instances[0].finish();
        await again;
        expect(svc.consumeAudioBlocked()).toBe(false);
    });

    it('klip uzunsa (8 sn üstü) ended gelene kadar beklenir, 8 sn sabit zaman aşımıyla kesilmez', async () => {
        const svc = loadService();
        tap();
        await flush();
        const audio = FakeAudio.instances[0];
        audio.duration = 11.4;
        let resolved = false;
        const done = svc.speak('bir').then(() => { resolved = true; });
        await flush();
        audio.emit('loadedmetadata');
        jest.advanceTimersByTime(9000);                                    // eski sabit 8 sn zaman aşımını aşar
        await flush();
        expect(resolved).toBe(false);
        audio.finish();
        await done;
        expect(resolved).toBe(true);
    });

    it('stopSpeech çalan klibi durdurur', async () => {
        const svc = loadService();
        tap();
        await flush();
        const audio = FakeAudio.instances[0];
        void svc.speak('bir');
        await flush();
        expect(audio.paused).toBe(false);
        svc.stopSpeech();
        expect(audio.paused).toBe(true);
    });
});
