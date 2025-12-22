import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import React, { createContext, useContext, useEffect, useState } from 'react';

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
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [backgroundSound, setBackgroundSound] = useState<Audio.Sound | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.5);

    useEffect(() => {
        loadBackgroundSound();
        return () => {
            if (backgroundSound) {
                backgroundSound.unloadAsync();
            }
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
        if (backgroundSound) {
            if (isMuted) {
                backgroundSound.pauseAsync();
            } else {
                backgroundSound.playAsync();
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

            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sounds/background.mp3'),
                { shouldPlay: true, isLooping: true, volume: 0.5 }
            );
            setBackgroundSound(sound);
        } catch (error) {
            console.log("Error loading background sound:", error);
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
                    // If sound not loaded yet, wait a bit and try again
                    setTimeout(async () => {
                        if (backgroundSound && !isMuted) {
                            await backgroundSound.playAsync();
                        }
                    }, 500);
                }
            } else if (name === 'correct') {
                // SFX logic here
                console.log("Playing correct sound (placeholder)");
            } else if (name === 'wrong') {
                // SFX logic here
                console.log("Playing wrong sound (placeholder)");
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
            // SoundControls uyumluluğu için eklenenler:
            isPlaying: !isMuted,
            volume,
            toggleSound: toggleMute
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
