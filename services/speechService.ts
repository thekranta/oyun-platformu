/**
 * Unified Speech Service
 * ----------------------
 * Seslendirme önceliği:
 *   1) HAZIR KLİP (assets/sounds/tts/<slug>.wav — klon "Hikaye Sesi") — çevrimdışı,
 *      ücretsiz, tutarlı. Metin ttsSlug() ile bir dosya adına (slug) çevrilir;
 *      lib/ttsAssets.ts içinde varsa expo-av ile çalınır (web + native).
 *   2) Canlı OpenAI proxy (/api/tts) — yalnızca geçerli anahtar varsa. Şu an anahtar
 *      yoksa SESSİZ geçilir (robotik tarayıcı sesine düşmeyiz; okul öncesi için uygun değil).
 *
 * Yeni ses eklemek: scripts/gen-voices.mjs (VoiceBox) → scripts/trim-voices.mjs →
 * `node scripts/gen-tts-assets.mjs` (lib/ttsAssets.ts güncellenir). Bkz. scripts/.
 */

import { Audio as ExpoAudio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { TTS } from '../lib/ttsAssets';
import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/apiBase';

// Canlı proxy yolu için blob önbelleği (aynı metni tekrar üretmemek için)
const audioCache = new Map<string, string>();

export interface SpeechOptions {
    voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar';
    speed?: number; // 0.25 to 4.0 (default: child-friendly slower pace)
    instructions?: string; // Optional TTS style instructions
}

export interface SpeechResult {
    success: boolean;
    audioUrl?: string;
    error?: string;
}

/**
 * Metni hazır-MP3 dosya adına (slug) çevirir.
 * lib/ttsAssets.ts anahtarları ve gen-tts-assets.mjs ile AYNI kuralı kullanır.
 * Örn: "Doğru! Aferin." → "dogru-aferin"
 */
export function ttsSlug(text: string): string {
    return (text || '')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Şu an çalan hazır-MP3 sesi; yenisi gelince durdurulup boşaltılır (üst üste binmesin).
let currentTtsSound: ExpoAudio.Sound | null = null;

// playBundled() çağrıları arasındaki yarışı (race) önlemek için: her çağrı kendi sıra
// numarasını alır. createAsync() süresince (asenkron) daha YENİ bir çağrı başlamışsa,
// eskisi yüklemesi bitince kendini sessizce iptal eder — aksi halde art arda hızlı
// speak() çağrılarında (ör. bir oyunda D-pad'e hızlı basmak) iki ses nesnesi aynı anda
// oynatılabiliyordu ve currentTtsSound yalnızca sonuncuyu izlediği için stopSpeech()
// öbürünü hiç durduramıyordu (oyundan çıksan bile "öksüz" ses çalmaya devam ediyordu).
let ttsRequestId = 0;

// Şu an çalan canlı-proxy sesi (web, HTMLAudioElement) — hazır-MP3'ten AYRI bir oynatma
// yolu olduğu için currentTtsSound'a dahil değildi; stopSpeech() bunu da durdurabilsin
// ve üst üste binmesin diye ayrıca izleniyor.
let currentLiveAudio: HTMLAudioElement | null = null;

// ============================================================================
// Web ses kilidi (iOS Safari / mobil Chrome otomatik oynatma kurali)
// ----------------------------------------------------------------------------
// expo-av web'de HER ses icin yeni bir "new Audio()" olusturup play() cagirir. Mobil tarayicilar
// (ozellikle iPhone: Safari ve iOS'taki Chrome) ses baslatmayi yalniz KULLANICI DOKUNUSU icinde ve
// OGE BASINA serbest birakir: ilk klip dokunusla baslayinca calar, ama zamanlayiciyla otomatik ilerleyen
// sonraki kliplar (Minik Muze anlatimi gibi) NotAllowedError ile reddedilir ve hata sessizce yutulur,
// parcalar sessizce hizla gecer.
// Cozum: tek bir paylasilan HTMLAudioElement. Uygulamadaki ILK dokunusta sessiz bir klip calinarak ogenin
// kilidi acilir; sonra her klip ayni ogenin src'si degistirilip calinir (kilitli kalmaz). Native etkilenmez.
// ============================================================================
const IS_WEB = Platform.OS === 'web' && typeof document !== 'undefined' && typeof Audio !== 'undefined';
// 44 baytlik sessiz WAV (veri yok): yalniz ogenin kilidini acmak icin.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const UNLOCK_EVENTS = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'] as const;

let webAudio: HTMLAudioElement | null = null;
let webUnlocked = false;
let webBusy = false;                       // gercek bir klip yukleniyor/caliyor
let webUnlockInstalled = false;
let webPending: { rearm: (ms: number) => void } | null = null;
let audioBlocked = false;
const webUriCache = new Map<number, string>();

function getWebAudio(): HTMLAudioElement {
    if (!webAudio) {
        webAudio = new Audio();
        webAudio.preload = 'auto';
        webAudio.setAttribute('playsinline', '');
    }
    return webAudio;
}

/** Son konusma tarayici tarafindan engellendiyse (dokunus gerekiyor) true doner ve bayragi sifirlar. */
export function consumeAudioBlocked(): boolean {
    const v = audioBlocked;
    audioBlocked = false;
    return v;
}

/** Ilk kullanici dokunusunda paylasilan ses ogesinin kilidini acar (tek seferlik, web). */
export function installWebAudioUnlock(): void {
    if (!IS_WEB || webUnlockInstalled) return;
    webUnlockInstalled = true;
    const removeAll = () => UNLOCK_EVENTS.forEach((e) => document.removeEventListener(e, handler, true));
    const handler = () => {
        if (webUnlocked) { removeAll(); return; }
        if (webBusy) return;   // gercek klip zaten basladiysa kilit onunla acilir (play basarili olunca)
        const a = getWebAudio();
        a.src = SILENT_WAV;
        const p = a.play();
        if (p && typeof p.then === 'function') {
            p.then(() => {
                webUnlocked = true;
                if (!webBusy) a.pause();
                removeAll();
            }).catch(() => { /* sonraki dokunusta tekrar denenir */ });
        }
    };
    UNLOCK_EVENTS.forEach((e) => document.addEventListener(e, handler, true));
}

// Paketli klibin web URL'si: expo-av'in kaynak cozumlemesinden (status.uri) alinir, onbellege yazilir.
async function resolveWebUri(src: number): Promise<string | undefined> {
    const cached = webUriCache.get(src);
    if (cached) return cached;
    try {
        const { sound, status } = await ExpoAudio.Sound.createAsync(src, { shouldPlay: false });
        const uri = status.isLoaded ? status.uri : undefined;
        sound.unloadAsync().catch(() => { });
        if (uri) webUriCache.set(src, uri);
        return uri;
    } catch {
        return undefined;
    }
}

async function playBundledWeb(src: number): Promise<void> {
    const myId = ++ttsRequestId;
    // Onceki bekleyen cagri yeni klip tarafindan ezilir; eskiden oldugu gibi en gec 8 sn'de cozulur.
    webPending?.rearm(8000);
    const uri = await resolveWebUri(src);
    if (!uri || myId !== ttsRequestId) return;

    const audio = getWebAudio();
    await new Promise<void>((resolve) => {
        let done = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const mine = () => myId === ttsRequestId;
        const finish = () => {
            if (done) return;
            done = true;
            if (timer) clearTimeout(timer);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onEnded);
            audio.removeEventListener('loadedmetadata', onMeta);
            if (webPending === handle) webPending = null;
            if (mine()) webBusy = false;
            resolve();
        };
        const rearm = (ms: number) => {
            if (done) return;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                console.warn('🔊 TTS(web): ' + ms + 'ms icinde tamamlanmadi, zaman asimina ugradi');
                finish();
            }, ms);
        };
        const onEnded = () => { if (mine()) finish(); };
        const onMeta = () => {
            if (mine() && Number.isFinite(audio.duration) && audio.duration > 0) rearm(audio.duration * 1000 + 4000);
        };
        const handle = { rearm };
        webPending = handle;
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onEnded);
        audio.addEventListener('loadedmetadata', onMeta);
        rearm(8000);   // yukleme zaman asimi; metadata gelince klip suresine gore yeniden kurulur

        webBusy = true;
        audio.src = uri;
        const p = audio.play();
        if (p && typeof p.then === 'function') {
            p.then(() => {
                webUnlocked = true;
                audioBlocked = false;
                onMeta();
            }).catch((e: unknown) => {
                if (!mine()) return;               // yeni klip eskisini ezdi (AbortError): yenisi surer
                const name = (e as { name?: string } | null)?.name;
                if (name === 'NotAllowedError') audioBlocked = true;
                else if (name !== 'AbortError') console.warn('🔊 TTS(web): hazir klip calinamadi (sessiz gecildi):', e);
                finish();
            });
        }
    });
}

