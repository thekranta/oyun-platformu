/**
 * maarifCurriculum2026.ts — KANONİK Maarif çıktı kodları, 2026 program (tek doğruluk kaynağı)
 * ------------------------------------------------------------
 * Bu dosya, "Türkiye Yüzyılı Maarif Modeli — Okul Öncesi Eğitim Programı" (2026,
 * TTKB) PDF'inden LİTERAL olarak çıkarılmış TÜM Öğrenme Çıktısı kodlarını ve
 * resmi açıklamalarını içerir. Kaynak PDF: "Okul_Öncesi_EP_TTKB.pdf" (67 sayfa).
 *
 * Bu, ESKİ `constants/maarifCurriculum.ts` (2024 öncesi program, 92 kod) dosyasının
 * YERİNE GEÇMEK ÜZERE hazırlanmıştır ama henüz `maarifMap.ts`'e BAĞLANMADI — bu
 * kasıtlı: önce kod sözlüğü tek başına gözden geçirilecek, oyun-eşleme (137 oyun)
 * ayrı ve dikkatli bir sonraki adımda yapılacak.
 *
 * ⚠️ ESKİ KOD NUMARALARIYLA KARIŞTIRMAYIN: 2026 programında NEREDEYSE HER ALAN
 * yeniden numaralandırıldı. Örnek: eski MAB.1 = "Ritmik ve algısal sayabilme",
 * yeni MAB.1 = "Sayıları farklı durumlarda doğru kullanabilme" — aynı kod,
 * TAMAMEN FARKLI kazanım. Eski dosyadaki hiçbir kod, sadece aynı harf+numara
 * eşleşmesine bakılarak yeni sisteme taşınamaz; her biri bu dosyadan yeniden
 * doğrulanmalıdır.
 *
 * Yapısal fark (2024→2026): Eski sistemde bazı kodlar YAŞA GÖRE FARKLI ÇIKTIYA
 * karşılık geliyordu (`yasaGoreDegisir`). Yeni programda kod düzeyindeki açıklama
 * yaşlar arasında SABİT — sadece kodun altındaki "süreç bileşenleri" (a, b, c...
 * göstergeleri) yaş bandına (36-48 / 48-60 / 60-72 ay) göre değişiyor. Bu dosya
 * sadece kod-düzeyi açıklamayı taşır (eski dosyayla aynı granülerlik), süreç
 * bileşenlerini taşımaz — bu yüzden `yasaGoreDegisir` alanına burada gerek yok.
 *
 * Alan bazında kod sayısı değişimi (2024 → 2026):
 *   Türkçe:            12 → 17  (TAOB/TAKB'ye yeni kodlar eklendi, TAEOB kaydı)
 *   Matematik:         14 → 13  (tamamen yeniden numaralandırıldı)
 *   Fen:                10 → 9  (FAB.5/6/10/11 artık yok — sadece 1,2,3,4,7,8,9,12,13 var)
 *   Sosyal:             22 → 15 (kapsam daraltıldı, SAB.16-22 artık yok)
 *   Hareket ve Sağlık:  14 → 9  (kapsam daraltıldı, HSAB.10-14 artık yok)
 *   Sanat:               4 → 4  (aynı sayı, 2/3'ün ifadesi değişti)
 *   Müzik:              16 → 9  (MYB — Müziksel Yaratıcılık — kategorisi kalktı;
 *                                 MDB 4→3, MSB 3→2, MÇB 4→2, MHB 3→2)
 *   TOPLAM:             92 → 76 (alan kodları) + 7 yeni Sosyal-Duygusal beceri
 *
 * Sosyal-Duygusal Öğrenme Becerileri (SDÖB) — YENİ, ayrı bir bölüm (madde 5):
 * eskiden bizim sistemde ad-hoc bir yer tutucuydu (TADB.2 + "değer" etiketi).
 * 2026 programında kendi başına 3 ana başlık / 7 beceri olarak tanımlanmış ama
 * belgede bunlara resmi "KOD.numara" etiketi VERİLMEMİŞ (sadece isimlendirilmiş).
 * Aşağıdaki `SDB.1`–`SDB.7` kodları BİZİM kendi iç numaralandırmamızdır (diğer
 * alan kodlarıyla tutarlı bir biçim sağlamak için) — resmi Maarif kodu DEĞİLDİR,
 * bu yüzden `resmi: false` ile işaretlenmiştir. Bu 7 beceri isim/açıklaması
 * kendisi belgeden literaldir, sadece "SDB.N" etiketi bize aittir.
 *
 * Kapsam dışı bırakılanlar (belgede kod sistemi YOK, tanım/anlatım düzeyinde):
 * "Kavramsal Beceriler" (madde 6) ve "Eğilimler" (madde 7) — belge bunların
 * "bağımsız bir başlık olarak ele alınmadığını", alan becerileri içine
 * gömülü olduğunu açıkça belirtiyor. "Erdem: Değer-Eylem Çerçevesi" (madde 8)
 * de ayrı bir kod sistemi değil, aylık/haftalık işlenecek değerler takvimi.
 */

