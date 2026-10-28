/**
 * Hikâye oyunlarında sıradaki sahnelerin görsel ve seslerini ÖNCEDEN indirir (yalnız web; native'de varlıklar uygulama
 * paketinde). Hikâye sesleri ≈0,4 MB; ilk kez gelen kullanıcıda her sahne geçişinde anlatım ve görselin gecikmesini gizler.
 *  - Görsel: Image.prefetch (tarayıcı önbelleği + react-native-web'in kendi görsel önbelleği).
 *  - Ses: services/webClipCache (bellekte blob; bayt sınırlı) — oynatırken playableAudioSource() blob adresini verir.
 * Hata her zaman sessiz; önceden inmeyen varlık eskisi gibi istek üzerine iner.
 */
import { Image, Platform } from 'react-native';
import { assetUri } from '../lib/assetUri';
import type { UpcomingAssets } from '../lib/storyUpcoming';
import { preloadClipUris, readyClipUrl } from './webClipCache';

const IS_WEB = Platform.OS === 'web';

/** Görselleri ve sesleri arka planda indirir (görseller önce: küçük ve hemen gerekir). */
export function preloadStoryAssets({ images, audio }: UpcomingAssets): void {
    if (!IS_WEB) return;
    for (const m of images) {
        const uri = assetUri(m);
        if (uri) Image.prefetch(uri).catch(() => { });
    }
    const audioUris = audio.map((m) => assetUri(m)).filter((u): u is string => !!u);
    if (audioUris.length > 0) preloadClipUris(audioUris);
}

/**
 * expo-av'e verilecek ses kaynağı: web'de önceden inmişse bellekten (blob), değilse olduğu gibi (paketli varlık: web'de
 * metin adres, native'de sayı). Native'de ve paketli varlık olmayan kaynaklarda (null, { uri }) değişmez.
 */
export function playableAudioSource<T>(src: T): T | { uri: string } {
    if (!IS_WEB || (typeof src !== 'string' && typeof src !== 'number')) return src;
    const uri = assetUri(src);
    const blob = uri ? readyClipUrl(uri) : undefined;
    return blob ? { uri: blob } : src;
}
