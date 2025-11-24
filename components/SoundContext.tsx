import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import React, { createContext, useContext, useEffect, useState } from 'react';

type SoundName = 'background' | 'correct' | 'wrong';

interface SoundContextType {
    isMuted: boolean;
    playSound: (name: SoundName) => Promise<void>;
    stopSound: (name: SoundName) => Promise<void>;
    toggleMute: () => Promise<void>;
    changeVolume: (val: number) => Promise<void>;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [backgroundSound, setBackgroundSound] = useState<Audio.Sound | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        loadBackgroundSound();
        return () => {
            if (backgroundSound) {
                backgroundSound.unloadAsync();
            }
        };
    }, []);

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
                { shouldPlay: false, isLooping: true, volume: 0.5 }
            );
            setBackgroundSound(sound);
        } catch (error) {
            console.log("Error loading background sound:", error);
        }
    };

    const playSound = async (name: SoundName) => {
        if (isMuted) return;

        try {
            if (name === 'background') {
                if (backgroundSound) {
                    await backgroundSound.playAsync();
                }
            } else if (name === 'correct') {
                // SFX logic here (when files are available)
                // const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/correct.mp3'));
                // await sound.playAsync();
                console.log("Playing correct sound (placeholder)");
            } else if (name === 'wrong') {
                // SFX logic here
                // const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/wrong.mp3'));
                // await sound.playAsync();
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
            // setVolume(newVolume); // Eğer global volume state tutulacaksa

            if (backgroundSound) {
                await backgroundSound.setVolumeAsync(newVolume);
            }
        } catch (error) {
            console.log("Error changing volume:", error);
        }
    };

    return (
        <SoundContext.Provider value={{ isMuted, playSound, stopSound, toggleMute, changeVolume }}>
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
