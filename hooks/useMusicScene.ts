import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useSound } from '../components/SoundContext';
import { musicSceneForStage } from '../lib/musicPolicy';

/**
 * Ana ekranın aşamasına ('giris' | 'menu' | 'sonuc' | oyun anahtarı) göre arka plan müziği sahnesini bildirir:
 * menüde kısık müzik, çoğu oyunda çok kısık, müzik/hikaye/mikrofon oyunlarında ve diğer her yerde sessiz.
 * Ekran odaktan çıkınca (veli/öğretmen paneli, kayıt sayfası açılınca) sahne 'off' olur: müzik orada çalmaz.
 */
export function useMusicScene(stage: string) {
    const { setMusicScene } = useSound();
    useFocusEffect(
        useCallback(() => {
            setMusicScene(musicSceneForStage(stage));
            return () => setMusicScene('off');
        }, [stage, setMusicScene]),
    );
}
