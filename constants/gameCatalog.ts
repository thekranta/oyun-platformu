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
}

export const GAME_CATALOG: GameCatalogItem[] = [
  { id: 'hafiza', title: 'Hafiza Oyunu', status: 'core', domain: 'Bilissel', skillFocus: 'Bellek ve dikkat', routeKey: 'hafiza' },
  { id: 'hafiza-2', title: 'Hayvan Ciftleri', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel bellek (hayvan temasi)', routeKey: 'hafiza-2' },
  { id: 'siralama', title: 'Siralama Oyunu', status: 'core', domain: 'Matematik', skillFocus: 'Siralama ve dizilim', routeKey: 'siralama' },
  { id: 'eksik-sayi-bul', title: 'Eksik Sayi Bul', status: 'core', domain: 'Matematik', skillFocus: 'Sayi farkindaligi', routeKey: 'eksik-sayi-bul' },
  { id: 'eksik-sayi-bul-2', title: 'Eksik Sayi Bul 6-10', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi farkindaligi (6-10)', routeKey: 'eksik-sayi-bul-2' },
  { id: 'akilli-sayi-avi', title: 'Akilli Sayi Avi', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi-nicelik (uyarlanir zorluk)', routeKey: 'akilli-sayi-avi', adaptive: true },
  { id: 'akilli-miktar', title: 'Akilli Miktar', status: 'secondary', domain: 'Matematik', skillFocus: 'Nicelik karsilastirma (uyarlanir zorluk)', routeKey: 'akilli-miktar', adaptive: true },
  { id: 'akilli-oruntu', title: 'Akilli Oruntu', status: 'secondary', domain: 'Bilissel', skillFocus: 'Oruntu / cikarim (uyarlanir zorluk)', routeKey: 'akilli-oruntu', adaptive: true },
  { id: 'akilli-eksik-sayi', title: 'Akilli Eksik Sayi', status: 'secondary', domain: 'Matematik', skillFocus: 'Eksik parca / sayi dizisi (uyarlanir zorluk)', routeKey: 'akilli-eksik-sayi', adaptive: true },
  { id: 'akilli-siralama', title: 'Akilli Siralama', status: 'secondary', domain: 'Matematik', skillFocus: 'Azdan coga siralama (uyarlanir zorluk)', routeKey: 'akilli-siralama', adaptive: true },
  { id: 'akilli-toplama', title: 'Akilli Toplama', status: 'secondary', domain: 'Matematik', skillFocus: 'Toplama / problem cozme (uyarlanir zorluk)', routeKey: 'akilli-toplama', adaptive: true },
  { id: 'akilli-farkli', title: 'Akilli Farkli', status: 'secondary', domain: 'Bilissel', skillFocus: 'Farkli olani ayirt etme (uyarlanir zorluk)', routeKey: 'akilli-farkli', adaptive: true },
  { id: 'akilli-cikarma', title: 'Akilli Cikarma', status: 'secondary', domain: 'Matematik', skillFocus: 'Cikarma / problem cozme (uyarlanir zorluk)', routeKey: 'akilli-cikarma', adaptive: true },
  { id: 'akilli-hafiza', title: 'Akilli Hafiza', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel bellek / eslestirme (uyarlanir zorluk)', routeKey: 'akilli-hafiza', adaptive: true },
  { id: 'akilli-harf', title: 'Akilli Harf', status: 'secondary', domain: 'Dil', skillFocus: 'Harf bicimi ayirt etme (uyarlanir zorluk)', routeKey: 'akilli-harf', adaptive: true },
  { id: 'akilli-siniflandir', title: 'Akilli Siniflandir', status: 'secondary', domain: 'Bilissel', skillFocus: 'Siniflandirma (uyarlanir zorluk)', routeKey: 'akilli-siniflandir', adaptive: true },
  { id: 'akilli-once-sonra', title: 'Akilli Once-Sonra', status: 'secondary', domain: 'Bilissel', skillFocus: 'Olaylari sirala (uyarlanir zorluk)', routeKey: 'akilli-once-sonra', adaptive: true },
  { id: 'dunya-bayraklari', title: 'Dunya Bayraklari', status: 'secondary', domain: 'Kultur', skillFocus: 'Kulturel farkindalik (Montessori) - dunya bayraklari', routeKey: 'dunya-bayraklari' },
  { id: 'dunya-selamlari', title: 'Dunya Selamlari', status: 'secondary', domain: 'Kultur', skillFocus: 'Kulturel farkindalik (Montessori) - dunya selamlari', routeKey: 'dunya-selamlari' },
  { id: 'dunya-yapilari', title: 'Dunya Yapilari', status: 'secondary', domain: 'Kultur', skillFocus: 'Kulturel farkindalik (Montessori) - dunya yapilari', routeKey: 'dunya-yapilari' },
  { id: 'dunya-yiyecekleri', title: 'Dunya Yiyecekleri', status: 'secondary', domain: 'Kultur', skillFocus: 'Kulturel farkindalik (Montessori) - dunya yiyecekleri', routeKey: 'dunya-yiyecekleri' },
  { id: 'bayrak-boya', title: 'Bayrak Boya', status: 'creative', domain: 'Kultur', skillFocus: 'Boyama + kulturel farkindalik (bayraklar)', routeKey: 'bayrak-boya' },
  { id: 'gruplama', title: 'Gruplama Oyunu', status: 'core', domain: 'Bilissel', skillFocus: 'Siniflandirma', routeKey: 'gruplama' },
  { id: 'mutfak-dedektifi', title: 'Mutfak Dedektifi', status: 'core', domain: 'Bilissel', skillFocus: 'Siniflandirma ve gorsel dikkat', routeKey: 'mutfak-dedektifi' },
  { id: 'miktar-karsilastirma', title: 'Miktar Karsilastirma', status: 'core', domain: 'Matematik', skillFocus: 'Miktar algisi', routeKey: 'miktar-karsilastirma' },
  { id: 'miktar-avcisi-2', title: 'Deniz Avcisi', status: 'secondary', domain: 'Matematik', skillFocus: 'Miktar algisi (deniz temasi)', routeKey: 'miktar-avcisi-2' },
  { id: 'sayi-komsulari', title: 'Sayi Komsulari', status: 'core', domain: 'Matematik', skillFocus: 'Sayi iliskileri', routeKey: 'sayi-komsulari' },

  { id: 'diziyi-tamamla', title: 'Diziyi Tamamla', status: 'secondary', domain: 'Bilissel', skillFocus: 'Oruntu', routeKey: 'diziyi-tamamla' },
  { id: 'diziyi-tamamla-2', title: 'Oruntu Ustasi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Oruntu (ileri seviye)', routeKey: 'diziyi-tamamla-2' },
  { id: 'bunu-soyle', title: 'Bunu Soyle', status: 'secondary', domain: 'Dil', skillFocus: 'Sozlu ifade', routeKey: 'bunu-soyle' },
  { id: 'kodlama', title: 'Kodlama Oyunu', status: 'secondary', domain: 'Bilissel', skillFocus: 'Algoritmik dusunme', routeKey: 'kodlama' },
  { id: 'rakam-yazma', title: 'Rakam Yazma', status: 'secondary', domain: 'Matematik', skillFocus: 'Rakam tanima ve yazma', routeKey: 'rakam-yazma' },
  { id: 'rakam-yazma-2', title: 'Rakam Yazma 6-10', status: 'secondary', domain: 'Matematik', skillFocus: 'Rakam tanima ve yazma (6-10)', routeKey: 'rakam-yazma-2' },
  { id: 'kutuyu-bul', title: 'Kutuyu Bul', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel takip', routeKey: 'kutuyu-bul' },
  { id: 'sayilari-birlestir', title: 'Sayilari Birlestir', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi sirasi', routeKey: 'sayilari-birlestir' },
  { id: 'yapboz', title: 'Yapboz Oyunu', status: 'secondary', domain: 'Bilissel', skillFocus: 'Parca-butun iliskisi', routeKey: 'yapboz' },
  { id: 'golge-dedektifi', title: 'Golge Dedektifi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel eslestirme', routeKey: 'golge-dedektifi' },
  { id: 'golge-dedektifi-2', title: 'Golge Dedektifi: Uzman', status: 'secondary', domain: 'Bilissel', skillFocus: 'Gorsel eslestirme (ileri seviye)', routeKey: 'golge-dedektifi-2' },
  { id: 'onluk-cerceve', title: 'Onluk Cerceve', status: 'secondary', domain: 'Matematik', skillFocus: 'Onluk sistem farkindaligi', routeKey: 'onluk-cerceve' },
  { id: 'onluk-cerceve-2', title: 'Yildiz Cercevesi', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi kompozisyonu (6-10, yildiz temasi)', routeKey: 'onluk-cerceve-2' },
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

  { id: 'ilk-harf', title: 'Ilk Harf', status: 'secondary', domain: 'Dil', skillFocus: 'Ilk ses / harf-ses iliskisi', routeKey: 'ilk-harf' },
  { id: 'iyilik-yap', title: 'Iyilik Yap', status: 'secondary', domain: 'Sosyal-duygusal', skillFocus: 'Empati ve nezaket', routeKey: 'iyilik-yap' },
  { id: 'ne-degisti', title: 'Ne Degisti', status: 'secondary', domain: 'Bilissel', skillFocus: 'Dikkat ve bellek', routeKey: 'ne-degisti' },
  { id: 'kac-kaldi', title: 'Kac Kaldi', status: 'secondary', domain: 'Matematik', skillFocus: 'Cikarma (5e kadar)', routeKey: 'kac-kaldi' },
  { id: 'buyuk-sayi', title: 'Buyuk Sayi Hangisi', status: 'secondary', domain: 'Matematik', skillFocus: 'Sayi karsilastirma', routeKey: 'buyuk-sayi' },
  { id: 'cizim-sayfalari', title: 'Cizim Sayfalari', status: 'creative', domain: 'Sanat', skillFocus: 'Kilavuzlu cizgi calismasi', routeKey: 'cizim-sayfalari' },
  { id: 'simetri-cizim', title: 'Simetri Cizim', status: 'creative', domain: 'Sanat', skillFocus: 'Aynali cizim / simetri', routeKey: 'simetri-cizim' },
  { id: 'damga-sanati', title: 'Damga Sanati', status: 'creative', domain: 'Sanat', skillFocus: 'Damga / kompozisyon', routeKey: 'damga-sanati' },
  { id: 'boyama-kitabi', title: 'Boyama Kitabi', status: 'creative', domain: 'Sanat', skillFocus: 'Bolge boyama', routeKey: 'boyama-kitabi' },
  { id: 'nokta-birlestir', title: 'Nokta Birlestir', status: 'creative', domain: 'Sanat', skillFocus: 'Nokta birlestirme / sayi sirasi', routeKey: 'nokta-birlestir' },
  { id: 'sayi-boya', title: 'Sayi-Boya', status: 'creative', domain: 'Sanat', skillFocus: 'Sayi-renk esleme boyama', routeKey: 'sayi-boya' },
  { id: 'mandala', title: 'Mandala', status: 'creative', domain: 'Sanat', skillFocus: 'Radyal simetri cizim', routeKey: 'mandala' },
  { id: 'nokta-boyama', title: 'Nokta Boyama', status: 'creative', domain: 'Sanat', skillFocus: 'Pointillism', routeKey: 'nokta-boyama' },
  { id: 'cizimi-canlandir', title: 'Cizimini Canlandir', status: 'creative', domain: 'Sanat', skillFocus: 'Cizim + canlandirma', routeKey: 'cizimi-canlandir' },
  { id: 'yuz-yap', title: 'Yuz Yap', status: 'creative', domain: 'Sanat', skillFocus: 'Kolaj / karakter', routeKey: 'yuz-yap' },
  { id: 'yarisini-tamamla', title: 'Yarisini Tamamla', status: 'creative', domain: 'Sanat', skillFocus: 'Simetrik tamamlama', routeKey: 'yarisini-tamamla' },
  { id: 'kum-boyasi', title: 'Kum Boyasi', status: 'creative', domain: 'Sanat', skillFocus: 'Duyusal boyama', routeKey: 'kum-boyasi' },
  { id: 'adim-adim', title: 'Adim Adim Cizim', status: 'creative', domain: 'Sanat', skillFocus: 'Rehberli cizim', routeKey: 'adim-adim' },
  { id: 'sayi-boya-2', title: 'Sayi-Boya 2', status: 'creative', domain: 'Sanat', skillFocus: 'Detayli sayi-boya', routeKey: 'sayi-boya-2' },

  { id: 'vucudum', title: 'Vucudum', status: 'secondary', domain: 'Saglik', skillFocus: 'Beden farkindaligi', routeKey: 'vucudum' },
  { id: 'duyularimiz', title: 'Duyularimiz', status: 'secondary', domain: 'Saglik', skillFocus: 'Duyu organlari', routeKey: 'duyularimiz' },
  { id: 'saglikli-yiyecek', title: 'Saglikli mi', status: 'secondary', domain: 'Saglik', skillFocus: 'Saglikli beslenme', routeKey: 'saglikli-yiyecek' },
  { id: 'temizlik-zamani', title: 'Temizlik Zamani', status: 'secondary', domain: 'Saglik', skillFocus: 'Temizlik ve oz bakim', routeKey: 'temizlik-zamani' },
  { id: 'guvende-kal', title: 'Guvende Kal', status: 'secondary', domain: 'Saglik', skillFocus: 'Guvenlik', routeKey: 'guvende-kal' },
  { id: 'hava-kiyafet', title: 'Hava ve Kiyafet', status: 'secondary', domain: 'Bilissel', skillFocus: 'Hava-gunluk yasam', routeKey: 'hava-kiyafet' },

  { id: 'labirent', title: 'Labirent', status: 'secondary', domain: 'Bilissel', skillFocus: 'Problem cozme / yol bulma', routeKey: 'labirent' },
  { id: 'hayvan-evi', title: 'Hayvan Evi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Yasam alani', routeKey: 'hayvan-evi' },
  { id: 'meslekler', title: 'Meslekler', status: 'secondary', domain: 'Kavram', skillFocus: 'Meslek-arac iliskisi', routeKey: 'meslekler' },
  { id: 'buyuyunce', title: 'Buyuyunce Ne Olur', status: 'secondary', domain: 'Kavram', skillFocus: 'Yasam dongusu', routeKey: 'buyuyunce' },
  { id: 'geri-donusum', title: 'Geri Donusum', status: 'secondary', domain: 'Kavram', skillFocus: 'Malzeme siniflandirma', routeKey: 'geri-donusum' },
  { id: 'esit-paylastir', title: 'Esit Paylastir', status: 'secondary', domain: 'Matematik', skillFocus: 'Esit paylasim', routeKey: 'esit-paylastir' },

  { id: 'araclar', title: 'Araclar Nerede Gider', status: 'secondary', domain: 'Bilissel', skillFocus: 'Tasit siniflandirma', routeKey: 'araclar' },
  { id: 'ne-yer', title: 'Ne Yer', status: 'secondary', domain: 'Bilissel', skillFocus: 'Hayvan-besin', routeKey: 'ne-yer' },
  { id: 'ne-nerede', title: 'Ne Nerede', status: 'secondary', domain: 'Bilissel', skillFocus: 'Esya-oda', routeKey: 'ne-nerede' },
  { id: 'gunum', title: 'Gunum', status: 'secondary', domain: 'Kavram', skillFocus: 'Gunluk zaman sirasi', routeKey: 'gunum' },
  { id: 'renk-tonlari', title: 'Renk Tonlari', status: 'secondary', domain: 'Kavram', skillFocus: 'Ton siralama', routeKey: 'renk-tonlari' },
  { id: 'sicak-soguk', title: 'Sicak mi Soguk mu', status: 'secondary', domain: 'Kavram', skillFocus: 'Sicaklik', routeKey: 'sicak-soguk' },

  // ---------- Yeni oyunlar (Turkce / Fen - tap) ----------
  // Maarif alani Turkce/Fen; menu domaini platform desenine gore Dil/Bilissel (bkz. akilli-harf=Dil, akilli-siniflandir=Bilissel)
  { id: 'kafiye-bahcesi', title: 'Kafiye Bahcesi', status: 'secondary', domain: 'Dil', skillFocus: 'Kafiye / ses farkindaligi', routeKey: 'kafiye-bahcesi' },
  { id: 'resimde-ne-ters', title: 'Resimde Ne Ters', status: 'secondary', domain: 'Dil', skillFocus: 'Gorsel dikkat / uyumsuzu bulma', routeKey: 'resimde-ne-ters' },
  { id: 'sonra-ne-olur', title: 'Sonra Ne Olur', status: 'secondary', domain: 'Bilissel', skillFocus: 'Neden-sonuc / tahmin', routeKey: 'sonra-ne-olur' },

  // ---------- Yeni oyunlar (Sosyal / Matematik - tap) ----------
  // Maarif alani Sosyal/Matematik; menu domaini platform desenine gore Kavram/Matematik
  // (bkz. neredeyim=uzamsal SAB->Kavram, meslekler SAB->Kavram; grafik-ustasi=veri->Matematik)
  { id: 'minik-market', title: 'Minik Market', status: 'secondary', domain: 'Kavram', skillFocus: 'Para-alisveris / ihtiyac (pratik yasam)', routeKey: 'minik-market' },
  { id: 'hazine-haritasi', title: 'Hazine Haritasi', status: 'secondary', domain: 'Kavram', skillFocus: 'Kroki/harita okuma / uzamsal yon', routeKey: 'hazine-haritasi' },
  { id: 'grafik-ustasi', title: 'Grafik Ustasi', status: 'secondary', domain: 'Matematik', skillFocus: 'Veri okuma / basit grafik', routeKey: 'grafik-ustasi' },

  // ---------- Yeni oyunlar (Turkce / Fen / Sosyal - tap) ----------
  // Maarif alani Turkce/Fen/Sosyal; menu domaini platform desenine gore Dil/Bilissel/Kavram
  // (bkz. resimde-ne-ters=Dil, sonra-ne-olur=Bilissel, minik-market/hazine-haritasi=Kavram)
  { id: 'resimde-ne-oluyor', title: 'Resimde Ne Oluyor', status: 'secondary', domain: 'Dil', skillFocus: 'Gorsel okuma / resimden anlam uretme', routeKey: 'resimde-ne-oluyor' },
  { id: 'iz-dedektifi', title: 'Iz Dedektifi', status: 'secondary', domain: 'Bilissel', skillFocus: 'Bilimsel cikarim / iz-canli iliskisi', routeKey: 'iz-dedektifi' },
  { id: 'mevsim-bahcesi', title: 'Mevsim Bahcesi', status: 'secondary', domain: 'Kavram', skillFocus: 'Mevsim / zaman kavrami', routeKey: 'mevsim-bahcesi' },
  { id: 'manzara-kasifi', title: 'Manzara Kasifi', status: 'secondary', domain: 'Kavram', skillFocus: 'Cografi mekan / manzara tanima', routeKey: 'manzara-kasifi' },

  // ---------- Yeni oyunlar (Muzik / Sosyal-duygusal / Dil - tap) ----------
  // Maarif alani Muzik/Turkce; menu domaini platform desenine gore Muzik/Sosyal-duygusal/Dil
  // (bkz. muzik-calar=Muzik, duygu-yuzleri/sevgi-hikayesi=Sosyal-duygusal, bunu-soyle/kafiye-bahcesi=Dil)
  { id: 'muzik-durunca-don', title: 'Muzik Durunca Don', status: 'secondary', domain: 'Muzik', skillFocus: 'Muzik ve hareket / dur-basla oz-duzenleme', routeKey: 'muzik-durunca-don' },
  { id: 'sakinlesme-bahcesi', title: 'Sakinlesme Bahcesi', status: 'secondary', domain: 'Sosyal-duygusal', skillFocus: 'Oz duzenleme / sakinlesme stratejisi', routeKey: 'sakinlesme-bahcesi' },
  { id: 'kucuk-anlatici', title: 'Kucuk Anlatici', status: 'secondary', domain: 'Dil', skillFocus: 'Sozlu anlatim / oyku siralama', routeKey: 'kucuk-anlatici' },

  // ---------- Yeni oyunlar (Sanat / Muzik / Sosyal / Hareket ve Saglik - tap) ----------
  // Maarif bosluklarini kapatir: Sanat alaninda hic oyun yoktu, Muzik'te 16 koddan yalnizca 1 kapaliydi.
  // Menu domaini platform desenine gore Sanat/Muzik/Kavram/Saglik
  // (bkz. cizim oyunlari=Sanat, muzik-durunca-don=Muzik, neredeyim=konum->Kavram, vucudum=Saglik)
  { id: 'sanat-gozlugu', title: 'Sanat Gozlugu', status: 'secondary', domain: 'Sanat', skillFocus: 'Temel sanat kavramlari (cizgi/sekil/renk)', routeKey: 'sanat-gozlugu' },
  { id: 'tabloda-ne-var', title: 'Tabloda Ne Var?', status: 'secondary', domain: 'Sanat', skillFocus: 'Sanat eseri inceleme / gorsel cozumleme', routeKey: 'tabloda-ne-var' },
  { id: 'renk-atolyesi', title: 'Renk Atolyesi', status: 'creative', domain: 'Sanat', skillFocus: 'Sanat etkinligi / motif ve renk uygulama', routeKey: 'renk-atolyesi' },
  { id: 'hangi-calgi-caldi', title: 'Hangi Calgi Caldi?', status: 'secondary', domain: 'Muzik', skillFocus: 'Ses kaynagini ayirt etme (tini)', routeKey: 'hangi-calgi-caldi' },
  { id: 'ses-nasil', title: 'Ses Nasil?', status: 'secondary', domain: 'Muzik', skillFocus: 'Muziksel ozellikler (tempo/gurluk/ton)', routeKey: 'ses-nasil' },
  { id: 'davul-ustasi', title: 'Davul Ustasi', status: 'secondary', domain: 'Muzik', skillFocus: 'Ritim tekrari / muziksel calma', routeKey: 'davul-ustasi' },
  { id: 'odamin-krokisi', title: 'Odamin Krokisi', status: 'secondary', domain: 'Kavram', skillFocus: 'Kendi krokisini olusturma / mekansal temsil', routeKey: 'odamin-krokisi' },
  { id: 'hayvan-jimnastigi', title: 'Hayvan Jimnastigi', status: 'secondary', domain: 'Saglik', skillFocus: 'Buyuk kas becerileri / hareket taklidi', routeKey: 'hayvan-jimnastigi' },

  { id: 'yaratici-cizim', title: 'Yaratici Cizim', status: 'creative', domain: 'Sanat', skillFocus: 'Yaratici ifade', routeKey: 'yaratici-cizim' },
  { id: 'muzik-calar', title: 'Muzik Calar', status: 'music', domain: 'Muzik', skillFocus: 'Sarki ve ritim', routeKey: 'muzik-calar' },
];
