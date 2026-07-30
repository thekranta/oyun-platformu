// ============================================================
// MAARİF EŞLEME - TEK DOĞRU KAYNAK
// ------------------------------------------------------------
// Oyun türü (DB'deki `oyun_turu`) -> Maarif Modeli eşlemesi.
// admin.tsx analiz motoru, panel rozeti ve raporlar BURADAN okur;
// böylece bir oyunun Maarif karşılığı tek yerde tanımlanır.
//
// ÖNEMLİ: `cikti` kodları raw_curriculum.txt'de GERÇEKTEN var olan
// kodlardan seçilmelidir (uydurma kod yok). Bu müfredatta ayrı bir
// "Sosyal-Duygusal" alanı YOKTUR; duygu/değer temalı oyunlar, kod
// tabanının mevcut deseniyle Türkçe "Dinleme/İzleme" (TADB.2) altında
// bir `deger` ile eşlenir; panelde dostça etiket için `badgeAlan` kullanılır.
//
// Yeni oyun eklerken: buraya bir kayıt ekle -> analiz + rozet otomatik doğru olur.
// ============================================================

export interface MaarifEntry {
  displayName: string;        // Panelde/raporda görünen Türkçe oyun adı
  alan: string;               // Analiz alanı (belgede geçen): Matematik | Fen | Türkçe ...
  surec: string;              // Alan becerisi / süreç
  cikti: string;              // Öğrenme çıktısı kodu (belgelenmiş): MAB.2, FAB.2, TADB.2 ...
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
  ciktiAciklama: 'Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme',
};

