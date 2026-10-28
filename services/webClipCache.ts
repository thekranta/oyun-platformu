/**
 * Web klip önbelleği — önceden indirilen kısa konuşma kliplerini bellekte (blob URL) tutar.
 *
 * Neden: <audio src="https://.../klip.mp3"> mobil tarayıcıda (özellikle iPhone Safari) klip başına birkaç
 * gidiş-dönüş yapar (aralık yoklaması, doğrulama). Klip önceden indirilmişse çalma ağa hiç dokunmaz ve anında
 * başlar. İndirme fetch ile yapılır: tarayıcının HTTP önbelleği de dolar (vercel.json'da hash'li dosyalar 1 yıl
 * saklanır), sonraki oturumda fetch önbellekten gelir.
 *
 * Yalnız web; native'de ve fetch / URL.createObjectURL olmayan ortamlarda her şey no-op. Hata her zaman sessiz:
 * klip önbellekte yoksa çalma eskisi gibi doğrudan adresten yapılır. Ağı yormamak için en çok CONCURRENCY eşzamanlı
 * indirme; veri tasarrufu açıkken, 2G'de ve sekme arka plandayken önceden indirme yapılmaz (çalarken indirme sürer).
 */

/** Bellekte tutulacak en çok klip (≈25 KB/klip → ≈4 MB). Aşılınca en eskisi (çalmıyorsa) bırakılır. */
export const MAX_CLIPS = 160;
/** Bellekte tutulacak en çok bayt: hikâye anlatımları (≈0,4 MB/dosya) klip sayısı sınırını tek başına yetersiz bırakır. */
export const MAX_BYTES = 24 * 1024 * 1024;
const CONCURRENCY = 2;

const ready = new Map<string, string>();                        // klip adresi -> blob URL (ekleme sırası: eski → yeni)
const sizes = new Map<string, number>();                        // klip adresi -> bayt
let totalBytes = 0;
const inflight = new Map<string, Promise<string | undefined>>();
const queue: string[] = [];
let active = 0;
let inUseUrl: string | undefined;                               // şu an çalan blob: bırakılmaz

function supported(): boolean {
    return typeof fetch === 'function'
        && typeof Blob !== 'undefined'
        && typeof URL !== 'undefined'
        && typeof URL.createObjectURL === 'function';
}

/** Önceden indirme yapılsın mı: veri tasarrufu / 2G / arka plan sekmesinde hayır. */
function preloadAllowed(): boolean {
    if (typeof document !== 'undefined' && document.hidden) return false;
    const conn = typeof navigator !== 'undefined'
        ? (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
        : undefined;
    if (conn?.saveData) return false;
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return false;
    return true;
}

function remember(uri: string, blobUrl: string, bytes: number): void {
    ready.set(uri, blobUrl);
    sizes.set(uri, bytes);
    totalBytes += bytes;
    while (ready.size > MAX_CLIPS || totalBytes > MAX_BYTES) {
        let evicted = false;
        for (const [k, v] of ready) {
            if (v === inUseUrl) continue;
            ready.delete(k);
            totalBytes -= sizes.get(k) ?? 0;
            sizes.delete(k);
            try { URL.revokeObjectURL(v); } catch { /* yok say */ }
            evicted = true;
            break;
        }
        if (!evicted) break;
    }
}

function fetchClip(uri: string): Promise<string | undefined> {
    const existing = inflight.get(uri);
    if (existing) return existing;
    const p = (async () => {
        try {
            const res = await fetch(uri);
            if (!res.ok) return undefined;
            const buf = await res.arrayBuffer();
            const blobUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
            remember(uri, blobUrl, buf.byteLength);
            return blobUrl;
        } catch {
            return undefined;
        } finally {
            inflight.delete(uri);
        }
    })();
    inflight.set(uri, p);
    return p;
}

function pump(): void {
    while (active < CONCURRENCY && queue.length > 0) {
        const uri = queue.shift() as string;
        if (ready.has(uri) || inflight.has(uri)) continue;
        active += 1;
        fetchClip(uri).finally(() => {
            active -= 1;
            pump();
        });
    }
}

/** Klip önceden indirildiyse blob URL'si (anında çalınır), yoksa undefined. */
export function readyClipUrl(uri: string): string | undefined {
    return ready.get(uri);
}

/** Klip şu an iniyorsa (önceden indirme) bekleyebileceğin söz, yoksa undefined. */
export function pendingClip(uri: string): Promise<string | undefined> | undefined {
    return inflight.get(uri);
}

/** Çalan blob URL'sini bildirir: bellek sınırı aşılsa bile çalarken bırakılmaz. */
export function markClipInUse(blobUrl: string | undefined): void {
    inUseUrl = blobUrl;
}

/**
 * Klipleri (tam adresleri) arka planda indirir. urgent: sıradaki işlerin ÖNÜNE geçer (oyun açılırken oyunun
 * klipleri, menüde ısıtılan ortak kliplerden önce iner).
 */
export function preloadClipUris(uris: readonly string[], opts: { urgent?: boolean } = {}): void {
    if (!supported() || !preloadAllowed()) return;
    const fresh = uris.filter((u, i) => !ready.has(u) && !inflight.has(u) && uris.indexOf(u) === i);
    if (fresh.length === 0) return;
    const rest = queue.filter((u) => !fresh.includes(u));
    queue.length = 0;
    queue.push(...(opts.urgent ? [...fresh, ...rest] : [...rest, ...fresh]));
    pump();
}

/** Testler için: tüm durumu sıfırlar. */
export function __resetWebClipCacheForTests(): void {
    for (const v of ready.values()) {
        try { URL.revokeObjectURL(v); } catch { /* yok say */ }
    }
    ready.clear();
    sizes.clear();
    totalBytes = 0;
    inflight.clear();
    queue.length = 0;
    active = 0;
    inUseUrl = undefined;
}
