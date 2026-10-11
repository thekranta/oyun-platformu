import type { ImageSourcePropType } from 'react-native';

// Tablo görselleri (WebP, uzun kenar ~1600 px). Kaynak ve lisans: constants/minikMuze.ts (credit).
// Dosyalar scripts/prepare-paintings.mjs ile Wikimedia Commons'tan hazırlanır.
export const PAINTING_IMAGES: Record<string, ImageSourcePropType> = {
    'mona-lisa': require('../../assets/images/muze/mona-lisa.webp'),
    'yildizli-gece': require('../../assets/images/muze/yildizli-gece.webp'),
    'buyuk-dalga': require('../../assets/images/muze/buyuk-dalga.webp'),
};
