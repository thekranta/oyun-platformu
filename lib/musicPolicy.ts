// Arka plan müziği politikası — saf (render'dan bağımsız, test edilebilir).
//
// Kullanıcı notu (2026-10-22): müzik girişten sonra HER yerde (menü, oyunlar, veli/öğretmen panelleri) çalıyor,
// oyun girişindeki sesli yönergeyle üst üste biniyor, çoğu oyunda kapatma düğmesi yok. Ölçüm: background.mp3
// çok yüksek seviyeli — en yüksek RMS 0,58; konuşma klipleri 0,26-0,32. Eski varsayılan ses düzeyi 0,5'te
// müzik KONUŞMAYLA AYNI yükseklikteydi. Burada:
//  - müzik "sahne"ye bağlı: menüde kısık, oyunda çok kısık, sahne belirtmeyen her ekranda SESSİZ (varsayılan),
//  - konuşma (yönerge, 'Aferin!') sürerken müzik kesilir, bitince yumuşakça döner,
//  - hareketsizlikte ve kullanıcı kapattığında (tercih hatırlanır) sessiz,
//  - müzik/ritim/çalgı, hikaye ve mikrofon oyunlarında hiç çalmaz (oyunun kendi sesi esas içeriktir).

import { GAME_CATALOG, type GameCatalogItem } from '../constants/gameCatalog';

export type MusicScene = 'off' | 'menu' | 'game';

/**
 * Müzik ses düzeyleri (0-1, dosyanın kendi seviyesine göre). background.mp3'ün en yüksek RMS'i 0,58,
 * konuşma kliplerininki ~0,30: menüde müzik konuşmanın yaklaşık 13 dB, oyunda yaklaşık 22 dB altında kalır.
 * Kulakla ayar gerekirse YALNIZ bu iki sabit değişir.
 */
export const MENU_LEVEL = 0.12;
export const GAME_LEVEL = 0.05;

/** Bu kadar süre hiçbir dokunuş/tuş olmazsa müzik yavaşça susar; ilk dokunuşta yumuşakça döner. */
export const IDLE_SILENCE_MS = 45_000;

/** Konuşma bitince müzik hemen dönmez: art arda gelen klipler arasındaki kısa boşlukta müzik "nefes almasın". */
export const DUCK_HOLD_MS = 700;

/**
 * Web'de müzik dosyası (≈1,2 MB) ağdan iner ve ilk konuşma kliplerinin yolunu kesmesin: indirme bir konuşma bitince
 * (MUSIC_LOAD_SETTLE_MS sonra), konuşma hiç olmazsa en geç MUSIC_LOAD_FALLBACK_MS sonra başlar. Native'de dosya
 * paketin içinde, bekleme yok.
 */
export const MUSIC_LOAD_FALLBACK_MS = 8_000;
export const MUSIC_LOAD_SETTLE_MS = 1_500;

export interface MusicState {
  scene: MusicScene;
  /** Kullanıcı sesi kapattı (kalıcı tercih). */
  muted: boolean;
  /** Tarayıcıların otomatik oynatma engeli: ilk dokunuştan önce çalınmaz. */
  interacted: boolean;
  /** Hareketsizlik nedeniyle susturuldu. */
  idle: boolean;
  /** Yönerge/konuşma sürüyor. */
  speaking: boolean;
  /** Uygulama/sekme ön planda. */
  appActive: boolean;
}

/** Şu anki duruma göre müziğin olması gereken ses düzeyi (0 = sessiz). */
export function targetVolume(s: MusicState): number {
  if (s.muted || !s.interacted || s.idle || s.speaking || !s.appActive) return 0;
  if (s.scene === 'menu') return MENU_LEVEL;
  if (s.scene === 'game') return GAME_LEVEL;
  return 0;
}

/**
 * Hedefe ulaşma süresi (ms): konuşma başlayınca hızlı çekilir, hareketsizlikte çok yavaş söner,
 * açılışta/dönüşte yumuşak girer.
 */
export function rampMs(next: MusicState, from: number, to: number): number {
  if (to >= from) return 1600;
  if (next.speaking) return 180;
  if (next.idle) return 2500;
  return 500;
}

/** Müziğin hiç çalmaması gereken oyunlar: mikrofon kullananlar (müzik kayda karışır). */
const SILENT_ROUTES = new Set<string>(['bunu-soyle']);

/**
 * Bir oyunun müzik sahnesi. Müzik/ritim/çalgı (domain 'Muzik' ya da status 'music'), hikaye ve mikrofon oyunları
 * 'off': oyunun kendi sesi esas içeriktir, arka plan müziği onu örter. Kataloğda olmayan anahtar da 'off'.
 */
export function musicSceneForRoute(routeKey: string, catalog: readonly GameCatalogItem[] = GAME_CATALOG): MusicScene {
  const item = catalog.find((g) => g.routeKey === routeKey);
  if (!item) return 'off';
  if (SILENT_ROUTES.has(item.routeKey)) return 'off';
  if (item.status === 'story' || item.status === 'music' || item.domain === 'Muzik') return 'off';
  return 'game';
}

/** Ana ekranın aşamasından ('giris' | 'menu' | 'sonuc' | oyun anahtarı) müzik sahnesi. */
export function musicSceneForStage(stage: string, catalog: readonly GameCatalogItem[] = GAME_CATALOG): MusicScene {
  if (stage === 'menu') return 'menu';
  return musicSceneForRoute(stage, catalog);
}
