import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { asset } from '../lib/assetMap';

type SoundName = 'background' | 'correct' | 'wrong';

interface SoundContextType {
    isMuted: boolean;
    playSound: (name: SoundName) => Promise<void>;
    stopSound: (name: SoundName) => Promise<void>;
    toggleMute: () => Promise<void>;
    changeVolume: (val: number) => Promise<void>;
    isPlaying: boolean;
    volume: number;
    toggleSound: () => Promise<void>;
    resumeAfterInteraction: () => Promise<void>;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [backgroundSound, setBackgroundSound] = useState<Audio.Sound | null>(null);
    // Unmount temizligi mount'ta ([]) backgroundSound=null closure'ini yakaliyordu; yuklenen
    // Sound hic unload edilmiyordu (sizinti). Bu ref her zaman guncel Sound'u tutar.
    const backgroundSoundRef = useRef<Audio.Sound | null>(null);
    // Dogru/yanlis earcon'lari: ilk kullanımda tembel yüklenir, unmount'ta boşaltılır.
    const sfxRef = useRef<{ correct: Audio.Sound | null; wrong: Audio.Sound | null }>({ correct: null, wrong: null });
    const isMutedRef = useRef(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [isPlaying, setIsPlaying] = useState(false);
    const hasInteracted = useRef(false);

    useEffect(() => {
        loadBackgroundSound();
        return () => {
            if (backgroundSoundRef.current) {
                backgroundSoundRef.current.unloadAsync();
                backgroundSoundRef.current = null;
            }
            const sfx = sfxRef.current;
            sfx.correct?.unloadAsync().catch(() => { });
            sfx.wrong?.unloadAsync().catch(() => { });
            sfxRef.current = { correct: null, wrong: null };
        };
    }, []);

    // Update volume when it changes
    useEffect(() => {
        if (backgroundSound) {
            backgroundSound.setVolumeAsync(volume);
        }
    }, [volume, backgroundSound]);

    // Update play state when mute changes
    useEffect(() => {
        if (backgroundSound && hasInteracted.current) {
            if (isMuted) {
                backgroundSound.pauseAsync();
                setIsPlaying(false);
            } else {
                backgroundSound.playAsync().then(() => setIsPlaying(true));
            }
        }
    }, [isMuted, backgroundSound]);

    const loadBackgroundSound = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                playThroughEarpieceAndroid: false,
            });

            // Load sound but don't play yet - wait for user interaction
            const { sound } = await Audio.Sound.createAsync(
                asset('/sounds/background.mp3'),
                { shouldPlay: false, isLooping: true, volume: 0.5 }
            );
            setBackgroundSound(sound);
            backgroundSoundRef.current = sound;
            console.log("✅ Background sound loaded (waiting for user interaction)");
        } catch (error) {
            console.log("❌ Error loading background sound:", error);
        }
    };

    // Call this after first user interaction to start music
    const resumeAfterInteraction = async () => {
        if (hasInteracted.current) return; // Already interacted
        hasInteracted.current = true;

        try {
            if (backgroundSound && !isMuted) {
                console.log("🎵 Starting background music after user interaction");
                await backgroundSound.playAsync();
                setIsPlaying(true);
            }
        } catch (error) {
            console.log("❌ Error starting background music:", error);
        }
    };

    const playSound = async (name: SoundName) => {
        if (isMuted && name === 'background') return;

        try {
            if (name === 'background') {
                // Background sound is already playing from loadBackgroundSound
                // Just ensure it's playing if not muted
                if (backgroundSound) {
                    const status = await backgroundSound.getStatusAsync();
                    if (status.isLoaded && !status.isPlaying && !isMuted) {
                        await backgroundSound.playAsync();
                    }
                } else {
                    // If sound not loaded yet, this branch won't help
                    // The sound will start when user interacts via resumeAfterInteraction
                    console.log("Background sound not loaded yet");
                }
            } else if (name === 'correct' || name === 'wrong') {
                // Kısa earcon: sessizdeyken çalınmaz; tembel yüklenir, tekrarında başa sarılır.
                if (isMutedRef.current) return;
                let sfx = sfxRef.current[name];
                if (!sfx) {
                    const src = name === 'correct' ? asset('/sounds/sfx/correct.wav') : asset('/sounds/sfx/wrong.wav');
                    const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false, volume: 0.9 });
                    sfxRef.current[name] = sound;
                    sfx = sound;
                }
                await sfx.replayAsync();
            }
        } catch (error) {
            console.log(`Error playing sound ${name}:`, error);
        }
    };

    const stopSound = async (name: SoundName) => {
        try {
            if (name === 'background') {
                if (backgroundSound) {
                    await backgroundSound.pauseAsync();
                }
            }
        } catch (error) {
            console.log(`Error stopping sound ${name}:`, error);
        }
    };

    const toggleMute = async () => {
        try {
            const newMutedState = !isMuted;
            isMutedRef.current = newMutedState;
            setIsMuted(newMutedState);

            if (backgroundSound) {
                if (newMutedState) {
                    await backgroundSound.pauseAsync();
                } else {
                    await backgroundSound.playAsync();
                }
            }
        } catch (error) {
            console.log("Error toggling mute:", error);
        }
    };

    const changeVolume = async (val: number) => {
        try {
            const newVolume = Math.max(0, Math.min(1, val));
            setVolume(newVolume);

            if (backgroundSound) {
                await backgroundSound.setVolumeAsync(newVolume);
            }
        } catch (error) {
            console.log("Error changing volume:", error);
        }
    };

    return (
        <SoundContext.Provider value={{
            isMuted,
            playSound,
            stopSound,
            toggleMute,
            changeVolume,
            isPlaying,
            volume,
            toggleSound: toggleMute,
            resumeAfterInteraction,
        }}>
            {children}
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

