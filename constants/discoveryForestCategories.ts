/**
 * Keşif Ormanı – Ana Ekran Kategori Verisi
 * Türkiye Yüzyılı Maarif Modeli'ne uygun, okul öncesi 3–6 yaş grubu için
 * hazırlanmış 13 kategori.
 */

export type MaarifArea =
  | 'Bilişsel Alan'
  | 'Sosyo-Duygusal Alan'
  | 'Fiziksel Alan'
  | 'Fiziksel & Bilişsel Alan'
  | 'Fiziksel & Sosyo-Duygusal Alan';

export interface ForestCategory {
  id: string;
  categoryName: string;
  maarifArea: MaarifArea;
  forestName: string;
  iconPath: string;
  accentColor: string;
  route: string;
}

export const DISCOVERY_FOREST_CATEGORIES: ForestCategory[] = [
  {
    id: 'sayi-agaci',
    categoryName: 'Sayılar',
    maarifArea: 'Bilişsel Alan',
    forestName: 'Sayı Ağacı',
    iconPath: 'sayi_agaci',
    accentColor: '#6BBDE3',
    route: '/games/sayilar',
  },
  {
    id: 'harf-cicegi',
    categoryName: 'Harfler',
    maarifArea: 'Bilişsel Alan',
    forestName: 'Harf Çiçeği',
    iconPath: 'harf_cicegi',
    accentColor: '#F7C948',
    route: '/games/harfler',
  },
  {
    id: 'sekil-goleti',
    categoryName: 'Şekil Tanıma',
    maarifArea: 'Bilişsel Alan',
    forestName: 'Şekil Göleti',
    iconPath: 'sekil_goleti',
    accentColor: '#E8A0C8',
    route: '/games/sekiller',
  },
  {
    id: 'dikkat-dalgasi',
    categoryName: 'Dikkat ve Konsantrasyon',
    maarifArea: 'Sosyo-Duygusal Alan',
    forestName: 'Dikkat Dalgası',
    iconPath: 'dikkat_dalgasi',
    accentColor: '#4FC3C3',
    route: '/games/dikkat',
  },
  {
    id: 'ani-kelebegi',
    categoryName: 'Hafıza',
    maarifArea: 'Sosyo-Duygusal Alan',
    forestName: 'Anı Kelebeği',
    iconPath: 'ani_kelebegi',
    accentColor: '#B39DDB',
    route: '/games/hafiza',
  },
  {
    id: 'duygu-pinari',
    categoryName: 'Duygusal Tanıma',
    maarifArea: 'Sosyo-Duygusal Alan',
    forestName: 'Duygu Pınarı',
    iconPath: 'duygu_pinari',
    accentColor: '#80DEEA',
    route: '/games/duygular',
  },
  {
    id: 'kosu-kirazi',
    categoryName: 'Motor Becerileri',
    maarifArea: 'Fiziksel Alan',
    forestName: 'Koşu Kirazı',
    iconPath: 'kosu_kirazi',
    accentColor: '#EF9A9A',
    route: '/games/motor',
  },
  {
    id: 'denge-dalgasi',
    categoryName: 'Denge & Koordinasyon',
    maarifArea: 'Fiziksel Alan',
    forestName: 'Denge Dalgası',
    iconPath: 'denge_dalgasi',
    accentColor: '#A5D6A7',
    route: '/games/denge',
  },
  {
    id: 'masal-kovugu',
    categoryName: 'Yaratıcı Drama',
    maarifArea: 'Fiziksel & Sosyo-Duygusal Alan',
    forestName: 'Masal Kovuğu',
    iconPath: 'masal_kovugu',
    accentColor: '#FFCC80',
    route: '/games/drama',
  },
  {
    id: 'ritim-kelebegi',
    categoryName: 'Ritim & Müzik',
    maarifArea: 'Fiziksel Alan',
    forestName: 'Ritim Kelebeği',
    iconPath: 'ritim_kelebegi',
    accentColor: '#C5E1A5',
    route: '/games/muzik',
  },
  {
    id: 'bulmaca-yolu',
    categoryName: 'Problem Çözme',
    maarifArea: 'Bilişsel Alan',
    forestName: 'Bulmaca Yolu',
    iconPath: 'bulmaca_yolu',
    accentColor: '#FFD54F',
    route: '/games/problem',
  },
  {
    id: 'arkadas-cicegi',
    categoryName: 'Sosyal Oyun',
    maarifArea: 'Sosyo-Duygusal Alan',
    forestName: 'Arkadaş Çiçeği',
    iconPath: 'arkadas_cicegi',
    accentColor: '#F48FB1',
    route: '/games/sosyal',
  },
  {
    id: 'kesif-kucaklamasi',
    categoryName: 'Doğa Keşfi',
    maarifArea: 'Fiziksel & Bilişsel Alan',
    forestName: 'Keşif Kucaklaması',
    iconPath: 'kesif_kucaklamasi',
    accentColor: '#FFAB91',
    route: '/games/doga',
  },
  {
    id: 'renk-cayiri',
    categoryName: 'Sanat ve Yaratıcılık',
    maarifArea: 'Fiziksel & Bilişsel Alan',
    forestName: 'Renk Çayırı',
    iconPath: 'renk_cayiri',
    accentColor: '#CE93D8',
    route: '/games/sanat',
  },
  {
    id: 'can-elmasi',
    categoryName: 'Sağlık ve Beden Farkındalığı',
    maarifArea: 'Fiziksel Alan',
    forestName: 'Can Elması',
    iconPath: 'can_elmasi',
    accentColor: '#90CAF9',
    route: '/games/saglik',
  },
];
