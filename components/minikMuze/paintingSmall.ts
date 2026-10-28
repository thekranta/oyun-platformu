import type { ImageSourcePropType } from 'react-native';

// Küçük (1280 px) tablo sürümleri YALNIZ web paketine girer (paintingSmall.web.ts): native'de görseller uygulama
// paketinde olduğundan ağ kazancı yoktur, boyutu da büyütmemek için burada boş bırakılır.
export const PAINTING_SMALL: Record<string, ImageSourcePropType> | null = null;
