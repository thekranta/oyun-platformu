import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Tam ekran (web): tahtada tarayıcı çubuklarını gizler. iPhone Safari desteklemez; desteklenmiyorsa düğme gösterilmez. */

type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const canUseDom = () => Platform.OS === 'web' && typeof document !== 'undefined';

export function fullscreenSupported(): boolean {
    if (!canUseDom()) return false;
    const el = document.documentElement as FsElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreenNow(): boolean {
    if (!canUseDom()) return false;
    const doc = document as FsDocument;
    return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export async function toggleFullscreen(): Promise<void> {
    if (!canUseDom()) return;
    try {
        if (isFullscreenNow()) {
            const doc = document as FsDocument;
            await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        } else {
            const el = document.documentElement as FsElement;
            await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
        }
    } catch {
        // tarayıcı izin vermedi (ör. kullanıcı etkileşimi dışında): sessizce geç
    }
}

export function useFullscreen(): boolean {
    const [on, setOn] = useState(isFullscreenNow());
    useEffect(() => {
        if (!canUseDom()) return;
        const update = () => setOn(isFullscreenNow());
        document.addEventListener('fullscreenchange', update);
        document.addEventListener('webkitfullscreenchange', update);
        update();
        return () => {
            document.removeEventListener('fullscreenchange', update);
            document.removeEventListener('webkitfullscreenchange', update);
        };
    }, []);
    return on;
}
