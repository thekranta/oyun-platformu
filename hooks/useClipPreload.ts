import { useEffect } from 'react';
import { preloadGameClips, schedulePreloadCommonClips } from '../services/clipPreload';

/**
 * Ana ekranın aşamasına ('giris' | 'menu' | 'sonuc' | oyun anahtarı) göre klipleri önceden indirir (yalnız web):
 * giriş/menüde ortak geri bildirim klipleri (boşta, bir kez), bir oyun açılırken o oyunun klipleri.
 * Bkz. services/clipPreload.ts.
 */
export function useClipPreload(stage: string) {
    useEffect(() => {
        if (stage === 'giris' || stage === 'menu') return schedulePreloadCommonClips();
        if (stage === 'sonuc') return undefined;
        preloadGameClips(stage).catch(() => { });
        return undefined;
    }, [stage]);
}