export type MaarifAlan2026 =
    | 'Fen'
    | 'Matematik'
    | 'Türkçe'
    | 'Hareket ve Sağlık'
    | 'Sosyal'
    | 'Müzik'
    | 'Sanat'
    | 'Sosyal-Duygusal';

export interface MaarifCikti2026 {
    code: string;
    alan: MaarifAlan2026;
    aciklama: string;
    /** false = bu kod resmi belgede YOK, bizim iç numaralandırmamız (bkz. SDB.*). */
    resmi: boolean;
}

export const MAARIF_CIKTILAR_2026: Record<string, MaarifCikti2026> = {
    // ===== TÜRKÇE ALANI =====
    'TADB.1': { code: 'TADB.1', alan: 'Türkçe', resmi: true, aciklama: 'Dinleyecekleri / izleyecekleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri yönetebilme' },
    'TADB.2': { code: 'TADB.2', alan: 'Türkçe', resmi: true, aciklama: 'Dinledikleri / izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyaller ile ilgili yeni anlamlar oluşturabilme' },
    'TADB.3': { code: 'TADB.3', alan: 'Türkçe', resmi: true, aciklama: 'Dinledikleri / izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri çözümleyebilme' },
    'TADB.4': { code: 'TADB.4', alan: 'Türkçe', resmi: true, aciklama: 'Dinledikleri / izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri değerlendirebilme' },
    'TAOB.1': { code: 'TAOB.1', alan: 'Türkçe', resmi: true, aciklama: 'Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerini seçebilme' },
    'TAOB.2': { code: 'TAOB.2', alan: 'Türkçe', resmi: true, aciklama: 'Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerinden anlamlar oluşturabilme' },
    'TAOB.3': { code: 'TAOB.3', alan: 'Türkçe', resmi: true, aciklama: 'Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerini çözümleyebilme' },
    'TAOB.4': { code: 'TAOB.4', alan: 'Türkçe', resmi: true, aciklama: 'Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerini değerlendirebilme' },
    'TAKB.1': { code: 'TAKB.1', alan: 'Türkçe', resmi: true, aciklama: 'Konuşma sürecini yönetebilme' },
    'TAKB.2': { code: 'TAKB.2', alan: 'Türkçe', resmi: true, aciklama: 'Konuşma sürecinin içeriğini oluşturabilme' },
    'TAKB.3': { code: 'TAKB.3', alan: 'Türkçe', resmi: true, aciklama: 'Konuşma sürecinde Türkçeyi doğru kullanabilme' },
    'TAKB.4': { code: 'TAKB.4', alan: 'Türkçe', resmi: true, aciklama: 'Konuşma sürecini değerlendirebilme' },
    'TAEOB.1': { code: 'TAEOB.1', alan: 'Türkçe', resmi: true, aciklama: 'Yazı farkındalığına ilişkin becerileri gösterebilme' },
    'TAEOB.2': { code: 'TAEOB.2', alan: 'Türkçe', resmi: true, aciklama: 'Ses bilgisel farkındalık becerileri gösterebilme' },
    'TAEOB.3': { code: 'TAEOB.3', alan: 'Türkçe', resmi: true, aciklama: 'Sözcük-harf ilişkisini açıklayabilme' },
    'TAEOB.4': { code: 'TAEOB.4', alan: 'Türkçe', resmi: true, aciklama: 'Okuma öncesi becerileri kazanabilme' },
    'TAEOB.5': { code: 'TAEOB.5', alan: 'Türkçe', resmi: true, aciklama: 'Yazma öncesi becerileri kazanabilme' },

    // ===== MATEMATİK ALANI =====
    'MAB.1': { code: 'MAB.1', alan: 'Matematik', resmi: true, aciklama: 'Sayıları farklı durumlarda doğru kullanabilme' },
    'MAB.2': { code: 'MAB.2', alan: 'Matematik', resmi: true, aciklama: 'Parça-bütün özelliklerini çözümleyebilme' },
    'MAB.3': { code: 'MAB.3', alan: 'Matematik', resmi: true, aciklama: 'Matematikle ilgili durumları yorumlayabilme' },
    'MAB.4': { code: 'MAB.4', alan: 'Matematik', resmi: true, aciklama: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme' },
    'MAB.5': { code: 'MAB.5', alan: 'Matematik', resmi: true, aciklama: 'Matematikle ilgili problemleri çözümleyebilme' },
    'MAB.6': { code: 'MAB.6', alan: 'Matematik', resmi: true, aciklama: 'Matematikle ilgili problemleri yorumlayabilme' },
    'MAB.7': { code: 'MAB.7', alan: 'Matematik', resmi: true, aciklama: 'Matematikle ilgili problemlere çözüm yolları geliştirebilme' },
    'MAB.8': { code: 'MAB.8', alan: 'Matematik', resmi: true, aciklama: 'Problem çözme deneyimlerini yansıtabilme' },
    'MAB.9': { code: 'MAB.9', alan: 'Matematik', resmi: true, aciklama: 'Matematikle ilgili temsillerden yararlanabilme' },
    'MAB.10': { code: 'MAB.10', alan: 'Matematik', resmi: true, aciklama: 'Matematikle ilgili temsilleri değerlendirebilme' },
    'MAB.11': { code: 'MAB.11', alan: 'Matematik', resmi: true, aciklama: 'Veriyle çalışabilme' },
    'MAB.12': { code: 'MAB.12', alan: 'Matematik', resmi: true, aciklama: 'Bulguya ulaşabilme' },
    'MAB.13': { code: 'MAB.13', alan: 'Matematik', resmi: true, aciklama: 'Bulguyu yorumlayabilme' },

    // ===== FEN ALANI — kodlar 1,2,3,4,7,8,9,12,13 (5,6,10,11 belgede yok) =====
    'FAB.1': { code: 'FAB.1', alan: 'Fen', resmi: true, aciklama: 'Günlük yaşamında fenle ilgili olaylara / olgulara ve durumlara yönelik bilimsel gözlem yapabilme' },
    'FAB.2': { code: 'FAB.2', alan: 'Fen', resmi: true, aciklama: 'Fene yönelik nesne / olay / olguları benzerlik ve farklılıklarına göre sınıflandırabilme' },
    'FAB.3': { code: 'FAB.3', alan: 'Fen', resmi: true, aciklama: 'Günlük yaşamda fen olaylarına yönelik bilimsel gözleme dayalı tahminlerde bulunabilme' },
    'FAB.4': { code: 'FAB.4', alan: 'Fen', resmi: true, aciklama: 'Fene yönelik olay ve / veya olgular hakkında bilimsel veriye dayalı tahminlerde bulunabilme' },
    'FAB.7': { code: 'FAB.7', alan: 'Fen', resmi: true, aciklama: 'Merak ettiği konular / olay / durum hakkında deneyler yapabilme' },
    'FAB.8': { code: 'FAB.8', alan: 'Fen', resmi: true, aciklama: 'Günlük hayatındaki fene yönelik olaylar hakkında gözlemlerine dayalı basit düzeyde bilimsel çıkarımlar yapabilme' },
    'FAB.9': { code: 'FAB.9', alan: 'Fen', resmi: true, aciklama: 'Fene yönelik olay ve / veya olguları açıklamak için basit düzeyde bilimsel modellerden faydalanabilme' },
    'FAB.12': { code: 'FAB.12', alan: 'Fen', resmi: true, aciklama: 'Bilimsel olayları / olguları açıklamak için kanıtlar kullanabilme' },
    'FAB.13': { code: 'FAB.13', alan: 'Fen', resmi: true, aciklama: 'Fene yönelik günlük hayatla ilişkili olay, olgu ve / veya durumlara yönelik bilimsel sorgulama yapabilme' },

    // ===== SOSYAL ALAN — kodlar 1-15 (16-22 belgede yok) =====
    'SAB.1': { code: 'SAB.1', alan: 'Sosyal', resmi: true, aciklama: 'Günlük hayatta karşılaştığı kavram / nesne / yer / toplum / olay / kişilere ilişkin zaman içerisinde değişen ve benzerlik gösteren özellikleri karşılaştırabilme' },
    'SAB.2': { code: 'SAB.2', alan: 'Sosyal', resmi: true, aciklama: 'Yakın çevresindeki olay / dönem / kavramları kronolojik olarak sıralayabilme' },
    'SAB.3': { code: 'SAB.3', alan: 'Sosyal', resmi: true, aciklama: 'Olay / dönem ve kavramların zamanla geçirdikleri değişim / dönüşümleri karşılaştırarak ifade edebilme' },
    'SAB.4': { code: 'SAB.4', alan: 'Sosyal', resmi: true, aciklama: 'Yakın çevresindeki yaşantılardan yola çıkarak ülkemizle ilgili merak ettiği konulara yönelik sorular sorabilme' },
    'SAB.5': { code: 'SAB.5', alan: 'Sosyal', resmi: true, aciklama: 'Yakın çevresiyle / ülkemizle ilgili merak ettiği konuya yönelik kaynakları inceleyebilme' },
    'SAB.6': { code: 'SAB.6', alan: 'Sosyal', resmi: true, aciklama: 'Yakın çevresinde yer alan mekânın coğrafi koşullarını tanımlayabilme' },
    'SAB.7': { code: 'SAB.7', alan: 'Sosyal', resmi: true, aciklama: 'Merak ettiği coğrafi olay / olgu ve mekân / durumlara yönelik sorular sorabilme' },
    'SAB.8': { code: 'SAB.8', alan: 'Sosyal', resmi: true, aciklama: 'Coğrafi gözlem ve saha çalışmasını gerçekleştirebilmek için gerekli olan hazırlığı yapabilme' },
    'SAB.9': { code: 'SAB.9', alan: 'Sosyal', resmi: true, aciklama: 'Coğrafi gözlem ve okul dışı planlanan çalışmaları çevreye duyarlı biçimde uygulayabilme' },
    'SAB.10': { code: 'SAB.10', alan: 'Sosyal', resmi: true, aciklama: 'Coğrafi gözlem ve çalışma sahasından elde edilen sonuçları sözel / görsel yolla sunabilme' },
    'SAB.11': { code: 'SAB.11', alan: 'Sosyal', resmi: true, aciklama: 'Yakın çevresi ile ilgili olan basit krokiyi / haritayı okuyabilme' },
    'SAB.12': { code: 'SAB.12', alan: 'Sosyal', resmi: true, aciklama: 'Yakın çevresinde bulunan kişi / nesne / mekânın konumunu belirlemek üzere takip edeceği krokiyi çözümleyebilme' },
    'SAB.13': { code: 'SAB.13', alan: 'Sosyal', resmi: true, aciklama: 'Yakın çevresinde bulunan belirli bir kişi / nesne / mekânın konumunu gösteren kendi krokisini oluşturabilme' },
    'SAB.14': { code: 'SAB.14', alan: 'Sosyal', resmi: true, aciklama: 'Toplumsal yaşama yönelik nesne, olgu ve olayları çözümleyebilme' },
    'SAB.15': { code: 'SAB.15', alan: 'Sosyal', resmi: true, aciklama: 'Toplumsal yaşama yönelik merak ettiği konuyu sorgulayabilme' },

    // ===== HAREKET VE SAĞLIK ALANI — kodlar 1-9 (10-14 belgede yok) =====
    'HSAB.1': { code: 'HSAB.1', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'Farklı çevre ve fiziksel etkinliklerde temel hareket becerilerini sergileyebilme' },
    'HSAB.2': { code: 'HSAB.2', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'Farklı büyüklük ve özellikteki nesneleri kullanabilme' },
    'HSAB.3': { code: 'HSAB.3', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'Müzik ve ritim eşliğinde hareket örüntüleri sergileyebilme' },
    'HSAB.4': { code: 'HSAB.4', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'Beden farkındalığına dayalı doğru duruş sergileyebilme' },
    'HSAB.5': { code: 'HSAB.5', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'Kişisel ve genel alanın farkında olarak hareket edebilme' },
    'HSAB.6': { code: 'HSAB.6', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'Yeterli ve dengeli beslenebilme' },
    'HSAB.7': { code: 'HSAB.7', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'İç ve dış mekânda fiziksel aktivitelere katılabilme' },
    'HSAB.8': { code: 'HSAB.8', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'Temel kişisel hijyen ve bulunduğu ortamın düzeninin farkında olabilme' },
    'HSAB.9': { code: 'HSAB.9', alan: 'Hareket ve Sağlık', resmi: true, aciklama: 'Kaza, afet ve tehlikeli durumlarda güvenli davranışları sergileyebilme' },

    // ===== SANAT ALANI =====
    'SNAB.1': { code: 'SNAB.1', alan: 'Sanat', resmi: true, aciklama: 'Sanat türlerini tanıyabilme' },
    'SNAB.2': { code: 'SNAB.2', alan: 'Sanat', resmi: true, aciklama: 'Sanat eserini eleştirebilme' },
    'SNAB.3': { code: 'SNAB.3', alan: 'Sanat', resmi: true, aciklama: 'Sanatın önemini fark edebilme' },
    'SNAB.4': { code: 'SNAB.4', alan: 'Sanat', resmi: true, aciklama: 'Sanat etkinliği uygulayabilme' },

    // ===== MÜZİK ALANI — MYB (Müziksel Yaratıcılık) kategorisi 2026'da kalktı =====
    'MDB.1': { code: 'MDB.1', alan: 'Müzik', resmi: true, aciklama: 'Çeşitli müzik eserlerini dinleyebilme' },
    'MDB.2': { code: 'MDB.2', alan: 'Müzik', resmi: true, aciklama: 'Seslerin kaynağını anlayabilme' },
    'MDB.3': { code: 'MDB.3', alan: 'Müzik', resmi: true, aciklama: 'Müzik eserlerindeki temel özellikleri ifade edebilme' },
    'MSB.1': { code: 'MSB.1', alan: 'Müzik', resmi: true, aciklama: 'Şarkılara kendi sesiyle eşlik edebilme' },
    'MSB.2': { code: 'MSB.2', alan: 'Müzik', resmi: true, aciklama: 'Söyleme becerilerini sınıf içinde sergileyebilme' },
    'MÇB.1': { code: 'MÇB.1', alan: 'Müzik', resmi: true, aciklama: 'Duyduğu sesleri / müzik eserlerini çalabilme' },
    'MÇB.2': { code: 'MÇB.2', alan: 'Müzik', resmi: true, aciklama: 'Çalgıları çalma becerilerini sergileyebilme' },
    'MHB.1': { code: 'MHB.1', alan: 'Müzik', resmi: true, aciklama: 'Harekete / dansa eşlik eden müzik eserlerinin temel özelliklerini ifade edebilme' },
    'MHB.2': { code: 'MHB.2', alan: 'Müzik', resmi: true, aciklama: 'Müzik eserleriyle hareket / dans edebilme' },

    // ===== SOSYAL-DUYGUSAL ÖĞRENME BECERİLERİ (SDÖB) — YENİ bölüm, belgede kod
    // etiketi YOK (sadece isimlendirilmiş); SDB.1-7 numaralandırması BİZE ait,
    // resmi Maarif kodu değildir (resmi: false). 3 ana başlık / 7 beceri: =====
    'SDB.1': { code: 'SDB.1', alan: 'Sosyal-Duygusal', resmi: false, aciklama: '[Benlik Becerileri] Kendini Tanıma (öz farkındalık): Kişisel özelliklerin duygu, düşünce ve davranışlara yansımasının bilincinde olma' },
    'SDB.2': { code: 'SDB.2', alan: 'Sosyal-Duygusal', resmi: false, aciklama: '[Benlik Becerileri] Kendini Düzenleme (öz düzenleme): Kişisel hedeflere ulaşabilmek için duygu, düşünce ve davranışların fark edilip değerlendirilmesi ve kontrol edilmesi' },
    'SDB.3': { code: 'SDB.3', alan: 'Sosyal-Duygusal', resmi: false, aciklama: '[Sosyal Yaşam Becerileri] İletişim: Duygu, düşünce veya bilgilerin sözlü ya da sözsüz olarak başkalarına iletilmesi' },
    'SDB.4': { code: 'SDB.4', alan: 'Sosyal-Duygusal', resmi: false, aciklama: '[Sosyal Yaşam Becerileri] İş Birliği: Ortak bir hedefe ulaşmak için iki veya daha fazla kişinin birlikte çalışabilmesi' },
    'SDB.5': { code: 'SDB.5', alan: 'Sosyal-Duygusal', resmi: false, aciklama: '[Sosyal Yaşam Becerileri] Sosyal Farkındalık: Farklı geçmiş, kültür ve yaşam koşullarına sahip bireyler dahil başkalarının bakış açılarını anlama ve onlara duyarlı davranma' },
    'SDB.6': { code: 'SDB.6', alan: 'Sosyal-Duygusal', resmi: false, aciklama: '[Ortak / Birleşik Beceriler] Uyum: Kişinin kendisiyle ve çevresiyle dengeli bir ilişki kurması ve bu ilişkiyi sürdürebilmesi' },
    'SDB.7': { code: 'SDB.7', alan: 'Sosyal-Duygusal', resmi: false, aciklama: '[Ortak / Birleşik Beceriler] Sorumlu Karar Verme: Farklı durumlarda ahlaki sorumluluk alarak davranışları ve ilişkilerinde doğru ve yapıcı seçimler yapma becerisi' },
};

/** Bir çıktı kodu 2026 belgesinde (kanonik listede) var mı? false => uydurma. */
export function isValidCikti2026(code: string): boolean {
    return Object.prototype.hasOwnProperty.call(MAARIF_CIKTILAR_2026, code);
}

/** Kodun resmi açıklaması (yoksa undefined). */
export function getResmiAciklama2026(code: string): string | undefined {
    return MAARIF_CIKTILAR_2026[code]?.aciklama;
}

/** Verilen kod listesindeki GEÇERSİZ (2026 belgesinde olmayan) kodları döndürür. Boş => hepsi geçerli. */
export function bulunmayanKodlar2026(codes: string[]): string[] {
    return [...new Set(codes)].filter(c => !isValidCikti2026(c));
}
