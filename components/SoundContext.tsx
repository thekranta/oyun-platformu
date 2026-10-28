import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { asset } from '../lib/assetMap';
import { DUCK_HOLD_MS, IDLE_SILENCE_MS, MUSIC_LOAD_FALLBACK_MS, MUSIC_LOAD_SETTLE_MS, rampMs, targetVolume, type MusicScene, type MusicState } from '../lib/musicPolicy';
import { isSpeechActive, subscribeSpeech, waitForQuietWindow } from '../services/speechActivity';

// Arka plan müziği ve kısa efekt sesleri (doğru/yanlış).
//
// MÜZİK POLİTİKASI (lib/musicPolicy.ts): müzik "sahne"ye bağlıdır. Sahne belirtmeyen her ekran SESSİZDİR;
// ana ekran (app/(tabs)/index.tsx, hooks/useMusicScene.ts) menüde 'menu', oyunlarda 'game', müzik/hikaye/mikrofon
// oyunlarında ve diğer ekranlarda 'off' bildirir. Müzik konuşma (services/speechActivity.ts) sürerken kesilir,
// hareketsizlikte (45 sn) ve uygulama arka plandayken susar, kullanıcı kapattığında kapalı kalır (tercih
// cihazda saklanır). Oyunlar müziği kendileri açıp kapatmaz: playSound('background') / stopSound('background')
// artık etkisizdir.

type SoundName = 'background' | 'correct' | 'wrong';

const MUTE_KEY = 'sound.muted.v1';

interface SoundContextType {
    /** Müzik ve efekt sesleri kapalı mı (yönerge/konuşma sesi bundan etkilenmez). Kalıcı tercih. */
    isMuted: boolean;
    playSound: (name: SoundName) => Promise<void>;
    stopSound: (name: SoundName) => Promise<void>;
    toggleMute: () => Promise<void>;
    /** İlk dokunuşu bildirir (tarayıcı otomatik oynatma engeli); her dokunuş zaten bunu yapar. */
    resumeAfterInteraction: () => Promise<void>;
    scene: MusicScene;
    setMusicScene: (scene: MusicScene) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [isMuted, setIsMuted] = useState(false);
    const [scene, setScene] = useState<MusicScene>('off');
    const [interacted, setInteracted] = useState(false);
    const [idle, setIdle] = useState(false);
    const [speaking, setSpeaking] = useState(isSpeechActive());
    const [appActive, setAppActive] = useState(true);
    const [muteLoaded, setMuteLoaded] = useState(false);

    const isMutedRef = useRef(false);
    const lastActivityRef = useRef(Date.now());
    // Müzik: tek Sound nesnesi (hiç boşaltılmaz: mobil tarayıcılarda bir kez "kilidi açılan" öğe yeniden kullanılır).
    const musicRef = useRef<Audio.Sound | null>(null);
    const musicLoadingRef = useRef<Promise<Audio.Sound | null> | null>(null);
    const volumeRef = useRef(0);
    const playingRef = useRef(false);
    const rampTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const applyIdRef = useRef(0);
    // Doğru/yanlış earcon'ları: ilk kullanımda tembel yüklenir, unmount'ta boşaltılır.
    const sfxRef = useRef<{ correct: Audio.Sound | null; wrong: Audio.Sound | null }>({ correct: null, wrong: null });

