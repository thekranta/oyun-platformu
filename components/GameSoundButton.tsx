import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSound } from './SoundContext';

// Oyun içi standart ses düğmesi (kullanıcı notu 2026-10-22: çoğu oyunda müziği kapatma düğmesi yoktu).
// Ana ekran (app/(tabs)/index.tsx) çalışan oyunun üstüne bindirir; yalnız müziğin çaldığı ('game' sahnesi)
// oyunlarda görünür — müzik/hikaye/mikrofon oyunlarında arka plan müziği hiç çalmadığı için kapatılacak bir şey yok.
// Konumu ve görünümü menüdeki ses düğmesiyle (components/ToyRoom.tsx) aynıdır; güvenli alanın içinde durur.
// Müzik ve efekt seslerini açıp kapatır; sesli yönergeler her zaman çalar.
export default function GameSoundButton() {
    const { t } = useTranslation();
    const { isMuted, toggleMute, scene } = useSound();
    if (scene !== 'game') return null;
    return (
        <SafeAreaView edges={['top', 'right']} pointerEvents="box-none" style={styles.wrap}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={isMuted ? t('toyRoom.muteOn') : t('toyRoom.muteOff')}
                onPress={toggleMute}
                hitSlop={6}
                style={styles.btn}
            >
                <Text style={styles.icon} selectable={false}>{isMuted ? '🔇' : '🔊'}</Text>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    wrap: { position: 'absolute', right: 10, top: 10, zIndex: 1000 },
    btn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFFCC',
        userSelect: 'none',
    },
    icon: { fontSize: 19, color: '#706452', userSelect: 'none' },
});
