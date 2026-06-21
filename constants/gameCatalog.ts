export type GameCatalogStatus = 'core' | 'secondary' | 'story' | 'creative' | 'music';

export interface GameCatalogItem {
  id: string;
  title: string;
  status: GameCatalogStatus;
  domain: string;
  skillFocus: string;
  routeKey: string;
  notes?: string;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  { id: 'hafiza', title: 'Hafiza Oyunu', status: 'core', domain: 'Bilissel', skillFocus: 'Bellek ve dikkat', routeKey: 'hafiza' },
  { id: 'siralama', title: 'Siralama Oyunu', status: 'core', domain: 'Matematik', skillFocus: 'Siralama ve dizilim', routeKey: 'siralama' },
  { id: 'eksik-sayi-bul', title: 'Eksik Sayi Bul', status: 'core', domain: 'Matematik', skillFocus: 'Sayi farkindaligi', routeKey: 'eksik-sayi-bul' },
  { id: 'gruplama', title: 'Gruplama Oyunu', status: 'core', domain: 'Bilissel', skillFocus: 'Siniflandirma', routeKey: 'gruplama' },
  { id: 'mutfak-dedektifi', title: 'Mutfak Dedektifi', status: 'core', domain: 'Bilissel', skillFocus: 'Siniflandirma ve gorsel dikkat', routeKey: 'mutfak-dedektifi' },
  { id: 'miktar-karsilastirma', title: 'Miktar Karsilastirma', status: 'core', domain: 'Matematik', skillFocus: 'Miktar algisi', routeKey: 'miktar-karsilastirma' },
  { id: 'sayi-komsulari', title: 'Sayi Komsulari', status: 'core', domain: 'Matematik', skillFocus: 'Sayi iliskileri', routeKey: 'sayi-komsulari' },

  { id: 'diziyi-tamamla', title: 'Diziyi Tamamla', status: 'secondary', domain: 'Bilissel', skillFocus: 'Oruntu', routeKey: 'diziyi-tamamla' },
  { id: 'bunu-soyle', title: 'Bunu Soyle', status: 'secondary', domain: 'Dil', skillFocus: 'Sozlu ifade', routeKey: 'bunu-soyle' },
  { id: 'kodlama', title: 'Kodlama Oyunu', status: 'secondary', domain: 'Bilissel', skillFocus: 'Algoritmik dusunme', routeKey: 'kodlama' },
  { id: 'rakam-yazma', title: 'Rakam Yazma', status: 'secondary', domain: 'Matematik', skillFocus: 'Rakam tanima ve yazma', routeKey: 'rakam-yazma' },
  { id: 'kutuyu-bul', title: 'Kutuyu Bul', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel takip', routeKey: 'kutuyu-bul' },
  { id: 'sayilari-birlestir', title: 'Sayilari Birlestir', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi sirasi', routeKey: 'sayilari-birlestir' },
  { id: 'yapboz', title: 'Yapboz Oyunu', status: 'secondary', domain: 'Bilissel', skillFocus: 'Parca-butun iliskisi', routeKey: 'yapboz' },
  { id: 'golge-dedektifi', title: 'Golge Dedektifi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel eslestirme', routeKey: 'golge-dedektifi' },
  { id: 'onluk-cerceve', title: 'Onluk Cerceve', status: 'secondary', domain: 'Matematik', skillFocus: 'Onluk sistem farkindaligi', routeKey: 'onluk-cerceve' },
  { id: 'tarti-dengesi', title: 'Tarti Dengesi', status: 'secondary', domain: 'Matematik', skillFocus: 'Denge ve karsilastirma', routeKey: 'tarti-dengesi' },
  { id: 'sihirli-siseler', title: 'Sihirli Siseler', status: 'secondary', domain: 'Bilissel', skillFocus: 'Dikkat ve problem cozme', routeKey: 'sihirli-siseler' },
  { id: 'sihirli-tuval', title: 'Sihirli Tuval', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel dikkat', routeKey: 'sihirli-tuval' },
  { id: 'uzay-bloklari', title: 'Uzay Bloklari', status: 'secondary', domain: 'Bilissel', skillFocus: 'Uzamsal dusunme', routeKey: 'uzay-bloklari' },
  { id: 'renkli-baglantalar', title: 'Renkli Baglantalar', status: 'secondary', domain: 'Bilissel', skillFocus: 'Eslestirme ve dikkat', routeKey: 'renkli-baglantalar' },

  { id: 'ceviz-macera', title: 'Ceviz Macera', status: 'story', domain: 'Sosyal-duygusal', skillFocus: 'Secim ve sonuc', routeKey: 'ceviz-macera' },
  { id: 'aile-sepeti-macerasi', title: 'Aile Sepeti Macerasi', status: 'story', domain: 'Sosyal-duygusal', skillFocus: 'Aile ve is birligi', routeKey: 'aile-sepeti-macerasi' },
  { id: 'adalet-hikayesi', title: 'Adalet Hikayesi', status: 'story', domain: 'Sosyal-duygusal', skillFocus: 'Adalet ve paylasim', routeKey: 'adalet-hikayesi' },

  { id: 'yaratici-cizim', title: 'Yaratici Cizim', status: 'creative', domain: 'Sanat', skillFocus: 'Yaratici ifade', routeKey: 'yaratici-cizim' },
  { id: 'muzik-calar', title: 'Muzik Calar', status: 'music', domain: 'Muzik', skillFocus: 'Sarki ve ritim', routeKey: 'muzik-calar' },
];
