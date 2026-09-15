// ============================================================
// MAARİF EŞLEME - TEK DOĞRU KAYNAK (2026 program)
// ------------------------------------------------------------
// Oyun türü (DB'deki `oyun_turu`) -> Maarif Modeli eşlemesi.
// admin.tsx analiz motoru, panel rozeti ve raporlar BURADAN okur;
// böylece bir oyunun Maarif karşılığı tek yerde tanımlanır.
//
// ÖNEMLİ: `cikti` kodları constants/maarifCurriculum2026.ts'te (2026 "Türkiye
// Yüzyılı Maarif Modeli" TTKB belgesinden literal çıkarılmış) GERÇEKTEN var olan
// kodlardan seçilmelidir (uydurma kod yok). 2026 programında artık gerçek bir
// "Sosyal-Duygusal" alanı VAR (3 başlık / 7 beceri: SDB.1-7) — eski sistemdeki
// "TADB.2 + değer" yer tutucusu kaldırıldı, duygu/değer temalı oyunlar artık
// doğrudan `alan: 'Sosyal-Duygusal'` + ilgili SDB koduyla eşleniyor.
//
// ⚠️ 2024→2026 GEÇİŞİ: Eski kod numaraları çoğu alanda YENİDEN ATANDI (aynı kod
// farklı kazanıma karşılık gelebiliyor — örn. eski FAB.7="bilimsel çıkarım" iken
// yeni FAB.7="deney yapma"). Her satır PDF'ten tek tek doğrulanarak güncellendi,
// sadece eski kodun aynı harf+numarasını kopyalamak YETERLİ DEĞİLDİ.
//
// Bilinen kapsam boşluğu: 2026 programında "ekonomi okuryazarlığı" (gelir/ihtiyaç
// kavramı, eski SAB.22) ayrı bir kod olarak YOK — 'minik-market' oyunu bu yüzden
// en yakın genel kod olan SAB.14'e (toplumsal yaşam çözümleme) bağlandı.
//
// Yeni oyun eklerken: buraya bir kayıt ekle -> analiz + rozet otomatik doğru olur.
// ============================================================

import { isValidCikti2026 } from './maarifCurriculum2026';

export interface MaarifEntry {
  displayName: string;        // Panelde/raporda görünen Türkçe oyun adı
  alan: string;               // Analiz alanı (belgede geçen): Matematik | Fen | Türkçe | Sosyal | Sanat | Müzik | Hareket ve Sağlık | Sosyal-Duygusal
  surec: string;               // Alan becerisi / süreç
  cikti: string;               // Öğrenme çıktısı kodu (2026 belgesi): MAB.2, FAB.2, SDB.5 ...
  ciktiAciklama: string;      // Çıktının açıklaması
  deger?: string;             // Değer temalı oyunlar için (Adalet, Sevgi ...)
  isValueStory?: boolean;     // Seçim-tabanlı değer hikayesi mi (özel analiz dalı)
  badgeAlan?: string;         // Panel rozetinde gösterilecek dostça alan etiketi (yoksa `alan`)
}

// Bilinmeyen oyunlar için varsayılan (en genel bilişsel beceri)
export const DEFAULT_MAARIF: MaarifEntry = {
  displayName: '',
  alan: 'Matematik',
  surec: 'Matematiksel Muhakeme',
  cikti: 'MAB.2',
  ciktiAciklama: 'Parça-bütün özelliklerini çözümleyebilme',
};

