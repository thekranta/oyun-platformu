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
  { id: 'sevgi-hikayesi', title: 'Kucuk Kalpler', status: 'story', domain: 'Sosyal-duygusal', skillFocus: 'Sevgi ve empati', routeKey: 'sevgi-hikayesi' },
  { id: 'duygu-yuzleri', title: 'Duygu Yuzleri', status: 'secondary', domain: 'Sosyal-duygusal', skillFocus: 'Duygulari tanima', routeKey: 'duygu-yuzleri' },

  { id: 'renk-sepetleri', title: 'Renk Sepetleri', status: 'secondary', domain: 'Kavram', skillFocus: 'Renkleri ayirt etme', routeKey: 'renk-sepetleri' },
  { id: 'zitlari-eslestir', title: 'Zitlari Eslestir', status: 'secondary', domain: 'Kavram', skillFocus: 'Zit kavramlar', routeKey: 'zitlari-eslestir' },
  { id: 'sekil-treni', title: 'Sekil Treni', status: 'secondary', domain: 'Kavram', skillFocus: 'Geometrik sekiller', routeKey: 'sekil-treni' },
  { id: 'ayi-ailesi', title: 'Ayi Ailesi', status: 'secondary', domain: 'Kavram', skillFocus: 'Boyut siralama', routeKey: 'ayi-ailesi' },
  { id: 'ciftlikte-sayalim', title: 'Ciftlikte Sayalim', status: 'secondary', domain: 'Kavram', skillFocus: 'Sayma (1-5)', routeKey: 'ciftlikte-sayalim' },
  { id: 'ayni-farkli', title: 'Ayni mi Farkli mi', status: 'secondary', domain: 'Kavram', skillFocus: 'Ayni/farkli ayirt etme', routeKey: 'ayni-farkli' },
  { id: 'hangisi-farkli', title: 'Hangisi Farkli', status: 'secondary', domain: 'Kavram', skillFocus: 'Gruba uymayani bulma', routeKey: 'hangisi-farkli' },
  { id: 'buyuk-orta-kucuk', title: 'Buyuk-Orta-Kucuk', status: 'secondary', domain: 'Kavram', skillFocus: 'Boyut ayirt etme', routeKey: 'buyuk-orta-kucuk' },
  { id: 'neredeyim', title: 'Neredeyim', status: 'secondary', domain: 'Kavram', skillFocus: 'Konum kavramlari', routeKey: 'neredeyim' },
  { id: 'once-sonra', title: 'Once-Sonra', status: 'secondary', domain: 'Kavram', skillFocus: 'Zaman sirasi', routeKey: 'once-sonra' },
  { id: 'sayiyi-bul', title: 'Sayiyi Bul', status: 'secondary', domain: 'Kavram', skillFocus: 'Rakam-nicelik', routeKey: 'sayiyi-bul' },
  { id: 'en-uzun', title: 'En Uzun Hangisi', status: 'secondary', domain: 'Kavram', skillFocus: 'Uzunluk karsilastirma', routeKey: 'en-uzun' },
  { id: 'dogru-kutu', title: 'Dogru Kutu', status: 'secondary', domain: 'Kavram', skillFocus: 'Kategoriye ayirma', routeKey: 'dogru-kutu' },
  { id: 'ikizleri-bul', title: 'Ikizleri Bul', status: 'secondary', domain: 'Kavram', skillFocus: 'Ayni olani esleme', routeKey: 'ikizleri-bul' },
  { id: 'ne-ise-yarar', title: 'Ne Ise Yarar', status: 'secondary', domain: 'Kavram', skillFocus: 'Iliskili esleme', routeKey: 'ne-ise-yarar' },
  { id: 'renk-oruntusu', title: 'Renk Oruntusu', status: 'secondary', domain: 'Kavram', skillFocus: 'Oruntu surdurme', routeKey: 'renk-oruntusu' },
  { id: 'nokta-say', title: 'Nokta Say', status: 'secondary', domain: 'Kavram', skillFocus: 'Sayma (nokta)', routeKey: 'nokta-say' },
  { id: 'canli-cansiz', title: 'Canli mi Cansiz mi', status: 'secondary', domain: 'Kavram', skillFocus: 'Canli/cansiz', routeKey: 'canli-cansiz' },
  { id: 'yuzer-batar', title: 'Yuzer mi Batar mi', status: 'secondary', domain: 'Kavram', skillFocus: 'Tahmin (yuzer/batar)', routeKey: 'yuzer-batar' },
  { id: 'duygu-eslestir', title: 'Duygu Eslestir', status: 'secondary', domain: 'Kavram', skillFocus: 'Ayni duyguyu esleme', routeKey: 'duygu-eslestir' },
  { id: 'sirayi-hatirla', title: 'Sirayi Hatirla', status: 'secondary', domain: 'Kavram', skillFocus: 'Calisma bellegi', routeKey: 'sirayi-hatirla' },
  { id: 'agir-hafif', title: 'En Agir Hangisi', status: 'secondary', domain: 'Kavram', skillFocus: 'Agirlik karsilastirma', routeKey: 'agir-hafif' },
  { id: 'gunduz-gece', title: 'Gunduz mu Gece mi', status: 'secondary', domain: 'Kavram', skillFocus: 'Zaman (gunduz/gece)', routeKey: 'gunduz-gece' },
  { id: 'kac-oldu', title: 'Kac Oldu', status: 'secondary', domain: 'Kavram', skillFocus: 'Toplama (5e kadar)', routeKey: 'kac-oldu' },
  { id: 'renkleri-karistir', title: 'Renkleri Karistir', status: 'secondary', domain: 'Kavram', skillFocus: 'Renk karisimi', routeKey: 'renkleri-karistir' },
  { id: 'sekil-deligi', title: 'Sekil Deligi', status: 'secondary', domain: 'Kavram', skillFocus: 'Sekil esleme', routeKey: 'sekil-deligi' },
  { id: 'az-cok-sirala', title: 'Az Cok Sirala', status: 'secondary', domain: 'Kavram', skillFocus: 'Nicelik siralama', routeKey: 'az-cok-sirala' },

  { id: 'ayni-harf', title: 'Ayni Harf', status: 'secondary', domain: 'Dil', skillFocus: 'Harf tanima', routeKey: 'ayni-harf' },
  { id: 'iyilik-yap', title: 'Iyilik Yap', status: 'secondary', domain: 'Sosyal-duygusal', skillFocus: 'Empati ve nezaket', routeKey: 'iyilik-yap' },
  { id: 'ne-degisti', title: 'Ne Degisti', status: 'secondary', domain: 'Bilissel', skillFocus: 'Dikkat ve bellek', routeKey: 'ne-degisti' },
  { id: 'kac-kaldi', title: 'Kac Kaldi', status: 'secondary', domain: 'Matematik', skillFocus: 'Cikarma (5e kadar)', routeKey: 'kac-kaldi' },
  { id: 'buyuk-sayi', title: 'Buyuk Sayi Hangisi', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi karsilastirma', routeKey: 'buyuk-sayi' },
  { id: 'boyama', title: 'Boyama', status: 'creative', domain: 'Sanat', skillFocus: 'Yaratici ifade', routeKey: 'boyama' },
  { id: 'cizim-sayfalari', title: 'Cizim Sayfalari', status: 'creative', domain: 'Sanat', skillFocus: 'Kilavuzlu cizgi calismasi', routeKey: 'cizim-sayfalari' },

  { id: 'yaratici-cizim', title: 'Yaratici Cizim', status: 'creative', domain: 'Sanat', skillFocus: 'Yaratici ifade', routeKey: 'yaratici-cizim' },
  { id: 'muzik-calar', title: 'Muzik Calar', status: 'music', domain: 'Muzik', skillFocus: 'Sarki ve ritim', routeKey: 'muzik-calar' },
];
