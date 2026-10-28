import type { ImageSourcePropType } from 'react-native';

// Web: küçük ekran / yavaş bağlantıda sahne görseli olarak kullanılan 1280 px'lik sürümler (assets/images/muze/small/).
// Üretim: node scripts/optimize-web-images.mjs. Native karşılığı: paintingSmall.ts (null).
export const PAINTING_SMALL: Record<string, ImageSourcePropType> | null = {
    'mona-lisa': require('../../assets/images/muze/small/mona-lisa.webp'),
    'yildizli-gece': require('../../assets/images/muze/small/yildizli-gece.webp'),
    'buyuk-dalga': require('../../assets/images/muze/small/buyuk-dalga.webp'),
    'kaplumbaga-terbiyecisi': require('../../assets/images/muze/small/kaplumbaga-terbiyecisi.webp'),
    'cocuk-oyunlari': require('../../assets/images/muze/small/cocuk-oyunlari.webp'),
    'meyveden-portre': require('../../assets/images/muze/small/meyveden-portre.webp'),
    'sari-kirmizi-mavi': require('../../assets/images/muze/small/sari-kirmizi-mavi.webp'),
    'su-zambaklari': require('../../assets/images/muze/small/su-zambaklari.webp'),
    'tropik-firtinada-kaplan': require('../../assets/images/muze/small/tropik-firtinada-kaplan.webp'),
    'inci-kupeli-kiz': require('../../assets/images/muze/small/inci-kupeli-kiz.webp'),
    'aycicekleri': require('../../assets/images/muze/small/aycicekleri.webp'),
    'karda-avcilar': require('../../assets/images/muze/small/karda-avcilar.webp'),
    'pazar-gunu-parkta': require('../../assets/images/muze/small/pazar-gunu-parkta.webp'),
    'semsiyeler': require('../../assets/images/muze/small/semsiyeler.webp'),
    'japon-koprusu': require('../../assets/images/muze/small/japon-koprusu.webp'),
    'elmali-naturmort': require('../../assets/images/muze/small/elmali-naturmort.webp'),
};
