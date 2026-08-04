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

import { isValidCikti } from './maarifCurriculum';

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
  'hafiza-2': { displayName: 'Hayvan Çiftleri', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyip aynı olanları eşleştirebilme; görsel bellek (hayvan teması)', badgeAlan: 'Dikkat & Bellek' },
  'yapboz': { displayName: 'Yapboz', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Bir bütünü oluşturan parçaları gösterir, parçalar arası ilişkiyi açıklar' },
  'sayilari-birlestir': { displayName: 'Sayıları Birleştir', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme (1-5 arası nesne/varlık sayısını söyler)' },
  'siralama': { displayName: 'Sıralama', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme (karşılaştırma)' },
  'diziyi-tamamla': { displayName: 'Diziyi Tamamla', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Örüntüyü kuralına uygun olarak devam ettirir' },
  'diziyi-tamamla-2': { displayName: 'Örüntü Ustası', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Örüntüyü kuralına uygun olarak devam ettirir (çok şekilli, ileri seviye)' },
  'eksik-sayi-bul': { displayName: 'Eksik Sayıyı Bul', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematiksel durumlara ilişkin eksik/fazla/uyumsuz olan parçaları söyler' },
  'eksik-sayi-bul-2': { displayName: 'Eksik Sayıyı Bul 6-10', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematiksel durumlara ilişkin eksik olan parçayı söyler (6-10 sayı dizisi)' },
  'kodlama': { displayName: 'Minik Kaşif', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.7', ciktiAciklama: 'Matematiksel problemler ve çözümlerine ilişkin stratejiler geliştirebilme' },
  'kutuyu-bul': { displayName: 'Kutuyu Bul!', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme, görsel tarama' },
  'golge-dedektifi': { displayName: 'Gölge Dedektifi', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme' },
  'golge-dedektifi-2': { displayName: 'Gölge Dedektifi: Uzman', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyip gölge-nesne eşleştirebilme (çeldiricili, ileri seviye)', badgeAlan: 'Dikkat' },
  'onluk-cerceve': { displayName: 'Onluk Çerçeve', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme (1-20 arası nesne/varlık sayısını söyler)' },
  'onluk-cerceve-2': { displayName: 'Yıldız Çerçevesi', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme; 6-10 arası nesneyi çerçeveye yerleştirir (yıldız teması)' },
  'sayi-komsulari': { displayName: 'Sayı Komşuları', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.4', ciktiAciklama: 'Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme' },
  'tarti-dengesi': { displayName: 'Tartı Dengesi', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematiksel problemlerin parçaları arasındaki ilişkileri açıklar' },
  'miktar-avcisi': { displayName: 'Miktar Avcısı', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme; nicelikleri karşılaştırır (çok/az)' },
  'miktar-avcisi-2': { displayName: 'Deniz Avcısı', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme; nicelikleri karşılaştırır (çok/az), deniz teması' },
  'akilli-sayi-avi': { displayName: 'Akıllı Sayı Avı', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme; nesneleri sayıp doğru sayıyla eşleştirir (performansa göre uyarlanır zorluk)' },
  'akilli-miktar': { displayName: 'Akıllı Miktar', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Ritmik ve algısal sayabilme; nicelikleri karşılaştırır (çok/az) (performansa göre uyarlanır zorluk)' },
  'akilli-oruntu': { displayName: 'Akıllı Örüntü', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Matematiksel olgu/olay/nesnelere ilişkin çıkarım yapabilme; örüntüyü kuralına uygun sürdürür (performansa göre uyarlanır zorluk)' },
  'akilli-eksik-sayi': { displayName: 'Akıllı Eksik Sayı', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.5', ciktiAciklama: 'Matematiksel durumlara ilişkin eksik olan parçayı söyler; sayı dizisindeki boşluğu tamamlar (performansa göre uyarlanır zorluk)' },
  'akilli-siralama': { displayName: 'Akıllı Sıralama', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Matematiksel olgu/olay/nesnelere ilişkin çıkarım yapabilme; nesneleri niceliğine göre azdan çoğa sıralar (performansa göre uyarlanır zorluk)' },
  'akilli-toplama': { displayName: 'Akıllı Toplama', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.7', ciktiAciklama: 'Matematiksel problemler ve çözümlerine ilişkin stratejiler geliştirebilme; iki grubu birleştirip toplar (performansa göre uyarlanır zorluk)' },
  'akilli-farkli': { displayName: 'Akıllı Farklı', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Nesneleri benzerlik ve farklılıklarına göre sınıflandırabilme; gruba uymayan farklı olanı bulur (performansa göre uyarlanır zorluk)', badgeAlan: 'Dikkat / Ayırt Etme' },
  'akilli-cikarma': { displayName: 'Akıllı Çıkarma', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.7', ciktiAciklama: 'Matematiksel problemler ve çözümlerine ilişkin stratejiler geliştirebilme; gruptan ayrılanları çıkarıp kalanı bulur (performansa göre uyarlanır zorluk)' },
  'akilli-hafiza': { displayName: 'Akıllı Hafıza', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyip aynı olanları eşleştirebilme; görsel bellek (performansa göre uyarlanır zorluk)', badgeAlan: 'Dikkat & Bellek' },
  'akilli-harf': { displayName: 'Akıllı Harf', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazı Farkındalığı', cikti: 'TAEOB.1', ciktiAciklama: 'Yazı farkındalığına ilişkin becerileri gösterebilme; harflerin biçimini ayırt eder, aynı harfi eşleştirir (performansa göre uyarlanır zorluk)' },
  'akilli-siniflandir': { displayName: 'Akıllı Sınıflandır', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesne/olguları benzerlik ve farklılıklarına göre sınıflandırabilme; nesneleri doğru kategoriye ayırır (performansa göre uyarlanır zorluk)' },
  'akilli-once-sonra': { displayName: 'Akıllı Önce-Sonra', alan: 'Sosyal', surec: 'Sosyal Alan / Zaman', cikti: 'SAB.2', ciktiAciklama: 'Kendisine/ailesine/bir hikâyeye ait görselleri oluş sırasına göre sıralayabilme (performansa göre uyarlanır zorluk)', badgeAlan: 'Sosyal / Zaman' },
  'dunya-bayraklari': { displayName: 'Dünya Bayrakları', alan: 'Sosyal', surec: 'Sosyal Alan / Kültür', cikti: 'SAB.2', ciktiAciklama: 'Toplumsal yaşama yönelik kültürel unsurları/durumları çözümleyebilme; farklı ülkelerin bayraklarını tanıyıp eşleştirir (Montessori kültürel farkındalık)', badgeAlan: 'Sosyal / Kültür' },
  'dunya-selamlari': { displayName: 'Dünya Selamları', alan: 'Sosyal', surec: 'Sosyal Alan / Kültür', cikti: 'SAB.2', ciktiAciklama: 'Toplumsal yaşama yönelik kültürel unsurları çözümleyebilme; farklı ülkelerin selamlaşmalarını tanır (Montessori kültürel farkındalık)', badgeAlan: 'Sosyal / Kültür' },
  'dunya-yapilari': { displayName: 'Dünya Yapıları', alan: 'Sosyal', surec: 'Sosyal Alan / Kültür', cikti: 'SAB.2', ciktiAciklama: 'Toplumsal yaşama yönelik kültürel unsurları çözümleyebilme; dünyanın simge yapı/anıtlarını tanır (Montessori kültürel farkındalık)', badgeAlan: 'Sosyal / Kültür' },
  'dunya-yiyecekleri': { displayName: 'Dünya Yiyecekleri', alan: 'Sosyal', surec: 'Sosyal Alan / Kültür', cikti: 'SAB.2', ciktiAciklama: 'Toplumsal yaşama yönelik kültürel unsurları çözümleyebilme; farklı kültürlerin yiyeceklerini tanır (Montessori kültürel farkındalık)', badgeAlan: 'Sosyal / Kültür' },
  'bayrak-boya': { displayName: 'Bayrak Boya', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme (boyama çalışması); bayrakları örneğe göre doğru renklerle boyar, kültürel farkındalık', badgeAlan: 'Sanat / Kültür' },
  'sihirli-siseler': { displayName: 'Sihirli Şişeler', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme; renklere göre gruplama' },
  'renkli-baglantalar': { displayName: 'Renkli Bağlantılar', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme; eşleştirme ve dikkat' },
  'mutfak-dedektifi': { displayName: 'Mutfak Dedektifi', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesnelerin özelliklerini çözümleyebilme; görsel dikkat ve sınıflandırma' },
  'sihirli-tuval': { displayName: 'Sihirli Tuval: Sayılarla Boyama', alan: 'Matematik', surec: 'Matematiksel Temsil', cikti: 'MAB.9', ciktiAciklama: 'Farklı matematiksel temsillerden yararlanabilme - Çeşitli semboller arasından belirtilen matematiksel temsilleri gösterir' },
  'uzay-bloklari': { displayName: 'Uzay Blokları: Yıldız Mimarı', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Bir bütünü oluşturan parçaları gösterir, parçalar arasındaki ilişki/ilişkisizlik durumlarını açıklar' },

  // ---------- Fen ----------
  'gruplama': { displayName: 'Gruplama', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Fene yönelik nesne, olayları benzerlik ve farklılıklarına göre sınıflandırabilme' },
  'sonra-ne-olur': { displayName: 'Sonra Ne Olur?', alan: 'Fen', surec: 'Bilimsel Veriye Dayalı Tahmin', cikti: 'FAB.4', ciktiAciklama: 'Fene yönelik olay/olgulara bilimsel veriye dayalı tahminde bulunabilme; olaylar dizisinde "sonra ne olur?" mantığıyla sonucu öngörür', badgeAlan: 'Fen (Tahmin)' },

  // ---------- Türkçe ----------
  'bunu-soyle': { displayName: 'Bunu Söyle!', alan: 'Türkçe', surec: 'Konuşma / İçerik Oluşturma', cikti: 'TAKB.2', ciktiAciklama: 'Konuşma sürecinin içeriğini oluşturabilme' },
  'rakam-yazma': { displayName: 'Rakam Yazma', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme (boyama ve çizgi çalışmaları)' },
  'rakam-yazma-2': { displayName: 'Rakam Yazma 6-10', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme; 6-10 rakamlarını çizerek yazı öncesi el kaslarını güçlendirir', badgeAlan: 'Sanat / Yazma Öncesi' },
  'yaratici-cizim': { displayName: 'Hayal Defteri', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yazma öncesi becerileri kazanabilme (boyama ve çizgi çalışmaları)', badgeAlan: 'Sanat / Yazma Öncesi' },
  'kafiye-bahcesi': { displayName: 'Kafiye Bahçesi', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Okuma Öncesi', cikti: 'TAEOB.5', ciktiAciklama: 'Okuma öncesi becerileri kazanabilme; kafiyeli (uyaklı) kelimeleri sesletip eşleştirir (sesbilgisel farkındalık)', badgeAlan: 'Dil (Kafiye)' },
  'resimde-ne-ters': { displayName: 'Resimde Ne Ters?', alan: 'Türkçe', surec: 'Görsel Okuma', cikti: 'TAOB.3', ciktiAciklama: 'Görsel materyalleri çözümleyebilme; resimdeki uyumsuz/yanlış ögeyi (ne ters?) fark eder (görsel okuryazarlık ve dikkat)', badgeAlan: 'Dil (Görsel Okuma)' },

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

  // ---------- Diğer kategoriler (Sanat / Dil / Sosyal-Duygusal / Dikkat / Matematik) ----------
  'ilk-harf': { displayName: 'İlk Harf', alan: 'Türkçe', surec: 'Erken Okuryazarlık', cikti: 'TAEOB.6', ciktiAciklama: 'Harf-ses ilişkisi; verilen harfle başlayan kelimeyi/görseli bulur (ilk ses farkındalığı)', badgeAlan: 'Dil (İlk Harf)' },
  'kac-kaldi': { displayName: 'Kaç Kaldı?', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Kalan nesneleri sayar (5e kadar çıkarma sezgisi)', badgeAlan: 'Matematik (Çıkarma)' },
  'buyuk-sayi': { displayName: 'Büyük Sayı Hangisi?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'İki sayıyı karşılaştırır; hangisinin daha büyük olduğunu belirler', badgeAlan: 'Matematik (Karşılaştırma)' },
  'ne-degisti': { displayName: 'Ne Değişti?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Görsel bilgiyi bellekte tutar; değişen ögeyi fark eder (dikkat/çalışma belleği)', badgeAlan: 'Bilişsel (Dikkat)' },
  'iyilik-yap': { displayName: 'İyilik Yap', alan: 'Türkçe', surec: 'Dinleme/İzleme', cikti: 'TADB.2', ciktiAciklama: 'Durumları yorumlar; empati kurarak nazik/yardımsever davranışı seçer', deger: 'Yardımseverlik ve Nezaket', badgeAlan: 'Sosyal-Duygusal' },
  'cizim-sayfalari': { displayName: 'Çizim Sayfaları', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Kılavuz çizgileri takip ederek yazma öncesi çizgi çalışması ve el-göz koordinasyonu geliştirir', badgeAlan: 'Sanat / Çizgi Çalışması' },

  // ---------- Sağlık & Öz Bakım (Hareket/Sağlık - HSAB) ----------
  'vucudum': { displayName: 'Vücudum', alan: 'Hareket ve Sağlık', surec: 'Beden Farkındalığı', cikti: 'HSAB.4', ciktiAciklama: 'Beden farkındalığı; yüz/vücut organlarını tanır ve gösterir', badgeAlan: 'Sağlık (Beden)' },
  'duyularimiz': { displayName: 'Duyularımız', alan: 'Hareket ve Sağlık', surec: 'Beden Farkındalığı', cikti: 'HSAB.4', ciktiAciklama: 'Duyu farkındalığı; uyaranı algıladığımız duyu organını eşler', badgeAlan: 'Sağlık (Duyular)' },
  'saglikli-yiyecek': { displayName: 'Sağlıklı mı?', alan: 'Hareket ve Sağlık', surec: 'Sağlıklı Beslenme', cikti: 'HSAB.7', ciktiAciklama: 'Sağlıklı beslenme farkındalığı; sağlıklı yiyeceği ayırt eder', badgeAlan: 'Sağlık (Beslenme)' },
  'temizlik-zamani': { displayName: 'Temizlik Zamanı', alan: 'Hareket ve Sağlık', surec: 'Temizlik ve Düzen', cikti: 'HSAB.9', ciktiAciklama: 'Temizlik ve düzen alışkanlığı; duruma uygun temizlik aracını seçer', badgeAlan: 'Sağlık (Temizlik)' },
  'guvende-kal': { displayName: 'Güvende Kal', alan: 'Hareket ve Sağlık', surec: 'Güvenlik', cikti: 'HSAB.10', ciktiAciklama: 'Tehlike ve kazalardan korunma; güvenli davranışı seçer', badgeAlan: 'Sağlık (Güvenlik)' },
  'hava-kiyafet': { displayName: 'Hava & Kıyafet', alan: 'Fen', surec: 'Bilimsel Gözlem Yapma', cikti: 'FAB.1', ciktiAciklama: 'Hava olaylarını günlük yaşamla ilişkilendirir; duruma uygun kıyafeti seçer', badgeAlan: 'Fen (Günlük Yaşam)' },

  // ---------- Dalga 8 (problem çözme, fen, sosyal, matematik) ----------
  'labirent': { displayName: 'Labirent', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.7', ciktiAciklama: 'Hedefe ulaşmak için yol/strateji planlar; problem çözer', badgeAlan: 'Bilişsel (Problem Çözme)' },
  'hayvan-evi': { displayName: 'Hayvan Evi', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Canlıları yaşam alanlarına göre sınıflandırır (balık-su, aslan-orman)', badgeAlan: 'Fen (Canlılar)' },
  'meslekler': { displayName: 'Meslekler', alan: 'Sosyal Bilgiler', surec: 'Toplumsal Yaşam', cikti: 'SAB.3', ciktiAciklama: 'Meslekleri ve toplumsal rolleri tanır; meslek-araç ilişkisi kurar', badgeAlan: 'Sosyal (Meslekler)' },
  'buyuyunce': { displayName: 'Büyüyünce Ne Olur?', alan: 'Fen', surec: 'Bilimsel Gözlem Yapma', cikti: 'FAB.1', ciktiAciklama: 'Canlıların büyüme ve değişimini gözlemler (tırtıl-kelebek, yaşam döngüsü)', badgeAlan: 'Fen (Değişim)' },
  'geri-donusum': { displayName: 'Geri Dönüşüm', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Atıkları malzemesine göre sınıflandırır; çevre bilinci geliştirir', badgeAlan: 'Fen (Çevre)' },
  'esit-paylastir': { displayName: 'Eşit Paylaştır', alan: 'Matematik', surec: 'Matematiksel Problem Çözme', cikti: 'MAB.4', ciktiAciklama: 'Nesneleri eşit gruplara ayırır; adil paylaşım (bölmeye giriş)', badgeAlan: 'Matematik (Paylaşım)' },

  // ---------- Dalga 9 (taşıtlar, beslenme, günlük yaşam, ton, sıcaklık) ----------
  'araclar': { displayName: 'Araçlar Nerede Gider?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Taşıtları hareket ettiği ortama göre sınıflandırır (kara/deniz/hava)', badgeAlan: 'Fen (Taşıtlar)' },
  'ne-yer': { displayName: 'Ne Yer?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Canlıların beslenmesine dair bilgi; hayvan-besin ilişkisi kurar', badgeAlan: 'Fen (Beslenme)' },
  'ne-nerede': { displayName: 'Ne Nerede?', alan: 'Fen', surec: 'Sınıflandırma', cikti: 'FAB.2', ciktiAciklama: 'Eşyaları kullanıldığı yere/odaya göre sınıflandırır (günlük yaşam)', badgeAlan: 'Fen (Günlük Yaşam)' },
  'gunum': { displayName: 'Günüm', alan: 'Sosyal Bilgiler', surec: 'Zamanı Algılama ve Kronolojik Düşünme', cikti: 'SAB.1', ciktiAciklama: 'Günlük rutini zaman sırasına (sabah-akşam) koyar; zaman kavramı', badgeAlan: 'Kavram (Zaman)' },
  'renk-tonlari': { displayName: 'Renk Tonları', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.3', ciktiAciklama: 'Renk tonlarını açıktan koyuya göre karşılaştırır ve sıralar (seriation)', badgeAlan: 'Kavram (Ton)' },
  'sicak-soguk': { displayName: 'Sıcak mı Soğuk mu?', alan: 'Matematik', surec: 'Matematiksel Muhakeme', cikti: 'MAB.2', ciktiAciklama: 'Nesneleri sıcaklık özelliğine göre çözümler ve sınıflandırır', badgeAlan: 'Kavram (Sıcaklık)' },

  // ---------- Çizim (Sanat) - farklı formatlar ----------
  'simetri-cizim': { displayName: 'Simetri Çizim', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Serbest çizim ve el-göz koordinasyonu; simetri sezgisi (aynalı çizim)', badgeAlan: 'Sanat / Simetri' },
  'damga-sanati': { displayName: 'Damga Sanatı', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yaratıcı ifade ve kompozisyon; damga/çıkartma ile sahne oluşturma', badgeAlan: 'Sanat / Kompozisyon' },
  'boyama-kitabi': { displayName: 'Boyama Kitabı', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yaratıcı ifade ve renk seçimi; resim bölgelerini boyama (ince motor)', badgeAlan: 'Sanat / Boyama' },
  'nokta-birlestir': { displayName: 'Nokta Birleştir', alan: 'Matematik', surec: 'Sayma', cikti: 'MAB.1', ciktiAciklama: 'Sayıları 1\'den itibaren sırayla izler ve çizgiyle birleştirir (sayı sırası + çizgi çalışması)', badgeAlan: 'Çizim / Sayı Sırası' },
  'sayi-boya': { displayName: 'Sayı-Boya', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Sayı-renk eşleştirerek boyama; renk seçimi + sayı tanıma + ince motor', badgeAlan: 'Sanat / Sayı-Boya' },
  'mandala': { displayName: 'Mandala', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yaratıcı ifade ve radyal simetri (çizim merkez etrafında çoğalır)', badgeAlan: 'Sanat / Simetri' },
  'nokta-boyama': { displayName: 'Nokta Boyama', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Noktalarla (pointillism) yaratıcı boyama; el-göz koordinasyonu', badgeAlan: 'Sanat / Boyama' },
  'cizimi-canlandir': { displayName: 'Çizimini Canlandır', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Serbest yaratıcı çizim; çizimini canlandırarak eğlenme', badgeAlan: 'Sanat / Yaratıcı' },
  'yuz-yap': { displayName: 'Yüz Yap', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Parçalarla yüz/karakter oluşturma; parça-bütün ve yaratıcı ifade', badgeAlan: 'Sanat / Kolaj' },
  'yarisini-tamamla': { displayName: 'Yarısını Tamamla', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Simetri farkındalığı; resmin eksik yarısını çizerek tamamlama', badgeAlan: 'Sanat / Simetri' },
  'kum-boyasi': { displayName: 'Kum Boyası', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Duyusal yaratıcı ifade; akan renklerle serbest boyama', badgeAlan: 'Sanat / Boyama' },
  'adim-adim': { displayName: 'Adım Adım Çizim', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Yönerge takibiyle adım adım çizim; el-göz koordinasyonu (yazma öncesi)', badgeAlan: 'Sanat / Rehberli' },
  'sayi-boya-2': { displayName: 'Sayı-Boya 2', alan: 'Türkçe', surec: 'Erken Okuryazarlık / Yazma Öncesi', cikti: 'TAEOB.6', ciktiAciklama: 'Detaylı sayı-renk eşleştirmeli boyama (daha büyük grid, 6 renk); renk-sayı ilişkisi + ince motor', badgeAlan: 'Sanat / Sayı-Boya' },
};

/** Oyun türünün Maarif kaydını döndürür; yoksa varsayılan (MAB.2). */
// Geliştirme-zamanı bekçisi: bir oyunun `cikti` kodu kanonik curriculum'da
// (constants/maarifCurriculum.ts, raw_curriculum.txt'ten) yoksa UYARI ver.
// Böylece Maarif'e yönelik uydurma kodlar üretim öncesi yakalanır.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const uydurma = Object.entries(MAARIF_MAP)
    .filter(([, m]) => m.cikti && !isValidCikti(m.cikti))
    .map(([oyun, m]) => `${oyun} → ${m.cikti}`);
  if (uydurma.length) {
    console.warn('⚠️ maarifMap: belgede OLMAYAN (uydurma) Maarif kodu:', uydurma);
  }
}

export function getMaarif(oyunTuru: string): MaarifEntry {
  return MAARIF_MAP[oyunTuru] ?? { ...DEFAULT_MAARIF, displayName: oyunTuru };
}
