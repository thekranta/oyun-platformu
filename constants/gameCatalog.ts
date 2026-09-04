export type GameCatalogStatus = 'core' | 'secondary' | 'story' | 'creative' | 'music';

export interface GameCatalogItem {
  id: string;
  title: string;
  status: GameCatalogStatus;
  domain: string;
  skillFocus: string;
  routeKey: string;
  notes?: string;
  adaptive?: boolean;   // true => performansa göre uyarlanır (dinamik) zorluk; kartta 📈 rozeti
  /** Keşif Ormanı kategori kimliği — bkz. constants/discoveryForestCategories.ts */
  forestCategory: string;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  { id: 'hafiza', title: 'Hafiza Oyunu', status: 'core', domain: 'Bilissel', skillFocus: 'Bellek ve dikkat', routeKey: 'hafiza', forestCategory: 'ani-kelebegi' },
  { id: 'hafiza-2', title: 'Hayvan Ciftleri', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel bellek (hayvan temasi)', routeKey: 'hafiza-2', forestCategory: 'ani-kelebegi' },
  { id: 'siralama', title: 'Siralama Oyunu', status: 'core', domain: 'Matematik', skillFocus: 'Siralama ve dizilim', routeKey: 'siralama', forestCategory: 'sayi-agaci' },
  { id: 'eksik-sayi-bul', title: 'Eksik Sayi Bul', status: 'core', domain: 'Matematik', skillFocus: 'Sayi farkindaligi', routeKey: 'eksik-sayi-bul', forestCategory: 'sayi-agaci' },
  { id: 'eksik-sayi-bul-2', title: 'Eksik Sayi Bul 6-10', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi farkindaligi (6-10)', routeKey: 'eksik-sayi-bul-2', forestCategory: 'sayi-agaci' },
  { id: 'akilli-sayi-avi', title: 'Akilli Sayi Avi', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi-nicelik (uyarlanir zorluk)', routeKey: 'akilli-sayi-avi', adaptive: true, forestCategory: 'sayi-agaci' },
  { id: 'akilli-miktar', title: 'Akilli Miktar', status: 'secondary', domain: 'Matematik', skillFocus: 'Nicelik karsilastirma (uyarlanir zorluk)', routeKey: 'akilli-miktar', adaptive: true, forestCategory: 'sayi-agaci' },
  { id: 'akilli-oruntu', title: 'Akilli Oruntu', status: 'secondary', domain: 'Bilissel', skillFocus: 'Oruntu / cikarim (uyarlanir zorluk)', routeKey: 'akilli-oruntu', adaptive: true, forestCategory: 'bulmaca-yolu' },
  { id: 'akilli-eksik-sayi', title: 'Akilli Eksik Sayi', status: 'secondary', domain: 'Matematik', skillFocus: 'Eksik parca / sayi dizisi (uyarlanir zorluk)', routeKey: 'akilli-eksik-sayi', adaptive: true, forestCategory: 'sayi-agaci' },
  { id: 'akilli-siralama', title: 'Akilli Siralama', status: 'secondary', domain: 'Matematik', skillFocus: 'Azdan coga siralama (uyarlanir zorluk)', routeKey: 'akilli-siralama', adaptive: true, forestCategory: 'sayi-agaci' },
  { id: 'akilli-toplama', title: 'Akilli Toplama', status: 'secondary', domain: 'Matematik', skillFocus: 'Toplama / problem cozme (uyarlanir zorluk)', routeKey: 'akilli-toplama', adaptive: true, forestCategory: 'sayi-agaci' },
  { id: 'akilli-farkli', title: 'Akilli Farkli', status: 'secondary', domain: 'Bilissel', skillFocus: 'Farkli olani ayirt etme (uyarlanir zorluk)', routeKey: 'akilli-farkli', adaptive: true, forestCategory: 'dikkat-dalgasi' },
  { id: 'akilli-cikarma', title: 'Akilli Cikarma', status: 'secondary', domain: 'Matematik', skillFocus: 'Cikarma / problem cozme (uyarlanir zorluk)', routeKey: 'akilli-cikarma', adaptive: true, forestCategory: 'sayi-agaci' },
  { id: 'akilli-hafiza', title: 'Akilli Hafiza', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel bellek / eslestirme (uyarlanir zorluk)', routeKey: 'akilli-hafiza', adaptive: true, forestCategory: 'ani-kelebegi' },
  { id: 'akilli-harf', title: 'Akilli Harf', status: 'secondary', domain: 'Dil', skillFocus: 'Harf bicimi ayirt etme (uyarlanir zorluk)', routeKey: 'akilli-harf', adaptive: true, forestCategory: 'harf-cicegi' },
  { id: 'akilli-siniflandir', title: 'Akilli Siniflandir', status: 'secondary', domain: 'Bilissel', skillFocus: 'Siniflandirma (uyarlanir zorluk)', routeKey: 'akilli-siniflandir', adaptive: true, forestCategory: 'bulmaca-yolu' },
  { id: 'akilli-once-sonra', title: 'Akilli Once-Sonra', status: 'secondary', domain: 'Bilissel', skillFocus: 'Olaylari sirala (uyarlanir zorluk)', routeKey: 'akilli-once-sonra', adaptive: true, forestCategory: 'bulmaca-yolu' },
  { id: 'dunya-bayraklari', title: 'Dunya Bayraklari', status: 'secondary', domain: 'Kultur', skillFocus: 'Kulturel farkindalik (Montessori) - dunya bayraklari', routeKey: 'dunya-bayraklari', forestCategory: 'kesif-kucaklamasi' },
  { id: 'dunya-selamlari', title: 'Dunya Selamlari', status: 'secondary', domain: 'Kultur', skillFocus: 'Kulturel farkindalik (Montessori) - dunya selamlari', routeKey: 'dunya-selamlari', forestCategory: 'kesif-kucaklamasi' },
  { id: 'dunya-yapilari', title: 'Dunya Yapilari', status: 'secondary', domain: 'Kultur', skillFocus: 'Kulturel farkindalik (Montessori) - dunya yapilari', routeKey: 'dunya-yapilari', forestCategory: 'kesif-kucaklamasi' },
  { id: 'dunya-yiyecekleri', title: 'Dunya Yiyecekleri', status: 'secondary', domain: 'Kultur', skillFocus: 'Kulturel farkindalik (Montessori) - dunya yiyecekleri', routeKey: 'dunya-yiyecekleri', forestCategory: 'kesif-kucaklamasi' },
  { id: 'bayrak-boya', title: 'Bayrak Boya', status: 'creative', domain: 'Kultur', skillFocus: 'Boyama + kulturel farkindalik (bayraklar)', routeKey: 'bayrak-boya', forestCategory: 'renk-cayiri' },
  { id: 'gruplama', title: 'Gruplama Oyunu', status: 'core', domain: 'Bilissel', skillFocus: 'Siniflandirma', routeKey: 'gruplama', forestCategory: 'bulmaca-yolu' },
  { id: 'mutfak-dedektifi', title: 'Mutfak Dedektifi', status: 'core', domain: 'Bilissel', skillFocus: 'Siniflandirma ve gorsel dikkat', routeKey: 'mutfak-dedektifi', forestCategory: 'dikkat-dalgasi' },
  { id: 'miktar-karsilastirma', title: 'Miktar Karsilastirma', status: 'core', domain: 'Matematik', skillFocus: 'Miktar algisi', routeKey: 'miktar-karsilastirma', forestCategory: 'sayi-agaci' },
  { id: 'miktar-avcisi-2', title: 'Deniz Avcisi', status: 'secondary', domain: 'Matematik', skillFocus: 'Miktar algisi (deniz temasi)', routeKey: 'miktar-avcisi-2', forestCategory: 'sayi-agaci' },
  { id: 'sayi-komsulari', title: 'Sayi Komsulari', status: 'core', domain: 'Matematik', skillFocus: 'Sayi iliskileri', routeKey: 'sayi-komsulari', forestCategory: 'sayi-agaci' },

  { id: 'diziyi-tamamla', title: 'Diziyi Tamamla', status: 'secondary', domain: 'Bilissel', skillFocus: 'Oruntu', routeKey: 'diziyi-tamamla', forestCategory: 'bulmaca-yolu' },
  { id: 'diziyi-tamamla-2', title: 'Oruntu Ustasi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Oruntu (ileri seviye)', routeKey: 'diziyi-tamamla-2', forestCategory: 'bulmaca-yolu' },
  { id: 'bunu-soyle', title: 'Bunu Soyle', status: 'secondary', domain: 'Dil', skillFocus: 'Sozlu ifade', routeKey: 'bunu-soyle', forestCategory: 'harf-cicegi' },
  { id: 'kodlama', title: 'Kodlama Oyunu', status: 'secondary', domain: 'Bilissel', skillFocus: 'Algoritmik dusunme', routeKey: 'kodlama', forestCategory: 'bulmaca-yolu' },
  { id: 'rakam-yazma', title: 'Rakam Yazma', status: 'secondary', domain: 'Matematik', skillFocus: 'Rakam tanima ve yazma', routeKey: 'rakam-yazma', forestCategory: 'sayi-agaci' },
  { id: 'rakam-yazma-2', title: 'Rakam Yazma 6-10', status: 'secondary', domain: 'Matematik', skillFocus: 'Rakam tanima ve yazma (6-10)', routeKey: 'rakam-yazma-2', forestCategory: 'sayi-agaci' },
  { id: 'kutuyu-bul', title: 'Kutuyu Bul', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel takip', routeKey: 'kutuyu-bul', forestCategory: 'dikkat-dalgasi' },
  { id: 'sayilari-birlestir', title: 'Sayilari Birlestir', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi sirasi', routeKey: 'sayilari-birlestir', forestCategory: 'sayi-agaci' },
  { id: 'yapboz', title: 'Yapboz Oyunu', status: 'secondary', domain: 'Bilissel', skillFocus: 'Parca-butun iliskisi', routeKey: 'yapboz', forestCategory: 'bulmaca-yolu' },
  { id: 'golge-dedektifi', title: 'Golge Dedektifi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel eslestirme', routeKey: 'golge-dedektifi', forestCategory: 'dikkat-dalgasi' },
  { id: 'golge-dedektifi-2', title: 'Golge Dedektifi: Uzman', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel eslestirme (ileri seviye)', routeKey: 'golge-dedektifi-2', forestCategory: 'dikkat-dalgasi' },
  { id: 'onluk-cerceve', title: 'Onluk Cerceve', status: 'secondary', domain: 'Matematik', skillFocus: 'Onluk sistem farkindaligi', routeKey: 'onluk-cerceve', forestCategory: 'sayi-agaci' },
  { id: 'onluk-cerceve-2', title: 'Yildiz Cercevesi', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi kompozisyonu (6-10, yildiz temasi)', routeKey: 'onluk-cerceve-2', forestCategory: 'sayi-agaci' },
  { id: 'tarti-dengesi', title: 'Tarti Dengesi', status: 'secondary', domain: 'Matematik', skillFocus: 'Denge ve karsilastirma', routeKey: 'tarti-dengesi', forestCategory: 'denge-dalgasi' },
  { id: 'sihirli-siseler', title: 'Sihirli Siseler', status: 'secondary', domain: 'Bilissel', skillFocus: 'Dikkat ve problem cozme', routeKey: 'sihirli-siseler', forestCategory: 'dikkat-dalgasi' },
  { id: 'sihirli-tuval', title: 'Sihirli Tuval', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel dikkat', routeKey: 'sihirli-tuval', forestCategory: 'dikkat-dalgasi' },
  { id: 'uzay-bloklari', title: 'Uzay Bloklari', status: 'secondary', domain: 'Bilissel', skillFocus: 'Uzamsal dusunme', routeKey: 'uzay-bloklari', forestCategory: 'bulmaca-yolu' },
  { id: 'renkli-baglantalar', title: 'Renkli Baglantalar', status: 'secondary', domain: 'Bilissel', skillFocus: 'Eslestirme ve dikkat', routeKey: 'renkli-baglantalar', forestCategory: 'dikkat-dalgasi' },

  { id: 'ceviz-macera', title: 'Ceviz Macera', status: 'story', domain: 'Sosyal-duygusal', skillFocus: 'Secim ve sonuc', routeKey: 'ceviz-macera', forestCategory: 'masal-kovugu' },
  { id: 'aile-sepeti-macerasi', title: 'Aile Sepeti Macerasi', status: 'story', domain: 'Sosyal-duygusal', skillFocus: 'Aile ve is birligi', routeKey: 'aile-sepeti-macerasi', forestCategory: 'masal-kovugu' },
  { id: 'adalet-hikayesi', title: 'Adalet Hikayesi', status: 'story', domain: 'Sosyal-duygusal', skillFocus: 'Adalet ve paylasim', routeKey: 'adalet-hikayesi', forestCategory: 'masal-kovugu' },
  { id: 'sevgi-hikayesi', title: 'Kucuk Kalpler', status: 'story', domain: 'Sosyal-duygusal', skillFocus: 'Sevgi ve empati', routeKey: 'sevgi-hikayesi', forestCategory: 'masal-kovugu' },
  { id: 'duygu-yuzleri', title: 'Duygu Yuzleri', status: 'secondary', domain: 'Sosyal-duygusal', skillFocus: 'Duygulari tanima', routeKey: 'duygu-yuzleri', forestCategory: 'duygu-pinari' },

  { id: 'renk-sepetleri', title: 'Renk Sepetleri', status: 'secondary', domain: 'Kavram', skillFocus: 'Renkleri ayirt etme', routeKey: 'renk-sepetleri', forestCategory: 'sekil-goleti' },
  { id: 'zitlari-eslestir', title: 'Zitlari Eslestir', status: 'secondary', domain: 'Kavram', skillFocus: 'Zit kavramlar', routeKey: 'zitlari-eslestir', forestCategory: 'bulmaca-yolu' },
  { id: 'sekil-treni', title: 'Sekil Treni', status: 'secondary', domain: 'Kavram', skillFocus: 'Geometrik sekiller', routeKey: 'sekil-treni', forestCategory: 'sekil-goleti' },
  { id: 'ayi-ailesi', title: 'Ayi Ailesi', status: 'secondary', domain: 'Kavram', skillFocus: 'Boyut siralama', routeKey: 'ayi-ailesi', forestCategory: 'sekil-goleti' },
  { id: 'ciftlikte-sayalim', title: 'Ciftlikte Sayalim', status: 'secondary', domain: 'Kavram', skillFocus: 'Sayma (1-5)', routeKey: 'ciftlikte-sayalim', forestCategory: 'sayi-agaci' },
  { id: 'ayni-farkli', title: 'Ayni mi Farkli mi', status: 'secondary', domain: 'Kavram', skillFocus: 'Ayni/farkli ayirt etme', routeKey: 'ayni-farkli', forestCategory: 'dikkat-dalgasi' },
  { id: 'hangisi-farkli', title: 'Hangisi Farkli', status: 'secondary', domain: 'Kavram', skillFocus: 'Gruba uymayani bulma', routeKey: 'hangisi-farkli', forestCategory: 'dikkat-dalgasi' },
  { id: 'buyuk-orta-kucuk', title: 'Buyuk-Orta-Kucuk', status: 'secondary', domain: 'Kavram', skillFocus: 'Boyut ayirt etme', routeKey: 'buyuk-orta-kucuk', forestCategory: 'sekil-goleti' },
  { id: 'neredeyim', title: 'Neredeyim', status: 'secondary', domain: 'Kavram', skillFocus: 'Konum kavramlari', routeKey: 'neredeyim', forestCategory: 'kesif-kucaklamasi' },
  { id: 'once-sonra', title: 'Once-Sonra', status: 'secondary', domain: 'Kavram', skillFocus: 'Zaman sirasi', routeKey: 'once-sonra', forestCategory: 'bulmaca-yolu' },
  { id: 'sayiyi-bul', title: 'Sayiyi Bul', status: 'secondary', domain: 'Kavram', skillFocus: 'Rakam-nicelik', routeKey: 'sayiyi-bul', forestCategory: 'sayi-agaci' },
  { id: 'en-uzun', title: 'En Uzun Hangisi', status: 'secondary', domain: 'Kavram', skillFocus: 'Uzunluk karsilastirma', routeKey: 'en-uzun', forestCategory: 'sekil-goleti' },
  { id: 'dogru-kutu', title: 'Dogru Kutu', status: 'secondary', domain: 'Kavram', skillFocus: 'Kategoriye ayirma', routeKey: 'dogru-kutu', forestCategory: 'bulmaca-yolu' },
  { id: 'ikizleri-bul', title: 'Ikizleri Bul', status: 'secondary', domain: 'Kavram', skillFocus: 'Ayni olani esleme', routeKey: 'ikizleri-bul', forestCategory: 'dikkat-dalgasi' },
  { id: 'ne-ise-yarar', title: 'Ne Ise Yarar', status: 'secondary', domain: 'Kavram', skillFocus: 'Iliskili esleme', routeKey: 'ne-ise-yarar', forestCategory: 'bulmaca-yolu' },
  { id: 'renk-oruntusu', title: 'Renk Oruntusu', status: 'secondary', domain: 'Kavram', skillFocus: 'Oruntu surdurme', routeKey: 'renk-oruntusu', forestCategory: 'bulmaca-yolu' },
  { id: 'nokta-say', title: 'Nokta Say', status: 'secondary', domain: 'Kavram', skillFocus: 'Sayma (nokta)', routeKey: 'nokta-say', forestCategory: 'sayi-agaci' },
  { id: 'canli-cansiz', title: 'Canli mi Cansiz mi', status: 'secondary', domain: 'Kavram', skillFocus: 'Canli/cansiz', routeKey: 'canli-cansiz', forestCategory: 'kesif-kucaklamasi' },
  { id: 'yuzer-batar', title: 'Yuzer mi Batar mi', status: 'secondary', domain: 'Kavram', skillFocus: 'Tahmin (yuzer/batar)', routeKey: 'yuzer-batar', forestCategory: 'kesif-kucaklamasi' },
  { id: 'duygu-eslestir', title: 'Duygu Eslestir', status: 'secondary', domain: 'Kavram', skillFocus: 'Ayni duyguyu esleme', routeKey: 'duygu-eslestir', forestCategory: 'duygu-pinari' },
  { id: 'sirayi-hatirla', title: 'Sirayi Hatirla', status: 'secondary', domain: 'Kavram', skillFocus: 'Calisma bellegi', routeKey: 'sirayi-hatirla', forestCategory: 'ani-kelebegi' },
  { id: 'agir-hafif', title: 'En Agir Hangisi', status: 'secondary', domain: 'Kavram', skillFocus: 'Agirlik karsilastirma', routeKey: 'agir-hafif', forestCategory: 'kesif-kucaklamasi' },
  { id: 'gunduz-gece', title: 'Gunduz mu Gece mi', status: 'secondary', domain: 'Kavram', skillFocus: 'Zaman (gunduz/gece)', routeKey: 'gunduz-gece', forestCategory: 'kesif-kucaklamasi' },
  { id: 'kac-oldu', title: 'Kac Oldu', status: 'secondary', domain: 'Kavram', skillFocus: 'Toplama (5e kadar)', routeKey: 'kac-oldu', forestCategory: 'sayi-agaci' },
  { id: 'renkleri-karistir', title: 'Renkleri Karistir', status: 'secondary', domain: 'Kavram', skillFocus: 'Renk karisimi', routeKey: 'renkleri-karistir', forestCategory: 'renk-cayiri' },
  { id: 'sekil-deligi', title: 'Sekil Deligi', status: 'secondary', domain: 'Kavram', skillFocus: 'Sekil esleme', routeKey: 'sekil-deligi', forestCategory: 'sekil-goleti' },
  { id: 'az-cok-sirala', title: 'Az Cok Sirala', status: 'secondary', domain: 'Kavram', skillFocus: 'Nicelik siralama', routeKey: 'az-cok-sirala', forestCategory: 'sayi-agaci' },

  { id: 'ilk-harf', title: 'Ilk Harf', status: 'secondary', domain: 'Dil', skillFocus: 'Ilk ses / harf-ses iliskisi', routeKey: 'ilk-harf', forestCategory: 'harf-cicegi' },
  { id: 'iyilik-yap', title: 'Iyilik Yap', status: 'secondary', domain: 'Sosyal-duygusal', skillFocus: 'Empati ve nezaket', routeKey: 'iyilik-yap', forestCategory: 'arkadas-cicegi' },
  { id: 'ne-degisti', title: 'Ne Degisti', status: 'secondary', domain: 'Bilissel', skillFocus: 'Dikkat ve bellek', routeKey: 'ne-degisti', forestCategory: 'dikkat-dalgasi' },
  { id: 'kac-kaldi', title: 'Kac Kaldi', status: 'secondary', domain: 'Matematik', skillFocus: 'Cikarma (5e kadar)', routeKey: 'kac-kaldi', forestCategory: 'sayi-agaci' },
  { id: 'buyuk-sayi', title: 'Buyuk Sayi Hangisi', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi karsilastirma', routeKey: 'buyuk-sayi', forestCategory: 'sayi-agaci' },
  { id: 'cizim-sayfalari', title: 'Cizim Sayfalari', status: 'creative', domain: 'Sanat', skillFocus: 'Kilavuzlu cizgi calismasi', routeKey: 'cizim-sayfalari', forestCategory: 'renk-cayiri' },
  { id: 'simetri-cizim', title: 'Simetri Cizim', status: 'creative', domain: 'Sanat', skillFocus: 'Aynali cizim / simetri', routeKey: 'simetri-cizim', forestCategory: 'renk-cayiri' },
  { id: 'damga-sanati', title: 'Damga Sanati', status: 'creative', domain: 'Sanat', skillFocus: 'Damga / kompozisyon', routeKey: 'damga-sanati', forestCategory: 'renk-cayiri' },
  { id: 'boyama-kitabi', title: 'Boyama Kitabi', status: 'creative', domain: 'Sanat', skillFocus: 'Bolge boyama', routeKey: 'boyama-kitabi', forestCategory: 'renk-cayiri' },
  { id: 'nokta-birlestir', title: 'Nokta Birlestir', status: 'creative', domain: 'Sanat', skillFocus: 'Nokta birlestirme / sayi sirasi', routeKey: 'nokta-birlestir', forestCategory: 'renk-cayiri' },
  { id: 'sayi-boya', title: 'Sayi-Boya', status: 'creative', domain: 'Sanat', skillFocus: 'Sayi-renk esleme boyama', routeKey: 'sayi-boya', forestCategory: 'renk-cayiri' },
  { id: 'mandala', title: 'Mandala', status: 'creative', domain: 'Sanat', skillFocus: 'Radyal simetri cizim', routeKey: 'mandala', forestCategory: 'renk-cayiri' },
  { id: 'nokta-boyama', title: 'Nokta Boyama', status: 'creative', domain: 'Sanat', skillFocus: 'Pointillism', routeKey: 'nokta-boyama', forestCategory: 'renk-cayiri' },
  { id: 'cizimi-canlandir', title: 'Cizimini Canlandir', status: 'creative', domain: 'Sanat', skillFocus: 'Cizim + canlandirma', routeKey: 'cizimi-canlandir', forestCategory: 'renk-cayiri' },
  { id: 'yuz-yap', title: 'Yuz Yap', status: 'creative', domain: 'Sanat', skillFocus: 'Kolaj / karakter', routeKey: 'yuz-yap', forestCategory: 'renk-cayiri' },
  { id: 'yarisini-tamamla', title: 'Yarisini Tamamla', status: 'creative', domain: 'Sanat', skillFocus: 'Simetrik tamamlama', routeKey: 'yarisini-tamamla', forestCategory: 'renk-cayiri' },
  { id: 'kum-boyasi', title: 'Kum Boyasi', status: 'creative', domain: 'Sanat', skillFocus: 'Duyusal boyama', routeKey: 'kum-boyasi', forestCategory: 'renk-cayiri' },
  { id: 'adim-adim', title: 'Adim Adim Cizim', status: 'creative', domain: 'Sanat', skillFocus: 'Rehberli cizim', routeKey: 'adim-adim', forestCategory: 'renk-cayiri' },
  { id: 'sayi-boya-2', title: 'Sayi-Boya 2', status: 'creative', domain: 'Sanat', skillFocus: 'Detayli sayi-boya', routeKey: 'sayi-boya-2', forestCategory: 'renk-cayiri' },

  { id: 'vucudum', title: 'Vucudum', status: 'secondary', domain: 'Saglik', skillFocus: 'Beden farkindaligi', routeKey: 'vucudum', forestCategory: 'can-elmasi' },
  { id: 'duyularimiz', title: 'Duyularimiz', status: 'secondary', domain: 'Saglik', skillFocus: 'Duyu organlari', routeKey: 'duyularimiz', forestCategory: 'can-elmasi' },
  { id: 'saglikli-yiyecek', title: 'Saglikli mi', status: 'secondary', domain: 'Saglik', skillFocus: 'Saglikli beslenme', routeKey: 'saglikli-yiyecek', forestCategory: 'can-elmasi' },
  { id: 'temizlik-zamani', title: 'Temizlik Zamani', status: 'secondary', domain: 'Saglik', skillFocus: 'Temizlik ve oz bakim', routeKey: 'temizlik-zamani', forestCategory: 'can-elmasi' },
  { id: 'guvende-kal', title: 'Guvende Kal', status: 'secondary', domain: 'Saglik', skillFocus: 'Guvenlik', routeKey: 'guvende-kal', forestCategory: 'can-elmasi' },
  { id: 'hava-kiyafet', title: 'Hava ve Kiyafet', status: 'secondary', domain: 'Bilissel', skillFocus: 'Hava-gunluk yasam', routeKey: 'hava-kiyafet', forestCategory: 'kesif-kucaklamasi' },

  { id: 'labirent', title: 'Labirent', status: 'secondary', domain: 'Bilissel', skillFocus: 'Problem cozme / yol bulma', routeKey: 'labirent', forestCategory: 'bulmaca-yolu' },
  { id: 'hayvan-evi', title: 'Hayvan Evi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Yasam alani', routeKey: 'hayvan-evi', forestCategory: 'kesif-kucaklamasi' },
  { id: 'meslekler', title: 'Meslekler', status: 'secondary', domain: 'Kavram', skillFocus: 'Meslek-arac iliskisi', routeKey: 'meslekler', forestCategory: 'kesif-kucaklamasi' },
  { id: 'buyuyunce', title: 'Buyuyunce Ne Olur', status: 'secondary', domain: 'Kavram', skillFocus: 'Yasam dongusu', routeKey: 'buyuyunce', forestCategory: 'kesif-kucaklamasi' },
  { id: 'geri-donusum', title: 'Geri Donusum', status: 'secondary', domain: 'Kavram', skillFocus: 'Malzeme siniflandirma', routeKey: 'geri-donusum', forestCategory: 'kesif-kucaklamasi' },
  { id: 'esit-paylastir', title: 'Esit Paylastir', status: 'secondary', domain: 'Matematik', skillFocus: 'Esit paylasim', routeKey: 'esit-paylastir', forestCategory: 'sayi-agaci' },

  { id: 'araclar', title: 'Araclar Nerede Gider', status: 'secondary', domain: 'Bilissel', skillFocus: 'Tasit siniflandirma', routeKey: 'araclar', forestCategory: 'bulmaca-yolu' },
  { id: 'ne-yer', title: 'Ne Yer', status: 'secondary', domain: 'Bilissel', skillFocus: 'Hayvan-besin', routeKey: 'ne-yer', forestCategory: 'kesif-kucaklamasi' },
  { id: 'ne-nerede', title: 'Ne Nerede', status: 'secondary', domain: 'Bilissel', skillFocus: 'Esya-oda', routeKey: 'ne-nerede', forestCategory: 'bulmaca-yolu' },
  { id: 'gunum', title: 'Gunum', status: 'secondary', domain: 'Kavram', skillFocus: 'Gunluk zaman sirasi', routeKey: 'gunum', forestCategory: 'bulmaca-yolu' },
  { id: 'renk-tonlari', title: 'Renk Tonlari', status: 'secondary', domain: 'Kavram', skillFocus: 'Ton siralama', routeKey: 'renk-tonlari', forestCategory: 'renk-cayiri' },
  { id: 'sicak-soguk', title: 'Sicak mi Soguk mu', status: 'secondary', domain: 'Kavram', skillFocus: 'Sicaklik', routeKey: 'sicak-soguk', forestCategory: 'kesif-kucaklamasi' },

  // ---------- Yeni oyunlar (Turkce / Fen - tap) ----------
  { id: 'kafiye-bahcesi', title: 'Kafiye Bahcesi', status: 'secondary', domain: 'Dil', skillFocus: 'Kafiye / ses farkindaligi', routeKey: 'kafiye-bahcesi', forestCategory: 'harf-cicegi' },
  { id: 'resimde-ne-ters', title: 'Resimde Ne Ters', status: 'secondary', domain: 'Dil', skillFocus: 'Gorsel dikkat / uyumsuzu bulma', routeKey: 'resimde-ne-ters', forestCategory: 'dikkat-dalgasi' },
  { id: 'sonra-ne-olur', title: 'Sonra Ne Olur', status: 'secondary', domain: 'Bilissel', skillFocus: 'Neden-sonuc / tahmin', routeKey: 'sonra-ne-olur', forestCategory: 'bulmaca-yolu' },

  // ---------- Yeni oyunlar (Sosyal / Matematik - tap) ----------
  { id: 'minik-market', title: 'Minik Market', status: 'secondary', domain: 'Kavram', skillFocus: 'Para-alisveris / ihtiyac (pratik yasam)', routeKey: 'minik-market', forestCategory: 'sayi-agaci' },
  { id: 'hazine-haritasi', title: 'Hazine Haritasi', status: 'secondary', domain: 'Kavram', skillFocus: 'Kroki/harita okuma / uzamsal yon', routeKey: 'hazine-haritasi', forestCategory: 'kesif-kucaklamasi' },
  { id: 'grafik-ustasi', title: 'Grafik Ustasi', status: 'secondary', domain: 'Matematik', skillFocus: 'Veri okuma / basit grafik', routeKey: 'grafik-ustasi', forestCategory: 'bulmaca-yolu' },

  // ---------- Yeni oyunlar (Turkce / Fen / Sosyal - tap) ----------
  { id: 'resimde-ne-oluyor', title: 'Resimde Ne Oluyor', status: 'secondary', domain: 'Dil', skillFocus: 'Gorsel okuma / resimden anlam uretme', routeKey: 'resimde-ne-oluyor', forestCategory: 'masal-kovugu' },
  { id: 'iz-dedektifi', title: 'Iz Dedektifi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Bilimsel cikarim / iz-canli iliskisi', routeKey: 'iz-dedektifi', forestCategory: 'kesif-kucaklamasi' },
  { id: 'mevsim-bahcesi', title: 'Mevsim Bahcesi', status: 'secondary', domain: 'Kavram', skillFocus: 'Mevsim / zaman kavrami', routeKey: 'mevsim-bahcesi', forestCategory: 'kesif-kucaklamasi' },
  { id: 'manzara-kasifi', title: 'Manzara Kasifi', status: 'secondary', domain: 'Kavram', skillFocus: 'Cografi mekan / manzara tanima', routeKey: 'manzara-kasifi', forestCategory: 'kesif-kucaklamasi' },

  // ---------- Yeni oyunlar (Muzik / Sosyal-duygusal / Dil - tap) ----------
  { id: 'muzik-durunca-don', title: 'Muzik Durunca Don', status: 'secondary', domain: 'Muzik', skillFocus: 'Muzik ve hareket / dur-basla oz-duzenleme', routeKey: 'muzik-durunca-don', forestCategory: 'ritim-kelebegi' },
  { id: 'sakinlesme-bahcesi', title: 'Sakinlesme Bahcesi', status: 'secondary', domain: 'Sosyal-duygusal', skillFocus: 'Oz duzenleme / sakinlesme stratejisi', routeKey: 'sakinlesme-bahcesi', forestCategory: 'duygu-pinari' },
  { id: 'kucuk-anlatici', title: 'Kucuk Anlatici', status: 'secondary', domain: 'Dil', skillFocus: 'Sozlu anlatim / oyku siralama', routeKey: 'kucuk-anlatici', forestCategory: 'masal-kovugu' },

  // ---------- Yeni oyunlar (Sanat / Muzik / Sosyal / Hareket ve Saglik - tap) ----------
  { id: 'sanat-gozlugu', title: 'Sanat Gozlugu', status: 'secondary', domain: 'Sanat', skillFocus: 'Temel sanat kavramlari (cizgi/sekil/renk)', routeKey: 'sanat-gozlugu', forestCategory: 'renk-cayiri' },
  { id: 'tabloda-ne-var', title: 'Tabloda Ne Var?', status: 'secondary', domain: 'Sanat', skillFocus: 'Sanat eseri inceleme / gorsel cozumleme', routeKey: 'tabloda-ne-var', forestCategory: 'renk-cayiri' },
  { id: 'renk-atolyesi', title: 'Renk Atolyesi', status: 'creative', domain: 'Sanat', skillFocus: 'Sanat etkinligi / motif ve renk uygulama', routeKey: 'renk-atolyesi', forestCategory: 'renk-cayiri' },
  { id: 'hangi-calgi-caldi', title: 'Hangi Calgi Caldi?', status: 'secondary', domain: 'Muzik', skillFocus: 'Ses kaynagini ayirt etme (tini)', routeKey: 'hangi-calgi-caldi', forestCategory: 'ritim-kelebegi' },
  { id: 'ses-nasil', title: 'Ses Nasil?', status: 'secondary', domain: 'Muzik', skillFocus: 'Muziksel ozellikler (tempo/gurluk/ton)', routeKey: 'ses-nasil', forestCategory: 'ritim-kelebegi' },
  { id: 'davul-ustasi', title: 'Davul Ustasi', status: 'secondary', domain: 'Muzik', skillFocus: 'Ritim tekrari / muziksel calma', routeKey: 'davul-ustasi', forestCategory: 'ritim-kelebegi' },
  { id: 'odamin-krokisi', title: 'Odamin Krokisi', status: 'secondary', domain: 'Kavram', skillFocus: 'Kendi krokisini olusturma / mekansal temsil', routeKey: 'odamin-krokisi', forestCategory: 'kesif-kucaklamasi' },
  { id: 'hayvan-jimnastigi', title: 'Hayvan Jimnastigi', status: 'secondary', domain: 'Saglik', skillFocus: 'Buyuk kas becerileri / hareket taklidi', routeKey: 'hayvan-jimnastigi', forestCategory: 'kosu-kirazi' },

  { id: 'yaratici-cizim', title: 'Yaratici Cizim', status: 'creative', domain: 'Sanat', skillFocus: 'Yaratici ifade', routeKey: 'yaratici-cizim', forestCategory: 'renk-cayiri' },
  { id: 'muzik-calar', title: 'Muzik Calar', status: 'music', domain: 'Muzik', skillFocus: 'Sarki ve ritim', routeKey: 'muzik-calar', forestCategory: 'ritim-kelebegi' },
];
