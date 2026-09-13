import React from 'react';
import { Platform } from 'react-native';

const RELOAD_FLAG_KEY = 'oyun-chunk-reload-attempted';

/**
 * React.lazy() sarmalayıcısı. Web'de her oyun ayrı bir dosyaya (chunk)
 * bölünmüş durumda (bkz. [[outstanding-perf-work]]); yeni bir deploy
 * sonrası tarayıcıda hâlâ açık olan eski bir sekme, artık var olmayan
 * eski bir chunk dosyasını indirmeye çalışıp "Failed to fetch" ile
 * başarısız olabilir. Bu durumda GameErrorBoundary'ye düşüp çocuğa
 * "Bir şeyler ters gitti" ekranı gösterilirdi, oysa tek çözüm sayfayı
 * yenilemekti. Burada bunu otomatikleştiriyoruz: chunk indirme
 * başarısız olursa sayfa BİR KEZ (sessionStorage bayrağıyla sınırlı,
 * sonsuz döngü riski yok) otomatik yenilenir; yenileme sonrası hâlâ
 * başarısızsa (gerçek bir hata varsa) hata normal şekilde
 * GameErrorBoundary'ye düşer.
 */
export function lazyWithReload<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
): React.LazyExoticComponent<T['default']> {
  return React.lazy(() =>
    factory().catch((error) => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        try {
          if (!sessionStorage.getItem(RELOAD_FLAG_KEY)) {
            sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
            window.location.reload();
            // Sayfa zaten yenileniyor; bu bileşenin render edilmesine gerek yok.
            return new Promise<T>(() => {});
          }
        } catch {
          // sessionStorage kapalı/erişilemez olabilir (gizli sekme vb.) - normal hataya düş.
        }
      }
      throw error;
    })
  );
}
