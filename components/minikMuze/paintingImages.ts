import type { ImageSourcePropType } from 'react-native';

// Tablo görselleri (WebP, uzun kenar ~1600 px). Kaynak ve lisans: constants/minikMuze.ts (credit).
// Dosyalar scripts/prepare-paintings.mjs ile Wikimedia Commons'tan hazırlanır.
export const PAINTING_IMAGES: Record<string, ImageSourcePropType> = {
    'mona-lisa': require('../../assets/images/muze/mona-lisa.webp'),
    'yildizli-gece': require('../../assets/images/muze/yildizli-gece.webp'),
    'buyuk-dalga': require('../../assets/images/muze/buyuk-dalga.webp'),
    'kaplumbaga-terbiyecisi': require('../../assets/images/muze/kaplumbaga-terbiyecisi.webp'),
    'cocuk-oyunlari': require('../../assets/images/muze/cocuk-oyunlari.webp'),
    'meyveden-portre': require('../../assets/images/muze/meyveden-portre.webp'),
    'sari-kirmizi-mavi': require('../../assets/images/muze/sari-kirmizi-mavi.webp'),
    'su-zambaklari': require('../../assets/images/muze/su-zambaklari.webp'),
    'tropik-firtinada-kaplan': require('../../assets/images/muze/tropik-firtinada-kaplan.webp'),
    'inci-kupeli-kiz': require('../../assets/images/muze/inci-kupeli-kiz.webp'),
    'aycicekleri': require('../../assets/images/muze/aycicekleri.webp'),
    'karda-avcilar': require('../../assets/images/muze/karda-avcilar.webp'),
    'pazar-gunu-parkta': require('../../assets/images/muze/pazar-gunu-parkta.webp'),
    'semsiyeler': require('../../assets/images/muze/semsiyeler.webp'),
    'japon-koprusu': require('../../assets/images/muze/japon-koprusu.webp'),
    'elmali-naturmort': require('../../assets/images/muze/elmali-naturmort.webp'),
};
