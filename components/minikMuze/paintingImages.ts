import { useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { currentConnection, shouldUseSmallPaintings } from '../../lib/paintingQuality';
import { PAINTING_SMALL } from './paintingSmall';

// Tablo görselleri (WebP, tam boy; uzun kenar 1280-1920 px). Kaynak ve lisans: constants/minikMuze.ts (credit).
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

// Galeri kartları için küçük önizlemeler (uzun kenar 480 px, ≈10-50 KB): galeri eskiden 16 tablonun TAM boyutunu (13,9 MB)
// küçük kartlar için indiriyordu. Ayrıca sahnede tam görsel inerken anında görünen yer tutucu olarak kullanılır.
// Üretim: node scripts/optimize-web-images.mjs
export const PAINTING_THUMBS: Record<string, ImageSourcePropType> = {
    'mona-lisa': require('../../assets/images/muze/thumbs/mona-lisa.webp'),
    'yildizli-gece': require('../../assets/images/muze/thumbs/yildizli-gece.webp'),
    'buyuk-dalga': require('../../assets/images/muze/thumbs/buyuk-dalga.webp'),
    'kaplumbaga-terbiyecisi': require('../../assets/images/muze/thumbs/kaplumbaga-terbiyecisi.webp'),
    'cocuk-oyunlari': require('../../assets/images/muze/thumbs/cocuk-oyunlari.webp'),
    'meyveden-portre': require('../../assets/images/muze/thumbs/meyveden-portre.webp'),
    'sari-kirmizi-mavi': require('../../assets/images/muze/thumbs/sari-kirmizi-mavi.webp'),
    'su-zambaklari': require('../../assets/images/muze/thumbs/su-zambaklari.webp'),
    'tropik-firtinada-kaplan': require('../../assets/images/muze/thumbs/tropik-firtinada-kaplan.webp'),
    'inci-kupeli-kiz': require('../../assets/images/muze/thumbs/inci-kupeli-kiz.webp'),
    'aycicekleri': require('../../assets/images/muze/thumbs/aycicekleri.webp'),
    'karda-avcilar': require('../../assets/images/muze/thumbs/karda-avcilar.webp'),
    'pazar-gunu-parkta': require('../../assets/images/muze/thumbs/pazar-gunu-parkta.webp'),
    'semsiyeler': require('../../assets/images/muze/thumbs/semsiyeler.webp'),
    'japon-koprusu': require('../../assets/images/muze/thumbs/japon-koprusu.webp'),
    'elmali-naturmort': require('../../assets/images/muze/thumbs/elmali-naturmort.webp'),
};

/**
 * Sahnede gösterilecek tablo görseli. Web'de küçük ekran / yavaş bağlantıda 1280 px'lik sürüm (yaklaşık yarı boyut),
 * aksi halde (büyük ekran, native) tam boy. Nedeni ve eşikler: lib/paintingQuality.ts.
 */
export function paintingSource(id: string, preferSmall: boolean): ImageSourcePropType {
    return (preferSmall && PAINTING_SMALL?.[id]) || PAINTING_IMAGES[id];
}

/** Pencere boyutu ve bağlantıya göre küçük sürüm tercih edilsin mi (bkz. lib/paintingQuality.ts). */
export function usePreferSmallPaintings(): boolean {
    const { width, height } = useWindowDimensions();
    return shouldUseSmallPaintings(width, height, currentConnection());
}
