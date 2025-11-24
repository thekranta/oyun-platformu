import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface SoundContextType {
    isPlaying: boolean;
    volume: number;
    toggleSound: () => Promise<void>;
    changeVolume: (val: number) => Promise<void>;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [volume, setVolume] = useState(0.5);

    useEffect(() => {
        loadSound();
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, []);

    const loadSound = async () => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                playThroughEarpieceAndroid: false,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                require('../assets/sounds/background.mp3'),
                { shouldPlay: true, isLooping: true, volume: 0.5 }
            );
            setSound(newSound);
        } catch (error) {
            console.log("Ses yüklenemedi (Dosya eksik olabilir):", error);
        }
    };

    const toggleSound = async () => {
        if (!sound) return;
        if (isPlaying) {
            await sound.pauseAsync();
        } else {
            await sound.playAsync();
        }
        setIsPlaying(!isPlaying);
    };

    const changeVolume = async (val: number) => {
        setVolume(val);
        if (sound) {
            await sound.setVolumeAsync(val);
        }
    };

    return (
        <SoundContext.Provider value={{ isPlaying, volume, toggleSound, changeVolume }}>
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