/**
 * Paketli (bundled) bir MP3 modülünü expo-av ile çalar. Hikaye anlatımlarındaki
 * (CevizMacera vb.) desenle birebir aynıdır: öncekini boşalt → oynat → bitince boşalt.
 */
async function playBundled(src: number): Promise<void> {
    // Web: her klip icin yeni HTMLAudioElement acan expo-av yerine paylasilan, "kilidi acilmis" oge kullanilir
    // (bkz. yukaridaki "Web ses kilidi" bolumu): mobil tarayicilarda dokunussuz baslatilan 2. ve sonraki
    // sesler aksi halde reddedilir.
    if (IS_WEB) return playBundledWeb(src);

    const myRequestId = ++ttsRequestId;

    // Tarayıcı otomatik-oynatma engeli, ağ/decode hatası, sekme arka plana alınması
    // gibi nedenlerle expo-av'ın ASENKRON ADIMLARINDAN HERHANGİ BİRİ (createAsync'in
    // kendisi DAHİL — sadece "oynatma bitti" olayı değil) hiç tamamlanmayabilir.
    // Önceki düzeltme sadece "oynatma bitmesini" beklerken zaman aşımı ekliyordu; ama
    // canlı sitede createAsync'in KENDİSİ hiç dönmediği (ağ isteği bile atılmadığı)
    // doğrulandı — bu yüzden TÜM fonksiyon tek bir üst zaman aşımıyla yarışa sokuluyor.
    // Herhangi bir adımda takılırsa CountdownOverlay yine de devam edebilsin diye.
    // Zaman aşımı SABİT 8 sn değildir: 8 sn'yi aşan klipler (ör. Minik Müze'nin 9-11 sn'lik giriş anlatımı)
    // 8. saniyede "bitti" sayılıp bir sonraki konuşma stopSpeech() ile kesiyordu. Yükleme için 8 sn beklenir;
    // ses yüklenince süre klibin gerçek uzunluğu + 4 sn pay olarak yeniden kurulur.
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let armTimeout: (ms: number) => void = () => { };
    const overallTimeout = new Promise<void>((resolve) => {
        armTimeout = (ms: number) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timedOut = true;
                console.warn(`🔊 TTS: ${ms}ms içinde tamamlanmadı (createAsync veya oynatma takıldı), zaman aşımına uğradı`);
                resolve();
            }, ms);
        };
        armTimeout(8000);
    });

    const actualPlayback = (async () => {
        try {
            if (currentTtsSound) {
                await currentTtsSound.unloadAsync().catch(() => { });
                currentTtsSound = null;
            }
            const { sound, status: loadedStatus } = await ExpoAudio.Sound.createAsync(src, { shouldPlay: true, volume: 1.0 });
            if (timedOut || myRequestId !== ttsRequestId) {
                // Üst zaman aşımı zaten devam etmişse YA DA biz yüklenirken daha yeni bir
                // speak() çağrısı başlamışsa: bu geç gelen sesi sessizce boşalt, çalma.
                sound.unloadAsync().catch(() => { });
                return;
            }
            currentTtsSound = sound;
            const durationMs = loadedStatus.isLoaded && Number.isFinite(loadedStatus.durationMillis) ? (loadedStatus.durationMillis as number) : 0;
            armTimeout(durationMs > 0 ? durationMs + 4000 : 20000);
            await new Promise<void>((resolve) => {
                let done = false;
                const finish = () => {
                    if (done) return;
                    done = true;
                    resolve();
                };
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync().catch(() => { });
                        if (currentTtsSound === sound) currentTtsSound = null;
                        finish();
                    } else if (!status.isLoaded && (status as any).error) {
                        finish();
                    }
                });
            });
        } catch (e) {
            console.warn('🔊 TTS: hazır MP3 çalınamadı (sessiz geçildi):', e);
        }
    })();

    await Promise.race([overallTimeout, actualPlayback]);
    if (timer) clearTimeout(timer);
}