export const MAARIF_MAP: Record<string, MaarifEntry> = {
  // ---------- Matematik ----------
  'hafiza': { displayName: 'Çiftini Bul!', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; temsil/sembol grubunda birbirine benzer olanları fark ederek eşleştirebilme' },
  'hafiza-2': { displayName: 'Hayvan Çiftleri', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; benzer olanları fark edip eşleştirebilme; görsel bellek (hayvan teması)', badgeAlan: 'Dikkat & Bellek' },
  'yapboz': { displayName: 'Yapboz', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Parça-bütün özelliklerini çözümleyebilme; bir bütünü oluşturan parçaları gösterir, ilişkili parçaları birleştirerek bütünlüğü oluşturur' },
  'sayilari-birlestir': { displayName: 'Sayıları Birleştir', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme (1-5 arası nesne/varlık sayısını sayarak belirler)' },
  'siralama': { displayName: 'Sıralama', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme (karşılaştırma)' },
  'diziyi-tamamla': { displayName: 'Diziyi Tamamla', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; örüntüyü kuralına uygun olarak devam ettirir' },
  'diziyi-tamamla-2': { displayName: 'Örüntü Ustası', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; örüntüyü kuralına uygun olarak devam ettirir (çok şekilli, ileri seviye)' },
  'eksik-sayi-bul': { displayName: 'Eksik Sayıyı Bul', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; örüntü/sayı dizisindeki eksik ögeyi bulur' },
  'eksik-sayi-bul-2': { displayName: 'Eksik Sayıyı Bul 6-10', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; sayı dizisindeki eksik ögeyi bulur (6-10 sayı dizisi)' },
  'kodlama': { displayName: 'Minik Kaşif', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.7', ciktiAciklama: 'Matematikle ilgili problemlere çözüm yolları geliştirebilme' },
  'kutuyu-bul': { displayName: 'Kutuyu Bul!', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; görsel tarama ile benzer olanı bulma' },
  'golge-dedektifi': { displayName: 'Gölge Dedektifi', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; gölge-nesne eşleştirebilme' },
  'golge-dedektifi-2': { displayName: 'Gölge Dedektifi: Uzman', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; gölge-nesne eşleştirebilme (çeldiricili, ileri seviye)', badgeAlan: 'Dikkat' },
  'onluk-cerceve': { displayName: 'Onluk Çerçeve', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme (1-20 arası nesne/varlık sayısını söyler)' },
  'onluk-cerceve-2': { displayName: 'Yıldız Çerçevesi', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme; 6-10 arası nesneyi çerçeveye yerleştirir (yıldız teması)' },
  'sayi-komsulari': { displayName: 'Sayı Komşuları', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme; verilen bir sayıdan önce ya da sonra gelen sayıyı belirler' },
  'tarti-dengesi': { displayName: 'Tartı Dengesi', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; ağırlık karşılaştırması yapar' },
  'miktar-avcisi': { displayName: 'Miktar Avcısı', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme; nicelikleri karşılaştırır (çok/az)' },
  'miktar-avcisi-2': { displayName: 'Deniz Avcısı', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme; nicelikleri karşılaştırır (çok/az), deniz teması' },
  'akilli-sayi-avi': { displayName: 'Akıllı Sayı Avı', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme; nesneleri sayıp doğru sayıyla eşleştirir (performansa göre uyarlanır zorluk)' },
  'akilli-miktar': { displayName: 'Akıllı Miktar', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme; nicelikleri karşılaştırır (çok/az) (performansa göre uyarlanır zorluk)' },
  'akilli-oruntu': { displayName: 'Akıllı Örüntü', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; örüntüyü kuralına uygun sürdürür (performansa göre uyarlanır zorluk)' },
  'akilli-eksik-sayi': { displayName: 'Akıllı Eksik Sayı', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; sayı dizisindeki boşluğu tamamlar (performansa göre uyarlanır zorluk)' },
  'akilli-siralama': { displayName: 'Akıllı Sıralama', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; nesneleri niceliğine göre azdan çoğa sıralar (performansa göre uyarlanır zorluk)' },
  'akilli-toplama': { displayName: 'Akıllı Toplama', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematikle ilgili problemleri çözümleyebilme; iki grubu birleştirip toplar (performansa göre uyarlanır zorluk)' },
  'akilli-farkli': { displayName: 'Akıllı Farklı', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesne/olay/olguları benzerlik ve farklılıklarına göre sınıflandırabilme; gruba uymayan farklı olanı bulur (performansa göre uyarlanır zorluk)', badgeAlan: 'Dikkat / Ayırt Etme' },
  'akilli-cikarma': { displayName: 'Akıllı Çıkarma', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematikle ilgili problemleri çözümleyebilme; gruptan ayrılanları çıkarıp kalanı bulur (performansa göre uyarlanır zorluk)' },
  'akilli-hafiza': { displayName: 'Akıllı Hafıza', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; benzer olanları fark edip eşleştirebilme; görsel bellek (performansa göre uyarlanır zorluk)', badgeAlan: 'Dikkat & Bellek' },
  'akilli-harf': { displayName: 'Akıllı Harf', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazı Farkındalığı', cikti: 'TAEOB.1', ciktiAciklama: 'Yazı farkındalığına ilişkin becerileri gösterebilme; harflerin biçimini ayırt eder, aynı harfi eşleştirir (performansa göre uyarlanır zorluk)' },
  'akilli-siniflandir': { displayName: 'Akıllı Sınıflandır', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesne/olguları benzerlik ve farklılıklarına göre sınıflandırabilme; nesneleri doğru kategoriye ayırır (performansa göre uyarlanır zorluk)' },
  'akilli-once-sonra': { displayName: 'Akıllı Önce-Sonra', alan: 'Sosyal', surec: 'Zamanı Algılama ve Kronolojik Düşünme', cikti: 'SAB.2', ciktiAciklama: 'Yakın çevresindeki olay/dönem/kavramları kronolojik olarak sıralayabilme (performansa göre uyarlanır zorluk)', badgeAlan: 'Sosyal / Zaman' },
  'dunya-bayraklari': { displayName: 'Dünya Bayrakları', alan: 'Sosyal', surec: 'Eleştirel Sosyolojik Düşünme', cikti: 'SAB.15', ciktiAciklama: 'Toplumsal yaşama yönelik merak ettiği konuyu sorgulayabilme; farklı ülkelerin bayraklarını tanıyıp eşleştirir (kültürel farkındalık)', badgeAlan: 'Sosyal / Kültür' },
  'dunya-selamlari': { displayName: 'Dünya Selamları', alan: 'Sosyal', surec: 'Eleştirel Sosyolojik Düşünme', cikti: 'SAB.15', ciktiAciklama: 'Toplumsal yaşama yönelik merak ettiği konuyu sorgulayabilme; farklı ülkelerin selamlaşmalarını tanır (kültürel farkındalık)', badgeAlan: 'Sosyal / Kültür' },
  'dunya-yapilari': { displayName: 'Dünya Yapıları', alan: 'Sosyal', surec: 'Eleştirel Sosyolojik Düşünme', cikti: 'SAB.15', ciktiAciklama: 'Toplumsal yaşama yönelik merak ettiği konuyu sorgulayabilme; dünyanın simge yapı/anıtlarını tanır (kültürel farkındalık)', badgeAlan: 'Sosyal / Kültür' },
  'dunya-yiyecekleri': { displayName: 'Dünya Yiyecekleri', alan: 'Sosyal', surec: 'Eleştirel Sosyolojik Düşünme', cikti: 'SAB.15', ciktiAciklama: 'Toplumsal yaşama yönelik merak ettiği konuyu sorgulayabilme; farklı kültürlerin yiyeceklerini tanır (kültürel farkındalık)', badgeAlan: 'Sosyal / Kültür' },
  'bayrak-boya': { displayName: 'Bayrak Boya', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; bayrakları örneğe göre doğru renklerle boyar, kültürel farkındalık', badgeAlan: 'Sanat / Kültür' },
  'sihirli-siseler': { displayName: 'Sihirli Şişeler', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesneleri benzerlik ve farklılıklarına göre sınıflandırabilme; renklere göre gruplama' },
  'renkli-baglantalar': { displayName: 'Renkli Bağlantılar', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; eşleştirme ve dikkat' },
  'mutfak-dedektifi': { displayName: 'Mutfak Dedektifi', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesneleri benzerlik ve farklılıklarına göre sınıflandırabilme; görsel dikkat ve kategori ayırt etme' },
  'sihirli-tuval': { displayName: 'Sihirli Tuval: Sayılarla Boyama', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.9', ciktiAciklama: 'Matematikle ilgili temsillerden yararlanabilme; çeşitli semboller arasından belirtilen matematiksel temsili gösterir' },
  'uzay-bloklari': { displayName: 'Uzay Blokları: Yıldız Mimarı', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Parça-bütün özelliklerini çözümleyebilme; bir bütünü oluşturan parçaları gösterir, ilişkili parçaları birleştirir' },

  // ---------- Fen ----------
  'gruplama': { displayName: 'Gruplama', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesne, olayları benzerlik ve farklılıklarına göre sınıflandırabilme' },
  'sonra-ne-olur': { displayName: 'Sonra Ne Olur?', alan: 'Fen', surec: 'Bilimsel Veriye Dayalı Tahmin', cikti: 'FAB.4', ciktiAciklama: 'Fene yönelik olay/olgular hakkında bilimsel veriye dayalı tahminlerde bulunabilme; olaylar dizisinde "sonra ne olur?" mantığıyla sonucu öngörür', badgeAlan: 'Fen (Tahmin)' },

  // ---------- Türkçe ----------
  'bunu-soyle': { displayName: 'Bunu Söyle!', alan: 'Türkçe', surec: 'Konuşma / İçerik Oluşturma', cikti: 'TAKB.2', ciktiAciklama: 'Konuşma sürecinin içeriğini oluşturabilme' },
  'rakam-yazma': { displayName: 'Rakam Yazma', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.5', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme (boyama ve çizgi çalışmaları)' },
  'rakam-yazma-2': { displayName: 'Rakam Yazma 6-10', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.5', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme; 6-10 rakamlarını çizerek yazı öncesi el kaslarını güçlendirir', badgeAlan: 'Sanat / Yazma Öncesi' },
  'yaratici-cizim': { displayName: 'Hayal Defteri', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; serbest çizim ve boyama ile yaratıcı ifade', badgeAlan: 'Sanat / Yaratıcı' },
  'kafiye-bahcesi': { displayName: 'Kafiye Bahçesi', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Ses Bilgisel Farkındalık', cikti: 'TAEOB.2', ciktiAciklama: 'Ses bilgisel farkındalık becerileri gösterebilme; kafiyeli (uyaklı) kelimeleri sesletip eşleştirir', badgeAlan: 'Dil (Kafiye)' },
  'resimde-ne-ters': { displayName: 'Resimde Ne Ters?', alan: 'Türkçe', surec: 'Okuma', cikti: 'TAOB.3', ciktiAciklama: 'Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerini çözümleyebilme; resimdeki uyumsuz/yanlış ögeyi (ne ters?) fark eder (görsel okuryazarlık ve dikkat)', badgeAlan: 'Dil (Görsel Okuma)' },

  // ---------- Değer Hikayeleri (artık gerçek Sosyal-Duygusal kodlarıyla) ----------
  'ceviz-macera': { displayName: 'Ceviz Macerası', alan: 'Sosyal-Duygusal', surec: 'Sosyal Yaşam Becerileri', cikti: 'SDB.5', ciktiAciklama: 'Sosyal Farkındalık: başkalarının bakış açısını anlama ve onlara duyarlı davranma', deger: 'Yardımseverlik', isValueStory: true, badgeAlan: 'Sosyal-Duygusal' },
  'aile-sepeti': { displayName: 'Aile Sepeti', alan: 'Sosyal-Duygusal', surec: 'Ortak / Birleşik Beceriler', cikti: 'SDB.6', ciktiAciklama: 'Uyum: kişinin kendisiyle ve çevresiyle (ailesiyle) dengeli bir ilişki kurması ve sürdürmesi', deger: 'Aile Bütünlüğü', isValueStory: true, badgeAlan: 'Sosyal-Duygusal' },
  'adalet-hikayesi': { displayName: 'Adalet Hikayesi', alan: 'Sosyal-Duygusal', surec: 'Ortak / Birleşik Beceriler', cikti: 'SDB.7', ciktiAciklama: 'Sorumlu Karar Verme: ahlaki sorumluluk alarak doğru ve yapıcı seçimler yapma becerisi', deger: 'Adalet', isValueStory: true, badgeAlan: 'Sosyal-Duygusal' },
  'sevgi-hikayesi': { displayName: 'Küçük Kalpler', alan: 'Sosyal-Duygusal', surec: 'Sosyal Yaşam Becerileri', cikti: 'SDB.5', ciktiAciklama: 'Sosyal Farkındalık: başkalarının duygularını anlama ve sevgi/empati bağlamında yorumlama', deger: 'Sevgi', isValueStory: true, badgeAlan: 'Sosyal-Duygusal' },

  // ---------- Duygu tanıma (nicel; standart analiz dalı) ----------
  'duygu-yuzleri': { displayName: 'Duygu Yüzleri', alan: 'Sosyal-Duygusal', surec: 'Benlik Becerileri', cikti: 'SDB.1', ciktiAciklama: 'Kendini Tanıma: duygu ifadelerini tanıma ve adlandırma (duygu farkındalığı)', deger: 'Duygu Farkındalığı & Empati', badgeAlan: 'Sosyal-Duygusal' },

  // ---------- Kavramlar (yeni; nicel; standart analiz dalı) ----------
  'renk-sepetleri': { displayName: 'Renk Sepetleri', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesneleri (renk) benzerlik ve farklılıklarına göre sınıflandırabilme', badgeAlan: 'Kavram (Renk)' },
  'zitlari-eslestir': { displayName: 'Zıtları Eşleştir', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; zıt kavram ilişkisini kurar', badgeAlan: 'Kavram (Zıtlıklar)' },
  'sekil-treni': { displayName: 'Şekil Treni', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.9', ciktiAciklama: 'Matematikle ilgili temsillerden yararlanabilme; kendisine sorulan geometrik şekli gösterir, şekle göre ayırt eder', badgeAlan: 'Kavram (Şekil)' },
  'ayi-ailesi': { displayName: 'Ayı Ailesi', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; nesneleri boyutuna göre karşılaştırır ve küçükten büyüğe sıralar', badgeAlan: 'Kavram (Boyut)' },
  'ciftlikte-sayalim': { displayName: 'Çiftlikte Sayalım', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme (1-5 arası nesne sayısını söyler, sayı-nicelik ilişkisi)', badgeAlan: 'Kavram (Sayma)' },
  'ayni-farkli': { displayName: 'Aynı mı Farklı mı?', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; aynı/farklı olanı ayırt eder', badgeAlan: 'Kavram (Ayırt Etme)' },
  'hangisi-farkli': { displayName: 'Hangisi Farklı?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Nesneleri benzerlik ve farklılıklarına göre değerlendirir; gruba uymayanı bulur', badgeAlan: 'Kavram (Ayırt Etme)' },
  'buyuk-orta-kucuk': { displayName: 'Büyük-Orta-Küçük', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; nesneleri boyutlarına göre karşılaştırır (büyük/orta/küçük)', badgeAlan: 'Kavram (Boyut)' },
  'neredeyim': { displayName: 'Neredeyim?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Matematikle ilgili durumları yorumlayabilme; nesne/varlıkların konumlarını üstünde/altında/yanında/önünde/arkasında gibi kavramlarla ifade eder', badgeAlan: 'Kavram (Konum)' },
  'once-sonra': { displayName: 'Önce-Sonra', alan: 'Sosyal', surec: 'Zamanı Algılama ve Kronolojik Düşünme', cikti: 'SAB.2', ciktiAciklama: 'Yakın çevresindeki olay/dönem/kavramları kronolojik olarak sıralayabilme; olayları önce-sonra sırasına dizer', badgeAlan: 'Kavram (Zaman)' },
  'sayiyi-bul': { displayName: 'Sayıyı Bul', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme; rakamı tanır, verilen rakam kadar nesne içeren grubu eşler' },
  'en-uzun': { displayName: 'En Uzun Hangisi?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; nesneleri uzunluklarına göre karşılaştırır', badgeAlan: 'Kavram (Uzunluk)' },
  'dogru-kutu': { displayName: 'Doğru Kutu', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Nesneleri türlerine/kategorilerine göre sınıflandırır (hayvan/yiyecek)', badgeAlan: 'Kavram (Sınıflandırma)' },
  'ikizleri-bul': { displayName: 'İkizleri Bul', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; birbirinin aynısı olanları eşleştirir', badgeAlan: 'Kavram (Eşleştirme)' },
  'ne-ise-yarar': { displayName: 'Ne İşe Yarar?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; nesneleri günlük yaşamdaki ilişkilerine göre eşleştirir (şemsiye-yağmur gibi)', badgeAlan: 'Kavram (İlişki)' },
  'renk-oruntusu': { displayName: 'Renk Örüntüsü', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; örüntüyü kuralına uygun olarak sürdürür' },
  'nokta-say': { displayName: 'Nokta Say', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme (noktaları sayıp sayıyı belirler)', badgeAlan: 'Kavram (Sayma)' },
  'canli-cansiz': { displayName: 'Canlı mı Cansız mı?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Nesneleri canlı/cansız özelliğine göre sınıflandırır', badgeAlan: 'Kavram (Canlı/Cansız)' },
  'yuzer-batar': { displayName: 'Yüzer mi Batar mı?', alan: 'Fen', surec: 'Bilimsel Gözleme Dayalı Tahmin', cikti: 'FAB.3', ciktiAciklama: 'Günlük yaşamda fen olaylarına yönelik bilimsel gözleme dayalı tahminlerde bulunabilme; nesnelerin suda yüzüp batacağını tahmin eder', badgeAlan: 'Kavram (Tahmin)' },
  'duygu-eslestir': { displayName: 'Duygu Eşleştir', alan: 'Sosyal-Duygusal', surec: 'Benlik Becerileri', cikti: 'SDB.1', ciktiAciklama: 'Kendini Tanıma: duygu ifadelerini tanır, aynı duyguya sahip yüzleri eşleştirir', deger: 'Duygu Farkındalığı', badgeAlan: 'Sosyal-Duygusal' },
  'sirayi-hatirla': { displayName: 'Sırayı Hatırla', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; sıralı bilgiyi kısa süreli bellekte tutar ve aynı sırayla tekrarlar (çalışma belleği/dikkat)', badgeAlan: 'Bilişsel (Bellek)' },
  'agir-hafif': { displayName: 'En Ağır Hangisi?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; nesneleri ağırlıklarına göre karşılaştırır', badgeAlan: 'Kavram (Ağırlık)' },
  'gunduz-gece': { displayName: 'Gündüz mü Gece mi?', alan: 'Sosyal', surec: 'Zamanı Algılama ve Kronolojik Düşünme', cikti: 'SAB.1', ciktiAciklama: 'Günlük hayatta karşılaştığı kavramlara ilişkin zaman içerisinde değişen özellikleri karşılaştırabilme; nesne/olayları gündüz-gece ile ilişkilendirir', badgeAlan: 'Kavram (Zaman)' },
  'kac-oldu': { displayName: 'Kaç Oldu?', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematikle ilgili problemleri çözümleyebilme; iki grubu birleştirip toplam nesne sayısını söyler (5e kadar toplama)', badgeAlan: 'Kavram (Toplama)' },
  'renkleri-karistir': { displayName: 'Renkleri Karıştır', alan: 'Fen', surec: 'Bilimsel Gözleme Dayalı Tahmin', cikti: 'FAB.3', ciktiAciklama: 'Günlük yaşamda fen olaylarına yönelik bilimsel gözleme dayalı tahminlerde bulunabilme; iki rengin karışımı sonucu oluşacak rengi tahmin eder', badgeAlan: 'Kavram (Renk)' },
  'sekil-deligi': { displayName: 'Şekil Deliği', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Parça-bütün özelliklerini çözümleyebilme; geometrik şeklin özelliklerini çözümler, aynı şekilli boşlukla eşler', badgeAlan: 'Kavram (Şekil)' },
  'az-cok-sirala': { displayName: 'Az → Çok Sırala', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; grupları niceliklerine göre karşılaştırır ve az-çok sırasına dizer', badgeAlan: 'Kavram (Nicelik)' },

  // ---------- Diğer kategoriler (Sanat / Dil / Sosyal-Duygusal / Dikkat / Matematik) ----------
  'ilk-harf': { displayName: 'İlk Harf', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Ses Bilgisel Farkındalık', cikti: 'TAEOB.2', ciktiAciklama: 'Ses bilgisel farkındalık becerileri gösterebilme; harf-ses ilişkisi kurarak verilen harfle başlayan kelimeyi/görseli bulur (ilk ses farkındalığı)', badgeAlan: 'Dil (İlk Harf)' },
  'kac-kaldi': { displayName: 'Kaç Kaldı?', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematikle ilgili problemleri çözümleyebilme; kalan nesneleri sayar (5e kadar çıkarma sezgisi)', badgeAlan: 'Matematik (Çıkarma)' },
  'buyuk-sayi': { displayName: 'Büyük Sayı Hangisi?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; iki sayıyı karşılaştırır, hangisinin daha büyük olduğunu belirler', badgeAlan: 'Matematik (Karşılaştırma)' },
  'ne-degisti': { displayName: 'Ne Değişti?', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.10', ciktiAciklama: 'Matematikle ilgili temsilleri değerlendirebilme; görsel bilgiyi bellekte tutar, değişen ögeyi fark eder (dikkat/çalışma belleği)', badgeAlan: 'Bilişsel (Dikkat)' },
  'iyilik-yap': { displayName: 'İyilik Yap', alan: 'Sosyal-Duygusal', surec: 'Sosyal Yaşam Becerileri', cikti: 'SDB.5', ciktiAciklama: 'Sosyal Farkındalık: durumları yorumlar, empati kurarak nazik/yardımsever davranışı seçer', deger: 'Yardımseverlik ve Nezaket', badgeAlan: 'Sosyal-Duygusal' },
  'cizim-sayfalari': { displayName: 'Çizim Sayfaları', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; kılavuz çizgileri takip ederek çizgi çalışması ve el-göz koordinasyonu geliştirir', badgeAlan: 'Sanat / Çizgi Çalışması' },

  // ---------- Sağlık & Öz Bakım (Hareket/Sağlık - HSAB) ----------
  'vucudum': { displayName: 'Vücudum', alan: 'Hareket ve Sağlık', surec: 'Beden Farkındalığına Dayalı Doğru Duruş', cikti: 'HSAB.4', ciktiAciklama: 'Beden farkındalığına dayalı doğru duruş sergileyebilme; yüz/vücut organlarını tanır ve gösterir', badgeAlan: 'Sağlık (Beden)' },
  'duyularimiz': { displayName: 'Duyularımız', alan: 'Hareket ve Sağlık', surec: 'Beden Farkındalığına Dayalı Doğru Duruş', cikti: 'HSAB.4', ciktiAciklama: 'Beden farkındalığına dayalı doğru duruş sergileyebilme; duyu farkındalığı, uyaranı algıladığımız duyu organını eşler', badgeAlan: 'Sağlık (Duyular)' },
  'saglikli-yiyecek': { displayName: 'Sağlıklı mı?', alan: 'Hareket ve Sağlık', surec: 'Yeterli ve Dengeli Beslenme', cikti: 'HSAB.6', ciktiAciklama: 'Yeterli ve dengeli beslenebilme; sağlıklı yiyeceği ayırt eder', badgeAlan: 'Sağlık (Beslenme)' },
  'temizlik-zamani': { displayName: 'Temizlik Zamanı', alan: 'Hareket ve Sağlık', surec: 'Temel Kişisel Hijyen', cikti: 'HSAB.8', ciktiAciklama: 'Temel kişisel hijyen ve bulunduğu ortamın düzeninin farkında olabilme; duruma uygun temizlik aracını seçer', badgeAlan: 'Sağlık (Temizlik)' },
  'guvende-kal': { displayName: 'Güvende Kal', alan: 'Hareket ve Sağlık', surec: 'Güvenlik Becerileri', cikti: 'HSAB.9', ciktiAciklama: 'Kaza, afet ve tehlikeli durumlarda güvenli davranışları sergileyebilme; güvenli davranışı seçer', badgeAlan: 'Sağlık (Güvenlik)' },
  'hava-kiyafet': { displayName: 'Hava & Kıyafet', alan: 'Fen', surec: 'Bilimsel Gözlem', cikti: 'FAB.1', ciktiAciklama: 'Günlük yaşamında fenle ilgili olaylara/olgulara ve durumlara yönelik bilimsel gözlem yapabilme; hava olaylarını günlük yaşamla ilişkilendirir, duruma uygun kıyafeti seçer', badgeAlan: 'Fen (Günlük Yaşam)' },

  // ---------- Dalga 8 (problem çözme, fen, sosyal, matematik) ----------
  'labirent': { displayName: 'Labirent', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.7', ciktiAciklama: 'Matematikle ilgili problemlere çözüm yolları geliştirebilme; hedefe ulaşmak için yol/strateji planlar' },
  'hayvan-evi': { displayName: 'Hayvan Evi', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Canlıları yaşam alanlarına göre sınıflandırır (balık-su, aslan-orman)', badgeAlan: 'Fen (Canlılar)' },
  'meslekler': { displayName: 'Meslekler', alan: 'Sosyal', surec: 'Eleştirel Sosyolojik Düşünme', cikti: 'SAB.14', ciktiAciklama: 'Toplumsal yaşama yönelik nesne, olgu ve olayları çözümleyebilme; meslekleri ve toplumsal rolleri tanır, meslek-araç ilişkisi kurar', badgeAlan: 'Sosyal (Meslekler)' },
  'buyuyunce': { displayName: 'Büyüyünce Ne Olur?', alan: 'Fen', surec: 'Bilimsel Gözlem', cikti: 'FAB.1', ciktiAciklama: 'Günlük yaşamında fenle ilgili olaylara/olgulara yönelik bilimsel gözlem yapabilme; canlıların büyüme ve değişimini gözlemler (tırtıl-kelebek, yaşam döngüsü)', badgeAlan: 'Fen (Değişim)' },
  'geri-donusum': { displayName: 'Geri Dönüşüm', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Atıkları malzemesine göre sınıflandırır; çevre bilinci geliştirir', badgeAlan: 'Fen (Çevre)' },
  'esit-paylastir': { displayName: 'Eşit Paylaştır', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematikle ilgili problemleri çözümleyebilme; nesneleri eşit gruplara ayırır (10a kadar olanları eşit paylaştırır)', badgeAlan: 'Matematik (Paylaşım)' },

  // ---------- Dalga 9 (taşıtlar, beslenme, günlük yaşam, ton, sıcaklık) ----------
  'araclar': { displayName: 'Araçlar Nerede Gider?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Taşıtları hareket ettiği ortama göre sınıflandırır (kara/deniz/hava)', badgeAlan: 'Fen (Taşıtlar)' },
  'ne-yer': { displayName: 'Ne Yer?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Canlıların beslenmesine dair bilgi; hayvan-besin ilişkisi kurar', badgeAlan: 'Fen (Beslenme)' },
  'ne-nerede': { displayName: 'Ne Nerede?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Eşyaları kullanıldığı yere/odaya göre sınıflandırır (günlük yaşam)', badgeAlan: 'Fen (Günlük Yaşam)' },
  'gunum': { displayName: 'Günüm', alan: 'Sosyal', surec: 'Zamanı Algılama ve Kronolojik Düşünme', cikti: 'SAB.2', ciktiAciklama: 'Yakın çevresindeki olay/dönem/kavramları kronolojik olarak sıralayabilme; kendisine ait günlük rutin görselleri oluş sırasına (sabah-akşam) göre sıralar', badgeAlan: 'Kavram (Zaman)' },
  'renk-tonlari': { displayName: 'Renk Tonları', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme; renk tonlarını açıktan koyuya göre karşılaştırır ve sıralar (seriation)', badgeAlan: 'Kavram (Ton)' },
  'sicak-soguk': { displayName: 'Sıcak mı Soğuk mu?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesneleri sıcaklık özelliğine göre benzerlik ve farklılıklarına göre sınıflandırabilme', badgeAlan: 'Kavram (Sıcaklık)' },

  // ---------- Çizim (Sanat) - farklı formatlar ----------
  'simetri-cizim': { displayName: 'Simetri Çizim', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; serbest çizim ve el-göz koordinasyonu ile simetri sezgisi (aynalı çizim)', badgeAlan: 'Sanat / Simetri' },
  'damga-sanati': { displayName: 'Damga Sanatı', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; yaratıcı ifade ve kompozisyon, damga/çıkartma ile sahne oluşturma', badgeAlan: 'Sanat / Kompozisyon' },
  'boyama-kitabi': { displayName: 'Boyama Kitabı', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; yaratıcı ifade ve renk seçimi ile resim bölgelerini boyama (ince motor)', badgeAlan: 'Sanat / Boyama' },
  'nokta-birlestir': { displayName: 'Nokta Birleştir', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları farklı durumlarda doğru kullanabilme; sayıları 1\'den itibaren sırayla izler ve çizgiyle birleştirir (sayı sırası + çizgi çalışması)', badgeAlan: 'Çizim / Sayı Sırası' },
  'sayi-boya': { displayName: 'Sayı-Boya', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; sayı-renk eşleştirerek boyama, renk seçimi + sayı tanıma + ince motor', badgeAlan: 'Sanat / Sayı-Boya' },
  'mandala': { displayName: 'Mandala', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; yaratıcı ifade ve radyal simetri (çizim merkez etrafında çoğalır)', badgeAlan: 'Sanat / Simetri' },
  'nokta-boyama': { displayName: 'Nokta Boyama', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; noktalarla (pointillism) yaratıcı boyama, el-göz koordinasyonu', badgeAlan: 'Sanat / Boyama' },
  'cizimi-canlandir': { displayName: 'Çizimini Canlandır', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; serbest yaratıcı çizim, çizimini canlandırarak eğlenme', badgeAlan: 'Sanat / Yaratıcı' },
  'yuz-yap': { displayName: 'Yüz Yap', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; parçalarla yüz/karakter oluşturma, parça-bütün ve yaratıcı ifade', badgeAlan: 'Sanat / Kolaj' },
  'yarisini-tamamla': { displayName: 'Yarısını Tamamla', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; simetri farkındalığıyla resmin eksik yarısını çizerek tamamlama', badgeAlan: 'Sanat / Simetri' },
  'kum-boyasi': { displayName: 'Kum Boyası', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; duyusal yaratıcı ifade, akan renklerle serbest boyama', badgeAlan: 'Sanat / Boyama' },
  'adim-adim': { displayName: 'Adım Adım Çizim', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; yönerge takibiyle adım adım çizim, el-göz koordinasyonu', badgeAlan: 'Sanat / Rehberli' },
  'sayi-boya-2': { displayName: 'Sayı-Boya 2', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; detaylı sayı-renk eşleştirmeli boyama (daha büyük grid, 6 renk), renk-sayı ilişkisi + ince motor', badgeAlan: 'Sanat / Sayı-Boya' },

  // ---------- Yeni oyunlar (Sosyal / Matematik - tap) ----------
  'minik-market': { displayName: 'Minik Market', alan: 'Sosyal', surec: 'Eleştirel Sosyolojik Düşünme', cikti: 'SAB.14', ciktiAciklama: 'Toplumsal yaşama yönelik nesne, olgu ve olayları çözümleyebilme; markette parayla alışveriş yapar (pratik yaşam, ihtiyaç-istek) — 2026 programında ayrı bir "ekonomi okuryazarlığı" kodu yok, en yakın genel kod kullanıldı', badgeAlan: 'Sosyal / Ekonomi' },
  'hazine-haritasi': { displayName: 'Hazine Haritası', alan: 'Sosyal', surec: 'Harita', cikti: 'SAB.11', ciktiAciklama: 'Yakın çevresi ile ilgili olan basit krokiyi/haritayı okuyabilme; haritadaki yönergeleri takip ederek hazineyi bulur (uzamsal yön)', badgeAlan: 'Sosyal / Harita' },
  'grafik-ustasi': { displayName: 'Grafik Ustası', alan: 'Matematik', surec: 'Veri ile Çalışma ve Veriye Dayalı Karar Verme', cikti: 'MAB.12', ciktiAciklama: 'Bulguya ulaşabilme; nesneleri sayıp basit sütun grafiği oluşturur/okur (veri okuryazarlığına giriş)', badgeAlan: 'Matematik (Veri)' },

  // ---------- Yeni oyunlar (Türkçe / Fen / Sosyal - tap) ----------
  'resimde-ne-oluyor': { displayName: 'Resimde Ne Oluyor?', alan: 'Türkçe', surec: 'Okuma', cikti: 'TAOB.2', ciktiAciklama: 'Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerinden anlamlar oluşturabilme; resimde ne olduğunu yorumlayıp uygun ifadeyi seçer (görsel okuryazarlık)', badgeAlan: 'Dil (Görsel Okuma)' },
  'iz-dedektifi': { displayName: 'İz Dedektifi', alan: 'Fen', surec: 'Bilimsel Çıkarım Yapma', cikti: 'FAB.8', ciktiAciklama: 'Günlük hayatındaki fene yönelik olaylar hakkında gözlemlerine dayalı basit düzeyde bilimsel çıkarımlar yapabilme; izlere/ipuçlarına bakarak hangi canlıya ait olduğunu bulur', badgeAlan: 'Fen (Çıkarım)' },
  'mevsim-bahcesi': { displayName: 'Mevsim Bahçesi', alan: 'Sosyal', surec: 'Zamanı Algılama ve Kronolojik Düşünme', cikti: 'SAB.1', ciktiAciklama: 'Günlük hayatta karşılaştığı kavramlara ilişkin zaman içerisinde değişen özellikleri karşılaştırabilme; mevsimleri özellikleriyle tanıyıp doğru mevsimle eşleştirir', badgeAlan: 'Sosyal / Zaman' },
  'manzara-kasifi': { displayName: 'Manzara Kaşifi', alan: 'Sosyal', surec: 'Mekânsal Düşünme', cikti: 'SAB.6', ciktiAciklama: 'Yakın çevresinde yer alan mekânın coğrafi koşullarını tanımlayabilme; farklı manzaraları (dağ/deniz/orman/şehir) tanıyıp özellikleriyle eşleştirir', badgeAlan: 'Sosyal / Coğrafya' },

  // ---------- Yeni oyunlar (Müzik / Sosyal-Duygusal / Dil - tap) ----------
  'muzik-durunca-don': { displayName: 'Müzik Durunca Don', alan: 'Müzik', surec: 'Müziksel Hareket', cikti: 'MHB.2', ciktiAciklama: 'Müzik eserleriyle hareket/dans edebilme; müzik durunca hareketini durdurur (dur/başla öz-düzenleme)' },
  'sakinlesme-bahcesi': { displayName: 'Sakinleşme Bahçesi', alan: 'Sosyal-Duygusal', surec: 'Benlik Becerileri', cikti: 'SDB.2', ciktiAciklama: 'Kendini Düzenleme: kişisel hedeflere ulaşabilmek için duygu, düşünce ve davranışların fark edilip kontrol edilmesi; büyük duyguları tanıyıp uygun sakinleşme stratejisini (derin nefes/say/sarıl/yardım iste) seçer', deger: 'Öz Düzenleme', badgeAlan: 'Sosyal-Duygusal' },
  'kucuk-anlatici': { displayName: 'Küçük Anlatıcı', alan: 'Türkçe', surec: 'Konuşma', cikti: 'TAKB.1', ciktiAciklama: 'Konuşma sürecini yönetebilme; olayları önce-sonra sırasına dizip kendi cümleleriyle anlatır (sözlü anlatım)', badgeAlan: 'Dil (Anlatım)' },

  // ---------- Yeni oyunlar (Sanat / Müzik / Sosyal / Hareket ve Sağlık - tap) ----------
  // Ölçülen Maarif boşluklarını kapatır: Sanat alanında (SNAB) hiç oyun yoktu,
  // Müzik alanında koddan yalnızca bir tanesi kapalıydı.
  'sanat-gozlugu': { displayName: 'Sanat Gözlüğü', alan: 'Sanat', surec: 'Sanat Eseri İnceleme', cikti: 'SNAB.2', ciktiAciklama: 'Sanat eserini eleştirebilme; çizgi, şekil ve sıcak/soğuk renk gibi görsel ögeleri eserde fark edip adlandırır', badgeAlan: 'Sanat' },
  'tabloda-ne-var': { displayName: 'Tabloda Ne Var?', alan: 'Sanat', surec: 'Sanat Eseri İnceleme', cikti: 'SNAB.2', ciktiAciklama: 'Sanat eserini eleştirebilme; tablodaki renk, şekil ve sayı ayrıntılarını gözlemleyip esere ilişkin soruları yanıtlar', badgeAlan: 'Sanat' },
  'renk-atolyesi': { displayName: 'Renk Atölyesi', alan: 'Sanat', surec: 'Sanatsal Uygulama Yapma', cikti: 'SNAB.4', ciktiAciklama: 'Sanat etkinliği uygulayabilme; motifleri tekrar ve varyasyonla renklendirerek kendi kompozisyonunu oluşturur', badgeAlan: 'Sanat' },
  'hangi-calgi-caldi': { displayName: 'Hangi Çalgı Çaldı?', alan: 'Müzik', surec: 'Müziksel Dinleme', cikti: 'MDB.2', ciktiAciklama: 'Seslerin kaynağını anlayabilme; çalgı seslerini tınısından ayırt edip sesi çıkaran çalgıyı gösterir', badgeAlan: 'Müzik' },
  'ses-nasil': { displayName: 'Ses Nasıl?', alan: 'Müzik', surec: 'Müziksel Dinleme', cikti: 'MDB.3', ciktiAciklama: 'Müzik eserlerindeki temel özellikleri ifade edebilme; tempo, gürlük, ses kalınlığı ve ezgi yönünü ayırt eder', badgeAlan: 'Müzik' },
  'davul-ustasi': { displayName: 'Davul Ustası', alan: 'Müzik', surec: 'Müziksel Çalma', cikti: 'MÇB.2', ciktiAciklama: 'Çalgıları çalma becerilerini sergileyebilme; duyduğu ritim kalıbını pede vurarak aynı sırayla tekrarlar', badgeAlan: 'Müzik' },
  'odamin-krokisi': { displayName: 'Odamın Krokisi', alan: 'Sosyal', surec: 'Harita', cikti: 'SAB.13', ciktiAciklama: 'Yakın çevresinde bulunan belirli bir kişi/nesne/mekânın konumunu gösteren kendi krokisini oluşturabilme; odasının planına eşyaları yönergeye göre yerleştirir', badgeAlan: 'Kavram (Konum)' },
  'hayvan-jimnastigi': { displayName: 'Hayvan Jimnastiği', alan: 'Hareket ve Sağlık', surec: 'Aktif Yaşam İçin Motor Beceriler', cikti: 'HSAB.1', ciktiAciklama: 'Farklı çevre ve fiziksel etkinliklerde temel hareket becerilerini sergileyebilme; hayvan hareketlerini (zıplama, ağır adım, tek ayakta denge, yan yürüme) tanıyıp taklit eder', badgeAlan: 'Sağlık' },
};

/** Oyun türünün Maarif kaydını döndürür; yoksa varsayılan (MAB.2). */
// Geliştirme-zamanı bekçisi: bir oyunun `cikti` kodu kanonik curriculum'da
// (constants/maarifCurriculum2026.ts, 2026 TTKB belgesinden) yoksa UYARI ver.
// Böylece Maarif'e yönelik uydurma kodlar üretim öncesi yakalanır.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const uydurma = Object.entries(MAARIF_MAP)
    .filter(([, m]) => m.cikti && !isValidCikti2026(m.cikti))
    .map(([oyun, m]) => `${oyun} → ${m.cikti}`);
  if (uydurma.length) {
    console.warn('⚠️ maarifMap: 2026 belgesinde OLMAYAN (uydurma) Maarif kodu:', uydurma);
  }
}

export function getMaarif(oyunTuru: string): MaarifEntry {
  return MAARIF_MAP[oyunTuru] ?? { ...DEFAULT_MAARIF, displayName: oyunTuru };
}
