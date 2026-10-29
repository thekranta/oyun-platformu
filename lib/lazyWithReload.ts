import React from 'react';
import { Platform } from 'react-native';

const RELOAD_FLAG_KEY = 'oyun-chunk-reload-attempted';
// Aynı sekmede iki yenileme arası en az bu kadar süre geçmeli (sonsuz yenileme döngüsüne karşı koruma).
export const RELOAD_GAP_MS = 60_000;

/**
 * Oyun parçasını (chunk) yükler; web'de eski bir sekmeden dolayı başarısız olursa sayfayı yeniler.
 *
 * Web'de her oyun ayrı bir dosyaya (chunk) bölünmüş durumda (bkz. [[outstanding-perf-work]]); yeni bir deploy
 * sonrası tarayıcıda hâlâ açık olan eski bir sekme, artık var olmayan eski bir chunk dosyasını indirmeye
 * çalışır: Vercel bilinmeyen adresler için index.html döndürdüğünden bu "Unexpected token '<'" ya da
 * "Failed to fetch" ile başarısız olur ve çocuğa "Bir şeyler ters gitti" ekranı çıkardı; tek çözüm sayfayı
 * yenilemekti. Burada bunu otomatikleştiriyoruz.
 *
 * Döngü koruması: son yenilemenin zamanı sessionStorage'a yazılır; RELOAD_GAP_MS içinde ikinci bir başarısızlık
 * gerçek hata sayılır ve normal şekilde GameErrorBoundary'ye düşer. Eskiden bayrak "bir kez" anlamındaydı ve
 * hiç silinmiyordu: aynı sekmede İKİNCİ bir deploy sonrası (test ederken sekme günlerce açık kalır) otomatik
 * yenileme çalışmıyor, oyuna girilemiyordu (test listesi 111/112 "Oyuna giremiyorum"). Eski sürümün yazdığı '1'
 * değeri çok eski bir zaman sayılır, yani yenilemeye izin verir.
 */
export function loadOrReload<T>(factory: () => Promise<T>): Promise<T> {
  return factory().catch((error) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        const last = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) || 0);
        if (!last || Date.now() - last > RELOAD_GAP_MS) {
          sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
          window.location.reload();
          // Sayfa zaten yenileniyor; bu bileşenin render edilmesine gerek yok.
          return new Promise<T>(() => {});
        }
      } catch {
        // sessionStorage kapalı/erişilemez olabilir (gizli sekme vb.) - normal hataya düş.
      }
    }
    throw error;
  });
}

/**
 * React.lazy() sarmalayıcısı: bkz. loadOrReload.
 */
export function lazyWithReload<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
): React.LazyExoticComponent<T['default']> {
  return React.lazy(() => loadOrReload(factory));
}