/**
 * Generate speech from text using OpenAI TTS (canlı proxy yolu — yedek).
 * Returns a blob URL that can be played with Audio element
 */
export async function generateSpeech(
    text: string,
    options: SpeechOptions = {}
): Promise<SpeechResult> {
    const {
        voice = 'coral',  // Warm, friendly female voice
        speed = 0.85,     // Slightly slower for children comprehension
        instructions,
    } = options;

    // Check cache first
    const cacheKey = `${text}-${voice}-${speed}-${instructions ?? ''}`;
    if (audioCache.has(cacheKey)) {
        return {
            success: true,
            audioUrl: audioCache.get(cacheKey)
        };
    }

    try {
        // Call secure server-side API route (OpenAI TTS) — kimliksiz kotu-niyetli
        // trafiği engellemek icin gecerli bir Supabase oturumu gerekiyor.
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(apiUrl('/api/tts'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({
                text,
                voice,
                speed,
                instructions
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || `API Error: ${response.status}`
            };
        }

        const data = await response.json();

        if (!data.audioContent) {
            return {
                success: false,
                error: 'No audio data received'
            };
        }

        // Web: blob URL (HTMLAudioElement ile çalınır). Native: Blob/URL.createObjectURL
        // yok (ya da expo-av'ın tanıyacağı bir uri üretmez) — base64'ü geçici bir dosyaya
        // yazıp onun file:// uri'sini kullanıyoruz (bkz. services/gameResults.ts'teki aynı desen).
        let audioUrl: string;
        if (Platform.OS === 'web') {
            const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
            audioUrl = URL.createObjectURL(audioBlob);
        } else {
            const fileUri = `${FileSystem.cacheDirectory}tts-live-${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(fileUri, data.audioContent, { encoding: FileSystem.EncodingType.Base64 });
            audioUrl = fileUri;
        }

        // Cache the result
        audioCache.set(cacheKey, audioUrl);

        return {
            success: true,
            audioUrl
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Play speech audio from text.
 *   1) Önce HAZIR MP3 (slug eşleşmesi) — çevrimdışı çalar.
 *   2) Yoksa canlı proxy (anahtar yoksa sessiz geçer).
 */
export async function speak(
    text: string,
    options: SpeechOptions = {}
): Promise<void> {
    // 1) HAZIR MP3 var mı?
    const bundled = TTS[ttsSlug(text)];
    if (bundled != null) {
        await playBundled(bundled);
        return;
    }

    // 2) Hazır MP3 yoksa canlı proxy (şu an anahtar yok → sessiz)
    const result = await generateSpeech(text, options);

    if (result.success && result.audioUrl) {
        if (Platform.OS === 'web') {
            // Önceki canlı-proxy sesi hâlâ çalıyorsa durdur (üst üste binmesin).
            if (currentLiveAudio) {
                currentLiveAudio.pause();
                currentLiveAudio = null;
            }
            return new Promise((resolve) => {
                const audio = new Audio(result.audioUrl);
                currentLiveAudio = audio;
                const clear = () => {
                    if (currentLiveAudio === audio) currentLiveAudio = null;
                };
                audio.onended = () => { clear(); resolve(); };
                audio.onerror = () => {
                    console.warn('🔊 TTS: Audio oynatma hatasi (sessiz gecildi)');
                    clear();
                    resolve();
                };
                audio.play().catch(() => {
                    console.warn('🔊 TTS: Audio play basarisiz (sessiz gecildi)');
                    clear();
                    resolve();
                });
            });
        }

        // Native: tarayıcının HTMLAudioElement'i yok — expo-av ile çal. playBundled()'daki
        // aynı currentTtsSound değişkenini kullanıyoruz ki stopSpeech() bunu da kapsasın.
        try {
            if (currentTtsSound) {
                await currentTtsSound.unloadAsync().catch(() => { });
                currentTtsSound = null;
            }
            const { sound } = await ExpoAudio.Sound.createAsync({ uri: result.audioUrl }, { shouldPlay: true, volume: 1.0 });
            currentTtsSound = sound;
            await new Promise<void>((resolve) => {
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync().catch(() => { });
                        if (currentTtsSound === sound) currentTtsSound = null;
                        resolve();
                    } else if (!status.isLoaded && (status as any).error) {
                        resolve();
                    }
                });
            });
        } catch (e) {
            console.warn('🔊 TTS: canlı ses native oynatılamadı (sessiz geçildi):', e);
        }
    } else {
        // Robotik tarayıcı sesine DÜŞMÜYORUZ; sessiz geçiyoruz.
        console.warn('🔊 TTS: hazır MP3 yok + coral üretilemedi, sessiz geçildi:', text.substring(0, 40));
    }
}

/**
 * Metni seslendirir ve max(ses süresi, minMs) kadar bekledikten SONRA çözülür.
 * Doğru cevap sonrası "Aferin" sesinin yarıda kesilmemesi için: bir sonraki aşamaya /
 * tura geçmeden önce `await speakThenWait(text, minMs)` (ya da .then(...)) kullanılır.
 * Ses yoksa (klip eşleşmezse) yalnız minMs beklenir; ses uzunsa ses bitene kadar beklenir.
 */
export async function speakThenWait(text: string, minMs = 1200, options: SpeechOptions = {}): Promise<void> {
    await Promise.all([
        speak(text, options),
        new Promise<void>((resolve) => setTimeout(resolve, minMs)),
    ]);
}

/**
 * Stop any currently playing speech (hazır MP3 + eski tarayıcı speechSynthesis).
 */
export function stopSpeech(): void {
    if (webAudio && webBusy) {
        webAudio.pause();
        webBusy = false;
        webPending?.rearm(8000);   // eskisi gibi: durdurulan cagri en gec 8 sn'de cozulur
    }
    if (currentTtsSound) {
        const s = currentTtsSound;
        currentTtsSound = null;
        s.stopAsync().catch(() => { });
        s.unloadAsync().catch(() => { });
    }
    if (currentLiveAudio) {
        currentLiveAudio.pause();
        currentLiveAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

/**
 * Clear the audio cache - call this on app start or page refresh
 */
export function clearSpeechCache(): void {
    audioCache.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    audioCache.clear();
}

/**
 * Pre-generate speech for common phrases (yalnızca canlı proxy yolu için; hazır MP3
 * kullanıldığında gerek yok — bundled sesler zaten anında hazırdır).
 */
export async function preloadCommonPhrases(childName: string): Promise<void> {
    const phrases = [
        `Merhaba ${childName}! Oyuna hoş geldin!`,
        `Harika iş çıkardın ${childName}!`,
        `Tebrikler!`,
        `Aferin sana!`,
        `Tekrar dene!`,
    ];

    phrases.forEach(phrase => {
        // Hazır MP3 varsa proxy'yi hiç çağırma
        if (TTS[ttsSlug(phrase)] != null) return;
        generateSpeech(phrase).catch(() => { });
    });
}

// Tarayicida ilk dokunusta ses kilidini acmak icin dinleyiciyi hemen kur (web disinda no-op).
installWebAudioUnlock();

export default {
    speak,
    speakThenWait,
    generateSpeech,
    stopSpeech,
    clearSpeechCache,
    preloadCommonPhrases,
    ttsSlug,
};
