import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Ekranı uyanık tut (web, Screen Wake Lock API): sınıf tahtası dersin ortasında uyku/ekran koruyucuya girmesin.
 * Desteklemeyen eski tarayıcılarda sessizce hiçbir şey yapmaz. Sekme görünür olunca kilit yeniden alınır.
 */
interface WakeLockSentinelLike { release(): Promise<void> }
interface WakeLockNavigator { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }

export function useWakeLock(enabled: boolean): void {
    useEffect(() => {
        if (!enabled || Platform.OS !== 'web' || typeof navigator === 'undefined' || typeof document === 'undefined') return;
        const wakeLock = (navigator as unknown as WakeLockNavigator).wakeLock;
        if (!wakeLock) return;

        let sentinel: WakeLockSentinelLike | null = null;
        let cancelled = false;
        const acquire = async () => {
            try {
                const next = await wakeLock.request('screen');
                if (cancelled) next.release().catch(() => { });
                else sentinel = next;
            } catch {
                sentinel = null; // pil tasarrufu vb. nedenle reddedildi
            }
        };
        const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };

        acquire();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
            sentinel?.release().catch(() => { });
            sentinel = null;
        };
    }, [enabled]);
}
