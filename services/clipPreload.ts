/**
 * Klip önceden yükleme — hangi klipler ne zaman ısıtılır (yalnız web; native'de klipler uygulama paketinde).
 *
 *  - Girişte / menüde (boşta): ortak geri bildirim klipleri (Aferin, renk adları...) — schedulePreloadCommonClips.
 *  - Bir oyun açılırken: o oyunun klipleri, giriş yönergesi önce, sıradaki indirmelerin önüne geçerek — preloadGameClips.
 *
 * Klip tabloları lib/ttsPreloadData.ts'te (scripts/gen-tts-manifest.mjs üretir) ve YALNIZ burada, dinamik import
 * ile tembel yüklenir: ana pakete girmez. Hata her zaman sessiz; önceden indirilmeyen klip eskisi gibi istek
 * üzerine iner.
 */
import { Platform } from 'react-native';
import { preloadClips } from './speechService';

/** Ortak klipler, ekran açıldıktan bu kadar sonra (ilk çizim/oturum istekleri önce bitsin) ısıtılır. */
export const COMMON_PRELOAD_DELAY_MS = 2500;

type PreloadData = typeof import('../lib/ttsPreloadData');

let dataPromise: Promise<PreloadData | null> | null = null;
let commonDone = false;
let loader: () => Promise<PreloadData> = () => import('../lib/ttsPreloadData');

function loadData(): Promise<PreloadData | null> {
    if (!dataPromise) dataPromise = loader().catch(() => null);
    return dataPromise;
}

/** Ortak klipleri boş zamanda (bir kez) önceden indirmeyi planlar; dönen fonksiyon planı iptal eder. */
export function schedulePreloadCommonClips(): () => void {
    if (Platform.OS !== 'web' || commonDone) return () => { };
    const timer = setTimeout(() => {
        loadData().then((data) => {
            if (!data || commonDone) return;
            commonDone = true;
            preloadClips(data.COMMON_CLIPS);
        });
    }, COMMON_PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
}

/** Bir oyun açılırken oyunun kliplerini (giriş yönergesi önce) öne alarak önceden indirir. */
export async function preloadGameClips(routeKey: string): Promise<void> {
    if (Platform.OS !== 'web') return;
    const data = await loadData();
    const list = data?.CLIPS_BY_GAME[routeKey];
    if (list) preloadClips(list.split('|'), { urgent: true });
}

/** Testler için: bellekteki durumu sıfırlar (jest'te dinamik import() çalışmaz; tablo yükleyicisi verilebilir). */
export function __resetClipPreloadForTests(testLoader?: () => Promise<PreloadData>): void {
    dataPromise = null;
    commonDone = false;
    loader = testLoader ?? (() => import('../lib/ttsPreloadData'));
}