export const MAARIF_MAP: Record<string, MaarifEntry> = {
  // ---------- Matematik ----------
  'hafiza': { displayName: 'Çiftini Bul!', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme' },
  'yapboz': { displayName: 'Yapboz', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Bir bütünü oluşturan parçaları gösterir, parçalar arası ilişkiyi açıklar' },
  'sayilari-birlestir': { displayName: 'Sayıları Birleştir', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme (1-5 arası nesne/varlık sayısını söyler)' },
  'siralama': { displayName: 'Sıralama', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme (karşılaştırma)' },
  'diziyi-tamamla': { displayName: 'Diziyi Tamamla', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Örüntüyü kuralına uygun olarak devam ettirir' },
  'eksik-sayi-bul': { displayName: 'Eksik Sayıyı Bul', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematiksel durumlara ilişkin eksik/fazla/uyumsuz olan parçaları söyler' },
  'kodlama': { displayName: 'Minik Kaşif', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.7', ciktiAciklama: 'Matematiksel problemler ve çözümlerine ilişkin stratejiler geliştirebilme' },
  'kutuyu-bul': { displayName: 'Kutuyu Bul!', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme, görsel tarama' },
  'golge-dedektifi': { displayName: 'Gölge Dedektifi', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme' },
  'onluk-cerceve': { displayName: 'Onluk Çerçeve', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme (1-20 arası nesne/varlık sayısını söyler)' },
  'sayi-komsulari': { displayName: 'Sayı Komşuları', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme' },
  'tarti-dengesi': { displayName: 'Tartı Dengesi', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematiksel problemlerin parçaları arasındaki ilişkileri açıklar' },
  'miktar-avcisi': { displayName: 'Miktar Avcısı', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme; nicelikleri karşılaştırır (çok/az)' },
  'sihirli-siseler': { displayName: 'Sihirli Şişeler', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme; renklere göre gruplama' },
  'renkli-baglantalar': { displayName: 'Renkli Bağlantılar', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme; eşleştirme ve dikkat' },
  'mutfak-dedektifi': { displayName: 'Mutfak Dedektifi', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme; görsel dikkat ve sınıflandırma' },
  'sihirli-tuval': { displayName: 'Sihirli Tuval: Sayılarla Boyama', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.9', ciktiAciklama: 'Farklı matematiksel temsillerden yararlanabilme - Çeşitli semboller arasından belirtilen matematiksel temsilleri gösterir' },
  'uzay-bloklari': { displayName: 'Uzay Blokları: Yıldız Mimarı', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Bir bütünü oluşturan parçaları gösterir, parçalar arasındaki ilişki/ilişkisizlik durumlarını açıklar' },

  // ---------- Fen ----------
  'gruplama': { displayName: 'Gruplama', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesne, olayları benzerlik ve farklılıklarına göre sınıflandırabilme' },

  // ---------- Türkçe ----------
  'bunu-soyle': { displayName: 'Bunu Söyle!', alan: 'Türkçe', surec: 'Konuşma / İçerik Oluşturma', cikti: 'TAKB.2', ciktiAciklama: 'Konuşma sürecinin içeriğini oluşturabilme' },
  'rakam-yazma': { displayName: 'Rakam Yazma', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme (boyama ve çizgi çalışmaları)' },
  'yaratici-cizim': { displayName: 'Hayal Defteri', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme (boyama ve çizgi çalışmaları)', badgeAlan: 'Sanat / Yazma Öncesi' },

  // ---------- Değer Hikayeleri (Türkçe Dinleme/İzleme + değer) ----------
  'ceviz_macera': { displayName: 'Ceviz Macerası', alan: 'Türkçe', surec: 'Dinleme/İzleme', cikti: 'TADB.2', ciktiAciklama: 'Dinledikleri/izledikleri materyaller ile ilgili yeni anlamlar oluşturabilme', deger: 'Yardımseverlik', isValueStory: true, badgeAlan: 'Sosyal-Duygusal' },
  'aile-sepeti': { displayName: 'Aile Sepeti', alan: 'Türkçe', surec: 'Dinleme/İzleme', cikti: 'TADB.2', ciktiAciklama: 'Dinledikleri/izledikleri iletilerde yer alan bilgiler ile günlük yaşamı arasında ilişki kurar', deger: 'Aile Bütünlüğü', isValueStory: true, badgeAlan: 'Sosyal-Duygusal' },
  'adalet-hikayesi': { displayName: 'Adalet Hikayesi', alan: 'Türkçe', surec: 'Dinleme/İzleme', cikti: 'TADB.2', ciktiAciklama: 'Dinledikleri/izledikleri materyaller ile ilgili yeni anlamlar oluşturabilme - Materyallerdeki olayları belirler', deger: 'Adalet', isValueStory: true, badgeAlan: 'Sosyal-Duygusal' },
  'sevgi-hikayesi': { displayName: 'Küçük Kalpler', alan: 'Türkçe', surec: 'Dinleme/İzleme', cikti: 'TADB.2', ciktiAciklama: 'Dinledikleri/izledikleri materyaller ile ilgili yeni anlamlar oluşturabilme; sevgi ve empati bağlamında yorumlar', deger: 'Sevgi', isValueStory: true, badgeAlan: 'Sosyal-Duygusal' },

  // ---------- Duygu tanıma (nicel; standart analiz dalı) ----------
  'duygu-yuzleri': { displayName: 'Duygu Yüzleri', alan: 'Türkçe', surec: 'Dinleme/İzleme', cikti: 'TADB.2', ciktiAciklama: 'İzlediği durumlardaki olayları belirleyip uygun duyguyu eşleştirebilme (duygu farkındalığı)', deger: 'Duygu Farkındalığı & Empati', badgeAlan: 'Sosyal-Duygusal' },

  // ---------- Kavramlar (yeni; nicel; standart analiz dalı) ----------
  'renk-sepetleri': { displayName: 'Renk Sepetleri', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini (renk) çözümleyip özelliğe göre eşleştirebilme/ayırabilme', badgeAlan: 'Kavram (Renk)' },
  'zitlari-eslestir': { displayName: 'Zıtları Eşleştir', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Nesne, olgu ve olayları karşılaştırır; zıt kavram ilişkisini kurar', badgeAlan: 'Kavram (Zıtlıklar)' },
  'sekil-treni': { displayName: 'Şekil Treni', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini (geometrik şekil) çözümleyip şekle göre ayırt edebilme', badgeAlan: 'Kavram (Şekil)' },
  'ayi-ailesi': { displayName: 'Ayı Ailesi', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Nesneleri özelliklerine (boyut) göre karşılaştırır ve küçükten büyüğe sıralar', badgeAlan: 'Kavram (Boyut)' },
  'ciftlikte-sayalim': { displayName: 'Çiftlikte Sayalım', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme (1-5 arası nesne sayısını söyler, sayı-nicelik ilişkisi)', badgeAlan: 'Kavram (Sayma)' },
  'ayni-farkli': { displayName: 'Aynı mı Farklı mı?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Nesne ve görselleri karşılaştırır; aynı/farklı olanı ayırt eder', badgeAlan: 'Kavram (Ayırt Etme)' },
  'hangisi-farkli': { displayName: 'Hangisi Farklı?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Nesneleri benzerlik ve farklılıklarına göre değerlendirir; gruba uymayanı bulur', badgeAlan: 'Kavram (Ayırt Etme)' },
  'buyuk-orta-kucuk': { displayName: 'Büyük-Orta-Küçük', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Nesneleri boyutlarına göre karşılaştırır (büyük/orta/küçük)', badgeAlan: 'Kavram (Boyut)' },
  'neredeyim': { displayName: 'Neredeyim?', alan: 'Sosyal Bilgiler', surec: 'Mekânsal Düşünme', cikti: 'SAB.5', ciktiAciklama: 'Nesnelerin/kişilerin konumlarını mekânsal kavramlarla ifade eder (içinde/üstünde/altında/yanında)', badgeAlan: 'Kavram (Konum)' },
  'once-sonra': { displayName: 'Önce-Sonra', alan: 'Sosyal Bilgiler', surec: 'Zamanı Algılama ve Kronolojik Düşünme', cikti: 'SAB.1', ciktiAciklama: 'Günlük hayatında zaman kavramını kullanır; olayları oluş sırasına (önce-sonra) göre dizer', badgeAlan: 'Kavram (Zaman)' },
  'sayiyi-bul': { displayName: 'Sayıyı Bul', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Rakamı tanır; verilen rakam kadar nesne içeren grubu eşler (sayı-nicelik ilişkisi)', badgeAlan: 'Kavram (Sayı)' },
  'en-uzun': { displayName: 'En Uzun Hangisi?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Nesneleri uzunluklarına göre karşılaştırır; en uzun olanı belirler', badgeAlan: 'Kavram (Uzunluk)' },
  'dogru-kutu': { displayName: 'Doğru Kutu', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Nesneleri türlerine/kategorilerine göre sınıflandırır (hayvan/yiyecek)', badgeAlan: 'Kavram (Sınıflandırma)' },
  'ikizleri-bul': { displayName: 'İkizleri Bul', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümler; birbirinin aynısı olanları eşleştirir', badgeAlan: 'Kavram (Eşleştirme)' },
  'ne-ise-yarar': { displayName: 'Ne İşe Yarar?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Nesneleri günlük yaşamdaki ilişkilerine göre eşleştirir (şemsiye-yağmur gibi)', badgeAlan: 'Kavram (İlişki)' },
  'renk-oruntusu': { displayName: 'Renk Örüntüsü', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Örüntüyü kuralına uygun olarak sürdürür; sıradaki ögeyi belirler', badgeAlan: 'Kavram (Örüntü)' },
  'nokta-say': { displayName: 'Nokta Say', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme (noktaları sayıp sayıyı belirler)', badgeAlan: 'Kavram (Sayma)' },
  'canli-cansiz': { displayName: 'Canlı mı Cansız mı?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Nesneleri canlı/cansız özelliğine göre sınıflandırır', badgeAlan: 'Kavram (Canlı/Cansız)' },
  'yuzer-batar': { displayName: 'Yüzer mi Batar mı?', alan: 'Fen', surec: 'Bilimsel Gözleme Dayalı Tahmin Etme', cikti: 'FAB.3', ciktiAciklama: 'Nesnelerin suda yüzüp batacağına yönelik gözleme dayalı tahmin yapar', badgeAlan: 'Kavram (Tahmin)' },
  'duygu-eslestir': { displayName: 'Duygu Eşleştir', alan: 'Türkçe', surec: 'Dinleme/İzleme', cikti: 'TADB.2', ciktiAciklama: 'Duygu ifadelerini tanır; aynı duyguya sahip yüzleri eşleştirir', deger: 'Duygu Farkındalığı', badgeAlan: 'Sosyal-Duygusal' },
  'sirayi-hatirla': { displayName: 'Sırayı Hatırla', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Sıralı bilgiyi kısa süreli bellekte tutar ve aynı sırayla tekrarlar (çalışma belleği/dikkat)', badgeAlan: 'Bilişsel (Bellek)' },
  'agir-hafif': { displayName: 'En Ağır Hangisi?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Nesneleri ağırlıklarına göre karşılaştırır; en ağır olanı belirler', badgeAlan: 'Kavram (Ağırlık)' },
  'gunduz-gece': { displayName: 'Gündüz mü Gece mi?', alan: 'Sosyal Bilgiler', surec: 'Zamanı Algılama ve Kronolojik Düşünme', cikti: 'SAB.1', ciktiAciklama: 'Zaman kavramını kullanır; nesne/olayları gündüz-gece ile ilişkilendirir', badgeAlan: 'Kavram (Zaman)' },
  'kac-oldu': { displayName: 'Kaç Oldu?', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'İki grubu birleştirip toplam nesne sayısını söyler (5e kadar toplama)', badgeAlan: 'Kavram (Toplama)' },
  'renkleri-karistir': { displayName: 'Renkleri Karıştır', alan: 'Fen', surec: 'Bilimsel Gözleme Dayalı Tahmin Etme', cikti: 'FAB.3', ciktiAciklama: 'İki rengin karışımı sonucu oluşacak rengi gözleme dayalı tahmin eder', badgeAlan: 'Kavram (Renk)' },
  'sekil-deligi': { displayName: 'Şekil Deliği', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Geometrik şeklin özelliklerini çözümler; aynı şekilli boşlukla eşler', badgeAlan: 'Kavram (Şekil)' },
  'az-cok-sirala': { displayName: 'Az → Çok Sırala', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Grupları niceliklerine göre karşılaştırır ve az-çok sırasına dizer', badgeAlan: 'Kavram (Nicelik)' },
};

/** Oyun türünün Maarif kaydını döndürür; yoksa varsayılan (MAB.2). */
export function getMaarif(oyunTuru: string): MaarifEntry {
  return MAARIF_MAP[oyunTuru] ?? { ...DEFAULT_MAARIF, displayName: oyunTuru };
}
