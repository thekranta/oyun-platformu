import { getNativeSourceFromSource } from 'expo-av/build/AV';

const cache = new Map<number, string>();

/**
 * Paketli bir varlığın (require() sonucu) ağ adresi, EŞZAMANLI; ağa dokunmaz. Web'de önceden indirme
 * (services/storyPreload.ts) içindir. Web'de require() sonucu: ses için metin adres (olduğu gibi), görsel için
 * { uri, width, height } nesnesi (uri alınır); native'de sayıdır (expo-av'in createAsync'te kullandığı kaynak
 * çözümlemesi = Asset.fromModule). Çözülemezse undefined. (expo-asset doğrudan içe aktarılamaz: node_modules/expo
 * altında iç içe kurulu.)
 */
export function assetUri(src: unknown): string | undefined {
    if (typeof src === 'string') return src || undefined;
    if (src && typeof src === 'object') {
        const uri = (src as { uri?: unknown }).uri;
        return typeof uri === 'string' && uri ? uri : undefined;
    }
    if (typeof src !== 'number') return undefined;
    const hit = cache.get(src);
    if (hit) return hit;
    try {
        const uri = getNativeSourceFromSource(src)?.uri;
        if (uri) {
            cache.set(src, uri);
            return uri;
        }
    } catch { /* çözülemedi */ }
    return undefined;
}
