import { Platform, Share } from 'react-native';

// Metni paylaşma: native'de sistem paylaşım sayfası (WhatsApp vb.), web'de navigator.share varsa o, yoksa panoya kopyalama.
// Hiçbir yeni paket gerektirmez. Bağımlılıklar enjekte edilebilir (test).

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareDeps {
    os: string;
    nativeShare?: (message: string) => Promise<{ action: string }>;
    navShare?: (data: { text: string }) => Promise<void>;
    clipboardWrite?: (text: string) => Promise<void>;
}

const isAbort = (e: unknown) => !!e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError';

function defaultDeps(): ShareDeps {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }) : undefined;
    return {
        os: Platform.OS,
        nativeShare: (message) => Share.share({ message }) as Promise<{ action: string }>,
        navShare: nav?.share ? (d) => nav.share!(d) : undefined,
        clipboardWrite: nav?.clipboard?.writeText ? (text) => nav.clipboard.writeText(text) : undefined,
    };
}

export async function shareText(text: string, deps: ShareDeps = defaultDeps()): Promise<ShareResult> {
    if (!text) return 'failed';
    if (deps.os !== 'web') {
        try {
            const r = await deps.nativeShare?.(text);
            if (!r) return 'failed';
            return r.action === 'dismissedAction' ? 'cancelled' : 'shared';
        } catch {
            return 'failed';
        }
    }
    if (deps.navShare) {
        try {
            await deps.navShare({ text });
            return 'shared';
        } catch (e) {
            if (isAbort(e)) return 'cancelled';
            // paylaşım desteklenmiyorsa panoya düş
        }
    }
    if (deps.clipboardWrite) {
        try {
            await deps.clipboardWrite(text);
            return 'copied';
        } catch {
            return 'failed';
        }
    }
    return 'failed';
}
