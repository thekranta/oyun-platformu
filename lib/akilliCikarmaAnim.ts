// Akıllı Çıkarma turu animasyon süreleri (kullanıcı notu 2026-10-25): çocuk önce TÜM kurabiyeleri görür, sonra giden kurabiyeler
// sırayla soluklaşır, her birinin üstüne çarpı gelir; seçenekler animasyon bitince açılır. Böylece "kalanı bulmak" gördüğü şeyi
// zihninde çıkarmaktır, hazır solmuş bir resme bakmak değil.
export const FADED_OPACITY = 0.22;      // soluk kurabiye saydamlığı
export const FADE_MS = 450;             // bir kurabiyenin solma süresi
export const STAGGER_MS = 260;          // giden kurabiyeler arası gecikme (en çok; çok kurabiye gidince kısalır, bkz. staggerMs)
export const CROSS_POP_MS = 260;        // çarpının belirme (pop) süresi (zamanlı: yay animasyonu durulana dek saniyelerce sürüyordu)
export const CROSS_DELAY_MS = 270;      // çarpı, solmanın başlamasından bu kadar sonra çıkar
export const END_PAUSE_MS = 300;        // son çarpıdan sonra seçeneklerin açılmasına kadar kısa bekleme

/** Tüm kurabiyelerin sakince görüldüğü süre: sayı büyüdükçe biraz uzar (çocuk saymaya vakit bulsun). */
export const holdMs = (total: number) => 900 + total * 120;

/** Giden kurabiyeler arası gecikme: çok kurabiye gidince hızlanır (toplam solma süresi ~1,3 sn'yi çok aşmasın). */
export const staggerMs = (removed: number) => Math.min(STAGGER_MS, Math.floor(1300 / Math.max(removed, 1)));

/** Turun toplam animasyon süresi (ms): seçenekler bu süre sonunda açılır. */
export function animasyonSuresiMs(total: number, removed: number): number {
  const bir = Math.max(FADE_MS, CROSS_DELAY_MS + CROSS_POP_MS);          // bir kurabiyenin solması + çarpısı
  const solma = bir + (Math.max(removed, 1) - 1) * staggerMs(removed);
  return holdMs(total) + solma + END_PAUSE_MS;
}

/** Giden kurabiyelerin sıra numaraları (sağ uçtan `removed` tane). */
export const goneIndexes = (total: number, removed: number): number[] =>
  Array.from({ length: removed }, (_, k) => total - removed + k);