    // Ses kipi uygulama açılışında kurulur (yönerge sesi sessiz modda da çalsın): müzik tembel yüklense de değişmez.
    useEffect(() => {
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
        }).catch((error) => console.log('⚠️ Ses kipi ayarlanamadı:', error));
        return () => {
            if (rampTimerRef.current) clearInterval(rampTimerRef.current);
            applyIdRef.current += 1;
            musicRef.current?.unloadAsync().catch(() => { });
            musicRef.current = null;
            const sfx = sfxRef.current;
            sfx.correct?.unloadAsync().catch(() => { });
            sfx.wrong?.unloadAsync().catch(() => { });
            sfxRef.current = { correct: null, wrong: null };
        };
    }, []);

    // Kalıcı tercih: kapatan bir sonraki açılışta müziği kendiliğinden açmaz.
    useEffect(() => {
        AsyncStorage.getItem(MUTE_KEY)
            .then((v) => {
                if (v === '1') {
                    isMutedRef.current = true;
                    setIsMuted(true);
                }
            })
            .catch(() => { })
            .finally(() => setMuteLoaded(true));
    }, []);

    // Konuşma sürerken müzik kesilir; bitince kısa bir bekleme sonrası döner.
    useEffect(() => {
        let hold: ReturnType<typeof setTimeout> | null = null;
        const off = subscribeSpeech((active) => {
            if (active) {
                if (hold) { clearTimeout(hold); hold = null; }
                setSpeaking(true);
            } else {
                hold = setTimeout(() => { hold = null; setSpeaking(false); }, DUCK_HOLD_MS);
            }
        });
        if (isSpeechActive()) setSpeaking(true);
        return () => {
            off();
            if (hold) clearTimeout(hold);
        };
    }, []);

    // Uygulama/sekme arka plandayken müzik çalmaz.
    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const onVisibility = () => setAppActive(!document.hidden);
            document.addEventListener('visibilitychange', onVisibility);
            onVisibility();
            return () => document.removeEventListener('visibilitychange', onVisibility);
        }
        const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
        return () => sub.remove();
    }, []);

    // Dokunuş = etkinlik: ilk dokunuş müziğe izin verir, hareketsizlik sonrası ilk dokunuş müziği geri getirir.
    const noteActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        setInteracted(true);
        setIdle(false);
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web' || typeof document === 'undefined') return;
        const events = ['pointerdown', 'keydown', 'touchstart'] as const;
        events.forEach((e) => document.addEventListener(e, noteActivity, { passive: true, capture: true }));
        return () => events.forEach((e) => document.removeEventListener(e, noteActivity, true));
    }, [noteActivity]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (Date.now() - lastActivityRef.current > IDLE_SILENCE_MS) setIdle(true);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const ensureMusic = useCallback(async (): Promise<Audio.Sound | null> => {
        if (musicRef.current) return musicRef.current;
        if (!musicLoadingRef.current) {
            musicLoadingRef.current = (async () => {
                try {
                    // Web'de dosya ağdan iner: ilk konuşma kliplerinin yolunu kesmesin diye bir konuşma bitene (en geç
                    // birkaç saniyeye) kadar beklenir. Native'de dosya paketin içinde, bekleme yok.
                    if (Platform.OS === 'web') await waitForQuietWindow(MUSIC_LOAD_FALLBACK_MS, MUSIC_LOAD_SETTLE_MS);
                    const { sound } = await Audio.Sound.createAsync(
                        asset('/sounds/background.mp3'),
                        { shouldPlay: false, isLooping: true, volume: 0 },
                    );
                    musicRef.current = sound;
                    return sound;
                } catch (error) {
                    console.log('⚠️ Arka plan müziği yüklenemedi:', error);
                    return null;
                } finally {
                    musicLoadingRef.current = null;
                }
            })();
        }
        return musicLoadingRef.current;
    }, []);

    // Müziği hedef ses düzeyine yumuşakça götürür (sıfıra inince durdurur). Yeni bir istek eskisini iptal eder.
    const applyTarget = useCallback(async (state: MusicState) => {
        const target = targetVolume(state);
        const from = volumeRef.current;
        const myId = ++applyIdRef.current;
        if (rampTimerRef.current) {
            clearInterval(rampTimerRef.current);
            rampTimerRef.current = null;
        }
        if (target === 0 && from === 0 && !playingRef.current) return;

        const sound = target > 0 ? await ensureMusic() : musicRef.current;
        if (!sound || myId !== applyIdRef.current) return;

        try {
            if (target > 0 && !playingRef.current) {
                await sound.setVolumeAsync(volumeRef.current);
                await sound.playAsync();
                playingRef.current = true;
                if (myId !== applyIdRef.current) return;
            }
        } catch (error) {
            console.log('⚠️ Arka plan müziği başlatılamadı:', error);
            return;
        }

        const startVolume = volumeRef.current;
        const ms = rampMs(state, startVolume, target);
        const startedAt = Date.now();
        rampTimerRef.current = setInterval(() => {
            const p = Math.min(1, (Date.now() - startedAt) / ms);
            const v = startVolume + (target - startVolume) * p;
            volumeRef.current = v;
            sound.setVolumeAsync(v).catch(() => { });
            if (p >= 1) {
                if (rampTimerRef.current) clearInterval(rampTimerRef.current);
                rampTimerRef.current = null;
                if (target === 0) {
                    sound.pauseAsync().catch(() => { });
                    playingRef.current = false;
                }
            }
        }, 50);
    }, [ensureMusic]);

    useEffect(() => {
        if (!muteLoaded) return; // kayıtlı tercih okunmadan çalma
        applyTarget({ scene, muted: isMuted, interacted, idle, speaking, appActive });
    }, [scene, isMuted, interacted, idle, speaking, appActive, muteLoaded, applyTarget]);

    const playSound = useCallback(async (name: SoundName) => {
        if (name === 'background') return; // müziği sahne politikası yönetir
        if (isMutedRef.current) return;
        try {
            let sfx = sfxRef.current[name];
            if (!sfx) {
                const src = name === 'correct' ? asset('/sounds/sfx/correct.wav') : asset('/sounds/sfx/wrong.wav');
                const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false, volume: 0.9 });
                sfxRef.current[name] = sound;
                sfx = sound;
            }
            await sfx.replayAsync();
        } catch (error) {
            console.log(`Error playing sound ${name}:`, error);
        }
    }, []);

    const stopSound = useCallback(async (_name: SoundName) => {
        // Müziği sahne politikası yönetir; oyunların kendi başına durdurması kaldırıldı.
    }, []);

    const toggleMute = useCallback(async () => {
        const next = !isMutedRef.current;
        isMutedRef.current = next;
        setIsMuted(next);
        AsyncStorage.setItem(MUTE_KEY, next ? '1' : '0').catch(() => { });
    }, []);

    const resumeAfterInteraction = useCallback(async () => {
        noteActivity();
    }, [noteActivity]);

    const setMusicScene = useCallback((next: MusicScene) => setScene(next), []);

    const value = useMemo<SoundContextType>(() => ({
        isMuted,
        playSound,
        stopSound,
        toggleMute,
        resumeAfterInteraction,
        scene,
        setMusicScene,
    }), [isMuted, playSound, stopSound, toggleMute, resumeAfterInteraction, scene, setMusicScene]);

    return (
        <SoundContext.Provider value={value}>
            {Platform.OS === 'web' ? children : (
                <View style={{ flex: 1 }} onTouchStart={noteActivity}>{children}</View>
            )}
        </SoundContext.Provider>
    );
}

export function useSound() {
    const context = useContext(SoundContext);
    if (context === undefined) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
}
